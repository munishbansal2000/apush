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
