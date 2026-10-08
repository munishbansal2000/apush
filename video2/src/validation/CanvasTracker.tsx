import React, { createContext, useContext, useRef, useEffect, useState, useCallback } from 'react';
import { useVideoConfig } from 'remotion';
import { TrackedElement } from './tracker';
import { validateLayout, ValidationIssue, Bounds } from './layout';

interface CanvasElement extends TrackedElement {
  componentName: string;
  zIndex?: number;
}

interface CanvasTrackerState {
  register: (el: CanvasElement) => void;
  unregister: (id: string, componentName: string) => void;
  /** Get auto-resolved position adjustment for an element */
  getAdjustment: (id: string, componentName: string) => { dx: number; dy: number };
}

const CanvasTrackerContext = createContext<CanvasTrackerState | null>(null);

interface CanvasTrackerProviderProps {
  children: React.ReactNode;
  debug?: boolean;
  /** Enforcement: 'off' | 'warn' | 'error' */
  enforcement?: 'off' | 'warn' | 'error';
  /** Auto-resolve overlaps by nudging elements apart. Default true. */
  autoResolve?: boolean;
}

/**
 * Compute minimum-translation-vector to separate two rects.
 * Returns [dx, dy] to apply to rect B (A stays put).
 * Prefers directions that keep B on-canvas.
 */
function separationVector(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  frameW: number, frameH: number,
  padding = 8
): [number, number] {
  const aRight = ax + aw, aBottom = ay + ah;
  const bRight = bx + bw, bBottom = by + bh;

  // No overlap?
  if (bRight <= ax || bx >= aRight || bBottom <= ay || by >= aBottom) {
    return [0, 0];
  }

  // Overlap amounts on each axis
  const overlapX = Math.min(aRight - bx, bRight - ax);
  const overlapY = Math.min(aBottom - by, bBottom - ay);

  // Candidate pushes with on-canvas check
  const canPushRight = bx + overlapX + padding + bw <= frameW;
  const canPushLeft = bx - overlapX - padding >= 0;
  const canPushDown = by + overlapY + padding + bh <= frameH;
  const canPushUp = by - overlapY - padding >= 0;

  if (overlapX < overlapY) {
    const pushRight = (aRight - bx) < (bRight - ax);
    if (pushRight && canPushRight) return [overlapX + padding, 0];
    if (!pushRight && canPushLeft) return [-(overlapX + padding), 0];
    // Preferred direction blocked — try the other
    if (canPushRight) return [overlapX + padding, 0];
    if (canPushLeft) return [-(overlapX + padding), 0];
    // Both X blocked — try Y
    if (canPushDown) return [0, overlapY + padding];
    if (canPushUp) return [0, -(overlapY + padding)];
  } else {
    const pushDown = (aBottom - by) < (bBottom - ay);
    if (pushDown && canPushDown) return [0, overlapY + padding];
    if (!pushDown && canPushUp) return [0, -(overlapY + padding)];
    if (canPushDown) return [0, overlapY + padding];
    if (canPushUp) return [0, -(overlapY + padding)];
    if (canPushRight) return [overlapX + padding, 0];
    if (canPushLeft) return [-(overlapX + padding), 0];
  }

  return [0, 0];
}

/**
 * CanvasTrackerProvider — canvas-level object tracking.
 *
 * Wrap your composition with this. Every component registers its
 * visual elements. The provider validates ACROSS components:
 * - Cross-component overlaps (TalkingHead overlapping Callout, etc.)
 * - Global bounds checking
 * - Z-index conflicts
 *
 * This is the "never bad rendering" guarantee at the composition level.
 */
