import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { FONT, COLOR, alpha } from '../theme/tokens';
import { useTextScale } from './reveal';

/** URLs, data URIs and already-resolved paths pass through; bare names go through staticFile. */
const resolveSrc = (src: string) =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

interface KenBurnsSlideProps {
  image: string;
  caption?: string;
  title?: string;
  stops?: [[number, number, number], [number, number, number]];
}

export const KenBurnsSlide: React.FC<KenBurnsSlideProps> = ({
  image,
  caption = '',
  title = '',
  stops = [
    [0.5, 0.5, 1.0],
    [0.5, 0.5, 1.25],
  ],
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const ts = useTextScale();

  // Interpolate between stops
  const progress = frame / durationInFrames;
  const [x1, y1, s1] = stops[0];
  const [x2, y2, s2] = stops[1];

  // Ease in-out
  const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  const x = x1 + (x2 - x1) * eased;
  const y = y1 + (y2 - y1) * eased;
  const scale = s1 + (s2 - s1) * eased;

  const captionOpacity = interpolate(frame, [durationInFrames - 30, durationInFrames - 10], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: COLOR.night,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ken Burns image */}
      <Img
        src={resolveSrc(image)}
        style={{
          position: 'absolute',
          width: width * scale,
          height: height * scale,
          left: width / 2 - (width * scale * x),
          top: height / 2 - (height * scale * y),
          objectFit: 'cover',
        }}
      />

      {/* Dark gradient for text legibility */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: height * 0.4,
          background: `linear-gradient(transparent, ${alpha(COLOR.night, 0.8)})`,
        }}
      />

      {/* Title */}
      {title && (
        <div
          style={{
            position: 'absolute',
            top: height * 0.08,
            left: width * 0.06,
            fontSize: height * 0.05 * ts,
            fontWeight: 'bold',
            color: COLOR.onNight,
            fontFamily: FONT.text,
            textShadow: `2px 2px 8px ${alpha(COLOR.night, 0.8)}`,
            opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          {title}
        </div>
      )}

      {/* Caption */}
      {caption && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.06,
            left: width * 0.06,
            right: width * 0.06,
            fontSize: height * 0.032 * ts,
            color: COLOR.onNight,
            fontFamily: FONT.text,
            textShadow: `1px 1px 4px ${alpha(COLOR.night, 0.9)}`,
            opacity: captionOpacity,
            lineHeight: 1.4,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
};
