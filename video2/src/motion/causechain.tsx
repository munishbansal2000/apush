/**
 * CauseChain: a chain of event cards that trigger each other like dominoes. Each card lands
 * (tips into place), then an impulse travels along the connector to the next card, which tips
 * and lands in turn; the "because" text for that link appears on the connector as it fires.
 *
 * Layout (pure, deterministic, unit-tested in tests/motion-layout.test.ts):
 * - 'snake': rows wrap automatically to fit the box (default = the safe area, ≥64px L/R,
 *   ≥36px T/B); odd rows run right-to-left so the chain reads as one continuous path. If the
 *   rows are taller than the box, a camera pans down the chain.
 * - 'line': one long row of dominoes; a camera pans along it, keeping the newest card in view.
 *   "because" pills alternate above/below the row so neighbours never collide.
 * Cards size to their content (min/max width); text is wrapped by measuring it
 * (src/motion/measure.ts: measureText in the browser, the calibrated per-font estimate in
 * node), and every line is rendered explicitly, so the browser never re-wraps and nothing can
 * spill out of a card. Font sizes come from the TYPE scale only.
 *
 * Screen space: all geometry is in design px (`space`, default the 16:9 design base from
 * ./layout), scaled by width / space.w at render time.
 */
import React, { useMemo } from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLOR, FONT, MOTION, RADIUS, SAFE, SHADOW, STROKE, SURFACE, TYPE } from '../theme/tokens';
import { DESIGN } from './layout';
import { fitLines, measureLine, wrapText, type Font, type Measure } from './measure';
import { slideState } from './primitives';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/* ------------------------------------ text measuring ------------------------------------ */

// Text measuring lives in ./measure (one calibrated module for every block); re-exported here
// for existing imports.
export { estimateWidth, fitLines, measureLine, wrapText, type Font, type Measure } from './measure';

/* ------------------------------------ 1-D packing ------------------------------------ */

/**
 * Place intervals (desired centres, widths) in order inside [lo, hi] with `gap` between them,
 * moving each as little as possible. Returns left edges, or null if they cannot fit.
 */
export function pack1D(items: { c: number; w: number }[], lo: number, hi: number, gap: number): number[] | null {
  const total = items.reduce((s, it) => s + it.w, 0) + gap * Math.max(0, items.length - 1);
  if (total > hi - lo + 1e-6) return null;
  const x = items.map(it => it.c - it.w / 2);
  for (let i = 0; i < x.length; i++) x[i] = Math.max(x[i], lo, i ? x[i - 1] + items[i - 1].w + gap : lo);
  for (let i = x.length - 1; i >= 0; i--) x[i] = Math.min(x[i], hi - items[i].w, i < x.length - 1 ? x[i + 1] - gap - items[i].w : hi);
  return x;
}

/* ------------------------------------ chain layout ------------------------------------ */

export interface Box { x: number; y: number; w: number; h: number }
export interface CauseCard { title: string; year: string; because?: string; source?: string }

export interface ChainOptions {
  /** viewport in design px (default: safe area 64/36 of the 16:9 design base) */
  box?: Box;
  layout?: 'snake' | 'line';
  minCardW?: number;
  maxCardW?: number;
  /** min connector length between cards */
  gap?: number;
  pillMaxW?: number;
}

export const SAFE_BOX: Box = { x: SAFE.x, y: SAFE.y, w: DESIGN.w - 2 * SAFE.x, h: DESIGN.h - 2 * SAFE.y };

export const CARD = { padX: 14, padY: 10, border: STROKE.base, titleSizes: [TYPE.chip, TYPE.flow, TYPE.town], titleLines: 3, lineH: 1.2, yearGap: 4 } as const;
export const PILL = { padX: 10, padY: 6, size: TYPE.town, maxLines: 4, lineH: 1.2, tick: 14, border: STROKE.thin } as const;
export const yearFont: Font = { size: TYPE.town, family: FONT.display, weight: 700, letterSpacing: 2 };
export const titleFont = (size: number): Font => ({ size, family: FONT.display, weight: 700 });
export const pillFont: Font = { size: PILL.size, family: FONT.text, italic: true };

