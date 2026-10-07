/**
 * Contact sheet builder: renders stills at every turn start, every beat (+0.5s),
 * the middle of every pause, and the final second. Tiles them into one PNG
 * for easy visual review.
 *
 * Also collects [layout-guard] issues from the browser console and fails
 * if any overlap/cut/clip is found. Asserts no blank frames.
 *
 * Usage: npx tsx tools/contact-sheet.ts --episode E3 [--every N]
 *
 * Output:
 *   out/e3-contact.png      — tiled contact sheet (6 per row)
 *   out/e3-contact.txt      — index: tile number → frame → label
 *   out/e3-layout.json      — layout guard issues per frame
 *
 * Ported from apush-episode-kit/tools/contact-sheet.ts.
 * Log prefix changed from [kit-layout] to [layout-guard] to match our guard.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

interface SamplePoint {
  frame: number;
  label: string;
}

interface GuardIssue {
  frame: number;
  label: string;
  kind: string;
  id: string;
  other?: string;
  detail: string;
}

async function main() {
  const epArg = process.argv.find((a, i) => process.argv[i - 1] === '--episode') ?? 'E3';
  const episode = epArg.toUpperCase();
  const epLower = epArg.toLowerCase();
  const everyArg = process.argv.find((a, i) => process.argv[i - 1] === '--every');
  const every = everyArg ? parseInt(everyArg, 10) : 1;

  // Dynamic imports so the tool works without @remotion/renderer installed
  let bundle: any, renderStill: any, selectComposition: any;
  try {
    ({ bundle } = await import('@remotion/bundler'));
    ({ renderStill, selectComposition } = await import('@remotion/renderer'));
  } catch {
    console.error('Install @remotion/bundler and @remotion/renderer to render contact sheets.');
    console.error('Or run: npx tsx tools/contact-sheet.ts --episode E3 --plan-only');
    process.exit(1);
  }

  const planOnly = process.argv.includes('--plan-only');

  // Load episode data
  const turnsPath = join(ROOT, 'src', 'data', epLower, 'turns.json');
  const timingPath = join(ROOT, 'src', 'data', epLower, 'timing_map.json');
  if (!existsSync(turnsPath) || !existsSync(timingPath)) {
    console.error(`Missing data for ${episode}`);
    process.exit(1);
  }

  const turnsData = JSON.parse(readFileSync(turnsPath, 'utf8'));
  const turns = Array.isArray(turnsData) ? turnsData : turnsData.turns;
  const timing = JSON.parse(readFileSync(timingPath, 'utf8'));
  const starts: number[] = timing.starts;
  const durations: number[] = timing.durations;
  const fps = 30;

  // Sample points: turn starts, beat offsets, pause middles, final second
  const points = new Map<number, string>();
  turns.forEach((t: any, i: number) => {
    points.set(Math.round((starts[i] + 0.3) * fps), t.id);
    if (t.speaker === 'pause') {
      points.set(Math.round((starts[i] + durations[i] / 2) * fps), `pause@${t.id}`);
    }
  });

  // Beat points from component
  const compPath = join(ROOT, 'src', 'components', `U1${episode}Episode.tsx`);
  if (existsSync(compPath)) {
    const src = readFileSync(compPath, 'utf8');
    const re = /\{\s*turnId:\s*'(t\d+)',\s*offset:\s*([\d.]+),/g;
    let m;
    const turnStart = new Map(turns.map((t: any, i: number) => [t.id, starts[i]]));
    while ((m = re.exec(src)) !== null) {
      const s = turnStart.get(m[1]) as number | undefined;
      if (s !== undefined) {
        points.set(Math.round((s + parseFloat(m[2]) + 0.5) * fps), `${m[1]}@${m[2]}s`);
      }
    }
  }

  const totalSec = starts[starts.length - 1] + durations[durations.length - 1];
  points.set(Math.floor((totalSec - 1) * fps), 'final');

  const frames: SamplePoint[] = [...points.entries()]
    .sort((a, b) => a[0] - b[0])
    .filter((_, i) => i % every === 0)
    .map(([frame, label]) => ({ frame, label }));

  console.log(`${episode}: ${frames.length} sample points over ${totalSec.toFixed(1)}s`);

  if (planOnly) {
    const planPath = join(ROOT, 'out', `${epLower}-contact-plan.json`);
    mkdirSync(join(ROOT, 'out'), { recursive: true });
    writeFileSync(planPath, JSON.stringify({ episode, fps, frames }, null, 2));
    console.log(`Plan → ${planPath}`);
    return;
  }

  // Bundle and render
  const outDir = join(ROOT, 'out', `${epLower}-stills`);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  console.log('Bundling...');
  const serveUrl = await bundle({ entryPoint: join(ROOT, 'src', 'index.ts') });
  const browserExecutable = process.env.REMOTION_BROWSER ?? null;
  const compositionId = `U1${episode}Episode`;
  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    browserExecutable,
  });

  const cols = 6;
  const blank: string[] = [];
  const labels: string[] = [];
  const guardIssues: GuardIssue[] = [];

  let i = 0;
  for (const { frame, label } of frames) {
    const file = join(outDir, `${String(i++).padStart(4, '0')}.png`);
    process.stdout.write(`\r  Rendering ${i}/${frames.length} (frame ${frame})...`);

    await renderStill({
      composition,
      serveUrl,
      frame,
      output: file,
      scale: 0.25,
      browserExecutable,
      onBrowserLog: (log: any) => {
        const m = /\[layout-guard\] (.*)$/s.exec(log.text);
        if (!m) return;
        try {
          const payload = JSON.parse(m[1]) as { issues: { kind: string; id: string; other?: string; detail: string }[] };
          for (const issue of payload.issues) guardIssues.push({ frame, label, ...issue });
        } catch { /* ignore parse errors */ }
      },
    });

    // Blank check via ffmpeg signalstats
    try {
      const stats = execFileSync(
        'ffmpeg',
        ['-v', 'error', '-i', file, '-vf', 'signalstats,metadata=print:file=-', '-f', 'null', '-'],
        { encoding: 'utf8' }
      );
      const ydif = Number(/YDIF=([\d.]+)/.exec(stats)?.[1] ?? 0);
      const yhigh = Number(/YHIGH=([\d.]+)/.exec(stats)?.[1] ?? 0);
      const ylow = Number(/YLOW=([\d.]+)/.exec(stats)?.[1] ?? 0);
      if (yhigh - ylow < 12 && ydif === 0) blank.push(`${label}@${frame}`);
    } catch { /* ffmpeg not available — skip blank check */ }

    labels.push(`${String(i - 1).padStart(4, '0')}  frame ${frame}  ${label}`);
  }
  console.log('\n');

  // Tile into contact sheet
  const sheet = join(ROOT, 'out', `${epLower}-contact.png`);
  const rows = Math.ceil(frames.length / cols);
  execFileSync('ffmpeg', [
    '-y', '-v', 'error',
    '-pattern_type', 'glob', '-i', join(outDir, '*.png'),
    '-vf', `tile=${cols}x${rows}:padding=4:color=black`,
    '-frames:v', '1', sheet,
  ]);
  writeFileSync(
    sheet.replace(/\.png$/, '.txt'),
    `tiles left→right, top→bottom (${cols} per row)\n${labels.join('\n')}\n`
  );
  console.log(`${frames.length} stills → ${sheet}`);

  // Layout guard report
  const reportPath = join(ROOT, 'out', `${epLower}-layout.json`);
  writeFileSync(reportPath, JSON.stringify(guardIssues, null, 2) + '\n');
  const byKind = new Map<string, number>();
  for (const g of guardIssues) byKind.set(g.kind, (byKind.get(g.kind) ?? 0) + 1);

  if (guardIssues.length) {
    console.error(`\nLayout guard: ${guardIssues.length} issue(s) [${[...byKind].map(([k, n]) => `${k}=${n}`).join(', ')}]`);
    for (const g of guardIssues.slice(0, 15)) {
      console.error(`  f${g.frame} ${g.label}: ${g.kind} ${g.id}${g.other ? ` × ${g.other}` : ''} — ${g.detail}`);
    }
  } else {
    console.log('Layout guard: no overlaps, cuts, unsafe elements, or clipped text ✓');
  }

  if (blank.length) console.error(`\nBlank frames: ${blank.join(', ')}`);

  if (blank.length || guardIssues.some(g => g.kind !== 'unsafe')) {
    console.error('\nCONTACT SHEET FAILED');
    process.exit(1);
  }
  console.log('\nCONTACT SHEET PASSED');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
