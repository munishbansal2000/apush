/**
 * Asset validator: X001/X002 — SFX and music timeline assets exist.
 *
 * Adapted from apush-episode-kit/src/kit/validate.ts (assets section).
 * The repo builds music via stage_music.py into src/data/<ep>/music_timeline.json;
 * each event's src is relative to public/ (e.g. "audio/e3/music/intro_sting.wav").
 */

export interface AssetIssue {
  level: 'error' | 'warn';
  code: string;
  where: string;
  msg: string;
}

export interface MusicEvent {
  type: string;
  src?: string;
}

export function validateAssets(
  opts: {
    /** Events from music_timeline.json; null when the timeline wasn't generated. */
    musicEvents: MusicEvent[] | null;
    /** Non-empty SFX file paths referenced by the episode (under public/). */
    sfxFiles: string[];
    /** Check a path relative to public/. */
    fileExists: (relPath: string) => boolean;
  },
): AssetIssue[] {
  const issues: AssetIssue[] = [];
  const push = (level: AssetIssue['level'], code: string, where: string, msg: string) =>
    issues.push({ level, code, where, msg });

  // X002: music timeline assets
  if (opts.musicEvents === null) {
    push('warn', 'X002', 'music', 'no music_timeline.json — run stage_music.py');
  } else {
    for (const e of opts.musicEvents) {
      if (e.src && !opts.fileExists(e.src)) {
        push('error', 'X002', `music:${e.type}`, `missing public/${e.src}`);
      }
    }
  }

  // X001: SFX assets referenced by the episode
  for (const f of opts.sfxFiles) {
    if (!opts.fileExists(f)) {
      push('error', 'X001', `sfx:${f}`, `missing public/${f}`);
    }
  }

  return issues;
}
