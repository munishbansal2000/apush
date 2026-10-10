/**
 * Storyboard director (docs/STORYBOARD.md, S2): the LLM decides WHAT is on screen for each line of one act (visuals,
 * the phrase each lands on, priority, pace) and nothing about timing. Small answers per act; repairs and reviewer notes
 * re-ask only the acts they concern.
 */
import type {PipelineTurn} from '../pipeline-core';
import {cleanSpeech} from './speech';
import {LOOK_RULES} from './shots';
import {
  COORDINATE_RULE, allocateActs, directOutline, readAnswer, type CatalogEntry, type DirectorInputs, type DirectorIO, type DirectorLog, type MapData, type Outline,
} from './doc-director';
import {checkStoryboard, turnKeys, type Storyboard, type StoryTurn, type StoryVisual} from './storyboard';

const fmtZoom = (z: number) => z.toFixed(2);
const turnLine = (t: PipelineTurn, i: number, durations: number[]) =>
  `${i} | ${t.kind === 'pause' ? 'PAUSE' : t.speaker} | ${durations[i].toFixed(1)}s | ${t.kind === 'pause' ? `[pause ${t.pauseSec}s: question card, no visuals]` : cleanSpeech(t.text ?? '')}`;

export const STORY_REVIEW = `Switch roles: you are a demanding documentary editor. Re-check the storyboard you just wrote: every phrase verbatim and unique in its line and in spoken order, a new visual every 3-6 seconds of narration (spans for quick exchanges), the picture matches what the words name, no image more than twice in the act, no more than ${LOOK_RULES.maxMapsPerAct} maps in the act, at most one clip, explainers only for their exact event, nothing on PAUSE lines. Fix every problem and return ONLY the corrected JSON object {"turns": [...], "years": [...]}.`;
const STORY_SELF_CHECK = `re-check your storyboard (phrases verbatim, unique and in order; a visual every 3-6 seconds; pictures match the words; each image within its "uses"; no more than ${LOOK_RULES.maxMapsPerAct} maps; at most one clip; nothing on PAUSE lines) and answer with the COMPLETE JSON object {"turns": [...], "years": [...]}.`;
export const storySelfCheckFor = (followup: string) => (followup === STORY_REVIEW ? STORY_SELF_CHECK : followup);

