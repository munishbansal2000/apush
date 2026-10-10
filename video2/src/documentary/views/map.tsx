/** Map shots: the drawn map with regions, routes, points, labels, terrain, tilt and camera moves. */
import React, {useContext, useMemo} from 'react';
import {Img, interpolate, staticFile, useVideoConfig} from 'remotion';
import {geoPath} from 'd3-geo';
import type {Feature, FeatureCollection, MultiPolygon, Polygon} from 'geojson';
import {feature} from 'topojson-client';
import type {GeometryCollection, Topology} from 'topojson-specification';
import countriesTopo from 'world-atlas/countries-50m.json';
import {World, WorldLayer, useWorld} from '../../motion/world';
import {densify, ringFeature, stateFeature} from '../../motion/territory';
import {US_RIVERS} from '../../components/geo/usGeo';
import {COLOR, FONT} from '../../theme/tokens';
import {ChromeZones, labelBox, labelVisibility} from '../chrome-zones';
import type {LonLat, MapShot, RegionRef} from '../types';
import {clamp} from './common';

/* ------------------------------------ maps ------------------------------------ */

const COUNTRIES = (() => {
  const t = countriesTopo as unknown as Topology<{countries: GeometryCollection<{name: string}>}>;
  return feature(t, t.objects.countries) as unknown as FeatureCollection<Polygon | MultiPolygon, {name: string}>;
})();

export function regionFeature(region: RegionRef): Feature<Polygon | MultiPolygon> | undefined {
  if ('state' in region) return stateFeature(region.state);
  if ('country' in region) return COUNTRIES.features.find(f => f.properties.name === region.country);
  if ('geometry' in region) return {type: 'Feature', properties: {}, geometry: region.geometry as Polygon | MultiPolygon};
  return ringFeature(region.ring);
}

const RIVER_COLOR = '#6f9aa0';
const RELIEF = '#8a6a3f';

const RegionFill: React.FC<{region: RegionRef; from: number; color: string}> = ({region, from, color}) => {
  const w = useWorld();
  const d = useMemo(() => {
    const f = regionFeature(region);
    return f ? geoPath(w.proj)(f) ?? '' : '';
  }, [w.proj, region]);
  const o = interpolate(w.t, [from, from + 0.5], [0, 1], clamp);
  if (o <= 0 || !d) return null;
  // The fill flashes bright as it lands, then settles.
  const glow = interpolate(w.t, [from, from + 0.25, from + 1.2], [0, 1, 0.35], clamp);
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <path d={d} fill={color} fillOpacity={0.5 * o} stroke={color} strokeWidth={6 / w.cam.s} strokeOpacity={o} strokeLinejoin="round" />
        <path d={d} fill="none" stroke={COLOR.foam} strokeWidth={10 / w.cam.s} strokeOpacity={glow * 0.6} strokeLinejoin="round" />
      </svg>
    </WorldLayer>
  );
};

/** Relief shading: a soft brown highland band with hachure ticks along each ridge line, plus major rivers. */
const Terrain: React.FC<{ridges: LonLat[][]; rivers?: boolean}> = ({ridges, rivers}) => {
  const w = useWorld();
  const ridgePaths = useMemo(() => ridges.map(r => geoPath(w.proj)({type: 'LineString', coordinates: densify(r, 0.25)}) ?? ''), [w.proj, ridges]);
  const riverPaths = useMemo(() => (rivers ? US_RIVERS.features.filter(f => f.properties.scalerank <= 6).map(f => geoPath(w.proj)(f) ?? '') : []), [w.proj, rivers]);
  const k = 1 / w.cam.s;
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs><filter id="relief-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={18} /></filter></defs>
        {ridgePaths.map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke={RELIEF} strokeOpacity={0.35} strokeWidth={90} strokeLinecap="round" strokeLinejoin="round" filter="url(#relief-blur)" />
            <path d={d} fill="none" stroke={RELIEF} strokeOpacity={0.55} strokeWidth={34} strokeDasharray="3 9" strokeLinecap="butt" />
          </g>
        ))}
        {riverPaths.map((d, i) => <path key={`r${i}`} d={d} fill="none" stroke={RIVER_COLOR} strokeOpacity={0.8} strokeWidth={2.6 * Math.max(1, k * 0.8)} strokeLinecap="round" />)}
      </svg>
    </WorldLayer>
  );
};

