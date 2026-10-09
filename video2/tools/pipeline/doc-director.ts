/**
 * Director core shared by the storyboard flow (docs/STORYBOARD.md): the image catalog and per-act selection, the
 * outline (title, thesis, Episode Sheet boxes, acts; one LLM call with a same-chat review and repairs), prompt I/O, and
 * the coordinate transport that keeps Meta UI from mangling numeric arrays. The LLM never writes seconds: every time is a
 * phrase quoted from a line and proven against the narration.
 */
import {readFileSync} from 'node:fs';
import {cleanSpeech} from './speech';
import {resolveBoxes} from './cues';
import {LOOK_RULES, type PlanShot, type ResolveOptions, type ShotPlan} from './shots';
import type {PipelineTurn, WordTiming} from '../pipeline-core';
import {CUSTOM_CATALOG} from '../../src/components/custom/catalog';

/* ------------------------------------ catalog ------------------------------------ */

export interface CatalogEntry {
  path: string;
  description: string;
  width: number;
  height: number;
  /** Largest zoom (relative to a cover fit) that stays within the look's upscale limit. */
  maxZoom: number;
  focus?: string[];
  retrospective?: boolean;
  date?: string;
}

/** Usable images for the director: approved library entries + the lesson's downloaded images, sharp enough at zoom 1. */
export function buildCatalog(
  imageSizes: Record<string, {width: number; height: number}>,
  descriptions: Record<string, string>,
  library: {path: string; description: string; width?: number; height?: number; focus: string[]; retrospective?: boolean; date?: string}[] = [],
  frame = {width: 1920, height: 1080},
): CatalogEntry[] {
  const entries = new Map<string, CatalogEntry>();
  const add = (path: string, size: {width: number; height: number} | undefined, extra: Partial<CatalogEntry>) => {
    if (!size) return;
    const cover = Math.max(frame.width / size.width, frame.height / size.height);
    const maxZoom = Math.floor((LOOK_RULES.maxUpscale / cover) * 100) / 100;
    if (maxZoom < 1) return; // too small even for a full-frame shot
    entries.set(path, {path, description: '', width: size.width, height: size.height, maxZoom: Math.min(maxZoom, 3), ...extra});
  };
  for (const [path, size] of Object.entries(imageSizes)) add(path, size, {description: descriptions[path] ?? ''});
  for (const e of library) add(e.path, e.width && e.height ? {width: e.width, height: e.height} : imageSizes[e.path], {description: e.description, focus: e.focus, retrospective: e.retrospective, date: e.date});
  return [...entries.values()].sort((a, b) => a.path.localeCompare(b.path));
}

/* ---------------------------- per-act selection (prompt size) ---------------------------- */

/** An act prompt offers at most this many images: the ones its narration is about (keeps prompts ~3k tokens). */
export const ACT_ASSET_LIMIT = 30;
/** With few matches, still offer at least this many (generic scenes and maps can carry any narration). */
const ACT_ASSET_MIN = 12;
const STOPWORDS = new Set('the and for with that this from into over under then than they them their there what when where which while who whom whose will would could should about after before because been being were was are has have had his her its our your you not but all any can one two three also just only very more most some such each other upon onto out off own same too here how why did does doing done said says like well back even still much many made make'.split(' '));

const terms = (text: string): string[] =>
  text.toLowerCase().replace(/[^a-z0-9'\s-]/g, ' ').split(/[\s-]+/).map(w => w.replace(/'s$|'/g, '').replace(/(?<=[a-z]{3})s$/, ''))
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));

/** Text the director sees for an image, also what relevance is scored on. */
const assetText = (c: CatalogEntry) => `${c.path.split('/').pop()!.replace(/\.[^.]+$/, '').replace(/[-_.]/g, ' ')} ${c.description} ${(c.focus ?? []).join(' ')}`;

