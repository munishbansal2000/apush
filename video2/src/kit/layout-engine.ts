/**
 * Layout engine: every element on screen as a timed box, plus a self-correcting
 * placement pass for movable beats.
 *
 * - Fixed chrome (head, box tracker, ribbon, captions, credit) is always present.
 * - Timed overlays (pause cards, reveals, trap cards, term chips, chapter banners,
 *   title card) are present for their windows.
 * - Stage components (maps, sources, diagrams…) occupy the stage and never move.
 * - Text and bubbles are movable. If one collides or leaves the safe area, the engine
 *   tries other vertical slots, then a smaller level, then clamps it into bounds.
 *   Every correction is logged (L001–L003). Only unfixable cases are errors.
 *
 * The shell renders the corrected positions; the validator reports the log. The runtime
 * guard (guard.tsx) then measures the real DOM to catch anything the estimates missed.
 */
import { beatRect, fmtRect, inside, intersects, STAGE_KINDS, textRect, type Rect, type RenderConfig } from './layout';
import type { Issue, ResolvedBeat, TextLevel } from './types';

export interface TimedBox {
  id: string;
  role: 'chrome' | 'overlay' | 'stage' | 'text';
  rect: Rect;
  start: number;
  end: number;
}

export interface OverlayWindow { id: string; rect: Rect; start: number; end: number; /** beats may not appear at all under it */ exclusive?: boolean }

const DOWNGRADE: Record<TextLevel, TextLevel | null> = { hero: 'title', title: 'subtitle', subtitle: 'body', body: null };
const overlapsT = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;

export function chromeBoxes(cfg: RenderConfig, totalSec: number): TimedBox[] {
  const always = (id: string, rect: Rect): TimedBox => ({ id, role: 'chrome', rect, start: 0, end: totalSec });
  return [
    always('chrome:head', cfg.head.rect),
    always('chrome:box-tracker', cfg.boxTracker.rect),
    always('chrome:ribbon', cfg.ribbon.rect),
    always('chrome:captions', cfg.captions.rect),
    always('chrome:credit', cfg.credit.rect),
  ];
}

export interface LayoutResult {
  beats: ResolvedBeat[];
  boxes: TimedBox[];
  issues: Issue[];
}

