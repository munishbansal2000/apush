/**
 * Vosk JSON (one file per turn, SetWords(True)) → data/<ep>/word_times.json.
 *   --dir vosk/u1e3      expects tNN.json with {"result":[{"word","start","end"}...]}
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WordTimesFile } from '../src/kit/types';
import { arg, loadEpisode, ROOT, writeJson } from './lib';

const ep = loadEpisode();
const dir = join(ROOT, arg('dir', `vosk/${ep.spec.id}`)!);
if (!existsSync(dir)) {
  console.error(`no Vosk output at ${dir}`);
  process.exit(1);
}
interface VoskWord { word: string; start: number; end: number }
const out: WordTimesFile = {};
for (const f of readdirSync(dir).filter(n => /^t\d+\.json$/.test(n))) {
  const data = JSON.parse(readFileSync(join(dir, f), 'utf8')) as { result?: VoskWord[] } | { result?: VoskWord[] }[];
  const results = (Array.isArray(data) ? data : [data]).flatMap(d => d.result ?? []);
  out[f.replace('.json', '')] = results.map(w => ({ w: w.word, s: w.start, e: w.end }));
}
const speech = ep.turns().turns.filter(t => t.kind === 'speech');
const missing = speech.filter(t => !out[t.id]).map(t => t.id);
writeJson(`${ep.dataDir}/word_times.json`, out);
console.log(`word_times.json: ${Object.keys(out).length} turns${missing.length ? `; missing ${missing.join(', ')}` : ''}`);
