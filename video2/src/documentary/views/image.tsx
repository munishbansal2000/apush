/** Image moves: Ken Burns framings, the 2.5D parallax move (depth maps), and portrait name tags. */
import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Img, cancelRender, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLOR, FONT} from '../../theme/tokens';
import {AtmosphereLayers} from '../atmosphere';
import {easeInOut, frameImage, framingAt} from '../framing';
import {depthAtPoint, normalizeDepth, parallaxMotion, warpFrame, type DepthSource, type PixelSource} from '../parallax';
import type {Framing, ImageMoveShot, PortraitShot} from '../types';
import {clamp, useLocalSec} from './common';

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
