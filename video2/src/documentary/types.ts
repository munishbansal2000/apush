/** Resolved documentary shots (times in absolute seconds). See docs/LOOK.md for the vocabulary. */
import type {Atmosphere} from './atmosphere';
export type LonLat = [number, number];

/** A framing on an image: (x, y) is the point to centre (0..1 of the image), zoom is relative to a cover fit (>= 1). */
export interface Framing {x: number; y: number; zoom: number}

/**
 * Region on a map: a US state (postal code), a country (world-atlas name), a lon/lat ring, or library geometry
 * resolved from a geo id (data/library/geo). Historical regions should come from the library, not modern shapes.
 */
export type RegionRef = {state: string} | {country: string} | {ring: LonLat[]} | {geometry: {type: 'Polygon' | 'MultiPolygon'; coordinates: unknown}};

interface ShotBase {
  id: string;
  startSec: number;
  endSec: number;
  /** How this shot enters: cut (default) or a short crossfade over the previous shot. */
  transition?: 'cut' | 'crossfade';
  /** Atmosphere layers over the shot (dust, smoke, embers, fog, candle). */
  atmosphere?: Atmosphere[];
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
  lines?: {coords: LonLat[]; sec: number; color?: string; dashed?: boolean; draw?: number; arrow?: boolean}[];
  /** Map typography pinned to the world: region names, oceans, towns. */
  labels?: {text: string; at: LonLat; sec: number; style?: 'region' | 'ocean' | 'town'}[];
  /** Towns, forts, battles. */
  points?: {at: LonLat; label?: string; sec: number; kind?: 'town' | 'fort' | 'battle'}[];
  /** Relief shading along mountain ranges + rivers. */
  terrain?: {ridges: LonLat[][]; rivers?: boolean};
  /** Camera tilt in degrees (0 = straight down) for a 3D table-map look. */
  tilt?: number;
  /** True when any shown feature is approximate: the map shows a small "boundaries approximate" note. */
  approx?: boolean;
}

export interface PointShot extends ShotBase {
  type: 'point';
  backdrop: string;
  size: {width: number; height: number};
  bullets: {text: string; sec: number}[];
}

/**
 * Generated motion from a real still (LTX on the 5090). `clip` is the rendered boomerang file when it exists; without
 * it the shot falls back to a camera move (with parallax when a depth map exists) on the same still.
 */
export interface ClipShot extends ShotBase {
  type: 'clip';
  image: string;
  size: {width: number; height: number};
  prompt: string;
  seed: number;
  /** Where LTX centres its 16:9 crop of the still (0..1). Part of the fingerprint. */
  focus: [number, number];
  fingerprint: string;
  clip?: {path: string; durationSec: number};
  depth?: string;
  from: Framing;
  to: Framing;
}

/**
 * Question card for a scripted pause: the question (verbatim from the line before), a "your turn" kicker, and a
 * countdown for the pause. Optional dimmed backdrop image. The Episode Sheet steps aside while it is up.
 */
export interface QuestionShot extends ShotBase {
  type: 'question';
  question: string;
  /** The pause the countdown runs over (absolute seconds). */
  pauseStartSec: number;
  pauseEndSec: number;
  /** Practice-block questions (AP-style) vs in-lesson think-pauses: changes the kicker. */
  practice?: boolean;
  backdrop?: string;
  size?: {width: number; height: number};
}

/** A custom explainer component (src/components/custom) for one event, played over the whole shot on its default phases. */
export interface CustomShot extends ShotBase {
  type: 'custom';
  /** A name from src/components/custom/catalog.ts. */
  component: string;
}

export type DocShot = ImageMoveShot | PortraitShot | MapShot | PointShot | ClipShot | QuestionShot | CustomShot;

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
