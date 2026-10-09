import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {parseTranscript} from '../tools/pipeline-core';
import {assetsForAct, buildCatalog, type ActOutput, type Outline} from '../tools/pipeline/doc-director';
import {dropShortShots, fixActQuestions, fixPlanBudgets, questionBefore} from '../tools/pipeline/plan-fixups';

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

describe('plan fix-ups: lesson budgets', () => {
  const sizes = Object.fromEntries(['stamp', 'seal', 'press', 'tax', 'boston', 'riot'].map(n => [`historic/${n}.jpg`, {width: 3000, height: 2000}]));
  sizes['historic/small.jpg'] = {width: 2100, height: 1200};
  const catalog = buildCatalog(sizes, Object.fromEntries(Object.keys(sizes).map(p => [p, `Stamp Act ${p.split('/')[1]}`])));
  const outline = {title: 't', thesis: 't', boxes: [], acts: [{title: 'Stamp Act', purpose: 'stamp tax', turns: {from: 0, to: 0}}, {title: 'Riots', purpose: 'stamp riots', turns: {from: 0, to: 0}}]} as unknown as Outline;
  const im = (image: string, zoom = 1.2) => ({type: 'image_move', at: {turn: 0, phrase: 'x'}, image, from: {x: 0.5, y: 0.5, zoom: 1}, to: {x: 0.5, y: 0.4, zoom}});

  it('swaps uses past the image budget for the least-used relevant images, across acts', () => {
    const acts = [{shots: [1, 2, 3, 4].map(() => im('historic/stamp.jpg'))}, {shots: [1, 2, 3].map(() => im('historic/stamp.jpg'))}] as unknown as ActOutput[];
    const {acts: fixed, fixes} = fixPlanBudgets(acts, outline, turns, catalog, assetsForAct);
    const all = fixed.flatMap(a => shots(a).map(s => s.image as string));
    const count = (p: string) => all.filter(x => x === p).length;
    assert.equal(count('historic/stamp.jpg'), 4);
    assert.ok(all.every(p => count(p) <= 4));
    assert.equal(fixes.filter(f => /past its 4-use budget/.test(f)).length, 3);
  });

  it('turns repeated or excess custom explainers and clips into image shots, and clamps zoom', () => {
    const custom = (component: string) => ({type: 'custom', at: {turn: 0, phrase: 'x'}, component});
    const clip = {type: 'clip', at: {turn: 0, phrase: 'x'}, image: 'historic/riot.jpg', prompt: 'smoke drifts', focus: [0.4, 0.5]};
    const acts = [{shots: [custom('StampActTax'), custom('StampActTax'), clip, clip]}, {shots: [custom('BoycottPressure'), custom('TeaPartyHarbor'), clip, im('historic/small.jpg', 2.5)]}] as unknown as ActOutput[];
    const {acts: fixed} = fixPlanBudgets(acts, outline, turns, catalog, assetsForAct);
    const types = fixed.flatMap(a => shots(a).map(s => s.type));
    assert.equal(types.filter(t => t === 'custom').length, 2, 'two distinct explainers kept');
    assert.equal(types.filter(t => t === 'clip').length, 2, 'clip budget');
    const small = shots(fixed[1]).at(-1)!;
    const max = catalog.find(c => c.path === 'historic/small.jpg')!.maxZoom;
    assert.ok((small.to as {zoom: number}).zoom <= max, 'zoom within the image limit');
  });

  it('drops cuts the resolver reports as too short, never the first shot of an act or a question card', () => {
    const acts = [{shots: [im('a'), im('b'), im('c')]}, {shots: [im('d'), {type: 'question', at: {turn: 1}}]}] as unknown as ActOutput[];
    const message = 'shot plan invalid:\n  - shot02: 0.84s is shorter than 1.2s\n  - shot04: 0.5s is shorter than 1.2s\n  - shot05: 1.0s is shorter than 1.2s';
    const {acts: fixed, fixes} = dropShortShots(acts, message);
    assert.deepEqual(fixed.map(a => shots(a).length), [2, 2]);
    assert.equal(fixes.length, 1);
  });

  it('reserves portrait uses, fixes place ids without their prefix, frames clips within the zoom limit, drops out-of-order cuts', () => {
    const portrait = {type: 'portrait', at: {turn: 0, phrase: 'x'}, image: 'historic/seal.jpg', name: 'Seal', from: {x: 0.5, y: 0.3, zoom: 1}, to: {x: 0.5, y: 0.25, zoom: 1.2}};
    const map = {type: 'map', at: {turn: 0, phrase: 'x'}, view: 'map.test', points: [{at: {offset: 1}, place: 'fort-detroit'}], moves: [{at: {offset: 2}, to: 'fort-pitt'}]};
    const clip = {type: 'clip', at: {turn: 0, phrase: 'x'}, image: 'historic/small.jpg', prompt: 'smoke', focus: [0.5, 0.5]};
    // stamp.jpg is over budget; seal.jpg has 4 portraits coming, so it must not be picked as the swap.
    const acts = [{shots: [...[1, 2, 3, 4, 5].map(() => im('historic/stamp.jpg')), map, clip]}, {shots: [1, 2, 3, 4].map(() => portrait)}] as unknown as ActOutput[];
    const {acts: fixed} = fixPlanBudgets(acts, outline, turns, catalog, assetsForAct, undefined, new Set(['place.fort-detroit', 'place.fort-pitt']));
    const swapped = shots(fixed[0])[4].image;
    assert.notEqual(swapped, 'historic/seal.jpg', 'portrait image is reserved');
    assert.notEqual(swapped, 'historic/stamp.jpg');
    const m = shots(fixed[0])[5] as {points: {place: string}[]; moves: {to: string}[]};
    assert.equal(m.points[0].place, 'place.fort-detroit');
    assert.equal(m.moves[0].to, 'place.fort-pitt');
    const c = shots(fixed[0])[6] as {to: {zoom: number}};
    assert.ok(c.to.zoom <= catalog.find(e => e.path === 'historic/small.jpg')!.maxZoom);
    const ordered = dropShortShots([{shots: [im('a'), im('b'), im('c')]}] as unknown as ActOutput[], 'shot plan invalid:\n  - shot 3 starts at or before shot 2 (515.39s ≤ 518.42s)');
    assert.deepEqual(shots(ordered.acts[0]).map(x => x.image), ['a', 'b']);
  });
});
