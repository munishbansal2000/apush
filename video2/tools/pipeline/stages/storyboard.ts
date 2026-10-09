/**
 * Storyboard and build stages (docs/STORYBOARD.md).
 *
 *  storyboard  written from the script by the LLM (outline, then one small prompt per act) -> data/<lesson>/storyboard.json
 *              notes in review (and lines changed since boarding) re-board only their acts; approved acts stay frozen
 *  build       treatments proposed for the storyboard's images (never overwritten), then the timed shot plan
 *              -> data/<lesson>/shots.json (deterministic; --editor adds one editor pass); an approved plan is frozen
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative} from 'node:path';
import {ROOT} from '../../lib';
import {atomicJson, readJson, sha256} from '../../pipeline-core';
import type {PipelineContext} from '../context';
import {PendingAnswers, agentIO, directorCatalog, directorMaps, pendingPromptFile} from '../director-io';
import {loadDocInputs, type DocInputs} from '../doc-inputs';
import type {DirectorIO, DirectorLog, Outline} from '../doc-director';
import {editorPass} from '../editor-pass';
import {dropShortShots} from '../plan-fixups';
import {loadLessonReview, now, openNotes, planApproved, saveLessonReview, type LessonReview} from '../review';
import {buildPlan} from '../scene-builder';
import {resolveShotPlan, type ShotPlan} from '../shots';
import {checkStoryboard, type Storyboard} from '../storyboard';
import {directStoryboard, storySelfCheckFor} from '../storyboard-director';
import {loadTreatments, proposeTreatment, saveTreatments} from '../treatments';
import {readCheckedWords} from './words';
import {mapImages} from '../image-map';

const sha = (path: string) => sha256(readFileSync(path));
const turnsHash = (turns: {id: string; kind: string; text?: string}[]) => sha256(JSON.stringify(turns.map(t => [t.id, t.kind, t.text ?? ''])));
export const storyboardPathFor = (dataDir: string) => join(dataDir, 'storyboard.json');

/**
 * The accepted outline is offered back ("revise minimally") only when the script changed since it was accepted; for
 * an unchanged script the outline prompt stays byte-identical, so the cached answer is reused.
 */
export function priorOutlineFor(path: string, turns: {id: string; kind: string; text?: string}[]): Outline | undefined {
  if (!existsSync(path)) return undefined;
  const saved = readJson<{turnsHash?: string; outline?: Outline}>(path);
  if (!saved.outline) return undefined;
  return saved.turnsHash === turnsHash(turns) ? undefined : saved.outline;
}

/** Inputs both stages share: script, timing, words (strict unless --estimate-words), catalog, maps, prompt I/O. */
function prepare(ctx: PipelineContext) {
  const inputs = loadDocInputs(ctx.episode, null, ctx.draft, {dataDir: ctx.dataDir, publicDir: ctx.publicDir});
  if (!ctx.estimateWords) readCheckedWords(ctx, inputs.turns, {...inputs.timing, fps: 30, ttsHash: {}});
  inputs.options.allowEstimated = ctx.estimateWords && inputs.estimated;
  const agentDir = join(ctx.work, 'agent');
  const io: DirectorIO = ctx.agent
    ? {meta: (name, prompt, att, follow) => agentIO(agentDir).meta(name, prompt, att, follow ? storySelfCheckFor(follow) : undefined)}
    : {meta: ctx.meta, metaBatch: ctx.metaBatch};
  return {inputs, catalog: directorCatalog(inputs), maps: directorMaps(inputs, ctx.draft), io, agentDir, dataRoot: dirname(ctx.dataDir)};
}

function report(ctx: PipelineContext, file: string, log: DirectorLog[], pending: string[] | undefined, agentDir: string) {
  atomicJson(join(ctx.work, file), {episode: ctx.episode, at: now(), pending: pending ?? [], log});
  for (const e of log) if (e.issues.length) console.log(`  [${e.stage}] ${e.issues.length} item(s):\n${e.issues.slice(0, 8).map(i => `    - ${i}`).join('\n')}`);
  if (pending?.length) throw new PendingAnswers(pending.map(n => relative(ROOT, pendingPromptFile(agentDir, n) ?? n)), 'the same command');
}

