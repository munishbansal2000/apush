/**
 * Map views and period layers (docs/MAP_VIEWS.md): list, validate, preview.
 *
 *   npm run maps -- list                                   views (with focus targets) and period layers (with years)
 *   npm run maps -- validate                               every view + every period layer; exit 1 on any problem
 *   npm run maps -- preview <view id|all> [--period 1763]  stills of the opening framing and each focus target, rendered
 *                                                          by the real renderer -> out/review/maps/<view>[-<period>].png
 * Preview needs Chrome (REMOTION_BROWSER) like any render.
 */
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT, arg} from './lib';
import {parseTranscript} from './pipeline-core';
import {loadMapViews, validateMapView, type MapViewDef, type PeriodFeature} from './pipeline/map-views';
import {resolveShotPlan, type ShotPlan} from './pipeline/shots';

const LIB = join(ROOT, 'data', 'library');
const cmd = process.argv[2];
const fail = (m: string): never => { console.error(m); process.exit(1); };

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
  // Period layers: the library validator checks their schema; here, that each one shows up in at least one view.
  const views = Object.values(loadMapViews(LIB));
  for (const g of Object.values(geo).filter(x => x.properties.layer?.base)) {
    const coords = JSON.stringify(g.geometry.coordinates).match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/g)?.map(p => p.split(',').map(Number)) ?? [];
    const seen = views.some(v => coords.some(([x, y]) => x >= v.extent[0][0] && x <= v.extent[1][0] && y >= v.extent[0][1] && y <= v.extent[1][1]));
    if (!seen) issues.push(`${g.properties.id}: no map view covers this period layer (add or widen a view)`);
  }
  for (const i of issues) console.log(`  - ${i}`);
  console.log(`${ids.size} view(s) checked: ${issues.length ? `${issues.length} problem(s)` : 'all valid'}`);
  return issues.length;
}

async function preview(which: string) {
  const views = loadMapViews(LIB);
  const targets = which === 'all' ? Object.values(views) : [views[which] ?? fail(`unknown view ${which} (npm run maps -- list)`)];
  const period = arg('period') ? Number(arg('period')) : undefined;
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
else if (cmd === 'preview') await preview(process.argv[3] ?? fail('preview <view id|all> [--period YEAR]'));
else console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
