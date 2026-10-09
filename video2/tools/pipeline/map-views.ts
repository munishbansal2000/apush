/**
 * Map views (data/library/maps/*.json): reusable map setups (projection, extent, opening camera, tilt, terrain, base
 * labels, named camera targets). The director picks a view by id and adds only what the narration drives: camera
 * moves to a named target or a place, fills, lines and points by library id, colours by name. That keeps map shots
 * short and coordinate-free; expandMapViews turns them into the full map shot the resolver checks.
 */
import {existsSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import type {LonLat} from '../../src/documentary/types';
import {readJson} from '../pipeline-core';
import {yearOf} from '../../src/library/validate';
import {periodInstant, validAt} from './periods';
import {renamedHint} from './renames';
import type {PhraseAnchor} from './anchors';
import type {Cue, PlanShot, ShotPlan} from './shots';

export interface MapViewDef {
  id: string;
  name: string;
  projection: 'us' | 'world';
  extent: [LonLat, LonLat];
  /** Opening framing. */
  camera: {center: LonLat; zoom: number};
  tilt?: number;
  terrain?: {ridges: string[]; rivers?: boolean};
  /** Base map typography (oceans, regions), faded in at the start. */
  labels?: {text: string; lonlat: LonLat; style?: 'region' | 'ocean' | 'town'}[];
  /** Named camera targets the director can move to; a target with a region can be highlighted on arrival. */
  focus?: Record<string, MapFocus>;
}

export interface MapFocus {
  center: LonLat;
  zoom: number;
  /** What a move with "highlight" fills: US states (postal codes) or one library geo region. Timeless names only. */
  region?: {states: string[]; label: string; labelAt: LonLat; color?: string} | {geo: string; label: string; labelAt: LonLat; color?: string};
}

const STATE_CODES = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));

/** A map shot written against a view: no coordinates. */
export interface ViewMapShot {
  type: 'map';
  at: PhraseAnchor;
  view: string;
  /** The moment the narration is about: a year (as it stood at the end of that year) or an ISO date. The base layers
   *  (borders, claims) valid then are drawn automatically. */
  period?: number | string;
  /** Camera moves: to a focus name of the view, or a place id (zoom defaults to 1.4x the view's opening zoom). */
  moves?: {at: Cue; to: string; zoom?: number; ease?: number; highlight?: boolean | string}[];
  fills?: {at: Cue; region: {geo: string} | {state: string} | {country: string}; color: string}[];
  lines?: {at: Cue; geo: string; color?: string; dashed?: boolean; draw?: number; arrow?: boolean}[];
  points?: {at: Cue; place: string; kind?: 'town' | 'fort' | 'battle'; label?: string}[];
  labels?: {at: Cue; text: string; lonlat: LonLat; style?: 'region' | 'ocean' | 'town'}[];
  transition?: 'cut' | 'crossfade';
}

/** Colour names the director may use instead of hex (the map palette). */
export const MAP_COLORS: Record<string, string> = {gold: '#c9a227', amber: '#e2a33b', red: '#b3261e', blue: '#2c5aa0', ink: '#2b1d0e', green: '#3d7a3a', brown: '#8a5a2b', grey: '#77716a'};
/** One colour per side on period maps. */
export const SIDE_COLORS: Record<string, string> = {british: MAP_COLORS.red, french: MAP_COLORS.blue, spanish: MAP_COLORS.gold, native: MAP_COLORS.amber,
  'united-states': MAP_COLORS.green, mexico: MAP_COLORS.brown, confederacy: MAP_COLORS.grey, other: MAP_COLORS.ink};

/** A library geography feature as the period layers need it. */
export interface PeriodFeature {
  geometry: {type: string; coordinates: unknown};
  properties: {id: string; type?: string; validFrom?: string; validTo?: string; review: {status: string}; layer?: {base: true; side: string; label?: string; labelAt?: [number, number]}};
}

/** [west, south, east, north] of any GeoJSON coordinates. */
function bboxOf(coords: unknown): [number, number, number, number] {
  const b: [number, number, number, number] = [180, 90, -180, -90];
  const walk = (c: unknown) => {
    if (Array.isArray(c) && typeof c[0] === 'number') { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1] as number); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1] as number); } else if (Array.isArray(c)) c.forEach(walk);
  };
  walk(coords);
  return b;
}

