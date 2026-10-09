/**
 * Atmosphere layers over a shot (docs/LOOK.md): procedural and deterministic (seeded noise), so every render of a frame
 * is identical and nothing visibly loops. Each layer covers the full frame, is purely decorative (pointer-free, no
 * text), and uses screen/soft-light blending so it never hides the art underneath.
 */
import React, {useMemo} from 'react';
import {random, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D, noise3D} from '@remotion/noise';

export type Atmosphere = 'dust' | 'smoke' | 'embers' | 'fog' | 'candle';
export const ATMOSPHERES: readonly Atmosphere[] = ['dust', 'smoke', 'embers', 'fog', 'candle'];

const layer: React.CSSProperties = {position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden'};

/** Motes drifting in a light beam: small, soft, slow, a few in sharp focus. */
const Dust: React.FC<{seed: string}> = ({seed}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const t = frame / fps;
  const motes = useMemo(() => Array.from({length: 70}, (_, i) => ({
    x: random(`${seed}-dx-${i}`), y: random(`${seed}-dy-${i}`), size: 1.5 + random(`${seed}-ds-${i}`) * 4.5, focus: random(`${seed}-df-${i}`) < 0.2,
  })), [seed]);
  return (
    <div style={{...layer, mixBlendMode: 'screen'}}>
      {motes.map((m, i) => {
        const x = ((m.x + t * 0.006 + noise2D(`${seed}-nx`, i, t * 0.08) * 0.04) % 1 + 1) % 1;
        const y = ((m.y - t * 0.004 + noise2D(`${seed}-ny`, i, t * 0.08) * 0.04) % 1 + 1) % 1;
        const glint = 0.25 + 0.75 * Math.max(0, noise2D(`${seed}-g`, i, t * 0.6));
        return <div key={i} style={{position: 'absolute', left: x * width, top: y * height, width: m.size, height: m.size, borderRadius: '50%',
          background: 'rgba(255,238,205,0.9)', opacity: (m.focus ? 0.55 : 0.28) * glint, filter: m.focus ? undefined : 'blur(1.5px)'}} />;
      })}
    </div>
  );
};

/** Drifting powder smoke: large soft blobs crossing the frame, breathing in size and density. */
const Smoke: React.FC<{seed: string}> = ({seed}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const t = frame / fps;
  const puffs = useMemo(() => Array.from({length: 7}, (_, i) => ({
    x: random(`${seed}-sx-${i}`), y: 0.25 + random(`${seed}-sy-${i}`) * 0.6, r: 0.35 + random(`${seed}-sr-${i}`) * 0.35, speed: 0.01 + random(`${seed}-sv-${i}`) * 0.015,
  })), [seed]);
  return (
    <div style={{...layer, mixBlendMode: 'screen'}}>
      {puffs.map((p, i) => {
        const x = ((p.x + t * p.speed) % 1.4) - 0.2;
        const y = p.y + noise2D(`${seed}-sy`, i, t * 0.1) * 0.05;
        const r = p.r * (1 + 0.15 * noise2D(`${seed}-sr`, i, t * 0.15));
        const density = 0.1 + 0.08 * (noise2D(`${seed}-sd`, i, t * 0.2) + 1) / 2;
        return <div key={i} style={{position: 'absolute', left: x * width - r * width / 2, top: y * height - r * width / 2, width: r * width, height: r * width,
          borderRadius: '50%', background: `radial-gradient(circle, rgba(225,214,195,${density}) 0%, rgba(225,214,195,${density * 0.5}) 35%, transparent 70%)`}} />;
      })}
    </div>
  );
};

/** Embers rising from the bottom, swaying, flickering, fading as they climb. */
const Embers: React.FC<{seed: string}> = ({seed}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const t = frame / fps;
  const sparks = useMemo(() => Array.from({length: 45}, (_, i) => ({
    x: random(`${seed}-ex-${i}`), phase: random(`${seed}-ep-${i}`), speed: 0.06 + random(`${seed}-ev-${i}`) * 0.08, size: 2 + random(`${seed}-es-${i}`) * 3,
  })), [seed]);
  return (
    <div style={{...layer, mixBlendMode: 'screen'}}>
      {sparks.map((s, i) => {
        const climb = (s.phase + t * s.speed) % 1;
        const x = s.x + noise2D(`${seed}-ew`, i, t * 0.5) * 0.03;
        const flicker = 0.5 + 0.5 * noise2D(`${seed}-ef`, i, t * 4);
        const o = Math.sin(climb * Math.PI) * flicker;
        return <div key={i} style={{position: 'absolute', left: x * width, top: (1 - climb) * height, width: s.size, height: s.size, borderRadius: '50%',
          background: 'rgb(255,170,70)', boxShadow: `0 0 ${s.size * 4}px rgba(255,140,40,0.9)`, opacity: o * 0.8}} />;
      })}
    </div>
  );
};

/** Low fog: wide bands drifting slowly across the lower frame. */
const Fog: React.FC<{seed: string}> = ({seed}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <div style={{...layer, mixBlendMode: 'screen'}}>
      {[0, 1, 2].map(i => {
        const x = noise2D(`${seed}-fx`, i, t * 0.03) * 12 + i * 7 - t * (0.6 + i * 0.25);
        const o = 0.14 + 0.06 * noise2D(`${seed}-fo`, i, t * 0.1);
        // Continuous drift (no modulo), so the fog never visibly jumps back.
        return <div key={i} style={{position: 'absolute', left: `${-30 + x}%`, bottom: `${-10 + i * 9}%`, width: '160%', height: '45%',
          background: `radial-gradient(ellipse at 50% 60%, rgba(230,226,215,${o}) 0%, transparent 65%)`}} />;
      })}
    </div>
  );
};

/** Candlelit interior: warm light that breathes and flickers, deepening the edges in step. */
const Candle: React.FC<{seed: string}> = ({seed}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const flicker = 0.5 + 0.5 * noise3D(`${seed}-c`, t * 3.2, 0, 0) * 0.7 + 0.15 * noise3D(`${seed}-c2`, t * 9, 0, 0);
  return (
    <>
      <div style={{...layer, mixBlendMode: 'soft-light', background: `radial-gradient(ellipse at 35% 30%, rgba(255,190,110,${0.35 + 0.2 * flicker}) 0%, rgba(255,150,70,0.1) 45%, transparent 75%)`}} />
      <div style={{...layer, boxShadow: `inset 0 0 ${260 + 60 * (1 - flicker)}px rgba(20,10,0,${0.45 + 0.15 * (1 - flicker)})`}} />
    </>
  );
};

export const AtmosphereLayers: React.FC<{kinds?: Atmosphere[]; seed: string}> = ({kinds = [], seed}) => (
  <>
    {kinds.map(kind => {
      const s = `${seed}-${kind}`;
      switch (kind) {
        case 'dust': return <Dust key={kind} seed={s} />;
        case 'smoke': return <Smoke key={kind} seed={s} />;
        case 'embers': return <Embers key={kind} seed={s} />;
        case 'fog': return <Fog key={kind} seed={s} />;
        case 'candle': return <Candle key={kind} seed={s} />;
      }
    })}
  </>
);
