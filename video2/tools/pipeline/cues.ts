/** Resolve and validate a plan's spoken cues: Episode Sheet boxes and per-item scene reveals. */
import type {DirectedPlan, DirectedScene, PipelineTurn, WordTiming} from '../pipeline-core';
import {resolvePhrase, type AnchorTiming} from './anchors';

/** How many items a component reveals one by one (and so how many `reveals` cues it takes). */
export function revealItemCount(scene: DirectedScene): number | null {
  const p = scene.props as Record<string, unknown>;
  const len = (key: string) => (Array.isArray(p[key]) ? (p[key] as unknown[]).length : 0);
  switch (scene.component) {
    case 'stagger': return len('panels');
    case 'causal_chain': return len('nodes');
    case 'chart': return len('data');
    case 'spectrum': return len('markers');
    case 'highlight': return len('highlights');
    case 'compare': return 2; // left column, then right column
    case 'primary_source': return 2; // highlight sweep, then HIPP card
    default: return null;
  }
}

export const MAX_BOX_LABEL = 48;

/**
 * Returns a copy of `plan` with introSec/checkSec/startSec/endSec on every box and revealSec on every scene that has
 * reveals. Throws with every problem found. `requireReveals` makes cues mandatory for revealable components.
 */
export function resolvePlanCues(
  plan: DirectedPlan,
  turns: PipelineTurn[],
  timing: AnchorTiming & {totalSec: number},
  words: Record<string, WordTiming[]>,
  opts: {requireBoxes?: boolean; requireReveals?: boolean; allowEstimated?: boolean} = {},
): DirectedPlan {
  const issues: string[] = [];
  const at = (where: string, fn: () => number): number => {
    try { return fn(); } catch (error) { issues.push(`${where}: ${error instanceof Error ? error.message : String(error)}`); return NaN; }
  };
  const turnEnd = (i: number) => (i + 1 < turns.length ? timing.starts[i + 1] : timing.totalSec);

  const boxes = plan.boxes ?? [];
  if (opts.requireBoxes && (boxes.length < 2 || boxes.length > 5)) issues.push(`plan needs 2-5 Episode Sheet boxes, got ${boxes.length}`);
  let lastTo = -1;
  let lastCheck = -Infinity;
  const resolvedBoxes = boxes.map((box, i) => {
    const where = `box ${i + 1}`;
    if (typeof box.label !== 'string' || !box.label.trim()) issues.push(`${where}: label is empty`);
    else if (box.label.length > MAX_BOX_LABEL) issues.push(`${where}: label "${box.label}" is longer than ${MAX_BOX_LABEL} characters`);
    const {from, to} = box.turns ?? ({} as {from: number; to: number});
    if (!Number.isInteger(from) || !Number.isInteger(to) || from > to || from < 0 || to >= turns.length) {
      issues.push(`${where}: turns ${JSON.stringify(box.turns)} is not a valid turn range`);
      return box;
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

  const index = new Map(turns.map((turn, i) => [turn.id, i]));
  const scenes = plan.scenes.map(scene => {
    const count = revealItemCount(scene);
    if (!scene.reveals) {
      if (opts.requireReveals && count) issues.push(`${scene.id}: ${scene.component} needs ${count} reveal cues (one per item)`);
      return scene;
    }
    if (count === null) { issues.push(`${scene.id}: ${scene.component} does not take reveal cues`); return scene; }
    if (scene.reveals.length !== count) { issues.push(`${scene.id}: ${scene.reveals.length} reveal cues for ${count} items`); return scene; }
    const own = new Set(scene.turnIds.map(id => index.get(id)));
    let previous = -Infinity;
    const revealSec = scene.reveals.map((cue, item) => {
      const where = `${scene.id} reveal ${item + 1}`;
      if (!own.has(cue?.turn)) { issues.push(`${where}: turn ${cue?.turn} is outside the scene's turns`); return NaN; }
      const sec = at(where, () => resolvePhrase(cue, turns, timing, words, 'start', opts.allowEstimated).sec);
      if (sec < previous) issues.push(`${where}: cue comes before the previous item's`);
      if (Number.isFinite(sec)) previous = sec;
      return sec;
    });
    return {...scene, revealSec};
  });

  if (issues.length) throw new Error(`plan cues invalid:\n${issues.map(issue => `  - ${issue}`).join('\n')}`);
  return {...plan, ...(plan.boxes ? {boxes: resolvedBoxes} : {}), scenes};
}
