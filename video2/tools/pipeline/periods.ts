/**
 * Period layers (docs/PERIOD_LAYERS.md): the worklist (data/library/periods.json) and every check a layer must pass
 * before a person reviews it. The worklist is the plan: which borders, claims and lines the book needs, with their
 * dates; snapshots group the layers that together make one year's map. Geo files fulfil worklist entries.
 */
import {yearOf} from '../../src/library/validate';
import {PERIOD_SIDES} from '../../src/library/types';
import type {MapViewDef, PeriodFeature} from './map-views';

export interface PeriodEntry {
  /** `geo.<region|line|route>.<slug>@<year it begins>`; the geo file of the same id fulfils it. */
  id: string;
  name: string;
  side: string;
  validFrom: string;
  /** Omitted: still true at the end of the course. */
  validTo?: string;
  units: number[];
  priority: 1 | 2 | 3;
  /** Where to trace it from: treaty clauses, named period maps, atlases. */
  sources: string[];
  notes?: string;
}

export interface Snapshot {
  /** The map as it stood at the end of this year (a storyboard's "period": year). */
  year: number;
  title: string;
  units: number[];
  /** Views to preview it on. */
  views: string[];
  layers: string[];
}

export interface PeriodWorklist {
  snapshots: Snapshot[];
  layers: PeriodEntry[];
}

/** The moment a period names: a year is the end of that year; an ISO date is that day. */
export function periodInstant(period: number | string): number {
  return typeof period === 'number' ? period + 0.999 : yearOf(period);
}

/** A layer holds from validFrom (inclusive) to validTo (exclusive): a chain hands over without overlapping. */
export const validAt = (p: {validFrom?: string; validTo?: string}, t: number) =>
  !!p.validFrom && yearOf(p.validFrom) <= t && (!p.validTo || t < yearOf(p.validTo));

const chainOf = (id: string) => id.replace(/@\d+$/, '');
const ID = /^geo\.(region|line|route)\.[a-z0-9-]+@\d{4}$/;
const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
type Ring = [number, number][];

