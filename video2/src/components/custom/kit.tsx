/**
 * Shared contract for the custom explainer components (src/components/custom): phases, scale, and the parchment
 * look they share with the documentary maps (src/documentary/shots.tsx MapView).
 *
 * Phases: every component declares DEFAULT_PHASES and works with no `phases` prop. A phase that is missing (or has
 * end <= start) reads as progress 0 for its whole beat — never a snapped end state.
 * Scale: layout is authored at 1280x720; `u(n)` scales a coordinate or size to the composition width, so the same
 * component renders at 1280x720 or 1920x1080. Never pass raw numbers to CSS sizes; wrap them in u().
 * Timing: frames come from useVideoConfig (no hard-coded fps); the documentary gives a custom shot 5-14 seconds.
 */
import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLOR, alpha} from '../../theme/tokens';

export interface Phase {
  name: string;
  /** 0-1 fraction of the duration */
  start: number;
  end: number;
}

export interface CustomProps {
  /** Defaults to the composition / Sequence duration. */
  durationInFrames?: number;
  /** Defaults to the component's DEFAULT_PHASES. */
  phases?: Phase[];
}

export const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export interface PhaseClock {
  frame: number;
  fps: number;
  durationInFrames: number;
  /** authored-1280 units -> composition px */
  u: (n: number) => number;
  /** phase name -> 0..1 progress (0 when missing) */
  t: (name: string) => number;
  has: (name: string) => boolean;
  /** phase boundaries in frames; [0, 0] when missing */
  bounds: (name: string) => [number, number];
}

export function usePhases(phases: Phase[] | undefined, defaults: Phase[], durationOverride?: number): PhaseClock {
  const frame = useCurrentFrame();
  const {width, fps, durationInFrames: configDuration} = useVideoConfig();
  const durationInFrames = durationOverride ?? configDuration;
  const list = phases && phases.length ? phases : defaults;
  const find = (name: string) => list.find(p => p.name === name && p.end > p.start);
  const bounds = (name: string): [number, number] => {
    const p = find(name);
    return p && durationInFrames > 0 ? [p.start * durationInFrames, p.end * durationInFrames] : [0, 0];
  };
  return {
    frame,
    fps,
    durationInFrames,
    u: (n: number) => (n * width) / 1280,
    has: name => Boolean(find(name)),
    bounds,
    t: name => {
      const [a, b] = bounds(name);
      return b > a ? interpolate(frame, [a, b], [0, 1], CLAMP) : 0;
    },
  };
}

/** Parchment palette for the custom components: same paper, ink, water and coast as the documentary maps. */
export const PAPER = {
  bg: COLOR.paper,
  land: COLOR.paperDeep,
  water: COLOR.ocean,
  waterDeep: COLOR.oceanDeep,
  coast: COLOR.coast,
  ink: COLOR.ink,
  inkSoft: COLOR.inkSoft,
  muted: COLOR.inkMuted,
  /** text halo / label backing on parchment */
  halo: COLOR.halo,
  panel: alpha(COLOR.paper, 0.9),
  rule: alpha(COLOR.ink, 0.35),
  wave: alpha(COLOR.ink, 0.18),
  // sides and accents (same roles as the maps)
  patriot: COLOR.patriot,
  british: COLOR.british,
  red: COLOR.red,
  blue: COLOR.blue,
  gold: COLOR.gold,
  green: COLOR.green,
  brown: COLOR.brown,
  struck: COLOR.inkStruck,
} as const;

/** Map-style text halo for SVG labels on parchment. */
export const paperHalo = (u: (n: number) => number) =>
  ({stroke: PAPER.halo, strokeWidth: u(3.5), paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const});

/** Parchment sheet: paper base, children, then the same texture and edge burn as the documentary MapView. */
export const PaperSheet: React.FC<{children: React.ReactNode; fontFamily?: string}> = ({children, fontFamily}) => {
  const {width, height} = useVideoConfig();
  return (
    <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: PAPER.bg, fontFamily}}>
      {children}
      <Img src={staticFile('textures/parchment.jpg')} style={{position: 'absolute', inset: 0, width, height, objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.4, pointerEvents: 'none'}} />
      <div style={{position: 'absolute', inset: 0, boxShadow: `inset 0 0 ${width * 0.12}px ${alpha(COLOR.coast, 0.55)}`, pointerEvents: 'none'}} />
    </div>
  );
};
