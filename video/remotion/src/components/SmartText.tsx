/**
 * SmartText — declarative text with automatic sizing and placement.
 *
 * You declare:
 *   - text: the content
 *   - level: 'hero' | 'title' | 'subtitle' | 'body' (hierarchy)
 *   - at: when it appears (frame)
 *   - timing: how long it stays (frames)
 *
 * The tool figures out:
 *   - fontSize: based on level, text length, and available space
 *   - position: via auto-layout (avoids overlaps, respects priority)
 *   - layout: centered, with proper line breaks
 *
 * No manual fontSize. No manual position tweaking.
 */
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';

export type TextLevel = 'hero' | 'title' | 'subtitle' | 'body';

interface SmartTextProps {
  text: string;
  level?: TextLevel;
  at?: number;
  /** Duration in frames (0 = stays) */
  duration?: number;
  color?: string;
  /** Optional position hint [x, y] as fractions (auto-layout may adjust) */
  position?: [number, number];
  entrance?: 'stamp' | 'fade' | 'typewriter';
}

// Base font sizes per level (at 1280x720)
// Bumped 2026-10-06: keyframe review showed text unreadable at 480x270
const BASE_SIZES: Record<TextLevel, number> = {
  hero: 88,
  title: 68,
  subtitle: 46,
  body: 34,
};

// Priority per level
const LEVEL_PRIORITY: Record<TextLevel, number> = {
  hero: Priority.TITLE,
  title: Priority.TITLE,
  subtitle: Priority.SUBLINE,
  body: Priority.CALLOUT,
};

/**
 * Calculate font size based on text length and level.
 * Longer text gets smaller to fit without wrapping awkwardly.
 */
function autoFontSize(text: string, level: TextLevel): number {
  const base = BASE_SIZES[level];
  const len = text.length;

  // Minimum readable sizes (never go below these)
  const MIN_SIZES: Record<TextLevel, number> = {
    hero: 64,
    title: 48,
    subtitle: 36,
    body: 28,
  };

  let size = base;

  // Scale down for long text, but wrap instead of shrinking to death
  if (level === 'hero' || level === 'title') {
    if (len > 30) size = Math.floor(base * 0.75);
    else if (len > 20) size = Math.floor(base * 0.85);
  } else if (level === 'subtitle') {
    if (len > 50) size = Math.floor(base * 0.8);
    else if (len > 35) size = Math.floor(base * 0.9);
  }

  // Enforce floor
  const floored = Math.max(size, MIN_SIZES[level]);

  // Warn in dev if we're hitting the floor (text too long for level)
  if (floored !== size && typeof console !== 'undefined') {
    console.warn(
      `[SmartText] Text too long for ${level} (len=${len}), ` +
      `clamped to min ${MIN_SIZES[level]}px. Consider shorter text or body level. ` +
      `Text: "${text.slice(0, 50)}..."`
    );
  }

  return floored;
}

/**
 * Estimate text dimensions for layout.
 * Rough: width ≈ fontSize * 0.6 * chars, height ≈ fontSize * 1.2 * lines
 */
function estimateSize(text: string, fontSize: number): [number, number, string[]] {
  const avgCharWidth = fontSize * 0.55;
  const words = text.split(' ');
  
  // Simple line breaking at ~40 chars for hero/title, ~60 for others
  const maxChars = fontSize >= 48 ? 25 : 45;
  let lines: string[] = [];
  let current = '';
  
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current);
  
  const maxLineLen = Math.max(...lines.map(l => l.length));
  const w = maxLineLen * avgCharWidth;
  const h = lines.length * fontSize * 1.25;
  
  return [w, h, lines];
}

export const SmartText: React.FC<SmartTextProps> = ({
  text,
  level = 'title',
  at = 0,
  duration = 0,
  color = '#f5e6c8',
  position = [0.5, 0.2],
  entrance = 'fade',
}) => {
  const frame = useCurrentFrame();
  
  if (frame < at) return null;
  if (duration > 0 && frame > at + duration) return null;
  
  const fontSize = autoFontSize(text, level);
  const [estW, estH, lines] = estimateSize(text, fontSize);
  
  // Position via auto-layout
  const rawX = position[0] * 1280 - estW / 2;
  const rawY = position[1] * 720 - estH / 2;
  
  const { x, y } = useAutoLayout(
    `smarttext-${text.slice(0, 20)}`,
    rawX, rawY, estW, estH,
    LEVEL_PRIORITY[level],
    'text',
    text
  );
  
  // Entrance animation
  const t = frame - at;
  let opacity = 1;
  let scale = 1;
  let translateY = 0;
  
  if (entrance === 'fade') {
    opacity = interpolate(t, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  } else if (entrance === 'stamp') {
    const s = interpolate(t, [0, 8], [1.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    scale = s;
    opacity = interpolate(t, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  }
  
  // Fade out at end if duration set
  if (duration > 0) {
    const fadeStart = duration - 12;
    if (t > fadeStart) {
      opacity *= interpolate(t, [fadeStart, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    }
  }
  
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: estW,
        zIndex: 20,
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        textAlign: 'center',
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: 'Georgia, serif',
            fontSize,
            fontWeight: level === 'hero' || level === 'title' ? 'bold' : 'normal',
            letterSpacing: level === 'hero' ? '2px' : '1px',
            color,
            textShadow: '2px 2px 8px rgba(0,0,0,0.9)',
            lineHeight: 1.25,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};
