/**
 * Fish Audio API keys for long runs: round-robin per lesson. Each lesson's audio uses one key, the next lesson the
 * next key; the position is saved in out/fish-keys-state.json, so the cycle continues across lessons and runs.
 *
 *   FISH_API_KEYS="key1,key2,key3"                 or
 *   FISH_API_KEYS_FILE=C:\\secrets\\fish-keys.txt     (one key per line, # comments; keep it out of git)
 *
 * The chosen key reaches FISH_TTS_SCRIPT as FISH_API_KEY (or the variable named in FISH_KEY_ENV). Keys are never
 * printed, only their last 4 characters. With no keys configured the script runs with its own key, as before.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {ROOT} from '../lib';

export function loadFishKeys(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.FISH_API_KEYS_FILE && !existsSync(env.FISH_API_KEYS_FILE)) throw new Error(`FISH_API_KEYS_FILE=${env.FISH_API_KEYS_FILE} does not exist`);
  const fromFile = env.FISH_API_KEYS_FILE ? readFileSync(env.FISH_API_KEYS_FILE, 'utf8') : '';
  return [...new Set(`${env.FISH_API_KEYS ?? ''}\n${fromFile}`.split(/[\n,]/).map(l => l.replace(/#.*/, '').trim()).filter(Boolean))];
}

/** The n-th key of the cycle (0-based). */
export const keyForRun = (keys: string[], n: number): string | undefined => (keys.length ? keys[n % keys.length] : undefined);

/** Picks this lesson's key (the next in the cycle) and advances the saved position once. */
export function lessonKeyEnv(keys: string[], statePath = join(ROOT, 'out', 'fish-keys-state.json'), keyEnv = process.env.FISH_KEY_ENV ?? 'FISH_API_KEY'): {env: NodeJS.ProcessEnv; tag?: string} {
  if (!keys.length) return {env: {}};
  let n = 0;
  try { n = existsSync(statePath) ? Number((JSON.parse(readFileSync(statePath, 'utf8')) as {next?: number}).next ?? 0) : 0; } catch { n = 0; }
  if (!Number.isFinite(n)) n = 0;
  const key = keyForRun(keys, n)!;
  mkdirSync(dirname(statePath), {recursive: true});
  writeFileSync(statePath, `${JSON.stringify({next: (n + 1) % keys.length})}\n`);
  return {env: {[keyEnv]: key}, tag: keyTag(key)};
}

export const keyTag = (key: string) => `…${key.slice(-4)}`;
