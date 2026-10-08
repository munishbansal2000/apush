/**
 * The shared screen overlays: ONE Caption, DateChip, TermList, Legend and Summary for every
 * scene (hand-written or plan-driven). Positions come from the adaptive layout zones
 * (./layout useFrame), sizes from TYPE tokens × the frame's scale, motion from <Slide>.
 *
 * Each group component wraps its items in ONE guard <Track> (captions → "caption"/text,
 * chips → "date"/chrome, term lists → "terms", legends → "legend", summaries → "summary"),
 * so the runtime guard checks every zone against every other and against map items.
 * The single-item components are exported too, for scenes that compose their own tracks.
 *
 * Text is wrapped/measured with ./measure and rendered line by line (no browser re-wrap), so
 * tools/validate-plan.ts computes the same panel sizes without a browser (overlayBoxes()).
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Track } from '../kit/guard';
import { COLOR, FONT, MOTION, RADIUS, STROKE, SURFACE, TYPE } from '../theme/tokens';
import { anchoredBox, anchorStyle, useFrame, type FrameLayout, type Zone } from './layout';
import { estimateWidth, measureLine, wrapText, type Font, type Measure } from './measure';
import { Slide, type Dir } from './primitives';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/* ------------------------------------ fonts + metrics ------------------------------------ */

/** Overlay fonts at scale s (pure: shared by the components and the validator). */
export const overlayFonts = (s: number) => ({
  caption: { size: TYPE.caption * s, family: FONT.ui } as Font,
  chip: { size: TYPE.chip * s, family: FONT.display, weight: 700, letterSpacing: 3 * s } as Font,
  year: { size: TYPE.h2 * s, family: FONT.display, weight: 700, letterSpacing: 3 * s } as Font,
  termHeading: { size: TYPE.small * s, family: FONT.text, weight: 700, letterSpacing: 3 * s } as Font,
  term: { size: TYPE.term * s, family: FONT.text, weight: 700, letterSpacing: 1 * s } as Font,
  legendTitle: { size: TYPE.small * s, family: FONT.display, weight: 700, letterSpacing: 2 * s } as Font,
  legend: { size: TYPE.town * s, family: FONT.text, weight: 700 } as Font,
  summary: { size: TYPE.chip * s, family: FONT.text, weight: 700, letterSpacing: 1 * s } as Font,
});

/** Caption padding (px at s = 1). */
const CAP_PAD = { x: 22, y: 9 };
const CHIP_PAD = { x: 18, y: 9 };
const PANEL_PAD = { x: 20, y: 12 };

/** Caption lines for a zone (wrapped to the zone's max width). */
export function captionLines(text: string, z: Zone, s: number, measure: Measure = measureLine) {
  const f = overlayFonts(s).caption;
  const maxW = (z.maxW ?? z.w) - 2 * CAP_PAD.x * s;
  return wrapText(text, maxW, f, measure);
}

/* ------------------------------------ pure panel sizes ------------------------------------ */

export interface ChipSpec { text: string; at: number; out?: number; variant?: 'chip' | 'year'; minWidth?: number }
export interface TermItem { text: string; at: number }
export interface TermListSpec { heading: string; items: TermItem[]; at: number; out?: number; color: string }
export interface CaptionSpec { text: string; at: number; out: number; align?: 'center' | 'left'; maxWidth?: number }
export type LegendSwatch =
  | { kind: 'fill' }
  | { kind: 'bar'; height: number }
  | { kind: 'dot'; r?: number }
  | { kind: 'line'; width?: number; dash?: string; casing?: string }
  | { kind: 'rail' };
export interface LegendEntry { label: string; color: string; swatch?: LegendSwatch; at?: number }
export interface LegendSpec { title?: string; entries: LegendEntry[]; at: number; out?: number; from?: Dir | 'fade' }
export interface SummaryRow { left?: string; arrow?: string; right?: string; text?: string; color: string; at?: number }
export interface SummarySpec { rows: SummaryRow[]; at: number; out?: number }

