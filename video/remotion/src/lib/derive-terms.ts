/**
 * Derive TermChips: first-spoken CED key terms get auto definition chips.
 * Ported from apush-episode-kit/src/kit/derive.ts deriveTerms.
 *
 * For each term in data/terms.json, finds the FIRST time it's spoken
 * (using word timings, not turn starts) and generates a chip at that
 * exact timestamp. Avoids collisions with chapter banners.
 *
 * Browser-safe: terms.json is imported as a module; turns/timing are
 * passed in (EpisodeShell already has them).
 */
import termsData from '../data/terms.json';

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

interface TurnInput {
  id: string;
  text?: string;
}

export function deriveTermChips(
  turns: TurnInput[],
  starts: number[],
  durations: number[],
  options: {
    termChipSec?: number;
    chapterBanners?: { start: number; end: number; label: string }[];
  } = {},
): TermChip[] {
  const terms: TermDef[] = (termsData as any).terms ?? [];
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
          const turnStart = starts[ti];
          const turnDur = durations[ti];
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
