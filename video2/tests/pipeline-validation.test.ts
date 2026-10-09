import assert from 'node:assert/strict';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {atomicJson, isSafePublicPath, normalizeTurns, parseTranscript, selectedStages} from '../tools/pipeline-core';
import {runPipeline} from '../tools/pipeline/run';
import {fakeContext} from './helpers/fake-pipeline';


describe('pipeline validation', () => {
  it('P16: a "## Sources" heading ends the spoken transcript', () => {
    const turns = parseTranscript('Maya: The Bank is gone.\n\n## Sources (production only — never spoken)\n\nTier 1:\n- Barron\'s ch. 6: Worcester v. Georgia');
    assert.deepEqual(turns.map(t => t.text), ['The Bank is gone.']);
  });

  it('review fix: "never spoken" inside a spoken line does not end the transcript; only a heading does', () => {
    const turns = parseTranscript('Marcus: Those words were never spoken by Pontiac.\nMaya: Then who said them?\n## Quotes (never spoken)\nnote');
    assert.deepEqual(turns.map(t => t.speaker), ['marcus', 'maya']);
  });

  it('P16: bold metadata lines before the dialogue are not spoken', () => {
    const turns = parseTranscript('# U5 Cram\n**Format:** Cram | **Target:** 1200+ words\n**Pronunciation:** Calhoun = CAL-hoon\n\n---\n\nMaya: Thirty-second thesis.');
    assert.deepEqual(turns.map(t => [t.speaker, t.text]), [['maya', 'Thirty-second thesis.']]);
  });

  it('P16: rejects bullet/non-name speaker labels inside the dialogue', () => {
    assert.throws(() => parseTranscript('Maya: One.\n- Tier 1 (premium2027 ch5): source note\nMarcus: Two.'), /line 2/);
  });

  it('P16: keeps character speakers', () => {
    assert.deepEqual(parseTranscript('Editor: Four men ran.\nBiddle: A bank.\nSepúlveda: I argue from Aristotle.').map(t => t.speaker), ['editor', 'biddle', 'sepúlveda']);
  });

  it('P16: normalizeTurns rejects NaN pauses and empty speech', () => {
    assert.throws(() => normalizeTurns([{kind: 'pause', pauseSec: 'soon'}]), /pause/);
    assert.throws(() => normalizeTurns([{speaker: 'maya', text: '   '}]), /empty/);
  });

  it('P15: --from render selects the render stage without --full', () => {
    assert.deepEqual(selectedStages(undefined, 'render', false), ['render']);
    assert.deepEqual(selectedStages(undefined, 'contact', false), ['contact']);
  });

  it('P10: rejects planned image paths that escape the episode folder', async () => {
    for (const path of ['historic/u9e9/../../../evil.jpg', 'historic/u9e9/sub\\..\\x.jpg', 'historic/u9e9//abs.jpg']) {
      const h = fakeContext({stages: ['images'], meta: () => ({images: [{path, source_url: 'https://example.org/x.jpg', used_in: ['u9e9:t00']}]})});
      atomicJson(join(h.ctx.dataDir, 'turns.json'), {turns: parseTranscript('Maya: One.')});
      await assert.rejects(runPipeline(h.ctx), /invalid planned image path/, path);
    }
    for (const path of ['historic/../x.jpg', 'historic\\x.jpg', '/abs/x.jpg', 'https://x/y.jpg', 'a//b.jpg']) assert.equal(isSafePublicPath(path), false, path);
    assert.equal(isSafePublicPath('historic/u3e1/grenville.jpg'), true);
  });

  it('P11: the storyboard stage refuses to run without valid word timing', async () => {
    const h = fakeContext({stages: ['storyboard'], meta: () => ({})});
    const turns = parseTranscript('Maya: One two three.');
    atomicJson(join(h.ctx.dataDir, 'turns.json'), {turns});
    atomicJson(join(h.ctx.dataDir, 'timing_map.json'), {starts: [0.25], durations: [1.5], totalSec: 2.5, fps: 30, ttsHash: {}});
    await assert.rejects(runPipeline(h.ctx), /word timing is required/);
    assert.equal(h.metaCalls.length, 0);
  });
});
