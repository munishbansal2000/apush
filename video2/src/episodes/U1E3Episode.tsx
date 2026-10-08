/** U1E3 — The Exchange. Data in ./u1e3.ts; wiring in ./make.tsx. */
import levels from '../../data/e3/levels.json';
import timing from '../../data/e3/timing_map.json';
import turns from '../../data/e3/turns.json';
import wordTimes from '../../data/e3/word_times.json';
import { buildEpisode } from './make';
import { u1e3 } from './u1e3';

export const U1E3 = buildEpisode(u1e3, { turns, timing, wordTimes, levels }, 'APUSH · UNIT 1');
