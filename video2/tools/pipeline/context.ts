/** Shared run context: CLI options, config, paths, stage checkpoints, and process/LLM helpers. */
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync} from 'node:fs';
import {basename, join, relative} from 'node:path';
import {ROOT, arg, flag} from '../lib';
import {PRONUNCIATIONS_PATH} from './speech';
import {PendingAnswers, agentIO, pendingPromptFile} from './director-io';
import {PIPELINE_STAGES, atomicJson, readJson, selectedStages, sha256, type PipelineMode, type PipelineStage} from '../pipeline-core';

export interface Config {
  timing: {gapSec: number; leadSec: number; tailSec: number};
  edge: {voices: Record<string, string>; rate: string; pitch: string};
  fish: {model: string; voices: Record<string, string>};
  meta: {timeoutSec: number; libDir?: string; cookieFile?: string; playwrightDirs?: string[]};
}
export interface Timing {starts: number[]; durations: number[]; totalSec: number; fps: number; ttsHash: Record<string, string>}
interface State {version: 1; episode: string; mode: PipelineMode; stages: Partial<Record<PipelineStage, {hash: string; completedAt: string}>>}

export interface PipelineContext {
  episode: string;
  mode: PipelineMode;
  dryRun: boolean;
  force: boolean;
  full: boolean;
  /** none = never run LTX; clip shots fall back to their still. */
  videoGen: 'ltx' | 'none';
  /** --agent: the director writes prompt files for external agents instead of calling Meta UI. */
  agent: boolean;
  /** Voice engine: --tts edge | say | fish. Default: edge in dev, fish in prod. `say` = macOS voices (offline previews). */
  tts: 'edge' | 'say' | 'fish';
  /** --estimate-words: no Vosk; phrase times estimated from their position in the line (previews, never final). */
  estimateWords: boolean;
  /** Images: download (catalogs + registry) or --images placeholder (copies of large local images; previews). */
  images: 'download' | 'placeholder';
  /** --editor: one LLM editor pass over each act's cut list after the build. */
  editor: boolean;
  /** Maximum simultaneous Meta UI act storyboard sessions (--director-workers, default 1). */
  directorWorkers: number;
  /** --draft: allow library geography that is not approved yet (samples; not for publishing). */
  draft: boolean;
  stages: PipelineStage[];
  cfg: Config;
  /** out/pipeline/<episode>: checkpoints, prompts, caches. */
  work: string;
  /** data/<episode>: turns, timing, words, plan, image registry. */
  dataDir: string;
  /** public/audio/<episode>: one mp3 per speech turn. */
  audioDir: string;
  ttsDir: string;
  /** public/: images, clips, audio served to Remotion. */
  publicDir: string;
  /** out/: final video, contact sheet, layout reports. */
  outDir: string;
  /** Shared pronunciation registry (src/data/pronunciations.json). */
  pronunciationsPath: string;
  /** True when the stage's last completed input hash matches and --force is off. */
  current(stage: PipelineStage, hash: string): boolean;
  mark(stage: PipelineStage, hash: string): void;
  run(file: string, args: string[], env?: NodeJS.ProcessEnv): void;
  /** Run one Meta UI prompt (optionally with a same-chat follow-up); returns the JSON output path. */
  meta(name: string, prompt: string, attachments?: string[], followupPrompt?: string): string;
  metaBatch(jobs: {name: string; prompt: string; attachments?: string[]; followupPrompt?: string; label: string}[]): string[];
}

