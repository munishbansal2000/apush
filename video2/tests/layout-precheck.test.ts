import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {predictLayout} from '../tools/pipeline/layout-precheck';

const plan = (shots: unknown[], years: {sec: number; text: string}[] = [], boxes: unknown[] = []) => ({shots, years, boxes, endSec: 8}) as never;

describe('layout pre-check (no browser)', () => {
  it('predicts a year stamp slamming onto point-card bullets', () => {
    const point = {id: 'shot01', type: 'point', startSec: 0, endSec: 8, backdrop: 'b.jpg', bullets: [{text: 'Britain won the war', sec: 0.3}]};
    const p = predictLayout(plan([point], [{sec: 2, text: '1763'}]));
    assert.ok(p.collisions.some(c => [c.a, c.b].includes('chrome:year-1763') && [c.a, c.b].includes('point 1')), JSON.stringify(p.collisions));
    assert.ok(p.riskFrames.some(r => /year 1763 slam/.test(r.why)) && p.riskFrames.some(r => /predicted/.test(r.why)));
  });

  it('predicts two map labels on top of each other, but not a label under a year stamp (labels step aside)', () => {
    const map = {id: 'shot01', type: 'map', startSec: 0, endSec: 8, projection: 'us', extent: [[-90, 30], [-70, 45]], camera: [{sec: 0, center: [-80, 38], zoom: 1}],
      labels: [{text: 'New England', at: [-72, 43], sec: 0.5, style: 'region'}, {text: 'Massachusetts', at: [-72, 43.2], sec: 0.5, style: 'region'}, {text: 'Virginia', at: [-80, 38], sec: 0.5, style: 'region'}]};
    const p = predictLayout(plan([map], [{sec: 3, text: '1763'}]));
    assert.ok(p.collisions.some(c => c.a.includes('New England') && c.b.includes('Massachusetts')), JSON.stringify(p.collisions));
    assert.ok(!p.collisions.some(c => [c.a, c.b].includes('chrome:year-1763') && (c.a + c.b).includes('Virginia')), 'Virginia gives way to the stamp');
  });

  it('a clean plan predicts nothing and still lists the moments that move', () => {
    const img = {id: 'shot01', type: 'image_move', startSec: 0, endSec: 8, image: 'a.jpg', from: {x: 0.5, y: 0.5, zoom: 1}, to: {x: 0.5, y: 0.5, zoom: 1.1}};
    const p = predictLayout(plan([img], [{sec: 2, text: '1763'}], [{label: 'Box', introSec: 1, startSec: 4, endSec: 7, checkSec: 6.5}]));
    assert.deepEqual(p.collisions, []);
    assert.ok(p.riskFrames.some(r => /NOW entrance/.test(r.why)) && p.riskFrames.some(r => /lead-in/.test(r.why)));
  });
});