export interface CardGeom { x: number; y: number; w: number; h: number; titleSize: number; titleLines: string[]; innerW: number; textW: number; fits: boolean; row: number }
export interface PillGeom { x: number; y: number; w: number; h: number; lines: string[]; textW: number; anchor: [number, number]; fits: boolean }
export interface ChainLayout {
  cards: CardGeom[];
  /** connector INTO card i (null for i = 0) */
  connectors: ([number, number][] | null)[];
  /** "because" pill for the connector into card i */
  pills: (PillGeom | null)[];
  contentW: number;
  contentH: number;
  /** content offset inside the box when it is smaller than the box (centred) */
  offset: [number, number];
  pan: 'none' | 'x' | 'y';
  /** padding at both ends of the pan axis (content px) */
  edge: number;
  box: Box;
}

/** Fade margin (px) at the viewport edges while panning. */
export const FADE = 36;

function measureCard(c: CauseCard, minW: number, maxW: number, measure: Measure) {
  const inset = CARD.padX + CARD.border;
  const fit = fitLines(c.title, maxW - 2 * inset, CARD.titleSizes as unknown as number[], CARD.titleLines, { family: FONT.display, weight: 700 }, measure);
  const yearW = measure(c.year, yearFont);
  const textW = Math.max(fit.width, yearW);
  const w = Math.min(maxW, Math.max(minW, Math.ceil(textW + 2 * inset + 2)));
  const h = Math.ceil(2 * (CARD.padY + CARD.border) + yearFont.size * CARD.lineH + CARD.yearGap + fit.lines.length * fit.size * CARD.lineH);
  return { w, h, titleSize: fit.size, titleLines: fit.lines, innerW: w - 2 * inset, textW, fits: fit.fits && yearW <= w - 2 * inset };
}

function measurePill(text: string, maxW: number, measure: Measure) {
  const inset = PILL.padX + PILL.border;
  const lines = wrapText(text, maxW - 2 * inset, pillFont, measure);
  const textW = Math.max(...lines.map(l => measure(l, pillFont)));
  const w = Math.ceil(textW + 2 * inset + 2);
  const h = Math.ceil(2 * (PILL.padY + PILL.border) + lines.length * PILL.size * PILL.lineH);
  return { w, h, lines, textW, fits: textW <= maxW - 2 * inset && lines.length <= PILL.maxLines };
}

/** Pack a band of pills; shrink their max width until they fit. */
function packBand(reqs: { i: number; text: string; c: number }[], lo: number, hi: number, maxW: number, measure: Measure) {
  for (let mw = maxW; mw >= 120; mw -= 20) {
    const ms = reqs.map(r => ({ ...r, ...measurePill(r.text, mw, measure) }));
    const xs = pack1D(ms.map(m => ({ c: m.c, w: m.w })), lo, hi, 12);
    if (xs) return ms.map((m, k) => ({ ...m, x: xs[k] }));
  }
  return null;
}

