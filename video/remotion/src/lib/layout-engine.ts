/**
 * Static layout engine: estimated footprints + collision detection without a browser.
 *
 * The runtime LayoutGuard (lib/guard.tsx) measures real DOM. This module estimates
 * rects at build time from text metrics, so the validator can catch overlaps
 * before rendering.
 *
 * Ported from apush-episode-kit/src/kit/layout.ts (rect math) and
 * layout-engine.ts (collision detection). Simplified: no auto-fix, just detection.
 * Auto-fix (L001-L005) comes later.
 */

export type Rect = [number, number, number, number];

/** Text level metrics (conservative estimates). */
const LEVEL_METRICS: Record<string, { fontPx: number; lineHeight: number; maxChars: number }> = {
  hero: { fontPx: 88, lineHeight: 1.1, maxChars: 30 },
  title: { fontPx: 68, lineHeight: 1.15, maxChars: 40 },
  subtitle: { fontPx: 46, lineHeight: 1.2, maxChars: 60 },
  body: { fontPx: 34, lineHeight: 1.3, maxChars: 100 },
};

/** Approximate glyph width as fraction of font size. */
const GLYPH_W = { upper: 0.7, lower: 0.5, digit: 0.55, space: 0.3, other: 0.6 };

function measureWidth(text: string, fontPx: number): number {
  let w = 0;
  for (const ch of text) {
    if (ch === ' ') w += GLYPH_W.space;
    else if (/\p{Lu}/u.test(ch)) w += GLYPH_W.upper;
    else if (/\p{Ll}/u.test(ch)) w += GLYPH_W.lower;
    else if (/\p{N}/u.test(ch)) w += GLYPH_W.digit;
    else w += GLYPH_W.other;
  }
  return w * fontPx;
}

/** Greedy wrap by measured width. */
export function wrapLines(text: string, maxWidthPx: number, fontPx: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (!line || measureWidth(next, fontPx) <= maxWidthPx) line = next;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
}

const centered = (cx: number, cy: number, w: number, h: number): Rect => [
  cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2,
];

/** Estimate the screen rect of a text element. Assumes 1280×720. */
export function textRect(
  text: string,
  level: string,
  pos: [number, number],
  canvasW = 1280,
  canvasH = 720,
): Rect {
  const m = LEVEL_METRICS[level] ?? LEVEL_METRICS.body;
  const maxW = canvasW * 0.8;
  const lines = wrapLines(text, maxW, m.fontPx);
  const w = Math.max(...lines.map(l => measureWidth(l, m.fontPx)), 1) / canvasW;
  const h = (lines.length * m.lineHeight * m.fontPx) / canvasH;
  return centered(pos[0], pos[1], Math.min(w, 0.9), h);
}

/** Estimate the screen rect of a speech bubble. */
export function bubbleRect(
  text: string,
  widthPx: number,
  pos: [number, number],
  canvasH = 720,
): Rect {
  const fontPx = 28;
  const inner = widthPx - 48;
  const lines = wrapLines(text, inner, fontPx).length;
  const h = (lines * 36 + 48 + 24) / canvasH;
  return centered(pos[0], pos[1], widthPx / 1280, h);
}

export const intersects = (a: Rect, b: Rect, pad = 0): boolean =>
  a[0] < b[2] - pad && b[0] < a[2] - pad && a[1] < b[3] - pad && b[1] < a[3] - pad;

export interface TimedRect {
  id: string;
  rect: Rect;
  start: number;
  end: number;
}

export interface LayoutIssue {
  level: 'error' | 'warn';
  code: string;
  where: string;
  msg: string;
}

/**
 * Check a list of timed rects for overlaps.
 * Only reports pairs that overlap in both space AND time.
 */
export function checkCollisions(rects: TimedRect[]): LayoutIssue[] {
  const issues: LayoutIssue[] = [];

  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];

      // Time overlap?
      if (a.end <= b.start || b.end <= a.start) continue;

      // Space overlap?
      if (intersects(a.rect, b.rect, 0.01)) {
        const overlapW = Math.min(a.rect[2], b.rect[2]) - Math.max(a.rect[0], b.rect[0]);
        const overlapH = Math.min(a.rect[3], b.rect[3]) - Math.max(a.rect[1], b.rect[1]);
        // Ignore tiny overlaps (< 2% of screen)
        if (overlapW * overlapH < 0.0004) continue;

        issues.push({
          level: 'warn',
          code: 'B003',
          where: `${a.id} × ${b.id}`,
          msg: `layout collision: ${(overlapW * 100).toFixed(1)}% × ${(overlapH * 100).toFixed(1)}% overlap`,
        });
      }
    }
  }

  return issues;
}

/**
 * Check rects against the head region (bottom-right, 26% size).
 * Their kit uses render-config; we use a fixed estimate.
 */
export function checkHeadCollisions(
  rects: TimedRect[],
  headRect: Rect = [0.72, 0.68, 0.98, 0.98],
): LayoutIssue[] {
  const issues: LayoutIssue[] = [];

  for (const r of rects) {
    if (intersects(r.rect, headRect, 0.01)) {
      issues.push({
        level: 'warn',
        code: 'B010',
        where: r.id,
        msg: `overlaps the head region (bottom-right)`,
      });
    }
  }

  return issues;
}
