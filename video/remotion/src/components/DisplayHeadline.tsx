import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface DisplayHeadlineProps {
  headline: string;
  sub?: string;
  accent?: string;
}

export const DisplayHeadline: React.FC<DisplayHeadlineProps> = ({
  headline,
  sub = '',
  accent = '#c9a227',
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const headlineOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const headlineY = interpolate(frame, [0, 12], [20, 0], { extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' });
  const lineWidth = interpolate(frame, [8, 25], [0, width * 0.2], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: '#1a1512',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, serif',
        padding: width * 0.08,
      }}
    >
      <div
        style={{
          fontSize: height * 0.065,
          fontWeight: 'bold',
          color: '#f5f0e8',
          textAlign: 'center',
          lineHeight: 1.25,
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
          maxWidth: width * 0.85,
        }}
      >
        {headline}
      </div>

      <div
        style={{
          width: lineWidth,
          height: 3,
          backgroundColor: accent,
          marginTop: height * 0.035,
          marginBottom: height * 0.035,
        }}
      />

      {sub && (
        <div
          style={{
            fontSize: height * 0.032,
            color: '#a89f91',
            textAlign: 'center',
            opacity: subOpacity,
            maxWidth: width * 0.7,
            lineHeight: 1.5,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};
