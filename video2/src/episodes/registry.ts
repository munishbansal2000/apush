/** Episode registry: one line per episode. Tools and Root read from here. */
import type { EpisodeSpec } from '../kit/types';
import { u1Practice } from './u1-practice';
import { u1e3 } from './u1e3';

export const EPISODES: Record<string, { spec: EpisodeSpec; dataDir: string }> = {
  u1e3: { spec: u1e3, dataDir: 'data/e3' },
  'u1-practice': { spec: u1Practice, dataDir: 'data/u1-practice' },
};
