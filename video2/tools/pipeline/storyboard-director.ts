/**
 * Storyboard director (docs/STORYBOARD.md, S2): the LLM decides WHAT is on screen for each line of one act (visuals,
 * the phrase each lands on, priority, pace) and nothing about timing. Small answers per act; repairs and reviewer notes
 * re-ask only the acts they concern.
 */
import type {PipelineTurn} from '../pipeline-core';
import {cleanSpeech} from './speech';
import {LOOK_RULES} from './shots';
import {
  assetsForAct, customsForAct, directOutline, readAnswer, type CatalogEntry, type DirectorInputs, type DirectorIO, type DirectorLog, type MapData, type Outline,
} from './doc-director';
import {checkStoryboard, turnKeys, type Storyboard, type StoryTurn, type StoryVisual} from './storyboard';

const fmtZoom = (z: number) => z.toFixed(2);
const turnLine = (t: PipelineTurn, i: number, durations: number[]) =>
  `${i} | ${t.kind === 'pause' ? 'PAUSE' : t.speaker} | ${durations[i].toFixed(1)}s | ${t.kind === 'pause' ? `[pause ${t.pauseSec}s: question card, no visuals]` : cleanSpeech(t.text ?? '')}`;

export const STORY_REVIEW = 'Switch roles: you are a demanding documentary editor. Re-check the storyboard you just wrote: every phrase verbatim and unique in its line and in spoken order, a new visual every 3-6 seconds of narration (spans for quick exchanges), the picture matches what the words name, no image more than twice in the act, at most one clip, explainers only for their exact event, nothing on PAUSE lines. Fix every problem and return ONLY the corrected JSON object {"turns": [...], "years": [...]}.';
const STORY_SELF_CHECK = 're-check your storyboard (phrases verbatim, unique and in order; a visual every 3-6 seconds; pictures match the words; each image at most twice; at most one clip; nothing on PAUSE lines) and answer with the COMPLETE JSON object {"turns": [...], "years": [...]}.';
export const storySelfCheckFor = (followup: string) => (followup === STORY_REVIEW ? STORY_SELF_CHECK : followup);

