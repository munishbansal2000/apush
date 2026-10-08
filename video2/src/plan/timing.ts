/**
 * Time resolution for plans: every `on` phrase → seconds, from narration word times.
 *
 * - Narration = sentences with start/dur (from tools/build-narration.ts), optionally `words`
 *   ({w, s, e} per whitespace token, seconds from the sentence's clip start). Without a built
 *   narration file the sentences are laid out with an estimate (estimateNarration).
 * - A word's time = its measured start when the sentence has word times, else the evenly
 *   spaced estimate start + (k / n) · dur (same rule as src/motion/storyboard.ts).
 * - Phrases match case- and punctuation-insensitively, consecutive tokens, the FIRST
 *   occurrence at or after a search cursor (the previous beat's start word); a small fuzzy
 *   step accepts plural/possessive endings ("Missouri" ~ "Missouri's").
 * Codes: TM001 phrase not found · TM002 bad keyword / sentence index · TM003 beat order.
 */
import type { PlanIssue, TimeRef } from './schema';

export interface WordTime { w: string; s: number; e: number }
export interface NarrSentence { speaker?: string; text: string; file?: string; start: number; dur: number; words?: WordTime[] }
export interface ResolvedNarration {
  sentences: NarrSentence[];
  totalSec: number;
  /** built with audio (tools/build-narration.ts) vs. estimated layout */
  audio: boolean;
  /** source file (if any) */
  file?: string;
}

/** Layout constants shared with tools/build-narration.ts. */
export const NARRATION_TIMING = { lead: 0.8, gap: 0.45, tail: 2.5, wordsPerSec: 2.55, commaPause: 0.18, stopPause: 0.35 } as const;