function rings(f: PeriodFeature): Ring[] {
  const c = f.geometry.coordinates as unknown;
  if (f.geometry.type === 'Polygon') return c as Ring[];
  if (f.geometry.type === 'MultiPolygon') return (c as Ring[][]).flat();
  return [];
}
function inRing([x, y]: [number, number], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Inside a Polygon/MultiPolygon (even-odd over every ring, so holes count). */
export function inRegion(p: [number, number], f: PeriodFeature): boolean {
  return rings(f).reduce((n, r) => n + (inRing(p, r) ? 1 : 0), 0) % 2 === 1;
}
function segmentsCross(a: number[], b: number[], c: number[], d: number[]): boolean {
  const o = (p: number[], q: number[], r: number[]) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
function selfCrossing(ring: Ring): boolean {
  const n = ring.length - 1;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (segmentsCross(ring[i], ring[i + 1], ring[j], ring[j + 1])) return true;
  }
  return false;
}
function bbox(f: PeriodFeature): [number, number, number, number] {
  const pts = (JSON.stringify(f.geometry.coordinates).match(/-?\d+(?:\.\d+)?(?:e-?\d+)?,-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []).map(p => p.split(',').map(Number));
  return [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
}
/** Share of the smaller region that lies inside the other (grid sampled; shared borders traced apart add only noise). */
function overlapShare(a: PeriodFeature, b: PeriodFeature): number {
  const [aw, as, ae, an] = bbox(a);
  const [bw, bs, be, bn] = bbox(b);
  const w = Math.max(aw, bw), s = Math.max(as, bs), e = Math.min(ae, be), n = Math.min(an, bn);
  if (w >= e || s >= n) return 0;
  const step = Math.max(0.1, Math.min(ae - aw, an - as, be - bw, bn - bs) / 40);
  let both = 0;
  const count = (f: PeriodFeature, [fw, fs, fe, fn]: number[]) => { let k = 0; for (let x = fw; x <= fe; x += step) for (let y = fs; y <= fn; y += step) if (inRegion([x, y], f)) k++; return k; };
  for (let x = w; x <= e; x += step) for (let y = s; y <= n; y += step) if (inRegion([x, y], a) && inRegion([x, y], b)) both++;
  if (!both) return 0;
  return both / Math.max(1, Math.min(count(a, [aw, as, ae, an]), count(b, [bw, bs, be, bn])));
}

/** Geometry rules for one layer: closed simple rings at a readable resolution, a label inside its region. */
export function layerGeometryIssues(f: PeriodFeature): string[] {
  const out: string[] = [];
  const p = f.properties;
  const t = f.geometry.type;
  if (p.type === 'region' && t !== 'Polygon' && t !== 'MultiPolygon') out.push(`a region must be a Polygon or MultiPolygon (got ${t})`);
  if ((p.type === 'line' || p.type === 'route') && t !== 'LineString' && t !== 'MultiLineString') out.push(`a ${p.type} must be a LineString (got ${t})`);
  const all = JSON.stringify(f.geometry.coordinates).match(/-?\d+(?:\.\d+)?(?:e-?\d+)?,-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? [];
  if (all.some(s => { const [x, y] = s.split(',').map(Number); return Math.abs(x) > 180 || Math.abs(y) > 90; })) out.push('coordinates are [lon, lat] in degrees: a value is out of range (lat and lon swapped?)');
  if (all.length > 3000) out.push(`${all.length} vertices: simplify (the renderer needs a few hundred at most)`);
  for (const [i, r] of rings(f).entries()) {
    if (r.length < 4) { out.push(`ring ${i + 1} has ${r.length} positions; a ring needs at least 4`); continue; }
    if (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1]) out.push(`ring ${i + 1} is not closed (first position must equal the last)`);
    else if (selfCrossing(r)) out.push(`ring ${i + 1} crosses itself`);
  }
  if (t === 'Polygon' || t === 'MultiPolygon') {
    if (all.length < 8) out.push(`${all.length} vertices: too coarse to read at full frame (trace at least 8)`);
    if (p.layer?.labelAt && !inRegion(p.layer.labelAt, f)) out.push('layer.labelAt is outside the region');
    if (p.layer && !p.layer.label) out.push('a region layer needs layer.label (what the viewer reads on the map)');
  }
  return out;
}

/** Everything about the worklist, the layers and how they fit together. Errors block; warnings are for a person. */
export function validatePeriods(list: PeriodWorklist, geo: Record<string, PeriodFeature>, views: Record<string, MapViewDef>): {errors: string[]; warnings: string[]} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const entries = new Map<string, PeriodEntry>();
  for (const e of list.layers) {
    const add = (m: string) => errors.push(`periods.json ${e.id}: ${m}`);
    if (!ID.test(e.id ?? '')) add('id must be "geo.<region|line|route>.<slug>@<year it begins>"');
    else if (e.id.slice(-4) !== e.validFrom?.slice(0, 4)) add(`the id's year must be validFrom's year (${e.validFrom?.slice(0, 4)})`);
    if (entries.has(e.id)) add('listed twice');
    if (!e.name?.trim()) add('name is required');
    if (!PERIOD_SIDES.includes(e.side as never)) add(`side must be one of ${PERIOD_SIDES.join(', ')}`);
    if (!DATE.test(e.validFrom ?? '')) add('validFrom must be an ISO date (YYYY-MM-DD)');
    if (e.validTo !== undefined && !DATE.test(e.validTo)) add('validTo must be an ISO date (or omitted: still true)');
    if (e.validTo && DATE.test(e.validFrom ?? '') && yearOf(e.validTo) <= yearOf(e.validFrom)) add('validTo must be after validFrom');
    if (!Array.isArray(e.units) || !e.units.length || e.units.some(u => !Number.isInteger(u) || u < 1 || u > 9)) add('units are APUSH units 1-9');
    if (![1, 2, 3].includes(e.priority)) add('priority is 1, 2 or 3');
    if (!e.sources?.length) add('sources are required: what to trace it from');
    entries.set(e.id, e);
  }
  // One state per file; a chain (same slug, different years) hands over without overlapping.
  const chains = new Map<string, PeriodEntry[]>();
  for (const e of entries.values()) chains.set(chainOf(e.id), [...(chains.get(chainOf(e.id)) ?? []), e]);
  for (const [chain, members] of chains) {
    const sorted = members.filter(m => DATE.test(m.validFrom ?? '')).sort((a, b) => yearOf(a.validFrom) - yearOf(b.validFrom));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      if (!prev.validTo) errors.push(`periods.json ${prev.id}: has no validTo but ${sorted[i].id} follows it`);
      else if (yearOf(prev.validTo) > yearOf(sorted[i].validFrom)) errors.push(`periods.json ${chain}: ${prev.id} (to ${prev.validTo}) overlaps ${sorted[i].id} (from ${sorted[i].validFrom}); one state per moment`);
      else if (prev.validTo !== sorted[i].validFrom) warnings.push(`periods.json ${chain}: gap from ${prev.validTo} to ${sorted[i].validFrom} (fine if nothing held it)`);
    }
  }
  const years = new Set<number>();
  for (const s of list.snapshots) {
    const add = (m: string) => errors.push(`periods.json snapshot ${s.year}: ${m}`);
    if (!Number.isInteger(s.year)) add('year must be a whole year');
    if (years.has(s.year)) add('listed twice');
    years.add(s.year);
    if (!s.title?.trim()) add('title is required');
    for (const v of s.views ?? []) if (!views[v]) add(`view ${v} is not in data/library/maps`);
    const seen = new Set<string>();
    for (const id of s.layers ?? []) {
      const e = entries.get(id);
      if (!e) { add(`${id} is not in the layers list`); continue; }
      if (!validAt(e, periodInstant(s.year))) add(`${id} (${e.validFrom}..${e.validTo ?? 'open'}) is not valid at the end of ${s.year}`);
      if (seen.has(chainOf(id))) add(`two states of ${chainOf(id)}`);
      seen.add(chainOf(id));
    }
  }
  // The files: each base layer fulfils a worklist entry and agrees with it; geometry is sound.
  const layers = Object.values(geo).filter(g => g.properties.layer?.base);
  for (const g of layers) {
    const p = g.properties;
    const add = (m: string) => errors.push(`${p.id}: ${m}`);
    const e = entries.get(p.id);
    if (!e) add('a base layer must be listed in data/library/periods.json first (the worklist is the plan)');
    else {
      if (p.layer!.side !== e.side) add(`side ${p.layer!.side} differs from the worklist (${e.side})`);
      if (p.validFrom !== e.validFrom) add(`validFrom ${p.validFrom} differs from the worklist (${e.validFrom})`);
      if ((p.validTo ?? '') !== (e.validTo ?? '')) add(`validTo ${p.validTo ?? '(none)'} differs from the worklist (${e.validTo ?? 'none'})`);
    }
    for (const m of layerGeometryIssues(g)) add(m);
    const [w, s, e2, n] = bbox(g);
    if (!Object.values(views).some(v => !(e2 < v.extent[0][0] || w > v.extent[1][0] || n < v.extent[0][1] || s > v.extent[1][1]))) add('no map view covers it (add or widen a view)');
  }
  // Two sides cannot hold the same ground at the same moment, unless one of them is marked contested.
  const regions = layers.filter(g => /Polygon/.test(g.geometry.type) && !layerGeometryIssues(g).length);
  for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) {
    const a = regions[i], b = regions[j];
    const [pa, pb] = [a.properties, b.properties];
    const from = Math.max(yearOf(pa.validFrom!), yearOf(pb.validFrom!));
    const to = Math.min(pa.validTo ? yearOf(pa.validTo) : Infinity, pb.validTo ? yearOf(pb.validTo) : Infinity);
    if (from >= to || chainOf(pa.id) === chainOf(pb.id)) continue;
    const share = overlapShare(a, b);
    if (share < 0.05) continue;
    const msg = `${pa.id} and ${pb.id} overlap (${Math.round(share * 100)}% of the smaller) while both hold`;
    if ((pa as {precision?: string}).precision === 'contested' || (pb as {precision?: string}).precision === 'contested') warnings.push(`${msg}; drawn as contested`);
    else errors.push(`${msg}: trace the shared border once, or mark one "contested"`);
  }
  return {errors, warnings};
}

/** What is done: per snapshot and overall, by review status. */
export function periodStatus(list: PeriodWorklist, geo: Record<string, PeriodFeature>) {
  const state = (id: string) => geo[id]?.properties.layer?.base ? geo[id].properties.review.status : 'missing';
  return {
    snapshots: list.snapshots.map(s => ({year: s.year, title: s.title, layers: s.layers.map(id => ({id, status: state(id)}))})),
    layers: list.layers.map(e => ({id: e.id, priority: e.priority, units: e.units, status: state(e.id)})),
  };
}