export function storyboardPrompt(index: number, outline: Outline, turns: PipelineTurn[], durations: number[], catalog: CatalogEntry[], maps: MapData, blockedCustoms?: Set<string>): string {
  const act = outline.acts[index];
  const span = turns.map((t, i) => ({t, i})).filter(({i}) => i >= act.turns.from && i <= act.turns.to);
  const {assets, uses, customs} = allocateActs(outline, turns, catalog, blockedCustoms)[index];
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
    '- Images only from ASSETS, each at most its "uses" in this act (the lesson shares each image between acts). Images marked retrospective (later imaginings) must not be presented as eyewitness records.',
    '- The Episode Sheet appears large and lists the boxes on screen by itself while they are named: never a point card (or any other list) for the boxes; show a picture or map under it.',
    `- Variety: at most ${LOOK_RULES.maxPointsPerAct} point cards in the act (only for a spoken list or the thesis) and never two in a row; at most ${LOOK_RULES.maxMapsPerAct} maps total and ${LOOK_RULES.maxMapRun} maps in a row; the same map view at most ${LOOK_RULES.maxViewPerAct} times in the act. Prefer primary-source documents, objects, portraits, and event images whenever geography is not the actual point.`,
    '- "priority": "essential" for what the words name, "optional" for texture. "pace": "hold" on the act\'s key line, "quick" for a spoken list, "reveal" for a pull-back reveal.',
    `- Never put visuals on PAUSE lines (question cards are automatic). Recap, practice and next-time lines may revisit images shown earlier, within the lesson limit of ${LOOK_RULES.maxImageUses} uses per image; each custom explainer at most once per lesson, ${LOOK_RULES.maxCustoms} in all.`,
    '',
    'FORMAT (JSON only):',
    '{"turns":[{"turn":12,"visuals":[',
    ' {"kind":"image","image":"<asset path>","framing":"face","name":"George Grenville","role":"Prime Minister, 1763-1765","at":{"phrase":"george grenville"},"priority":"essential","pace":"hold"},',
    ' {"kind":"map","map":{"view":"<map view id>","period":1763,"moves":[{"at":{"phrase":"new england"},"to":"<focus or place id>","highlight":true}],"fills":[{"at":{"offset":0.5},"region":{"geo":"<geo id>"},"color":"red"}]},"at":{"phrase":"..."},"priority":"essential"},',
    ' {"kind":"point","backdrop":"<asset path>","bullets":[{"text":"Britain won the war","at":{"offset":0.3}}],"at":{"phrase":"..."},"priority":"essential"},',
    ' {"kind":"custom","component":"<explainer name>","at":{"phrase":"..."},"priority":"essential"},',
    ' {"kind":"clip","image":"<asset path>","prompt":"Gunpowder smoke drifts slowly across the field.","at":{"phrase":"..."},"priority":"essential","span":1}',
    ']}],"years":[{"turn":0,"phrase":"in 1763","text":"1763"}]}',
    'Lines with no new visual are simply left out. Cues inside maps and point cards (moves, fills, lines, points, labels, bullets) are {"phrase": "<words of the same line>"} when the narration names the thing (exact timing from the audio; spoken after the visual\'s own phrase), otherwise {"offset": seconds after the visual starts}.',
    'A map\'s "period" is the moment the narration is about: a year (the map as it stood at the end of that year) or "YYYY-MM-DD" inside a year of change (1763-03-01 is before the Proclamation). The borders and claims the library has for that moment are drawn automatically; add only what the words point at.',
    COORDINATE_RULE,
    '',
    `ASSETS for this act (${assets.length} of ${catalog.length}; path | size | max zoom | uses | description):`,
    ...(assets.length ? assets.map(c => `${c.path} | ${c.width}x${c.height} | ${fmtZoom(c.maxZoom)} | ${uses.get(c.path) ?? 1} | ${c.description.replace(/\s+/g, ' ').slice(0, 120)}${c.retrospective ? ' (retrospective)' : ''}`) : ['(none: use maps and point cards)']),
    '',
    ...(customs.length ? ['CUSTOM EXPLAINERS (name | event | what it shows):', ...customs.map(([n, c]) => `${n} | ${c.topic} | ${c.shows}`), ''] : []),
    'A focus target marked * is a region: "highlight": true on the move fills and names it as the camera arrives. Use it whenever the narration names that region (a spoken list of regions: one move per region, each highlighted on its words).',
    'MAP VIEWS (view id | name | focus targets):',
    ...(maps.views?.length ? maps.views.map(v => `${v.id} | ${v.name} | ${v.focus.join(', ')}`) : ['(none)']),
    'MAP DATA (geo id | type | name), places (id | name):',
    ...maps.geo.map(g => `${g.id} | ${g.type} | ${g.name}${g.base ? ` | base layer ${g.base}: drawn by "period", do not add it` : ''}`),
    ...maps.places.map(p => `${p.id} | ${p.name}`),
    '',
    `LINES of act ${index + 1} (index | speaker | duration | narration):`,
    ...span.map(({t, i}) => turnLine(t, i, durations)),
  ].join('\n');
}

/** Map geography by type: fills need an area (Polygon/MultiPolygon), lines need a LineString; ids must exist. */
function mapGeoIssues(map: Record<string, unknown>, geo: Record<string, {geometry: {type: string}}>): string[] {
  const out: string[] = [];
  const typeOf = (id: string) => geo[id]?.geometry.type;
  const period = map.period;
  if (period !== undefined && !(typeof period === 'number' ? Number.isInteger(period) && period >= 1400 && period <= 2030 : typeof period === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(period)))
    out.push(`map period: ${JSON.stringify(period)} must be a year (1763) or a date ("1763-03-01")`);
  for (const f of (map.fills as {region?: {geo?: string}}[] | undefined) ?? []) {
    const id = f?.region?.geo;
    if (id && !typeOf(id)) out.push(`map fill: unknown geo id "${id}"`);
    else if (id && !/Polygon/.test(typeOf(id)!)) out.push(`map fill: "${id}" is a ${typeOf(id)}, not an area; draw it as a line ("lines": [{"geo": "${id}"}])`);
  }
  for (const l of (map.lines as {geo?: string}[] | undefined) ?? []) {
    if (l?.geo && !typeOf(l.geo)) out.push(`map line: unknown geo id "${l.geo}"`);
    else if (l?.geo && typeOf(l.geo) !== 'LineString') out.push(`map line: "${l.geo}" is a ${typeOf(l.geo)}, not a line; use it as a fill`);
  }
  return out;
}

