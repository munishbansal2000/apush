/**
 * Military motion blocks for <World> scenes: campaign arrows whose WIDTH is troop strength,
 * morphing front lines with a hatched controlled side, and battle markers that pulse on cue.
 *
 * Rules (docs/MOTION.md):
 * - One path per route: `smoothRoute()` samples ONE Catmull-Rom → Bézier curve; the drawn
 *   arrow body, its head and the riding label pill all come from those samples.
 * - Readable parts (pills, labels, markers) are counter-scaled with k = 1 / cam.s and carry
 *   data-guard-item. Arrow widths are screen-constant too (a width means a number of men).
 * - Every layout used for drawing is a pure exported function (armyState, frontPoints,
 *   battleLayout, siteLayout) so tools can check label boxes without a browser.
 */
import React, { useId, useMemo } from 'react';
import { Easing, interpolate } from 'remotion';
import { COLOR, FONT, TYPE } from '../theme/tokens';
import { estimateWidth } from './measure';
import { fadeWindow } from './primitives';
import { useWorld, WorldLayer, type LonLat } from './world';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const smoothstep = (v: number) => v * v * (3 - 2 * v);
const easeIO = Easing.bezier(0.65, 0, 0.35, 1);

export type XY = [number, number];
export type Proj = (ll: LonLat) => [number, number] | null;

