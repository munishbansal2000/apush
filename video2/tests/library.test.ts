import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, it} from 'node:test';
import type {AssetRecord} from '../src/library/types';
import {briefStatus, buildIndex, duplicateIssues, isThumbnailUrl, validateRecord, type Taxonomy} from '../src/library/validate';

const taxonomy = JSON.parse(readFileSync(new URL('../data/library/taxonomy.json', import.meta.url), 'utf8')) as Taxonomy;
const seed = JSON.parse(readFileSync(new URL('../data/library/records/portrait/portrait.george-grenville-hoare-1764.json', import.meta.url), 'utf8')) as AssetRecord;
const entityIds = new Set(['person.george-grenville', 'event.pontiacs-rebellion']);
const check = (r: AssetRecord) => validateRecord(r, {taxonomy, entityIds}).join('\n');
const variant = (edit: (r: AssetRecord) => void) => { const r = structuredClone(seed); edit(r); return r; };

describe('asset library', () => {
  it('the seed record is valid', () => assert.equal(check(seed), ''));

  it('rejects thumbnail URLs (the u3e1 image problem)', () => {
    assert.ok(isThumbnailUrl('https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Foo.jpg/800px-Foo.jpg'));
    assert.ok(!isThumbnailUrl(seed.provenance.originalUrl));
    assert.match(check(variant(r => { r.provenance.originalUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Foo.jpg/800px-Foo.jpg'; })), /thumbnail/);
  });

  it('rejects images too small for 1080p moves', () => {
    assert.match(check(variant(r => { r.files.original.width = 414; r.files.original.height = 510; })), /below the 2000px long-edge minimum/);
  });

  it('flags a late depiction that is not marked retrospective', () => {
    const late = variant(r => { r.creator = {name: 'John Mix Stanley', date: '1850s'}; r.depicts.date = '1763'; });
    assert.match(check(late), /set depicts\.retrospective = true/);
    assert.equal(check(variant(r => { r.creator = {date: '1850s'}; r.depicts.date = '1763'; r.depicts.retrospective = true; })), '');
  });

  it('rejects unusable licenses, unknown entities, non-English labels without a note, and watermarks', () => {
    assert.match(check(variant(r => { r.provenance.license = 'CC BY-SA 4.0'; })), /license "CC BY-SA 4.0" is not allowed/);
    assert.match(check(variant(r => { r.depicts.people = ['person.nobody']; })), /not a known entity/);
    assert.match(check(variant(r => { r.quality.textInImage = {present: true, language: 'de'}; })), /contains de text/);
    assert.match(check(variant(r => { r.quality.watermark = true; })), /watermarked/);
  });

  it('approval requires a reviewer and named focus regions', () => {
    const approved = variant(r => { r.review = {status: 'approved'}; r.framing = {focus: []}; });
    assert.match(check(approved), /name their reviewer/);
    assert.match(check(approved), /at least one named focus region/);
  });

  it('finds the same file collected twice, and indexes only approved assets', () => {
    const copy = variant(r => { r.id = 'portrait.grenville-copy'; });
    assert.match(duplicateIssues([seed, copy]).join('\n'), /duplicate file \(same sha256\)/);
    const approved = variant(r => { r.review = {status: 'approved', by: 'reviewer'}; });
    assert.deepEqual(buildIndex([seed, approved], []).map(e => e.focus), [['face', 'paper']]);
    assert.deepEqual(briefStatus([{id: 'brief.u3.grenville-portrait', kind: 'portrait', want: 'x', usedIn: ['u3e1:t05'], priority: 1, count: 2}], [seed, approved])[0], {id: 'brief.u3.grenville-portrait', priority: 1, want: 2, approved: 1, candidates: 1});
  });
});
