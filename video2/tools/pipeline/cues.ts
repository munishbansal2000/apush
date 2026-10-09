/** Episode Sheet boxes: resolve and validate their spoken cues (used by the director's outline check). */
import type {PipelineTurn, WordTiming} from '../pipeline-core';
import {resolvePhrase, type AnchorTiming, type PhraseAnchor} from './anchors';

/** One Episode Sheet box: named at `intro`, covered over `turns`, checked off at `check`. */
export interface PlanBox {label: string; intro: PhraseAnchor; check: PhraseAnchor; turns: {from: number; to: number}}
export interface ResolvedBox extends PlanBox {introSec: number; checkSec: number; startSec: number; endSec: number}

export const MAX_BOX_LABEL = 48;

/**
 * Resolves introSec/checkSec/startSec/endSec for every box and throws with every problem found: 2-5 boxes (when
 * required), labels <= MAX_BOX_LABEL, ordered non-overlapping turn spans, cues the narration really says, a box named
 * before its coverage starts and checked after it starts, and checks in box order.
 */
export function resolveBoxes(
  boxes: PlanBox[] | undefined,
  turns: PipelineTurn[],
  timing: AnchorTiming & {totalSec: number},
  words: Record<string, WordTiming[]>,
  opts: {requireBoxes?: boolean; allowEstimated?: boolean} = {},
): ResolvedBox[] {
  const issues: string[] = [];
  const list = boxes ?? [];
  const at = (where: string, fn: () => number): number => {
    try { return fn(); } catch (error) { issues.push(`${where}: ${error instanceof Error ? error.message : String(error)}`); return NaN; }
  };
  const turnEnd = (i: number) => (i + 1 < turns.length ? timing.starts[i + 1] : timing.totalSec);
  if (opts.requireBoxes && (list.length < 2 || list.length > 5)) issues.push(`plan needs 2-5 Episode Sheet boxes, got ${list.length}`);
  let lastTo = -1;
  let lastCheck = -Infinity;
  const resolved = list.map((box, i): ResolvedBox | null => {
    const where = `box ${i + 1}`;
    if (typeof box.label !== 'string' || !box.label.trim()) issues.push(`${where}: label is empty`);
    else if (box.label.length > MAX_BOX_LABEL) issues.push(`${where}: label "${box.label}" is longer than ${MAX_BOX_LABEL} characters`);
    const {from, to} = box.turns ?? ({} as {from: number; to: number});
    if (!Number.isInteger(from) || !Number.isInteger(to) || from > to || from < 0 || to >= turns.length) {
      issues.push(`${where}: turns ${JSON.stringify(box.turns)} is not a valid turn range`);
      return null;
    }
    if (from <= lastTo) issues.push(`${where}: turns ${from}-${to} overlap or precede box ${i}`);
    lastTo = to;
    const startSec = timing.starts[from];
    const endSec = turnEnd(to);
    const introSec = at(`${where} intro`, () => resolvePhrase(box.intro, turns, timing, words, 'start', opts.allowEstimated).sec);
    const checkSec = at(`${where} check`, () => resolvePhrase(box.check, turns, timing, words, 'end', opts.allowEstimated).sec);
    if (introSec > startSec) issues.push(`${where}: named at ${introSec.toFixed(2)}s, after its coverage starts (${startSec.toFixed(2)}s)`);
    if (checkSec < startSec) issues.push(`${where}: checked at ${checkSec.toFixed(2)}s, before its coverage starts (${startSec.toFixed(2)}s)`);
    if (checkSec < lastCheck) issues.push(`${where}: checked before box ${i}`);
    if (Number.isFinite(checkSec)) lastCheck = checkSec;
    return {...box, introSec, checkSec, startSec, endSec};
  });
  if (issues.length) throw new Error(`plan cues invalid:\n${issues.map(issue => `  - ${issue}`).join('\n')}`);
  return resolved as ResolvedBox[];
}