/** Darken (f < 1) or lighten toward white (f > 1) a #rrggbb theme colour. */
export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(f <= 1 ? v * f : v + (255 - v) * (f - 1)));
  return `#${ch.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

const side = (fill: string) => ({ fill, edge: shade(fill, 0.55) });
/** Side colours (fill, darker outline), from the theme's historical side roles. */
export const SIDE = {
  union: side(COLOR.union),
  confederate: side(COLOR.confederate),
  patriot: side(COLOR.patriot),
  british: side(COLOR.british),
  inconclusive: side(COLOR.gold),
} as const;
export type Side = keyof typeof SIDE;
const sideColors = (sd?: Side, color?: string) => (color ? { fill: color, edge: shade(color, 0.55) } : SIDE[sd ?? 'union']);

/**
 * Text width in the same units as fontSize (world px at any zoom), from the calibrated
 * estimate in ./measure (pure, so tools and the browser compute identical label boxes).
 * Default font = the bold text face labels and pills use.
 */
export const textW = (text: string, fs: number, font: string = FONT.text, weight = 700) => estimateWidth(text, { size: fs, family: font, weight });

/* ------------------------------------ routes ------------------------------------ */

export interface RoutePoint { x: number; y: number; heading: number; nx: number; ny: number }

/** A smooth route through waypoints (world px), sampled once; everything that rides it uses these samples. */
export interface Route {
  /** SVG path (cubic Béziers) of the whole route */
  d: string;
  /** total length, world px */
  length: number;
  /** point at fraction u of the LENGTH (0..1); n = unit normal to the LEFT of travel */
  at: (u: number) => RoutePoint;
  /** length fraction at (fractional) waypoint index wp */
  uAtWp: (wp: number) => number;
  /** dense polyline between length fractions u0..u1 */
  slice: (u0: number, u1: number) => XY[];
}

/** Catmull-Rom through `pts` converted to cubic Béziers (tangents limited to avoid loops). */
export function smoothRoute(pts: XY[], perSeg = 24): Route {
  const P = pts.length === 1 ? [pts[0], pts[0]] : pts;
  const segs: [XY, XY, XY, XY][] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p1 = P[i];
    const p2 = P[i + 1];
    const p0 = P[i - 1] ?? [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];
    const p3 = P[i + 2] ?? [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
    const seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const tan = (a: XY, b: XY): XY => {
      const v: XY = [(b[0] - a[0]) / 6, (b[1] - a[1]) / 6];
      const l = Math.hypot(v[0], v[1]);
      const max = seg * 0.4;
      return l > max && l > 0 ? [(v[0] * max) / l, (v[1] * max) / l] : v;
    };
    const t1 = tan(p0, p2);
    const t2 = tan(p1, p3);
    segs.push([p1, [p1[0] + t1[0], p1[1] + t1[1]], [p2[0] - t2[0], p2[1] - t2[1]], p2]);
  }
  const bez = ([a, b, c, e]: [XY, XY, XY, XY], t: number): XY => {
    const m = 1 - t;
    return [m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * e[0], m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * e[1]];
  };
  const S: XY[] = [];
  segs.forEach(sg => { for (let j = 0; j < perSeg; j++) S.push(bez(sg, j / perSeg)); });
  S.push(P[P.length - 1]);
  const cum = [0];
  for (let i = 1; i < S.length; i++) cum.push(cum[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
  const L = cum[cum.length - 1] || 1e-6;
  const knots = segs.map((_, i) => cum[i * perSeg] / L).concat(1);
  const idxAt = (s: number) => {
    let lo = 0;
    let hi = cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    return lo;
  };
  const pointAt = (s: number): XY => {
    const i = idxAt(s);
    const j = Math.min(i + 1, S.length - 1);
    const f = cum[j] > cum[i] ? (s - cum[i]) / (cum[j] - cum[i]) : 0;
    return [S[i][0] + (S[j][0] - S[i][0]) * f, S[i][1] + (S[j][1] - S[i][1]) * f];
  };
  const at = (u: number): RoutePoint => {
    const s = Math.min(1, Math.max(0, u)) * L;
    const [x, y] = pointAt(s);
    const h = Math.min(L * 0.01, 6);
    const a = pointAt(Math.max(0, s - h));
    const b = pointAt(Math.min(L, s + h));
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return { x, y, heading: (Math.atan2(dy, dx) * 180) / Math.PI, nx: dy / l, ny: -dx / l };
  };
  const slice = (u0: number, u1: number): XY[] => {
    const s0 = Math.max(0, u0) * L;
    const s1 = Math.min(1, u1) * L;
    if (s1 <= s0) return [];
    const out: XY[] = [pointAt(s0)];
    for (let i = 0; i < S.length; i++) if (cum[i] > s0 && cum[i] < s1) out.push(S[i]);
    out.push(pointAt(s1));
    return out;
  };
  const uAtWp = (wp: number) => {
    const w = Math.min(knots.length - 1, Math.max(0, wp));
    const i = Math.min(knots.length - 2, Math.floor(w));
    return knots[i] + (knots[i + 1] - knots[i]) * (w - i);
  };
  const d = `M ${P[0][0]} ${P[0][1]} ` + segs.map(([, b, c, e]) => `C ${b[0]} ${b[1]} ${c[0]} ${c[1]} ${e[0]} ${e[1]}`).join(' ');
  return { d, length: L, at, uAtWp, slice };
}

/** Route through [lon, lat] waypoints in the world's projection. */
export const projectRoute = (proj: Proj, lls: LonLat[], perSeg = 24): Route =>
  smoothRoute(lls.map(ll => (proj(ll) ?? [0, 0]) as XY), perSeg);

/** Polyline → SVG path string. */
export const polyD = (pts: XY[], close = false) =>
  pts.length ? `M ${pts.map(p => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ')}${close ? ' Z' : ''}` : '';

/* ------------------------------------ ArmyMove ------------------------------------ */

export interface Strength { u: number; men: number }

export interface ArmyMoveProps {
  waypoints: LonLat[];
  /** seconds: march starts / arrives (default progress = eased between them) */
  start: number;
  end: number;
  /** optional schedule: at time t the tip is at (fractional) waypoint index wp — e.g. dated stops */
  progress?: { t: number; wp: number }[];
  /** seconds: arrow fades out (default: stays) */
  until?: number;
  side?: Side;
  /** overrides the side colour */
  color?: string;
  /** troop strength along the route (u = fraction of route length); width = men / menPerPx */
  strength?: Strength[];
  /** men per screen pixel of width (default 4000 → 60,000 men ≈ 15 px) */
  menPerPx?: number;
  /** unit label on the pill riding with the tip, e.g. "Sherman" */
  label?: string;
  /** append "· ≈62,000 men" (default true when strength is given) */
  showMen?: boolean;
  /** seconds the pill is visible (default [start, until]) */
  labelWindow?: [number, number];
  /** pill on the left or right of the direction of travel (default 'left') */
  labelSide?: 'left' | 'right';
  /** faint dashed outline of the whole planned route */
  showPlanned?: boolean;
}

export const menAt = (strength: Strength[] | undefined, u: number): number => {
  if (!strength?.length) return 0;
  const s = [...strength].sort((a, b) => a.u - b.u);
  if (s.length === 1) return s[0].men;
  return interpolate(u, s.map(x => x.u), s.map(x => x.men), clamp);
};

export const fmtMen = (men: number) => `≈${(Math.round(men / 1000) * 1000).toLocaleString('en-US')} men`;

export interface Box { x0: number; y0: number; x1: number; y1: number }
export const boxOf = (cx: number, cy: number, w: number, h: number): Box => ({ x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 });

/** Where the march is at time t: tip fraction u, strength, pill box (world px). Pure. */
export function armyState(route: Route, p: ArmyMoveProps, t: number, k: number) {
  const u = p.progress?.length
    ? route.uAtWp(interpolate(t, p.progress.map(x => x.t), p.progress.map(x => x.wp), clamp))
    : smoothstep(interpolate(t, [p.start, p.end], [0, 1], clamp));
  const men = menAt(p.strength, u);
  const widthPx = (m: number) => (p.strength?.length ? Math.max(4, m / (p.menPerPx ?? 4000)) : 9);
  const w = widthPx(men) * k;
  const headW = Math.max(w * 2.1, 18 * k);
  const tip = route.at(u);
  const opacity = fadeWindow(t, p.start - 0.3, p.until ?? 1e9, 0.3, 0.5);
  const [la, lb] = p.labelWindow ?? [p.start, p.until ?? 1e9];
  const labelO = p.label ? Math.min(opacity, fadeWindow(t, la, lb, 0.3)) : 0;
  const num = p.label && (p.showMen ?? !!p.strength?.length) ? fmtMen(men) : '';
  const text = p.label ? (num ? `${p.label} · ${num}` : p.label) : '';
  const fs = TYPE.flow * k;
  const pw = textW(text, fs) + fs * 1.4;
  const ph = fs * 1.6;
  const sg = p.labelSide === 'right' ? -1 : 1;
  const off = headW / 2 + 8 * k + Math.abs(tip.nx) * pw / 2 + Math.abs(tip.ny) * ph / 2;
  const pill = { cx: tip.x + tip.nx * sg * off, cy: tip.y + tip.ny * sg * off, w: pw, h: ph, fs, text, name: p.label ?? '', num };
  return { u, men, w, headW, tip, opacity, labelO, pill, widthPx };
}

/** Variable-width arrow body + tapered head up to the tip, as one polygon (world px). */
export function arrowPolygon(route: Route, u: number, widthAt: (u: number) => number, headW0: number, k: number): string {
  const L = route.length;
  const sTip = u * L;
  if (sTip <= 0.5 * k) return '';
  let headW = headW0;
  let headLen = headW0 * 0.95;
  const sc = Math.min(1, sTip / headLen);
  headW *= sc; headLen *= sc;
  const uBase = (sTip - headLen) / L;
  const body = uBase > 0 ? route.slice(0, uBase) : [];
  const left: XY[] = [];
  const right: XY[] = [];
  let run = 0;                                                            // slice points lie on the route: running length = arc length
  body.forEach((pt, i) => {
    if (i > 0) run += Math.hypot(pt[0] - body[i - 1][0], pt[1] - body[i - 1][1]);
    const uu = Math.min(uBase, run / L);
    const n = route.at(uu);
    const taper = Math.min(1, 0.5 + (0.5 * uu * L) / (70 * k));          // tail swells in over ~70 screen px
    const hw = (widthAt(uu) * taper) / 2;
    left.push([pt[0] + n.nx * hw, pt[1] + n.ny * hw]);
    right.push([pt[0] - n.nx * hw, pt[1] - n.ny * hw]);
  });
  const b = route.at(Math.max(0, uBase));
  const tip = route.at(u);
  const bw = headW / 2;
  const notch = Math.min(headLen * 0.18, 6 * k);                          // slight swallow at the barbs
  const hl: XY = [b.x + b.nx * bw - (tip.x - b.x) / (headLen || 1) * notch, b.y + b.ny * bw - (tip.y - b.y) / (headLen || 1) * notch];
  const hr: XY = [b.x - b.nx * bw - (tip.x - b.x) / (headLen || 1) * notch, b.y - b.ny * bw - (tip.y - b.y) / (headLen || 1) * notch];
  const wb = body.length ? (widthAt(uBase) * Math.min(1, 0.5 + (0.5 * uBase * L) / (70 * k))) / 2 : 0;
  const bl: XY = [b.x + b.nx * wb, b.y + b.ny * wb];
  const br: XY = [b.x - b.nx * wb, b.y - b.ny * wb];
  return polyD([...left, bl, hl, [tip.x, tip.y], hr, br, ...right.reverse()], true);
}

/**
 * A campaign arrow drawn on progressively along its route. Width = troop strength (constant on
 * screen; shrinks/grows with `strength`). A pill with the unit (and men) rides with the tip.
 */
export const ArmyMove: React.FC<ArmyMoveProps> = props => {
  const { proj, t, cam } = useWorld();
  const route = useMemo(() => projectRoute(proj, props.waypoints), [proj, props.waypoints]);
  const k = 1 / cam.s;
  const st = armyState(route, props, t, k);
  if (st.opacity <= 0 || st.u <= 0) return null;
  const c = sideColors(props.side, props.color);
  const widthAt = (uu: number) => st.widthPx(menAt(props.strength, uu)) * k;
  const poly = arrowPolygon(route, st.u, widthAt, st.headW, k);
  const name = props.label ?? props.waypoints.map(w => w.join(',')).join('-');
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: st.opacity }}>
        {props.showPlanned && <path d={route.d} fill="none" stroke={c.edge} strokeOpacity={0.45} strokeWidth={2 * k} strokeDasharray={`${6 * k} ${6 * k}`} />}
        <path d={poly} fill={COLOR.ink} fillOpacity={0.25} transform={`translate(${2.5 * k} ${3.5 * k})`} />
        <path d={poly} fill={c.fill} fillOpacity={0.94} stroke={c.edge} strokeWidth={1.6 * k} strokeLinejoin="round" />
        {st.labelO > 0 && (
          <g opacity={st.labelO} data-guard-item={`army:${name}`}>
            <rect x={st.pill.cx - st.pill.w / 2} y={st.pill.cy - st.pill.h / 2} width={st.pill.w} height={st.pill.h} rx={st.pill.fs * 0.35}
              fill={COLOR.paper} stroke={c.edge} strokeWidth={2 * k} />
            <text x={st.pill.cx} y={st.pill.cy + st.pill.fs * 0.34} textAnchor="middle" fontSize={st.pill.fs} fontFamily={FONT.text} fontWeight={700} fill={COLOR.ink}>
              {st.pill.name}{st.pill.num && <tspan fontFamily={FONT.ui}>{` · ${st.pill.num}`}</tspan>}
            </text>
          </g>
        )}
      </svg>
    </WorldLayer>
  );
};

