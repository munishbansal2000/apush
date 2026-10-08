/**
 * Beat validator: B001-B008 checks from apush-episode-kit, adapted to our SUB_BEATS format.
 *
 * Our beats: { turnId, offset, kind, text?, level?, position?, ... }
 * Their beats: resolved with start/end/turnIdx/method
 *
 * This module takes our beats + turns + timing and runs the checks.
 * Ported from apush-episode-kit/src/kit/validate.ts (beat section).
 */
import { hasEmoji } from './text';

export interface BeatLike {
  turnId: string;
  offset: number;
  kind: string;
  text?: string;
  level?: 'hero' | 'title' | 'subtitle' | 'body';
  // ... other fields ignored by validator
}

export interface TurnLike {
  id: string;
  speaker: string;
  text: string;
}

export interface FactRule {
  id: string;
  forbid?: { pattern: string; why: string; scope: string[] }[];
  hedge?: { trigger: string; words: string[]; window: number; scope: string[] };
}

export interface BeatIssue {
  level: 'error' | 'warn';
  code: string;
  where: string;
  msg: string;
}

const MIN_HOLD_SEC = 1.5;

const MAX_CHARS: Record<string, number> = {
  hero: 30,
  title: 40,
  subtitle: 60,
  body: 100,
};

/** Serious tones where emoji is forbidden. */
const SERIOUS_TONES = ['serious', 'sobering'];

export function validateBeats(
  beats: BeatLike[],
  turns: TurnLike[],
  durations: number[],
  facts: { facts: FactRule[] },
  getTone?: (turnId: string) => string,
): BeatIssue[] {
  const issues: BeatIssue[] = [];
  const push = (level: BeatIssue['level'], code: string, where: string, msg: string) =>
    issues.push({ level, code, where, msg });

  const turnMap = new Map(turns.map((t, i) => [t.id, { turn: t, idx: i }]));

  for (const b of beats) {
    const where = `beat:${b.turnId}@${b.offset}s(${b.kind})`;
    const entry = turnMap.get(b.turnId);

    // B001/B002 need the turn to exist
    if (!entry) {
      push('error', 'B000', where, `turnId '${b.turnId}' does not exist`);
      continue;
    }

    const { idx } = entry;
    const dur = durations[idx] ?? 0;
    const visible = dur - b.offset;

    // B001: visible < minHold
    if (visible < MIN_HOLD_SEC) {
      push(
        'error',
        'B001',
        where,
        `visible ${visible.toFixed(2)}s (< ${MIN_HOLD_SEC}s) in ${b.turnId}. Beat never shows.`
      );
    }

    // B002: offset >= duration (starts after turn ends)
    if (b.offset >= dur) {
      push('error', 'B002', where, `offset ${b.offset}s >= turn duration ${dur.toFixed(2)}s — starts after turn ends`);
    }

    // Text content checks
    const text = b.text ?? '';

    // B005: emoji in serious tone
    if (text && hasEmoji(text) && getTone) {
      const tone = getTone(b.turnId);
      if (SERIOUS_TONES.includes(tone)) {
        push('error', 'B005', where, `emoji in a ${tone} section: "${text.slice(0, 40)}"`);
      }
    }

    // B006: forbidden claims / missing hedges
    if (text) {
      for (const f of facts.facts) {
        for (const r of f.forbid ?? []) {
          if (!r.scope.includes('onscreen')) continue;
          const m = new RegExp(r.pattern, 'i').exec(text);
          if (m) push('error', 'B006', where, `${f.id}: on-screen "${m[0]}" (${r.why})`);
        }
        const h = f.hedge;
        if (h && h.scope.includes('onscreen')) {
          const m = new RegExp(h.trigger, 'i').exec(text);
          if (m && !h.words.some(w => text.toLowerCase().includes(w.toLowerCase()))) {
            push('error', 'B006', where, `${f.id}: on-screen "${m[0]}" needs a hedge (${h.words.slice(0, 3).join(' / ')})`);
          }
        }
      }
    }

    // B007: text too long for level
    if (text && b.level) {
      const max = MAX_CHARS[b.level];
      if (max && text.length > max) {
        push('error', 'B007', where, `${text.length} chars for level ${b.level} (max ${max}): "${text.slice(0, 40)}..."`);
      }
    }

    // B008: paraphrase styled as quotation (heuristic: starts with quote mark)
    if (text && /^["“]/.test(text)) {
      // This is a heuristic — the real check needs quoteStatus metadata
      // For now, warn if it looks like a quote in a context that might be paraphrase
      push('warn', 'B008', where, `text starts with quotation mark — verify it's a real quote, not a paraphrase: "${text.slice(0, 40)}"`);
    }
  }

  return issues;
}
