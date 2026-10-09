import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {frameImage, framingAt, upscaleAt} from '../src/documentary/framing';
import {shotWindows, soundCues, DOC_CROSSFADE_FRAMES} from '../src/documentary/DocEpisode';
import {parseTranscript} from '../tools/pipeline-core';
import {resolveShotPlan, type ShotPlan} from '../tools/pipeline/shots';

const frame = {width: 1920, height: 1080};

describe('image framing', () => {
  it('centres the focus point when there is room, and never exposes an edge', () => {
    const size = {width: 3000, height: 3000};
    const t = frameImage(size, {x: 0.5, y: 0.3, zoom: 1.5}, frame);
    assert.ok(Math.abs(t.tx + 0.5 * 3000 * t.scale - 960) < 1e-6, 'x centred');
    assert.ok(Math.abs(t.ty + 0.3 * 3000 * t.scale - 540) < 1e-6, 'y centred');
    const edge = frameImage(size, {x: 0, y: 0, zoom: 1}, frame);
    assert.deepEqual([edge.tx, edge.ty], [0, 0], 'a corner focus clamps instead of showing background');
    const far = frameImage(size, {x: 1, y: 1, zoom: 1.2}, frame);
    assert.ok(far.tx + 3000 * far.scale >= 1920 - 1e-6 && far.ty + 3000 * far.scale >= 1080 - 1e-6);
  });

  it('eases between framings and reports upscaling of small images', () => {
    const mid = framingAt({x: 0.2, y: 0.2, zoom: 1}, {x: 0.8, y: 0.8, zoom: 4}, 0.5);
    assert.ok(Math.abs(mid.x - 0.5) < 1e-9 && Math.abs(mid.zoom - 2) < 1e-9, 'zoom eases in log space');
    assert.ok(upscaleAt({width: 957, height: 660}, [{x: 0.5, y: 0.5, zoom: 1}], frame) > 2, "Death of Wolfe at 957px is >2x upscaled");
    assert.ok(upscaleAt({width: 2322, height: 2902}, [{x: 0.5, y: 0.2, zoom: 1.3}], frame) < 1.1, 'the Grenville portrait has room to push');
  });
});

