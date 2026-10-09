import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {chainLayout} from '../src/components/CausalChainSlide';
import {spectrumLabelRows} from '../src/components/SpectrumSlide';

describe('slide component layout', () => {
  it('P32: causal chain rows stay inside the 5% safe margins for 2-5 nodes', () => {
    for (const n of [2, 3, 4, 5]) {
      const {startX, totalWidth} = chainLayout(n, 1280);
      assert.ok(startX >= 1280 * 0.05 - 1e-9, `${n} nodes start at ${startX}px`);
      assert.ok(startX + totalWidth <= 1280 * 0.95 + 1e-9, `${n} nodes end at ${startX + totalWidth}px`);
    }
  });

  it('P31: close spectrum markers alternate label rows; spread markers share one row', () => {
    assert.deepEqual(spectrumLabelRows([0.5, 0.9]), [0, 0]);
    assert.deepEqual(spectrumLabelRows([0.5, 0.55]), [0, 1]);
    assert.deepEqual(spectrumLabelRows([0.1, 0.15, 0.2, 0.9]), [0, 1, 2, 0], 'three markers within 0.16 take three rows');
    assert.deepEqual(spectrumLabelRows([0.1, 0.15, 0.3]), [0, 1, 0], 'a marker far enough from the first reuses row 0');
  });
});
