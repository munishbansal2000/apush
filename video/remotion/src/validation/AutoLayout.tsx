/**
 * AutoLayoutProvider — deterministic auto-layout for Remotion.
 *
 * Usage:
 *   <AutoLayoutProvider>
 *     <MyScene />
 *   </AutoLayoutProvider>
 *
 * In components:
 *   const { x, y } = useAutoLayout('my-id', rawX, rawY, w, h, Priority.BUBBLE);
 *   // Render at x, y — automatically nudged to avoid overlaps
 *
 * How it works (single pass, no state, no effects):
 * - The provider owns a registry in a ref, tagged with the provider's current frame.
 * - The first useAutoLayout call that sees a new frame clears the registry.
 * - Elements register in React render order (tree order). Each element is
 *   resolved immediately against the elements registered *before* it this frame:
 *   if it overlaps an earlier element of strictly higher priority, it is nudged
 *   (smallest on-canvas move — same strategy as autoLayoutEngine) and then clamped.
 * - Its resolved rect is stored so later elements resolve against it.
 * - The result is a pure function of (earlier registrations this frame, desired
 *   rect, priority), so every frame renders identically on any render worker.
 */
import React, { createContext, useContext, useMemo, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { LayoutElement, Priority, separationVector } from './autoLayoutEngine';

interface RegisteredElement extends LayoutElement {
  /** Identity of the hook instance (ids may collide between instances). */
  token: object;
  /** Desired (raw) position. */
  rawX: number;
  rawY: number;
}

interface Registry {
  frame: number;
  entries: RegisteredElement[];
}

interface AutoLayoutContextValue {
  registry: React.MutableRefObject<Registry>;
  frame: number;
  frameW: number;
  frameH: number;
}

const AutoLayoutContext = createContext<AutoLayoutContextValue | null>(null);

export const AutoLayoutProvider: React.FC<{
  children: React.ReactNode;
  debug?: boolean;
}> = ({ children, debug = false }) => {
  const { width: frameW, height: frameH } = useVideoConfig();
  const frame = useCurrentFrame();
  const registry = useRef<Registry>({ frame: Number.NaN, entries: [] });

  // A new value object every frame so every useAutoLayout consumer re-renders
  // (and therefore re-registers) on every frame, in tree order.
  const value = useMemo(
    () => ({ registry, frame, frameW, frameH }),
    [frame, frameW, frameH]
  );

  return (
    <AutoLayoutContext.Provider value={value}>
      {children}
      {debug && <AutoLayoutDebugOverlay />}
    </AutoLayoutContext.Provider>
  );
};

const canOverlap = (a: LayoutElement, b: LayoutElement): boolean => {
  if (a.overlapGroup && a.overlapGroup === b.overlapGroup) return true;
  if (a.allowOverlapWith?.includes(b.id)) return true;
  if (b.allowOverlapWith?.includes(a.id)) return true;
  return false;
};

/**
 * Pure resolver: place `el` given the already-resolved elements before it.
 * Non-colliding elements keep their exact desired position (no clamping).
 */
export function resolveAgainst(
  el: LayoutElement,
  earlier: readonly LayoutElement[],
  frameW: number,
  frameH: number
): { x: number; y: number } {
  const elPriority = el.priority ?? 50;
  let px = el.x;
  let py = el.y;
  let moved = false;
  // Obstacles: earlier elements with strictly higher priority, highest first
  // (stable sort keeps render order among equals).
  const obstacles = earlier
    .filter(o => (o.priority ?? 50) > elPriority && !canOverlap(el, o))
    .sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));
  for (const o of obstacles) {
    const [dx, dy] = separationVector(
      o.x, o.y, o.w, o.h,
      px, py, el.w, el.h,
      frameW, frameH
    );
    if (dx !== 0 || dy !== 0) {
      px += dx;
      py += dy;
      moved = true;
    }
  }
  if (moved) {
    px = Math.max(0, Math.min(px, frameW - el.w));
    py = Math.max(0, Math.min(py, frameH - el.h));
  }
  return { x: px, y: py };
}

/**
 * useAutoLayout — declare your position, get back the adjusted position.
 *
 * @param id - Unique element id (scoped to your component)
 * @param x - Desired x (top-left)
 * @param y - Desired y (top-left)
 * @param w - Width
 * @param h - Height
 * @param priority - Higher = less likely to move (use Priority constants)
 * @returns Adjusted {x, y} to render at
 *
 * Example:
 *   const { x, y } = useAutoLayout('bubble', 100, 200, 300, 150, Priority.BUBBLE);
 */
export function useAutoLayout(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  priority: number = Priority.BUBBLE,
  type: LayoutElement['type'] = 'text',
  content?: string,
  options?: {
    /** IDs this element may overlap with (e.g., bubble tail over character) */
    allowOverlapWith?: string[];
    /** Group ID — elements in same group never push each other */
    overlapGroup?: string;
  }
): { x: number; y: number } {
  const ctx = useContext(AutoLayoutContext);
  const tokenRef = useRef<object>({});

  // No provider — return raw position
  if (!ctx) return { x, y };

  const reg = ctx.registry.current;
  if (reg.frame !== ctx.frame) {
    reg.frame = ctx.frame;
    reg.entries = [];
  }

  // If this instance already registered this frame (re-render at the same
  // frame, StrictMode double render), keep its original slot so the result
  // only depends on elements before it.
  const token = tokenRef.current;
  const existing = reg.entries.findIndex(e => e.token === token);
  const slot = existing === -1 ? reg.entries.length : existing;
  const earlier = reg.entries.slice(0, slot);

  const desired: LayoutElement = {
    id, x, y, w, h, priority, type, content,
    allowOverlapWith: options?.allowOverlapWith,
    overlapGroup: options?.overlapGroup,
  };
  const pos = resolveAgainst(desired, earlier, ctx.frameW, ctx.frameH);

  const entry: RegisteredElement = { ...desired, x: pos.x, y: pos.y, rawX: x, rawY: y, token };
  if (existing === -1) reg.entries.push(entry);
  else reg.entries[existing] = entry;

  return pos;
}

/**
 * Debug overlay showing all declared elements and their adjustments.
 * Rendered after the provider's children, so it sees this frame's registry.
 */
const AutoLayoutDebugOverlay: React.FC = () => {
  const ctx = useContext(AutoLayoutContext);
  if (!ctx) return null;
  const reg = ctx.registry.current;
  const elements = reg.frame === ctx.frame ? reg.entries : [];

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 9999,
    }}>
      {elements.map((el, i) => {
        const dx = el.x - el.rawX;
        const dy = el.y - el.rawY;
        const moved = dx !== 0 || dy !== 0;
        return (
          <div
            key={`${el.id}-${i}`}
            style={{
              position: 'absolute',
              left: el.x,
              top: el.y,
              width: el.w,
              height: el.h,
              border: `2px dashed ${moved ? '#ffaa00' : '#00ff00'}`,
              backgroundColor: moved ? 'rgba(255,170,0,0.1)' : 'rgba(0,255,0,0.05)',
            }}
          >
            <div style={{
              fontSize: 10,
              fontFamily: 'monospace',
              color: '#fff',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '2px 6px',
              whiteSpace: 'nowrap',
            }}>
              {el.id} (p:{el.priority ?? 50})
              {moved && ` → [${Math.round(dx)}, ${Math.round(dy)}]`}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export { Priority };
