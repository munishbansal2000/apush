import {execFileSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, writeFileSync, rmSync, unlinkSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {ROOT, ffprobeDuration} from '../../lib';
import {atomicJson, normalizePlan, readJson, syncIssues, validateCanvas, type DirectedPlan, type PipelineTurn} from '../../pipeline-core';
import {treeHash, type PipelineContext, type Timing} from '../context';
import {assembleEpisode, buildNarrationTrack} from '../assemble';
import {planImageRefs} from '../plan-refs';
import {segmentFingerprint, stillFileName, stillFingerprint, type RenderEnv} from '../render-cache';
import {imageManifestPathFor, planPathFor} from './direct';
import {levelsPathFor} from './timing';
import {wordsPathFor} from './words';

interface LayoutIssue {frame: number; kind: string; id: string; other?: string; detail?: string}
export const layoutIssuesFromLog = (text: string): LayoutIssue[] => {
  const match = /\[(?:kit-layout|layout-guard)\]\s+(\{.*\})$/s.exec(text);
  if (!match) return [];
  try {
    const payload = JSON.parse(match[1]) as {frame?: number; issues?: Omit<LayoutIssue, 'frame'>[]};
    return (payload.issues ?? []).map(issue => ({frame: Number(payload.frame ?? -1), ...issue}));
  } catch (error) {
    throw new Error(`invalid layout-guard browser log: ${error instanceof Error ? error.message : String(error)}`);
  }
};
/** Frame number from the guard's per-frame `[kit-layout-ok]` heartbeat, or null for any other log line. */
export const guardHeartbeat = (text: string): number | null => {
  if (!text.startsWith('[kit-layout-ok]')) return null;
  const frame = Number((JSON.parse(text.slice('[kit-layout-ok]'.length)) as {frame?: number}).frame);
  return Number.isFinite(frame) ? frame : null;
};
const blockingLayoutIssues = (issues: LayoutIssue[]) => issues.filter(issue => issue.kind !== 'unsafe');
const formatLayoutIssues = (issues: LayoutIssue[]) => issues.slice(0, 12).map(issue =>
  `  - frame ${issue.frame}: ${issue.kind} ${issue.id}${issue.other ? ` x ${issue.other}` : ''}${issue.detail ? ` - ${issue.detail}` : ''}`,
).join('\n');

/** Gate: real audio, timing map, plan boundaries, images, and clips agree to one frame. */
export function ensureSync(ctx: PipelineContext, turns: PipelineTurn[], timing: Timing): void {
  const {episode, videoGen, work, audioDir} = ctx;
  const planPath = planPathFor(ctx);
  const imageManifestPath = imageManifestPathFor(ctx);
  const plan = readJson<DirectedPlan>(planPath);
  const issues: string[] = [];
  const registeredImageKeys = Object.keys(existsSync(imageManifestPath) ? readJson<Record<string, unknown>>(imageManifestPath) : {});
  for (const ref of planImageRefs(plan)) {
    if (!registeredImageKeys.includes(ref.path)) issues.push(`${ref.sceneId}: image is not registered: ${ref.path}`);
    else if (!existsSync(join(ctx.publicDir, ref.path))) issues.push(`${ref.sceneId}: image file is missing: public/${ref.path}`);
  }
  try {
    const normalized = normalizePlan(plan, turns, timing.starts, timing.durations, timing.totalSec, {
      imageKeys: registeredImageKeys,
      episode,
      allowCreativeClip: videoGen === 'ltx',
    });
    issues.push(...validateCanvas(normalized));
  } catch (error) {
    issues.push(`scene plan validation: ${error instanceof Error ? error.message : String(error)}`);
  }
  // Check the stored times too. normalizePlan proves that the turn grouping can
  // produce a valid timeline; this catches stale/manual startSec/endSec edits.
  issues.push(...syncIssues(plan, turns, timing.starts, timing.durations, timing.totalSec, timing.fps));
  for (let i = 0; i < turns.length; i++) if (turns[i].kind === 'speech') {
    const actual = ffprobeDuration(join(audioDir, `${turns[i].id}.mp3`));
    if (Math.abs(actual - timing.durations[i]) > 1 / timing.fps) issues.push(`${turns[i].id}: timing/audio drift ${(actual - timing.durations[i]).toFixed(3)}s`);
  }
  for (const scene of plan.scenes) if (scene.component === 'creative_clip') {
    const clip = join(ctx.publicDir, String(scene.props.clip));
    if (!existsSync(clip)) issues.push(`${scene.id}: creative clip missing`);
    else {
      const required = (scene.endSec ?? 0) - (scene.startSec ?? 0);
      const actual = ffprobeDuration(clip);
      if (actual < required - 1 / timing.fps) issues.push(`${scene.id}: creative clip is ${(required - actual).toFixed(3)}s short`);
    }
  }
  const report = {episode, fps: timing.fps, totalSec: timing.totalSec, toleranceSec: 1 / timing.fps, issues};
  atomicJson(join(work, 'sync_report.json'), report);
  if (issues.length) throw new Error(`audio/scene sync gate failed:\n${issues.map(x => `  - ${x}`).join('\n')}`);
  console.log(`[sync] ${turns.length} turns and ${plan.scenes.length} scenes aligned within one frame`);
}

/** Contact sheet stills or segmented full render of DirectedEpisode. */
export async function remotion(ctx: PipelineContext, turns: PipelineTurn[], timing: Timing, stage: 'contact' | 'render') {
  const {episode, force, work, audioDir} = ctx;
  const planPath = planPathFor(ctx);
  if (!existsSync(planPath)) throw new Error(`missing ${planPath}; run direct stage`);
  const plan = readJson<DirectedPlan>(planPath);
  const words = existsSync(wordsPathFor(ctx)) ? readJson<Record<string, {w: string; s: number; e: number}[]>>(wordsPathFor(ctx)) : {};
  const levels = existsSync(levelsPathFor(ctx)) ? readJson<Record<string, number[]>>(levelsPathFor(ctx)) : {};
  const inputProps = {episode, plan, turns, timing, words, levels};
  const serveUrl = await bundle({entryPoint: join(ROOT, 'src/directed-index.tsx')});
  const browserExecutable = process.env.REMOTION_BROWSER ?? null;
  const composition = await selectComposition({serveUrl, id: 'DirectedEpisode', inputProps, browserExecutable, logLevel: 'error'});
  // Includes the guard implementation/config as well as visual components, so
  // a guard change invalidates cached stills and segments and forces re-checking.
  const sourceHash = treeHash(join(ROOT, 'src'));
  const env: RenderEnv = {sourceHash, fps: composition.fps, width: composition.width, height: composition.height};
  if (stage === 'render') {
    const output = join(ctx.outDir, `${episode}.mp4`);
    const segmentsDir = join(work, 'segments');
    mkdirSync(segmentsDir, {recursive: true});
    const cachePath = join(work, 'render-cache.json');
    const cache = existsSync(cachePath) ? readJson<Record<string, {fingerprint: string; file: string}>>(cachePath) : {};
    const nextCache: Record<string, {fingerprint: string; file: string}> = {};
    const layoutReportPath = join(work, 'render-layout.json');
    const renderLayoutIssues: LayoutIssue[] = [];
    const boundaries = [0, ...plan.scenes.map((scene, index) => index === plan.scenes.length - 1
      ? composition.durationInFrames
      : Math.round((scene.endSec ?? 0) * composition.fps))];
    const segmentFiles: string[] = [];
    let rendered = 0;
    let reused = 0;
    for (let i = 0; i < plan.scenes.length; i++) {
      const scene = plan.scenes[i];
      const from = boundaries[i];
      const to = boundaries[i + 1] - 1;
      if (to < from) throw new Error(`${scene.id}: empty render range ${from}-${to}`);
      // Segments are silent video; narration is mixed once at assembly, so audio edits never re-render pixels.
      const fingerprint = segmentFingerprint(plan, i, {from, to}, env, ctx.publicDir);
      const file = join(segmentsDir, `${String(i).padStart(4, '0')}-${scene.id}.mp4`);
      nextCache[scene.id] = {fingerprint, file};
      segmentFiles.push(file);
      if (!force && existsSync(file) && cache[scene.id]?.fingerprint === fingerprint && cache[scene.id]?.file === file) {
        reused++;
        console.log(`[render] ${scene.id}: segment current`);
        continue;
      }
      const sceneLayoutIssues: LayoutIssue[] = [];
      const measured = new Set<number>();
      await renderMedia({
        composition, serveUrl, codec: 'h264', outputLocation: file, inputProps, muted: true,
        browserExecutable, logLevel: 'error', frameRange: [from, to],
        onBrowserLog: log => {
          const beat = guardHeartbeat(log.text);
          if (beat !== null) measured.add(beat);
          else sceneLayoutIssues.push(...layoutIssuesFromLog(log.text));
        },
      });
      // A guard that never reported is a failure, not a clean pass.
      if (measured.size < to - from + 1) {
        if (existsSync(file)) unlinkSync(file);
        throw new Error(`${scene.id}: layout guard measured ${measured.size} of ${to - from + 1} frames; refusing an unchecked segment`);
      }
      renderLayoutIssues.push(...sceneLayoutIssues);
      atomicJson(layoutReportPath, {episode, checkedAt: new Date().toISOString(), issues: renderLayoutIssues});
      const blocking = blockingLayoutIssues(sceneLayoutIssues);
      if (blocking.length) {
        if (existsSync(file)) unlinkSync(file);
        throw new Error(`layout guard failed while rendering ${scene.id}:\n${formatLayoutIssues(blocking)}\nFull report: ${layoutReportPath}`);
      }
      rendered++;
      atomicJson(cachePath, nextCache);
      console.log(`[render] ${scene.id}: frames ${from}-${to}`);
    }
    for (const file of readdirSync(segmentsDir).filter(name => name.endsWith('.mp4'))) {
      const full = join(segmentsDir, file);
      if (!segmentFiles.includes(full)) unlinkSync(full);
    }
    atomicJson(layoutReportPath, {episode, checkedAt: new Date().toISOString(), issues: renderLayoutIssues});
    atomicJson(cachePath, nextCache);
    const narration = join(work, 'narration.m4a');
    buildNarrationTrack(turns, timing, audioDir, narration);
    assembleEpisode(segmentFiles, narration, output, work, timing.totalSec, timing.fps);
    console.log(`[render] ${rendered} scene segment(s) rendered, ${reused} reused; assembled -> ${output}`); return;
  }
  const stillDir = join(work, 'stills'); mkdirSync(stillDir, {recursive: true});
  const cachePath = join(work, 'contact-cache.json');
  interface ContactCacheEntry {fingerprint: string; issues: LayoutIssue[]}
  const cache = existsSync(cachePath) ? readJson<Record<string, ContactCacheEntry>>(cachePath) : {};
  const nextCache: Record<string, ContactCacheEntry> = {};
  const contactLayoutIssues: LayoutIssue[] = [];
  const scenes = plan.scenes;
  const turnIndex = new Map(turns.map((turn, index) => [turn.id, index]));
  const samples = scenes.flatMap((scene, sceneIndex) => {
    const candidates = [
      {label: 'mid', sec: ((scene.startSec ?? 0) + (scene.endSec ?? 0)) / 2},
      ...scene.turnIds.map(turnId => {
        const index = turnIndex.get(turnId)!;
        return {label: turnId, sec: timing.starts[index] + Math.min(0.5, timing.durations[index] / 2)};
      }),
    ];
    const byFrame = new Map<number, {label: string; sec: number}>();
    for (const sample of candidates) byFrame.set(Math.min(composition.durationInFrames - 1, Math.max(0, Math.round(sample.sec * composition.fps))), sample);
    return [...byFrame.entries()].map(([frame, sample]) => ({...sample, frame, scene, sceneIndex}));
  });
  const stillFiles: string[] = [];
  for (let i = 0; i < samples.length; i++) {
    const {scene, sceneIndex, frame, label} = samples[i];
    const fingerprint = stillFingerprint(plan, sceneIndex, {label, frame}, env, ctx.publicDir);
    // Named by content: a cache hit can never be a still rendered for a different scene or slot.
    const key = stillFileName(fingerprint);
    const output = join(stillDir, key);
    stillFiles.push(output);
    const cached = cache[key];
    if (!force && existsSync(output) && cached?.fingerprint === fingerprint && Array.isArray(cached.issues)) {
      nextCache[key] = cached;
      contactLayoutIssues.push(...cached.issues);
      console.log(`[contact] ${scene.id}/${label}: still current`);
      continue;
    }
    const sceneIssues: LayoutIssue[] = [];
    let measured = false;
    await renderStill({
      composition, serveUrl, frame, output, scale: 0.3, inputProps, browserExecutable, logLevel: 'error',
      onBrowserLog: log => {
        if (guardHeartbeat(log.text) !== null) measured = true;
        else sceneIssues.push(...layoutIssuesFromLog(log.text));
      },
    });
    if (!measured) throw new Error(`${scene.id}/${label}: layout guard did not measure frame ${frame}; refusing an unchecked contact sheet`);
    nextCache[key] = {fingerprint, issues: sceneIssues};
    contactLayoutIssues.push(...sceneIssues);
  }
  for (const file of readdirSync(stillDir)) if (!stillFiles.includes(join(stillDir, file))) rmSync(join(stillDir, file), {recursive: true, force: true});
  // ffmpeg's tile filter reads a numbered sequence; stage the current stills in sheet order.
  const sheetDir = join(work, 'sheet-frames');
  rmSync(sheetDir, {recursive: true, force: true}); mkdirSync(sheetDir, {recursive: true});
  stillFiles.forEach((file, i) => copyFileSync(file, join(sheetDir, `${String(i).padStart(4, '0')}.png`)));
  atomicJson(cachePath, nextCache);
  const layoutReportPath = join(ctx.outDir, `${episode}-layout.json`);
  atomicJson(layoutReportPath, {episode, checkedAt: new Date().toISOString(), issues: contactLayoutIssues});
  const sheet = join(ctx.outDir, `${episode}-contact.png`); rmSync(sheet, {force: true});
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(sheetDir, '%04d.png'), '-vf', `tile=5x${Math.ceil(samples.length / 5)}:padding=4:color=black`, '-frames:v', '1', sheet]);
  writeFileSync(sheet.replace(/\.png$/, '.txt'), samples.map((sample, i) => `${String(i).padStart(4, '0')} ${sample.scene.id}/${sample.label} frame=${sample.frame} sec=${sample.sec.toFixed(2)} ${sample.scene.component}`).join('\n') + '\n');
  console.log(`[contact] ${samples.length} transition/mid-scene stills across ${scenes.length} scenes -> ${sheet}`);
  const blocking = blockingLayoutIssues(contactLayoutIssues);
  if (blocking.length) throw new Error(`contact sheet layout guard failed with ${blocking.length} issue(s):\n${formatLayoutIssues(blocking)}\nFull report: ${layoutReportPath}`);
  console.log(`[layout-guard] contact samples clean${contactLayoutIssues.length ? ` (${contactLayoutIssues.length} safe-area warning(s))` : ''}`);
}

