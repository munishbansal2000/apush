import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {frameImage} from '../src/documentary/framing';
import {normalizeDepth, parallaxMotion, warpFrame, type DepthSource, type PixelSource} from '../src/documentary/parallax';

// 400x300 test image: red left half, blue right half. Depth: a "near" square (1) in the middle, background 0.
const W = 400, H = 300;
const src: PixelSource = {width: W, height: H, data: new Uint8ClampedArray(W * H * 4)};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4; src.data[o] = x < W / 2 ? 255 : 0; src.data[o + 2] = x < W / 2 ? 0 : 255; src.data[o + 3] = 255; }
const flat: DepthSource = {width: W, height: H, data: new Float32Array(W * H).fill(0.5)};
const square: DepthSource = {width: W, height: H, data: new Float32Array(W * H)};
for (let y = 100; y < 200; y++) for (let x = 150; x < 250; x++) square.data[y * W + x] = 1;
const frame = {width: 320, height: 180};
const t = frameImage(src, {x: 0.5, y: 0.5, zoom: 1}, frame);
const render = (depth: DepthSource, m: ReturnType<typeof parallaxMotion>) => { const out = new Uint8ClampedArray(frame.width * frame.height * 4); warpFrame(out, frame.width, frame.height, src, depth, t, m); return out; };
const still = render(flat, {shiftX: 0, shiftY: 0, dolly: 0, ref: 0.5});

describe('2.5D parallax', () => {
  it('a flat depth map leaves the framed image unchanged', () => {
    assert.deepEqual(render(flat, {shiftX: 30, shiftY: 0, dolly: 0.05, ref: 0.5}), still);
  });

  it('is undistorted at the middle of the shot and moves near planes at the ends', () => {
    const from = {x: 0.4, y: 0.5, zoom: 1}, to = {x: 0.6, y: 0.5, zoom: 1};
    const mid = parallaxMotion(from, to, 0.5, frame.width, 0);
    assert.ok(Math.abs(mid.shiftX) < 1e-12, "no shift at mid-shot");
    assert.ok(Math.abs(mid.dolly) < 1e-12, "no dolly at mid-shot");
    const end = parallaxMotion(from, to, 1, frame.width, 0);
    assert.ok(end.shiftX < 0, 'camera panning right slides near planes left');
    const moved = render(square, end);
    assert.notDeepEqual(moved, still, 'the near square displaces content');
  });

  it('keeps the focus plane locked: points at the reference depth do not move', () => {
    const lockedToSquare = render(square, {shiftX: 30, shiftY: 0, dolly: 0, ref: 1});
    // Centre pixel lies inside the near square (= ref), so it samples the same image point as the still frame.
    const c = (frame.height / 2 * frame.width + frame.width / 2) * 4;
    assert.deepEqual([...lockedToSquare.slice(c, c + 3)], [...still.slice(c, c + 3)]);
  });

  it('normalizes depth with robust percentiles and renders 1080p fast enough', () => {
    const gray = new Uint8Array(1000).map((_, i) => (i < 10 ? 255 : 100 + (i % 50)));
    const d = normalizeDepth(gray, 1000, 1);
    assert.ok(d.data[500] >= 0 && d.data[500] <= 1);
    const big = {width: 2400, height: 1600, data: new Uint8ClampedArray(2400 * 1600 * 4)};
    const bigDepth: DepthSource = {width: 1200, height: 800, data: new Float32Array(1200 * 800).fill(0.3)};
    const out = new Uint8ClampedArray(1920 * 1080 * 4);
    const started = performance.now();
    warpFrame(out, 1920, 1080, big, bigDepth, frameImage(big, {x: 0.5, y: 0.5, zoom: 1.2}, {width: 1920, height: 1080}), {shiftX: 20, shiftY: 0, dolly: 0.02, ref: 0.5});
    const ms = performance.now() - started;
    assert.ok(ms < 400, `1080p warp took ${ms.toFixed(0)}ms`);
    console.log(`  1080p warp: ${ms.toFixed(0)}ms`);
  });
});
