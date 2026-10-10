/**
 * Watch a lesson in Remotion Studio (live in the browser, scrub the timeline; no render):
 *
 *   npm run studio:doc -- u3e1                the lesson's current plan (data/<lesson>/shots.json), unapproved geography allowed
 *   npm run studio:doc -- u3e1 --guard        with the layout guard on (red outlines on problems; playback is slower)
 *   npm run studio:doc -- u3e1 --clean        without the review label (line · act · shot, bottom left)
 *   npm run studio:doc -- u3e1 --props-only   just write the props file (out/studio/<lesson>.props.json)
 *
 * For smooth playback the narration and music are pre-mixed into one track (public/studio/<lesson>.m4a; sound cues are
 * left out) and the guard is off unless asked for. After a new build, run the command again to load the new plan.
 */
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, statSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {ROOT, flag} from './lib';
import {loadDocInputs, resolveDocPlan} from './pipeline/doc-inputs';

const lesson = process.argv.slice(2).find(a => !a.startsWith('--'));
if (!lesson) { console.error('usage: npm run studio:doc -- <lesson> [--props-only]'); process.exit(1); }
const inputs = loadDocInputs(lesson, join(ROOT, 'data', lesson, 'shots.json'), true);
const resolved = resolveDocPlan(inputs);

/** Narration (each line at its start) and the music bed in one file; remade only when the audio or timing is newer. */
function studioTrack(): string | undefined {
  const rel = `studio/${lesson}.m4a`;
  const out = join(ROOT, 'public', rel);
  const lines = inputs.turns.map((t, i) => ({file: join(ROOT, 'public', 'audio', lesson!, `${t.id}.mp3`), start: inputs.timing.starts[i], speech: t.kind === 'speech'}))
    .filter(l => l.speech && existsSync(l.file));
  if (!lines.length) return undefined;
  const sources = [...lines.map(l => l.file), join(ROOT, 'data', lesson!, 'timing_map.json')].filter(existsSync);
  if (existsSync(out) && sources.every(f => statSync(f).mtimeMs <= statSync(out).mtimeMs)) return rel;
  mkdirSync(join(ROOT, 'public', 'studio'), {recursive: true});
  const music = join(ROOT, 'public', 'music', 'bed.mp3');
  const filters = lines.map((l, i) => `[${i}:a]adelay=${Math.round(l.start * 1000)}:all=1[a${i}]`);
  const mixIn = lines.map((_, i) => `[a${i}]`).join('');
  const withMusic = existsSync(music);
  if (withMusic) filters.push(`[${lines.length}:a]volume=0.06[m]`);
  filters.push(`${mixIn}${withMusic ? '[m]' : ''}amix=inputs=${lines.length + (withMusic ? 1 : 0)}:normalize=0:dropout_transition=0[out]`);
  console.log(`[studio] mixing ${lines.length} line(s)${withMusic ? ' + music' : ''} into one track`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...lines.flatMap(l => ['-i', l.file]), ...(withMusic ? ['-stream_loop', '-1', '-i', music] : []),
    // Inline (a few KB): -filter_complex_script was removed in ffmpeg 8.
    '-filter_complex', filters.join(';'), '-map', '[out]', '-t', inputs.timing.totalSec.toFixed(3), '-c:a', 'aac', '-b:a', '160k', out]);
  return rel;
}

const dir = join(ROOT, 'out', 'studio');
mkdirSync(dir, {recursive: true});
const audioTrack = studioTrack();
const props = {episode: lesson, shots: resolved.shots, years: resolved.years, boxes: resolved.boxes, turns: inputs.turns, timing: inputs.timing,
  ...(audioTrack ? {audioTrack} : {}), guard: flag('guard'), reviewLabel: !flag('clean'), acts: (inputs.plan as {acts?: {turns: {from: number; to: number}}[]} | null)?.acts ?? []};
const file = join(dir, `${lesson}.props.json`);
writeFileSync(file, JSON.stringify(props));
console.log(`[studio] ${lesson}: ${resolved.shots.length} shots, ${(inputs.timing.totalSec / 60).toFixed(1)} min${audioTrack ? ', one audio track' : ''}${flag('guard') ? ', layout guard on' : ''} -> ${relative(ROOT, file)}`);
if (!flag('props-only')) {
  console.log('[studio] opening Remotion Studio; pick "DocEpisode" (Ctrl+C to stop)');
  const r = spawnSync('npx', ['remotion', 'studio', 'src/documentary-index.tsx', `--props=${file}`], {cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32'});
  process.exit(r.status ?? 0);
}
