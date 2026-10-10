/**
 * Documentary stages (docs/LOOK.md): direct (script -> shots.json), clips (LTX hero clips), contact (stills + layout
 * guard), render (segmented, cached video + one full audio mix, assembled). Used by video-pipeline.ts and the
 * standalone doc-direct / doc-clips / doc-render tools, so there is one implementation.
 */
import {predictLayout} from '../layout-precheck';
import {execFileSync, spawnSync} from 'node:child_process';
import {cpus} from 'node:os';
import {existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {ROOT, ffprobeDuration} from '../../lib';
import {atomicJson, readJson, sha256} from '../../pipeline-core';
import type {DocShot} from '../../../src/documentary/types';
import {DOC_CROSSFADE_FRAMES, soundCues} from '../../../src/documentary/DocEpisode';
import {assembleEpisode} from '../assemble';
import {CLIP_SIZE, DESKTOP_SETTINGS, PAINTING_NEGATIVE, aspectCrop, ltxBackend} from '../clip-fingerprint';
import {treeHash} from '../context';
import {DESKTOP_CLIENT, GENERATOR, clipsDirFor, loadDocInputs, resolveDocPlan, type ClipManifest, type DocInputs} from '../doc-inputs';
import {blockingLayoutIssues, formatLayoutIssues, guardHeartbeat, layoutIssuesFromLog, type LayoutIssue} from '../guard-logs';
import type {ResolvedShotPlan} from '../shots';
import {findTool} from '../tools';

export const shotsPathFor = (episode: string) => join(ROOT, 'data', episode, 'shots.json');
const sha = (path: string) => (existsSync(path) ? sha256(readFileSync(path)) : 'missing');

/* ---------------------------------------- clips ---------------------------------------- */

/** Generate the LTX hero clips a resolved plan asks for (content-keyed; existing clips are reused). */
export function generateClips(episode: string, resolved: ResolvedShotPlan, opts: {force?: boolean; dryRun?: boolean} = {}): number {
  const jobs = resolved.shots.flatMap(s => (s.type === 'clip' ? [s] : []));
  const outDir = clipsDirFor(episode);
  const manifestPath = join(outDir, 'clips.json');
  const manifest: ClipManifest = existsSync(manifestPath) ? readJson<ClipManifest>(manifestPath) : {};
  const todo = jobs.filter(s => opts.force || !manifest[s.fingerprint] || !existsSync(join(ROOT, 'public', manifest[s.fingerprint].path)));
  console.log(`[clips] ${jobs.length} clip shot(s), ${jobs.length - todo.length} current, ${todo.length} to generate (${ltxBackend()})`);
  if (!todo.length) return 0;
  mkdirSync(outDir, {recursive: true});
  const backend = ltxBackend();
  const python = opts.dryRun ? 'python' : findTool(['python3', 'python', 'py'], 'LTX_PYTHON');
  if (backend === 'desktop' && !opts.dryRun) {
    const check = spawnSync(python, [DESKTOP_CLIENT, '--check'], {cwd: ROOT, stdio: 'inherit'});
    if (check.status !== 0) throw new Error('LTX Desktop is not reachable: start the app, or set LTX_BACKEND=diffusers');
  }
  for (const shot of todo) {
    const raw = join(outDir, `${shot.fingerprint}.mp4`);
    let args: string[];
    if (backend === 'desktop') {
      // Crop to 16:9 around the focus first, so the app can never stretch the painting.
      const input = join(outDir, `${shot.fingerprint}.input.jpg`);
      const c = aspectCrop(shot.size, CLIP_SIZE.width / CLIP_SIZE.height, shot.focus);
      if (!opts.dryRun) execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(ROOT, 'public', shot.image), '-vf', `crop=${c.w}:${c.h}:${c.x}:${c.y}`, '-q:v', '2', input]);
      args = [DESKTOP_CLIENT, '--image', input, '--prompt', shot.prompt, '--out', raw, '--seed', String(shot.seed), '--duration', String(DESKTOP_SETTINGS.duration),
        '--model', DESKTOP_SETTINGS.model, '--resolution', DESKTOP_SETTINGS.resolution, '--fps', String(DESKTOP_SETTINGS.fps),
        '--camera-motion', DESKTOP_SETTINGS.cameraMotion, '--negative', PAINTING_NEGATIVE];
    } else {
      args = [GENERATOR, '--image', join(ROOT, 'public', shot.image), '--prompt', shot.prompt, '--out', raw, '--duration', '6',
        '--seed', String(shot.seed), '--width', String(CLIP_SIZE.width), '--height', String(CLIP_SIZE.height), '--focus', `${shot.focus[0]},${shot.focus[1]}`];
    }
    if (opts.dryRun) { console.log(`[clips] ${shot.id}: would run (${backend}) ${python} ${args.map(a => (a.includes(' ') ? JSON.stringify(a) : a)).join(' ')}`); continue; }
    console.log(`[clips] ${shot.id}: generating with LTX ${backend} (${shot.image})`);
    const result = spawnSync(python, args, {cwd: ROOT, stdio: 'inherit'});
    if (result.status !== 0) throw new Error(`${shot.id}: LTX generation failed with exit ${result.status}`);
    // Forward then reversed: loops without a jump, and doubles usable length for longer shots.
    const boomerang = join(outDir, `${shot.fingerprint}.boomerang.mp4`);
    const temp = `${boomerang}.tmp.mp4`;
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-filter_complex', '[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[out]',
      '-map', '[out]', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-movflags', '+faststart', temp]);
    if (existsSync(boomerang)) unlinkSync(boomerang);
    renameSync(temp, boomerang);
    const durationSec = ffprobeDuration(boomerang);
    manifest[shot.fingerprint] = {path: `clips/${episode}/${shot.fingerprint}.boomerang.mp4`, durationSec, prompt: shot.prompt, image: shot.image, seed: shot.seed, createdAt: new Date().toISOString()};
    atomicJson(manifestPath, manifest);
    console.log(`[clips] ${shot.id}: ${durationSec.toFixed(2)}s boomerang`);
  }
  return todo.length;
}

