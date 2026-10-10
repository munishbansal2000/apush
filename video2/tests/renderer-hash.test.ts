import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {rendererHash} from '../tools/pipeline/context';

describe('renderer hash (what invalidates rendered segments)', () => {
  it('changes with any file the entry imports (from, side-effect, json), not with files it never reaches', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rh-'));
    mkdirSync(join(dir, 'theme'));
    const entry = join(dir, 'index.tsx');
    writeFileSync(entry, "import {A} from './a';\nimport './theme/fonts';\nexport const X = A;\n");
    writeFileSync(join(dir, 'a.ts'), "import cfg from './cfg.json';\nexport const A = cfg.v;\n");
    writeFileSync(join(dir, 'cfg.json'), '{"v": 1}');
    writeFileSync(join(dir, 'theme', 'fonts.ts'), 'export {};\n');
    writeFileSync(join(dir, 'unused.tsx'), 'export const U = 1;\n');
    const base = rendererHash(entry);
    writeFileSync(join(dir, 'unused.tsx'), 'export const U = 2;\n');
    assert.equal(rendererHash(entry), base, 'an unreached file does not count');
    for (const [file, text] of [['cfg.json', '{"v": 2}'], ['theme/fonts.ts', 'export {}; // changed\n']] as const) {
      writeFileSync(join(dir, file), text);
      assert.notEqual(rendererHash(entry), base, `${file} counts`);
    }
  });
});
