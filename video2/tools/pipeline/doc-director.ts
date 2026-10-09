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
import {readFileSync} from 'node:fs';
import {cleanSpeech} from './speech';
import {resolveBoxes} from './cues';
import {LOOK_RULES, resolveShotPlan, type PlanShot, type ResolveOptions, type ShotPlan} from './shots';
import type {PipelineTurn, WordTiming} from '../pipeline-core';
import {ATMOSPHERES} from '../../src/documentary/atmosphere';

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
}

export interface ActOutput {shots: PlanShot[]; years?: NonNullable<ShotPlan['years']>}

const fmtZoom = (z: number) => z.toFixed(2);

export function actPrompt(index: number, outline: Outline, turns: PipelineTurn[], durations: number[], catalog: CatalogEntry[], maps: MapData): string {
  const act = outline.acts[index];
  const span = turns.map((t, i) => ({t, i})).filter(({i}) => i >= act.turns.from && i <= act.turns.to);
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
    '- Every image shot must move: change zoom by >= 0.05 or move the focus point by >= 0.05.',
    `- Zoom is between 1.0 and that image's max zoom (listed). x and y (0..1) are the point to centre, e.g. a face.`,
    `- The same image may appear in at most ${LOOK_RULES.maxImageUses} shots in the whole lesson; prefer variety.`,
    '- "clip" (generated motion from a still) only for one big battle, fire, sea or crowd moment, at most one per act; prompt describes ambient motion only (smoke, water, flags, trees), never camera moves, never new people.',
    `- Optional "atmosphere" on image, clip, portrait and point shots (not maps): ${ATMOSPHERES.join(', ')}.`,
    '- Use only images from ASSETS and geography from MAP DATA. Never invent paths or ids. 19th-century imaginings (marked retrospective) must not be presented as eyewitness records.',
    `- The FIRST shot must start in turn ${act.turns.from}. Shots are in time order. ${PHRASE_RULE}`,
    '',
    'SHOT FORMATS (copy exactly):',
    '{"type":"image_move","at":{"turn":5,"phrase":"..."},"image":"<asset path>","from":{"x":0.5,"y":0.4,"zoom":1.0},"to":{"x":0.48,"y":0.3,"zoom":1.3},"atmosphere":["dust"]}',
    '{"type":"portrait","at":{...},"image":"<asset path>","from":{...},"to":{...},"name":"George Grenville","role":"Prime Minister, 1763-1765"}',
    '{"type":"map","at":{...},"projection":"us"|"world","extent":[[-92,24],[-62,48]],"tilt":24,"terrain":{"ridges":["geo.line.appalachian-crest"],"rivers":true},',
    ' "camera":[{"at":{"offset":0},"center":[-77,39],"zoom":1.2},{"at":{"turn":5,"phrase":"..."},"center":[-75,40],"zoom":1.6,"ease":2.5}],',
    ' "fills":[{"at":{...},"region":{"geo":"<geo id>"}|{"state":"MA"},"color":"#b3261e"}], "lines":[{"at":{...},"geo":"<geo id>","color":"#b3261e","arrow":false}],',
    ' "points":[{"at":{...},"place":"<place id>","kind":"fort"|"town"|"battle"}], "labels":[{"at":{...},"text":"Province of Quebec","lonlat":[-71,48.3],"style":"region"|"ocean"|"town"}]}',
    '{"type":"point","at":{...},"backdrop":"<asset path>","bullets":[{"at":{...},"text":"Britain won the war"}],"atmosphere":["embers"]}',
    '{"type":"clip","at":{...},"image":"<asset path>","prompt":"Gunpowder smoke drifts slowly across the battlefield; the flag ripples softly.","seed":1763,"focus":[0.5,0.5]}',
    'Cue forms: {"turn": i, "phrase": "..."} or {"offset": seconds after the shot starts}. Colors: gold #c9a227, amber #e2a33b, red #b3261e, blue #2c5aa0.',
    'Optional year stamps for the act: "years":[{"at":{...},"text":"1763"}] (only for a year the narration says).',
    '',
    'Return JSON only: {"shots": [...], "years": [...]}',
    '',
    'ASSETS (path | size | max zoom | description | focus regions):',
    ...(catalog.length ? catalog.map(c => `${c.path} | ${c.width}x${c.height} | ${fmtZoom(c.maxZoom)} | ${c.description.replace(/\s+/g, ' ').slice(0, 200)}${c.retrospective ? ' (retrospective)' : ''}${c.focus?.length ? ` | ${c.focus.join(', ')}` : ''}`) : ['(none: use maps and point cards only)']),
    '',
    'MAP DATA (geo id | type | precision | name), places (id | name), plus US states by postal code and countries by name:',
    ...maps.geo.map(g => `${g.id} | ${g.type} | ${g.precision} | ${g.name}`),
    ...maps.places.map(p => `${p.id} | ${p.name}`),
    '',
    `TURNS of act ${index + 1} (index | speaker | duration | locked narration):`,
    ...span.map(({t, i}) => turnLine(t, i, durations)),
  ].join('\n');
}

