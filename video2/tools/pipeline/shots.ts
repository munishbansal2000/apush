/**
 * Shot plans: the documentary director's output format (docs/LOOK.md). Every time is a phrase the narrator says
 * ({turn, phrase}) or an offset from the shot's start; this module proves each phrase exists, times it from the audio,
 * and enforces the look's pacing and text rules. Nothing lesson-specific lives here.
 */
import type {DocBox, DocShot, Framing, LonLat, RegionRef, YearStamp} from '../../src/documentary/types';
import {upscaleAt} from '../../src/documentary/framing';
import type {MultiPolygon, Polygon} from 'geojson';
import {geoArea} from 'd3-geo';
import type {PipelineTurn, WordTiming} from '../pipeline-core';
import {resolvePhrase, type AnchorTiming, type PhraseAnchor} from './anchors';
import {clipFingerprint, clipPromptIssues} from './clip-fingerprint';
import {ATMOSPHERES, type Atmosphere} from '../../src/documentary/atmosphere';

/** A cue: a spoken phrase, or seconds after the shot starts. */
export type Cue = PhraseAnchor | {offset: number};

type PlanShot = (
  | {type: 'image_move' | 'portrait'; at: PhraseAnchor; image: string; from: Framing; to: Framing; name?: string; role?: string; transition?: 'cut' | 'crossfade'}
  | {type: 'clip'; at: PhraseAnchor; image: string; prompt: string; seed?: number; focus?: [number, number]; from?: Framing; to?: Framing; transition?: 'cut' | 'crossfade'}
  | {type: 'map'; at: PhraseAnchor; projection: 'us' | 'world'; extent: [LonLat, LonLat]; camera: {at: Cue; center: LonLat; zoom: number; ease?: number}[];
      fills?: {at: Cue; region: RegionRef | {geo: string}; color: string}[];
      lines?: ({at: Cue; color?: string; dashed?: boolean; draw?: number; arrow?: boolean} & ({coords: LonLat[]} | {geo: string}))[];
      labels?: {at: Cue; text: string; lonlat: LonLat; style?: 'region' | 'ocean' | 'town'}[];
      points?: ({at: Cue; kind?: 'town' | 'fort' | 'battle'; label?: string} & ({place: string} | {lonlat: LonLat}))[];
      /** Terrain: library ridge lines (geo ids) for relief shading, plus rivers. */
      terrain?: {ridges: string[]; rivers?: boolean};
      tilt?: number;
      transition?: 'cut' | 'crossfade'}
  | {type: 'point'; at: PhraseAnchor; backdrop: string; bullets: {at: Cue; text: string}[]; transition?: 'cut' | 'crossfade'}
) & {atmosphere?: string[]};

export interface ShotPlan {
  episode: string;
  shots: PlanShot[];
  years?: {at: PhraseAnchor; text: string}[];
  boxes?: {label: string; intro: PhraseAnchor; check: PhraseAnchor; turns: {from: number; to: number}}[];
  /** Where the last shot ends: a spoken phrase (samples) or the end of the episode audio (default). */
  end?: PhraseAnchor;
}

export interface ResolvedShotPlan {shots: DocShot[]; years: YearStamp[]; boxes: DocBox[]; endSec: number}

export interface ShotRules {minShotSec: number; maxShotSec: number; maxMapSec: number; maxBullets: number; maxBulletWords: number; maxUpscale: number}
export const LOOK_RULES: ShotRules = {minShotSec: 1.2, maxShotSec: 8, maxMapSec: 14, maxBullets: 3, maxBulletWords: 6, maxUpscale: 1.6};

