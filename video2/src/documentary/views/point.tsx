/** Point cards: up to three bullets over a dimmed backdrop. */
import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLOR, FONT} from '../../theme/tokens';
import {AtmosphereLayers} from '../atmosphere';
import type {PointShot} from '../types';
import {ImageMove} from './image';

/* ---------------------------------- point card ---------------------------------- */

export const PointView: React.FC<{shot: PointShot; lead: number}> = ({shot, lead}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const duration = shot.endSec - shot.startSec + lead;
  return (
    <>
      <ImageMove image={shot.backdrop} size={shot.size} from={{x: 0.5, y: 0.5, zoom: 1.05}} to={{x: 0.5, y: 0.5, zoom: 1.15}} durationSec={duration} dim={0.62} blur={6} />
      <AtmosphereLayers kinds={shot.atmosphere} seed={shot.id} />
      <div style={{position: 'absolute', left: 200, right: 200, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 48}}>
        {shot.bullets.map((b, i) => {
          const at = Math.round((b.sec - shot.startSec + lead) * fps);
          const p = spring({frame: frame - at, fps, config: {damping: 200}, durationInFrames: 16});
          if (frame < at) return null;
          return (
            <div key={i} data-guard-item={`point ${i + 1}`} style={{display: 'flex', alignItems: 'center', gap: 36, opacity: p, transform: `translateX(${(1 - p) * 60}px)`}}>
              <div style={{width: 70 * p, height: 5, background: COLOR.gold, flexShrink: 0}} />
              <div style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 84, color: COLOR.onNight, lineHeight: 1.15, textShadow: '0 6px 30px rgba(0,0,0,0.6)'}}>{b.text}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};
