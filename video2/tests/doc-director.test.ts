import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {parseTranscript, type PipelineTurn} from '../tools/pipeline-core';
import {ACT_ASSET_LIMIT, assetsForAct, buildCatalog, customsForAct, materializeCoordinateObjects, validateOutline, type Outline} from '../tools/pipeline/doc-director';
import {directStoryboard, storyboardPrompt} from '../tools/pipeline/storyboard-director';

const root = new URL('..', import.meta.url).pathname;
// The cold open (u3e1 t00-t05, verbatim; t05 trimmed to its first sentence), with measured durations.
const turns = parseTranscript(readFileSync(join(root, 'tests/fixtures/u3e1-cold-open.txt'), 'utf8'));
const durations = [34.25, 21.46, 3.26, 5.76, 5.42, 3.4];
const starts = durations.reduce<number[]>((acc, _, i) => [...acc, i === 0 ? 0.25 : acc[i - 1] + durations[i - 1] + 0.18], []);
const timing = {starts, durations, totalSec: starts[5] + durations[5] + 0.6};
const outline: Outline = {
  title: 'Salutary Neglect, the Proclamation Line, and Pontiac', thesis: 'Britain won the war and wrecked the arrangement that made the empire work.',
  boxes: [
    {label: 'The end of salutary neglect', intro: {turn: 0, phrase: 'the end of salutary neglect'}, check: {turn: 4, phrase: 'let me guess'}, turns: {from: 1, to: 4}},
    {label: 'Pontiac', intro: {turn: 0, phrase: 'pontiacs rebellion'}, check: {turn: 5, phrase: 'from 1763'}, turns: {from: 5, to: 5}},
  ],
  acts: [{title: 'Cold open', purpose: 'Set up 1763 and the three boxes', turns: {from: 0, to: 0}}, {title: 'The bill', purpose: 'War debt and Grenville', turns: {from: 1, to: 5}}],
};
const catalog = buildCatalog({'historic/u3e1/paxton-boys.jpg': {width: 3770, height: 2678}, 'historic/u3e1/scene-london-1760s.jpg': {width: 4000, height: 2600}}, {});
const options = {imageSizes: {}, allowEstimated: true};
const maps = {geo: [], places: []};
const img = (image: string, phrase: string) => ({kind: 'image', image, at: {phrase}, priority: 'essential'});

describe('outline (shared by the storyboard director)', () => {
  it('rejects outlines with gaps and invented cues', () => {
    const gap = structuredClone(outline);
    gap.acts[1].turns.from = 2;
    assert.match(validateOutline(gap, turns, timing, {}, true).issues.join('\n'), /act 2: starts at turn 2, expected 1/);
    const invented = structuredClone(outline);
    invented.boxes[0].check = {turn: 4, phrase: 'box one, checked'};
    assert.match(validateOutline(invented, turns, timing, {}, true).issues.join('\n'), /does not say "box one, checked"/);
  });

  it('the catalog drops images too small for full-frame and caps zoom at the upscale limit', () => {
    const c = buildCatalog({'a.jpg': {width: 3000, height: 2000}, 'thumb.jpg': {width: 400, height: 300}}, {'a.jpg': 'A big painting'});
    assert.deepEqual(c.map(e => e.path), ['a.jpg']);
    assert.ok(c[0].maxZoom > 1.5 && c[0].maxZoom <= 2.6, `maxZoom ${c[0].maxZoom}`);
  });
});

