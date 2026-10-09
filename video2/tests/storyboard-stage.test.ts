import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {atomicJson, parseTranscript} from '../tools/pipeline-core';
import {storyboardDirectStage} from '../tools/pipeline/stages/storyboard';
import {loadLessonReview, saveLessonReview} from '../tools/pipeline/review';
import {fakeContext} from './helpers/fake-pipeline';

// Maps only: no lesson images, so nothing is written to the shared treatments library.
const script = [
  'Maya: Last time we crossed the Atlantic to London. This time the colonies push back.',
  'Marcus: The empire stretched from Canada to Florida, and the frontier ran past every map.',
  'Maya: Which one buys time?',
  '[10-second pause]',
  'Marcus: The line. Always the line, drawn along the mountains.',
].join('\n');
const map = (turn: number, phrase: string, view: string, extra = {}) => ({type: 'map', at: {turn, phrase}, view, ...extra});

describe('storyboard stage (S5): bootstrap, build, revise from notes, frozen when approved', () => {
  it('runs end to end on a fake pipeline', () => {
    const answers: Record<string, unknown> = {};
    const h = fakeContext({episode: 'u9e9', meta: name => {
      if (!(name in answers)) throw new Error(`unexpected Meta UI call: ${name}`);
      return answers[name];
    }});
    const turns = parseTranscript(script);
    const durations = [6, 7, 2, 10, 4];
    const starts = durations.reduce<number[]>((acc, _, i) => [...acc, i === 0 ? 0.25 : acc[i - 1] + durations[i - 1] + 0.18], []);
    atomicJson(join(h.ctx.dataDir, 'turns.json'), {turns});
    atomicJson(join(h.ctx.dataDir, 'timing_map.json'), {starts, durations, totalSec: starts[4] + durations[4] + 0.6});
    const acts = [{title: 'Atlantic', turns: {from: 0, to: 1}}, {title: 'The line', turns: {from: 2, to: 4}}];
    atomicJson(join(h.ctx.dataDir, 'shots.json'), {episode: 'u9e9', acts, years: [], shots: [
      map(0, 'last time', 'map.atlantic-world'), map(0, 'to london', 'map.atlantic-world', {moves: [{at: {offset: 1}, to: 'london'}]}),
      map(1, 'the empire stretched', 'map.north-america-1763'), map(4, 'the line', 'map.eastern-frontier-1763'),
    ]});

    // Run 1: storyboard bootstrapped from the existing plan, then a plan built from it (question card added).
    storyboardDirectStage(h.ctx, {allowEstimated: true});
    const sb = JSON.parse(readFileSync(join(h.ctx.dataDir, 'storyboard.json'), 'utf8'));
    assert.equal(sb.turns.reduce((n: number, t: {visuals: unknown[]}) => n + t.visuals.length, 0), 4);
    const plan1 = JSON.parse(readFileSync(join(h.ctx.dataDir, 'shots.json'), 'utf8'));
    assert.deepEqual(plan1.acts, acts);
    assert.ok(plan1.shots.some((s: {type: string; question?: string}) => s.type === 'question' && s.question === 'Which one buys time?'));
    assert.equal(h.metaCalls.length, 0, 'no LLM calls: the director\'s plan was kept');

    // Run 2: a reviewer note on act 2 re-boards only act 2; the note is marked done.
    const review = loadLessonReview('u9e9', join(h.root, 'data'));
    review.storyboard = {notes: {'2': [{text: 'turn 4: zoom on the Appalachian crest instead', at: 'now'}]}};
    saveLessonReview('u9e9', review, join(h.root, 'data'));
    answers['sb-act-02-revise-1'] = {turns: [{turn: 4, visuals: [{kind: 'map', map: {view: 'map.eastern-frontier-1763', moves: [{at: {offset: 0.5}, to: 'frontier'}]}, at: {phrase: 'drawn along the mountains'}, priority: 'essential'}]}]};
    storyboardDirectStage(h.ctx, {allowEstimated: true});
    assert.deepEqual(h.metaCalls.map(c => c.name), ['sb-act-02-revise-1']);
    const after = loadLessonReview('u9e9', join(h.root, 'data'));
    assert.ok(after.storyboard?.notes?.['2'][0].done, 'note done');
    const plan2 = JSON.parse(readFileSync(join(h.ctx.dataDir, 'shots.json'), 'utf8'));
    assert.ok(plan2.shots.some((s: {at: {phrase?: string}}) => s.at.phrase === 'drawn along the mountains'));
    assert.ok(plan2.shots.some((s: {at: {phrase?: string}}) => s.at.phrase === 'last time'), 'act 1 kept');

    // Run 3: plan approved -> frozen, even when the storyboard changes.
    after.plan = {acts: {'1': {status: 'approved', at: 'now'}, '2': {status: 'approved', at: 'now'}}};
    saveLessonReview('u9e9', after, join(h.root, 'data'));
    const edited = JSON.parse(readFileSync(join(h.ctx.dataDir, 'storyboard.json'), 'utf8'));
    edited.turns[1].visuals = [];
    writeFileSync(join(h.ctx.dataDir, 'storyboard.json'), JSON.stringify(edited));
    storyboardDirectStage(h.ctx, {allowEstimated: true});
    assert.deepEqual(JSON.parse(readFileSync(join(h.ctx.dataDir, 'shots.json'), 'utf8')).shots, plan2.shots, 'approved plan unchanged');
  });
});
