/**
 * Growth motion blocks for <World> scenes: transport networks that draw themselves in as a
 * year advances, and cities whose dots grow with population.
 *
 * - Time is a YEAR driven by keyframes (`years: [{ t, year }]`), so one clock drives the year
 *   chip, every line and every city.
 * - A line without `reached` draws in over `drawSec` seconds once the year passes `opened`; a
 *   line with `reached` grows waypoint by waypoint by construction year.
 * - Each line is ONE route (smoothRoute) — the partial line, its tip dot and its label all use it.
 * - Readable parts are counter-scaled (k = 1 / cam.s), TYPE tokens, data-guard-item. Layout is
 *   exported as pure functions (lineProgress, growthLabelLayout, cityLayout) for tool checks.
 */
import React, { useMemo } from 'react';
import { interpolate } from 'remotion';
import { COLOR, FONT, TYPE } from '../theme/tokens';
import { projectRoute, polyD, shade, stackLayout, type Anchor, type Box, type Proj, type Route } from './military';
import { fadeWindow } from './primitives';
import { useWorld, WorldLayer, type LonLat } from './world';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const smoothstep = (v: number) => v * v * (3 - 2 * v);

export interface YearKey { t: number; year: number }

/** Year at time t (linear between keys, clamped). */
export const yearAt = (keys: YearKey[], t: number) =>
  keys.length === 1 ? keys[0].year : interpolate(t, keys.map(k => k.t), keys.map(k => k.year), clamp);

/** Time at which the (monotonic) year clock reaches `year` (clamped to the key range). */
export const tAtYear = (keys: YearKey[], year: number) =>
  keys.length === 1 ? keys[0].t : interpolate(year, keys.map(k => k.year), keys.map(k => k.t), clamp);

export type LineKind = 'railroad' | 'canal' | 'road';

export interface GrowthLine {
  id: string;
  name: string;
  /** shorter on-map label (default name) */
  label?: string;
  kind: LineKind;
  /** year the line (or its first section) opened */
  opened: number;
  path: LonLat[];
  /** construction progress: year it reached waypoint index wp (first entry = start, nothing drawn) */
  reached?: { year: number; wp: number }[];
}

export const KIND_STYLE: Record<LineKind, { color: string; label: string }> = {
  railroad: { color: COLOR.ink, label: COLOR.ink },
  canal: { color: shade(COLOR.blue, 0.95), label: shade(COLOR.blue, 0.7) },
  road: { color: COLOR.brown, label: shade(COLOR.brown, 0.75) },
};

/** Drawn fraction (0..1) of a line at time t. Pure. */
export function lineProgress(line: GrowthLine, route: Route, years: YearKey[], t: number, drawSec = 1.4): number {
  if (line.reached?.length) {
    const r = line.reached;
    const y = yearAt(years, t);
    if (y <= r[0].year) return 0;
    const wp = interpolate(y, r.map(x => x.year), r.map(x => x.wp), clamp);
    return route.uAtWp(wp);
  }
  const t0 = tAtYear(years, line.opened);
  if (yearAt(years, t) < line.opened && t < t0) return 0;
  return smoothstep(interpolate(t, [t0, t0 + drawSec], [0, 1], clamp));
}

export interface LineLabel {
  id: string;
  /** where along the line (0..1) */
  u?: number;
  /** seconds visible */
  window: [number, number];
  /** screen-px offset from the line point */
  dx?: number;
  dy?: number;
  anchor?: Anchor;
}

/** Label box of a line (world px). Pure. */
export function growthLabelLayout(line: GrowthLine, route: Route, lab: LineLabel, k: number) {
  const p = route.at(lab.u ?? 0.5);
  return stackLayout(p.x, p.y, [{ text: line.label ?? line.name, fs: TYPE.flow * k, weight: 700 }], { dx: lab.dx ?? 0, dy: lab.dy ?? -18, anchor: lab.anchor ?? 'middle' }, k, 0);
}

