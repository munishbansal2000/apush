import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter, join} from 'node:path';
import {describe, it} from 'node:test';
import {findTool} from '../tools/pipeline/tools';

describe('P12: cross-platform tool discovery', () => {
  const root = mkdtempSync(join(tmpdir(), 'v2-tools-'));
  const venvBin = join(root, 'venv-bin');
  const onPath = join(root, 'on-path');
  for (const dir of [venvBin, onPath]) mkdirSync(dir);
  const exe = process.platform === 'win32' ? '.exe' : '';
  writeFileSync(join(onPath, `edge-tts${exe}`), '');
  writeFileSync(join(venvBin, `python3${exe}`), '');
  writeFileSync(join(onPath, `python3${exe}`), '');

  it('finds a tool on PATH when it is not in the venv or install dirs (the Miniconda case)', () => {
    assert.equal(findTool(['edge-tts'], undefined, {dirs: [venvBin], pathEnv: onPath}), join(onPath, `edge-tts${exe}`));
  });

  it('prefers the project venv over PATH, and tries names in order', () => {
    assert.equal(findTool(['python3', 'python'], undefined, {dirs: [venvBin], pathEnv: onPath}), join(venvBin, `python3${exe}`));
  });

  it('an env override wins, and must exist', () => {
    process.env.TEST_TOOL_OVERRIDE = join(onPath, `edge-tts${exe}`);
    try {
      assert.equal(findTool(['nope'], 'TEST_TOOL_OVERRIDE', {dirs: [], pathEnv: ''}), process.env.TEST_TOOL_OVERRIDE);
      process.env.TEST_TOOL_OVERRIDE = join(root, 'missing');
      assert.throws(() => findTool(['nope'], 'TEST_TOOL_OVERRIDE'), /does not exist/);
    } finally {
      delete process.env.TEST_TOOL_OVERRIDE;
    }
  });

  it('fails with the places it looked instead of a bare ENOENT', () => {
    assert.throws(() => findTool(['edge-tts-missing'], 'EDGE_TTS_MISSING', {dirs: [venvBin], pathEnv: [onPath].join(delimiter)}),
      (e: Error) => e.message.includes('edge-tts-missing not found') && e.message.includes(venvBin) && e.message.includes('Set EDGE_TTS_MISSING'));
  });
});

describe('Fish keys for overnight runs', () => {
  it('loads keys from FISH_API_KEYS and a keys file, and cycles one per lesson run', async () => {
    const {loadFishKeys, keyForRun, keyTag} = await import('../tools/pipeline/fish-keys');
    const {mkdtempSync, writeFileSync} = await import('node:fs');
    const {join} = await import('node:path');
    const {tmpdir} = await import('node:os');
    const file = join(mkdtempSync(join(tmpdir(), 'fish-')), 'keys.txt');
    writeFileSync(file, '# my keys\nkey-cccc3333\n\nkey-aaaa1111  # duplicate\n');
    const keys = loadFishKeys({FISH_API_KEYS: 'key-aaaa1111, key-bbbb2222', FISH_API_KEYS_FILE: file});
    assert.deepEqual(keys, ['key-aaaa1111', 'key-bbbb2222', 'key-cccc3333']);
    assert.deepEqual([0, 1, 2, 3, 4].map(n => keyForRun(keys, n)), ['key-aaaa1111', 'key-bbbb2222', 'key-cccc3333', 'key-aaaa1111', 'key-bbbb2222']);
    assert.equal(keyForRun([], 3), undefined);
    assert.equal(keyTag('key-aaaa1111'), '…1111');
    assert.throws(() => loadFishKeys({FISH_API_KEYS_FILE: join(tmpdir(), 'nope-keys.txt')}), /does not exist/);
    const {lessonKeyEnv} = await import('../tools/pipeline/fish-keys');
    const state = join(mkdtempSync(join(tmpdir(), 'fish-state-')), 'state.json');
    const picks = [0, 1, 2, 3].map(() => lessonKeyEnv(keys, state, 'FISH_API_KEY').env.FISH_API_KEY);
    assert.deepEqual(picks, ['key-aaaa1111', 'key-bbbb2222', 'key-cccc3333', 'key-aaaa1111'], 'one key per lesson, cycling across lessons');
    assert.deepEqual(lessonKeyEnv([], state).env, {});
  });
});