/** Same normalisation as tools/build-prototype.ts normWord (curly apostrophes folded first). */
export const normWord = (w: string) => w.replace(/[’‘]/g, "'").toLowerCase().replace(/[^a-z0-9']/g, '').replace(/^'+|'+$/g, '');
export const tokensOf = (text: string) => text.split(/\s+/).filter(Boolean);

/** Estimated duration of a spoken sentence (seconds). */
export function estimateSentenceDur(text: string): number {
  const toks = tokensOf(text);
  const commas = (text.match(/[,;:]/g) ?? []).length;
  const stops = Math.max(0, (text.match(/[.!?](\s|$)/g) ?? []).length - 1);
  return +(toks.length / NARRATION_TIMING.wordsPerSec + commas * NARRATION_TIMING.commaPause + stops * NARRATION_TIMING.stopPause + 0.2).toFixed(3);
}

/** Lay sentences out without audio (estimate). */
export function estimateNarration(sentences: { speaker?: string; text: string }[]): ResolvedNarration {
  let t: number = NARRATION_TIMING.lead;
  const out: NarrSentence[] = sentences.map(s => {
    const dur = estimateSentenceDur(s.text);
    const r = { speaker: s.speaker, text: s.text, start: +t.toFixed(3), dur };
    t += dur + NARRATION_TIMING.gap;
    return r;
  });
  return { sentences: out, totalSec: +(t - NARRATION_TIMING.gap + NARRATION_TIMING.tail).toFixed(3), audio: false };
}

/* ------------------------------------ word timeline ------------------------------------ */

export interface Token { w: string; t: number; end: number; sentence: number; k: number }

/** Every token of the narration with its absolute start time. */
export function wordTimeline(n: ResolvedNarration): Token[] {
  const out: Token[] = [];
  n.sentences.forEach((s, si) => {
    const toks = tokensOf(s.text);
    const exact = s.words && s.words.length === toks.length ? s.words : undefined;
    toks.forEach((raw, k) => {
      const w = normWord(raw);
      const t = exact ? s.start + exact[k].s : s.start + (k / toks.length) * s.dur;
      const end = exact ? s.start + exact[k].e : s.start + ((k + 1) / toks.length) * s.dur;
      out.push({ w, t, end, sentence: si, k });
    });
  });
  return out;
}

const fuzzyEq = (a: string, b: string) => a === b || (a.length >= 4 && b.startsWith(a) && b.length - a.length <= 2);

/** Index of the first token where `phrase` starts, at or after `from` (−1 = not found). */
export function findPhrase(tl: Token[], phrase: string, from = 0): number {
  const ph = tokensOf(phrase).map(normWord).filter(Boolean);
  if (!ph.length) return -1;
  // skip tokens that normalise to nothing ("—", "·") on the narration side
  const live = tl.map((x, i) => [x, i] as const).filter(([x]) => x.w);
  for (const eq of [(a: string, b: string) => a === b, fuzzyEq]) {
    for (let j = 0; j < live.length; j++) {
      if (live[j][1] < from) continue;
      let ok = true;
      for (let m = 0; m < ph.length; m++) {
        const tok = live[j + m];
        if (!tok || !eq(ph[m], tok[0].w)) { ok = false; break; }
      }
      if (ok) return live[j][1];
    }
  }
  return -1;
}

/* ------------------------------------ TimeRef resolution ------------------------------------ */

export interface TimeCtx {
  tl: Token[];
  narration: ResolvedNarration;
  /** beat window (seconds) and the token index the beat starts at (search cursor) */
  beatStart: number;
  beatEnd: number;
  cursor: number;
  sceneEnd: number;
}

export type Resolved = { t: number; dur?: number; idx?: number } | { error: PlanIssue };

/** Resolve a keyword or phrase (no offset). */
export function resolveOn(on: string | undefined, c: TimeCtx, where: string): Resolved {
  if (on === undefined || on === 'start') return { t: c.beatStart };
  if (on === 'end') return { t: c.beatEnd };
  if (on === 'scene-end') return { t: c.sceneEnd };
  const m = /^@(\d+)(\.end)?$/.exec(on);
  if (m) {
    const s = c.narration.sentences[Number(m[1])];
    if (!s) return { error: { level: 'error', code: 'TM002', where, msg: `no narration sentence ${m[1]} (have ${c.narration.sentences.length})` } };
    return { t: m[2] ? s.start + s.dur : s.start };
  }
  const idx = findPhrase(c.tl, on, c.cursor);
  if (idx < 0) {
    const anywhere = findPhrase(c.tl, on, 0);
    const hint = anywhere >= 0 ? ` (it occurs earlier, at ${c.tl[anywhere].t.toFixed(2)}s, before this beat)` : '';
    return { error: { level: 'error', code: 'TM001', where, msg: `phrase "${on}" not found in the narration after ${c.beatStart.toFixed(2)}s${hint}` } };
  }
  return { t: c.tl[idx].t, idx };
}

/** Resolve a TimeRef relative to its beat. */
export function resolveTime(ref: TimeRef | undefined, c: TimeCtx, where: string, dflt: 'start' | 'end' = 'start'): Resolved {
  if (ref === undefined) return { t: dflt === 'start' ? c.beatStart : c.beatEnd };
  if (typeof ref === 'number') return { t: c.beatStart + ref };
  if (typeof ref === 'string') return resolveOn(ref, c, where);
  const r = resolveOn(ref.on, c, where);
  if ('error' in r) return r;
  return { t: r.t + (ref.offset ?? 0), dur: ref.dur, idx: r.idx };
}

/* ------------------------------------ beats ------------------------------------ */

export interface BeatTime { start: number; end: number; cursor: number }

/** Beat starts from their `on` phrases (each searched after the previous beat's start word). */
export function resolveBeats(beats: { on: string; offset?: number }[], n: ResolvedNarration, tl = wordTimeline(n)): { beats: BeatTime[]; issues: PlanIssue[] } {
  const issues: PlanIssue[] = [];
  const out: BeatTime[] = [];
  let cursor = 0;
  let prev = 0;
  beats.forEach((b, i) => {
    const where = `beats[${i}].on`;
    const c: TimeCtx = { tl, narration: n, beatStart: prev, beatEnd: n.totalSec, cursor, sceneEnd: n.totalSec };
    let r = resolveOn(b.on, c, where);
    if ('error' in r) {
      issues.push(r.error);
      r = { t: prev + (i ? 1 : 0), idx: cursor };
    }
    // the first beat always starts the scene (its phrase just names the opening)
    const start = i === 0 ? 0 : r.t + (b.offset ?? 0);
    if (i > 0 && start <= prev) issues.push({ level: 'error', code: 'TM003', where, msg: `beat starts at ${start.toFixed(2)}s, not after the previous beat (${prev.toFixed(2)}s)` });
    out.push({ start, end: n.totalSec, cursor: r.idx ?? cursor });
    cursor = (r.idx ?? cursor) + (i === 0 ? 0 : 1);
    prev = start;
  });
  out.forEach((b, i) => { if (out[i + 1]) b.end = out[i + 1].start; });
  return { beats: out, issues };
}

/** An absolute time as a storyboard anchor ({s, dt}: dt seconds after sentence s starts). */
export function toAnchor(t: number, n: ResolvedNarration): { s: number; dt: number } {
  let s = 0;
  n.sentences.forEach((x, i) => { if (x.start <= t) s = i; });
  return { s, dt: +(t - n.sentences[s].start).toFixed(3) };
}
