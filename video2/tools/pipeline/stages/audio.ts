import {copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, unlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from '../../lib';
import {atomicJson, readJson, sha256, type PipelineTurn} from '../../pipeline-core';
import type {PipelineContext} from '../context';
import {applyPronunciations, cleanSpeech, type Pronunciation} from '../speech';
import {findTool} from '../tools';
import {isDirected, tagIssues} from '../fish-tags';
import {loadLessonReview} from '../review';
import {dirname} from 'node:path';
import {lessonKeyEnv, loadFishKeys} from '../fish-keys';

/** macOS `say` voices for --tts say (previews only). */
const SAY_VOICES: Record<string, string> = {maya: 'Samantha', marcus: 'Daniel', jay: 'Reed (English (US))', narrator: 'Fred'};

/** Hash of every input that determines the rendered narration. */
export const audioInputHash = (ctx: PipelineContext, turns: PipelineTurn[], pronunciations: Pronunciation[]) =>
  sha256(JSON.stringify({mode: ctx.mode, turns, edge: ctx.cfg.edge, fish: ctx.cfg.fish, pron: pronunciations, tts: process.argv.includes('--tts') ? process.argv[process.argv.indexOf('--tts') + 1] : undefined}));

/**
 * Render one mp3 per speech turn. Dev: Edge TTS with every tag stripped. Prod: Fish speaking the script's own direction
 * tags (checked against the guideline catalog); no LLM pass, so the same script always yields the same audio.
 */
export function audioStage(ctx: PipelineContext, turns: PipelineTurn[], pronunciations: Pronunciation[]): void {
  const {cfg, mode, force, audioDir, ttsDir} = ctx;
  const audioHash = audioInputHash(ctx, turns, pronunciations);
  if (!ctx.stages.includes('audio')) return;
  // Approved audio is frozen: reused as is, even if the voices, model or pronunciations changed since.
  if (loadLessonReview(ctx.episode, dirname(ctx.dataDir)).audio?.approved && turns.filter(t => t.kind === 'speech').every(t => existsSync(join(audioDir, `${t.id}.mp3`)))) {
    console.log('[audio] approved in review (frozen)');
    return;
  }
  if (ctx.current('audio', audioHash) && turns.filter(t => t.kind === 'speech').every(t => existsSync(join(audioDir, `${t.id}.mp3`)))) console.log('[audio] checkpoint current');
  else if (ctx.dryRun) console.log(`[audio] dry-run: ${mode === 'prod' ? 'Fish with the script\'s own direction tags' : 'Edge TTS'}`);
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
      // Lessons are directed as they are written (apush-final-guidelines.md §9): Fish speaks the script's own tags,
      // minus {...} markup, after a catalog check. An undirected script is spoken plainly.
      const issues = tagIssues(speech.map(t => ({id: t.id, text: t.text ?? ''})));
      if (issues.length) throw new Error(`script direction uses tags Fish does not support:\n${issues.map(i => `  - ${i}`).join('\n')}`);
      directed = Object.fromEntries(speech.map(t => [t.id, (t.text ?? '').replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim()]));
      if (!isDirected(speech.map(t => t.text ?? ''))) console.warn('[audio] WARNING: the script has no Fish direction tags; Fish will read it flat. Direct it per apush-final-guidelines.md §9.');
      else console.log(`[audio] Fish direction: the script's own tags (${speech.filter(t => /\[/.test(t.text ?? '')).length}/${speech.length} turns tagged)`);
    }
    // Resolve the synthesizer once (and only when a turn actually needs rendering), not per turn.
    let edgeTts: string | undefined;
    let fishPython: string | undefined;
    let fishKey: {env: NodeJS.ProcessEnv; tag?: string} | undefined;
    const index: Record<string, IndexEntry> = {};
    let rendered = 0;
    let reused = 0;
    for (const turn of speech) {
      const text = applyPronunciations(directed[turn.id], pronunciations);
      const output = join(audioDir, `${turn.id}.mp3`);
      writeFileSync(join(ttsDir, `${turn.id}.txt`), `${text}\n`);
      let artifactHash: string;
      let synthesize: (file: string) => void;
      if (mode === 'dev' && process.argv.includes('--tts') && process.argv[process.argv.indexOf('--tts') + 1] === 'say') {
        // macOS built-in voices, offline: rough, for previews on a laptop (--tts say). Distinct voice per speaker.
        const voice = SAY_VOICES[turn.speaker ?? ''] ?? 'Fred';
        artifactHash = sha256(JSON.stringify({engine: 'say', text, voice}));
        synthesize = file => {
          const aiff = `${file}.aiff`;
          ctx.run('say', ['-v', voice, '-o', aiff, cleanSpeech(text)]);
          ctx.run('ffmpeg', ['-y', '-v', 'error', '-i', aiff, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', file]);
          unlinkSync(aiff);
        };
      } else if (mode === 'dev') {
        const voice = cfg.edge.voices[turn.speaker ?? ''] ?? cfg.edge.voices.narrator;
        artifactHash = sha256(JSON.stringify({engine: 'edge', text, voice, rate: cfg.edge.rate, pitch: cfg.edge.pitch}));
        synthesize = file => ctx.run(edgeTts ??= findTool(['edge-tts'], 'EDGE_TTS'), ['--voice', voice, '--rate', cfg.edge.rate, '--pitch', cfg.edge.pitch, '--text', text, '--write-media', file]);
      } else {
        // tools/fish_tts.py calls the Fish Audio cloud API; FISH_TTS_SCRIPT swaps in another script with the same CLI.
        const script = process.env.FISH_TTS_SCRIPT ?? join(ROOT, 'tools', 'fish_tts.py');
        const reference = cfg.fish.voices[turn.speaker ?? ''];
        if (!reference) throw new Error(`no Fish reference id for speaker ${turn.speaker}`);
        artifactHash = sha256(JSON.stringify({engine: 'fish', text, reference, model: cfg.fish.model}));
        // One key per lesson: the first line that needs Fish takes the next key of FISH_API_KEYS(_FILE) for this run.
        synthesize = file => ctx.run(fishPython ??= findTool(['python3', 'python'], 'FISH_PYTHON'), [script, '--text', text, '--out', file, '--model', cfg.fish.model, '--reference-id', reference, '--format', 'mp3'], (fishKey ??= lessonKeyEnv(loadFishKeys())).env);
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
    console.log(`[audio] ${rendered} rendered, ${reused} reused${fishKey?.tag ? ` (Fish key ${fishKey.tag})` : ''}`);
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
