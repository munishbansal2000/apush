/**
 * Shared types for the episode kit.
 *
 * Ownership (single source of truth):
 *   script/*.md            → turns.json          (tools/build-turns.ts)
 *   audio mp3 durations    → timing_map.json     (tools/build-timing.ts)
 *   Vosk output            → word_times.json     (tools/import-vosk.ts)
 *   episode beats          → images.json used_in (tools/sync-manifest.ts)
 *   data/render-config.json → geometry + timing rules for shell AND validator
 */
import type { JourneyItem } from './library';

export type SpeakerId = 'maya' | 'marcus';
export type Tone = 'playful' | 'serious' | 'sobering' | 'recap';
export type TextLevel = 'hero' | 'title' | 'subtitle' | 'body';
export type Pos = [number, number];

/* ----------------------------- script / turns ----------------------------- */

export interface SpeechTurn {
  id: string;
  idx: number;
  kind: 'speech';
  speaker: SpeakerId;
  /** Display text: production tags ({trap}, {emotion}) stripped. */
  text: string;
  tags: string[];
  emotion?: string;
  /** Silence held after this turn before the next one starts ([hold N s]). */
  holdAfterSec?: number;
  line: number;
}

export interface PauseTurn {
  id: string;
  idx: number;
  kind: 'pause';
  pauseSec: number;
  line: number;
}

export type ScriptTurn = SpeechTurn | PauseTurn;

export interface ScriptMeta {
  episode: string;
  /** 'episode' (explainer) or 'practice' (question video): structure rules differ */
  kind: 'episode' | 'practice';
  boxes: string[];
  midcheck: number | null;
}

export interface TurnsFile {
  _generated: string;
  source: string;
  meta: ScriptMeta;
  turns: ScriptTurn[];
}

/* --------------------------------- timing --------------------------------- */

export interface TimingFile {
  _generated: string;
  fps: number;
  /** Seconds from composition start. */
  starts: number[];
  /** Audio length (speech) or pause length (pause). */
  durations: number[];
  /** Per speech turn: hash of the TTS text the audio was generated from. */
  ttsHash: Record<string, string>;
  totalSec: number;
}

/** Word timings relative to turn start, from Vosk. */
export interface WordTime { w: string; s: number; e: number }
export type WordTimesFile = Record<string, WordTime[]>;

export interface TimelineTurn {
  turn: ScriptTurn;
  start: number;
  /** Audible length (speech) or pause length. */
  dur: number;
  /** When visuals for this turn stop: the next turn's start, so gaps never go blank. */
  visualEnd: number;
}

/* --------------------------------- anchors -------------------------------- */

/**
 * Point in the episode, addressed by text rather than turn number.
 * `turn` is a snippet that must match exactly one turn (case/punctuation-insensitive).
 * `word` is a word or phrase inside that turn; the beat starts when it is spoken.
 */
export interface Anchor {
  turn: string;
  word?: string;
  /** 1-based occurrence of `word` within the turn (default 1). */
  nth?: number;
  /** Seconds added after the resolved time (may be negative). */
  delay?: number;
}

export type Until =
  | { kind: 'turn-end' }
  | { kind: 'turns'; count: number }
  | { kind: 'anchor'; at: Anchor };

export type AnchorMethod = 'measured' | 'interpolated' | 'estimated';

export interface ResolvedAnchor {
  turnIdx: number;
  offset: number;
  time: number;
  method: AnchorMethod;
}

/* ---------------------------------- beats --------------------------------- */

interface BeatBase {
  /** Stable, human-readable id used in errors and the manifest. */
  id: string;
  at: Anchor;
  until?: Until;
}

export interface TextBeat extends BeatBase {
  kind: 'text';
  text: string;
  level: TextLevel;
  position: Pos;
  color?: string;
  entrance?: 'stamp' | 'fade' | 'typewriter';
  /** Deliberate multi-line headline (silences B012; layout still checks the full height). */
  allowWrap?: boolean;
}

export interface BubbleBeat extends BeatBase {
  kind: 'bubble';
  text: string;
  position: Pos;
  width?: number;
}

export interface BgBeat extends BeatBase {
  kind: 'bg';
  image: string;
  /** Focus region id from images.json `focus`: the background pushes into it with a callout. */
  focus?: string;
}

