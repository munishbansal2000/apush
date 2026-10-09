/**
 * The direct stage on the storyboard flow (docs/STORYBOARD.md, S5): storyboard -> treatments -> build (+ editor pass).
 * Each step is frozen when approved in review and revised only where notes point; the current director survives as
 * --legacy-director.
 *
 *  storyboard  missing + a plan exists  -> bootstrapped from the plan (the director's work is kept)
 *              missing                  -> written by the LLM per act
 *              notes (or changed lines) -> only those acts re-asked; plan notes are moved to the storyboard
 *  treatments  proposed for every image the storyboard uses that has none (never overwrites)
 *  build       plan approved            -> frozen
 *              otherwise                -> rebuilt whenever its inputs change (deterministic), then the editor pass
 */
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join, relative} from 'node:path';
import {ROOT} from '../../lib';
import {atomicJson, readJson, sha256} from '../../pipeline-core';
import type {PipelineContext} from '../context';
import {PendingAnswers, agentIO, directorCatalog, directorMaps, pendingPromptFile} from '../director-io';
import {loadDocInputs} from '../doc-inputs';
import type {DirectorLog, Outline} from '../doc-director';
import {editorPass} from '../editor-pass';
import {dropShortShots} from '../plan-fixups';
import {loadLessonReview, now, openNotes, planActs, planApproved, saveLessonReview, type LessonReview} from '../review';
import {buildPlan} from '../scene-builder';
import {resolveShotPlan, type ShotPlan} from '../shots';
import {bootstrapStoryboard, checkStoryboard, type Storyboard} from '../storyboard';
import {directStoryboard, storySelfCheckFor} from '../storyboard-director';
import {loadTreatments, proposeTreatment, saveTreatments} from '../treatments';
import {readCheckedWords} from './words';

const sha = (path: string) => sha256(readFileSync(path));
const src = (name: string) => join(ROOT, 'tools', 'pipeline', name);

/** The outline the storyboard's acts came from (title/thesis from the saved outline when there is one). */
function outlineOf(sb: Storyboard, saved: Outline | undefined, episode: string): Outline {
  return {
    title: saved?.title ?? episode, thesis: saved?.thesis ?? '', boxes: (sb.boxes ?? saved?.boxes ?? []) as Outline['boxes'],
    acts: sb.acts.map((a, i) => ({title: a.title, purpose: a.purpose ?? saved?.acts[i]?.purpose ?? '', turns: a.turns})),
  };
}

/** Plan notes (about shots) become storyboard notes for the same act: the storyboard is where pictures are decided. */
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

