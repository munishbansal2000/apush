/**
 * Sound on events. Cues are derived from the SAME timing values the visuals use, so a sound
 * can't drift from its picture: pass a block's props (ship start/end, flow start, spread
 * start/perTown, list item times, camera keys, slide entrances) to the matching `cues.*`
 * builder, merge with `useCues`, and render once with <SoundTrack>.
 *
 *   const sound = useCues(cues.ship(WEST_SAIL), cues.list(WEST_TERMS), cues.camera(CAMERA));
 *   <SoundTrack cues={sound} />
 *   <MusicBed src="music/bed.mp3" duck={narration.sentences} />
 *
 * Every cue is a frame-accurate <Sequence from={round(at·fps)}> + <Audio>. Files live in
 * public/sfx (placeholders: tools/make-sfx.ts + tools/make-motion-sfx.ts).
 */
import React, { useMemo } from 'react';
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { fadeWindow, SPREAD_TRAVEL_SEC } from './primitives';
import type { CameraKey } from './world';

/** name → file (under public/) and its length in seconds (used for the Sequence length). */
export const SFX = {
  whoosh: { file: 'sfx/whoosh.wav', sec: 0.6, volume: 0.35 },
  'whoosh-soft': { file: 'sfx/whoosh-soft.wav', sec: 1.2, volume: 0.22 },
  tick: { file: 'sfx/tick.wav', sec: 0.12, volume: 0.35 },
  hit: { file: 'sfx/hit.wav', sec: 0.45, volume: 0.5 },
  check: { file: 'sfx/check.wav', sec: 0.4, volume: 0.4 },
  creak: { file: 'sfx/creak.wav', sec: 1.1, volume: 0.45 },
  thud: { file: 'sfx/thud.wav', sec: 1.3, volume: 0.4 },
  pen: { file: 'sfx/pen.wav', sec: 1.0, volume: 0.35 },
  drum: { file: 'sfx/drum.wav', sec: 0.4, volume: 0.4 },
  bell: { file: 'sfx/bell.wav', sec: 2.6, volume: 0.3 },
  crowd: { file: 'sfx/crowd.wav', sec: 4.0, volume: 0.3 },
  quill: { file: 'sfx/quill.wav', sec: 0.8, volume: 0.35 },
} as const satisfies Record<string, { file: string; sec: number; volume: number }>;
export type SfxName = keyof typeof SFX;

export interface Cue {
  /** seconds from the start of the composition */
  at: number;
  name: SfxName;
  /** 0..1, default = the sound's own default level */
  volume?: number;
}

/** One sound at `at` seconds, frame-accurate. */
export const Sfx: React.FC<Cue> = ({ at, name, volume }) => {
  const { fps } = useVideoConfig();
  if (at < 0) return null;
  const s = SFX[name];
  return (
    <Sequence from={Math.round(at * fps)} durationInFrames={Math.ceil(s.sec * fps) + 1} layout="none" name={`sfx:${name}`}>
      <Audio src={staticFile(s.file)} volume={volume ?? s.volume} />
    </Sequence>
  );
};

/**
 * Sort, drop cues before 0, and thin same-name cues closer than `minGap` seconds (two ticks on
 * one frame just clip). Pure; exported for tests and tools.
 */
export function mergeCues(lists: Cue[][], minGap = 0.08): Cue[] {
  const all = lists.flat().filter(c => c.at >= 0 && Number.isFinite(c.at)).sort((a, b) => a.at - b.at || a.name.localeCompare(b.name));
  const last = new Map<SfxName, number>();
  return all.filter(c => {
    const prev = last.get(c.name);
    if (prev !== undefined && c.at - prev < minGap) return false;
    last.set(c.name, c.at);
    return true;
  });
}

/** Merge cue lists from several blocks (memoised on their content). */
export function useCues(...lists: Cue[][]): Cue[] {
  const key = JSON.stringify(lists);
  return useMemo(() => mergeCues(JSON.parse(key) as Cue[][]), [key]);
}

/** Renders every cue. Put it once per scene (anywhere: it draws nothing). */
export const SoundTrack: React.FC<{ cues: Cue[] }> = ({ cues: list }) => (
  <>{list.map((c, i) => <Sfx key={`${c.name}-${i}`} {...c} />)}</>
);