export interface MapBeat extends BeatBase {
  kind: 'map';
  mapImage: string;
  items: JourneyItem[];
  caption: string;
  variant: 'overview' | 'detail' | 'dark';
}

export interface SourceBeat extends BeatBase {
  kind: 'source';
  documentTitle: string;
  attribution: string;
  excerpt: string;
  /** Required: paraphrases are labeled on screen. */
  quoteStatus: 'quote' | 'paraphrase';
  highlightedPhrase: string;
  hippType: 'Historical Context' | 'Intended Audience' | 'Purpose' | 'Point of View';
  hippExplanation: string;
}

export interface VersusBeat extends BeatBase {
  kind: 'versus';
  clashTitle: string;
  periodLabel: string;
  entityA: { name: string; subtitle: string; points: string[]; color: string };
  entityB: { name: string; subtitle: string; points: string[]; color: string };
  verdictSummary: string;
}

export interface PictogramBeat extends BeatBase {
  kind: 'pictogram';
  total: number;
  /** How many figures fade out (a range renders as "lost" + "maybe lost"). */
  lost: [number, number];
  label: string;
  caption: string;
}

export interface LedgerBeat extends BeatBase {
  kind: 'ledger';
  west: string[];
  east: string[];
  /** Item to call out as the exception (rendered with a marker). */
  exception?: string;
}

export interface RouteBeat extends BeatBase {
  kind: 'route';
  /** Place names from src/data/places.json. */
  routes: { from: string; to: string; label?: string }[];
  caption: string;
  variant: 'overview' | 'dark';
}

export interface RangeBeat extends BeatBase {
  kind: 'range';
  low: number;
  high: number;
  unit: string;
  label: string;
  caption: string;
}

/** Recap board: one card per box; each card fills in at its anchor and checks off with the box. */
export interface BoardBeat extends BeatBase {
  kind: 'board';
  items: { box: number; at: Anchor; text: string }[];
  footer?: { at: Anchor; text: string };
}

/** Exam-style question card (AP format tag, stem, optional source excerpt). */
export interface QuestionBeat extends BeatBase {
  kind: 'question';
  number: number;
  format: string;
  stem: string;
  source?: { title: string; text: string };
}

/**
 * Derived, never authored: consecutive text beats in one turn are grouped into a card
 * whose lines appear as they are spoken (compileEpisode, L006).
 */
export interface StackBeat extends BeatBase {
  kind: 'stack';
  items: {
    text: string; offset: number; endOffset: number; x: number; y: number; level: TextLevel; color?: string;
    chain?: boolean; allowWrap?: boolean; entrance?: TextBeat['entrance']; sourceId: string;
    /** this line's card area (padded where clear) — the card shows the union of visible lines */
    rect: [number, number, number, number];
    /** seconds after the line starts at which each word appears (kinetic typography) */
    wordOffsets: number[];
  }[];
  rect: [number, number, number, number];
}

type Rect4 = [number, number, number, number];

/**
 * Camera tour over an image (zoom/pan): the camera glides between stops as their anchors are
 * spoken. A stop frames a focus region (images.json) or a rect, and may draw callouts:
 * a pulsing ring on `point` (image fractions) with a leader line to `label`.
 */
export interface TourBeat extends BeatBase {
  kind: 'tour';
  image: string;
  caption?: string;
  stops: { at: Anchor; region?: string; rect?: Rect4; callouts?: { point: [number, number]; label: string }[] }[];
}

/** Archival document reveal: scan on aged paper, magnifier pass, excerpt typed as it is read. */
export interface DocumentBeat extends BeatBase {
  kind: 'document';
  image?: string;
  title: string;
  attribution: string;
  excerpt: string;
  quoteStatus: 'quote' | 'paraphrase';
  /** a contiguous phrase of the excerpt to highlight once typed */
  highlight?: string;
  /**
   * Magnifier stops: when `word` (a word/phrase of the excerpt) is typed, the lens glides to
   * `point` (fractions of the full image) and shows `label`. Required when there is a scan:
   * the lens must point at something.
   */
  marks?: { word: string; point: [number, number]; label?: string }[];
  /** set true once someone has checked the marks against the real scan */
  marksVerified?: boolean;
  hipp?: { type: 'Historical Context' | 'Intended Audience' | 'Purpose' | 'Point of View'; text: string };
}