describe('storyboard prompts', () => {
  const big = buildCatalog(Object.fromEntries([
    ...Array.from({length: 60}, (_, i) => [`historic/filler-${String(i).padStart(2, '0')}.jpg`, {width: 3000, height: 2000}]),
    ['historic/pontiac-council.jpg', {width: 3000, height: 2000}], ['historic/grenville.jpg', {width: 3000, height: 2000}],
  ]), {
    ...Object.fromEntries(Array.from({length: 60}, (_, i) => [`historic/filler-${String(i).padStart(2, '0')}.jpg`, `Harbor scene with ships and sailors, view ${i}`])),
    'historic/pontiac-council.jpg': 'Pontiac addresses the council of Ottawa leaders before the siege of Detroit',
    'historic/grenville.jpg': 'Portrait of George Grenville, prime minister',
  });

  it('offers each act at most ACT_ASSET_LIMIT images, the ones its narration talks about first', () => {
    const picked = assetsForAct(big, 'Pontiac gathers the Ottawa and strikes Detroit. The forts fall.');
    assert.ok(picked.length <= ACT_ASSET_LIMIT);
    assert.ok(picked.some(c => c.path === 'historic/pontiac-council.jpg'));
    assert.ok(!picked.some(c => c.path === 'historic/grenville.jpg'), 'an unrelated portrait is not offered');
    assert.equal(assetsForAct(big.slice(0, 10), 'anything').length, 10, 'a small catalog is offered whole');
    const prompt = storyboardPrompt(0, outline, turns, durations, big, maps);
    assert.ok((prompt.match(/^historic\//gm) ?? []).length <= ACT_ASSET_LIMIT);
  });

  it('offers a custom explainer only when the narration names its event', () => {
    assert.deepEqual(customsForAct('Then Pontiac moves on Detroit.').map(([n]) => n), ['PontiacFortsMap']);
    assert.deepEqual(customsForAct('London counts the money.'), []);
    assert.deepEqual(customsForAct('Stamp Act riots in Boston').map(([n]) => n), ['StampActTax']);
  });

  it('editing one line changes only the prompt of the act that contains it', () => {
    const edited: PipelineTurn[] = turns.map((t, i) => (i === 3 ? {...t, text: `${t.text} Edited.`} : t));
    assert.equal(storyboardPrompt(0, outline, turns, durations, catalog, maps), storyboardPrompt(0, outline, edited, durations, catalog, maps));
    assert.notEqual(storyboardPrompt(1, outline, turns, durations, catalog, maps), storyboardPrompt(1, outline, edited, durations, catalog, maps));
  });

  it('agent mode: every act prompt is handed out at once, and the run continues when the answers exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'v2-agent-'));
    const answers: Record<string, unknown> = {'doc-outline': outline};
    const io = {meta: (name: string) => {
      if (!(name in answers)) return null;
      writeFileSync(join(dir, `${name}.json`), JSON.stringify(answers[name]));
      return join(dir, `${name}.json`);
    }};
    const input = {episode: 'u3e1', turns, timing, words: {}, options, catalog, maps};
    assert.deepEqual(directStoryboard(io, input).pending, ['sb-act-01', 'sb-act-02'], 'both acts together, for parallel agents');
    Object.assign(answers, {
      'sb-act-01': {turns: [{turn: 0, visuals: [img('historic/u3e1/scene-london-1760s.jpg', 'last time')]}]},
      'sb-act-02': {turns: [{turn: 1, visuals: [img('historic/u3e1/paxton-boys.jpg', 'drowning in debt')]}]},
    });
    const done = directStoryboard(io, input);
    assert.ok(done.storyboard && !done.pending, JSON.stringify(done.log, null, 1));
  });
});

describe('coordinate transport', () => {
  it('turns object-shaped coordinates back into arrays anywhere in an answer (Meta UI deletes bare numeric arrays)', () => {
    const answer = {turns: [{turn: 3, visuals: [{kind: 'map', map: {extent: {southwest: {lon: -92, lat: 24}, northeast: {lon: -62, lat: 48}},
      labels: [{text: 'Quebec', lonlat: {lon: -71, lat: 48.3}}]}}, {kind: 'clip', focus: {x: 0.4, y: 0.6}}]}]};
    const out = materializeCoordinateObjects(answer) as {turns: {visuals: Record<string, unknown>[]}[]};
    const map = out.turns[0].visuals[0].map as {extent: unknown; labels: {lonlat: unknown}[]};
    assert.deepEqual(map.extent, [[-92, 24], [-62, 48]]);
    assert.deepEqual(map.labels[0].lonlat, [-71, 48.3]);
    assert.deepEqual(out.turns[0].visuals[1].focus, [0.4, 0.6]);
  });
});

describe('review helpers', () => {
  it('locate contact-sheet shots in acts and know when a plan is fully approved', async () => {
    const {locateShot, planApproved, openNotes} = await import('../tools/pipeline/review');
    const shots = [{at: {turn: 0}}, {at: {turn: 0}}, {at: {turn: 2}}, {at: {turn: 3}}];
    const acts = [{turns: {from: 0, to: 1}}, {turns: {from: 2, to: 5}}];
    assert.deepEqual(locateShot(shots, acts, 3), {act: 1, local: 1});
    assert.deepEqual(locateShot(shots, acts, 1), {act: 0, local: 1});
    const review = {plan: {acts: {'1': {status: 'approved' as const, at: 'x'}}, notes: {'2': [{text: 'a', at: 'x'}, {text: 'b', at: 'x', done: 'y'}]}}};
    assert.equal(planApproved(review, 2), false);
    assert.equal(planApproved({plan: {acts: {'1': {status: 'approved', at: 'x'}, '2': {status: 'approved', at: 'x'}}}}, 2), true);
    assert.deepEqual([...openNotes(review)].map(([a, n]) => [a, n.map(x => x.text)]), [[2, ['a']]]);
  });
});
