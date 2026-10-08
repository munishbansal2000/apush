/**
 * Script turn → exact string sent to Fish Audio. Pronunciation and number
 * substitutions come from data/pronunciations.json; nothing is hand-respelled
 * in the script.
 */
import type { SpeechTurn } from './types';

export interface PronTerm { term: string; guide: string; tts: string; approved: boolean }
export interface Pronunciations {
  terms: PronTerm[];
  numbers: { pattern: string; tts: string }[];
  watch: { patterns: string[] };
}

export interface TtsOptions {
  /** Emit {emotion} tags as Fish "(emotion)" markers. Off by default. */
  emotion: boolean;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Term regex with unicode-aware word boundaries (\b fails next to "ã", "é"). */
export const termRegex = (term: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(term)}(?![\\p{L}\\p{N}])`, 'gu');

export function toTtsText(turn: SpeechTurn, pron: Pronunciations, opts: TtsOptions): string {
  let s = turn.text;
  // Longest terms first so "Tlaxcalans" wins over "Tlaxcalan".
  for (const t of [...pron.terms].sort((a, b) => b.term.length - a.term.length)) {
    s = s.replace(termRegex(t.term), t.tts);
  }
  for (const n of pron.numbers) s = s.replace(new RegExp(n.pattern, 'g'), n.tts);
  // A trailing em dash hands off to the next speaker: end on a comma so the voice
  // stays "open"; the held silence comes from [hold Ns] in timing, not the TTS.
  s = s.replace(/\s*—\s*$/, ',');
  // Mid-line em dashes read more reliably as commas in most TTS models.
  s = s.replace(/\s*—\s*/g, ', ');
  if (opts.emotion && turn.emotion) s = `(${turn.emotion}) ${s}`;
  return s;
}
