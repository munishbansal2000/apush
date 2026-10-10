import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {GRAPHIC_NAMES, GRAPHICS, graphicIssues} from '../src/documentary/graphics-catalog';
import {parseTranscript} from '../tools/pipeline-core';
import {checkStoryboard, turnKeys, type Storyboard} from '../tools/pipeline/storyboard';

const root = new URL('..', import.meta.url).pathname;
const turns = parseTranscript('Maya: Parliament said it could tax anyone in the empire. The colonists answered that only their own assemblies could. That gap became a fight.\nMarcus: Short line.');
const durations = [12, 2];
const starts = [0.25, 12.43];
const timing = {starts, durations, totalSec: 15};
const compare = GRAPHICS.CompareSlide.example;

describe('graphics', () => {
  it('every catalog entry has a component and every example passes its own check', async () => {
    const src = readFileSync(join(root, 'src/documentary/views/graphic.tsx'), 'utf8');
    for (const name of GRAPHIC_NAMES) {
      assert.match(src, new RegExp(`\\b${name}\\b`), `${name} is not registered in views/graphic.tsx`);
      assert.deepEqual(graphicIssues(name, GRAPHICS[name].example), [], name);
    }
  });

  it('rejects unknown graphics, missing or overlong text, and phrases not copied from the passage', () => {
    assert.match(graphicIssues('Nope', {}).join(), /unknown graphic "Nope"/);
    assert.match(graphicIssues('QuoteSlide', {quote: 'x'.repeat(300)}).join(), /quote is 300 characters; at most 220/);
    assert.match(graphicIssues('HighlightSlide', {body: 'The act taxes paper.', highlights: [{text: 'stamps'}]}).join(), /copied exactly from body/);
    assert.match(graphicIssues('QuoteSlide', {quote: 'x'}, ['a beat']).join(), /takes no beats/);
  });

  it('the storyboard check reads a graphic: its data and its beats, which must be said in the line', () => {
    const keys = turnKeys(turns);
    const board = (beats: string[]): Storyboard => ({episode: 'x', acts: [], turns: [{key: keys[0], index: 0, visuals: [{kind: 'graphic', component: 'CompareSlide', props: compare, beats, at: {phrase: 'parliament said'}, priority: 'essential'}]}]});
    assert.deepEqual(checkStoryboard(board(['parliament said', 'the colonists answered']), turns, durations).issues, []);
    assert.match(checkStoryboard(board(['the king said']), turns, durations).issues.join(), /beat "the king said" is not in the line/);
  });

  it('the builder and the resolver carry a graphic through, its beats timed from the audio', async () => {
    const {buildPlan} = await import('../tools/pipeline/scene-builder');
    const {resolveShotPlan} = await import('../tools/pipeline/shots');
    const keys = turnKeys(turns);
    const sb = {episode: 'x', acts: [], turns: [{key: keys[0], index: 0, visuals: [{kind: 'graphic', component: 'CompareSlide', props: compare, beats: ['parliament said', 'the colonists answered'], at: {phrase: 'parliament said'}, priority: 'essential'}]}]} as never;
    const built = buildPlan({storyboard: sb, turns, timing, words: {}, catalog: [], treatments: {}, allowEstimated: true});
    const shot = built.plan.shots[0] as unknown as {type: string; beats: {turn: number; phrase: string}[]};
    assert.equal(shot.type, 'graphic');
    assert.equal(shot.beats.length, 2);
    const resolved = resolveShotPlan(built.plan, turns, timing, {}, {imageSizes: {}, allowEstimated: true});
    const g = resolved.shots[0] as unknown as {type: string; component: string; beatsSec: number[]};
    assert.equal(g.component, 'CompareSlide');
    assert.ok(g.beatsSec[0] < g.beatsSec[1], 'beats in order of speech');
  });

  it('the act prompt offers the graphics and says when to use them', async () => {
    const {storyboardPrompt} = await import('../tools/pipeline/storyboard-director');
    const outline = {title: 't', thesis: 't', boxes: [], acts: [{title: 'a', purpose: 'p', turns: {from: 0, to: 1}}]};
    const prompt = storyboardPrompt(0, outline, turns, durations, [], {geo: [], places: []});
    assert.match(prompt, /GRAPHICS \(name \| use it for/);
    for (const name of GRAPHIC_NAMES) assert.match(prompt, new RegExp(`^${name} \\|`, 'm'));
    assert.match(prompt, /Graphics carry the explaining/);
  });
});
