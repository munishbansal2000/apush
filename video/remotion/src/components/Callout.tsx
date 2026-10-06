import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { useCanvasElements } from '../validation/CanvasTracker';
import { useProportions } from '../validation/useProportions';
import { TimingProps, DEFAULT_TIMING } from '../validation/timing';

interface CalloutProps extends TimingProps {
  text: string;
  /** Position relative to anchor: 'top' | 'bottom' | 'left' | 'right' */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Anchor point [x, y] as fractions (0-1) — where the callout points to */
  anchor?: [number, number];
  /** Callout style */
  variant?: 'speech' | 'thought' | 'label' | 'annotation';
  accent?: string;
  /** Frame when callout appears */
  at?: number;
  bg?: string;
  debug?: boolean;
}

/**
 * Callout — speech bubbles, annotations, and labels for talking heads.
 *
 * Variants:
 * - speech: Classic speech bubble with tail pointing to speaker
 * - thought: Cloud-like thought bubble
 * - label: Simple tag (for names, titles, key terms)
 * - annotation: Callout with line pointing to specific spot
 *
 * Use with TalkingHead: anchor the tail to the speaker's position.
 */
export const Callout: React.FC<CalloutProps> = ({
  text,
  position = 'top',
  anchor = [0.5, 0.5],
  variant = 'speech',
  accent = '#c9a227',
  at = 0,
  bg = '#ffffff',
  debug = false,
  enterDuration = DEFAULT_TIMING.enterDuration,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // All hooks must run before any early return
  const progress = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: { damping: 14, stiffness: 160 },
  });

  const { px } = useProportions([], { debug: false });

  // Track for validation (hooks must run unconditionally)
  const anchorX = anchor[0] * width;
  const anchorY = anchor[1] * height;
  const offsets = {
    top: { x: -150, y: -140 },
    bottom: { x: -150, y: 40 },
    left: { x: -320, y: -50 },
    right: { x: 20, y: -50 },
  };
  const offset = offsets[position];
  const bubbleX = anchorX + offset.x;
  const bubbleY = anchorY + offset.y;

  const trackedElements: TrackedElement[] = [{
    id: 'callout',
    type: 'text',
    content: text,
    fontSize: px(28),
    x: bubbleX,
    y: bubbleY,
    width: 300,
    height: 100,
  }];

  useElementTracker(trackedElements, {
    checkOverlaps: false,
    debug,
    componentName: 'Callout',
  });

  useCanvasElements([{
    id: 'callout',
    type: 'text',
    content: text,
    x: bubbleX,
    y: bubbleY,
    width: 300,
    height: 120,
  }], 'Callout');

  // Early return AFTER all hooks
  if (frame < at) return null;

  const scale = interpolate(progress, [0, 1], [0.6, 1]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const fontSize = px(28);

  const renderTail = () => {
    // SVG tail pointing from bubble to anchor
    const tailStartX = 150; // Center of bubble
    const tailStartY = position === 'top' ? 100 : position === 'bottom' ? 0 : 50;
    const tailEndX = anchorX - bubbleX;
    const tailEndY = anchorY - bubbleY;

    if (variant === 'thought') {
      // Thought bubble: small circles
      return (
        <>
          <circle cx={tailStartX + (tailEndX - tailStartX) * 0.3} cy={tailStartY + (tailEndY - tailStartY) * 0.3} r={8} fill={bg} />
          <circle cx={tailStartX + (tailEndX - tailStartX) * 0.6} cy={tailStartY + (tailEndY - tailStartY) * 0.6} r={5} fill={bg} />
        </>
      );
    }

    // Speech/annotation: triangle tail
    return (
      <polygon
        points={`${tailStartX - 12},${tailStartY} ${tailStartX + 12},${tailStartY} ${tailEndX},${tailEndY}`}
        fill={bg}
      />
    );
  };

  const bubbleStyle: React.CSSProperties = {
    position: 'absolute',
    left: bubbleX,
    top: bubbleY,
    width: 300,
    backgroundColor: bg,
    borderRadius: variant === 'label' ? 20 : 16,
    padding: '12px 18px',
    transform: `scale(${scale})`,
    opacity,
    zIndex: 25,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    border: variant === 'annotation' ? `2px solid ${accent}` : 'none',
  };

  if (variant === 'label') {
    return (
      <div style={{
        ...bubbleStyle,
        width: 'auto',
        backgroundColor: accent,
        padding: '6px 18px',
      }}>
        <div style={{
          fontSize,
          fontWeight: 'bold',
          color: '#fff',
          fontFamily: 'Georgia, serif',
          whiteSpace: 'nowrap',
        }}>
          {text}
        </div>
      </div>
    );
  }

  return (
    <div style={bubbleStyle}>
      <svg
        style={{ position: 'absolute', left: 0, top: 0, width: 300, height: 120, overflow: 'visible', zIndex: -1 }}
      >
        {renderTail()}
      </svg>
      <div style={{
        fontSize,
        color: '#1a1512',
        fontFamily: 'Georgia, serif',
        lineHeight: 1.4,
        position: 'relative',
        zIndex: 1,
      }}>
        {text}
      </div>
    </div>
  );
};
