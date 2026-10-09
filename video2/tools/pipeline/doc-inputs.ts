/** Everything a documentary shot plan resolves against, loaded the same way by doc-render and doc-clips. */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {ROOT} from '../lib';
import {normalizeTurns, readJson, sha256, type PipelineTurn, type WordTiming} from '../pipeline-core';
import {DESKTOP_SETTINGS, PAINTING_NEGATIVE, ltxBackend} from './clip-fingerprint';
import {resolveShotPlan, type GeoFeature, type ResolveOptions, type ResolvedShotPlan, type ShotPlan} from './shots';

export const GENERATOR = join(ROOT, 'tools', 'animate_still.py');
export const DESKTOP_CLIENT = join(ROOT, 'tools', 'ltx_desktop.py');

/** Fingerprint input for the active LTX backend: the client/generator source plus the settings it is driven with. */
function generatorKey(): string {
  const backend = ltxBackend();
  const script = backend === 'desktop' ? DESKTOP_CLIENT : GENERATOR;
  const source = existsSync(script) ? sha256(readFileSync(script)) : 'missing';
  return sha256(JSON.stringify(backend === 'desktop' ? {backend, source, settings: DESKTOP_SETTINGS, negative: PAINTING_NEGATIVE} : {backend, source}));
}
export const clipsDirFor = (episode: string) => join(ROOT, 'public', 'clips', episode);
export interface ClipManifest {[fingerprint: string]: {path: string; durationSec: number; prompt: string; image: string; seed: number; createdAt: string}}

export interface DocInputs {
  episode: string;
  turns: PipelineTurn[];
  timing: {starts: number[]; durations: number[]; totalSec: number};
  words: Record<string, WordTiming[]>;
  estimated: boolean;
  options: ResolveOptions;
  /** The shot plan, when a plan path was given. */
  plan?: ShotPlan;
}

export function loadDocInputs(episode: string, planPath: string | null, draft: boolean): DocInputs {
  const dataDir = join(ROOT, 'data', episode);
  const turns = normalizeTurns(readJson(join(dataDir, 'turns.json')));
  const timing = readJson<DocInputs['timing']>(join(dataDir, 'timing_map.json'));
  const wordsPath = join(dataDir, 'word_times.json');
  const words = existsSync(wordsPath) ? readJson<Record<string, WordTiming[]>>(wordsPath) : {};
  const lock = readJson<Record<string, {width?: number; height?: number; sha256?: string}>>(join(ROOT, 'data', 'images.lock.json'));
  const present = Object.entries(lock).filter(([path]) => existsSync(join(ROOT, 'public', path)));
  const imageSizes = Object.fromEntries(present.filter(([, v]) => v.width && v.height).map(([path, v]) => [path, {width: v.width!, height: v.height!}]));
  const imageShas = Object.fromEntries(present.filter(([, v]) => v.sha256).map(([path, v]) => [path, v.sha256!]));
  // Depth maps from tools/depth-maps.py: public/depth/<image path>.png
  const depthMaps = Object.fromEntries(present
    .map(([path]) => [path, `depth/${path.replace(/\.[^.]+$/, '')}.png`] as const)
    .filter(([, depth]) => existsSync(join(ROOT, 'public', depth))));
  const libDir = join(ROOT, 'data', 'library');
  const geo = Object.fromEntries(readdirSync(join(libDir, 'geo')).filter(name => name.endsWith('.geojson')).flatMap(name => {
    const data = readJson<{type: string; geometry?: GeoFeature['geometry']; properties?: GeoFeature['properties']; features?: GeoFeature[]}>(join(libDir, 'geo', name));
    const features = data.type === 'FeatureCollection' ? data.features ?? [] : [{geometry: data.geometry!, properties: data.properties!}];
    return features.map(f => [f.properties.id, f] as const);
  }));
  const places = Object.fromEntries(readJson<{id: string; name: string; location?: [number, number]}[]>(join(libDir, 'entities', 'places.json')).map(p => [p.id, p]));
  const manifestPath = join(clipsDirFor(episode), 'clips.json');
  const manifest = existsSync(manifestPath) ? readJson<ClipManifest>(manifestPath) : {};
  const clips = Object.fromEntries(Object.entries(manifest)
    .filter(([, c]) => existsSync(join(ROOT, 'public', c.path)))
    .map(([fp, c]) => [fp, {path: c.path, durationSec: c.durationSec}]));
  return {
    episode, turns, timing, words, estimated: !existsSync(wordsPath),
    plan: planPath ? readJson<ShotPlan>(resolve(planPath)) : undefined,
    options: {
      imageSizes, imageShas, depthMaps, geo, places, clips,
      generatorSha: generatorKey(),
      allowEstimated: !existsSync(wordsPath), allowUnapproved: draft,
    },
  };
}

export function resolveDocPlan(inputs: DocInputs): ResolvedShotPlan {
  if (!inputs.plan) throw new Error('no shot plan loaded');
  return resolveShotPlan(inputs.plan, inputs.turns, inputs.timing, inputs.words, inputs.options);
}
