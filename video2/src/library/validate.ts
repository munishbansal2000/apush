/** Library validation and indexing. Pure functions: the CLI (tools/library.ts) supplies files and existence checks. */
import type {AssetRecord, Brief, Entity, GeoProperties, IndexEntry} from './types';

export interface Taxonomy {
  units: Record<string, {name: string; from: number; to: number}>;
  kinds: string[];
  licenses: {allowed: string[]};
  quality: {imageMinLongEdge: number; imagePreferredLongEdge: number; portraitMinShortEdge: number; footageMinHeight: number};
}

const IMAGE_KINDS = new Set(['portrait', 'scene', 'cartoon', 'map', 'view', 'document', 'object', 'photo']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:@\d{3,4})?$/;
const year = (s?: string) => (s ? Number(/(\d{3,4})/.exec(s)?.[1] ?? NaN) : NaN);
const okBox = (b: unknown) => Array.isArray(b) && b.length === 4 && b.every(v => typeof v === 'number' && v >= 0 && v <= 1) && b[0] < b[2] && b[1] < b[3];
/** Wikimedia/LoC thumbnail or resized URLs: we always want the original file. */
export const isThumbnailUrl = (url: string) => /\/thumb\/|\/\d{2,4}px-[^/]+$|[?&](?:width|w|size)=\d+|\/service:.*\/(?:full|pct):/i.test(url);

export interface RecordContext {taxonomy: Taxonomy; entityIds: Set<string>; fileExists?: (path: string) => boolean; recordPath?: string}

