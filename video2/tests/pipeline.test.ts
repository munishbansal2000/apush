import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {mkdtempSync, readFileSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {atomicJson, normalizePlan, parseTranscript, resolveAudioScript, selectedStages, syncIssues, wordTimingIssues, type DirectedPlan} from '../tools/pipeline-core';

describe('video pipeline core', () => {
  it('parses speaker lines and timed pauses', () => {
    const turns = parseTranscript('# Lesson\nMaya: Start here.\n[pause 2.5]\nMarcus: Continue.\n[10-second pause]');
    assert.deepEqual(turns.map(t => [t.id, t.kind]), [['t00', 'speech'], ['t01', 'pause'], ['t02', 'speech'], ['t03', 'pause']]);
    assert.equal(turns[1].pauseSec, 2.5);
    assert.equal(turns[3].pauseSec, 10);
  });

  it('derives scene boundaries from measured TTS and requires complete coverage', () => {
    const turns = parseTranscript('Maya: One.\nMarcus: Two.\nMaya: Three.');
    const plan: DirectedPlan = {version: 1, episode: 'x', title: 'X', scenes: [
      {id: 'a', component: 'title', turnIds: ['t00'], props: {title: 'X'}},
      {id: 'b', component: 'causal_chain', turnIds: ['t01', 't02'], props: {nodes: ['A', 'B']}},
    ]};
    const out = normalizePlan(plan, turns, [0.25, 1.5, 3], [1, 1.25, 2]);
    assert.equal(out.scenes[0].startSec, 0.25);
    assert.equal(out.scenes[1].endSec, 5);
    assert.throws(() => normalizePlan({...plan, scenes: plan.scenes.slice(0, 1)}, turns, [0.25, 1.5, 3], [1, 1.25, 2]), /stops at turn/);
    assert.throws(() => normalizePlan({...plan, scenes: [
      {id: 'unsafe', component: 'ken_burns', turnIds: ['t00', 't01', 't02'], props: {image: 'https://remote/image.jpg'}},
    ]}, turns, [0.25, 1.5, 3], [1, 1.25, 2]), /safe public\/ relative path/);
  });

  it('stops at contact sheet unless full rendering is requested', () => {
    assert.deepEqual(selectedStages(undefined, undefined, false).at(-1), 'contact');
    assert.deepEqual(selectedStages(undefined, undefined, true).at(-1), 'render');
    assert.deepEqual(selectedStages('words', undefined, false), ['words']);
  });

  it('resolves the canonical shared audio script by episode id', () => {
    const root = new URL('../../audio_scripts', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]):)/, '$1:');
    const resolved = resolveAudioScript(root, 'u3e1');
    assert.match(resolved ?? '', /audio_scripts[\\/]unit3[\\/]apush-audio-u3-e1-script-v\d+-DRAFT\.md$/i);
  });

  it('rejects visual drift from the measured audio timeline', () => {
    const turns = parseTranscript('Maya: One.\nMarcus: Two.');
    const plan = normalizePlan({version: 1, episode: 'x', title: 'X', scenes: [
      {id: 'a', component: 'title', turnIds: ['t00'], props: {title: 'X'}},
      {id: 'b', component: 'quote', turnIds: ['t01'], props: {quote: 'Two.'}},
    ]}, turns, [0.25, 1.5], [1, 2], 4);
    assert.deepEqual(syncIssues(plan, turns, [0.25, 1.5], [1, 2], 4), []);
    plan.scenes[1].startSec! += 0.2;
    assert.match(syncIssues(plan, turns, [0.25, 1.5], [1, 2], 4).join('\n'), /visual gap\/overlap/);
  });

  it('rejects incomplete or malformed Vosk timing before direction', () => {
    const turns = parseTranscript('Maya: One word.\n[pause 1]\nMarcus: Two words.');
    assert.match(wordTimingIssues(turns, [1, 1, 2], {t00: [{w: 'one', s: 0.1, e: 0.5}]}).join('\n'), /t02: missing Vosk result/);
    assert.match(wordTimingIssues(turns, [1, 1, 2], {
      t00: [{w: 'one', s: 0.1, e: 0.5}],
      t02: [{w: 'two', s: 0.2, e: 0.5}, {w: 'words', s: 0.4, e: 0.8}],
    }).join('\n'), /out of order/);
    assert.deepEqual(wordTimingIssues(turns, [1, 1, 2], {
      t00: [{w: 'one', s: 0.1, e: 0.5}],
      t02: [{w: 'two', s: 0.2, e: 0.5}, {w: 'words', s: 0.6, e: 0.9}],
    }), []);
  });

  it('atomically replaces JSON without leaving a temp sidecar', () => {
    const dir = mkdtempSync(join(tmpdir(), 'video2-atomic-'));
    try {
      const path = join(dir, 'state.json');
      atomicJson(path, {version: 1});
      atomicJson(path, {version: 2, complete: true});
      assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), {version: 2, complete: true});
      assert.deepEqual(readdirSync(dir), ['state.json']);
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }
  });
});
