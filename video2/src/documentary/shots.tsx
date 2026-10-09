/** Full-bleed documentary shots. Every shot moves for its whole duration; all text follows docs/LOOK.md. */
import React, {useMemo} from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {geoPath} from 'd3-geo';
import type {Feature, FeatureCollection, MultiPolygon, Polygon} from 'geojson';
import {feature} from 'topojson-client';
import type {GeometryCollection, Topology} from 'topojson-specification';
import countriesTopo from 'world-atlas/countries-50m.json';
import {World, WorldLayer, useWorld} from '../motion/world';
import {MapLine, densify, ringFeature, stateFeature} from '../motion/territory';
import {COLOR, FONT} from '../theme/tokens';
import {frameImage, framingAt} from './framing';
import type {Framing, ImageMoveShot, MapShot, PointShot, PortraitShot, RegionRef} from './types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Local seconds since the shot's Sequence started. */
const useLocalSec = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return frame / fps;
};

/* --------------------------------- image moves --------------------------------- */

export const ImageMove: React.FC<{image: string; size: {width: number; height: number}; from: Framing; to: Framing; durationSec: number; dim?: number; blur?: number}> = ({image, size, from, to, durationSec, dim = 0, blur = 0}) => {
  const t = useLocalSec();
  const {width, height} = useVideoConfig();
  const {scale, tx, ty} = frameImage(size, framingAt(from, to, t / durationSec), {width, height});
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: COLOR.night}}>
      <Img src={staticFile(image)} style={{position: 'absolute', left: 0, top: 0, width: size.width, height: size.height, maxWidth: 'none',
        transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${scale})`, filter: blur ? `blur(${blur}px)` : undefined}} />
      {dim > 0 && <div style={{position: 'absolute', inset: 0, background: `rgba(10,8,6,${dim})`}} />}
    </div>
  );
};

/** Name + role, lower left, for ~2.4s when a person is introduced. */
export const NameTag: React.FC<{name: string; role?: string}> = ({name, role}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: frame - Math.round(0.35 * fps), fps, config: {damping: 200}, durationInFrames: 14});
  const exit = interpolate(frame, [Math.round(2.6 * fps), Math.round(3.0 * fps)], [1, 0], clamp);
  const o = Math.min(enter, exit);
  return (
    <div data-guard-item="name tag" style={{position: 'absolute', left: 120, bottom: 130, opacity: o, transform: `translateX(${(1 - enter) * -40}px)`}}>
      <div style={{width: 90 * enter, height: 4, background: COLOR.gold, marginBottom: 18}} />
      <div style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: COLOR.onNight, letterSpacing: 2, textShadow: '0 4px 24px rgba(0,0,0,0.7)'}}>{name}</div>
      {role && <div style={{fontFamily: FONT.text, fontStyle: 'italic', fontSize: 34, color: COLOR.paperDeep, marginTop: 8, textShadow: '0 3px 18px rgba(0,0,0,0.8)'}}>{role}</div>}
    </div>
  );
};

export const ImageMoveView: React.FC<{shot: ImageMoveShot | PortraitShot; lead: number}> = ({shot, lead}) => (
  <>
    <ImageMove image={shot.image} size={shot.size} from={shot.from} to={shot.to} durationSec={shot.endSec - shot.startSec + lead} />
    {shot.type === 'portrait' && <NameTag name={shot.name} role={shot.role} />}
  </>
);

/* ------------------------------------ maps ------------------------------------ */

const COUNTRIES = (() => {
  const t = countriesTopo as unknown as Topology<{countries: GeometryCollection<{name: string}>}>;
  return feature(t, t.objects.countries) as unknown as FeatureCollection<Polygon | MultiPolygon, {name: string}>;
})();

export function regionFeature(region: RegionRef): Feature<Polygon | MultiPolygon> | undefined {
  if ('state' in region) return stateFeature(region.state);
  if ('country' in region) return COUNTRIES.features.find(f => f.properties.name === region.country);
  return ringFeature(region.ring);
}

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
        <path d={d} fill={color} fillOpacity={0.55 * o} stroke={color} strokeWidth={6 / w.cam.s} strokeOpacity={o} />
        <path d={d} fill="none" stroke={COLOR.foam} strokeWidth={10 / w.cam.s} strokeOpacity={glow * 0.6} />
      </svg>
    </WorldLayer>
  );
};

export const MapView: React.FC<{shot: MapShot; lead: number}> = ({shot, lead}) => {
  // Shot times are absolute; the Sequence starts `lead` seconds before shot.startSec.
  const local = (sec: number) => sec - shot.startSec + lead;
  const spec = useMemo(() => ({extent: shot.extent, projection: shot.projection, states: false}), [shot.extent, shot.projection]);
  const camera = useMemo(() => shot.camera.map(k => ({t: k.sec - shot.startSec + lead, center: k.center, zoom: k.zoom, ease: k.ease})), [shot, lead]);
  return (
    <World spec={spec} camera={camera} palette="parchment">
      {(shot.fills ?? []).map((f, i) => <RegionFill key={i} region={f.region} from={local(f.sec)} color={f.color} />)}
      {(shot.lines ?? []).map((l, i) => <MapLine key={`l${i}`} coords={densify(l.coords, 0.5)} from={local(l.sec)} draw={l.draw ?? 1.6} color={l.color ?? COLOR.red} width={5} dashed={l.dashed} />)}
    </World>
  );
};

/* ---------------------------------- point card ---------------------------------- */

export const PointView: React.FC<{shot: PointShot; lead: number}> = ({shot, lead}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const duration = shot.endSec - shot.startSec + lead;
  return (
    <>
      <ImageMove image={shot.backdrop} size={shot.size} from={{x: 0.5, y: 0.5, zoom: 1.05}} to={{x: 0.5, y: 0.5, zoom: 1.15}} durationSec={duration} dim={0.62} blur={6} />
      <div style={{position: 'absolute', left: 200, right: 200, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 48}}>
        {shot.bullets.map((b, i) => {
          const at = Math.round((b.sec - shot.startSec + lead) * fps);
          const p = spring({frame: frame - at, fps, config: {damping: 200}, durationInFrames: 16});
          if (frame < at) return null;
          return (
            <div key={i} data-guard-item={`point ${i + 1}`} style={{display: 'flex', alignItems: 'center', gap: 36, opacity: p, transform: `translateX(${(1 - p) * 60}px)`}}>
              <div style={{width: 70 * p, height: 5, background: COLOR.gold, flexShrink: 0}} />
              <div style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 84, color: COLOR.onNight, lineHeight: 1.15, textShadow: '0 6px 30px rgba(0,0,0,0.6)'}}>{b.text}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

/* ---------------------------------- year stamp ---------------------------------- */

/** A year that slams in large, holds, and settles to a small top-left chip. Local frame 0 = the spoken cue. */
export const YearStampView: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const slam = spring({frame, fps, config: {damping: 12, stiffness: 160}, durationInFrames: 12});
  const settle = spring({frame: frame - Math.round(1.6 * fps), fps, config: {damping: 200}, durationInFrames: 18});
  const fade = interpolate(frame, [Math.round(4.5 * fps), Math.round(5 * fps)], [1, 0], clamp);
  const size = interpolate(settle, [0, 1], [260, 72]);
  const x = interpolate(settle, [0, 1], [width / 2, 120]);
  const y = interpolate(settle, [0, 1], [height / 2, 110]);
  return (
    <div data-guard-item="year" style={{position: 'absolute', left: x, top: y, transform: `translate(${-50 * (1 - settle)}%, -50%) scale(${1.6 - 0.6 * slam})`, transformOrigin: 'left center',
      opacity: Math.min(slam, fade), fontFamily: FONT.display, fontWeight: 700, fontSize: size, color: COLOR.paper, letterSpacing: 6,
      textShadow: '0 10px 40px rgba(0,0,0,0.75)'}}>
      {text}
    </div>
  );
};
