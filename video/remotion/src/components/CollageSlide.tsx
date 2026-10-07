import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface CollageItem {
  image: string;
  label?: string;
}

interface CollageSlideProps {
  items: CollageItem[];
  title?: string;
  columns?: number;
}

/**
 * CollageSlide — Multiple images in a grid.
 * For "many examples of X". Each image gets a label.
 */
export const CollageSlide: React.FC<CollageSlideProps> = ({
  items,
  title = '',
  columns = 3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleIn, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a2e',
        padding: '4%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: '#fff',
            textAlign: 'center',
            marginBottom: 24,
            fontFamily: 'system-ui, sans-serif',
            opacity: titleOpacity,
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 16,
          alignContent: 'center',
        }}
      >
        {items.map((item, i) => {
          const itemIn = spring({
            frame: frame - i * 8,
            fps,
            config: { damping: 200 },
          });
          const scale = interpolate(itemIn, [0, 1], [0.8, 1]);
          const opacity = interpolate(itemIn, [0, 1], [0, 1]);

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `scale(${scale})`,
                borderRadius: 8,
                overflow: 'hidden',
                position: 'relative',
                aspectRatio: '4/3',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              <Img
                src={item.image}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {item.label && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '8px 12px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    color: '#fff',
                    fontSize: 20,
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
