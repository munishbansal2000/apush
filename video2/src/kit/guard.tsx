/**
 * Runtime layout guard: measures the real DOM every frame.
 *
 * Every element the shell mounts is wrapped in <Track>. After each frame commits, the
 * guard measures each track (the union of its visible descendants, so it works for any
 * component, including the production library) and reports:
 *   cut      element extends past the frame edge
 *   unsafe   element leaves the safe area (chrome may opt out)
 *   overlap  two tracks intersect (unless one is marked allowOverlap)
 *   clipped  text overflows a box that hides overflow
 *   overflow text spills past its visible panel (background/border) that does NOT hide overflow
 *   empty    a visible panel whose text is all still invisible (it appeared too early)
 *
 * [data-guard-item="name"] marks individual parts (map labels, ships, pills). Items are
 * checked against each other (same or different track), against every other non-cover
 * track's box, and for being partly cut by the frame edge. This is how world-space elements
 * inside a full-frame camera layer (role "cover") are tracked: the layer itself is exempt,
 * its items are not. Elements inside a nested <Track> belong to that track only.
 * [data-guard-moving] marks elements in intentional transit (a <Slide> entrance/exit, a camera
 * move); they are skipped while it is set and judged again once they settle.
 *
 * Reports go to the browser console as `[kit-layout] {json}`; tools/contact-sheet.ts
 * collects them through renderStill's onBrowserLog and fails the run. In Remotion Studio
 * offending elements get red outlines.
 */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { getRemotionEnvironment, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Rect } from './layout';

/** The subset of render-config the guard needs (RenderConfig satisfies it). */
export interface GuardCfg { safe: Rect; guard: { overlapMinArea: number; clipTolerancePx: number; epsilon: number } }

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

