/**
 * Regenerate this episode's used_in entries in images.json from the compiled beats.
 * Other episodes' entries are left untouched. Placement is authored in the beats only.
 */
import { writeFileSync } from 'node:fs';
import { expectedUsedIn } from '../src/kit/validate';
import { loadEpisode, MANIFEST_PATH } from './lib';

const ep = loadEpisode();
const compiled = ep.compile();
const want = expectedUsedIn(compiled);
const key = `${ep.spec.manifestKey}:`;
let changed = 0;
for (const [img, entry] of Object.entries(ep.manifest)) {
  if (!entry || !Array.isArray(entry.used_in)) {
    console.error(`skipping malformed images.json entry "${img}"`);
    continue;
  }
  const others = entry.used_in.filter(u => !u.startsWith(key));
  const next = [...new Set([...others, ...[...(want.get(img) ?? [])].sort()])];
  if (JSON.stringify(next) !== JSON.stringify(entry.used_in)) changed++;
  entry.used_in = next;
}
const missing = [...want.keys()].filter(img => !ep.manifest[img]);
writeFileSync(MANIFEST_PATH, JSON.stringify(ep.manifest, null, 1) + '\n');
console.log(`images.json: ${changed} entries updated${missing.length ? `; NOT IN MANIFEST (add by hand with license/source/credit): ${missing.join(', ')}` : ''}`);