export function storyboardPrompt(index: number, outline: Outline, turns: PipelineTurn[], durations: number[], catalog: CatalogEntry[], maps: MapData, blockedCustoms?: Set<string>): string {
  const act = outline.acts[index];
  const span = turns.map((t, i) => ({t, i})).filter(({i}) => i >= act.turns.from && i <= act.turns.to);
  const actText = [act.title, act.purpose, ...span.map(({t}) => cleanSpeech(t.text ?? ''))].join(' ');
  const assets = assetsForAct(catalog, actText);
  const customs = customsForAct(actText, blockedCustoms);
  return [
    'You are the storyboard artist for a top-tier APUSH history documentary that must beat Heimler\'s History on YouTube. Decide WHAT is on screen for each line of ONE act. Do not time shots: an editor times them from the narration.',
    '',
    `LESSON: ${outline.title}. Thesis: ${outline.thesis}`,
    `ACT ${index + 1} of ${outline.acts.length}: ${act.title}. Purpose: ${act.purpose}`,
    '',
    'RULES:',
    '- A new visual about every 3-6 seconds of narration (about one per 10-15 spoken words). A long line gets several visuals; a quick back-and-forth may hold one visual across lines with "span": N (the number of following lines it continues over).',
    '- Each visual lands on a phrase: 2-6 consecutive words copied VERBATIM from that line, unique within the line, in the order spoken.',
    '- Show what the words are about: the person named, the place, the document, the event, the object. For an abstract idea use a document detail, a map, a point card (1-3 bullets, <= 6 words each) or a listed custom explainer.',
    '- Kinds: "image" (optional "framing": "wide" | "face" | "detail"; first appearance of a person: add "name" and "role" for a name tag), "map" (a map view), "point", "custom" (only a listed explainer, only for its exact event), "clip" (a hero still with gentle ambient motion: smoke, water, flags; never faces or text; at most one per act).',
    '- Images only from ASSETS, each at most twice in this act. Images marked retrospective (later imaginings) must not be presented as eyewitness records.',
    '- "priority": "essential" for what the words name, "optional" for texture. "pace": "hold" on the act\'s key line, "quick" for a spoken list, "reveal" for a pull-back reveal.',
    '- Never put visuals on PAUSE lines (question cards are automatic). Recap, practice and next-time lines may revisit images shown earlier.',
    '',
    'FORMAT (JSON only):',
    '{"turns":[{"turn":12,"visuals":[',
    ' {"kind":"image","image":"<asset path>","framing":"face","name":"George Grenville","role":"Prime Minister, 1763-1765","at":{"phrase":"george grenville"},"priority":"essential","pace":"hold"},',
    ' {"kind":"map","map":{"view":"<map view id>","moves":[{"at":{"offset":1.5},"to":"<focus or place id>"}],"fills":[{"at":{"offset":0.5},"region":{"geo":"<geo id>"},"color":"red"}]},"at":{"phrase":"..."},"priority":"essential"},',
    ' {"kind":"point","backdrop":"<asset path>","bullets":[{"text":"Britain won the war","at":{"offset":0.3}}],"at":{"phrase":"..."},"priority":"essential"},',
    ' {"kind":"custom","component":"<explainer name>","at":{"phrase":"..."},"priority":"essential"},',
    ' {"kind":"clip","image":"<asset path>","prompt":"Gunpowder smoke drifts slowly across the field.","at":{"phrase":"..."},"priority":"essential","span":1}',
    ']}],"years":[{"turn":0,"phrase":"in 1763","text":"1763"}]}',
    'Lines with no new visual are simply left out. Cues inside maps and point cards are {"offset": seconds after the visual starts}.',
    '',
    `ASSETS for this act (${assets.length} of ${catalog.length}; path | size | max zoom | description):`,
    ...(assets.length ? assets.map(c => `${c.path} | ${c.width}x${c.height} | ${fmtZoom(c.maxZoom)} | ${c.description.replace(/\s+/g, ' ').slice(0, 120)}${c.retrospective ? ' (retrospective)' : ''}`) : ['(none: use maps and point cards)']),
    '',
    ...(customs.length ? ['CUSTOM EXPLAINERS (name | event | what it shows):', ...customs.map(([n, c]) => `${n} | ${c.topic} | ${c.shows}`), ''] : []),
    'MAP VIEWS (view id | name | focus targets):',
    ...(maps.views?.length ? maps.views.map(v => `${v.id} | ${v.name} | ${v.focus.join(', ')}`) : ['(none)']),
    'MAP DATA (geo id | type | name), places (id | name):',
    ...maps.geo.map(g => `${g.id} | ${g.type} | ${g.name}`),
    ...maps.places.map(p => `${p.id} | ${p.name}`),
    '',
    `LINES of act ${index + 1} (index | speaker | duration | narration):`,
    ...span.map(({t, i}) => turnLine(t, i, durations)),
  ].join('\n');
}

interface ActBoard {turns: {turn: number; visuals: StoryVisual[]}[]; years?: {turn: number; phrase: string; text: string}[]}

/** Structure and anchors of one act's storyboard answer; returns the parsed act or the problems for a repair. */
export function validateStoryAct(raw: unknown, index: number, outline: Outline, turns: PipelineTurn[], durations: number[], catalog: CatalogEntry[], blockedCustoms: Set<string> = new Set()): {act?: ActBoard; issues: string[]} {
  const a = raw as ActBoard;
  const {from, to} = outline.acts[index].turns;
  if (!a || !Array.isArray(a.turns)) return {issues: ['answer must be {"turns": [...], "years": [...]}']};
  const issues: string[] = [];
  const paths = new Set(catalog.map(c => c.path));
  const perImage = new Map<string, number>();
  let clips = 0;
  for (const t of a.turns) {
    if (!Number.isInteger(t?.turn) || t.turn < from || t.turn > to) { issues.push(`turn ${t?.turn}: outside this act (lines ${from}-${to})`); continue; }
    if (turns[t.turn].kind === 'pause') { issues.push(`turn ${t.turn}: is a PAUSE line; remove its visuals`); continue; }
    for (const v of t.visuals ?? []) {
      if (!['image', 'map', 'point', 'custom', 'clip'].includes(v?.kind)) { issues.push(`turn ${t.turn}: unknown visual kind ${JSON.stringify(v?.kind)}`); continue; }
      v.priority ??= 'essential';
      const image = v.kind === 'point' ? v.backdrop : v.image;
      if (image) {
        if (!paths.has(image)) issues.push(`turn ${t.turn}: "${image}" is not a listed asset`);
        perImage.set(image, (perImage.get(image) ?? 0) + 1);
      }
      if (v.kind === 'clip') clips++;
      if (v.kind === 'custom' && (!v.component || blockedCustoms.has(v.component))) issues.push(`turn ${t.turn}: custom explainer "${v.component}" is not available`);
    }
  }
  for (const [image, n] of perImage) if (n > 2) issues.push(`"${image}" is used ${n} times in this act; at most twice`);
  if (clips > 1) issues.push(`${clips} clips in this act; at most one`);
  // Anchors: verbatim, unique, ordered (shared with the lesson-wide check).
  const keys = turnKeys(turns);
  const board: Storyboard = {episode: '', acts: [], turns: a.turns.filter(t => Number.isInteger(t.turn) && t.turn >= from && t.turn <= to).map(t => ({key: keys[t.turn], index: t.turn, visuals: t.visuals ?? []}))};
  const anchors = checkStoryboard(board, turns, durations, {maxImageUses: Infinity}).issues;
  issues.push(...anchors);
  for (const [n, y] of (a.years ?? []).entries()) if (!Number.isInteger(y?.turn) || y.turn < from || y.turn > to) issues.push(`year ${n + 1}: turn outside this act`);
  return issues.length ? {issues} : {act: a, issues};
}

