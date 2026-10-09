import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {DocShot} from '../src/documentary/types';
import {planSegments, segmentKey} from '../tools/pipeline/stages/doc';
import type {ResolvedShotPlan} from '../tools/pipeline/shots';

const shot = (id: string, startSec: number, endSec: number, image = `img/${id}.jpg`): DocShot =>
  ({id, type: 'image_move', image, size: {width: 3000, height: 2000}, from: {x: 0.5, y: 0.5, zoom: 1}, to: {x: 0.5, y: 0.5, zoom: 1.2}, startSec, endSec});
const shots = Array.from({length: 20}, (_, i) => shot(`s${i}`, i * 5, (i + 1) * 5));
const plan = (list = shots): ResolvedShotPlan => ({shots: list, years: [], boxes: [], endSec: 100});
const env = {sourceHash: 'src', fps: 30, width: 1920, height: 1080};
const sha = (p: string) => `sha-of-${p}`;

describe('documentary render segments', () => {
  it('groups shots into ~20s segments at shot boundaries covering 0..total', () => {
    const segs = planSegments(shots, 100);
    assert.deepEqual(segs.map(s => [s.startSec, s.endSec, s.shots.length]), [[0, 20, 4], [20, 40, 4], [40, 60, 4], [60, 80, 4], [80, 100, 4]]);
  });

  it('a shot edit changes only its own segment and the one before it (crossfades lead in)', () => {
    const segs = planSegments(shots, 100);
    const before = segs.map(s => segmentKey(plan(), s, env, sha));
    const edited = shots.map((s, i) => (i === 9 ? {...s, image: 'img/new.jpg'} : s));
    const after = segs.map(s => segmentKey(plan(edited), s, env, sha));
    assert.deepEqual(before.map((k, i) => k !== after[i]), [false, false, true, false, false], 'shot 9 is in segment 3 only');
    const leadIn = shots.map((s, i) => (i === 8 ? {...s, transition: 'crossfade' as const} : s));
    const after2 = segs.map(s => segmentKey(plan(leadIn), s, env, sha));
    assert.deepEqual(before.map((k, i) => k !== after2[i]), [false, true, true, false, false], 'a crossfade into segment 3 also changes segment 2');
  });

  it('asset content and renderer source changes invalidate', () => {
    const seg = planSegments(shots, 100)[0];
    assert.notEqual(segmentKey(plan(), seg, env, sha), segmentKey(plan(), seg, env, p => `${sha(p)}-v2`));
    assert.notEqual(segmentKey(plan(), seg, env, sha), segmentKey(plan(), seg, {...env, sourceHash: 'src2'}, sha));
  });
});

describe('director outline reuse', () => {
  it('offers the accepted outline only after a script edit, so unchanged re-runs hit the prompt cache', async () => {
    const {mkdtempSync, writeFileSync} = await import('node:fs');
    const {tmpdir} = await import('node:os');
    const {join} = await import('node:path');
    const {sha256} = await import('../tools/pipeline-core');
    const {priorOutlineFor} = await import('../tools/pipeline/stages/doc');
    const turns = [{id: 't00', kind: 'speech', text: 'One.'}, {id: 't01', kind: 'speech', text: 'Two.'}];
    const outline = {title: 'T', thesis: 'X', boxes: [], acts: []};
    const path = join(mkdtempSync(join(tmpdir(), 'v2-outline-')), 'doc-outline.accepted.json');
    writeFileSync(path, JSON.stringify({turnsHash: sha256(JSON.stringify(turns.map(t => [t.id, t.kind, t.text]))), outline}));
    assert.equal(priorOutlineFor(path, turns), undefined, 'same script: prompt unchanged, cached outline reused');
    assert.deepEqual(priorOutlineFor(path, [turns[0], {...turns[1], text: 'Two, edited.'}]), outline, 'edited script: revise from the accepted outline');
  });
});
