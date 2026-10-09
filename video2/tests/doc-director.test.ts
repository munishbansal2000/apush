import assert from 'node:assert/strict';
import {mkdtempSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {parseTranscript, type PipelineTurn} from '../tools/pipeline-core';
import {ACT_ASSET_LIMIT, actPrompt, assetsForAct, buildCatalog, customsForAct, directDocumentary, validateOutline, type Outline} from '../tools/pipeline/doc-director';
import type {GeoFeature, PlanShot, ShotPlan} from '../tools/pipeline/shots';

const root = new URL('..', import.meta.url).pathname;
const sample = JSON.parse(readFileSync(join(root, 'data/u3e1/shots.sample.json'), 'utf8')) as ShotPlan & {shots: PlanShot[]};
// The cold open (u3e1 t00-t05, verbatim; t05 trimmed to its first sentence, where the sample ends), with measured durations.
const script = readFileSync(join(root, 'tests/fixtures/u3e1-cold-open.txt'), 'utf8');
const turns = parseTranscript(script);
const durations = [34.25, 21.46, 3.26, 5.76, 5.42, 3.4];
const starts = durations.reduce<number[]>((acc, _, i) => [...acc, i === 0 ? 0.25 : acc[i - 1] + durations[i - 1] + 0.18], []);
const timing = {starts, durations, totalSec: starts[5] + durations[5] + 0.6};
const sizes = {
  'historic/u3e1/french-indian-war.jpg': {width: 1280, height: 869}, 'historic/u3e1/george-grenville-portrait.jpg': {width: 2322, height: 2902},
  'historic/u3e1/paxton-boys.jpg': {width: 3770, height: 2678}, 'historic/u3e1/proclamation-line-map.jpg': {width: 1900, height: 2340},
  'historic/u3e1/edmund-burke-1769.jpg': {width: 3840, height: 4685},
};
const geoDir = join(root, 'data/library/geo');
const geo = Object.fromEntries(readdirSync(geoDir).map(f => JSON.parse(readFileSync(join(geoDir, f), 'utf8')) as GeoFeature).map(f => [f.properties.id, f]));
const places = Object.fromEntries((JSON.parse(readFileSync(join(root, 'data/library/entities/places.json'), 'utf8')) as {id: string; name: string; location: [number, number]}[]).map(p => [p.id, p]));
const options = {imageSizes: sizes, imageShas: Object.fromEntries(Object.keys(sizes).map(k => [k, 'a'.repeat(64)])), geo, places, allowEstimated: true, allowUnapproved: true};
// Boxes check later in the full episode; this six-turn excerpt checks box 1 on its own last turn.
const outline: Outline = {
  title: 'Salutary Neglect, the Proclamation Line, and Pontiac', thesis: 'Britain won the war and wrecked the arrangement that made the empire work.',
  boxes: [
    {label: 'The end of salutary neglect', intro: {turn: 0, phrase: 'the end of salutary neglect'}, check: {turn: 5, phrase: 'prime minister from 1763'}, turns: {from: 1, to: 5}},
    {label: 'The Proclamation Line of 1763', intro: {turn: 0, phrase: 'the proclamation line of 1763'}, check: {turn: 5, phrase: 'from 1763'}, turns: {from: 5, to: 5}},
  ].slice(0, 1).concat([{label: 'Pontiac', intro: {turn: 0, phrase: 'pontiacs rebellion'}, check: {turn: 5, phrase: 'from 1763'}, turns: {from: 5, to: 5}}]),
  acts: [{title: 'Cold open', purpose: 'Set up 1763 and the three boxes', turns: {from: 0, to: 0}}, {title: 'The bill', purpose: 'War debt and Grenville', turns: {from: 1, to: 5}}],
};
// Fix the overlapping box spans of the excerpt: box 1 covers 1-4, box 3 covers 5.
outline.boxes[0].turns = {from: 1, to: 4};
outline.boxes[0].check = {turn: 4, phrase: 'let me guess'};
const act1 = {shots: sample.shots.filter(s => s.at.turn === 0), years: sample.years};
const act2 = {shots: sample.shots.filter(s => s.at.turn >= 1)};
const catalog = buildCatalog(sizes, {});
const maps = {geo: Object.values(geo).map(g => ({id: g.properties.id, name: g.properties.id, type: 'x', precision: g.properties.precision})), places: Object.values(places).map(p => ({id: p.id, name: p.name}))};

function fakeIO(answers: Record<string, unknown>) {
  const dir = mkdtempSync(join(tmpdir(), 'v2-director-'));
  const calls: string[] = [];
  return {calls, io: {meta: (name: string) => {
    calls.push(name);
    if (!(name in answers)) throw new Error(`unexpected LLM call ${name}`);
    const path = join(dir, `${name}.json`);
    writeFileSync(path, JSON.stringify(answers[name]));
    return path;
  }}};
}

describe('documentary director', () => {
  it('outline -> acts -> a plan the resolver accepts (the hand sample, split into acts)', () => {
    const {io, calls} = fakeIO({'doc-outline': outline, 'doc-act-01': act1, 'doc-act-02': act2});
    const r = directDocumentary(io, {episode: 'u3e1', turns, timing, words: {}, options, catalog, maps});
    assert.ok(r.plan, `director failed:\n${JSON.stringify(r.log, null, 1)}`);
    assert.equal(r.plan!.shots.length, sample.shots.length);
    assert.deepEqual(calls, ['doc-outline', 'doc-act-01', 'doc-act-02']);
  });

  it('re-asks only the act that failed', () => {
    const broken = {shots: act2.shots.map((s, i) => (i === 1 ? {...s, at: {turn: s.at.turn, phrase: 'words nobody said'}} : s))};
    const {io, calls} = fakeIO({'doc-outline': outline, 'doc-act-01': act1, 'doc-act-02': broken, 'doc-act-02-repair-1': act2});
    const r = directDocumentary(io, {episode: 'u3e1', turns, timing, words: {}, options, catalog, maps});
    assert.ok(r.plan, JSON.stringify(r.log, null, 1));
    assert.deepEqual(calls, ['doc-outline', 'doc-act-01', 'doc-act-02', 'doc-act-02-repair-1']);
    assert.match(r.log.find(l => l.stage.startsWith('assembled (attempt 1)'))!.issues.join('\n'), /does not say "words nobody said"/);
  });

  it('editing one line changes only the prompt of the act that contains it', () => {
    const edited: PipelineTurn[] = turns.map((t, i) => (i === 3 ? {...t, text: `${t.text} Edited.`} : t));
    assert.equal(actPrompt(0, outline, turns, durations, catalog, maps), actPrompt(0, outline, edited, durations, catalog, maps));
    assert.notEqual(actPrompt(1, outline, turns, durations, catalog, maps), actPrompt(1, outline, edited, durations, catalog, maps));
  });

  it('rejects outlines with gaps, out-of-order checks, and invented cues', () => {
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

  it('agent mode: returns every pending act prompt at once, then continues when the answers exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'v2-agent-'));
    const answers: Record<string, unknown> = {'doc-outline': outline};
    const asked: string[] = [];
    const io = {meta: (name: string) => {
      asked.push(name);
      if (!(name in answers)) return null;
      const path = join(dir, `${name}.json`);
      writeFileSync(path, JSON.stringify(answers[name]));
      return path;
    }};
    const first = directDocumentary(io, {episode: 'u3e1', turns, timing, words: {}, options, catalog, maps});
    assert.deepEqual(first.pending, ['doc-act-01', 'doc-act-02'], 'both acts handed out together for parallel agents');
    Object.assign(answers, {'doc-act-01': act1, 'doc-act-02': act2});
    const second = directDocumentary(io, {episode: 'u3e1', turns, timing, words: {}, options, catalog, maps});
    assert.ok(second.plan && !second.pending);
  });
});

describe('act prompt size: per-act images and custom explainers', () => {
  const big = buildCatalog(Object.fromEntries([
    ...Array.from({length: 60}, (_, i) => [`historic/filler-${String(i).padStart(2, '0')}.jpg`, {width: 3000, height: 2000}]),
    ['historic/pontiac-council.jpg', {width: 3000, height: 2000}], ['historic/grenville.jpg', {width: 3000, height: 2000}],
  ]), {
    ...Object.fromEntries(Array.from({length: 60}, (_, i) => [`historic/filler-${String(i).padStart(2, '0')}.jpg`, `Harbor scene with ships and sailors, view ${i}`])),
    'historic/pontiac-council.jpg': 'Pontiac addresses the council of Ottawa leaders before the siege of Detroit',
    'historic/grenville.jpg': 'Portrait of George Grenville, prime minister',
  });

  it('offers at most ACT_ASSET_LIMIT images, the ones the act talks about first', () => {
    const picked = assetsForAct(big, 'Pontiac gathers the Ottawa and strikes Detroit. The forts fall.');
    assert.ok(picked.length <= ACT_ASSET_LIMIT);
    assert.ok(picked.some(c => c.path === 'historic/pontiac-council.jpg'));
    assert.ok(!picked.some(c => c.path === 'historic/grenville.jpg'), 'an unrelated portrait is not offered');
    assert.equal(assetsForAct(big.slice(0, 10), 'anything').length, 10, 'a small catalog is offered whole');
  });

  it('offers a custom explainer only when the narration names its event', () => {
    assert.deepEqual(customsForAct('Then Pontiac moves on Detroit.').map(([n]) => n), ['PontiacFortsMap']);
    assert.deepEqual(customsForAct('London counts the money.'), []);
    assert.deepEqual(customsForAct('Stamp Act riots in Boston').map(([n]) => n), ['StampActTax']);
  });

  it('keeps an act prompt small with a large catalog', () => {
    const prompt = actPrompt(0, outline, turns, durations, big, maps);
    assert.ok((prompt.match(/^historic\//gm) ?? []).length <= ACT_ASSET_LIMIT);
    assert.ok(!/CUSTOM EXPLAINERS/.test(prompt) || /PontiacFortsMap/.test(prompt));
  });
});
