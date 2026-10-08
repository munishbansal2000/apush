import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { LowerThirdProps } from './motionStudioTypes';
import { colonialHallAsset } from './motionStudioPresets';
import { FONT, COLOR, TYPE, RADIUS, MOTION, alpha } from '../theme/tokens';

export interface CinematicLowerThirdProps extends LowerThirdProps {
  /** Optional full-frame backdrop image (staticFile path or http URL). Omitted/empty → no backdrop layer. */
  backdropSrc?: string;
}

export const CinematicLowerThird: React.FC<CinematicLowerThirdProps> = ({
  name,
  title,
  primaryTitle: primaryTitleProp,
  secondaryTitle: secondaryTitleProp,
  backdropSrc = colonialHallAsset,
  chapterNumber = 'KEY CONCEPT 3.1.II',
  badgeText = 'AP EXAM MUST-KNOW',
  citationDate = 'September 19, 1796',
  accentColor = COLOR.skyOnNight,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  // Hard-coded px values scale with the frame: identical at 1280×720 (portrait base: 720 wide).
  const k = isPortrait ? width / 720 : width / 1280;
  // `name` / `title` are the generic lower-third props; primary/secondaryTitle override them
  const primaryTitle = primaryTitleProp ?? name;
  const secondaryTitle = secondaryTitleProp ?? title;

  // Slide up spring
  const enterSpring = spring({
    frame: frame - 10,
    fps,
    config: MOTION.spring,
  });

  const translateY = interpolate(enterSpring, [0, 1], [80 * k, 0]);
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
        fontFamily: FONT.ui,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Backdrop image — skipped entirely when no asset is set (an empty url() is a blank layer) */}
      {backdropSrc ? (
        <Img
          src={backdropSrc.startsWith('http') ? backdropSrc : staticFile(backdropSrc)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'brightness(0.65) contrast(1.1)',
          }}
        />
      ) : null}

      {/* Subtle bottom vignette to ensure contrast */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(to top, ${alpha(COLOR.night, 0.92)} 0%, ${alpha(COLOR.night, 0.4)} 40%, transparent 80%)`,
        }}
      />

      {/* Lower Third Anchor Container */}
      <div
        style={{
          position: 'absolute',
          bottom: (isPortrait ? 60 : 54) * k,
          left: (isPortrait ? 24 : 64) * k,
          right: isPortrait ? 24 * k : 'auto',
          maxWidth: isPortrait ? '100%' : 780 * k,
          opacity,
          transform: `translateY(${translateY}px)`,
          zIndex: 20,
        }}
      >
        <div
          style={{
            backgroundColor: alpha(COLOR.night, 0.92),
            backdropFilter: 'blur(20px)',
            borderRadius: RADIUS.md * k,
            border: `${1 * k}px solid ${alpha(COLOR.onNight, 0.12)}`,
            boxShadow: `0 ${20 * k}px ${40 * k}px ${alpha(COLOR.night, 0.6)}`,
            padding: isPortrait ? `${16 * k}px ${20 * k}px` : `${20 * k}px ${28 * k}px`,
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
              height: 3 * k,
              backgroundColor: accentColor,
              boxShadow: `0 0 ${10 * k}px ${accentColor}`,
            }}
          />

          {/* Badges Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 * k, marginBottom: 8 * k }}>
            <span
              style={{
                padding: `${3 * k}px ${8 * k}px`,
                borderRadius: RADIUS.sm * k,
                backgroundColor: `${accentColor}22`,
                border: `${1 * k}px solid ${accentColor}66`,
                color: accentColor,
                fontSize: TYPE.micro * k,
                fontFamily: FONT.mono,
                fontWeight: 700,
              }}
            >
              {chapterNumber}
            </span>

            <span style={{ color: alpha(COLOR.onNight, 0.3) }}>·</span>

            <span
              style={{
                padding: `${3 * k}px ${8 * k}px`,
                borderRadius: RADIUS.sm * k,
                backgroundColor: alpha(COLOR.gold, 0.15),
                border: `${1 * k}px solid ${alpha(COLOR.gold, 0.4)}`,
                color: COLOR.gold,
                fontSize: TYPE.micro * k,
                fontWeight: 700,
                fontFamily: FONT.mono,
              }}
            >
              {badgeText}
            </span>

            <span style={{ color: alpha(COLOR.onNight, 0.3) }}>·</span>

            <span
              style={{
                fontSize: TYPE.micro * k,
                color: alpha(COLOR.onNight, 0.6),
                fontStyle: 'italic',
              }}
            >
              {citationDate}
            </span>
          </div>

          {/* Main Speaker / Topic Title */}
          <h2
            style={{
              fontFamily: FONT.display,
              fontSize: (isPortrait ? TYPE.body : TYPE.h3) * k,
              fontWeight: 800,
              color: COLOR.onNight,
              margin: `0 0 ${6 * k}px 0`,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {primaryTitle}
          </h2>

          {/* Secondary Subtitle / Description */}
          {secondaryTitle && (
          <div
            style={{
              fontSize: (isPortrait ? TYPE.tag : TYPE.small) * k,
              color: alpha(COLOR.onNight, 0.9),
              lineHeight: 1.4,
              fontWeight: 500,
            }}
          >
            {secondaryTitle}
          </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