interface ActBoard {turns: {turn: number; visuals: StoryVisual[]}[]; years?: {turn: number; phrase: string; text: string}[]}

/** Structure and anchors of one act's storyboard answer; returns the parsed act or the problems for a repair. */
export function validateStoryAct(raw: unknown, index: number, outline: Outline, turns: PipelineTurn[], durations: number[], catalog: CatalogEntry[], blockedCustoms: Set<string> = new Set(), geo: Record<string, {geometry: {type: string}}> = {}): {act?: ActBoard; issues: string[]} {
  const a = raw as ActBoard;
  const {from, to} = outline.acts[index].turns;
  if (!a || !Array.isArray(a.turns)) return {issues: ['answer must be {"turns": [...], "years": [...]}']};
  const issues: string[] = [];
  const paths = new Set(catalog.map(c => c.path));
  // The act's share of the lesson's images and explainers (the same split its prompt offered).
  const share = allocateActs(outline, turns, catalog, blockedCustoms)[index];
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
        else if (!share.uses.has(image)) issues.push(`turn ${t.turn}: "${image}" is not offered to this act (other acts use it); pick one from ASSETS`);
        perImage.set(image, (perImage.get(image) ?? 0) + 1);
      }
      if (v.kind === 'clip') clips++;
      if (v.kind === 'custom' && (!v.component || blockedCustoms.has(v.component))) issues.push(`turn ${t.turn}: custom explainer "${v.component}" is not available`);
      else if (v.kind === 'custom' && !share.customs.some(([name]) => name === v.component)) issues.push(`turn ${t.turn}: custom explainer "${v.component}" is not offered to this act (another act shows it); use a standard visual`);
      if (v.kind === 'map') issues.push(...mapGeoIssues(v.map ?? {}, geo).map(i => `turn ${t.turn}: ${i}`));
    }
  }
  for (const [image, n] of perImage) {
    const allowed = share.uses.get(image) ?? 0;
    if (allowed && n > allowed) issues.push(`"${image}" is used ${n} times in this act; at most ${allowed} here (the lesson shares it with other acts)`);
  }
  // Variety an act can always fix on its own (blocking): point cards, maps in a row, one map view repeated.
  const ordered = a.turns.filter(t => Number.isInteger(t?.turn)).sort((x, y) => x.turn - y.turn).flatMap(t => (t.visuals ?? []).map(v => ({turn: t.turn, v})));
  const points = ordered.filter(x => x.v.kind === 'point');
  if (points.length > LOOK_RULES.maxPointsPerAct) issues.push(`${points.length} point cards in this act (turns ${points.map(x => x.turn).join(', ')}); at most ${LOOK_RULES.maxPointsPerAct}: keep the ones that land a list or the thesis, show the rest as pictures or maps`);
  const mapsInAct = ordered.filter(x => x.v.kind === 'map');
  if (mapsInAct.length > LOOK_RULES.maxMapsPerAct) issues.push(`${mapsInAct.length} maps in this act (turns ${mapsInAct.map(x => x.turn).join(', ')}); at most ${LOOK_RULES.maxMapsPerAct}: keep maps only where geography changes or location matters and replace the rest with relevant pictures, documents, objects, point cards, or a listed explainer`);
  let mapRun = 0;
  ordered.forEach((x, n) => {
    if (x.v.kind === 'point' && ordered[n - 1]?.v.kind === 'point') issues.push(`turn ${x.turn}: two point cards in a row; put a picture or map between them`);
    mapRun = x.v.kind === 'map' ? mapRun + 1 : 0;
    if (mapRun === LOOK_RULES.maxMapRun + 1) issues.push(`turn ${x.turn}: more than ${LOOK_RULES.maxMapRun} maps in a row; break the run with a picture`);
  });
  const views = new Map<string, number>();
  for (const x of ordered) if (x.v.kind === 'map' && typeof x.v.map?.view === 'string') views.set(x.v.map.view as string, (views.get(x.v.map.view as string) ?? 0) + 1);
  for (const [view, n] of views) if (n > LOOK_RULES.maxViewPerAct) issues.push(`map view "${view}" is used ${n} times in this act; at most ${LOOK_RULES.maxViewPerAct} (use another view or a picture)`);
  if (clips > 1) issues.push(`${clips} clips in this act; at most one`);
  // Anchors: verbatim, unique, ordered (shared with the lesson-wide check).
  const keys = turnKeys(turns);
  const board: Storyboard = {episode: '', acts: [], turns: a.turns.filter(t => Number.isInteger(t.turn) && t.turn >= from && t.turn <= to).map(t => ({key: keys[t.turn], index: t.turn, visuals: t.visuals ?? []}))};
  const anchors = checkStoryboard(board, turns, durations, {maxImageUses: Infinity}).issues;
  issues.push(...anchors);
  for (const [n, y] of (a.years ?? []).entries()) if (!Number.isInteger(y?.turn) || y.turn < from || y.turn > to) issues.push(`year ${n + 1}: turn outside this act`);
  return issues.length ? {issues} : {act: a, issues};
}

