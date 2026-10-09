import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {parseTranscript, type DirectedPlan} from '../tools/pipeline-core';
import {resolvePlanCues} from '../tools/pipeline/cues';

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
const basePlan = (): DirectedPlan => ({version: 1, episode: 'x', title: 'X', boxes: [
  box('Salutary neglect', 'salutary neglect', [2, 'box one, done'], 1, 2),
  box('Proclamation Line', 'the Proclamation Line', [5, 'checked'], 3, 3),
  box("Pontiac's Rebellion", 'Pontiac', [5, 'checked'], 4, 5),
], scenes: [
  {id: 's0', component: 'title', turnIds: ['t00'], props: {title: 'X'}},
  {id: 's1', component: 'causal_chain', turnIds: ['t01', 't02'], props: {nodes: ['War debt', 'New rules']}, reveals: [{turn: 1, phrase: 'after the war'}, {turn: 2, phrase: 'box one'}]},
  {id: 's2', component: 'stagger', turnIds: ['t03', 't04', 't05'], props: {panels: [{image: 'a.jpg'}, {image: 'b.jpg'}]}, reveals: [{turn: 3, phrase: 'drew a line'}, {turn: 4, phrase: 'struck the forts'}]},
]});

describe('plan cues', () => {
  it('resolves box intro/check/coverage times and per-item reveal times', () => {
    const plan = resolvePlanCues(basePlan(), turns, timing, words, {requireBoxes: true, requireReveals: true});
    const [b1, b2, b3] = plan.boxes!;
    assert.ok(b1.introSec! < b2.introSec! && b2.introSec! < b3.introSec!, 'boxes are named in order during turn 0');
    assert.ok(Math.abs(b1.checkSec! - (starts[2] + 0.6)) < 1e-9, '"box one, done" checks on "done"');
    assert.equal(b2.checkSec, b3.checkSec, 'one "Checked." can close two boxes');
    assert.equal(b1.startSec, starts[1]);
    assert.equal(b3.endSec, timing.totalSec);
    assert.deepEqual(plan.scenes[1].revealSec!.map(s => s > 0), [true, true]);
    assert.ok(plan.scenes[2].revealSec![0] < plan.scenes[2].revealSec![1]);
  });

  it('rejects a check cue the narration never says', () => {
    const plan = basePlan();
    plan.boxes![0].check = {turn: 2, phrase: 'box one, checked'};
    assert.throws(() => resolvePlanCues(plan, turns, timing, words), /box 1 check: turn 2 \(t02\) does not say "box one, checked"/);
  });

  it('rejects a box checked before it is covered, and checks out of order', () => {
    const plan = basePlan();
    plan.boxes![1].check = {turn: 2, phrase: 'box one, done'};
    assert.throws(() => resolvePlanCues(plan, turns, timing, words), /box 2: checked at .* before its coverage starts/);
  });

  it('rejects overlapping box ranges and over-long labels', () => {
    const plan = basePlan();
    plan.boxes![1].turns = {from: 2, to: 3};
    plan.boxes![2].label = 'X'.repeat(60);
    const message = (() => { try { resolvePlanCues(plan, turns, timing, words); return ''; } catch (e) { return (e as Error).message; } })();
    assert.match(message, /box 2: turns 2-3 overlap/);
    assert.match(message, /box 3: label .* longer than 48/);
  });

  it('requires one reveal per item, inside the scene, in order', () => {
    const missing = basePlan();
    delete missing.scenes[2].reveals;
    assert.throws(() => resolvePlanCues(missing, turns, timing, words, {requireReveals: true}), /s2: stagger needs 2 reveal cues/);
    const outside = basePlan();
    outside.scenes[1].reveals![1] = {turn: 4, phrase: 'struck the forts'};
    assert.throws(() => resolvePlanCues(outside, turns, timing, words), /s1 reveal 2: turn 4 is outside the scene's turns/);
    const reversed = basePlan();
    reversed.scenes[2].reveals = [{turn: 4, phrase: 'struck the forts'}, {turn: 3, phrase: 'drew a line'}];
    assert.throws(() => resolvePlanCues(reversed, turns, timing, words), /s2 reveal 2: cue comes before/);
    const wrongCount = basePlan();
    wrongCount.scenes[1].reveals = [{turn: 1, phrase: 'after the war'}];
    assert.throws(() => resolvePlanCues(wrongCount, turns, timing, words), /1 reveal cues for 2 items/);
  });
});
