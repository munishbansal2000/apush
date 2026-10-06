import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface WordPopProps {
  word: string;
  accent?: string;
}

/**
 * NEW: Animated keyword pop — the Heimler-style emphasis moment.
 * Pops in with spring physics, holds, then fades.
 * Use as an overlay on any slide.
 */
export const WordPop: React.FC<WordPopProps> = ({
  word,
  accent = '#c9a227',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 200 },
  });

  const scale = interpolate(enter, [0, 1], [0.5, 1.15]);
  const settledScale = interpolate(frame, [15, 25], [1.15, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        top: height * 0.12,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        opacity,
        transform: `scale(${frame < 15 ? scale : settledScale})`,
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontSize: height * 0.055,
          fontWeight: 'bold',
          color: '#fff',
          backgroundColor: 'rgba(0,0,0,0.75)',
          border: `3px solid ${accent}`,
          borderRadius: height * 0.02,
          padding: `${height * 0.015}px ${width * 0.03}px`,
          fontFamily: 'Georgia, serif',
          letterSpacing: '0.05em',
          boxShadow: `0 0 ${height * 0.04}px ${accent}66`,
        }}
      >
        {word}
      </div>
    </div>
  );
};
