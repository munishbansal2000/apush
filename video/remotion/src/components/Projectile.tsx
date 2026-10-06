/**
 * Projectile — cannonballs, musket shots with real ballistic physics.
 *
 * Parabolic arc, smoke trail, impact burst. Not a straight line —
 * gravity pulls it down, giving that heavy arc.
 */
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';

interface ProjectileProps {
  /** Start [x, y] in pixels */
  from: [number, number];
  /** End [x, y] in pixels */
  to: [number, number];
  /** Frame when fired */
  at?: number;
  /** Arc height (pixels above the straight line) */
  arcHeight?: number;
  /** Frames for flight */
  duration?: number;
  /** Size of projectile */
  size?: number;
  /** Color */
  color?: string;
  /** Show smoke trail */
  smokeTrail?: boolean;
  /** Show impact burst */
  impact?: boolean;
}

export const Projectile: React.FC<ProjectileProps> = ({
  from,
  to,
  at = 0,
  arcHeight = 120,
  duration = 45,
  size = 14,
  color = '#1a1512',
  smokeTrail = true,
  impact = true,
}) => {
  const frame = useCurrentFrame();
  const t = Math.max(0, Math.min(1, (frame - at) / duration));

  // Ballistic: linear X, parabolic Y (peaks at t=0.5)
  const x = interpolate(t, [0, 1], [from[0], to[0]]);
  const linearY = interpolate(t, [0, 1], [from[1], to[1]]);
  const arc = Math.sin(t * Math.PI) * -arcHeight;
  const y = linearY + arc;

  // Rotation for tumbling
  const tumble = t * 720;

  // Impact
  const hasImpacted = frame >= at + duration;
  const impactT = hasImpacted ? Math.min(1, (frame - at - duration) / 20) : 0;
  const impactScale = impact ? interpolate(impactT, [0, 1], [0.5, 3]) : 0;
  const impactOpacity = impact ? interpolate(impactT, [0, 1], [0.9, 0]) : 0;

  // Smoke trail positions (last N frames)
  const trailLength = 12;
  const trail: Array<{ x: number; y: number; opacity: number; size: number }> = [];
  if (smokeTrail && t > 0 && t < 1) {
    for (let i = 1; i <= trailLength; i++) {
      const tt = Math.max(0, t - (i / trailLength) * 0.25);
      if (tt <= 0) continue;
      const tx = interpolate(tt, [0, 1], [from[0], to[0]]);
      const tly = interpolate(tt, [0, 1], [from[1], to[1]]);
      const ta = Math.sin(tt * Math.PI) * -arcHeight;
      trail.push({
        x: tx,
        y: tly + ta,
        opacity: 0.35 * (1 - i / trailLength),
        size: size * (0.6 + (i / trailLength) * 1.8),
      });
    }
  }

  useAutoLayout(
    `projectile-${at}`, from[0] - 50, from[1] - 50, 100, 100,
    Priority.DECORATION, 'shape', 'projectile',
    { overlapGroup: 'projectiles' }
  );
  // Note: projectiles use direct positioning (they're transient)
  // Layout is for broad-phase only

  if (frame < at) return null;
  if (hasImpacted && impactT >= 1 && !smokeTrail) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none' }}>
      {/* Smoke trail */}
      {trail.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.x - s.size / 2,
            top: s.y - s.size / 2,
            width: s.size,
            height: s.size,
            borderRadius: '48% 52% 50% 50%',
            backgroundColor: 'rgba(200,200,200,0.5)',
            opacity: s.opacity,
            filter: 'blur(3px)',
          }}
        />
      ))}

      {/* Projectile (tumbling cannonball) */}
      {t < 1 && (
        <div style={{
          position: 'absolute',
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: '47% 53% 50% 50%',
          background: `radial-gradient(circle at 35% 30%, #4a4a4a, ${color})`,
          transform: `rotate(${tumble}deg)`,
          boxShadow: '2px 3px 6px rgba(0,0,0,0.5)',
        }} />
      )}

      {/* Impact burst */}
      {hasImpacted && impact && impactT < 1 && (
        <>
          <div style={{
            position: 'absolute',
            left: to[0] - 30 * impactScale,
            top: to[1] - 30 * impactScale,
            width: 60 * impactScale,
            height: 60 * impactScale,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,200,80,0.9), rgba(255,100,30,0.4), transparent)',
            opacity: impactOpacity,
          }} />
          {/* Debris */}
          {[0, 1, 2, 3, 4, 5].map(i => {
            const angle = (i / 6) * Math.PI * 2;
            const dist = impactT * 80;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: to[0] + Math.cos(angle) * dist - 4,
                  top: to[1] + Math.sin(angle) * dist - 4 - impactT * 30,
                  width: 8,
                  height: 8,
                  borderRadius: '40% 60% 50% 50%',
                  backgroundColor: '#3a2c18',
                  opacity: 1 - impactT,
                }}
              />
            );
          })}
        </>
      )}
    </div>
  );
};

/**
 * CannonVolley — multiple projectiles fired in sequence.
 */
export const CannonVolley: React.FC<{
  from: [number, number];
  targets: Array<[number, number]>;
  at?: number;
  interval?: number;
  arcHeight?: number;
}> = ({ from, targets, at = 0, interval = 12, arcHeight = 120 }) => {
  return (
    <>
      {targets.map((target, i) => (
        <Projectile
          key={i}
          from={from}
          to={target}
          at={at + i * interval}
          arcHeight={arcHeight + (i % 3) * 20}
          duration={40 + (i % 3) * 8}
        />
      ))}
    </>
  );
};
