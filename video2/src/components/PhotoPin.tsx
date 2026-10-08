/**
 * PhotoPin — a historic image pinned to the scene.
 *
 * NOT a white rectangle frame. A photo with tape corners, slight curl,
 * pinned at an angle — like it's stuck to a corkboard of history.
 */
import React, { useId } from 'react';
import { useCurrentFrame, useVideoConfig, spring, staticFile, Img } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';
import { COLOR, FONT, MOTION, TYPE, alpha } from '../theme/tokens';

/** URLs, data URIs and already-resolved paths pass through; bare names go through staticFile. */
const resolveSrc = (src: string) =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

interface PhotoPinProps {
  src: string;
  position?: [number, number];
  width?: number;
  rotation?: number;
  at?: number;
  caption?: string;
}

export const PhotoPin: React.FC<PhotoPinProps> = ({
  src,
  position = [0.5, 0.4],
  width: photoWidth = 420,
  rotation = 3,
  at = 0,
  caption,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  // Unique per instance; ':' from useId isn't safe inside url(#...)
  const uid = useId().replace(/:/g, '');

  const pinDrop = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: MOTION.spring,
  });
  const sway = Math.sin((frame - at) / 35) * 1.2;

  const photoHeight = photoWidth * 0.68;
  const rawX = position[0] * width - photoWidth / 2;
  const rawY = position[1] * height - photoHeight / 2;

  const { x, y } = useAutoLayout(
    `photo-${uid}`, rawX, rawY, photoWidth, photoHeight + 40,
    Priority.DECORATION, 'image', caption || 'photo'
  );

  if (frame < at) return null;

  const filterId = `curl-${uid}`;
  const vignetteId = `vig-${uid}`;

  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y,
      width: photoWidth,
      zIndex: 14,
      transform: `rotate(${rotation + sway}deg) scale(${pinDrop})`,
      transformOrigin: 'top center',
      filter: `drop-shadow(5px 8px 14px ${alpha(COLOR.night, 0.4)})`,
    }}>
      <svg viewBox={`0 0 ${photoWidth} ${photoHeight + 30}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        <defs>
          <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
          </filter>
          <clipPath id={`photo-clip-${filterId}`}>
            <path
              d={`M 8,6 Q ${photoWidth / 2},2 ${photoWidth - 8},8 Q ${photoWidth - 2},${photoHeight / 2} ${photoWidth - 10},${photoHeight - 4} Q ${photoWidth / 2},${photoHeight + 2} 10,${photoHeight - 6} Q 4,${photoHeight / 2} 8,6 Z`}
              filter={`url(#${filterId})`}
            />
          </clipPath>
        </defs>

        {/* Photo with organic (non-rectangular) edges */}
        <g clipPath={`url(#photo-clip-${filterId})`}>
          <foreignObject x="0" y="0" width={photoWidth} height={photoHeight + 10}>
            <div
              // @ts-ignore
              xmlns="http://www.w3.org/1999/xhtml"
              style={{ width: '100%', height: '100%', overflow: 'hidden' }}
            >
              <Img
                src={resolveSrc(src)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </foreignObject>
          {/* Sepia wash for historic feel */}
          <rect x="0" y="0" width={photoWidth} height={photoHeight + 10} fill={alpha(COLOR.brown, 0.08)} />
          {/* Vignette */}
          <rect x="0" y="0" width={photoWidth} height={photoHeight + 10} fill={`url(#${vignetteId})`} opacity="0.3" />
          <defs>
            <radialGradient id={vignetteId} cx="50%" cy="50%" r="70%">
              <stop offset="60%" stopColor="transparent" />
              <stop offset="100%" stopColor={alpha(COLOR.night, 0.35)} />
            </radialGradient>
          </defs>
        </g>

        {/* Edge definition (organic, not a border) */}
        <path
          d={`M 8,6 Q ${photoWidth / 2},2 ${photoWidth - 8},8 Q ${photoWidth - 2},${photoHeight / 2} ${photoWidth - 10},${photoHeight - 4} Q ${photoWidth / 2},${photoHeight + 2} 10,${photoHeight - 6} Q 4,${photoHeight / 2} 8,6 Z`}
          fill="none"
          stroke={alpha(COLOR.ink, 0.4)}
          strokeWidth="2"
          filter={`url(#${filterId})`}
        />
      </svg>

      {/* Tape corners — not geometric, slightly crinkled */}
      <div style={{
        position: 'absolute',
        top: -12, left: 24,
        width: 90, height: 28,
        backgroundColor: alpha(COLOR.paperDeep, 0.75),
        transform: 'rotate(-8deg)',
        clipPath: 'polygon(2% 10%, 98% 0%, 100% 90%, 95% 100%, 4% 95%, 0% 85%)',
        boxShadow: `1px 2px 4px ${alpha(COLOR.night, 0.2)}`,
        backdropFilter: 'blur(1px)',
      }} />
      <div style={{
        position: 'absolute',
        top: -10, right: 30,
        width: 80, height: 26,
        backgroundColor: alpha(COLOR.paperDeep, 0.7),
        transform: 'rotate(6deg)',
        clipPath: 'polygon(0% 5%, 97% 8%, 100% 88%, 93% 100%, 3% 92%)',
        boxShadow: `1px 2px 4px ${alpha(COLOR.night, 0.2)}`,
      }} />

      {/* Pin */}
      <div style={{
        position: 'absolute',
        top: -14, left: '50%',
        transform: 'translateX(-50%)',
        width: 22, height: 22,
        borderRadius: '46% 54% 52% 48%',
        background: `radial-gradient(circle at 35% 30%, ${COLOR.red}, ${COLOR.redDeep})`,
        boxShadow: `2px 3px 6px ${alpha(COLOR.night, 0.4)}`,
      }} />

      {caption && (
        <div style={{
          marginTop: 6,
          textAlign: 'center',
          fontFamily: FONT.hand,
          fontSize: TYPE.town,
          color: alpha(COLOR.onNight, 0.9),
          textShadow: `1px 1px 3px ${alpha(COLOR.night, 0.8)}`,
          transform: 'rotate(-1deg)',
        }}>
          {caption}
        </div>
      )}
    </div>
  );
};
