import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import { TimelineProps } from '../components/motionStudioTypes';

export interface HistoricalTimelineProps extends TimelineProps {
  /** Bold label at the start of the footer banner */
  footerLabel?: string;
  /** Footer banner body text */
  footerText?: string;
  /** Small mono tag on the right of the footer banner (empty string hides it) */
  footerTag?: string;
  /** Hide the footer banner entirely */
  showFooter?: boolean;
}

export const HistoricalTimeline: React.FC<HistoricalTimelineProps> = ({
  eraTitle,
  periodBadge,
  milestones,
  themeColor = '#d97706',
  showProgressGauge = true,
  footerLabel = 'AP Concept Connection:',
  footerText = 'Notice how each internal tax intensified intercolonial solidarity.',
  footerTag = 'THEME: POL-1.0',
  showFooter = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isPortrait = height > width;
  // Hard-coded px values scale with the frame: identical at 1280×720 (portrait base: 720 wide).
  const k = isPortrait ? width / 720 : width / 1280;

  // Header entrance
  const headerProgress = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const headerOpacity = interpolate(headerProgress, [0, 1], [0, 1]);
  const headerY = interpolate(headerProgress, [0, 1], [-40 * k, 0]);

  // Overall timeline progress line (runs across the component's duration — the
  // enclosing Sequence's length — finishing 20 frames before the end)
  const gaugeEnd = Math.max(11, durationInFrames - 20);
  const lineProgress = interpolate(frame, [10, gaugeEnd], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#090b10',
        color: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: isPortrait ? `${50 * k}px ${36 * k}px` : `${48 * k}px ${64 * k}px`,
        boxSizing: 'border-box',
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
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.02) ${k}px, transparent ${k}px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) ${k}px, transparent ${k}px)`,
          backgroundSize: `${40 * k}px ${40 * k}px`,
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
            marginBottom: (isPortrait ? 28 : 36) * k,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 * k, marginBottom: 8 * k }}>
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: (isPortrait ? 15 : 17) * k,
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
                fontSize: (isPortrait ? 13 : 15) * k,
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
              fontSize: (isPortrait ? 34 : 46) * k,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              margin: 0,
              color: '#ffffff',
              textShadow: `0 ${2 * k}px ${10 * k}px rgba(0,0,0,0.5)`,
            }}
          >
            {eraTitle}
          </h1>

          {/* Progress bar gauge */}
          {showProgressGauge && (
            <div
              style={{
                marginTop: 16 * k,
                display: 'flex',
                alignItems: 'center',
                gap: 12 * k,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 4 * k,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 2 * k,
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
                    boxShadow: `0 0 ${12 * k}px ${themeColor}`,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13 * k,
                  color: 'rgba(255,255,255,0.5)',
                  minWidth: 40 * k,
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
            gap: (isPortrait ? 16 : 18) * k,
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
            const cardTranslate = interpolate(cardSpring, [0, 1], [(isPortrait ? 20 : 35) * k, 0]);

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
                  backdropFilter: `blur(${12 * k}px)`,
                  border: isActive
                    ? `${k}px solid ${themeColor}`
                    : `${k}px solid rgba(255, 255, 255, 0.08)`,
                  borderRadius: 12 * k,
                  padding: isPortrait ? `${14 * k}px ${18 * k}px` : `${20 * k}px ${18 * k}px`,
                  opacity: cardOpacity,
                  transform: isPortrait
                    ? `translateY(${cardTranslate}px) scale(${cardScale})`
                    : `translateY(${cardTranslate}px) scale(${cardScale})`,
                  boxShadow: isActive
                    ? `0 0 ${20 * pulseGlow * k}px rgba(217, 119, 6, ${0.3 * pulseGlow})`
                    : `0 ${8 * k}px ${24 * k}px rgba(0, 0, 0, 0.3)`,
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
                    height: 3 * k,
                    backgroundColor: isActive ? themeColor : 'rgba(255,255,255,0.1)',
                  }}
                />

                {/* Year Header & Milestone Index */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10 * k,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: (isPortrait ? 22 : 26) * k,
                      fontWeight: 800,
                      color: isActive ? '#fbbf24' : '#ffffff',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {milestone.year}
                  </span>
                  <span
                    style={{
                      fontSize: 11 * k,
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
                    fontSize: (isPortrait ? 16 : 17) * k,
                    fontWeight: 700,
                    color: '#f1f5f9',
                    margin: `0 0 ${4 * k}px 0`,
                    lineHeight: 1.25,
                  }}
                >
                  {milestone.title}
                </h3>

                {/* Subtitle kicker */}
                <div
                  style={{
                    fontSize: 12 * k,
                    fontWeight: 600,
                    color: themeColor,
                    marginBottom: 8 * k,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {milestone.subtitle}
                </div>

                {/* Significance takeaway */}
                <p
                  style={{
                    fontSize: (isPortrait ? 12 : 13) * k,
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
        {showFooter && (footerLabel || footerText || footerTag) && (
        <div
          style={{
            marginTop: (isPortrait ? 18 : 24) * k,
            padding: `${10 * k}px ${18 * k}px`,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 8 * k,
            borderLeft: `${3 * k}px solid ${themeColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 13 * k, color: 'rgba(255,255,255,0.85)' }}>
            {footerLabel && <strong>{footerLabel}</strong>}
            {footerLabel && footerText ? ' ' : null}
            {footerText}
          </span>
          {footerTag && (
          <span
            style={{
              fontSize: 11 * k,
              fontFamily: "'JetBrains Mono', monospace",
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            {footerTag}
          </span>
          )}
        </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
