/**
 * ThreeBoxes — the episode's core visual: three checkable boxes.
 *
 * Maize | Iroquois Confederacy | Pristine Wilderness
 * Boxes check off (green) or X out (red) as the episode progresses.
 */
import React from 'react';
import { Img, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';

interface Box {
  id: string;
  label: string;
  image: string;
}

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
  /** Size */
  width?: number;
}

export const ThreeBoxes: React.FC<ThreeBoxesProps> = ({
  checked = [],
  crossed = [],
  at = 0,
  appearOffsets = [0, 0.5, 1],
  fadeOutAt = 0,
  position = [0.5, 0.45],
  width = 900,
}) => {
  const frame = useCurrentFrame();

  useAutoLayout(
    'three-boxes', position[0] * 1280 - width / 2, position[1] * 720 - 120,
    width, 240, Priority.CALLOUT, 'text', 'three boxes'
  );

  if (frame < at) return null;

  // Fade out when pivoting to Cahokia
  let containerOpacity = 1;
  if (fadeOutAt > 0) {
    const fadeFrame = at + fadeOutAt * 30;
    containerOpacity = interpolate(frame - fadeFrame, [0, 15], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }
  if (containerOpacity <= 0) return null;

  const boxWidth = width / 3 - 20;

  return (
    <div style={{
      position: 'absolute',
      left: position[0] * 1280 - width / 2,
      top: position[1] * 720 - 120,
      width,
      display: 'flex',
      gap: 20,
      zIndex: 20,
      opacity: containerOpacity,
    }}>
      {BOXES.map((box, idx) => {
        const appearFrame = at + appearOffsets[idx] * 30;
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
              transform: `translateY(${(1 - appear) * 30}px) scale(${0.9 + appear * 0.1})`,
            }}
          >
            {/* Box with image */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: 140,
              borderRadius: 12,
              overflow: 'hidden',
              border: `3px solid ${isChecked ? '#7fbf7f' : isCrossed ? '#ff6b6b' : '#f5e6c8'}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}>
              <Img
                src={staticFile(box.image)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Check/X overlay */}
              {isChecked && (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: 'rgba(127,191,127,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 64, color: '#7fbf7f', fontWeight: 'bold',
                }}>
                  ✓
                </div>
              )}
              {isCrossed && (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: 'rgba(255,107,107,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 64, color: '#ff6b6b', fontWeight: 'bold',
                }}>
                  ✗
                </div>
              )}
            </div>
            {/* Label */}
            <div style={{
              textAlign: 'center',
              marginTop: 8,
              fontFamily: 'Georgia, serif',
              fontSize: 20,
              fontWeight: 'bold',
              letterSpacing: '1px',
              color: isChecked ? '#7fbf7f' : isCrossed ? '#ff6b6b' : '#f5e6c8',
              textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
            }}>
              {box.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
