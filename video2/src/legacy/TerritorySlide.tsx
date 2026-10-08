import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { TimingProps } from '../validation/timing';

interface Territory {
  at: [number, number]; // [cx, cy] as fractions of frame
  rx: number; // x radius as fraction
  ry: number; // y radius as fraction
  label: string;
  date?: string;
  color: [number, number, number] | string;
}

interface TerritorySlideProps extends TimingProps {
  map_image: string;
  territories: Territory[];
  title?: string;
  /** Frames between territory appearances */
  stagger?: number;
  bg?: string;
  debug?: boolean;
}

/** URLs / absolute paths / staticFile() results pass through; bare paths go through staticFile(). */
const resolveSrc = (src: string): string =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

/**
 * TerritorySlide — ported from slideforge.
 *
 * Python: TerritorySlide(map_image, territories, title, stagger=1.6)
 * Remotion: Same interface. SVG ellipse fills with animated borders.
 *
 * Quality delta: PIL does mask compositing (static). Remotion does
 * SVG morph fills — territories grow with spring physics, borders
 * draw themselves, date stamps pop in. For map-heavy episodes,
 * this is "alive" vs "highlighted."
 */
export const TerritorySlide: React.FC<TerritorySlideProps> = ({
  map_image,
  territories,
  title = '',
  stagger = 48, // ~1.6s at 30fps
  bg = '#1a1512',
  debug = false,
  enterDuration,
  exitDuration,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  // TimingProps: enterDuration = border-draw length (default 30 frames, as before);
  // exitDuration (optional) fades the whole slide out over the last N frames.
  const borderFrames = Math.max(1, enterDuration ?? 30);
  const exitOpacity = exitDuration && exitDuration > 0
    ? interpolate(frame, [durationInFrames - exitDuration, durationInFrames], [1, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : 1;

  const colorToString = (c: [number, number, number] | string): string => {
    if (typeof c === 'string') return c;
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  };

  // Track territory labels for validation
  const trackedElements = useMemo((): TrackedElement[] => {
    const els: TrackedElement[] = [];
    if (title) {
      els.push({
        id: 'title', type: 'text', content: title,
        fontSize: height * 0.045, fontWeight: 'bold',
        x: width * 0.05, y: height * 0.03,
        width: width * 0.9, height: height * 0.07,
      });
    }
    territories.forEach((t, i) => {
      const cx = t.at[0] * width;
      const cy = t.at[1] * height;
      els.push({
        id: `territory-${i}-label`, type: 'text', content: t.label,
        fontSize: height * 0.03, fontWeight: 'bold',
        x: cx - 100, y: cy - 20,
        width: 200, height: 40,
      });
    });
    return els;
  }, [title, territories, width, height]);

  useElementTracker(trackedElements, {
    checkOverlaps: true,
    allowedOverlap: 20, // Labels may be near each other
    debug,
    componentName: 'TerritorySlide',
  });

  return (
    <div style={{ width, height, backgroundColor: bg, position: 'relative', overflow: 'hidden', opacity: exitOpacity }}>
      {/* Base map */}
      <Img
        src={resolveSrc(map_image)}
        style={{
          position: 'absolute', width, height,
          objectFit: 'cover', opacity: 0.9,
        }}
      />

      {/* Dark overlay for contrast */}
      <div style={{
        position: 'absolute', width, height,
        backgroundColor: 'rgba(0,0,0,0.25)',
      }} />

      {/* Title */}
      {title && (
        <div style={{
          position: 'absolute', top: height * 0.03, left: width * 0.05,
          fontSize: height * 0.045, fontWeight: 'bold', color: '#fff',
          fontFamily: 'Georgia, serif', textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
          zIndex: 10,
        }}>
          {title}
        </div>
      )}

      {/* Territories as SVG */}
      <svg width={width} height={height} style={{ position: 'absolute', zIndex: 5 }}>
        {territories.map((t, i) => {
          const appearFrame = i * stagger;
          const progress = spring({
            frame: Math.max(0, frame - appearFrame),
            fps,
            config: { damping: 14, stiffness: 80 },
          });

          if (frame < appearFrame) return null;

          const cx = t.at[0] * width;
          const cy = t.at[1] * height;
          const rx = t.rx * width * progress;
          const ry = t.ry * height * progress;
          const color = colorToString(t.color);
          const opacity = interpolate(progress, [0, 1], [0, 0.45]);

          // Border draw animation (stroke-dashoffset)
          const circumference = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);
          const borderProgress = interpolate(
            frame,
            [appearFrame, appearFrame + borderFrames],
            [circumference, 0],
            { extrapolateRight: 'clamp' }
          );

          return (
            <g key={i}>
              {/* Fill */}
              <ellipse
                cx={cx} cy={cy} rx={Math.max(1, rx)} ry={Math.max(1, ry)}
                fill={color}
                opacity={opacity}
              />
              {/* Animated border */}
              <ellipse
                cx={cx} cy={cy} rx={Math.max(1, rx)} ry={Math.max(1, ry)}
                fill="none"
                stroke={color}
                strokeWidth={3}
                opacity={0.9}
                strokeDasharray={circumference}
                strokeDashoffset={borderProgress}
              />
            </g>
          );
        })}
      </svg>

      {/* Labels + dates (HTML for better text rendering) */}
      {territories.map((t, i) => {
        const appearFrame = i * stagger + 20;
        if (frame < appearFrame) return null;

        const labelProgress = spring({
          frame: frame - appearFrame,
          fps,
          config: { damping: 12, stiffness: 150 },
        });
        const scale = interpolate(labelProgress, [0, 1], [0.5, 1]);
        const opacity = interpolate(labelProgress, [0, 1], [0, 1]);

        const cx = t.at[0] * width;
        const cy = t.at[1] * height;
        const color = colorToString(t.color);

        return (
          <div
            key={`label-${i}`}
            style={{
              position: 'absolute',
              left: cx - 100,
              top: cy - 45,
              width: 200,
              textAlign: 'center',
              transform: `scale(${scale})`,
              opacity,
              zIndex: 6,
            }}
          >
            <div style={{
              fontSize: height * 0.032,
              fontWeight: 'bold',
              color: '#fff',
              fontFamily: 'Georgia, serif',
              textShadow: '2px 2px 6px rgba(0,0,0,0.9)',
            }}>
              {t.label}
            </div>
            {t.date && (
              <div style={{
                display: 'inline-block',
                fontSize: height * 0.026,
                color: '#fff',
                backgroundColor: color,
                padding: '2px 10px',
                borderRadius: 10,
                marginTop: 4,
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}>
                {t.date}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