export function layoutChain(cards: CauseCard[], opts: ChainOptions = {}, measure: Measure = measureLine): ChainLayout {
  const box = opts.box ?? SAFE_BOX;
  const mode = opts.layout ?? 'snake';
  const minW = opts.minCardW ?? 150;
  const maxW = opts.maxCardW ?? 300;
  const pillMaxW = opts.pillMaxW ?? (mode === 'line' ? 300 : 240);
  const m = cards.map(c => measureCard(c, minW, maxW, measure));
  const geoms: CardGeom[] = [];
  const connectors: ([number, number][] | null)[] = cards.map(() => null);
  const pills: (PillGeom | null)[] = cards.map(() => null);
  const elbowSpace = 18;
  const EDGE = FADE + 4;

  if (mode === 'line') {
    const gap = opts.gap ?? 72;
    const rowH = Math.max(...m.map(c => c.h));
    // pills alternate: connector i into card i → above if i odd, below if even
    // EDGE padding at both ends so the first/last card can sit fully inside the fade margin
    let x = EDGE;
    const xs = m.map(c => { const v = x; x += c.w + gap; return v; });
    const contentW0 = x - gap + EDGE;
    const reqs = cards.map((c, i) => (i > 0 && c.because ? { i, text: c.because, c: xs[i] - gap / 2 } : null)).filter((r): r is NonNullable<typeof r> => !!r);
    const above = packBand(reqs.filter(r => r.i % 2 === 1), EDGE, contentW0 - EDGE, pillMaxW, measure) ?? [];
    const below = packBand(reqs.filter(r => r.i % 2 === 0), EDGE, contentW0 - EDGE, pillMaxW, measure) ?? [];
    const aboveH = above.length ? Math.max(...above.map(p => p.h)) + PILL.tick : 0;
    const belowH = below.length ? Math.max(...below.map(p => p.h)) + PILL.tick : 0;
    const rowY = aboveH;
    m.forEach((c, i) => geoms.push({ x: xs[i], y: rowY, w: c.w, h: rowH, titleSize: c.titleSize, titleLines: c.titleLines, innerW: c.innerW, textW: c.textW, fits: c.fits, row: 0 }));
    for (let i = 1; i < cards.length; i++) {
      const a = geoms[i - 1];
      const b = geoms[i];
      connectors[i] = [[a.x + a.w, rowY + rowH / 2], [b.x, rowY + rowH / 2]];
    }
    for (const p of above) pills[p.i] = { x: p.x, y: aboveH - PILL.tick - p.h, w: p.w, h: p.h, lines: p.lines, textW: p.textW, anchor: [p.c, rowY + rowH / 2], fits: p.fits };
    for (const p of below) pills[p.i] = { x: p.x, y: rowY + rowH + PILL.tick, w: p.w, h: p.h, lines: p.lines, textW: p.textW, anchor: [p.c, rowY + rowH / 2], fits: p.fits };
    const contentH = aboveH + rowH + belowH;
    const pan = contentW0 > box.w ? 'x' : 'none';
    return { cards: geoms, connectors, pills, contentW: contentW0, contentH, box, pan, edge: EDGE,
      offset: [pan === 'x' ? 0 : (box.w - contentW0) / 2, Math.max(0, (box.h - contentH) / 2)] };
  }

  // snake: the connector gap must leave room for a pill between neighbouring connectors
  const gap = opts.gap ?? Math.max(56, Math.min(120, pillMaxW + 12 - minW));
  const rows: number[][] = [];
  let cur: number[] = [];
  let used = 0;
  m.forEach((c, i) => {
    const need = cur.length ? used + gap + c.w : c.w;
    if (cur.length && need > box.w) { rows.push(cur); cur = [i]; used = c.w; } else { cur.push(i); used = need; }
  });
  if (cur.length) rows.push(cur);
  // balance: same number of rows, spread cards evenly if that still fits
  const per = Math.ceil(cards.length / rows.length);
  const balanced: number[][] = [];
  for (let i = 0; i < cards.length; i += per) balanced.push(cards.map((_, k) => k).slice(i, i + per));
  const fitsRow = (r: number[]) => r.reduce((s, k) => s + m[k].w, 0) + gap * (r.length - 1) <= box.w;
  const R = balanced.length === rows.length && balanced.every(fitsRow) ? balanced : rows;

  let y = 0;
  const rowTop: number[] = [];
  R.forEach((r, ri) => {
    const rowH = Math.max(...r.map(k => m[k].h));
    const sumW = r.reduce((s, k) => s + m[k].w, 0);
    const g = r.length > 1 ? Math.min(gap * 1.8, Math.max(gap, (box.w - sumW) / (r.length - 1))) : gap;
    const rowW = sumW + g * (r.length - 1);
    const rtl = ri % 2 === 1;
    let x = (box.w - rowW) / 2;
    const order = rtl ? [...r].reverse() : r;
    order.forEach(k => {
      const c = m[k];
      geoms[k] = { x, y, w: c.w, h: rowH, titleSize: c.titleSize, titleLines: c.titleLines, innerW: c.innerW, textW: c.textW, fits: c.fits, row: ri };
      x += c.w + g;
    });
    rowTop.push(y);
    // pills for connectors that leave this row (inside it, plus the turn into the next row)
    const reqs: { i: number; text: string; c: number }[] = [];
    for (const k of r) {
      if (k === 0 || !cards[k].because) continue;
      const a = geoms[k - 1];
      const b = geoms[k];
      if (a.row !== ri) continue; // pill of the turn into this row lives in the previous band
      const cx = (Math.min(a.x + a.w, b.x + b.w) + Math.max(a.x, b.x)) / 2;
      reqs.push({ i: k, text: cards[k].because!, c: cx });
    }
    const next = R[ri + 1];
    if (next && cards[next[0]].because) reqs.push({ i: next[0], text: cards[next[0]].because!, c: geoms[r[r.length - 1]].x + geoms[r[r.length - 1]].w / 2 });
    reqs.sort((a, b) => a.c - b.c);
    const band = packBand(reqs, 0, box.w, pillMaxW, measure) ?? [];
    const bandH = (band.length ? Math.max(...band.map(p => p.h)) + PILL.tick : 0) + (next ? elbowSpace + 8 : 0);
    for (const p of band) pills[p.i] = { x: p.x, y: y + rowH + PILL.tick, w: p.w, h: p.h, lines: p.lines, textW: p.textW, anchor: [p.c, 0], fits: p.fits };
    y += rowH + bandH;
  });
  const contentH = y;
  for (let i = 1; i < cards.length; i++) {
    const a = geoms[i - 1];
    const b = geoms[i];
    const p = pills[i];
    if (a.row === b.row) {
      const ltr = b.x > a.x;
      const cy = a.y + a.h / 2;
      connectors[i] = ltr ? [[a.x + a.w, cy], [b.x, cy]] : [[a.x, cy], [b.x + b.w, cy]];
      if (p) p.anchor = [p.anchor[0], cy];
    } else {
      const elbowY = b.y - elbowSpace / 2 - 4;
      connectors[i] = [[a.x + a.w / 2, a.y + a.h], [a.x + a.w / 2, elbowY], [b.x + b.w / 2, elbowY], [b.x + b.w / 2, b.y]];
      if (p) p.anchor = [a.x + a.w / 2, a.y + a.h];
    }
  }
  const pan = contentH > box.h ? 'y' : 'none';
  if (pan === 'y') {
    // EDGE padding top and bottom so the first/last row can sit fully inside the fade margin
    for (const g of geoms) g.y += EDGE;
    for (const p of pills) if (p) { p.y += EDGE; p.anchor = [p.anchor[0], p.anchor[1] + EDGE]; }
    for (const c of connectors) if (c) c.forEach(pt => { pt[1] += EDGE; });
  }
  const H = pan === 'y' ? contentH + 2 * EDGE : contentH;
  return { cards: geoms, connectors, pills, contentW: box.w, contentH: H, box, pan, edge: pan === 'y' ? EDGE : 0, offset: [0, pan === 'y' ? 0 : (box.h - contentH) / 2] };
}

