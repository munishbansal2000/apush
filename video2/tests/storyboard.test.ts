import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {parseTranscript} from '../tools/pipeline-core';
import {checkStoryboard, turnKeys, type Storyboard} from '../tools/pipeline/storyboard';

const root = new URL('..', import.meta.url).pathname;
const script = readFileSync(join(root, 'tests/fixtures/u3e1-cold-open.txt'), 'utf8');
const turns = parseTranscript(script);
const durations = [34.25, 21.46, 3.26, 5.76, 5.42, 3.4];
// The cold open's storyboard (the hand sample's 15 visuals, keyed to these lines).
const fixture = (): Storyboard => JSON.parse(readFileSync(join(root, 'tests/fixtures/u3e1-cold-open.storyboard.json'), 'utf8'));

describe('storyboard (S1)', () => {
  it('keys turns by speaker + words, numbering repeated lines', () => {
    const t = parseTranscript('Maya: Checked.\nMarcus: Checked.\nMaya: [firm] Checked.\nMaya: Something else.');
    const keys = turnKeys(t);
    assert.equal(new Set(keys).size, 4);
    assert.match(keys[2], /#2$/, 'same speaker + same words (tags ignored) gets #2');
    assert.ok(!keys[1].includes('#'), 'a different speaker is a different line');
  });

  it('the cold-open storyboard checks clean: every visual anchored verbatim, unique and in order', () => {
    const sb = fixture();
    assert.equal(sb.turns.flatMap(t => t.visuals).length, 15);
    assert.ok(sb.turns.flatMap(t => t.visuals).some(v => v.name), 'portraits carry their name tag');
    assert.deepEqual(checkStoryboard(sb, turns, durations).issues, []);
  });

  it('after a script edit, only the changed turn loses its visuals; inserted lines shift nothing else', () => {
    const sb = fixture();
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

describe('storyboard custom explainers', () => {
  it('allows each explainer once per lesson and at most two in all, addressed by line', () => {
    const t = parseTranscript('Maya: The line was drawn along the mountains.\nMarcus: Pontiac struck the forts.\nMaya: The line again, drawn twice.\nMarcus: Then the stamps arrived.');
    const keys = turnKeys(t);
    const custom = (component: string, phrase: string) => ({kind: 'custom' as const, component, at: {phrase}, priority: 'essential' as const});
    const sb: Storyboard = {episode: 'x', acts: [], turns: [
      {key: keys[0], index: 0, visuals: [custom('ProclamationLineMap', 'the line was drawn')]},
      {key: keys[1], index: 1, visuals: [custom('PontiacFortsMap', 'pontiac struck')]},
      {key: keys[2], index: 2, visuals: [custom('ProclamationLineMap', 'the line again')]},
      {key: keys[3], index: 3, visuals: [custom('StampActTax', 'the stamps arrived')]},
    ]};
    const issues = checkStoryboard(sb, t, [3, 3, 3, 3]).issues.join('\n');
    assert.match(issues, /turn 2: custom explainer "ProclamationLineMap" is already used at turn 0/);
    assert.match(issues, /turn 3: custom explainer "StampActTax" is over the lesson budget/);
  });
});
