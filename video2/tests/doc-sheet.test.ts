import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {BIG_WIDTH, INTRO_FLY_SEC, INTRO_HOLD_SEC, sheetTransform, type Rect} from '../src/documentary/sheet';

const size = {width: 1920, height: 1080};
const tracker: Rect = [0.73, 0.05, 0.95, 0.255];
const stage: Rect = [0.06, 0.13, 0.7, 0.775];
const intro = [1.2, 1.8, 2.6];
const map = (s: ReturnType<typeof sheetTransform>, x: number, y: number) => [s.scale * x + s.tx, s.scale * y + s.ty];

describe('Episode Sheet entrance', () => {
  it('is hidden before the boxes are named, big and centred on the stage while they are named', () => {
    assert.equal(sheetTransform(intro, 0.5, size, tracker, stage).phase, 'hidden');
    const big = sheetTransform(intro, 2.0, size, tracker, stage);
    assert.equal(big.phase, 'big');
    assert.ok(Math.abs(big.scale * (tracker[2] - tracker[0]) * 1920 - BIG_WIDTH * 1920) < 1e-6, 'big sheet is BIG_WIDTH of the frame');
    const [cx, cy] = map(big, ((tracker[0] + tracker[2]) / 2) * 1920, ((tracker[1] + tracker[3]) / 2) * 1080);
    assert.ok(Math.abs(cx - ((stage[0] + stage[2]) / 2) * 1920) < 1e-6 && Math.abs(cy - ((stage[1] + stage[3]) / 2) * 1080) < 1e-6, 'centred on the stage');
    assert.ok(big.dim > 0, 'stage dims behind the big sheet');
    // The big sheet stays inside the frame.
    const [left, top] = map(big, tracker[0] * 1920, tracker[1] * 1080);
    const [right, bottom] = map(big, tracker[2] * 1920, tracker[3] * 1080);
    assert.ok(left >= 0 && top >= 0 && right <= 1920 && bottom <= 1080);
  });

  it('holds after the last box is named, flies smoothly, then docks exactly in its corner', () => {
    const flyStart = 2.6 + INTRO_HOLD_SEC;
    assert.equal(sheetTransform(intro, flyStart - 0.01, size, tracker, stage).phase, 'big');
    const start = sheetTransform(intro, flyStart, size, tracker, stage);
    const justBefore = sheetTransform(intro, flyStart - 1e-6, size, tracker, stage);
    assert.ok(Math.abs(start.scale - justBefore.scale) < 1e-3 && Math.abs(start.tx - justBefore.tx) < 1, 'no jump when the flight starts');
    const mid = sheetTransform(intro, flyStart + INTRO_FLY_SEC / 2, size, tracker, stage);
    assert.equal(mid.phase, 'flying');
    assert.ok(mid.scale < start.scale && mid.scale > 1);
    const end = sheetTransform(intro, flyStart + INTRO_FLY_SEC, size, tracker, stage);
    assert.deepEqual([end.phase, end.scale, end.tx, end.ty, end.dim], ['docked', 1, 0, 0, 0]);
    const nearEnd = sheetTransform(intro, flyStart + INTRO_FLY_SEC - 1e-6, size, tracker, stage);
    assert.ok(Math.abs(nearEnd.scale - 1) < 1e-3 && Math.abs(nearEnd.tx) < 1, 'no jump when it docks');
  });
});