export interface GuardIssue { kind: 'cut' | 'unsafe' | 'overlap' | 'clipped' | 'overflow' | 'empty'; id: string; other?: string; rect: Rect; detail: string }

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
const XHTML = 'http://www.w3.org/1999/xhtml';
const isPanel = (cs: CSSStyleDeclaration) =>
  (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || cs.backgroundImage !== 'none' ||
  (['Top', 'Right', 'Bottom', 'Left'] as const).some(sd => parseFloat(cs[`border${sd}Width`]) > 0 && cs[`border${sd}Style`] !== 'none');
const ownText = (d: Element) => [...d.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim());

export function measureTracks(root: HTMLElement, cfg: GuardCfg, frame?: { width: number; height: number }): { boxes: Map<string, { rect: Rect; role: string; el: HTMLElement }>; issues: GuardIssue[] } {
  const rootRect = root.getBoundingClientRect();
  // A single-frame render can measure the root before its parent is laid out (0x0); the root always covers the
  // composition frame, so measure against that size instead of dividing by zero.
  const W = rootRect.width || frame?.width || 1;
  const H = rootRect.height || frame?.height || 1;
  const toFrac = (r: DOMRect): Rect => [(r.left - rootRect.left) / W, (r.top - rootRect.top) / H, (r.right - rootRect.left) / W, (r.bottom - rootRect.top) / H];
  const boxes = new Map<string, { rect: Rect; role: string; el: HTMLElement }>();
  const issues: GuardIssue[] = [];
  const tol = cfg.guard.clipTolerancePx;
  const allItems: { el: HTMLElement; name: string; r: DOMRect; raw: DOMRect; track: string }[] = [];

  /**
   * What is actually visible of an element: its box intersected with every ancestor (up to
   * the track) that clips overflow. Without this, an SVG path or an image scaled inside an
   * overflow:hidden card reports its full geometry and looks "cut" or "overlapping".
   */
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
    // elements in a nested track belong to it; elements mid-entrance/exit or under a moving
    // camera ([data-guard-moving]) are in intentional transit and are not judged this frame
    const mine = (el: Element) => el.closest('[data-track]') === track && !el.closest('[data-guard-moving]');
    track.querySelectorAll<HTMLElement>('*').forEach(el => {
      if (!mine(el)) return;
      const raw = el.getBoundingClientRect();
      if (raw.width < 1 || raw.height < 1) return;
      // layout-only wrappers (exit/pop/stage containers) are measured through their children
      if (el.hasAttribute('data-guard-wrapper')) return;
      // full-frame wrappers of Sequences/AbsoluteFill don't count, only content
      if (raw.width >= W - 1 && raw.height >= H - 1 && el.children.length > 0) return;
      const clip = clipOf(el, track);
      const r = clip ? intersectDom(raw, clip) : raw;
      if (r.width < 1 || r.height < 1) return; // fully clipped away
      if (effectiveOpacity(el, track) < 0.05) return;
      const f = toFrac(r);
      u = u ? [Math.min(u[0], f[0]), Math.min(u[1], f[1]), Math.max(u[2], f[2]), Math.max(u[3], f[3])] : f;
      // clipped = TEXT cut off by a container that hides overflow. Images cropped by a
      // clipping frame (camera zooms, covers) are intentional and not reported.
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
            const what = (d.dataset.kit ?? el.dataset.kit ?? d.tagName.toLowerCase());
            issues.push({ kind: 'clipped', id, rect: f, detail: `<${what}> text cut off by ${Math.round(over)}px: "${(d.textContent ?? '').trim().slice(0, 40)}"` });
            break;
          }
        }
      }
      // overflow = HTML text spilling past its nearest visible panel that lets it show
      if (el.namespaceURI === XHTML && ownText(el)) {
        for (let p = el.parentElement; p && p !== track; p = p.parentElement) {
          const pcs = getComputedStyle(p);
          if (!isPanel(pcs)) continue;
          if (pcs.overflow !== 'visible') break; // that's the 'clipped' case
          const range = document.createRange();
          range.selectNodeContents(el);
          const tr = range.getBoundingClientRect();
          const box = p.getBoundingClientRect();
          const over = Math.max(box.left - tr.left, tr.right - box.right, box.top - tr.top, tr.bottom - box.bottom);
          if (over > tol) issues.push({ kind: 'overflow', id, rect: f, detail: `text spills ${Math.round(over)}px out of its panel: "${(el.textContent ?? '').trim().slice(0, 40)}"` });
          break;
        }
      }
      // empty = a visible panel holding text, none of which is visible yet
      if (el.namespaceURI === XHTML && isPanel(cs) && raw.width > 40 && raw.height > 30 && effectiveOpacity(el, track) > 0.5) {
        const texts = [el, ...el.querySelectorAll<HTMLElement>('*')].filter(ownText);
        if (texts.length && texts.every(d => effectiveOpacity(d, track) < 0.05)) {
          issues.push({ kind: 'empty', id, rect: f, detail: 'panel is visible but all its text is still invisible' });
        }
      }
    });
    // internal layout: [data-guard-item] parts of one component must not overlap each other
    const items = [...track.querySelectorAll<HTMLElement>('[data-guard-item]')]
      .filter(mine)
      .map(el => {
        const raw = el.getBoundingClientRect();
        const clip = clipOf(el, track);
        const r = clip ? intersectDom(raw, clip) : raw;
        return { el, name: el.dataset.guardItem!, r, vis: effectiveOpacity(el, track) };
      })
      .filter(x => x.r.width >= 1 && x.r.height >= 1 && x.vis > 0.05);
    allItems.push(...items.map(x => ({ ...x, track: id, raw: x.el.getBoundingClientRect() })));
    for (let a = 0; a < items.length; a++) {
      for (let b = a + 1; b < items.length; b++) {
        const A = items[a];
        const B = items[b];
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        const w = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
        const h = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
        if (w > tol * 2 && h > tol * 2) {
          issues.push({ kind: 'overlap', id, other: `${id}#${A.name}×${B.name}`, rect: toFrac(A.r), detail: `inside ${id}: "${A.name}" overlaps "${B.name}" by ${Math.round(w)}×${Math.round(h)}px` });
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
    } else if (!track.dataset.allowUnsafe && (rect[0] < cfg.safe[0] - e || rect[1] < cfg.safe[1] - e || rect[2] > cfg.safe[2] + e || rect[3] > cfg.safe[3] + e)) {
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
        issues.push({ kind: 'overlap', id: ia, other: ib, rect: a.rect, detail: `overlaps ${ib} (${(w * 100).toFixed(1)}% × ${(h * 100).toFixed(1)}%)` });
      }
    }
  }
  // items: partly outside the frame, or colliding with another track's box / item
  const fr = new DOMRect(rootRect.left, rootRect.top, W, H);
  for (const it of allItems) {
    const v = intersectDom(it.raw, fr);
    const shown = v.width * v.height;
    if (shown > 0 && shown < it.raw.width * it.raw.height - tol * Math.max(it.raw.width, it.raw.height)) {
      issues.push({ kind: 'cut', id: it.track, other: `${it.track}#${it.name}`, rect: toFrac(v), detail: `"${it.name}" is partly outside the frame` });
    }
  }
  for (const it of allItems) {
    const a = toFrac(it.r);
    for (const [ib, b] of list) {
      if (ib === it.track || b.el.dataset.allowOverlap || b.el.contains(it.el)) continue;
      const w = Math.min(a[2], b.rect[2]) - Math.max(a[0], b.rect[0]);
      const h = Math.min(a[3], b.rect[3]) - Math.max(a[1], b.rect[1]);
      if (w * W > tol * 2 && h * H > tol * 2) issues.push({ kind: 'overlap', id: it.track, other: `${it.track}#${it.name}×${ib}`, rect: a, detail: `"${it.name}" is under/over ${ib}` });
    }
  }
  for (let i = 0; i < allItems.length; i++) {
    for (let j = i + 1; j < allItems.length; j++) {
      const A = allItems[i];
      const B = allItems[j];
      if (A.track === B.track) continue; // same-track pairs were checked above
      const w = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
      const h = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
      if (w > tol * 2 && h > tol * 2) issues.push({ kind: 'overlap', id: A.track, other: `${A.track}#${A.name}×${B.track}#${B.name}`, rect: toFrac(A.r), detail: `"${A.name}" overlaps "${B.name}"` });
    }
  }
  return { boxes, issues };
}

