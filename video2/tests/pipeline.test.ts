import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, it} from 'node:test';
import {DIRECTOR_COMPONENTS, normalizePlan, parseTranscript, resolveAudioScript, selectedStages, syncIssues, validateCanvas, type DirectedPlan} from '../tools/pipeline-core';

describe('video pipeline core', () => {
  it('documents every implemented director component', () => {
    const registry = JSON.parse(readFileSync(new URL('../src/data/director-components.json', import.meta.url), 'utf8')) as {components: {name: string}[]};
    const contract = JSON.parse(readFileSync(new URL('../src/data/director-output-contract.json', import.meta.url), 'utf8')) as {properties: {scenes: {items: {properties: {component: {enum: string[]}}}}}};
    const documented = registry.components.map(component => component.name).concat('creative_clip').sort();
    assert.deepEqual(documented, [...DIRECTOR_COMPONENTS].sort());
    assert.deepEqual(contract.properties.scenes.items.properties.component.enum.sort(), [...DIRECTOR_COMPONENTS].sort());
    const renderer = readFileSync(new URL('../src/directed/DirectedEpisode.tsx', import.meta.url), 'utf8');
    for (const component of DIRECTOR_COMPONENTS) assert.match(renderer, new RegExp(`case ['"]${component}['"]`), `${component} is not rendered`);
  });

  it('parses speaker lines and timed pauses', () => {
    const turns = parseTranscript('# Lesson\nMaya: Start here.\n[pause 2.5]\nMarcus: Continue.\n[10-second pause]');
    assert.deepEqual(turns.map(t => [t.id, t.kind]), [['t00', 'speech'], ['t01', 'pause'], ['t02', 'speech'], ['t03', 'pause']]);
    assert.equal(turns[1].pauseSec, 2.5);
    assert.equal(turns[3].pauseSec, 10);
  });

  it('derives scene boundaries from measured TTS and requires complete coverage', () => {
    const turns = parseTranscript('Maya: One.\nMarcus: Two.\nMaya: Three.');
    const plan: DirectedPlan = {version: 1, episode: 'x', title: 'X', scenes: [
      {id: 'a', component: 'title', turnIds: ['t00'], props: {title: 'X'}},
      {id: 'b', component: 'causal_chain', turnIds: ['t01', 't02'], props: {nodes: ['A', 'B']}},
    ]};
    const out = normalizePlan(plan, turns, [0.25, 1.5, 3], [1, 1.25, 2]);
    assert.equal(out.scenes[0].startSec, 0.25);
    assert.equal(out.scenes[1].endSec, 5);
    assert.throws(() => normalizePlan({...plan, scenes: plan.scenes.slice(0, 1)}, turns, [0.25, 1.5, 3], [1, 1.25, 2]), /stops at turn/);
    assert.throws(() => normalizePlan({...plan, scenes: [
      {id: 'unsafe', component: 'ken_burns', turnIds: ['t00', 't01', 't02'], props: {image: 'https://remote/image.jpg'}},
    ]}, turns, [0.25, 1.5, 3], [1, 1.25, 2]), /safe public\/ relative path/);
    assert.throws(() => normalizePlan({...plan, scenes: [
      {id: 'reversed', component: 'title', turnIds: ['t01', 't00'], props: {title: 'X'}},
      {id: 'last', component: 'quote', turnIds: ['t02'], props: {quote: 'Three.'}},
    ]}, turns, [0.25, 1.5, 3], [1, 1.25, 2]), /unique and in transcript order/);
  });

  it('validates nested component props before accepting a director plan', () => {
    const turns = parseTranscript('Maya: Compare these.');
    assert.throws(() => normalizePlan({version: 1, episode: 'x', title: 'X', scenes: [
      {id: 'bad', component: 'compare', turnIds: ['t00'], props: {left: {head: 'A'}, right: {head: 'B', sections: []}}},
    ]}, turns, [0], [3], 3), /head and non-empty sections/);
  });

  it('stops at contact sheet unless full rendering is requested', () => {
    assert.deepEqual(selectedStages(undefined, undefined, false).at(-1), 'contact');
    assert.deepEqual(selectedStages(undefined, undefined, true).at(-1), 'render');
    assert.deepEqual(selectedStages('words', undefined, false), ['words']);
  });

  it('resolves the canonical shared audio script by episode id', () => {
    const root = new URL('../../audio_scripts', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]):)/, '$1:');
    const resolved = resolveAudioScript(root, 'u3e1');
    assert.match(resolved ?? '', /audio_scripts[\\/]unit3[\\/]apush-audio-u3-e1-script-v\d+-DRAFT\.md$/i);
  });

  it('rejects visual drift from the measured audio timeline', () => {
    const turns = parseTranscript('Maya: One.\nMarcus: Two.');
    const plan = normalizePlan({version: 1, episode: 'x', title: 'X', scenes: [
      {id: 'a', component: 'title', turnIds: ['t00'], props: {title: 'X'}},
      {id: 'b', component: 'quote', turnIds: ['t01'], props: {quote: 'Two.'}},
    ]}, turns, [0.25, 1.5], [1, 2], 4);
    assert.deepEqual(syncIssues(plan, turns, [0.25, 1.5], [1, 2], 4), []);
    plan.scenes[1].startSec! += 0.2;
    assert.match(syncIssues(plan, turns, [0.25, 1.5], [1, 2], 4).join('\n'), /visual gap\/overlap/);
  });

  it('validateCanvas passes a clean plan', () => {
    const plan: DirectedPlan = {version: 1, episode: 'x', title: 'X', scenes: [
      {id: 'a', component: 'title', turnIds: ['t00'], props: {title: 'Short'}, startSec: 0, endSec: 5},
      {id: 'b', component: 'ken_burns', turnIds: ['t01'], props: {image: 'x.jpg'}, startSec: 5, endSec: 15},
    ]};
    assert.deepEqual(validateCanvas(plan), []);
  });

  it('validateCanvas warns on long title', () => {
    const plan: DirectedPlan = {version: 1, episode: 'x', title: 'X', scenes: [
      {id: 'a', component: 'title', turnIds: ['t00'], props: {title: 'X'.repeat(100)}, startSec: 0, endSec: 5},
    ]};
    assert.match(validateCanvas(plan).join('\n'), /may overflow/);
  });

  it('validateCanvas warns on visual monotony', () => {
    const scenes = [];
    for (let i = 0; i < 5; i++) {
      scenes.push({id: `s${i}`, component: 'ken_burns' as const, turnIds: [`t0${i}`], props: {image: 'x.jpg'}, startSec: i * 5, endSec: i * 5 + 5});
    }
    const plan: DirectedPlan = {version: 1, episode: 'x', title: 'X', scenes};
    assert.match(validateCanvas(plan).join('\n'), /visual monotony/);
  });
});
