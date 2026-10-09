/**
 * Historical asset library: the contract between COLLECTORS (research agents, humans) and CONSUMERS (director, shot
 * resolver, renderer). See docs/ASSET_LIBRARY.md for the collection map and workflow.
 *
 *   data/library/taxonomy.json            controlled vocabulary (units, kinds, licenses, tags)
 *   data/library/wishlist/<unit>.json     briefs: what to find, why, and how it will be judged
 *   data/library/records/<kind>/<id>.json one record per collected asset (metadata only; binaries live in LIBRARY_DIR)
 *   data/library/entities/*.json          people, events, places the records point at
 *   data/library/geo/<id>.geojson         vector geography with date ranges and sources
 *   src/data/library-index.json           built by `tools/library.ts index`; what the pipeline reads
 */

/** Collected media kinds. */
export type AssetKind =
  | 'portrait'      // a real person, ideally contemporary to them
  | 'scene'         // painting/engraving/print/photo of an event or everyday life
  | 'cartoon'       // political cartoon or satirical print
  | 'map'           // period map (raster); our own drawn maps come from geo/
  | 'view'          // city view, landscape, building, fort plan
  | 'document'      // primary source scan (law, letter, newspaper, broadside, treaty)
  | 'object'        // museum artifact (weapon, coin, tool, clothing)
  | 'photo'         // photograph (c. 1840s+)
  | 'footage'       // archival film (c. 1890s+)
  | 'audio';        // period music or ambience

/** Lifecycle. Only `approved` assets reach the director. */
export type ReviewStatus = 'candidate' | 'verified' | 'approved' | 'rejected';

/** A region of an image in 0..1 coordinates [x0, y0, x1, y1], with a stable name shot plans can use ("face", "paper"). */
export interface FocusRegion {name: string; box: [number, number, number, number]; note?: string}

/** A phrase located in a document scan, so the document shot can zoom and highlight it. */
export interface DocumentPhrase {text: string; box: [number, number, number, number]}

export interface AssetFile {
  /** Path relative to LIBRARY_DIR (or public/ for legacy files). */
  path: string;
  width?: number;
  height?: number;
  /** Seconds, for footage/audio. */
  durationSec?: number;
  sha256: string;
  bytes?: number;
}

export interface AssetRecord {
  /** `<kind>.<slug>`, stable forever, e.g. "portrait.george-grenville-hoare-1764". */
  id: string;
  kind: AssetKind;
  /** Short human title, e.g. "George Grenville, by William Hoare". */
  title: string;
  /** One or two sentences: what is visible. Written for the director. */
  description: string;
  /** Who made it and when it was MADE (not what it depicts), e.g. {name: "William Hoare", date: "1764"}. */
  creator?: {name?: string; date?: string; medium?: string};
  /** What it DEPICTS. A 19th-century painting of 1763 has depicts.date "1763" and creator.date "1880s". */
  depicts: {
    date?: string;
    people?: string[];   // entity ids, e.g. "person.george-grenville"
    events?: string[];   // e.g. "event.pontiacs-rebellion"
    places?: string[];   // e.g. "place.fort-detroit"
    /** True when made long after the event (retrospective/imagined); the director must not present it as a record. */
    retrospective?: boolean;
  };
  /** CED units (1-9) and topic codes (e.g. "3.2") this asset serves. */
  units: number[];
  topics?: string[];
  tags?: string[];
  provenance: {
    institution?: string;
    /** Human page for the item (Commons file page, LoC item page, museum record). */
    sourcePage: string;
    /** Direct URL of the ORIGINAL full-resolution file (not a thumbnail). */
    originalUrl: string;
    /** Must be in taxonomy.licenses. */
    license: string;
    /** Exact credit line to show in descriptions/credits. */
    credit: string;
  };
  files: {original: AssetFile; display?: AssetFile};
  quality: {
    /** Visible text in the image and its language; foreign-language labels usually disqualify maps. */
    textInImage?: {present: boolean; language?: string};
    watermark?: boolean;
    color?: 'color' | 'bw' | 'sepia';
    condition?: 'good' | 'fair' | 'poor';
    notes?: string;
  };
  framing?: {focus?: FocusRegion[]; orientation?: 'landscape' | 'portrait' | 'square'};
  document?: {transcription?: string; phrases?: DocumentPhrase[]; transcriptionSource?: string};
  /** Historical caveats the director and reviewers must respect. */
  accuracy?: string[];
  sensitivity?: {level: 'none' | 'care' | 'high'; note?: string};
  /** Pipeline-made files (depth map, subject masks, LTX clips); written by tools, never by collectors. */
  derived?: {depth?: AssetFile; masks?: Record<string, AssetFile>; clips?: {prompt: string; seed: number; file: AssetFile}[]};
  review: {status: ReviewStatus; by?: string; at?: string; notes?: string};
  /** The wishlist brief this record fulfils, if any. */
  brief?: string;
}

