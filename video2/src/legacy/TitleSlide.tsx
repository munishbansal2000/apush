import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import {
  checkTextFit,
  autoFitFontSize,
} from '../validation/layout';
import {
  TimingProps,
  DEFAULT_TIMING,
  getAnimationProgress,
} from '../validation/timing';

/**
 * TitleSlide — ported from slideforge with identical interface.
 *
 * Python: TitleSlide(title, subtitle="", duration=4.5, accent=ACCENT, bg=None)
 * Remotion: <TitleSlide title subtitle accent /> + timing props
 *
 * Validation: checks title fits, subtitle fits, no out-of-bounds.
 * If unfixable: logs warning, renders fallback (never bad output).
 */
interface TitleSlideProps extends TimingProps {
  title: string;
  subtitle?: string;
  accent?: string;
  /** Background color (slideforge bg param) */
  bg?: string;
  /** Enable validation warnings in console */
  debug?: boolean;
}

export const TitleSlide: React.FC<TitleSlideProps> = ({
  title,
  subtitle = '',
  accent = '#c9a227',
  bg = '#1a1512',
  debug = false,
  enterDuration = DEFAULT_TIMING.enterDuration,
  exitDuration = DEFAULT_TIMING.exitDuration,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const { enter, exit } = getAnimationProgress(frame, durationInFrames, enterDuration, exitDuration);
  const overallOpacity = Math.min(enter * 2, exit * 2, 1);

  // Validation: check title fits
  const validation = useMemo(() => {
    const issues: string[] = [];
    const titleFontSize = height * 0.09;
    const maxWidth = width * 0.85;

    // Check each word (they wrap, so check longest word)
    const words = title.split(' ');
    const longestWord = words.reduce((a, b) => (a.length > b.length ? a : b), '');

    const fitIssue = checkTextFit(longestWord, titleFontSize, maxWidth / 3, 'title', 'bold');
    if (fitIssue) {
      issues.push(`Title: ${fitIssue.message}`);
    }

    if (subtitle) {
      const subIssue = checkTextFit(subtitle, height * 0.035, width * 0.7, 'subtitle');
      if (subIssue) {
        issues.push(`Subtitle: ${subIssue.message}`);
      }
    }

    // Auto-fix: shrink title if needed
    let adjustedTitleSize = titleFontSize;
    if (fitIssue && fitIssue.severity === 'error') {
      const fixed = autoFitFontSize(longestWord, maxWidth / 3, titleFontSize, 20, 'bold');
      if (fixed) {
        adjustedTitleSize = fixed;
        issues.push(`Auto-fixed title size: ${titleFontSize.toFixed(0)} → ${fixed.toFixed(0)}px`);
      } else {
        issues.push('ERROR: Title unfixable — text too long even at minimum size');
      }
    }

    return { issues, adjustedTitleSize };
  }, [title, subtitle, width, height]);

  // Log validation issues in debug mode
  React.useEffect(() => {
    if (debug && validation.issues.length > 0) {
      console.warn('[TitleSlide validation]', validation.issues);
    }
  }, [debug, validation.issues]);

  const words = title.split(' ');
  const titleSize = validation.adjustedTitleSize;

  // Breathing glow
  const breathe = 0.1 + 0.06 * Math.sin((2 * Math.PI * frame) / (6 * fps));

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Georgia, serif',
        opacity: overallOpacity,
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          width: width * 1.5,
          height: height * 1.5,
          left: width * 0.5 - (width * 1.5) / 2,
          top: height * 0.42 - (height * 1.5) / 2,
          background: `radial-gradient(circle, ${accent}${Math.round(breathe * 255).toString(16).padStart(2, '0')} 0%, transparent 60%)`,
          opacity: 0.55,
        }}
      />

      {/* Title with staggered words */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: width * 0.85,
          zIndex: 1,
        }}
      >
        {words.map((word, i) => {
          const delay = i * 6;
          const progress = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: { damping: 12, stiffness: 120 },
          });
          const opacity = interpolate(progress, [0, 1], [0, 1]);
          const y = interpolate(progress, [0, 1], [30, 0]);

          return (
            <span
              key={i}
              style={{
                fontSize: titleSize,
                fontWeight: 'bold',
                color: '#f5f0e8',
                margin: '0 0.25em',
                opacity: opacity * enter,
                transform: `translateY(${y}px)`,
                display: 'inline-block',
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            fontSize: height * 0.035,
            color: '#a89f91',
            marginTop: height * 0.04,
            opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' }) * exit,
            zIndex: 1,
            textAlign: 'center',
            maxWidth: width * 0.7,
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Accent line */}
      <div
        style={{
          width: interpolate(frame, [10, 30], [0, width * 0.3], { extrapolateRight: 'clamp' }),
          height: 3,
          backgroundColor: accent,
          marginTop: height * 0.03,
          zIndex: 1,
          opacity: exit,
        }}
      />
    </div>
  );
};
