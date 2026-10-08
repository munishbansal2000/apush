/**
 * Theme guard: fonts and colors come from src/theme/tokens.ts only.
 * Fails on literal fontFamily strings / font stacks, hex colors (#rgb, #rrggbb, #rrggbbaa)
 * and rgb()/rgba()/hsl()/hsla() literals anywhere outside src/theme.
 *
 * Allow-list (exactly):
 *   - src/motion/characters.tsx: hex inside a `const COSTUME*` block (costume palette).
 *   - data/*.json is not scanned.
 *
 * Every violation is reported as file:line. src/components + geo is strict; src/motion and
 * src/scenes are reported as `todo` while those blocks are still migrating (flip STRICT_MOTION).
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

/** Flip to true once src/motion + src/scenes are migrated. */
const STRICT_MOTION = true;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const rel = (p: string) => relative(ROOT, p).split(sep).join('/');

const walk = (dir: string, re: RegExp, deep: boolean): string[] =>
  !existsSync(dir)
    ? []
    : readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = join(dir, e.name);
        if (e.isDirectory()) return deep ? walk(p, re, deep) : [];
        return re.test(e.name) ? [p] : [];
      });

/** Not part of the visual system (episode compositions, kit adapters, barrel). */
const COMPONENT_EXCLUDE = /^(U1E\d+Episode|U2E\d+Episode|U2E5Act1|EpisodeShell|Kit\w*|index)\.tsx?$/;

const componentFiles = (): string[] => [
  ...walk(join(ROOT, 'src/components'), /\.tsx$/, false).filter((p) => !COMPONENT_EXCLUDE.test(p.split(sep).pop()!)),
  ...walk(join(ROOT, 'src/components/geo'), /\.tsx?$/, false),
];
const motionFiles = (): string[] => [
  ...walk(join(ROOT, 'src/motion'), /\.tsx$/, false),
  ...walk(join(ROOT, 'src/scenes'), /\.tsx$/, true),
];

/** Blank out comments, keeping line numbers. URLs ("https://") are left alone. */
export const stripComments = (code: string): string =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\w])\/\/.*$/gm, (_m, pre: string) => pre);

const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/g;
const FUNC = /\b(?:rgba?|hsla?)\s*\(/g;
/** fontFamily: '...' | fontFamily="..." | fontFamily={'...'} | fontFamily={`...`} */
const FONT_PROP = /\bfontFamily\s*(?::|=)\s*\{?\s*['"`]/g;
/** Any string literal that is a font stack (ends in a generic family). */
const FONT_STACK = /['"`][^'"`\n]*\b(?:serif|sans-serif|monospace|cursive|system-ui|fantasy)\s*['"`]/g;

/** Line ranges [start, end] (1-based) of `const COSTUME* = { … }` blocks. */
export const costumeBlocks = (code: string): [number, number][] => {
  const out: [number, number][] = [];
  const re = /\bconst\s+COSTUME\w*\b[^=]*=\s*\{/g;
  for (const m of code.matchAll(re)) {
    let depth = 0;
    let i = m.index! + m[0].length - 1;
    for (; i < code.length; i++) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}' && --depth === 0) break;
    }
    const line = (k: number) => code.slice(0, k).split('\n').length;
    out.push([line(m.index!), line(i)]);
  }
  return out;
};

export interface Violation {
  file: string;
  line: number;
  kind: 'hex' | 'color-fn' | 'font';
  text: string;
}

export const scan = (code: string, file: string): Violation[] => {
  const clean = stripComments(code);
  const allowHex = file === 'src/motion/characters.tsx' ? costumeBlocks(clean) : [];
  const out: Violation[] = [];
  clean.split('\n').forEach((src, i) => {
    const line = i + 1;
    const push = (kind: Violation['kind'], text: string) => out.push({ file, line, kind, text });
    const hexAllowed = allowHex.some(([a, b]) => line >= a && line <= b);
    if (!hexAllowed) for (const m of src.matchAll(HEX)) push('hex', m[0]);
    for (const m of src.matchAll(FUNC)) push('color-fn', m[0]);
    const fonts = new Set<number>();
    for (const m of src.matchAll(FONT_PROP)) fonts.add(m.index!);
    for (const m of src.matchAll(FONT_STACK)) fonts.add(m.index!);
    if (fonts.size) push('font', src.trim().slice(0, 80));
  });
  return out;
};

const scanFiles = (files: string[]): Violation[] => files.flatMap((p) => scan(readFileSync(p, 'utf8'), rel(p)));

const report = (vs: Violation[]): string =>
  `${vs.length} theme violation(s) — use FONT / COLOR / SURFACE / alpha() from src/theme/tokens.ts:\n` +
  vs.map((v) => `  ${v.file}:${v.line}  [${v.kind}] ${v.text}`).join('\n');

describe('theme guard', () => {
  it('detects literal fonts and colors (self-test)', () => {
    const code = [
      "const a = { fontFamily: 'Georgia, serif', color: '#fbbf24' };",
      '<text fontFamily="\'Cinzel\', serif" fill="#fff" />',
      "const b = { background: 'rgba(0,0,0,0.5)', stack: \"'JetBrains Mono', monospace\" };",
      "const ok = { fontFamily: FONT.ui, color: COLOR.gold, fill: 'url(#fade)', bg: alpha(COLOR.night, 0.6) };",
      "const ent = 'Don&#039;t'; // was #f59e0b and rgba(1,2,3,1)",
      'const url = "https://example.com/a#abc";',
    ].join('\n');
    const vs = scan(code, 'x.tsx');
    assert.deepEqual(
      vs.map((v) => `${v.line}:${v.kind}`),
      ['1:hex', '1:font', '2:hex', '2:font', '3:color-fn', '3:font'],
    );
  });

  it('allows hex only inside COSTUME* blocks of src/motion/characters.tsx', () => {
    const code = "const COSTUME_PALETTE = {\n  coat: '#7a4b2a',\n  nested: { x: '#000' },\n};\nconst P = { y: '#123456' };";
    assert.deepEqual(scan(code, 'src/motion/characters.tsx').map((v) => v.line), [5]);
    assert.equal(scan(code, 'src/motion/other.tsx').length, 3);
  });

  it('src/components + geo use theme tokens only (strict)', () => {
    const files = componentFiles();
    assert.ok(files.length >= 30, `expected the kept components, found ${files.length}`);
    const vs = scanFiles(files);
    assert.equal(vs.length, 0, report(vs));
  });

  const motion = scanFiles(motionFiles());
  it(
    'src/motion + src/scenes use theme tokens only',
    STRICT_MOTION || motion.length === 0 ? {} : { todo: 'motion blocks migrating' },
    () => {
      assert.equal(motion.length, 0, report(motion));
    },
  );
});
