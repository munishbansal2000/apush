import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {parseTranscript, resolveAudioScript, selectedStages} from '../tools/pipeline-core';

describe('video pipeline core', () => {
  it('parses speaker lines and timed pauses', () => {
    const turns = parseTranscript('# Lesson\nMaya: Start here.\n[pause 2.5]\nMarcus: Continue.\n[10-second pause]');
    assert.deepEqual(turns.map(t => [t.id, t.kind]), [['t00', 'speech'], ['t01', 'pause'], ['t02', 'speech'], ['t03', 'pause']]);
    assert.equal(turns[1].pauseSec, 2.5);
    assert.equal(turns[3].pauseSec, 10);
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

});
