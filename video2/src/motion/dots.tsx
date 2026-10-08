/**
 * PeopleDots: each dot = N people or 1 vote. Dots are arranged into named groups
 * ("formations": grid blocks, a parliament hemicycle, horizontal bars, or round clusters) and
 * fly between formations on keyframes. Dots keep their identity: dot i moves from its slot in
 * the old formation to its slot in the new one (eased, slightly staggered, on a gentle arc), so
 * you SEE votes/people move from one side to another.
 *
 * Identity: define `cohorts` (atomic sub-groups, e.g. "Southern Democrats who voted Yea") and
 * build each formation's groups from cohort ids — a dot always belongs to the same cohort.
 * Without cohorts, groups take dots in order (`count`).
 *
 * Labels: one per group, with a live count-up, laid out deterministically so they never
 * overlap (1-D packing, then a second row if needed). Each label is a data-guard-item.
 * Weighting (e.g. the Three-Fifths Compromise): `weight: { keep: 3, of: 5 }` dims 2 of every
 * 5 dots of a group (block columns are a multiple of 5, so the dimmed dots form clear stripes).
 *
 * Map mode: <MapDots> flies dots from a screen point to [lon, lat] points inside a <World>.
 *
 * Screen space: geometry in design px (`space`, default the 16:9 design base from ./layout),
 * scaled by width / space.w at render time.
 * Pure layout functions are exported and unit-tested (tests/motion-layout.test.ts).
 */
import React, { useMemo } from 'react';
import { Easing, interpolate, interpolateColors, useCurrentFrame, useVideoConfig } from 'remotion';
import { pack1D, type Box } from './causechain';
import { DESIGN } from './layout';
import { measureLine, type Font, type Measure } from './measure';
import { COLOR, FONT, MOTION, STROKE, TYPE } from '../theme/tokens';
import { rng, slideState } from './primitives';
import { toScreen, useWorld, type LonLat } from './world';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export type DotLayout = 'blocks' | 'hemicycle' | 'bars' | 'clusters';
export interface DotCohort { id: string; count: number; color?: string }
export interface DotGroup {
  id: string;
  label: string;
  color: string;
  /** dots (when not built from cohorts) */
  count?: number;
  /** cohort ids, in slot order */
  cohorts?: string[];
  /** number shown by the label (default = dot count) — e.g. people, when 1 dot = 20,000 */
  value?: number;
  /** suffix after the number ("votes") */
  unit?: string;
  /** dim (of − keep) of every `of` dots */
  weight?: { keep: number; of: number };
  /** shuffle which dot takes which slot (seed) — mixes cohorts inside the group */
  shuffle?: number;
}
export interface Formation { t: number; layout: DotLayout; groups: DotGroup[]; colorBy?: 'group' | 'cohort' }

export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface LabelSpec { w: number; h: number }
export interface GroupSpec { n: number; of?: number }
export interface FormationLayout { slots: Pt[][]; dotR: number; pitch: number; labels: Rect[] }

export const nameFont: Font = { size: TYPE.town, family: FONT.display, weight: 700, letterSpacing: 1.5 };
export const valueFont: Font = { size: TYPE.chip, family: FONT.ui, weight: 700 };
export const LABEL_H = Math.ceil(nameFont.size * 1.2 + valueFont.size * 1.2);
const LABEL_GAP = 14;
const DOT_FILL = 0.36;
const P_MAX = 22;

export const fmtNum = (v: number) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const valueText = (v: number, unit?: string) => `${fmtNum(v)}${unit ? ` ${unit}` : ''}`;

/** Label box size: widest of the name and any number the count-up can show. */
export function labelSize(g: DotGroup, prevValue: number, measure: Measure = measureLine): LabelSpec {
  const v = g.value ?? 0;
  const nums = [valueText(v, g.unit), valueText(prevValue, g.unit)].flatMap(s => [s, s.replace(/\d/g, '0'), s.replace(/\d/g, '8')]);
  const w = Math.max(measure(g.label.toUpperCase(), nameFont), ...nums.map(s => measure(s, valueFont)));
  return { w: Math.ceil(w + 6), h: LABEL_H };
}

