/**
 * Shot plans: the documentary director's output format (docs/LOOK.md). Every time is a phrase the narrator says
 * ({turn, phrase}) or an offset from the shot's start; this module proves each phrase exists, times it from the audio,
 * and enforces the look's pacing and text rules. Nothing lesson-specific lives here.
 */
import type {DocBox, DocShot, Framing, LonLat, RegionRef, YearStamp} from '../../src/documentary/types';
import {upscaleAt} from '../../src/documentary/framing';
import type {PipelineTurn, WordTiming} from '../pipeline-core';
import {resolvePhrase, type AnchorTiming, type PhraseAnchor} from './anchors';

/** A cue: a spoken phrase, or seconds after the shot starts. */
export type Cue = PhraseAnchor | {offset: number};

type PlanShot =
  | {type: 'image_move' | 'portrait'; at: PhraseAnchor; image: string; from: Framing; to: Framing; name?: string; role?: string; transition?: 'cut' | 'crossfade'}
  | {type: 'map'; at: PhraseAnchor; projection: 'us' | 'world'; extent: [LonLat, LonLat]; camera: {at: Cue; center: LonLat; zoom: number; ease?: number}[];
      fills?: {at: Cue; region: RegionRef; color: string}[]; lines?: {at: Cue; coords: LonLat[]; color?: string; dashed?: boolean; draw?: number}[]; transition?: 'cut' | 'crossfade'}
  | {type: 'point'; at: PhraseAnchor; backdrop: string; bullets: {at: Cue; text: string}[]; transition?: 'cut' | 'crossfade'};

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
    const base = {id, startSec, endSec: end, transition: shot.transition};
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
      case 'map':
        if (!shot.camera.length) issues.push(`${id}: map needs at least one camera key`);
        return {
          ...base, type: 'map', projection: shot.projection, extent: shot.extent,
          camera: shot.camera.map((k, n) => ({sec: cue(`camera ${n + 1}`, k.at), center: k.center, zoom: k.zoom, ease: k.ease})),
          fills: (shot.fills ?? []).map((f, n) => ({sec: cue(`fill ${n + 1}`, f.at), region: f.region, color: f.color})),
          lines: (shot.lines ?? []).map((l, n) => ({sec: cue(`line ${n + 1}`, l.at), coords: l.coords, color: l.color, dashed: l.dashed, draw: l.draw})),
        };
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
