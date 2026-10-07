/**
 * Anchor resolver: text → (turn, time). Beats never name turn numbers, so
 * renumbering or editing the script can't silently shift visuals; it either
 * still resolves or fails loudly.
 *
 * Ported from apush-episode-kit/src/kit/anchors.ts, adapted to our data shapes:
 * - turns: {id, speaker, text}[] (from src/data/<ep>/turns.json)
 * - timing: {starts: number[], durations: number[]} (from timing_map.json)
 * - wordTimes: Record<turnId, {w, s, e}[]> (from word_times.json, may be empty)
 */
import { norm, tokens } from './text';

export interface Anchor {
  /** Snippet that must match exactly one turn (case/punctuation-insensitive). */
  turn: string;
  /** Word or phrase inside that turn; the beat starts when it is spoken. */
  word?: string;
  /** 1-based occurrence of `word` within the turn (default 1). */
  nth?: number;
  /** Seconds added after the resolved time (may be negative). */
  delay?: number;
}

export type AnchorMethod = 'measured' | 'interpolated' | 'estimated';

export interface ResolvedAnchor {
  turnId: string;
  turnIdx: number;
  offset: number;
  time: number;
  method: AnchorMethod;
}

export interface TurnLike {
  id: string;
  speaker: string;
  text: string;
}

export interface WordTime {
  w: string;
  s: number;
  e: number;
}

export class AnchorError extends Error {
  constructor(
    public code: 'A001' | 'A002',
    msg: string,
  ) {
    super(msg);
  }
}

export const describeAnchor = (a: Anchor): string =>
  `"${a.turn}"${a.word ? ` @ "${a.word}"${a.nth && a.nth > 1 ? ` #${a.nth}` : ''}` : ''}`;

export function findTurn(snippet: string, turns: TurnLike[]): TurnLike {
  const needle = norm(snippet);
  if (!needle) throw new AnchorError('A001', 'empty anchor snippet');
  const hits = turns.filter(t => ` ${norm(t.text)} `.includes(` ${needle} `));
  if (hits.length === 0) throw new AnchorError('A001', `no turn contains "${snippet}"`);
  if (hits.length > 1) {
    throw new AnchorError(
      'A001',
      `"${snippet}" matches ${hits.length} turns (${hits.map(h => h.id).join(', ')}); use a longer snippet`,
    );
  }
  return hits[0];
}

/** Index of the nth occurrence of `phrase` tokens inside `hay` tokens, or -1. */
export function findPhrase(hay: string[], phrase: string[], nth = 1): number {
  let seen = 0;
  for (let i = 0; i + phrase.length <= hay.length; i++) {
    if (phrase.every((p, j) => hay[i + j] === p)) {
      seen++;
      if (seen === nth) return i;
    }
  }
  return -1;
}

/** LCS alignment: script token index → Vosk word index (Vosk mishears names; LCS skips them). */
export function alignTokens(script: string[], heard: string[]): Map<number, number> {
  const n = script.length;
  const m = heard.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = script[i] === heard[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const map = new Map<number, number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (script[i] === heard[j]) {
      map.set(i, j);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return map;
}

export function wordOffset(
  scriptText: string,
  tokenIdx: number,
  words: WordTime[] | undefined,
  dur: number,
): { offset: number; method: AnchorMethod } {
  const st = tokens(scriptText);
  if (words && words.length) {
    const heard = words.map(w => norm(w.w));
    const map = alignTokens(st, heard);
    const direct = map.get(tokenIdx);
    if (direct !== undefined) return { offset: words[direct].s, method: 'measured' };
    // interpolate between the nearest aligned neighbours
    let before = -1;
    let after = -1;
    for (const k of map.keys()) {
      if (k < tokenIdx && k > before) before = k;
      if (k > tokenIdx && (after === -1 || k < after)) after = k;
    }
    const tb = before >= 0 ? words[map.get(before)!].e : 0;
    const ta = after >= 0 ? words[map.get(after)!].s : dur;
    const ib = before >= 0 ? before : -1;
    const ia = after >= 0 ? after : st.length;
    const frac = (tokenIdx - ib) / Math.max(1, ia - ib);
    return { offset: tb + (ta - tb) * frac, method: 'interpolated' };
  }
  // No word times: estimate by character position (dev only; strict validation rejects it).
  const charsBefore = st.slice(0, tokenIdx).join(' ').length;
  const total = Math.max(1, st.join(' ').length);
  return { offset: dur * (charsBefore / total), method: 'estimated' };
}

export interface ResolveContext {
  turns: TurnLike[];
  starts: number[];
  durations: number[];
  wordTimes: Record<string, WordTime[]>;
}

export function resolveAnchor(a: Anchor, ctx: ResolveContext): ResolvedAnchor {
  const turn = findTurn(a.turn, ctx.turns);
  const turnIdx = ctx.turns.findIndex(t => t.id === turn.id);
  const start = ctx.starts[turnIdx];
  const dur = ctx.durations[turnIdx];
  let offset = 0;
  let method: AnchorMethod = 'measured';
  if (a.word) {
    const idx = findPhrase(tokens(turn.text), tokens(a.word), a.nth ?? 1);
    if (idx < 0) throw new AnchorError('A002', `word "${a.word}" not found in ${turn.id} ("${turn.text.slice(0, 50)}…")`);
    ({ offset, method } = wordOffset(turn.text, idx, ctx.wordTimes[turn.id], dur));
  }
  offset = Math.max(0, offset + (a.delay ?? 0));
  return { turnId: turn.id, turnIdx, offset, time: start + offset, method };
}

/**
 * Resolve a list of anchored beats to concrete turn IDs + offsets.
 * Throws AnchorError on the first unresolvable anchor (fail loudly, never drift).
 */
export function resolveBeats<T extends { anchor: Anchor }>(
  beats: T[],
  ctx: ResolveContext,
): (T & { resolvedTurnId: string; resolvedOffset: number; resolvedTime: number; anchorMethod: AnchorMethod })[] {
  return beats.map(b => {
    const r = resolveAnchor(b.anchor, ctx);
    return {
      ...b,
      resolvedTurnId: r.turnId,
      resolvedOffset: r.offset,
      resolvedTime: r.time,
      anchorMethod: r.method,
    };
  });
}
