import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { TimingProps } from '../validation/timing';

interface DocumentRevealProps extends TimingProps {
  /** Document title */
  title?: string;
  /** Full text to reveal */
  text: string;
  /** Source citation */
  source?: string;
  /** Characters per frame (typewriter speed) */
  charsPerFrame?: number;
  /** Show cursor */
  showCursor?: boolean;
  bg?: string;
  accent?: string;
  debug?: boolean;
}

/**
 * DocumentReveal — typewriter text-reveal for close reading.
 *
 * For document analysis: the text types itself out, synced to narration.
 * We have QuoteSlide (static) + HighlightSlide's marker-swash + Magnifier;
 * the typewriter effect is what's missing.
 *
 * Validation: text length checked, auto-warns if too long for duration.
 * Timing: charsPerFrame controls speed to match TTS.
 */
export const DocumentReveal: React.FC<DocumentRevealProps> = ({
  title = '',
  text,
  source = '',
  charsPerFrame = 1.5,
  showCursor = true,
  bg = '#f5f0e8', // Paper color
  accent = '#8b4513', // Ink brown
  debug = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const charsToShow = Math.floor(frame * charsPerFrame);
  const visibleText = text.slice(0, charsToShow);
  const isComplete = charsToShow >= text.length;

  // Validation
  React.useEffect(() => {
    if (debug) {
      const totalChars = text.length;
      const framesNeeded = totalChars / charsPerFrame;
      if (framesNeeded > durationInFrames * 0.9) {
        console.warn(
          `[DocumentReveal] Text may not complete: needs ~${framesNeeded.toFixed(0)} frames, ` +
          `have ${durationInFrames}. Consider increasing charsPerFrame.`
        );
      }
    }
  }, [debug, text, charsPerFrame, durationInFrames]);

  return (
    <div style={{
      width, height, backgroundColor: bg,
      position: 'relative', overflow: 'hidden',
      fontFamily: 'Georgia, serif',
      padding: width * 0.08,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Paper texture */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.03) 28px, rgba(0,0,0,0.03) 29px)',
        pointerEvents: 'none',
      }} />

      {title && (
        <div style={{
          fontSize: height * 0.035, fontWeight: 'bold',
          color: accent, marginBottom: height * 0.03,
          borderBottom: `2px solid ${accent}44`,
          paddingBottom: 12,
        }}>
          {title}
        </div>
      )}

      {/* Typewriter text */}
      <div style={{
        flex: 1,
        fontSize: height * 0.032,
        lineHeight: 1.8,
        color: '#2a241f',
        whiteSpace: 'pre-wrap',
      }}>
        {visibleText}
        {showCursor && !isComplete && (
          <span style={{
            display: 'inline-block',
            width: 3, height: height * 0.032,
            backgroundColor: accent,
            marginLeft: 2,
            verticalAlign: 'text-bottom',
            opacity: Math.sin(frame / 8) > 0 ? 1 : 0, // Blink
          }} />
        )}
      </div>

      {source && isComplete && (
        <div style={{
          fontSize: height * 0.026, color: '#8b7355',
          fontStyle: 'italic', marginTop: height * 0.02,
          textAlign: 'right',
          opacity: interpolate(frame, [charsToShow / charsPerFrame, charsToShow / charsPerFrame + 15], [0, 1], {
            extrapolateRight: 'clamp',
          }),
        }}>
          — {source}
        </div>
      )}
    </div>
  );
};
