import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { TimingProps } from '../validation/timing';
import { useRevealFrames, useTextScale } from '../directed/reveal';
import { FONT, COLOR, RADIUS, alpha } from '../theme/tokens';

interface SpectrumMarker {
  at: number; // Position on axis (0-1)
  label: string;
  /** Optional: the component assigns a deterministic accessible accent. */
  color?: [number, number, number] | string;
  /** Move to new position mid-slide */
  move_to?: number;
  /** Frame when movement starts */
  move_start?: number;
}

const DEFAULT_MARKER_COLORS = [
  COLOR.goldOnNight,
  COLOR.skyOnNight,
  COLOR.mintOnNight,
  COLOR.redOnNight,
] as const;

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
/** Label row per marker: markers closer than `minGap` on the axis alternate rows so their labels don't collide. */
export function spectrumLabelRows(positions: number[], minGap = 0.16): number[] {
  const order = positions.map((at, i) => ({at, i})).sort((a, b) => a.at - b.at);
  const rows = new Array<number>(positions.length).fill(0);
  const lastInRow: number[] = [];
  for (const {at, i} of order) {
    let row = 0;
    while (lastInRow[row] !== undefined && at - lastInRow[row] < minGap) row++;
    rows[i] = row;
    lastInRow[row] = at;
  }
  return rows;
}

export const SpectrumSlide: React.FC<SpectrumSlideProps> = ({
  axis,
  markers,
  title = '',
  bg = COLOR.nightPanel,
  stagger = 30,
  debug = false,
  enterDuration,
  exitDuration,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const revealFrames = useRevealFrames();
  const ts = useTextScale();
  const labelRows = spectrumLabelRows(markers.map(m => m.at));
  // TimingProps (optional, defaults unchanged): enterDuration stretches each
  // marker's drop spring to N frames; exitDuration fades the slide out at the end.
  const exitOpacity = exitDuration && exitDuration > 0
    ? interpolate(frame, [durationInFrames - exitDuration, durationInFrames], [1, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : 1;

  const axisY = height * 0.55;
  const axisLeft = width * 0.12;
  const axisRight = width * 0.88;
  const axisWidth = axisRight - axisLeft;

  const colorToString = (c: [number, number, number] | string): string => {
    if (typeof c === 'string') return c;
    return '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
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
    <div style={{ width, height, backgroundColor: bg, position: 'relative', overflow: 'hidden', fontFamily: FONT.text, opacity: exitOpacity }}>
      {/* Title */}
      {title && (
        <div style={{
          position: 'absolute', top: height * 0.08, left: 0, right: 0,
          textAlign: 'center', fontSize: height * 0.045 * ts, fontWeight: 'bold',
          color: COLOR.onNight,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
        }}>
          {title}
        </div>
      )}

      {/* Axis line */}
      <div style={{
        position: 'absolute',
        left: axisLeft, top: axisY, width: axisWidth, height: 4,
        backgroundColor: COLOR.onNightMuted,
        borderRadius: RADIUS.sm,
        opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' }),
      }} />

      {/* Axis end labels sit ABOVE the axis, centred on each end; marker labels go below, so they never meet. */}
      {[axis[0], axis[1]].map((label, end) => (
        <div key={end} data-guard-item={`axis ${end ? 'right' : 'left'}`} style={{
          position: 'absolute', left: end ? axisRight : axisLeft, bottom: height - axisY + 18,
          transform: 'translateX(-50%)', whiteSpace: 'nowrap',
          fontSize: height * 0.032 * ts, fontWeight: 'bold', color: COLOR.onNightMuted,
          opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' }),
        }}>
          {label}
        </div>
      ))}

      {/* Markers */}
      {markers.map((marker, i) => {
        const dropFrame = revealFrames?.[i] ?? i * stagger;
        if (frame < dropFrame) return null;

        // Drop animation (spring from above)
        const dropProgress = spring({
          frame: frame - dropFrame,
          fps,
          config: { damping: 8, stiffness: 120 }, // intentional: bouncy landing (more overshoot than MOTION.spring)
          ...(enterDuration && enterDuration > 0 ? { durationInFrames: enterDuration } : {}),
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
        const color = colorToString(marker.color ?? DEFAULT_MARKER_COLORS[i % DEFAULT_MARKER_COLORS.length]);

        return (
          <div key={i} data-guard-moving={dropProgress < 0.99 ? '' : undefined} style={{
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
              border: `3px solid ${COLOR.onNight}`,
              boxShadow: `0 0 15px ${color}`,
            }} />
            {/* Label */}
            <div data-guard-item={`marker ${i + 1}`} style={{
              position: 'absolute', left: 12, top: 30 + labelRows[i] * height * 0.026 * ts * 1.5,
              transform: 'translateX(-50%)', textAlign: 'center',
              fontSize: height * 0.026 * ts, fontWeight: 'bold',
              color: COLOR.onNight,
              textShadow: `1px 1px 4px ${alpha(COLOR.night, 0.8)}`,
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
