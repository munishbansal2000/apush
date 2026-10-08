/**
 * Prototype narration: one clip per sentence (macOS `say` placeholders, like the episode
 * pipeline), measured with ffprobe → src/data/prototype/exchange.json (exact sentence starts).
 * Replace with Fish audio later: same file names, then re-run this script with --no-say.
 *
 *   --no-say       keep the existing mp3s (only re-measure)
 *   --word-times   also measure per-word times → `words: [{w, s, e}]` per sentence (seconds
 *                  from the start of that sentence's clip). No ASR is installed (no Vosk /
 *                  whisper), so this uses the TTS itself: `say` the cumulative prefixes of the
 *                  sentence (words 1..k) and measure each with ffprobe — prefix k's length is
 *                  where word k ends. Boundaries are then snapped to the pauses silencedetect
 *                  finds in the full clip. Only valid while the clips come from `say`; with
 *                  real voice audio use Vosk (tools/import-vosk.ts) instead.
 * Without --word-times, existing word times are kept for sentences whose text is unchanged.
 */
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { ffprobeDuration, flag, PUBLIC, ROOT } from './lib';

export const SENTENCES: { speaker: 'maya' | 'marcus'; text: string }[] = [
  { speaker: 'marcus', text: 'Autumn, 1493. Seventeen ships sail from Spain to Hispaniola, and their holds are full.' },
  { speaker: 'maya', text: "Wheat, sugarcane, horses, pigs, cattle. Everything you'd need to plant Europe in the Americas." },
  { speaker: 'marcus', text: 'But the cargo that mattered most was invisible.' },
  { speaker: 'marcus', text: 'Over the next decades, smallpox, measles, and influenza moved from port to port, and town after town emptied.' },
  { speaker: 'maya', text: "And the ships didn't sail home empty. Maize, potatoes, tomatoes, cacao, and later silver went east." },
  { speaker: 'marcus', text: 'Food went both ways. The dying went almost entirely one way.' },
];
const VOICES = { maya: 'Samantha', marcus: 'Daniel' } as const;
const RATE = '180';
const GAP = 0.45;
const LEAD = 0.8;
const TAIL = 2.5;
const OUT_JSON = join(ROOT, 'src/data/prototype/exchange.json');

export interface WordTime { w: string; s: number; e: number }
/** Same normalisation the scene uses to look words up. */
export const normWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/^'+|'+$/g, '');

const run = promisify(execFile);
const say = (voice: string, text: string, out: string) => run('say', ['-v', voice, '-r', RATE, '-o', out, text]);

/** Pauses in a clip: [start, end] seconds (silencedetect writes to stderr). */
function silencesOf(file: string): [number, number][] {
  const res = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=n=-40dB:d=0.04', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const out: [number, number][] = [];
  let start: number | null = null;
  for (const line of res.split('\n')) {
    const a = /silence_start: ([\d.]+)/.exec(line);
    const b = /silence_end: ([\d.]+)/.exec(line);
    if (a) start = Number(a[1]);
    if (b && start !== null) { out.push([start, Number(b[1])]); start = null; }
  }
  if (start !== null) out.push([start, ffprobeDuration(file)]);
  return out;
}

/** Run async jobs with bounded concurrency, preserving order. */
async function pool<T>(jobs: (() => Promise<T>)[], n = 6): Promise<T[]> {
  const res: T[] = new Array(jobs.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, async () => {
    while (next < jobs.length) { const i = next++; res[i] = await jobs[i](); }
  }));
  return res;
}

/**
 * Word times for one sentence spoken by `voice` (see header). Each boundary between word k-1
 * and word k is estimated twice — prefix (words 0..k-1) duration = where word k-1 ends, and
 * speech end minus suffix (words k..n) duration = where word k starts — and averaged, which
 * cancels most of the phrase-final / phrase-initial prosody drift either one has alone. Then
 * boundaries near a real pause snap to it. Returns error stats for the report.
 */
