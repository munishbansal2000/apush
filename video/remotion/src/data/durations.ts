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
import u2e1Timing from './u2e1/timing_map.json';
import u2e2Timing from './u2e2/timing_map.json';
import u2e4Timing from './u2e4/timing_map.json';
import u2e5Timing from './u2e5/timing_map.json';
import u2e7Timing from './u2e7/timing_map.json';
import u2e8Timing from './u2e8/timing_map.json';
import u2e9Timing from './u2e9/timing_map.json';
import u2e10Timing from './u2e10/timing_map.json';
import u2e6Timing from './u2e6/timing_map.json';
import u2e3Timing from './u2e3/timing_map.json';

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
  U2E1: totalFrames(u2e1Timing),
  U2E2: totalFrames(u2e2Timing),
  U2E4: totalFrames(u2e4Timing),
  U2E5: totalFrames(u2e5Timing),
  U2E7: totalFrames(u2e7Timing),
  U2E8: totalFrames(u2e8Timing),
  U2E9: totalFrames(u2e9Timing),
  U2E10: totalFrames(u2e10Timing),
  U2E6: totalFrames(u2e6Timing),
  U2E3: totalFrames(u2e3Timing),
} as const;