/* ------------------------------------ FrontLine ------------------------------------ */

export interface FrontKey { t: number; line: LonLat[]; /** seconds to morph into this key (default 1.4) */ ease?: number }

/** Resample a polyline (world px) to n points equally spaced by length. */
export function resample(pts: XY[], n: number): XY[] {
  const r = smoothRoute(pts, 12);
  return Array.from({ length: n }, (_, i) => { const p = r.at(i / (n - 1)); return [p.x, p.y] as XY; });
}

/** The front at time t (world px, n points): hold each key, morph point-by-point into the next. Pure. */
export function frontPoints(proj: Proj, keys: FrontKey[], t: number, n = 72): XY[] {
  const lines = keys.map(k => resample(k.line.map(ll => (proj(ll) ?? [0, 0]) as XY), n));
  let cur = lines[0];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i].t) break;
    const p = easeIO(interpolate(t, [keys[i].t, keys[i].t + (keys[i].ease ?? 1.4)], [0, 1], clamp));
    const from = cur;
    cur = from.map((a, j) => [a[0] + (lines[i][j][0] - a[0]) * p, a[1] + (lines[i][j][1] - a[1]) * p] as XY);
  }
  return cur;
}

/** Unit normals (left of travel) along a polyline. */
const normals = (pts: XY[]): XY[] => pts.map((_, i) => {
  const a = pts[Math.max(0, i - 1)];
  const b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [dy / l, -dx / l];
});

