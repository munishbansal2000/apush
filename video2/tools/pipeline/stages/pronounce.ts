import {existsSync, readFileSync} from 'node:fs';
import {atomicJson, readJson, sha256, type PipelineTurn} from '../../pipeline-core';
import type {PipelineContext} from '../context';
import {PRONUNCIATIONS_PATH, type PronunciationFile} from '../speech';

/** Ask Meta UI for hard-to-pronounce terms and add new ones to src/data/pronunciations.json. */
export function pronounceStage(ctx: PipelineContext, turns: PipelineTurn[]): void {
  const pronPath = PRONUNCIATIONS_PATH;
  const pronounceHash = sha256(JSON.stringify(turns.map(t => t.text)));
  if (!ctx.stages.includes('pronounce')) return;
  if (ctx.current('pronounce', pronounceHash)) console.log('[pronounce] checkpoint current');
  else if (ctx.dryRun) console.log('[pronounce] dry-run: would identify difficult words via Meta UI');
  else {
    const existing: PronunciationFile = existsSync(pronPath) ? JSON.parse(readFileSync(pronPath, 'utf8')) : {terms: []};
    existing.terms ??= [];
    const knownTerms = new Set(existing.terms.map(t => t.term.toLowerCase()));
    const prompt = `You are a TTS pronunciation specialist. Read the transcript below. Identify words that English TTS engines commonly mispronounce: foreign names, indigenous terms, archaic spellings, and historical figures. For each, provide the term as it appears, a human stress guide (CAPS for stressed syllable), and a phonetic TTS string (lowercase, hyphenated syllables). Skip common English words. Return JSON only: {"terms":[{"term":"...","guide":"...","tts":"..."}]}.\n\nTRANSCRIPT:\n${turns.filter(t => t.kind === 'speech').map(t => t.text).join('\n')}`;
    const out = ctx.meta('pronounce', prompt);
    const result = readJson<{terms: {term: string; guide: string; tts: string}[]}>(out);
    let added = 0;
    for (const term of result.terms ?? []) {
      if (!term.term || knownTerms.has(term.term.toLowerCase())) continue;
      existing.terms.push({term: term.term, guide: term.guide, tts: term.tts, approved: true, auto: true});
      knownTerms.add(term.term.toLowerCase());
      added++;
      console.log(`  + "${term.term}" -> "${term.tts}" (auto-approved)`);
    }
    if (added) {
      atomicJson(pronPath, existing);
      console.log(`[pronounce] ${added} new pronunciations auto-approved in ${pronPath}`);
    } else console.log('[pronounce] no new candidates');
    ctx.mark('pronounce', pronounceHash);
  }
}
