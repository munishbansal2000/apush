/**
 * Fish Audio API keys for long runs: the overnight runner gives each lesson the next key in turn (round-robin), so
 * usage spreads across keys instead of draining one.
 *
 *   FISH_API_KEYS="key1,key2,key3"                 or
 *   FISH_API_KEYS_FILE=C:\\secrets\\fish-keys.txt     (one key per line, # comments; keep it out of git)
 *
 * The chosen key reaches FISH_TTS_SCRIPT as FISH_API_KEY (or the variable named in FISH_KEY_ENV). Keys are never
 * printed, only their last 4 characters.
 */
import {existsSync, readFileSync} from 'node:fs';

export function loadFishKeys(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.FISH_API_KEYS_FILE && !existsSync(env.FISH_API_KEYS_FILE)) throw new Error(`FISH_API_KEYS_FILE=${env.FISH_API_KEYS_FILE} does not exist`);
  const fromFile = env.FISH_API_KEYS_FILE ? readFileSync(env.FISH_API_KEYS_FILE, 'utf8') : '';
  return [...new Set(`${env.FISH_API_KEYS ?? ''}\n${fromFile}`.split(/[\n,]/).map(l => l.replace(/#.*/, '').trim()).filter(Boolean))];
}

/** The key for the n-th lesson run of the night (0-based), cycling through the pool. */
export const keyForRun = (keys: string[], n: number): string | undefined => (keys.length ? keys[n % keys.length] : undefined);

export const keyTag = (key: string) => `…${key.slice(-4)}`;