export function validateRecord(r: AssetRecord, ctx: RecordContext): string[] {
  const issues: string[] = [];
  const add = (msg: string) => issues.push(`${r.id ?? '(no id)'}: ${msg}`);
  const [kind, slug] = String(r.id ?? '').split(/\.(.+)/);
  if (!ctx.taxonomy.kinds.includes(r.kind)) add(`kind "${r.kind}" is not in taxonomy.kinds`);
  if (kind !== r.kind || !slug || !SLUG.test(slug)) add(`id must be "<kind>.<slug>" with a lowercase-hyphen slug, got "${r.id}"`);
  if (ctx.recordPath && !ctx.recordPath.replace(/\\/g, '/').endsWith(`records/${r.kind}/${r.id}.json`)) add(`file must live at records/${r.kind}/${r.id}.json`);
  if (!r.title?.trim()) add('title is empty');
  if (!r.description?.trim() || r.description.length < 20) add('description must say what is visible (20+ characters)');
  if (!Array.isArray(r.units) || !r.units.length || r.units.some(u => !ctx.taxonomy.units[String(u)])) add('units must list CED units 1-9');
  // Provenance and license
  const p = r.provenance ?? ({} as AssetRecord['provenance']);
  if (!/^https?:\/\//.test(p.sourcePage ?? '')) add('provenance.sourcePage must be the item page URL');
  if (!/^https?:\/\//.test(p.originalUrl ?? '')) add('provenance.originalUrl must be the original file URL');
  else if (isThumbnailUrl(p.originalUrl)) add(`provenance.originalUrl is a thumbnail/resized URL (${p.originalUrl}); link the original file`);
  if (!ctx.taxonomy.licenses.allowed.includes(p.license)) add(`license "${p.license}" is not allowed (${ctx.taxonomy.licenses.allowed.join(', ')})`);
  if (!p.credit?.trim()) add('provenance.credit (exact credit line) is required');
  // Files and resolution
  const f = r.files?.original;
  if (!f?.path) add('files.original.path is required');
  else {
    if (!/^[0-9a-f]{64}$/.test(f.sha256 ?? '')) add('files.original.sha256 must be a 64-character hex digest');
    if (ctx.fileExists && !ctx.fileExists(f.path)) add(`files.original.path "${f.path}" does not exist in LIBRARY_DIR`);
    if (IMAGE_KINDS.has(r.kind)) {
      if (!f.width || !f.height) add('image files need width and height');
      else {
        const q = ctx.taxonomy.quality;
        if (Math.max(f.width, f.height) < q.imageMinLongEdge) add(`${f.width}×${f.height} is below the ${q.imageMinLongEdge}px long-edge minimum for 1080p camera moves`);
        if (r.kind === 'portrait' && Math.min(f.width, f.height) < q.portraitMinShortEdge) add(`portrait short edge ${Math.min(f.width, f.height)}px is below ${q.portraitMinShortEdge}px`);
      }
    }
    if (r.kind === 'footage' && (f.height ?? 0) < ctx.taxonomy.quality.footageMinHeight) add(`footage height ${f.height}px is below ${ctx.taxonomy.quality.footageMinHeight}px`);
  }
  // What it depicts
  const d = r.depicts ?? {};
  for (const ref of [...(d.people ?? []), ...(d.events ?? []), ...(d.places ?? [])]) if (!ctx.entityIds.has(ref)) add(`depicts "${ref}" is not a known entity (add it to entities/)`);
  const made = year(r.creator?.date);
  const shown = year(d.date);
  if (Number.isFinite(made) && Number.isFinite(shown) && made - shown > 25 && d.retrospective !== true) add(`made ${made} but depicts ${shown}: set depicts.retrospective = true (not an eyewitness record)`);
  // Quality flags
  const text = r.quality?.textInImage;
  if (text?.present && text.language && !/^en/i.test(text.language) && !(r.accuracy ?? []).some(a => /label|language/i.test(a))) add(`contains ${text.language} text; maps/scenes with non-English labels need an accuracy note or should be rejected`);
  if (r.quality?.watermark) add('watermarked images are not usable');
  for (const region of r.framing?.focus ?? []) if (!region.name?.trim() || !okBox(region.box)) add(`focus "${region.name}" needs a name and a [x0,y0,x1,y1] box in 0..1`);
  for (const phrase of r.document?.phrases ?? []) if (!phrase.text?.trim() || !okBox(phrase.box)) add(`document phrase "${phrase.text}" needs text and a 0..1 box`);
  // Review
  const status = r.review?.status;
  if (!['candidate', 'verified', 'approved', 'rejected'].includes(status)) add('review.status must be candidate | verified | approved | rejected');
  if (status === 'approved') {
    if (!r.review.by) add('approved records name their reviewer (review.by)');
    if (IMAGE_KINDS.has(r.kind) && r.kind !== 'document' && !(r.framing?.focus ?? []).length) add('approved images need at least one named focus region (e.g. "face", "crowd")');
    if (r.kind === 'document' && !r.document?.transcription) add('approved documents need a transcription');
  }
  return issues;
}

/** Same file collected twice under different ids. */
export function duplicateIssues(records: AssetRecord[]): string[] {
  const bySha = new Map<string, string[]>();
  for (const r of records) {
    const sha = r.files?.original?.sha256;
    if (sha) bySha.set(sha, [...(bySha.get(sha) ?? []), r.id]);
  }
  const ids = new Map<string, number>();
  for (const r of records) ids.set(r.id, (ids.get(r.id) ?? 0) + 1);
  return [
    ...[...bySha.values()].filter(group => group.length > 1).map(group => `duplicate file (same sha256): ${group.join(', ')}`),
    ...[...ids.entries()].filter(([, n]) => n > 1).map(([id]) => `duplicate id: ${id}`),
  ];
}

export function validateBrief(b: Brief, taxonomy: Taxonomy): string[] {
  const issues: string[] = [];
  const add = (msg: string) => issues.push(`${b.id ?? '(no id)'}: ${msg}`);
  if (!/^brief\.u\d\.[a-z0-9-]+$/.test(b.id ?? '')) add('id must be "brief.u<unit>.<slug>"');
  if (!taxonomy.kinds.includes(b.kind)) add(`kind "${b.kind}" is not in taxonomy.kinds`);
  if (!b.want?.trim()) add('want is empty');
  if (!Array.isArray(b.usedIn) || !b.usedIn.length || b.usedIn.some(u => !/^u\d+(?:e\d+|cram):t\d+$/.test(u))) add('usedIn entries look like "u3e1:t05"');
  if (![1, 2, 3].includes(b.priority)) add('priority is 1, 2 or 3');
  return issues;
}

export function validateEntity(e: Entity): string[] {
  const issues: string[] = [];
  if (!/^(person|event|place)\.[a-z0-9-]+$/.test(e.id ?? '')) issues.push(`${e.id}: entity id must be person.|event.|place.<slug>`);
  if (!e.name?.trim()) issues.push(`${e.id}: name is empty`);
  if (e.id?.startsWith('place.') && e.location && (e.location.length !== 2 || Math.abs(e.location[0]) > 180 || Math.abs(e.location[1]) > 90)) issues.push(`${e.id}: location is [lon, lat]`);
  return issues;
}

export function validateGeo(p: GeoProperties, taxonomy: Taxonomy): string[] {
  const issues: string[] = [];
  const add = (msg: string) => issues.push(`${p.id ?? '(no id)'}: ${msg}`);
  if (!/^geo\.(region|line|route|point)\.[a-z0-9-]+(?:@\d{3,4})?$/.test(p.id ?? '')) add('id must be "geo.<type>.<slug>[@year]"');
  if (!['region', 'line', 'route', 'point'].includes(p.type) || !p.id?.startsWith(`geo.${p.type}.`)) add('type must match the id');
  if (!['exact', 'approximate', 'contested'].includes(p.precision)) add('precision is exact | approximate | contested');
  if (!Array.isArray(p.sources) || !p.sources.length) add('sources are required (where the geometry comes from)');
  if (!Array.isArray(p.units) || p.units.some(u => !taxonomy.units[String(u)])) add('units must list CED units 1-9');
  if (!['candidate', 'verified', 'approved', 'rejected'].includes(p.review?.status)) add('review.status is required');
  return issues;
}

/** Approved assets only: what the director may choose from. */
export function buildIndex(records: AssetRecord[], geo: GeoProperties[]): IndexEntry[] {
  const fromRecords = records.filter(r => r.review?.status === 'approved').map((r): IndexEntry => {
    const file = r.files.display ?? r.files.original;
    return {
      id: r.id, kind: r.kind, title: r.title, description: r.description, units: r.units, topics: r.topics ?? [],
      people: r.depicts.people ?? [], events: r.depicts.events ?? [], places: r.depicts.places ?? [], date: r.depicts.date,
      retrospective: r.depicts.retrospective, path: file.path, width: file.width, height: file.height,
      focus: (r.framing?.focus ?? []).map(f => f.name), hasDepth: !!r.derived?.depth, accuracy: r.accuracy ?? [],
    };
  });
  const fromGeo = geo.filter(g => g.review?.status === 'approved').map((g): IndexEntry => ({
    id: g.id, kind: 'geo', title: g.name, description: `${g.type} (${g.precision})${g.validFrom ? ` from ${g.validFrom}` : ''}${g.validTo ? ` to ${g.validTo}` : ''}`,
    units: g.units, topics: [], people: [], events: [], places: [], path: `geo/${g.id}.geojson`, focus: [], hasDepth: false,
    accuracy: g.precision === 'exact' ? [] : [`${g.precision} geometry`],
  }));
  return [...fromRecords, ...fromGeo].sort((a, b) => a.id.localeCompare(b.id));
}

/** Brief coverage: approved records per brief vs how many were wanted. */
export function briefStatus(briefs: Brief[], records: AssetRecord[]) {
  return briefs.map(b => {
    const have = records.filter(r => r.brief === b.id);
    const approved = have.filter(r => r.review.status === 'approved').length;
    return {id: b.id, priority: b.priority, want: b.count ?? 1, approved, candidates: have.filter(r => r.review.status === 'candidate' || r.review.status === 'verified').length};
  });
}