/** Wishlist brief: one thing to find. Written by a planning agent from the scripts; consumed by collector agents. */
export interface Brief {
  /** `brief.<unit>.<slug>`, e.g. "brief.u3.grenville-portrait". */
  id: string;
  kind: AssetKind;
  /** What is needed, concretely. */
  want: string;
  /** Lessons and lines that need it, e.g. ["u3e1:t05"]. */
  usedIn: string[];
  priority: 1 | 2 | 3;
  /** Acceptance criteria beyond the global ones (resolution, license). */
  accept?: string[];
  /** Search hints: institutions, known titles, artists. */
  hints?: string[];
  /** How many distinct good assets we want (variety across shots). */
  count?: number;
}

export interface Entity {
  /** `person.<slug>` | `event.<slug>` | `place.<slug>` */
  id: string;
  name: string;
  dates?: string;
  /** For places: [lon, lat]. */
  location?: [number, number];
  summary?: string;
  aliases?: string[];
}

/** Geo features are GeoJSON with these properties (one feature per file or a FeatureCollection). */
export interface GeoProperties {
  /** `geo.<type>.<slug>[@year]`, e.g. "geo.line.proclamation@1763", "geo.region.province-of-quebec@1763". */
  id: string;
  type: 'region' | 'line' | 'route' | 'point';
  name: string;
  /** Validity window: the feature is true between these dates (ISO or year). */
  validFrom?: string;
  validTo?: string;
  /** Exact / approximate / contested; approximate features get an on-screen "approx." mark where relevant. */
  precision: 'exact' | 'approximate' | 'contested';
  sources: string[];
  sensitivity?: {level: 'none' | 'care' | 'high'; note?: string};
  units: number[];
  review: {status: ReviewStatus; by?: string; at?: string; notes?: string};
  /**
   * Part of the period base map (docs/MAP_VIEWS.md): drawn automatically on any map shot whose "period" falls inside
   * validFrom..validTo and whose view overlaps it. Regions are tinted by side, lines drawn dashed, with an optional label.
   */
  layer?: {base: true; side: PeriodSide; label?: string; labelAt?: [number, number]};
}

/** Who holds or claims a period region; each side has one map colour. */
export type PeriodSide = 'british' | 'french' | 'spanish' | 'native' | 'united-states' | 'mexico' | 'confederacy' | 'other';
export const PERIOD_SIDES: PeriodSide[] = ['british', 'french', 'spanish', 'native', 'united-states', 'mexico', 'confederacy', 'other'];

/** Consumption index entry: compact, searchable, what the director sees. */
export interface IndexEntry {
  id: string;
  kind: AssetKind | 'geo';
  title: string;
  description: string;
  units: number[];
  topics: string[];
  people: string[];
  events: string[];
  places: string[];
  date?: string;
  retrospective?: boolean;
  /** Render path (relative to public/ or LIBRARY_DIR). */
  path: string;
  width?: number;
  height?: number;
  focus: string[];
  hasDepth: boolean;
  accuracy: string[];
}
