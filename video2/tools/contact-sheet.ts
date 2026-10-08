/**
 * Frame-sampling smoke test: renders stills at every turn start, every beat (+0.5s),
 * the middle of every pause, and the final second; tiles them into one contact sheet.
 * Asserts each still is not blank. Review the sheet yourself or hand it to a vision model
 * with docs/PROMPTS.md § Visual QA.
 *   --every N     sample every Nth point (default 1)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { arg, loadEpisode, ROOT } from './lib';

const ep = loadEpisode();
const compiled = ep.compile();
const fps = ep.config.fps;
const points = new Map<number, string>();
for (const tt of compiled.timeline) points.set(Math.round((tt.start + 0.3) * fps), `${tt.turn.id}`);
for (const b of compiled.beats) points.set(Math.round((b.start + 0.5) * fps), b.id);
for (const c of compiled.pauseCards) points.set(Math.round(((c.start + c.end) / 2) * fps), `pause@${c.pauseIdx}`);
points.set(Math.floor((compiled.totalSec - 1) * fps), 'final');
const every = Number(arg('every', '1'));
const frames = [...points.entries()].sort((a, b) => a[0] - b[0]).filter((_, i) => i % every === 0);

const outDir = join(ROOT, 'out', `${ep.spec.id}-stills`);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: join(ROOT, 'src/index.ts') });
// REMOTION_BROWSER: path to a local Chrome when the headless-shell download is unavailable
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const composition = await selectComposition({ serveUrl, id: ep.spec.id.toUpperCase(), browserExecutable, logLevel: 'error' });
const cols = 6;
const blank: string[] = [];
const labels: string[] = [];
const guardIssues: { frame: number; label: string; kind: string; id: string; other?: string; detail: string }[] = [];
let i = 0;
for (const [frame, label] of frames) {
  const file = join(outDir, `${String(i++).padStart(4, '0')}.png`);
  await renderStill({
    composition, serveUrl, frame, output: file, scale: 0.25, browserExecutable, logLevel: 'error',
    // the runtime layout guard measures the real DOM and logs `[kit-layout] {...}`
    onBrowserLog: log => {
      const m = /\[kit-layout\] (.*)$/s.exec(log.text);
      if (!m) return;
      const payload = JSON.parse(m[1]) as { issues: { kind: string; id: string; other?: string; detail: string }[] };
      for (const i of payload.issues) guardIssues.push({ frame, label, ...i });
    },
  });
  // blank check: the frame's colour variance must be non-trivial
  const stats = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'signalstats,metadata=print:file=-', '-f', 'null', '-'], { encoding: 'utf8' });
  const ydif = Number(/YDIF=([\d.]+)/.exec(stats)?.[1] ?? 0);
  const yhigh = Number(/YHIGH=([\d.]+)/.exec(stats)?.[1] ?? 0);
  const ylow = Number(/YLOW=([\d.]+)/.exec(stats)?.[1] ?? 0);
  const inTitle = frame / fps >= compiled.titleStart && frame / fps < compiled.titleStart + ep.config.titleCardSec;
  if (!inTitle && yhigh - ylow < 12 && ydif === 0) blank.push(`${label}@${frame}`);
  labels.push(`${String(i - 1).padStart(4, '0')}  frame ${frame}  ${label}`);
}
const sheet = join(ROOT, 'out', `${ep.spec.id}-contact.png`);
execFileSync('ffmpeg', ['-y', '-v', 'error', '-pattern_type', 'glob', '-i', join(outDir, '*.png'), '-vf', `tile=${cols}x${Math.ceil(frames.length / cols)}:padding=4:color=black`, '-frames:v', '1', sheet]);
writeFileSync(sheet.replace(/\.png$/, '.txt'), `tiles left→right, top→bottom (${cols} per row)\n${labels.join('\n')}\n`);
console.log(`${frames.length} stills → ${sheet} (index: ${sheet.replace(/\.png$/, '.txt')})`);
const report = join(ROOT, 'out', `${ep.spec.id}-layout.json`);
writeFileSync(report, JSON.stringify(guardIssues, null, 2) + '\n');
const byKind = new Map<string, number>();
for (const g of guardIssues) byKind.set(g.kind, (byKind.get(g.kind) ?? 0) + 1);
if (guardIssues.length) {
  console.error(`runtime layout guard: ${guardIssues.length} issue(s) [${[...byKind].map(([k, n]) => `${k}=${n}`).join(', ')}] → ${report}`);
  for (const g of guardIssues.slice(0, 15)) console.error(`  f${g.frame} ${g.label}: ${g.kind} ${g.id}${g.other ? ` × ${g.other}` : ''} — ${g.detail}`);
} else {
  console.log('runtime layout guard: no overlaps, cuts, unsafe elements, or clipped text');
}
if (blank.length) console.error(`blank frames: ${blank.join(', ')}`);
if (blank.length || guardIssues.some(g => g.kind !== 'unsafe')) process.exit(1);
