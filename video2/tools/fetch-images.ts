/**
 * Download the real images for an episode from their manifest source_url, replacing the
 * dev placeholders in public/. Self-validating:
 *   - Wikimedia Commons files go through the Commons API, which returns the real file URL,
 *     size, and license metadata; the license is compared with images.json
 *   - every download must be an image (content-type + ffprobe) and ≥1280px wide (warn)
 *   - entries without a fetchable source are reported, never guessed
 *
 * Incremental: data/images.lock.json records, per image, the source_url it came from and the
 * sha256 of the file written. An image is skipped when the file exists, its hash matches the
 * lock, and the manifest's source_url hasn't changed. Placeholders, hand-edited files, and
 * changed sources are (re)fetched. Lock entries are written after each success, so an
 * interrupted run resumes where it stopped.
 *
 *   npm run fetch:images                      images used by the episode (incremental)
 *   npm run fetch:images -- --force           refetch everything selected
 *   npm run fetch:images -- --only historic/u1e3/tomato-plant.jpg
 *   npm run fetch:images -- --all             every manifest entry with a source_url
 *   npm run fetch:images -- --search "Catlin Comanche horsemanship"   find Commons candidates
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arg, flag, loadEpisode, PUBLIC, ROOT } from './lib';

const UA = 'apush-episode-kit/1.0 (educational video production)';
const API = 'https://commons.wikimedia.org/w/api.php';

interface CommonsInfo { url: string; width: number; height: number; license: string; artist: string; date: string; descriptionUrl: string }

const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** fetch with retry/backoff on 429/5xx (Commons rate-limits bursts). */
async function getWithRetry(url: string, tries = 4): Promise<Response> {
  let res: Response | null = null;
  for (let i = 0; i < tries; i++) {
    res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok || (res.status !== 429 && res.status < 500)) return res;
    const wait = Number(res.headers.get('retry-after')) * 1000 || 1500 * 2 ** i;
    console.log(`    … HTTP ${res.status}, retrying in ${(wait / 1000).toFixed(1)}s`);
    await new Promise(r => setTimeout(r, wait));
  }
  return res!;
}

let lastStatus = 0;

async function commonsInfo(fileTitle: string): Promise<CommonsInfo | null> {
  const q = new URLSearchParams({
    action: 'query', format: 'json', titles: `File:${fileTitle}`, prop: 'imageinfo',
    iiprop: 'url|size|extmetadata', iiurlwidth: '2400', origin: '*',
  });
  const res = await getWithRetry(`${API}?${q}`);
  lastStatus = res.status;
  if (!res.ok) return null;
  const data = (await res.json()) as { query?: { pages?: Record<string, { imageinfo?: { thumburl?: string; url: string; width: number; height: number; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[] }> } };
  const page = Object.values(data.query?.pages ?? {})[0];
  const ii = page?.imageinfo?.[0];
  if (!ii) return null;
  const m = ii.extmetadata ?? {};
  return {
    url: ii.thumburl ?? ii.url,
    width: ii.width,
    height: ii.height,
    license: strip(m.LicenseShortName?.value) || 'unknown',
    artist: strip(m.Artist?.value),
    date: strip(m.DateTimeOriginal?.value),
    descriptionUrl: ii.descriptionurl,
  };
}

/** File title from a Commons page URL or an upload.wikimedia.org URL. */
function commonsTitle(sourceUrl: string): string | null {
  const page = /commons\.wikimedia\.org\/wiki\/File:(.+)$/.exec(sourceUrl);
  if (page) return decodeURIComponent(page[1]);
  const upload = /upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/.exec(sourceUrl);
  if (upload) return decodeURIComponent(upload[1]);
  return null;
}

async function search(query: string) {
  const q = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '10',
    prop: 'imageinfo', iiprop: 'size|extmetadata', origin: '*',
  });
  const res = await fetch(`${API}?${q}`, { headers: { 'User-Agent': UA } });
  const data = (await res.json()) as { query?: { pages?: Record<string, { title: string; imageinfo?: { width: number; height: number; extmetadata?: Record<string, { value: string }> }[] }> } };
  for (const p of Object.values(data.query?.pages ?? {})) {
    const ii = p.imageinfo?.[0];
    const lic = strip(ii?.extmetadata?.LicenseShortName?.value);
    const date = strip(ii?.extmetadata?.DateTimeOriginal?.value);
    console.log(`${lic.padEnd(18)} ${String(ii?.width ?? '?').padStart(5)}×${String(ii?.height ?? '?').padEnd(5)} ${date.slice(0, 20).padEnd(20)} https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_')).replace(/%3A/, ':')}`);
  }
}

