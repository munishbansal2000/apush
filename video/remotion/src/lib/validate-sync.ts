/**
 * Sync validator: T001–T007 — turns / timing / audio consistency.
 *
 * Adapted from apush-episode-kit/src/kit/validate.ts (timing/audio section)
 * to this repo's pipeline:
 *   turns.json      <- stage_tts.py (turns carry duration_sec baked at TTS time)
 *   timing_map.json <- stage_timing.py (Vosk word alignment + ffprobe)
 *   public/audio/<ep>/<id>.mp3  (what the episode actually plays)
 *
 * T006 (script text changed since audio was generated) has no repo
 * equivalent: the pipeline stores no TTS text hash. It is intentionally
 * not implemented rather than faked.
 */

export interface SyncTurn {
  id: string;
  speaker: string;
  pause_after?: number;
  duration_sec?: number;
}

export interface SyncTiming {
  starts: number[];
  durations: number[];
}

export interface SyncIssue {
  level: 'error' | 'warn';
  code: string;
  where: string;
  msg: string;
}

export function validateSync(
  turns: SyncTurn[],
  timing: SyncTiming,
  opts: {
    /**
     * MP3 filenames present in public/audio/<ep>/ (e.g. ['t00.mp3', ...]).
     * Pass null/undefined when the audio dir is absent — T001/T003 are
     * skipped then, not failed.
     */
    audioFiles?: string[] | null;
    /** Measured MP3 durations by turn id (ffprobe). Enables T004a. */
    audioDurations?: Record<string, number>;
    /** Tolerance for audio-vs-timing drift, seconds. */
    audioToleranceSec?: number;
  } = {},
): SyncIssue[] {
  const issues: SyncIssue[] = [];
  const push = (level: SyncIssue['level'], code: string, where: string, msg: string) =>
    issues.push({ level, code, where, msg });
  const tol = opts.audioToleranceSec ?? 0.25;

  // T002: turns and timing agree on count
  if (timing.starts.length !== turns.length || timing.durations.length !== turns.length) {
    push(
      'error', 'T002', 'timing_map.json',
      `${timing.starts.length} starts / ${timing.durations.length} durations for ${turns.length} turns — regenerate timing (stage_timing.py)`,
    );
    return issues;
  }

  const byId = new Map(turns.map(t => [t.id, t]));

  for (let i = 0; i < turns.length; i++) {
    const t = turns[i];

    // T007: starts are monotonic and turns don't overlap
    if (i > 0 && timing.starts[i] < timing.starts[i - 1] + timing.durations[i - 1] - 0.001) {
      push(
        'error', 'T007', t.id,
        `starts at ${timing.starts[i].toFixed(2)}s, before ${turns[i - 1].id} ends`,
      );
    }

    if (t.speaker === 'pause') {
      // T005: the [N-second pause] silence matches the script's pause length
      const want = t.pause_after ?? 0;
      if (Math.abs(timing.durations[i] - want) > 0.01) {
        push(
          'error', 'T005', t.id,
          `pause is ${want}s in the script but ${timing.durations[i].toFixed(2)}s in timing`,
        );
      }
      continue;
    }

    // T004b: duration baked into turns.json at TTS time vs measured timing.
    // Catches regenerating one without the other.
    if (typeof t.duration_sec === 'number' && Math.abs(t.duration_sec - timing.durations[i]) > tol) {
      push(
        'error', 'T004', t.id,
        `turns.json says ${t.duration_sec.toFixed(2)}s but timing says ${timing.durations[i].toFixed(2)}s — audio or timing is stale`,
      );
    }

    if (opts.audioFiles) {
      // T003: every turn has its MP3
      if (!opts.audioFiles.includes(`${t.id}.mp3`)) {
        push('error', 'T003', t.id, `missing public/audio/<ep>/${t.id}.mp3`);
      }
      // T004a: measured MP3 duration vs timing
      const real = opts.audioDurations?.[t.id];
      if (real !== undefined && Math.abs(real - timing.durations[i]) > tol) {
        push(
          'error', 'T004', t.id,
          `audio is ${real.toFixed(2)}s but timing says ${timing.durations[i].toFixed(2)}s — regenerate timing (stage_timing.py)`,
        );
      }
    }
  }

  // T001: orphan audio — MP3s with no matching turn
  if (opts.audioFiles) {
    for (const f of opts.audioFiles) {
      const m = /^(.+)\.mp3$/.exec(f);
      if (m && !byId.has(m[1])) {
        push('warn', 'T001', f, 'audio file has no matching turn in turns.json');
      }
    }
  }

  return issues;
}