export const CanvasTrackerProvider: React.FC<CanvasTrackerProviderProps> = ({
  children,
  debug = false,
  enforcement = 'warn',
  autoResolve = true,
}) => {
  const { width: frameWidth, height: frameHeight } = useVideoConfig();
  const elementsRef = useRef<Map<string, CanvasElement>>(new Map());
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [elementCount, setElementCount] = useState(0);
  const [adjustments, setAdjustments] = useState<Map<string, { dx: number; dy: number }>>(new Map());

  const validateAll = useCallback(() => {
    const elements = Array.from(elementsRef.current.values());

    // Auto-resolve: compute separation adjustments
    // Priority: earlier-registered elements stay, later ones move
    if (autoResolve && elements.length > 1) {
      const newAdj = new Map<string, { dx: number; dy: number }>();
      const pos = new Map<string, { x: number; y: number }>();
      for (const el of elements) {
        const key = `${el.componentName}:${el.id}`;
        pos.set(key, { x: el.x, y: el.y });
        newAdj.set(key, { dx: 0, dy: 0 });
      }

      // Iterative separation (converges in a few passes)
      for (let iter = 0; iter < 8; iter++) {
        let moved = false;
        for (let i = 0; i < elements.length; i++) {
          for (let j = i + 1; j < elements.length; j++) {
            const a = elements[i], b = elements[j];
            const ka = `${a.componentName}:${a.id}`;
            const kb = `${b.componentName}:${b.id}`;
            const pa = pos.get(ka)!, pb = pos.get(kb)!;

            const [dx, dy] = separationVector(
              pa.x, pa.y, a.width, a.height,
              pb.x, pb.y, b.width, b.height,
              frameWidth, frameHeight
            );

            if (dx !== 0 || dy !== 0) {
              // Move B (later element yields to earlier)
              pb.x += dx; pb.y += dy;
              const cur = newAdj.get(kb)!;
              newAdj.set(kb, { dx: cur.dx + dx, dy: cur.dy + dy });
              moved = true;
            }
          }
        }
        if (!moved) break;
      }

      // Final clamp: keep everything on-canvas
      for (const el of elements) {
        const key = `${el.componentName}:${el.id}`;
        const p = pos.get(key)!;
        const clampedX = Math.max(0, Math.min(p.x, frameWidth - el.width));
        const clampedY = Math.max(0, Math.min(p.y, frameHeight - el.height));
        if (clampedX !== p.x || clampedY !== p.y) {
          const cur = newAdj.get(key)!;
          newAdj.set(key, {
            dx: cur.dx + (clampedX - p.x),
            dy: cur.dy + (clampedY - p.y),
          });
          pos.set(key, { x: clampedX, y: clampedY });
        }
      }

      // Only update state if adjustments changed (avoid render loops)
      setAdjustments(prev => {
        if (prev.size !== newAdj.size) return newAdj;
        for (const [k, v] of newAdj) {
          const p = prev.get(k);
          if (!p || Math.abs(p.dx - v.dx) > 0.5 || Math.abs(p.dy - v.dy) > 0.5) {
            return newAdj;
          }
        }
        return prev;
      });
    }

    const bounds: Bounds[] = elements.map(el => ({
      id: `${el.componentName}:${el.id}`,
      type: el.type,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
    }));

    const result = validateLayout(bounds, frameWidth, frameHeight, {
      checkOverlaps: true,
      allowedOverlap: 0,
    });

    setIssues(result.issues);
    setElementCount(elements.length);

    // Enforcement
    if (enforcement !== 'off' && result.issues.length > 0) {
      const errors = result.issues.filter(i => i.severity === 'error');

      if (debug) {
        console.group('[CanvasTracker] Cross-component validation');
        console.log(`Tracking ${elements.length} elements across composition`);
        for (const issue of result.issues) {
          const fn = issue.severity === 'error' ? console.error : console.warn;
          fn(`${issue.componentId}: ${issue.message}`);
        }
        console.groupEnd();
      }

      if (enforcement === 'error' && errors.length > 0) {
        throw new Error(
          `[CanvasTracker] ${errors.length} rendering error(s) detected:\n` +
          errors.map(e => `  - ${e.componentId}: ${e.message}`).join('\n')
        );
      }
    }
  }, [frameWidth, frameHeight, debug, enforcement]);

  const register = useCallback((el: CanvasElement) => {
    const key = `${el.componentName}:${el.id}`;
    elementsRef.current.set(key, el);
    // Async to avoid setState-during-render loops; Remotion waits for stability
    setTimeout(validateAll, 0);
  }, [validateAll]);

  const unregister = useCallback((id: string, componentName: string) => {
    const key = `${componentName}:${id}`;
    elementsRef.current.delete(key);
  }, []);

  const state: CanvasTrackerState = React.useMemo(() => ({
    register,
    unregister,
    getAdjustment: (id: string, componentName: string) => {
      return adjustments.get(`${componentName}:${id}`) ?? { dx: 0, dy: 0 };
    },
  }), [register, unregister, adjustments]);

  return (
    <CanvasTrackerContext.Provider value={state}>
      {children}
      {debug && (
        <CanvasDebugOverlay
          elements={Array.from(elementsRef.current.values())}
          issues={issues}
          elementCount={elementCount}
        />
      )}
    </CanvasTrackerContext.Provider>
  );
};