/** Place labels at desired centres along a band: one row if they fit, else two staggered rows. */
export function placeLabels(centres: number[], specs: LabelSpec[], lo: number, hi: number, y: number, dir: 1 | -1): Rect[] | null {
  const order = centres.map((c, i) => i).sort((a, b) => centres[a] - centres[b]);
  const one = pack1D(order.map(i => ({ c: centres[i], w: specs[i].w })), lo, hi, LABEL_GAP);
  const out: Rect[] = new Array(centres.length);
  if (one) {
    order.forEach((i, k) => { out[i] = { x: one[k], y: dir === 1 ? y : y - specs[i].h, w: specs[i].w, h: specs[i].h }; });
    return out;
  }
  for (const row of [0, 1]) {
    const idx = order.filter((_, k) => k % 2 === row);
    const xs = pack1D(idx.map(i => ({ c: centres[i], w: specs[i].w })), lo, hi, LABEL_GAP);
    if (!xs) return null;
    idx.forEach((i, k) => {
      const yy = y + dir * row * (LABEL_H + 6);
      out[i] = { x: xs[k], y: dir === 1 ? yy : yy - specs[i].h, w: specs[i].w, h: specs[i].h };
    });
  }
  return out;
}
const bandRows = (centres: number[], specs: LabelSpec[], lo: number, hi: number) => (pack1D(centres.map((c, i) => ({ c, w: specs[i].w })).sort((a, b) => a.c - b.c), lo, hi, LABEL_GAP) ? 1 : 2);
const bandH = (rows: number) => rows * LABEL_H + (rows - 1) * 6 + 10;

/* ------------------------------------ layouts ------------------------------------ */

function blocks(groups: GroupSpec[], labels: LabelSpec[], box: Box): FormationLayout {
  const G = groups.length;
  const tryRows = (labelRows: number) => {
    const top = box.y + bandH(labelRows);
    const H = box.y + box.h - top;
    let best = { p: 0, R: 1, cols: [] as number[], gap: 0 };
    for (let R = 1; R <= 60; R++) {
      const cols = groups.map(g => { const c = Math.max(1, Math.ceil(g.n / R)); return g.of ? Math.ceil(c / g.of) * g.of : c; });
      const rowsUsed = Math.max(...groups.map((g, i) => Math.ceil(g.n / cols[i])));
      const totalCols = cols.reduce((s, c) => s + c, 0);
      // gap between blocks ≈ 2 pitches, at least 28px
      const p = Math.min(P_MAX, H / rowsUsed, (box.w - 28 * (G - 1)) / (totalCols + 2 * (G - 1)));
      if (p > best.p + 1e-9) best = { p, R, cols, gap: Math.max(28, 2 * p) };
    }
    const { p, cols, gap } = best;
    const totalW = cols.reduce((s, c) => s + c * p, 0) + gap * (G - 1);
    let x = box.x + (box.w - totalW) / 2;
    const maxH = Math.max(...groups.map((g, i) => Math.ceil(g.n / cols[i]) * p));
    const by = top + Math.max(0, (H - maxH) / 2);
    const blocksX: number[] = [];
    const slots = groups.map((g, i) => {
      const bx = x;
      blocksX.push(bx + (cols[i] * p) / 2);
      x += cols[i] * p + gap;
      return Array.from({ length: g.n }, (_, j) => ({ x: bx + ((j % cols[i]) + 0.5) * p, y: by + (Math.floor(j / cols[i]) + 0.5) * p }));
    });
    return { slots, p, blocksX, labelY: by - 10 };
  };
  let res = tryRows(1);
  let rows = bandRows(res.blocksX, labels, box.x, box.x + box.w);
  if (rows > 1) { res = tryRows(rows); rows = bandRows(res.blocksX, labels, box.x, box.x + box.w); }
  const lab = placeLabels(res.blocksX, labels, box.x, box.x + box.w, res.labelY, -1) ?? [];
  return { slots: res.slots, pitch: res.p, dotR: res.p * DOT_FILL, labels: lab };
}

