/**
 * Phrase anchors: the director names a phrase spoken in a turn ({turn: 12, phrase: "box one, done"}); code proves the
 * phrase is really in that turn and converts it to a time with the kit's Vosk alignment. The LLM never writes seconds.
 */
import {findPhrase, wordOffset} from '../../src/kit/anchors';
import {tokens} from '../../src/kit/text';
import type {PipelineTurn, WordTiming} from '../pipeline-core';
import {cleanSpeech} from './speech';

export interface PhraseAnchor {turn: number; phrase: string}
export interface AnchorTiming {starts: number[]; durations: number[]}
export interface ResolvedPhrase {sec: number; turnId: string; method: 'measured' | 'interpolated'}

/** Throws unless `anchor.phrase` occurs (token-wise, case/punctuation-insensitive) in speech turn `anchor.turn`. */
export function resolvePhrase(
  anchor: PhraseAnchor,
  turns: PipelineTurn[],
  timing: AnchorTiming,
  words: Record<string, WordTiming[]>,
  edge: 'start' | 'end' = 'start',
): ResolvedPhrase {
  if (!anchor || typeof anchor !== 'object') throw new Error('anchor must be {"turn": index, "phrase": "..."}');
  const {turn: index, phrase} = anchor;
  if (!Number.isInteger(index) || index < 0 || index >= turns.length) throw new Error(`anchor turn ${JSON.stringify(index)} is not a turn index`);
  const turn = turns[index];
  if (turn.kind !== 'speech') throw new Error(`anchor turn ${index} (${turn.id}) is a pause, not speech`);
  const text = cleanSpeech(turn.text ?? '');
  const needle = typeof phrase === 'string' ? tokens(phrase) : [];
  if (!needle.length) throw new Error(`anchor on turn ${index} has an empty phrase`);
  const at = findPhrase(tokens(text), needle);
  if (at < 0) throw new Error(`turn ${index} (${turn.id}) does not say "${phrase}"`);
  const rows = words[turn.id];
  if (!rows?.length) throw new Error(`turn ${index} (${turn.id}) has no Vosk word timing`);
  const {offset, method} = wordOffset(text, edge === 'start' ? at : at + needle.length - 1, rows, timing.durations[index]);
  if (method === 'estimated') throw new Error(`turn ${index} (${turn.id}): could not align "${phrase}" to measured words`);
  return {sec: timing.starts[index] + offset, turnId: turn.id, method};
}
