/**
 * Episode durations derived from timing data via load-episode-data.
 * No direct JSON imports — uses the loader (out/data/ first, src/data/ fallback).
 */
import { loadEpisodeData } from '../lib/load-episode-data';

const FPS = 30;

function totalFrames(epKey: string): number {
  try {
    const data = loadEpisodeData(epKey);
    const { starts, durations } = data;
    if (!starts.length || !durations.length) return 30; // 1s fallback for missing data
    const totalSec = starts[starts.length - 1] + durations[durations.length - 1];
    return Math.max(30, Math.ceil(totalSec * FPS));
  } catch {
    return 30;
  }
}

// Computed lazily to avoid blocking module load
let _cache: Record<string, number> | null = null;

function getFrames(): Record<string, number> {
  if (!_cache) {
    _cache = {
      E1: totalFrames('e1'),
      E2: totalFrames('e2'),
      E3: totalFrames('e3'),
      E4: totalFrames('e4'),
      E5: totalFrames('e5'),
      E6: totalFrames('e6'),
      E7: totalFrames('e7'),
      E8: totalFrames('e8'),
      E9: totalFrames('e9'),
      U2E1: totalFrames('u2e1'),
      U2E2: totalFrames('u2e2'),
      U2E3: totalFrames('u2e3'),
      U2E4: totalFrames('u2e4'),
      U2E5: totalFrames('u2e5'),
      U2E6: totalFrames('u2e6'),
      U2E7: totalFrames('u2e7'),
      U2E8: totalFrames('u2e8'),
      U2E9: totalFrames('u2e9'),
      U2E10: totalFrames('u2e10'),
    };
  }
  return _cache;
}

export const EPISODE_FRAMES = new Proxy({} as Record<string, number>, {
  get(_target, prop: string) {
    return getFrames()[prop] ?? 0;
  },
});