const SWATCH_W = 40;
const swatchH = (sw?: LegendSwatch) => (sw?.kind === 'bar' ? Math.max(4, sw.height) : 14);

/** Pixel size of each overlay panel (pure; the components lay out exactly like this). */
export const panelSize = {
  chip: (c: ChipSpec, s: number) => {
    const f = c.variant === 'year' ? overlayFonts(s).year : overlayFonts(s).chip;
    const w = Math.max(c.minWidth ? c.minWidth * s : 0, estimateWidth(c.text, f) + 2 * CHIP_PAD.x * s);
    return { w, h: f.size * 1.2 + (c.variant === 'year' ? 10 : 2 * CHIP_PAD.y) * s };
  },
  terms: (l: TermListSpec, s: number) => {
    const F = overlayFonts(s);
    const itemW = Math.max(...l.items.map(i => estimateWidth(i.text, F.term))) + 20 * s;
    const w = Math.max(200 * s, estimateWidth(l.heading, F.termHeading), itemW) + 2 * PANEL_PAD.x * s + 6 * s;
    const h = F.termHeading.size * 1.2 + l.items.length * (F.term.size * 1.2 + 6 * s) + 2 * PANEL_PAD.y * s + 6 * s;
    return { w, h };
  },
  caption: (c: CaptionSpec, z: Zone, s: number) => {
    const zz = c.maxWidth ? { ...z, maxW: c.maxWidth * s } : z;
    const lines = captionLines(c.text, zz, s, estimateWidth);
    const f = overlayFonts(s).caption;
    return { w: Math.max(...lines.map(l => estimateWidth(l, f))) + 2 * CAP_PAD.x * s, h: lines.length * f.size * 1.3 + 2 * CAP_PAD.y * s, lines };
  },
  legend: (l: LegendSpec, s: number) => {
    const F = overlayFonts(s);
    const rowW = Math.max(...l.entries.map(e => estimateWidth(e.label, F.legend))) + (SWATCH_W + 10) * s;
    const w = Math.max(l.title ? estimateWidth(l.title, F.legendTitle) : 0, rowW) + 32 * s + 4 * s;
    const rows = l.entries.reduce((h, e) => h + Math.max(F.legend.size * 1.25, swatchH(e.swatch) * s), 0) + Math.max(0, l.entries.length - 1) * 5 * s;
    const h = (l.title ? F.legendTitle.size * 1.25 + 5 * s : 0) + rows + 20 * s + 4 * s;
    return { w, h };
  },
  summary: (sm: SummarySpec, s: number) => {
    const f = overlayFonts(s).summary;
    const col = (k: 'left' | 'right') => Math.max(0, ...sm.rows.map(r => (r[k] ? estimateWidth(r[k]!, f) : 0)));
    const text = Math.max(0, ...sm.rows.map(r => (r.text ? estimateWidth(r.text, f) : 0)));
    const w = Math.max(col('left') + col('right') + 40 * s + 24 * s, text) + 2 * PANEL_PAD.x * s + 6 * s;
    const h = sm.rows.length * f.size * 1.4 * 1.15 + (sm.rows.length - 1) * 4 * s + 2 * PANEL_PAD.y * s + 6 * s;
    return { w, h };
  },
};

/** Frame-px box of an overlay panel in its zone (pure; for validators). */
export const overlayBox = (L: FrameLayout, zone: keyof FrameLayout['zones'], size: { w: number; h: number }) => anchoredBox(L.zones[zone], size.w, size.h);

/* ------------------------------------ Caption ------------------------------------ */

