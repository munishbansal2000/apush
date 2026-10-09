/**
 * Only the current speaker's head (kit HeadFace art), bottom-right of the kit head rect. A new speaker pops in while
 * the previous one fades out; the head holds through short gaps between lines and leaves during pauses.
 */
import React from 'react';
import {interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {RenderConfig} from '../kit/layout';
import {HeadFace} from '../kit/overlays';

export interface HeadTurn {id: string; kind: 'speech' | 'pause'; speaker?: string}
export interface SpeakerState {speaker: string; turnIndex: number; since: number; previous: string | null}

/** Speaker on screen at t: the speaking turn, or the last one through a gap shorter than `holdSec`. */
export function activeSpeakerAt(turns: HeadTurn[], timing: {starts: number[]; durations: number[]}, t: number, hasArt: (speaker: string) => boolean, holdSec = 1): SpeakerState | null {
  let index = -1;
  for (let i = 0; i < turns.length; i++) if (timing.starts[i] <= t) index = i; else break;
  if (index < 0) return null;
  const turn = turns[index];
  if (turn.kind !== 'speech') return null;
  if (t > timing.starts[index] + timing.durations[index] + holdSec) return null;
  if (!turn.speaker || !hasArt(turn.speaker)) return null;
  // The head only "changes" when the speaker does: consecutive lines by one host keep one entrance.
  let first = index;
  while (first > 0 && turns[first - 1].kind === 'speech' && turns[first - 1].speaker === turn.speaker) first--;
  const before = first > 0 ? turns[first - 1] : null;
  const previous = before?.kind === 'speech' && before.speaker && hasArt(before.speaker) && timing.starts[first] - (timing.starts[first - 1] + timing.durations[first - 1]) <= holdSec ? before.speaker : null;
  return {speaker: turn.speaker, turnIndex: index, since: timing.starts[first], previous};
}

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 6;

export const ActiveHead: React.FC<{state: SpeakerState | null; level: number; cfg: RenderConfig}> = ({state, level, cfg}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  if (!state) return null;
  const speakers = cfg.speakers as Record<string, {name: string; color: string; toon: string}>;
  const [x0, y0, x1, y1] = cfg.head.rect;
  const boxW = (x1 - x0) * width;
  const boxH = (y1 - y0) * height;
  const MAX_SCALE = 1.08;
  const LIFT = 10;
  const size = Math.min((boxH - LIFT - 4) / MAX_SCALE, boxW * 0.9);
  const margin = (size * (MAX_SCALE - 1)) / 2 + 2;
  const local = frame - Math.round(state.since * fps);
  const enter = spring({frame: local, fps, config: {damping: 14, stiffness: 170}, durationInFrames: ENTER_FRAMES});
  const exitOpacity = interpolate(local, [0, EXIT_FRAMES], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const face = (id: string, style: React.CSSProperties, amp: number) => {
    const s = speakers[id];
    return (
      <div key={id} style={{position: 'absolute', right: margin, bottom: margin, width: size, height: size, ...style}}>
        <HeadFace head={{id, name: s.name, color: s.color, src: staticFile(s.toon)}} active amp={amp} maxScale={MAX_SCALE} lift={LIFT} />
      </div>
    );
  };
  return (
    <div data-kit="heads" style={{position: 'absolute', left: x0 * width, top: y0 * height, width: boxW, height: boxH}}>
      {state.previous && state.previous !== state.speaker && exitOpacity > 0 && face(state.previous, {opacity: exitOpacity, transform: `scale(${0.9 + 0.1 * exitOpacity})`}, 0)}
      {face(state.speaker, {opacity: enter, transform: `scale(${0.85 + 0.15 * enter})`, transformOrigin: 'bottom right'}, level)}
    </div>
  );
};