export function createContext(): PipelineContext {
  const episode = (arg('episode') ?? '').toLowerCase();
  if (!episode) throw new Error('--episode is required');
  const mode = (arg('mode', 'dev') as PipelineMode);
  if (!['dev', 'prod'].includes(mode)) throw new Error('--mode must be dev or prod');
  const dryRun = flag('dry-run');
  const force = flag('force');
  const tts = (arg('tts') ?? (mode === 'prod' ? 'fish' : 'edge')) as PipelineContext['tts'];
  if (!['edge', 'say', 'fish'].includes(tts)) throw new Error('--tts must be edge, say or fish');
  if (mode === 'prod' && tts !== 'fish') throw new Error('--mode prod voices with Fish (--tts fish)');
  const images = (arg('images') ?? 'download') as PipelineContext['images'];
  if (!['download', 'placeholder'].includes(images)) throw new Error('--images must be download or placeholder');
  const videoGen = arg('video-gen', 'ltx')!;
  if (!['ltx', 'none'].includes(videoGen)) throw new Error('--video-gen must be ltx or none');
  const directorWorkers = Number(arg('director-workers', process.env.DIRECTOR_WORKERS ?? '1'));
  if (!Number.isInteger(directorWorkers) || directorWorkers < 1 || directorWorkers > 8) throw new Error('--director-workers must be an integer from 1 to 8');
  // --skip images,clips: leave stages out of a run (e.g. the overnight unit runner skips image research).
  const skip = (arg('skip') ?? '').split(',').map(x => x.trim()).filter(Boolean);
  for (const name of skip) if (!(PIPELINE_STAGES as string[]).includes(name)) throw new Error(`--skip: unknown stage ${name}`);
  const stages = selectedStages(arg('only'), arg('from'), flag('full')).filter(stage => !skip.includes(stage));
  const cfg = readJson<Config>(join(ROOT, 'data/pipeline.json'));
  const work = join(ROOT, 'out', 'pipeline', episode);
  const dataDir = join(ROOT, 'data', episode);
  const statePath = join(work, 'state.json');
  mkdirSync(work, {recursive: true});
  mkdirSync(dataDir, {recursive: true});
  let state: State = existsSync(statePath) ? readJson<State>(statePath) : {version: 1, episode, mode, stages: {}};

  const run = (file: string, args: string[], env?: NodeJS.ProcessEnv) => {
    const result = spawnSync(file, args, {cwd: ROOT, stdio: 'inherit', env: {...process.env, ...env}, shell: false});
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${basename(file)} failed with exit ${result.status}`);
  };
  const savePrompt = (name: string, text: string) => {
    const path = join(work, `${name}.prompt.md`);
    writeFileSync(path, text);
    return path;
  };
  const agent = flag('agent');
  type MetaJob = {name: string; prompt: string; attachments?: string[]; followupPrompt?: string; label?: string};
  const prepareMeta = ({name, prompt, attachments = [], followupPrompt}: MetaJob) => {
    // --agent: every LLM call becomes a prompt file for your own agents (one place, so no stage can bypass it). Steps
    // that make a single call stop here until its answer exists; the storyboard batches its acts itself.
    if (agent) {
      const dir = join(work, 'agent');
      const answer = agentIO(dir).meta(name, prompt, attachments, followupPrompt);
      if (answer) return {out: answer, ready: 'agent' as const, inputHash: '', hashPath: '', args: []};
      throw new PendingAnswers([relative(ROOT, pendingPromptFile(dir, name) ?? name)], 'the same command');
    }
    const out = join(work, `${name}.json`);
    const inputHash = sha256(JSON.stringify({prompt, followupPrompt, attachments: attachments.map(file => [file, existsSync(file) ? sha256(readFileSync(file)) : 'missing'])}));
    const hashPath = `${out}.input.sha256`;
    if (dryRun) {
      const promptPath = savePrompt(name, prompt);
      const reviewPath = followupPrompt ? savePrompt(`${name}.review`, followupPrompt) : null;
      console.log(`[${name}] dry-run: ${promptPath}${reviewPath ? ` + ${reviewPath}` : ''}`);
      return {out, ready: 'dry-run' as const, inputHash, hashPath, args: []};
    }
    if (!force && existsSync(out) && existsSync(hashPath) && readFileSync(hashPath, 'utf8').trim() === inputHash) {
      try {
        const cached = readJson<unknown>(out);
        if (!cached || typeof cached !== 'object' || Array.isArray(cached)) throw new Error('top-level value is not an object');
        console.log(`[${name}] prompt cache current`);
        return {out, ready: 'cache' as const, inputHash, hashPath, args: []};
      } catch (error) {
        console.warn(`[${name}] ignoring invalid prompt cache: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // A failed forced refresh must not leave the old input hash looking current.
    if (existsSync(hashPath)) unlinkSync(hashPath);
    const args = [join(ROOT, 'tools/meta-ui-runner.cjs'), '--prompt-file', savePrompt(name, prompt), '--out', out, '--timeout-sec', String(cfg.meta.timeoutSec)];
    if (cfg.meta.libDir) args.push('--lib-dir', cfg.meta.libDir);
    if (cfg.meta.cookieFile) args.push('--cookie', cfg.meta.cookieFile);
    for (const dir of cfg.meta.playwrightDirs ?? []) args.push('--playwright-dir', dir);
    if (followupPrompt) args.push('--followup-prompt-file', savePrompt(`${name}.review`, followupPrompt));
    for (const file of attachments) args.push('--attachment', file);
    return {out, ready: false as const, inputHash, hashPath, args};
  };
  const meta = (name: string, prompt: string, attachments: string[] = [], followupPrompt?: string) => {
    const job = prepareMeta({name, prompt, attachments, followupPrompt});
    if (job.ready) return job.out;
    run(process.execPath, job.args);
    writeFileSync(job.hashPath, `${job.inputHash}\n`);
    return job.out;
  };
  const metaBatch = (specs: {name: string; prompt: string; attachments?: string[]; followupPrompt?: string; label: string}[]): string[] => {
    if (agent) return specs.map(s => meta(s.name, s.prompt, s.attachments, s.followupPrompt));
    const jobs = specs.map(prepareMeta);
    const pending = jobs.map((job, i) => ({job, spec: specs[i]})).filter(x => !x.job.ready);
    for (const {job, spec} of jobs.map((job, i) => ({job, spec: specs[i]})).filter(x => x.job.ready)) {
      console.log(`[storyboard] ${spec.label} ${job.ready === 'cache' ? 'reused from prompt cache' : job.ready === 'dry-run' ? 'prompt prepared (dry-run)' : 'answer already supplied'}`);
    }
    if (!pending.length) return jobs.map(j => j.out);
    if (directorWorkers === 1) {
      for (const [n, {job, spec}] of pending.entries()) {
        console.log(`[storyboard] ${spec.label} generating; ${pending.length - n - 1} generation(s) remaining`);
        run(process.execPath, job.args);
        writeFileSync(job.hashPath, `${job.inputHash}\n`);
        console.log(`[storyboard] ${spec.label} generated + LLM-audited; ${pending.length - n - 1} generation(s) remaining`);
      }
      return jobs.map(j => j.out);
    }
    const token = `${process.pid}.${Date.now()}`;
    const manifest = join(work, `.meta-batch.${token}.json`);
    const resultPath = join(work, `.meta-batch.${token}.result.json`);
    atomicJson(manifest, pending.map(({job, spec}) => ({label: spec.label, args: job.args, cwd: ROOT})));
    let batchError: Error | undefined;
    try {
      const result = spawnSync(process.execPath, [join(ROOT, 'tools', 'meta-ui-batch-runner.cjs'), '--manifest', manifest, '--result', resultPath, '--workers', String(directorWorkers)], {cwd: ROOT, stdio: 'inherit', shell: false});
      if (result.error) throw result.error;
      const statuses = existsSync(resultPath) ? readJson<{code: number; error?: string}[]>(resultPath) : [];
      const failed: string[] = [];
      pending.forEach(({job, spec}, i) => {
        if (statuses[i]?.code === 0 && existsSync(job.out)) {
          try {
            const parsed = readJson<unknown>(job.out);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('top-level value is not an object');
            writeFileSync(job.hashPath, `${job.inputHash}\n`);
            return;
          } catch (error) { statuses[i] = {code: 1, error: error instanceof Error ? error.message : String(error)}; }
        }
        failed.push(`${spec.label}${statuses[i]?.error ? `: ${statuses[i].error}` : `: exit ${statuses[i]?.code ?? 'unknown'}`}`);
      });
      if (result.status !== 0 || failed.length) batchError = new Error(`Meta storyboard batch failed:\n  - ${failed.join('\n  - ')}`);
    } finally {
      for (const file of [manifest, resultPath]) if (existsSync(file)) unlinkSync(file);
    }
    if (batchError) throw batchError;
    return jobs.map(j => j.out);
  };

  return {
    episode, mode, dryRun, force, full: flag('full'), videoGen: videoGen as 'ltx' | 'none', agent, draft: flag('draft'),
    tts, estimateWords: flag('estimate-words'), images, editor: flag('editor'), directorWorkers, stages, cfg, work, dataDir,
    audioDir: join(ROOT, 'public', 'audio', episode),
    ttsDir: join(ROOT, 'tts', episode),
    publicDir: join(ROOT, 'public'),
    outDir: join(ROOT, 'out'),
    pronunciationsPath: PRONUNCIATIONS_PATH,
    current: (stage, hash) => !force && state.stages[stage]?.hash === hash,
    mark: (stage, hash) => {
      state = {...state, mode, stages: {...state.stages, [stage]: {hash, completedAt: new Date().toISOString()}}};
      atomicJson(statePath, state);
    },
    run,
    meta,
    metaBatch,
  };
}

/** Hash of every source file under dir that can change rendered output. */
export function treeHash(dir: string): string {
  const rows: [string, string][] = [];
  const walk = (current: string) => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(?:ts|tsx|json|css)$/i.test(name)) rows.push([path.slice(dir.length), sha256(readFileSync(path))]);
    }
  };
  walk(dir);
  return sha256(JSON.stringify(rows));
}
