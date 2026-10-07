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
  const { fps } = useVideoConfig();

  const leftIn = spring({ frame, fps, config: { damping: 200 } });
  const rightIn = spring({ frame: frame - 10, fps, config: { damping: 200 } });

  const Panel = ({
    image,
    label,
    sub,
    anim,
    side,
  }: {
    image: string;
    label: string;
    sub: string;
    anim: number;
    side: 'left' | 'right';
  }) => {
    const x = interpolate(anim, [0, 1], [side === 'left' ? -50 : 50, 0]);
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
          padding: 20,
        }}
      >
        <div
          style={{
            width: '100%',
            height: 400,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
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
              marginTop: 16,
              fontSize: 36,
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
              marginTop: 8,
              fontSize: 24,
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

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a2e',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '5%',
      }}
    >
      <Panel image={leftImage} label={leftLabel} sub={leftSub} anim={leftIn} side="left" />
      <div style={{ width: 40 }} />
      <Panel image={rightImage} label={rightLabel} sub={rightSub} anim={rightIn} side="right" />
    </AbsoluteFill>
  );
};
