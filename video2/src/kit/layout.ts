/**
 * Static layout model: estimated footprints for every on-screen element, built
 * from data/render-config.json (the same numbers the shell renders with). Lets
 * the validator catch overlaps, safe-area and head collisions without a browser.
 * The runtime AutoLayout registry remains the ground truth for exact glyph metrics.
 */
import type { ResolvedBeat, TextLevel } from './types';

export type Rect = [number, number, number, number];

export interface RenderConfig {
  fps: number;
  width: number;
  height: number;
  timing: {
    leadInSec: number;
    gapSec: number;
    shortReplyGapSec: number;
    shortReplyMaxWords: number;
    tailSec: number;
    audioDurationToleranceSec: number;
  };
  minHoldSec: number;
  maxSilentVisualSec: number;
  minVisualCoverage: number;
  titleCardSec: number;
  safe: Rect;
  head: { position: string; size: number; rect: Rect };
  captions: { rect: Rect; maxChars: number };
  boxTracker: { rect: Rect };
  credit: { rect: Rect };
  stage: Rect;
  textSlotsY: number[];
  topBand: { rect: Rect };
  ribbon: { rect: Rect };
  trapCard: { rect: Rect };
  figureCard: { rect: Rect };
  reveal: { rect: Rect };
  heads: { mode: 'pair' | 'single' };
  overlayTiming: { termChipSec: number; chapterBannerSec: number; trapFactDelaySec: number; yearHighlightSec: number };
  sfx: { hit: string; check: string; whoosh: string; tick: string; volume: Record<'hit' | 'check' | 'whoosh' | 'tick', number>; stampTones: string[] };
  music?: { file: string; duckTo: number; volume: Record<string, number>; fadeSec: number };
  shorts: { width: number; height: number; videoTop: number };
  guard: { overlapMinArea: number; clipTolerancePx: number; epsilon: number };
  text: Record<TextLevel, { fontPx: number; lineHeight: number }> & {
    maxWidthFrac: number;
    /** peak scale of the 'stamp' entrance; the engine reserves room for it */
    stampOvershoot: number;
    glyphW: { upper: number; lower: number; digit: number; space: number; other: number };
  };
  bubble: { lineHeightPx: number; paddingPx: number; charW: number; fontPx: number };
  speakers: Record<string, { name: string; color: string; real: string; toon: string }>;
  tones: Record<string, { library: 'playful' | 'serious'; bgOpacity: number; saturate: number; kenBurns: 'drift' | 'push'; accent: string }>;
}

export const STAGE_KINDS = new Set<ResolvedBeat['kind']>(['map', 'route', 'range', 'source', 'versus', 'pictogram', 'ledger', 'board', 'question', 'tour', 'document', 'figure']);

const centered = (cx: number, cy: number, w: number, h: number): Rect => [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];

/** Greedy word wrap → line count for a given max chars per line. */
export function wrapLines(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    if (!line) line = w;
    else if ((line + ' ' + w).length <= maxChars) line += ' ' + w;
    else {
      out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out;
}

/** Rendered width of a string in px, from per-glyph-class advance widths. */
export function measurePx(text: string, fontPx: number, g: RenderConfig['text']['glyphW']): number {
  let em = 0;
  for (const ch of text) {
    if (ch === ' ') em += g.space;
    else if (/\p{Lu}/u.test(ch)) em += g.upper;
    else if (/\p{Ll}/u.test(ch)) em += g.lower;
    else if (/\p{N}/u.test(ch)) em += g.digit;
    else em += g.other;
  }
  return em * fontPx;
}

/** Greedy wrap by measured width (what the browser does with max-width). */
export function wrapByWidth(text: string, maxPx: number, measure: (s: string) => number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    const next = line ? `${line} ${w}` : w;
    if (!line || measure(next) <= maxPx) line = next;
    else {
      out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out;
}

export function textLines(text: string, level: TextLevel, cfg: RenderConfig): string[] {
  const m = cfg.text[level];
  return wrapByWidth(text, cfg.text.maxWidthFrac * cfg.width, s => measurePx(s, m.fontPx, cfg.text.glyphW));
}

export function textRect(text: string, level: TextLevel, pos: [number, number], cfg: RenderConfig): Rect {
  const m = cfg.text[level];
  const lines = textLines(text, level, cfg);
  // a wrapped headline can fill up to max width in the browser, whatever our estimate says
  const w = lines.length > 1 ? cfg.text.maxWidthFrac : Math.max(...lines.map(l => measurePx(l, m.fontPx, cfg.text.glyphW))) / cfg.width;
  const h = (lines.length * m.lineHeight * m.fontPx) / cfg.height;
  return centered(pos[0], pos[1], w, h);
}

export function bubbleRect(text: string, widthPx: number, pos: [number, number], cfg: RenderConfig): Rect {
  const b = cfg.bubble;
  const inner = widthPx - 2 * b.paddingPx;
  const lines = wrapLines(text, Math.max(1, Math.floor(inner / (b.fontPx * b.charW)))).length;
  const h = (lines * b.lineHeightPx + 2 * b.paddingPx + 24) / cfg.height; // +24: tail
  return centered(pos[0], pos[1], widthPx / cfg.width, h);
}

/** Footprint of a beat, or null for layers that don't occupy layout (bg). */
export function beatRect(b: ResolvedBeat, cfg: RenderConfig): Rect | null {
  switch (b.kind) {
    case 'text':
      return textRect(b.text, b.level, b.position, cfg);
    case 'bubble':
      return bubbleRect(b.text, b.width ?? 380, b.position, cfg);
    case 'bg':
      return null;
    case 'stack':
      return b.rect;
    case 'figure':
      return cfg.figureCard.rect;
    case 'tour':
    case 'document':
    case 'board':
    case 'question':
    case 'map':
    case 'route':
    case 'range':
    case 'source':
    case 'versus':
    case 'pictogram':
    case 'ledger':
      return cfg.stage;
    default: {
      const _exhaustive: never = b;
      return _exhaustive;
    }
  }
}

export const intersects = (a: Rect, b: Rect, pad = 0): boolean =>
  a[0] < b[2] - pad && b[0] < a[2] - pad && a[1] < b[3] - pad && b[1] < a[3] - pad;

export const inside = (inner: Rect, outer: Rect): boolean =>
  inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3];

export const fmtRect = (r: Rect) => `[${r.map(v => v.toFixed(2)).join(', ')}]`;

/**
 * Map a rect/point given in fractions of the FULL image to fractions of a box that shows the
 * image with object-fit: cover (centred crop). Without this, focus regions drift whenever the
 * box and image aspect ratios differ.
 */
export function imageToCoverBox<T extends number[]>(v: T, imageAspect: number, boxAspect: number): T {
  let sx = 1;
  let sy = 1;
  if (imageAspect > boxAspect) sx = imageAspect / boxAspect; // wider image: sides cropped
  else sy = boxAspect / imageAspect; // taller image: top/bottom cropped
  const ox = (1 - sx) / 2;
  const oy = (1 - sy) / 2;
  return v.map((n, i) => (i % 2 === 0 ? ox + n * sx : oy + n * sy)) as T;
}
