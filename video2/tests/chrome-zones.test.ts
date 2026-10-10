import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {labelBox, labelVisibility} from '../src/documentary/chrome-zones';

describe('map label visibility', () => {
  const W = 1920, H = 1080;
  it('fades a label out as the camera pushes it to the frame edge, instead of cutting it', () => {
    assert.equal(labelVisibility(labelBox(960, 540, 'Atlantic Ocean', 40, 0.35), W, H, []), 1);
    assert.equal(labelVisibility(labelBox(120, 760, 'Atlantic Ocean', 40, 0.35), W, H, []), 0, 'partly outside: hidden');
    const near = labelVisibility([20, 500, 400, 560], W, H, []);
    assert.ok(near > 0 && near < 1, 'inside but near the edge: fading');
  });

  it('steps aside under the year stamp while it is up, and comes back as it fades', () => {
    const label = labelBox(960, 540, 'Great Britain', 46, 0.22);
    const stamp = {rect: [700, 400, 1220, 680] as [number, number, number, number], opacity: 1};
    assert.equal(labelVisibility(label, W, H, [stamp]), 0);
    assert.equal(labelVisibility(label, W, H, [{...stamp, opacity: 0.25}]), 0.75);
    assert.equal(labelVisibility(label, W, H, [{...stamp, rect: [60, 60, 300, 160]}]), 1, 'the settled chip elsewhere does not matter');
  });
});

describe('year stamp zone', () => {
  it('covers the frame centre while it slams in and the top-left chip once settled', async () => {
    const {yearStampZone} = await import('../src/documentary/shots');
    const big = yearStampZone('1763', 10, 30, 1920, 1080);
    assert.ok(big.rect[0] < 960 && big.rect[2] > 960 && big.rect[1] < 540 && big.rect[3] > 540 && big.opacity > 0.9, JSON.stringify(big));
    const chip = yearStampZone('1763', 100, 30, 1920, 1080);
    assert.ok(chip.rect[0] >= 100 && chip.rect[2] < 600 && chip.rect[3] < 250, JSON.stringify(chip));
    assert.equal(yearStampZone('1763', 150, 30, 1920, 1080).opacity, 0, 'gone after 5s');
  });
});

describe('year stamps', () => {
  it('a stamp gives way to the next year: never two on screen, the last keeps its full time', async () => {
    const {yearStampSpans, yearStampZone, YEAR_STAMP_SEC} = await import('../src/documentary/shots');
    const spans = yearStampSpans([{sec: 10}, {sec: 12.5}, {sec: 40}]);
    assert.ok(Math.abs(spans[0] - (2.5 - 1 / 30)) < 1e-9 && spans[1] === YEAR_STAMP_SEC && spans[2] === YEAR_STAMP_SEC, JSON.stringify(spans));
    const close = [{sec: 10}, {sec: 10.17}];
    const s2 = yearStampSpans(close);
    assert.ok(close[0].sec + s2[0] <= close[1].sec, 'two years said 0.17s apart never share the screen');
    assert.equal(yearStampZone('1760', Math.round(2.5 * 30) - 1, 30, 1920, 1080, 2.5 - 1 / 30).opacity, 0, 'faded out when the next arrives');
    assert.ok(yearStampZone('1760', Math.round(1.5 * 30), 30, 1920, 1080, 2.5).opacity > 0.5);
  });
});

describe('year stamp and map labels', () => {
  it('a label under the stamp and the stamp are never both visible, frame by frame', async () => {
    const {yearStampVisible, yearStampZone, YEAR_STAMP_LEAD_SEC} = await import('../src/documentary/shots');
    const fps = 30;
    for (const hold of [5, 2.5, 0.8]) {
      for (let f = -Math.round(YEAR_STAMP_LEAD_SEC * fps) - 2; f <= Math.round(hold * fps) + 2; f++) {
        const label = f > Math.round(hold * fps) ? 1 : 1 - yearStampZone('1763', f, fps, 1920, 1080, hold).opacity;
        const stamp = f >= Math.round(hold * fps) ? 0 : yearStampVisible(f, fps, hold);
        assert.ok(!(label >= 0.05 && stamp >= 0.05), `hold ${hold}s frame ${f}: label ${label.toFixed(2)} and stamp ${stamp.toFixed(2)} both visible`);
      }
    }
  });
});

describe('year stamp size', () => {
  it('a range like "1760–1761" scales down to a year\'s width', async () => {
    const {yearStampZone} = await import('../src/documentary/shots');
    const one = yearStampZone('1763', 10, 30, 1920, 1080);
    const range = yearStampZone('1760–1761', 10, 30, 1920, 1080);
    const w = (z: {rect: number[]}) => z.rect[2] - z.rect[0];
    assert.ok(Math.abs(w(range) - w(one)) / w(one) < 0.25, `${w(one)} vs ${w(range)}`);
    assert.ok(range.rect[0] >= 0 && range.rect[2] <= 1920, 'stays on screen');
  });
});