const query = arg('search');
if (query) {
  await search(query);
  process.exit(0);
}

interface LockEntry { source_url: string; sha256: string; width: number; height: number; license: string; fetchedAt: string }
const LOCK_PATH = join(ROOT, 'data/images.lock.json');
const lock: Record<string, LockEntry> = existsSync(LOCK_PATH) ? JSON.parse(readFileSync(LOCK_PATH, 'utf8')) : {};
const saveLock = () => writeFileSync(LOCK_PATH, JSON.stringify(Object.fromEntries(Object.entries(lock).sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n');
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

/** Why an image needs fetching, or null when it is current. */
function staleReason(path: string, sourceUrl: string): string | null {
  const file = join(PUBLIC, path);
  const entry = lock[path];
  if (!existsSync(file)) return 'missing';
  if (!entry) return 'not in lock (placeholder?)';
  if (entry.source_url !== sourceUrl) return 'source_url changed';
  if (sha(file) !== entry.sha256) return 'file differs from lock';
  return null;
}

const ep = loadEpisode();
const key = `${ep.spec.manifestKey}:`;
const only = arg('only');
const targets = Object.entries(ep.manifest).filter(([path, m]) => !!m && Array.isArray(m.used_in) && (
  only ? path === only : flag('all') ? !!m.source_url : m.used_in.some(u => u.startsWith(key))));
if (only && !targets.length) throw new Error(`${only} is not in images.json`);
let ok = 0;
let skipped = 0;
const problems: string[] = [];

for (const [path, m] of targets) {
  if (m.source_url && !flag('force')) {
    const reason = staleReason(path, m.source_url);
    if (!reason) {
      skipped++;
      continue;
    }
    console.log(`  → ${path}: ${reason}`);
  }
  if (!m.source_url) {
    problems.push(`${path}: no source_url. Find one with --search, add source_url/license/credit to images.json, rerun`);
    continue;
  }
  const title = commonsTitle(m.source_url);
  let url = m.source_url;
  let license = m.license;
  if (title) {
    const info = await commonsInfo(title);
    if (!info) {
      problems.push(lastStatus === 200 ? `${path}: Commons has no file "${title}"` : `${path}: Commons API error HTTP ${lastStatus}; rerun`);
      continue;
    }
    url = info.url;
    license = info.license;
    const manifestPD = /public domain|cc0|pd/i.test(m.license);
    const commonsPD = /public domain|cc0|pd/i.test(info.license);
    if (manifestPD !== commonsPD) problems.push(`${path}: license mismatch: images.json says "${m.license}", Commons says "${info.license}"`);
  } else if (!/\.(jpe?g|png|webp|tiff?)(\?|$)/i.test(m.source_url)) {
    problems.push(`${path}: source_url is a web page, not a file (${m.source_url}). Add a direct download URL as source_url or download by hand`);
    continue;
  }

  const res = await getWithRetry(url);
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.startsWith('image/')) {
    problems.push(`${path}: download failed (${res.status} ${type})`);
    continue;
  }
  const out = join(PUBLIC, path);
  mkdirSync(dirname(out), { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = `${out}.download`;
  writeFileSync(tmp, buf);
  // normalize to the manifest's extension (JPEG) and verify it decodes
  try {
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', tmp, '-q:v', '3', '-frames:v', '1', out]);
    execFileSync('rm', [tmp]);
    const dims = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', out], { encoding: 'utf8' }).trim();
    const [w, h] = dims.split(',').map(Number);
    if (w < 1280) problems.push(`${path}: only ${dims} (soft on a 1920 frame)`);
    console.log(`  ✓ ${path}  ${dims}  ${(buf.length / 1024).toFixed(0)} KB`);
    lock[path] = { source_url: m.source_url, sha256: sha(out), width: w, height: h, license, fetchedAt: new Date().toISOString() };
    saveLock(); // after every success, so an interrupted run resumes
    ok++;
  } catch {
    problems.push(`${path}: downloaded file does not decode as an image`);
  }
  await new Promise(r => setTimeout(r, 800)); // be polite to Commons
}

// stale lock entries (image removed from the manifest) are pruned
for (const path of Object.keys(lock)) if (!ep.manifest[path]) delete lock[path];
saveLock();
console.log(`\n${ok} fetched, ${skipped} already current, ${targets.length - ok - skipped} not fetched (of ${targets.length})`);
for (const p of problems) console.log(`  ! ${p}`);
console.log('\nNext: check each image still matches its focus regions (images.json `focus`, set verified: true), then npm run validate.');
process.exit(problems.some(p => !p.includes('soft on')) ? 1 : 0);
