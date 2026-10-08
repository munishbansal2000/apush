import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT } from './util';

export interface JourneyItem {
  id: string;
  content: string;
  from: [number, number];
  to: [number, number];
  duration: number;
  delay?: number;
  style: 'fly' | 'gallop' | 'float' | 'ooze';
  size: number;
  glow?: string;
}

export const MapJourney: React.FC<{ at: number; mapImage: string; items: JourneyItem[]; caption?: string; variant: 'overview' | 'detail' | 'dark' }> = ({ at, mapImage, items, caption, variant }) => {
  const f = useCurrentFrame() - at;
  const { fps } = useVideoConfig();
  return (
    <div data-kit="map" style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', background: '#000' }}>
      <Img src={staticFile(mapImage)} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', opacity: variant === 'dark' ? 0.45 : 0.8 }} />
      {items.map(it => {
        const p = interpolate(f / fps - (it.delay ?? 0), [0, it.duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const x = it.from[0] + (it.to[0] - it.from[0]) * p;
        const y = it.from[1] + (it.to[1] - it.from[1]) * p;
        return (
          <div key={it.id} style={{ position: 'absolute', left: `${x / 10}%`, top: `${y / 7}%`, fontSize: it.size, color: '#fff', fontFamily: FONT,
            textShadow: it.glow ? `0 0 18px ${it.glow}` : '0 2px 6px #000', fontWeight: 700 }}>
            {it.content}
          </div>
        );
      })}
      {caption && <div style={{ position: 'absolute', bottom: 16, width: '100%', textAlign: 'center', color: '#f5e6c8', fontFamily: FONT, fontSize: 40 }}>{caption}</div>}
    </div>
  );
};