/** Informational cross-act warnings; hard map-count/view budgets are enforced by lessonVarietyIssues below. */
export function varietyWarnings(sb: Storyboard): string[] {
  const out: string[] = [];
  const views = new Map<string, number[]>();
  const seq: {turn: number; kind: string}[] = [];
  for (const t of sb.turns) for (const v of t.visuals) {
    seq.push({turn: t.index, kind: v.kind});
    if (v.kind === 'map' && typeof v.map?.view === 'string') views.set(v.map.view as string, [...(views.get(v.map.view as string) ?? []), t.index]);
  }
  for (const [view, turns] of views) if (turns.length > LOOK_RULES.maxViewPerLesson) out.push(`map view "${view}" appears ${turns.length} times in the lesson (turns ${turns.join(', ')}); consider varying it`);
  let run = 1;
  for (let i = 1; i < seq.length; i++) {
    run = seq[i].kind === seq[i - 1].kind && (seq[i].kind === 'map' || seq[i].kind === 'point') ? run + 1 : 1;
    if ((seq[i].kind === 'map' && run === LOOK_RULES.maxMapRun + 1) || (seq[i].kind === 'point' && run === 2)) out.push(`turn ${seq[i].turn}: ${run} ${seq[i].kind}s in a row across acts`);
  }
  return out;
}