export interface ResolveOptions {
  /** Pixel sizes of public/ images (data/images.lock.json); a shot on a missing or unsized image is an error. */
  imageSizes: Record<string, {width: number; height: number}>;
  /** Depth maps by image path (public/ relative), for 2.5D parallax. */
  depthMaps?: Record<string, string>;
  frame?: {width: number; height: number};
  rules?: ShotRules;
  /** Samples only: estimate phrase times when there are no Vosk words. */
  allowEstimated?: boolean;
  /** Library geography by id (data/library/geo). */
  geo?: Record<string, GeoFeature>;
  /** Library places by id: name and [lon, lat]. */
  places?: Record<string, {name: string; location?: LonLat}>;
  /** Samples only: allow geography that is not yet approved. */
  allowUnapproved?: boolean;
  /** sha256 of public/ images (data/images.lock.json) and of tools/animate_still.py, for clip fingerprints. */
  imageShas?: Record<string, string>;
  generatorSha?: string;
  /** Generated hero clips by fingerprint (public/clips/<episode>/clips.json). */
  clips?: Record<string, {path: string; durationSec: number}>;
}

export interface GeoFeature {geometry: {type: string; coordinates: unknown}; properties: {id: string; precision: string; review: {status: string}}}

/** d3-geo treats a ring wound the wrong way as "everything but this shape"; flip such rings. */
function fixWinding(geometry: {type: string; coordinates: unknown}): {type: 'Polygon' | 'MultiPolygon'; coordinates: unknown} {
  const flip = (rings: LonLat[][]) => rings.map(r => [...r].reverse());
  const feature = (g: {type: string; coordinates: unknown}) => ({type: 'Feature' as const, properties: {}, geometry: g as Polygon | MultiPolygon});
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as LonLat[][];
    return geoArea(feature(geometry)) > 2 * Math.PI ? {type: 'Polygon', coordinates: flip(rings)} : {type: 'Polygon', coordinates: rings};
  }
  if (geometry.type === 'MultiPolygon') {
    const polys = (geometry.coordinates as LonLat[][][]).map(rings => (geoArea(feature({type: 'Polygon', coordinates: rings})) > 2 * Math.PI ? flip(rings) : rings));
    return {type: 'MultiPolygon', coordinates: polys};
  }
  throw new Error(`expected a Polygon or MultiPolygon, got ${geometry.type}`);
}

