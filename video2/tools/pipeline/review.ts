/**
 * Review state: what a person has looked at and accepted (frozen: the pipeline reuses it even when code changes) and
 * what needs work (notes that drive targeted fixes). Committed to git, so approvals survive machines and runs.
 *
 *   data/<lesson>/review.json            audio, plan acts (+ shot notes), clips, render
 *   data/library/review/images.json      images, shared by every lesson
 *   data/library/review/components.json  custom explainers, shared by the unit
 *
 * Edited with tools/review.ts (npm run review); read by the pipeline stages.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {ROOT} from '../lib';

export type Status = 'approved' | 'rejected' | 'needs-work';

/** A reviewer note on an act; `shot` is the act-local reference the director sees ("shot index 4"), `ref` the contact-sheet id. */
export interface Note {text: string; shot?: string; ref?: string; at: string; done?: string}

export interface LessonReview {
  audio?: {approved?: string};
  plan?: {acts?: Record<string, {status: Status; at: string}>; notes?: Record<string, Note[]>};
  clips?: Record<string, {status: Status; at: string; note?: string}>;
  render?: {approved?: string};
}

export interface LibraryReview {[key: string]: {status: Status; at: string; note?: string}}

const read = <T>(path: string, fallback: T): T => {
  try { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as T : fallback; } catch (error) {
    throw new Error(`${path} is not valid JSON (${error instanceof Error ? error.message : String(error)}); fix or delete it`);
  }
};
const write = (path: string, data: unknown) => {
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
};

export const lessonReviewPath = (episode: string, dataRoot = join(ROOT, 'data')) => join(dataRoot, episode, 'review.json');
export const imageReviewPath = (root = ROOT) => join(root, 'data', 'library', 'review', 'images.json');
export const componentReviewPath = (root = ROOT) => join(root, 'data', 'library', 'review', 'components.json');

export const loadLessonReview = (episode: string, dataRoot?: string): LessonReview => read(lessonReviewPath(episode, dataRoot), {});
export const saveLessonReview = (episode: string, review: LessonReview, dataRoot?: string) => write(lessonReviewPath(episode, dataRoot), review);
export const loadImageReview = (root?: string): LibraryReview => read(imageReviewPath(root), {});
export const saveImageReview = (review: LibraryReview, root?: string) => write(imageReviewPath(root), review);
export const loadComponentReview = (root?: string): LibraryReview => read(componentReviewPath(root), {});
export const saveComponentReview = (review: LibraryReview, root?: string) => write(componentReviewPath(root), review);

export const now = () => new Date().toISOString();

/** Images and components a reviewer turned down: never offered to the director, flagged in frozen plans. */
export const rejectedKeys = (review: LibraryReview, statuses: Status[] = ['rejected']) =>
  new Set(Object.entries(review).filter(([, v]) => statuses.includes(v.status)).map(([k]) => k));

/** Open (not done) notes per act number (1-based, as strings). */
export function openNotes(review: LessonReview): Map<number, Note[]> {
  const out = new Map<number, Note[]>();
  for (const [act, notes] of Object.entries(review.plan?.notes ?? {})) {
    const open = notes.filter(n => !n.done);
    if (open.length) out.set(Number(act), open);
  }
  return out;
}

/** True when every act of the plan is approved (the whole plan is frozen). */
export const planApproved = (review: LessonReview, actCount: number) =>
  actCount > 0 && Array.from({length: actCount}, (_, i) => review.plan?.acts?.[String(i + 1)]?.status).every(s => s === 'approved');

/** Act turn ranges for a plan: written into shots.json by the director; older plans fall back to the saved outline. */
export function planActs(plan: {acts?: {title: string; turns: {from: number; to: number}}[]}, outlinePath?: string): {title: string; turns: {from: number; to: number}}[] {
  if (plan.acts?.length) return plan.acts;
  if (outlinePath && existsSync(outlinePath)) {
    const saved = read<{outline?: {acts?: {title: string; turns: {from: number; to: number}}[]}}>(outlinePath, {});
    if (saved.outline?.acts?.length) return saved.outline.acts;
  }
  return [];
}

/** Which act (0-based) and act-local index a plan-wide shot index belongs to, from each shot's anchor turn. */
export function locateShot(shots: {at: {turn: number}}[], acts: {turns: {from: number; to: number}}[], index: number): {act: number; local: number} | null {
  const shot = shots[index];
  if (!shot) return null;
  const act = acts.findIndex(a => shot.at.turn >= a.turns.from && shot.at.turn <= a.turns.to);
  if (act < 0) return null;
  const local = shots.slice(0, index).filter(s => s.at.turn >= acts[act].turns.from && s.at.turn <= acts[act].turns.to).length;
  return {act, local};
}
