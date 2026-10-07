import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import { LowerThirdProps } from './motionStudioTypes';
const colonialHallAsset = ''; // TODO: add colonial hall image

export const CinematicLowerThird: React.FC<LowerThirdProps> = ({
  primaryTitle,
  secondaryTitle,
  chapterNumber = 'KEY CONCEPT 3.1.II',
  badgeText = 'AP EXAM MUST-KNOW',
  citationDate = 'September 19, 1796',
  accentColor = '#38bdf8',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;

  // Slide up spring
  const enterSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 120 },
  });

  const translateY = interpolate(enterSpring, [0, 1], [80, 0]);
  const opacity = interpolate(enterSpring, [0, 1], [0, 1]);

  // Accent bar expansion
  const barWidth = interpolate(frame - 15, [0, 25], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Background visual sample video backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${colonialHallAsset})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.65) contrast(1.1)',
        }}
      />

      {/* Subtle bottom vignette to ensure contrast */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(5, 7, 12, 0.92) 0%, rgba(5, 7, 12, 0.4) 40%, transparent 80%)',
        }}
      />

      {/* Lower Third Anchor Container */}
      <div
        style={{
          position: 'absolute',
          bottom: isPortrait ? 60 : 54,
          left: isPortrait ? 24 : 64,
          right: isPortrait ? 24 : 'auto',
          maxWidth: isPortrait ? '100%' : 780,
          opacity,
          transform: `translateY(${translateY}px)`,
          zIndex: 20,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(10, 14, 23, 0.92)',
            backdropFilter: 'blur(20px)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            padding: isPortrait ? '16px 20px' : '20px 28px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Animated top accent bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${barWidth}%`,
              height: 3,
              backgroundColor: accentColor,
              boxShadow: `0 0 10px ${accentColor}`,
            }}
          />

          {/* Badges Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                backgroundColor: `${accentColor}22`,
                border: `1px solid ${accentColor}66`,
                color: accentColor,
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
              }}
            >
              {chapterNumber}
            </span>

            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>

            <span
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                backgroundColor: 'rgba(251, 191, 36, 0.15)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                color: '#fef08a',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {badgeText}
            </span>

            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>

            <span
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.6)',
                fontStyle: 'italic',
              }}
            >
              {citationDate}
            </span>
          </div>

          {/* Main Speaker / Topic Title */}
          <h2
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: isPortrait ? 22 : 30,
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {primaryTitle}
          </h2>

          {/* Secondary Subtitle / Description */}
          <div
            style={{
              fontSize: isPortrait ? 13 : 15,
              color: 'rgba(226, 232, 240, 0.9)',
              lineHeight: 1.4,
              fontWeight: 500,
            }}
          >
            {secondaryTitle}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