const LineShape: React.FC<{ kind: LineKind; d: string; k: number }> = ({ kind, d, k }) => {
  if (kind === 'canal') {
    return (
      <>
        <path d={d} fill="none" stroke={COLOR.halo} strokeOpacity={0.7} strokeWidth={10 * k} strokeLinejoin="round" strokeLinecap="round" />
        <path d={d} fill="none" stroke={KIND_STYLE.canal.color} strokeWidth={6.5 * k} strokeLinejoin="round" strokeLinecap="round" />
        <path d={d} fill="none" stroke={COLOR.paper} strokeWidth={2.4 * k} strokeLinejoin="round" strokeLinecap="round" />
      </>
    );
  }
  if (kind === 'road') {
    return (
      <>
        <path d={d} fill="none" stroke={COLOR.halo} strokeOpacity={0.7} strokeWidth={8 * k} strokeLinejoin="round" strokeLinecap="round" />
        <path d={d} fill="none" stroke={KIND_STYLE.road.color} strokeWidth={4.2 * k} strokeLinejoin="round" strokeLinecap="round" />
        <path d={d} fill="none" stroke={COLOR.paperDeep} strokeWidth={1.4 * k} strokeDasharray={`${7 * k} ${5 * k}`} strokeLinejoin="round" />
      </>
    );
  }
  return (
    <>
      <path d={d} fill="none" stroke={COLOR.halo} strokeOpacity={0.7} strokeWidth={10 * k} strokeLinejoin="round" strokeLinecap="round" />
      {/* cross-ties: short dashes of a wide stroke */}
      <path d={d} fill="none" stroke={COLOR.ink} strokeWidth={7.5 * k} strokeDasharray={`${1.6 * k} ${5.4 * k}`} strokeLinejoin="round" />
      <path d={d} fill="none" stroke={COLOR.ink} strokeWidth={2.6 * k} strokeLinejoin="round" strokeLinecap="round" />
    </>
  );
};

/**
 * Lines (railroads, canals, roads) drawing themselves in by opening year as the year advances.
 * Optional labels (by line id) appear only in their windows and only once that line is drawn.
 */
export const GrowthNetwork: React.FC<{ lines: GrowthLine[]; years: YearKey[]; drawSec?: number; labels?: LineLabel[]; from?: number; to?: number }> = ({ lines, years, drawSec = 1.4, labels = [], from = 0, to = 1e9 }) => {
  const { proj, t, cam } = useWorld();
  const routes = useMemo(() => lines.map(l => projectRoute(proj, l.path)), [proj, lines]);
  const o = fadeWindow(t, from, to, 0.4);
  if (o <= 0) return null;
  const k = 1 / cam.s;
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: o }}>
        {lines.map((l, i) => {
          const u = lineProgress(l, routes[i], years, t, drawSec);
          if (u <= 0) return null;
          const d = u >= 1 ? routes[i].d : polyD(routes[i].slice(0, u));
          const tip = routes[i].at(u);
          return (
            <g key={l.id}>
              <LineShape kind={l.kind} d={d} k={k} />
              {u < 1 && <circle cx={tip.x} cy={tip.y} r={5 * k} fill={KIND_STYLE[l.kind].color} stroke={COLOR.halo} strokeWidth={2 * k} />}
            </g>
          );
        })}
        {labels.map(lab => {
          const i = lines.findIndex(l => l.id === lab.id);
          if (i < 0) return null;
          const u = lineProgress(lines[i], routes[i], years, t, drawSec);
          const lo = fadeWindow(t, lab.window[0], lab.window[1], 0.3) * interpolate(u, [Math.min(lab.u ?? 0.5, 0.999), 1], [0, 1], clamp);
          if (lo <= 0) return null;
          const L = growthLabelLayout(lines[i], routes[i], lab, k);
          const p = L.pos[0];
          return (
            <text key={lab.id} data-guard-item={`line:${lines[i].name}`} x={p.x} y={p.y} textAnchor={lab.anchor ?? 'middle'} dominantBaseline="middle" opacity={lo}
              fontSize={p.fs} fontFamily={FONT.text} fontWeight={700} fontStyle={lines[i].kind === 'canal' ? 'italic' : undefined}
              fill={KIND_STYLE[lines[i].kind].label} stroke={COLOR.halo} strokeWidth={p.fs * 0.24} paintOrder="stroke">
              {p.text}
            </text>
          );
        })}
      </svg>
    </WorldLayer>
  );
};

