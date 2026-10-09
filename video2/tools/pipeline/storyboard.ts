/**
 * Storyboard (docs/STORYBOARD.md): per turn, the visuals to show, the phrase each lands on, priority and pace. Turns are
 * keyed by identity (speaker + text hash), so script edits invalidate only the turns they touch.
 */
import type {PipelineTurn} from '../pipeline-core';
import {sha256} from '../pipeline-core';
import {cleanSpeech} from './speech';
import {LOOK_RULES} from './shots';

export type VisualKind = 'image' | 'map' | 'point' | 'custom' | 'clip';

export interface StoryVisual {
  kind: VisualKind;
  at: {phrase: string; occurrence?: number};
  priority: 'essential' | 'optional';
  pace?: 'hold' | 'quick' | 'reveal';
  /** Continue this visual over the next N turns. */
  span?: number;
  image?: string;
  /** Named treatment framing (S3); until treatments exist, `move` keeps an explicit camera move. */
  framing?: string;
  move?: {from: {x: number; y: number; zoom: number}; to: {x: number; y: number; zoom: number}};
  /** Portrait name tag. */
  name?: string;
  role?: string;
  /** Map shot spec (usually {view, moves, fills, lines, points}); point bullets; explainer; clip motion. */
  map?: Record<string, unknown>;
  bullets?: {text: string; at: {phrase: string} | {offset: number}}[];
  backdrop?: string;
  component?: string;
  prompt?: string;
  seed?: number;
  focus?: [number, number];
  atmosphere?: string[];
  transition?: 'cut' | 'crossfade';
  note?: string;
}

export interface StoryTurn {key: string; index: number; visuals: StoryVisual[]}
export interface StoryAct {title: string; purpose?: string; turns: {from: number; to: number}}
export interface Storyboard {
  episode: string;
  acts: StoryAct[];
  turns: StoryTurn[];
  /** Episode Sheet boxes (from the outline), carried to the plan. */
  boxes?: {label: string; intro: {turn: number; phrase: string}; check: {turn: number; phrase: string}; turns: {from: number; to: number}}[];
  /** Year stamps: the line (by key) and the phrase they land on. */
  years?: {key: string; phrase: string; text: string}[];
}

/** Stable turn identity: speaker + hash of the spoken words (tags and markup ignored). */
const baseKey = (turn: PipelineTurn): string =>
  turn.kind === 'pause' ? `pause:${turn.pauseSec}` : `${turn.speaker ?? 'narrator'}:${sha256(cleanSpeech(turn.text ?? '').toLowerCase()).slice(0, 10)}`;

/** Keys for every turn; a repeated line ("Checked.") gets #2, #3… in script order. */
export function turnKeys(turns: PipelineTurn[]): string[] {
  const seen = new Map<string, number>();
  return turns.map(t => {
    const base = baseKey(t);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}#${n}`;
  });
}

export const normWords = (text: string) => cleanSpeech(text).toLowerCase().replace(/[^a-z0-9']+/g, ' ').replace(/'/g, '').trim();
const countPhrase = (text: string, phrase: string) => {
  const hay = ` ${normWords(text)} `;
  const needle = ` ${normWords(phrase)} `;
  if (needle.trim() === '') return 0;
  let n = 0;
  for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + 1)) n++;
  return n;
};
const phrasePos = (text: string, phrase: string, occurrence = 1) => {
  const hay = ` ${normWords(text)} `;
  const needle = ` ${normWords(phrase)} `;
  let i = -1;
  for (let k = 0; k < occurrence; k++) { i = hay.indexOf(needle, i + 1); if (i < 0) return -1; }
  return i;
};

export interface StoryCheck {issues: string[]; warnings: string[]; uses: Map<string, number>}

/**
 * Checks a storyboard against the current script: stale turns (the line changed), anchors that are missing, ambiguous
 * or out of order, images over the lesson budget or turned down in review, and long stretches with too few visuals.
 */
