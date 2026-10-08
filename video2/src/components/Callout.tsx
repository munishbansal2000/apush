import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { useCanvasElements } from '../validation/CanvasTracker';
import { useProportions } from '../validation/useProportions';
import { TimingProps, DEFAULT_TIMING } from '../validation/timing';
import { FONT, COLOR, TYPE, RADIUS, MOTION, alpha } from '../theme/tokens';

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
  accent = COLOR.gold,
  at = 0,
  bg = COLOR.paper,
  debug = false,
  enterDuration = DEFAULT_TIMING.enterDuration,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // All hooks must run before any early return
  const progress = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: MOTION.spring,
  });

  const { px } = useProportions([], { debug: false });

  // Track for validation (hooks must run unconditionally)
  // Hard-coded 1280×720 values scale with the frame (identical at 1280×720).
  const sx = width / 1280;
  const sy = height / 720;
  const anchorX = anchor[0] * width;
  const anchorY = anchor[1] * height;
  const offsets = {
    top: { x: -150 * sx, y: -140 * sy },
    bottom: { x: -150 * sx, y: 40 * sy },
    left: { x: -320 * sx, y: -50 * sy },
    right: { x: 20 * sx, y: -50 * sy },
  };
  const offset = offsets[position];
  const bubbleX = anchorX + offset.x;
  const bubbleY = anchorY + offset.y;

  const trackedElements: TrackedElement[] = [{
    id: 'callout',
    type: 'text',
    content: text,
    fontSize: px(TYPE.h3),
    x: bubbleX,
    y: bubbleY,
    width: 300 * sx,
    height: 100 * sy,
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
    width: 300 * sx,
    height: 120 * sy,
  }], 'Callout');

  // Early return AFTER all hooks
  if (frame < at) return null;

  const scale = interpolate(progress, [0, 1], [0.6, 1]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const fontSize = px(TYPE.h3);

  const renderTail = () => {
    // SVG tail pointing from bubble to anchor
    const tailStartX = 150 * sx; // Center of bubble
    const tailStartY = position === 'top' ? 100 * sy : position === 'bottom' ? 0 : 50 * sy;
    const tailEndX = anchorX - bubbleX;
    const tailEndY = anchorY - bubbleY;

    if (variant === 'thought') {
      // Thought bubble: small circles
      return (
        <>
          <circle cx={tailStartX + (tailEndX - tailStartX) * 0.3} cy={tailStartY + (tailEndY - tailStartY) * 0.3} r={8 * sx} fill={bg} />
          <circle cx={tailStartX + (tailEndX - tailStartX) * 0.6} cy={tailStartY + (tailEndY - tailStartY) * 0.6} r={5 * sx} fill={bg} />
        </>
      );
    }

    // Speech/annotation: triangle tail
    return (
      <polygon
        points={`${tailStartX - 12 * sx},${tailStartY} ${tailStartX + 12 * sx},${tailStartY} ${tailEndX},${tailEndY}`}
        fill={bg}
      />
    );
  };

  const bubbleStyle: React.CSSProperties = {
    position: 'absolute',
    left: bubbleX,
    top: bubbleY,
    width: 300 * sx,
    backgroundColor: bg,
    borderRadius: RADIUS.lg * sx,
    padding: `${12 * sx}px ${18 * sx}px`,
    transform: `scale(${scale})`,
    opacity,
    zIndex: 25,
    boxShadow: `0 ${4 * sx}px ${20 * sx}px ${alpha(COLOR.night, 0.3)}`,
    border: variant === 'annotation' ? `${2 * sx}px solid ${accent}` : 'none',
  };

  if (variant === 'label') {
    return (
      <div style={{
        ...bubbleStyle,
        width: 'auto',
        backgroundColor: accent,
        padding: `${6 * sx}px ${18 * sx}px`,
      }}>
        <div style={{
          fontSize,
          fontWeight: 'bold',
          color: COLOR.onNight,
          fontFamily: FONT.text,
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
        style={{ position: 'absolute', left: 0, top: 0, width: 300 * sx, height: 120 * sy, overflow: 'visible', zIndex: -1 }}
      >
        {renderTail()}
      </svg>
      <div style={{
        fontSize,
        color: COLOR.ink,
        fontFamily: FONT.text,
        lineHeight: 1.4,
        position: 'relative',
        zIndex: 1,
      }}>
        {text}
      </div>
    </div>
  );
};