export interface FrontLineProps {
  keys: FrontKey[];
  /** seconds visible */
  from: number;
  to?: number;
  side?: Side;
  color?: string;
  /** which side of the line (relative to its point order) is controlled → hatched */
  hatch?: 'left' | 'right';
  /** hatched band depth, screen px */
  depth?: number;
  label?: string;
  /** where along the line the label sits (0..1) */
  labelU?: number;
  labelWindow?: [number, number];
}

/** Label pill box of a front at time t (world px). Pure. */
export function frontLabel(pts: XY[], p: FrontLineProps, k: number) {
  const ns = normals(pts);
  const i = Math.round((p.labelU ?? 0.5) * (pts.length - 1));
  const sg = p.hatch === 'right' ? -1 : 1;
  const fs = TYPE.flow * k;
  const text = p.label ?? '';
  const w = textW(text, fs) + fs * 1.4;
  const h = fs * 1.6;
  const [nx, ny] = ns[i];
  const off = (p.depth ?? 34) * k + 6 * k + Math.abs(nx) * w / 2 + Math.abs(ny) * h / 2;
  return { cx: pts[i][0] + nx * sg * off, cy: pts[i][1] + ny * sg * off, w, h, fs, text };
}

/** A front line morphing between keyframed polylines, with a hatched band on the controlled side. */
export const FrontLine: React.FC<FrontLineProps> = p => {
  const { proj, t, cam } = useWorld();
  const id = `front-hatch-${useId().replace(/:/g, '')}`;
  const o = fadeWindow(t, p.from, p.to ?? 1e9, 0.5);
  if (o <= 0) return null;
  const k = 1 / cam.s;
  const c = sideColors(p.side, p.color);
  const pts = frontPoints(proj, p.keys, t);
  const ns = normals(pts);
  const sg = p.hatch === 'right' ? -1 : 1;
  const depth = (p.depth ?? 34) * k;
  const outer = pts.map((q, i) => [q[0] + ns[i][0] * sg * depth, q[1] + ns[i][1] * sg * depth] as XY);
  const band = polyD([...pts, ...outer.reverse()], true);
  const line = polyD(pts);
  const lab = p.label ? frontLabel(pts, p, k) : null;
  const [la, lb] = p.labelWindow ?? [p.from, p.to ?? 1e9];
  const lo = lab ? Math.min(o, fadeWindow(t, la, lb, 0.3)) : 0;
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: o }}>
        <defs>
          <pattern id={id} patternUnits="userSpaceOnUse" width={9 * k} height={9 * k} patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={9 * k} stroke={c.fill} strokeWidth={2.4 * k} />
          </pattern>
        </defs>
        <path d={band} fill={c.fill} fillOpacity={0.1} />
        <path d={band} fill={`url(#${id})`} opacity={0.7} />
        <path d={line} fill="none" stroke={COLOR.halo} strokeWidth={7 * k} strokeLinejoin="round" strokeLinecap="round" />
        <path d={line} fill="none" stroke={c.edge} strokeWidth={3.6 * k} strokeLinejoin="round" strokeLinecap="round" />
        {lab && lo > 0 && (
          <g opacity={lo} data-guard-item={`front:${lab.text}`}>
            <rect x={lab.cx - lab.w / 2} y={lab.cy - lab.h / 2} width={lab.w} height={lab.h} rx={lab.fs * 0.35} fill={COLOR.paper} stroke={c.edge} strokeWidth={2 * k} />
            <text x={lab.cx} y={lab.cy + lab.fs * 0.34} textAnchor="middle" fontSize={lab.fs} fontFamily={FONT.text} fontWeight={700} fill={COLOR.ink}>{lab.text}</text>
          </g>
        )}
      </svg>
    </WorldLayer>
  );
};

