/**
 * Adaptive screen layout: one place that knows the frame size. Overlays (date chip, term
 * list, summary, legend, caption) and screen-space stages (dots, cause chain, characters)
 * read their zones from here instead of hard-coding 1280×720 positions.
 *
 * - `DESIGN` is the 16:9 design base the TYPE tokens are specified at. It is the ONLY place
 *   the base numbers appear (tests/plan.test.ts fails on 1280/720 literals elsewhere in
 *   src/motion, src/scenes and src/plan).
 * - `s` = type/spacing scale = short side / design short side (1 at 1280×720 and 720×1280,
 *   1.5 at 1080×1080). Overlays multiply TYPE sizes and paddings by it.
 * - `space` = the design space screen-space blocks lay out in (scaled by width / space.w):
 *   16:9 → 1280×720, 9:16 → 720×1280, 1:1 → 720×720.
 * - Zones are frame-px rects with an anchor (the corner/edge the panel hugs). 16:9 and 1:1:
 *   chip top-left, summary top-right, terms right-middle, legend bottom-left above the
 *   caption, caption bottom-centre, stage between chip and caption. 9:16 stacks vertically:
 *   chip top, terms/summary under it, caption bottom, legend above the caption, the map in
 *   the middle.
 */
import { useMemo, type CSSProperties } from 'react';
import { useVideoConfig } from 'remotion';
import { TYPE } from '../theme/tokens';

/** The design base (16:9). TYPE tokens are screen px at this size. */
export const DESIGN = { w: 1280, h: 720 } as const;

export type Format = '16:9' | '9:16' | '1:1';

/** Composition size per format. */
export const FORMAT_SIZE: Record<Format, { width: number; height: number }> = {
  '16:9': { width: DESIGN.w, height: DESIGN.h },
  '9:16': { width: DESIGN.h, height: DESIGN.w },
  '1:1': { width: 1080, height: 1080 },
};

export const formatOf = (width: number, height: number): Format => (width / height > 1.2 ? '16:9' : width / height < 0.85 ? '9:16' : '1:1');

export type Anchor = 'tl' | 'tr' | 'bl' | 'br' | 'bc';
export interface Zone {
  x: number; y: number; w: number; h: number;
  /** the corner/edge a panel in this zone hugs */
  anchor: Anchor;
  /** max lines (caption) */
  maxLines?: number;
  /** max panel width inside the zone (px) */
  maxW?: number;
}
export type ZoneName = 'chip' | 'terms' | 'summary' | 'caption' | 'legend' | 'stage';

export interface FrameLayout {
  width: number;
  height: number;
  format: Format;
  /** type/spacing scale (TYPE tokens × s) */
  s: number;
  /** width / DESIGN.w, height / DESIGN.h (raw ratios) */
  sx: number;
  sy: number;
  /** safe-area margins, px (5% of each side) */
  safe: { left: number; top: number; right: number; bottom: number };
  /** design space for screen-space blocks (scaled by width / space.w) */
  space: { w: number; h: number };
  zones: Record<ZoneName, Zone>;
}

/** Caption box height for n lines at scale s (TYPE.caption, line-height 1.3, padding 9+9 + border slack). */
export const captionHeight = (lines: number, s: number) => Math.ceil((lines * TYPE.caption * 1.3 + 22) * s);
/** Height reserved for the chip zone (fits a date chip or a year counter). */
export const CHIP_ZONE_H = 80;
const GAP = 16;