/** Animated route/border with an optional arrowhead that appears as the line finishes drawing. */
const RouteLine: React.FC<{coords: LonLat[]; from: number; draw: number; color: string; dashed?: boolean; arrow?: boolean}> = ({coords, from, draw, color, dashed, arrow}) => {
  const w = useWorld();
  const pts = useMemo(() => densify(coords, 0.25).map(ll => w.proj(ll) ?? [0, 0]), [w.proj, coords]);
  const d = useMemo(() => geoPath(w.proj)({type: 'LineString', coordinates: densify(coords, 0.25)}) ?? '', [w.proj, coords]);
  const p = interpolate(w.t, [from, from + draw], [0, 1], clamp);
  if (p <= 0) return null;
  const k = 1 / w.cam.s;
  const [x1, y1] = pts[pts.length - 1];
  const [x0, y0] = pts[Math.max(0, pts.length - 4)];
  const angle = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  const head = interpolate(p, [0.9, 1], [0, 1], clamp);
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <path d={d} fill="none" stroke={COLOR.halo} strokeWidth={11 * k} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
        <path d={d} fill="none" stroke={color} strokeWidth={6 * k} strokeLinecap="round" pathLength={1}
          strokeDasharray={dashed && p >= 1 ? undefined : `${p} 1`} style={dashed && p >= 1 ? {strokeDasharray: `${18 * k} ${12 * k}`} : undefined} />
        {arrow && head > 0 && (
          <path d={`M 0 0 L ${-30 * k} ${-16 * k} L ${-22 * k} 0 L ${-30 * k} ${16 * k} Z`} fill={color} stroke={COLOR.halo} strokeWidth={3 * k}
            transform={`translate(${x1} ${y1}) rotate(${angle}) scale(${head})`} />
        )}
      </svg>
    </WorldLayer>
  );
};

const LABEL_STYLE = {
  region: {size: 46, weight: 700, spacing: 0.22, color: COLOR.ink, italic: false},
  ocean: {size: 40, weight: 400, spacing: 0.35, color: '#3f5f63', italic: true},
  town: {size: 30, weight: 700, spacing: 0.08, color: COLOR.ink, italic: false},
} as const;

/** Old-map typography pinned to the world, constant on-screen size, haloed for legibility. */
const MapLabel: React.FC<{text: string; at: LonLat; from: number; style?: 'region' | 'ocean' | 'town'; dy?: number}> = ({text, at, from, style = 'region', dy = 0}) => {
  const w = useWorld();
  const zones = useContext(ChromeZones);
  const st = LABEL_STYLE[style];
  const k = 1 / w.cam.s;
  const [x, y] = w.proj(at) ?? [0, 0];
  // Constant on-screen size: the box on screen decides whether the label is near an edge or under the year stamp.
  const box = labelBox(w.frameW / 2 + (x - w.cam.x) * w.cam.s, w.frameH / 2 + (y + dy * k - w.cam.y) * w.cam.s, text, st.size, st.spacing);
  const o = interpolate(w.t, [from, from + 0.6], [0, 1], clamp) * labelVisibility(box, w.frameW, w.frameH, zones);
  if (o <= 0.01) return null;
  const fs = st.size * k;
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <text data-guard-item={`map label: ${text}`} x={x} y={y + dy * k} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT.display}
          fontSize={fs} fontWeight={st.weight} fontStyle={st.italic ? 'italic' : 'normal'} letterSpacing={fs * st.spacing} fill={st.color}
          stroke={COLOR.halo} strokeWidth={fs * 0.22} paintOrder="stroke" opacity={o}>
          {text.toUpperCase()}
        </text>
      </svg>
    </WorldLayer>
  );
};

