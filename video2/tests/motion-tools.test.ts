/**
 * Motion tooling tests: sound cues derived from block timings, music ducking, storyboard checks.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { cues, mergeCues, musicLevel } from '../src/motion/sound';
import { SPREAD_TRAVEL_SEC } from '../src/motion/primitives';
import { checkStoryboard, resolveAt, type Narration, type Storyboard } from '../src/motion/storyboard';

const read = <T>(p: string): T => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')) as T;

describe('sound cues', () => {
  it('spread: one thud per town, when its particles arrive', () => {
    const c = cues.spread({ start: 10, towns: [1, 2, 3], perTown: 0.5 });
    assert.deepEqual(c.map(x => x.at), [10 + SPREAD_TRAVEL_SEC, 10.5 + SPREAD_TRAVEL_SEC, 11 + SPREAD_TRAVEL_SEC]);
    assert.ok(c.every(x => x.name === 'thud'));
  });
  it('camera: silent for keys that do not move, louder for bigger moves', () => {
    const c = cues.camera([
      { t: 0, center: [0, 0], zoom: 2 },
      { t: 2, center: [0, 0], zoom: 2 },
      { t: 4, center: [0, 0], zoom: 2.2 },
      { t: 6, center: [-40, 10], zoom: 1 },
    ]);
    assert.deepEqual(c.map(x => x.at), [4, 6]);
    assert.ok(c[1].volume! > c[0].volume!);
  });
  it('mergeCues sorts, drops negative times and thins same-name cues on one frame', () => {
    const m = mergeCues([[{ at: 2, name: 'tick' }, { at: -1, name: 'tick' }], [{ at: 2.02, name: 'tick' }, { at: 1, name: 'whoosh' }]]);
    assert.deepEqual(m.map(x => `${x.name}@${x.at}`), ['whoosh@1', 'tick@2']);
  });
  it('music ducks under narration with smooth ramps and full level between sentences', () => {
    const spans = [{ start: 5, dur: 3 }];
    const o = { volume: 0.2, duckTo: 0.25, ramp: 0.5, fadeIn: 1, fadeOut: 1 };
    const free = musicLevel(2, 20, spans, o);
    const ducked = musicLevel(6, 20, spans, o);
    const mid = musicLevel(4.75, 20, spans, o);
    assert.equal(+free.toFixed(4), 0.2);
    assert.equal(+ducked.toFixed(4), 0.05);
    assert.ok(mid < free && mid > ducked);
    assert.equal(musicLevel(0, 20, spans, o), 0);
  });
});

describe('storyboard', () => {
  const narration: Narration = {
    totalSec: 12,
    sentences: [
      { text: 'One two three.', start: 0.5, dur: 3, words: [{ w: 'one', s: 0, e: 0.4 }, { w: 'two', s: 0.5, e: 0.9 }, { w: 'three', s: 1.2, e: 2 }] },
      { text: 'Four five.', start: 4, dur: 3 },
      { text: 'Six seven.', start: 7.5, dur: 2 },
    ],
  };
  const base = (): Storyboard => ({
    id: 't', scene: 'x', narration: 'x',
    elements: {
      ship: { kind: 'motion', in: { s: 0, dt: 0.5 }, out: { s: 2, dt: 2 } },
      cam: { kind: 'camera', in: { s: 1 }, out: { s: 1, dt: 1.5 } },
    },
    shots: [
      { sentence: 0, camera: 'follow', action: 'ship leaves', shows: 'a', elements: ['ship'] },
      { sentence: 1, camera: 'pan', action: 'camera pans', shows: 'b', elements: ['cam', 'ship'] },
      { sentence: 2, camera: 'hold', action: 'ship docks', shows: 'c', elements: ['ship'] },
    ],
  });
  const codes = (sb: Storyboard) => checkStoryboard(sb, narration).issues.filter(i => i.level === 'error').map(i => i.code);

  it('resolves word anchors from measured word times', () => {
    assert.equal(resolveAt({ s: 0, word: 'three', dt: -0.2 }, narration), 0.5 + 1.2 - 0.2);
    assert.equal(resolveAt({ s: 0, word: 'nope' }, narration), null);
  });
  it('a moving, varied storyboard passes', () => assert.deepEqual(codes(base()), []));
  it('SB001 missing action', () => { const sb = base(); sb.shots[1].action = ' '; assert.ok(codes(sb).includes('SB001')); });
  it('SB002 no hook in the first 5 s', () => { const sb = base(); sb.elements.ship.in = { s: 1, dt: 1.5 }; sb.elements.cam.in = { s: 1, dt: 1.2 }; assert.ok(codes(sb).includes('SB002')); });
  it('SB003 a still span over 4 s', () => { const sb = base(); sb.elements.ship.out = { s: 0, dt: 1 }; assert.ok(codes(sb).includes('SB003')); });
  it('SB004 same camera three times in a row', () => {
    const sb = base();
    sb.shots.forEach(s => { s.camera = 'pull-back'; });
    assert.ok(codes(sb).includes('SB004'));
  });
  it('the ExchangeCrossing storyboard passes', () => {
    const sb = read<Storyboard>('src/data/storyboards/exchange-crossing.json');
    const r = checkStoryboard(sb, read<Narration>(sb.narration));
    assert.deepEqual(r.issues.filter(i => i.level === 'error'), []);
  });
});
