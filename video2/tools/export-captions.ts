/** Export captions as SRT (same chunks the shell burns in). */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { captionChunks, toSrt } from '../src/kit/captions';
import { loadEpisode, ROOT } from './lib';

const ep = loadEpisode();
const compiled = ep.compile();
const out = join(ROOT, 'out', `${ep.spec.id}.srt`);
writeFileSync(out, toSrt(captionChunks(compiled.timeline, ep.wordTimes(), ep.config.captions.maxChars)));
console.log(`captions → ${out}`);
