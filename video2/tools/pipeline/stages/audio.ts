import {copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, unlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {atomicJson, readJson, sha256, type PipelineTurn} from '../../pipeline-core';
import type {PipelineContext} from '../context';
import {applyPronunciations, cleanSpeech, type Pronunciation} from '../speech';
import {findTool} from '../tools';

/** Hash of every input that determines the rendered narration. */
export const audioInputHash = (ctx: PipelineContext, turns: PipelineTurn[], pronunciations: Pronunciation[]) =>
  sha256(JSON.stringify({mode: ctx.mode, turns, edge: ctx.cfg.edge, fish: ctx.cfg.fish, pron: pronunciations}));

/** Render one mp3 per speech turn (Edge TTS in dev, Meta-directed Fish in prod). */
export function audioStage(ctx: PipelineContext, turns: PipelineTurn[], pronunciations: Pronunciation[]): void {
  const {cfg, mode, force, audioDir, ttsDir} = ctx;
  const audioHash = audioInputHash(ctx, turns, pronunciations);
  if (!ctx.stages.includes('audio')) return;
  if (ctx.current('audio', audioHash) && turns.filter(t => t.kind === 'speech').every(t => existsSync(join(audioDir, `${t.id}.mp3`)))) console.log('[audio] checkpoint current');
  else if (ctx.dryRun) console.log(`[audio] dry-run: ${mode === 'prod' ? 'Meta UI Fish direction + Fish' : 'Edge TTS'}`);
  else {
    mkdirSync(audioDir, {recursive: true}); mkdirSync(ttsDir, {recursive: true});
    // Rendered audio is content-addressed (tts/<episode>/cache/<artifactHash>.mp3), so
    // inserting or deleting a line, which renumbers turn ids, never re-synthesizes moved text.
    const cacheDir = join(ttsDir, 'cache');
    mkdirSync(cacheDir, {recursive: true});
    const indexPath = join(ttsDir, 'index.json');
    const priorIndex = existsSync(indexPath) ? readJson<Record<string, IndexEntry>>(indexPath) : {};
    seedCacheFromIdIndex(priorIndex, audioDir, cacheDir);
    const speech = turns.filter(t => t.kind === 'speech');
    // Text sent to TTS before pronunciation substitution (Fish adds performance tags in prod).
    let directed = Object.fromEntries(speech.map(t => [t.id, cleanSpeech(t.text ?? '')]));
    if (mode === 'prod') {
      const prompt = `You are a Fish Audio S2 performance editor. Preserve every spoken word and historical claim exactly. Add only supported square-bracket performance commands where they improve delivery. Never add stage directions that could be spoken aloud. Return JSON only: {"turns":[{"id":"t00","text":"..."}]}. Include every supplied speech turn exactly once.\n\n${JSON.stringify(speech.map(t => ({id: t.id, speaker: t.speaker, text: t.text})), null, 2)}`;
      const planned = readJson<{turns: {id: string; text: string}[]}>(ctx.meta('fish-direction', prompt));
      directed = Object.fromEntries(planned.turns.map(row => [row.id, row.text]));
      const missing = speech.filter(t => !directed[t.id]);
      if (missing.length) throw new Error(`Meta Fish plan omitted ${missing.map(t => t.id).join(', ')}`);
      for (const turn of speech) if (cleanSpeech(directed[turn.id]) !== cleanSpeech(turn.text ?? '')) {
        throw new Error(`Meta Fish direction changed spoken wording in ${turn.id}; refusing production TTS`);
      }
      // A lesson-level Meta review may phrase performance tags differently on
      // every call. Preserve the approved directed text for unchanged source
      // lines (matched by speaker + wording, not turn id) so an edit cannot churn unrelated Fish audio.
      const priorDirected = new Map<string, string>();
      for (const prior of Object.values(priorIndex)) {
        if (prior.engine === 'fish' && prior.hash && (prior.directed ?? prior.text)) priorDirected.set(`${prior.speaker}|${prior.hash}`, (prior.directed ?? prior.text)!);
      }
      for (const turn of speech) {
        const kept = priorDirected.get(`${turn.speaker ?? 'narrator'}|${sha256(cleanSpeech(turn.text ?? ''))}`);
        if (kept) directed[turn.id] = kept;
      }
    }
    // Resolve the synthesizer once (and only when a turn actually needs rendering), not per turn.
    let edgeTts: string | undefined;
    let fishPython: string | undefined;
    const index: Record<string, IndexEntry> = {};
    let rendered = 0;
    let reused = 0;
    for (const turn of speech) {
      const text = applyPronunciations(directed[turn.id], pronunciations);
      const output = join(audioDir, `${turn.id}.mp3`);
      writeFileSync(join(ttsDir, `${turn.id}.txt`), `${text}\n`);
      let artifactHash: string;
      let synthesize: (file: string) => void;
      if (mode === 'dev') {
        const voice = cfg.edge.voices[turn.speaker ?? ''] ?? cfg.edge.voices.narrator;
        artifactHash = sha256(JSON.stringify({engine: 'edge', text, voice, rate: cfg.edge.rate, pitch: cfg.edge.pitch}));
        synthesize = file => ctx.run(edgeTts ??= findTool(['edge-tts'], 'EDGE_TTS'), ['--voice', voice, '--rate', cfg.edge.rate, '--pitch', cfg.edge.pitch, '--text', text, '--write-media', file]);
      } else {
        const script = process.env.FISH_TTS_SCRIPT;
        if (!script) throw new Error('PROD requires FISH_TTS_SCRIPT (Fish fish_tts.py path); optionally set FISH_PYTHON');
        const reference = cfg.fish.voices[turn.speaker ?? ''];
        if (!reference) throw new Error(`no Fish reference id for speaker ${turn.speaker}`);
        artifactHash = sha256(JSON.stringify({engine: 'fish', text, reference, model: cfg.fish.model}));
        synthesize = file => ctx.run(fishPython ??= findTool(['python3', 'python'], 'FISH_PYTHON'), [script, '--text', text, '--out', file, '--model', cfg.fish.model, '--reference-id', reference, '--format', 'mp3']);
      }
      const cached = join(cacheDir, `${artifactHash}.mp3`);
      if (!force && existsSync(cached)) reused++;
      else {
        const temp = join(cacheDir, `.${artifactHash}.${process.pid}.mp3`);
        synthesize(temp);
        renameSync(temp, cached);
        rendered++;
      }
      copyFileSync(cached, output);
      index[turn.id] = {speaker: turn.speaker ?? 'narrator', text, directed: directed[turn.id], hash: sha256(cleanSpeech(turn.text ?? '')), engine: mode === 'dev' ? 'edge' : 'fish', artifactHash};
    }
    // Turn ids are positional; drop audio for ids that no longer exist so later stages never see it.
    const live = new Set(speech.map(t => `${t.id}.mp3`));
    for (const name of readdirSync(audioDir)) if (name.endsWith('.mp3') && !live.has(name)) unlinkSync(join(audioDir, name));
    atomicJson(indexPath, index);
    ctx.mark('audio', audioHash);
    console.log(`[audio] ${rendered} rendered, ${reused} reused`);
  }
}

interface IndexEntry {speaker: string; text: string; directed?: string; hash: string; engine: string; artifactHash: string}

/** One-time migration from the old id-keyed layout: index.json + public/audio/<id>.mp3 → cache/<hash>.mp3. */
function seedCacheFromIdIndex(priorIndex: Record<string, Partial<IndexEntry>>, audioDir: string, cacheDir: string): void {
  for (const [id, entry] of Object.entries(priorIndex)) {
    const legacy = join(audioDir, `${id}.mp3`);
    if (!entry.artifactHash || !existsSync(legacy)) continue;
    const cached = join(cacheDir, `${entry.artifactHash}.mp3`);
    if (!existsSync(cached)) copyFileSync(legacy, cached);
  }
}
