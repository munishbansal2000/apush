/**
 * Standard wrapper for motion scenes: root ref + runtime layout guard + vignette + fades.
 * Every scene built from src/motion uses it, so every scene is tracked the same way.
 *
 * Conventions (see docs/MOTION.md):
 * - The <World> goes in <Track id="world" role="cover">; its readable parts carry
 *   data-guard-item (primitives do this for you).
 * - Each screen-space overlay zone is its own <Track>, placed inside the 5% safe area.
 */
import React, { useRef } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import renderConfig from '../data/render-config.json';
import { LayoutGuard } from '../kit/guard';
import { alpha, COLOR } from '../theme/tokens';

export const MotionScene: React.FC<{ children: React.ReactNode; fade?: boolean; background?: string }> = ({ children, fade = true, background = COLOR.night }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const rootRef = useRef<HTMLDivElement>(null);
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
  const black = fade ? Math.max(interpolate(frame, [0, 12], [1, 0], clamp), interpolate(frame, [durationInFrames - 30, durationInFrames - 1], [0, 1], clamp)) : 0;
  return (
    <AbsoluteFill ref={rootRef} style={{ background }}>
      {children}
      <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(ellipse at center, ${alpha(COLOR.black, 0)} 55%, ${alpha(COLOR.nightPanel, 0.45)} 100%)` }} />
      {black > 0 && <AbsoluteFill style={{ pointerEvents: 'none', background: COLOR.black, opacity: black }} />}
      <LayoutGuard cfg={renderConfig as never} rootRef={rootRef} />
    </AbsoluteFill>
  );
};
