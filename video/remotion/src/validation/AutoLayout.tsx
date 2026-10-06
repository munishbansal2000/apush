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
 * How it works:
 * - Components declare their desired position via useAutoLayout
 * - Declarations are collected in context state
 * - Each component synchronously computes its adjustment from the snapshot
 * - Converges in 2-3 renders; Remotion waits for stability
 * - Priority determines who moves (lower priority yields to higher)
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { useVideoConfig } from 'remotion';
import {
  LayoutElement,
  resolveLayout,
  Priority,
} from './autoLayout';

interface AutoLayoutContextValue {
  elements: Map<string, LayoutElement>;
  declare: (el: LayoutElement) => void;
  undeclare: (id: string) => void;
  frameW: number;
  frameH: number;
}

const AutoLayoutContext = createContext<AutoLayoutContextValue | null>(null);

export const AutoLayoutProvider: React.FC<{
  children: React.ReactNode;
  debug?: boolean;
}> = ({ children, debug = false }) => {
  const { width: frameW, height: frameH } = useVideoConfig();
  const [elements, setElements] = useState<Map<string, LayoutElement>>(new Map());

  const declare = useCallback((el: LayoutElement) => {
    setElements(prev => {
      const existing = prev.get(el.id);
      // Skip if unchanged (prevents loops)
      if (
        existing &&
        existing.x === el.x &&
        existing.y === el.y &&
        existing.w === el.w &&
        existing.h === el.h &&
        existing.priority === el.priority
      ) {
        return prev;
      }
      const next = new Map(prev);
      next.set(el.id, el);
      return next;
    });
  }, []);

  const undeclare = useCallback((id: string) => {
    setElements(prev => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ elements, declare, undeclare, frameW, frameH }),
    [elements, declare, undeclare, frameW, frameH]
  );

  return (
    <AutoLayoutContext.Provider value={value}>
      {children}
      {debug && <AutoLayoutDebugOverlay />}
    </AutoLayoutContext.Provider>
  );
};

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

  // Declare via effect (safe, no render-phase side effects)
  useEffect(() => {
    if (!ctx) return;
    ctx.declare({
      id, x, y, w, h, priority, type, content,
      allowOverlapWith: options?.allowOverlapWith,
      overlapGroup: options?.overlapGroup,
    });
    return () => ctx.undeclare(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, id, x, y, w, h, priority]);

  // No provider — return raw position
  if (!ctx) return { x, y };

  // Compute adjustment synchronously from current snapshot
  // (May be one render behind, converges quickly)
  const allElements = Array.from(ctx.elements.values());
  if (allElements.length <= 1) return { x, y };

  const adjustments = resolveLayout(allElements, ctx.frameW, ctx.frameH);
  const adj = adjustments.get(id) ?? { dx: 0, dy: 0 };

  return { x: x + adj.dx, y: y + adj.dy };
}

/**
 * Debug overlay showing all declared elements and their adjustments.
 */
const AutoLayoutDebugOverlay: React.FC = () => {
  const ctx = useContext(AutoLayoutContext);
  if (!ctx) return null;

  const elements = Array.from(ctx.elements.values());
  const adjustments = resolveLayout(elements, ctx.frameW, ctx.frameH);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 9999,
    }}>
      {elements.map(el => {
        const adj = adjustments.get(el.id) ?? { dx: 0, dy: 0 };
        const moved = adj.dx !== 0 || adj.dy !== 0;
        return (
          <div
            key={el.id}
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
              {moved && ` → [${Math.round(adj.dx)}, ${Math.round(adj.dy)}]`}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export { Priority };
