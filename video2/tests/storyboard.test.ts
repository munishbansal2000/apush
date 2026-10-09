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

describe('storyboard variety', () => {
  it('blocks what an act can fix itself (point cards, map runs, one view repeated) and only warns across acts', async () => {
    const {validateStoryAct, varietyWarnings} = await import('../tools/pipeline/storyboard-director');
    const t = parseTranscript('Maya: One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen.');
    const outline = {title: 't', thesis: 't', boxes: [], acts: [{title: 'a', purpose: 'p', turns: {from: 0, to: 0}}]};
    const point = (phrase: string) => ({kind: 'point', backdrop: 'b.jpg', bullets: [{text: 'x', at: {offset: 0}}], at: {phrase}, priority: 'essential'});
    const map = (phrase: string, view = 'map.atlantic-world') => ({kind: 'map', map: {view}, at: {phrase}, priority: 'essential'});
    const catalog = [{path: 'b.jpg', description: '', width: 3000, height: 2000, maxZoom: 1.6}];
    const issues = (visuals: unknown[]) => validateStoryAct({turns: [{turn: 0, visuals}]}, 0, outline, t, [16], catalog).issues.join('\n');
    assert.match(issues([point('one two'), map('three four'), point('five six'), map('seven eight'), point('nine ten')]), /3 point cards in this act/);
    assert.match(issues([point('one two'), point('three four')]), /two point cards in a row/);
    assert.match(issues([map('one two', 'a'), map('three four', 'b'), map('five six', 'c'), map('seven eight', 'd')]), /more than 3 maps in a row/);
    assert.match(issues([map('one two'), point('three four'), map('five six'), point('seven eight'), map('nine ten')]), /map view "map.atlantic-world" is used 3 times in this act/);
    const keys = turnKeys(t);
    const lesson = {episode: 'x', acts: [], turns: [{key: keys[0], index: 0, visuals: [map('one two'), map('three four', 'b'), map('five six'), map('seven eight', 'c'), map('nine ten'), map('eleven twelve', 'd'), map('thirteen fourteen')]}]} as unknown as Storyboard;
    assert.ok(varietyWarnings(lesson).some(w => /appears 4 times in the lesson/.test(w)), 'a lesson-wide view count is a warning, not a repair');
  });
});

describe('cues inside a visual', () => {
  it('a map move can cue on a phrase of the same line; a missing or earlier phrase is an issue', () => {
    const t = parseTranscript('Maya: Two centuries of colonies: New England, the middle colonies, the South.');
    const keys = turnKeys(t);
    const sb = (moves: unknown[]): Storyboard => ({episode: 'x', acts: [], turns: [{key: keys[0], index: 0, visuals: [{kind: 'map', map: {view: 'map.thirteen-colonies', moves}, at: {phrase: 'of colonies'}, priority: 'essential'}]}]});
    assert.deepEqual(checkStoryboard(sb([{at: {phrase: 'new england'}, to: 'new-england'}, {at: {offset: 2}, to: 'colonies'}]), t, [6]).issues, []);
    assert.match(checkStoryboard(sb([{at: {phrase: 'the west'}, to: 'x'}]), t, [6]).issues.join('\n'), /map moves 1: "the west" is not in the line/);
    assert.match(checkStoryboard(sb([{at: {phrase: 'two centuries'}, to: 'x'}]), t, [6]).issues.join('\n'), /spoken before the visual starts/);
  });
});
