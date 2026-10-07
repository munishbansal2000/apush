import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import { TimelineProps } from './motionStudioTypes';

export const HistoricalTimeline: React.FC<TimelineProps> = ({
  eraTitle,
  periodBadge,
  milestones,
  themeColor = '#d97706',
  showProgressGauge = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;

  // Header entrance
  const headerProgress = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const headerOpacity = interpolate(headerProgress, [0, 1], [0, 1]);
  const headerY = interpolate(headerProgress, [0, 1], [-40, 0]);

  // Overall timeline progress line (runs across total duration)
  const lineProgress = interpolate(frame, [10, 150], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#090b10',
        color: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: isPortrait ? '50px 36px' : '48px 64px',
        overflow: 'hidden',
      }}
    >
      {/* Subtle archival textured gradient & vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 20%, rgba(30, 41, 59, 0.4) 0%, rgba(9, 11, 16, 0.95) 75%)',
          pointerEvents: 'none',
        }}
      />

      {/* Grid overlay for cinematic historical tech feel */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      {/* Main Content Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Header Section */}
        <div
          style={{
            opacity: headerOpacity,
            transform: `translateY(${headerY}px)`,
            marginBottom: isPortrait ? 28 : 36,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: isPortrait ? 15 : 17,
                letterSpacing: '0.12em',
                color: themeColor,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {periodBadge}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span
              style={{
                fontSize: isPortrait ? 13 : 15,
                color: 'rgba(255,255,255,0.6)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              CHRONOLOGICAL REASONING
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: isPortrait ? 34 : 46,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              margin: 0,
              color: '#ffffff',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          >
            {eraTitle}
          </h1>

          {/* Progress bar gauge */}
          {showProgressGauge && (
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 4,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${lineProgress}%`,
                    backgroundColor: themeColor,
                    boxShadow: `0 0 12px ${themeColor}`,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.5)',
                  minWidth: 40,
                  textAlign: 'right',
                }}
              >
                {Math.round(lineProgress)}%
              </span>
            </div>
          )}
        </div>

        {/* Milestone Cards Track */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: isPortrait ? 'column' : 'row',
            alignItems: 'stretch',
            gap: isPortrait ? 16 : 18,
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          {milestones.map((milestone, idx) => {
            const cardFrameOffset = 18 + idx * 24;
            const cardSpring = spring({
              frame: frame - cardFrameOffset,
              fps,
              config: { damping: 13, mass: 0.9, stiffness: 110 },
            });

            const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);
            const cardScale = interpolate(cardSpring, [0, 1], [0.85, 1]);
            const cardTranslate = interpolate(cardSpring, [0, 1], [isPortrait ? 20 : 35, 0]);

            // Is this milestone active currently?
            const isActive = frame >= cardFrameOffset && frame < cardFrameOffset + 40;
            const pulseGlow = isActive
              ? Math.sin((frame - cardFrameOffset) * 0.25) * 0.4 + 0.6
              : 0;

            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'rgba(18, 24, 38, 0.75)',
                  backdropFilter: 'blur(12px)',
                  border: isActive
                    ? `1px solid ${themeColor}`
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  padding: isPortrait ? '14px 18px' : '20px 18px',
                  opacity: cardOpacity,
                  transform: isPortrait
                    ? `translateY(${cardTranslate}px) scale(${cardScale})`
                    : `translateY(${cardTranslate}px) scale(${cardScale})`,
                  boxShadow: isActive
                    ? `0 0 ${20 * pulseGlow}px rgba(217, 119, 6, ${0.3 * pulseGlow})`
                    : '0 8px 24px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Accent top stripe */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    backgroundColor: isActive ? themeColor : 'rgba(255,255,255,0.1)',
                  }}
                />

                {/* Year Header & Milestone Index */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: isPortrait ? 22 : 26,
                      fontWeight: 800,
                      color: isActive ? '#fbbf24' : '#ffffff',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {milestone.year}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: 'rgba(255,255,255,0.4)',
                    }}
                  >
                    0{idx + 1}
                  </span>
                </div>

                {/* Milestone Title */}
                <h3
                  style={{
                    fontSize: isPortrait ? 16 : 17,
                    fontWeight: 700,
                    color: '#f1f5f9',
                    margin: '0 0 4px 0',
                    lineHeight: 1.25,
                  }}
                >
                  {milestone.title}
                </h3>

                {/* Subtitle kicker */}
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: themeColor,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {milestone.subtitle}
                </div>

                {/* Significance takeaway */}
                <p
                  style={{
                    fontSize: isPortrait ? 12 : 13,
                    lineHeight: 1.45,
                    color: 'rgba(226, 232, 240, 0.75)',
                    margin: 0,
                    marginTop: 'auto',
                  }}
                >
                  {milestone.significance}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom APUSH Exam Tip Banner */}
        <div
          style={{
            marginTop: isPortrait ? 18 : 24,
            padding: '10px 18px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 8,
            borderLeft: `3px solid ${themeColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            <strong>AP Concept Connection:</strong> Notice how each internal tax intensified intercolonial solidarity.
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            THEME: POL-1.0
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