/* ------------------------------------ timing + camera ------------------------------------ */

export interface ChainTiming { start: number; step?: number; times?: number[]; travel?: number }

export const landTimes = (n: number, tm: ChainTiming) => tm.times ?? Array.from({ length: n }, (_, i) => tm.start + i * (tm.step ?? 2.4));

const camEase = Easing.bezier(...MOTION.camera);

/** Camera offset (content px) at time t: eases to keep the newest card in view. */
export function chainCamera(L: ChainLayout, times: number[], travel: number, t: number) {
  if (L.pan === 'none') return { x: 0, y: 0, moving: false };
  const axis = L.pan;
  const view = axis === 'x' ? L.box.w : L.box.h;
  const content = axis === 'x' ? L.contentW : L.contentH;
  const target = (i: number) => {
    const c = L.cards[i];
    const p = L.pills[i];
    if (axis === 'x') {
      // newest card at ~72% of the view (two or three earlier cards stay visible), its incoming pill fully in view
      const right = Math.max(c.x + c.w, p ? p.x + p.w : 0);
      const v = Math.max(right - view + 24, c.x + c.w / 2 - view * 0.72);
      return Math.min(content - view, Math.max(0, v));
    }
    // newest card a little below the middle, so the row above (its cause) stays in view
    return Math.min(content - view, Math.max(0, c.y + c.h / 2 - view * 0.6));
  };
  const dur = 1.1;
  let cur = target(0);
  let moving = false;
  for (let i = 1; i < times.length; i++) {
    const s = times[i] - travel - 0.35;
    if (t < s) break;
    const to = target(i);
    const p = interpolate(t, [s, s + dur], [0, 1], { ...clamp, easing: camEase });
    if (p < 1 && Math.abs(to - cur) > 0.5) moving = true;
    cur = cur + (to - cur) * p;
  }
  return axis === 'x' ? { x: cur, y: 0, moving } : { x: 0, y: cur, moving };
}

