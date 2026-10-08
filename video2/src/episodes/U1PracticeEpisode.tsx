/** Unit 1 Practice. Questions in data/practice/u1.json; wiring in ./make.tsx. */
import levels from '../../data/u1-practice/levels.json';
import timing from '../../data/u1-practice/timing_map.json';
import turns from '../../data/u1-practice/turns.json';
import wordTimes from '../../data/u1-practice/word_times.json';
import { buildEpisode } from './make';
import { u1Practice } from './u1-practice';

export const U1Practice = buildEpisode(u1Practice, { turns, timing, wordTimes, levels }, 'APUSH · UNIT 1 PRACTICE');