/* ------------------------------------ BattleMarker ------------------------------------ */

export type Anchor = 'start' | 'middle' | 'end';
export interface LabelPlace { dx: number; dy: number; anchor: Anchor }

export interface BattleMarkerProps {
  at: LonLat;
  name: string;
  date?: string;
  /** seconds: marker pops in and pulses */
  start: number;
  end?: number;
  /** outcome colour (winner's side, or 'inconclusive') */
  outcome?: Side;
  color?: string;
  icon?: 'swords' | 'star';
  /** casualties count-up target; shown as "≈23,000 casualties" */
  casualties?: number;
  casualtiesLabel?: string;
  /** seconds: count-up starts (default start + 0.6) and lasts countDur (default 1.6) */
  countStart?: number;
  countDur?: number;
  /** label offset from the marker centre, screen px (default right of it) */
  label?: LabelPlace;
}

/** Marker radius, screen px. */
export const MARKER_R = 13;

export interface TextLine { text: string; fs: number; weight: number; font?: string }

/** Lines of a stacked label laid out at an anchor; returns per-line positions + the union box. Pure. */
export function stackLayout(x: number, y: number, lines: TextLine[], place: LabelPlace, k: number, iconR: number) {
  const lh = lines.map(l => l.fs * 1.22);
  const H = lh.reduce((a, b) => a + b, 0);
  const W = Math.max(...lines.map(l => textW(l.text, l.fs, l.font, l.weight)));
  const ax = x + place.dx * k;
  const top = y + place.dy * k - H / 2;
  let yy = top;
  const pos = lines.map((l, i) => { const cy = yy + lh[i] / 2; yy += lh[i]; return { ...l, x: ax, y: cy }; });
  const x0 = place.anchor === 'start' ? ax : place.anchor === 'end' ? ax - W : ax - W / 2;
  const box: Box = { x0: Math.min(x0, x - iconR), y0: Math.min(top, y - iconR), x1: Math.max(x0 + W, x + iconR), y1: Math.max(top + H, y + iconR) };
  return { pos, box, textBox: { x0, y0: top, x1: x0 + W, y1: top + H } as Box };
}

