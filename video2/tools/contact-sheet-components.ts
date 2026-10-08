/**
 * Component-episode contact sheet (U1E1-U2E10). Generic runner.
 * For kit episodes, use tools/contact-sheet.ts.
 */
/**
 * Contact sheet builder: renders stills at every turn start, every beat (+0.5s),
 * the middle of every pause, and the final second. Tiles them into one PNG
 * for easy visual review.
 *
 * Also collects [layout-guard] issues from the browser console and fails
 * if any overlap/cut/clip is found. Asserts no blank frames.
 *
 * Usage: npx tsx tools/contact-sheet.ts --episode E3 [--every N] [--scale S]
 *   --every N  sample every Nth point (default 1)
 *   --scale S  still resolution scale, 0.25=320px … 1=1280px (default 0.25)
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
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootArg = process.argv.find((a, i) => process.argv[i - 1] === '--root');
const ROOT = rootArg ? resolve(rootArg) : fileURLToPath(new URL('..', import.meta.url));

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
  const scaleArg = process.argv.find((a, i) => process.argv[i - 1] === '--scale');
  const stillScale = scaleArg ? parseFloat(scaleArg) : 0.25;

  // Dynamic imports so the tool works without @remotion/renderer installed
  let bundle: typeof import('@remotion/bundler').bundle;
  let renderStill: typeof import('@remotion/renderer').renderStill;
  let selectComposition: typeof import('@remotion/renderer').selectComposition;
  try {
    ({ bundle } = await import('@remotion/bundler'));
    ({ renderStill, selectComposition } = await import('@remotion/renderer'));
  } catch {
    console.error('Install @remotion/bundler and @remotion/renderer to render contact sheets.');
    console.error('Or run: npx tsx tools/contact-sheet.ts --episode E3 --plan-only');
    process.exit(1);
  }

  const planOnly = process.argv.includes('--plan-only');

  // Load episode data: data/ is canonical (it's what gets bundled and rendered).
  // out/data is the pipeline output; src/data is the transition fallback.
  // All three must agree — sample points MUST come from the same source the
  // bundler sees, otherwise frames get mislabeled (e.g. t36 sampled at a
  // frame that belongs to a different turn).
  const dataDir = (name: string) => {
    const bundled = join(ROOT, 'data', epLower, name);
    if (existsSync(bundled)) return bundled;
    const out = join(ROOT, 'out', 'data', epLower, name);
    return existsSync(out) ? out : join(ROOT, 'src', 'data', epLower, name);
  };
  const turnsPath = dataDir('turns.json');
  const timingPath = dataDir('timing_map.json');
  if (!existsSync(turnsPath) || !existsSync(timingPath)) {
    console.error(`Missing data for ${episode}`);
    process.exit(1);
  }

  const turnsData = JSON.parse(readFileSync(turnsPath, 'utf8'));
  const turns: {id: string; speaker?: string}[] = Array.isArray(turnsData) ? turnsData : turnsData.turns;
  const timing = JSON.parse(readFileSync(timingPath, 'utf8'));
  const starts: number[] = timing.starts;
  const durations: number[] = timing.durations;
  // Pass episode data via inputProps for components that accept it (e.g. U2E8Episode)
  const episodeData = { turns, starts, durations };
  const fps = 30;

  // 1:1 with the kit: episode data is bundled via static imports from data/,
  // not passed as inputProps. If data/ is missing, populate it from the
  // pipeline output in out/ so the bundler can see it.
  const bundleDataDir = join(ROOT, 'data', epLower);
  for (const name of ['turns.json', 'timing_map.json']) {
    const dest = join(bundleDataDir, name);
    const src = join(ROOT, 'out', 'data', epLower, name);
    if (!existsSync(dest) && existsSync(src)) {
      mkdirSync(bundleDataDir, { recursive: true });
      writeFileSync(dest, readFileSync(src));
      console.log(`  staged ${name} -> data/${epLower}/ for bundling`);
    }
  }

  // Sample points: turn starts, beat offsets, pause middles, final second
  const points = new Map<number, string>();
  turns.forEach((t, i) => {
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
    const turnStart = new Map(turns.map((t, i) => [t.id, starts[i]]));
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
  const serveUrl = await bundle({ entryPoint: join(ROOT, 'src', 'components-index.ts') });
  const browserExecutable = process.env.REMOTION_BROWSER ?? null;
  const compArg = process.argv.find((a, i) => process.argv[i - 1] === '--composition');
  const compositionId = compArg ?? `${episode}Episode`;
  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    browserExecutable,
    inputProps: { episodeData },
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
      scale: stillScale,
      browserExecutable,
      inputProps: { episodeData },
      onBrowserLog: (log: {text: string}) => {
        const m = /\[layout-guard\] (.*)$/s.exec(log.text);
        if (!m) return;
        try {
          const payload = JSON.parse(m[1]) as { issues: { kind: string; id: string; other?: string; detail: string }[] };
          for (const issue of payload.issues) guardIssues.push({ frame, label, ...issue });
        } catch { /* ignore parse errors */ }
      },
    });

    // Blank check via ffmpeg signalstats.
    // YLOW/YHIGH are the 10th/90th percentiles; YMAX is the true max.
    // Flag only frames that are BOTH near-uniform (pct range < 12) AND have
    // no bright pixels at all (ymax < 100). Dark-but-populated cards (e.g.
    // versus: dark navy panels + bright title text, ymax ~235) must not flag;
    // a genuinely failed render (flat bg color, missing image) has ymax ~30.
    try {
      const stats = execFileSync(
        'ffmpeg',
        ['-v', 'error', '-i', file, '-vf', 'signalstats,metadata=print:file=-', '-f', 'null', '-'],
        { encoding: 'utf8' }
      );
      const ydif = Number(/YDIF=([\d.]+)/.exec(stats)?.[1] ?? 0);
      const yhigh = Number(/YHIGH=([\d.]+)/.exec(stats)?.[1] ?? 0);
      const ylow = Number(/YLOW=([\d.]+)/.exec(stats)?.[1] ?? 0);
      const ymax = Number(/YMAX=([\d.]+)/.exec(stats)?.[1] ?? 0);
      if (yhigh - ylow < 12 && ydif === 0 && ymax < 100) blank.push(`${label}@${frame}`);
    } catch { /* ffmpeg not available — skip blank check */ }

    labels.push(`${String(i - 1).padStart(4, '0')}  frame ${frame}  ${label}`);
  }
  console.log('\n');

  // Tile into contact sheet. NOTE: -pattern_type glob is not supported by
  // Windows ffmpeg builds, so use the %04d sequence pattern instead
  // (stills are written as 0000.png, 0001.png, ...).
  const sheet = join(ROOT, 'out', `${epLower}-contact.png`);
  const rows = Math.ceil(frames.length / cols);
  // Windows: a stale contact PNG left open in a viewer locks the file and
  // ffmpeg's image2 muxer fails with "Could not open file" even with -y.
  // Remove it first so the tile step starts clean.
  rmSync(sheet, { force: true });
  mkdirSync(join(ROOT, 'out'), { recursive: true });
  execFileSync('ffmpeg', [
    '-y', '-v', 'error',
    '-i', join(outDir, '%04d.png'),
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