/** Bottom caption: rises a little from below, sinks out; wrapped to the caption zone. */
export const Caption: React.FC<CaptionSpec> = ({ text, at, out, align = 'center', maxWidth }) => {
  const L = useFrame();
  const z = L.zones.caption;
  const zz = maxWidth ? { ...z, maxW: maxWidth * L.s } : z;
  const lines = captionLines(text, zz, L.s);
  const f = overlayFonts(L.s).caption;
  const pos = anchorStyle(z, L.width, L.height);
  return (
    <Slide at={at} out={out - MOTION.fade} from="down" to="down" distance={40 * L.s} dur={MOTION.fade}>
      <div style={{ position: 'absolute', ...pos, ...(align === 'left' ? { justifyContent: 'flex-start' } : {}) }}>
        <div data-guard-item={`caption:${text.slice(0, 24)}`} style={{ background: SURFACE.night.bg, color: SURFACE.night.fg, padding: `${CAP_PAD.y * L.s}px ${CAP_PAD.x * L.s}px`, borderRadius: RADIUS.md * L.s,
          fontFamily: f.family, fontSize: f.size, lineHeight: 1.3, textAlign: align }}>
          {lines.map((l, i) => <div key={i} style={{ whiteSpace: 'nowrap' }}>{l}</div>)}
        </div>
      </div>
    </Slide>
  );
};

export const Captions: React.FC<{ lines: CaptionSpec[]; id?: string }> = ({ lines, id = 'caption' }) => (
  <Track id={id} role="text">{lines.map(c => <Caption key={`${c.at}-${c.text.slice(0, 16)}`} {...c} />)}</Track>
);

/* ------------------------------------ DateChip ------------------------------------ */

/** Top-left date chip (or a big year chip): slides in from the left, leaves left. Text may be a function of time. */
export const DateChip: React.FC<Omit<ChipSpec, 'text'> & { text: string | ((t: number) => React.ReactNode); from?: Dir | 'fade' }> = ({ text, at, out, variant = 'chip', minWidth, from = 'left' }) => {
  const L = useFrame();
  const t = useT();
  const F = overlayFonts(L.s);
  const f = variant === 'year' ? F.year : F.chip;
  const z = L.zones.chip;
  return (
    <Slide at={at} out={out} from={from} dur={MOTION.enter}>
      <div data-guard-item={`chip:${typeof text === 'string' ? text.slice(0, 20) : 'live'}`} style={{ position: 'absolute', ...anchorStyle(z, L.width, L.height),
        background: COLOR.ink, color: COLOR.onNight, padding: variant === 'year' ? `${4 * L.s}px ${CHIP_PAD.x * L.s}px ${6 * L.s}px` : `${CHIP_PAD.y * L.s}px ${CHIP_PAD.x * L.s}px`,
        borderRadius: RADIUS.sm * L.s, fontFamily: f.family, fontSize: f.size, fontWeight: 700, letterSpacing: f.letterSpacing, whiteSpace: 'nowrap', lineHeight: 1.2,
        minWidth: minWidth ? minWidth * L.s : undefined, boxSizing: 'border-box', textAlign: variant === 'year' ? 'center' : undefined, fontVariantNumeric: variant === 'year' ? 'tabular-nums' : undefined }}>
        {typeof text === 'string' ? text : text(t)}
      </div>
    </Slide>
  );
};

export const DateChips: React.FC<{ chips: ChipSpec[]; id?: string }> = ({ chips, id = 'date' }) => (
  <Track id={id} role="chrome">{chips.map(c => <DateChip key={`${c.at}-${c.text}`} {...c} />)}</Track>
);

/* ------------------------------------ TermList ------------------------------------ */

/**
 * Term list: one heading + items that land on their spoken word. Opens with its first item
 * (never empty) and sizes to its longest item (hidden items keep their space).
 */
