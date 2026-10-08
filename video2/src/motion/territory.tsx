/**
 * Territory / numbers / comparison blocks for <World> scenes (world space, counter-scaled).
 *
 * - TerritoryOverTime: regions (US states by FIPS/name/abbr, GeoJSON features, or [lon,lat]
 *   rings) whose fill follows a status timeline as a year clock advances. Status changes
 *   crossfade (frame-driven, no CSS transitions) and pulse an outline.
 * - YearCounter / Legend: screen-space overlays (put each in its own <Track>).
 * - MapNumbers: proportional circles (value → area) or bars (value → height) rising from
 *   places, with counter-scaled value labels.
 * - BeforeAfterSplit: the same map at two dates, split by an animated vertical slider.
 * - MapLine: a geographic line (e.g. 36°30′) drawn along true parallels, with a label.
 *
 * Time model: `years: YearKey[]` maps scene seconds → a (fractional) year, piecewise linear
 * and non-decreasing; holding = two keys with the same year. Timeline entries are dated
 * (ISO `date` or `year`), so the order of events inside one year (e.g. secession, Dec 1860 –
 * June 1861) plays out as the clock ticks through it.
 */
import { geoCentroid, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import React, { useId, useMemo } from 'react';
import { Easing, interpolate, interpolateColors, useCurrentFrame, useVideoConfig } from 'remotion';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { US_NATION, ringPolygon } from '../components/geo/usGeo';
import usTopo from '../data/geo/us-states-10m.json';
import { Track } from '../kit/guard';
import { COLOR, FONT, MOTION, RADIUS, SAFE, SHADOW, STROKE, SURFACE, TYPE } from '../theme/tokens';
import { estimateWidth } from './measure';
import { fadeWindow, Slide, type Dir } from './primitives';
import { useWorld, WorldLayer, type LonLat } from './world';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const smooth = Easing.bezier(...MOTION.camera);
const INK = COLOR.ink;
const HALO = COLOR.halo;

/** 0→1 progress over [start, start+dur]; safe for ±Infinity starts (−∞ = done, +∞ = not yet). */
const prog = (t: number, start: number, dur: number) => (start === -Infinity ? 1 : start === Infinity ? 0 : Math.min(1, Math.max(0, (t - start) / dur)));

/** Mix two theme colours (p = 0 → a, 1 → b): derive extra roles from COLOR instead of new hexes. */
export const mix = (a: string, b: string, p: number) => interpolateColors(p, [0, 1], [a, b]);

/* ------------------------------------ geometry ------------------------------------ */

type Geo = Feature<Polygon | MultiPolygon>;
type StateProps = { name: string };
const US = usTopo as unknown as Topology<{ states: GeometryCollection<StateProps> }>;

/** All US states (us-atlas 10m), ids = 2-digit FIPS codes, properties.name = state name. */
export const US_STATES = feature(US, US.objects.states) as unknown as FeatureCollection<Polygon | MultiPolygon, StateProps>;

const ABBR: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10', DC: '11', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18',
  IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31', NV: '32', NH: '33',
  NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46', TN: '47', TX: '48', UT: '49',
  VT: '50', VA: '51', WA: '53', WV: '54', WI: '55', WY: '56',
};

/** A US state by FIPS code ('29'), postal abbreviation ('MO') or name ('Missouri'). */
export function stateFeature(key: string): Geo | undefined {
  const fips = ABBR[key.toUpperCase()] ?? key;
  return US_STATES.features.find(f => f.id === fips || f.properties.name.toLowerCase() === key.toLowerCase());
}

/**
 * Ring → polygon, densified every `step` degrees so straight edges in lon/lat (parallels like
 * 36°30′, meridians) stay on their parallel under the conic projection instead of bowing
 * along great circles.
 */
