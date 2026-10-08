import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from '../../lib';
import {atomicJson, readJson, sha256, type PipelineTurn} from '../../pipeline-core';
import type {PipelineContext} from '../context';
import {applyPronunciations, cleanSpeech, type Pronunciation} from '../speech';

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
    const indexPath = join(ttsDir, 'index.json');
    const priorIndex = existsSync(indexPath) ? readJson<Record<string, {artifactHash?: string; hash?: string; speaker?: string; text?: string; engine?: string}>>(indexPath) : {};
    let texts = Object.fromEntries(turns.filter(t => t.kind === 'speech').map(t => [t.id, applyPronunciations(cleanSpeech(t.text ?? ''), pronunciations)]));
    if (mode === 'prod') {
      const prompt = `You are a Fish Audio S2 performance editor. Preserve every spoken word and historical claim exactly. Add only supported square-bracket performance commands where they improve delivery. Never add stage directions that could be spoken aloud. Return JSON only: {"turns":[{"id":"t00","text":"..."}]}. Include every supplied speech turn exactly once.\n\n${JSON.stringify(turns.filter(t => t.kind === 'speech').map(t => ({id: t.id, speaker: t.speaker, text: t.text})), null, 2)}`;
      const planned = readJson<{turns: {id: string; text: string}[]}>(ctx.meta('fish-direction', prompt));
      texts = Object.fromEntries(planned.turns.map(row => [row.id, row.text]));
      const missing = turns.filter(t => t.kind === 'speech' && !texts[t.id]);
      if (missing.length) throw new Error(`Meta Fish plan omitted ${missing.map(t => t.id).join(', ')}`);
      for (const turn of turns) if (turn.kind === 'speech' && cleanSpeech(texts[turn.id]) !== cleanSpeech(turn.text ?? '')) {
        throw new Error(`Meta Fish direction changed spoken wording in ${turn.id}; refusing production TTS`);
      }
      // A lesson-level Meta review may phrase performance tags differently on
      // every call. Preserve the approved directed text for unchanged source
      // turns so a one-line edit cannot churn unrelated Fish audio.
      for (const turn of turns) if (turn.kind === 'speech') {
        const prior = priorIndex[turn.id];
        const sourceHash = sha256(cleanSpeech(turn.text ?? ''));
        if (prior?.engine === 'fish' && prior.hash === sourceHash && prior.speaker === (turn.speaker ?? 'narrator') && prior.text) {
          texts[turn.id] = prior.text;
        }
      }
    }
    const index: Record<string, {speaker: string; text: string; hash: string; engine: string; artifactHash: string}> = {};
    let rendered = 0;
    let reused = 0;
    for (const turn of turns) {
      if (turn.kind !== 'speech') continue;
      const text = texts[turn.id];
      const output = join(audioDir, `${turn.id}.mp3`);
      writeFileSync(join(ttsDir, `${turn.id}.txt`), `${text}\n`);
      if (mode === 'dev') {
        const voice = cfg.edge.voices[turn.speaker ?? ''] ?? cfg.edge.voices.narrator;
        const artifactHash = sha256(JSON.stringify({engine: 'edge', text, voice, rate: cfg.edge.rate, pitch: cfg.edge.pitch}));
        if (!force && existsSync(output) && priorIndex[turn.id]?.artifactHash === artifactHash) reused++;
        else {
          const localEdge = join(ROOT, '.venv-pipeline', 'Scripts', 'edge-tts.exe');
          ctx.run(existsSync(localEdge) ? localEdge : 'edge-tts', ['--voice', voice, '--rate', cfg.edge.rate, '--pitch', cfg.edge.pitch, '--text', text, '--write-media', output]);
          rendered++;
        }
        index[turn.id] = {speaker: turn.speaker ?? 'narrator', text, hash: sha256(cleanSpeech(turn.text ?? '')), engine: 'edge', artifactHash};
      } else {
        const script = process.env.FISH_TTS_SCRIPT;
        const python = process.env.FISH_PYTHON ?? 'python';
        if (!script) throw new Error('PROD requires FISH_TTS_SCRIPT (Fish fish_tts.py path); optionally set FISH_PYTHON');
        const reference = cfg.fish.voices[turn.speaker ?? ''];
        if (!reference) throw new Error(`no Fish reference id for speaker ${turn.speaker}`);
        const artifactHash = sha256(JSON.stringify({engine: 'fish', text, reference, model: cfg.fish.model}));
        if (!force && existsSync(output) && priorIndex[turn.id]?.artifactHash === artifactHash) reused++;
        else {
          ctx.run(python, [script, '--text', text, '--out', output, '--model', cfg.fish.model, '--reference-id', reference, '--format', 'mp3']);
          rendered++;
        }
        index[turn.id] = {speaker: turn.speaker ?? 'narrator', text, hash: sha256(cleanSpeech(turn.text ?? '')), engine: 'fish', artifactHash};
      }
    }
    atomicJson(indexPath, index);
    ctx.mark('audio', audioHash);
    console.log(`[audio] ${rendered} rendered, ${reused} reused`);
  }
}
