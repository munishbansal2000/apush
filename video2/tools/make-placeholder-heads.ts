/**
 * DEV PLACEHOLDERS: solid-gradient head art for each speaker in render-config.json, so the
 * episode renders before the real character art exists. Skips files that already exist
 * (never overwrites real art). Replace with your own <speaker>-real/-toon images.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadEpisode, PUBLIC } from './lib';

const { config } = loadEpisode();
mkdirSync(PUBLIC, { recursive: true });
for (const [id, s] of Object.entries(config.speakers)) {
  for (const file of [s.real, s.toon]) {
    const out = join(PUBLIC, file);
    if (existsSync(out)) continue;
    const c0 = `0x${s.color.replace('#', '')}`;
    // PNG bytes under the configured name (Chrome sniffs the format), 512×512
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `gradients=s=512x512:c0=${c0}:c1=0x222222:speed=0`, '-frames:v', '1', '-f', 'image2', '-c:v', 'png', out]);
    console.log(`  ${file} (${id})`);
  }
}
