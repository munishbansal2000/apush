/**
 * autoLayout.ts — deterministic, priority-based layout resolver.
 *
 * Pure functions, no React. Testable. Reusable across all components.
 *
 * How it works:
 * 1. Each element declares: id, x, y, w, h, priority (higher = stays put)
 * 2. resolveLayout() computes adjustments so nothing overlaps
 * 3. Lower-priority elements move to avoid higher-priority ones
 * 4. Everything is clamped to canvas bounds
 *
 * Deterministic: same input → same output. No effects, no timing issues.
 * Works in stills, video, and tests.
 */

export interface LayoutElement {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Higher priority = less likely to move. Default 50. */
  priority?: number;
  type?: 'text' | 'image' | 'shape';
  content?: string;
  /**
   * IDs of elements this one is allowed to overlap with.
   * Use for intentional overlaps: bubble tails over characters,
   * decorations over backgrounds, etc.
   */
  allowOverlapWith?: string[];
  /**
   * Overlap group — elements in the same group never resolve against each other.
   * Simpler than listing IDs when several elements are meant to overlap.
   */
  overlapGroup?: string;
}

export interface LayoutAdjustment {
  dx: number;
  dy: number;
}

/** Standard priorities — use these for consistency */
export const Priority = {
  BACKGROUND: 0,
  DECORATION: 10,
  CALLOUT: 40,
  BUBBLE: 50,
  CHARACTER: 80,
  SUBLINE: 90,
  TITLE: 100,
} as const;

/**
 * Compute separation vector to push B away from A.
 * Returns [dx, dy]. Prefers directions that keep B on-canvas
 * and away from the canvas edges.
 */
function separationVector(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  frameW: number, frameH: number,
  padding = 12
): [number, number] {
  const aRight = ax + aw, aBottom = ay + ah;
  const bRight = bx + bw, bBottom = by + bh;

  if (bRight <= ax || bx >= aRight || bBottom <= ay || by >= aBottom) {
    return [0, 0];
  }

  const overlapX = Math.min(aRight - bx, bRight - ax);
  const overlapY = Math.min(aBottom - by, bBottom - ay);

  // Candidate moves with bounds checking
  const moves: Array<{ dx: number; dy: number; ok: boolean }> = [
    { dx: overlapX + padding, dy: 0, ok: bx + overlapX + padding + bw <= frameW },
    { dx: -(overlapX + padding), dy: 0, ok: bx - overlapX - padding >= 0 },
    { dx: 0, dy: overlapY + padding, ok: by + overlapY + padding + bh <= frameH },
    { dx: 0, dy: -(overlapY + padding), ok: by - overlapY - padding >= 0 },
  ];

  // Prefer smallest valid move
  const valid = moves.filter(m => m.ok);
  if (valid.length === 0) return [0, 0];

  // Sort by move distance, prefer the axis with smaller overlap
  valid.sort((a, b) => {
    const da = Math.abs(a.dx) + Math.abs(a.dy);
    const db = Math.abs(b.dx) + Math.abs(b.dy);
    return da - db;
  });

  const best = valid[0];
  return [best.dx, best.dy];
}

/**
 * Resolve layout for all elements.
 *
 * @param elements - All elements with positions and priorities
 * @param frameW - Canvas width
 * @param frameH - Canvas height
 * @returns Map of element id → {dx, dy} adjustment to apply
 */
export function resolveLayout(
  elements: LayoutElement[],
  frameW: number,
  frameH: number
): Map<string, LayoutAdjustment> {
  const adjustments = new Map<string, LayoutAdjustment>();
  const positions = new Map<string, { x: number; y: number }>();

  // Initialize
  for (const el of elements) {
    positions.set(el.id, { x: el.x, y: el.y });
    adjustments.set(el.id, { dx: 0, dy: 0 });
  }

  // Sort by priority descending — higher priority elements are "obstacles"
  const sorted = [...elements].sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));

  // Process lowest-priority first (they move the most)
  const byPriorityAsc = [...sorted].reverse();

  // Helper: can these two elements overlap intentionally?
  const canOverlap = (a: LayoutElement, b: LayoutElement): boolean => {
    if (a.overlapGroup && a.overlapGroup === b.overlapGroup) return true;
    if (a.allowOverlapWith?.includes(b.id)) return true;
    if (b.allowOverlapWith?.includes(a.id)) return true;
    return false;
  };

  for (const el of byPriorityAsc) {
    const p = positions.get(el.id)!;
    const elPriority = el.priority ?? 50;

    // Resolve against all higher-priority elements (unless overlap allowed)
    for (const other of sorted) {
      if (other.id === el.id) continue;
      if ((other.priority ?? 50) <= elPriority) continue;
      if (canOverlap(el, other)) continue;

      const o = positions.get(other.id)!;
      const [dx, dy] = separationVector(
        o.x, o.y, other.w, other.h,
        p.x, p.y, el.w, el.h,
        frameW, frameH
      );

      if (dx !== 0 || dy !== 0) {
        p.x += dx;
        p.y += dy;
        const adj = adjustments.get(el.id)!;
        adjustments.set(el.id, { dx: adj.dx + dx, dy: adj.dy + dy });
      }
    }

    // Clamp to canvas
    const cx = Math.max(0, Math.min(p.x, frameW - el.w));
    const cy = Math.max(0, Math.min(p.y, frameH - el.h));
    if (cx !== p.x || cy !== p.y) {
      const adj = adjustments.get(el.id)!;
      adjustments.set(el.id, {
        dx: adj.dx + (cx - p.x),
        dy: adj.dy + (cy - p.y),
      });
      positions.set(el.id, { x: cx, y: cy });
    }
  }

  return adjustments;
}

/**
 * Check if any elements overlap (for validation warnings).
 * Respects allowOverlapWith and overlapGroup.
 */
export function findOverlaps(
  elements: LayoutElement[]
): Array<{ a: string; b: string }> {
  const overlaps: Array<{ a: string; b: string }> = [];

  const canOverlap = (a: LayoutElement, b: LayoutElement): boolean => {
    if (a.overlapGroup && a.overlapGroup === b.overlapGroup) return true;
    if (a.allowOverlapWith?.includes(b.id)) return true;
    if (b.allowOverlapWith?.includes(a.id)) return true;
    return false;
  };

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const a = elements[i], b = elements[j];
      if (canOverlap(a, b)) continue;
      if (
        b.x < a.x + a.w &&
        a.x < b.x + b.w &&
        b.y < a.y + a.h &&
        a.y < b.y + b.h
      ) {
        overlaps.push({ a: a.id, b: b.id });
      }
    }
  }
  return overlaps;
}

/**
 * Check if any elements are cut off by canvas bounds.
 */
export function findClipped(
  elements: LayoutElement[],
  frameW: number,
  frameH: number
): Array<{ id: string; edge: string }> {
  const clipped: Array<{ id: string; edge: string }> = [];
  for (const el of elements) {
    if (el.x < 0) clipped.push({ id: el.id, edge: 'left' });
    if (el.y < 0) clipped.push({ id: el.id, edge: 'top' });
    if (el.x + el.w > frameW) clipped.push({ id: el.id, edge: 'right' });
    if (el.y + el.h > frameH) clipped.push({ id: el.id, edge: 'bottom' });
  }
  return clipped;
}
