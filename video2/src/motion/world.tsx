/**
 * World canvas + camera. A scene is drawn ONCE on a large canvas (lon/lat projected), and a
 * camera flies over it: keyframes give a geographic centre + zoom at a time, eased between.
 * Everything placed on the world (ships, arcs, towns) moves with the camera for free.
 */
import { geoConicEqualArea, geoNaturalEarth1, geoPath, type GeoProjection } from 'd3-geo';
import type { FeatureCollection, MultiPolygon } from 'geojson';
import React, { createContext, useContext, useMemo } from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopo from 'world-atlas/land-50m.json';
import {NATURAL_LAKES} from './natural-lakes';
import { US_STATE_LINES } from '../components/geo/usGeo';
import { COLOR } from '../theme/tokens';

export type LonLat = [number, number];

/** World canvas size (px). Large so close-ups stay crisp. */
export const WORLD_W = 4800;
export const WORLD_H = 2800;

export interface WorldSpec {
  /** lon/lat extent the canvas covers */
  extent: [LonLat, LonLat];
  /** 'world' = Natural Earth (oceans, continents); 'us' = Albers-style conic (US history maps). */
  projection?: 'world' | 'us';
  /** Draw US state lines on top of the land (default: true for 'us', false for 'world'). */
  states?: boolean;
}

const LAND = (() => {
  const t = landTopo as unknown as Topology<{ land: GeometryCollection }>;
  return feature(t, t.objects.land) as unknown as FeatureCollection<MultiPolygon> | MultiPolygon;
})();

/** Major natural lakes (Natural Earth 50m, public domain, reservoirs removed): the land layer has none, so the Great Lakes would read as land. */
const LAKES = NATURAL_LAKES;

export function worldProjection(spec: WorldSpec): GeoProjection {
  const [[w, s], [e, n]] = spec.extent;
  const base = spec.projection === 'us' ? geoConicEqualArea().parallels([29.5, 45.5]).rotate([96, 0]) : geoNaturalEarth1();
  return base.fitExtent([[0, 0], [WORLD_W, WORLD_H]], {
    type: 'MultiPoint',
    coordinates: [[w, s], [e, s], [e, n], [w, n], [(w + e) / 2, n], [(w + e) / 2, s]],
  });
}

/* ---------------------------------- camera ---------------------------------- */

export interface CameraKey {
  /** seconds */
  t: number;
  center: LonLat;
  /** 1 = the whole canvas width fills the frame */
  zoom: number;
  /** seconds to ease into this key (default 1.6) */
  ease?: number;
}

export interface CameraState { x: number; y: number; s: number }

const smooth = Easing.bezier(0.65, 0, 0.35, 1);

/** Camera at time t: hold each key, ease into the next over its `ease` seconds. */
export function cameraAt(keys: CameraKey[], t: number, proj: GeoProjection, frameW: number): CameraState {
  const at = (k: CameraKey) => {
    const [x, y] = proj(k.center) ?? [WORLD_W / 2, WORLD_H / 2];
    return { x, y, s: (frameW / WORLD_W) * k.zoom };
  };
  let cur = at(keys[0]);
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t < k.t) break;
    const from = cur;
    const to = at(k);
    const p = interpolate(t, [k.t, k.t + (k.ease ?? 1.6)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: smooth });
    // zoom eases in log space so zoom-outs and zoom-ins feel symmetric
    cur = { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p, s: Math.exp(Math.log(from.s) + (Math.log(to.s) - Math.log(from.s)) * p) };
  }
  return cur;
}

/* ---------------------------------- context ---------------------------------- */

interface WorldCtx { proj: GeoProjection; cam: CameraState; camMoving: boolean; t: number; fps: number; frameW: number; frameH: number }
const Ctx = createContext<WorldCtx | null>(null);
export const useWorld = (): WorldCtx => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useWorld must be used inside <World>');
  return c;
};

/**
 * <World>: the camera-moved canvas. Put world-space content in <WorldLayer> (moves 1:1 with
 * the map); <Parallax depth={…}> layers move at other rates for depth. Screen-space overlays
 * are plain absolutely-positioned children.
 */
export const World: React.FC<{ spec: WorldSpec; camera: CameraKey[]; palette?: 'parchment' | 'night'; children?: React.ReactNode }> = ({ spec, camera, palette = 'parchment', children }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const proj = useMemo(() => worldProjection(spec), [spec]);
  const cam = cameraAt(camera, t, proj, width);
  // camera in motion → items are in transit (the guard re-checks them when it settles)
  const next = cameraAt(camera, t + 1 / fps, proj, width);
  const camMoving = Math.abs(next.x - cam.x) * cam.s > 0.5 || Math.abs(next.y - cam.y) * cam.s > 0.5 || Math.abs(next.s / cam.s - 1) > 0.002;
  const landD = useMemo(() => geoPath(proj)(LAND as never) ?? '', [proj]);
  const lakesD = useMemo(() => geoPath(proj)(LAKES) ?? '', [proj]);
  const showStates = spec.states ?? spec.projection === 'us';
  const usD = useMemo(() => (showStates ? { states: geoPath(proj)(US_STATE_LINES) ?? '' } : null), [proj, showStates]);
  const colors = palette === 'parchment'
    ? { ocean: COLOR.ocean, oceanDeep: COLOR.oceanDeep, land: COLOR.paperDeep, coast: COLOR.coast }
    : { ocean: COLOR.nightOcean, oceanDeep: COLOR.night, land: COLOR.nightLand, coast: COLOR.nightCoast };
  return (
    <Ctx.Provider value={{ proj, cam, camMoving, t, fps, frameW: width, frameH: height }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: colors.oceanDeep }}>
        <WorldLayer>
          <svg width={WORLD_W} height={WORLD_H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            <defs>
              <radialGradient id="ocean-grad" cx="50%" cy="45%" r="70%">
                <stop offset="0%" stopColor={colors.ocean} />
                <stop offset="100%" stopColor={colors.oceanDeep} />
              </radialGradient>
            </defs>
            <rect x={-WORLD_W} y={-WORLD_H} width={WORLD_W * 3} height={WORLD_H * 3} fill="url(#ocean-grad)" />
            <path d={landD} fill={colors.land} stroke={colors.coast} strokeWidth={2.2} strokeLinejoin="round" />
            <path d={lakesD} fill={colors.ocean} stroke={colors.coast} strokeWidth={1.4} strokeLinejoin="round" />
            {usD && <path d={usD.states} fill="none" stroke={colors.coast} strokeOpacity={0.35} strokeWidth={1.6} />}
          </svg>
        </WorldLayer>
        {children}
      </div>
    </Ctx.Provider>
  );
};

/** A layer pinned to the world (moves exactly with the map). */
export const WorldLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { cam, camMoving, frameW, frameH } = useWorld();
  return (
    // map content only: screen overlays don't move with the camera and stay judged
    <div data-guard-moving={camMoving ? '1' : undefined} style={{ position: 'absolute', left: 0, top: 0, width: WORLD_W, height: WORLD_H, transformOrigin: '0 0',
      transform: `translate(${frameW / 2 - cam.x * cam.s}px, ${frameH / 2 - cam.y * cam.s}px) scale(${cam.s})` }}>
      {children}
    </div>
  );
};

/** World → screen point (for screen-space labels that must track a world point). */
export const toScreen = (w: WorldCtx, ll: LonLat): [number, number] => {
  const [x, y] = w.proj(ll) ?? [0, 0];
  return [w.frameW / 2 + (x - w.cam.x) * w.cam.s, w.frameH / 2 + (y - w.cam.y) * w.cam.s];
};