/** Base layers for a period inside an extent: regions tinted by side, lines dashed, labels where given. */
export function periodLayers(period: number | string, extent: [LonLat, LonLat], geo: Record<string, PeriodFeature>, allowUnapproved = false) {
  const t = periodInstant(period);
  const [[w, s], [e, n]] = extent;
  const fills: {at: Cue; region: {geo: string}; color: string}[] = [];
  const lines: {at: Cue; geo: string; color: string; dashed: boolean; draw: number}[] = [];
  const labels: {at: Cue; text: string; lonlat: LonLat; style: 'region'}[] = [];
  // Older layers first, so a later claim on the same ground (a seceded South, a contested strip) draws on top.
  const ordered = Object.values(geo).filter(f => f.properties.layer?.base).sort((a, b) => yearOf(a.properties.validFrom ?? '0') - yearOf(b.properties.validFrom ?? '0'));
  for (const f of ordered) {
    const p = f.properties;
    if (!p.layer || !validAt(p, t)) continue;
    if (p.review.status !== 'approved' && !allowUnapproved) continue;
    const [fw, fs, fe, fn] = bboxOf(f.geometry.coordinates);
    if (fe < w || fw > e || fn < s || fs > n) continue;
    const color = SIDE_COLORS[p.layer.side] ?? MAP_COLORS.ink;
    if (/Polygon/.test(f.geometry.type)) fills.push({at: {offset: 0.2}, region: {geo: p.id}, color});
    else if (f.geometry.type === 'LineString') lines.push({at: {offset: 0.2}, geo: p.id, color, dashed: true, draw: 1.2});
    if (p.layer.label && p.layer.labelAt) labels.push({at: {offset: 0.5}, text: p.layer.label, lonlat: p.layer.labelAt, style: 'region'});
  }
  return {fills, lines, labels};
}
/** A base layer the storyboard draws itself (its own colour, its own cue) is not drawn twice. */
function withoutOwn(l: ReturnType<typeof periodLayers>, shot: {fills?: {region: object}[]; lines?: object[]}) {
  const own = new Set([...(shot.fills ?? []).map(f => (f.region as {geo?: string}).geo), ...(shot.lines ?? []).map(x => (x as {geo?: string}).geo)]);
  return {fills: l.fills.filter(f => !own.has(f.region.geo)), lines: l.lines.filter(x => !own.has(x.geo)), labels: l.labels};
}
const color = (c: string | undefined) => (c && MAP_COLORS[c.toLowerCase()]) ?? c;

export function loadMapViews(libDir: string): Record<string, MapViewDef> {
  const dir = join(libDir, 'maps');
  if (!existsSync(dir)) return {};
  return Object.fromEntries(readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
    const view = readJson<MapViewDef>(join(dir, f));
    return [view.id, view] as const;
  }));
}

const isViewShot = (shot: PlanShot | ViewMapShot): shot is ViewMapShot => shot.type === 'map' && typeof (shot as ViewMapShot).view === 'string';

