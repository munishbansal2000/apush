/** YouTube chapter list from spec.chapters (paste into the video description). */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEpisode, ROOT } from './lib';

const ep = loadEpisode();
const compiled = ep.compile();
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const lines = compiled.chapters.map((c, i) => `${fmt(i === 0 ? 0 : c.start)} ${c.spec.label}`);
if (!lines[0]?.startsWith('0:00')) throw new Error('first chapter must start at 0:00 (YouTube requirement)');
const out = join(ROOT, 'out', `${ep.spec.id}.chapters.txt`);
writeFileSync(out, lines.join('\n') + '\n');
console.log(lines.join('\n'));
