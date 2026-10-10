/** Full-bleed documentary shots. Every shot moves for its whole duration; all text follows docs/LOOK.md. */
import React, {useContext, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Img, Loop, OffthreadVideo, cancelRender, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {geoPath} from 'd3-geo';
import type {Feature, FeatureCollection, MultiPolygon, Polygon} from 'geojson';
import {feature} from 'topojson-client';
import type {GeometryCollection, Topology} from 'topojson-specification';
import countriesTopo from 'world-atlas/countries-50m.json';
import {World, WorldLayer, useWorld} from '../motion/world';
import {densify, ringFeature, stateFeature} from '../motion/territory';
import {US_RIVERS} from '../components/geo/usGeo';
import {COLOR, FONT} from '../theme/tokens';
import {CUSTOM_COMPONENTS} from '../components/custom/registry';
import type {CustomName} from '../components/custom/catalog';
import {AtmosphereLayers} from './atmosphere';
import {ChromeZones, labelBox, labelVisibility, type ChromeZone} from './chrome-zones';
import {easeInOut, frameImage, framingAt} from './framing';
import {depthAtPoint, normalizeDepth, parallaxMotion, warpFrame, type DepthSource, type PixelSource} from './parallax';
import type {ClipShot, CustomShot, Framing, ImageMoveShot, LonLat, MapShot, PointShot, PortraitShot, QuestionShot, RegionRef} from './types';

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

/* ------------------------------- 2.5D parallax move ------------------------------- */

/** Longest edge the warp samples from; keeps per-tab memory bounded while staying sharp at 1080p. */
const WORK_EDGE = 3000;
const loaded = new Map<string, Promise<{src: PixelSource; depth: DepthSource}>>();

function pixelsOf(img: HTMLImageElement, width: number, height: number): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', {willReadFrequently: true})!;
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height).data;
}

async function loadImage(path: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = staticFile(path);
  await img.decode();
  return img;
}