describe('shot plans', () => {
  const turns = parseTranscript('Maya: Last time: two centuries of English colonies. Then 1763. The prime minister turns pale.\nMarcus: George Grenville. Prime minister from 1763.');
  const timing = {starts: [0.25, 8.6], durations: [8, 4], totalSec: 13.2};
  const words = Object.fromEntries(turns.map(t => [t.id, (t.text ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).map((w, i) => ({w, s: i * 0.5, e: i * 0.5 + 0.4}))]));
  const imageSizes = {'historic/grenville.jpg': {width: 2322, height: 2902}, 'historic/wolfe.jpg': {width: 957, height: 660}, 'historic/paxton.jpg': {width: 3770, height: 2678}};
  const plan = (): ShotPlan => ({episode: 'x', shots: [
    {type: 'map', at: {turn: 0, phrase: 'last time'}, projection: 'us', extent: [[-90, 25], [-60, 48]], camera: [{at: {offset: 0}, center: [-75, 40], zoom: 1}], fills: [{at: {turn: 0, phrase: 'english colonies'}, region: {state: 'MA'}, color: '#c9a227'}]},
    {type: 'image_move', at: {turn: 0, phrase: '1763'}, image: 'historic/paxton.jpg', from: {x: 0.5, y: 0.5, zoom: 1}, to: {x: 0.5, y: 0.4, zoom: 1.2}},
    {type: 'portrait', at: {turn: 1, phrase: 'george grenville'}, image: 'historic/grenville.jpg', from: {x: 0.5, y: 0.25, zoom: 1.1}, to: {x: 0.5, y: 0.2, zoom: 1.35}, name: 'George Grenville', role: 'Prime Minister, 1763'},
  ]});

  it('times shots from spoken phrases; the first shot starts at 0 and the last runs to the end', () => {
    const r = resolveShotPlan(plan(), turns, timing, words, {imageSizes});
    assert.deepEqual(r.shots.map(s => s.type), ['map', 'image_move', 'portrait']);
    assert.equal(r.shots[0].startSec, 0);
    assert.equal(r.shots[1].endSec, r.shots[2].startSec);
    assert.equal(r.shots[2].endSec, 13.2);
    assert.ok(r.shots[0].type === 'map' && r.shots[0].fills![0].sec > 0.25);
  });

  it('rejects an invented phrase, a static camera, a too-small image, long bullets, and slow cutting', () => {
    const bad = plan();
    bad.shots[1] = {type: 'image_move', at: {turn: 0, phrase: 'the treaty of paris'}, image: 'historic/wolfe.jpg', from: {x: 0.5, y: 0.5, zoom: 1}, to: {x: 0.5, y: 0.5, zoom: 1.01}};
    bad.shots.push({type: 'point', at: {turn: 1, phrase: 'prime minister from'}, backdrop: 'historic/paxton.jpg', bullets: [{at: {offset: 0.1}, text: 'Britain won the war but wrecked the arrangement'}]});
    const message = (() => { try { resolveShotPlan(bad, turns, timing, words, {imageSizes}); return ''; } catch (e) { return (e as Error).message; } })();
    assert.match(message, /does not say "the treaty of paris"/);
    assert.match(message, /camera barely moves/);
    assert.match(message, /historic\/wolfe\.jpg" \(957×660\) would be upscaled/);
    assert.match(message, /has 8 words \(max 6\)/);
    const mapOnly = plan();
    mapOnly.shots.splice(1, 2);
    assert.doesNotThrow(() => resolveShotPlan(mapOnly, turns, timing, words, {imageSizes}), 'a 13.2s animated map is within the 14s map limit');
    const slow = plan();
    slow.shots = [slow.shots[1]];
    assert.throws(() => resolveShotPlan(slow, turns, timing, words, {imageSizes}), /13\.2s holds longer than 8s on one image_move shot/);
  });

  it('allows estimated phrase times only when asked (samples without Vosk)', () => {
    assert.throws(() => resolveShotPlan(plan(), turns, timing, {}, {imageSizes}), /no Vosk word timing/);
    assert.equal(resolveShotPlan(plan(), turns, timing, {}, {imageSizes, allowEstimated: true}).shots.length, 3);
  });
});

describe('episode assembly', () => {
  it('crossfades start early; sound cues follow cuts, bullets, years and box events', () => {
    const shots = [
      {id: 'a', type: 'image_move' as const, image: 'x', size: {width: 1, height: 1}, from: {x: 0, y: 0, zoom: 1}, to: {x: 0, y: 0, zoom: 1.2}, startSec: 0, endSec: 4},
      {id: 'b', type: 'point' as const, backdrop: 'x', size: {width: 1, height: 1}, bullets: [{text: 'One', sec: 5}], startSec: 4, endSec: 8, transition: 'crossfade' as const},
    ];
    const w = shotWindows(shots, 30);
    assert.equal(w[1].from, 120 - DOC_CROSSFADE_FRAMES);
    const cues = soundCues({shots, years: [{text: '1763', sec: 2}], boxes: [{label: 'A', introSec: 1, checkSec: 7, startSec: 0, endSec: 8}]});
    assert.deepEqual(cues.map(c => c.name), ['tick', 'hit', 'whoosh', 'quill', 'check']);
  });
});

describe('map geography from the library', () => {
  const turns = parseTranscript('Maya: Canada to garrison and Florida to administer.');
  const timing = {starts: [0.25], durations: [4], totalSec: 5};
  const words = {t00: 'canada to garrison and florida to administer'.split(' ').map((w, i) => ({w, s: i * 0.5, e: i * 0.5 + 0.4}))};
  // Counter-clockwise ring (wrong winding for d3): the resolver must flip it.
  const quebec = {geometry: {type: 'Polygon', coordinates: [[[-79.6, 46.2], [-64.3, 50.3], [-64.2, 48.9], [-73.3, 45.0], [-79.6, 46.2]]]}, properties: {id: 'geo.region.q@1763', precision: 'approximate', review: {status: 'candidate'}}};
  const plan = (): ShotPlan => ({episode: 'x', shots: [{type: 'map', at: {turn: 0, phrase: 'canada'}, projection: 'world', extent: [[-130, 20], [-50, 65]],
    camera: [{at: {offset: 0}, center: [-80, 45], zoom: 1}], fills: [{at: {turn: 0, phrase: 'canada to garrison'}, region: {geo: 'geo.region.q@1763'}, color: '#b3261e'}],
    points: [{at: {offset: 1}, place: 'place.fort-detroit', kind: 'fort'}]}]});
  const places = {'place.fort-detroit': {name: 'Fort Detroit', location: [-83.05, 42.33] as [number, number]}};

  it('refuses unapproved geography unless drafting, and flags approximate features', () => {
    assert.throws(() => resolveShotPlan(plan(), turns, timing, words, {imageSizes: {}, geo: {[quebec.properties.id]: quebec}, places}), /is candidate, not approved/);
    const r = resolveShotPlan(plan(), turns, timing, words, {imageSizes: {}, geo: {[quebec.properties.id]: quebec}, places, allowUnapproved: true});
    const shot = r.shots[0];
    assert.ok(shot.type === 'map' && shot.approx, 'approximate geometry sets the on-screen note');
    assert.ok(shot.type === 'map' && shot.points![0].label === 'Fort Detroit', 'place ids resolve to name + location');
  });

  it('fixes ring winding so a region never fills the whole globe', async () => {
    const {geoArea} = await import('d3-geo');
    const r = resolveShotPlan(plan(), turns, timing, words, {imageSizes: {}, geo: {[quebec.properties.id]: quebec}, places, allowUnapproved: true});
    const shot = r.shots[0];
    assert.ok(shot.type === 'map');
    const region = shot.fills![0].region as {geometry: {type: 'Polygon'; coordinates: number[][][]}};
    assert.ok(geoArea({type: 'Feature', properties: {}, geometry: region.geometry} as never) < 2 * Math.PI);
  });

  it('rejects unknown geo ids and places without a location', () => {
    const bad = plan();
    const shot = bad.shots[0] as Extract<ShotPlan['shots'][number], {type: 'map'}>;
    shot.fills = [{at: {offset: 0.5}, region: {geo: 'geo.region.nowhere'}, color: '#000'}];
    shot.points = [{at: {offset: 1}, place: 'place.atlantis'}];
    const message = (() => { try { resolveShotPlan(bad, turns, timing, words, {imageSizes: {}, geo: {}, places, allowUnapproved: true}); return ''; } catch (e) { return (e as Error).message; } })();
    assert.match(message, /unknown geo id "geo.region.nowhere"/);
    assert.match(message, /place "place.atlantis" is unknown/);
  });
});

describe('hero clips and atmosphere', () => {
  const turns = parseTranscript('Maya: 1763. Britain won the biggest war of the century.');
  const timing = {starts: [0.25], durations: [5], totalSec: 6};
  const words = {t00: '1763 britain won the biggest war of the century'.split(' ').map((w, i) => ({w, s: i * 0.5, e: i * 0.5 + 0.4}))};
  const base = {imageSizes: {'historic/war.jpg': {width: 3000, height: 2000}}, imageShas: {'historic/war.jpg': 'a'.repeat(64)}, generatorSha: 'gen'};
  const clipPlan = (prompt: string, extra: Record<string, unknown> = {}): ShotPlan => ({episode: 'x', shots: [
    {type: 'clip', at: {turn: 0, phrase: '1763'}, image: 'historic/war.jpg', prompt, seed: 7, atmosphere: ['smoke'], ...extra} as ShotPlan['shots'][number],
  ]});
  const good = 'Gunpowder smoke drifts slowly across the battlefield; the flag ripples softly.';

  it('rejects camera moves and invented content in clip prompts', () => {
    assert.throws(() => resolveShotPlan(clipPlan('Slow camera zoom into the smoke over the battlefield'), turns, timing, words, base), /camera-move word/);
    assert.throws(() => resolveShotPlan(clipPlan('Smoke drifts as new soldiers appear from the trees'), turns, timing, words, base), /adds people or objects/);
  });

  it('keys clips by content and attaches a generated clip only when the key matches', () => {
    const a = resolveShotPlan(clipPlan(good), turns, timing, words, base).shots[0];
    const again = resolveShotPlan(clipPlan(good), turns, timing, words, base).shots[0];
    const reseeded = resolveShotPlan(clipPlan(good, {seed: 8}), turns, timing, words, base).shots[0];
    const refocused = resolveShotPlan(clipPlan(good, {focus: [0.3, 0.5]}), turns, timing, words, base).shots[0];
    assert.ok(a.type === 'clip' && again.type === 'clip' && reseeded.type === 'clip' && refocused.type === 'clip');
    assert.equal(a.fingerprint, again.fingerprint);
    assert.notEqual(a.fingerprint, reseeded.fingerprint);
    assert.notEqual(a.fingerprint, refocused.fingerprint);
    assert.equal(a.clip, undefined, 'no clip generated yet: falls back to the still');
    const withClip = resolveShotPlan(clipPlan(good), turns, timing, words, {...base, clips: {[a.fingerprint]: {path: 'clips/x/a.mp4', durationSec: 12}}}).shots[0];
    assert.ok(withClip.type === 'clip' && withClip.clip?.durationSec === 12);
  });

  it('rejects unknown atmosphere layers and atmosphere on maps', () => {
    assert.throws(() => resolveShotPlan(clipPlan(good, {atmosphere: ['lasers']}), turns, timing, words, base), /unknown atmosphere "lasers"/);
    const map: ShotPlan = {episode: 'x', shots: [{type: 'map', at: {turn: 0, phrase: '1763'}, projection: 'world', extent: [[-100, 20], [20, 60]], camera: [{at: {offset: 0}, center: [-40, 40], zoom: 1}], atmosphere: ['fog']}]};
    assert.throws(() => resolveShotPlan(map, turns, timing, words, base), /maps take no atmosphere layers/);
  });
});

describe('LTX Desktop clips', () => {
  it('crops stills to 16:9 around the focus point without stretching', async () => {
    const {aspectCrop} = await import('../tools/pipeline/clip-fingerprint');
    const war = aspectCrop({width: 1280, height: 869}, 1248 / 704, [0.5, 0.5]);
    assert.equal(war.w, 1280);
    assert.ok(Math.abs(war.w / war.h - 1248 / 704) < 0.005, 'exact 16:9');
    assert.ok(war.y > 0 && war.y + war.h <= 869, 'cropped top and bottom, inside the image');
    const portrait = aspectCrop({width: 2322, height: 2902}, 1248 / 704, [0.5, 0.15]);
    assert.equal(portrait.y, 0, 'a focus near the top clamps to the top edge');
    const wide = aspectCrop({width: 3770, height: 2678}, 16 / 9, [0.9, 0.5]);
    assert.ok(wide.x + wide.w === 3770, 'a focus near the right clamps to the right edge');
  });

  it('switching backend changes clip fingerprints, so clips are never reused across backends', async () => {
    const {clipFingerprint} = await import('../tools/pipeline/clip-fingerprint');
    const base = {imageSha: 'a', prompt: 'Smoke drifts slowly over the field of battle.', seed: 1, focus: [0.5, 0.5] as [number, number]};
    assert.notEqual(clipFingerprint({...base, generatorSha: 'desktop-key'}), clipFingerprint({...base, generatorSha: 'diffusers-key'}));
  });
});