export interface StoryboardResult {storyboard?: Storyboard; outline?: Outline; log: DirectorLog[]; pending?: string[]}

/** Joins act answers into one storyboard (turn keys, years with their line keys). */
export function assembleStoryboard(episode: string, outline: Outline, turns: PipelineTurn[], acts: ActBoard[]): Storyboard {
  const keys = turnKeys(turns);
  const byTurn = new Map<number, StoryVisual[]>();
  for (const a of acts) for (const t of a.turns) byTurn.set(t.turn, [...(byTurn.get(t.turn) ?? []), ...(t.visuals ?? [])]);
  return {
    episode,
    acts: outline.acts.map(a => ({title: a.title, purpose: a.purpose, turns: a.turns})),
    boxes: outline.boxes,
    years: acts.flatMap(a => (a.years ?? []).map(y => ({key: keys[y.turn], phrase: y.phrase, text: y.text}))),
    turns: keys.map((key, index) => ({key, index, visuals: byTurn.get(index) ?? []})),
  } as Storyboard;
}

/** The act board of an existing storyboard (for revisions), with line indexes for the current script. */
export function actBoardOf(sb: Storyboard, outline: Outline, index: number, turns: PipelineTurn[]): ActBoard {
  const keys = turnKeys(turns);
  const {from, to} = outline.acts[index].turns;
  const byKey = new Map(sb.turns.map(t => [t.key, t] as const));
  const out: ActBoard = {turns: [], years: []};
  for (let i = from; i <= to; i++) {
    const st: StoryTurn | undefined = byKey.get(keys[i]);
    if (st?.visuals.length) out.turns.push({turn: i, visuals: st.visuals});
  }
  for (const y of (sb as {years?: {key: string; phrase: string; text: string}[]}).years ?? []) {
    const i = keys.indexOf(y.key);
    if (i >= from && i <= to) out.years!.push({turn: i, phrase: y.phrase, text: y.text});
  }
  return out;
}

export interface StoryboardInputs extends Pick<DirectorInputs, 'episode' | 'turns' | 'timing' | 'words' | 'options' | 'catalog' | 'maps' | 'previousOutline'> {
  /** Revise an existing storyboard: only these acts (1-based) are re-asked, with the reviewer's notes. */
  revise?: {storyboard: Storyboard; outline: Outline; notes: Map<number, string[]>};
}

