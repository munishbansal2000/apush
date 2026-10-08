import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, Img, staticFile } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';

export type BubbleArt =
  | 'oval-hatched'      // bubble_oval_hatched — speech bubble with tail
  | 'circular-hatched'  // bubble_circular_hatched
  | 'circular-1' | 'circular-2' | 'circular-3'
  | 'cloud' | 'cloud2'  // thought bubbles
  | 'rect' | 'rect2'    // rectangular
  | 'rounded'
  | 'random';           // pick randomly from all 10 (seeded, no flicker)

const BUBBLE_FILES: Record<Exclude<BubbleArt, 'random'>, string> = {
  'oval-hatched': 'bubbles/bubble_oval_hatched.webp',
  'circular-hatched': 'bubbles/bubble_circular_hatched.webp',
  'circular-1': 'bubbles/circular_bubble_1.webp',
  'circular-2': 'bubbles/circular_bubble_2.webp',
  'circular-3': 'bubbles/circular_bubble_3.webp',
  'cloud': 'bubbles/shape_cloud.webp',
  'cloud2': 'bubbles/shape_cloud2.webp',
  'rect': 'bubbles/shape_rect.webp',
  'rect2': 'bubbles/shape_rect2.webp',
  'rounded': 'bubbles/shape_rounded.webp',
};

const ALL_ARTS = Object.keys(BUBBLE_FILES) as Array<Exclude<BubbleArt, 'random'>>;

/** Deterministic pick from text — same text always gets same bubble */
function pickArt(text: string, seed = 0): Exclude<BubbleArt, 'random'> {
  let hash = seed;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return ALL_ARTS[Math.abs(hash) % ALL_ARTS.length];
}

interface SpeechBubbleProps {
  text: string;
  position?: [number, number];
  /** Which hand-drawn bubble art to use, or 'random' for variety */
  art?: BubbleArt;
  /** Seed for random pick — same seed + text = same bubble */
  randomSeed?: number;
  width?: number;
  fontSize?: number;
  at?: number;
  textColor?: string;
  rotation?: number;
}

/**
 * SpeechBubble — real hand-drawn bubble art (user-supplied).
 * Text overlays the bubble image. No SVG fakery.
 */
export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  text,
  position = [0.3, 0.25],
  art = 'oval-hatched',
  randomSeed = 0,
  width: bubbleWidth = 440,
  fontSize = 36,
  at = 0,
  textColor = '#1a1a1a',
  rotation = -2,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // CONSTRAINT: max bubble width 380px (was 440, ate 40% of frame)
  // CONSTRAINT: min font size 20px (was shrinking to illegible)
  // Clamping is normal behavior, not an error — no log spam.
  const constrainedWidth = Math.min(bubbleWidth, 380);
  const constrainedFontSize = Math.max(fontSize, 20);

  // Resolve 'random' to a deterministic pick (no flicker between frames)
  const resolvedArt = art === 'random' ? pickArt(text, randomSeed) : art;

  const popScale = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: { damping: 9, stiffness: 160 },
  });
  const wobble = Math.sin((frame - at) / 25) * 1.2;

  const rawX = position[0] * width;
  const rawY = position[1] * height;

  // Register top-left bounds, get auto-adjusted center via priority layout
  const { x: adjX, y: adjY } = useAutoLayout(
    'speech-bubble',
    rawX - constrainedWidth / 2, rawY - (constrainedWidth * 0.7) / 2,
    constrainedWidth, constrainedWidth * 0.7,
    Priority.BUBBLE, 'image', text
  );
  // Convert back to center (adjustment is a pure translation)
  const x = adjX + constrainedWidth / 2;
  const y = adjY + (constrainedWidth * 0.7) / 2;

  if (frame < at) return null;

  // Debug: show adjustment (temporarily always on)
  const showDebug = false;

  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y,
      width: constrainedWidth,
      transform: `translate(-50%, -50%) scale(${popScale}) rotate(${rotation + wobble}deg)`,
      zIndex: 30,
    }}>
      {showDebug && (
        <div style={{ position: 'absolute', top: -30, left: 0, color: 'lime', fontSize: 14, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          adj: {Math.round(x - rawX)}, {Math.round(y - rawY)}
        </div>
      )}
      <div style={{ position: 'relative', width: '100%' }}>
        <Img
          src={staticFile(BUBBLE_FILES[resolvedArt])}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        {/* Text centered in bubble interior (~65% of image) */}
        <div style={{
          position: 'absolute',
          top: '12%',
          left: '12%',
          right: '12%',
          bottom: '22%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: constrainedFontSize,
            fontWeight: 800,
            fontFamily: 'Arial Black, Impact, "Helvetica Neue", sans-serif',
            color: textColor,
            textAlign: 'center',
            lineHeight: 1.2,
            letterSpacing: '0.5px',
          }}>
            {text}
          </div>
        </div>
      </div>
    </div>
  );
};
