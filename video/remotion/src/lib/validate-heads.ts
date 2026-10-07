/**
 * Head validator: H001/H002 checks from apush-episode-kit.
 *
 * - H001: speaker missing from config, or head art file missing on disk
 * - H002: realistic and stylized are the same file, or two speakers share art
 *         (this would have caught the Marcus/Maya toon bug at build time)
 *
 * Ported from apush-episode-kit/src/kit/validate.ts (heads section).
 */

export interface SpeakerConfig {
  name: string;
  color: string;
  real: string;
  toon: string;
}

export interface HeadIssue {
  level: 'error' | 'warn';
  code: string;
  where: string;
  msg: string;
}

export function validateHeads(
  speakers: Record<string, SpeakerConfig>,
  expectedSpeakers: string[],
  opts: {
    /** Check if a file exists under public/. */
    fileExists?: (relPath: string) => boolean;
  } = {},
): HeadIssue[] {
  const issues: HeadIssue[] = [];
  const push = (level: HeadIssue['level'], code: string, where: string, msg: string) =>
    issues.push({ level, code, where, msg });

  for (const sp of expectedSpeakers) {
    const s = speakers[sp];
    if (!s) {
      push('error', 'H001', sp, 'speaker missing from config');
      continue;
    }

    // H002: same file for real and toon
    if (s.real === s.toon) {
      push('error', 'H002', sp, `realistic and stylized head art are the same file: ${s.real}`);
    }

    // H002: shares art with another speaker
    for (const other of expectedSpeakers) {
      if (other === sp) continue;
      const o = speakers[other];
      if (!o) continue;
      if (o.toon === s.toon) {
        push('error', 'H002', sp, `shares stylized head art with ${other}: ${s.toon}`);
      }
      if (o.real === s.real) {
        push('error', 'H002', sp, `shares realistic head art with ${other}: ${s.real}`);
      }
    }

    // H001: files missing
    if (opts.fileExists) {
      for (const f of [s.real, s.toon]) {
        if (!opts.fileExists(f)) {
          push('error', 'H001', sp, `missing public/${f}`);
        }
      }
    }
  }

  return issues;
}
