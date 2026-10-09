import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {parseTranscript} from '../tools/pipeline-core';
import {resolvePhrase} from '../tools/pipeline/anchors';

const turns = parseTranscript('Maya: Three boxes on your sheet: salutary neglect, the Proclamation Line, and Pontiac.\n[pause 2]\nMarcus: [sheepish] Box one, done. But the frontier is on fire.');
const timing = {starts: [0.25, 5.43, 7.61], durations: [5, 2, 3]};
// Vosk output: lowercase words with times relative to each clip; "pontiac" misheard as "pontiff".
const words = {
  t00: 'three boxes on your sheet salutary neglect the proclamation line and pontiff'.split(' ').map((w, i) => ({w, s: i * 0.4, e: i * 0.4 + 0.35})),
  t02: 'box one done but the frontier is on fire'.split(' ').map((w, i) => ({w, s: i * 0.3, e: i * 0.3 + 0.25})),
};

describe('phrase anchors', () => {
  it('resolves a spoken phrase to its measured time, ignoring case, punctuation and [tags]', () => {
    const r = resolvePhrase({turn: 2, phrase: 'Box one, done'}, turns, timing, words);
    assert.equal(r.turnId, 't02');
    assert.equal(r.method, 'measured');
    assert.ok(Math.abs(r.sec - 7.61) < 1e-9);
    // edge 'end' lands on the last word ("done", the 3rd heard word at 0.6s).
    assert.ok(Math.abs(resolvePhrase({turn: 2, phrase: 'box one done'}, turns, timing, words, 'end').sec - (7.61 + 0.6)) < 1e-9);
  });

  it('interpolates a word Vosk misheard instead of failing', () => {
    const r = resolvePhrase({turn: 0, phrase: 'Pontiac'}, turns, timing, words);
    assert.equal(r.method, 'interpolated');
    assert.ok(r.sec > 0.25 + 3.6 && r.sec < 0.25 + 5, `got ${r.sec}`);
  });

  it('rejects phrases the turn does not say, pauses, bad indexes, and empty phrases', () => {
    assert.throws(() => resolvePhrase({turn: 2, phrase: 'box two, checked'}, turns, timing, words), /does not say "box two, checked"/);
    assert.throws(() => resolvePhrase({turn: 1, phrase: 'anything'}, turns, timing, words), /is a pause/);
    assert.throws(() => resolvePhrase({turn: 9, phrase: 'x'}, turns, timing, words), /not a turn index/);
    assert.throws(() => resolvePhrase({turn: 0, phrase: ' ,. '}, turns, timing, words), /empty phrase/);
  });

  it('refuses to anchor without Vosk words for the turn', () => {
    assert.throws(() => resolvePhrase({turn: 0, phrase: 'three boxes'}, turns, timing, {}), /no Vosk word timing/);
  });
});
