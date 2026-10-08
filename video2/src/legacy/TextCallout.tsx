/**
 * TextCallout — bold text burned directly onto the image.
 *
 * NO bubble, NO box, NO background. Just text with presence —
 * like a headline stamped onto the scene.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';

interface TextCalloutProps {
  text: string;
  position?: [number, number];
  fontSize?: number;
  /** Ink color (overrides `theme`) */
  color?: string;
  /**
   * Scene brightness, used only when `color` is not given:
   * 'dark' (default) → light parchment ink #f5e6c8; 'light' → dark ink #1a1512.
   */
  theme?: 'dark' | 'light';
  /** Stamp, fade, or typewriter entrance */
  entrance?: 'stamp' | 'fade' | 'typewriter';
  at?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
}

export const TextCallout: React.FC<TextCalloutProps> = ({
  text,
  position = [0.5, 0.5],
  fontSize = 42,
  color: colorProp,
  theme = 'dark',
  entrance = 'stamp',
  at = 0,
  maxWidth = 600,
  align = 'center',
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  // Old default #1a1512 was invisible on the (mostly dark) scenes; every existing
  // caller passes color explicitly, so this only affects new callers.
  const color = colorProp ?? (theme === 'light' ? '#1a1512' : '#f5e6c8');

  const localFrame = Math.max(0, frame - at);

  // Stamp: scale from large with slight rotation, like a rubber stamp
  const stampScale = entrance === 'stamp'
    ? spring({ frame: localFrame, fps, config: { damping: 9, stiffness: 300 } })
    : 1;
  const stampRotate = entrance === 'stamp'
    ? (1 - Math.min(1, localFrame / 12)) * -8
    : 0;
  const stampOpacity = entrance === 'stamp'
    ? Math.min(1, localFrame / 6)
    : 1;

  // Fade: simple opacity
  const fadeOpacity = entrance === 'fade'
    ? Math.min(1, localFrame / 20)
    : 1;

  // Typewriter: reveal characters progressively
  const visibleChars = entrance === 'typewriter'
    ? Math.floor((localFrame / 2))
    : text.length;
  const displayText = entrance === 'typewriter'
    ? text.slice(0, visibleChars)
    : text;

  const rawX = position[0] * width - maxWidth / 2;
  const rawY = position[1] * height - fontSize;

  // Estimate height: ~1.3 lines
  const estHeight = fontSize * 1.4 * Math.ceil(text.length / 30);

  const { x, y } = useAutoLayout(
    `text-${text.slice(0, 20)}`, rawX, rawY, maxWidth, estHeight,
    Priority.SUBLINE, 'text', text
  );

  if (frame < at) return null;

  const filterId = `ink-${text.length * 13 % 10000}`;

  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y,
      width: maxWidth,
      zIndex: 20,
      transform: `scale(${stampScale}) rotate(${stampRotate}deg)`,
      opacity: Math.min(stampOpacity, fadeOpacity),
      pointerEvents: 'none',
    }}>
      <svg width={maxWidth} height={estHeight + 20} style={{ overflow: 'visible' }}>
        <defs>
          <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="2" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.5" />
          </filter>
        </defs>
        <foreignObject x="0" y="0" width={maxWidth} height={estHeight + 20}>
          <div
            // @ts-ignore
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              fontSize,
              fontWeight: 900,
              fontFamily: 'Arial Black, Impact, sans-serif',
              color,
              textAlign: align,
              lineHeight: 1.25,
              letterSpacing: '0.5px',
              // Ink texture + subtle emboss for presence without a box
              filter: `url(#${filterId})`,
              textShadow: `
                1px 1px 0 rgba(255,255,255,0.4),
                -0.5px -0.5px 0 rgba(0,0,0,0.15)
              `,
            }}
          >
            {displayText}
            {entrance === 'typewriter' && visibleChars < text.length && (
              <span style={{ opacity: 0.7 }}>▍</span>
            )}
          </div>
        </foreignObject>
      </svg>
    </div>
  );
};