/** Plan notes (about shots) become storyboard notes for the same act: pictures are decided in the storyboard. */
function movePlanNotes(review: LessonReview): number {
  let moved = 0;
  const stamp = now();
  for (const [act, notes] of openNotes(review, 'plan')) {
    review.storyboard ??= {};
    review.storyboard.notes ??= {};
    for (const n of notes) {
      (review.storyboard.notes[String(act)] ??= []).push({text: n.ref ? `${n.ref} (${n.shot}): ${n.text}` : n.text, at: stamp});
      n.done = stamp;
      moved++;
    }
    if (review.storyboard.acts) delete review.storyboard.acts[String(act)];
  }
  return moved;
}

/** Acts with lines changed since boarding get a note, so only those acts are re-boarded. */
function noteChangedLines(review: LessonReview, sb: Storyboard, inputs: DocInputs): number {
  const stale = checkStoryboard(sb, inputs.turns, inputs.timing.durations).issues.filter(i => /line changed or was removed/.test(i));
  let added = 0;
  for (const issue of stale) {
    const old = Number(/^turn (\d+)/.exec(issue)?.[1]);
    const act = sb.acts.findIndex(a => old >= a.turns.from && old <= a.turns.to) + 1;
    const open = review.storyboard?.notes?.[String(act)] ?? [];
    if (act > 0 && !open.some(n => !n.done && n.text.startsWith('script changed'))) {
      review.storyboard ??= {};
      review.storyboard.notes ??= {};
      (review.storyboard.notes[String(act)] ??= []).push({text: `script changed around line ${old}: re-board the changed lines (current text applies)`, at: now()});
      added++;
    }
  }
  return added;
}

/** Resolver problems ("shot12: …") as storyboard notes on the act that holds the shot's line. */
function noteBuildProblems(review: LessonReview, sb: Storyboard, plan: ShotPlan, problem: string): {count: number; acts: number[]; rest: string[]} {
  const acts = new Set<number>();
  const rest: string[] = [];
  let count = 0;
  for (const line of problem.split('\n').slice(1).map(l => l.replace(/^\s*-\s*/, '')).filter(Boolean)) {
    const n = Number(/^shot ?0*(\d+)/.exec(line)?.[1]);
    const turn = Number.isInteger(n) ? (plan.shots[n - 1] as {at?: {turn?: number}} | undefined)?.at?.turn : undefined;
    const act = turn === undefined ? -1 : sb.acts.findIndex(a => turn >= a.turns.from && turn <= a.turns.to) + 1;
    if (act <= 0) { rest.push(`  - ${line}`); continue; }
    // Library approval is a person's decision; a re-board could only drop the asset. Say what to approve instead.
    const unapproved = /"(geo\.[^"]+)" is \w+, not approved/.exec(line)?.[1];
    if (unapproved) { rest.push(`  - ${unapproved} needs approval (npm run maps -- review ${unapproved} approve), or build with --draft: act ${act}, line ${turn}`); continue; }
    review.storyboard ??= {};
    review.storyboard.notes ??= {};
    const list = (review.storyboard.notes[String(act)] ??= []);
    const text = `build check, line ${turn}: ${line.replace(/^shot ?\d+:?\s*/, '')}`;
    // The same problem after a re-board meant to fix it: do not loop; leave it for a person.
    if (list.some(x => x.done && x.text === text)) { rest.push(`  - act ${act}, line ${turn} (came back after a re-board; needs a person): ${line}`); continue; }
    if (!list.some(x => !x.done && x.text === text)) list.push({text, at: now()});
    if (review.storyboard.acts) delete review.storyboard.acts[String(act)];
    acts.add(act);
    count++;
  }
  return {count, acts: [...acts].sort((a, b) => a - b), rest: [...new Set(rest)]};
}

