/**
 * Historical asset library CLI (docs/ASSET_LIBRARY.md).
 *
 *   npx tsx tools/library.ts validate        check every record, brief, entity and geo feature (exit 1 on problems)
 *   npx tsx tools/library.ts index           write src/data/library-index.json from APPROVED assets
 *   npx tsx tools/library.ts status [unit]   brief coverage: what is still missing, by priority
 *
 * Binaries live in LIBRARY_DIR (default: public/library); records in data/library/ are metadata only.
 */
import {existsSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {ROOT} from './lib';
import type {AssetRecord, Brief, Entity, GeoProperties} from '../src/library/types';
import {briefStatus, buildIndex, duplicateIssues, validateBrief, validateEntity, validateGeo, validateRecord, type Taxonomy} from '../src/library/validate';

const LIB = join(ROOT, 'data', 'library');
const LIBRARY_DIR = process.env.LIBRARY_DIR ?? join(ROOT, 'public', 'library');
const json = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const walk = (dir: string, ext: string): string[] => !existsSync(dir) ? [] : readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path, ext) : name.endsWith(ext) ? [path] : [];
});

const taxonomy = json<Taxonomy>(join(LIB, 'taxonomy.json'));
const entities = walk(join(LIB, 'entities'), '.json').flatMap(path => json<Entity[]>(path));
const recordFiles = walk(join(LIB, 'records'), '.json');
const records = recordFiles.map(path => ({path, record: json<AssetRecord>(path)}));
const briefs = walk(join(LIB, 'wishlist'), '.json').flatMap(path => json<{briefs: Brief[]}>(path).briefs);
const geo = walk(join(LIB, 'geo'), '.geojson').flatMap(path => {
  const data = json<{type: string; properties?: GeoProperties; features?: {properties: GeoProperties}[]}>(path);
  return data.type === 'FeatureCollection' ? (data.features ?? []).map(f => f.properties) : [data.properties!];
});

const command = process.argv[2] ?? 'validate';
if (command === 'validate') {
  const entityIds = new Set(entities.map(e => e.id));
  const issues = [
    ...entities.flatMap(validateEntity),
    ...records.flatMap(({path, record}) => validateRecord(record, {taxonomy, entityIds, recordPath: path, fileExists: p => existsSync(join(LIBRARY_DIR, p)) || existsSync(join(ROOT, 'public', p))})),
    ...duplicateIssues(records.map(r => r.record)),
    ...briefs.flatMap(b => validateBrief(b, taxonomy)),
    ...geo.flatMap(g => validateGeo(g, taxonomy)),
  ];
  console.log(`[library] ${records.length} records, ${briefs.length} briefs, ${entities.length} entities, ${geo.length} geo features`);
  for (const issue of issues) console.log(`  ✗ ${issue}`);
  console.log(issues.length ? `[library] ${issues.length} problem(s)` : '[library] all valid');
  process.exit(issues.length ? 1 : 0);
} else if (command === 'index') {
  const index = buildIndex(records.map(r => r.record), geo);
  const out = join(ROOT, 'src', 'data', 'library-index.json');
  writeFileSync(out, `${JSON.stringify({_generated: 'tools/library.ts index (approved assets only); do not edit', entries: index}, null, 2)}\n`);
  console.log(`[library] ${index.length} approved assets -> ${relative(ROOT, out)}`);
} else if (command === 'status') {
  const unit = process.argv[3];
  const rows = briefStatus(briefs.filter(b => !unit || b.id.startsWith(`brief.u${unit.replace(/^u/, '')}.`)), records.map(r => r.record));
  for (const p of [1, 2, 3]) {
    const group = rows.filter(r => r.priority === p);
    if (!group.length) continue;
    const done = group.filter(r => r.approved >= r.want).length;
    console.log(`priority ${p}: ${done}/${group.length} briefs filled`);
    for (const r of group.filter(x => x.approved < x.want)) console.log(`  - ${r.id}: ${r.approved}/${r.want} approved, ${r.candidates} in review`);
  }
} else {
  console.error(`unknown command ${command}; use validate | index | status [unit]`);
  process.exit(2);
}