export function densify(line: LonLat[], step = 0.5, closed = false): LonLat[] {
  const pts = closed ? [...line, line[0]] : line;
  const out: LonLat[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / step));
    for (let j = 0; j < n; j++) out.push([a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
export const ringFeature = (ring: LonLat[]): Geo => ringPolygon(densify(ring, 0.5, true));

/** What a region is: a state key, a GeoJSON feature, or a [lon,lat] ring. */
export type RegionShape = string | Geo | LonLat[];
const isRing = (s: RegionShape): s is LonLat[] => Array.isArray(s);
export function resolveShape(s: RegionShape): { geo: Geo; isState: boolean } {
  if (typeof s === 'string') {
    const f = stateFeature(s);
    if (!f) throw new Error(`territory: unknown state "${s}"`);
    return { geo: f, isState: true };
  }
  return { geo: isRing(s) ? ringFeature(s) : s, isState: false };
}

/* ------------------------------------ time model ------------------------------------ */

export interface YearKey { t: number; year: number }
export interface TimelineEntry { date?: string; year?: number; status: string | null; note?: string }
export interface RegionSeries { id: string; timeline: TimelineEntry[]; shape?: RegionShape }
export interface StatusStyle { color: string; label: string }
export type StatusLegend = Record<string, StatusStyle>;

/** ISO date ('1821-08-10', '1821') or year → fractional year. */
export function entryYear(e: { date?: string; year?: number }): number {
  if (e.year !== undefined) return e.year;
  const [y, m = 1, d = 1] = (e.date ?? '0').split('-').map(Number);
  const start = Date.UTC(y, 0, 1);
  return y + (Date.UTC(y, m - 1, d) - start) / (Date.UTC(y + 1, 0, 1) - start);
}

/** Year shown at scene time t (piecewise linear between keys, held outside). */
export function yearAt(keys: YearKey[], t: number): number {
  if (t <= keys[0].t) return keys[0].year;
  for (let i = 1; i < keys.length; i++) {
    const [a, b] = [keys[i - 1], keys[i]];
    if (t <= b.t) return b.t === a.t ? b.year : a.year + ((b.year - a.year) * (t - a.t)) / (b.t - a.t);
  }
  return keys[keys.length - 1].year;
}

/** First scene time the clock reaches year y (−∞ if already there at the start, +∞ if never). */
export function timeOfYear(keys: YearKey[], y: number): number {
  if (keys[0].year >= y) return -Infinity;
  for (let i = 1; i < keys.length; i++) {
    const [a, b] = [keys[i - 1], keys[i]];
    if (b.year >= y) return b.year === a.year ? b.t : a.t + ((y - a.year) / (b.year - a.year)) * (b.t - a.t);
  }
  return Infinity;
}

/** Index of the entry in force at `year` (−1 = before the first entry). */
export function entryIndexAt(timeline: TimelineEntry[], year: number): number {
  let idx = -1;
  timeline.forEach((e, i) => { if (entryYear(e) <= year) idx = i; });
  return idx;
}

/** The same colour at alpha 0 (so 'no status' ↔ colour crossfades fade rather than shift hue). */
const transparent = (c: string) => interpolateColors(0, [0, 1], [c, c]).replace(/,\s*[\d.]+\)$/, ', 0)');

/* --------------------------------- TerritoryOverTime --------------------------------- */

export interface RegionLabel {
  text: string;
  /** a [lon,lat] point, or a series id (label at the region's centroid) */
  at: LonLat | string;
  from: number;
  to: number;
  /** screen-px offset */
  dx?: number;
  dy?: number;
  anchor?: 'start' | 'middle' | 'end';
  size?: 'town' | 'place';
}

export interface TerritoryProps {
  series: RegionSeries[];
  /** shapes by series id (if a series has no `shape`, its id is used as a state key) */
  shapes?: Record<string, RegionShape>;
  legend: StatusLegend;
  /** time → year clock (animated) … */
  years?: YearKey[];
  /** … or a fixed year (static map, e.g. one side of a BeforeAfterSplit) */
  year?: number;
  /** visibility window, seconds */
  from?: number;
  to?: number;
  fillOpacity?: number;
  /** crossfade seconds per status change */
  crossfade?: number;
  /** pulse an outline when a region changes during the window */
  pulse?: boolean;
  labels?: RegionLabel[];
}

/**
 * Regions coloured by status as the clock advances. Polygons (territories) are drawn first and
 * clipped to the US outline, states on top, so a state covers its former territory once it
 * exists. A region with no entry yet is transparent.
 */
export const TerritoryOverTime: React.FC<TerritoryProps> = ({ series, shapes = {}, legend, years, year, from = -1e9, to = 1e9, fillOpacity = 0.82, crossfade = 0.6, pulse = true, labels = [] }) => {
  const w = useWorld();
  const { t, cam } = w;
  const clipId = `terr-clip-${useId().replace(/:/g, '')}`;
  const path = useMemo(() => geoPath(w.proj), [w.proj]);
  const regions = useMemo(() => {
    const list = series.map(s => {
      const { geo, isState } = resolveShape(s.shape ?? shapes[s.id] ?? s.id);
      return { ...s, geo, isState, d: path(geo) ?? '', c: w.proj(geoCentroid(geo)) ?? [0, 0], years: s.timeline.map(entryYear) };
    });
    return [...list.filter(r => !r.isState), ...list.filter(r => r.isState)];
  }, [series, shapes, path, w.proj]);
  const nationD = useMemo(() => path(US_NATION) ?? '', [path]);
  const vis = fadeWindow(t, from, to, 0.5);
  if (vis <= 0) return null;
  const k = 1 / cam.s;
  const nowYear = year ?? (years ? yearAt(years, t) : 0);
  const colorOf = (st: string | null | undefined) => (st ? legend[st]?.color ?? COLOR.grey : null);

  const draw = regions.map(r => {
    const i = entryIndexAt(r.timeline, nowYear);
    const cur = colorOf(i >= 0 ? r.timeline[i].status : null);
    const prev = colorOf(i >= 1 ? r.timeline[i - 1].status : null);
    const tc = year !== undefined || !years || i < 0 ? -Infinity : timeOfYear(years, r.years[i]);
    const p = prog(t, tc, crossfade);
    const a = prev ?? (cur ? transparent(cur) : null);
    const b = cur ?? (prev ? transparent(prev) : null);
    const fill = a && b ? (p >= 1 ? b : interpolateColors(p, [0, 1], [a, b])) : null;
    const ring = pulse && tc > from && i >= 0 ? prog(t, tc, 1.1) : 1;
    return { r, fill, ring, filled: !!cur };
  });
  const poly = draw.filter(x => !x.r.isState);
  const states = draw.filter(x => x.r.isState);
  const regionAt = (id: string) => regions.find(r => r.id === id)?.c ?? [0, 0];

  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: vis }}>
        <defs><clipPath id={clipId}><path d={nationD} /></clipPath></defs>
        <g clipPath={`url(#${clipId})`}>
          {poly.map(({ r, fill }) => fill && <path key={r.id} d={r.d} fill={fill} fillOpacity={fillOpacity} stroke={INK} strokeOpacity={0.35} strokeWidth={1.2 * k} />)}
        </g>
        {states.map(({ r, fill, filled }) => fill && (
          <path key={r.id} d={r.d} fill={fill} fillOpacity={fillOpacity} stroke={filled ? INK : 'none'} strokeOpacity={0.55} strokeWidth={STROKE.hair * k} strokeLinejoin="round" />
        ))}
        {draw.map(({ r, ring }) => ring < 1 && (
          <path key={`pulse-${r.id}`} d={r.d} fill="none" stroke={COLOR.paper} strokeWidth={(3 + 5 * ring) * k} strokeOpacity={1 - ring} strokeLinejoin="round"
            clipPath={r.isState ? undefined : `url(#${clipId})`} />
        ))}
        {labels.map(l => {
          const o = fadeWindow(t, l.from, l.to, 0.35);
          if (o <= 0) return null;
          const [x, y] = typeof l.at === 'string' ? regionAt(l.at) : w.proj(l.at) ?? [0, 0];
          const fs = (l.size === 'place' ? TYPE.place : TYPE.town) * k;
          return (
            <text key={`${l.text}-${l.from}`} data-guard-item={`state-label:${l.text}`} x={x + (l.dx ?? 0) * k} y={y + (l.dy ?? 0) * k} textAnchor={l.anchor ?? 'middle'}
              dominantBaseline="middle" fontSize={fs} fontFamily={FONT.text} fontWeight={700} letterSpacing={fs * 0.08} fill={INK} stroke={HALO} strokeWidth={fs * 0.24}
              paintOrder="stroke" opacity={o}>
              {l.text}
            </text>
          );
        })}
      </svg>
    </WorldLayer>
  );
};

