/**
 * Full-episode render for COMPONENT episodes (U1E1-U2E10) with layout guard on EVERY frame.
 *   out/u1e3.mp4
 *   out/logs/render-layout-latest.jsonl   one line per guard report (frame, issues)
 *   out/logs/render-browser-latest.log    every other browser console message
 *   out/logs/render-issues-latest.json  per-issue summary (times in seconds, item names)
 * Prints progress every 5% and a guard summary at the end: one line per distinct issue with
 * its frame count, the time spans (seconds) it occurs in, and the guard item names involved.
 *   --frames 0-899      render a range only
 *   --id U1E3-BOX1      render another composition (e.g. a Short)
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { arg, ROOT } from './lib';
import { existsSync, readFileSync } from 'node:fs';

const episode = (arg('episode') ?? 'U2E8').toUpperCase();
const id = arg('id', `${episode}Episode`)!;
const range = arg('frames')?.split('-').map(Number) as [number, number] | undefined;

// Load episode data from data/ or src/data/
const epLower = episode.toLowerCase();
const dataDir = (name: string) => {
  const d1 = join(ROOT, 'data', epLower, name);
  if (existsSync(d1)) return d1;
  return join(ROOT, 'src', 'data', epLower, name);
};
const turnsData = JSON.parse(readFileSync(dataDir('turns.json'), 'utf8'));
const turns = Array.isArray(turnsData) ? turnsData : turnsData.turns;
const timing = JSON.parse(readFileSync(dataDir('timing_map.json'), 'utf8'));
const episodeData = { turns, starts: timing.starts, durations: timing.durations };
const logs = join(ROOT, 'out', 'logs');
mkdirSync(logs, { recursive: true });
const layoutLog = join(logs, 'render-layout-latest.jsonl');
const browserLog = join(logs, 'render-browser-latest.log');
writeFileSync(layoutLog, '');
writeFileSync(browserLog, '');

const serveUrl = await bundle({ entryPoint: join(ROOT, 'src', 'components-index.ts') });
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const composition = await selectComposition({ serveUrl, id, browserExecutable, logLevel: 'error', inputProps: { episodeData } });
const out = join(ROOT, 'out', `${id.toLowerCase()}.mp4`);
interface IssueSummary { kind: string; id: string; other?: string; items: string[]; detail: string; frames: number[] }
const issues = new Map<string, IssueSummary>();
/** Guard item names inside an issue's `other` ("world#town:Havana×terms" → ["town:Havana"]). */
const itemNames = (other?: string) => [...(other ?? '').matchAll(/#([^×]+)/g)].map(m => m[1]);
/** Sorted frames → contiguous spans in seconds. */
const spans = (frames: number[], fps: number) => {
  const out: [number, number][] = [];
  for (const f of frames) {
    const last = out[out.length - 1];
    if (last && f <= last[1] + 1) last[1] = f;
    else out.push([f, f]);
  }
  return out.map(([a, b]) => [+(a / fps).toFixed(2), +((b + 1) / fps).toFixed(2)] as [number, number]);
};
let lastPct = -5;
const t0 = Date.now();

console.log(`rendering ${id}: ${composition.durationInFrames} frames @ ${composition.fps}fps${range ? ` (frames ${range[0]}–${range[1]})` : ''}`);
await renderMedia({
  composition, serveUrl, codec: 'h264', outputLocation: out, browserExecutable, logLevel: 'error',
  inputProps: { episodeData },
  ...(range ? { frameRange: range } : {}),
  onProgress: ({ progress, renderedFrames, encodedFrames }) => {
    const pct = Math.floor(progress * 100);
    if (pct >= lastPct + 5) {
      lastPct = pct;
      const el = (Date.now() - t0) / 1000;
      console.log(`  ${String(pct).padStart(3)}%  rendered ${renderedFrames}  encoded ${encodedFrames}  ${el.toFixed(0)}s elapsed`);
    }
  },
  onBrowserLog: log => {
    const m = /\[kit-layout\] (.*)$/s.exec(log.text);
    if (!m) {
      appendFileSync(browserLog, `[${log.type}] ${log.text}\n`);
      return;
    }
    appendFileSync(layoutLog, m[1] + '\n');
    const payload = JSON.parse(m[1]) as { frame: number; issues: { kind: string; id: string; other?: string; detail?: string }[] };
    for (const i of payload.issues) {
      const key = `${i.kind} ${i.id}${i.other ? ` × ${i.other}` : ''}`;
      const cur = issues.get(key) ?? { kind: i.kind, id: i.id, other: i.other, items: itemNames(i.other), detail: i.detail ?? '', frames: [] };
      if (!cur.frames.includes(payload.frame)) cur.frames.push(payload.frame);
      issues.set(key, cur);
    }
  },
});

console.log(`\n→ ${out}  (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
const fps = composition.fps;
const summary = [...issues.values()]
  .map(i => {
    const frames = [...i.frames].sort((a, b) => a - b);
    return { ...i, frames: frames.length, first: +(frames[0] / fps).toFixed(2), spans: spans(frames, fps) };
  })
  .sort((a, b) => a.first - b.first || b.frames - a.frames);
writeFileSync(join(logs, 'render-issues-latest.json'), JSON.stringify({ id, fps, issues: summary }, null, 2) + '\n');
if (!summary.length) {
  console.log('runtime layout guard: clean on every frame');
} else {
  console.log(`runtime layout guard: ${summary.length} distinct issue(s) → ${layoutLog}, ${join(logs, 'render-issues-latest.json')}`);
  for (const i of summary) {
    const when = i.spans.slice(0, 4).map(([a, b]) => `${a.toFixed(2)}–${b.toFixed(2)}s`).join(', ') + (i.spans.length > 4 ? ` (+${i.spans.length - 4} more)` : '');
    const what = i.items.length ? i.items.join(' × ') : i.other ? `${i.id} × ${i.other}` : i.id;
    console.log(`  ${i.kind.padEnd(8)} ${what}  [track ${i.id}]  ${String(i.frames).padStart(4)} frames  at ${when}`);
    if (i.detail) console.log(`           ${i.detail}`);
  }
}
