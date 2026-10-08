/**
 * Sync images.json used_in from beat references.
 *
 * Scans the episode component for image references (bgImage, image, mapImage,
 * and getBackgroundForTurn), the resolved kit beats (src/data/<ep>/beats_kit.json),
 * and the lesson-plan section backgrounds, then updates images.json used_in
 * arrays to match the `<EP>:<turnId>` convention. Deduplicates entries.
 * Does not delete entries for other episodes.
 *
 * Usage: npx tsx tools/sync-manifest.ts --episode E3
 *
 * Ported from apush-episode-kit/tools/sync-manifest.ts (concept).
 * Reference collection is shared with the I004 validator via
 * src/lib/episode-image-refs.ts so both agree on the expected set.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { collectImageRefs } from '../src/lib/episode-image-refs';

const ROOT = join(__dirname, '..');

async function main() {
  const ep = process.argv.find((a, i) => process.argv[i - 1] === '--episode') ?? 'E3';
  const episode = ep.toUpperCase();
  const epLower = ep.toLowerCase();

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

  // From resolved kit beats (beats_kit.json) + lesson-plan section backgrounds,
  // via the shared collector so this agrees with the I004 validator.
  try {
    const dataDir = (name: string) => {
      const out = join(ROOT, 'out', 'data', epLower, name);
      return existsSync(out) ? out : join(ROOT, 'src', 'data', epLower, name);
    };
    const turnsPath = dataDir('turns.json');
    const timingPath = dataDir('timing_map.json');
    const kitPath = join(ROOT, 'src', 'data', epLower, 'beats_kit.json');
    if (existsSync(turnsPath) && existsSync(timingPath)) {
      const turnsData = JSON.parse(readFileSync(turnsPath, 'utf8'));
      const turns = Array.isArray(turnsData) ? turnsData : turnsData.turns;
      const timing = JSON.parse(readFileSync(timingPath, 'utf8'));
      const kitBeats = existsSync(kitPath) ? JSON.parse(readFileSync(kitPath, 'utf8')) : [];
      let planSections: { bg?: string; from?: unknown }[] = [];
      for (const pf of [`u1${epLower}-plan`, `u${epLower}-plan`]) {
        const planPath = join(ROOT, 'src', 'data', `${pf}.ts`);
        if (!existsSync(planPath)) continue;
        try {
          const planMod = await import(pathToFileURL(planPath).href);
          const plan = Object.values(planMod).find(
            (v: any) => v && typeof v === 'object' && Array.isArray(v.sections),
          ) as any;
          if (plan) planSections = plan.sections;
        } catch { /* plan not importable */ }
        break;
      }
      for (const r of collectImageRefs({
        kitBeats,
        planSections,
        turns,
        starts: timing.starts,
        durations: timing.durations,
      })) {
        if (!images.has(r.image)) images.set(r.image, new Set());
        images.get(r.image)!.add(r.turnId);
      }
      // A resolved turnId supersedes the imprecise 'bg' tag for the same image.
      for (const tids of images.values()) {
        if (tids.size > 1 && tids.has('bg')) tids.delete('bg');
      }
    }
  } catch (e) {
    console.error(`  (kit-beat/plan scan skipped: ${(e as Error).message})`);
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

  // Remove stale <EP>: tags from images no beat references anymore
  // (e.g. after a turn renumber). Other episodes' tags are untouched.
  const referenced = new Set(images.keys());
  for (const [img, entry] of Object.entries(manifest) as [string, { used_in?: string[] }][]) {
    const usedIn: string[] = entry.used_in ?? [];
    const stale = usedIn.filter(u => u.startsWith(`${episode}:`));
    if (stale.length > 0 && !referenced.has(img)) {
      entry.used_in = usedIn.filter(u => !u.startsWith(`${episode}:`));
      updated++;
      console.log(`  Cleaned ${img}: removed stale ${stale.join(', ')}`);
    }
  }

  if (updated > 0) {
    // Preserve the file's existing indent (currently 1 space) so a sync
    // doesn't reformat all 800+ lines.
    const indent = /^(\s*)"/m.exec(readFileSync(manifestPath, 'utf8'))?.[1].length ?? 2;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, indent) + '\n');
    console.log(`\nWrote ${manifestPath} (${updated} entries updated)`);
  } else {
    console.log('\nNo changes needed.');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