function bars(groups: GroupSpec[], labels: LabelSpec[], box: Box): FormationLayout {
  const G = groups.length;
  const Lw = Math.max(...labels.map(l => l.w));
  const x0 = box.x + Lw + 16;
  const W = box.x + box.w - x0;
  const gapY = 16;
  let best = { p: 0, k: 1 };
  for (let k = 1; k <= 12; k++) {
    const cols = groups.map(g => { const c = Math.ceil(g.n / k); return g.of ? Math.ceil(c / g.of) * g.of : c; });
    let p = Math.min(P_MAX, W / Math.max(...cols));
    // each bar row is at least a label tall
    while (p > 1 && G * Math.max(k * p, LABEL_H) + (G - 1) * gapY > box.h) p -= 0.25;
    if (p > best.p + 1e-9) best = { p, k };
  }
  const { p, k } = best;
  const rowH = Math.max(k * p, LABEL_H);
  const totalH = G * rowH + (G - 1) * gapY;
  const y0 = box.y + (box.h - totalH) / 2;
  const slots: Pt[][] = [];
  const lab: Rect[] = [];
  groups.forEach((g, i) => {
    const cols = (() => { const c = Math.ceil(g.n / k); return g.of ? Math.ceil(c / g.of) * g.of : c; })();
    const top = y0 + i * (rowH + gapY) + (rowH - k * p) / 2;
    slots.push(Array.from({ length: g.n }, (_, j) => ({ x: x0 + (Math.floor(j / k) % cols + 0.5) * p, y: top + ((j % k) + 0.5) * p })));
    lab.push({ x: x0 - 16 - labels[i].w, y: y0 + i * (rowH + gapY) + (rowH - labels[i].h) / 2, w: labels[i].w, h: labels[i].h });
  });
  return { slots, pitch: p, dotR: p * DOT_FILL, labels: lab };
}

/** Seats of a parliament hemicycle, ordered left → right. */
export function hemicycleSeats(N: number, rOut: number): { seats: { x: number; y: number }[]; pitch: number } {
  let best = { p: 0, k: 1, counts: [N] };
  for (let k = 1; k <= 24; k++) {
    const rIn = k === 1 ? rOut : rOut * 0.38;
    const radii = Array.from({ length: k }, (_, j) => (k === 1 ? rOut : rIn + ((rOut - rIn) * j) / (k - 1)));
    const sum = radii.reduce((s, r) => s + r, 0);
    const raw = radii.map(r => (N * r) / sum);
    const counts = raw.map(Math.floor);
    let rem = N - counts.reduce((s, c) => s + c, 0);
    raw.map((r, j) => [r - Math.floor(r), j] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, j]) => { if (rem > 0) { counts[j]++; rem--; } });
    if (counts.some(c => c < 2)) continue;
    const arcP = Math.min(...radii.map((r, j) => 2 * r * Math.sin(Math.PI / (2 * (counts[j] - 1))))); // chord, not arc
    const radP = k === 1 ? Infinity : (rOut - rIn) / (k - 1);
    const p = Math.min(arcP, radP);
    if (p > best.p + 1e-9) best = { p, k, counts };
  }
  const { k, counts, p } = best;
  const rIn = k === 1 ? rOut : rOut * 0.38;
  const seats: { x: number; y: number; th: number; r: number }[] = [];
  counts.forEach((n, j) => {
    const r = k === 1 ? rOut : rIn + ((rOut - rIn) * j) / (k - 1);
    for (let m = 0; m < n; m++) {
      const th = Math.PI * (1 - m / (n - 1));
      seats.push({ x: r * Math.cos(th), y: -r * Math.sin(th), th, r });
    }
  });
  seats.sort((a, b) => b.th - a.th || a.r - b.r);
  return { seats, pitch: p };
}

