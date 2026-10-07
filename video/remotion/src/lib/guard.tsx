/**
 * Runtime layout guard: measures the real DOM every frame.
 *
 * Every element the shell mounts is wrapped in <Track>. After each frame commits, the
 * guard measures each track (the union of its visible descendants, so it works for any
 * component) and reports:
 *   cut      element extends past the frame edge
 *   unsafe   element leaves the safe area (chrome may opt out)
 *   overlap  two tracks intersect (unless one is marked allowOverlap)
 *   clipped  text overflows a box that hides overflow
 *
 * Reports go to the browser console as `[layout-guard] {json}`; the contact sheet
 * tool collects them through renderStill's onBrowserLog and fails the run.
 * In Remotion Studio offending elements get red outlines.
 *
 * Ported from apush-episode-kit/src/kit/guard.tsx.
 */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { getRemotionEnvironment, useCurrentFrame } from 'remotion';

export type Rect = [number, number, number, number];

/** Minimal config the guard needs. Full render-config.json comes later. */
export interface GuardConfig {
  /** Safe area as fractions [x1, y1, x2, y2]. */
  safe: Rect;
  guard: {
    /** Minimum overlap area (fraction²) to report. */
    overlapMinArea: number;
    /** Pixel tolerance for clip detection. */
    clipTolerancePx: number;
    /** Epsilon for edge detection (fractions). */
    epsilon: number;
  };
}

/** Default config: 5% safe margins, sensible tolerances. Prefer render-config.json. */
export const DEFAULT_GUARD_CONFIG: GuardConfig = {
  safe: [0.05, 0.05, 0.95, 0.95],
  guard: {
    overlapMinArea: 0.0001,
    clipTolerancePx: 2,
    epsilon: 0.001,
  },
};

/** Load GuardConfig from render-config.json (subset of the full config). */
export function guardConfigFromRenderConfig(rc: {
  safe: Rect;
  guard: { overlapMinArea: number; clipTolerancePx: number; epsilon: number };
}): GuardConfig {
  return { safe: rc.safe, guard: rc.guard };
}

export type TrackRole = 'chrome' | 'overlay' | 'stage' | 'text' | 'cover' | 'bg';

export const Track: React.FC<{
  id: string;
  role: TrackRole;
  allowOverlap?: boolean;
  allowUnsafe?: boolean;
  children: React.ReactNode;
}> = ({ id, role, allowOverlap, allowUnsafe, children }) => (
  <div
    data-track={id}
    data-role={role}
    data-allow-overlap={allowOverlap ? '1' : undefined}
    data-allow-unsafe={allowUnsafe ? '1' : undefined}
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
  >
    {children}
  </div>
);

/** Spread onto any purely structural wrapper div (no visual of its own) so the guard skips it. */
export const GUARD_WRAPPER = { 'data-guard-wrapper': '' } as const;

export interface GuardIssue {
  kind: 'cut' | 'unsafe' | 'overlap' | 'clipped';
  id: string;
  other?: string;
  rect: Rect;
  detail: string;
}

const intersectDom = (a: DOMRect, b: DOMRect): DOMRect => {
  const x = Math.max(a.left, b.left);
  const y = Math.max(a.top, b.top);
  return new DOMRect(x, y, Math.max(0, Math.min(a.right, b.right) - x), Math.max(0, Math.min(a.bottom, b.bottom) - y));
};

const effectiveOpacity = (el: Element, stop: Element): number => {
  let o = 1;
  for (let e: Element | null = el; e && e !== stop.parentElement; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
    o *= Number(cs.opacity);
  }
  return o;
};

