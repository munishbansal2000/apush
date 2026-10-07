import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface Highlight {
  text: string;
  note?: string;
}

interface HighlightSlideProps {
  title?: string;
  body: string;
  highlights: Highlight[];
  accent?: string;
}

/**
 * HighlightSlide — Text with RedPen-style annotations.
 * For close reading of a document. Highlights key phrases
 * with hand-drawn style underlines and margin notes.
 */
export const HighlightSlide: React.FC<HighlightSlideProps> = ({
  title = '',
  body,
  highlights,
  accent = '#ff6b6b',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleIn, [0, 1], [0, 1]);

  // Render body with highlights
  const renderBody = () => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Find all highlight positions
    const matches: { start: number; end: number; highlight: Highlight; index: number }[] = [];
    highlights.forEach((h, hi) => {
      const idx = body.indexOf(h.text);
      if (idx !== -1) {
        matches.push({ start: idx, end: idx + h.text.length, highlight: h, index: hi });
      }
    });
    matches.sort((a, b) => a.start - b.start);

    matches.forEach((m) => {
      // Text before highlight
      if (m.start > lastIndex) {
        parts.push(
          <span key={`pre-${m.index}`}>{body.slice(lastIndex, m.start)}</span>
        );
      }

      // Highlighted text with underline animation
      const hlIn = spring({
        frame: frame - 20 - m.index * 15,
        fps,
        config: { damping: 200 },
      });
      const underlineScale = interpolate(hlIn, [0, 1], [0, 1]);

      parts.push(
        <span
          key={`hl-${m.index}`}
          style={{ position: 'relative', display: 'inline-block' }}
        >
          <span style={{ position: 'relative', zIndex: 1 }}>{m.highlight.text}</span>
          <span
            style={{
              position: 'absolute',
              bottom: 2,
              left: -2,
              right: -2,
              height: 8,
              backgroundColor: accent,
              opacity: 0.4,
              transform: `scaleX(${underlineScale})`,
              transformOrigin: 'left',
              borderRadius: 4,
            }}
          />
          {m.highlight.note && (
            <span
              style={{
                position: 'absolute',
                top: -28,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 18,
                color: accent,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                opacity: underlineScale,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {m.highlight.note}
            </span>
          )}
        </span>
      );

      lastIndex = m.end;
    });

    // Remaining text
    if (lastIndex < body.length) {
      parts.push(<span key="post">{body.slice(lastIndex)}</span>);
    }

    return parts;
  };

  const bodyIn = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const bodyOpacity = interpolate(bodyIn, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#f5f0e1',
        padding: '6% 8%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: '#2c2c2c',
            marginBottom: 32,
            fontFamily: 'Georgia, serif',
            opacity: titleOpacity,
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          fontSize: 32,
          color: '#2c2c2c',
          fontFamily: 'Georgia, serif',
          lineHeight: 1.8,
          opacity: bodyOpacity,
        }}
      >
        {renderBody()}
      </div>
    </AbsoluteFill>
  );
};
