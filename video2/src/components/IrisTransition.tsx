import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLOR } from '../theme/tokens';

interface IrisTransitionProps {
  /** The outgoing scene */
  children: [React.ReactNode, React.ReactNode];
  /** Frames for the iris animation */
  duration?: number;
  /** Iris color (usually black) */
  color?: string;
}

/**
 * IrisTransition — circular mask wipe between scenes.
 *
 * Kurzgesagt uses this for perspective shifts. We have six transitions
 * (crossfade, dip, wipe, slide, zoom, cut) — iris is the missing one.
 *
 * Usage:
 * <IrisTransition duration={30}>
 *   <SceneA />
 *   <SceneB />
 * </IrisTransition>
 *
 * No validation needed (full-frame mask, always in-bounds).
 */
export const IrisTransition: React.FC<IrisTransitionProps> = ({
  children,
  duration = 30,
  color = COLOR.night,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const [sceneA, sceneB] = children;

  // Iris closes on A (first half: visible circle shrinks to black),
  // then opens on B (second half: visible circle grows from black).
  const half = duration / 2;
  const maxR = Math.sqrt(width * width + height * height) / 2;
  let radius: number;
  let showB = false;

  if (frame < half) {
    // Closing: A visible through a circle shrinking from max to 0
    const progress = interpolate(frame, [0, half], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const eased = progress * progress;
    radius = maxR * (1 - eased);
  } else {
    // Opening: B visible through a circle growing from 0 to max
    showB = true;
    const progress = interpolate(frame, [half, duration], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const eased = 1 - Math.pow(1 - progress, 2);
    radius = maxR * eased;
  }

  // After transition, show B fully
  if (frame >= duration) {
    return <div style={{ width, height }}>{sceneB}</div>;
  }

  const clip = `circle(${Math.max(0, radius)}px at ${width / 2}px ${height / 2}px)`;

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', backgroundColor: color }}>
      {/* Scene seen through the iris: A while closing, B while opening.
          Outside the circle the iris colour shows. */}
      <div style={{ position: 'absolute', inset: 0, clipPath: clip }}>
        {showB ? sceneB : sceneA}
      </div>
    </div>
  );
};