/** Measure all tracks under `root`. Pure DOM; exported for tests and tools. */
export function measureTracks(root: HTMLElement, cfg: GuardConfig): {
  boxes: Map<string, { rect: Rect; role: string; el: HTMLElement }>;
  issues: GuardIssue[];
} {
  const rootRect = root.getBoundingClientRect();
  const W = rootRect.width;
  const H = rootRect.height;
  const toFrac = (r: DOMRect): Rect => [
    (r.left - rootRect.left) / W,
    (r.top - rootRect.top) / H,
    (r.right - rootRect.left) / W,
    (r.bottom - rootRect.top) / H,
  ];
  const boxes = new Map<string, { rect: Rect; role: string; el: HTMLElement }>();
  const issues: GuardIssue[] = [];
  const tol = cfg.guard.clipTolerancePx;

  const clipCache = new Map<Element, DOMRect | null>();
  const clipOf = (el: Element, stop: Element): DOMRect | null => {
    if (el === stop || !el.parentElement) return null;
    if (clipCache.has(el)) return clipCache.get(el)!;
    const parent = el.parentElement;
    let clip = clipOf(parent, stop);
    const cs = getComputedStyle(parent);
    if (cs.overflow !== 'visible' || cs.clipPath !== 'none') {
      const pr = parent.getBoundingClientRect();
      clip = clip ? intersectDom(clip, pr) : pr;
    }
    clipCache.set(el, clip);
    return clip;
  };

  root.querySelectorAll<HTMLElement>('[data-track]').forEach(track => {
    const id = track.dataset.track!;
    let u: Rect | null = null;
    track.querySelectorAll<HTMLElement>('*').forEach(el => {
      const raw = el.getBoundingClientRect();
      if (raw.width < 1 || raw.height < 1) return;
      if (el.hasAttribute('data-guard-wrapper')) return;
      if (raw.width >= W - 1 && raw.height >= H - 1 && el.children.length > 0) return;
      const clip = clipOf(el, track);
      const r = clip ? intersectDom(raw, clip) : raw;
      if (r.width < 1 || r.height < 1) return;
      if (effectiveOpacity(el, track) < 0.05) return;
      const f = toFrac(r);
      u = u
        ? [Math.min(u[0], f[0]), Math.min(u[1], f[1]), Math.max(u[2], f[2]), Math.max(u[3], f[3])]
        : f;
      const cs = getComputedStyle(el);
      if (cs.overflow !== 'visible' && (el.scrollWidth > el.clientWidth + tol || el.scrollHeight > el.clientHeight + tol)) {
        const box = el.getBoundingClientRect();
        for (const d of [el, ...el.querySelectorAll<HTMLElement>('*')]) {
          const ownText = [...d.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim());
          if (!ownText) continue;
          const range = document.createRange();
          range.selectNodeContents(d);
          const tr = range.getBoundingClientRect();
          const over = Math.max(box.left - tr.left, tr.right - box.right, box.top - tr.top, tr.bottom - box.bottom);
          if (over > tol) {
            const what = d.tagName.toLowerCase();
            issues.push({
              kind: 'clipped',
              id,
              rect: f,
              detail: `<${what}> text cut off by ${Math.round(over)}px: "${(d.textContent ?? '').trim().slice(0, 40)}"`,
            });
            break;
          }
        }
      }
    });
    const items = [...track.querySelectorAll<HTMLElement>('[data-guard-item]')]
      .map(el => {
        const raw = el.getBoundingClientRect();
        const clip = clipOf(el, track);
        const r = clip ? intersectDom(raw, clip) : raw;
        return { el, name: el.dataset.guardItem!, r, vis: effectiveOpacity(el, track) };
      })
      .filter(x => x.r.width >= 1 && x.r.height >= 1 && x.vis > 0.05);
    for (let a = 0; a < items.length; a++) {
      for (let b = a + 1; b < items.length; b++) {
        const A = items[a];
        const B = items[b];
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        const w = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
        const h = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
        if (w > tol * 2 && h > tol * 2) {
          issues.push({
            kind: 'overlap',
            id,
            other: `${id}#${A.name}×${B.name}`,
            rect: toFrac(A.r),
            detail: `inside ${id}: "${A.name}" overlaps "${B.name}" by ${Math.round(w)}×${Math.round(h)}px`,
          });
        }
      }
    }
    if (!u) return;
    const rect = u as Rect;
    boxes.set(id, { rect, role: track.dataset.role!, el: track });
    const role = track.dataset.role;
    if (role === 'cover' || role === 'bg') return;
    const e = cfg.guard.epsilon;
    if (rect[0] < -e || rect[1] < -e || rect[2] > 1 + e || rect[3] > 1 + e) {
      issues.push({ kind: 'cut', id, rect, detail: 'extends past the frame edge' });
    } else if (
      !track.dataset.allowUnsafe &&
      (rect[0] < cfg.safe[0] - e || rect[1] < cfg.safe[1] - e || rect[2] > cfg.safe[2] + e || rect[3] > cfg.safe[3] + e)
    ) {
      issues.push({ kind: 'unsafe', id, rect, detail: 'leaves the safe area' });
    }
  });

  const list = [...boxes.entries()].filter(([, b]) => b.role !== 'cover' && b.role !== 'bg');
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [ia, a] = list[i];
      const [ib, b] = list[j];
      if (a.el.dataset.allowOverlap || b.el.dataset.allowOverlap) continue;
      const w = Math.min(a.rect[2], b.rect[2]) - Math.max(a.rect[0], b.rect[0]);
      const h = Math.min(a.rect[3], b.rect[3]) - Math.max(a.rect[1], b.rect[1]);
      if (w > cfg.guard.epsilon && h > cfg.guard.epsilon && w * h > cfg.guard.overlapMinArea) {
        issues.push({
          kind: 'overlap',
          id: ia,
          other: ib,
          rect: a.rect,
          detail: `overlaps ${ib} (${(w * 100).toFixed(1)}% × ${(h * 100).toFixed(1)}%)`,
        });
      }
    }
  }
  return { boxes, issues };
}

export const LayoutGuard: React.FC<{
  cfg: GuardConfig;
  rootRef: React.RefObject<HTMLDivElement | null>;
}> = ({ cfg, rootRef }) => {
  const frame = useCurrentFrame();
  const studio = getRemotionEnvironment().isStudio;
  const [outlines, setOutlines] = useState<GuardIssue[]>([]);
  const last = useRef('');

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const { issues } = measureTracks(root, cfg);
    const key = JSON.stringify(issues.map(i => [i.kind, i.id, i.other]));
    if (issues.length)
      console.warn(
        `[layout-guard] ${JSON.stringify({
          frame,
          issues: issues.map(({ kind, id, other, detail, rect }) => ({
            kind,
            id,
            other,
            detail,
            rect: rect.map(v => +v.toFixed(3)),
          })),
        })}`
      );
    if (studio && key !== last.current) {
      last.current = key;
      setOutlines(issues);
    }
  });

  if (!studio) return null;
  return (
    <>
      {outlines.map((i, n) => (
        <div
          key={n}
          style={{
            position: 'absolute',
            left: `${i.rect[0] * 100}%`,
            top: `${i.rect[1] * 100}%`,
            width: `${(i.rect[2] - i.rect[0]) * 100}%`,
            height: `${(i.rect[3] - i.rect[1]) * 100}%`,
            outline: '3px solid #ff3b30',
            zIndex: 200,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              background: '#ff3b30',
              color: '#fff',
              fontSize: 14,
              fontFamily: 'monospace',
              padding: '1px 4px',
            }}
          >
            {i.kind}: {i.id}
            {i.other ? ` × ${i.other}` : ''}
          </span>
        </div>
      ))}
    </>
  );
};