function hemicycle(groups: GroupSpec[], labels: LabelSpec[], box: Box): FormationLayout {
  const N = groups.reduce((s, g) => s + g.n, 0);
  const lay = (rows: number) => {
    const H = box.h - bandH(rows);
    // the outer dots stick out half a pitch; iterate once to account for it
    let rOut = Math.min(box.w / 2, H) * 0.97;
    let hs = hemicycleSeats(N, rOut);
    const pad = Math.min(P_MAX, hs.pitch) / 2;
    rOut = Math.min(box.w / 2 - pad, H - 2 * pad);
    hs = hemicycleSeats(N, rOut);
    const p = Math.min(P_MAX, hs.pitch);
    const cx = box.x + box.w / 2;
    const totalH = rOut + p + bandH(rows);
    const baseY = box.y + (box.h - totalH) / 2 + rOut + p / 2;
    let at = 0;
    const slots = groups.map(g => {
      const s = hs.seats.slice(at, at + g.n).map(q => ({ x: cx + q.x, y: baseY + q.y }));
      at += g.n;
      return s;
    });
    const centres = slots.map(s => s.reduce((a, q) => a + q.x, 0) / Math.max(1, s.length));
    return { slots, p, centres, labelY: baseY + p / 2 + 10 };
  };
  let res = lay(1);
  if (bandRows(res.centres, labels, box.x, box.x + box.w) > 1) res = lay(2);
  const lab = placeLabels(res.centres, labels, box.x, box.x + box.w, res.labelY, 1) ?? [];
  return { slots: res.slots, pitch: res.p, dotR: res.p * DOT_FILL, labels: lab };
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
function clusters(groups: GroupSpec[], labels: LabelSpec[], box: Box): FormationLayout {
  const G = groups.length;
  const radius = (n: number, c: number) => c * Math.sqrt(n + 0.5) + c * 0.5;
  const fit = (rows: number) => {
    const H = box.h - bandH(rows);
    const gap = 32;
    // widths sum ≤ W, tallest ≤ H (radius is linear in c)
    const unitW = groups.reduce((s, g) => s + 2 * radius(g.n, 1), 0);
    const unitH = Math.max(...groups.map(g => 2 * radius(g.n, 1)));
    const c = Math.min(P_MAX * 0.95, (box.w - gap * (G - 1)) / unitW, H / unitH);
    const totalW = groups.reduce((s, g) => s + 2 * radius(g.n, c), 0) + gap * (G - 1);
    let x = box.x + (box.w - totalW) / 2;
    const top = box.y + bandH(rows);
    const cy = top + H / 2;
    const centres: number[] = [];
    const slots = groups.map(g => {
      const R = radius(g.n, c);
      const cx = x + R;
      centres.push(cx);
      x += 2 * R + gap;
      return Array.from({ length: g.n }, (_, j) => {
        const r = c * Math.sqrt(j + 0.5);
        return { x: cx + r * Math.cos(j * GOLDEN), y: cy + r * Math.sin(j * GOLDEN) };
      });
    });
    const labelY = cy - Math.max(...groups.map(g => radius(g.n, c))) - 10;
    return { slots, c, centres, labelY };
  };
  let res = fit(1);
  if (bandRows(res.centres, labels, box.x, box.x + box.w) > 1) res = fit(2);
  const lab = placeLabels(res.centres, labels, box.x, box.x + box.w, res.labelY, -1) ?? [];
  // nearest-neighbour distance in a Vogel spiral is ≳ 1.25c (checked in tests)
  return { slots: res.slots, pitch: res.c * 1.25, dotR: res.c * 1.25 * DOT_FILL, labels: lab };
}

export function layoutFormation(layout: DotLayout, groups: GroupSpec[], labels: LabelSpec[], box: Box): FormationLayout {
  if (layout === 'hemicycle') return hemicycle(groups, labels, box);
  if (layout === 'bars') return bars(groups, labels, box);
  if (layout === 'clusters') return clusters(groups, labels, box);
  return blocks(groups, labels, box);
}

/* ------------------------------------ resolution ------------------------------------ */

export interface ResolvedFormation {
  t: number;
  layout: FormationLayout;
  /** per dot: slot position, colour, dimmed, present */
  x: Float64Array; y: Float64Array; color: string[]; dim: Uint8Array; present: Uint8Array;
  /** per dot stagger rank 0..1 (left → right) */
  rank: Float64Array;
  groups: DotGroup[];
  values: number[];
  prevValues: number[];
}

/** Resolve formations into per-dot states (deterministic). */
export function resolveFormations(formations: Formation[], cohorts: DotCohort[] | undefined, box: Box, measure: Measure = measureLine) {
  const cohortStart = new Map<string, number>();
  let n = 0;
  for (const c of cohorts ?? []) { cohortStart.set(c.id, n); n += c.count; }
  const cohortOf: string[] = [];
  for (const c of cohorts ?? []) for (let k = 0; k < c.count; k++) cohortOf.push(c.id);
  const cohortColor = new Map((cohorts ?? []).map(c => [c.id, c.color]));
  const N = cohorts ? n : Math.max(...formations.map(f => f.groups.reduce((s, g) => s + (g.count ?? 0), 0)));
  const prevVals = new Map<string, number>();
  const resolved: ResolvedFormation[] = formations.map(f => {
    let cursor = 0;
    const members = f.groups.map(g => {
      let ids: number[];
      if (g.cohorts) {
        ids = g.cohorts.flatMap(cid => {
          const s = cohortStart.get(cid);
          const c = cohorts!.find(x => x.id === cid);
          if (s === undefined || !c) throw new Error(`PeopleDots: unknown cohort "${cid}"`);
          return Array.from({ length: c.count }, (_, k) => s + k);
        });
      } else {
        ids = Array.from({ length: g.count ?? 0 }, (_, k) => cursor + k);
        cursor += g.count ?? 0;
      }
      if (g.shuffle !== undefined) {
        const r = rng(g.shuffle);
        for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      }
      return ids;
    });
    const values = f.groups.map((g, i) => g.value ?? members[i].length);
    const prevValues = f.groups.map(g => prevVals.get(g.id) ?? 0);
    const labelSpecs = f.groups.map((g, i) => labelSize({ ...g, value: values[i] }, prevValues[i], measure));
    const lay = layoutFormation(f.layout, members.map((m, i) => ({ n: m.length, of: f.groups[i].weight?.of })), labelSpecs, box);
    f.groups.forEach((g, i) => prevVals.set(g.id, values[i]));
    const x = new Float64Array(N);
    const y = new Float64Array(N);
    const color: string[] = new Array(N).fill(COLOR.ink);
    const dim = new Uint8Array(N);
    const present = new Uint8Array(N);
    members.forEach((ids, gi) => {
      const g = f.groups[gi];
      ids.forEach((d, j) => {
        const s = lay.slots[gi][j];
        x[d] = s.x; y[d] = s.y; present[d] = 1;
        color[d] = f.colorBy === 'cohort' && cohortOf[d] ? cohortColor.get(cohortOf[d]) ?? g.color : g.color;
        if (g.weight && j % g.weight.of >= g.weight.keep) dim[d] = 1;
      });
    });
    // stagger: dots leave in a left → right wave by destination, with a little jitter
    const order = Array.from({ length: N }, (_, i) => i).filter(i => present[i]).sort((a, b) => x[a] - x[b] || y[a] - y[b]);
    const rank = new Float64Array(N);
    const r = rng(1234 + Math.round(f.t * 100));
    order.forEach((d, k) => { rank[d] = Math.min(1, Math.max(0, k / Math.max(1, order.length - 1) + (r() - 0.5) * 0.15)); });
    return { t: f.t, layout: lay, x, y, color, dim, present, rank, groups: f.groups, values, prevValues };
  });
  return { N, resolved };
}

/* ------------------------------------ rendering ------------------------------------ */

const flyEase = Easing.bezier(0.45, 0, 0.25, 1);

export interface PeopleDotsProps {
  formations: Formation[];
  cohorts?: DotCohort[];
  /** area in design px (labels included) */
  box: Box;
  /** fade everything out by this time (s) */
  to?: number;
  /** seconds each dot takes to fly */
  fly?: number;
  /** seconds of left → right stagger across all dots */
  stagger?: number;
  /** guard item prefix */
  id?: string;
  /** design space the box is in (default DESIGN, 16:9); scaled by width / space.w */
  space?: { w: number; h: number };
}

/**
 * <PeopleDots formations cohorts box>: put it in its own <Track>. Formations switch at their
 * `t` (seconds); group labels slide in once the dots have mostly landed and count up.
 */
export const PeopleDots: React.FC<PeopleDotsProps> = ({ formations, cohorts, box, to = 1e9, fly = 1.1, stagger = 0.6, id = 'dots', space = DESIGN }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const { N, resolved } = useMemo(() => resolveFormations(formations, cohorts, box), [formations, cohorts, box]);
  const seeds = useMemo(() => { const r = rng(77); return Array.from({ length: N }, () => (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5)); }, [N]);
  const out = interpolate(t, [to - 0.5, to], [1, 0], clamp);
  let k = -1;
  for (let i = 0; i < resolved.length; i++) if (t >= resolved[i].t) k = i;
  if (k < 0 || out <= 0) return null;
  const cur = resolved[k];
  const prev = k > 0 ? resolved[k - 1] : null;
  const span = k + 1 < resolved.length ? resolved[k + 1].t - cur.t : 1e9;
  const D = Math.min(fly, span * 0.6);
  const St = Math.min(stagger, Math.max(0, span * 0.85 - D));
  const sc = width / space.w;

  const dots: React.ReactNode[] = [];
  for (let i = 0; i < N; i++) {
    const u = flyEase(interpolate(t, [cur.t + cur.rank[i] * St, cur.t + cur.rank[i] * St + D], [0, 1], clamp));
    const inPrev = !!prev?.present[i];
    const inCur = !!cur.present[i];
    if (!inPrev && !inCur) continue;
    let x: number;
    let y: number;
    let r: number;
    let fill: string;
    let dim: number;
    if (inPrev && inCur) {
      const x0 = prev!.x[i]; const y0 = prev!.y[i]; const x1 = cur.x[i]; const y1 = cur.y[i];
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const lift = Math.sin(u * Math.PI) * Math.min(70, dist * 0.22) * seeds[i];
      const nx = dist ? -(y1 - y0) / dist : 0;
      const ny = dist ? (x1 - x0) / dist : 0;
      x = x0 + (x1 - x0) * u + nx * lift;
      y = y0 + (y1 - y0) * u + ny * lift;
      r = prev!.layout.dotR + (cur.layout.dotR - prev!.layout.dotR) * u;
      fill = prev!.color[i] === cur.color[i] ? cur.color[i] : interpolateColors(u, [0, 1], [prev!.color[i], cur.color[i]]);
      dim = prev!.dim[i] + (cur.dim[i] - prev!.dim[i]) * u;
    } else if (inCur) {
      x = cur.x[i]; y = cur.y[i]; r = cur.layout.dotR * u; fill = cur.color[i]; dim = cur.dim[i];
    } else {
      x = prev!.x[i]; y = prev!.y[i]; r = prev!.layout.dotR * (1 - u); fill = prev!.color[i]; dim = prev!.dim[i];
    }
    if (r < 0.2) continue;
    x = Math.min(box.x + box.w - r, Math.max(box.x + r, x));
    y = Math.min(box.y + box.h - r, Math.max(box.y + r, y));
    dots.push(<circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r={r.toFixed(2)} fill={fill} fillOpacity={1 - dim * 0.8} stroke={dim > 0.01 ? fill : 'none'} strokeWidth={dim * STROKE.thin} />);
  }

  // labels: the previous formation's leave as the new dots start; the new ones arrive as they land
  const labels: React.ReactNode[] = [];
  const drawLabels = (f: ResolvedFormation, fi: number) => {
    const next = resolved[fi + 1];
    const at = f.t + Math.min(fly, (next ? next.t - f.t : 1e9) * 0.6) * 0.7;
    const outAt = next ? next.t - 0.05 : to - 0.6;
    const s = slideState(t, { at, from: 'up', out: outAt, to: 'fade', dur: MOTION.fade, distance: 14 }, width, height);
    if (!s.visible || s.opacity <= 0.001) return;
    const c = interpolate(t, [at, at + 0.9], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    f.groups.forEach((g, gi) => {
      const L = f.layout.labels[gi];
      if (!L) return;
      const v = f.prevValues[gi] + (f.values[gi] - f.prevValues[gi]) * c;
      labels.push(
        <div key={`${fi}-${g.id}`} data-guard-item={`${id}-label:${g.id}`} data-guard-moving={s.moving ? '1' : undefined}
          style={{ position: 'absolute', left: L.x, top: L.y + s.y, width: L.w, height: L.h, opacity: s.opacity, textAlign: 'center', color: COLOR.ink }}>
          <div style={{ fontFamily: nameFont.family, fontSize: nameFont.size, fontWeight: 700, letterSpacing: nameFont.letterSpacing, lineHeight: 1.2, whiteSpace: 'nowrap', color: g.color }}>{g.label.toUpperCase()}</div>
          <div style={{ fontFamily: valueFont.family, fontSize: valueFont.size, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{valueText(v, g.unit)}</div>
        </div>,
      );
    });
  };
  if (prev) drawLabels(prev, k - 1);
  drawLabels(cur, k);

  return (
    <div data-guard-wrapper="" style={{ position: 'absolute', left: 0, top: 0, width: space.w, height: space.h, transform: `scale(${sc})`, transformOrigin: '0 0', opacity: out }}>
      <svg width={box.w} height={box.h} style={{ position: 'absolute', left: box.x, top: box.y, overflow: 'hidden' }}>
        <g transform={`translate(${-box.x} ${-box.y})`}>{dots}</g>
      </svg>
      {labels}
    </div>
  );
};

/* ------------------------------------ map mode ------------------------------------ */

export interface MapDot { at: LonLat; color?: string }

/**
 * <MapDots>: inside a <World>, dots fly from a screen point (design px) to their [lon, lat]
 * and stay pinned there (constant screen size). Staggered over `stagger` seconds.
 */
export const MapDots: React.FC<{ points: MapDot[]; from: Pt; start: number; fly?: number; stagger?: number; r?: number; color?: string; to?: number; space?: { w: number; h: number } }> = ({ points, from, start, fly = 1.2, stagger = 1, r = 5, color = COLOR.red, to = 1e9, space = DESIGN }) => {
  const w = useWorld();
  const sc = w.frameW / space.w;
  const o = interpolate(w.t, [to - 0.5, to], [1, 0], clamp);
  if (w.t < start || o <= 0) return null;
  return (
    <svg width={w.frameW} height={w.frameH} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: o }}>
      {points.map((p, i) => {
        const s = start + (points.length > 1 ? (i / (points.length - 1)) * stagger : 0);
        const u = flyEase(interpolate(w.t, [s, s + fly], [0, 1], clamp));
        if (u <= 0) return null;
        const [tx, ty] = toScreen(w, p.at);
        const fx = from.x * sc;
        const fy = from.y * sc;
        const lift = Math.sin(u * Math.PI) * 40 * sc;
        return <circle key={i} cx={fx + (tx - fx) * u} cy={fy + (ty - fy) * u - lift} r={r * sc} fill={p.color ?? color} stroke={COLOR.ink} strokeWidth={STROKE.hair * sc} />;
      })}
    </svg>
  );
};
