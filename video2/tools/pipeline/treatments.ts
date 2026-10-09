/**
 * Treatments (docs/STORYBOARD.md, S3): how each image is shown. Named framings per image (a camera move each), which
 * one is primary, whether parallax suits it. Proposed by code from the image's kind, size and depth map; edited or
 * approved by a person (focus points are never trusted unseen: check the framing stills). Shared by every lesson:
 * data/library/treatments.json. The scene builder copies the framing it uses into the plan, so a later edit never
 * changes a frozen lesson.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {ROOT} from '../lib';
import type {CatalogEntry} from './doc-director';

export interface Framing {x: number; y: number; zoom: number}
export type MoveKind = 'push' | 'pull' | 'pan' | 'tilt' | 'still';
export type ImageKind = 'portrait' | 'map' | 'document' | 'scene' | 'object';

export interface FramedMove {from: Framing; to: Framing; move: MoveKind}
export interface Treatment {
  kind: ImageKind;
  framings: Record<string, FramedMove>;
  primary: string;
  parallax: boolean;
  status?: 'approved' | 'needs-work' | 'proposed';
  note?: string;
}

export const treatmentsPath = (root = ROOT) => join(root, 'data', 'library', 'treatments.json');
export function loadTreatments(root?: string): Record<string, Treatment> {
  const p = treatmentsPath(root);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as Record<string, Treatment> : {};
}
export function saveTreatments(t: Record<string, Treatment>, root?: string) {
  const p = treatmentsPath(root);
  mkdirSync(dirname(p), {recursive: true});
  writeFileSync(p, `${JSON.stringify(Object.fromEntries(Object.entries(t).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`);
}

/** The move a framing pair makes. */
export function moveOf(from: Framing, to: Framing): MoveKind {
  if (to.zoom - from.zoom > 0.04) return 'push';
  if (from.zoom - to.zoom > 0.04) return 'pull';
  if (Math.abs(to.x - from.x) >= 0.03) return 'pan';
  if (Math.abs(to.y - from.y) >= 0.03) return 'tilt';
  return 'still';
}

/** The image's kind from its catalog name and description. */
export function imageKind(entry: Pick<CatalogEntry, 'path' | 'description'>): ImageKind {
  const name = entry.path.split('/').pop()!.toLowerCase();
  const d = entry.description.toLowerCase();
  if (/^(portrait|person)[-_.]/.test(name) || /\bportrait\b/.test(d)) return 'portrait';
  if (/^map[-_.]/.test(name) || /\bmap\b|\bchart\b/.test(d)) return 'map';
  if (/^(doc|document|letter|newspaper|broadside|treaty|text)[-_.]/.test(name) || /\b(document|letter|newspaper|broadside|proclamation text|pamphlet|page|manuscript|treaty|statute|act of parliament)\b/.test(d)) return 'document';
  if (/^(object|artifact)[-_.]/.test(name) || /\b(coin|stamp|seal|musket|teapot|object|artifact)\b/.test(d)) return 'object';
  return 'scene';
}

/** Keeps the focus out of the docked Episode Sheet's corner (top right) so a face never sits under it. */
export const safeFocus = (f: Framing): Framing => (f.x > 0.68 && f.y < 0.3 ? {...f, x: 0.62} : f);

/** Proposed framings for an image (all within its max zoom): primary + an alternative with a different move. */
export function proposeTreatment(entry: CatalogEntry, hasDepth: boolean): Treatment {
  const kind = imageKind(entry);
  const m = entry.maxZoom;
  const z = (v: number) => Math.round(Math.min(m, Math.max(1, v)) * 100) / 100;
  const room = m >= 1.08;
  const wide = entry.width / entry.height > 1.9; // already wider than 16:9: horizontal room at zoom 1
  const fm = (from: Framing, to: Framing): FramedMove => {
    const f = safeFocus({...from, zoom: z(from.zoom)});
    const t = safeFocus({...to, zoom: z(to.zoom)});
    return {from: f, to: t, move: moveOf(f, t)};
  };
  const pan = (y = 0.5, zoom = 1.15) => fm({x: 0.38, y, zoom: room ? zoom : 1}, {x: 0.62, y, zoom: room ? zoom : 1});
  let framings: Record<string, FramedMove>;
  switch (kind) {
    case 'portrait':
      framings = {face: fm({x: 0.5, y: 0.32, zoom: 1.05}, {x: 0.5, y: 0.28, zoom: 1.35}), wide: fm({x: 0.5, y: 0.4, zoom: 1.15}, {x: 0.5, y: 0.45, zoom: 1})};
      break;
    case 'map':
      framings = {wide: fm({x: 0.5, y: 0.5, zoom: 1.6}, {x: 0.5, y: 0.5, zoom: 1}), detail: pan(0.5, 1.3)};
      break;
    case 'document':
      framings = {detail: fm({x: 0.32, y: 0.35, zoom: 1.4}, {x: 0.68, y: 0.35, zoom: 1.4}), wide: fm({x: 0.5, y: 0.4, zoom: 1.35}, {x: 0.5, y: 0.5, zoom: 1})};
      break;
    case 'object':
      framings = {detail: fm({x: 0.5, y: 0.5, zoom: 1}, {x: 0.5, y: 0.5, zoom: 1.25}), wide: pan()};
      break;
    default:
      framings = {wide: pan(), detail: fm({x: 0.5, y: 0.5, zoom: 1}, {x: 0.5, y: 0.45, zoom: 1.3})};
  }
  // Too little zoom headroom for a push or pull: pan (fine on wide images) or a gentle drift.
  for (const [name, f] of Object.entries(framings)) {
    if (f.move === 'still') framings[name] = wide || !room ? fm({x: 0.45, y: 0.5, zoom: 1}, {x: 0.55, y: 0.5, zoom: 1}) : fm({x: 0.5, y: 0.5, zoom: 1}, {x: 0.5, y: 0.5, zoom: 1.08});
  }
  return {kind, framings, primary: Object.keys(framings)[0], parallax: hasDepth && kind !== 'map' && kind !== 'document', status: 'proposed'};
}

/** The framing a storyboard name asks for ("face", "wide", "detail", "portrait"), else the primary. */
export function pickFraming(t: Treatment, name?: string): {name: string; framing: FramedMove} {
  const wanted = name === 'portrait' ? 'face' : name;
  const key = wanted && t.framings[wanted] ? wanted : t.primary;
  return {name: key, framing: t.framings[key]};
}

/** A framing with a different move from `not` (variety), when the treatment has one. */
export function alternateFraming(t: Treatment, not: MoveKind): {name: string; framing: FramedMove} | null {
  const alt = Object.entries(t.framings).find(([, f]) => f.move !== not);
  return alt ? {name: alt[0], framing: alt[1]} : null;
}
