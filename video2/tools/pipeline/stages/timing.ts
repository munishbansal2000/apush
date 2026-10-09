import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {audioLevels, ffprobeDuration} from '../../lib';
import {atomicJson, readJson, sha256, type PipelineTurn} from '../../pipeline-core';
import type {PipelineContext, Timing} from '../context';
import {cleanSpeech} from '../speech';

export const levelsPathFor = (ctx: PipelineContext) => join(ctx.dataDir, 'levels.json');

export const timingInputHash = (ctx: PipelineContext, audioHash: string) => sha256(JSON.stringify({audioHash, timing: ctx.cfg.timing}));

function layout(ctx: PipelineContext, turns: PipelineTurn[], durations: number[]) {
  const starts: number[] = [];
  let cursor = ctx.cfg.timing.leadSec;
  turns.forEach((turn, i) => { starts.push(cursor); cursor += durations[i] + (turn.holdAfterSec ?? 0) + ctx.cfg.timing.gapSec; });
  return {starts, totalSec: cursor + ctx.cfg.timing.tailSec};
}

/** Measure audio and lay turns on the timeline (data/<episode>/timing_map.json). Dry runs estimate. */
export function timingStage(ctx: PipelineContext, turns: PipelineTurn[], audioHash: string): Timing {
  const timingPath = join(ctx.dataDir, 'timing_map.json');
  const timingHash = timingInputHash(ctx, audioHash);
  if (ctx.stages.includes('timing')) {
    if (ctx.current('timing', timingHash) && existsSync(timingPath) && existsSync(levelsPathFor(ctx))) console.log('[timing] checkpoint current');
    else if (ctx.dryRun) console.log('[timing] dry-run');
    else {
      const durations = turns.map(t => t.kind === 'pause' ? t.pauseSec ?? 3 : ffprobeDuration(join(ctx.audioDir, `${t.id}.mp3`)));
      const {starts, totalSec} = layout(ctx, turns, durations);
      const timing: Timing = {starts, durations, totalSec, fps: 30, ttsHash: Object.fromEntries(turns.filter(t => t.kind === 'speech').map(t => [t.id, sha256(cleanSpeech(t.text ?? ''))]))};
      // Per-frame loudness drives the audio-reactive host heads.
      const levels = Object.fromEntries(turns.filter(t => t.kind === 'speech').map(t => [t.id, audioLevels(join(ctx.audioDir, `${t.id}.mp3`), timing.fps)]));
      atomicJson(levelsPathFor(ctx), levels);
      atomicJson(timingPath, timing); ctx.mark('timing', timingHash);
      console.log(`[timing] ${timing.totalSec.toFixed(1)}s -> ${timingPath} (+ levels for ${Object.keys(levels).length} turns)`);
    }
  }
  if (existsSync(timingPath)) return readJson<Timing>(timingPath);
  if (!ctx.dryRun) throw new Error(`missing ${timingPath}; run timing stage without --dry-run`);
  const durations = turns.map(t => t.kind === 'pause' ? t.pauseSec ?? 3 : Math.max(1, (t.text ?? '').split(/\s+/).length / 2.6));
  const {starts, totalSec} = layout(ctx, turns, durations);
  return {starts, durations, totalSec, fps: 30, ttsHash: {}};
}
