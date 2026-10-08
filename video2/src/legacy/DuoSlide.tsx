import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface DuoSlideProps {
  leftImage: string;
  rightImage: string;
  leftLabel?: string;
  rightLabel?: string;
  leftSub?: string;
  rightSub?: string;
}

const Panel: React.FC<{
  image: string;
  label: string;
  sub: string;
  anim: number;
  side: 'left' | 'right';
  /** width / 1280 */
  sx: number;
  /** height / 720 */
  sy: number;
}> = ({
  image,
  label,
  sub,
  anim,
  side,
  sx,
  sy,
}) => {
  const x = interpolate(anim, [0, 1], [(side === 'left' ? -50 : 50) * sx, 0]);
  const opacity = interpolate(anim, [0, 1], [0, 1]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity,
        transform: `translateX(${x}px)`,
        padding: 20 * sx,
      }}
    >
      <div
        style={{
          width: '100%',
          height: 400 * sy,
          borderRadius: 12 * sx,
          overflow: 'hidden',
          boxShadow: `0 ${8 * sx}px ${32 * sx}px rgba(0,0,0,0.4)`,
        }}
      >
        <Img
          src={image}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      {label && (
        <div
          style={{
            marginTop: 16 * sy,
            fontSize: 36 * sx,
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {label}
        </div>
      )}
      {sub && (
        <div
          style={{
            marginTop: 8 * sy,
            fontSize: 24 * sx,
            color: '#aaa',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};

/**
 * DuoSlide — Two images side by side for visual comparison.
 * No text-heavy analysis — let the images speak.
 */
export const DuoSlide: React.FC<DuoSlideProps> = ({
  leftImage,
  rightImage,
  leftLabel = '',
  rightLabel = '',
  leftSub = '',
  rightSub = '',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // Hard-coded 1280×720 values scale with the frame (identical at 1280×720).
  const sx = width / 1280;
  const sy = height / 720;

  const leftIn = spring({ frame, fps, config: { damping: 200 } });
  const rightIn = spring({ frame: frame - 10, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a2e',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '5%',
        boxSizing: 'border-box',
      }}
    >
      <Panel image={leftImage} label={leftLabel} sub={leftSub} anim={leftIn} side="left" sx={sx} sy={sy} />
      <div style={{ width: 40 * sx }} />
      <Panel image={rightImage} label={rightLabel} sub={rightSub} anim={rightIn} side="right" sx={sx} sy={sy} />
    </AbsoluteFill>
  );
};
