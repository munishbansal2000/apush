/**
 * Sync images.json used_in from beat references.
 *
 * Scans the episode component for image references (bgImage, image, mapImage,
 * and getBackgroundForTurn), then updates images.json used_in arrays to match.
 * Deduplicates entries. Does not delete entries for other episodes.
 *
 * Usage: npx tsx tools/sync-manifest.ts --episode E3
 *
 * Ported from apush-episode-kit/tools/sync-manifest.ts (concept).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

function main() {
  const ep = process.argv.find((a, i) => process.argv[i - 1] === '--episode') ?? 'E3';
  const episode = ep.toUpperCase();

  const compPath = join(ROOT, 'src', 'components', `U1${episode}Episode.tsx`);
  const manifestPath = join(ROOT, 'src', 'data', 'images.json');

  if (!existsSync(compPath)) {
    console.error(`Missing ${compPath}`);
    process.exit(1);
  }
  if (!existsSync(manifestPath)) {
    console.error(`Missing ${manifestPath}`);
    process.exit(1);
  }

  const src = readFileSync(compPath, 'utf8');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  // Find all image references
  const images = new Map<string, Set<string>>(); // image -> set of turnIds

  // From beats: bgImage, image, mapImage fields
  const beatRe = /\{\s*turnId:\s*'(t\d+)'[^}]*?(?:bgImage|image|mapImage):\s*'([^']+)'/g;
  let m;
  while ((m = beatRe.exec(src)) !== null) {
    const img = m[2];
    if (!images.has(img)) images.set(img, new Set());
    images.get(img)!.add(m[1]);
  }

  // From getBackgroundForTurn or similar functions
  const bgRe = /'(historic\/[^']+\.(jpg|png|webp))'/g;
  while ((m = bgRe.exec(src)) !== null) {
    const img = m[1];
    if (!images.has(img)) images.set(img, new Set());
    // We don't know the turn here — mark as general episode use
    images.get(img)!.add('bg');
  }

  console.log(`${episode}: found ${images.size} referenced images`);

  let updated = 0;
  for (const [img, turnIds] of images) {
    if (!manifest[img]) {
      console.log(`  NEW: ${img} (not in manifest — add manually with provenance)`);
      continue;
    }

    const entry = manifest[img];
    const usedIn: string[] = entry.used_in ?? [];

    // Remove old entries for this episode
    const others = usedIn.filter((u: string) => !u.startsWith(`${episode}:`));

    // Add current refs
    const mine = [...turnIds].map(t => `${episode}:${t}`);
    const merged = [...others, ...mine];

    // Deduplicate
    const deduped = [...new Set(merged)];

    if (JSON.stringify(deduped.sort()) !== JSON.stringify(usedIn.sort())) {
      entry.used_in = deduped.sort();
      updated++;
      console.log(`  Updated ${img}: ${deduped.filter(u => u.startsWith(episode + ':')).length} ${episode} refs`);
    }
  }

  if (updated > 0) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`\nWrote ${manifestPath} (${updated} entries updated)`);
  } else {
    console.log('\nNo changes needed.');
  }
}

main();