/* ------------------------------------ sync gate ------------------------------------ */

/** The plan resolves against the real audio and words; audio files match the timing map to one frame. */
export function docResolve(episode: string, draft: boolean, allowEstimated = false, planPath = shotsPathFor(episode)): {inputs: DocInputs; resolved: ResolvedShotPlan} {
  if (!existsSync(planPath)) throw new Error(`missing ${relative(ROOT, planPath)}; run the direct stage`);
  const inputs = loadDocInputs(episode, planPath, draft);
  if (inputs.estimated && !allowEstimated) throw new Error(`missing Vosk word timing for ${episode}; run the words stage`);
  inputs.options.allowEstimated = allowEstimated && inputs.estimated;
  return {inputs, resolved: resolveDocPlan(inputs)};
}

export function docSyncIssues(episode: string, inputs: DocInputs, fps = 30): string[] {
  const issues: string[] = [];
  inputs.turns.forEach((turn, i) => {
    if (turn.kind !== 'speech') return;
    const file = join(ROOT, 'public', 'audio', episode, `${turn.id}.mp3`);
    if (!existsSync(file)) { issues.push(`${turn.id}: audio missing`); return; }
    const actual = ffprobeDuration(file);
    if (Math.abs(actual - inputs.timing.durations[i]) > 1 / fps) issues.push(`${turn.id}: timing/audio drift ${(actual - inputs.timing.durations[i]).toFixed(3)}s`);
  });
  return issues;
}

/* --------------------------------- contact + render --------------------------------- */

/** Group shots into render segments of ~minSec at shot boundaries (each segment re-renders independently). */
export function planSegments(shots: DocShot[], totalSec: number, minSec = 20): {startSec: number; endSec: number; shots: number[]}[] {
  const segments: {startSec: number; endSec: number; shots: number[]}[] = [];
  let current: {startSec: number; endSec: number; shots: number[]} | null = null;
  shots.forEach((shot, i) => {
    if (!current) current = {startSec: shot.startSec, endSec: shot.endSec, shots: []};
    current.shots.push(i);
    current.endSec = shot.endSec;
    if (current.endSec - current.startSec >= minSec) { segments.push(current); current = null; }
  });
  if (current) segments.push(current);
  if (segments.length) { segments[0].startSec = 0; segments[segments.length - 1].endSec = totalSec; }
  return segments;
}