/** Image pixels (capped at WORK_EDGE) + normalized depth, loaded once per tab. */
function loadParallax(image: string, depth: string) {
  const key = `${image}|${depth}`;
  if (!loaded.has(key)) loaded.set(key, (async () => {
    const [img, map] = await Promise.all([loadImage(image), loadImage(depth)]);
    const k = Math.min(1, WORK_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const sw = Math.round(img.naturalWidth * k);
    const sh = Math.round(img.naturalHeight * k);
    const gray = pixelsOf(map, map.naturalWidth, map.naturalHeight);
    return {src: {data: pixelsOf(img, sw, sh), width: sw, height: sh}, depth: normalizeDepth(gray, map.naturalWidth, map.naturalHeight, 4)};
  })());
  return loaded.get(key)!;
}

/** Camera move with 2.5D parallax: near planes slide and grow faster than the background. */
export const ParallaxMove: React.FC<{image: string; depth: string; from: Framing; to: Framing; durationSec: number}> = ({image, depth, from, to, durationSec}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [assets, setAssets] = useState<{src: PixelSource; depth: DepthSource} | null>(null);
  const [handle] = useState(() => delayRender(`parallax ${image}`));
  useEffect(() => {
    loadParallax(image, depth).then(a => { setAssets(a); continueRender(handle); }).catch(error => cancelRender(error));
  }, [image, depth, handle]);
  const out = useMemo(() => new ImageData(width, height), [width, height]);
  useLayoutEffect(() => {
    if (!assets || !canvas.current) return;
    const p = Math.min(1, Math.max(0, frame / fps / durationSec));
    const framing = framingAt(from, to, p);
    const t = frameImage(assets.src, framing, {width, height});
    const motion = parallaxMotion(from, to, easeInOut(p), width, depthAtPoint(assets.depth, framing.x, framing.y));
    warpFrame(out.data, width, height, assets.src, assets.depth, t, motion);
    canvas.current.getContext('2d')!.putImageData(out, 0, 0);
  }, [assets, frame, fps, durationSec, from, to, width, height, out]);
  return <canvas ref={canvas} width={width} height={height} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', background: COLOR.night}} />;
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
    {shot.depth
      ? <ParallaxMove image={shot.image} depth={shot.depth} from={shot.from} to={shot.to} durationSec={shot.endSec - shot.startSec + lead} />
      : <ImageMove image={shot.image} size={shot.size} from={shot.from} to={shot.to} durationSec={shot.endSec - shot.startSec + lead} />}
    {shot.type === 'portrait' && <AtmosphereLayers kinds={shot.atmosphere} seed={shot.id} />}
    {shot.type === 'portrait' && <NameTag name={shot.name} role={shot.role} />}
  </>
);

/* --------------------------------- hero clips --------------------------------- */

/**
 * LTX motion from a real still. The file is a forward-then-reverse boomerang (seamless when looped); a slow push
 * keeps the frame alive. Without a generated clip, falls back to a camera move on the same still.
 */
export const ClipView: React.FC<{shot: ClipShot; lead: number}> = ({shot, lead}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  if (!shot.clip) {
    const duration = shot.endSec - shot.startSec + lead;
    return shot.depth
      ? <ParallaxMove image={shot.image} depth={shot.depth} from={shot.from} to={shot.to} durationSec={duration} />
      : <ImageMove image={shot.image} size={shot.size} from={shot.from} to={shot.to} durationSec={duration} />;
  }
  const push = interpolate(frame, [0, durationInFrames], [1, 1.05], clamp);
  const clipFrames = Math.max(1, Math.round(shot.clip.durationSec * fps));
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: COLOR.night}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`}}>
        <Loop durationInFrames={clipFrames} layout="none">
          <OffthreadVideo src={staticFile(shot.clip.path)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Loop>
      </div>
    </div>
  );
};

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

/* ---------------------------------- point card ---------------------------------- */

export const PointView: React.FC<{shot: PointShot; lead: number}> = ({shot, lead}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const duration = shot.endSec - shot.startSec + lead;
  return (
    <>
      <ImageMove image={shot.backdrop} size={shot.size} from={{x: 0.5, y: 0.5, zoom: 1.05}} to={{x: 0.5, y: 0.5, zoom: 1.15}} durationSec={duration} dim={0.62} blur={6} />
      <AtmosphereLayers kinds={shot.atmosphere} seed={shot.id} />
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

/* --------------------------------- question card --------------------------------- */

/**
 * A scripted pause: the question that was just asked, a kicker, and a countdown ring that drains over the pause, so
 * the silence reads as "your turn", not dead air. Times are local to the shot's Sequence.
 */
/* ---------------------------------- custom explainer ---------------------------------- */

/** A custom component plays its default phases over the whole shot (lead included, so a crossfade shows it moving). */
export const CustomView: React.FC<{shot: CustomShot; lead: number}> = ({shot, lead}) => {
  const {fps} = useVideoConfig();
  const entry = CUSTOM_COMPONENTS[shot.component as CustomName];
  if (!entry) throw new Error(`unknown custom component "${shot.component}"`);
  const Component = entry.component;
  const total = shot.endSec - shot.startSec + lead;
  // Phases re-timed to the spoken beats: phase i runs from beat i to beat i+1 (the last to the end of the shot).
  const phases = shot.beatsSec?.length
    ? entry.phases.map((p, i) => {
      const at = (sec: number | undefined, fallback: number) => (sec === undefined ? fallback : Math.min(1, Math.max(0, (sec - shot.startSec + lead) / total)));
      return {...p, start: at(shot.beatsSec![i], p.start), end: at(shot.beatsSec![i + 1], i + 1 < shot.beatsSec!.length ? p.end : 1)};
    })
    : entry.phases;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Component durationInFrames={Math.max(1, Math.round(total * fps))} phases={phases} />
    </div>
  );
};

export const QuestionView: React.FC<{shot: QuestionShot; lead: number}> = ({shot, lead}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const t = frame / fps;
  const pauseFrom = shot.pauseStartSec - shot.startSec + lead;
  const pauseLen = Math.max(0.1, shot.pauseEndSec - shot.pauseStartSec);
  const enter = spring({frame, fps, config: {damping: 200}, durationInFrames: 14});
  const left = Math.max(0, pauseLen - Math.max(0, t - pauseFrom));
  const done = 1 - left / pauseLen;
  const r = 70;
  const circumference = 2 * Math.PI * r;
  const duration = shot.endSec - shot.startSec + lead;
  return (
    <>
      {shot.backdrop && shot.size
        ? <ImageMove image={shot.backdrop} size={shot.size} from={{x: 0.5, y: 0.5, zoom: 1.05}} to={{x: 0.5, y: 0.5, zoom: 1.12}} durationSec={duration} dim={0.72} blur={8} />
        : <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 40%, #2a2016 0%, #0b0907 75%)`}} />}
      <div style={{position: 'absolute', left: width * 0.12, right: width * 0.12, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 44,
        opacity: enter, transform: `translateY(${(1 - enter) * 24}px)`}}>
        <div data-guard-item="question kicker" style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 34, letterSpacing: 10, color: COLOR.gold}}>
          {shot.practice ? 'AP PRACTICE · YOUR TURN' : 'YOUR TURN'}
        </div>
        <div data-guard-item="question" style={{fontFamily: FONT.text, fontSize: shot.question.length > 140 ? 44 : 56, lineHeight: 1.35, color: COLOR.onNight, textAlign: 'center', textShadow: '0 6px 30px rgba(0,0,0,0.6)'}}>
          {shot.question}
        </div>
        <svg data-guard-item="countdown" width={(r + 10) * 2} height={(r + 10) * 2} viewBox={`0 0 ${(r + 10) * 2} ${(r + 10) * 2}`}>
          <circle cx={r + 10} cy={r + 10} r={r} fill="none" stroke="rgba(245,240,232,0.15)" strokeWidth={8} />
          <circle cx={r + 10} cy={r + 10} r={r} fill="none" stroke={COLOR.gold} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference * done} transform={`rotate(-90 ${r + 10} ${r + 10})`} />
          <text x={r + 10} y={r + 10} textAnchor="middle" dominantBaseline="central" fontFamily={FONT.display} fontWeight={700} fontSize={52} fill={COLOR.onNight}>
            {Math.ceil(left)}
          </text>
        </svg>
      </div>
    </>
  );
};

