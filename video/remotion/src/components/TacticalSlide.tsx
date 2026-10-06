import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { TimingProps } from '../validation/timing';

interface TacticalSlideProps extends TimingProps {
  title?: string;
  blue_label?: string;
  red_label?: string;
  /** When red dots begin appearing (in frames) */
  red_start?: number;
  /** When red dots finish appearing (in frames) */
  red_end?: number;
  n_blue?: number;
  n_red?: number;
  bg?: string;
  debug?: boolean;
}

/**
 * TacticalSlide — ported from slideforge.
 *
 * Python: TacticalSlide(title, blue_label, red_label, red_start, red_end, n_blue, n_red)
 * Remotion: Same interface, but with smooth interpolated paths, motion trails, and spring easing.
 *
 * This is the biggest quality delta: PIL draws dots frame-by-frame (flipbook).
 * Remotion interpolates positions smoothly with motion trails — broadcast graphic quality.
 *
 * Blue force: positioned in center, static with subtle pulse.
 * Red force: appears progressively, moves along curved paths to surround blue.
 */
export const TacticalSlide: React.FC<TacticalSlideProps> = ({
  title = '',
  blue_label = '',
  red_label = '',
  red_start = 30,
  red_end = 120,
  n_blue = 12,
  n_red = 28,
  bg = '#1a2a1a',
  debug = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const cx = width / 2;
  const cy = height / 2;

  // Deterministic seeded positions (same as Python: seeded RNG)
  const { blueDots, redDots } = useMemo(() => {
    // Seeded pseudo-random (mulberry32)
    let seed = 42;
    const rand = () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Blue: clustered in center (defensive position)
    const blue = Array.from({ length: n_blue }, (_, i) => {
      const angle = (i / n_blue) * Math.PI * 2 + rand() * 0.5;
      const r = 30 + rand() * 50;
      return {
        id: `blue-${i}`,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r * 0.7,
        delay: rand() * 10,
      };
    });

    // Red: start from edges, converge to surround blue
    const red = Array.from({ length: n_red }, (_, i) => {
      const angle = (i / n_red) * Math.PI * 2;
      // Start position: far from center (off-screen edges)
      const startR = Math.max(width, height) * 0.6;
      const startX = cx + Math.cos(angle) * startR;
      const startY = cy + Math.sin(angle) * startR;
      // End position: ring around blue
      const endR = 120 + rand() * 40;
      const endX = cx + Math.cos(angle) * endR;
      const endY = cy + Math.sin(angle) * endR * 0.8;
      // Control point for curved path (bows outward)
      const midX = (startX + endX) / 2 + (rand() - 0.5) * 100;
      const midY = (startY + endY) / 2 + (rand() - 0.5) * 100;

      return {
        id: `red-${i}`,
        startX, startY, midX, midY, endX, endY,
        appearFrame: red_start + (i / n_red) * (red_end - red_start),
      };
    });

    return { blueDots: blue, redDots: red };
  }, [n_blue, n_red, cx, cy, width, height, red_start, red_end]);

  // Track all dots for validation
  const trackedElements = useMemo((): TrackedElement[] => {
    const els: TrackedElement[] = [];
    if (title) {
      els.push({
        id: 'title', type: 'text', content: title,
        fontSize: height * 0.04, fontWeight: 'bold',
        x: width * 0.05, y: height * 0.03,
        width: width * 0.9, height: height * 0.06,
      });
    }
    // Only track visible dots (not off-screen)
    for (const d of blueDots) {
      els.push({
        id: d.id, type: 'shape', content: 'blue dot',
        x: d.x - 8, y: d.y - 8, width: 16, height: 16,
      });
    }
    return els;
  }, [title, blueDots, width, height]);

  useElementTracker(trackedElements, {
    checkOverlaps: false, // Dots naturally cluster
    debug,
    componentName: 'TacticalSlide',
  });

  // Quadratic bezier interpolation for red dots
  const getRedPosition = (dot: typeof redDots[0]) => {
    if (frame < dot.appearFrame) return null; // Not yet appeared

    const moveDuration = 60; // Frames to travel
    const t = Math.min(1, (frame - dot.appearFrame) / moveDuration);
    // Ease in-out cubic
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Quadratic bezier: P0=start, P1=control, P2=end
    const x = (1 - eased) * (1 - eased) * dot.startX
      + 2 * (1 - eased) * eased * dot.midX
      + eased * eased * dot.endX;
    const y = (1 - eased) * (1 - eased) * dot.startY
      + 2 * (1 - eased) * eased * dot.midY
      + eased * eased * dot.endY;

    // Fade in
    const opacity = interpolate(frame, [dot.appearFrame, dot.appearFrame + 15], [0, 1], {
      extrapolateRight: 'clamp',
    });

    return { x, y, opacity, progress: eased };
  };

  return (
    <div style={{ width, height, backgroundColor: bg, position: 'relative', overflow: 'hidden' }}>
      {/* Grid background (tactical feel) */}
      <svg width={width} height={height} style={{ position: 'absolute', opacity: 0.1 }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fff" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
      </svg>

      {/* Title */}
      {title && (
        <div style={{
          position: 'absolute', top: height * 0.03, left: width * 0.05,
          fontSize: height * 0.04, fontWeight: 'bold', color: '#fff',
          fontFamily: 'Georgia, serif', zIndex: 10,
        }}>
          {title}
        </div>
      )}

      {/* Blue force (defenders) */}
      {blueDots.map((dot) => {
        const pulse = 1 + 0.1 * Math.sin((frame + dot.delay * 10) / 20);
        return (
          <div
            key={dot.id}
            style={{
              position: 'absolute',
              left: dot.x - 8 * pulse,
              top: dot.y - 8 * pulse,
              width: 16 * pulse,
              height: 16 * pulse,
              borderRadius: '50%',
              backgroundColor: '#4a90d9',
              border: '2px solid #fff',
              boxShadow: '0 0 10px #4a90d9',
              zIndex: 5,
            }}
          />
        );
      })}

      {/* Red force (attackers) with motion trails */}
      {redDots.map((dot) => {
        const pos = getRedPosition(dot);
        if (!pos) return null;

        return (
          <React.Fragment key={dot.id}>
            {/* Motion trail */}
            {[0.3, 0.5, 0.7].map((trailT, i) => {
              const tt = Math.max(0, pos.progress - (i + 1) * 0.08);
              const tx = (1 - tt) * (1 - tt) * dot.startX
                + 2 * (1 - tt) * tt * dot.midX
                + tt * tt * dot.endX;
              const ty = (1 - tt) * (1 - tt) * dot.startY
                + 2 * (1 - tt) * tt * dot.midY
                + tt * tt * dot.endY;
              return (
                <div
                  key={`trail-${i}`}
                  style={{
                    position: 'absolute',
                    left: tx - 6, top: ty - 6,
                    width: 12, height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#d94a4a',
                    opacity: pos.opacity * trailT * 0.4,
                    zIndex: 4,
                  }}
                />
              );
            })}
            {/* Main dot */}
            <div
              style={{
                position: 'absolute',
                left: pos.x - 8, top: pos.y - 8,
                width: 16, height: 16,
                borderRadius: '50%',
                backgroundColor: '#d94a4a',
                border: '2px solid #fff',
                boxShadow: '0 0 10px #d94a4a',
                opacity: pos.opacity,
                zIndex: 6,
              }}
            />
          </React.Fragment>
        );
      })}

      {/* Labels */}
      <div style={{
        position: 'absolute', bottom: height * 0.05, left: width * 0.05,
        display: 'flex', gap: width * 0.04, zIndex: 10,
        fontFamily: 'Georgia, serif', fontSize: height * 0.028,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#4a90d9', border: '2px solid #fff' }} />
          <span style={{ color: '#fff' }}>{blue_label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#d94a4a', border: '2px solid #fff' }} />
          <span style={{ color: '#fff' }}>{red_label}</span>
        </div>
      </div>
    </div>
  );
};