/**
 * useCanvasElement — register a visual element with the canvas tracker.
 *
 * Call this for EVERY visual element in your component.
 * The canvas tracker validates across all components.
 */
export function useCanvasElement(
  element: Omit<CanvasElement, 'componentName'>,
  componentName: string
) {
  const tracker = useContext(CanvasTrackerContext);

  useEffect(() => {
    if (!tracker) return;

    tracker.register({ ...element, componentName });

    return () => {
      tracker.unregister(element.id, componentName);
    };
  }, [tracker, element.id, componentName]);
}

/**
 * useResolvedPosition — register an element AND get its auto-adjusted position.
 *
 * When autoResolve is on, overlapping elements are nudged apart.
 * Use the returned x/y instead of your raw coordinates.
 *
 * Example:
 *   const { x, y } = useResolvedPosition('my-bubble', rawX, rawY, w, h, 'SpeechBubble');
 */
export function useResolvedPosition(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  componentName: string,
  type: 'text' | 'image' | 'shape' = 'text',
  content?: string
): { x: number; y: number } {
  const tracker = useContext(CanvasTrackerContext);

  // useEffect (not layout) to avoid synchronous setState loops
  useEffect(() => {
    if (!tracker) return;
    tracker.register({ id, type, content: content ?? '', x, y, width: w, height: h, componentName });
    return () => { tracker.unregister(id, componentName); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracker, id, componentName, x, y, w, h]);

  if (!tracker) return { x, y };
  const adj = tracker.getAdjustment(id, componentName);
  return { x: x + adj.dx, y: y + adj.dy };
}
/**
 * useCanvasElements — register multiple visual elements at once.
 * Use this when a component has multiple elements to track.
 */
export function useCanvasElements(
  elements: Omit<CanvasElement, 'componentName'>[],
  componentName: string
) {
  const tracker = useContext(CanvasTrackerContext);

  useEffect(() => {
    if (!tracker) return;

    for (const el of elements) {
      tracker.register({ ...el, componentName });
    }

    return () => {
      for (const el of elements) {
        tracker.unregister(el.id, componentName);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracker, componentName, JSON.stringify(elements.map(e => [e.id, e.x, e.y, e.width, e.height]))]);
}

/**
 * CanvasDebugOverlay — visualizes all tracked objects.
 * Shows bounding boxes, IDs, and issues.
 */
const CanvasDebugOverlay: React.FC<{
  elements: CanvasElement[];
  issues: ValidationIssue[];
  elementCount: number;
}> = ({ elements, issues, elementCount }) => {
  const [showBoxes, setShowBoxes] = useState(true);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 9999,
    }}>
      {/* Toggle */}
      <div
        style={{
          position: 'absolute',
          top: 10, right: 10,
          pointerEvents: 'auto',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          fontFamily: 'monospace',
        }}
        onClick={() => setShowBoxes(!showBoxes)}
      >
        {elementCount} objects {showBoxes ? '👁' : '🚫'}
        {issues.length > 0 && ` ⚠️${issues.length}`}
      </div>

      {showBoxes && elements.map(el => {
        const hasIssue = issues.some(i => i.componentId?.includes(el.id));
        return (
          <div
            key={`${el.componentName}:${el.id}`}
            style={{
              position: 'absolute',
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              border: `2px ${hasIssue ? 'solid #ff4444' : 'dashed #00ff00'}`,
              backgroundColor: hasIssue ? 'rgba(255,68,68,0.1)' : 'rgba(0,255,0,0.05)',
            }}
            title={`${el.componentName}:${el.id} (${el.type})`}
          >
            <div style={{
              position: 'absolute',
              top: -20,
              left: 0,
              fontSize: 10,
              fontFamily: 'monospace',
              color: hasIssue ? '#ff4444' : '#00ff00',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '2px 6px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
            }}>
              {el.componentName}:{el.id}
            </div>
          </div>
        );
      })}

      {/* Issues list */}
      {issues.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 10, left: 10,
          maxWidth: 500,
          maxHeight: 200,
          overflow: 'auto',
          backgroundColor: 'rgba(0,0,0,0.9)',
          color: '#fff',
          padding: 12,
          borderRadius: 8,
          fontSize: 12,
          fontFamily: 'monospace',
        }}>
          {issues.map((issue, i) => (
            <div key={i} style={{
              color: issue.severity === 'error' ? '#ff6666' : '#ffcc66',
              marginBottom: 4,
            }}>
              [{issue.severity}] {issue.componentId}: {issue.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
