import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {parseTranscript} from '../tools/pipeline-core';
import {allocateActs, type CatalogEntry, type Outline} from '../tools/pipeline/doc-director';
import {mapImages} from '../tools/pipeline/image-map';
import type {DocInputs} from '../tools/pipeline/doc-inputs';

const lines = Array.from({length: 8}, (_, i) => `${i % 2 ? 'Marcus' : 'Maya'}: Line ${i}: Pontiac and Grenville and the Proclamation, again and again.`);
const turns = parseTranscript(lines.join('\n'));
const outline: Outline = {title: 't', thesis: 't', boxes: [], acts: [0, 2, 4, 6].map(f => ({title: `act ${f}`, purpose: 'p', turns: {from: f, to: f + 1}}))};
const entry = (path: string, description: string, extra: Partial<CatalogEntry> = {}): CatalogEntry => ({path, description, width: 3000, height: 2000, maxZoom: 2, ...extra});

describe('act split of the lesson budgets', () => {
  it('an image every act talks about is shared so the lesson total stays within 4; an explainer goes to one act only', () => {
    const catalog = [entry('grenville.jpg', 'Portrait of George Grenville'), entry('pontiac.jpg', 'Pontiac council'), entry('harbor.jpg', 'A harbour scene')];
    const split = allocateActs(outline, turns, catalog);
    for (const path of ['grenville.jpg', 'pontiac.jpg']) {
      const total = split.reduce((n, a) => n + (a.uses.get(path) ?? 0), 0);
      assert.ok(total > 0 && total <= 4, `${path}: ${total}`);
    }
    const explainers = split.flatMap(a => a.customs.map(([n]) => n));
    assert.equal(new Set(explainers).size, explainers.length, 'each explainer offered once');
    assert.ok(explainers.length <= 2);
    assert.equal(split.filter(a => a.uses.has('harbor.jpg')).length, 2, 'a picture no act names goes to two acts');
  });

  it('a mapped image goes to the acts holding its lines', () => {
    const catalog = [entry('grenville.jpg', 'Portrait of George Grenville', {turns: ['t04', 't05']}), entry('two.jpg', 'Pontiac', {turns: ['t00', 't07']})];
    const split = allocateActs(outline, turns, catalog);
    assert.deepEqual(split.map(a => a.uses.get('grenville.jpg') ?? 0), [0, 0, 2, 0]);
    assert.deepEqual(split.map(a => a.uses.get('two.jpg') ?? 0), [2, 0, 0, 2]);
  });
});

describe('images -> lines (LLM pass)', () => {
  it('maps unmapped images once, keeps real line ids only, and marks images that fit no line', () => {
    const dir = mkdtempSync(join(tmpdir(), 'imap-'));
    writeFileSync(join(dir, 'images.json'), JSON.stringify({'a.jpg': {description: 'Grenville'}, 'b.jpg': {description: 'harbour'}, 'c.jpg': {description: 'x', used_in: ['u9e9:t01']}}));
    const inputs = {turns, options: {imageSizes: {'a.jpg': {width: 3000, height: 2000}, 'b.jpg': {width: 3000, height: 2000}, 'c.jpg': {width: 3000, height: 2000}}}} as unknown as DocInputs;
    let asked = 0;
    const io = {meta: (_: string, prompt: string) => {
      asked++;
      assert.ok(prompt.includes('a.jpg') && !prompt.includes('c.jpg |'), 'only unmapped images are asked about');
      const out = join(dir, 'answer.json');
      writeFileSync(out, JSON.stringify({images: [{path: 'a.jpg', turns: ['t02', 't99', 't03']}]}));
      return out;
    }};
    assert.equal(mapImages('u9e9', dir, inputs, io), 1);
    const reg = JSON.parse(readFileSync(join(dir, 'images.json'), 'utf8'));
    assert.deepEqual(reg['a.jpg'].used_in, ['u9e9:t02', 'u9e9:t03']);
    assert.deepEqual(reg['b.jpg'].used_in, [], 'left out: asked once, fits no line');
    assert.deepEqual(reg['c.jpg'].used_in, ['u9e9:t01'], 'an existing mapping is kept');
    assert.equal(mapImages('u9e9', dir, inputs, io), 0);
    assert.equal(asked, 1, 'not asked again');
  });
});