/** Everything that changes a segment's pixels: its shots, the next shot (crossfades lead into the segment), assets, sheet, years. */
export function segmentKey(resolved: ResolvedShotPlan, segment: {startSec: number; endSec: number; shots: number[]}, env: Record<string, unknown>, assetSha: (path: string) => string): string {
  const next = resolved.shots[segment.shots[segment.shots.length - 1] + 1];
  const shots = [...segment.shots.map(i => resolved.shots[i]), ...(next ? [next] : [])];
  const assets = shots.flatMap(s => [('image' in s ? s.image : s.type === 'point' ? s.backdrop : null), ('depth' in s ? s.depth : null), (s.type === 'clip' ? s.clip?.path : null)])
    .filter((p): p is string => !!p).map(p => [p, assetSha(p)]);
  const years = resolved.years.filter(y => y.sec < segment.endSec && y.sec + 5 > segment.startSec);
  return sha256(JSON.stringify({v: 1, segment: [segment.startSec, segment.endSec], shots, assets, years, boxes: resolved.boxes, env}));
}

interface DocRenderContext {episode: string; work: string; outDir: string; publicDir: string; force: boolean}

/**
 * Speed: one Chrome for the whole stage (not one per still or segment), frames rendered in parallel tabs, and the GPU
 * where it helps. Windows defaults: Chrome draws with the GPU (ANGLE) and H.264 is encoded on an NVIDIA GPU (NVENC).
 *   RENDER_CONCURRENCY=8      parallel frames / stills (default: half the CPU cores)
 *   REMOTION_GL=off|angle|... Chrome's GL backend (default angle on Windows, Remotion's default elsewhere)
 *   RENDER_HW=0               software H.264 encoding instead of NVENC / VideoToolbox
 */
function renderTuning() {
  const concurrency = Math.max(1, Number(process.env.RENDER_CONCURRENCY) || Math.floor(cpus().length / 2));
  const glEnv = process.env.REMOTION_GL;
  const gl = glEnv === 'off' ? undefined : (glEnv || (process.platform === 'win32' ? 'angle' : undefined)) as 'angle' | 'egl' | 'swiftshader' | 'swangle' | 'vulkan' | 'angle-egl' | undefined;
  return {concurrency, chromiumOptions: gl ? {gl} : {}, hardwareAcceleration: (process.env.RENDER_HW === '0' ? 'disable' : 'if-possible') as 'disable' | 'if-possible'};
}

async function bundleDoc(inputs: DocInputs, resolved: ResolvedShotPlan) {
  const {bundle} = await import('@remotion/bundler');
  const {openBrowser, selectComposition} = await import('@remotion/renderer');
  const inputProps = {episode: inputs.episode, shots: resolved.shots, years: resolved.years, boxes: resolved.boxes, turns: inputs.turns, timing: inputs.timing};
  const browserExecutable = process.env.REMOTION_BROWSER ?? null;
  const tuning = renderTuning();
  console.log(`[render] bundling… (${tuning.concurrency} at a time${tuning.chromiumOptions.gl ? `, Chrome GL ${tuning.chromiumOptions.gl}` : ''}, encoder ${tuning.hardwareAcceleration === 'disable' ? 'software' : 'hardware if available'})`);
  const serveUrl = await bundle({entryPoint: join(ROOT, 'src/documentary-index.tsx')});
  const browser = await openBrowser('chrome', {browserExecutable, chromiumOptions: tuning.chromiumOptions, logLevel: 'error'});
  const composition = await selectComposition({serveUrl, id: 'DocEpisode', inputProps, browserExecutable, puppeteerInstance: browser, logLevel: 'error'});
  return {serveUrl, composition, inputProps, browserExecutable, browser, tuning};
}

