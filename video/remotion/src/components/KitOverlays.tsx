/**
 * Derived-overlay components. All self-fitting: text sizes come from fitTextOnNLines
 * (real browser metrics), so nothing overflows its box. All animate from local frame 0.
 */
import { fitTextOnNLines, measureText } from '@remotion/layout-utils';
import { geoGraticule10, geoInterpolate, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { FeatureCollection, MultiPolygon } from 'geojson';
import React, { useMemo } from 'react';
import { Audio, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import landTopo from 'world-atlas/land-110m.json';
import type { Rect } from '../lib/guard';
import type { RenderConfig } from './KitComponents';
export interface BoardBeat { items: { box: number; text: string }[]; footer?: { text: string }; }
export interface QuestionBeat { number: number; format: string; stem: string; source?: { title: string; text: string }; }
export interface RangeBeat { low: number; high: number; unit: string; label: string; caption: string; }
export interface ResolvedChapter { spec: { label: string; box?: number }; start: number; end: number; bannerEnd: number; }
export interface ResolvedTrap { spec: { myth: string; fact: string }; start: number; factStart: number; end: number; trapIdx: number; }
export interface RouteBeat { routes: { from: string; to: string; label?: string }[]; caption: string; variant?: string; }
export interface SfxCue { name: string; time: number; }
export interface StackBeat { items: { text: string; offset: number; endOffset: number; rect: [number,number,number,number] }[]; }
export interface TermChip { term: string; definition: string; start: number; end: number; }
export interface YearMark { year: number; label: string; time: number; }

export const SERIF = 'Georgia';
export const SANS = 'Helvetica';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const px = (r: Rect, cfg: RenderConfig) => ({ x: r[0] * cfg.width, y: r[1] * cfg.height, w: (r[2] - r[0]) * cfg.width, h: (r[3] - r[1]) * cfg.height });
const rectStyle = (r: Rect): React.CSSProperties => ({
  position: 'absolute', left: `${r[0] * 100}%`, top: `${r[1] * 100}%`, width: `${(r[2] - r[0]) * 100}%`, height: `${(r[3] - r[1]) * 100}%`,
});

/** Largest font (≤ max) that fits `text` in `width` px on `lines` lines. Falls back to max outside a browser. */
export function useFit(text: string, width: number, lines: number, max: number, fontFamily = SERIF, fontWeight: number | string = 700): number {
  return useMemo(() => {
    if (typeof document === 'undefined') return max;
    try {
      return Math.floor(fitTextOnNLines({ text, maxLines: lines, maxBoxWidth: width, fontFamily, fontWeight, maxFontSize: max }).fontSize);
    } catch {
      return max;
    }
  }, [text, width, lines, max, fontFamily, fontWeight]);
}

/* -------------------------------- trap card -------------------------------- */

export const TrapCard: React.FC<{ trap: ResolvedTrap; cfg: RenderConfig }> = ({ trap, cfg }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const box = px(cfg.trapCard.rect, cfg);
  const colW = box.w / 2 - 48;
  const mythSize = useFit(trap.spec.myth, colW - 40, 3, 46);
  const factSize = useFit(trap.spec.fact, colW - 40, 3, 46);
  const factAt = (trap.factStart - trap.start) * fps;
  const strike = interpolate(f, [factAt - 6, factAt + 8], [0, 1], clamp);
  const factIn = spring({ frame: f - factAt, fps, config: { damping: 11, stiffness: 150 } });
  const shake = f >= factAt - 6 && f < factAt + 10 ? Math.sin((f - factAt) * 1.9) * 7 * (1 - Math.max(0, f - factAt + 6) / 16) : 0;
  const cardIn = interpolate(f, [0, 8], [0, 1], clamp);
  const panel = (accent: string): React.CSSProperties => ({
    flex: 1, background: 'rgba(16,13,10,0.86)', borderTop: `6px solid ${accent}`, borderRadius: 14, padding: 20, overflow: 'hidden',
  });
  return (
    <div data-kit="trapcard" style={{ ...rectStyle(cfg.trapCard.rect), display: 'flex', gap: 24, opacity: cardIn, fontFamily: SERIF }}>
      <div style={{ ...panel('#e07a5f'), transform: `translateX(${shake}px)` }}>
        <div style={{ fontFamily: SANS, fontSize: 22, letterSpacing: 4, color: '#e07a5f' }}>✗ THE TRAP</div>
        <div style={{ position: 'relative', marginTop: 12, fontSize: mythSize, fontWeight: 700, color: '#f5e6c8', lineHeight: 1.15 }}>
          {trap.spec.myth}
          <div style={{ position: 'absolute', left: 0, top: '50%', height: 5, width: `${strike * 100}%`, background: '#e07a5f' }} />
        </div>
      </div>
      <div style={{ ...panel('#90d39a'), opacity: Math.min(1, factIn * 1.4), transform: `translateX(${(1 - factIn) * 30}px) scale(${0.92 + 0.08 * factIn})` }}>
        <div style={{ fontFamily: SANS, fontSize: 22, letterSpacing: 4, color: '#90d39a' }}>✓ WHAT TO WRITE</div>
        <div style={{ marginTop: 12, fontSize: factSize, fontWeight: 700, color: '#f5e6c8', lineHeight: 1.15 }}>{trap.spec.fact}</div>
      </div>
    </div>
  );
};

/* ------------------------------ timeline ribbon ----------------------------- */

/**
 * Ordinal ribbon of every year spoken in the episode. Self-correcting labels: when two
 * labels would collide, alternate ones flip below the line.
 */
export const TimelineRibbon: React.FC<{ years: YearMark[]; t: number; cfg: RenderConfig }> = ({ years, t, cfg }) => {
  const uniq = useMemo(() => {
    const m = new Map<number, YearMark>();
    for (const y of years) if (!m.has(y.year)) m.set(y.year, y);
    return [...m.values()].sort((a, b) => a.year - b.year);
  }, [years]);
  const box = px(cfg.ribbon.rect, cfg);
  const fontSize = 22;
  const positions = uniq.map((_, i) => (uniq.length === 1 ? 0.5 : 0.04 + (0.92 * i) / (uniq.length - 1)));
  const widths = uniq.map(y => (typeof document === 'undefined' ? y.label.length * 13 : measureText({ text: y.label, fontFamily: SANS, fontSize, fontWeight: 700 }).width));
  const flip = uniq.map((_, i) => i > 0 && (positions[i] - positions[i - 1]) * box.w < (widths[i] + widths[i - 1]) / 2 + 12 && i % 2 === 1);
  if (!uniq.length) return null;
  const spokenSoFar = years.filter(m => m.time <= t);
  const lastMark = spokenSoFar[spokenSoFar.length - 1];
  const prevMark = spokenSoFar[spokenSoFar.length - 2];
  const posOf = (y?: YearMark) => (y ? positions[uniq.findIndex(u => u.year === y.year)] : undefined);
  const zipP = lastMark ? interpolate(t - lastMark.time, [0, 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  const zipX = lastMark ? (posOf(prevMark) ?? posOf(lastMark)!) + ((posOf(lastMark)! - (posOf(prevMark) ?? posOf(lastMark)!)) * zipP) : null;
  return (
    <div data-kit="ribbon" style={{ ...rectStyle(cfg.ribbon.rect), fontFamily: SANS, overflow: 'hidden',
      opacity: interpolate(t - (years[0]?.time ?? 0), [-0.3, 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: 'rgba(245,230,200,0.35)' }} />
      {zipX !== null && zipP < 1 && (
        <div style={{ position: 'absolute', left: `${zipX * 100}%`, top: '50%', width: 22, height: 22, marginLeft: -11, marginTop: -11, borderRadius: '50%', background: '#ffd166', boxShadow: '0 0 18px #ffd166' }} />
      )}
      {uniq.map((y, i) => {
        const spoken = years.filter(m => m.year === y.year && m.time <= t);
        const lastSpoken = spoken.length ? spoken[spoken.length - 1].time : -Infinity;
        const hot = t - lastSpoken < cfg.overlayTiming.yearHighlightSec;
        const seen = spoken.length > 0;
        return (
          <div key={y.year} style={{ position: 'absolute', left: `${positions[i] * 100}%`, top: '50%', transform: 'translate(-50%, -50%)' }}>
            <div style={{ width: hot ? 16 : 10, height: hot ? 16 : 10, borderRadius: '50%', margin: '0 auto', background: hot ? '#ffd166' : seen ? '#f5e6c8' : 'rgba(245,230,200,0.3)', boxShadow: hot ? '0 0 14px #ffd166' : 'none' }} />
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', [flip[i] ? 'top' : 'bottom']: 14, fontSize, fontWeight: 700, whiteSpace: 'nowrap',
              color: hot ? '#ffd166' : seen ? 'rgba(245,230,200,0.85)' : 'rgba(245,230,200,0.35)' }}>{y.label}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------ key-term chip / chapter banner ------------------------ */

export const TermChipView: React.FC<{ chip: TermChip; cfg: RenderConfig }> = ({ chip, cfg }) => {
  const f = useCurrentFrame();
  const box = px(cfg.topBand.rect, cfg);
  const size = useFit(`${chip.term}: ${chip.definition}`, box.w - 220, 2, 30, SANS, 400);
  const o = interpolate(f, [0, 8, (cfg.overlayTiming.termChipSec - 0.4) * 30, cfg.overlayTiming.termChipSec * 30], [0, 1, 1, 0], clamp);
  return (
    <div data-kit="termchip" style={{ ...rectStyle(cfg.topBand.rect), display: 'flex', alignItems: 'center', gap: 16, opacity: o, background: 'rgba(12,10,8,0.85)', borderRadius: 10, padding: '0 18px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <span style={{ fontFamily: SANS, fontSize: 18, letterSpacing: 3, color: '#8ecae6', whiteSpace: 'nowrap' }}>KEY TERM</span>
      <span style={{ fontFamily: SANS, fontSize: size, color: '#f5e6c8', lineHeight: 1.2 }}>
        <b>{chip.term}:</b> {chip.definition}
      </span>
    </div>
  );
};

export const ChapterBanner: React.FC<{ chapter: ResolvedChapter; cfg: RenderConfig }> = ({ chapter, cfg }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const box = px(cfg.topBand.rect, cfg);
  const size = useFit(chapter.spec.label.toUpperCase(), box.w - 60, 1, 44);
  const len = (chapter.bannerEnd - chapter.start) * fps;
  const wipe = interpolate(f, [0, 10], [0, 100], clamp);
  const o = interpolate(f, [len - 8, len], [1, 0], clamp);
  return (
    <div data-kit="chapter" style={{ ...rectStyle(cfg.topBand.rect), display: 'flex', alignItems: 'center', opacity: o, overflow: 'hidden',
      clipPath: `inset(0 ${100 - wipe}% 0 0)`, background: 'linear-gradient(90deg, rgba(255,209,102,0.95), rgba(255,209,102,0.75))', borderRadius: 10, padding: '0 24px', boxSizing: 'border-box' }}>
      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: size, color: '#1a1512', letterSpacing: 2, whiteSpace: 'nowrap' }}>{chapter.spec.label.toUpperCase()}</span>
    </div>
  );
};

/* -------------------------------- arrow chain -------------------------------- */

/** "A → B → C" as nodes that light up when each part is spoken. */
export const ChainText: React.FC<{ parts: string[]; partOffsets: number[]; position: [number, number]; level: 'hero' | 'title' | 'subtitle' | 'body'; color: string; cfg: RenderConfig }> = ({ parts, partOffsets, position, level, color, cfg }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const maxW = cfg.text.maxWidthFrac * cfg.width;
  const base = cfg.text[level].fontPx;
  const size = useFit(parts.join('  →  '), maxW, 1, base);
  return (
    <div data-kit="chain" style={{ position: 'absolute', left: `${position[0] * 100}%`, top: `${position[1] * 100}%`, transform: 'translate(-50%, -50%)',
      display: 'flex', alignItems: 'center', gap: size * 0.35, whiteSpace: 'nowrap', fontFamily: SERIF, fontWeight: 700, fontSize: size, color, textShadow: '0 3px 12px rgba(0,0,0,0.8)' }}>
      {parts.map((p, i) => {
        const at = partOffsets[i] * fps;
        const o = interpolate(f, [at, at + 8], [0.15, 1], clamp);
        const y = interpolate(f, [at, at + 8], [10, 0], clamp);
        return (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ opacity: interpolate(f, [at - 4, at + 4], [0.15, 1], clamp), color: '#e8dcc8' }}>→</span>}
            <span style={{ opacity: o, transform: `translateY(${y}px)`, display: 'inline-block' }}>{p}</span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* --------------------------------- route map --------------------------------- */

const GRATICULE = geoGraticule10();
const LAND = feature(landTopo as unknown as Topology, (landTopo as unknown as Topology).objects.land) as unknown as FeatureCollection<MultiPolygon> | MultiPolygon;

/**
 * Real-geography route map: land from Natural Earth (world-atlas), great-circle arcs that
 * draw in, and destination labels placed by a collision-avoiding pass.
 */
export const RouteMap: React.FC<{ beat: RouteBeat; places: Record<string, [number, number]>; cfg: RenderConfig }> = ({ beat, places, cfg }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const box = px(cfg.stage, cfg);
  const H = box.h - 70; // caption strip
  const dark = beat.variant === 'dark';
  const { projection, path } = useMemo(() => {
    const pts = beat.routes.flatMap(r => [places[r.from], places[r.to]]).filter(Boolean);
    const frame: [number, number][] = [[-105, -35], [45, 62], ...pts];
    const proj = geoNaturalEarth1().fitExtent([[24, 24], [box.w - 24, H - 24]], { type: 'MultiPoint', coordinates: frame });
    return { projection: proj, path: geoPath(proj) };
  }, [beat, places, box.w, H]);

  const labelSize = 26;
  const labels = useMemo(() => {
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    return beat.routes.map(r => {
      const text = r.label ?? r.to;
      const w = typeof document === 'undefined' ? text.length * 14 : measureText({ text, fontFamily: SANS, fontSize: labelSize, fontWeight: 700 }).width + 16;
      const h = labelSize + 10;
      const [px0, py0] = projection(places[r.to]) ?? [0, 0];
      const candidates = [
        [px0 + 12, py0 - h / 2], [px0 - w - 12, py0 - h / 2], [px0 - w / 2, py0 + 12], [px0 - w / 2, py0 - h - 12],
        [px0 + 12, py0 + h], [px0 - w - 12, py0 + h], [px0 + 12, py0 - 2 * h], [px0 - w - 12, py0 - 2 * h],
      ];
      const fits = ([x, y]: number[]) =>
        x >= 4 && y >= 4 && x + w <= box.w - 4 && y + h <= H - 4 && !placed.some(p => x < p.x + p.w && p.x < x + w && y < p.y + p.h && p.y < y + h);
      const [x, y] = candidates.find(fits) ?? candidates[0];
      placed.push({ x, y, w, h });
      return { text, x, y, w, h };
    });
  }, [beat, places, projection, box.w, H]);

  return (
    <div data-kit="route" style={{ ...rectStyle(cfg.stage), borderRadius: 16, overflow: 'hidden', boxShadow: '0 14px 40px rgba(0,0,0,0.5)',
      background: dark ? 'radial-gradient(ellipse at 40% 40%, #1c1814, #0b0907)' : `radial-gradient(ellipse at ${40 + Math.sin(f / 40) * 8}% ${40 + Math.cos(f / 50) * 6}%, #3a6d8a, #173447)` }}>
      <svg width={box.w} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d={path(GRATICULE as never) ?? ''} fill="none" stroke={dark ? 'rgba(232,220,200,0.06)' : 'rgba(232,220,200,0.12)'} strokeWidth={1} />
        <path d={path(LAND as never) ?? ''} fill={dark ? '#4a4034' : '#d8c49a'} stroke={dark ? '#6a5c4a' : '#8a7550'} strokeWidth={1.2} />
        {beat.routes.map((r, i) => {
          const a = places[r.from];
          const b = places[r.to];
          if (!a || !b) return null;
          const start = 0.15 * fps + i * 0.7 * fps;
          const p = interpolate(f, [start, start + 1.2 * fps], [0, 1], clamp);
          const d = path({ type: 'LineString', coordinates: [a, b] }) ?? '';
          const [dx, dy] = projection(geoInterpolate(a, b)(p)) ?? [0, 0];
          const [ax, ay] = projection(a) ?? [0, 0];
          const color = dark ? '#e0604d' : '#b8321e';
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} opacity={0.9} />
              <circle cx={ax} cy={ay} r={9} fill={dark ? '#f5e6c8' : '#1d1a16'} />
              <circle cx={dx} cy={dy} r={p > 0 && p < 1 ? 9 : 7} fill={color} />
              {p >= 1 && [0, 0.6].map(phase => {
                const r = ((f - start - 1.2 * fps) / fps + phase) % 1.2 / 1.2;
                return <circle key={phase} cx={dx} cy={dy} r={8 + 26 * r} fill="none" stroke={color} strokeWidth={3} opacity={(1 - r) * 0.8} />;
              })}
            </g>
          );
        })}
      </svg>
      {labels.map((l, i) => {
        const start = 0.15 * fps + i * 0.7 * fps + 1.0 * fps;
        return (
          <div key={i} style={{ position: 'absolute', left: l.x, top: l.y, width: l.w, height: l.h, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(12,10,8,0.8)', borderRadius: 6, fontFamily: SANS, fontWeight: 700, fontSize: labelSize, color: '#f5e6c8', opacity: interpolate(f, [start, start + 8], [0, 1], clamp) }}>
            {l.text}
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 34, color: '#f5e6c8', background: 'rgba(0,0,0,0.35)' }}>
        {beat.caption}
      </div>
    </div>
  );
};

/* --------------------------------- range bar --------------------------------- */

export const RangeBar: React.FC<{ beat: RangeBeat; cfg: RenderConfig }> = ({ beat, cfg }) => {
  const f = useCurrentFrame();
  const box = px(cfg.stage, cfg);
  const barW = box.w - 160;
  const grow = interpolate(f, [6, 30], [0, 1], clamp);
  const lo = beat.low / 100;
  const hi = beat.high / 100;
  const labelSize = useFit(beat.label, barW, 1, 48);
  const capSize = useFit(beat.caption, barW, 2, 30, SANS, 400);
  return (
    <div data-kit="range" style={{ ...rectStyle(cfg.stage), display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: SERIF, color: '#e8dcc8' }}>
      <div style={{ fontSize: labelSize, fontWeight: 700, letterSpacing: 2, marginBottom: 40, whiteSpace: 'nowrap' }}>{beat.label}</div>
      <div style={{ position: 'relative', width: barW, height: 44, background: 'rgba(232,220,200,0.15)', borderRadius: 8 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${lo * 100 * grow}%`, background: '#e07a5f', borderRadius: '8px 0 0 8px' }} />
        <div style={{ position: 'absolute', left: `${lo * 100}%`, top: 0, bottom: 0, width: `${(hi - lo) * 100 * grow}%`,
          background: 'repeating-linear-gradient(45deg, rgba(224,122,95,0.75) 0 10px, rgba(224,122,95,0.35) 10px 20px)' }} />
        {[lo, hi].map((v, i) => (
          <div key={i} style={{ position: 'absolute', left: `${v * 100}%`, top: -14, bottom: -14, width: 3, background: '#e8dcc8', opacity: grow }}>
            <div style={{ position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)', fontSize: 40, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {i === 0 ? beat.low : beat.high}{beat.unit}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 96, fontFamily: SANS, fontSize: capSize, opacity: 0.9, maxWidth: barW, textAlign: 'center' }}>{beat.caption}</div>
    </div>
  );
};

/* --------------------------------- head pair --------------------------------- */

export interface HeadInfo { id: string; name: string; color: string; src: string }

/**
 * Both hosts on screen; the speaker is enlarged and bounces with its audio level, the listener
 * dims. Levels are precomputed per frame by tools/build-timing.ts (no WebAudio at render time).
 * Geometry reserves room for the bounce so the heads never leave their rect.
 */
export const HeadPair: React.FC<{ heads: HeadInfo[]; speaker: string | null; level: number; cfg: RenderConfig }> = ({ heads, speaker, level, cfg }) => {
  const frame = useCurrentFrame();
  const box = px(cfg.head.rect, cfg);
  const MAX_SCALE = 1.08;
  const LIFT = 10;
  const active = Math.min((box.h - LIFT - 4) / MAX_SCALE, box.w * 0.62);
  const listener = active * 0.62;
  const margin = (active * (MAX_SCALE - 1)) / 2 + 2;
  return (
    <div data-kit="heads" style={{ ...rectStyle(cfg.head.rect) }}>
      {heads.map((h, i) => {
        const isActive = h.id === speaker;
        const size = isActive ? active : listener;
        const left = i === 0 ? margin : box.w - size - margin;
        return (
          <div key={h.id} style={{ position: 'absolute', left, bottom: margin, width: size, height: size, zIndex: isActive ? 2 : 1 }}>
            <HeadFace head={h} active={isActive} amp={isActive ? level : 0} maxScale={MAX_SCALE} lift={LIFT} idle={isActive ? 0 : Math.sin(frame / 22 + i) * 0.5 + 0.5} />
          </div>
        );
      })}
    </div>
  );
};

const HeadFace: React.FC<{ head: HeadInfo; active: boolean; amp: number; maxScale: number; lift: number; idle?: number }> = ({ head, active, amp, maxScale, lift, idle = 0 }) => (
  <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: `6px solid ${head.color}`, background: '#222', boxSizing: 'border-box',
    transform: `scale(${1 + (maxScale - 1) * amp}) translateY(${-lift * amp - idle * 3}px) rotate(${(idle - 0.5) * 2}deg)`, filter: active ? 'none' : 'saturate(0.4) brightness(0.65)',
    boxShadow: active ? `0 0 28px ${head.color}` : 'none', position: 'relative' }}>
    <Img src={head.src} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
    <div style={{ position: 'absolute', bottom: 0, width: '100%', height: active ? 38 : 28, lineHeight: `${active ? 38 : 28}px`, background: head.color, color: '#fff', fontFamily: SERIF, fontSize: active ? 26 : 19, textAlign: 'center', whiteSpace: 'nowrap' }}>{head.name}</div>
  </div>
);


/* -------------------------------- sound layers -------------------------------- */

export const SfxLayer: React.FC<{ cues: SfxCue[]; cfg: RenderConfig }> = ({ cues, cfg }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {cues.map((c, i) => (
        <Sequence key={i} from={Math.round(c.time * fps)} durationInFrames={Math.round(1.2 * fps)} layout="none">
          <Audio src={staticFile(cfg.sfx[c.name])} volume={cfg.sfx.volume[c.name]} />
        </Sequence>
      ))}
    </>
  );
};

export const MusicBed: React.FC<{ volumeAt: (frame: number) => number; src: string }> = ({ volumeAt, src }) => <Audio src={src} loop volume={volumeAt} />;

/* --------------------------------- stack card --------------------------------- */

/**
 * Backing card + lines that appear as they are spoken. Lines keep the positions the layout
 * engine verified; each line mounts in its own Sequence so it enters (and leaves) on time.
 */
export const StackCard: React.FC<{
  beat: StackBeat;
  accent: string;
  renderLine: (item: StackBeat['items'][number], index: number) => React.ReactNode;
}> = ({ beat, accent, renderLine }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = interpolate(f, [0, 8], [0, 1], clamp);
  const multi = beat.items.length > 1;
  // the card covers only the lines on screen right now (lines enter and leave on their own)
  const t = f / fps;
  const visible = beat.items.filter(it => t >= it.offset && t < it.endOffset);
  if (!visible.length) return null;
  const card: Rect = [
    Math.min(...visible.map(i => i.rect[0])), Math.min(...visible.map(i => i.rect[1])),
    Math.max(...visible.map(i => i.rect[2])), Math.max(...visible.map(i => i.rect[3])),
  ];
  return (
    <>
      <div data-kit="stack" style={{ ...rectStyle(card), opacity: o, background: 'rgba(12,10,8,0.6)', borderRadius: 14,
        borderLeft: multi ? `6px solid ${accent}` : 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }} />
      {beat.items.map((it, i) => (
        <Sequence key={i} from={Math.round(it.offset * fps)} durationInFrames={Math.max(1, Math.round((it.endOffset - it.offset) * fps))} layout="none">
          {renderLine(it, i)}
        </Sequence>
      ))}
    </>
  );
};

/* --------------------------------- recap board --------------------------------- */

export const RecapBoard: React.FC<{ beat: BoardBeat & { itemOffsets?: number[]; footerOffset?: number }; boxes: string[]; checkedAt: (box: number) => number | null; beatStart: number; cfg: RenderConfig }> = ({ beat, boxes, checkedAt, beatStart, cfg }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const box = px(cfg.stage, cfg);
  const footerH = beat.footer ? 70 : 0;
  const cellW = (box.w - 24) / 2;
  const cellH = (box.h - footerH - 24) / 2;
  return (
    <div data-kit="board" style={{ ...rectStyle(cfg.stage), fontFamily: SERIF }}>
      {beat.items.map((it, i) => {
        const at = (beat.itemOffsets?.[i] ?? 0) * fps;
        const o = interpolate(f, [at, at + 10], [0, 1], clamp);
        const checkT = checkedAt(it.box);
        const checked = checkT !== null && beatStart + f / fps >= checkT;
        const col = i % 2;
        const row = Math.floor(i / 2);
        return (
          <BoardCell key={i} left={col * (cellW + 24)} top={row * (cellH + 24)} w={cellW} h={cellH} opacity={o} lift={(1 - o) * 16}
            title={`BOX ${it.box} · ${(boxes[it.box - 1] ?? '').toUpperCase()}`} text={it.text} checked={checked} />
        );
      })}
      {beat.footer && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: footerH, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44, fontWeight: 700, color: '#ffd166', letterSpacing: 2, opacity: interpolate(f, [(beat.footerOffset ?? 0) * fps, (beat.footerOffset ?? 0) * fps + 10], [0, 1], clamp) }}>
          {beat.footer.text}
        </div>
      )}
    </div>
  );
};

const BoardCell: React.FC<{ left: number; top: number; w: number; h: number; opacity: number; lift: number; title: string; text: string; checked: boolean }> = ({ left, top, w, h, opacity, lift, title, text, checked }) => {
  const titleSize = useFit(title, w - 90, 1, 24, SANS, 700);
  const textSize = useFit(text, w - 48, 4, 38);
  return (
    <div style={{ position: 'absolute', left, top: top + lift, width: w, height: h, opacity, background: 'rgba(245,230,200,0.94)', color: '#2a2018', borderRadius: 14,
      padding: 22, boxSizing: 'border-box', overflow: 'hidden', borderTop: `8px solid ${checked ? '#2f7d4a' : '#c9a227'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: titleSize, letterSpacing: 2, opacity: 0.75, whiteSpace: 'nowrap' }}>{title}</span>
        <span style={{ width: 38, height: 38, borderRadius: 8, background: checked ? '#2f7d4a' : 'transparent', border: '3px solid #2a2018', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{checked ? '✓' : ''}</span>
      </div>
      <div style={{ marginTop: 14, fontSize: textSize, fontWeight: 700, lineHeight: 1.2 }}>{text}</div>
    </div>
  );
};

/* -------------------------------- question card -------------------------------- */

/** AP-exam styled question: number, format tag, optional source block, stem. */
export const QuestionCard: React.FC<{ beat: QuestionBeat; cfg: RenderConfig }> = ({ beat, cfg }) => {
  const f = useCurrentFrame();
  const box = px(cfg.stage, cfg);
  const innerW = box.w - 120;
  const stemSize = useFit(beat.stem, innerW - 90, 3, 46);
  const srcSize = useFit(beat.source?.text ?? '', innerW - 60, 3, 34);
  const o = interpolate(f, [0, 10], [0, 1], clamp);
  return (
    <div data-kit="question" style={{ ...rectStyle(cfg.stage), display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: o }}>
      <div style={{ width: box.w - 60, maxHeight: box.h - 20, background: '#fbf7ee', color: '#1d1a16', borderRadius: 6, padding: '30px 30px 34px', boxSizing: 'border-box',
        boxShadow: '0 14px 40px rgba(0,0,0,0.45)', transform: `translateY(${(1 - o) * 20}px) rotate(${(1 - o) * -1}deg)`, overflow: 'hidden', fontFamily: SERIF }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <span style={{ width: 54, height: 54, borderRadius: '50%', background: '#1d1a16', color: '#fbf7ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700 }}>{beat.number}</span>
          <span style={{ fontFamily: SANS, fontSize: 22, letterSpacing: 4, textTransform: 'uppercase', color: '#7a5c1f' }}>{beat.format}</span>
        </div>
        {beat.source && (
          <div style={{ borderLeft: '5px solid #c9a227', background: '#f1e9d6', padding: '14px 20px', marginBottom: 20 }}>
            <div style={{ fontFamily: SANS, fontSize: 20, letterSpacing: 2, color: '#7a5c1f', marginBottom: 6 }}>{beat.source.title}</div>
            <div style={{ fontSize: srcSize, fontStyle: 'italic', lineHeight: 1.3 }}>{beat.source.text}</div>
          </div>
        )}
        <div style={{ fontSize: stemSize, fontWeight: 700, lineHeight: 1.25 }}>{beat.stem}</div>
      </div>
    </div>
  );
};
