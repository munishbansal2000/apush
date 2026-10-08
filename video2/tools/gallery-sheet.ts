/**
 * Component gallery audit: one still per component (late in its slot, after entrances), tiled
 * into out/gallery-contact.png (+ .txt index), with runtime guard reports per component in
 * out/logs/gallery-layout.json. Fails only on render errors; layout findings are reported.
 *   --every N   render every Nth component
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { arg, ROOT } from './lib';

const serveUrl = await bundle({ entryPoint: join(ROOT, 'src/index.ts') });
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const composition = await selectComposition({ serveUrl, id: 'ComponentGallery', browserExecutable, logLevel: 'error' });
// slot boundaries come from the bundle's metadata: re-derive from the gallery module
const { GALLERY_SLOTS, GALLERY_STARTS } = await import('../src/gallery/Gallery');
const every = Number(arg('every', '1'));
const outDir = join(ROOT, 'out', 'gallery-stills');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(join(ROOT, 'out', 'logs'), { recursive: true });
const findings: Record<string, { kind: string; detail: string }[]> = {};
const failures: string[] = [];
const labels: string[] = [];
let n = 0;
for (let i = 0; i < GALLERY_SLOTS.length; i += every) {
  const slot = GALLERY_SLOTS[i];
  const frame = GALLERY_STARTS[i] + Math.floor(slot.durationInFrames * 0.7);
  const file = join(outDir, `${String(n++).padStart(3, '0')}.png`);
  try {
    await renderStill({
      composition, serveUrl, frame, output: file, scale: 0.5, browserExecutable, logLevel: 'error',
      onBrowserLog: log => {
        const m = /\[kit-layout\] (.*)$/s.exec(log.text);
        if (!m) return;
        for (const g of (JSON.parse(m[1]) as { issues: { kind: string; id: string; other?: string; detail: string }[] }).issues) {
          if (g.id === 'gallery:label' || g.other === 'gallery:label') continue;
          (findings[slot.name] ??= []).push({ kind: g.kind, detail: g.detail });
        }
      },
    });
    labels.push(`${String(n - 1).padStart(3, '0')}  ${slot.name}`);
  } catch (e) {
    failures.push(`${slot.name}: ${(e as Error).message.split('\n')[0]}`);
    // keep the grid aligned with the index: a red placeholder tile for a failed render
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x5a1010:s=640x360', '-frames:v', '1', file]);
    labels.push(`${String(n - 1).padStart(3, '0')}  ${slot.name}  RENDER FAILED`);
  }
  console.log(`  [${i + 1}/${GALLERY_SLOTS.length}] ${slot.name}${findings[slot.name] ? `  (${findings[slot.name].length} guard findings)` : ''}`);
}
const sheet = join(ROOT, 'out', 'gallery-contact.png');
execFileSync('ffmpeg', ['-y', '-v', 'error', '-pattern_type', 'glob', '-i', join(outDir, '*.png'), '-vf', `tile=6x${Math.ceil(n / 6)}:padding=4:color=black`, '-frames:v', '1', sheet]);
writeFileSync(sheet.replace(/\.png$/, '.txt'), labels.join('\n') + '\n');
writeFileSync(join(ROOT, 'out', 'logs', 'gallery-layout.json'), JSON.stringify({ findings, failures }, null, 2) + '\n');
console.log(`\n${n} stills → ${sheet}`);
console.log(`components with guard findings: ${Object.keys(findings).length} → out/logs/gallery-layout.json`);
if (failures.length) {
  console.error(`render failures (${failures.length}):\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
