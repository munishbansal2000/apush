import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {parseTranscript} from '../tools/pipeline-core';
import type {ShotPlan} from '../tools/pipeline/shots';
import {bootstrapStoryboard, checkStoryboard, turnKeys, type Storyboard} from '../tools/pipeline/storyboard';

const root = new URL('..', import.meta.url).pathname;
const script = readFileSync(join(root, 'tests/fixtures/u3e1-cold-open.txt'), 'utf8');
const turns = parseTranscript(script);
const durations = [34.25, 21.46, 3.26, 5.76, 5.42, 3.4];
const sample = JSON.parse(readFileSync(join(root, 'data/u3e1/shots.sample.json'), 'utf8')) as ShotPlan;
const acts = [{title: 'Cold open', turns: {from: 0, to: 0}}, {title: 'The bill', turns: {from: 1, to: 5}}];

describe('storyboard (S1)', () => {
  it('keys turns by speaker + words, numbering repeated lines', () => {
    const t = parseTranscript('Maya: Checked.\nMarcus: Checked.\nMaya: [firm] Checked.\nMaya: Something else.');
    const keys = turnKeys(t);
    assert.equal(new Set(keys).size, 4);
    assert.match(keys[2], /#2$/, 'same speaker + same words (tags ignored) gets #2');
    assert.ok(!keys[1].includes('#'), 'a different speaker is a different line');
  });

  it('bootstraps from an existing plan with every non-question shot as a visual on its anchor turn, and checks clean', () => {
    const sb = bootstrapStoryboard(sample, turns, acts);
    const visuals = sb.turns.flatMap(t => t.visuals);
    assert.equal(visuals.length, sample.shots.filter(s => s.type !== 'question').length);
    assert.deepEqual([...new Set(visuals.map(v => v.kind))].sort(), ['clip', 'image', 'map', 'point'].filter(k => visuals.some(v => v.kind === k)).sort());
    const portrait = visuals.find(v => v.framing === 'portrait');
    assert.ok(portrait?.name, 'portraits keep their name tag');
    const c = checkStoryboard(sb, turns, durations);
    assert.deepEqual(c.issues, []);
  });

  it('after a script edit, only the changed turn loses its visuals; inserted lines shift nothing else', () => {
    const sb = bootstrapStoryboard(sample, turns, acts);
    const edited = parseTranscript(script.replace('George Grenville. Prime minister from 1763.', 'George Grenville became prime minister in 1763.').replace(/^(Maya: And now)/m, 'Marcus: An inserted line.\n$1'));
    const c = checkStoryboard(sb, edited, [...durations, 3]);
    const stale = c.issues.filter(i => /line changed or was removed/.test(i));
    assert.equal(stale.length, 1, c.issues.join('\n'));
    assert.match(stale[0], /grenville|turn 5/i);
  });

  it('flags missing, ambiguous and out-of-order anchors, over-used images, and thin long turns', () => {
    const t = parseTranscript('Maya: The line held. The line broke. Then the war came, and London paid for every mile of it.\nMarcus: Short.');
    const keys = turnKeys(t);
    const img = (image: string, phrase: string) => ({kind: 'image' as const, image, at: {phrase}, priority: 'essential' as const});
    const sb: Storyboard = {episode: 'x', acts: [], turns: [
      {key: keys[0], index: 0, visuals: [img('a.jpg', 'the war came'), img('a.jpg', 'the line'), img('a.jpg', 'not said here'), img('a.jpg', 'london paid'), img('a.jpg', 'every mile')]},
      {key: keys[1], index: 1, visuals: []},
    ]};
    const c = checkStoryboard(sb, t, [30, 1]);
    const all = c.issues.join('\n');
    assert.match(all, /"the line" appears 2 times/);
    assert.match(all, /"not said here" is not in the line/);
    assert.match(all, /lands before the previous visual/);
    assert.match(all, /"a.jpg" is used 5 times; max 4/);
    const thin = checkStoryboard({...sb, turns: [{key: keys[0], index: 0, visuals: [img('b.jpg', 'the war came')]}, sb.turns[1]]}, t, [30, 1]);
    assert.match(thin.warnings.join('\n'), /turn 0 \(30s\): 1 visual\(s\); a line this long needs about 3/);
  });
});
