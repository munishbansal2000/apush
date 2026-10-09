/**
 * Editor pass (docs/STORYBOARD.md, S4): one short LLM read of each act's cut list, like an editor watching a rough cut.
 * It may only switch a shot to another named framing of the same image, or drop an optional shot; it can never change
 * which picture lands on which phrase. Edits that break a rule are discarded (the built plan stands).
 */
import type {PipelineTurn} from '../pipeline-core';
import type {AnchorTiming} from './anchors';
import {resolvePhrase} from './anchors';
import type {DirectorIO, DirectorLog} from './doc-director';
import {readAnswer} from './doc-director';
import type {PlanShot, ShotPlan} from './shots';
import {moveOf, type Treatment} from './treatments';

interface Edit {index: number; framing?: string; drop?: boolean}

export function cutList(plan: ShotPlan, turns: PipelineTurn[], timing: AnchorTiming & {totalSec: number}, words: Record<string, never> | Record<string, unknown>, treatments: Record<string, Treatment>, range: {from: number; to: number}, allowEstimated = true): {lines: string[]; indexes: number[]} {
  const shots = plan.shots as unknown as (PlanShot & Record<string, unknown>)[];
  const startOf = (i: number) => {
    if (i === 0) return 0;
    const at = shots[i].at as {turn: number; phrase?: string};
    if (!at.phrase) return timing.starts[at.turn];
    try { return resolvePhrase(at as {turn: number; phrase: string}, turns, timing, words as never, 'start', allowEstimated).sec; } catch { return NaN; }
  };
  const lines: string[] = [];
  const indexes: number[] = [];
  shots.forEach((s, i) => {
    const at = s.at as {turn: number; phrase?: string};
    if (at.turn < range.from || at.turn > range.to) return;
    const len = (i + 1 < shots.length ? startOf(i + 1) : timing.totalSec) - startOf(i);
    const image = typeof s.image === 'string' ? s.image : null;
    const move = s.from && s.to ? moveOf(s.from as never, s.to as never) : '';
    const alts = image && treatments[image] ? Object.entries(treatments[image].framings).map(([n, f]) => `${n}(${f.move})`).join(' ') : '';
    lines.push(`${indexes.length}: ${s.type}${image ? ` ${image.split('/').pop()}` : ''} ${move} ${len.toFixed(1)}s on "${at.phrase ?? `pause ${at.turn}`}"${alts ? ` | framings: ${alts}` : ''}`);
    indexes.push(i);
  });
  return {lines, indexes};
}

export const editorPrompt = (title: string, lines: string[]) => [
  `You are the film editor of an APUSH documentary. This is the rough cut of the act "${title}", one shot per line (index: kind image move length on "phrase" | available framings).`,
  'Improve rhythm only: avoid runs of the same move, give key lines a slower hold, keep lists brisk. You may (a) switch a shot to another listed framing of the same image, or (b) drop a shot that adds nothing (the previous shot holds). Never change pictures or phrases.',
  'Return JSON only: {"edits": [{"index": 3, "framing": "detail"}, {"index": 7, "drop": true}]} or {"edits": []}.',
  '',
  ...lines,
].join('\n');

/** Applies editor edits to the plan (in place on a copy); unknown framings or illegal drops are skipped. */
export function applyEdits(plan: ShotPlan, indexes: number[], edits: Edit[], treatments: Record<string, Treatment>): {plan: ShotPlan; applied: string[]} {
  const shots = [...(plan.shots as unknown as Record<string, unknown>[])].map(s => ({...s}));
  const applied: string[] = [];
  const drop = new Set<number>();
  for (const e of edits ?? []) {
    const i = indexes[e?.index];
    if (i === undefined) continue;
    const s = shots[i];
    if (e.drop) {
      if (i > 0 && s.type !== 'question' && s.type !== 'portrait') { drop.add(i); applied.push(`dropped shot ${e.index}`); }
      continue;
    }
    const t = typeof s.image === 'string' ? treatments[s.image] : undefined;
    const f = e.framing && t?.framings[e.framing];
    if (f && (s.type === 'image_move' || s.type === 'clip')) { s.from = f.from; s.to = f.to; applied.push(`shot ${e.index} -> ${e.framing} (${f.move})`); }
  }
  return {plan: {...plan, shots: shots.filter((_, i) => !drop.has(i)) as unknown as ShotPlan['shots']}, applied};
}

/** Runs the editor over every act; returns the edited plan or the original where a pass is pending or invalid. */
export function editorPass(io: DirectorIO, plan: ShotPlan & {acts?: {title: string; turns: {from: number; to: number}}[]}, turns: PipelineTurn[], timing: AnchorTiming & {totalSec: number}, words: Record<string, unknown>, treatments: Record<string, Treatment>, validate: (p: ShotPlan) => string | null, log: DirectorLog[]): {plan: ShotPlan; pending: string[]} {
  let current: ShotPlan = plan;
  const pending: string[] = [];
  (plan.acts ?? []).forEach((act, n) => {
    const {lines, indexes} = cutList(current, turns, timing, words, treatments, act.turns);
    if (lines.length < 3) return;
    const name = `editor-act-${String(n + 1).padStart(2, '0')}`;
    const path = io.meta(name, editorPrompt(act.title, lines));
    if (!path) { pending.push(name); return; }
    const raw = readAnswer(path) as {edits?: Edit[]};
    const {plan: edited, applied} = applyEdits(current, indexes, raw?.edits ?? [], treatments);
    if (!applied.length) return;
    const problem = validate(edited);
    if (problem) { log.push({stage: `editor act ${n + 1} (discarded)`, source: path, issues: [problem]}); return; }
    log.push({stage: `editor act ${n + 1}`, source: path, issues: applied});
    current = edited;
  });
  return {plan: current, pending};
}
