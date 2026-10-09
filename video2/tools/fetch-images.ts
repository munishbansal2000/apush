/** Incrementally download and validate historical images from data/<lesson>/images.json. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arg, flag, loadEpisode, PUBLIC, ROOT } from './lib';

const UA = 'apush-episode-kit/1.0 (educational video production)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const LOCK_PATH = join(ROOT, 'data/images.lock.json');

interface ManifestEntry {
  source_url?: string;
  /** Direct downloads or mirrors of the exact same work, in preference order. */
  download_urls?: string[];
  used_in?: string[];
  license?: string;
}
interface CommonsInfo { title: string; url: string; license: string }
interface CommonsImageInfo {
  thumburl?: string; url: string; width: number; height: number;
  extmetadata?: Record<string, { value: string }>;
}
interface CommonsApiResponse {
  query?: { pages?: Record<string, { imageinfo?: CommonsImageInfo[] }> };
}
interface LockEntry {
  source_url: string; sha256: string; width: number; height: number;
  license: string; fetchedAt: string;
}

const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const responseType = (res: Response | null) => res?.headers.get('content-type') ?? '';
const isImageResponse = (res: Response | null) =>
  !!res?.ok && /^(image\/|application\/octet-stream)/i.test(responseType(res));

async function getWithRetry(url: string, tries = 2): Promise<Response | null> {
  let last: Response | null = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      last = await fetch(url, {
        headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20_000),
      });
      if (last.ok || last.status === 429 || last.status < 500) return last;
    } catch (error) {
      if (attempt === tries - 1) {
        console.log(`    ! ${new URL(url).host}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }
    }
    const retryAfter = Number(last?.headers.get('retry-after')) * 1000;
    const wait = Math.min(retryAfter || 1500 * 2 ** attempt, 30_000);
    console.log(`    ... ${last ? `HTTP ${last.status}` : 'network error'}, retrying in ${(wait / 1000).toFixed(1)}s`);
    await sleep(wait);
  }
  return last;
}

function decode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

/** File title from either a Commons description page or upload URL. */
export function commonsTitle(sourceUrl: string): string | null {
  const page = /commons\.wikimedia\.org\/wiki\/(?:File:|File%3A)([^?#]+)/i.exec(sourceUrl);
  if (page) return decode(page[1]).replace(/_/g, ' ');
  const upload = /upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[^/]+\/([^/]+)/i.exec(sourceUrl);
  return upload ? decode(upload[1]).replace(/_/g, ' ') : null;
}

async function commonsInfo(title: string): Promise<CommonsInfo | null> {
  const q = new URLSearchParams({
    action: 'query', format: 'json', titles: `File:${title}`, prop: 'imageinfo',
    iiprop: 'url|size|extmetadata', iiurlwidth: '2400', origin: '*',
  });
  const res = await getWithRetry(`${COMMONS_API}?${q}`);
  if (!res?.ok) return null;
  const data = await res.json() as CommonsApiResponse;
  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  return { title, url: info.thumburl ?? info.url, license: strip(info.extmetadata?.LicenseShortName?.value) || 'unknown' };
}

/** Recover from plausible-but-nonexistent filenames produced by image research. */
async function searchCommonsInfo(wantedTitle: string): Promise<CommonsInfo | null> {
  const stem = wantedTitle.replace(/\.[^.]+$/, '').replace(/[_(),–—-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const q = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrsearch: `${stem} filetype:bitmap`,
    gsrnamespace: '6', gsrlimit: '10', prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '2400', origin: '*',
  });
  const res = await getWithRetry(`${COMMONS_API}?${q}`);
  if (!res?.ok) return null;
  const data = await res.json() as {query?: {pages?: Record<string, {title: string; imageinfo?: CommonsImageInfo[]}>}};
  const ignore = new Set(['file', 'jpg', 'jpeg', 'png', 'webp', 'the', 'and', 'with', 'from']);
  const tokens = (value: string) => new Set(value.toLowerCase().match(/[a-z0-9]+/g)?.filter(token => token.length > 2 && !ignore.has(token)) ?? []);
  const wanted = tokens(wantedTitle);
  const ranked = Object.values(data.query?.pages ?? {}).map(page => {
    const info = page.imageinfo?.[0];
    const got = tokens(page.title);
    const score = wanted.size ? [...wanted].filter(token => got.has(token)).length / wanted.size : 0;
    return {page, info, score};
  }).filter(row => row.info).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < 0.5) return null;
  const canonicalTitle = best.page.title.replace(/^File:/i, '');
  console.log(`    ... Commons corrected "${wantedTitle}" to "${canonicalTitle}" (${Math.round(best.score * 100)}% token match)`);
  return {
    title: canonicalTitle,
    url: best.info!.thumburl ?? best.info!.url,
    license: strip(best.info!.extmetadata?.LicenseShortName?.value) || 'unknown',
  };
}

/** Resolve an institution record page to the image it explicitly embeds. */
async function imageFromHtml(sourceUrl: string): Promise<string | null> {
  const res = await getWithRetry(sourceUrl, 2);
  if (!res?.ok || !responseType(res).includes('text/html')) return null;
  const html = await res.text();
  const contentImage = /<div[^>]+id=["']contentPage["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)/i.exec(html)?.[1];
  const socialImage = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i.exec(html)?.[1];
  const found = contentImage ?? socialImage;
  if (!found) return null;
  const resolved = new URL(found.replace(/^http:\/\//i, 'https://'), sourceUrl).href;
  console.log(`    ... resolved record page to ${resolved}`);
  return resolved;
}

async function candidates(entry: ManifestEntry): Promise<{ urls: string[]; license: string }> {
  const source = entry.source_url!;
  const title = commonsTitle(source);
  let license = entry.license ?? 'unknown';
  const urls: string[] = [];
  if (title) {
    const info = await commonsInfo(title) ?? await searchCommonsInfo(title);
    if (info) {
      urls.push(info.url);
      urls.push(`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(info.title)}?width=2400`);
      license = info.license;
      const manifestPD = /public domain|cc0|\bpd\b/i.test(entry.license ?? '');
      const sourcePD = /public domain|cc0|\bpd\b/i.test(info.license);
      if (manifestPD !== sourcePD) console.log(`    ! license metadata differs: manifest "${entry.license}", Commons "${info.license}"`);
    }
    // Keep the requested title as a fallback if search/API resolution failed.
    urls.push(`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(title)}?width=2400`);
  } else if (/\.(?:jpe?g|png|webp|tiff?)(?:\?|$)/i.test(source)) {
    urls.push(source);
  } else {
    const resolved = await imageFromHtml(source);
    if (resolved) urls.push(resolved);
  }
  // Meta-supplied mirrors remain useful if the API or Wikimedia CDN is throttled,
  // but a verified API URL is preferred over guessed upload hash paths.
  urls.push(...(entry.download_urls ?? []));
  return { urls: [...new Set(urls)], license };
}

async function search(query: string) {
  const q = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6', gsrlimit: '10', prop: 'imageinfo', iiprop: 'size|extmetadata', origin: '*',
  });
  const res = await getWithRetry(`${COMMONS_API}?${q}`);
  if (!res?.ok) throw new Error(`Commons search failed (${res?.status ?? 'network error'})`);
  const data = await res.json() as { query?: { pages?: Record<string, {
    title: string;
    imageinfo?: CommonsImageInfo[];
  }> } };
  for (const page of Object.values(data.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    const license = strip(info?.extmetadata?.LicenseShortName?.value);
    const href = `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_')).replace(/%3A/i, ':')}`;
    console.log(`${license.padEnd(18)} ${String(info?.width ?? '?').padStart(5)}x${String(info?.height ?? '?').padEnd(5)} ${href}`);
  }
}