/**
 * Opacity factor for a rect (content px) given the camera, along the pan axis: it reaches 0
 * before any part of the rect leaves the viewport (so nothing visible is ever cut).
 */
export function edgeFade(L: ChainLayout, r: { x: number; y: number; w: number; h: number }, cam: { x: number; y: number }, fade = FADE) {
  if (L.pan === 'none') return 1;
  const s = L.pan === 'x' ? L.offset[0] + r.x - cam.x : L.offset[1] + r.y - cam.y;
  const size = L.pan === 'x' ? r.w : r.h;
  const view = L.pan === 'x' ? L.box.w : L.box.h;
  const margin = Math.min(s, view - (s + size));
  return interpolate(margin, [2, 2 + fade], [0, 1], clamp);
}

/* ------------------------------------ rendering ------------------------------------ */

const polyLen = (pts: [number, number][]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
const polyAt = (pts: [number, number][], u: number): [number, number] => {
  let d = Math.max(0, Math.min(1, u)) * polyLen(pts);
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const l = Math.hypot(bx - ax, by - ay);
    if (d <= l || i === pts.length - 1) { const k = l ? Math.min(1, d / l) : 0; return [ax + (bx - ax) * k, ay + (by - ay) * k]; }
    d -= l;
  }
  return pts[pts.length - 1];
};
const polyUpTo = (pts: [number, number][], u: number): [number, number][] => {
  const out: [number, number][] = [pts[0]];
  let d = Math.max(0, Math.min(1, u)) * polyLen(pts);
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d >= l) { out.push(pts[i]); d -= l; continue; }
    out.push(polyAt([pts[i - 1], pts[i]], l ? d / l : 0));
    break;
  }
  return out;
};
const toD = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

export interface CauseChainProps extends ChainOptions, ChainTiming {
  cards: CauseCard[];
  /** fade everything out at this time (seconds) */
  to?: number;
  accent?: string;
  /** guard item prefix */
  id?: string;
  /** design space the box is in (default DESIGN, 16:9); scaled by width / space.w */
  space?: { w: number; h: number };
}

/**
 * <CauseChain cards start step|times layout box>: put it in its own <Track>. Every card and
 * every "because" pill is a data-guard-item; while the camera pans or a card is landing the
 * moving parts are marked data-guard-moving.
 */
