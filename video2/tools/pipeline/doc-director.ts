/**
 * Documentary director: lesson script -> shot plan (docs/LOOK.md), in the same format as data/u3e1/shots.sample.json.
 *
 *   1. outline   one LLM call (+ same-chat review): thesis, acts, Episode Sheet boxes with spoken cues
 *   2. acts      one LLM call per act (+ review): shots for that act only, from the asset catalog and library geography
 *   3. assemble  merge acts, resolve with the shot resolver (every LOOK rule), map problems to acts
 *   4. repair    re-ask only the acts that failed, with their problems listed
 *
 * Each act's prompt contains only that act's turns, so editing one line changes one prompt (the Meta prompt cache keeps
 * the rest). The LLM never writes seconds: every time is a phrase quoted from a turn, proven by the resolver.
 */
import {existsSync, readFileSync} from 'node:fs';
import {cleanSpeech} from './speech';
import {resolveBoxes} from './cues';
import {LOOK_RULES, resolveShotPlan, type PlanShot, type ResolveOptions, type ShotPlan} from './shots';
import type {PipelineTurn, WordTiming} from '../pipeline-core';
import {ATMOSPHERES} from '../../src/documentary/atmosphere';
import {CUSTOM_CATALOG} from '../../src/components/custom/catalog';
import {PATCH_FORMAT, applyActPatch, indexedAct, isFullAct, isPatch} from './act-patch';
import {dropShortShots, fixActQuestions, fixPlanBudgets} from './plan-fixups';

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
const DESCRIPTION_CHARS = 120;
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
export function customsForAct(actText: string): [string, (typeof CUSTOM_CATALOG)[keyof typeof CUSTOM_CATALOG]][] {
  const text = actText.toLowerCase();
  return Object.entries(CUSTOM_CATALOG).filter(([, c]) => c.keywords.some(k => new RegExp(`\\b${k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)));
}

const shortDescription = (text: string) => {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= DESCRIPTION_CHARS ? t : `${t.slice(0, t.lastIndexOf(' ', DESCRIPTION_CHARS)).replace(/[,;:]$/, '')}…`;
};

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
const COORDINATE_RULE = 'Never emit a bare numeric array: Meta UI can render it as a citation and delete its numbers. Write coordinates as {"lon":number,"lat":number}, map extents as {"southwest":{"lon":number,"lat":number},"northeast":{"lon":number,"lat":number}}, and clip focus as {"x":number,"y":number}. Arrays of objects or strings are safe.';

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

/* -------------------------------------- acts -------------------------------------- */

export interface MapData {
  geo: {id: string; name: string; type: string; precision: string}[];
  places: {id: string; name: string}[];
  /** Library map views (data/library/maps): id, name and named camera targets. */
  views?: {id: string; name: string; focus: string[]}[];
}

export interface ActOutput {shots: PlanShot[]; years?: NonNullable<ShotPlan['years']>}

const fmtZoom = (z: number) => z.toFixed(2);

export function actPrompt(index: number, outline: Outline, turns: PipelineTurn[], durations: number[], catalog: CatalogEntry[], maps: MapData): string {
  const act = outline.acts[index];
  const span = turns.map((t, i) => ({t, i})).filter(({i}) => i >= act.turns.from && i <= act.turns.to);
  const actText = [act.title, act.purpose, ...span.map(({t}) => cleanSpeech(t.text ?? ''))].join(' ');
  const assets = assetsForAct(catalog, actText);
  const customs = customsForAct(actText);
  return [
    'You are the director of a top-tier APUSH documentary that must beat Heimler\'s History on YouTube. Direct the SHOTS for ONE act.',
    '',
    `LESSON: ${outline.title}. Thesis: ${outline.thesis}`,
    `ACT ${index + 1} of ${outline.acts.length}: ${act.title}. Purpose: ${act.purpose}`,
    `Episode Sheet boxes (shown by the renderer; do not draw them): ${outline.boxes.map(b => b.label).join(' | ')}`,
    '',
    'THE LOOK (hard rules, enforced by code):',
    '- Full-screen visuals that always move. Cut on a spoken word every 3-6 seconds (about one shot per 10-15 spoken words).',
    `- An image shot lasts at most ${LOOK_RULES.maxShotSec}s; a map at most ${LOOK_RULES.maxMapSec}s; no shot under ${LOOK_RULES.minShotSec}s.`,
    '- Text appears ONLY as: a point card (1-3 bullets, <= 6 words each, when the narration enumerates or states a thesis), a portrait name tag (first time a person is shown), a year stamp, and map labels.',
    '- First appearance of a named person: a "portrait" shot with name and role. Geography, borders, routes, empires: a "map" shot.',
    '- Write maps against a MAP VIEW ("view": id): the view supplies projection, extent, opening camera, terrain and base labels. Add only what the narration drives: "moves" to a view focus or a place id, fills, lines, points by id. Use the full map form only when no view fits.',
    '- Every image shot must move: change zoom by >= 0.05 or move the focus point by >= 0.05.',
    `- Zoom is between 1.0 and that image's max zoom (listed). x and y (0..1) are the point to centre, e.g. a face.`,
    `- Use each image at most twice in this act (other acts draw on the same images; the lesson cap is ${LOOK_RULES.maxImageUses}). Prefer variety: spread shots across the listed assets.`,
    '- "clip" (generated motion from a still) only for one big battle, fire, sea or crowd moment, at most one per act; prompt describes ambient motion only (smoke, water, flags, trees), never camera moves, never new people.',
    ...(customs.length ? [] : ['- No custom explainer fits this act: do not use "custom" shots.']),
    `- "custom" (a hand-built animated explainer from CUSTOM EXPLAINERS) only where the narration is about exactly that event: at most one per act, ${LOOK_RULES.maxCustoms} per lesson, each ${LOOK_RULES.minCustomSec}-${LOOK_RULES.maxMapSec}s, starting on the phrase that introduces the event.`,
    `- Optional "atmosphere" on image, clip, portrait and point shots (not maps or custom): ${ATMOSPHERES.join(', ')}.`,
    `- Every PAUSE turn of ${LOOK_RULES.questionPauseSec}s or more gets a "question" shot anchored to the pause itself ({"turn": pauseIndex}, no phrase); the code fills in the question text. Mark questions after "N questions, AP-shaped" with "practice": true. Never anchor any other shot or cue on a pause turn.`,
    '- Use only images from ASSETS and geography from MAP DATA. Never invent paths or ids. 19th-century imaginings (marked retrospective) must not be presented as eyewitness records.',
    `- The FIRST shot must start in turn ${act.turns.from}. Shots are in time order. ${PHRASE_RULE}`,
    `- ${COORDINATE_RULE}`,
    '',
    'SHOT FORMATS (copy exactly):',
    '{"type":"image_move","at":{"turn":5,"phrase":"..."},"image":"<asset path>","from":{"x":0.5,"y":0.4,"zoom":1.0},"to":{"x":0.48,"y":0.3,"zoom":1.3},"atmosphere":["dust"]}',
    '{"type":"portrait","at":{...},"image":"<asset path>","from":{...},"to":{...},"name":"George Grenville","role":"Prime Minister, 1763-1765"}',
    '{"type":"map","at":{...},"view":"<map view id>","moves":[{"at":{"turn":5,"phrase":"..."},"to":"<view focus or place id>"}],',
    ' "fills":[{"at":{...},"region":{"geo":"<geo id>"}|{"state":"MA"},"color":"red"}], "lines":[{"at":{...},"geo":"<geo id>","color":"red","arrow":false}], "points":[{"at":{...},"place":"<place id>","kind":"fort"|"town"|"battle"}]}',
    'Full map form (only when no view fits): {"type":"map","at":{...},"projection":"us"|"world","extent":{"southwest":{"lon":-92,"lat":24},"northeast":{"lon":-62,"lat":48}},"tilt":24,"terrain":{"ridges":["<geo id>"],"rivers":true},',
    ' "camera":[{"at":{"offset":0},"center":{"lon":-77,"lat":39},"zoom":1.2}], "labels":[{"at":{...},"text":"Province of Quebec","lonlat":{"lon":-71,"lat":48.3},"style":"region"|"ocean"|"town"}], plus fills/lines/points as above}',
    '{"type":"point","at":{...},"backdrop":"<asset path>","bullets":[{"at":{...},"text":"Britain won the war"}],"atmosphere":["embers"]}',
    '{"type":"clip","at":{...},"image":"<asset path>","prompt":"Gunpowder smoke drifts slowly across the battlefield; the flag ripples softly.","seed":1763,"focus":{"x":0.5,"y":0.5}}',
    '{"type":"question","at":{"turn":57},"practice":false,"backdrop":"<optional asset path>"}',
    '{"type":"custom","at":{...},"component":"<custom explainer name>"}',
    'Cue forms: {"turn": i, "phrase": "..."} or {"offset": seconds after the shot starts}. Colors by name: gold, amber, red, blue.',
    'Optional year stamps for the act: "years":[{"at":{...},"text":"1763"}] (only for a year the narration says).',
    '',
    'Return JSON only: {"shots": [...], "years": [...]}',
    '',
    `ASSETS for this act (${assets.length} of ${catalog.length}; path | size | max zoom | description | focus regions):`,
    ...(assets.length ? assets.map(c => `${c.path} | ${c.width}x${c.height} | ${fmtZoom(c.maxZoom)} | ${shortDescription(c.description)}${c.retrospective ? ' (retrospective)' : ''}${c.focus?.length ? ` | ${c.focus.join(', ')}` : ''}`) : ['(none: use maps and point cards only)']),
    '',
    ...(customs.length ? ['CUSTOM EXPLAINERS (name | event | what it shows):', ...customs.map(([name, c]) => `${name} | ${c.topic} | ${c.shows}`), ''] : []),
    'MAP VIEWS (view id | name | focus targets):',
    ...(maps.views?.length ? maps.views.map(v => `${v.id} | ${v.name} | ${v.focus.join(', ')}`) : ['(none)']),
    '',
    'MAP DATA (geo id | type | precision | name), places (id | name), plus US states by postal code and countries by name:',
    ...maps.geo.map(g => `${g.id} | ${g.type} | ${g.precision} | ${g.name}`),
    ...maps.places.map(p => `${p.id} | ${p.name}`),
    '',
    `TURNS of act ${index + 1} (index | speaker | duration | locked narration):`,
    ...span.map(({t, i}) => turnLine(t, i, durations)),
  ].join('\n');
}

const ACT_CHECKS = `phrases verbatim from their turns, first shot in the first turn, cuts every 3-6 seconds, shot length limits, every image shot moves, zoom within each image's max zoom, only listed assets, map views and geo ids, text limits, at most one clip, custom explainers only for their exact event. ${COORDINATE_RULE}`;
/** Same-chat review (Meta UI): returns only what it changes, as a patch onto the draft it just wrote. */
export const ACT_REVIEW = `Switch roles: you are a skeptical senior editor. Re-check the shots you just wrote against every rule above: ${ACT_CHECKS}\n${PATCH_FORMAT}`;
/** Same-chat review with patches turned off (--no-patches): the complete corrected act. */
export const ACT_REVIEW_FULL = `Switch roles: you are a skeptical senior editor. Re-check the shots you just wrote against every rule above: ${ACT_CHECKS} Fix every problem silently and return ONLY the corrected JSON object {"shots": [...], "years": [...]}.`;
/** Single-pass agents have no draft to patch: they self-check and answer with the complete act. */
export const ACT_SELF_CHECK = `re-check your shots against every rule above (${ACT_CHECKS}), fix every problem, and answer with the COMPLETE JSON object {"shots": [...], "years": [...]}.`;
/** What a single-pass agent is told instead of a same-chat follow-up. */
export const selfCheckFor = (followup: string) => (followup === ACT_REVIEW || followup === ACT_REVIEW_FULL ? ACT_SELF_CHECK : followup);

/** Structural checks on one act before assembly (everything else is checked on the merged plan). */
export function validateAct(raw: unknown, index: number, outline: Outline, turns: PipelineTurn[], durations: number[]): {act?: ActOutput; issues: string[]} {
  const issues: string[] = [];
  const a = raw as ActOutput;
  const {from, to} = outline.acts[index].turns;
  if (!a || !Array.isArray(a.shots) || !a.shots.length) return {issues: ['act output must be {"shots": [...]} with at least one shot']};
  const questionCounts = new Map<number, number>();
  a.shots.forEach((shot, n) => {
    const turn = shot?.at?.turn;
    const where = `shot ${n + 1}`;
    if (!Number.isInteger(turn) || turn < from || turn > to) {
      issues.push(`${where}: "at" turn ${turn} is outside this act (turns ${from}-${to})`);
      return;
    }
    const turnKind = turns[turn]?.kind;
    if (turnKind === 'pause') {
      if (shot.type !== 'question') issues.push(`${where}: turn ${turn} is a pause; replace this ${shot.type} with exactly one {"type":"question","at":{"turn":${turn}},...} shot (no phrase)`);
      else {
        questionCounts.set(turn, (questionCounts.get(turn) ?? 0) + 1);
        if ('phrase' in shot.at && shot.at.phrase !== undefined) issues.push(`${where}: a question pause anchor is {"turn":${turn}} with no phrase`);
      }
    } else if (shot.type === 'question') {
      issues.push(`${where}: question shots must anchor to a pause turn; turn ${turn} is ${turnKind ?? 'missing'}`);
    }

    // Nested animation cues are either spoken phrases or offsets from the
    // containing shot. A pause turn is only legal as the top-level anchor of a
    // question shot; accepting it here defers an impossible repair until the
    // fully assembled plan.
    const nested: {label: string; at: unknown}[] = shot.type === 'map'
      ? [
          ...(shot.camera ?? []).map((v, i) => ({label: `camera ${i + 1}`, at: v.at})),
          ...(shot.fills ?? []).map((v, i) => ({label: `fill ${i + 1}`, at: v.at})),
          ...(shot.lines ?? []).map((v, i) => ({label: `line ${i + 1}`, at: v.at})),
          ...(shot.points ?? []).map((v, i) => ({label: `point ${i + 1}`, at: v.at})),
          ...(shot.labels ?? []).map((v, i) => ({label: `label ${i + 1}`, at: v.at})),
        ]
      : shot.type === 'point'
        ? (shot.bullets ?? []).map((v, i) => ({label: `bullet ${i + 1}`, at: v.at}))
        : [];
    for (const cue of nested) if (object(cue.at) && Number.isInteger(cue.at.turn) && turns[cue.at.turn as number]?.kind === 'pause') {
      issues.push(`${where} ${cue.label}: turn ${cue.at.turn} is a pause; use {"offset":seconds} inside a shot, or a top-level question shot`);
    }
  });
  if (a.shots[0]?.at?.turn !== from) issues.push(`the first shot must start in turn ${from}`);
  for (let turn = from; turn <= to; turn++) {
    if (turns[turn]?.kind !== 'pause' || durations[turn] < LOOK_RULES.questionPauseSec) continue;
    const count = questionCounts.get(turn) ?? 0;
    if (count !== 1) issues.push(`turn ${turn}: ${durations[turn]}s pause needs exactly one question shot, got ${count}`);
  }
  for (const [n, y] of (a.years ?? []).entries()) if (!Number.isInteger(y?.at?.turn) || y.at.turn < from || y.at.turn > to) issues.push(`year ${n + 1}: turn is outside this act`);
  return issues.length ? {issues} : {act: a, issues};
}

export function assemblePlan(episode: string, outline: Outline, acts: ActOutput[]): {plan: ShotPlan; shotAct: number[]; yearAct: number[]} {
  const shotAct: number[] = [];
  const yearAct: number[] = [];
  const shots = acts.flatMap((a, i) => a.shots.map(s => { shotAct.push(i); return s; }));
  const years = acts.flatMap((a, i) => (a.years ?? []).map(y => { yearAct.push(i); return y; }));
  return {plan: {episode, boxes: outline.boxes, shots, years}, shotAct, yearAct};
}

/**
 * Problems from the merged-plan resolver, grouped by the act that owns them (-1 = outline-level). Shot and year
 * numbers are rewritten as 0-based indexes within the act ("shot 37" -> "shot index 4"), matching the patch format.
 */
export function issuesByAct(message: string, shotAct: number[], yearAct: number[]): Map<number, string[]> {
  const out = new Map<number, string[]>();
  const add = (act: number, line: string) => out.set(act, [...(out.get(act) ?? []), line]);
  for (const line of message.split('\n').slice(1).map(l => l.replace(/^\s*-\s*/, '')).filter(Boolean)) {
    const shot = /^shot ?0*(\d+)\b/.exec(line);
    const year = /^year (\d+)\b/.exec(line);
    if (shot) {
      const g = Number(shot[1]) - 1;
      const act = shotAct[g] ?? -1;
      add(act, act < 0 ? line : line.replace(shot[0], `shot index ${g - shotAct.indexOf(act)}`));
    } else if (year) {
      const g = Number(year[1]) - 1;
      const act = yearAct[g] ?? -1;
      add(act, act < 0 ? line : line.replace(year[0], `year index ${g - yearAct.indexOf(act)}`));
    } else add(-1, line);
  }
  return out;
}

/* ------------------------------------- driver ------------------------------------- */

export interface DirectorIO {
  /**
   * Run one LLM prompt (optionally with a same-chat follow-up) and return the path of the JSON answer, or null when the
   * answer is not available yet (agent mode: the prompt was written out for an external agent to answer).
   */
  meta(name: string, prompt: string, attachments?: string[], followupPrompt?: string): string | null;
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
  /** Review and repair answer with patches (default); false asks for complete acts every time. */
  patches?: boolean;
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
export function materializeCoordinateObjects(raw: unknown): unknown {
  if (!object(raw)) return raw;
  // Full answers carry "shots"; review/repair patches carry new shots inside replace/insert edits.
  const edits = [...(Array.isArray(raw.replace) ? raw.replace : []), ...(Array.isArray(raw.insert) ? raw.insert : [])];
  const shots: unknown[] = Array.isArray(raw.shots) ? raw.shots : edits.map(e => (object(e) ? e.shot : null));
  for (const value of shots) {
    if (!object(value)) continue;
    if (value.type === 'clip' && object(value.focus) && finite(value.focus.x) && finite(value.focus.y)) {
      value.focus = [value.focus.x, value.focus.y];
    }
    if (value.type !== 'map') continue;
    if (object(value.extent)) {
      const southwest = lonLat(value.extent.southwest);
      const northeast = lonLat(value.extent.northeast);
      if (southwest && northeast) value.extent = [southwest, northeast];
    }
    if (Array.isArray(value.camera)) for (const key of value.camera) if (object(key)) {
      const center = lonLat(key.center);
      if (center) key.center = center;
    }
    if (Array.isArray(value.labels)) for (const label of value.labels) if (object(label)) {
      const at = lonLat(label.lonlat);
      if (at) label.lonlat = at;
    }
    if (Array.isArray(value.points)) for (const point of value.points) if (object(point)) {
      const at = lonLat(point.lonlat);
      if (at) point.lonlat = at;
    }
    if (Array.isArray(value.lines)) for (const line of value.lines) if (object(line) && Array.isArray(line.coords)) {
      const coords = line.coords.map(lonLat);
      if (coords.every((coord): coord is [number, number] => coord !== null)) line.coords = coords;
    }
  }
  return raw;
}

const readAnswer = (path: string): unknown => materializeCoordinateObjects(JSON.parse(readFileSync(path, 'utf8')));

/**
 * An act answer as a full act: a full answer as is, a patch applied onto `base` (repairs) or onto the same-chat draft
 * the Meta UI runner saved beside the answer (<name>.draft.json, reviews). Problems come back as repair lines.
 */
export function readActAnswer(path: string, base?: ActOutput): {raw?: unknown; issues: string[]} {
  const raw = readAnswer(path);
  if (!isPatch(raw)) return {raw, issues: []};
  const draftPath = path.replace(/\.json$/, '.draft.json');
  const onto = base ?? (existsSync(draftPath) ? readAnswer(draftPath) : undefined);
  if (!isFullAct(onto)) return {issues: ['the answer is a patch but there is no earlier answer to apply it to; return the COMPLETE JSON object {"shots": [...], "years": [...]}']};
  const applied = applyActPatch(onto as ActOutput, raw);
  return applied.act ? {raw: applied.act, issues: []} : {issues: applied.issues};
}

export interface DirectorResult {plan?: ShotPlan; outline?: Outline; log: DirectorLog[]; /** Prompt names still awaiting answers (agent mode). */ pending?: string[]}

export function directDocumentary(io: DirectorIO, input: DirectorInputs, maxRepairs = 2): DirectorResult {
  const log: DirectorLog[] = [];
  const allowEstimated = !!input.options.allowEstimated;
  // 1. Outline, with repairs.
  const basePrompt = outlinePrompt(input.episode, input.turns, input.timing.durations, input.previousOutline);
  let outline: Outline | undefined;
  let name = 'doc-outline';
  let source = io.meta(name, basePrompt, [], OUTLINE_REVIEW);
  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    if (!source) return {log, pending: [name]};
    const checked = validateOutline(readAnswer(source), input.turns, input.timing, input.words, allowEstimated);
    log.push({stage: attempt ? `outline repair ${attempt}` : 'outline', source, issues: checked.issues});
    if (checked.outline) { outline = checked.outline; break; }
    if (attempt === maxRepairs) return {log};
    name = `doc-outline-repair-${attempt + 1}`;
    source = io.meta(name, `${basePrompt}\n\nYOUR PREVIOUS OUTLINE HAD THESE PROBLEMS; return the corrected JSON only:\n${checked.issues.map(i => `- ${i}`).join('\n')}\n\nPREVIOUS OUTLINE:\n${readFileSync(source, 'utf8')}`);
  }
  if (!outline) return {log};

  // 2. Acts (each validated structurally), then 3. assemble + resolve, 4. repair only failing acts.
  const patches = input.patches ?? true;
  const prompts = outline.acts.map((_, i) => actPrompt(i, outline!, input.turns, input.timing.durations, input.catalog, input.maps));
  const acts: (ActOutput | undefined)[] = [];
  /** Latest full answer per act, valid or not: what a repair patch applies to. */
  const latest: (ActOutput | undefined)[] = [];
  const sources: string[] = [];
  const problems = new Map<number, string[]>();
  // Ask for every act before reading any answer, so external agents can work on all acts in parallel.
  const asked = outline.acts.map((_, i) => ({name: `doc-act-${String(i + 1).padStart(2, '0')}`, path: io.meta(`doc-act-${String(i + 1).padStart(2, '0')}`, prompts[i], [], patches ? ACT_REVIEW : ACT_REVIEW_FULL)}));
  const waiting = asked.filter(a => !a.path).map(a => a.name);
  if (waiting.length) return {outline, log, pending: waiting};
  const take = (i: number, path: string, stage: string, base?: ActOutput) => {
    sources[i] = path;
    const answer = readActAnswer(path, base);
    if (isFullAct(answer.raw)) {
      // Question cards are bookkeeping the code does exactly (convert, add, verbatim text) before validation.
      const fixed = fixActQuestions(answer.raw as ActOutput, outline!.acts[i].turns, input.turns, input.timing.durations);
      if (fixed.fixes.length) log.push({stage: `${stage} auto-fix`, source: path, issues: fixed.fixes});
      answer.raw = fixed.act;
      latest[i] = fixed.act;
    }
    const checked = answer.issues.length ? {act: undefined, issues: answer.issues} : validateAct(answer.raw, i, outline!, input.turns, input.timing.durations);
    log.push({stage, source: path, issues: checked.issues});
    acts[i] = checked.act;
    if (checked.act) problems.delete(i); else problems.set(i, checked.issues);
  };
  asked.forEach(({path}, i) => take(i, path!, `act ${i + 1}`));
  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    if (!problems.size) {
      // Lesson-wide budgets (image uses, custom explainers, clips) and zoom limits: fixed in code, not by repair rounds.
      const budgeted = fixPlanBudgets(acts as ActOutput[], outline, input.turns, input.catalog, assetsForAct);
      if (budgeted.fixes.length) log.push({stage: `assembled auto-fix (attempt ${attempt + 1})`, source: 'merged plan', issues: budgeted.fixes});
      budgeted.acts.forEach((a, i) => { acts[i] = a; latest[i] = a; });
      let {plan, shotAct, yearAct} = assemblePlan(input.episode, outline, acts as ActOutput[]);
      try {
        try {
          resolveShotPlan(plan, input.turns, input.timing, input.words, input.options);
        } catch (first) {
          // Cuts too short to read: drop them (the previous shot holds) and check again before asking for repairs.
          const dropped = dropShortShots(acts as ActOutput[], first instanceof Error ? first.message : String(first));
          if (!dropped.fixes.length) throw first;
          log.push({stage: `assembled auto-fix (attempt ${attempt + 1})`, source: 'merged plan', issues: dropped.fixes});
          dropped.acts.forEach((a, i) => { acts[i] = a; latest[i] = a; });
          ({plan, shotAct, yearAct} = assemblePlan(input.episode, outline, acts as ActOutput[]));
          resolveShotPlan(plan, input.turns, input.timing, input.words, input.options);
        }
        log.push({stage: 'assembled', source: 'merged plan', issues: []});
        return {plan, outline, log};
      } catch (error) {
        const grouped = issuesByAct(error instanceof Error ? error.message : String(error), shotAct, yearAct);
        log.push({stage: `assembled (attempt ${attempt + 1})`, source: 'merged plan', issues: [...grouped.values()].flat()});
        if (grouped.has(-1)) return {outline, log}; // outline-level problems: not repairable per act
        for (const [act, lines] of grouped) problems.set(act, lines);
      }
    }
    if (attempt === maxRepairs) return {outline, log};
    const repairs = [...problems].map(([i, lines]) => {
      const name = `doc-act-${String(i + 1).padStart(2, '0')}-repair-${attempt + 1}`;
      const previous = latest[i];
      const ask = previous && !patches
        ? `YOUR PREVIOUS ANSWER FOR THIS ACT HAD THESE PROBLEMS; return the corrected JSON only:\n${lines.map(l => `- ${l}`).join('\n')}\n\nPREVIOUS ANSWER:\n${JSON.stringify(previous)}`
        : previous
        ? `YOUR PREVIOUS ANSWER FOR THIS ACT HAD THESE PROBLEMS:\n${lines.map(l => `- ${l}`).join('\n')}\n\nPREVIOUS ANSWER (index: shot):\n${indexedAct(previous)}\n\nFix only what the problems need. ${PATCH_FORMAT}\nIf most shots must change, you may instead return the complete corrected {"shots": [...], "years": [...]}.`
        : `YOUR PREVIOUS ANSWER FOR THIS ACT HAD THESE PROBLEMS:\n${lines.map(l => `- ${l}`).join('\n')}\n\nReturn the COMPLETE corrected JSON object {"shots": [...], "years": [...]} only.`;
      return {i, name, path: io.meta(name, `${prompts[i]}\n\n${ask}`)};
    });
    const repairsWaiting = repairs.filter(r => !r.path).map(r => r.name);
    if (repairsWaiting.length) return {outline, log, pending: repairsWaiting};
    for (const {i, path} of repairs) take(i, path!, `act ${i + 1} repair ${attempt + 1}`, latest[i]);
  }
  return {outline, log};
}
