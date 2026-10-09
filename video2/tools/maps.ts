/**
 * Map views (docs/MAP_VIEWS.md) and period layers (docs/PERIOD_LAYERS.md).
 *
 *   npm run maps -- list                                   views (with focus targets) and period layers (with years)
 *   npm run maps -- validate                               views, the period worklist, every layer; exit 1 on any error
 *   npm run maps -- status                                 the period worklist: what is missing, in review, approved
 *   npm run maps -- preview <view id|all> [--period 1763]  stills of the opening framing and each focus target, rendered
 *                                                          by the real renderer -> out/review/maps/<view>[-<period>].png
 *   npm run maps -- layer-preview <geo id>                 a layer on the view that fits it best, at its first day
 *   npm run maps -- review <geo id> verify|approve|reject|candidate [--note "..."] [--by name]
 * Previews need Chrome (REMOTION_BROWSER) like any render.
 */
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT, arg} from './lib';
import {parseTranscript} from './pipeline-core';
import {loadMapViews, validateMapView, type MapViewDef, type PeriodFeature} from './pipeline/map-views';
import {periodStatus, validatePeriods, type PeriodWorklist} from './pipeline/periods';
import {resolveShotPlan, type ShotPlan} from './pipeline/shots';

const LIB = join(ROOT, 'data', 'library');
const cmd = process.argv[2];
const fail = (m: string): never => { console.error(m); process.exit(1); };

const PERIODS = join(LIB, 'periods.json');
const loadPeriods = (): PeriodWorklist => (existsSync(PERIODS) ? JSON.parse(readFileSync(PERIODS, 'utf8')) : {snapshots: [], layers: []});
const geoFile = (id: string) => join(LIB, 'geo', `${id}.geojson`);

function loadGeo(): Record<string, PeriodFeature> {
  const dir = join(LIB, 'geo');
  return Object.fromEntries(readdirSync(dir).filter(f => f.endsWith('.geojson')).flatMap(f => {
    const d = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const features = d.type === 'FeatureCollection' ? d.features : [d];
    return features.map((x: PeriodFeature) => [x.properties.id, x] as const);
  }));
}

function list() {
  const views = loadMapViews(LIB);
  console.log(`${Object.keys(views).length} map views:`);
  for (const v of Object.values(views).sort((a, b) => a.id.localeCompare(b.id))) console.log(`  ${v.id.padEnd(30)} ${v.projection.padEnd(5)} ${v.name}\n  ${''.padEnd(30)}       focus: ${Object.keys(v.focus ?? {}).join(', ') || '(none)'}`);
  const layers = Object.values(loadGeo()).filter(g => g.properties.layer?.base);
  console.log(`\n${layers.length} period layer(s):`);
  for (const g of layers) console.log(`  ${g.properties.id.padEnd(42)} ${g.properties.validFrom}..${g.properties.validTo}  ${g.properties.layer!.side}  [${g.properties.review.status}]`);
}