/** Lesson-wide failures are emitted per excess occurrence so each owning act gets one deterministic repair. */
export function lessonVarietyIssues(sb: Storyboard): string[] {
  const views = new Map<string, number[]>();
  const maps: {turn: number; view?: string}[] = [];
  for (const t of sb.turns) for (const v of t.visuals) {
    if (v.kind !== 'map') continue;
    const view = typeof v.map?.view === 'string' ? v.map.view as string : undefined;
    maps.push({turn: t.index, view});
    if (view) views.set(view, [...(views.get(view) ?? []), t.index]);
  }
  const issues = sb.acts.flatMap(act => {
    const inAct = maps.filter(m => m.turn >= act.turns.from && m.turn <= act.turns.to);
    return inAct.slice(LOOK_RULES.maxMapsPerAct).map((m, i) => `turn ${m.turn}: act "${act.title}" exceeds its map limit (${inAct.length} maps; max ${LOOK_RULES.maxMapsPerAct}); replace excess occurrence ${LOOK_RULES.maxMapsPerAct + i + 1} with a relevant non-map visual`);
  });
  issues.push(...[...views].flatMap(([view, turns]) => turns.slice(LOOK_RULES.maxViewPerLesson).map((turn, i) =>
    `turn ${turn}: map view "${view}" exceeds the lesson limit (${turns.length} uses; max ${LOOK_RULES.maxViewPerLesson}); replace excess occurrence ${LOOK_RULES.maxViewPerLesson + i + 1} with a relevant non-map visual`,
  )));
  return issues;
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
    const jobs = outline.acts.map((_, i) => ({name: nameFor(i), prompt: prompts[i], attachments: [], followupPrompt: STORY_REVIEW, label: `act ${i + 1}/${outline!.acts.length}`}));
    const paths = io.metaBatch?.(jobs) ?? jobs.map(j => io.meta(j.name, j.prompt, j.attachments, j.followupPrompt));
    const asked = paths.map((path, i) => ({i, path}));
    const waiting = asked.filter(a => !a.path).map(a => nameFor(a.i));
    if (waiting.length) return {outline, log, pending: waiting};
    let remainingValidation = asked.length;
    for (const {i, path} of asked) {
      console.log(`[storyboard] act ${i + 1}/${outline.acts.length} validating locally; ${remainingValidation} validation(s) remaining`);
      const raw = readAnswer(path!);
      latest[i] = raw as ActBoard;
      const checked = validateStoryAct(raw, i, outline, input.turns, input.timing.durations, input.catalog, blocked, input.options.geo ?? {});
      log.push({stage: `storyboard act ${i + 1}`, source: path!, issues: checked.issues});
      if (checked.act) acts[i] = checked.act; else problems.set(i, checked.issues);
      remainingValidation--;
      console.log(`[storyboard] act ${i + 1}/${outline.acts.length} ${checked.act ? 'valid' : `needs repair (${checked.issues.length} issue(s))`}; ${remainingValidation} validation(s) remaining`);
    }
  }
  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    if (!problems.size) {
      console.log(`[storyboard] ${outline.acts.length}/${outline.acts.length} acts locally valid; checking lesson-wide coherence and budgets`);
      const sb = assembleStoryboard(input.episode, outline, input.turns, acts as ActBoard[]);
      // Lesson-wide: image uses past the budget and explainer repeats go back to the acts that hold the extra uses.
      const c = checkStoryboard(sb, input.turns, input.timing.durations, {rejectedImages: input.options.rejectedImages, maxImageUses: LOOK_RULES.maxImageUses});
      const lessonIssues = [...c.issues, ...lessonVarietyIssues(sb)];
      if (!lessonIssues.length) {
        console.log('[storyboard] lesson-wide validation passed; storyboard complete');
        log.push({stage: 'storyboard', source: 'assembled', issues: [...c.warnings, ...varietyWarnings(sb)]});
        return {storyboard: sb, outline, log};
      }
      console.log(`[storyboard] lesson-wide validation found ${lessonIssues.length} issue(s); assigning affected acts for repair`);
      log.push({stage: `storyboard assembled (attempt ${attempt + 1})`, source: 'assembled', issues: lessonIssues});
      for (const issue of lessonIssues) {
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
    const repairSpecs = [...problems].map(([i, lines]) => {
      const name = nameFor(i, input.revise ? `-revise-${attempt + 1}` : `-repair-${attempt + 1}`);
      const prev = latest[i] ?? acts[i];
      const ask = `${input.revise ? 'YOUR CURRENT STORYBOARD FOR THIS ACT NEEDS THESE CHANGES' : 'YOUR PREVIOUS STORYBOARD FOR THIS ACT HAD THESE PROBLEMS'}:\n${lines.map(l => `- ${l}`).join('\n')}\n\n${prev ? `CURRENT STORYBOARD:\n${JSON.stringify(prev)}\n\nChange only what is needed and return` : 'Return'} the complete corrected JSON object {"turns": [...], "years": [...]} only.`;
      return {i, name, prompt: `${prompts[i]}\n\n${ask}`, label: `act ${i + 1}/${outline!.acts.length} ${input.revise ? 'revision' : `repair ${attempt + 1}`}`};
    });
    const repairPaths = io.metaBatch?.(repairSpecs) ?? repairSpecs.map(j => io.meta(j.name, j.prompt));
    const asked = repairSpecs.map((spec, n) => ({...spec, path: repairPaths[n]}));
    const waiting = asked.filter(a => !a.path).map(a => a.name);
    if (waiting.length) return {outline, log, pending: waiting};
    problems = new Map();
    let remainingValidation = asked.length;
    for (const {i, path} of asked) {
      console.log(`[storyboard] act ${i + 1}/${outline.acts.length} ${input.revise ? 'revision' : `repair ${attempt + 1}`} validating locally; ${remainingValidation} validation(s) remaining`);
      const raw = readAnswer(path!);
      latest[i] = raw as ActBoard;
      const checked = validateStoryAct(raw, i, outline, input.turns, input.timing.durations, input.catalog, blocked, input.options.geo ?? {});
      log.push({stage: `storyboard act ${i + 1} ${input.revise ? 'revise' : 'repair'} ${attempt + 1}`, source: path!, issues: checked.issues});
      if (checked.act) acts[i] = checked.act; else problems.set(i, checked.issues);
      remainingValidation--;
      console.log(`[storyboard] act ${i + 1}/${outline.acts.length} ${checked.act ? 'valid' : `still has ${checked.issues.length} issue(s)`}; ${remainingValidation} validation(s) remaining`);
    }
  }
  return {outline, log};
}
