/** Create the optional generated data files with empty defaults so a fresh checkout compiles. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEpisode, ROOT } from './lib';

const ep = loadEpisode();
const defaults: Record<string, string> = {
  [`${ep.dataDir}/word_times.json`]: '{}\n', // filled by import:vosk
  [`${ep.dataDir}/levels.json`]: '{}\n', // filled by build:timing
  'data/images.lock.json': '{}\n', // filled by fetch:images
};
for (const [rel, body] of Object.entries(defaults)) {
  const f = join(ROOT, rel);
  if (existsSync(f)) continue;
  mkdirSync(join(f, '..'), { recursive: true });
  writeFileSync(f, body);
  console.log(`  created ${rel}`);
}
