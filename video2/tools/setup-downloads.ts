/**
 * Re-download every third-party file the project uses but doesn't commit (see docs/DOWNLOADS.md):
 *   1. fonts      → public/fonts/        (fontsource via jsDelivr + OFL licenses from google/fonts)
 *   2. geography  → src/data/geo/        (us-atlas states; Natural Earth lakes + rivers, trimmed)
 *   3. images     → public/historic/…    (Wikimedia Commons, via tools/fetch-images.ts --all,
 *                                          driven by data/images.json source_url entries)
 *
 *   npx tsx tools/setup-downloads.ts            download what's missing
 *   npx tsx tools/setup-downloads.ts --force    re-download everything
 *   npx tsx tools/setup-downloads.ts --dry-run  list links only
 *   --only fonts|geo|images                     one group
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arg, PUBLIC, ROOT } from './lib';

const force = process.argv.includes('--force');
const dry = process.argv.includes('--dry-run');
const only = arg('only', '');

const FONTSOURCE = 'https://cdn.jsdelivr.net/fontsource/fonts';
export const FONTS: { file: string; url: string }[] = [
  ...[['cinzel', '400', 'normal'], ['cinzel', '700', 'normal'], ['libre-baskerville', '400', 'normal'], ['libre-baskerville', '700', 'normal'],
    ['libre-baskerville', '400', 'italic'], ['plus-jakarta-sans', '400', 'normal'], ['plus-jakarta-sans', '700', 'normal'],
    ['jetbrains-mono', '400', 'normal'], ['jetbrains-mono', '700', 'normal']]
    .map(([f, w, s]) => ({ file: `${f}-${w}-${s}.woff2`, url: `${FONTSOURCE}/${f}@latest/latin-${w}-${s}.woff2` })),
  ...['cinzel', 'librebaskerville', 'plusjakartasans', 'jetbrainsmono']
    .map(f => ({ file: `OFL-${f}.txt`, url: `https://raw.githubusercontent.com/google/fonts/main/ofl/${f}/OFL.txt` })),
];

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
export const GEO = {
  states: { file: 'us-states-10m.json', url: 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json' },
  lakes: { file: 'lakes-50m.json', url: `${NE}/ne_50m_lakes.geojson` },
  rivers: { file: 'us-rivers-10m.json', url: `${NE}/ne_10m_rivers_lake_centerlines.geojson` },
};

async function get(url: string): Promise<Buffer> {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'apush-remotion-setup/1.0' } });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if (res.status < 500 && res.status !== 429) throw new Error(`HTTP ${res.status} ${url}`);
    } catch (e) {
      if (i === 3) throw e;
    }
    await new Promise(r => setTimeout(r, 1000 * 2 ** i));
  }
  throw new Error(`failed: ${url}`);
}

const save = (path: string, data: Buffer | string) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  console.log(`  ✓ ${path.replace(ROOT, '')}`);
};
const need = (path: string) => force || !existsSync(path);

type Coords = number[] | Coords[];
const round = (c: Coords): Coords => (typeof c[0] === 'number' ? (c as number[]).map(v => Math.round(v * 1000) / 1000) : (c as Coords[]).map(round));
const anyInside = (c: Coords, [w, s, e, n]: number[]): boolean =>
  typeof c[0] === 'number' ? (([x, y]) => x >= w && x <= e && y >= s && y <= n)(c as number[]) : (c as Coords[]).some(x => anyInside(x, [w, s, e, n]));

interface Feature { properties: Record<string, unknown>; geometry: { type: string; coordinates: Coords } | null }

async function fonts() {
  console.log('fonts → public/fonts');
  for (const f of FONTS) {
    const out = join(PUBLIC, 'fonts', f.file);
    if (dry) { console.log(`  ${f.url}`); continue; }
    if (need(out)) save(out, await get(f.url));
  }
}

async function geo() {
  console.log('geography → src/data/geo');
  const dir = join(ROOT, 'src/data/geo');
  if (dry) { Object.values(GEO).forEach(g => console.log(`  ${g.url}`)); return; }
  if (need(join(dir, GEO.states.file))) save(join(dir, GEO.states.file), await get(GEO.states.url));
  if (need(join(dir, GEO.lakes.file))) {
    // major lakes only (scalerank ≤ 3), 3-decimal coordinates
    const fc = JSON.parse((await get(GEO.lakes.url)).toString()) as { features: Feature[] };
    const features = fc.features.filter(f => Number(f.properties.scalerank) <= 3 && f.geometry)
      .map(f => ({ type: 'Feature', properties: { name: f.properties.name, scalerank: f.properties.scalerank }, geometry: { type: f.geometry!.type, coordinates: round(f.geometry!.coordinates) } }));
    save(join(dir, GEO.lakes.file), JSON.stringify({ type: 'FeatureCollection', source: `Natural Earth 1:50m lakes (public domain), ${GEO.lakes.url}; scalerank <= 3`, features }));
  }
  if (need(join(dir, GEO.rivers.file))) {
    // rivers touching the contiguous-US box, name + scalerank, 3-decimal coordinates
    const fc = JSON.parse((await get(GEO.rivers.url)).toString()) as { features: Feature[] };
    const box = [-125.5, 23.5, -66, 50.5];
    const features = fc.features.filter(f => f.geometry && anyInside(f.geometry.coordinates, box))
      .map(f => ({ type: 'Feature', properties: { name: f.properties.name ?? null, scalerank: f.properties.scalerank },
        geometry: { type: 'MultiLineString', coordinates: f.geometry!.type === 'LineString' ? [round(f.geometry!.coordinates)] : round(f.geometry!.coordinates) } }));
    save(join(dir, GEO.rivers.file), JSON.stringify({ type: 'FeatureCollection', features }));
  }
}

function images() {
  console.log('images → public/historic (from src/data/images.json)');
  if (dry) {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'src/data/images.json'), 'utf8')) as Record<string, { source_url?: string }>;
    for (const [file, e] of Object.entries(manifest)) if (!file.startsWith('_') && e.source_url) console.log(`  ${file}  ←  ${e.source_url}`);
    return;
  }
  // Use the installed CLI through Node: cross-platform, no shell quoting, and failures
  // propagate so setup cannot claim success after downloading nothing.
  const tsxCli = join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  execFileSync(process.execPath, [tsxCli, 'tools/fetch-images.ts', '--all', ...(force ? ['--force'] : [])], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

if (!only || only === 'fonts') await fonts();
if (!only || only === 'geo') await geo();
if (!only || only === 'images') images();
console.log(dry ? 'dry run: nothing downloaded' : 'downloads complete');
