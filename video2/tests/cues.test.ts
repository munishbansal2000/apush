import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {parseTranscript} from '../tools/pipeline-core';
import {resolveBoxes, type PlanBox} from '../tools/pipeline/cues';

// Shaped like u3e1: boxes named up front, "Box one, done." mid-episode, "Checked." in the recap.
const turns = parseTranscript([
  'Maya: Three boxes on your sheet: salutary neglect, the Proclamation Line, and Pontiac.',
  'Marcus: Britain stopped looking away after the war.',
  'Maya: Box one, done. Now the line on the map.',
  'Marcus: The crown drew a line down the mountains.',
  'Maya: Then Pontiac struck the forts.',
  'Marcus: Checked. That is all three.',
].join('\n'));
const durations = [6, 4, 4, 4, 3, 3];
const starts = durations.reduce<number[]>((acc, _, i) => [...acc, i === 0 ? 0.25 : acc[i - 1] + durations[i - 1] + 0.18], []);
const timing = {starts, durations, totalSec: starts[5] + 3 + 0.6};
const words = Object.fromEntries(turns.map(t => [t.id, (t.text ?? '').toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).filter(Boolean).map((w, i) => ({w, s: i * 0.3, e: i * 0.3 + 0.25}))]));

const box = (label: string, intro: string, check: [number, string], from: number, to: number) =>
  ({label, intro: {turn: 0, phrase: intro}, check: {turn: check[0], phrase: check[1]}, turns: {from, to}});
const baseBoxes = (): PlanBox[] => [
  box('Salutary neglect', 'salutary neglect', [2, 'box one, done'], 1, 2),
  box('Proclamation Line', 'the Proclamation Line', [5, 'checked'], 3, 3),
  box("Pontiac's Rebellion", 'Pontiac', [5, 'checked'], 4, 5),
];

describe('Episode Sheet box cues', () => {
  it('resolves box intro/check/coverage times', () => {
    const [b1, b2, b3] = resolveBoxes(baseBoxes(), turns, timing, words, {requireBoxes: true});
    assert.ok(b1.introSec < b2.introSec && b2.introSec < b3.introSec, 'boxes are named in order during turn 0');
    assert.ok(Math.abs(b1.checkSec - (starts[2] + 0.6)) < 1e-9, '"box one, done" checks on "done"');
    assert.equal(b2.checkSec, b3.checkSec, 'one "Checked." can close two boxes');
    assert.equal(b1.startSec, starts[1]);
    assert.equal(b3.endSec, timing.totalSec);
  });

  it('rejects a check cue the narration never says', () => {
    const boxes = baseBoxes();
    boxes[0].check = {turn: 2, phrase: 'box one, checked'};
    assert.throws(() => resolveBoxes(boxes, turns, timing, words), /box 1 check: turn 2 \(t02\) does not say "box one, checked"/);
  });

  it('rejects a box checked before it is covered', () => {
    const boxes = baseBoxes();
    boxes[1].check = {turn: 2, phrase: 'box one, done'};
    assert.throws(() => resolveBoxes(boxes, turns, timing, words), /box 2: checked at .* before its coverage starts/);
  });

  it('rejects overlapping box ranges, over-long labels, and the wrong number of boxes', () => {
    const boxes = baseBoxes();
    boxes[1].turns = {from: 2, to: 3};
    boxes[2].label = 'X'.repeat(60);
    const message = (() => { try { resolveBoxes(boxes, turns, timing, words); return ''; } catch (e) { return (e as Error).message; } })();
    assert.match(message, /box 2: turns 2-3 overlap/);
    assert.match(message, /box 3: label .* longer than 48/);
    assert.throws(() => resolveBoxes(baseBoxes().slice(0, 1), turns, timing, words, {requireBoxes: true}), /needs 2-5 Episode Sheet boxes, got 1/);
  });
});
