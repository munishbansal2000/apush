import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from '../../lib';
import {readJson, sha256, wordTimingIssues, type PipelineTurn, type WordTiming} from '../../pipeline-core';
import type {PipelineContext, Timing} from '../context';
import {pipelinePython, voskModel} from '../tools';

export const wordsPathFor = (ctx: PipelineContext) => join(ctx.dataDir, 'word_times.json');

/** Load data/<episode>/word_times.json and reject missing/invalid Vosk results. */
export function readCheckedWords(ctx: PipelineContext, turns: PipelineTurn[], timing: Timing): Record<string, WordTiming[]> {
  const wordsPath = wordsPathFor(ctx);
  if (!existsSync(wordsPath)) throw new Error(`word timing is required but missing: ${wordsPath}\nRun: npm run pipeline:dev -- --episode ${ctx.episode} --only words`);
  const words = readJson<Record<string, WordTiming[]>>(wordsPath);
  const issues = wordTimingIssues(turns, timing.durations, words);
  if (issues.length) throw new Error(`Vosk word timing gate failed:\n${issues.map(issue => `  - ${issue}`).join('\n')}\nDelete the affected Vosk cache or rerun the words stage with --force.`);
  return words;
}

/** Vosk word timestamps for every turn's audio. */
export function wordsStage(ctx: PipelineContext, turns: PipelineTurn[], timing: Timing, timingHash: string): void {
  const wordsPath = wordsPathFor(ctx);
  const discoveredVoskModel = voskModel();
  const wordsHash = sha256(`${timingHash}:${discoveredVoskModel ?? ''}`);
  if (!ctx.stages.includes('words')) return;
  if (ctx.current('words', wordsHash) && existsSync(wordsPath)) {
    readCheckedWords(ctx, turns, timing);
    console.log('[words] checkpoint current (validated)');
  }
  else if (ctx.dryRun) console.log('[words] dry-run');
  else {
    const python = pipelinePython();
    if (!discoveredVoskModel) throw new Error('Vosk model not found. Run: npm run setup:pipeline (or set VOSK_MODEL_PATH)');
    const args = [join(ROOT, 'tools/vosk-words.py'), '--audio-dir', ctx.audioDir, '--out', wordsPath, '--cache', join(ctx.work, 'vosk-cache.json')];
    args.push('--model', discoveredVoskModel);
    ctx.run(python, args);
    const checked = readCheckedWords(ctx, turns, timing);
    ctx.mark('words', wordsHash);
    console.log(`[words] ${Object.values(checked).reduce((sum, rows) => sum + rows.length, 0)} timed words across ${Object.keys(checked).length} turns -> ${wordsPath}`);
  }
}
