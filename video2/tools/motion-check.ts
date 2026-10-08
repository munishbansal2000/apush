/**
 * Motion check on a RENDERED video: finds stretches where the picture doesn't change.
 *   out/<id>.mp4  →  ffmpeg freezedetect (noise -50 dB, ≥ 4 s) + per-frame scene-change scores
 *   --id exchangecrossing   composition id (lower-case file name in out/)
 *   --file path.mp4         any video instead
 *   --max 4                 seconds of stillness allowed (default 4)
 *   --noise -50dB           freezedetect noise tolerance
 *   --still-score 0.00015   scene-score threshold for the (informational) low-change spans
 * Prints every static stretch longer than --max, the longest static span, and scene-change
 * stats; writes out/logs/motion-check-<id>.json. Exit 1 if any stretch exceeds --max.
 * Run through tools/log.sh (npm run motion-check) for a timestamped log in out/logs.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { arg, ffprobeDuration, ROOT } from './lib';

const id = arg('id', 'exchangecrossing')!.toLowerCase();
const file = arg('file') ?? join(ROOT, 'out', `${id}.mp4`);
const max = Number(arg('max', '4'));
const noise = arg('noise', '-50dB')!;
const name = arg('file') ? basename(file).replace(/\.\w+$/, '') : id;
if (!existsSync(file)) {
  console.error(`no video at ${file} (render it first)`);
  process.exit(2);
}

const duration = ffprobeDuration(file);
// one decode pass: freezedetect on the full frame, scene score on a downscaled copy
const r = spawnSync('ffmpeg', [
  '-hide_banner', '-nostats', '-i', file, '-an',
  '-filter_complex', `[0:v]split[a][b];[a]freezedetect=n=${noise}:d=${max},nullsink;[b]scale=320:-2,select='gte(scene,0)',metadata=print:key=lavfi.scene_score`,
  '-f', 'null', '-',
], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
if (r.status !== 0) {
  console.error(r.stderr.split('\n').slice(-20).join('\n'));
  process.exit(2);
}
const log = r.stderr;

// freezedetect: freeze_start / freeze_duration / freeze_end (an open freeze runs to the end)
const freezes: [number, number][] = [];
let fs: number | null = null;
for (const line of log.split('\n')) {
  const a = /freeze_start: ([\d.]+)/.exec(line);
  const b = /freeze_end: ([\d.]+)/.exec(line);
  if (a) fs = Number(a[1]);
  if (b && fs !== null) { freezes.push([fs, Number(b[1])]); fs = null; }
}
if (fs !== null) freezes.push([fs, duration]);

// scene scores: "pts_time:X" line followed by "lavfi.scene_score=Y"
const scores: { t: number; s: number }[] = [];
let pt = 0;
for (const line of log.split('\n')) {
  const p = /pts_time:([\d.]+)/.exec(line);
  if (p) pt = Number(p[1]);
  const s = /lavfi\.scene_score=([\d.]+)/.exec(line);
  if (s) scores.push({ t: pt, s: Number(s[1]) });
}
// low-change spans by scene score (informational second opinion: whole-frame change per frame,
// so a small sprite moving over a still map also reads as "low"; ambient swell/clouds ≈ 0.0001)
const STILL_SCORE = Number(arg('still-score', '0.00015'));
const lowSpans: [number, number][] = [];
let ls: number | null = null;
for (const { t, s } of scores) {
  if (s < STILL_SCORE) ls ??= t;
  else if (ls !== null) { lowSpans.push([ls, t]); ls = null; }
}
if (ls !== null) lowSpans.push([ls, duration]);
const mean = scores.reduce((a, b) => a + b.s, 0) / Math.max(1, scores.length);
const cuts = scores.filter(x => x.s > 0.3).map(x => x.t);
const longestLow = lowSpans.reduce((m, s) => (s[1] - s[0] > m[1] - m[0] ? s : m), [0, 0] as [number, number]);
const longestFreeze = freezes.reduce((m, s) => (s[1] - s[0] > m[1] - m[0] ? s : m), [0, 0] as [number, number]);
const fail = freezes.filter(([a, b]) => b - a > max);

const f = (x: number) => x.toFixed(2);
console.log(`motion check: ${file}  (${f(duration)}s, ${scores.length} frames)`);
console.log(`freezedetect n=${noise} d=${max}s: ${freezes.length ? freezes.map(([a, b]) => `${f(a)}–${f(b)}s (${f(b - a)}s)`).join(', ') : 'no frozen stretch'}`);
console.log(`longest static span (freezedetect): ${freezes.length ? `${f(longestFreeze[1] - longestFreeze[0])}s at ${f(longestFreeze[0])}s` : `< ${max}s`}`);
console.log(`scene change: mean ${mean.toFixed(4)}, ${cuts.length} hard cut(s) (>0.3)${cuts.length ? ` at ${cuts.map(f).join(', ')}s` : ''}`);
console.log(`longest low-change span (score < ${STILL_SCORE}, info): ${f(longestLow[1] - longestLow[0])}s at ${f(longestLow[0])}–${f(longestLow[1])}s`);
for (const [a, b] of lowSpans.filter(([a, b]) => b - a > max)) console.log(`  low change ${f(a)}–${f(b)}s (${f(b - a)}s) — nearly static (info)`);

const logs = join(ROOT, 'out', 'logs');
mkdirSync(logs, { recursive: true });
writeFileSync(join(logs, `motion-check-${name}.json`), JSON.stringify({ file, duration, max, noise, freezes, lowSpans, meanScene: mean, cuts, pass: !fail.length }, null, 2) + '\n');
if (fail.length) {
  console.log(`FAIL: ${fail.length} static stretch(es) longer than ${max}s`);
  process.exit(1);
}
console.log(`PASS: no static stretch longer than ${max}s`);
