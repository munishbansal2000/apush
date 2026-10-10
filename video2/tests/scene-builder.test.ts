import assert from 'node:assert/strict';
import {cleanSpeech} from '../tools/pipeline/speech';
import {mkdtempSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {parseTranscript} from '../tools/pipeline-core';
import {buildCatalog, type Outline} from '../tools/pipeline/doc-director';
import {applyEdits} from '../tools/pipeline/editor-pass';
import {buildPlan, uniquePhrase} from '../tools/pipeline/scene-builder';
import {resolveShotPlan, type GeoFeature, type ShotPlan} from '../tools/pipeline/shots';
import {turnKeys, type Storyboard} from '../tools/pipeline/storyboard';
import {directStoryboard} from '../tools/pipeline/storyboard-director';
import {imageKind, moveOf, proposeTreatment, safeFocus} from '../tools/pipeline/treatments';

const root = new URL('..', import.meta.url).pathname;
const turns = parseTranscript(readFileSync(join(root, 'tests/fixtures/u3e1-cold-open.txt'), 'utf8'));
const durations = [34.25, 21.46, 3.26, 5.76, 5.42, 3.4];
const starts = durations.reduce<number[]>((acc, _, i) => [...acc, i === 0 ? 0.25 : acc[i - 1] + durations[i - 1] + 0.18], []);
const timing = {starts, durations, totalSec: starts[5] + durations[5] + 0.6};
const sizes = {
  'historic/u3e1/french-indian-war.jpg': {width: 1280, height: 869}, 'historic/u3e1/george-grenville-portrait.jpg': {width: 2322, height: 2902},
  'historic/u3e1/paxton-boys.jpg': {width: 3770, height: 2678}, 'historic/u3e1/proclamation-line-map.jpg': {width: 1900, height: 2340},
  'historic/u3e1/edmund-burke-1769.jpg': {width: 3840, height: 4685}, 'historic/u3e1/scene-london-1760s.jpg': {width: 4000, height: 2600},
};
const descriptions = {'historic/u3e1/george-grenville-portrait.jpg': 'Portrait of George Grenville', 'historic/u3e1/proclamation-line-map.jpg': 'Map of the Proclamation Line',
  'historic/u3e1/scene-london-1760s.jpg': 'London street scene, 1760s', 'historic/u3e1/paxton-boys.jpg': 'The Paxton Boys march'};
const catalog = buildCatalog(sizes, descriptions);
const geoDir = join(root, 'data/library/geo');
const geo = Object.fromEntries(readdirSync(geoDir).map(f => JSON.parse(readFileSync(join(geoDir, f), 'utf8')) as GeoFeature).map(f => [f.properties.id, f]));
const places = Object.fromEntries((JSON.parse(readFileSync(join(root, 'data/library/entities/places.json'), 'utf8')) as {id: string; name: string; location: [number, number]}[]).map(p => [p.id, p]));
const options = {imageSizes: sizes, imageShas: Object.fromEntries(Object.keys(sizes).map(k => [k, 'a'.repeat(64)])), geo, places, allowEstimated: true, allowUnapproved: true};
const fixture = (): Storyboard => JSON.parse(readFileSync(join(root, 'tests/fixtures/u3e1-cold-open.storyboard.json'), 'utf8'));
const acts = [{title: 'Cold open', purpose: 'p', turns: {from: 0, to: 0}}, {title: 'The bill', purpose: 'p', turns: {from: 1, to: 5}}];
const keys = turnKeys(turns);
const img = (image: string, phrase: string, extra = {}) => ({kind: 'image' as const, image, at: {phrase}, priority: 'essential' as const, ...extra});
const build = (sb: Storyboard) => buildPlan({storyboard: sb, turns, timing, words: {}, catalog, treatments: {}, allowEstimated: true});

describe('scene builder (S4)', () => {
  it('makes a repeated phrase unique so the resolver lands on the intended occurrence', () => {
    const text = 'The line held. Then the line broke for good.';
    assert.equal(uniquePhrase(text, 'the line', 1), 'the line');
    assert.equal(uniquePhrase(text, 'the line', 2), 'the line broke');
    assert.equal(uniquePhrase(text, 'not here'), null);
  });

  it('builds the cold-open storyboard into a plan the checks accept, with act boundaries and a year stamp', () => {
    const sb = fixture();
    const r = build(sb);
    assert.deepEqual(r.storyboardIssues, []);
    const resolved = resolveShotPlan(r.plan, turns, timing, {}, options);
    assert.ok(resolved.shots.length >= 14);
    assert.deepEqual(r.plan.acts, sb.acts, 'act boundaries carried into the plan');
    assert.ok((r.plan.years ?? []).length >= 1);
  });

  it('splits a long hold into another framing of the same image (one image use) on a phrase near the middle', () => {
    const sb: Storyboard = {episode: 'x', acts, turns: keys.map((key, index) => ({key, index, visuals: index === 0 ? [img('historic/u3e1/scene-london-1760s.jpg', 'last time')] : index === 1 ? [img('historic/u3e1/paxton-boys.jpg', 'then start with the bill')] : []}))};
    const r = build(sb);
    const london = r.plan.shots.filter(s => (s as {image?: string}).image === 'historic/u3e1/scene-london-1760s.jpg');
    assert.ok(london.length >= 4, `34s line split into ${london.length} shots`);
    assert.ok(r.fixes.some(f => /hold split/.test(f)));
    const resolved = resolveShotPlan(r.plan, turns, timing, {}, {...options, rules: undefined});
    assert.ok(resolved.shots.every(s => s.endSec - s.startSec <= 9.05 || s.type === 'question'));
  });

  it('drops the optional visual when two land too close, and varies a run of three identical moves', () => {
    const close: Storyboard = {episode: 'x', acts, turns: keys.map((key, index) => ({key, index, visuals: index === 4 ? [img('historic/u3e1/edmund-burke-1769.jpg', 'let me guess')] : index === 5 ? [img('historic/u3e1/paxton-boys.jpg', 'prime minister'), img('historic/u3e1/scene-london-1760s.jpg', 'minister from 1763', {priority: 'optional'})] : []}))};
    const r = build(close);
    assert.ok(r.fixes.some(f => /dropped "minister from 1763/.test(f)), r.fixes.join('\n'));
    const pans: Storyboard = {episode: 'x', acts, turns: keys.map((key, index) => ({key, index, visuals: index === 1 ? [
      img('historic/u3e1/scene-london-1760s.jpg', 'then start with the bill'), img('historic/u3e1/paxton-boys.jpg', 'drowning in debt'), img('historic/u3e1/french-indian-war.jpg', 'canada to garrison'),
    ] : []}))};
    const v = build(pans);
    assert.ok(v.fixes.some(f => /for variety/.test(f)) || v.warnings.some(w => /in a row/.test(w)));
  });

  it('reports lines that changed since boarding instead of guessing', () => {
    const sb = fixture();
    const edited = turns.map((t, i) => (i === 5 ? {...t, text: 'George Grenville took office in 1763.'} : t));
    const r = buildPlan({storyboard: sb, turns: edited, timing, words: {}, catalog, treatments: {}, allowEstimated: true});
    assert.ok(r.storyboardIssues.some(i => /line changed/.test(i)));
  });
});

describe('treatments (S3)', () => {
  it('proposes framings by kind within the zoom limit, keeps faces out of the sheet corner, and offers a different alternative move', () => {
    const portrait = catalog.find(c => c.path.includes('grenville'))!;
    assert.equal(imageKind(portrait), 'portrait');
    const t = proposeTreatment(portrait, true);
    assert.equal(t.primary, 'face');
    assert.ok(Object.values(t.framings).every(f => f.from.zoom <= portrait.maxZoom && f.to.zoom <= portrait.maxZoom));
    assert.notEqual(t.framings.face.move, t.framings.wide.move);
    assert.equal(imageKind(catalog.find(c => c.path.includes('map'))!), 'map');
    assert.equal(proposeTreatment(catalog.find(c => c.path.includes('map'))!, true).parallax, false, 'no parallax on maps');
    assert.deepEqual(safeFocus({x: 0.8, y: 0.2, zoom: 1.3}), {x: 0.62, y: 0.2, zoom: 1.3});
    assert.equal(moveOf({x: 0.5, y: 0.5, zoom: 1}, {x: 0.5, y: 0.5, zoom: 1.3}), 'push');
  });
});

describe('storyboard director (S2)', () => {
  // Episode Sheet boxes that fit the 6-line excerpt (as in the director tests).
  const outline: Outline = {title: 'T', thesis: 'X', acts, boxes: [
    {label: 'The end of salutary neglect', intro: {turn: 0, phrase: 'the end of salutary neglect'}, check: {turn: 4, phrase: 'let me guess'}, turns: {from: 1, to: 4}},
    {label: 'Pontiac', intro: {turn: 0, phrase: 'pontiacs rebellion'}, check: {turn: 5, phrase: 'from 1763'}, turns: {from: 5, to: 5}},
  ]};
  const answer = (name: string, answers: Record<string, unknown>, asked: string[], dir: string) => {
    asked.push(name);
    if (!(name in answers)) throw new Error(`unexpected LLM call ${name}`);
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(answers[name]));
    return join(dir, `${name}.json`);
  };

  it('boards each act, repairs only the act with a bad phrase, and revises only noted acts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'v2-sb-'));
    const good1 = {turns: [{turn: 0, visuals: [img('historic/u3e1/scene-london-1760s.jpg', 'last time')]}], years: []};
    const bad2 = {turns: [{turn: 1, visuals: [img('historic/u3e1/paxton-boys.jpg', 'words nobody said')]}]};
    const good2 = {turns: [{turn: 1, visuals: [img('historic/u3e1/paxton-boys.jpg', 'drowning in debt')]}, {turn: 5, visuals: [img('historic/u3e1/george-grenville-portrait.jpg', 'george grenville', {name: 'George Grenville'})]}]};
    const asked: string[] = [];
    const io2 = {meta: (name: string) => answer(name, {'doc-outline': outline, 'sb-act-01': good1, 'sb-act-02': bad2, 'sb-act-02-repair-1': good2}, asked, dir)};
    const r2 = directStoryboard(io2, {episode: 'u3e1', turns, timing, words: {}, options, catalog, maps: {geo: [], places: []}});
    assert.ok(r2.storyboard, JSON.stringify(r2.log, null, 1));
    assert.deepEqual(asked, ['doc-outline', 'sb-act-01', 'sb-act-02', 'sb-act-02-repair-1']);
    asked.length = 0;
    const io3 = {meta: (name: string) => answer(name, {'sb-act-02-revise-1': {turns: [{turn: 1, visuals: [img('historic/u3e1/scene-london-1760s.jpg', 'drowning in debt')]}]}}, asked, dir)};
    const r3 = directStoryboard(io3, {episode: 'u3e1', turns, timing, words: {}, options, catalog, maps: {geo: [], places: []}, revise: {storyboard: r2.storyboard!, outline, notes: new Map([[2, ['turn 1: show London, not Paxton']]])}});
    assert.ok(r3.storyboard);
    assert.deepEqual(asked, ['sb-act-02-revise-1'], 'only the noted act is re-asked');
    assert.deepEqual(r3.storyboard!.turns[0].visuals, r2.storyboard!.turns[0].visuals, 'act 1 kept');
  });
});

describe('editor pass', () => {
  it('may only switch to a listed framing or drop an optional shot; never the first shot, a portrait or a question card', () => {
    const t = proposeTreatment(catalog.find(c => c.path.includes('london'))!, false);
    const plan = {episode: 'x', shots: [
      {type: 'image_move', at: {turn: 0, phrase: 'a'}, image: 'historic/u3e1/scene-london-1760s.jpg', ...t.framings.wide},
      {type: 'image_move', at: {turn: 0, phrase: 'b'}, image: 'historic/u3e1/scene-london-1760s.jpg', ...t.framings.wide},
      {type: 'portrait', at: {turn: 1, phrase: 'c'}, image: 'p.jpg', name: 'X', from: {x: 0.5, y: 0.5, zoom: 1}, to: {x: 0.5, y: 0.5, zoom: 1.2}},
    ]} as unknown as ShotPlan;
    const {plan: edited, applied} = applyEdits(plan, [0, 1, 2], [{index: 1, framing: 'detail'}, {index: 0, drop: true}, {index: 2, drop: true}, {index: 1, framing: 'nonsense'}], {'historic/u3e1/scene-london-1760s.jpg': t});
    assert.deepEqual(applied, ['shot 1 -> detail (push)']);
    assert.equal(edited.shots.length, 3);
  });
});

describe('scene builder: the opening and the lesson budgets', () => {
  it('a too-short first shot gives way to the next visual; clips over the lesson budget play as moves', async () => {
    const {buildPlan} = await import('../tools/pipeline/scene-builder');
    const sb = fixture();
    const first = sb.turns[0];
    const img = first.visuals.find(v => v.kind === 'image')!;
    // A visual a breath after the opening one: the opening one would flash for a fraction of a second.
    const words = cleanSpeech(turns[0].text ?? '').split(/\s+/);
    first.visuals = [{...img, at: {phrase: words.slice(0, 2).join(' ')}}, {...img, at: {phrase: words.slice(2, 4).join(' ')}}, ...first.visuals.slice(1)];
    const clip = (phrase: string) => ({...img, kind: 'clip' as const, prompt: 'smoke drifts', at: {phrase}});
    const r0 = buildPlan({storyboard: sb, turns, timing, words: {}, catalog, treatments: {}, allowEstimated: true});
    assert.ok(r0.fixes.some(f => /cut too close/.test(f)), r0.fixes.join('\n'));
    const withClips = fixture();
    // Every visual of the long first line becomes a clip: far more than the lesson's two.
    withClips.turns[0].visuals = withClips.turns[0].visuals.map(v => clip(String(v.at.phrase)));
    const r = buildPlan({storyboard: withClips, turns, timing, words: {}, catalog, treatments: {}, allowEstimated: true});
    assert.equal(r.plan.shots.filter(s => s.type === 'clip').length, 2);
    assert.ok(r.fixes.some(f => /clip over the lesson's 2; plays as a move/.test(f)));
  });
});