export const TermList: React.FC<TermListSpec> = ({ heading, items, at, out, color }) => {
  const L = useFrame();
  const t = useT();
  const { fps } = useVideoConfig();
  const F = overlayFonts(L.s);
  const z = L.zones.terms;
  const s = L.s;
  const from = z.anchor === 'tl' || z.anchor === 'bl' ? 'left' : 'right';
  return (
    <Slide at={at} from={from} out={out} dur={MOTION.enter}>
      <div data-guard-item={`terms:${heading}`} style={{ position: 'absolute', ...anchorStyle(z, L.width, L.height), minWidth: 200 * s, display: 'flex', flexDirection: 'column', gap: 6 * s,
        background: SURFACE.parchment.bg, border: `${3 * s}px solid ${color}`, borderRadius: RADIUS.md * s, padding: `${PANEL_PAD.y * s}px ${PANEL_PAD.x * s}px`, boxSizing: 'border-box' }}>
        <div style={{ fontFamily: F.termHeading.family, fontSize: F.termHeading.size, fontWeight: 700, letterSpacing: F.termHeading.letterSpacing, color, whiteSpace: 'nowrap', lineHeight: 1.2 }}>{heading}</div>
        {items.map(w => {
          const p = interpolate(t, [w.at, w.at + 7 / fps], [0, 1], clamp);
          return (
            <div key={w.text} style={{ opacity: p, transform: `translateX(${(1 - p) * 18 * s}px)`, display: 'flex', alignItems: 'center', gap: 10 * s, lineHeight: 1.2,
              fontFamily: F.term.family, fontWeight: 700, fontSize: F.term.size, color: COLOR.ink, letterSpacing: F.term.letterSpacing, whiteSpace: 'nowrap' }}>
              <span style={{ width: 10 * s, height: 10 * s, borderRadius: RADIUS.pill, background: color, flex: 'none' }} />
              {w.text}
            </div>
          );
        })}
      </div>
    </Slide>
  );
};

export const TermLists: React.FC<{ lists: TermListSpec[]; id?: string }> = ({ lists, id = 'terms' }) => (
  <Track id={id} role="overlay">{lists.map(l => <TermList key={`${l.at}-${l.heading}`} {...l} />)}</Track>
);

/* ------------------------------------ Legend ------------------------------------ */

