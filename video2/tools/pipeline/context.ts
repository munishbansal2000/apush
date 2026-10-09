/** Shared run context: CLI options, config, paths, stage checkpoints, and process/LLM helpers. */
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync} from 'node:fs';
import {basename, join} from 'node:path';
import {ROOT, arg, flag} from '../lib';
import {PRONUNCIATIONS_PATH} from './speech';
import {atomicJson, readJson, selectedStages, sha256, type PipelineMode, type PipelineStage} from '../pipeline-core';

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
  videoGen: 'ltx' | 'none';
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
}

export function createContext(): PipelineContext {
  const episode = (arg('episode') ?? '').toLowerCase();
  if (!episode) throw new Error('--episode is required');
  const mode = (arg('mode', 'dev') as PipelineMode);
  if (!['dev', 'prod'].includes(mode)) throw new Error('--mode must be dev or prod');
  const dryRun = flag('dry-run');
  const force = flag('force');
  const videoGen = arg('video-gen', 'ltx')!;
  if (!['ltx', 'none'].includes(videoGen)) throw new Error('--video-gen must be ltx or none');
  const stages = selectedStages(arg('only'), arg('from'), flag('full'));
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
  const meta = (name: string, prompt: string, attachments: string[] = [], followupPrompt?: string) => {
    const out = join(work, `${name}.json`);
    const inputHash = sha256(JSON.stringify({prompt, followupPrompt, attachments: attachments.map(file => [file, existsSync(file) ? sha256(readFileSync(file)) : 'missing'])}));
    const hashPath = `${out}.input.sha256`;
    if (dryRun) {
      const promptPath = savePrompt(name, prompt);
      const reviewPath = followupPrompt ? savePrompt(`${name}.review`, followupPrompt) : null;
      console.log(`[${name}] dry-run: ${promptPath}${reviewPath ? ` + ${reviewPath}` : ''}`);
      return out;
    }
    if (!force && existsSync(out) && existsSync(hashPath) && readFileSync(hashPath, 'utf8').trim() === inputHash) {
      try {
        const cached = readJson<unknown>(out);
        if (!cached || typeof cached !== 'object' || Array.isArray(cached)) throw new Error('top-level value is not an object');
        console.log(`[${name}] prompt cache current`);
        return out;
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
    run(process.execPath, args);
    writeFileSync(hashPath, `${inputHash}\n`);
    return out;
  };

  return {
    episode, mode, dryRun, force, full: flag('full'), videoGen: videoGen as 'ltx' | 'none', stages, cfg, work, dataDir,
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