export function resolveShotPlan(plan: ShotPlan, turns: PipelineTurn[], timing: AnchorTiming & {totalSec: number}, words: Record<string, WordTiming[]>, opts: ResolveOptions): ResolvedShotPlan {
  const rules = opts.rules ?? LOOK_RULES;
  const frame = opts.frame ?? {width: 1920, height: 1080};
  const issues: string[] = [];
  const phrase = (where: string, a: PhraseAnchor, edge: 'start' | 'end' = 'start'): number => {
    try { return resolvePhrase(a, turns, timing, words, edge, opts.allowEstimated).sec; } catch (error) {
      issues.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
      return NaN;
    }
  };
  const sized = (where: string, image: string, framings: Framing[]) => {
    const size = opts.imageSizes[image];
    if (!size) { issues.push(`${where}: image "${image}" is not downloaded (no size in images.lock.json)`); return {width: 1, height: 1}; }
    const upscale = upscaleAt(size, framings, frame);
    if (upscale > rules.maxUpscale) issues.push(`${where}: "${image}" (${size.width}×${size.height}) would be upscaled ${upscale.toFixed(2)}× at this framing (max ${rules.maxUpscale}); use a larger image or zoom out`);
    return size;
  };

  const starts = plan.shots.map((shot, i) => (i === 0 ? 0 : phrase(`shot ${i + 1} at`, shot.at)));
  const endSec = plan.end ? phrase('plan end', plan.end, 'end') : timing.totalSec;
  const shots: DocShot[] = plan.shots.map((shot, i) => {
    const id = `shot${String(i + 1).padStart(2, '0')}`;
    const startSec = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : endSec;
    const len = end - startSec;
    if (Number.isFinite(len)) {
      if (len < rules.minShotSec) issues.push(`${id}: ${len.toFixed(2)}s is shorter than ${rules.minShotSec}s (cuts must not stutter)`);
      const max = shot.type === 'map' ? rules.maxMapSec : rules.maxShotSec;
      if (len > max) issues.push(`${id}: ${len.toFixed(1)}s holds longer than ${max}s on one ${shot.type} shot; cut on another spoken cue`);
    }
    const cue = (where: string, c: Cue) => ('offset' in c ? startSec + c.offset : phrase(`${id} ${where}`, c));
    for (const kind of shot.atmosphere ?? []) if (!(ATMOSPHERES as readonly string[]).includes(kind)) issues.push(`${id}: unknown atmosphere "${kind}" (${ATMOSPHERES.join(', ')})`);
    if (shot.atmosphere?.length && shot.type === 'map') issues.push(`${id}: maps take no atmosphere layers`);
    const base = {id, startSec, endSec: end, transition: shot.transition, atmosphere: shot.atmosphere as Atmosphere[] | undefined};
    switch (shot.type) {
      case 'image_move':
      case 'portrait': {
        if (shot.type === 'portrait' && !shot.name?.trim()) issues.push(`${id}: portrait needs a name`);
        if (shot.name && shot.name.length > 40) issues.push(`${id}: name tag "${shot.name}" is longer than 40 characters`);
        if (Math.abs(shot.from.zoom - shot.to.zoom) < 0.04 && Math.hypot(shot.from.x - shot.to.x, shot.from.y - shot.to.y) < 0.03) issues.push(`${id}: camera barely moves; every shot must move`);
        const size = sized(id, shot.image, [shot.from, shot.to]);
        const depth = opts.depthMaps?.[shot.image];
        return shot.type === 'portrait'
          ? {...base, type: 'portrait', image: shot.image, size, from: shot.from, to: shot.to, name: shot.name ?? '', role: shot.role, depth}
          : {...base, type: 'image_move', image: shot.image, size, from: shot.from, to: shot.to, depth};
      }
      case 'clip': {
        for (const issue of clipPromptIssues(shot.prompt ?? '')) issues.push(`${id}: ${issue}`);
        const focus: [number, number] = shot.focus ?? [0.5, 0.5];
        const from = shot.from ?? {x: focus[0], y: focus[1], zoom: 1};
        const to = shot.to ?? {x: focus[0], y: focus[1], zoom: 1.08};
        // The fallback (no clip yet) is a camera move on the still, so the still must survive that framing too.
        const size = sized(id, shot.image, [from, to]);
        const seed = shot.seed ?? 42;
        const imageSha = opts.imageShas?.[shot.image];
        if (!imageSha) issues.push(`${id}: no sha256 for "${shot.image}" (needed to key its clip)`);
        const fingerprint = clipFingerprint({imageSha: imageSha ?? '', prompt: shot.prompt, seed, focus, generatorSha: opts.generatorSha ?? ''});
        return {...base, type: 'clip', image: shot.image, size, prompt: shot.prompt, seed, focus, fingerprint, clip: opts.clips?.[fingerprint], depth: opts.depthMaps?.[shot.image], from, to};
      }
      case 'map': {
        if (!shot.camera.length) issues.push(`${id}: map needs at least one camera key`);
        let approx = false;
        const geoOf = (where: string, geoId: string): GeoFeature | null => {
          const f = opts.geo?.[geoId];
          if (!f) { issues.push(`${id} ${where}: unknown geo id "${geoId}"`); return null; }
          if (f.properties.review.status !== 'approved' && !opts.allowUnapproved) issues.push(`${id} ${where}: "${geoId}" is ${f.properties.review.status}, not approved`);
          if (f.properties.precision !== 'exact') approx = true;
          return f;
        };
        const fills = (shot.fills ?? []).flatMap((f, n) => {
          if (!('geo' in f.region)) {
            if ('ring' in f.region) approx = true;
            return [{sec: cue(`fill ${n + 1}`, f.at), region: f.region as RegionRef, color: f.color}];
          }
          const g = geoOf(`fill ${n + 1}`, f.region.geo);
          if (!g) return [];
          try { return [{sec: cue(`fill ${n + 1}`, f.at), region: {geometry: fixWinding(g.geometry)}, color: f.color}]; } catch (error) {
            issues.push(`${id} fill ${n + 1}: ${error instanceof Error ? error.message : String(error)}`);
            return [];
          }
        });
        const lineCoords = (where: string, l: {coords: LonLat[]} | {geo: string}): LonLat[] | null => {
          if ('coords' in l) return l.coords;
          const g = geoOf(where, l.geo);
          if (!g) return null;
          if (g.geometry.type !== 'LineString') { issues.push(`${id} ${where}: "${l.geo}" is not a LineString`); return null; }
          return g.geometry.coordinates as LonLat[];
        };
        const lines = (shot.lines ?? []).flatMap((l, n) => {
          const coords = lineCoords(`line ${n + 1}`, l);
          return coords ? [{sec: cue(`line ${n + 1}`, l.at), coords, color: l.color, dashed: l.dashed, draw: l.draw, arrow: l.arrow}] : [];
        });
        const points = (shot.points ?? []).flatMap((pt, n) => {
          if ('lonlat' in pt) return [{sec: cue(`point ${n + 1}`, pt.at), at: pt.lonlat, label: pt.label, kind: pt.kind}];
          const place = opts.places?.[pt.place];
          if (!place?.location) { issues.push(`${id} point ${n + 1}: place "${pt.place}" is unknown or has no location`); return []; }
          return [{sec: cue(`point ${n + 1}`, pt.at), at: place.location, label: pt.label ?? place.name, kind: pt.kind}];
        });
        const ridges = (shot.terrain?.ridges ?? []).flatMap(geoId => {
          const coords = lineCoords('terrain', {geo: geoId});
          return coords ? [coords] : [];
        });
        return {
          ...base, type: 'map', projection: shot.projection, extent: shot.extent, tilt: shot.tilt,
          camera: shot.camera.map((k, n) => ({sec: cue(`camera ${n + 1}`, k.at), center: k.center, zoom: k.zoom, ease: k.ease})),
          fills, lines, points,
          labels: (shot.labels ?? []).map((lb, n) => ({sec: cue(`label ${n + 1}`, lb.at), text: lb.text, at: lb.lonlat, style: lb.style})),
          terrain: shot.terrain ? {ridges, rivers: shot.terrain.rivers} : undefined,
          approx,
        };
      }
      case 'point': {
        if (!shot.bullets.length || shot.bullets.length > rules.maxBullets) issues.push(`${id}: a point card has 1-${rules.maxBullets} bullets, got ${shot.bullets.length}`);
        for (const b of shot.bullets) {
          const n = b.text.trim().split(/\s+/).length;
          if (n > rules.maxBulletWords) issues.push(`${id}: bullet "${b.text}" has ${n} words (max ${rules.maxBulletWords})`);
        }
        const size = sized(id, shot.backdrop, [{x: 0.5, y: 0.5, zoom: 1.15}]);
        return {...base, type: 'point', backdrop: shot.backdrop, size, bullets: shot.bullets.map((b, n) => ({text: b.text, sec: cue(`bullet ${n + 1}`, b.at)}))};
      }
    }
  });
  for (let i = 1; i < starts.length; i++) if (starts[i] <= starts[i - 1]) issues.push(`shot ${i + 1} starts at or before shot ${i} (${starts[i].toFixed(2)}s ≤ ${starts[i - 1].toFixed(2)}s)`);

  const years = (plan.years ?? []).map((y, i) => ({text: y.text, sec: phrase(`year ${i + 1}`, y.at)}));
  const turnEnd = (i: number) => (i + 1 < turns.length ? timing.starts[i + 1] : timing.totalSec);
  const boxes = (plan.boxes ?? []).map((b, i) => ({
    label: b.label,
    introSec: phrase(`box ${i + 1} intro`, b.intro),
    checkSec: phrase(`box ${i + 1} check`, b.check, 'end'),
    startSec: timing.starts[b.turns.from],
    endSec: turnEnd(b.turns.to),
  }));
  if (issues.length) throw new Error(`shot plan invalid:\n${issues.map(issue => `  - ${issue}`).join('\n')}`);
  return {shots, years, boxes, endSec};
}
