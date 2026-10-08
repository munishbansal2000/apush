/**
 * Motion preview: render a short MP4 around a beat, trap, chapter, or time, so animation
 * (not just stills) can be reviewed.
 *   npm run preview -- --beat route-west        (beat start - 1s … end + 0.5s)
 *   npm run preview -- --at 312 --len 8         (seconds)
 *   npm run preview -- --all-new                (one clip per route/range/trap/chain/focus)
 * Multiple clips are joined into ONE file, out/preview/<ep>-reel.mp4, with a timestamped
 * index (<ep>-reel.txt). The individual clips are deleted unless --keep-clips.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { arg, flag, loadEpisode, ROOT } from './lib';

const ep = loadEpisode();
const compiled = ep.compile();
const fps = ep.config.fps;
const clips: { name: string; start: number; end: number }[] = [];
const beatId = arg('beat');
if (beatId) {
  const b = compiled.beats.find(x => x.id === beatId);
  if (!b) throw new Error(`no beat ${beatId}`);
  clips.push({ name: beatId, start: b.start - 1, end: b.end + 0.5 });
} else if (arg('at')) {
  const at = Number(arg('at'));
  clips.push({ name: `t${at}`, start: at, end: at + Number(arg('len', '8')) });
} else if (flag('all-new')) {
  for (const b of compiled.beats) {
    const showcase = ['route', 'range', 'tour', 'document', 'figure', 'board', 'question', 'ledger', 'pictogram'].includes(b.kind) ||
      (b.kind === 'stack' && b.items.length > 1) || (b.kind === 'bg' && b.focus);
    if (showcase) clips.push({ name: b.id.replace(/[^\w-]/g, '_'), start: b.start - 0.5, end: Math.min(b.end, b.start + 7) + 0.3 });
  }
  for (const t of compiled.traps) clips.push({ name: `trap-${t.trapIdx}`, start: t.start - 0.3, end: Math.min(t.end, t.factStart + 3) });
  const c = compiled.chapters.find(x => x.spec.box);
  if (c) clips.push({ name: 'chapter-banner', start: c.start - 0.6, end: c.bannerEnd + 0.5 });
  const check = compiled.boxEvents[compiled.boxEvents.length - 1];
  if (check) clips.push({ name: 'sheet-finale', start: check.time - 1, end: check.time + 3 });
} else {
  throw new Error('pass --beat <id>, --at <sec> [--len N], or --all-new');
}
const serveUrl = await bundle({ entryPoint: join(ROOT, 'src/index.ts') });
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const composition = await selectComposition({ serveUrl, id: ep.spec.id.toUpperCase(), browserExecutable, logLevel: 'error' });
const dir = join(ROOT, 'out', 'preview');
const logDir = join(ROOT, 'out', 'logs');
mkdirSync(logDir, { recursive: true });
const layoutLog = join(logDir, 'preview-layout-latest.jsonl');
writeFileSync(layoutLog, '');
const guardCounts = new Map<string, { n: number; first: number }>();
mkdirSync(dir, { recursive: true });
clips.sort((a, b) => a.start - b.start);
const rendered: { file: string; name: string; start: number; frames: number }[] = [];
for (const [i, c] of clips.entries()) {
  const out = join(dir, `${ep.spec.id}-${String(i).padStart(2, '0')}-${c.name}.mp4`);
  const first = Math.max(0, Math.round(c.start * fps));
  const last = Math.min(composition.durationInFrames - 1, Math.round(c.end * fps));
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation: out, frameRange: [first, last], scale: 0.5, browserExecutable, logLevel: 'error',
    onBrowserLog: log => {
      const m = /\[kit-layout\] (.*)$/s.exec(log.text);
      if (!m) return;
      appendFileSync(layoutLog, m[1] + '\n');
      const payload = JSON.parse(m[1]) as { frame: number; issues: { kind: string; id: string; other?: string }[] };
      for (const g of payload.issues) {
        const k = `${g.kind} ${g.id}${g.other ? ` × ${g.other}` : ''}`;
        const e = guardCounts.get(k) ?? { n: 0, first: payload.frame };
        e.n++;
        guardCounts.set(k, e);
      }
    },
  });
  rendered.push({ file: out, name: c.name, start: c.start, frames: last - first + 1 });
  console.log(`  [${i + 1}/${clips.length}] ${c.name}`);
}

if (rendered.length === 1) {
  console.log(`→ ${rendered[0].file}`);
} else {
  // Same codec/size/fps for every clip, so the concat demuxer can join without re-encoding.
  const list = join(dir, 'concat.txt');
  writeFileSync(list, rendered.map(r => `file '${r.file.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  const reel = join(dir, `${ep.spec.id}-reel.mp4`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', reel]);
  rmSync(list);
  // index: where each clip starts in the reel, and where it comes from in the episode
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  let at = 0;
  const index = rendered.map(r => {
    const line = `${fmt(at).padEnd(8)} ${r.name.padEnd(28)} (episode ${fmt(r.start)})`;
    at += r.frames / fps;
    return line;
  });
  writeFileSync(reel.replace(/\.mp4$/, '.txt'), `reel time  clip                         source\n${index.join('\n')}\n`);
  if (!flag('keep-clips')) for (const r of rendered) rmSync(r.file);
  console.log(`\n→ ${reel}  (${rendered.length} clips, ${fmt(at)})\n→ ${reel.replace(/\.mp4$/, '.txt')}`);
}

if (!guardCounts.size) console.log('runtime layout guard: clean on every previewed frame');
else {
  console.log(`runtime layout guard: ${guardCounts.size} distinct issue(s) → ${layoutLog}`);
  for (const [k, v] of [...guardCounts].sort((a, b) => b[1].n - a[1].n)) console.log(`  ${String(v.n).padStart(5)} frames  first f${v.first}  ${k}`);
}
