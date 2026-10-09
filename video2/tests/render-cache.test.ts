import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import type {DirectedPlan} from '../tools/pipeline-core';
import {segmentFingerprint, stillFileName, stillFingerprint, type RenderEnv} from '../tools/pipeline/render-cache';

const env: RenderEnv = {sourceHash: 'src', fps: 30, width: 1280, height: 720};
const range = {from: 0, to: 89};

function fixture() {
  const publicDir = mkdtempSync(join(tmpdir(), 'v2-public-'));
  mkdirSync(join(publicDir, 'historic'), {recursive: true});
  writeFileSync(join(publicDir, 'historic/a.jpg'), 'image-a-v1');
  writeFileSync(join(publicDir, 'historic/b.jpg'), 'image-b-v1');
  const plan: DirectedPlan = {version: 1, episode: 'x', title: 'X', boxes: [
    {label: 'One', intro: {turn: 0, phrase: 'one'}, check: {turn: 0, phrase: 'one'}, turns: {from: 0, to: 0}},
    {label: 'Two', intro: {turn: 0, phrase: 'two'}, check: {turn: 1, phrase: 'two'}, turns: {from: 1, to: 1}},
  ], scenes: [
    {id: 's0', component: 'title', turnIds: ['t00'], props: {title: 'X'}, startSec: 0, endSec: 3},
    {id: 's1', component: 'stagger', turnIds: ['t01'], props: {panels: [{image: 'historic/a.jpg'}, {image: 'historic/b.jpg'}]}, startSec: 3, endSec: 6},
  ]};
  return {publicDir, plan};
}

describe('render cache keys', () => {
  it('P2: Episode Sheet box changes invalidate segments and stills', () => {
    const {publicDir, plan} = fixture();
    const relabeled: DirectedPlan = structuredClone(plan);
    relabeled.boxes![1].label = 'Second box';
    assert.notEqual(segmentFingerprint(plan, 0, range, env, publicDir), segmentFingerprint(relabeled, 0, range, env, publicDir));
    assert.notEqual(stillFingerprint(plan, 0, {label: 'mid', frame: 45}, env, publicDir), stillFingerprint(relabeled, 0, {label: 'mid', frame: 45}, env, publicDir));
  });

  it('P3: replacing a stagger panel image file invalidates its segment', () => {
    const {publicDir, plan} = fixture();
    const before = segmentFingerprint(plan, 1, range, env, publicDir);
    writeFileSync(join(publicDir, 'historic/b.jpg'), 'image-b-v2');
    assert.notEqual(segmentFingerprint(plan, 1, range, env, publicDir), before);
  });

  it('neighbour changes invalidate a segment (transitions blend across cuts)', () => {
    const {publicDir, plan} = fixture();
    const before = segmentFingerprint(plan, 0, range, env, publicDir);
    const changed: DirectedPlan = structuredClone(plan);
    changed.scenes[1].transition = 'crossfade';
    assert.notEqual(segmentFingerprint(changed, 0, range, env, publicDir), before);
  });

  it('P4: still files are named by content, so inserting a scene cannot reuse another scene\'s image', () => {
    const {publicDir, plan} = fixture();
    const inserted: DirectedPlan = structuredClone(plan);
    inserted.scenes.splice(1, 0, {id: 'new', component: 'quote', turnIds: ['t01'], props: {quote: 'Q'}, startSec: 3, endSec: 4});
    const oldFiles = plan.scenes.map((_, i) => stillFileName(stillFingerprint(plan, i, {label: 'mid', frame: 45 + i}, env, publicDir)));
    const newFiles = inserted.scenes.map((_, i) => stillFileName(stillFingerprint(inserted, i, {label: 'mid', frame: 45 + i}, env, publicDir)));
    // Index 1 used to be the stagger and is now the quote: the old file must not be reused for it.
    assert.notEqual(newFiles[1], oldFiles[1]);
    assert.equal(new Set(newFiles).size, newFiles.length);
  });

  it('review fix: caption words and head levels of the scene turns invalidate its segment', () => {
    const {publicDir, plan} = fixture();
    const before = segmentFingerprint(plan, 0, range, env, publicDir, [{id: 't00', words: [{w: 'one', s: 0, e: 0.4}], levels: [0.5]}]);
    const reworded = segmentFingerprint(plan, 0, range, env, publicDir, [{id: 't00', words: [{w: 'one', s: 0.1, e: 0.5}], levels: [0.5]}]);
    assert.notEqual(before, reworded);
  });
});