export function storyboardStage(ctx: PipelineContext): void {
  if (ctx.dryRun) { console.log('[storyboard] dry-run'); return; }
  const prepared = prepare(ctx);
  const {inputs, maps, io, agentDir, dataRoot} = prepared;
  // Images -> lines first: each act is offered the images mapped to its lines.
  const mapped = mapImages(ctx.episode, ctx.dataDir, inputs, io);
  if (mapped === null) throw new PendingAnswers([relative(ROOT, pendingPromptFile(agentDir, 'image-map') ?? 'image-map')], 'the same command');
  const catalog = mapped ? directorCatalog(inputs) : prepared.catalog;
  const review = loadLessonReview(ctx.episode, dataRoot);
  const sbPath = storyboardPathFor(ctx.dataDir);
  const outlinePath = join(ctx.work, 'doc-outline.accepted.json');
  const log: DirectorLog[] = [];
  const sb: Storyboard | null = existsSync(sbPath) ? readJson<Storyboard>(sbPath) : null;
  if (movePlanNotes(review) + (sb ? noteChangedLines(review, sb, inputs) : 0)) saveLessonReview(ctx.episode, review, dataRoot);
  const notes = openNotes(review, 'storyboard');
  const base = {episode: ctx.episode, turns: inputs.turns, timing: inputs.timing, words: inputs.words, options: inputs.options, catalog, maps};

  if (!sb) {
    console.log(`[storyboard] ${inputs.turns.length} lines, ${catalog.length} usable images${ctx.agent ? ' (agent mode)' : ''}`);
    const r = directStoryboard(io, {...base, previousOutline: priorOutlineFor(outlinePath, inputs.turns)});
    log.push(...r.log);
    report(ctx, 'storyboard.log.json', log, r.pending, agentDir);
    if (!r.storyboard) throw new Error(`storyboard: no valid storyboard after repairs; see ${relative(ROOT, join(ctx.work, 'storyboard.log.json'))}`);
    if (r.outline) atomicJson(outlinePath, {turnsHash: turnsHash(inputs.turns), outline: r.outline});
    atomicJson(sbPath, r.storyboard);
    console.log(`[storyboard] ${r.storyboard.turns.reduce((n, t) => n + t.visuals.length, 0)} visuals -> ${relative(ROOT, sbPath)}`);
    return;
  }
  if (notes.size) {
    if (!sb.acts.length) throw new Error(`${relative(ROOT, sbPath)} has no act boundaries; cannot revise by act`);
    const saved = existsSync(outlinePath) ? readJson<{outline?: Outline}>(outlinePath).outline : undefined;
    const outline: Outline = {title: saved?.title ?? ctx.episode, thesis: saved?.thesis ?? '', boxes: (sb.boxes ?? saved?.boxes ?? []) as Outline['boxes'],
      acts: sb.acts.map((a, i) => ({title: a.title, purpose: a.purpose ?? saved?.acts[i]?.purpose ?? '', turns: a.turns}))};
    console.log(`[storyboard] re-boarding act(s) ${[...notes.keys()].join(', ')} from review notes; the rest kept`);
    const r = directStoryboard(io, {...base, revise: {storyboard: sb, outline, notes: new Map([...notes].map(([a, list]) => [a, list.map(n => n.text)]))}});
    log.push(...r.log);
    report(ctx, 'storyboard.log.json', log, r.pending, agentDir);
    if (!r.storyboard) throw new Error(`storyboard: revision failed; see ${relative(ROOT, join(ctx.work, 'storyboard.log.json'))}`);
    atomicJson(sbPath, {...r.storyboard, boxes: sb.boxes ?? r.storyboard.boxes});
    const stamp = now();
    for (const act of notes.keys()) {
      for (const n of review.storyboard?.notes?.[String(act)] ?? []) n.done ??= stamp;
      if (review.storyboard?.acts) delete review.storyboard.acts[String(act)];
    }
    saveLessonReview(ctx.episode, review, dataRoot);
    return;
  }
  console.log(planApproved(review, sb.acts.length, 'storyboard') ? '[storyboard] approved in review (frozen)' : '[storyboard] current (add review notes to change acts)');
}