const MapPoint: React.FC<{at: LonLat; label?: string; from: number; kind?: 'town' | 'fort' | 'battle'}> = ({at, label, from, kind = 'town'}) => {
  const w = useWorld();
  const pop = interpolate(w.t, [from, from + 0.25, from + 0.45], [0, 1.35, 1], clamp);
  if (pop <= 0) return null;
  const k = 1 / w.cam.s;
  const [x, y] = w.proj(at) ?? [0, 0];
  const r = 10 * k * pop;
  return (
    <>
      <WorldLayer>
        <svg width={1} height={1} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {kind === 'fort'
            ? <rect x={x - r} y={y - r} width={2 * r} height={2 * r} fill={COLOR.red} stroke={COLOR.halo} strokeWidth={4 * k} transform={`rotate(45 ${x} ${y})`} />
            : kind === 'battle'
              ? <path d={`M ${x - r} ${y - r} L ${x + r} ${y + r} M ${x + r} ${y - r} L ${x - r} ${y + r}`} stroke={COLOR.red} strokeWidth={6 * k} strokeLinecap="round" />
              : <circle cx={x} cy={y} r={r} fill={COLOR.ink} stroke={COLOR.halo} strokeWidth={4 * k} />}
        </svg>
      </WorldLayer>
      {label && <MapLabel text={label} at={at} from={from + 0.15} style="town" dy={-34} />}
    </>
  );
};

export const MapView: React.FC<{shot: MapShot; lead: number}> = ({shot, lead}) => {
  const {width, height} = useVideoConfig();
  // Shot times are absolute; the Sequence starts `lead` seconds before shot.startSec.
  const local = (sec: number) => sec - shot.startSec + lead;
  const spec = useMemo(() => ({extent: shot.extent, projection: shot.projection, states: false}), [shot.extent, shot.projection]);
  const camera = useMemo(() => shot.camera.map(k => ({t: k.sec - shot.startSec + lead, center: k.center, zoom: k.zoom, ease: k.ease})), [shot, lead]);
  const tilt = shot.tilt ?? 0;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#2a2016'}}>
      {/* Tilted table map: rotate back in perspective, scaled so the tilted plane still covers the frame. */}
      <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 60%', transform: tilt ? `perspective(${height * 1.8}px) rotateX(${tilt}deg) scale(${1 + tilt / 60})` : undefined}}>
        <World spec={spec} camera={camera} palette="parchment">
          {shot.terrain && <Terrain ridges={shot.terrain.ridges} rivers={shot.terrain.rivers} />}
          {(shot.fills ?? []).map((f, i) => <RegionFill key={i} region={f.region} from={local(f.sec)} color={f.color} />)}
          {(shot.lines ?? []).map((l, i) => <RouteLine key={`l${i}`} coords={l.coords} from={local(l.sec)} draw={l.draw ?? 1.6} color={l.color ?? COLOR.red} dashed={l.dashed} arrow={l.arrow} />)}
          {(shot.points ?? []).map((pt, i) => <MapPoint key={`p${i}`} at={pt.at} label={pt.label} from={local(pt.sec)} kind={pt.kind} />)}
          {(shot.labels ?? []).map((lb, i) => <MapLabel key={`t${i}`} text={lb.text} at={lb.at} from={local(lb.sec)} style={lb.style} />)}
        </World>
      </div>
      {/* Paper texture and edge burn make the map read as an old printed sheet. */}
      <Img src={staticFile('textures/parchment.jpg')} style={{position: 'absolute', inset: 0, width, height, objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.4}} />
      <div style={{position: 'absolute', inset: 0, boxShadow: `inset 0 0 ${width * 0.12}px rgba(60,35,10,0.55)`}} />
      {shot.approx && (
        <div data-guard-item="approx note" style={{position: 'absolute', right: 120, bottom: 70, fontFamily: FONT.text, fontStyle: 'italic', fontSize: 24, color: 'rgba(43,29,14,0.75)'}}>
          Boundaries approximate
        </div>
      )}
    </div>
  );
};
