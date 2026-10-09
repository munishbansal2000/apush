/** Resolved documentary shots (times in absolute seconds). See docs/LOOK.md for the vocabulary. */
export type LonLat = [number, number];

/** A framing on an image: (x, y) is the point to centre (0..1 of the image), zoom is relative to a cover fit (>= 1). */
export interface Framing {x: number; y: number; zoom: number}

/** Region on a map: a US state (postal code), a country (world-atlas name), or a lon/lat ring (marked approximate). */
export type RegionRef = {state: string} | {country: string} | {ring: LonLat[]};

interface ShotBase {
  id: string;
  startSec: number;
  endSec: number;
  /** How this shot enters: cut (default) or a short crossfade over the previous shot. */
  transition?: 'cut' | 'crossfade';
}

export interface ImageMoveShot extends ShotBase {
  type: 'image_move';
  image: string;
  /** Depth map (public/ path) for 2.5D parallax; without one the shot is a flat camera move. */
  depth?: string;
  /** Pixel size of the image (from data/images.lock.json), needed to frame it exactly. */
  size: {width: number; height: number};
  from: Framing;
  to: Framing;
}

export interface PortraitShot extends ShotBase {
  type: 'portrait';
  image: string;
  /** Depth map (public/ path) for 2.5D parallax; without one the shot is a flat camera move. */
  depth?: string;
  size: {width: number; height: number};
  from: Framing;
  to: Framing;
  name: string;
  role?: string;
}

export interface MapShot extends ShotBase {
  type: 'map';
  projection: 'us' | 'world';
  extent: [LonLat, LonLat];
  camera: {sec: number; center: LonLat; zoom: number; ease?: number}[];
  fills?: {region: RegionRef; sec: number; color: string; label?: string}[];
  lines?: {coords: LonLat[]; sec: number; color?: string; dashed?: boolean; draw?: number}[];
}

export interface PointShot extends ShotBase {
  type: 'point';
  backdrop: string;
  size: {width: number; height: number};
  bullets: {text: string; sec: number}[];
}

export type DocShot = ImageMoveShot | PortraitShot | MapShot | PointShot;

/** Year that slams in over whatever shot is playing. */
export interface YearStamp {text: string; sec: number}

export interface DocBox {label: string; introSec: number; checkSec: number; startSec: number; endSec: number}

export interface DocEpisodeProps extends Record<string, unknown> {
  episode: string;
  shots: DocShot[];
  years?: YearStamp[];
  boxes?: DocBox[];
  turns: {id: string; kind: 'speech' | 'pause'; speaker?: string}[];
  timing: {starts: number[]; durations: number[]; totalSec: number};
}
