/**
 * Watch a lesson in Remotion Studio (live in the browser, scrub the timeline; no render):
 *
 *   npm run studio:doc -- u3e1            the lesson's current plan (data/<lesson>/shots.json), unapproved geography allowed
 *   npm run studio:doc -- u3e1 --props-only   just write the props file (out/studio/<lesson>.props.json)
 *
 * Layout problems show as red outlines in the Studio. After a new build, run the command again to load the new plan.
 */
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {ROOT, flag} from './lib';
import {loadDocInputs, resolveDocPlan} from './pipeline/doc-inputs';

const lesson = process.argv.slice(2).find(a => !a.startsWith('--'));
if (!lesson) { console.error('usage: npm run studio:doc -- <lesson> [--props-only]'); process.exit(1); }
const inputs = loadDocInputs(lesson, join(ROOT, 'data', lesson, 'shots.json'), true);
const resolved = resolveDocPlan(inputs);
const props = {episode: lesson, shots: resolved.shots, years: resolved.years, boxes: resolved.boxes, turns: inputs.turns, timing: inputs.timing};
const dir = join(ROOT, 'out', 'studio');
mkdirSync(dir, {recursive: true});
const file = join(dir, `${lesson}.props.json`);
writeFileSync(file, JSON.stringify(props));
console.log(`[studio] ${lesson}: ${resolved.shots.length} shots, ${(inputs.timing.totalSec / 60).toFixed(1)} min -> ${relative(ROOT, file)}`);
if (!flag('props-only')) {
  console.log('[studio] opening Remotion Studio; pick "DocEpisode" (Ctrl+C to stop)');
  const r = spawnSync('npx', ['remotion', 'studio', 'src/documentary-index.tsx', `--props=${file}`], {cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32'});
  process.exit(r.status ?? 0);
}
