/**
 * Storyboard gate (src/motion/storyboard.ts): checks src/data/storyboards/<id>.json against
 * its narration JSON. Run before building a scene and before rendering.
 *   --id exchange-crossing   one storyboard (default: every file in src/data/storyboards)
 *   --json                   machine-readable output
 *   --timeline               also print the activity timeline and the still spans
 * Codes: SB001 no action · SB002 no hook in the first 5 s · SB003 > 4 s with nothing entering
 * or moving · SB004 same camera 3× in a row · SB005 unknown element · SB006 sentence/shot
 * mismatch · SB007 bad anchor/window · SB008 unknown camera · SB009 no "shows" (warn) ·
 * SB010 shot's elements idle during its sentence (warn) · SB011 unused element (warn).
 * Exit code 1 on any error.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkStoryboard, type Narration, type SbIssue, type Storyboard } from '../src/motion/storyboard';
import { arg, flag, readJson, ROOT } from './lib';

const dir = 'src/data/storyboards';
const one = arg('id');
const ids = one ? [one] : readdirSync(join(ROOT, dir)).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
const tty = process.stdout.isTTY;
const color = tty ? ({ error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[90m' } as const) : { error: '', warn: '', info: '' };
const reset = tty ? '\x1b[0m' : '';
const order: Record<SbIssue['level'], number> = { error: 0, warn: 1, info: 2 };
let failed = false;
const json: Record<string, unknown> = {};

for (const id of ids) {
  const sb = readJson<Storyboard>(`${dir}/${id}.json`);
  const narration = readJson<Narration>(sb.narration);
  const { issues, activity, still } = checkStoryboard(sb, narration);
  failed ||= issues.some(i => i.level === 'error');
  if (flag('json')) { json[id] = { issues, activity, still }; continue; }
  console.log(`${id}  (${sb.shots.length} shots, ${Object.keys(sb.elements).length} elements, ${narration.totalSec}s)`);
  for (const i of [...issues].sort((a, b) => order[a.level] - order[b.level] || a.code.localeCompare(b.code))) {
    console.log(`${color[i.level]}${i.level.padEnd(5)}${reset} ${i.code} ${i.where}: ${i.msg}`);
  }
  const longest = still.reduce((m, s) => (s[1] - s[0] > m[1] - m[0] ? s : m), [0, 0] as [number, number]);
  if (flag('timeline')) {
    for (const a of activity) console.log(`  ${a.from.toFixed(2).padStart(6)}–${a.to.toFixed(2).padEnd(6)} ${a.why.padEnd(6)} ${a.id}`);
    for (const [a, b] of still) console.log(`  still ${a.toFixed(2)}–${b.toFixed(2)} (${(b - a).toFixed(2)}s)`);
  }
  const n = (l: SbIssue['level']) => issues.filter(i => i.level === l).length;
  console.log(`longest still span ${(longest[1] - longest[0]).toFixed(1)}s (${longest[0].toFixed(1)}–${longest[1].toFixed(1)}s)`);
  console.log(`${n('error')} errors, ${n('warn')} warnings\n`);
}
if (flag('json')) console.log(JSON.stringify(json, null, 2));
process.exit(failed ? 1 : 0);