/** Layout for a frame size (pure; used by the overlays, PlanScene and tools/validate-plan.ts). */
export function frameLayout(width: number, height: number, format: Format = formatOf(width, height)): FrameLayout {
  const short = Math.min(width, height);
  const s = short / DESIGN.h;
  const safe = { left: Math.round(width * 0.05), top: Math.round(height * 0.05), right: Math.round(width * 0.05), bottom: Math.round(height * 0.05) };
  const innerW = width - safe.left - safe.right;
  const space = format === '16:9' ? { w: DESIGN.w, h: DESIGN.h } : format === '9:16' ? { w: DESIGN.h, h: DESIGN.w } : { w: DESIGN.h, h: DESIGN.h };
  const gap = GAP * s;
  const chipH = CHIP_ZONE_H * s;
  const chip: Zone = { x: safe.left, y: safe.top, w: format === '9:16' ? innerW : innerW * 0.5 - gap / 2, h: chipH, anchor: 'tl' };
  const capLines = format === '9:16' ? 3 : 2;
  const capH = captionHeight(capLines, s);
  const caption: Zone = { x: safe.left, y: height - safe.bottom - capH, w: innerW, h: capH, anchor: 'bc', maxLines: capLines, maxW: Math.min(innerW, 980 * s) };
  const captionTop = caption.y - gap;
  // screen-space stage: between the chip row and the caption (VotesDemo used y = 96 at 16:9)
  const stageY = safe.top + 60 * s;
  const stage: Zone = { x: safe.left, y: stageY, w: innerW, h: captionTop - stageY, anchor: 'tl' };
  if (format === '9:16') {
    const termsY = chip.y + chip.h + gap;
    const terms: Zone = { x: safe.left, y: termsY, w: innerW, h: height * 0.32, anchor: 'tl' };
    const legendY = height * 0.5;
    return {
      width, height, format, s, sx: width / DESIGN.w, sy: height / DESIGN.h, safe, space,
      zones: {
        chip, terms, summary: { ...terms }, caption,
        legend: { x: safe.left, y: legendY, w: innerW * 0.7, h: captionTop - legendY, anchor: 'bl' },
        stage,
      },
    };
  }
  const right = width - safe.right;
  const termsY = height * 0.375;
  const legendY = chip.y + chip.h + gap;
  return {
    width, height, format, s, sx: width / DESIGN.w, sy: height / DESIGN.h, safe, space,
    zones: {
      chip,
      summary: { x: width / 2 + gap / 2, y: safe.top, w: right - width / 2 - gap / 2, h: termsY - gap - safe.top, anchor: 'tr' },
      terms: { x: width * 0.6, y: termsY, w: right - width * 0.6, h: captionTop - termsY, anchor: 'tr' },
      legend: { x: safe.left, y: legendY, w: innerW * 0.38, h: captionTop - legendY, anchor: 'bl' },
      caption,
      stage,
    },
  };
}

/** The current composition's layout. */
export function useFrame(): FrameLayout {
  const { width, height } = useVideoConfig();
  return useMemo(() => frameLayout(width, height), [width, height]);
}

/** CSS position for a panel hugging its zone's anchor (frame px). */
export function anchorStyle(z: Zone, frameW: number, frameH: number): CSSProperties {
  const right = frameW - (z.x + z.w);
  const bottom = frameH - (z.y + z.h);
  switch (z.anchor) {
    case 'tl': return { left: z.x, top: z.y };
    case 'tr': return { right, top: z.y };
    case 'bl': return { left: z.x, bottom };
    case 'br': return { right, bottom };
    case 'bc': return { left: z.x, right, bottom, display: 'flex', justifyContent: 'center' };
  }
}

/** Box (frame px) of a w×h panel placed at its zone's anchor. */
export function anchoredBox(z: Zone, w: number, h: number): { x: number; y: number; w: number; h: number } {
  switch (z.anchor) {
    case 'tl': return { x: z.x, y: z.y, w, h };
    case 'tr': return { x: z.x + z.w - w, y: z.y, w, h };
    case 'bl': return { x: z.x, y: z.y + z.h - h, w, h };
    case 'br': return { x: z.x + z.w - w, y: z.y + z.h - h, w, h };
    case 'bc': return { x: z.x + (z.w - w) / 2, y: z.y + z.h - h, w, h };
  }
}

/** A zone in a block's design space (divide by s): for screen-space blocks laid out in `space`. */
export const toDesign = (z: { x: number; y: number; w: number; h: number }, s: number) => ({ x: z.x / s, y: z.y / s, w: z.w / s, h: z.h / s });
