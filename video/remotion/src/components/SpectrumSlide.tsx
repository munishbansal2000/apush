import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { TimingProps } from '../validation/timing';

interface SpectrumMarker {
  at: number; // Position on axis (0-1)
  label: string;
  color: [number, number, number] | string;
  /** Move to new position mid-slide */
  move_to?: number;
  /** Frame when movement starts */
  move_start?: number;
}

interface SpectrumSlideProps extends TimingProps {
  axis: [string, string]; // [left_label, right_label]
  markers: SpectrumMarker[];
  title?: string;
  bg?: string;
  /** Frames between marker drops */
  stagger?: number;
  debug?: boolean;
}

/**
 * SpectrumSlide — ported from slideforge.
 *
 * Python: SpectrumSlide(axis, markers=[{at, label, color, move_to, move_start}])
 * Remotion: Same interface. Spring-drop physics for markers.
 *
 * Quality delta: Markers drop with spring physics (bounce slightly on landing)
 * and slide smoothly between positions. This is exactly what Remotion's
 * animation model was built for — PIL can't do this elegantly.
 */
export const SpectrumSlide: React.FC<SpectrumSlideProps> = ({
  axis,
  markers,
  title = '',
  bg = '#1a1512',
  stagger = 30,
  debug = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const axisY = height * 0.55;
  const axisLeft = width * 0.12;
  const axisRight = width * 0.88;
  const axisWidth = axisRight - axisLeft;

  const colorToString = (c: [number, number, number] | string): string => {
    if (typeof c === 'string') return c;
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  };

  const getMarkerX = (at: number) => axisLeft + at * axisWidth;

  // Track markers for validation
  const trackedElements = useMemo((): TrackedElement[] => {
    const els: TrackedElement[] = [];
    if (title) {
      els.push({
        id: 'title', type: 'text', content: title,
        fontSize: height * 0.045, fontWeight: 'bold',
        x: width * 0.05, y: height * 0.08,
        width: width * 0.9, height: height * 0.07,
      });
    }
    // Axis labels
    els.push({
      id: 'axis-left', type: 'text', content: axis[0],
      fontSize: height * 0.032, fontWeight: 'bold',
      x: axisLeft - 100, y: axisY + 30,
      width: 200, height: 40,
    });
    els.push({
      id: 'axis-right', type: 'text', content: axis[1],
      fontSize: height * 0.032, fontWeight: 'bold',
      x: axisRight - 100, y: axisY + 30,
      width: 200, height: 40,
    });
    return els;
  }, [title, axis, width, height, axisLeft, axisRight, axisY]);

  useElementTracker(trackedElements, {
    checkOverlaps: true,
    allowedOverlap: 10,
    debug,
    componentName: 'SpectrumSlide',
  });

  return (
    <div style={{ width, height, backgroundColor: bg, position: 'relative', overflow: 'hidden', fontFamily: 'Georgia, serif' }}>
      {/* Title */}
      {title && (
        <div style={{
          position: 'absolute', top: height * 0.08, left: 0, right: 0,
          textAlign: 'center', fontSize: height * 0.045, fontWeight: 'bold',
          color: '#f5f0e8',
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
        }}>
          {title}
        </div>
      )}

      {/* Axis line */}
      <div style={{
        position: 'absolute',
        left: axisLeft, top: axisY, width: axisWidth, height: 4,
        backgroundColor: '#5a544d',
        borderRadius: 2,
        opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' }),
      }} />

      {/* Axis labels */}
      <div style={{
        position: 'absolute', left: axisLeft - 100, top: axisY + 20,
        width: 200, textAlign: 'center',
        fontSize: height * 0.032, fontWeight: 'bold', color: '#a89f91',
        opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        {axis[0]}
      </div>
      <div style={{
        position: 'absolute', left: axisRight - 100, top: axisY + 20,
        width: 200, textAlign: 'center',
        fontSize: height * 0.032, fontWeight: 'bold', color: '#a89f91',
        opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        {axis[1]}
      </div>

      {/* Markers */}
      {markers.map((marker, i) => {
        const dropFrame = i * stagger;
        if (frame < dropFrame) return null;

        // Drop animation (spring from above)
        const dropProgress = spring({
          frame: frame - dropFrame,
          fps,
          config: { damping: 8, stiffness: 120 }, // Bouncy landing
        });
        const dropY = interpolate(dropProgress, [0, 1], [-100, 0]);
        const dropOpacity = interpolate(dropProgress, [0, 1], [0, 1]);

        // Movement along axis (if specified)
        let currentAt = marker.at;
        if (marker.move_to !== undefined && marker.move_start !== undefined) {
          if (frame >= marker.move_start) {
            const moveProgress = interpolate(
              frame,
              [marker.move_start, marker.move_start + 60],
              [0, 1],
              { extrapolateRight: 'clamp' }
            );
            // Smooth easing for movement
            const eased = moveProgress < 0.5
              ? 2 * moveProgress * moveProgress
              : 1 - Math.pow(-2 * moveProgress + 2, 2) / 2;
            currentAt = marker.at + (marker.move_to - marker.at) * eased;
          }
        }

        const x = getMarkerX(currentAt);
        const color = colorToString(marker.color);

        return (
          <div key={i} style={{
            position: 'absolute',
            left: x - 12,
            top: axisY - 12 + dropY,
            opacity: dropOpacity,
            zIndex: 5,
          }}>
            {/* Marker dot */}
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              backgroundColor: color,
              border: '3px solid #fff',
              boxShadow: `0 0 15px ${color}`,
            }} />
            {/* Label */}
            <div style={{
              position: 'absolute', top: 30, left: -40,
              width: 104, textAlign: 'center',
              fontSize: height * 0.026, fontWeight: 'bold',
              color: '#f5f0e8',
              textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap',
            }}>
              {marker.label}
            </div>
            {/* Stem to axis */}
            <div style={{
              position: 'absolute', top: 24, left: 11,
              width: 2, height: 12,
              backgroundColor: color,
              opacity: 0.7,
            }} />
          </div>
        );
      })}
    </div>
  );
};