/** Expands view-based map shots (and colour names on every map) into full map shots; reports unknown views/targets. */
export function expandMapViews(
  plan: ShotPlan,
  views: Record<string, MapViewDef>,
  places: Record<string, {name: string; location?: LonLat}>,
  geo: Record<string, PeriodFeature> = {},
  allowUnapproved = false,
): {plan: ShotPlan; issues: string[]} {
  const issues: string[] = [];
  const shots = (plan.shots as (PlanShot | ViewMapShot)[]).map((shot, i): PlanShot => {
    if (shot.type !== 'map') return shot;
    if (!isViewShot(shot)) {
      const period = (shot as {period?: number | string}).period;
      const base = period ? withoutOwn(periodLayers(period, shot.extent, geo, allowUnapproved), shot) : {fills: [], lines: [], labels: []};
      return {...shot, fills: [...base.fills, ...(shot.fills ?? []).map(f => ({...f, color: color(f.color)!}))], lines: [...base.lines, ...(shot.lines ?? []).map(l => ({...l, color: color(l.color)}))],
        labels: [...base.labels, ...(shot.labels ?? [])]} as PlanShot;
    }
    const where = `shot ${i + 1}`;
    const view = views[shot.view];
    if (!view) {
      issues.push(`${where}: unknown map view "${shot.view}"${renamedHint(shot.view)} (${Object.keys(views).join(', ') || 'none in data/library/maps'})`);
      return {type: 'map', at: shot.at, projection: 'us', extent: [[-100, 20], [-60, 50]], camera: [{at: {offset: 0}, center: [-80, 35], zoom: 1}]} as PlanShot;
    }
    const camera = [{at: {offset: 0} as Cue, center: view.camera.center, zoom: view.camera.zoom}];
    const highlights: {fills: NonNullable<ViewMapShot['fills']>; labels: NonNullable<ViewMapShot['labels']>} = {fills: [], labels: []};
    (shot.moves ?? []).forEach((m, n) => {
      const focus = view.focus?.[m.to];
      const place = places[m.to];
      if (m.highlight) {
        const r = focus?.region;
        if (!r) issues.push(`${where} move ${n + 1}: "${m.to}" has no region to highlight in ${view.id} (${Object.entries(view.focus ?? {}).filter(([, f]) => f.region).map(([k]) => k).join(', ') || 'none'})`);
        else {
          // Fill as the camera arrives, then name it.
          const c = color(typeof m.highlight === 'string' ? m.highlight : r.color ?? 'gold')!;
          for (const region of 'states' in r ? r.states.map(state => ({state})) : [{geo: r.geo}]) highlights.fills.push({at: m.at, region, color: c} as never);
          highlights.labels.push({at: m.at, text: r.label, lonlat: r.labelAt, style: 'region'});
        }
      }
      if (focus) camera.push({at: m.at, center: focus.center, zoom: m.zoom ?? focus.zoom, ...(m.ease ? {ease: m.ease} : {})});
      else if (place?.location) camera.push({at: m.at, center: place.location, zoom: m.zoom ?? view.camera.zoom * 1.4, ...(m.ease ? {ease: m.ease} : {})});
      else issues.push(`${where} move ${n + 1}: "${m.to}" is not a focus of ${view.id} (${Object.keys(view.focus ?? {}).join(', ') || 'none'}) or a place with a location`);
    });
    const base = (view.labels ?? []).map((l, n) => ({at: {offset: 0.3 + 0.25 * n} as Cue, text: l.text, lonlat: l.lonlat, style: l.style}));
    // A period map: that year's base layers (borders, claims) under whatever the storyboard adds.
    const era = shot.period ? withoutOwn(periodLayers(shot.period, view.extent, geo, allowUnapproved), shot) : {fills: [], lines: [], labels: []};
    return {
      type: 'map', at: shot.at, transition: shot.transition,
      projection: view.projection, extent: view.extent, tilt: view.tilt, terrain: view.terrain,
      camera,
      fills: [...era.fills, ...highlights.fills, ...(shot.fills ?? []).map(f => ({...f, color: color(f.color)!}))],
      lines: [...era.lines, ...(shot.lines ?? []).map(l => ({...l, color: color(l.color)}))],
      points: shot.points,
      labels: [...base, ...era.labels, ...highlights.labels, ...(shot.labels ?? [])],
    };
  });
  return {plan: {...plan, shots}, issues};
}

