import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { WordTiming, getWordIndex, TimingProps } from '../validation/timing';
import { checkTextFit } from '../validation/layout';

interface TimedTextProps extends TimingProps {
  /** Full text to display */
  text: string;
  /** Word-level timings from TTS (frame numbers) */
  wordTimings: WordTiming[];
  /** Font size (auto-shrinks if overflow) */
  fontSize?: number;
  /** Color for spoken words */
  spokenColor?: string;
  /** Color for unspoken words */
  unspokenColor?: string;
  /** Highlight color for current word */
  highlightColor?: string;
  debug?: boolean;
}

/**
 * NEW: Karaoke-style word highlighting synced to TTS.
 * Words light up as they're spoken — matches the narration exactly.
 * This is the "within animation" control for TTS matching.
 */
export const TimedText: React.FC<TimedTextProps> = ({
  text,
  wordTimings,
  fontSize,
  spokenColor = '#f5f0e8',
  unspokenColor = '#5a544d',
  highlightColor = '#c9a227',
  debug = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const size = fontSize || height * 0.045;
  const words = text.split(' ');
  const currentIndex = getWordIndex(frame, wordTimings);

  // Validation
  React.useEffect(() => {
    if (debug) {
      const issue = checkTextFit(text, size, width * 0.85, 'TimedText');
      if (issue) {
        console.warn('[TimedText validation]', issue.message, '|', issue.suggestion);
      }
    }
  }, [debug, text, size, width]);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: width * 0.85,
        fontFamily: 'Georgia, serif',
        fontSize: size,
        lineHeight: 1.5,
      }}
    >
      {words.map((word, i) => {
        let color = unspokenColor;
        if (i < currentIndex) color = spokenColor;
        if (i === currentIndex) color = highlightColor;

        // Scale pop on current word
        const isCurrent = i === currentIndex;
        const scale = isCurrent ? 1.1 : 1;

        return (
          <span
            key={i}
            style={{
              color,
              margin: '0 0.2em',
              transform: `scale(${scale})`,
              transition: 'color 0.1s, transform 0.1s',
              display: 'inline-block',
              fontWeight: isCurrent ? 'bold' : 'normal',
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