/** Contact sheet: each shot just after its cut and near its end. Fails on layout problems or an unmeasured still. */
export async function docContactStage(ctx: DocRenderContext, inputs: DocInputs, resolved: ResolvedShotPlan, limitSec = Infinity): Promise<string> {
  const {renderStill} = await import('@remotion/renderer');
  const {serveUrl, composition, inputProps, browserExecutable, browser, tuning} = await bundleDoc(inputs, resolved);
  try {
    const fps = composition.fps;
    const lastFrame = Math.min(composition.durationInFrames - 1, Math.round(Math.min(resolved.endSec, limitSec) * fps) - 1);
    const stills = join(ctx.work, 'doc-stills');
    rmSync(stills, {recursive: true, force: true}); mkdirSync(stills, {recursive: true});
    const perShot = resolved.shots.flatMap(s => [
      {label: `${s.id} ${s.type} start`, frame: Math.round((s.startSec + 0.7) * fps)},
      {label: `${s.id} ${s.type} end`, frame: Math.round((s.endSec - 0.4) * fps)},
    ]);
    // Plus the frames the layout pre-check flags: predicted collisions and every moment something moves on screen
    // (year stamp slams, NOW entrances, sheet transitions), which two stills per shot would miss.
    const risky = predictLayout(resolved, fps).riskFrames.map(r => ({label: `risk: ${r.why}`, frame: r.frame}));
    const taken = new Set<number>();
    const samples = [...perShot, ...risky].filter(s => s.frame >= 0 && s.frame <= lastFrame && !taken.has(s.frame) && taken.add(s.frame)).sort((a, b) => a.frame - b.frame);
    const issues: LayoutIssue[] = [];
    // Stills in parallel tabs of the one browser.
    let next = 0;
    const unmeasured: string[] = [];
    const worker = async () => {
      for (let i = next++; i < samples.length; i = next++) {
        const sample = samples[i];
        let measured = false;
        await renderStill({composition, serveUrl, inputProps, browserExecutable, puppeteerInstance: browser, logLevel: 'error', scale: 0.35, frame: sample.frame,
          output: join(stills, `${String(i).padStart(4, '0')}.png`),
          onBrowserLog: log => { if (guardHeartbeat(log.text) !== null) measured = true; else issues.push(...layoutIssuesFromLog(log.text)); }});
        if (!measured) unmeasured.push(`${sample.label} (frame ${sample.frame})`);
      }
    };
    await Promise.all(Array.from({length: Math.min(tuning.concurrency, samples.length)}, worker));
    if (unmeasured.length) throw new Error(`layout guard did not measure ${unmeasured.length} still(s): ${unmeasured.slice(0, 5).join(', ')}`);
    const sheet = join(ctx.outDir, `${ctx.episode}-contact.png`);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(stills, '%04d.png'), '-vf', `tile=4x${Math.ceil(samples.length / 4)}:padding=6:color=black`, '-frames:v', '1', sheet]);
    writeFileSync(sheet.replace(/\.png$/, '.txt'), samples.map((s, i) => `${String(i).padStart(4, '0')} ${s.label} frame=${s.frame}`).join('\n') + '\n');
    atomicJson(join(ctx.outDir, `${ctx.episode}-layout.json`), {episode: ctx.episode, checkedAt: new Date().toISOString(), issues});
    console.log(`[contact] ${samples.length} stills -> ${relative(ROOT, sheet)}; ${issues.length} layout issue(s)`);
    const blocking = blockingLayoutIssues(issues);
    if (blocking.length) throw new Error(`contact sheet layout guard failed:\n${formatLayoutIssues(blocking)}`);
    return sheet;
  } finally {
    await browser.close({silent: true});
  }
}