export function checkStoryboard(sb: Storyboard, turns: PipelineTurn[], durations: number[], opts: {rejectedImages?: Set<string>; maxImageUses?: number} = {}): StoryCheck {
  const issues: string[] = [];
  const warnings: string[] = [];
  const uses = new Map<string, number>();
  const keys = new Map(turnKeys(turns).map((k, i) => [k, i]));
  const covered = new Set<number>();
  for (const st of sb.turns) {
    const index = keys.get(st.key);
    if (index === undefined) { if (st.visuals.length) issues.push(`turn ${st.index} (${st.key}): the line changed or was removed; its ${st.visuals.length} visual(s) need re-boarding`); continue; }
    const turn = turns[index];
    if (turn.kind === 'pause' && st.visuals.length) issues.push(`turn ${index}: pauses get automatic question cards; remove its visuals`);
    let last = -1;
    st.visuals.forEach((v, n) => {
      const where = `turn ${index} visual ${n + 1}`;
      const text = turn.text ?? '';
      const count = countPhrase(text, v.at.phrase);
      if (!count) issues.push(`${where}: "${v.at.phrase}" is not in the line`);
      else if (count > 1 && !v.at.occurrence) issues.push(`${where}: "${v.at.phrase}" appears ${count} times in the line; give "occurrence" or a longer phrase`);
      const pos = count ? phrasePos(text, v.at.phrase, v.at.occurrence ?? 1) : -1;
      if (pos >= 0 && pos < last) issues.push(`${where}: lands before the previous visual in the same line`);
      if (pos >= 0 && pos === last) issues.push(`${where}: lands on the same phrase as the previous visual`);
      if (pos >= 0) last = pos;
      const image = v.kind === 'point' ? v.backdrop : v.image;
      if (image) {
        uses.set(image, (uses.get(image) ?? 0) + 1);
        if (opts.rejectedImages?.has(image)) issues.push(`${where}: "${image}" was turned down in review`);
      }
      if ((v.kind === 'image' || v.kind === 'clip') && !v.image) issues.push(`${where}: ${v.kind} needs an image`);
      if (v.kind === 'custom' && !v.component) issues.push(`${where}: custom needs a component`);
      for (let k = 0; k <= (v.span ?? 0); k++) covered.add(index + k);
    });
  }
  // Custom explainers: each at most once per lesson, at most LOOK_RULES.maxCustoms distinct (turn-addressed, so a
  // repair goes to the act that holds the extra one).
  const customAt = new Map<string, number>();
  for (const st of sb.turns) {
    const index = keys.get(st.key);
    if (index === undefined) continue;
    for (const v of st.visuals) {
      if (v.kind !== 'custom' || !v.component) continue;
      const first = customAt.get(v.component);
      if (first !== undefined) issues.push(`turn ${index}: custom explainer "${v.component}" is already used at turn ${first}; once per lesson, use a standard visual here`);
      else if (customAt.size >= LOOK_RULES.maxCustoms) issues.push(`turn ${index}: custom explainer "${v.component}" is over the lesson budget (${LOOK_RULES.maxCustoms} explainers, already ${[...customAt.keys()].join(', ')}); use a standard visual here`);
      else customAt.set(v.component, index);
    }
  }
  const max = opts.maxImageUses ?? LOOK_RULES.maxImageUses;
  for (const [image, n] of uses) if (n > max) issues.push(`"${image}" is used ${n} times; max ${max} per lesson`);
  // Coverage: a long spoken turn needs several visuals (or a span from before); flag thin stretches for re-boarding.
  turns.forEach((t, i) => {
    if (t.kind !== 'speech') return;
    const own = sb.turns.find(st => keys.get(st.key) === i)?.visuals.length ?? 0;
    const needed = Math.floor((durations[i] ?? 0) / LOOK_RULES.maxShotSec);
    if (!own && !covered.has(i) && (durations[i] ?? 0) > LOOK_RULES.maxShotSec) warnings.push(`turn ${i} (${(durations[i] ?? 0).toFixed(0)}s): no visual of its own and none spanning into it`);
    else if (own && own < needed) warnings.push(`turn ${i} (${(durations[i] ?? 0).toFixed(0)}s): ${own} visual(s); a line this long needs about ${needed} (the build can split one image into framings)`);
  });
  return {issues, warnings, uses};
}
