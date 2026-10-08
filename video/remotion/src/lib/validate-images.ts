/**
 * Image validator: I001-I006 checks from apush-episode-kit, adapted to our pipeline.
 *
 * Checks every image referenced by beats against images.json:
 * - I001: image not in manifest
 * - I002: file missing on disk
 * - I003: no provenance (license "unknown" or empty source_url)
 * - I004: used_in out of sync with beats
 * - I005: missing credit (warn in dev, error in strict)
 * - I006: duplicate used_in entries, or files on disk not in manifest
 *
 * Ported from apush-episode-kit/src/kit/validate.ts (image section).
 */

export interface ManifestEntry {
  description: string;
  license: string;
  source_url: string;
  used_in: string[];
  credit?: string;
}

export type Manifest = Record<string, ManifestEntry>;

export interface ImageIssue {
  level: 'error' | 'warn';
  code: string;
  where: string;
  msg: string;
}

export interface BeatImageRef {
  /** Beat identifier for error messages. */
  beatId: string;
  /** Image path as referenced in the beat. */
  image: string;
  /** Manifest key prefix, e.g. 'E3'. */
  episodeKey: string;
}

export function validateImages(
  refs: BeatImageRef[],
  manifest: Manifest,
  opts: {
    strict?: boolean;
    /** Check if a file exists under public/. */
    fileExists?: (relPath: string) => boolean;
    /** All image files on disk (for orphan detection). */
    diskImages?: string[];
  } = {},
): ImageIssue[] {
  const issues: ImageIssue[] = [];
  const push = (level: ImageIssue['level'], code: string, where: string, msg: string) =>
    issues.push({ level, code, where, msg });

  const strict = opts.strict ?? false;

  // Group refs by image
  const byImage = new Map<string, BeatImageRef[]>();
  for (const r of refs) {
    const list = byImage.get(r.image) ?? [];
    list.push(r);
    byImage.set(r.image, list);
  }

  for (const [img, imgRefs] of byImage) {
    const where = `image:${img}`;
    const m = manifest[img];

    // I001: not in manifest
    if (!m) {
      push('error', 'I001', where, `not in images.json (referenced by ${imgRefs.map(r => r.beatId).join(', ')})`);
      continue;
    }

    // I003: no provenance
    if (!m.license || m.license === 'unknown' || !m.source_url) {
      push(
        'error',
        'I003',
        where,
        `no provenance (license "${m.license}", source_url ${m.source_url ? 'set' : 'empty'}) — clearance risk if monetized`
      );
    }

    // I005: missing credit
    if (!m.credit) {
      push(
        strict ? 'error' : 'warn',
        'I005',
        where,
        'missing "credit" (shown on screen)'
      );
    }

    // I002: file missing
    if (opts.fileExists && !opts.fileExists(img)) {
      push('error', 'I002', where, `file missing: public/${img}`);
    }

    // I004: used_in must exactly match the beats that reference this image,
    // in both directions. Kit strength: error, not warn. Fix with:
    //   npx tsx tools/sync-manifest.ts --episode <EP>
    const episodeKey = imgRefs[0]?.episodeKey ?? '';
    const expected = new Set(imgRefs.map(r => `${episodeKey}:${r.beatId}`));
    const have = new Set((m.used_in ?? []).filter(u => u.startsWith(`${episodeKey}:`)));

    const missing = [...expected].filter(u => !have.has(u));
    const stale = [...have].filter(u => !expected.has(u));
    if (missing.length > 0 || stale.length > 0) {
      const parts: string[] = [];
      if (missing.length > 0) parts.push(`missing ${missing.join(', ')}`);
      if (stale.length > 0) parts.push(`stale ${stale.join(', ')}`);
      push(
        'error',
        'I004',
        where,
        `used_in out of sync — ${parts.join('; ')}. Run: npx tsx tools/sync-manifest.ts --episode ${episodeKey}`,
      );
    }

    // I006: duplicate used_in
    const usedIn = m.used_in ?? [];
    if (new Set(usedIn).size !== usedIn.length) {
      push('warn', 'I006', where, 'duplicate used_in entries');
    }
  }

  // I006: files on disk not in manifest (orphans)
  if (opts.diskImages) {
    for (const f of opts.diskImages) {
      if (!manifest[f]) {
        push('warn', 'I006', `image:${f}`, 'file on disk is not in images.json');
      }
    }
  }

  // Check manifest entries that claim to be used by this episode but have no refs
  const episodeKeys = new Set(refs.map(r => r.episodeKey));
  for (const [img, m] of Object.entries(manifest)) {
    for (const ek of episodeKeys) {
      const mine = (m.used_in ?? []).filter(u => u.startsWith(`${ek}:`));
      if (mine.length > 0 && !byImage.has(img)) {
        push(
          'error',
          'I004',
          `image:${img}`,
          `claims ${mine.join(', ')} but no beat references it. Run: npx tsx tools/sync-manifest.ts --episode ${ek}`,
        );
      }
    }
  }

  return issues;
}

/**
 * Provenance validator: I011 — magnifier marks on document beats must be
 * human-verified against the real scan.
 *
 * Ported from apush-episode-kit/src/kit/validate.ts (document section).
 * I007/I008 (focus regions) have no repo equivalent: images.json carries no
 * focus metadata and repo tour beats address stops by rect, not region id.
 * I009/I010 (image lockfile) have no repo equivalent: stage_images.py keeps
 * no lockfile. Both are deliberately not implemented rather than faked.
 */
export interface DocProvenance {
  beatId: string;
  hasMarks: boolean;
  marksVerified?: boolean;
}

export function validateProvenance(
  docs: DocProvenance[],
  opts: { strict?: boolean } = {},
): ImageIssue[] {
  const issues: ImageIssue[] = [];
  for (const d of docs) {
    if (d.hasMarks && !d.marksVerified) {
      issues.push({
        level: opts.strict ? 'error' : 'warn',
        code: 'I011',
        where: `beat:${d.beatId}`,
        msg: 'magnifier marks not verified against the real scan (set marksVerified: true)',
      });
    }
  }
  return issues;
}

/**
 * Extract image references from our SUB_BEATS format.
 * Looks for bgImage, image, mapImage fields.
 */
export function extractImageRefs(
  beats: { turnId: string; kind: string; bgImage?: string; image?: string; mapImage?: string }[],
  episodeKey: string,
): BeatImageRef[] {
  const refs: BeatImageRef[] = [];
  for (const b of beats) {
    const img = b.bgImage ?? b.image ?? b.mapImage;
    if (img) {
      refs.push({ beatId: b.turnId, image: img, episodeKey });
    }
  }
  return refs;
}