/** Text of a battle label at time t. Pure. */
export function battleLines(p: BattleMarkerProps, t: number, k: number): TextLine[] {
  const lines: TextLine[] = [{ text: p.name, fs: TYPE.flow * k, weight: 700 }];
  if (p.date) lines.push({ text: p.date, fs: TYPE.town * k, weight: 400 });
  if (p.casualties) {
    const c0 = p.countStart ?? p.start + 0.6;
    const v = p.casualties * smoothstep(interpolate(t, [c0, c0 + (p.countDur ?? 1.6)], [0, 1], clamp));
    const shown = Math.round(v / 100) * 100;
    lines.push({ text: `≈${shown.toLocaleString('en-US')} ${p.casualtiesLabel ?? 'casualties'}`, fs: TYPE.town * k, weight: 700, font: FONT.ui });
  }
  return lines;
}

/** Full label + icon layout (world px) at time t; for the widest text use the final count. Pure. */
export function battleLayout(proj: Proj, p: BattleMarkerProps, t: number, k: number) {
  const [x, y] = proj(p.at) ?? [0, 0];
  const lines = battleLines(p, t, k);
  return { x, y, ...stackLayout(x, y, lines, p.label ?? { dx: MARKER_R + 9, dy: 0, anchor: 'start' }, k, MARKER_R * k) };
}

const starPts = (r: number) => Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  const rr = i % 2 ? r * 0.45 : r;
  return `${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`;
}).join(' ');

