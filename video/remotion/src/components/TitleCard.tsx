import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';
import { useProportions } from '../validation/useProportions';
import { TimingProps } from '../validation/timing';

interface TitleCardProps extends TimingProps {
  /** Main title (e.g., "CAUSES OF THE AMERICAN REVOLUTION") */
  title: string;
  /** Subtitle (e.g., "ACT I:") */
  kicker?: string;
  /** Bottom line (e.g., "SCENE III: REVOLUTIONARY IDEALS") */
  subline?: string;
  /** Background color (Heimler uses red) */
  bgColor?: string;
  /** Frame when it appears */
  at?: number;
  debug?: boolean;
}

/**
 * TitleCard — Heimler-style bold title card.
 *
 * Red banner with white bold text.
 * Kicker on top, main title center, subline below.
 *
 * Like Heimler: "ACT I: CAUSES OF THE AMERICAN REVOLUTION"
 * Like Heimler: "SCENE III: REVOLUTIONARY IDEALS"
 */
export const TitleCard: React.FC<TitleCardProps> = ({
  title,
  kicker,
  subline,
  bgColor = '#d32f2f',
  at = 0,
  debug = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { px } = useProportions([], { debug: false });

  const opacity = interpolate(frame, [at, at + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const slideY = interpolate(frame, [at, at + 20], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cardWidth = Math.min(width * 0.7, 900);
  const rawCardX = (width - cardWidth) / 2;
  const rawCardY = height * 0.32;

  // Main card — highest priority, never moves
  // Registered height 240 matches actual render (padding + kicker + 2-line title)
  const { x: cardX, y: cardYBase } = useAutoLayout(
    'title-card', rawCardX, rawCardY, cardWidth, 240,
    Priority.TITLE, 'text', title
  );

  // Subline — high priority, registered separately so bubbles avoid it
  // Card is ~230px tall (padding + kicker + 2-line title), add margin
  const sublineY = rawCardY + 250;
  const { x: subX, y: subY } = useAutoLayout(
    'title-subline', rawCardX, sublineY, cardWidth, 60,
    Priority.SUBLINE, 'text', subline || ''
  );

  if (frame < at) return null;

  return (
    <>
    <div style={{
      position: 'absolute',
      left: cardX,
      top: cardYBase + slideY,
      width: cardWidth,
      opacity,
      zIndex: 25,
    }}>
      {/* Main red banner */}
      <div style={{
        backgroundColor: bgColor,
        padding: '24px 48px',
        textAlign: 'center',
        boxShadow: '8px 8px 0 rgba(0,0,0,0.25)',
        border: '3px solid #1a1a1a',
      }}>
        {kicker && (
          <div style={{
            fontSize: px(28),
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'Arial, sans-serif',
            letterSpacing: '3px',
            marginBottom: 8,
          }}>
            {kicker}
          </div>
        )}
        <div style={{
          fontSize: px(58),
          fontWeight: 900,
          color: '#fff',
          fontFamily: 'Arial Black, Impact, sans-serif',
          lineHeight: 1.15,
          letterSpacing: '1px',
        }}>
          {title}
        </div>
      </div>
    </div>

      {/* Subline below — separately positioned to avoid overlaps */}
      {subline && (
        <div style={{
          position: 'absolute',
          left: subX,
          top: subY + slideY,
          width: cardWidth,
          textAlign: 'center',
          fontSize: px(38),
          fontWeight: 900,
          color: bgColor,
          fontFamily: 'Arial Black, Impact, sans-serif',
          letterSpacing: '1px',
          textShadow: '2px 2px 0 rgba(255,255,255,0.8)',
          zIndex: 25,
          opacity,
        }}>
          {subline}
        </div>
      )}
    </>
  );
};
