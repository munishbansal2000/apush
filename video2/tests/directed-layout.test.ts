import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {chainLayout} from '../src/components/CausalChainSlide';
import {spectrumLabelRows} from '../src/components/SpectrumSlide';
import {CROSSFADE_FRAMES, DIP_FRAMES, sceneOpacity, sceneWindows, type DirectedScene} from '../src/directed/DirectedEpisode';

const scene = (id: string, startSec: number, endSec: number, transition?: DirectedScene['transition']): DirectedScene =>
  ({id, component: 'title', props: {title: id}, startSec, endSec, transition});

describe('directed layout', () => {
  it('P32: causal chain rows stay inside the 5% safe margins for 2-5 nodes', () => {
    for (const n of [2, 3, 4, 5]) {
      const {startX, totalWidth} = chainLayout(n, 1280);
      assert.ok(startX >= 1280 * 0.05 - 1e-9, `${n} nodes start at ${startX}px`);
      assert.ok(startX + totalWidth <= 1280 * 0.95 + 1e-9, `${n} nodes end at ${startX + totalWidth}px`);
    }
  });

  it('P9: a crossfade overlaps the incoming scene over the outgoing one instead of dipping to dark', () => {
    const scenes = [scene('a', 0, 4), scene('b', 4, 8, 'crossfade')];
    const [wa, wb] = sceneWindows(scenes, 30);
    assert.equal(wb.from, 120 - CROSSFADE_FRAMES, 'incoming starts early');
    assert.equal(wa.from + wa.durationInFrames, 120, 'outgoing runs to its own end');
    // Mid-overlap: outgoing fully opaque, incoming half faded in.
    assert.equal(sceneOpacity(scenes[0], 0, 120 - CROSSFADE_FRAMES / 2 - wa.from, wa), 1);
    assert.ok(Math.abs(sceneOpacity(scenes[1], 1, CROSSFADE_FRAMES / 2, wb) - 0.5) < 1e-9);
  });

  it('a dip fades the outgoing scene out and the incoming scene in; a cut does neither', () => {
    const scenes = [scene('a', 0, 4), scene('b', 4, 8, 'dip'), scene('c', 8, 12, 'cut')];
    const w = sceneWindows(scenes, 30);
    assert.equal(sceneOpacity(scenes[0], 0, w[0].durationInFrames, w[0]), 0, 'a is dark at the dip');
    assert.equal(sceneOpacity(scenes[1], 1, 0, w[1]), 0, 'b starts dark');
    assert.equal(sceneOpacity(scenes[1], 1, DIP_FRAMES, w[1]), 1);
    assert.equal(sceneOpacity(scenes[2], 2, 0, w[2]), 1, 'cut: c is fully visible on its first frame');
    assert.equal(sceneOpacity(scenes[1], 1, w[1].durationInFrames - 1, w[1]), 1, 'b is not faded before a cut');
  });

  it('P31: close spectrum markers alternate label rows; spread markers share one row', () => {
    assert.deepEqual(spectrumLabelRows([0.5, 0.9]), [0, 0]);
    assert.deepEqual(spectrumLabelRows([0.5, 0.55]), [0, 1]);
    assert.deepEqual(spectrumLabelRows([0.1, 0.15, 0.2, 0.9]), [0, 1, 2, 0], 'three markers within 0.16 take three rows');
    assert.deepEqual(spectrumLabelRows([0.1, 0.15, 0.3]), [0, 1, 0], 'a marker far enough from the first reuses row 0');
  });
});
