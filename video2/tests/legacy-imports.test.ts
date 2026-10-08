/**
 * Legacy guard: superseded components live in src/legacy (see src/legacy/README.md).
 * New code must not import them. Only the gallery, Root and the old episodes may.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

/** Paths (relative to repo root, posix) allowed to import from legacy/. */
const ALLOWED: RegExp[] = [
  /^src\/legacy\//,
  /^src\/gallery\//,
  /^src\/Root\.tsx$/,
  /^src\/components\/U1E\d+Episode\.tsx$/,
  /^src\/components\/U2E\d+Episode\.tsx$/,
  /^src\/components\/U2E5Act1\.tsx$/,
];

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });

// static `from '...'`, side-effect `import '...'`, dynamic `import('...')`, `require('...')`
const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"])([^'"]+)\1/g;

const legacyImports = (code: string): string[] =>
  [...code.matchAll(IMPORT_RE)].map((m) => m[2]).filter((spec) => /(^|\/)legacy(\/|$)/.test(spec));

describe('legacy guard', () => {
  it('detects legacy specifiers', () => {
    assert.deepEqual(legacyImports(`import { A } from '../legacy/A';\nimport B from "./b";\nconst C = import('../../legacy/C');`), ['../legacy/A', '../../legacy/C']);
  });

  it('no file outside the allow-list imports from src/legacy', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).split(sep).join('/');
      if (ALLOWED.some((re) => re.test(rel))) continue;
      for (const spec of legacyImports(readFileSync(file, 'utf8'))) offenders.push(`${rel} -> ${spec}`);
    }
    assert.deepEqual(offenders, [], `New code must not import from src/legacy (see src/legacy/README.md):\n${offenders.join('\n')}`);
  });
});