function validate(): number {
  const dir = join(LIB, 'maps');
  const geo = loadGeo();
  const issues: string[] = [];
  const ids = new Map<string, string>();
  for (const f of existsSync(dir) ? readdirSync(dir).filter(x => x.endsWith('.json')) : []) {
    let view: MapViewDef;
    try { view = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch (e) { issues.push(`${f}: not valid JSON (${(e as Error).message})`); continue; }
    issues.push(...validateMapView(view, f, geo));
    if (ids.has(view.id)) issues.push(`${f}: id ${view.id} is also used by ${ids.get(view.id)}`);
    ids.set(view.id, f);
  }
  // Period layers: the library validator checks their schema; here, the worklist, geometry, chains, overlaps, coverage.
  const periods = validatePeriods(loadPeriods(), geo, loadMapViews(LIB));
  issues.push(...periods.errors);
  for (const i of issues) console.log(`  - ${i}`);
  for (const w of periods.warnings) console.log(`  ~ ${w}`);
  const layers = Object.values(geo).filter(g => g.properties.layer?.base).length;
  console.log(`${ids.size} view(s), ${loadPeriods().layers.length} worklist layer(s), ${layers} layer file(s) checked: ${issues.length ? `${issues.length} problem(s)` : 'all valid'}${periods.warnings.length ? `, ${periods.warnings.length} warning(s)` : ''}`);
  return issues.length;
}

function status() {
  const st = periodStatus(loadPeriods(), loadGeo());
  const mark: Record<string, string> = {approved: '[x]', verified: '[v]', candidate: '[c]', rejected: '[!]', missing: '[ ]'};
  for (const s of st.snapshots) {
    const done = s.layers.filter(l => l.status === 'approved').length;
    console.log(`${s.year} ${s.title}: ${done}/${s.layers.length} approved`);
    for (const l of s.layers) console.log(`  ${mark[l.status] ?? l.status} ${l.id}`);
  }
  const by = (k: string) => st.layers.filter(l => l.status === k).length;
  console.log(`\nlayers: ${st.layers.length} in the worklist; ${by('approved')} approved, ${by('verified')} verified, ${by('candidate')} candidate, ${by('rejected')} rejected, ${by('missing')} missing`);
  const next = st.layers.filter(l => l.status === 'missing').sort((a, b) => a.priority - b.priority).slice(0, 8);
  if (next.length) console.log(`next to trace (priority first): ${next.map(l => l.id).join(', ')}`);
}

/** The view that fits a layer best: the smallest one containing it, else the one overlapping it most. */
function viewFor(f: PeriodFeature, views: Record<string, MapViewDef>): MapViewDef {
  const pts = (JSON.stringify(f.geometry.coordinates).match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g) ?? []).map(p => p.split(',').map(Number));
  const [w, s, e, n] = [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
  const area = (v: MapViewDef) => (v.extent[1][0] - v.extent[0][0]) * (v.extent[1][1] - v.extent[0][1]);
  const overlap = (v: MapViewDef) => Math.max(0, Math.min(e, v.extent[1][0]) - Math.max(w, v.extent[0][0])) * Math.max(0, Math.min(n, v.extent[1][1]) - Math.max(s, v.extent[0][1]));
  const all = Object.values(views).filter(v => v.projection === 'us');
  const containing = all.filter(v => v.extent[0][0] <= w && v.extent[0][1] <= s && v.extent[1][0] >= e && v.extent[1][1] >= n).sort((a, b) => area(a) - area(b));
  return containing[0] ?? all.sort((a, b) => overlap(b) - overlap(a))[0];
}

function review(id: string, decision: string) {
  const statuses: Record<string, string> = {verify: 'verified', approve: 'approved', reject: 'rejected', candidate: 'candidate'};
  const next = statuses[decision] ?? fail('review <geo id> verify|approve|reject|candidate [--note "..."]');
  const file = geoFile(id);
  if (!existsSync(file)) fail(`no file ${relative(ROOT, file)}`);
  if (next === 'approved' || next === 'verified') {
    const own = validatePeriods(loadPeriods(), loadGeo(), loadMapViews(LIB)).errors.filter(e => e.includes(id));
    if (own.length) fail(`${id} does not validate yet:\n${own.map(e => `  - ${e}`).join('\n')}`);
  }
  const d = JSON.parse(readFileSync(file, 'utf8'));
  const p = d.type === 'FeatureCollection' ? d.features[0].properties : d.properties;
  const note = arg('note');
  p.review = {...p.review, status: next, by: arg('by') ?? process.env.USER ?? 'unknown', at: new Date().toISOString().slice(0, 10),
    ...(note ? {notes: [p.review?.notes, `${next}: ${note}`].filter(Boolean).join(' | ')} : {})};
  writeFileSync(file, `${JSON.stringify(d, null, 2)}\n`);
  console.log(`${id}: ${next}`);
}

async function preview(which: string, periodArg?: string) {
  const views = loadMapViews(LIB);
  const targets = which === 'all' ? Object.values(views) : [views[which] ?? fail(`unknown view ${which} (npm run maps -- list)`)];
  const raw = periodArg ?? arg('period');
  const period = raw === undefined ? undefined : /^\d+$/.test(raw) ? Number(raw) : raw;
  const geo = loadGeo();
  const {bundle} = await import('@remotion/bundler');
  const {openBrowser, renderStill, selectComposition} = await import('@remotion/renderer');
  const browserExecutable = process.env.REMOTION_BROWSER ?? null;
  const serveUrl = await bundle({entryPoint: join(ROOT, 'src/documentary-index.tsx')});
  const browser = await openBrowser('chrome', {browserExecutable});
  try {
    for (const view of targets) {
      const stops = [['opening', null] as const, ...Object.keys(view.focus ?? {}).map(f => [f, f] as const)];
      // One 3s line per stop; each map shot starts on its line and moves to the focus.
      const words = stops.map((_, i) => `stop${i}`);
      const turns = parseTranscript(words.map(w => `Maya: ${w} of the map preview.`).join('\n'));
      const timing = {starts: turns.map((_, i) => i * 3), durations: turns.map(() => 3), totalSec: turns.length * 3};
      const plan = {episode: 'preview', shots: stops.map(([, focus], i) => ({type: 'map', at: {turn: i, phrase: words[i]}, view: view.id, ...(period ? {period} : {}),
        ...(focus ? {moves: [{at: {offset: 0.1}, to: focus}]} : {})}))} as unknown as ShotPlan;
      const resolved = resolveShotPlan(plan, turns, timing, {}, {imageSizes: {}, geo: geo as never, mapViews: views, allowEstimated: true, allowUnapproved: true, rules: {...(await import('./pipeline/shots')).LOOK_RULES, minShotSec: 0}});
      const inputProps = {episode: 'preview', shots: resolved.shots, years: [], boxes: [], turns: turns.map(t => ({id: t.id, kind: t.kind, speaker: t.speaker})), timing};
      const composition = await selectComposition({serveUrl, id: 'DocEpisode', inputProps, browserExecutable, puppeteerInstance: browser, logLevel: 'error'});
      const name = `${view.id.replace(/^map\./, '')}${period ? `-${period}` : ''}`;
      const dir = join(ROOT, 'out', 'review', 'maps', name);
      rmSync(dir, {recursive: true, force: true}); mkdirSync(dir, {recursive: true});
      for (let i = 0; i < stops.length; i++) {
        await renderStill({composition, serveUrl, inputProps, browserExecutable, puppeteerInstance: browser, logLevel: 'error', scale: 0.35, frame: Math.round((i * 3 + 2.6) * composition.fps), output: join(dir, `${String(i).padStart(3, '0')}.png`)});
      }
      const sheet = join(ROOT, 'out', 'review', 'maps', `${name}.png`);
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(dir, '%03d.png'), '-vf', `tile=3x${Math.ceil(stops.length / 3)}:padding=6:color=gray`, '-frames:v', '1', sheet]);
      writeFileSync(sheet.replace(/\.png$/, '.txt'), stops.map(([label], i) => `${i + 1}: ${label}`).join('\n') + '\n');
      console.log(`${view.id}${period ? ` (${period})` : ''}: ${stops.length} still(s) -> ${relative(ROOT, sheet)}`);
    }
  } finally {
    await browser.close({silent: true});
  }
}

if (cmd === 'list') list();
else if (cmd === 'validate') process.exitCode = validate() ? 1 : 0;
else if (cmd === 'status') status();
else if (cmd === 'preview') await preview(process.argv[3] ?? fail('preview <view id|all> [--period YEAR]'));
else if (cmd === 'layer-preview') {
  const id = process.argv[3] ?? fail('layer-preview <geo id>');
  const f = loadGeo()[id] ?? fail(`no layer ${id} in data/library/geo`);
  const view = viewFor(f, loadMapViews(LIB));
  console.log(`${id} on ${view.id} at ${f.properties.validFrom}`);
  await preview(view.id, f.properties.validFrom);
} else if (cmd === 'review') review(process.argv[3] ?? fail('review <geo id> <decision>'), process.argv[4] ?? '');
else console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
