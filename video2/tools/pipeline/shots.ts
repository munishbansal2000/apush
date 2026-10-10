/**
 * Shot plans: the documentary director's output format (docs/LOOK.md). Every time is a phrase the narrator says
 * ({turn, phrase}) or an offset from the shot's start; this module proves each phrase exists, times it from the audio,
 * and enforces the look's pacing and text rules. Nothing lesson-specific lives here.
 */
import {renamedHint} from './renames';
import type {DocBox, DocShot, Framing, LonLat, RegionRef, YearStamp} from '../../src/documentary/types';
import {upscaleAt} from '../../src/documentary/framing';
import type {MultiPolygon, Polygon} from 'geojson';
import {geoArea} from 'd3-geo';
import type {PipelineTurn, WordTiming} from '../pipeline-core';
import {resolvePhrase, type AnchorTiming, type PhraseAnchor} from './anchors';
import {clipFingerprint, clipPromptIssues} from './clip-fingerprint';
import {ATMOSPHERES, type Atmosphere} from '../../src/documentary/atmosphere';
import {CUSTOM_NAMES} from '../../src/components/custom/catalog';
import {expandMapViews, type MapViewDef, type ViewMapShot} from './map-views';

/** A cue: a spoken phrase, or seconds after the shot starts. */
export type Cue = PhraseAnchor | {offset: number};

export type PlanShot = (
  | {type: 'image_move' | 'portrait'; at: PhraseAnchor; image: string; from: Framing; to: Framing; presentation?: 'portrait' | 'map' | 'document' | 'scene' | 'object'; name?: string; role?: string; transition?: 'cut' | 'crossfade';
      /** The same image continuing in another framing (a split long hold): not a new use of the image. */
      continues?: boolean}
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
  | {type: 'question'; at: PauseAnchor; question: string; practice?: boolean; backdrop?: string; transition?: 'cut' | 'crossfade'}
  | {type: 'custom'; at: PhraseAnchor; component: string; beats?: PhraseAnchor[]; transition?: 'cut' | 'crossfade'}
) & {atmosphere?: string[]};

/** A pause has no words to quote: question shots are anchored to the pause turn itself ({"turn": 57}). */
export interface PauseAnchor {turn: number; phrase?: undefined}

export interface ShotPlan {
  episode: string;
  /** Map shots may be written against a library map view (see map-views.ts). */
  shots: (PlanShot | ViewMapShot)[];
  years?: {at: PhraseAnchor; text: string}[];
  boxes?: {label: string; intro: PhraseAnchor; check: PhraseAnchor; turns: {from: number; to: number}}[];
  /** Storyboard act boundaries, retained so lesson-wide variety failures can be routed to the owning act. */
  acts?: {title: string; turns: {from: number; to: number}}[];
  /** Where the last shot ends: a spoken phrase (samples) or the end of the episode audio (default). */
  end?: PhraseAnchor;
}

export interface ResolvedShotPlan {shots: DocShot[]; years: YearStamp[]; boxes: DocBox[]; endSec: number}

export interface ShotRules {minShotSec: number; maxShotSec: number; maxMapSec: number; maxBullets: number; maxBulletWords: number; maxUpscale: number; maxImageUses: number; maxClips: number; questionPauseSec: number; questionOverrunSec: number; minCustomSec: number; maxCustoms: number; lengthToleranceSec: number; maxPointsPerAct: number; maxMapsPerAct: number; maxMapRun: number; maxViewPerAct: number; maxViewPerLesson: number}
/** maxImageUses is 4 while the asset library is thin (the hand sample uses Grenville 4x); LOOK.md's target is 3. */
export const LOOK_RULES: ShotRules = {minShotSec: 1.2, maxShotSec: 8, maxMapSec: 14, maxBullets: 3, maxBulletWords: 6, maxUpscale: 1.6, maxImageUses: 4, maxClips: 2,
  /** Pauses this long or longer must be covered by a question card; a card may outlast its pause by questionOverrunSec. */
  questionPauseSec: 5, questionOverrunSec: 6,
  /** Custom explainers are signature moments: long enough to play their beat (up to maxMapSec), a couple per lesson. */
  minCustomSec: 5, maxCustoms: 2,
  /** A shot may run this much past its max length before it counts as too long (phrase timing is not exact). */
  lengthToleranceSec: 1,
  /** Storyboard variety. Per act (an act can always fix these itself): point cards, maps in a row, uses of one map view.
   *  Per lesson (warnings only, so acts never ping-pong): uses of one map view. */
  maxPointsPerAct: 2, maxMapsPerAct: 4, maxMapRun: 3, maxViewPerAct: 2, maxViewPerLesson: 3};

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
  /** Library map views by id (data/library/maps). */
  mapViews?: Record<string, MapViewDef>;
  /** Library places by id: name and [lon, lat]. */
  places?: Record<string, {name: string; location?: LonLat}>;
  /** Samples only: allow geography that is not yet approved. */
  allowUnapproved?: boolean;
  /** Images and custom explainers turned down in review (data/library/review). */
  rejectedImages?: Set<string>;
  rejectedComponents?: Set<string>;
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