export function storyboardDirectStage(ctx: PipelineContext, opts: {allowEstimated?: boolean} = {}): void {
  const inputs = loadDocInputs(ctx.episode, null, ctx.draft, {dataDir: ctx.dataDir, publicDir: ctx.publicDir});
  if (ctx.dryRun) { console.log(`[direct] dry-run: storyboard -> treatments -> build over ${inputs.turns.length} turns`); return; }
  if (!opts.allowEstimated) readCheckedWords(ctx, inputs.turns, {...inputs.timing, fps: 30, ttsHash: {}});
  inputs.options.allowEstimated = !!opts.allowEstimated && inputs.estimated;
  const catalog = directorCatalog(inputs);
  const maps = directorMaps(inputs, ctx.draft);
  const dataRoot = dirname(ctx.dataDir);
  const review = loadLessonReview(ctx.episode, dataRoot);
  const sbPath = join(ctx.dataDir, 'storyboard.json');
  const out = join(ctx.dataDir, 'shots.json');
  const outlinePath = join(ctx.work, 'doc-outline.accepted.json');
  const agentDir = join(ctx.work, 'agent');
  const io = ctx.agent ? {meta: (name: string, prompt: string, att?: string[], follow?: string) => agentIO(agentDir).meta(name, prompt, att, follow ? storySelfCheckFor(follow) : undefined)} : {meta: ctx.meta};
  const log: DirectorLog[] = [];
  const savedOutline = existsSync(outlinePath) ? readJson<{outline?: Outline}>(outlinePath).outline : undefined;
  const pendingOrThrow = (pending: string[] | undefined) => {
    atomicJson(join(ctx.work, 'storyboard-director.json'), {episode: ctx.episode, at: now(), pending: pending ?? [], log});
    for (const e of log) if (e.issues.length) console.log(`  [${e.stage}] ${e.issues.length} item(s):\n${e.issues.slice(0, 8).map(i => `    - ${i}`).join('\n')}`);
    if (pending?.length) throw new PendingAnswers(pending.map(n => relative(ROOT, pendingPromptFile(agentDir, n) ?? n)), 'the same command');
  };

  // 1. Storyboard.
  let sb: Storyboard | null = existsSync(sbPath) ? readJson<Storyboard>(sbPath) : null;
  if (!sb && existsSync(out)) {
    const plan = readJson<ShotPlan & {acts?: Storyboard['acts']}>(out);
    sb = bootstrapStoryboard(plan, inputs.turns, planActs(plan, outlinePath));
    atomicJson(sbPath, sb);
    console.log(`[storyboard] bootstrapped from the existing plan -> ${relative(ROOT, sbPath)}`);
  }
  if (movePlanNotes(review)) saveLessonReview(ctx.episode, review, dataRoot);
  if (sb) {
    // Lines changed since boarding: their acts get a note, so only those acts are re-boarded.
    const stale = checkStoryboard(sb, inputs.turns, inputs.timing.durations).issues.filter(i => /line changed or was removed/.test(i));
    for (const issue of stale) {
      const old = Number(/^turn (\d+)/.exec(issue)?.[1]);
      const act = sb.acts.findIndex(a => old >= a.turns.from && old <= a.turns.to) + 1;
      if (act > 0 && !(review.storyboard?.notes?.[String(act)] ?? []).some(n => !n.done && n.text.startsWith('script changed'))) {
        review.storyboard ??= {}; review.storyboard.notes ??= {};
        (review.storyboard.notes[String(act)] ??= []).push({text: `script changed around line ${old}: re-board the changed lines (current text applies)`, at: now()});
      }
    }
    if (stale.length) saveLessonReview(ctx.episode, review, dataRoot);
  }
  const notes = openNotes(review, 'storyboard');
  if (!sb) {
    console.log(`[storyboard] ${inputs.turns.length} turns, ${catalog.length} usable images${ctx.agent ? ' (agent mode)' : ''}`);
    const r = directStoryboard(io, {episode: ctx.episode, turns: inputs.turns, timing: inputs.timing, words: inputs.words, options: inputs.options, catalog, maps, previousOutline: savedOutline});
    log.push(...r.log);
    pendingOrThrow(r.pending);
    if (!r.storyboard) throw new Error(`storyboard: no valid storyboard after repairs; see ${relative(ROOT, join(ctx.work, 'storyboard-director.json'))}`);
    sb = r.storyboard;
    atomicJson(sbPath, sb);
    if (r.outline) atomicJson(outlinePath, {turnsHash: sha256(JSON.stringify(inputs.turns.map(t => [t.id, t.kind, t.text ?? '']))), outline: r.outline});
    console.log(`[storyboard] ${sb.turns.reduce((n, t) => n + t.visuals.length, 0)} visuals -> ${relative(ROOT, sbPath)}`);
  } else if (notes.size) {
    if (!sb.acts.length) throw new Error(`${relative(ROOT, sbPath)} has no act boundaries; cannot revise by act`);
    console.log(`[storyboard] revising act(s) ${[...notes.keys()].join(', ')} from review notes; the rest kept`);
    const r = directStoryboard(io, {episode: ctx.episode, turns: inputs.turns, timing: inputs.timing, words: inputs.words, options: inputs.options, catalog, maps,
      revise: {storyboard: sb, outline: outlineOf(sb, savedOutline, ctx.episode), notes: new Map([...notes].map(([a, list]) => [a, list.map(n => n.text)]))}});
    log.push(...r.log);
    pendingOrThrow(r.pending);
    if (!r.storyboard) throw new Error(`storyboard: revision failed; see ${relative(ROOT, join(ctx.work, 'storyboard-director.json'))}`);
    sb = {...r.storyboard, boxes: sb.boxes ?? r.storyboard.boxes};
    atomicJson(sbPath, sb);
    const stamp = now();
    for (const act of notes.keys()) {
      for (const n of review.storyboard?.notes?.[String(act)] ?? []) n.done ??= stamp;
      if (review.storyboard?.acts) delete review.storyboard.acts[String(act)];
    }
    saveLessonReview(ctx.episode, review, dataRoot);
  } else if (planApproved(review, sb.acts.length, 'storyboard')) console.log('[storyboard] approved in review (frozen)');

  // 2. Treatments for every image the storyboard uses (proposals only; existing and approved ones are never touched).
  const treatments = loadTreatments();
  const byPath = new Map(catalog.map(c => [c.path, c]));
  let proposed = 0;
  for (const st of sb.turns) for (const v of st.visuals) {
    const image = v.kind === 'point' ? v.backdrop : v.image;
    if (!image || treatments[image] || !byPath.has(image)) continue;
    treatments[image] = proposeTreatment(byPath.get(image)!, Boolean(inputs.options.depthMaps?.[image]));
    proposed++;
  }
  if (proposed) { saveTreatments(treatments); console.log(`[treatments] ${proposed} proposed -> data/library/treatments.json (review the framing stills)`); }

  // 3. Build (deterministic), unless the plan is approved.
  const planReview = review.plan;
  if (existsSync(out) && sb.acts.length && planApproved({plan: planReview}, sb.acts.length)) { console.log('[build] plan approved in review (frozen)'); return; }
  const used = [...new Set(sb.turns.flatMap(t => t.visuals.map(v => (v.kind === 'point' ? v.backdrop : v.image)).filter(Boolean) as string[]))];
  const hash = sha256(JSON.stringify({sb, treatments: used.map(p => treatments[p] ?? null), turns: inputs.turns, timing: inputs.timing, words: inputs.words,
    code: ['scene-builder.ts', 'treatments.ts', 'plan-fixups.ts', 'storyboard.ts'].map(f => sha(src(f))), editor: process.argv.includes('--editor')}));
  if (ctx.current('direct', hash) && existsSync(out)) { console.log('[build] checkpoint current'); return; }
  if (process.argv.includes('--keep-plan') && existsSync(out)) { console.log('[build] --keep-plan: using the existing plan'); return; }
  const built = buildPlan({storyboard: sb, turns: inputs.turns, timing: inputs.timing, words: inputs.words, catalog, treatments, depthMaps: inputs.options.depthMaps, allowEstimated: inputs.options.allowEstimated});
  if (built.fixes.length) log.push({stage: 'build', source: 'storyboard', issues: built.fixes});
  if (built.warnings.length) log.push({stage: 'build warnings', source: 'storyboard', issues: built.warnings});
  if (built.storyboardIssues.length) log.push({stage: 'build: storyboard needs', source: 'storyboard', issues: built.storyboardIssues});
  const validate = (p: ShotPlan): string | null => {
    try { resolveShotPlan(p, inputs.turns, inputs.timing, inputs.words, inputs.options); return null; } catch (e) { return e instanceof Error ? e.message : String(e); }
  };
  let plan: ShotPlan = built.plan;
  let problem = validate(plan);
  if (problem) {
    const dropped = dropShortShots([{shots: plan.shots as never}], problem);
    if (dropped.fixes.length) {
      const retry = {...plan, shots: dropped.acts[0].shots as unknown as ShotPlan['shots']};
      if (!validate(retry)) { plan = retry; problem = null; log.push({stage: 'build fixes', source: 'resolver', issues: dropped.fixes}); }
    }
  }
  if (problem) {
    pendingOrThrow(undefined);
    throw new Error(`build: the plan from the storyboard does not pass the checks:\n${problem}\nAdd storyboard notes for these lines (npm run review -- ${ctx.episode} note --storyboard ...) and run again.`);
  }
  if (process.argv.includes('--editor')) {
    const edited = editorPass(io, {...plan, acts: sb.acts}, inputs.turns, inputs.timing, inputs.words, treatments, validate, log);
    pendingOrThrow(edited.pending.length ? edited.pending : undefined);
    plan = edited.plan;
  } else pendingOrThrow(undefined);
  atomicJson(out, {_doc: `Built from data/${ctx.episode}/storyboard.json ${now()}`, ...plan, acts: sb.acts});
  ctx.mark('direct', hash);
  console.log(`[build] ${plan.shots.length} shots -> ${relative(ROOT, out)}${built.storyboardIssues.length ? ` (${built.storyboardIssues.length} storyboard item(s) to look at)` : ''}`);
}
