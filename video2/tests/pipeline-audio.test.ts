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

  it('P5: applies pronunciations to Fish-directed text in prod', async () => {
    process.env.FISH_TTS_SCRIPT = 'fish_tts.py';
    try {
      const h = fakeContext({mode: 'prod', stages: ['audio'], meta: name => {
        assert.equal(name, 'fish-direction');
        return {turns: [{id: 't00', text: '[calm] Powhatan led the confederacy.'}]};
      }});
      writeFileSync(h.ctx.pronunciationsPath, JSON.stringify({terms: [{term: 'Powhatan', tts: 'pow-uh-tan', approved: true}]}));
      atomicJson(join(h.ctx.dataDir, 'turns.json'), {turns: parseTranscript('Maya: Powhatan led the confederacy.')});
      await runPipeline(h.ctx);
      const calls = h.ttsCalls();
      assert.equal(calls.length, 1);
      assert.equal(ttsText(calls[0].args), '[calm] pow-uh-tan led the confederacy.');
    } finally {
      delete process.env.FISH_TTS_SCRIPT;
    }
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
});