export const CauseChain: React.FC<CauseChainProps> = ({ cards, to = 1e9, accent = COLOR.brown, id = 'chain', travel = 0.8, space = DESIGN, ...rest }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const { box, layout, minCardW, maxCardW, gap, pillMaxW, start, step, times: timesIn } = rest;
  const L = useMemo(() => layoutChain(cards, { box, layout, minCardW, maxCardW, gap, pillMaxW }), [cards, box, layout, minCardW, maxCardW, gap, pillMaxW]);
  const times = useMemo(() => landTimes(cards.length, { start, step, times: timesIn }), [cards.length, start, step, timesIn]);
  const sc = width / space.w;
  const out = interpolate(t, [to - 0.5, to], [1, 0], clamp);
  if (t < times[0] || out <= 0) return null;
  const cam = chainCamera(L, times, travel, t);
  const ox = L.box.x + L.offset[0] - cam.x;
  const oy = L.box.y + L.offset[1] - cam.y;

  return (
    <div data-guard-wrapper="" style={{ position: 'absolute', left: 0, top: 0, width: space.w, height: space.h, transform: `scale(${sc})`, transformOrigin: '0 0', opacity: out }}>
      {/* connectors + impulses, clipped to the viewport (no text in here) */}
      <svg width={L.box.w} height={L.box.h} style={{ position: 'absolute', left: L.box.x, top: L.box.y, overflow: 'hidden' }}>
        <g transform={`translate(${L.offset[0] - cam.x} ${L.offset[1] - cam.y})`}>
          {L.connectors.map((pts, i) => {
            if (!pts) return null;
            const s = times[i] - travel;
            if (t < s) return null;
            const u = interpolate(t, [s, times[i]], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
            const head = polyAt(pts, u);
            const p = L.pills[i];
            const pillO = p ? interpolate(t, [s, s + 0.35], [0, 1], clamp) * edgeFade(L, p, cam) : 0;
            const tick = p && (p.anchor[1] < p.y ? [p.anchor, [Math.min(Math.max(p.anchor[0], p.x + 8), p.x + p.w - 8), p.y]] : [p.anchor, [Math.min(Math.max(p.anchor[0], p.x + 8), p.x + p.w - 8), p.y + p.h]]);
            return (
              <g key={i}>
                <path d={toD(pts)} fill="none" stroke={COLOR.ink} strokeOpacity={0.25} strokeWidth={STROKE.base} strokeDasharray="6 7" />
                <path d={toD(polyUpTo(pts, u))} fill="none" stroke={accent} strokeWidth={STROKE.bold} strokeLinecap="round" strokeLinejoin="round" />
                {u < 1 && <circle cx={head[0]} cy={head[1]} r={14} fill={accent} opacity={0.25} />}
                {u < 1 && <circle cx={head[0]} cy={head[1]} r={6} fill={accent} />}
                {tick && pillO > 0 && <path d={toD(tick as [number, number][])} stroke={accent} strokeWidth={STROKE.thin} strokeDasharray="3 4" opacity={pillO} />}
              </g>
            );
          })}
        </g>
      </svg>
      {/* cards + pills */}
      <div data-guard-wrapper="" data-guard-moving={cam.moving ? '1' : undefined} style={{ position: 'absolute', inset: 0 }}>
        {L.pills.map((p, i) => {
          if (!p) return null;
          const s = times[i] - travel;
          const o = interpolate(t, [s, s + 0.35], [0, 1], clamp) * edgeFade(L, p, cam);
          if (o <= 0.001) return null;
          return (
            <div key={`p${i}`} data-guard-item={`${id}-because:${i}:${cards[i].year}`} style={{ position: 'absolute', left: ox + p.x, top: oy + p.y, width: p.w, height: p.h, boxSizing: 'border-box', opacity: o,
              background: SURFACE.parchment.bg, border: `${PILL.border}px solid ${accent}`, borderRadius: RADIUS.sm, padding: `${PILL.padY}px ${PILL.padX}px`,
              fontFamily: pillFont.family, fontStyle: 'italic', fontSize: PILL.size, lineHeight: PILL.lineH, color: SURFACE.parchment.fg, textAlign: 'center' }}>
              {p.lines.map((l, k) => <div key={k} style={{ whiteSpace: 'nowrap' }}>{l}</div>)}
            </div>
          );
        })}
        {L.cards.map((c, i) => {
          if (t < times[i]) return null;
          const land = slideState(t, { at: times[i], from: 'up', dur: 0.5, distance: 26 }, width, height);
          const tip = interpolate(t, [times[i], times[i] + 0.5], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
          // knock: the impulse leaving this card nudges it
          const kStart = i + 1 < times.length ? times[i + 1] - travel : 1e9;
          const knock = Math.sin(interpolate(t, [kStart, kStart + 0.35], [0, 1], clamp) * Math.PI);
          const o = land.opacity * edgeFade(L, c, cam);
          if (o <= 0.001) return null;
          const moving = land.moving || (knock > 0 && knock < 1);
          return (
            <div key={`c${i}`} data-guard-item={`${id}-card:${i}:${cards[i].year}`} data-guard-moving={moving ? '1' : undefined}
              style={{ position: 'absolute', left: ox + c.x, top: oy + c.y + land.y, width: c.w, height: c.h, boxSizing: 'border-box', opacity: o,
                transform: `rotate(${-tip * 12 + knock * 3}deg)`, transformOrigin: 'bottom left',
                background: SURFACE.parchment.bg, border: `${CARD.border}px solid ${SURFACE.parchment.border}`, borderRadius: RADIUS.md, padding: `${CARD.padY}px ${CARD.padX}px`,
                boxShadow: SHADOW.card, fontFamily: FONT.display, color: SURFACE.parchment.fg }}>
              <div style={{ fontSize: yearFont.size, fontWeight: 700, letterSpacing: yearFont.letterSpacing, color: accent, lineHeight: CARD.lineH, whiteSpace: 'nowrap', marginBottom: CARD.yearGap }}>{cards[i].year}</div>
              {c.titleLines.map((l, k) => (
                <div key={k} style={{ fontSize: c.titleSize, fontWeight: 700, lineHeight: CARD.lineH, whiteSpace: 'nowrap' }}>{l}</div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