/* ---------------------------------- year stamp ---------------------------------- */

/** A year that slams in large, holds, and settles to a small top-left chip. Local frame 0 = the spoken cue. */
/** How long a year stamp stays up; one gives way early (fading out) when the next year is spoken sooner. */
export const YEAR_STAMP_SEC = 5;
export const yearStampSpans = (years: {sec: number}[]) => years.map((y, i) => Math.max(0.3, Math.min(YEAR_STAMP_SEC, (years[i + 1]?.sec ?? Infinity) - y.sec)));

function yearStampState(frame: number, fps: number, width: number, height: number, holdSec = YEAR_STAMP_SEC) {
  const slam = spring({frame, fps, config: {damping: 12, stiffness: 160}, durationInFrames: 12});
  const settle = spring({frame: frame - Math.round(1.6 * fps), fps, config: {damping: 200}, durationInFrames: 18});
  const end = Math.round(holdSec * fps);
  const fade = interpolate(frame, [end - Math.min(Math.round(0.5 * fps), Math.round(end / 2)), end], [1, 0], clamp);
  const size = interpolate(settle, [0, 1], [260, 72]);
  const x = interpolate(settle, [0, 1], [width / 2, 120]);
  const y = interpolate(settle, [0, 1], [height / 2, 110]);
  return {slam, settle, fade, size, x, y};
}

/** How visible the stamp itself is at local frame `frame`. */
export function yearStampVisible(frame: number, fps: number, holdSec = YEAR_STAMP_SEC): number {
  const {slam, fade} = yearStampState(Math.max(0, frame), fps, 1920, 1080, holdSec);
  return frame < 0 ? 0 : Math.min(slam, fade);
}

/** Map labels start stepping aside this long before a year stamp slams in. */
export const YEAR_STAMP_LEAD_SEC = 0.3;

/**
 * Where the year stamp is on screen at local frame `frame` (an estimate from its type size; generous), and how much
 * labels under it must give way: fully from YEAR_STAMP_LEAD_SEC before it appears until it has all but faded, so a
 * label and the stamp are never both visible (negative frames = the lead-in).
 */
export function yearStampZone(text: string, frame: number, fps: number, width: number, height: number, holdSec = YEAR_STAMP_SEC): ChromeZone {
  const lead = Math.round(YEAR_STAMP_LEAD_SEC * fps);
  const {slam, settle, fade, size, x, y} = yearStampState(Math.max(0, frame), fps, width, height, holdSec);
  const scale = 1.6 - 0.6 * slam;
  const w0 = text.length * size * 0.62 + 6 * text.length;
  const left = x - 0.5 * (1 - settle) * w0;
  const h = size * 1.2 * scale;
  const away = frame < 0 ? Math.max(0, 1 + frame / lead) : fade < 1 ? Math.min(1, fade / 0.04) : 1;
  return {rect: [left, y - h / 2, left + w0 * scale, y + h / 2], opacity: away};
}

export const YearStampView: React.FC<{text: string; holdSec?: number}> = ({text, holdSec = YEAR_STAMP_SEC}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {slam, settle, fade, size, x, y} = yearStampState(frame, fps, width, height, holdSec);
  return (
    <div data-guard-item="year" style={{position: 'absolute', left: x, top: y, transform: `translate(${-50 * (1 - settle)}%, -50%) scale(${1.6 - 0.6 * slam})`, transformOrigin: 'left center',
      opacity: Math.min(slam, fade), fontFamily: FONT.display, fontWeight: 700, fontSize: size, color: COLOR.paper, letterSpacing: 6,
      textShadow: '0 10px 40px rgba(0,0,0,0.75)'}}>
      {text}
    </div>
  );
};