export function resolveLayout(beats: ResolvedBeat[], overlays: OverlayWindow[], cfg: RenderConfig, totalSec: number): LayoutResult {
  const issues: Issue[] = [];
  const fixed: TimedBox[] = [
    ...chromeBoxes(cfg, totalSec),
    ...overlays.map(o => ({ id: o.id, role: 'overlay' as const, rect: o.rect, start: o.start, end: o.end })),
  ];
  const placed: TimedBox[] = [];
  const out: ResolvedBeat[] = [];
  // where each text beat ended up, to keep reading order when later lines move
  const finalY = new Map<string, { turnIdx: number; origY: number; y: number; start: number; end: number }>();

  // Exclusive overlays (pause cards) can't share time with anything: not fixable by moving.
  for (const b of beats) {
    if (b.kind === 'bg') continue;
    for (const o of overlays.filter(x => x.exclusive)) {
      if (overlapsT(b, o)) issues.push({ level: 'error', code: 'B010', where: `beat:${b.id}`, msg: `on screen during ${o.id}; move the beat or end it earlier` });
    }
  }

  // Stage components first: immovable.
  for (const b of beats.filter(x => STAGE_KINDS.has(x.kind))) {
    const box: TimedBox = { id: `beat:${b.id}`, role: 'stage', rect: beatRect(b, cfg) ?? cfg.stage, start: b.start, end: b.end };
    for (const other of [...fixed, ...placed]) {
      if (other.role === 'chrome' || !overlapsT(box, other) || !intersects(box.rect, other.rect, 0.005)) continue;
      issues.push({ level: 'error', code: 'B003', where: box.id, msg: `stage component overlaps ${other.id} for ${dur(box, other)}s (stage components cannot move)` });
    }
    placed.push(box);
  }

  const collides = (rect: Rect, b: { start: number; end: number }) =>
    [...fixed, ...placed].find(o => overlapsT(b, o) && intersects(rect, o.rect, 0.004));
  const inBounds = (r: Rect) => inside(r, cfg.safe);

  for (const b of beats) {
    if (b.kind !== 'text' && b.kind !== 'bubble') {
      out.push(b);
      continue;
    }
    const where = `beat:${b.id}`;
    const rectFor = (pos: [number, number], level?: TextLevel): Rect => {
      if (b.kind !== 'text') return beatRect({ ...b, position: pos } as ResolvedBeat, cfg)!;
      const r = textRect(b.text, level ?? b.level, pos, cfg);
      return b.entrance === 'stamp' ? inflate(r, cfg.text.stampOvershoot) : r;
    };

    const tryPlace = (pos: [number, number], level?: TextLevel) => {
      const r = rectFor(pos, level);
      return inBounds(r) && !collides(r, b) ? r : null;
    };

    const original = b.position;
    let rect = tryPlace(original);
    let finalPos = original;
    let finalLevel: TextLevel | undefined = b.kind === 'text' ? b.level : undefined;

    if (!rect) {
      const blocker = collides(rectFor(original), b);
      const reason = blocker ? `overlapped ${blocker.id}` : `left the safe area ${fmtRect(rectFor(original))}`;
      // 1) other vertical slots, nearest first; 2) smaller levels; 3) clamp x into bounds
      // reading order: never move a line above one that was authored above it in the same turn
      const floor = Math.max(
        -1,
        ...[...finalY.values()].filter(v => v.turnIdx === b.turnIdx && v.origY < original[1] && v.start < b.end && b.start < v.end).map(v => v.y),
      );
      const slots = [...cfg.textSlotsY].filter(y => y > floor).sort((a, c) => Math.abs(a - original[1]) - Math.abs(c - original[1]));
      const levels: (TextLevel | undefined)[] = [finalLevel];
      for (let l = finalLevel; l && DOWNGRADE[l]; l = DOWNGRADE[l]!) levels.push(DOWNGRADE[l]!);
      search: for (const level of levels) {
        for (const y of [...(original[1] > floor ? [original[1]] : []), ...slots]) {
          // x: as authored, clamped into bounds, then the centre of the stage's right half
          // (clears lower-left figure cards) before giving up on this size
          const rightHalf = (cfg.figureCard.rect[2] + cfg.stage[2]) / 2;
          for (const x of [original[0], clampX(rectFor([original[0], y], level), original[0], cfg), rightHalf]) {
            const r = tryPlace([x, y], level);
            if (r) {
              rect = r;
              finalPos = [x, y];
              finalLevel = level;
              break search;
            }
          }
        }
      }
      if (rect) {
        const moved = finalPos[1] !== original[1] || finalPos[0] !== original[0];
        const shrunk = b.kind === 'text' && finalLevel !== b.level;
        issues.push({
          level: 'info',
          code: shrunk ? 'L002' : moved && finalPos[1] === original[1] ? 'L003' : 'L001',
          where,
          msg: `${reason}; auto-${shrunk ? `shrunk to ${finalLevel} and ` : ''}placed at [${finalPos.map((v: number) => v.toFixed(2)).join(', ')}]`,
        });
      } else {
        const r = rectFor(original);
        const blocker2 = collides(r, b);
        issues.push({
          level: 'error',
          code: blocker2 ? 'B003' : 'B004',
          where,
          msg: `${reason}; no free slot found at any size. End an overlapping element earlier or cut this beat`,
        });
        rect = r;
      }
    }
    const fixedBeat = (b.kind === 'text' ? { ...b, position: finalPos, level: finalLevel! } : { ...b, position: finalPos }) as ResolvedBeat;
    placed.push({ id: where, role: 'text', rect, start: b.start, end: b.end });
    finalY.set(b.id, { turnIdx: b.turnIdx, origY: original[1], y: finalPos[1], start: b.start, end: b.end });
    out.push(fixedBeat);
  }

  return { beats: out, boxes: [...fixed, ...placed], issues };
}

/** Scale a rect about its centre (reserve room for scale animations). */
export const inflate = (r: Rect, k: number): Rect => {
  const cx = (r[0] + r[2]) / 2;
  const cy = (r[1] + r[3]) / 2;
  const hw = ((r[2] - r[0]) / 2) * k;
  const hh = ((r[3] - r[1]) / 2) * k;
  return [cx - hw, cy - hh, cx + hw, cy + hh];
};

function clampX(r: Rect, cx: number, cfg: RenderConfig): number {
  const [x0, , x1] = r;
  const [s0, , s1] = cfg.safe;
  const maxRight = Math.min(s1, cfg.head.rect[0], cfg.boxTracker.rect[0]) - 0.005;
  if (x0 < s0) return cx + (s0 - x0) + 0.005;
  if (x1 > maxRight) return cx - (x1 - maxRight);
  return cx;
}

const dur = (a: TimedBox, b: TimedBox) => (Math.min(a.end, b.end) - Math.max(a.start, b.start)).toFixed(1);
