/** Spoken-text helpers shared by the TTS, timing, and director stages. */
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from '../lib';

/** Strip `{notes}` and `[performance tags]` so only the spoken words remain. */
export const cleanSpeech = (text: string) => text.replace(/\{[^}]+\}/g, '').replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();

export interface PronunciationFile {terms?: {term: string; guide?: string; tts?: string; approved?: boolean; auto?: boolean}[]}
export interface Pronunciation {term: string; tts: string}

export const PRONUNCIATIONS_PATH = join(ROOT, 'src', 'data', 'pronunciations.json');

/** Load approved pronunciations and substitute before TTS. */
export function loadPronunciations(path = PRONUNCIATIONS_PATH): Pronunciation[] {
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, 'utf8')) as PronunciationFile;
    return (data.terms ?? []).filter(t => t.approved && t.tts).map(t => ({term: t.term, tts: t.tts!}));
  } catch { return []; }
}

export function applyPronunciations(text: string, terms: Pronunciation[]): string {
  for (const {term, tts} of terms) {
    const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'gi');
    text = text.replace(pattern, tts);
  }
  return text;
}