const query = arg('search');
if (query) {
  await search(query);
  process.exit(0);
}

/** Load manifest from per-lesson files. --lesson filters to one lesson. */
function loadManifest(): Record<string, ManifestEntry> {
  const lesson = arg('lesson');
  const manifest: Record<string, ManifestEntry> = {};
  const dataDir = join(ROOT, 'data');
  // Per-lesson files: data/<lesson>/images.json
  const lessons = lesson ? [lesson] : readdirSync(dataDir).filter(d => {
    try { return statSync(join(dataDir, d)).isDirectory() && existsSync(join(dataDir, d, 'images.json')); }
    catch { return false; }
  });
  for (const l of lessons) {
    const fp = join(dataDir, l, 'images.json');
    if (!existsSync(fp)) continue;
    const entries = JSON.parse(readFileSync(fp, 'utf8')) as Record<string, ManifestEntry>;
    Object.assign(manifest, entries);
  }
  // Fallback to legacy monolithic file
  const legacy = join(ROOT, 'src', 'data', 'images.json');
  if (!Object.keys(manifest).length && existsSync(legacy)) {
    Object.assign(manifest, JSON.parse(readFileSync(legacy, 'utf8')));
  }
  return manifest;
}
const manifest = loadManifest();
const lock: Record<string, LockEntry> = existsSync(LOCK_PATH) ? JSON.parse(readFileSync(LOCK_PATH, 'utf8')) : {};
const saveLock = () => writeFileSync(LOCK_PATH, `${JSON.stringify(Object.fromEntries(Object.entries(lock).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`);