/* ------------------------------------ CityGrowth ------------------------------------ */

export interface City {
  name: string;
  ll: LonLat;
  /** [census year, population] */
  pop: [number, number][];
}

/** Population at a (fractional) year: linear between censuses; null before the first; held after the last. */
export function popAt(city: City, year: number): number | null {
  const p = city.pop;
  if (!p.length || year < p[0][0]) return null;
  return interpolate(year, p.map(x => x[0]), p.map(x => x[1]), clamp);
}

/** Dot radius in screen px for a population (area ∝ population). */
export const cityRadius = (pop: number, rScale = 20) => 2.5 + rScale * Math.sqrt(pop / 1e6);

/** "≈112,000" (nearest 1,000; nearest 100 below 10,000). */
export const fmtPop = (v: number) => `≈${(v >= 10000 ? Math.round(v / 1000) * 1000 : Math.round(v / 100) * 100).toLocaleString('en-US')}`;

export interface CityLabel { name: string; window: [number, number]; dx?: number; dy?: number; anchor?: Anchor }

/** Dot + label layout of one city at a year (world px). Pure. */
export function cityLayout(proj: Proj, city: City, year: number, k: number, lab?: CityLabel, rScale = 20) {
  const [x, y] = proj(city.ll) ?? [0, 0];
  const pop = popAt(city, year);
  const r = (pop === null ? 0 : cityRadius(pop, rScale)) * k;
  const anchor = lab?.anchor ?? 'start';
  const gap = 6 * k;
  const dx = (lab?.dx ?? 0) + (anchor === 'start' ? (r + gap) / k : anchor === 'end' ? -(r + gap) / k : 0);
  const lines = [
    { text: city.name, fs: TYPE.town * k, weight: 700 },
    { text: pop === null ? '' : fmtPop(pop), fs: TYPE.town * k, weight: 700, font: FONT.ui },
  ];
  const L = stackLayout(x, y, lines, { dx, dy: lab?.dy ?? 0, anchor }, k, r);
  return { x, y, r, pop, ...L };
}

/**
 * City dots whose AREA grows with population (interpolated between census years); chosen cities
 * get a name + population counter in their label window.
 */
export const CityGrowth: React.FC<{ cities: City[]; years: YearKey[]; labels?: CityLabel[]; rScale?: number; color?: string; from?: number; to?: number }> = ({ cities, years, labels = [], rScale = 20, color = COLOR.red, from = 0, to = 1e9 }) => {
  const { proj, t, cam } = useWorld();
  const o = fadeWindow(t, from, to, 0.4);
  if (o <= 0) return null;
  const k = 1 / cam.s;
  const year = yearAt(years, t);
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: o }}>
        {cities.map(c => {
          const labs = labels.filter(l => l.name === c.name);
          const lab = labs.find(l => t < l.window[1]) ?? labs[labs.length - 1];   // a city may be labelled in several windows
          const L = cityLayout(proj, c, year, k, lab, rScale);
          if (L.pop === null) return null;
          const born = interpolate(year, [c.pop[0][0], c.pop[0][0] + 0.6], [0, 1], clamp);
          const lo = lab ? fadeWindow(t, lab.window[0], lab.window[1], 0.3) : 0;
          return (
            <g key={c.name} opacity={born}>
              <circle cx={L.x} cy={L.y} r={L.r} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={1.8 * k} />
              <circle cx={L.x} cy={L.y} r={2 * k} fill={COLOR.ink} />
              {lo > 0 && (
                <g data-guard-item={`city:${c.name}`} opacity={lo}>
                  {L.pos.map((p, i) => (
                    <text key={i} x={p.x} y={p.y} textAnchor={lab?.anchor ?? 'start'} dominantBaseline="middle" fontSize={p.fs} fontFamily={p.font ?? FONT.text} fontWeight={p.weight}
                      fill={i === 0 ? COLOR.ink : COLOR.inkSoft} stroke={COLOR.halo} strokeWidth={p.fs * 0.22} paintOrder="stroke">{p.text}</text>
                  ))}
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </WorldLayer>
  );
};

export type { Box };
