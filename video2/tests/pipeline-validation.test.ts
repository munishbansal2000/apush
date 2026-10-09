import assert from 'node:assert/strict';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {atomicJson, normalizePlan, normalizeTurns, parseTranscript, selectedStages, syncIssues, type DirectedPlan} from '../tools/pipeline-core';
import {runPipeline} from '../tools/pipeline/run';
import {fakeContext} from './helpers/fake-pipeline';

const stagger = {component: 'stagger' as const, props: {panels: [{image: 'a.jpg'}, {image: 'b.jpg'}]}};

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

  it('P16: the first scene covers the lead-in, and a late first scene is flagged', () => {
    const turns = parseTranscript('Maya: One.\nMarcus: Two.');
    const plan = normalizePlan({version: 1, episode: 'x', title: 'X', scenes: [
      {id: 'a', component: 'title', turnIds: ['t00'], props: {title: 'X'}},
      {id: 'b', turnIds: ['t01'], ...stagger},
    ]}, turns, [0.25, 1.5], [1, 2], 4);
    assert.equal(plan.scenes[0].startSec, 0);
    assert.deepEqual(syncIssues(plan, turns, [0.25, 1.5], [1, 2], 4), []);
    const late: DirectedPlan = structuredClone(plan);
    late.scenes[0].startSec = 0.5;
    assert.match(syncIssues(late, turns, [0.25, 1.5], [1, 2], 4).join('\n'), /a: visual gap/);
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
    const turns = parseTranscript('Maya: One.');
    assert.throws(() => normalizePlan({version: 1, episode: 'x', title: 'X', scenes: [
      {id: 'b', component: 'stagger', turnIds: ['t00'], props: {panels: [{image: 'a.jpg'}, {image: 'historic\\..\\..\\x.jpg'}]}},
    ]}, turns, [0], [1], 2), /safe public\/ relative path/);
  });

  it('P11: the direct stage refuses to run without valid word timing', async () => {
    const h = fakeContext({stages: ['direct'], meta: () => ({})});
    const turns = parseTranscript('Maya: One two three.');
    atomicJson(join(h.ctx.dataDir, 'turns.json'), {turns});
    atomicJson(join(h.ctx.dataDir, 'timing_map.json'), {starts: [0.25], durations: [1.5], totalSec: 2.5, fps: 30, ttsHash: {}});
    await assert.rejects(runPipeline(h.ctx), /word timing is required/);
    assert.equal(h.metaCalls.length, 0);
  });
});
