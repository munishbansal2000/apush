import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface SplitSlideProps {
  image: string;
  headline: string;
  body?: string;
  imageLeft?: boolean;
}

/**
 * SplitSlide — Image on one side, text on the other.
 * For one image + short supporting copy. Not for lists.
 */
export const SplitSlide: React.FC<SplitSlideProps> = ({
  image,
  headline,
  body = '',
  imageLeft = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imageIn = spring({ frame, fps, config: { damping: 200 } });
  const textIn = spring({ frame: frame - 12, fps, config: { damping: 200 } });

  const imageX = interpolate(imageIn, [0, 1], [imageLeft ? -60 : 60, 0]);
  const imageOpacity = interpolate(imageIn, [0, 1], [0, 1]);
  const textX = interpolate(textIn, [0, 1], [imageLeft ? 60 : -60, 0]);
  const textOpacity = interpolate(textIn, [0, 1], [0, 1]);

  const ImagePanel = () => (
    <div
      style={{
        flex: 1,
        opacity: imageOpacity,
        transform: `translateX(${imageX}px)`,
        borderRadius: 12,
        overflow: 'hidden',
        height: '80%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <Img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );

  const TextPanel = () => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 40px',
        opacity: textOpacity,
        transform: `translateX(${textX}px)`,
      }}
    >
      <div
        style={{
          fontSize: 52,
          fontWeight: 800,
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1.2,
          marginBottom: body ? 20 : 0,
        }}
      >
        {headline}
      </div>
      {body && (
        <div
          style={{
            fontSize: 28,
            color: '#ccc',
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1.5,
          }}
        >
          {body}
        </div>
      )}
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a2e',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '5%',
      }}
    >
      {imageLeft ? (
        <>
          <ImagePanel />
          <TextPanel />
        </>
      ) : (
        <>
          <TextPanel />
          <ImagePanel />
        </>
      )}
    </AbsoluteFill>
  );
};
