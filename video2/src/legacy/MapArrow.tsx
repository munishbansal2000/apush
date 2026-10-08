/**
 * MapArrow — a hand-drawn brushstroke arrow for maps.
 *
 * NOT a geometric arrow. Ink brush with varying width, organic curve —
 * like someone drew it with a calligraphy brush.
 */
import React, { useId } from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';

interface MapArrowProps {
  /** SVG path data for the arrow curve */
  d: string;
  /** Stroke color */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Frame when drawing starts */
  at?: number;
  /** Frames for draw-on animation */
  drawDuration?: number;
  /** Position offset [x, y] in pixels */
  offset?: [number, number];
  width?: number;
  height?: number;
}

export const MapArrow: React.FC<MapArrowProps> = ({
  d,
  color = '#c9a227',
  strokeWidth = 8,
  at = 0,
  drawDuration = 40,
  offset = [0, 0],
  width: svgWidth = 400,
  height: svgHeight = 300,
}) => {
  const frame = useCurrentFrame();
  // Unique per instance; ':' from useId isn't safe inside url(#...)
  const uid = useId().replace(/:/g, '');

  // Draw-on effect: stroke-dashoffset animation
  const drawProgress = interpolate(
    frame,
    [at, at + drawDuration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Normalised path length: every <path> below sets pathLength={1}, so the
  // dash pattern and offset work in [0, 1] regardless of the real length.
  const dashArray = '1 1';
  const dashOffset = 1 - drawProgress;

  const { x, y } = useAutoLayout(
    `arrow-${uid}`, offset[0], offset[1], svgWidth, svgHeight,
    Priority.DECORATION, 'shape', 'map arrow',
    { overlapGroup: 'map-annotations' }
  );

  if (frame < at) return null;

  // Unique filter ID per instance
  const filterId = `brush-${uid}`;

  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y,
      width: svgWidth,
      height: svgHeight,
      zIndex: 12,
      pointerEvents: 'none',
    }}>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3" />
          </filter>
          {/* Hand-drawn arrowhead marker — brush flicks, not a triangle */}
          <marker
            id={`ah-${filterId}`}
            markerWidth="24"
            markerHeight="24"
            refX="18"
            refY="12"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d="M 3,3 Q 10,10 19,12"
              stroke={color}
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 3,21 Q 10,14 19,12"
              stroke={color}
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </marker>
        </defs>

        {/* Brushstroke arrow — varying width via layered strokes */}
        {/* Wide soft underlayer (brush body) */}
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 6}
          strokeLinecap="round"
          opacity="0.25"
          filter={`url(#${filterId})`}
          pathLength={1}
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          markerEnd={drawProgress > 0.9 ? `url(#ah-${filterId})` : undefined}
        />
        {/* Main brushstroke */}
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          filter={`url(#${filterId})`}
          pathLength={1}
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          markerEnd={drawProgress > 0.9 ? `url(#ah-${filterId})` : undefined}
        />
        {/* Thin highlight (brush texture) */}
        <path
          d={d}
          fill="none"
          stroke="#ffffff"
          strokeWidth={strokeWidth * 0.25}
          strokeLinecap="round"
          opacity="0.35"
          pathLength={1}
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
        />
      </svg>
    </div>
  );
};