/** Historical figure card: portrait (or silhouette), name, dates, role, one line on why they matter. */
export interface FigureBeat extends BeatBase {
  kind: 'figure';
  name: string;
  dates: string;
  role: string;
  note?: string;
  image?: string;
  /** say so on the card when the likeness is not from life */
  likeness?: 'from life' | 'later likeness' | 'none';
}

export type Beat =
  | TourBeat
  | DocumentBeat
  | FigureBeat
  | BoardBeat
  | QuestionBeat
  | StackBeat
  | RouteBeat
  | RangeBeat
  | TextBeat
  | BubbleBeat
  | BgBeat
  | MapBeat
  | SourceBeat
  | VersusBeat
  | PictogramBeat
  | LedgerBeat;

export type BeatKind = Beat['kind'];

/* ------------------------------ episode spec ------------------------------ */

export interface SectionSpec {
  from: Anchor;
  tone: Tone;
  bg: string;
}

export interface PauseCardSpec {
  /** The question turn immediately before the pause. */
  after: Anchor;
  kind: 'predict' | 'selftest';
  prompt: string;
  /** Shown during the answer turn after the pause, so learners can grade themselves. */
  reveal: string;
}

export interface TrapSpec {
  /** The {trap} line. */
  at: Anchor;
  /** ≤40 chars: the mistake, as the student would say it. */
  myth: string;
  /** ≤48 chars: the correction. */
  fact: string;
}

export interface ChapterSpec {
  label: string;
  at: Anchor;
  /** Box number, when this chapter is a box (drives banners and Shorts). */
  box?: number;
  /** Render this chapter as its own vertical Short (box chapters always are). */
  short?: boolean;
}

export interface EpisodeSpec {
  id: string;
  /** Manifest key prefix, e.g. 'E3'. */
  manifestKey: string;
  script: string;
  /** Title card, shown at `at` for render-config titleCardSec (after the cold open). */
  title: { kicker: string; title: string; subline: string; at: Anchor };
  sections: SectionSpec[];
  beats: Beat[];
  pauseCards: PauseCardSpec[];
  traps: TrapSpec[];
  chapters: ChapterSpec[];
}

/* ---------------------------- compiled episode ---------------------------- */

export type ResolvedBeat = Beat & {
  start: number;
  end: number;
  turnIdx: number;
  method: AnchorMethod;
  /** board items / footer, resolved to seconds after the beat starts */
  itemOffsets?: number[];
  footerOffset?: number;
};

export interface ResolvedSection { start: number; end: number; tone: Tone; bg: string; turnIdx: number }
export interface ResolvedPauseCard {
  spec: PauseCardSpec;
  pauseIdx: number;
  start: number;
  end: number;
  revealStart: number;
  revealEnd: number;
}
export interface BgSegment { image: string; start: number; end: number; tone: Tone; sourceId: string; focus?: string }
export interface BoxEvent { box: number; time: number; turnIdx: number; mid: boolean }
export interface ResolvedTrap { spec: TrapSpec; start: number; factStart: number; end: number; trapIdx: number }
export interface YearMark { year: number; label: string; time: number; turnIdx: number }
export interface TermChip { term: string; definition: string; start: number; end: number; turnIdx: number }
export interface ResolvedChapter { spec: ChapterSpec; start: number; end: number; bannerEnd: number }
export type SfxName = 'hit' | 'check' | 'whoosh' | 'tick';
export interface SfxCue { name: SfxName; time: number; source: string }

export interface Issue {
  level: 'error' | 'warn' | 'info';
  code: string;
  where: string;
  msg: string;
}

export interface CompiledEpisode {
  spec: EpisodeSpec;
  meta: ScriptMeta;
  timeline: TimelineTurn[];
  beats: ResolvedBeat[];
  sections: ResolvedSection[];
  pauseCards: ResolvedPauseCard[];
  backgrounds: BgSegment[];
  boxEvents: BoxEvent[];
  traps: ResolvedTrap[];
  years: YearMark[];
  terms: TermChip[];
  chapters: ResolvedChapter[];
  sfx: SfxCue[];
  /** when each box is first named (null = never named) */
  boxIntro: (number | null)[];
  /** tone changes and box chapter starts: sweep transitions */
  transitions: number[];
  /** Every element as a timed box (after self-correction); shared with the validator and guard. */
  boxes: import('./layout-engine').TimedBox[];
  titleStart: number;
  totalSec: number;
  issues: Issue[];
}
