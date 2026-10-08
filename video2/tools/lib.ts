/** Shared IO for the CLI tools. All paths are relative to the project root. */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { RenderConfig } from '../src/kit/layout';
import type { FactRegistry, StyleRules } from '../src/kit/lint-script';
import type { Pronunciations } from '../src/kit/tts';
import type { EpisodeSpec, TimingFile, TurnsFile, WordTimesFile } from '../src/kit/types';
import type { Manifest } from '../src/kit/validate';
import { EPISODES } from '../src/episodes/registry';
import { compileEpisode } from '../src/kit/episode';
import type { TermsFile } from '../src/kit/derive';
import type { CompiledEpisode } from '../src/kit/types';

import { fileURLToPath } from 'node:url';
export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const PUBLIC = process.env.PUBLIC_DIR ?? join(ROOT, 'public');
export const MANIFEST_PATH = process.env.IMAGES_MANIFEST ?? join(ROOT, 'data/images.json');

export const readJson = <T>(p: string): T => JSON.parse(readFileSync(join(ROOT, p), 'utf8')) as T;
export const readJsonOr = <T>(p: string, fallback: T): T => (existsSync(join(ROOT, p)) ? readJson<T>(p) : fallback);
export const writeJson = (p: string, data: unknown) => writeFileSync(join(ROOT, p), JSON.stringify(data, null, 2) + '\n');

export const arg = (name: string, fallback?: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
export const flag = (name: string): boolean => process.argv.includes(`--${name}`);

export interface EpisodeContext {
  spec: EpisodeSpec;
  dataDir: string;
  config: RenderConfig;
  style: StyleRules;
  facts: FactRegistry;
  pron: Pronunciations;
  manifest: Manifest;
  scriptSrc: string;
  turns: () => TurnsFile;
  timing: () => TimingFile;
  wordTimes: () => WordTimesFile;
  terms: TermsFile;
  places: Record<string, [number, number]>;
  compile: () => CompiledEpisode;
}

export function loadEpisode(id = arg('episode', 'u1e3')!): EpisodeContext {
  const entry = EPISODES[id];
  if (!entry) throw new Error(`unknown episode "${id}" (known: ${Object.keys(EPISODES).join(', ')})`);
  const { spec, dataDir } = entry;
  return {
    spec,
    dataDir,
    config: readJson('data/render-config.json'),
    style: readJson('data/style-rules.json'),
    facts: readJson('data/fact-registry.json'),
    pron: readJson('data/pronunciations.json'),
    manifest: JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest,
    scriptSrc: readFileSync(join(ROOT, spec.script), 'utf8'),
    turns: () => readJson(`${dataDir}/turns.json`),
    timing: () => readJson(`${dataDir}/timing_map.json`),
    wordTimes: () => readJsonOr(`${dataDir}/word_times.json`, {}),
    terms: readJson('data/terms.json'),
    places: readJson<{ places: Record<string, [number, number]> }>('data/places.json').places,
    compile() {
      return compileEpisode(spec, {
        turns: this.turns(),
        timing: this.timing(),
        wordTimes: this.wordTimes(),
        config: this.config,
        terms: this.terms,
        facts: this.facts,
      });
    },
  };
}

export const audioPath = (episode: string, turnId: string) => join(PUBLIC, 'audio', episode, `${turnId}.mp3`);

export function ffprobeDuration(file: string): number {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
  return Number(out.trim());
}

export function listFiles(dir: string, exts: RegExp): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (exts.test(name)) out.push(relative(PUBLIC, p));
    }
  };
  walk(dir);
  return out;
}
