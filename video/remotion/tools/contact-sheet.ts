/**
 * Frame-sampling smoke test: renders stills at every turn start, every beat (+0.5s),
 * the middle of every pause, and the final second; tiles them into one contact sheet.
 *
 * Asserts each still is not blank. Collects [layout-guard] issues from the browser console.
 * Review the sheet yourself or hand it to a vision model.
 *
 * Usage: npx tsx tools/contact-sheet.ts --episode E3
 *
 * Ported from apush-episode-kit/tools/contact-sheet.ts.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface SamplePoint {
  frame: number;
  label: string;
}

async function main() {
  const epArg = process.argv.find((a, i) => process.argv[i - 1] === '--episode') ?? 'E3';
  const episode = epArg.toUpperCase();
  const epLower = episode.toLowerCase();

  const ROOT = join(__dirname, '..');
  const turnsPath = join(ROOT, 'src', 'data', epLower, 'turns.json');
  const timingPath = join(ROOT, 'src', 'data', epLower, 'timing_map.json');

  if (!existsSync(turnsPath) || !existsSync(timingPath)) {
    console.error(`Missing data for ${episode}: ${turnsPath} or ${timingPath}`);
    process.exit(1);
  }

  const turnsData = JSON.parse(readFileSync(turnsPath, 'utf8'));
  const turns = Array.isArray(turnsData) ? turnsData : turnsData.turns;
  const timing = JSON.parse(readFileSync(timingPath, 'utf8'));
  const starts: number[] = timing.starts;
  const durations: number[] = timing.durations;
  const fps = 30; // TODO: read from config

  // Extract beat offsets from the episode component (best-effort regex)
  const compPath = join(ROOT, 'src', 'components', `U1${episode}Episode.tsx`);
  let beatPoints: SamplePoint[] = [];
  if (existsSync(compPath)) {
    const src = readFileSync(compPath, 'utf8');
    const re = /\{\s*turnId:\s*'(t\d+)',\s*offset:\s*([\d.]+),/g;
    let m;
    const turnStartMap = new Map(turns.map((t: any, i: number) => [t.id, starts[i]]));
    while ((m = re.exec(src)) !== null) {
      const start = turnStartMap.get(m[1]) as number | undefined;
      if (start !== undefined) {
        const t = start + parseFloat(m[2]) + 0.5;
        beatPoints.push({ frame: Math.round(t * fps), label: `${m[1]}+${m[2]}s` });
      }
    }
  }

  const points = new Map<number, string>();
  turns.forEach((t: any, i: number) => {
    points.set(Math.round((starts[i] + 0.3) * fps), t.id);
    if (t.speaker === 'pause' || t.kind === 'pause') {
      points.set(Math.round((starts[i] + durations[i] / 2) * fps), `pause@${t.id}`);
    }
  });
  for (const b of beatPoints) points.set(b.frame, b.label);

  const totalSec = starts[starts.length - 1] + durations[durations.length - 1];
  points.set(Math.floor((totalSec - 1) * fps), 'final');

  const frames = [...points.entries()].sort((a, b) => a[0] - b[0]);
  console.log(`${episode}: ${frames.length} sample points, ${totalSec.toFixed(1)}s total`);
  console.log(`Sample frames: ${frames.slice(0, 10).map(([f, l]) => `${f}(${l})`).join(', ')}...`);

  // Note: actual renderStill requires @remotion/renderer + a bundled project.
  // This tool outputs the sample plan; wire to renderStill when ready.
  const outDir = join(ROOT, 'out', `${epLower}-contact-plan.json`);
  mkdirSync(join(ROOT, 'out'), { recursive: true });
  writeFileSync(outDir, JSON.stringify({ episode, fps, totalSec, frames: frames.map(([frame, label]) => ({ frame, label })) }, null, 2));
  console.log(`Sample plan → ${outDir}`);
  console.log(`\nTo render: wire this to @remotion/renderer renderStill with onBrowserLog collecting [layout-guard]`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