const Swatch: React.FC<{ e: LegendEntry; s: number }> = ({ e, s }) => {
  const sw = e.swatch ?? { kind: 'fill' as const };
  const W = SWATCH_W * s;
  const H = swatchH(sw) * s;
  if (sw.kind === 'fill') return <span style={{ width: 18 * s, height: 14 * s, borderRadius: (RADIUS.sm / 2) * s, background: e.color, border: `${STROKE.hair}px solid ${COLOR.ink}`, flex: 'none', marginRight: (W - 18 * s) }} />;
  if (sw.kind === 'bar') return <span style={{ width: W, height: H, background: e.color, border: `${STROKE.hair}px solid ${COLOR.ink}`, flex: 'none', boxSizing: 'border-box' }} />;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${SWATCH_W} ${swatchH(sw)}`} style={{ flex: 'none' }}>
      {sw.kind === 'dot' && <circle cx={20} cy={7} r={sw.r ?? 6} fill={e.color} fillOpacity={0.55} stroke={e.color} strokeWidth={1.8} />}
      {sw.kind === 'line' && <>
        <line x1={2} y1={7} x2={38} y2={7} stroke={e.color} strokeWidth={sw.width ?? 4.2} />
        {sw.casing && <line x1={2} y1={7} x2={38} y2={7} stroke={sw.casing} strokeWidth={(sw.width ?? 4.2) * 0.37} strokeDasharray={sw.dash} />}
      </>}
      {sw.kind === 'rail' && <>
        <line x1={2} y1={7} x2={38} y2={7} stroke={e.color} strokeWidth={7} strokeDasharray="1.6 5.4" />
        <line x1={2} y1={7} x2={38} y2={7} stroke={e.color} strokeWidth={2.6} />
      </>}
    </svg>
  );
};

/**
 * Legend panel (status fills, arrow widths, line kinds, dot sizes). Opens with its first entry
 * (never empty); entries appear at their `at`; hidden entries keep their space.
 */
export const Legend: React.FC<LegendSpec> = ({ title, entries, at, out, from = 'left' }) => {
  const L = useFrame();
  const t = useT();
  const F = overlayFonts(L.s);
  const s = L.s;
  const z = L.zones.legend;
  const first = Math.min(at, ...entries.map(e => e.at ?? at));
  return (
    <Slide at={first} out={out} from={from} distance={160 * s}>
      <div data-guard-item={`legend:${title ?? entries[0]?.label ?? ''}`} style={{ position: 'absolute', ...anchorStyle(z, L.width, L.height), background: SURFACE.parchment.bg, border: `${STROKE.thin * s}px solid ${COLOR.ink}`,
        borderRadius: RADIUS.md * s, padding: `${10 * s}px ${16 * s}px`, display: 'flex', flexDirection: 'column', gap: 5 * s, color: COLOR.ink }}>
        {title && <div style={{ fontFamily: F.legendTitle.family, fontSize: F.legendTitle.size, fontWeight: 700, letterSpacing: F.legendTitle.letterSpacing, whiteSpace: 'nowrap', lineHeight: 1.25 }}>{title}</div>}
        {entries.map(e => {
          const o = interpolate(t, [e.at ?? first, (e.at ?? first) + 0.3], [0, 1], clamp);
          return (
            <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 10 * s, opacity: o, transform: `translateX(${(1 - o) * -12 * s}px)`, minHeight: F.legend.size * 1.25,
              fontFamily: F.legend.family, fontSize: F.legend.size, fontWeight: 700, whiteSpace: 'nowrap', lineHeight: 1.25 }}>
              <Swatch e={e} s={s} />
              {e.label}
            </div>
          );
        })}
      </div>
    </Slide>
  );
};

export const Legends: React.FC<{ legends: LegendSpec[]; id?: string }> = ({ legends, id = 'legend' }) => (
  <Track id={id} role="overlay">{legends.map(l => <Legend key={`${l.at}-${l.title ?? ''}`} {...l} />)}</Track>
);

/* ------------------------------------ Summary ------------------------------------ */

/** Closing summary panel: rows like "FOOD ⇄ FOOD" in the colours of what they describe; rows can land later. */
export const Summary: React.FC<SummarySpec> = ({ rows, at, out }) => {
  const L = useFrame();
  const t = useT();
  const s = L.s;
  const f = overlayFonts(s).summary;
  const z = L.zones.summary;
  const col = (k: 'left' | 'right') => Math.max(0, ...rows.map(r => (r[k] ? estimateWidth(r[k]!, f) : 0)));
  const [lw, rw] = [col('left'), col('right')];
  const from = z.anchor === 'tl' ? 'left' : 'up';
  return (
    <Slide at={at} out={out} from={from} dur={MOTION.enter}>
      <div data-guard-item="summary" style={{ position: 'absolute', ...anchorStyle(z, L.width, L.height), background: COLOR.halo, border: `${3 * s}px solid ${COLOR.ink}`,
        borderRadius: RADIUS.md * s, padding: `${PANEL_PAD.y * s}px ${PANEL_PAD.x * s}px`, display: 'flex', flexDirection: 'column', gap: 4 * s }}>
        {rows.map((r, i) => {
          const o = r.at === undefined ? 1 : interpolate(t, [r.at, r.at + 0.6], [0, 1], clamp);
          return (
            <div key={i} style={{ opacity: o, transform: `translateY(${(1 - o) * 12 * s}px)`, display: 'flex', alignItems: 'center', gap: 12 * s, lineHeight: 1.15,
              fontFamily: f.family, fontWeight: 700, fontSize: f.size, color: COLOR.ink, letterSpacing: f.letterSpacing, whiteSpace: 'nowrap' }}>
              {r.text !== undefined ? <span style={{ color: r.color }}>{r.text}</span> : <>
                <span style={{ width: lw, textAlign: 'right' }}>{r.left}</span>
                <span style={{ color: r.color, fontSize: f.size * 1.4, width: 40 * s, textAlign: 'center' }}>{r.arrow ?? '→'}</span>
                <span style={{ width: rw }}>{r.right}</span>
              </>}
            </div>
          );
        })}
      </div>
    </Slide>
  );
};

export const Summaries: React.FC<{ items: SummarySpec[]; id?: string }> = ({ items, id = 'summary' }) => (
  <Track id={id} role="overlay">{items.map(sm => <Summary key={sm.at} {...sm} />)}</Track>
);
