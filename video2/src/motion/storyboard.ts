/**
 * Storyboard: one shot per narration sentence, plus the timed elements those shots use.
 * Written BEFORE the scene (what moves, when, and why), then checked by
 * tools/check-storyboard.ts so a scene can't be a slideshow: every sentence has an action,
 * the first seconds hook, nothing sits still for long, and the camera varies.
 *
 * Times are anchored to narration, never typed as absolute seconds:
 *   { "s": 1, "word": "wheat", "dt": -0.15 }  = 0.15 s before "wheat" in sentence 1
 *   { "s": 3, "dt": 1.8 }                      = 1.8 s after sentence 3 starts
 */

export type ShotCamera = 'push-in' | 'pull-back' | 'pan' | 'hold' | 'follow';
export const SHOT_CAMERAS: readonly ShotCamera[] = ['push-in', 'pull-back', 'pan', 'hold', 'follow'];

/** A time anchored to a narration sentence (optionally a word in it) plus an offset in seconds. */
export interface At { s: number; word?: string; dt?: number }

/**
 * A timed element. `motion` and `camera` elements MOVE over [in, out]; `label` and `panel`
 * elements ENTER at `in` (and leave at `out`), each entrance/exit counting as a brief change.
 * `events` = extra instants of change (a flow thickening, a list item landing).
 */
export interface StoryElement {
  kind: 'motion' | 'camera' | 'label' | 'panel';
  in: At;
  out?: At;
  events?: At[];
  note?: string;
}

export interface Shot {
  /** narration sentence index */
  sentence: number;
  camera: ShotCamera;
  /** what MOVES or changes (a verb: "the ship sails…"), not what is shown */
  action: string;
  /** what the viewer sees / should understand */
  shows: string;
  /** ids into `elements` */
  elements: string[];
}

export interface Storyboard {
  id: string;
  scene: string;
  /** narration JSON (sentences with start/dur[/words]) the anchors resolve against */
  narration: string;
  elements: Record<string, StoryElement>;
  shots: Shot[];
}

export interface NarrationSentence { text: string; start: number; dur: number; words?: { w: string; s: number; e: number }[] }
export interface Narration { sentences: NarrationSentence[]; totalSec: number }

export interface SbIssue { level: 'error' | 'warn' | 'info'; code: string; where: string; msg: string }

export const SB_RULES = {
  hookSec: 5,
  maxStillSec: 4,
  /** how long an entrance / exit / event counts as visible change */
  changeSec: 0.6,
  maxSameCamera: 2,
} as const;

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/^'+|'+$/g, '');

/** Resolve an anchor to scene seconds (measured word times if present, else evenly spaced). Null if unresolvable. */
export function resolveAt(at: At, n: Narration): number | null {
  const s = n.sentences[at.s];
  if (!s) return null;
  let t = s.start;
  if (at.word) {
    const w = norm(at.word);
    const hit = s.words?.find(x => x.w === w);
    if (hit) t = s.start + hit.s;
    else {
      const toks = s.text.split(/\s+/);
      const k = toks.findIndex(x => norm(x) === w);
      if (k < 0) return null;
      t = s.start + (k / toks.length) * s.dur;
    }
  }
  return t + (at.dt ?? 0);
}

export interface Activity { id: string; from: number; to: number; why: 'moves' | 'enters' | 'leaves' | 'event' }