/* ------------------------------------- MapLine ------------------------------------- */

/**
 * A geographic line (densified along parallels), drawn in over `draw` seconds from `from`.
 * `fadeTo` dims it after a time (e.g. a repealed boundary) instead of hiding it.
 */
export const MapLine: React.FC<{
  coords: LonLat[]; from: number; to?: number; draw?: number; color?: string; width?: number; dashed?: boolean;
  dimAt?: number; dimTo?: number; label?: { text: string; at: LonLat; dx?: number; dy?: number; from: number; to: number; anchor?: 'start' | 'middle' | 'end' }[];
}> = ({ coords, from, to = 1e9, draw = 1, color = INK, width = 4, dashed = false, dimAt, dimTo = 0.35, label = [] }) => {
  const w = useWorld();
  const d = useMemo(() => geoPath(w.proj)({ type: 'LineString', coordinates: densify(coords, 0.25) }) ?? '', [w.proj, coords]);
  const vis = fadeWindow(w.t, from, to, 0.4);
  if (vis <= 0) return null;
  const k = 1 / w.cam.s;
  const p = interpolate(w.t, [from, from + draw], [0, 1], clamp);
  const dim = dimAt === undefined ? 1 : interpolate(w.t, [dimAt, dimAt + 0.8], [1, dimTo], clamp);
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: vis }}>
        <path d={d} fill="none" stroke={HALO} strokeWidth={(width + 4) * k} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} opacity={dim} />
        <path d={d} fill="none" stroke={color} strokeWidth={width * k} strokeLinecap="round" opacity={dim}
          {...(dashed || p >= 1 ? { strokeDasharray: dashed ? `${10 * k} ${8 * k}` : undefined } : { pathLength: 1, strokeDasharray: `${p} 1` })} />
        {label.map(l => {
          const o = fadeWindow(w.t, l.from, l.to, 0.35);
          if (o <= 0) return null;
          const [x, y] = w.proj(l.at) ?? [0, 0];
          const fs = TYPE.town * k;
          return (
            <text key={`${l.text}-${l.from}`} data-guard-item={`line-label:${l.text}`} x={x + (l.dx ?? 0) * k} y={y + (l.dy ?? 0) * k} textAnchor={l.anchor ?? 'middle'}
              dominantBaseline="middle" fontSize={fs} fontFamily={FONT.text} fontWeight={700} letterSpacing={fs * 0.06} fill={INK} stroke={HALO} strokeWidth={fs * 0.24}
              paintOrder="stroke" opacity={o}>
              {l.text}
            </text>
          );
        })}
      </svg>
    </WorldLayer>
  );
};

