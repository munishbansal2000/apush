import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { FONT } from './util';

const SIZES = { hero: 140, title: 76, subtitle: 50, body: 38 } as const;

export const SmartText: React.FC<{
  text: string;
  level: keyof typeof SIZES;
  position: [number, number];
  color: string;
  entrance: 'stamp' | 'fade' | 'typewriter';
  at: number;
}> = ({ text, level, position, color, entrance, at }) => {
  const f = useCurrentFrame() - at;
  const o = interpolate(f, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const s = entrance === 'stamp' ? interpolate(f, [0, 6], [1.25, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  const shown = entrance === 'typewriter' ? text.slice(0, Math.max(0, Math.floor(f * 1.5))) : text;
  return (
    <div
      data-kit="smarttext"
      style={{
        position: 'absolute', left: `${position[0] * 100}%`, top: `${position[1] * 100}%`,
        transform: `translate(-50%, -50%) scale(${s})`, opacity: o, color, fontFamily: FONT,
        fontSize: SIZES[level], fontWeight: 700, textAlign: 'center', maxWidth: '62%', width: 'max-content',
        lineHeight: 1.1, textShadow: '0 3px 12px rgba(0,0,0,0.8)',
      }}
    >
      {shown}
    </div>
  );
};