export const LayoutGuard: React.FC<{ cfg: GuardCfg; rootRef: React.RefObject<HTMLDivElement | null> }> = ({ cfg, rootRef }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const studio = getRemotionEnvironment().isStudio;
  const [outlines, setOutlines] = useState<GuardIssue[]>([]);
  const last = useRef('');

  useLayoutEffect(() => {
    // On mount React runs this (child) layout effect before attaching the parent's rootRef, so a single-frame render
    // (renderStill, the first frame of a segment) would see null and never report. The DOM is already in place: find it.
    const root = rootRef.current ?? document.querySelector<HTMLDivElement>('[data-kit-root]');
    if (!root) return;
    const { boxes, issues } = measureTracks(root, cfg, { width, height });
    // Heartbeat: proves the guard measured this frame, so a silent guard can't pass for a clean render.
    if (!studio) console.warn(`[kit-layout-ok] ${JSON.stringify({ frame, tracks: Object.fromEntries([...boxes].map(([id, b]) => [id, b.rect.map(v => +v.toFixed(3))])) })}`);
    const key = JSON.stringify(issues.map(i => [i.kind, i.id, i.other]));
    if (issues.length) console.warn(`[kit-layout] ${JSON.stringify({ frame, issues: issues.map(({ kind, id, other, detail, rect }) => ({ kind, id, other, detail, rect: rect.map(v => +v.toFixed(3)) })) })}`);
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
            position: 'absolute', left: `${i.rect[0] * 100}%`, top: `${i.rect[1] * 100}%`,
            width: `${(i.rect[2] - i.rect[0]) * 100}%`, height: `${(i.rect[3] - i.rect[1]) * 100}%`,
            outline: '3px solid #ff3b30', zIndex: 200, pointerEvents: 'none',
          }}
        >
          <span style={{ background: '#ff3b30', color: '#fff', fontSize: 14, fontFamily: 'monospace', padding: '1px 4px' }}>
            {i.kind}: {i.id}{i.other ? ` × ${i.other}` : ''}
          </span>
        </div>
      ))}
    </>
  );
};