/**
 * Seconds from a Spread town's particle launch to its "struck" moment. Mirrors the travel
 * time hard-coded in primitives.tsx <Spread> (arrive = leave + 1.1); keep the two in step.
 */

const clamp01 = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Cue builders: give them the props you gave the visual block. */
export const cues = {
  /** <Ship start end>: hull creak as it leaves; optional bell when it docks. */
  ship: (p: { start: number; end: number }, o: { dock?: boolean; volume?: number } = {}): Cue[] => [
    { at: p.start, name: 'creak', volume: o.volume },
    ...(o.dock ? [{ at: p.end, name: 'bell' as const, volume: 0.22 }] : []),
  ],
  /** <FlowArc start>: whoosh as the line draws (it draws over 1.2 s from start). */
  flow: (p: { start: number }, volume?: number): Cue[] => [{ at: p.start, name: 'whoosh', volume }],
  /** <Spread start perTown towns>: a low thud each time a town is struck. */
  spread: (p: { start: number; towns: readonly unknown[]; perTown?: number }, volume?: number): Cue[] =>
    p.towns.map((_, i) => ({ at: p.start + i * (p.perTown ?? 0.7) + SPREAD_TRAVEL_SEC, name: 'thud' as const, volume })),
  /** A term list / any items that land at `at`: a tick per item. */
  list: (items: readonly { at: number }[], volume?: number): Cue[] => items.map(it => ({ at: it.at, name: 'tick' as const, volume })),
  /**
   * Camera keys: a soft whoosh as each move starts, louder for bigger moves (zoom ratio and
   * pan distance). Keys that don't move the camera are silent.
   */
  camera: (keys: readonly CameraKey[], scale = 1): Cue[] => keys.slice(1).flatMap((k, i) => {
    const p = keys[i];
    const zoom = Math.abs(Math.log(k.zoom / p.zoom));
    const pan = Math.hypot(k.center[0] - p.center[0], k.center[1] - p.center[1]);
    if (zoom < 0.02 && pan < 0.5) return [];
    return [{ at: k.t, name: 'whoosh-soft' as const, volume: clamp01((0.1 + 0.16 * zoom + 0.004 * pan) * scale, 0.08, 0.4) }];
  }),
  /** A <Slide> entrance (and, with `exit`, its exit): a quiet whoosh. */
  slide: (e: { at: number; out?: number }, o: { volume?: number; exit?: boolean } = {}): Cue[] => [
    { at: e.at, name: 'whoosh', volume: o.volume ?? 0.25 },
    ...(o.exit && e.out !== undefined ? [{ at: e.out, name: 'whoosh' as const, volume: (o.volume ?? 0.25) * 0.6 }] : []),
  ],
};

/* ------------------------------------ music ------------------------------------ */

export interface DuckOpts { volume?: number; duckTo?: number; ramp?: number; fadeIn?: number; fadeOut?: number }

/**
 * Music level at time t (seconds): `volume`, dipping to `volume·duckTo` while any narration
 * span is playing, with `ramp`-second smooth ramps either side; fades in/out at the ends.
 * Pure; exported for tests.
 */
export function musicLevel(t: number, total: number, spans: readonly { start: number; dur: number }[], o: DuckOpts = {}): number {
  const { volume = 0.16, duckTo = 0.35, ramp = 0.45, fadeIn = 1.5, fadeOut = 2 } = o;
  const duck = Math.max(0, ...spans.map(s => fadeWindow(t, s.start - ramp, s.start + s.dur + ramp, ramp)));
  const ends = fadeWindow(t, 0, total, fadeIn, fadeOut);
  return volume * ends * (1 - (1 - duckTo) * duck);
}

/** Looping music bed ducked under narration (`duck` = the sentence spans, in seconds). */
export const MusicBed: React.FC<DuckOpts & { src: string; duck: readonly { start: number; dur: number }[] }> = ({ src, duck, ...o }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const total = durationInFrames / fps;
  return <Audio src={staticFile(src)} loop volume={f => musicLevel(f / fps, total, duck, o)} />;
};