/** Outline (shared with the director) -> one storyboard prompt per act -> checks -> repairs of failing acts only. */
export function directStoryboard(io: DirectorIO, input: StoryboardInputs, maxRepairs = 2): StoryboardResult {
  const log: DirectorLog[] = [];
  const blocked = input.options.rejectedComponents ?? new Set<string>();
  let outline: Outline | undefined = input.revise?.outline;
  if (!outline) {
    const got = directOutline(io, input, log, maxRepairs);
    if (got.pending) return {log, pending: got.pending};
    outline = got.outline;
    if (!outline) return {log};
  }
  const prompts = outline.acts.map((_, i) => storyboardPrompt(i, outline!, input.turns, input.timing.durations, input.catalog, input.maps, blocked));
  const acts: (ActBoard | undefined)[] = [];
  const latest: (ActBoard | undefined)[] = [];
  let problems = new Map<number, string[]>();
  const nameFor = (i: number, suffix = '') => `sb-act-${String(i + 1).padStart(2, '0')}${suffix}`;
  if (input.revise) {
    outline.acts.forEach((_, i) => { acts[i] = actBoardOf(input.revise!.storyboard, outline!, i, input.turns); latest[i] = acts[i]; });
    for (const [act, notes] of input.revise.notes) problems.set(act - 1, notes.map(n => `REVIEWER NOTE: ${n}`));
  } else {
    const asked = outline.acts.map((_, i) => ({i, path: io.meta(nameFor(i), prompts[i], [], STORY_REVIEW)}));
    const waiting = asked.filter(a => !a.path).map(a => nameFor(a.i));
    if (waiting.length) return {outline, log, pending: waiting};
    for (const {i, path} of asked) {
      const raw = readAnswer(path!);
      latest[i] = raw as ActBoard;
      const checked = validateStoryAct(raw, i, outline, input.turns, input.timing.durations, input.catalog, blocked);
      log.push({stage: `storyboard act ${i + 1}`, source: path!, issues: checked.issues});
      if (checked.act) acts[i] = checked.act; else problems.set(i, checked.issues);
    }
  }
  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    if (!problems.size) {
      const sb = assembleStoryboard(input.episode, outline, input.turns, acts as ActBoard[]);
      // Lesson-wide: image uses past the budget go back to the acts that hold the extra uses (recap revisits allowed).
      const c = checkStoryboard(sb, input.turns, input.timing.durations, {rejectedImages: input.options.rejectedImages, maxImageUses: LOOK_RULES.maxImageUses + 2});
      if (!c.issues.length) { log.push({stage: 'storyboard', source: 'assembled', issues: c.warnings}); return {storyboard: sb, outline, log}; }
      log.push({stage: `storyboard assembled (attempt ${attempt + 1})`, source: 'assembled', issues: c.issues});
      for (const issue of c.issues) {
        const image = /^"([^"]+)" is used (\d+) times/.exec(issue)?.[1];
        const turn = Number(/^turn (\d+)/.exec(issue)?.[1]);
        const owners = image
          ? outline.acts.map((_, i) => i).filter(i => (acts[i]?.turns ?? []).some(t => t.visuals.some(v => (v.kind === 'point' ? v.backdrop : v.image) === image))).slice(1)
          : Number.isInteger(turn) ? [outline.acts.findIndex(a => turn >= a.turns.from && turn <= a.turns.to)] : [];
        for (const i of owners.filter(i => i >= 0)) problems.set(i, [...(problems.get(i) ?? []), image ? `${issue}; replace it in this act with a different relevant asset` : issue]);
      }
      if (!problems.size) return {outline, log};
    }
    if (attempt === maxRepairs) return {outline, log};
    const asked = [...problems].map(([i, lines]) => {
      const name = nameFor(i, input.revise ? `-revise-${attempt + 1}` : `-repair-${attempt + 1}`);
      const prev = latest[i] ?? acts[i];
      const ask = `${input.revise ? 'YOUR CURRENT STORYBOARD FOR THIS ACT NEEDS THESE CHANGES' : 'YOUR PREVIOUS STORYBOARD FOR THIS ACT HAD THESE PROBLEMS'}:\n${lines.map(l => `- ${l}`).join('\n')}\n\n${prev ? `CURRENT STORYBOARD:\n${JSON.stringify(prev)}\n\nChange only what is needed and return` : 'Return'} the complete corrected JSON object {"turns": [...], "years": [...]} only.`;
      return {i, name, path: io.meta(name, `${prompts[i]}\n\n${ask}`)};
    });
    const waiting = asked.filter(a => !a.path).map(a => a.name);
    if (waiting.length) return {outline, log, pending: waiting};
    problems = new Map();
    for (const {i, path} of asked) {
      const raw = readAnswer(path!);
      latest[i] = raw as ActBoard;
      const checked = validateStoryAct(raw, i, outline, input.turns, input.timing.durations, input.catalog, blocked);
      log.push({stage: `storyboard act ${i + 1} ${input.revise ? 'revise' : 'repair'} ${attempt + 1}`, source: path!, issues: checked.issues});
      if (checked.act) acts[i] = checked.act; else problems.set(i, checked.issues);
    }
  }
  return {outline, log};
}
