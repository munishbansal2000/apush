/**
 * Offline pipeline harness: a PipelineContext rooted in a temp directory with a fake
 * process runner (TTS writes real tone mp3s via ffmpeg) and canned Meta UI responses.
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PIPELINE_STAGES, sha256, type PipelineStage} from '../../tools/pipeline-core';
import type {Config, PipelineContext} from '../../tools/pipeline/context';

export interface FakeRun {file: string; args: string[]}

export interface FakeOptions {
  episode?: string;
  mode?: 'dev' | 'prod';
  stages?: PipelineStage[];
  dryRun?: boolean;
  force?: boolean;
  videoGen?: 'ltx' | 'none';
  /** Meta UI responder: prompt name + text → JSON object. */
  meta?: (name: string, prompt: string, followupPrompt?: string) => unknown;
  /** Seconds of tone written for each fake TTS call (default: 0.05s per character, min 0.5s). */
  ttsSeconds?: (text: string) => number;
}

export const DEFAULT_CONFIG: Config = {
  timing: {gapSec: 0.18, leadSec: 0.25, tailSec: 0.6},
  edge: {voices: {maya: 'en-US-AriaNeural', marcus: 'en-US-GuyNeural', narrator: 'en-US-GuyNeural'}, rate: '+4%', pitch: '+0Hz'},
  fish: {model: 'test-model', voices: {maya: 'ref-maya', marcus: 'ref-marcus'}},
  meta: {timeoutSec: 5},
};

export function writeTone(path: string, seconds: number): void {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `sine=frequency=440:duration=${seconds}`, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', path]);
}

export function fakeContext(options: FakeOptions = {}) {
  // The fake runner intercepts TTS calls; point tool discovery at a file that always exists.
  process.env.EDGE_TTS ??= process.execPath;
  process.env.FISH_PYTHON ??= process.execPath;
  const root = mkdtempSync(join(tmpdir(), 'v2-pipeline-'));
  const episode = options.episode ?? 'u9e9';
  const dirs = {
    work: join(root, 'out', 'pipeline', episode),
    dataDir: join(root, 'data', episode),
    publicDir: join(root, 'public'),
    outDir: join(root, 'out'),
    ttsDir: join(root, 'tts', episode),
  };
  for (const dir of Object.values(dirs)) mkdirSync(dir, {recursive: true});
  const runs: FakeRun[] = [];
  const metaCalls: {name: string; prompt: string; followupPrompt?: string}[] = [];
  const state: Partial<Record<PipelineStage, string>> = {};
  const ttsSeconds = options.ttsSeconds ?? ((text: string) => Math.max(0.5, text.length * 0.05));
  const ctx: PipelineContext = {
    episode,
    mode: options.mode ?? 'dev',
    dryRun: options.dryRun ?? false,
    force: options.force ?? false,
    full: true,
    videoGen: options.videoGen ?? 'none',
    stages: options.stages ?? [...PIPELINE_STAGES],
    cfg: structuredClone(DEFAULT_CONFIG),
    ...dirs,
    audioDir: join(dirs.publicDir, 'audio', episode),
    pronunciationsPath: join(root, 'pronunciations.json'),
    current: (stage, hash) => !(options.force ?? false) && state[stage] === hash,
    mark: (stage, hash) => { state[stage] = hash; },
    run: (file, args) => {
      runs.push({file, args});
      const flagValue = (name: string) => args[args.indexOf(name) + 1];
      if (args.includes('--write-media')) writeTone(flagValue('--write-media'), ttsSeconds(flagValue('--text')));
      else if (args.includes('--reference-id')) writeTone(flagValue('--out'), ttsSeconds(flagValue('--text')));
    },
    meta: (name, prompt, _attachments, followupPrompt) => {
      metaCalls.push({name, prompt, followupPrompt});
      if (!options.meta) throw new Error(`unexpected Meta UI call: ${name}`);
      const out = join(dirs.work, `${name}.${sha256(prompt).slice(0, 8)}.json`);
      writeFileSync(out, JSON.stringify(options.meta(name, prompt, followupPrompt)));
      return out;
    },
  };
  return {ctx, root, runs, metaCalls, state, ttsCalls: () => runs.filter(r => r.args.includes('--write-media') || r.args.includes('--reference-id'))};
}