const only = arg('only');
let selected: Set<string>;
if (only) {
  selected = new Set([only]);
} else if (flag('all')) {
  selected = new Set(Object.keys(manifest).filter(path => !path.startsWith('_')));
} else {
  try {
    const ep = loadEpisode();
    const key = `${ep.spec.manifestKey}:`;
    selected = new Set(Object.entries(manifest)
      .filter(([, entry]) => entry.used_in?.some(use => use.startsWith(key)))
      .map(([path]) => path));
  } catch (e) {
    throw new Error(`fetch-images needs --only <path> or --all when no episode is loaded: ${(e as Error).message}`);
  }
}

const targets = Object.entries(manifest).filter(([path]) => selected.has(path));
if (only && !manifest[only]) throw new Error(`${only} is not in images.json`);

let fetched = 0;
let skipped = 0;
const errors: string[] = [];
const warnings: string[] = [];

for (const [path, entry] of targets) {
  if (!entry.source_url) {
    errors.push(`${path}: no source_url`);
    continue;
  }
  const out = join(PUBLIC, path);
  const old = lock[path];
  if (!flag('force') && existsSync(out) && old?.source_url === entry.source_url && sha(out) === old.sha256) {
    skipped++;
    continue;
  }

  console.log(`  -> ${path}`);
  const resolved = await candidates(entry);
  let response: Response | null = null;
  let usedUrl = '';
  let lastHost = '';
  for (const url of resolved.urls) {
    const host = new URL(url).host;
    // Small delay when switching hosts to avoid hammering
    if (lastHost && host !== lastHost) {
      await new Promise(r => setTimeout(r, 500));
    }
    lastHost = host;
    response = await getWithRetry(url);
    if (isImageResponse(response)) {
      usedUrl = url;
      console.log(`    ✓ got it from ${host}`);
      break;
    }
    console.log(`    ... unusable ${host} response (${response?.status ?? 'network'} ${responseType(response)})`);
  }
  if (!isImageResponse(response)) {
    errors.push(`${path}: all ${resolved.urls.length} sources failed (${[...new Set(resolved.urls.map(url => new URL(url).host))].join(', ')})`);
    continue;
  }

  mkdirSync(dirname(out), { recursive: true });
  const bytes = Buffer.from(await response!.arrayBuffer());
  const temp = `${out}.download`;
  writeFileSync(temp, bytes);
  try {
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', temp, '-q:v', '3', '-frames:v', '1', out]);
    const dimensions = execFileSync('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', out,
    ], { encoding: 'utf8' }).trim();
    const [width, height] = dimensions.split(',').map(Number);
    if (!Number.isFinite(width) || !Number.isFinite(height)) throw new Error('ffprobe returned no dimensions');
    if (width < 1280) warnings.push(`${path}: only ${dimensions} (soft on a 1920 frame)`);
    console.log(`  OK ${path}  ${dimensions}  ${(bytes.length / 1024).toFixed(0)} KB via ${new URL(usedUrl).host}`);
    lock[path] = {
      source_url: entry.source_url, sha256: sha(out), width, height,
      license: resolved.license, fetchedAt: new Date().toISOString(),
    };
    saveLock();
    fetched++;
  } catch (error) {
    errors.push(`${path}: downloaded file does not decode (${error instanceof Error ? error.message : String(error)})`);
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
  await sleep(250);
}

for (const path of Object.keys(lock)) if (!manifest[path]) delete lock[path];
saveLock();
console.log(`\n${fetched} fetched, ${skipped} already current, ${errors.length} failed (of ${targets.length})`);
for (const warning of warnings) console.log(`  ! ${warning}`);
for (const error of errors) console.error(`  ERROR ${error}`);
if (errors.length) process.exitCode = 1;