/** Everything a map view must satisfy (docs/MAP_VIEWS.md). `file` is the view's file name; `geo` the library geography. */
export function validateMapView(view: MapViewDef, file: string, geo: Record<string, PeriodFeature>): string[] {
  const out: string[] = [];
  const add = (m: string) => out.push(`${file}: ${m}`);
  if (!/^map\.[a-z0-9-]+$/.test(view.id ?? '')) add('id must be "map.<region>" (lowercase, hyphens)');
  if (/\b(1[5-9]|20)\d\d\b/.test(view.id ?? '')) add('id must not carry a year: a view is a region; dates belong to geography layers');
  if (file !== `${String(view.id).replace(/^map\./, '')}.json`) add(`file name must be ${String(view.id).replace(/^map\./, '')}.json`);
  if (!view.name?.trim() || view.name.length > 100) add('name is required (<= 100 characters), describing the region');
  if (view.projection !== 'us' && view.projection !== 'world') add('projection must be "us" (North America, conic) or "world"');
  const [[w, s] = [NaN, NaN], [e, n] = [NaN, NaN]] = Array.isArray(view.extent) ? view.extent : [];
  const lonOk = (x: number) => Number.isFinite(x) && x >= -180 && x <= 180;
  const latOk = (y: number) => Number.isFinite(y) && y >= -85 && y <= 85;
  if (![w, e].every(lonOk) || ![s, n].every(latOk) || !(w < e) || !(s < n)) { add('extent must be [[west, south], [east, north]] in degrees, west < east, south < north'); return out; }
  if (e - w < 0.5 || n - s < 0.3) add('extent is smaller than half a degree: too tight for a map');
  const inside = (p: unknown) => Array.isArray(p) && lonOk(p[0]) && latOk(p[1]) && p[0] >= w && p[0] <= e && p[1] >= s && p[1] <= n;
  if (!inside(view.camera?.center)) add('camera.center must be [lon, lat] inside the extent');
  if (!(view.camera?.zoom >= 1 && view.camera.zoom <= 3)) add('camera.zoom must be 1-3 (1 = the whole extent)');
  if (view.tilt !== undefined && !(view.tilt >= 0 && view.tilt <= 35)) add('tilt must be 0-35 degrees');
  for (const id of view.terrain?.ridges ?? []) {
    const g = geo[id];
    if (!g) add(`terrain ridge "${id}" is not in data/library/geo`);
    else if (g.geometry.type !== 'LineString') add(`terrain ridge "${id}" must be a LineString`);
  }
  for (const [i, l] of (view.labels ?? []).entries()) {
    if (!l.text?.trim()) add(`label ${i + 1}: text is required`);
    if (!inside(l.lonlat)) add(`label ${i + 1} ("${l.text}"): lonlat must be inside the extent`);
    if (l.style && !['region', 'ocean', 'town'].includes(l.style)) add(`label ${i + 1}: style must be region | ocean | town`);
    if (/\b1[5-9]\d\d\b/.test(l.text ?? '')) add(`label ${i + 1} ("${l.text}"): base labels are timeless (oceans, lakes, rivers); dated names belong to period layers`);
  }
  const focus = Object.entries(view.focus ?? {});
  if (!focus.length) add('focus: give at least one named camera target');
  for (const [name, f] of focus) {
    if (!/^[a-z0-9-]+$/.test(name)) add(`focus "${name}": names are lowercase-hyphen`);
    if (!inside(f?.center)) add(`focus "${name}": center must be [lon, lat] inside the extent`);
    if (!(f?.zoom >= 1 && f.zoom <= 4)) add(`focus "${name}": zoom must be 1-4`);
    const r = f?.region;
    if (r) {
      if ('states' in r) {
        if (!Array.isArray(r.states) || !r.states.length) add(`focus "${name}": region.states lists US postal codes`);
        for (const st of r.states ?? []) if (!STATE_CODES.has(st)) add(`focus "${name}": "${st}" is not a US postal code`);
        if (view.projection !== 'us') add(`focus "${name}": state regions need the "us" projection`);
      } else if ('geo' in r) {
        if (!geo[r.geo]) add(`focus "${name}": region geo "${r.geo}" is not in data/library/geo`);
        else if (!/Polygon/.test(geo[r.geo].geometry.type)) add(`focus "${name}": region geo "${r.geo}" must be a Polygon or MultiPolygon`);
      } else add(`focus "${name}": region needs "states" or "geo"`);
      if (!r.label?.trim()) add(`focus "${name}": region.label is required (what the viewer reads)`);
      else if (/\b1[5-9]\d\d\b/.test(r.label)) add(`focus "${name}": region labels are timeless; dated names belong to period layers`);
      if (!inside(r.labelAt)) add(`focus "${name}": region.labelAt must be inside the extent`);
      if (r.color && !MAP_COLORS[r.color] && !/^#[0-9a-f]{6}$/i.test(r.color)) add(`focus "${name}": color is a map colour name (${Object.keys(MAP_COLORS).join(', ')}) or #rrggbb`);
    }
  }
  return out;
}
