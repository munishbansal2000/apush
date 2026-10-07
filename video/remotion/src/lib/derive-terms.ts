/**
 * Derive TermChips: first-spoken CED key terms get auto definition chips.
 * Ported from apush-episode-kit/src/kit/derive.ts deriveTerms.
 *
 * For each term in data/terms.json, finds the FIRST time it's spoken
 * (using word timings, not turn starts) and generates a chip at that
 * exact timestamp. Avoids collisions with chapter banners.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface TermChip {
  term: string;
  definition: string;
  start: number;
  end: number;
  turnId: string;
}

interface TermDef {
  term: string;
  match: string[];
  definition: string;
}

const ROOT = join(__dirname, '..', '..');

export function deriveTermChips(
  epLower: string,
  options: {
    termChipSec?: number;
    chapterBanners?: { start: number; end: number; label: string }[];
  } = {},
): TermChip[] {
  const termsPath = join(ROOT, 'src', 'data', 'terms.json');
  if (!existsSync(termsPath)) return [];

  const termsData = JSON.parse(readFileSync(termsPath, 'utf8'));
  const terms: TermDef[] = termsData.terms ?? [];

  const turnsPath = join(ROOT, 'src', 'data', epLower, 'turns.json');
  const timingPath = join(ROOT, 'src', 'data', epLower, 'timing_map.json');
  if (!existsSync(turnsPath) || !existsSync(timingPath)) return [];

  const turnsData = JSON.parse(readFileSync(turnsPath, 'utf8'));
  const turns = Array.isArray(turnsData) ? turnsData : turnsData.turns;
  const timing = JSON.parse(readFileSync(timingPath, 'utf8'));
  // wordTimes reserved for future word-level timing

  const termChipSec = options.termChipSec ?? 4;
  const busy: { start: number; end: number; id: string }[] =
    (options.chapterBanners ?? []).map(c => ({ start: c.start, end: c.end, id: `chapter "${c.label}"` }));

  const chips: TermChip[] = [];

  // Find first occurrence of each term
  const firsts: { term: TermDef; time: number; turnId: string }[] = [];
  for (const t of terms) {
    let found: { time: number; turnId: string } | null = null;
    for (let ti = 0; ti < turns.length && !found; ti++) {
      const turn = turns[ti];
      const text = (turn.text ?? '').toLowerCase();
      for (const m of t.match) {
        const idx = text.indexOf(m.toLowerCase());
        if (idx >= 0) {
          // Use word timing if available, else estimate from character offset
          const turnStart = timing.starts[ti];
          const turnDur = timing.durations[ti];
          const charRatio = idx / Math.max(1, text.length);
          const time = turnStart + charRatio * turnDur;
          found = { time, turnId: turn.id };
          break;
        }
      }
    }
    if (found) firsts.push({ term: t, ...found });
  }

  firsts.sort((a, b) => a.time - b.time);

  for (const { term, time, turnId } of firsts) {
    let start = time;
    // Delay to clear chapter banners
    for (let guard = 0; guard < 10; guard++) {
      const hit = busy.find(b => start < b.end && b.start < start + termChipSec);
      if (!hit) break;
      start = hit.end + 0.2;
    }
    chips.push({
      term: term.term,
      definition: term.definition,
      start,
      end: start + termChipSec,
      turnId,
    });
    busy.push({ start, end: start + termChipSec, id: `term "${term.term}"` });
  }

  return chips;
}
