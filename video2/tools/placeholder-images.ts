/**
 * Preview helper: fill every image a lesson needs but this machine lacks with a copy of an image that is present
 * (cycling through them), and lock it as a placeholder. For trying the pipeline on a laptop without downloading.
 * Placeholders are locked with source_url "placeholder:", so the real downloaders replace them on any later run.
 *
 *   npx tsx tools/placeholder-images.ts u3e1      images from data/u3e1/storyboard.json (else shots.json) and images.json
 */
import {copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT} from './lib';

const ep = process.argv[2];
if (!ep) { console.log('usage: npx tsx tools/placeholder-images.ts <lesson>'); process.exit(1); }
const pub = join(ROOT, 'public');
const lockPath = join(ROOT, 'data', 'images.lock.json');
const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) as Record<string, Record<string, unknown>> : {};
const read = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

const wanted = new Set<string>();
const sb = read(join(ROOT, 'data', ep, 'storyboard.json'));
for (const t of sb?.turns ?? []) for (const v of t.visuals ?? []) { const p = v.kind === 'point' ? v.backdrop : v.image; if (p) wanted.add(p); }
for (const s of read(join(ROOT, 'data', ep, 'shots.json'))?.shots ?? []) { const p = s.image ?? s.backdrop; if (p) wanted.add(p); }
for (const p of Object.keys(read(join(ROOT, 'data', ep, 'images.json')) ?? {})) wanted.add(p);

const isPlaceholder = (p: string) => String(lock[p]?.source_url ?? '').startsWith('placeholder:');
// Re-running replaces earlier placeholders (e.g. after better real images arrived).
const present = (p: string) => existsSync(join(pub, p)) && lock[p]?.width && !isPlaceholder(p);
const dir = join(pub, 'historic', ep);
// Only images big enough for a full-frame shot (cover 1920x1080 with zoom headroom), so placeholders never fail the upscale check.
const big = (p: string) => Number(lock[p]?.width) >= 1600 && Number(lock[p]?.height) >= 1000;
const sources = (existsSync(dir) ? readdirSync(dir) : []).map(f => `historic/${ep}/${f}`).filter(p => /\.(jpe?g|png|webp)$/i.test(p) && present(p) && big(p));
if (!sources.length) { console.error(`no real image of at least 1600x1000 in public/historic/${ep} to copy from; download one first`); process.exit(1); }

let made = 0;
for (const p of [...wanted].sort()) {
  if (present(p)) continue;
  const src = sources[made % sources.length];
  const out = join(pub, p);
  mkdirSync(dirname(out), {recursive: true});
  // Same extension as the target: copy when they match, convert otherwise.
  if (src.split('.').pop()!.toLowerCase() === p.split('.').pop()!.toLowerCase()) copyFileSync(join(pub, src), out);
  else {
    // Browsers detect the format from the bytes, so a plain copy works when this ffmpeg cannot write the format.
    try { execFileSync('ffmpeg', ['-y', '-v', 'quiet', '-i', join(pub, src), out], {stdio: 'ignore'}); } catch { copyFileSync(join(pub, src), out); }
  }
  const sha256 = createHash('sha256').update(readFileSync(out)).digest('hex');
  lock[p] = {source_url: `placeholder:${src}`, sha256, width: lock[src].width, height: lock[src].height};
  made++;
}
writeFileSync(lockPath, `${JSON.stringify(Object.fromEntries(Object.entries(lock).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`);
const real = [...wanted].filter(present).length;
console.log(`${ep}: ${made} placeholder image(s) from ${sources.length} real one(s); ${wanted.size} images available (${real} real, ${wanted.size - real} placeholders)`);
