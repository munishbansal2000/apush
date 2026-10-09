/** Incrementally download and validate historical images from data/<lesson>/images.json. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arg, flag, loadEpisode, PUBLIC, ROOT } from './lib';

// Wikimedia requires a descriptive client plus contact URL. A compliant UA is
// also assigned a substantially less restrictive rate-limit class.
const UA = 'apush-episode-kit/1.1 (https://github.com/munishbansal2000/apush; educational video production)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const LOCK_PATH = join(ROOT, 'data/images.lock.json');
const WIKIMEDIA_DELAY_MS = Math.max(1000, Number(arg('wikimedia-delay-ms', '1500')));
const lastRequestAt = new Map<string, number>();

interface ManifestEntry {
  source_url?: string;
  /** Direct downloads or mirrors of the exact same work, in preference order. */
  download_urls?: string[];
  used_in?: string[];
  license?: string;
  /** Pixel size of the original file ("WxH"), recorded when the entry was verified; smaller local copies are re-fetched. */
  original_size?: string;
}
interface CommonsInfo { title: string; url: string; license: string }

/** Longest edge we download as-is; larger originals come as Commons' standard 3840px rendition (ample for 1080p moves). */
const ORIGINAL_MAX_EDGE = 4000;
const RENDITION_WIDTH = '3840';
/** The original when it is a sensible size, else the 3840px rendition. Never a small thumbnail. */
const bestCommonsUrl = (info: CommonsImageInfo) => (Math.max(info.width, info.height) <= ORIGINAL_MAX_EDGE ? info.url : info.thumburl ?? info.url);
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

const throttleGroup = (url: string) => {
  const host = new URL(url).host.toLowerCase();
  if (host.endsWith('wikimedia.org')) return 'wikimedia.org';
  if (host.endsWith('loc.gov')) return 'loc.gov';
  return host;
};
const retryAfterMs = (value: string | null): number | null => {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
};
const pace = async (url: string) => {
  const group = throttleGroup(url);
  const minimum = group === 'wikimedia.org' ? WIKIMEDIA_DELAY_MS : group === 'loc.gov' ? 3100 : 250;
  const wait = minimum - (Date.now() - (lastRequestAt.get(group) ?? 0));
  if (wait > 0) await sleep(wait);
  lastRequestAt.set(group, Date.now());
};

async function getWithRetry(url: string, tries = 4): Promise<Response | null> {
  let last: Response | null = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    await pace(url);
    try {
      last = await fetch(url, {
        headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20_000),
      });
      if (last.ok) return last;
      if (last.status !== 429 && last.status !== 503 && last.status < 500) return last;
    } catch (error) {
      if (attempt === tries - 1) {
        console.log(`    ! ${new URL(url).host}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }
    }
    if (attempt === tries - 1) return last;
    // Wikimedia explicitly requires clients to honor Retry-After. Without it,
    // wait at least five seconds and exponentially back off.
    const retryAfter = retryAfterMs(last?.headers.get('retry-after') ?? null);
    const wait = retryAfter ?? 5000 * 2 ** attempt;
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
    iiprop: 'url|size|extmetadata', iiurlwidth: RENDITION_WIDTH, maxlag: '5', origin: '*',
  });
  const res = await getWithRetry(`${COMMONS_API}?${q}`);
  if (!res?.ok) return null;
  const data = await res.json() as CommonsApiResponse;
  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  return { title, url: bestCommonsUrl(info), license: strip(info.extmetadata?.LicenseShortName?.value) || 'unknown' };
}

/** Recover from plausible-but-nonexistent filenames produced by image research. */
async function searchCommonsInfo(wantedTitle: string): Promise<CommonsInfo | null> {
  const stem = wantedTitle.replace(/\.[^.]+$/, '').replace(/[_(),–—-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const q = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrsearch: `${stem} filetype:bitmap`,
    gsrnamespace: '6', gsrlimit: '10', prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: RENDITION_WIDTH, maxlag: '5', origin: '*',
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
    url: bestCommonsUrl(best.info!),
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

/** Resolve an LOC item/resource page through its supported JSON API. */
async function locImageUrls(sourceUrl: string): Promise<string[]> {
  const parsed = new URL(sourceUrl);
  if (!parsed.host.toLowerCase().endsWith('loc.gov')) return [];
  parsed.search = '';
  parsed.searchParams.set('fo', 'json');
  parsed.searchParams.set('at', 'resources');
  const res = await getWithRetry(parsed.href);
  if (!res?.ok || !responseType(res).includes('json')) return [];
  const data = await res.json() as unknown;
  const found: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === 'string') {
      const absolute = value.startsWith('//') ? `https:${value}` : value;
      try {
        const url = new URL(absolute);
        if (url.host.toLowerCase().endsWith('loc.gov') && /(?:\.(?:jpe?g|png|webp)(?:\?|$)|\/default\.jpg(?:\?|$))/i.test(url.href)) found.push(url.href);
      } catch {}
      return;
    }
    if (Array.isArray(value)) for (const child of value) walk(child);
    else if (value && typeof value === 'object') for (const child of Object.values(value as Record<string, unknown>)) walk(child);
  };
  walk(data);
  const score = (url: string) =>
    (/tile\.loc\.gov\/image-services\/iiif/i.test(url) ? 100 : 0) +
    (/\/full\//i.test(url) ? 20 : 0) +
    (/default\.jpg/i.test(url) ? 10 : 0) -
    (/(?:thumb|small|icon)/i.test(url) ? 50 : 0);
  return [...new Set(found)].sort((a, b) => score(b) - score(a));
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
      urls.push(`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(info.title)}?width=${RENDITION_WIDTH}`);
      license = info.license;
      const manifestPD = /public domain|cc0|\bpd\b/i.test(entry.license ?? '');
      const sourcePD = /public domain|cc0|\bpd\b/i.test(info.license);
      if (manifestPD !== sourcePD) console.log(`    ! license metadata differs: manifest "${entry.license}", Commons "${info.license}"`);
    }
    // Keep the requested title as a fallback if search/API resolution failed.
    urls.push(`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(title)}?width=${RENDITION_WIDTH}`);
  } else if (/\.(?:jpe?g|png|webp|tiff?)(?:\?|$)/i.test(source)) {
    urls.push(source);
  } else if (new URL(source).host.toLowerCase().endsWith('loc.gov')) {
    const resolved = await locImageUrls(source);
    if (resolved.length) {
      console.log(`    ... LOC API resolved ${resolved.length} image derivative(s)`);
      urls.push(...resolved);
    }
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
    gsrnamespace: '6', gsrlimit: '10', prop: 'imageinfo', iiprop: 'size|extmetadata', maxlag: '5', origin: '*',
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
  // A local copy smaller than the verified original (e.g. an old 250px thumbnail) is re-fetched.
  const [ow] = (entry.original_size ?? '').split('x').map(Number);
  const expectedWidth = ow ? Math.min(ow, ow > ORIGINAL_MAX_EDGE ? Number(RENDITION_WIDTH) : ow) : 0;
  const undersized = expectedWidth > 0 && (old?.width ?? 0) < expectedWidth * 0.95;
  if (!flag('force') && !undersized && existsSync(out) && old?.source_url === entry.source_url && sha(out) === old.sha256) {
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
