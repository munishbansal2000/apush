/**
 * Episode durations derived from timing_map.json.
 * Single source of truth — update timing, durations follow automatically.
 * 
 * Usage in Root.tsx:
 *   import { EPISODE_FRAMES } from './data/durations';
 *   durationInFrames={EPISODE_FRAMES.E3}
 */

import e1Timing from './timing_map.json';
import e2Timing from './u1e2/timing_map.json';
import e3Timing from './e3/timing_map.json';
import e4Timing from './e4/timing_map.json';
import e5Timing from './e5/timing_map.json';
import e6Timing from './e6/timing_map.json';
import e7Timing from './e7/timing_map.json';
import e8Timing from './e8/timing_map.json';
import e9Timing from './e9/timing_map.json';

const FPS = 30;

function totalFrames(timing: { starts: number[]; durations: number[] }): number {
  const starts = timing.starts;
  const durations = timing.durations;
  if (!starts.length || !durations.length) return 0;
  const totalSec = starts[starts.length - 1] + durations[durations.length - 1];
  return Math.ceil(totalSec * FPS);
}

export const EPISODE_FRAMES = {
  E1: totalFrames(e1Timing),
  E2: totalFrames(e2Timing),
  E3: totalFrames(e3Timing),
  E4: totalFrames(e4Timing),
  E5: totalFrames(e5Timing),
  E6: totalFrames(e6Timing),
  E7: totalFrames(e7Timing),
  E8: totalFrames(e8Timing),
  E9: totalFrames(e9Timing),
} as const;
