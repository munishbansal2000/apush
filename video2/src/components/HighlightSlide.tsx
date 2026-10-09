import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, COLOR, TYPE, RADIUS } from '../theme/tokens';
import { useRevealFrames, useTextScale } from './reveal';

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
  accent = COLOR.red,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  // Hard-coded 1280×720 px values scale with the frame (identical at 1280×720).
  const k = width / 1280;
  const revealFrames = useRevealFrames();
  const ts = useTextScale();
  // Notes float above their phrase; give them a line gap to sit in so they never land on the previous line.
  const hasNotes = highlights.some(h => h.note);

  // intentional: critically damped (no overshoot) entrances
  const titleIn = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleIn, [0, 1], [0, 1]);

  // Render body with highlights
  const renderBody = () => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Find all highlight positions
    // Every occurrence of every phrase; the note is shown on the first occurrence only.
    const matches: { start: number; end: number; highlight: Highlight; index: number; first: boolean }[] = [];
    highlights.forEach((h, hi) => {
      if (!h.text) return;
      let idx = body.indexOf(h.text);
      let first = true;
      while (idx !== -1) {
        matches.push({ start: idx, end: idx + h.text.length, highlight: h, index: hi, first });
        first = false;
        idx = body.indexOf(h.text, idx + h.text.length);
      }
    });
    // Earliest first; on ties the longer phrase wins
    matches.sort((a, b) => a.start - b.start || b.end - a.end);

    matches.forEach((m) => {
      // Skip a match that overlaps one already rendered (would duplicate text)
      if (m.start < lastIndex) return;

      // Text before highlight
      if (m.start > lastIndex) {
        parts.push(
          <span key={`pre-${m.start}`}>{body.slice(lastIndex, m.start)}</span>
        );
      }

      // Highlighted text with underline animation
      const hlIn = spring({
        frame: frame - (revealFrames?.[m.index] ?? 20 + m.index * 15),
        fps,
        config: { damping: 200 }, // intentional: critically damped, no overshoot
      });
      const underlineScale = interpolate(hlIn, [0, 1], [0, 1]);

      parts.push(
        <span
          key={`hl-${m.start}`}
          style={{ position: 'relative', display: 'inline-block' }}
        >
          <span data-guard-item={`highlight ${m.index + 1}`} style={{ position: 'relative', zIndex: 1 }}>{m.highlight.text}</span>
          <span
            style={{
              position: 'absolute',
              bottom: 2 * k,
              left: -2 * k,
              right: -2 * k,
              height: 8 * k,
              backgroundColor: accent,
              opacity: 0.4,
              transform: `scaleX(${underlineScale})`,
              transformOrigin: 'left',
              borderRadius: RADIUS.sm * k,
            }}
          />
          {m.first && m.highlight.note && (
            <span
              data-guard-item={`note ${m.index + 1}`}
              style={{
                position: 'absolute',
                top: -30 * k * ts,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: TYPE.label * k * ts,
                color: accent,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                opacity: underlineScale,
                fontFamily: FONT.ui,
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
        backgroundColor: COLOR.paper,
        padding: '6% 8%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {title && (
        <div
          style={{
            fontSize: TYPE.h2 * k * ts,
            fontWeight: 800,
            color: COLOR.ink,
            marginBottom: 32 * k,
            fontFamily: FONT.text,
            opacity: titleOpacity,
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          fontSize: TYPE.h3 * k * ts,
          color: COLOR.ink,
          fontFamily: FONT.text,
          lineHeight: hasNotes ? 2.4 : 1.8,
          opacity: bodyOpacity,
        }}
      >
        {renderBody()}
      </div>
    </AbsoluteFill>
  );
};
