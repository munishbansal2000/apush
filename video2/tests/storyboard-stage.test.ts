import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {atomicJson, parseTranscript} from '../tools/pipeline-core';
import {buildStage, storyboardStage} from '../tools/pipeline/stages/storyboard';
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
const outline = {
  title: 'The line', thesis: 'London drew a line to save money.',
  boxes: [
    {label: 'The empire', intro: {turn: 0, phrase: 'the colonies push back'}, check: {turn: 1, phrase: 'past every map'}, turns: {from: 1, to: 1}},
    {label: 'The line', intro: {turn: 0, phrase: 'crossed the atlantic'}, check: {turn: 4, phrase: 'drawn along the mountains'}, turns: {from: 4, to: 4}},
  ],
  acts: [{title: 'Atlantic', purpose: 'Where we are', turns: {from: 0, to: 1}}, {title: 'The line', purpose: 'The answer', turns: {from: 2, to: 4}}],
};
const map = (view: string, phrase: string, extra = {}) => ({kind: 'map', map: {view, ...extra}, at: {phrase}, priority: 'essential'});

describe('storyboard and build stages: script -> storyboard -> plan, revisions, freezing', () => {
  it('runs end to end on a fake pipeline', () => {
    const answers: Record<string, unknown> = {
      'doc-outline': outline,
      'sb-act-01': {turns: [
        {turn: 0, visuals: [map('map.atlantic-world', 'last time'), map('map.atlantic-world', 'to london', {moves: [{at: {offset: 1}, to: 'london'}]})]},
        {turn: 1, visuals: [map('map.north-america-1763', 'the empire stretched')]},
      ]},
      'sb-act-02': {turns: [{turn: 4, visuals: [map('map.eastern-frontier-1763', 'the line always')]}]},
    };
    const h = fakeContext({episode: 'u9e9', meta: name => {
      if (!(name in answers)) throw new Error(`unexpected Meta UI call: ${name}`);
      return answers[name];
    }});
    h.ctx.estimateWords = true;
    const turns = parseTranscript(script);
    const durations = [6, 7, 2, 10, 4];
    const starts = durations.reduce<number[]>((acc, _, i) => [...acc, i === 0 ? 0.25 : acc[i - 1] + durations[i - 1] + 0.18], []);
    atomicJson(join(h.ctx.dataDir, 'turns.json'), {turns});
    atomicJson(join(h.ctx.dataDir, 'timing_map.json'), {starts, durations, totalSec: starts[4] + durations[4] + 0.6});
    const plan = () => JSON.parse(readFileSync(join(h.ctx.dataDir, 'shots.json'), 'utf8'));

    // Storyboard from the script (outline, then one prompt per act), then the build.
    storyboardStage(h.ctx);
    assert.deepEqual(h.metaCalls.map(c => c.name), ['doc-outline', 'sb-act-01', 'sb-act-02']);
    const sb = JSON.parse(readFileSync(join(h.ctx.dataDir, 'storyboard.json'), 'utf8'));
    assert.equal(sb.acts.length, 2);
    assert.ok(!existsSync(join(h.ctx.dataDir, 'shots.json')), 'no plan before the build stage');
    buildStage(h.ctx);
    const plan1 = plan();
    assert.deepEqual(plan1.acts, sb.acts);
    assert.ok(plan1.shots.some((s: {type: string; question?: string}) => s.type === 'question' && s.question === 'Which one buys time?'));

    // A review note on act 2 re-boards only act 2; the note is marked done; the build follows.
    const review = loadLessonReview('u9e9', join(h.root, 'data'));
    review.storyboard = {notes: {'2': [{text: 'turn 4: land on the mountains instead', at: 'now'}]}};
    saveLessonReview('u9e9', review, join(h.root, 'data'));
    answers['sb-act-02-revise-1'] = {turns: [{turn: 4, visuals: [map('map.eastern-frontier-1763', 'drawn along the mountains', {moves: [{at: {offset: 0.5}, to: 'frontier'}]})]}]};
    storyboardStage(h.ctx);
    assert.deepEqual(h.metaCalls.map(c => c.name).slice(3), ['sb-act-02-revise-1']);
    assert.ok(loadLessonReview('u9e9', join(h.root, 'data')).storyboard?.notes?.['2'][0].done, 'note done');
    buildStage(h.ctx);
    const plan2 = plan();
    assert.ok(plan2.shots.some((s: {at: {phrase?: string}}) => s.at.phrase === 'drawn along the mountains'));
    assert.ok(plan2.shots.some((s: {at: {phrase?: string}}) => s.at.phrase === 'last time'), 'act 1 kept');

    // A replaced shots.json (checkout, hand edit) is rebuilt; an approved plan is frozen.
    writeFileSync(join(h.ctx.dataDir, 'shots.json'), JSON.stringify({episode: 'u9e9', shots: []}));
    buildStage(h.ctx);
    assert.deepEqual(plan().shots, plan2.shots, 'rebuilt from the storyboard');
    const approved = loadLessonReview('u9e9', join(h.root, 'data'));
    approved.plan = {acts: {'1': {status: 'approved', at: 'now'}, '2': {status: 'approved', at: 'now'}}};
    saveLessonReview('u9e9', approved, join(h.root, 'data'));
    const edited = JSON.parse(readFileSync(join(h.ctx.dataDir, 'storyboard.json'), 'utf8'));
    edited.turns[1].visuals = [];
    writeFileSync(join(h.ctx.dataDir, 'storyboard.json'), JSON.stringify(edited));
    buildStage(h.ctx);
    assert.deepEqual(plan().shots, plan2.shots, 'approved plan unchanged');
  });
});
