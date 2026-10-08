/**
 * ShipRoute — a ship sailing along a map route.
 *
 * The ship follows an SVG path, banking into turns, with wake trail.
 * For maps, voyages, trade routes — Columbus, triangular trade, etc.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';

/** URLs / absolute paths / staticFile() results pass through; bare paths go through staticFile(). */
const resolveSrc = (src: string): string =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

const DEFAULT_SHIP_SRC = 'tallship-real.webp';

interface ShipRouteProps {
  /** Waypoints for the journey: [[x, y], ...] in pixels */
  waypoints: Array<[number, number]>;
  /** Map image behind */
  mapSrc?: string;
  /** Frame when ship starts moving */
  at?: number;
  /** Frames for full journey */
  duration?: number;
  /** Ship size */
  shipSize?: number;
  /** Show wake trail */
  wake?: boolean;
  /** Show route line */
  showRoute?: boolean;
  /** Route line color */
  routeColor?: string;
  /** Port markers: [x, y, label] */
  ports?: Array<{ x: number; y: number; label: string }>;
  /** Ship image: public/ path or URL (default 'tallship-real.webp') */
  shipSrc?: string;
}

export const ShipRoute: React.FC<ShipRouteProps> = ({
  waypoints,
  mapSrc,
  at = 0,
  duration = 180,
  shipSize = 72,
  wake = true,
  showRoute = true,
  routeColor = '#c9a227',
  ports = [],
  shipSrc = DEFAULT_SHIP_SRC,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const t = Math.max(0, Math.min(1, (frame - at) / duration));

  // Ease in-out for natural acceleration/deceleration
  const eased = t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;

  // Build SVG path from waypoints for the route line
  const routePath = waypoints.length > 1
    ? `M ${waypoints[0][0]},${waypoints[0][1]}` +
      waypoints.slice(1).map(([x, y]) => ` L ${x},${y}`).join('')
    : '';

  useAutoLayout(
    'ship-route', 0, 0, width, height,
    Priority.BACKGROUND, 'image', 'map route'
  );

  if (frame < at) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
      {mapSrc && (
        <Img
          src={resolveSrc(mapSrc)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* Route line */}
      {showRoute && routePath && (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          {/* Full route (dashed, faint) */}
          <path
            d={routePath}
            fill="none"
            stroke={routeColor}
            strokeWidth={3}
            strokeDasharray="10 8"
            strokeLinecap="round"
            opacity={0.4}
          />
          {/* Traveled portion (solid) */}
          <path
            d={routePath}
            fill="none"
            stroke={routeColor}
            strokeWidth={4}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100 * (1 - t)}
            opacity={0.9}
          />
        </svg>
      )}

      {/* Port markers */}
      {ports.map((port, i) => {
        const reached = t >= (i + 1) / (ports.length + 1);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: port.x - 12,
              top: port.y - 12,
              zIndex: 11,
            }}
          >
            <div style={{
              width: 24, height: 24,
              borderRadius: '48% 52% 50% 50%',
              backgroundColor: reached ? routeColor : 'rgba(255,255,255,0.4)',
              border: `3px solid ${reached ? '#fff' : 'rgba(255,255,255,0.6)'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              transform: `scale(${reached ? 1.2 : 1})`,
            }} />
            <div style={{
              position: 'absolute',
              top: 28, left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              fontFamily: 'Georgia, serif',
              fontSize: 15,
              fontStyle: 'italic',
              color: '#fff',
              textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
            }}>
              {port.label}
            </div>
          </div>
        );
      })}

      {/* Ship following waypoints */}
      <WaypointShip
        waypoints={waypoints}
        t={eased}
        shipSize={shipSize}
        wake={wake}
        shipSrc={shipSrc}
      />
    </div>
  );
};

/**
 * WaypointShip — ship following waypoints with banking and bobbing.
 * Uses explicit waypoints for deterministic positioning.
 */
export const WaypointShip: React.FC<{
  waypoints: Array<[number, number]>;
  t: number;
  shipSize?: number;
  wake?: boolean;
  /** Ship image: public/ path or URL (default 'tallship-real.webp') */
  shipSrc?: string;
}> = ({ waypoints, t, shipSize = 72, wake = true, shipSrc = DEFAULT_SHIP_SRC }) => {
  const frame = useCurrentFrame(); // before any early return (Rules of Hooks)
  if (waypoints.length < 2) return null;

  // Find segment
  const totalSegments = waypoints.length - 1;
  const segT = t * totalSegments;
  const segIndex = Math.min(Math.floor(segT), totalSegments - 1);
  const segProgress = segT - segIndex;

  const [x1, y1] = waypoints[segIndex];
  const [x2, y2] = waypoints[segIndex + 1];

  const x = interpolate(segProgress, [0, 1], [x1, x2]);
  const y = interpolate(segProgress, [0, 1], [y1, y2]);

  // Banking: tilt into the turn
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  // Next segment angle for banking
  let bank = 0;
  if (segIndex < totalSegments - 1) {
    const [nx, ny] = waypoints[segIndex + 2] || waypoints[segIndex + 1];
    const nextAngle = Math.atan2(ny - y2, nx - x2) * (180 / Math.PI);
    let diff = nextAngle - angle;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    bank = Math.max(-18, Math.min(18, diff * 0.4));
  }

  // Bobbing
  const bob = Math.sin(frame / 18) * 4;
  const pitch = Math.sin(frame / 24) * 2;

  return (
    <div style={{
      position: 'absolute',
      left: x - shipSize / 2,
      top: y - shipSize / 2 + bob,
      width: shipSize,
      height: shipSize,
      zIndex: 12,
      transform: `rotate(${bank + pitch}deg)`,
    }}>
      {/* Wake trail */}
      {wake && (
        <div style={{
          position: 'absolute',
          left: -shipSize * 0.8,
          top: '45%',
          width: shipSize * 0.9,
          height: shipSize * 0.25,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35))',
          borderRadius: '50%',
          filter: 'blur(4px)',
          transform: `rotate(${-angle}deg)`,
          transformOrigin: 'right center',
        }} />
      )}
      <Img
        src={resolveSrc(shipSrc)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(3px 5px 8px rgba(0,0,0,0.4))',
          transform: x2 < x1 ? 'scaleX(-1)' : 'none',
        }}
      />
    </div>
  );
};

// Re-export WaypointShip as standalone for direct use
