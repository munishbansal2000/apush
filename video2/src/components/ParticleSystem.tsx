import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { COLOR } from '../theme/tokens';

interface ParticleSystemProps {
  /** Number of particles */
  count?: number;
  /** Particle color */
  color?: string;
  /** Particle size range [min, max] */
  size?: [number, number];
  /** Drift speed */
  speed?: number;
  /** Opacity range [min, max] */
  opacity?: [number, number];
  /** Area to cover (default: full frame) */
  area?: { x: number; y: number; width: number; height: number };
}

// Module-level defaults so the memo below doesn't see a fresh array every render.
const DEFAULT_SIZE: [number, number] = [2, 6];
const DEFAULT_OPACITY: [number, number] = [0.1, 0.4];

/**
 * ParticleSystem — ambient particles for atmosphere.
 *
 * Cheap to add, huge feel difference. Dust motes, embers,
 * snow, underwater bubbles — sets the mood.
 *
 * No validation needed (decorative, always in-bounds by design).
 * Deterministic: seeded positions, frame(t) depends only on t.
 */
export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  count = 50,
  color = COLOR.onNight,
  size = DEFAULT_SIZE,
  speed = 1,
  opacity = DEFAULT_OPACITY,
  area,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const bounds = area || { x: 0, y: 0, width, height };

  const [sizeMin, sizeMax] = size;
  const [opacityMin, opacityMax] = opacity;

  const particles = useMemo(() => {
    let seed = 12345;
    const rand = () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: bounds.x + rand() * bounds.width,
      y: bounds.y + rand() * bounds.height,
      r: sizeMin + rand() * (sizeMax - sizeMin),
      baseOpacity: opacityMin + rand() * (opacityMax - opacityMin),
      phase: rand() * Math.PI * 2,
      driftX: (rand() - 0.5) * speed,
      driftY: -rand() * speed, // Float upward
      pulseSpeed: 0.5 + rand() * 1.5,
    }));
  }, [count, bounds.x, bounds.y, bounds.width, bounds.height, sizeMin, sizeMax, opacityMin, opacityMax, speed]);

  return (
    <div style={{
      position: 'absolute',
      left: bounds.x, top: bounds.y,
      width: bounds.width, height: bounds.height,
      pointerEvents: 'none',
      zIndex: 1,
    }}>
      {particles.map(p => {
        // Drift with wrap-around
        const x = ((p.x + p.driftX * frame) % bounds.width + bounds.width) % bounds.width;
        const y = ((p.y + p.driftY * frame) % bounds.height + bounds.height) % bounds.height;
        // Gentle pulsing
        const pulse = 0.7 + 0.3 * Math.sin(frame / 30 * p.pulseSpeed + p.phase);
        const o = p.baseOpacity * pulse;

        return (
          <div key={p.id} style={{
            position: 'absolute',
            left: x - p.r, top: y - p.r,
            width: p.r * 2, height: p.r * 2,
            borderRadius: '50%',
            backgroundColor: color,
            opacity: o,
            filter: 'blur(1px)',
          }} />
        );
      })}
    </div>
  );
};