async function measureWords(voice: string, text: string, tmp: string, tag: string): Promise<{ words: WordTime[]; pauseErr: number[]; spread: number[] }> {
  const tokens = text.split(/\s+/).filter(Boolean);
  const n = tokens.length;
  const full = join(tmp, `${tag}-full.aiff`);
  await say(voice, text, full);
  const D = ffprobeDuration(full);
  // pauses: merge gaps < 30 ms (a stop release between two silences), keep >= 70 ms (drops stop closures)
  const pauses = silencesOf(full)
    .reduce<[number, number][]>((acc, p) => { const l = acc[acc.length - 1]; if (l && p[0] - l[1] < 0.03) l[1] = p[1]; else acc.push([...p]); return acc; }, [])
    .filter(([a, b]) => b - a >= 0.07 || a <= 0.02 || b >= D - 0.02);
  const leading = pauses.find(([a]) => a <= 0.02);
  const trailing = pauses.find(([a, b]) => b >= D - 0.02 && a > 0.05);
  const start = leading ? leading[1] : 0;
  const end = trailing ? trailing[0] : D;
  const dur = (from: number, to: number) => async () => {
    const f = join(tmp, `${tag}-${from}-${to}.aiff`);
    await say(voice, tokens.slice(from, to).join(' '), f);
    return ffprobeDuration(f);
  };
  const ks = Array.from({ length: n - 1 }, (_, i) => i + 1);
  const [pre, suf] = await Promise.all([pool(ks.map(k => dur(0, k))), pool(ks.map(k => dur(k, n)))]);
  const words: WordTime[] = [];
  const pauseErr: number[] = [];
  const spread: number[] = [];
  let s = start;
  ks.forEach((k, i) => {
    const pe = start + pre[i];          // end of word k-1 (prefix)
    const ss = end - suf[i];            // start of word k (suffix)
    let e = (pe + ss) / 2;
    let next = e;
    const p = pauses.find(([a, b]) => a > s + 0.03 && e > a - 0.15 && e < b + 0.15);
    if (p) { pauseErr.push(Math.abs(pe - p[0]), Math.abs(ss - p[1])); e = p[0]; next = p[1]; }
    else spread.push(Math.abs(pe - ss) / 2);
    e = Math.min(end, Math.max(e, s + 0.05));
    words.push({ w: normWord(tokens[k - 1]), s: +s.toFixed(3), e: +e.toFixed(3) });
    s = Math.min(end - 0.05, Math.max(e, next));
  });
  words.push({ w: normWord(tokens[n - 1]), s: +s.toFixed(3), e: +end.toFixed(3) });
  return { words, pauseErr, spread };
}

const prev = existsSync(OUT_JSON)
  ? (JSON.parse(readFileSync(OUT_JSON, 'utf8')) as { sentences: { text: string; words?: WordTime[] }[] }).sentences
  : [];
const dir = join(PUBLIC, 'audio', 'prototype');
mkdirSync(dir, { recursive: true });
const tmp = flag('word-times') ? mkdtempSync(join(tmpdir(), 'proto-words-')) : '';
const allErr: number[] = [];
const allSpread: number[] = [];
let t = LEAD;
const out: (typeof SENTENCES[number] & { file: string; start: number; dur: number; words?: WordTime[] })[] = [];
for (const [i, s] of SENTENCES.entries()) {
  const mp3 = join(dir, `s${i}.mp3`);
  if (!flag('no-say')) {
    const aiff = mp3.replace(/\.mp3$/, '.aiff');
    execFileSync('say', ['-v', VOICES[s.speaker], '-r', RATE, '-o', aiff, s.text]);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', aiff, '-ar', '44100', '-ac', '1', '-b:a', '96k', mp3]);
    execFileSync('rm', [aiff]);
  }
  const dur = ffprobeDuration(mp3);
  let words = prev.find(p => p.text === s.text)?.words;
  if (flag('word-times')) {
    const m = await measureWords(VOICES[s.speaker], s.text, tmp, `s${i}`);
    words = m.words;
    allErr.push(...m.pauseErr);
    allSpread.push(...m.spread);
  }
  out.push({ ...s, file: `audio/prototype/s${i}.mp3`, start: +t.toFixed(3), dur: +dur.toFixed(3), ...(words ? { words } : {}) });
  t += dur + GAP;
}
if (tmp) rmSync(tmp, { recursive: true, force: true });
const totalSec = +(t - GAP + TAIL).toFixed(3);
writeFileSync(OUT_JSON, JSON.stringify({ sentences: out, totalSec }, null, 2) + '\n');
console.log(`prototype narration: ${out.length} sentences, ${totalSec}s`);
if (flag('word-times')) {
  const n = out.reduce((a, s) => a + (s.words?.length ?? 0), 0);
  const ms = (xs: number[]) => `mean ${((xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)) * 1000).toFixed(0)} ms, max ${(Math.max(0, ...xs) * 1000).toFixed(0)} ms`;
  console.log(`word times: ${n} words`);
  console.log(`  at ${allErr.length / 2} pauses (snapped): raw prefix/suffix estimate vs detected pause edge: ${ms(allErr)}`);
  console.log(`  at ${allSpread.length} continuous boundaries: prefix vs suffix half-disagreement: ${ms(allSpread)}`);
}
