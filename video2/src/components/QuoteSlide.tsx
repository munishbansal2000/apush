import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLOR, FONT, TYPE } from '../theme/tokens';

interface QuoteSlideProps {
  quote: string;
  byline?: string;
  accent?: string;
}

/**
 * QuoteSlide — Full-bleed primary source quote.
 * Centered serif pull-quote with large quotation mark.
 * For when the words ARE the artifact.
 */
export const QuoteSlide: React.FC<QuoteSlideProps> = ({
  quote,
  byline = '',
  accent = COLOR.gold,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // intentional: damping 200 = critically damped fade-in, no overshoot
  const quoteIn = spring({ frame, fps, config: { damping: 200 } });
  const bylineIn = spring({ frame: frame - 20, fps, config: { damping: 200 } });

  const quoteOpacity = interpolate(quoteIn, [0, 1], [0, 1]);
  const quoteY = interpolate(quoteIn, [0, 1], [30, 0]);
  const bylineOpacity = interpolate(bylineIn, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLOR.night,
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 10%',
      }}
    >
      {/* Large quotation mark */}
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '8%',
          fontSize: TYPE.display * 2.78,
          fontFamily: FONT.text,
          color: accent,
          opacity: 0.3 * quoteOpacity,
          lineHeight: 1,
        }}
      >
        &ldquo;
      </div>

      {/* Quote text */}
      <div
        style={{
          fontFamily: FONT.text,
          fontSize: TYPE.h1 * 0.86,
          color: COLOR.onNight,
          textAlign: 'center',
          lineHeight: 1.4,
          opacity: quoteOpacity,
          transform: `translateY(${quoteY}px)`,
          maxWidth: '80%',
        }}
      >
        {quote}
      </div>

      {/* Byline */}
      {byline && (
        <div
          style={{
            marginTop: 30,
            fontFamily: FONT.text,
            fontSize: TYPE.h3,
            color: COLOR.onNightMuted,
            fontStyle: 'italic',
            opacity: bylineOpacity,
          }}
        >
          — {byline}
        </div>
      )}
    </AbsoluteFill>
  );
};