/**
 * The images an act prompt offers: every image when the catalog is small, otherwise the ACT_ASSET_LIMIT whose name,
 * description and focus tags share the most distinctive words with the act (words rare across the catalog count more).
 */
export function assetsForAct(catalog: CatalogEntry[], actText: string, limit = ACT_ASSET_LIMIT): CatalogEntry[] {
  if (catalog.length <= limit) return catalog;
  const docs = catalog.map(c => new Set(terms(assetText(c))));
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d) df.set(t, (df.get(t) ?? 0) + 1);
  const act = new Set(terms(actText));
  const scored = catalog.map((c, i) => ({c, score: [...docs[i]].reduce((sum, t) => sum + (act.has(t) ? Math.log(1 + catalog.length / df.get(t)!) : 0), 0)}));
  const ranked = scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.c.path.localeCompare(b.c.path)).slice(0, limit).map(x => x.c);
  const filler = ranked.length < ACT_ASSET_MIN ? scored.filter(x => x.score === 0).slice(0, ACT_ASSET_MIN - ranked.length).map(x => x.c) : [];
  return [...ranked, ...filler].sort((a, b) => a.path.localeCompare(b.path));
}

/** Custom explainers whose event the act's narration names (by keyword); usually none, at most a couple. */
export function customsForAct(actText: string, blocked: Set<string> = new Set()): [string, (typeof CUSTOM_CATALOG)[keyof typeof CUSTOM_CATALOG]][] {
  const text = actText.toLowerCase();
  return Object.entries(CUSTOM_CATALOG).filter(([name]) => !blocked.has(name)).filter(([, c]) => c.keywords.some(k => new RegExp(`\\b${k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)));
}

/* ------------------------------------ outline ------------------------------------ */

export interface Outline {
  title: string;
  thesis: string;
  boxes: NonNullable<ShotPlan['boxes']>;
  acts: {title: string; purpose: string; turns: {from: number; to: number}}[];
}

const turnLine = (turn: PipelineTurn, index: number, durations: number[]) =>
  `${index} | ${turn.kind === 'pause' ? 'PAUSE' : turn.speaker} | ${durations[index].toFixed(1)}s | ${turn.kind === 'pause' ? `[pause ${turn.pauseSec}s]` : cleanSpeech(turn.text ?? '')}`;

const PHRASE_RULE = 'Every cue is {"turn": index, "phrase": "..."}: 2-6 consecutive words copied VERBATIM from that turn (case and punctuation ignored). Never paraphrase; code rejects any phrase the turn does not contain.';
export const COORDINATE_RULE = 'Never emit a bare numeric array: Meta UI can render it as a citation and delete its numbers. Write coordinates as {"lon":number,"lat":number}, map extents as {"southwest":{"lon":number,"lat":number},"northeast":{"lon":number,"lat":number}}, and clip focus as {"x":number,"y":number}. Arrays of objects or strings are safe.';

export function outlinePrompt(episode: string, turns: PipelineTurn[], durations: number[], previous?: Outline): string {
  return [
    'You are the series director of a top-tier APUSH history documentary. Plan the STRUCTURE of one lesson from its locked narration. Do not plan shots yet.',
    '',
    'Return JSON only:',
    '{"title": "...", "thesis": "one sentence, <= 20 words",',
    ' "boxes": [{"label": "...", "intro": {"turn": 0, "phrase": "..."}, "check": {"turn": 15, "phrase": "..."}, "turns": {"from": 1, "to": 15}}],',
    ' "acts": [{"title": "...", "purpose": "what the viewer should understand", "turns": {"from": 0, "to": 4}}]}',
    '',
    'BOXES (the Episode Sheet): the narration names 2-5 "boxes" (e.g. "Three boxes on your sheet: X, Y, and Z"). For each box:',
    '- label: <= 48 characters, close to the narration wording.',
    '- intro: the phrase where that box is first named.',
    '- check: the phrase where that box is checked off (e.g. "box one, done", "checked", "on the sheet", "all three"). Checks happen in box order and never before the box is taught.',
    '- turns: the contiguous span of turns that teaches that box. Spans are in order and do not overlap.',
    '',
    'ACTS: 4-10 acts covering every turn exactly once, in order, contiguous, starting at turn 0 and ending at the last turn. Each act is 60-150 seconds of narration (use the durations), breaks at a real change of idea, and never splits a turn.',
    '',
    PHRASE_RULE,
    previous ? `\nA previous outline exists for an earlier version of this script. Keep it wherever it still fits; change only what the edits require:\n${JSON.stringify(previous)}` : '',
    '',
    `TURNS of ${episode} (index | speaker | duration | locked narration)`,
    ...turns.map((turn, i) => turnLine(turn, i, durations)),
  ].join('\n');
}

export const OUTLINE_REVIEW = 'Switch roles: you are a skeptical editor. Re-check the outline you just wrote against every rule above: every phrase verbatim from its turn, box checks in order and after their teaching span, acts contiguous from turn 0 to the last turn with no gaps or overlaps, act lengths 60-150 seconds. Fix every problem silently and return ONLY the corrected JSON object.';

export function validateOutline(raw: unknown, turns: PipelineTurn[], timing: {starts: number[]; durations: number[]; totalSec: number}, words: Record<string, WordTiming[]>, allowEstimated: boolean): {outline?: Outline; issues: string[]} {
  const issues: string[] = [];
  const o = raw as Outline;
  if (!o || typeof o !== 'object') return {issues: ['outline is not a JSON object']};
  if (typeof o.title !== 'string' || !o.title.trim()) issues.push('title is missing');
  if (typeof o.thesis !== 'string' || !o.thesis.trim()) issues.push('thesis is missing');
  if (!Array.isArray(o.acts) || o.acts.length < 2) issues.push('need at least 2 acts');
  else {
    let next = 0;
    o.acts.forEach((act, i) => {
      const {from, to} = act?.turns ?? ({} as {from: number; to: number});
      if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) { issues.push(`act ${i + 1}: turns must be {"from": int, "to": int}`); return; }
      if (from !== next) issues.push(`act ${i + 1}: starts at turn ${from}, expected ${next} (acts must be contiguous)`);
      next = to + 1;
      const seconds = (to + 1 < turns.length ? timing.starts[to + 1] : timing.totalSec) - timing.starts[from];
      if (seconds > 200) issues.push(`act ${i + 1}: ${seconds.toFixed(0)}s is too long (max ~150s); split it`);
    });
    if (next !== turns.length) issues.push(`acts end at turn ${next - 1}; the last turn is ${turns.length - 1}`);
  }
  try {
    resolveBoxes(o.boxes, turns, timing, words, {requireBoxes: true, allowEstimated});
  } catch (error) {
    issues.push(...String(error instanceof Error ? error.message : error).split('\n').slice(1).map(line => line.replace(/^\s*-\s*/, '')));
  }
  return issues.length ? {issues} : {outline: o, issues};
}

export interface MapData {
  /** `base`: a period base layer (years it was true), drawn automatically on a map with a matching period. */
  geo: {id: string; name: string; type: string; precision: string; base?: string}[];
  places: {id: string; name: string}[];
  /** Library map views (data/library/maps): id, name and named camera targets. */
  views?: {id: string; name: string; focus: string[]}[];
}

export interface ActOutput {shots: PlanShot[]; years?: NonNullable<ShotPlan['years']>}

/* ------------------------------------- driver ------------------------------------- */

export interface DirectorIO {
  /**
   * Run one LLM prompt (optionally with a same-chat follow-up) and return the path of the JSON answer, or null when the
   * answer is not available yet (agent mode: the prompt was written out for an external agent to answer).
   */
  meta(name: string, prompt: string, attachments?: string[], followupPrompt?: string): string | null;
  /** Run independent prompts concurrently when supported; result order matches job order. */
  metaBatch?(jobs: {name: string; prompt: string; attachments?: string[]; followupPrompt?: string; label: string}[]): (string | null)[];
}


export interface DirectorInputs {
  episode: string;
  turns: PipelineTurn[];
  timing: {starts: number[]; durations: number[]; totalSec: number};
  words: Record<string, WordTiming[]>;
  options: ResolveOptions;
  catalog: CatalogEntry[];
  maps: MapData;
  previousOutline?: Outline;
}

export interface DirectorLog {stage: string; source: string; issues: string[]}

type JsonObject = Record<string, unknown>;
const object = (value: unknown): value is JsonObject => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const lonLat = (value: unknown): [number, number] | null =>
  object(value) && finite(value.lon) && finite(value.lat) ? [value.lon, value.lat] : null;

/**
 * Meta's UI treats some bare numeric arrays as citation references and removes
 * their contents from copied text. The prompt therefore uses object-shaped
 * coordinates; turn that transport representation into the renderer contract
 * only after the response has safely crossed the UI boundary.
 */

/**
 * Meta's UI treats some bare numeric arrays as citation references and removes their contents from copied text, so
 * prompts ask for object-shaped coordinates. Anywhere in an answer: {"lon","lat"} -> [lon, lat], a map extent
 * {"southwest","northeast"} -> [sw, ne], and a "focus" {"x","y"} -> [x, y].
 */
export function materializeCoordinateObjects(raw: unknown, key = ''): unknown {
  if (Array.isArray(raw)) return raw.map(v => materializeCoordinateObjects(v));
  if (!object(raw)) return raw;
  const point = lonLat(raw);
  if (point && Object.keys(raw).length === 2) return point;
  if (key === 'focus' && finite(raw.x) && finite(raw.y)) return [raw.x, raw.y];
  const out: JsonObject = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, materializeCoordinateObjects(v, k)]));
  if (Array.isArray(out.southwest) && Array.isArray(out.northeast) && Object.keys(out).length === 2) return [out.southwest, out.northeast];
  return out;
}

export const readAnswer = (path: string): unknown => materializeCoordinateObjects(JSON.parse(readFileSync(path, 'utf8')));

/** Outline (title, thesis, Episode Sheet boxes, acts) with same-chat review and repairs; shared by the storyboard director. */
export function directOutline(io: DirectorIO, input: Pick<DirectorInputs, 'episode' | 'turns' | 'timing' | 'words' | 'options' | 'previousOutline'>, log: DirectorLog[], maxRepairs = 2): {outline?: Outline; pending?: string[]} {
  const allowEstimated = !!input.options.allowEstimated;
  const basePrompt = outlinePrompt(input.episode, input.turns, input.timing.durations, input.previousOutline);
  let name = 'doc-outline';
  console.log('[storyboard] outline loading/generating + LLM audit');
  let source = io.meta(name, basePrompt, [], OUTLINE_REVIEW);
  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    if (!source) return {pending: [name]};
    const checked = validateOutline(readAnswer(source), input.turns, input.timing, input.words, allowEstimated);
    log.push({stage: attempt ? `outline repair ${attempt}` : 'outline', source, issues: checked.issues});
    if (checked.outline) { console.log(`[storyboard] outline valid: ${checked.outline.acts.length} acts; act generation next`); return {outline: checked.outline}; }
    if (attempt === maxRepairs) return {};
    console.log(`[storyboard] outline needs repair ${attempt + 1}/${maxRepairs} (${checked.issues.length} issue(s))`);
    name = `doc-outline-repair-${attempt + 1}`;
    source = io.meta(name, `${basePrompt}\n\nYOUR PREVIOUS OUTLINE HAD THESE PROBLEMS; return the corrected JSON only:\n${checked.issues.map(i => `- ${i}`).join('\n')}\n\nPREVIOUS OUTLINE:\n${readFileSync(source, 'utf8')}`);
  }
  return {};
}
