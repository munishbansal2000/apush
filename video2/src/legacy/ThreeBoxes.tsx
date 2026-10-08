/**
 * ThreeBoxes — the episode's core visual: three checkable boxes.
 *
 * Maize | Iroquois Confederacy | Pristine Wilderness
 * Boxes check off (green) or X out (red) as the episode progresses.
 */
import React from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';

export interface ThreeBoxesItem {
  /** Id used by `checked` / `crossed` */
  id: string;
  label: string;
  /** public/ path or URL */
  image: string;
}
type Box = ThreeBoxesItem;

/** URLs / absolute paths / staticFile() results pass through; bare paths go through staticFile(). */
const resolveSrc = (src: string): string =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

const BOXES: Box[] = [
  { id: 'maize', label: 'MAIZE', image: 'historic/fuchs_maize_1542.jpg' },
  { id: 'iroquois', label: 'IROQUOIS', image: 'historic/wampum-belt.jpg' },
  { id: 'wilderness', label: 'WILDERNESS?', image: 'historic/stradanus_wilderness_crop.jpg' },
];

interface ThreeBoxesProps {
  /** Which boxes are checked: 'maize' | 'iroquois' | 'wilderness' */
  checked?: string[];
  /** Which boxes are X'd out */
  crossed?: string[];
  /** Frame when boxes appear */
  at?: number;
  /** Per-box appear offsets in seconds (measured from TTS) */
  appearOffsets?: number[];
  /** Offset in seconds when boxes fade out (0 = never) */
  fadeOutAt?: number;
  /** Position [x, y] as fractions */
  position?: [number, number];
  /** Size (px at 1280-wide; scales with the composition width) */
  width?: number;
  /** Box contents (default: the U1E1 Maize / Iroquois / Wilderness boxes) */
  boxes?: ThreeBoxesItem[];
  /** Per-id image overrides for the boxes, e.g. { maize: 'my/maize.jpg' } */
  images?: Record<string, string>;
}

export const ThreeBoxes: React.FC<ThreeBoxesProps> = ({
  checked = [],
  crossed = [],
  at = 0,
  appearOffsets = [0, 0.5, 1],
  fadeOutAt = 0,
  position = [0.5, 0.45],
  width: widthProp = 900,
  boxes = BOXES,
  images = {},
}) => {
  const frame = useCurrentFrame();
  const { width: frameW, height: frameH, fps } = useVideoConfig();
  // Authored at 1280x720 / 30fps; pixel constants scale with the frame width.
  const k = frameW / 1280;
  const width = widthProp * k;
  const left = position[0] * frameW - width / 2;
  const top = position[1] * frameH - 120 * k;

  useAutoLayout(
    'three-boxes', left, top,
    width, 240 * k, Priority.CALLOUT, 'text', 'three boxes'
  );

  if (frame < at) return null;

  // Fade out when pivoting to Cahokia
  let containerOpacity = 1;
  if (fadeOutAt > 0) {
    const fadeFrame = at + fadeOutAt * fps;
    containerOpacity = interpolate(frame - fadeFrame, [0, 15], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }
  if (containerOpacity <= 0) return null;

  const boxWidth = width / Math.max(1, boxes.length) - 20 * k;

  return (
    <div style={{
      position: 'absolute',
      left,
      top,
      width,
      display: 'flex',
      gap: 20 * k,
      zIndex: 20,
      opacity: containerOpacity,
    }}>
      {boxes.map((box, idx) => {
        const appearFrame = at + (appearOffsets[idx] ?? idx * 0.5) * fps;
        const appear = interpolate(frame - appearFrame, [0, 12], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const isChecked = checked.includes(box.id);
        const isCrossed = crossed.includes(box.id);

        return (
          <div
            key={box.id}
            style={{
              width: boxWidth,
              opacity: appear,
              transform: `translateY(${(1 - appear) * 30 * k}px) scale(${0.9 + appear * 0.1})`,
            }}
          >
            {/* Box with image */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: 140 * k,
              borderRadius: 12 * k,
              overflow: 'hidden',
              border: `${3 * k}px solid ${isChecked ? '#7fbf7f' : isCrossed ? '#ff6b6b' : '#f5e6c8'}`,
              boxShadow: `0 ${4 * k}px ${16 * k}px rgba(0,0,0,0.4)`,
            }}>
              <Img
                src={resolveSrc(images[box.id] ?? box.image)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Check/X overlay */}
              {isChecked && (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: 'rgba(127,191,127,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 64 * k, color: '#7fbf7f', fontWeight: 'bold',
                }}>
                  ✓
                </div>
              )}
              {isCrossed && (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: 'rgba(255,107,107,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 64 * k, color: '#ff6b6b', fontWeight: 'bold',
                }}>
                  ✗
                </div>
              )}
            </div>
            {/* Label */}
            <div style={{
              textAlign: 'center',
              marginTop: 8 * k,
              fontFamily: 'Georgia, serif',
              fontSize: 20 * k,
              fontWeight: 'bold',
              letterSpacing: `${k}px`,
              color: isChecked ? '#7fbf7f' : isCrossed ? '#ff6b6b' : '#f5e6c8',
              textShadow: `${k}px ${k}px ${4 * k}px rgba(0,0,0,0.8)`,
            }}>
              {box.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