/** Segmented, cached video render + one full audio mix (narration, music, sfx), assembled and verified. */
export async function docRenderStage(ctx: DocRenderContext, inputs: DocInputs, resolved: ResolvedShotPlan, limitSec = Infinity): Promise<string> {
  const {renderMedia} = await import('@remotion/renderer');
  const {serveUrl, composition, inputProps, browserExecutable, browser, tuning} = await bundleDoc(inputs, resolved);
  try {
    const fps = composition.fps;
    const totalSec = Math.min(inputs.timing.totalSec, limitSec);
    const preview = Number.isFinite(limitSec);
    // The encoder and GL backend are part of a segment's identity: segments are joined without re-encoding.
    const env = {sourceHash: treeHash(join(ROOT, 'src')), fps, width: composition.width, height: composition.height, encoder: tuning.hardwareAcceleration, gl: tuning.chromiumOptions.gl ?? null};
    const segDir = join(ctx.work, 'doc-segments');
    mkdirSync(segDir, {recursive: true});
    const cachePath = join(ctx.work, 'doc-render-cache.json');
    const cache = existsSync(cachePath) ? readJson<Record<string, string>>(cachePath) : {};
    const assetSha = (p: string) => sha(join(ctx.publicDir, p));
    const segments = planSegments(resolved.shots, inputs.timing.totalSec).filter(s => s.startSec < totalSec);
    const files: string[] = [];
    let rendered = 0;
    // Every segment is rendered and checked; problems are collected so one run reports all of them. Failed segments are
    // not cached, so after a fix only they render again.
    const failed: {segment: number; frames: [number, number]; issues: LayoutIssue[]; unmeasured?: number}[] = [];
    for (const [n, seg] of segments.entries()) {
      const from = Math.round(seg.startSec * fps);
      const to = Math.min(composition.durationInFrames, Math.round(Math.min(seg.endSec, totalSec) * fps)) - 1;
      const key = segmentKey(resolved, seg, {...env, to}, assetSha);
      const file = join(segDir, `${key.slice(0, 24)}.mp4`);
      files.push(file);
      if (!ctx.force && existsSync(file) && cache[file] === key) { console.log(`[render] segment ${n + 1}/${segments.length}: current`); continue; }
      const measured = new Set<number>();
      const issues: LayoutIssue[] = [];
      await renderMedia({composition, serveUrl, codec: 'h264', outputLocation: file, inputProps, browserExecutable, puppeteerInstance: browser, concurrency: tuning.concurrency,
        hardwareAcceleration: tuning.hardwareAcceleration, logLevel: 'error', frameRange: [from, to], muted: true,
        onBrowserLog: log => { const beat = guardHeartbeat(log.text); if (beat !== null) measured.add(beat); else issues.push(...layoutIssuesFromLog(log.text)); }});
      const blocking = blockingLayoutIssues(issues);
      if (blocking.length || measured.size < to - from + 1) {
        unlinkSync(file);
        failed.push({segment: n + 1, frames: [from, to], issues: blocking, ...(blocking.length ? {} : {unmeasured: to - from + 1 - measured.size})});
        console.log(`[render] segment ${n + 1}/${segments.length}: frames ${from}-${to} FAILED (${blocking.length ? `${blocking.length} layout issue(s)` : `${to - from + 1 - measured.size} frame(s) not measured`}); continuing`);
        continue;
      }
      cache[file] = key;
      atomicJson(cachePath, cache);
      rendered++;
      console.log(`[render] segment ${n + 1}/${segments.length}: frames ${from}-${to}`);
    }
    if (failed.length) {
      const report = join(ctx.outDir, `${ctx.episode}-render-layout.json`);
      atomicJson(report, {episode: ctx.episode, checkedAt: new Date().toISOString(), failed});
      throw new Error(`render: ${failed.length} of ${segments.length} segment(s) failed the layout guard (all listed in ${relative(ROOT, report)}); the others are saved:\n${failed.map(f =>
        f.issues.length ? `segment ${f.segment} (frames ${f.frames[0]}-${f.frames[1]}):\n${formatLayoutIssues(f.issues)}` : `segment ${f.segment}: ${f.unmeasured} frame(s) not measured by the guard`).join('\n')}`);
    }
    for (const name of readdirSync(segDir)) if (!files.includes(join(segDir, name))) unlinkSync(join(segDir, name));
    // One audio pass for the whole episode: narration, ducked music and sound cues, exactly as the composition mixes them.
    const audioKey = sha256(JSON.stringify({turns: inputs.turns.map(t => [t.id, sha(join(ctx.publicDir, 'audio', ctx.episode, `${t.id}.mp3`))]), timing: inputs.timing, cues: soundCues(resolved), boxes: resolved.boxes, src: env.sourceHash, crossfade: DOC_CROSSFADE_FRAMES}));
    const audio = join(ctx.work, `doc-audio.${audioKey.slice(0, 16)}.m4a`);
    if (ctx.force || !existsSync(audio)) {
      console.log('[render] mixing audio');
      await renderMedia({composition, serveUrl, codec: 'aac', outputLocation: audio, inputProps, browserExecutable, puppeteerInstance: browser, concurrency: tuning.concurrency, logLevel: 'error'});
    }
    const output = join(ctx.outDir, preview ? `${ctx.episode}-preview.mp4` : `${ctx.episode}.mp4`);
    assembleEpisode(files, audio, output, ctx.work, totalSec, fps);
    console.log(`[render] ${rendered} segment(s) rendered, ${segments.length - rendered} reused -> ${relative(ROOT, output)}`);
    return output;
  } finally {
    await browser.close({silent: true});
  }
}