export function resolveShotPlan(input: ShotPlan, turns: PipelineTurn[], timing: AnchorTiming & {totalSec: number}, words: Record<string, WordTiming[]>, opts: ResolveOptions): ResolvedShotPlan {
  const rules = opts.rules ?? LOOK_RULES;
  const frame = opts.frame ?? {width: 1920, height: 1080};
  const expanded = expandMapViews(input, opts.mapViews ?? {}, opts.places ?? {}, (opts.geo ?? {}) as never, opts.allowUnapproved);
  const plan = expanded.plan as Omit<ShotPlan, 'shots'> & {shots: PlanShot[]};
  const issues: string[] = [...expanded.issues];
  // Check named views before expansion removes their ids. Without a hard lesson gate, independently directed acts
  // each choose the same broad views and can all pass their local checks while making a repetitive final lesson.
  const sourceMaps = input.shots.map((shot, index) => ({shot, index})).filter(x => x.shot.type === 'map');
  for (const act of input.acts ?? []) {
    const inAct = sourceMaps.filter(({shot}) => shot.at.turn >= act.turns.from && shot.at.turn <= act.turns.to);
    for (const {index} of inAct.slice(rules.maxMapsPerAct)) issues.push(`shot${String(index + 1).padStart(2, '0')}: act "${act.title}" has ${inAct.length} maps; max ${rules.maxMapsPerAct}. Replace this map with a relevant picture, document, object, point card, or custom explainer`);
  }
  const viewUses = new Map<string, number[]>();
  for (const {shot, index} of sourceMaps) if ('view' in shot && typeof shot.view === 'string') viewUses.set(shot.view, [...(viewUses.get(shot.view) ?? []), index]);
  for (const [view, indexes] of viewUses) for (const index of indexes.slice(rules.maxViewPerLesson)) {
    issues.push(`shot${String(index + 1).padStart(2, '0')}: map view "${view}" occurs ${indexes.length} times in this lesson; max ${rules.maxViewPerLesson}. Replace this occurrence with a relevant non-map visual`);
  }
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

  // Question cards start when their pause starts; every other shot starts on a spoken phrase.
  const pauseStart = (where: string, a: PauseAnchor): number => {
    const turn = turns[a?.turn];
    if (!turn || turn.kind !== 'pause') { issues.push(`${where}: question cards are anchored to a pause turn ({"turn": index}); turn ${a?.turn} is not a pause`); return NaN; }
    return timing.starts[a.turn];
  };
  // When each shot's words are spoken. Offsets inside a shot count from here, not from where the shot is first seen:
  // the first shot is shown from 0s, but its moves still follow its phrase.
  const anchors = plan.shots.map((shot, i) => (shot.type === 'question' ? pauseStart(`shot ${i + 1} at`, shot.at) : phrase(`shot ${i + 1} at`, shot.at as PhraseAnchor)));
  const starts = [...anchors];
  if (starts.length) starts[0] = 0;
  const endSec = plan.end ? phrase('plan end', plan.end, 'end') : timing.totalSec;
  const shots: DocShot[] = plan.shots.map((shot, i) => {
    const id = `shot${String(i + 1).padStart(2, '0')}`;
    const startSec = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : endSec;
    const len = end - startSec;
    if (Number.isFinite(len)) {
      if (len < rules.minShotSec - 0.05) issues.push(`${id}: ${len.toFixed(2)}s is shorter than ${rules.minShotSec}s (cuts must not stutter)`);
      const pauseLen = shot.type === 'question' && turns[shot.at.turn]?.kind === 'pause' ? timing.durations[shot.at.turn] : 0;
      if (shot.type === 'custom' && len < rules.minCustomSec) issues.push(`${id}: ${len.toFixed(1)}s is too short for a custom explainer (min ${rules.minCustomSec}s); give it a longer stretch of narration`);
      const max = shot.type === 'map' || shot.type === 'custom' ? rules.maxMapSec : shot.type === 'question' ? pauseLen + rules.questionOverrunSec : rules.maxShotSec;
      if (len > max + rules.lengthToleranceSec) issues.push(`${id}: ${len.toFixed(1)}s holds longer than ${max}s on one ${shot.type} shot; cut on another spoken cue`);
    }
    const cue = (where: string, c: Cue) => ('offset' in c ? anchors[i] + c.offset : phrase(`${id} ${where}`, c));
    for (const kind of shot.atmosphere ?? []) if (!(ATMOSPHERES as readonly string[]).includes(kind)) issues.push(`${id}: unknown atmosphere "${kind}" (${ATMOSPHERES.join(', ')})`);
    if (shot.atmosphere?.length && (shot.type === 'map' || shot.type === 'custom')) issues.push(`${id}: ${shot.type} shots take no atmosphere layers`);
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
          ? {...base, type: 'portrait', image: shot.image, size, from: shot.from, to: shot.to, presentation: shot.presentation, name: shot.name ?? '', role: shot.role, depth}
          : {...base, type: 'image_move', image: shot.image, size, from: shot.from, to: shot.to, presentation: shot.presentation, depth};
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
          if (!f) { issues.push(`${id} ${where}: unknown geo id "${geoId}"${renamedHint(geoId)}`); return null; }
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
        // Relief shading is decoration: a ridge line not yet approved is left out (outside drafts), not an error.
        const ridges = (shot.terrain?.ridges ?? []).flatMap(geoId => {
          const f = opts.geo?.[geoId];
          if (f && f.properties.review.status !== 'approved' && !opts.allowUnapproved) return [];
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
      case 'question': {
        const index = shot.at.turn;
        const prev = turns[index - 1];
        const spoken = prev?.kind === 'speech' ? (prev.text ?? '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim() : '';
        const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        if (!shot.question?.trim()) issues.push(`${id}: question card needs the question text`);
        else if (!norm(spoken).includes(norm(shot.question))) issues.push(`${id}: question "${shot.question.slice(0, 60)}" is not verbatim from the line before the pause`);
        if (shot.question && shot.question.split(/\s+/).length > 40) issues.push(`${id}: question card text is over 40 words; quote the question itself, not its setup`);
        const pauseStartSec = timing.starts[index] ?? NaN;
        const pauseEndSec = pauseStartSec + (timing.durations[index] ?? 0);
        const size = shot.backdrop ? sized(id, shot.backdrop, [{x: 0.5, y: 0.5, zoom: 1.1}]) : undefined;
        return {...base, type: 'question', question: shot.question, practice: shot.practice, pauseStartSec, pauseEndSec, backdrop: shot.backdrop, size};
      }
      case 'custom': {
        if (!(CUSTOM_NAMES as string[]).includes(shot.component)) issues.push(`${id}: unknown custom component "${shot.component}" (${CUSTOM_NAMES.join(', ')})`);
        else if (opts.rejectedComponents?.has(shot.component)) issues.push(`${id}: custom explainer "${shot.component}" was turned down in review; use a standard shot`);
        // Beats: the explainer's phases start on these spoken phrases (docs/STORYBOARD.md, decision 8).
        const beatsSec = (shot.beats ?? []).map((b, n) => phrase(`${id} beat ${n + 1}`, b));
        return {...base, type: 'custom', component: shot.component, ...(beatsSec.length ? {beatsSec} : {})};
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
  // Every scripted pause long enough to answer in gets a question card starting on it.
  const carded = new Set(plan.shots.filter(sh => sh.type === 'question').map(sh => sh.at.turn));
  turns.forEach((turn, i) => {
    if (turn.kind !== 'pause' || timing.durations[i] < rules.questionPauseSec || timing.starts[i] >= endSec) return;
    if (!carded.has(i)) issues.push(`turn ${i} (${turn.id}): ${timing.durations[i]}s pause has no question card ({"type":"question","at":{"turn":${i}}})`);
  });
  // Variety: no image carries too many shots; LTX clips are for a few hero moments only.
  const uses = new Map<string, string[]>();
  for (const shot of shots) {
    const image = 'image' in shot ? shot.image : shot.type === 'point' ? shot.backdrop : shot.type === 'question' ? shot.backdrop ?? null : null;
    const continues = (plan.shots[shots.indexOf(shot)] as {continues?: boolean} | undefined)?.continues;
    if (image && !continues) uses.set(image, [...(uses.get(image) ?? []), shot.id]);
    if (image && opts.rejectedImages?.has(image)) issues.push(`${shot.id}: "${image}" was turned down in review; use a different asset`);
  }
  // Report every occurrence beyond the budget, not only the first one. The
  // documentary director repairs acts independently; one aggregate issue
  // assigned to the fifth shot otherwise leaves the sixth, seventh, etc. in
  // other acts undiscovered until later rounds and makes repairs oscillate.
  for (const [image, ids] of uses) for (const id of ids.slice(rules.maxImageUses)) {
    issues.push(`${id}: "${image}" exceeds the lesson image budget: occurrence ${ids.indexOf(id) + 1} of ${ids.length} (${ids.join(', ')}); max ${rules.maxImageUses}. Replace this occurrence with a different relevant asset`);
  }
  const clipShots = shots.filter(s => s.type === 'clip');
  for (const shot of clipShots.slice(rules.maxClips)) issues.push(`${shot.id}: LTX clip exceeds the lesson budget (${clipShots.length} total; max ${rules.maxClips}); replace this occurrence with an image_move shot`);
  const customShots = shots.filter(s => s.type === 'custom');
  for (const shot of customShots.slice(rules.maxCustoms)) issues.push(`${shot.id}: custom explainer exceeds the lesson budget (${customShots.length} total; max ${rules.maxCustoms}); replace this occurrence with a standard shot`);
  const customSeen = new Map<string, string>();
  for (const s of customShots) {
    if (s.type !== 'custom') continue;
    if (customSeen.has(s.component)) issues.push(`${s.id}: custom explainer "${s.component}" already used in ${customSeen.get(s.component)}`);
    else customSeen.set(s.component, s.id);
  }
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