/** Crossed swords (or a star) in the outcome colour; pulses at `start`; label + optional casualty count-up. */
export const BattleMarker: React.FC<BattleMarkerProps> = p => {
  const { proj, t, cam } = useWorld();
  const o = fadeWindow(t, p.start, p.end ?? 1e9, 0.3, 0.5);
  if (o <= 0) return null;
  const k = 1 / cam.s;
  const c = sideColors(p.outcome ?? 'inconclusive', p.color);
  const L = battleLayout(proj, p, t, k);
  const pop = interpolate(t, [p.start, p.start + 0.45], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.2)) });
  const r = MARKER_R * k;
  const rings = [0, 0.4, 0.8].map(d => interpolate(t, [p.start + d, p.start + d + 1.3], [0, 1], clamp));
  const anchorOf = (a: Anchor) => a;
  const place = p.label ?? { dx: MARKER_R + 9, dy: 0, anchor: 'start' as const };
  const s = r * 0.62;
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: o }}>
        {rings.map((q, i) => q > 0 && q < 1 && (
          <circle key={i} cx={L.x} cy={L.y} r={r + q * 40 * k} fill="none" stroke={c.fill} strokeWidth={3 * k * (1 - q)} opacity={1 - q} />
        ))}
        <g data-guard-item={`battle:${p.name}`}>
          <g transform={`translate(${L.x} ${L.y}) scale(${pop})`}>
            <circle r={r} fill={c.fill} stroke={c.edge} strokeWidth={2 * k} />
            {p.icon === 'star'
              ? <polygon points={starPts(r * 0.7)} fill={COLOR.paper} />
              : (
                <g stroke={COLOR.paper} strokeWidth={2.2 * k} strokeLinecap="round">
                  <line x1={-s} y1={-s} x2={s} y2={s} />
                  <line x1={s} y1={-s} x2={-s} y2={s} />
                  <line x1={s * 0.35} y1={s * 0.95} x2={s * 0.95} y2={s * 0.35} />
                  <line x1={-s * 0.35} y1={s * 0.95} x2={-s * 0.95} y2={s * 0.35} />
                </g>
              )}
          </g>
          {L.pos.map((l, i) => (
            <text key={i} x={l.x} y={l.y} textAnchor={anchorOf(place.anchor)} dominantBaseline="middle" fontSize={l.fs} fontFamily={l.font ?? FONT.text} fontWeight={l.weight}
              fill={i === 0 ? COLOR.ink : COLOR.inkSoft} stroke={COLOR.halo} strokeWidth={l.fs * 0.22} paintOrder="stroke">
              {l.text}
            </text>
          ))}
        </g>
      </svg>
    </WorldLayer>
  );
};

/* ------------------------------------ SiteLabel ------------------------------------ */

export interface SiteLabelProps { at: LonLat; text: string; from: number; to?: number; label?: LabelPlace }

/** Layout of a small town/site label (world px). Pure. */
export function siteLayout(proj: Proj, p: SiteLabelProps, k: number) {
  const [x, y] = proj(p.at) ?? [0, 0];
  return { x, y, ...stackLayout(x, y, [{ text: p.text, fs: TYPE.town * k, weight: 700 }], p.label ?? { dx: 9, dy: 0, anchor: 'start' }, k, 4 * k) };
}

/** A small dot + town name (TYPE.town), for route stops like Atlanta or Milledgeville. */
export const SiteLabel: React.FC<SiteLabelProps> = p => {
  const { proj, t, cam } = useWorld();
  const o = fadeWindow(t, p.from, p.to ?? 1e9);
  if (o <= 0) return null;
  const k = 1 / cam.s;
  const L = siteLayout(proj, p, k);
  const l = L.pos[0];
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: o }}>
        <g data-guard-item={`site:${p.text}`}>
          <circle cx={L.x} cy={L.y} r={4 * k} fill={COLOR.ink} stroke={COLOR.halo} strokeWidth={1.5 * k} />
          <text x={l.x} y={l.y} textAnchor={(p.label ?? { anchor: 'start' }).anchor} dominantBaseline="middle" fontSize={l.fs} fontFamily={FONT.text} fontWeight={700}
            fill={COLOR.ink} stroke={COLOR.halo} strokeWidth={l.fs * 0.22} paintOrder="stroke">{p.text}</text>
        </g>
      </svg>
    </WorldLayer>
  );
};
