import assert from 'node:assert/strict';
import {readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {atomicJson, parseTranscript} from '../tools/pipeline-core';
import {runPipeline} from '../tools/pipeline/run';
import {applyPronunciations} from '../tools/pipeline/speech';
import {fakeContext} from './helpers/fake-pipeline';

const ttsText = (args: string[]) => args[args.indexOf('--text') + 1];

describe('pipeline audio', () => {
  it('P6: escapes regex metacharacters in pronunciation terms', () => {
    assert.equal(applyPronunciations('Visit St. Croix today', [{term: 'St. Croix', tts: 'saint croy'}]), 'Visit saint croy today');
    // "." must not act as a wildcard.
    assert.equal(applyPronunciations('Stx Croix', [{term: 'St. Croix', tts: 'saint croy'}]), 'Stx Croix');
    // An unbalanced "(" must not throw.
    assert.doesNotThrow(() => applyPronunciations('x', [{term: 'Powhatan (Wahunsenacah', tts: 'pow'}]));
    // Terms that end in a non-word character still match at a boundary.
    assert.equal(applyPronunciations('the U.S. army', [{term: 'U.S.', tts: 'you ess'}]), 'the you ess army');
  });

  it('P5: applies pronunciations found by the pronounce stage in the same run', async () => {
    const h = fakeContext({stages: ['pronounce', 'audio'], meta: () => ({terms: [{term: 'Powhatan', guide: 'POW-uh-tan', tts: 'pow-uh-tan'}]})});
    atomicJson(join(h.ctx.dataDir, 'turns.json'), {turns: parseTranscript('Maya: Powhatan led the confederacy.')});
    await runPipeline(h.ctx);
    const calls = h.ttsCalls();
    assert.equal(calls.length, 1);
    assert.match(ttsText(calls[0].args), /pow-uh-tan/);
  });

  it('P5: prod speaks the script\'s own Fish tags (no LLM pass), with pronunciations applied', async () => {
    process.env.FISH_TTS_SCRIPT = 'fish_tts.py';
    try {
      const h = fakeContext({mode: 'prod', stages: ['audio'], meta: name => { throw new Error(`unexpected Meta call ${name}`); }});
      writeFileSync(h.ctx.pronunciationsPath, JSON.stringify({terms: [{term: 'Powhatan', tts: 'pow-uh-tan', approved: true}]}));
      atomicJson(join(h.ctx.dataDir, 'turns.json'), {turns: parseTranscript('Maya: [calm] Powhatan led the confederacy.')});
      await runPipeline(h.ctx);
      const calls = h.ttsCalls();
      assert.equal(calls.length, 1);
      assert.equal(ttsText(calls[0].args), '[calm] pow-uh-tan led the confederacy.');
    } finally {
      delete process.env.FISH_TTS_SCRIPT;
    }
  });

  it('P5: prod refuses a direction tag outside the guideline catalog; dev strips tags', async () => {
    process.env.FISH_TTS_SCRIPT = 'fish_tts.py';
    try {
      const h = fakeContext({mode: 'prod', stages: ['audio']});
      atomicJson(join(h.ctx.dataDir, 'turns.json'), {turns: parseTranscript('Maya: [furiously] Powhatan led the confederacy.')});
      await assert.rejects(runPipeline(h.ctx), /\[furiously\] is not in the Fish tag catalog/);
    } finally {
      delete process.env.FISH_TTS_SCRIPT;
    }
    const dev = fakeContext({stages: ['audio']});
    atomicJson(join(dev.ctx.dataDir, 'turns.json'), {turns: parseTranscript('Maya: [firm] Powhatan led the confederacy.')});
    await runPipeline(dev.ctx);
    assert.equal(ttsText(dev.ttsCalls()[0].args), 'Powhatan led the confederacy.');
  });

  it('P7: inserting a line only synthesizes the new line', async () => {
    const h = fakeContext({stages: ['audio']});
    const turnsPath = join(h.ctx.dataDir, 'turns.json');
    atomicJson(turnsPath, {turns: parseTranscript('Maya: Alpha line.\nMarcus: Bravo line.\nMaya: Charlie line.')});
    await runPipeline(h.ctx);
    assert.equal(h.ttsCalls().length, 3);
    const first = Object.fromEntries(['t00', 't01', 't02'].map(id => [id, readFileSync(join(h.ctx.audioDir, `${id}.mp3`))]));

    atomicJson(turnsPath, {turns: parseTranscript('Maya: Alpha line.\nMarcus: Inserted line.\nMarcus: Bravo line.\nMaya: Charlie line.')});
    await runPipeline(h.ctx);
    const second = h.ttsCalls().slice(3);
    assert.equal(second.length, 1, `expected 1 new TTS call, got ${second.length}`);
    assert.equal(ttsText(second[0].args), 'Inserted line.');
    // Shifted turns reuse the audio rendered for the same text.
    assert.deepEqual(readFileSync(join(h.ctx.audioDir, 't02.mp3')), first.t01);
    assert.deepEqual(readFileSync(join(h.ctx.audioDir, 't03.mp3')), first.t02);
  });

  it('P7: migrates existing id-keyed audio into the cache without re-synthesis', async () => {
    const h = fakeContext({stages: ['audio']});
    atomicJson(join(h.ctx.dataDir, 'turns.json'), {turns: parseTranscript('Maya: Alpha line.\nMarcus: Bravo line.')});
    await runPipeline(h.ctx);
    // Rebuild the pre-cache layout: id-keyed index + mp3s, no cache directory.
    rmSync(join(h.ctx.ttsDir, 'cache'), {recursive: true});
    const fresh = fakeContext({stages: ['audio']});
    Object.assign(fresh.ctx, {ttsDir: h.ctx.ttsDir, audioDir: h.ctx.audioDir, dataDir: h.ctx.dataDir});
    await runPipeline(fresh.ctx);
    assert.equal(fresh.ttsCalls().length, 0);
  });

  it('timing stage writes per-frame loudness for the heads', async () => {
    const h = fakeContext({stages: ['audio', 'timing']});
    atomicJson(join(h.ctx.dataDir, 'turns.json'), {turns: parseTranscript('Maya: Alpha line here.\n[pause 1]\nMarcus: Bravo.')});
    await runPipeline(h.ctx);
    const timing = JSON.parse(readFileSync(join(h.ctx.dataDir, 'timing_map.json'), 'utf8'));
    const levels = JSON.parse(readFileSync(join(h.ctx.dataDir, 'levels.json'), 'utf8')) as Record<string, number[]>;
    assert.deepEqual(Object.keys(levels).sort(), ['t00', 't02']);
    for (const id of ['t00', 't02']) {
      const index = Number(id.slice(1));
      assert.ok(Math.abs(levels[id].length - timing.durations[index] * 30) <= 2, `${id}: ${levels[id].length} frames for ${timing.durations[index]}s`);
      assert.ok(levels[id].some(v => v > 0.5), `${id}: a 440 Hz tone should read as loud`);
    }
  });
});
