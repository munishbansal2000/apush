import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, COLOR, TYPE, RADIUS, alpha } from '../theme/tokens';

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
  const { fps, width } = useVideoConfig();
  // Hard-coded 1280×720 px values scale with the frame (identical at 1280×720).
  const k = width / 1280;

  // intentional: critically damped (no overshoot) entrance
  const titleIn = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleIn, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLOR.night,
        padding: '4%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {title && (
        <div
          style={{
            fontSize: TYPE.h2 * k,
            fontWeight: 800,
            color: COLOR.onNight,
            textAlign: 'center',
            marginBottom: 24 * k,
            fontFamily: FONT.ui,
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
          gap: 16 * k,
          alignContent: 'center',
        }}
      >
        {items.map((item, i) => {
          const itemIn = spring({
            frame: frame - i * 8,
            fps,
            config: { damping: 200 }, // intentional: critically damped, no overshoot
          });
          const scale = interpolate(itemIn, [0, 1], [0.8, 1]);
          const opacity = interpolate(itemIn, [0, 1], [0, 1]);

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `scale(${scale})`,
                borderRadius: RADIUS.md * k,
                overflow: 'hidden',
                position: 'relative',
                aspectRatio: '4/3',
                boxShadow: `0 ${4 * k}px ${16 * k}px ${alpha(COLOR.night, 0.3)}`,
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
                    padding: `${8 * k}px ${12 * k}px`,
                    background: `linear-gradient(transparent, ${alpha(COLOR.night, 0.8)})`,
                    color: COLOR.onNight,
                    fontSize: TYPE.body * k,
                    fontFamily: FONT.ui,
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
