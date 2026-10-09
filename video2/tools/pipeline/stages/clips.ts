import {existsSync, mkdirSync, readFileSync, unlinkSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {ROOT, ffprobeDuration} from '../../lib';
import {atomicJson, readJson, sha256, type DirectedPlan} from '../../pipeline-core';
import type {PipelineContext, Timing} from '../context';
import {planPathFor} from './direct';
import {findTool} from '../tools';

/** Generate (or require, with --video-gen none) one LTX clip per creative_clip scene. */
export function clipsStage(ctx: PipelineContext, timing: Timing): void {
  const {videoGen, dryRun, force, work, stages, current, mark, run} = ctx;
  const planPath = planPathFor(ctx);
  const clipsHash = existsSync(planPath) ? sha256(`${readFileSync(planPath)}:${videoGen}`) : '';
  if (stages.includes('clips')) {
    if (!existsSync(planPath)) {
      if (dryRun) console.log('[clips] dry-run');
      else throw new Error(`missing ${planPath}; run direct stage`);
    } else {
      const plan = readJson<DirectedPlan>(planPath);
      const jobs = plan.scenes.filter(scene => scene.component === 'creative_clip');
      const clipCachePath = join(work, 'clips-cache.json');
      const clipCache = existsSync(clipCachePath) ? readJson<Record<string, {fingerprint: string; output: string}>>(clipCachePath) : {};
      if (!jobs.length) console.log('[clips] no creative_clip scenes');
      else if (videoGen === 'none') {
        const missing = jobs.filter(scene => !existsSync(join(ctx.publicDir, String(scene.props.clip))));
        if (missing.length) throw new Error(`creative clips missing with --video-gen none: ${missing.map(s => s.id).join(', ')}`);
      } else if (current('clips', clipsHash) && jobs.every(scene => existsSync(join(ctx.publicDir, String(scene.props.clip))))) console.log('[clips] checkpoint current');
      else if (dryRun) console.log(`[clips] dry-run: ${jobs.length} LTX job(s)`);
      else {
        const python = findTool(['python3', 'python'], process.env.LTX_PYTHON ? 'LTX_PYTHON' : 'FISH_PYTHON');
        const generator = process.env.LTX_SCRIPT ?? join(ROOT, 'tools', 'animate_still.py');
        if (!existsSync(generator)) throw new Error(`LTX generator missing: ${generator}`);
        for (const scene of jobs) {
          const image = join(ctx.publicDir, String(scene.props.image));
          if (!existsSync(image)) throw new Error(`${scene.id}: LTX base image missing: ${image}`);
          const output = join(ctx.publicDir, String(scene.props.clip));
          const seconds = (scene.endSec ?? 0) - (scene.startSec ?? 0);
          const fingerprint = sha256(JSON.stringify({
            prompt: scene.props.prompt, seed: scene.props.seed ?? 42, seconds,
            image: sha256(readFileSync(image)), generator: sha256(readFileSync(generator)),
          }));
          if (!force && existsSync(output) && clipCache[scene.id]?.fingerprint === fingerprint) {
            console.log(`[clips] ${scene.id}: fingerprint current`);
            continue;
          }
          const generatedSeconds = Math.max(3, Math.min(6, seconds));
          const temp = join(work, `.${scene.id}.ltx-source.mp4`);
          mkdirSync(dirname(output), {recursive: true});
          run(python, [generator, '--image', image, '--prompt', String(scene.props.prompt), '--out', temp, '--duration', String(generatedSeconds), '--seed', String(scene.props.seed ?? 42)]);
          run('ffmpeg', ['-y', '-v', 'error', '-stream_loop', '-1', '-i', temp, '-t', seconds.toFixed(3), '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output]);
          if (existsSync(temp)) unlinkSync(temp);
          const actual = ffprobeDuration(output);
          if (actual < seconds - 1 / timing.fps) throw new Error(`${scene.id}: clip ${actual.toFixed(3)}s is shorter than scene ${seconds.toFixed(3)}s`);
          clipCache[scene.id] = {fingerprint, output: String(scene.props.clip)};
          atomicJson(clipCachePath, clipCache);
          console.log(`[clips] ${scene.id}: ${actual.toFixed(2)}s -> ${output}`);
        }
        for (const id of Object.keys(clipCache)) if (!jobs.some(scene => scene.id === id)) delete clipCache[id];
        atomicJson(clipCachePath, clipCache);
        mark('clips', clipsHash);
      }
    }
  }
}
