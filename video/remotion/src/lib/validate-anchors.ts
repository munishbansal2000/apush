/**
 * Anchor validator: A003 — beats positioned by estimated, not measured, timing.
 *
 * tools/map_beats.py resolves beat offsets two ways:
 *   offset == 0  -> anchored to the turn start, which comes from Vosk word
 *                  alignment in stage_timing.py (measured).
 *   offset >  0  -> word-level offset by character-proportion estimation
 *                  (map_beats.py's documented "estimated method");
 *                  Vosk word_times.json is not consulted. A word that can't
 *                  be found (WORD-MISS) falls back to 0.0, i.e. measured.
 *
 * So offset > 0 is exactly the set of estimated anchors. This matches the
 * kit's A003 (error in --strict, warn otherwise).
 */

export interface AnchorBeat {
  /** Human-readable beat label, e.g. 't44@0s'. */
  id: string;
  turnId: string;
  offset: number;
}

export interface AnchorIssue {
  level: 'error' | 'warn';
  code: string;
  where: string;
  msg: string;
}

export function validateAnchors(
  beats: AnchorBeat[],
  opts: { strict?: boolean } = {},
): AnchorIssue[] {
  const estimated = beats.filter(b => b.offset > 0);
  if (!estimated.length) return [];
  const names = estimated.slice(0, 5).map(b => b.id).join(', ');
  return [{
    level: opts.strict ? 'error' : 'warn',
    code: 'A003',
    where: 'beats_kit.json',
    msg: `${estimated.length}/${beats.length} beats use estimated word timing ` +
      `(character-proportion, not Vosk word times)${names ? `: ${names}` : ''}` +
      `${estimated.length > 5 ? '…' : ''}. ` +
      `To measure them, resolve word offsets from word_times.json in map_beats.py.`,
  }];
}