export function buildStage(ctx: PipelineContext): void {
  if (ctx.dryRun) { console.log('[build] dry-run'); return; }
  const {inputs, catalog, io, agentDir, dataRoot} = prepare(ctx);
  const sbPath = storyboardPathFor(ctx.dataDir);
  if (!existsSync(sbPath)) throw new Error(`build: no storyboard (${relative(ROOT, sbPath)}); run the storyboard stage`);
  const sb = readJson<Storyboard>(sbPath);
  const out = join(ctx.dataDir, 'shots.json');
  const review = loadLessonReview(ctx.episode, dataRoot);
  const log: DirectorLog[] = [];

  // Treatments for every image the storyboard uses (proposals only; existing and approved ones are never touched).
  const treatments = loadTreatments();
  const byPath = new Map(catalog.map(c => [c.path, c]));
  const used = [...new Set(sb.turns.flatMap(t => t.visuals.map(v => (v.kind === 'point' ? v.backdrop : v.image)).filter((p): p is string => !!p)))];
  const proposed = used.filter(p => !treatments[p] && byPath.has(p));
  for (const p of proposed) treatments[p] = proposeTreatment(byPath.get(p)!, Boolean(inputs.options.depthMaps?.[p]));
  if (proposed.length) { saveTreatments(treatments); console.log(`[build] ${proposed.length} treatment(s) proposed -> data/library/treatments.json (check: npm run storyboard -- ${ctx.episode} framings)`); }

  if (existsSync(out) && sb.acts.length && planApproved(review, sb.acts.length)) { console.log('[build] plan approved in review (frozen)'); return; }
  const hash = sha256(JSON.stringify({sb, treatments: used.map(p => treatments[p] ?? null), turns: inputs.turns, timing: inputs.timing, words: inputs.words, catalog: used.map(p => byPath.get(p)?.maxZoom ?? null),
    code: ['scene-builder.ts', 'treatments.ts', 'plan-fixups.ts', 'storyboard.ts', 'shots.ts'].map(f => sha(join(ROOT, 'tools', 'pipeline', f))), editor: ctx.editor}));
  // The checkpoint holds only while shots.json is still the file this build wrote (a checkout or hand edit rebuilds).
  const builtShaPath = join(ctx.work, 'build.shots.sha256');
  const untouched = existsSync(out) && existsSync(builtShaPath) && readFileSync(builtShaPath, 'utf8').trim() === sha(out);
  if (ctx.current('build', hash) && untouched) { console.log('[build] checkpoint current'); return; }

  const built = buildPlan({storyboard: sb, turns: inputs.turns, timing: inputs.timing, words: inputs.words, catalog, treatments, depthMaps: inputs.options.depthMaps, allowEstimated: inputs.options.allowEstimated});
  if (built.fixes.length) log.push({stage: 'build', source: 'storyboard', issues: built.fixes});
  if (built.warnings.length) log.push({stage: 'build warnings', source: 'storyboard', issues: built.warnings});
  if (built.storyboardIssues.length) log.push({stage: 'storyboard needs', source: 'storyboard', issues: built.storyboardIssues});
  const validate = (p: ShotPlan): string | null => {
    try { resolveShotPlan(p, inputs.turns, inputs.timing, inputs.words, inputs.options); return null; } catch (e) { return e instanceof Error ? e.message : String(e); }
  };
  let plan: ShotPlan = built.plan;
  let problem = validate(plan);
  if (problem) {
    const dropped = dropShortShots([{shots: plan.shots as never}], problem);
    const retry = {...plan, shots: dropped.acts[0].shots as unknown as ShotPlan['shots']};
    if (dropped.fixes.length && !validate(retry)) { plan = retry; problem = null; log.push({stage: 'build fixes', source: 'checks', issues: dropped.fixes}); }
  }
  if (problem) {
    report(ctx, 'build.log.json', log, undefined, agentDir);
    // Closed loop: each problem goes back to the storyboard act that owns its line, as a note; the next run re-boards
    // only those acts. Problems not tied to a shot (e.g. Episode Sheet boxes) stop the run as they are.
    const noted = noteBuildProblems(review, sb, plan, problem);
    if (noted.acts.length) {
      saveLessonReview(ctx.episode, review, dataRoot);
      throw new Error(`build: ${noted.count} problem(s) sent back to storyboard act(s) ${noted.acts.join(', ')} as review notes; run again to re-board them${noted.rest.length ? `\nfor a person:\n${noted.rest.join('\n')}` : ''}`);
    }
    throw new Error(`build: the plan from the storyboard does not pass the checks:\n${noted.rest.length ? noted.rest.join('\n') : problem}`);
  }
  if (ctx.editor) {
    const edited = editorPass(io, {...plan, acts: sb.acts}, inputs.turns, inputs.timing, inputs.words, treatments, validate, log);
    report(ctx, 'build.log.json', log, edited.pending.length ? edited.pending : undefined, agentDir);
    plan = edited.plan;
  } else report(ctx, 'build.log.json', log, undefined, agentDir);
  atomicJson(out, {_doc: `Built from data/${ctx.episode}/storyboard.json ${now()}`, ...plan, acts: sb.acts});
  writeFileSync(builtShaPath, `${sha(out)}\n`);
  ctx.mark('build', hash);
  console.log(`[build] ${plan.shots.length} shots -> ${relative(ROOT, out)}${built.storyboardIssues.length ? ` (${built.storyboardIssues.length} storyboard item(s) to look at)` : ''}`);
}
