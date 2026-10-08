/**
 * Pure timeline functions. Everything the shell decides per frame lives here so it
 * can be unit-tested without rendering.
 */
import type {
  BgSegment,
  CompiledEpisode,
  ResolvedBeat,
  ResolvedSection,
  ScriptTurn,
  SpeakerId,
  SpeechTurn,
  TimelineTurn,
  TimingFile,
} from './types';
import { wordCount } from './text';

export interface TimingRules {
  leadInSec: number;
  gapSec: number;
  shortReplyGapSec: number;
  shortReplyMaxWords: number;
  tailSec: number;
}

/** Lay turns end to end. Used by tools/build-timing.ts; durations come from ffprobe. */
export function layoutStarts(
  turns: ScriptTurn[],
  durationOf: (t: ScriptTurn) => number,
  rules: TimingRules,
): { starts: number[]; durations: number[]; totalSec: number } {
  const starts: number[] = [];
  const durations: number[] = [];
  let cursor = rules.leadInSec;
  turns.forEach((t, i) => {
    const prev = turns[i - 1];
    if (prev) {
      const hold = prev.kind === 'speech' ? prev.holdAfterSec ?? 0 : 0;
      const quickReply = t.kind === 'speech' && prev.kind === 'speech' && wordCount(t.text) <= rules.shortReplyMaxWords;
      cursor += hold || (quickReply ? rules.shortReplyGapSec : rules.gapSec);
    }
    const d = durationOf(t);
    starts.push(round(cursor));
    durations.push(round(d));
    cursor += d;
  });
  return { starts, durations, totalSec: round(cursor + rules.tailSec) };
}

export function buildTimeline(turns: ScriptTurn[], timing: Pick<TimingFile, 'starts' | 'durations' | 'totalSec'>): TimelineTurn[] {
  if (turns.length !== timing.starts.length || turns.length !== timing.durations.length) {
    throw new Error(
      `timing_map has ${timing.starts.length} starts / ${timing.durations.length} durations for ${turns.length} turns. Run: npm run build:timing`,
    );
  }
  return turns.map((turn, i) => ({
    turn,
    start: timing.starts[i],
    dur: timing.durations[i],
    visualEnd: i + 1 < turns.length ? timing.starts[i + 1] : timing.totalSec,
  }));
}

/**
 * The turn that owns time `t`. Holds the previous turn through gaps, so visuals
 * never blank between turns. Returns null only before the first turn starts.
 */
export function activeTurnAt(tl: TimelineTurn[], t: number): TimelineTurn | null {
  let lo = 0;
  let hi = tl.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (tl[mid].start <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found >= 0 ? tl[found] : null;
}

/** True while the turn's audio is actually playing (drives the head's speaking state). */
export const isSpeaking = (tt: TimelineTurn | null, t: number): boolean =>
  !!tt && tt.turn.kind === 'speech' && t >= tt.start && t < tt.start + tt.dur;

/**
 * Music gain multiplier at time t: `duckTo` while anyone speaks, 1 in silence, with a
 * `rampSec` linear ramp at each edge so ducking never clicks.
 */
export function duckAt(tl: TimelineTurn[], t: number, duckTo: number, rampSec = 0.35): number {
  let nearest = Infinity;
  for (const tt of tl) {
    if (tt.turn.kind !== 'speech') continue;
    const a = tt.start;
    const b = tt.start + tt.dur;
    if (t >= a && t < b) return duckTo;
    nearest = Math.min(nearest, t < a ? a - t : t - b);
  }
  if (nearest >= rampSec) return 1;
  return duckTo + (1 - duckTo) * (nearest / rampSec);
}

export const sectionAt = (sections: ResolvedSection[], t: number): ResolvedSection =>
  sections.find(s => t >= s.start && t < s.end) ?? sections[sections.length - 1];

export const beatsAt = (beats: ResolvedBeat[], t: number): ResolvedBeat[] =>
  beats.filter(b => t >= b.start && t < b.end);

export const backgroundAt = (segments: BgSegment[], t: number): BgSegment | null =>
  segments.find(s => t >= s.start && t < s.end) ?? null;

export interface SpeakerConfig { name: string; color: string; real: string; toon: string }

/** Head art comes from config, never from a per-episode ternary. */
export const headAssets = (speakers: Record<SpeakerId, SpeakerConfig>, speaker: SpeakerId) => {
  const s = speakers[speaker];
  if (!s) throw new Error(`no speaker config for "${speaker}"`);
  return { realistic: s.real, stylized: s.toon, name: s.name, color: s.color };
};

/** Last speech turn at or before t (the head stays up through gaps, hides on pauses). */
export function headTurnAt(tl: TimelineTurn[], t: number): (TimelineTurn & { turn: SpeechTurn }) | null {
  const tt = activeTurnAt(tl, t);
  if (!tt || tt.turn.kind !== 'speech') return null;
  return tt as TimelineTurn & { turn: SpeechTurn };
}

export const boxStateAt = (ep: Pick<CompiledEpisode, 'boxEvents' | 'meta'>, t: number): boolean[] =>
  ep.meta.boxes.map((_, i) => ep.boxEvents.some(e => e.box === i + 1 && e.time <= t));

export const toFrame = (sec: number, fps: number): number => Math.round(sec * fps);

/** Frames for a visual covering [start, end): rounded, so it never spills into the next element's first frame. */
export const visualFrames = (start: number, end: number, fps: number): number =>
  Math.max(1, Math.round(end * fps) - Math.round(start * fps));

/** Frames covering [start, end): ceil so audio is never clipped. */
export const framesFor = (start: number, end: number, fps: number): number =>
  Math.max(1, Math.ceil(end * fps) - Math.round(start * fps));

const round = (n: number) => Math.round(n * 1000) / 1000;
