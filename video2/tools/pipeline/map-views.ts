/**
 * Map views (data/library/maps/*.json): reusable map setups (projection, extent, opening camera, tilt, terrain, base
 * labels, named camera targets). The director picks a view by id and adds only what the narration drives: camera
 * moves to a named target or a place, fills, lines and points by library id, colours by name. That keeps map shots
 * short and coordinate-free; expandMapViews turns them into the full map shot the resolver checks.
 */
import {existsSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import type {LonLat} from '../../src/documentary/types';
import {readJson} from '../pipeline-core';
import type {PhraseAnchor} from './anchors';
import type {Cue, PlanShot, ShotPlan} from './shots';

export interface MapViewDef {
  id: string;
  name: string;
  projection: 'us' | 'world';
  extent: [LonLat, LonLat];
  /** Opening framing. */
  camera: {center: LonLat; zoom: number};
  tilt?: number;
  terrain?: {ridges: string[]; rivers?: boolean};
  /** Base map typography (oceans, regions), faded in at the start. */
  labels?: {text: string; lonlat: LonLat; style?: 'region' | 'ocean' | 'town'}[];
  /** Named camera targets the director can move to. */
  focus?: Record<string, {center: LonLat; zoom: number}>;
}

/** A map shot written against a view: no coordinates. */
export interface ViewMapShot {
  type: 'map';
  at: PhraseAnchor;
  view: string;
  /** Camera moves: to a focus name of the view, or a place id (zoom defaults to 1.4x the view's opening zoom). */
  moves?: {at: Cue; to: string; zoom?: number; ease?: number}[];
  fills?: {at: Cue; region: {geo: string} | {state: string} | {country: string}; color: string}[];
  lines?: {at: Cue; geo: string; color?: string; dashed?: boolean; draw?: number; arrow?: boolean}[];
  points?: {at: Cue; place: string; kind?: 'town' | 'fort' | 'battle'; label?: string}[];
  labels?: {at: Cue; text: string; lonlat: LonLat; style?: 'region' | 'ocean' | 'town'}[];
  transition?: 'cut' | 'crossfade';
}

/** Colour names the director may use instead of hex (the map palette). */
export const MAP_COLORS: Record<string, string> = {gold: '#c9a227', amber: '#e2a33b', red: '#b3261e', blue: '#2c5aa0', ink: '#2b1d0e'};
const color = (c: string | undefined) => (c && MAP_COLORS[c.toLowerCase()]) ?? c;

export function loadMapViews(libDir: string): Record<string, MapViewDef> {
  const dir = join(libDir, 'maps');
  if (!existsSync(dir)) return {};
  return Object.fromEntries(readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
    const view = readJson<MapViewDef>(join(dir, f));
    return [view.id, view] as const;
  }));
}

const isViewShot = (shot: PlanShot | ViewMapShot): shot is ViewMapShot => shot.type === 'map' && typeof (shot as ViewMapShot).view === 'string';

/** Expands view-based map shots (and colour names on every map) into full map shots; reports unknown views/targets. */
export function expandMapViews(
  plan: ShotPlan,
  views: Record<string, MapViewDef>,
  places: Record<string, {name: string; location?: LonLat}>,
): {plan: ShotPlan; issues: string[]} {
  const issues: string[] = [];
  const shots = (plan.shots as (PlanShot | ViewMapShot)[]).map((shot, i): PlanShot => {
    if (shot.type !== 'map') return shot;
    if (!isViewShot(shot)) {
      return {...shot, fills: shot.fills?.map(f => ({...f, color: color(f.color)!})), lines: shot.lines?.map(l => ({...l, color: color(l.color)}))};
    }
    const where = `shot ${i + 1}`;
    const view = views[shot.view];
    if (!view) {
      issues.push(`${where}: unknown map view "${shot.view}" (${Object.keys(views).join(', ') || 'none in data/library/maps'})`);
      return {type: 'map', at: shot.at, projection: 'us', extent: [[-100, 20], [-60, 50]], camera: [{at: {offset: 0}, center: [-80, 35], zoom: 1}]} as PlanShot;
    }
    const camera = [{at: {offset: 0} as Cue, center: view.camera.center, zoom: view.camera.zoom}];
    (shot.moves ?? []).forEach((m, n) => {
      const focus = view.focus?.[m.to];
      const place = places[m.to];
      if (focus) camera.push({at: m.at, center: focus.center, zoom: m.zoom ?? focus.zoom, ...(m.ease ? {ease: m.ease} : {})});
      else if (place?.location) camera.push({at: m.at, center: place.location, zoom: m.zoom ?? view.camera.zoom * 1.4, ...(m.ease ? {ease: m.ease} : {})});
      else issues.push(`${where} move ${n + 1}: "${m.to}" is not a focus of ${view.id} (${Object.keys(view.focus ?? {}).join(', ') || 'none'}) or a place with a location`);
    });
    const base = (view.labels ?? []).map((l, n) => ({at: {offset: 0.3 + 0.25 * n} as Cue, text: l.text, lonlat: l.lonlat, style: l.style}));
    return {
      type: 'map', at: shot.at, transition: shot.transition,
      projection: view.projection, extent: view.extent, tilt: view.tilt, terrain: view.terrain,
      camera,
      fills: shot.fills?.map(f => ({...f, color: color(f.color)!})),
      lines: shot.lines?.map(l => ({...l, color: color(l.color)})),
      points: shot.points,
      labels: [...base, ...(shot.labels ?? [])],
    };
  });
  return {plan: {...plan, shots}, issues};
}
