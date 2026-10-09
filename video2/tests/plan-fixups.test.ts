import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {parseTranscript} from '../tools/pipeline-core';
import type {ActOutput} from '../tools/pipeline/doc-director';
import {dropShortShots, fixActQuestions, questionBefore} from '../tools/pipeline/plan-fixups';

const turns = parseTranscript([
  'Maya: London is broke. Your turn. Draw a line, or send soldiers? Which one buys time?',
  '[10-second pause]',
  'Marcus: The line. Always the line.',
  'Maya: Second beat here. What did it cost?',
  '[10-second pause]',
  'Marcus: Trust.',
].join('\n'));
const durations = [8, 10, 3, 4, 10, 2];
const shots = (a: ActOutput) => a.shots as unknown as Record<string, unknown>[];

describe('plan fix-ups: question cards', () => {
  it('copies the question verbatim from the line before the pause', () => {
    assert.equal(questionBefore(turns, 1), 'Which one buys time?');
    assert.equal(questionBefore(turns, 4), 'What did it cost?');
    assert.equal(questionBefore(turns, 2), null, 'not after speech');
  });

  it('turns a shot on a pause into its card, drops extras, adds missing cards, and fixes paraphrased text', () => {
    const act = {shots: [
      {type: 'image_move', at: {turn: 0, phrase: 'london is broke'}, image: 'a.jpg', from: {x: 0.5, y: 0.5, zoom: 1}, to: {x: 0.5, y: 0.4, zoom: 1.2}},
      {type: 'image_move', at: {turn: 1}, image: 'b.jpg', from: {x: 0.5, y: 0.5, zoom: 1}, to: {x: 0.5, y: 0.4, zoom: 1.2}},
      {type: 'question', at: {turn: 1, phrase: 'x'}, question: 'Which buys more time?'},
      {type: 'map', at: {turn: 2, phrase: 'the line'}, view: 'map.test', moves: [{at: {turn: 1}, to: 'colonies'}]},
      {type: 'image_move', at: {turn: 3, phrase: 'second beat here'}, image: 'c.jpg', from: {x: 0.5, y: 0.5, zoom: 1}, to: {x: 0.5, y: 0.4, zoom: 1.2}},
      {type: 'image_move', at: {turn: 5, phrase: 'trust'}, image: 'd.jpg', from: {x: 0.5, y: 0.5, zoom: 1}, to: {x: 0.5, y: 0.4, zoom: 1.2}},
    ]} as unknown as ActOutput;
    const {act: fixed, fixes} = fixActQuestions(act, {from: 0, to: 5}, turns, durations);
    assert.deepEqual(shots(fixed).map(s => `${s.type}@${(s.at as {turn: number}).turn}`), ['image_move@0', 'question@1', 'map@2', 'image_move@3', 'question@4', 'image_move@5']);
    assert.equal(shots(fixed)[1].question, 'Which one buys time?');
    assert.deepEqual(shots(fixed)[1].at, {turn: 1});
    assert.equal(shots(fixed)[4].question, 'What did it cost?');
    assert.deepEqual((shots(fixed)[2].moves as {at: unknown}[])[0].at, {offset: 0.5}, 'nested cue moved off the pause');
    assert.ok(fixes.some(f => /became its question card/.test(f)) && fixes.some(f => /added the missing question card/.test(f)));
  });
});

describe('plan fix-ups: cuts the checks reject', () => {
  const im = (image: string) => ({type: 'image_move', at: {turn: 0, phrase: 'x'}, image, from: {x: 0.5, y: 0.5, zoom: 1}, to: {x: 0.5, y: 0.4, zoom: 1.2}});

  it('drops cuts the resolver reports as too short, never the first shot of an act or a question card', () => {
    const acts = [{shots: [im('a'), im('b'), im('c')]}, {shots: [im('d'), {type: 'question', at: {turn: 1}}]}] as unknown as ActOutput[];
    const message = 'shot plan invalid:\n  - shot02: 0.84s is shorter than 1.2s\n  - shot04: 0.5s is shorter than 1.2s\n  - shot05: 1.0s is shorter than 1.2s';
    const {acts: fixed, fixes} = dropShortShots(acts, message);
    assert.deepEqual(fixed.map(a => shots(a).length), [2, 2]);
    assert.equal(fixes.length, 1);
  });

  it('drops out-of-order cuts too', () => {
    const ordered = dropShortShots([{shots: [im('a'), im('b'), im('c')]}] as unknown as ActOutput[], 'shot plan invalid:\n  - shot 3 starts at or before shot 2 (515.39s ≤ 518.42s)');
    assert.deepEqual(shots(ordered.acts[0]).map(x => x.image), ['a', 'b']);
  });
});
