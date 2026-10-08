/** script/*.md → data/<ep>/turns.json. The script is the only place turns are authored. */
import { parseScript } from '../src/kit/script';
import type { TurnsFile } from '../src/kit/types';
import { loadEpisode, writeJson } from './lib';

const ep = loadEpisode();
const parsed = parseScript(ep.scriptSrc, ep.style.speakers);
const errors = parsed.issues.filter(i => i.level === 'error');
if (errors.length) {
  for (const e of errors) console.error(`${e.code} ${e.where}: ${e.msg}`);
  process.exit(1);
}
const out: TurnsFile = { _generated: 'tools/build-turns.ts — do not edit', source: ep.spec.script, meta: parsed.meta, turns: parsed.turns };
writeJson(`${ep.dataDir}/turns.json`, out);
console.log(`turns.json: ${parsed.turns.length} turns (${parsed.turns.filter(t => t.kind === 'pause').length} pauses)`);