/* ------------------------------ screen overlays (Track-ready) ------------------------------ */

export interface ScreenPos { left?: number; right?: number; top?: number; bottom?: number }
export interface OverlayTiming { at: number; out?: number; from?: Dir | 'fade'; to?: Dir | 'fade'; distance?: number }

/**
 * Big year that ticks with the clock. Screen space; wrap in its own <Track>. Each new year
 * rolls up into place. Tabular figures, so the box never changes width.
 */
export const YearCounter: React.FC<OverlayTiming & { years: YearKey[]; pos?: ScreenPos; caption?: string }> = ({ years, pos = { left: SAFE.x, top: SAFE.y }, caption, at, out, from = 'up', to, distance = 120 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const y = yearAt(years, t);
  const shown = Math.floor(y + 1e-9);
  const since = timeOfYear(years, shown);
  const roll = prog(t, since, 0.18);
  const prev = Math.floor(yearAt(years, since - 1e-3) + 1e-9); // the year it rolls away from (years can jump)
  return (
    <Slide at={at} out={out} from={from} to={to} distance={distance}>
      <div data-guard-item="year" style={{ position: 'absolute', ...pos, background: SURFACE.parchment.bg, border: `${STROKE.base}px solid ${INK}`, borderRadius: RADIUS.md, padding: '4px 18px 6px',
        fontFamily: FONT.display, color: INK, textAlign: 'center' }}>
        {caption && <div style={{ fontSize: TYPE.town, fontWeight: 700, letterSpacing: 3, whiteSpace: 'nowrap' }}>{caption}</div>}
        {/* odometer: the previous year rolls up and out while the new one rolls in, inside a
            window that hides the overflow; marked moving while rolling so the guard skips the
            intentional clip and checks the settled number */}
        <div data-guard-moving={roll < 1 ? '1' : undefined} style={{ position: 'relative', overflow: 'hidden', fontSize: TYPE.h1, fontWeight: 800, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums', letterSpacing: 2 }}>
          <div style={{ transform: `translateY(${(1 - roll) * 100}%)` }}>{shown}</div>
          {roll < 1 && prev !== shown && <div style={{ position: 'absolute', inset: 0, transform: `translateY(${-roll * 100}%)` }}>{prev}</div>}
        </div>
      </div>
    </Slide>
  );
};

/**
 * Status legend panel. Opens with its first entry (never empty), entries appear at their `at`,
 * and hidden entries keep their space so the panel is sized to its longest entry from the start.
 */
export const Legend: React.FC<OverlayTiming & { legend: StatusLegend; entries: { status: string; at?: number }[]; title?: string; pos?: ScreenPos }> = ({ legend, entries, title, pos = { left: SAFE.x, bottom: SAFE.y }, at, out, from = 'left', to, distance = 160 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const first = Math.min(at, ...entries.map(e => e.at ?? at));
  return (
    <Slide at={first} out={out} from={from} to={to} distance={distance}>
      <div data-guard-item="legend" style={{ position: 'absolute', ...pos, background: SURFACE.parchment.bg, border: `${STROKE.thin}px solid ${INK}`, borderRadius: RADIUS.md, padding: '10px 16px',
        display: 'flex', flexDirection: 'column', gap: 5, fontFamily: FONT.text, color: INK }}>
        {title && <div style={{ fontFamily: FONT.display, fontSize: TYPE.small, fontWeight: 700, letterSpacing: 3, whiteSpace: 'nowrap' }}>{title}</div>}
        {entries.map(e => {
          const o = interpolate(t, [e.at ?? first, (e.at ?? first) + 0.3], [0, 1], clamp);
          const st = legend[e.status];
          return (
            <div key={e.status} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: o, transform: `translateX(${(1 - o) * -12}px)`,
              fontSize: TYPE.town, fontWeight: 700, whiteSpace: 'nowrap' }}>
              <span style={{ width: 18, height: 14, borderRadius: RADIUS.sm / 2, background: st.color, border: `${STROKE.hair}px solid ${INK}`, flex: 'none' }} />
              {st.label}
            </div>
          );
        })}
      </div>
    </Slide>
  );
};

/* ------------------------------------- MapNumbers ------------------------------------- */

export interface MapNumber {
  at: LonLat;
  value: number;
  label: string;
  /** seconds; default start + index × stagger */
  cue?: number;
  /** label offset (screen px) from the symbol's edge; default: right of a circle / above a bar */
  labelPos?: { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' };
}

/**
 * Proportional symbols on places. Circles: AREA ∝ value (radius = maxSize·√(v/max)); bars:
 * HEIGHT ∝ value (maxSize px for max). Each grows on its cue and its value counts up with it.
 * Symbols and labels are counter-scaled (constant on screen).
 */
export const MapNumbers: React.FC<{
  data: MapNumber[]; start: number; to: number; stagger?: number; grow?: number; mode?: 'circle' | 'bar';
  max?: number; maxSize?: number; barWidth?: number; color?: string; format?: (v: number) => string;
}> = ({ data, start, to, stagger = 0.35, grow = 0.9, mode = 'circle', max, maxSize = mode === 'circle' ? 34 : 120, barWidth = 18, color = COLOR.ink, format = v => Math.round(v).toLocaleString('en-US') }) => {
  const w = useWorld();
  const vis = fadeWindow(w.t, start - 0.1, to, 0.3, 0.5);
  if (vis <= 0) return null;
  const k = 1 / w.cam.s;
  const top = max ?? Math.max(...data.map(d => d.value));
  const fs = TYPE.town * k;
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: vis }}>
        {data.map((d, i) => {
          const cue = d.cue ?? start + i * stagger;
          const g = smooth(interpolate(w.t, [cue, cue + grow], [0, 1], clamp));
          if (g <= 0) return null;
          const [x, y] = w.proj(d.at) ?? [0, 0];
          const v = d.value * g;
          const size = mode === 'circle' ? maxSize * Math.sqrt(d.value / top) : maxSize * (d.value / top);
          const L = d.labelPos ?? (mode === 'circle' ? { dx: size + 8, dy: 0, anchor: 'start' as const } : { dx: 0, dy: -size - 14, anchor: 'middle' as const });
          const lo = interpolate(w.t, [cue + 0.15, cue + 0.45], [0, 1], clamp);
          return (
            <g key={d.label}>
              {mode === 'circle'
                ? <circle cx={x} cy={y} r={size * Math.sqrt(g) * k} fill={color} fillOpacity={0.55} stroke={COLOR.paper} strokeWidth={2 * k} />
                : <rect x={x - (barWidth / 2) * k} y={y - size * g * k} width={barWidth * k} height={size * g * k} fill={color} fillOpacity={0.85} stroke={COLOR.paper} strokeWidth={1.5 * k} />}
              <circle cx={x} cy={y} r={2.5 * k} fill={COLOR.paper} />
              <text data-guard-item={`number:${d.label}`} x={x + L.dx * k} y={y + L.dy * k} textAnchor={L.anchor} fontFamily={FONT.text} fill={INK} stroke={HALO}
                strokeWidth={fs * 0.24} paintOrder="stroke" opacity={lo} fontSize={fs} fontWeight={700}>
                <tspan x={x + L.dx * k} dy={-fs * 0.15}>{d.label}</tspan>
                <tspan x={x + L.dx * k} dy={fs * 1.1} fontSize={fs * 1.15} fontFamily={FONT.ui} fontWeight={800}>{format(v)}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </WorldLayer>
  );
};

/* ---------------------------------- BeforeAfterSplit ---------------------------------- */

export interface SliderKey { t: number; x: number }

/** Slider position (fraction of frame width) at t: hold each key, ease between consecutive keys. */
export function sliderAt(keys: SliderKey[], t: number): number {
  if (t <= keys[0].t) return keys[0].x;
  for (let i = 1; i < keys.length; i++) {
    const [a, b] = [keys[i - 1], keys[i]];
    if (t <= b.t) return a.x + (b.x - a.x) * smooth(b.t === a.t ? 1 : (t - a.t) / (b.t - a.t));
  }
  return keys[keys.length - 1].x;
}

const TAG_W_PAD = 40;

/**
 * Two world layers (children rendered inside <World>) split at a vertical slider: `before` is
 * shown left of it, `after` right of it. Each side is a real overflow-clipped box, so hidden
 * labels are truly clipped (and the guard sees them as clipped). Date tags ride beside the
 * slider in their own <Track>, clamped to the safe area, and fade when their side is too narrow.
 */
export const BeforeAfterSplit: React.FC<{
  before: React.ReactNode; after: React.ReactNode; slider: SliderKey[]; from: number; to: number;
  tags?: { before: string; after: string }; trackId?: string; tagTop?: number; safeX?: number;
}> = ({ before, after, slider, from, to, tags, trackId = 'split-tags', tagTop = SAFE.y, safeX = SAFE.x }) => {
  const w = useWorld();
  const vis = fadeWindow(w.t, from, to, 0.4);
  if (vis <= 0) return null;
  const W = w.frameW;
  const H = w.frameH;
  const sx = sliderAt(slider, w.t) * W;
  const moving = Math.abs(sliderAt(slider, w.t + 1 / w.fps) * W - sx) > 0.5;
  const fs = TYPE.chip;
  const tagW = (s: string) => estimateWidth(s, { size: fs, family: FONT.display, weight: 700, letterSpacing: 2 }) + TAG_W_PAD;
  const tag = (text: string, side: 'before' | 'after') => {
    const tw = tagW(text);
    // room on the tag's own side of the slider; the tag stays inside the safe area either way
    const room = side === 'before' ? sx - 16 - safeX : W - safeX - Math.max(safeX, sx + 16);
    const o = interpolate(room - tw, [0, 30], [0, 1], clamp);
    if (o <= 0) return null;
    const left = side === 'before' ? Math.min(W - safeX - tw, Math.max(safeX, sx - 16 - tw)) : Math.max(safeX, Math.min(W - safeX - tw, sx + 16));
    return (
      <div key={side} data-guard-item={`date-tag:${text}`} style={{ position: 'absolute', left, top: tagTop, width: tw, boxSizing: 'border-box', opacity: o * vis,
        background: side === 'before' ? HALO : INK, color: side === 'before' ? INK : COLOR.onNight, border: `${STROKE.thin}px solid ${INK}`, borderRadius: RADIUS.sm, padding: '6px 0',
        textAlign: 'center', fontFamily: FONT.display, fontSize: fs, fontWeight: 800, letterSpacing: 2, whiteSpace: 'nowrap' }}>
        {text}
      </div>
    );
  };
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: sx, height: H, overflow: 'hidden', opacity: vis }}>{before}</div>
      <div style={{ position: 'absolute', left: sx, top: 0, width: W - sx, height: H, overflow: 'hidden', opacity: vis }}>
        <div style={{ position: 'absolute', left: -sx, top: 0, width: W, height: H }}>{after}</div>
      </div>
      {sx > 0 && sx < W && (
        <div style={{ position: 'absolute', left: sx - 2, top: 0, width: 4, height: H, background: COLOR.paper, boxShadow: SHADOW.text, opacity: vis }}>
          <div style={{ position: 'absolute', left: -14, top: H / 2 - 16, width: 32, height: 32, borderRadius: RADIUS.lg, background: COLOR.paper, border: `${STROKE.base}px solid ${INK}`, boxSizing: 'border-box' }} />
        </div>
      )}
      {tags && (
        <Track id={trackId} role="overlay">
          <div data-guard-wrapper="" data-guard-moving={moving ? '1' : undefined} style={{ position: 'absolute', inset: 0 }}>
            {tag(tags.before, 'before')}
            {tag(tags.after, 'after')}
          </div>
        </Track>
      )}
    </>
  );
};