/** Check a storyboard against its narration. Pure: returns issues + the computed activity timeline. */
export function checkStoryboard(sb: Storyboard, n: Narration): { issues: SbIssue[]; activity: Activity[]; still: [number, number][] } {
  const issues: SbIssue[] = [];
  const err = (code: string, where: string, msg: string) => issues.push({ level: 'error', code, where, msg });
  const warn = (code: string, where: string, msg: string) => issues.push({ level: 'warn', code, where, msg });
  const end = n.totalSec;

  // elements → activity windows
  const activity: Activity[] = [];
  for (const [id, el] of Object.entries(sb.elements)) {
    const tin = resolveAt(el.in, n);
    const tout = el.out ? resolveAt(el.out, n) : end;
    if (tin === null || tout === null) { err('SB007', `element ${id}`, `anchor does not resolve (sentence ${el.in.s}${el.in.word ? ` word "${el.in.word}"` : ''})`); continue; }
    if (tout < tin) { err('SB007', `element ${id}`, `out (${tout.toFixed(2)}s) is before in (${tin.toFixed(2)}s)`); continue; }
    if (el.kind === 'motion' || el.kind === 'camera') {
      activity.push({ id, from: tin, to: tout, why: 'moves' });
    } else {
      activity.push({ id, from: tin, to: tin + SB_RULES.changeSec, why: 'enters' });
      if (el.out) activity.push({ id, from: tout - SB_RULES.changeSec, to: tout, why: 'leaves' });
    }
    for (const [k, ev] of (el.events ?? []).entries()) {
      const t = resolveAt(ev, n);
      if (t === null) err('SB007', `element ${id}`, `event ${k} does not resolve`);
      else activity.push({ id, from: t, to: t + SB_RULES.changeSec, why: 'event' });
    }
  }
  activity.sort((a, b) => a.from - b.from);

  // shots ↔ sentences
  const seen = new Set<number>();
  for (const [i, shot] of sb.shots.entries()) {
    const where = `shot ${i} (sentence ${shot.sentence})`;
    if (!n.sentences[shot.sentence]) err('SB006', where, `no narration sentence ${shot.sentence}`);
    if (seen.has(shot.sentence)) err('SB006', where, 'sentence has more than one shot');
    seen.add(shot.sentence);
    if (!shot.action?.trim()) err('SB001', where, 'shot has no action (what moves or changes?)');
    if (!shot.shows?.trim()) warn('SB009', where, 'shot has no "shows"');
    if (!SHOT_CAMERAS.includes(shot.camera)) err('SB008', where, `unknown camera "${shot.camera}" (use ${SHOT_CAMERAS.join(', ')})`);
    for (const e of shot.elements) if (!sb.elements[e]) err('SB005', where, `unknown element "${e}"`);
    const s = n.sentences[shot.sentence];
    if (s && shot.elements.length && !activity.some(a => shot.elements.includes(a.id) && a.from < s.start + s.dur && a.to > s.start)) {
      warn('SB010', where, 'none of its elements moves or enters during the sentence');
    }
  }
  n.sentences.forEach((_, i) => { if (!seen.has(i)) err('SB006', `sentence ${i}`, 'no shot for this sentence'); });
  const used = new Set(sb.shots.flatMap(s => s.elements));
  for (const id of Object.keys(sb.elements)) if (!used.has(id)) warn('SB011', `element ${id}`, 'not used by any shot');

  // camera variety: the same shot type at most maxSameCamera times in a row
  const ordered = [...sb.shots].sort((a, b) => a.sentence - b.sentence);
  for (let i = SB_RULES.maxSameCamera; i < ordered.length; i++) {
    const run = ordered.slice(i - SB_RULES.maxSameCamera, i + 1);
    if (run.every(r => r.camera === ordered[i].camera)) {
      err('SB004', `sentence ${ordered[i].sentence}`, `"${ordered[i].camera}" ${run.length}× in a row (sentences ${run.map(r => r.sentence).join(', ')})`);
    }
  }

  // hook: something moves in the first seconds
  if (!activity.some(a => a.why === 'moves' && a.from < SB_RULES.hookSec && a.to > 0)) {
    err('SB002', 'opening', `nothing moves in the first ${SB_RULES.hookSec}s (no hook)`);
  }

  // still spans: gaps in the union of activity, over [0, end]
  const still: [number, number][] = [];
  let cursor = 0;
  for (const a of activity) {
    if (a.from > cursor) still.push([cursor, a.from]);
    cursor = Math.max(cursor, a.to);
  }
  if (cursor < end) still.push([cursor, end]);
  for (const [a, b] of still) {
    if (b - a > SB_RULES.maxStillSec) err('SB003', `${a.toFixed(1)}–${b.toFixed(1)}s`, `${(b - a).toFixed(1)}s with nothing entering or moving (max ${SB_RULES.maxStillSec}s)`);
  }
  return { issues, activity, still };
}
