/**
 * TradeRoutes — animated trade arrows on the Ortelius map.
 *
 * Turquoise from Southwest, shell from Gulf Coast — arrows draw themselves
 * showing hundreds of miles of Native trade networks.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';

interface TradeRoute {
  id: string;
  label: string;
  from: [number, number];  // fractions
  to: [number, number];
  color: string;
}

const ROUTES: TradeRoute[] = [
  {
    id: 'turquoise',
    label: 'Turquoise',
    from: [0.25, 0.35],  // Southwest (Pueblo region on Ortelius)
    to: [0.3, 0.55],     // Mesoamerica (HISPANIA NOVA)
    color: '#40e0d0',
  },
  {
    id: 'copper',
    label: 'Copper',
    from: [0.45, 0.25],  // Great Lakes (upper North America)
    to: [0.4, 0.45],     // Mississippi valley
    color: '#ff8c00',
  },
  {
    id: 'shell',
    label: 'Shell',
    from: [0.45, 0.55],  // Gulf Coast
    to: [0.38, 0.42],    // Inland
    color: '#f5e6c8',
  },
];

interface TradeRoutesProps {
  at?: number;
  /** Which routes are active */
  active?: string[];
  /** Absolute frame when each route starts drawing (word-anchored) */
  routeTimings?: Record<string, number>;
}

export const TradeRoutes: React.FC<TradeRoutesProps> = ({
  at = 0,
  active = ['turquoise', 'copper', 'shell'],
  routeTimings = {},
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  // Authored at 1280x720; pixel constants scale with the frame width.
  const k = width / 1280;

  useAutoLayout('trade-routes', 0, 0, width, height, Priority.CALLOUT, 'shape', 'trade arrows');

  if (frame < at) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {ROUTES.filter(r => active.includes(r.id) || routeTimings[r.id] !== undefined).map((route, idx) => {
          // Use word-anchored timing if provided, else staggered
          const routeAt = routeTimings[route.id] ?? (at + idx * 20);
          const progress = interpolate(frame - routeAt, [0, 40], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const x1 = route.from[0] * width;
          const y1 = route.from[1] * height;
          const x2 = route.to[0] * width;
          const y2 = route.to[1] * height;

          // Curved path (quadratic bezier)
          const cx = (x1 + x2) / 2;
          const cy = Math.min(y1, y2) - 60 * k;
          const pathD = `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;

          // Arrowhead position at progress
          const t = progress;
          const ax = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
          const ay = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;

          return (
            <g key={route.id}>
              {/* Route path (draws on) */}
              <path
                d={pathD}
                fill="none"
                stroke={route.color}
                strokeWidth={4 * k}
                strokeLinecap="round"
                // Normalised length: draws fully regardless of the path's pixel length.
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - progress}
                opacity={0.8}
              />
              {/* Moving dot */}
              {progress > 0 && progress < 1 && (
                <circle
                  cx={ax}
                  cy={ay}
                  r={8 * k}
                  fill={route.color}
                  opacity={0.9}
                />
              )}
              {/* Label */}
              {progress > 0.5 && (
                <text
                  x={(x1 + x2) / 2}
                  y={Math.min(y1, y2) - 80 * k}
                  textAnchor="middle"
                  fontFamily="Georgia, serif"
                  fontSize={22 * k}
                  fontStyle="italic"
                  fill="#fff"
                  stroke="rgba(0,0,0,0.8)"
                  strokeWidth={4 * k}
                  paintOrder="stroke"
                >
                  {route.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