export const ACT_REVIEW = 'Switch roles: you are a skeptical senior editor. Re-check the shots you just wrote against every rule above: phrases verbatim from their turns, first shot in the first turn, cuts every 3-6 seconds, shot length limits, every image shot moves, zoom within each image\'s max zoom, only listed assets and geo ids, text limits, at most one clip. Fix every problem silently and return ONLY the corrected JSON object {"shots": [...], "years": [...]}.';

/** Structural checks on one act before assembly (everything else is checked on the merged plan). */
export function validateAct(raw: unknown, index: number, outline: Outline): {act?: ActOutput; issues: string[]} {
  const issues: string[] = [];
  const a = raw as ActOutput;
  const {from, to} = outline.acts[index].turns;
  if (!a || !Array.isArray(a.shots) || !a.shots.length) return {issues: ['act output must be {"shots": [...]} with at least one shot']};
  a.shots.forEach((shot, n) => {
    const turn = shot?.at?.turn;
    if (!Number.isInteger(turn) || turn < from || turn > to) issues.push(`shot ${n + 1}: "at" turn ${turn} is outside this act (turns ${from}-${to})`);
  });
  if (a.shots[0]?.at?.turn !== from) issues.push(`the first shot must start in turn ${from}`);
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

/** Problems from the merged-plan resolver, grouped by the act that owns them (-1 = outline-level). */
export function issuesByAct(message: string, shotAct: number[], yearAct: number[]): Map<number, string[]> {
  const out = new Map<number, string[]>();
  const add = (act: number, line: string) => out.set(act, [...(out.get(act) ?? []), line]);
  for (const line of message.split('\n').slice(1).map(l => l.replace(/^\s*-\s*/, '')).filter(Boolean)) {
    const shot = /^shot ?0*(\d+)\b/.exec(line);
    const year = /^year (\d+)\b/.exec(line);
    if (shot) add(shotAct[Number(shot[1]) - 1] ?? -1, line);
    else if (year) add(yearAct[Number(year[1]) - 1] ?? -1, line);
    else add(-1, line);
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
}

export interface DirectorLog {stage: string; source: string; issues: string[]}

const readAnswer = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

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
  const prompts = outline.acts.map((_, i) => actPrompt(i, outline!, input.turns, input.timing.durations, input.catalog, input.maps));
  const acts: (ActOutput | undefined)[] = [];
  const sources: string[] = [];
  const problems = new Map<number, string[]>();
  // Ask for every act before reading any answer, so external agents can work on all acts in parallel.
  const asked = outline.acts.map((_, i) => ({name: `doc-act-${String(i + 1).padStart(2, '0')}`, path: io.meta(`doc-act-${String(i + 1).padStart(2, '0')}`, prompts[i], [], ACT_REVIEW)}));
  const waiting = asked.filter(a => !a.path).map(a => a.name);
  if (waiting.length) return {outline, log, pending: waiting};
  asked.forEach(({path}, i) => {
    sources[i] = path!;
    const checked = validateAct(readAnswer(sources[i]), i, outline!);
    log.push({stage: `act ${i + 1}`, source: sources[i], issues: checked.issues});
    acts[i] = checked.act;
    if (!checked.act) problems.set(i, checked.issues);
  });
  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    if (!problems.size) {
      const {plan, shotAct, yearAct} = assemblePlan(input.episode, outline, acts as ActOutput[]);
      try {
        resolveShotPlan(plan, input.turns, input.timing, input.words, input.options);
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
      return {i, name, path: io.meta(name, `${prompts[i]}\n\nYOUR PREVIOUS ANSWER FOR THIS ACT HAD THESE PROBLEMS; return the corrected JSON only:\n${lines.map(l => `- ${l}`).join('\n')}\n\nPREVIOUS ANSWER:\n${readFileSync(sources[i], 'utf8')}`)};
    });
    const repairsWaiting = repairs.filter(r => !r.path).map(r => r.name);
    if (repairsWaiting.length) return {outline, log, pending: repairsWaiting};
    for (const {i, path} of repairs) {
      sources[i] = path!;
      const checked = validateAct(readAnswer(sources[i]), i, outline);
      log.push({stage: `act ${i + 1} repair ${attempt + 1}`, source: sources[i], issues: checked.issues});
      acts[i] = checked.act;
      if (checked.act) problems.delete(i); else problems.set(i, checked.issues);
    }
  }
  return {outline, log};
}
