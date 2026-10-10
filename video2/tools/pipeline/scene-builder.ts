/**
 * Scene builder (docs/STORYBOARD.md, S4): storyboard + treatments + word timing -> the timed shot plan. Bookkeeping
 * only; the creative decisions (what, on which phrase, priority, pace) are the storyboard's. Rules:
 *  - each visual starts on its phrase (a repeated phrase is extended until it is unique, so the resolver lands on it)
 *  - framings come from the treatment named by the storyboard and are COPIED into the plan (frozen lessons never change)
 *  - question cards for every 5s+ pause, verbatim text (plan-fixups)
 *  - cuts too close: the optional visual goes first; holds too long: the same image continues in another framing on a
 *    phrase near the middle (one image use); anything still too long is reported back to the storyboard
 *  - variety: three same moves in a row -> the middle one takes its alternative framing, unless the storyboard said
 *    "hold"; storyboard intent always wins, the rule only warns then
 *  - custom explainers get beats timed from their cue phrases
 */
import {findPhrase} from '../../src/kit/anchors';
import {tokens} from '../../src/kit/text';
import type {PipelineTurn, WordTiming} from '../pipeline-core';
import {resolvePhrase, type AnchorTiming} from './anchors';
import type {CatalogEntry} from './doc-director';
import type {MapViewDef} from './map-views';
import {INTRO_FLY_SEC, INTRO_HOLD_SEC} from '../../src/documentary/sheet';
import {fixActQuestions} from './plan-fixups';
import {LOOK_RULES, type PlanShot, type ShotPlan} from './shots';
import {cleanSpeech} from './speech';
import {turnKeys, type Storyboard, type StoryVisual} from './storyboard';
import {alternateFraming, moveOf, pickFraming, proposeTreatment, type MoveKind, type Treatment} from './treatments';

export interface BuildInputs {
  storyboard: Storyboard;
  turns: PipelineTurn[];
  timing: AnchorTiming & {totalSec: number};
  words: Record<string, WordTiming[]>;
  catalog: CatalogEntry[];
  treatments: Record<string, Treatment>;
  depthMaps?: Record<string, string>;
  allowEstimated?: boolean;
  /** Library map views: a highlight on a target without a region is dropped (the move stays) instead of failing. */
  mapViews?: Record<string, MapViewDef>;
}

export interface BuildResult {plan: ShotPlan & {acts: Storyboard['acts']}; warnings: string[]; fixes: string[]; storyboardIssues: string[]}

/** A phrase the resolver will find at this occurrence: extended word by word (forward, then back) until unique. */
export function uniquePhrase(text: string, phrase: string, occurrence = 1): string | null {
  const hay = tokens(cleanSpeech(text));
  const needle = tokens(phrase);
  const pos = findPhrase(hay, needle, occurrence);
  if (pos < 0) return null;
  if (findPhrase(hay, needle, 1) === pos) return needle.join(' ');
  for (let len = needle.length + 1; pos + len <= hay.length && len <= 10; len++) {
    const ext = hay.slice(pos, pos + len);
    if (findPhrase(hay, ext, 1) === pos) return ext.join(' ');
  }
  for (let start = pos - 1; start >= 0 && pos + needle.length - start <= 10; start--) {
    const ext = hay.slice(start, pos + needle.length);
    if (findPhrase(hay, ext, 1) === start) return ext.join(' ');
  }
  return null;
}

/** A unique 3-5 word phrase near a word index (searching forward, then back), after word `after`, for splitting a hold. */
function phraseAt(text: string, from: number, after: number): string | null {
  const hay = tokens(cleanSpeech(text));
  const tryAt = (j: number) => {
    for (let len = 3; len <= 5 && j + len <= hay.length; len++) {
      const cand = hay.slice(j, j + len);
      if (findPhrase(hay, cand, 1) === j) return cand.join(' ');
    }
    return null;
  };
  const start = Math.min(Math.max(from, after + 1), Math.max(after + 1, hay.length - 3));
  for (let j = start; j < hay.length; j++) { const p = tryAt(j); if (p) return p; }
  for (let j = start - 1; j > after; j--) { const p = tryAt(j); if (p) return p; }
  return null;
}

type Cue = {turn: number; phrase: string};
type F = {x: number; y: number; zoom: number};

/** A camera move within the image's zoom limit (moves from an older plan or a stale treatment may exceed it). */
function clampMove(maxZoom: number, move: {from: F; to: F}, t: Treatment | null): {from: F; to: F} {
  const z = (f: F): F => ({...f, zoom: Math.min(maxZoom, Math.max(1, f.zoom))});
  const out = {from: z(move.from), to: z(move.to)};
  if (moveOf(out.from, out.to) !== 'still') return out;
  // Clamping flattened the move: use the treatment's framing (also clamped), else a gentle pan.
  const alt = t ? Object.values(t.framings).map(f => ({from: z(f.from), to: z(f.to)})).find(f => moveOf(f.from, f.to) !== 'still') : undefined;
  return alt ?? {from: {x: 0.45, y: 0.5, zoom: 1}, to: {x: 0.55, y: 0.5, zoom: 1}};
}
type Shot = Record<string, unknown> & {type: string; at: unknown};
interface Draft {shot: Shot; visual?: StoryVisual; split?: boolean}
const fromOf = (s: Shot) => s.from as F;
const toOf = (s: Shot) => s.to as F;

export function buildPlan(input: BuildInputs): BuildResult {
  const {storyboard: sb, turns, timing, words, catalog, treatments} = input;
  const warnings: string[] = [];
  const fixes: string[] = [];
  const storyboardIssues: string[] = [];
  const keys = turnKeys(turns);
  const indexOf = new Map(keys.map((k, i) => [k, i]));
  const byPath = new Map(catalog.map(c => [c.path, c]));
  const treatmentFor = (image: string): Treatment | null => {
    if (treatments[image]) return treatments[image];
    const entry = byPath.get(image);
    return entry ? proposeTreatment(entry, Boolean(input.depthMaps?.[image])) : null;
  };
  const cue = (index: number, phrase: string, occurrence?: number): Cue | null => {
    const p = uniquePhrase(turns[index]?.text ?? '', phrase, occurrence);
    return p ? {turn: index, phrase: p} : null;
  };

  // 1. One shot per storyboard visual, framings copied from treatments.
  let drafts: Draft[] = [];
  for (const st of sb.turns) {
    const index = indexOf.get(st.key);
    if (index === undefined) { if (st.visuals.length) storyboardIssues.push(`turn ${st.index}: the line changed; re-board its ${st.visuals.length} visual(s)`); continue; }
    for (const v of st.visuals) {
      const at = cue(index, v.at.phrase, v.at.occurrence);
      if (!at) { storyboardIssues.push(`turn ${index}: "${v.at.phrase}" is not in the line`); continue; }
      // Phrase cues inside the visual become timed cues of this line (offsets pass through).
      const inner = (c: unknown) => (c && typeof c === 'object' && 'phrase' in c && !('turn' in c) ? cue(index, (c as {phrase: string}).phrase, (c as {occurrence?: number}).occurrence) ?? c : c);
      const timed = <T extends {at?: unknown}>(list: T[] | undefined) => list?.map(x => ({...x, at: inner(x.at)}));
      const common = {at, ...(v.atmosphere ? {atmosphere: v.atmosphere} : {}), ...(v.transition ? {transition: v.transition} : {})};
      let shot: Shot | null = null;
      if (v.kind === 'image' || v.kind === 'clip') {
        const entry = v.image ? byPath.get(v.image) : undefined;
        const t = v.image && entry ? treatmentFor(v.image) : null;
        if (!v.image || !entry || !t) { storyboardIssues.push(`turn ${index}: "${v.image}" is not available (not downloaded, turned down, or too small for a full-frame shot)`); continue; }
        const picked = pickFraming(t, v.framing);
        const move = clampMove(entry.maxZoom, v.move ?? {from: picked.framing.from, to: picked.framing.to}, t);
        if (v.kind === 'clip') {
          const focus = v.focus ?? [move.to.x, move.to.y] as [number, number];
          shot = {type: 'clip', ...common, image: v.image, prompt: v.prompt ?? '', seed: v.seed ?? 42, focus, from: move.from, to: move.to} as Shot;
        } else if (v.name || v.framing === 'portrait') {
          shot = {type: 'portrait', ...common, image: v.image, from: move.from, to: move.to, name: v.name ?? '', ...(v.role ? {role: v.role} : {})} as Shot;
        } else {
          shot = {type: 'image_move', ...common, image: v.image, from: move.from, to: move.to, framing: picked.name} as unknown as Shot;
        }
      } else if (v.kind === 'map') {
        const m = (v.map ?? {}) as Record<string, {at?: unknown}[] | unknown>;
        const lists: Record<string, unknown[] | undefined> = Object.fromEntries((['moves', 'fills', 'lines', 'points', 'labels'] as const).filter(k => Array.isArray(m[k])).map(k => [k, timed(m[k] as {at?: unknown}[])]));
        // "highlight" asks to fill the target's region; a target without one is still a camera move.
        const view = typeof m.view === 'string' ? input.mapViews?.[m.view] : undefined;
        if (view && Array.isArray(lists.moves)) lists.moves = (lists.moves as {to?: string; highlight?: unknown}[]).map(mv => {
          if (!mv.highlight || view.focus?.[mv.to ?? '']?.region) return mv;
          warnings.push(`turn ${index}: "${mv.to}" has no region in ${view.id}; moved there without a highlight`);
          const {highlight: _drop, ...rest} = mv;
          return rest;
        });
        shot = {type: 'map', ...m, ...lists, ...common} as unknown as Shot;
      }
      else if (v.kind === 'point') {
        // A backdrop that cannot be used full frame is replaced by the nearest usable storyboard image (and reported).
        let backdrop = v.backdrop;
        if (!backdrop || !byPath.has(backdrop)) {
          const near = sb.turns.flatMap(x => x.visuals).map(x => (x.kind === 'point' ? x.backdrop : x.image)).find(p => p && byPath.has(p));
          storyboardIssues.push(`turn ${index}: point card backdrop "${backdrop}" is not available${near ? `; using "${near}"` : ''}`);
          backdrop = near;
          if (!backdrop) continue;
        }
        shot = {type: 'point', ...common, backdrop, bullets: timed(v.bullets) ?? []} as unknown as Shot;
      }
      else if (v.kind === 'custom') {
        const beats = ((v as {beats?: string[]}).beats ?? []).map(p => cue(index, p)).filter((c): c is Cue => !!c);
        shot = {type: 'custom', ...common, component: v.component, ...(beats.length ? {beats} : {})} as unknown as Shot;
      }
      if (shot) drafts.push({shot, visual: v});
    }
  }

  // 1b. Clips beyond the lesson budget play as ordinary moves on the same still (acts each may add one).
  drafts.filter(d => d.shot.type === 'clip').slice(LOOK_RULES.maxClips).forEach(d => {
    const c = d.shot as unknown as {at: Cue; image: string; from: unknown; to: unknown; atmosphere?: unknown; transition?: unknown};
    d.shot = {type: 'image_move', at: c.at, image: c.image, from: c.from, to: c.to, ...(c.atmosphere ? {atmosphere: c.atmosphere} : {}), ...(c.transition ? {transition: c.transition} : {})} as unknown as Shot;
    fixes.push(`turn ${c.at.turn}: clip over the lesson's ${LOOK_RULES.maxClips}; plays as a move on the same still`);
  });

  // 2. Question cards (automatic, verbatim) over the whole lesson.
  const withQuestions = fixActQuestions({shots: drafts.map(d => d.shot) as never}, {from: 0, to: turns.length - 1}, turns, timing.durations);
  const visualOf = new Map(drafts.map(d => [d.shot, d.visual]));
  drafts = (withQuestions.act.shots as unknown as Shot[]).map(shot => ({shot, visual: visualOf.get(shot)}));

  // 2b. The Episode Sheet lists the boxes, big, while they are named: a point card under it would show the same list
  // twice. Such a card plays as a move on its backdrop instead.
  const cueSec = (c: Cue) => { try { return resolvePhrase(c, turns, timing, words, 'start', input.allowEstimated).sec; } catch { return NaN; } };
  const intros = (sb.boxes ?? []).map(b => cueSec(b.intro as Cue)).filter(Number.isFinite);
  if (intros.length) {
    const [from, to] = [Math.min(...intros) - 0.25, Math.max(...intros) + INTRO_HOLD_SEC + INTRO_FLY_SEC];
    drafts.forEach((d, i) => {
      if (d.shot.type !== 'point') return;
      const start = i === 0 ? 0 : cueSec(d.shot.at as Cue);
      const end = i + 1 < drafts.length ? (drafts[i + 1].shot.type === 'question' ? timing.starts[(drafts[i + 1].shot.at as Cue).turn] : cueSec(drafts[i + 1].shot.at as Cue)) : timing.totalSec;
      if (!(start < to && end > from)) return;
      const backdrop = String((d.shot as unknown as {backdrop: string}).backdrop);
      const t = treatmentFor(backdrop);
      const entry = byPath.get(backdrop);
      if (!t || !entry) return;
      const picked = pickFraming(t);
      d.shot = {type: 'image_move', at: d.shot.at, image: backdrop, ...clampMove(entry.maxZoom, {from: picked.framing.from, to: picked.framing.to}, t), framing: picked.name} as unknown as Shot;
      fixes.push(`turn ${(d.shot.at as Cue).turn}: point card under the Episode Sheet's box intro; plays as a move on its backdrop (the sheet lists the boxes)`);
    });
  }

  // 3. Timing passes: too-close cuts, too-long holds.
  const timeOf = (d: Draft, i: number): number => {
    if (i === 0) return 0;
    const at = d.shot.at as {turn: number; phrase?: string};
    if (d.shot.type === 'question') return timing.starts[at.turn];
    try { return resolvePhrase(at as Cue, turns, timing, words, 'start', input.allowEstimated).sec; } catch { return NaN; }
  };
  const maxFor = (d: Draft) => (d.shot.type === 'question'
    ? timing.durations[(d.shot.at as {turn: number}).turn] + LOOK_RULES.questionOverrunSec
    : d.shot.type === 'map' || d.shot.type === 'custom' ? LOOK_RULES.maxMapSec : LOOK_RULES.maxShotSec) + LOOK_RULES.lengthToleranceSec;
  for (let pass = 0; pass < 400; pass++) {
    const starts = drafts.map(timeOf);
    const ends = starts.map((_, i) => (i + 1 < starts.length ? starts[i + 1] : timing.totalSec));
    let changed = false;
    // Too close: drop the optional one of the pair (else the earlier), never a question card. A too-short first shot
    // gives way too: the next visual then opens the lesson from 0s.
    for (let i = 0; i < drafts.length; i++) {
      const len = ends[i] - starts[i];
      if (!(len < LOOK_RULES.minShotSec - 0.05) || drafts[i].shot.type === 'question') continue;
      const next = drafts[i + 1];
      const victim = next && next.shot.type !== 'question' && next.visual?.priority === 'optional' && drafts[i].visual?.priority !== 'optional' ? i + 1 : i;
      fixes.push(`dropped "${String((drafts[victim].shot.at as Cue).phrase)}" (turn ${(drafts[victim].shot.at as Cue).turn}): cut too close to the next`);
      drafts.splice(victim, 1);
      changed = true;
      break;
    }
    if (changed) continue;
    // A custom explainer needs time to play its beat: the visual after a too-short one gives way (never a question card).
    for (let i = 0; i + 1 < drafts.length; i++) {
      if (drafts[i].shot.type !== 'custom' || !(ends[i] - starts[i] < LOOK_RULES.minCustomSec - 0.05)) continue;
      const next = drafts[i + 1];
      if (next.shot.type === 'question') { storyboardIssues.push(`turn ${(drafts[i].shot.at as Cue).turn}: custom explainer "${String(drafts[i].shot.component)}" has under ${LOOK_RULES.minCustomSec}s before the question card`); continue; }
      fixes.push(`dropped "${String((next.shot.at as Cue).phrase)}" (turn ${(next.shot.at as Cue).turn}): the explainer before it needs ${LOOK_RULES.minCustomSec}s`);
      drafts.splice(i + 1, 1);
      changed = true;
      break;
    }
    if (changed) continue;
    // Too long: continue the same image in another framing on a phrase near the middle.
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      const len = ends[i] - starts[i];
      if (!(len > maxFor(d))) continue;
      const mid = starts[i] + len / 2;
      // Prefer a new line starting inside the hold (a natural cut point), nearest the middle; else split mid-line.
      const lineStarts = turns.map((t, k) => ({k, t: timing.starts[k]})).filter(({k, t}) => turns[k].kind === 'speech' && t > starts[i] + LOOK_RULES.minShotSec && t < ends[i] - LOOK_RULES.minShotSec)
        .sort((a, b) => Math.abs(a.t - mid) - Math.abs(b.t - mid));
      const atLine = lineStarts[0] && Math.abs(lineStarts[0].t - mid) < len / 3 ? lineStarts[0].k : -1;
      const turnIdx = atLine >= 0 ? atLine : timing.starts.findIndex((s, k) => s <= mid && mid < (k + 1 < timing.starts.length ? timing.starts[k + 1] : timing.totalSec));
      const turn = turns[turnIdx];
      // The image to continue: the shot's own, else the nearest image shot (next first) — a map, point card or question
      // card that runs long cuts back to a picture instead of holding.
      const own = typeof d.shot.image === 'string' && ['image_move', 'portrait', 'clip'].includes(d.shot.type) ? d.shot.image as string : undefined;
      const near = own ?? [...drafts.slice(i + 1), ...drafts.slice(0, i).reverse()].map(x => x.shot).find(x => ['image_move', 'portrait'].includes(x.type) && typeof x.image === 'string')?.image as string | undefined;
      const image = near && byPath.has(near) ? near : undefined;
      if (turn?.kind !== 'speech' || !image) {
        storyboardIssues.push(`turn ${(d.shot.at as Cue).turn}: ${d.shot.type} holds ${len.toFixed(1)}s; add a visual in this stretch`);
        continue;
      }
      const hay = tokens(cleanSpeech(turn.text ?? ''));
      const word = atLine >= 0 ? 0 : Math.floor(((mid - timing.starts[turnIdx]) / Math.max(0.1, timing.durations[turnIdx])) * hay.length);
      const sameTurn = (d.shot.at as Cue).turn === turnIdx ? findPhrase(hay, tokens((d.shot.at as Cue).phrase), 1) : -1;
      const phrase = phraseAt(turn.text ?? '', word, sameTurn);
      if (!phrase) { storyboardIssues.push(`turn ${turnIdx}: a ${len.toFixed(1)}s hold needs another visual (no phrase to split on)`); continue; }
      const t = treatmentFor(image);
      const currentMove = own ? moveOf(fromOf(d.shot), toOf(d.shot)) : 'still';
      const alt = t ? alternateFraming(t, currentMove) ?? pickFraming(t) : null;
      const clamped = clampMove(byPath.get(image)!.maxZoom, alt ? {from: alt.framing.from, to: alt.framing.to} : {from: toOf(d.shot), to: fromOf(d.shot)}, t);
      const from = clamped.from;
      const to = clamped.to;
      const cont = {type: 'image_move', at: {turn: turnIdx, phrase}, image, from, to, continues: true, ...(alt ? {framing: alt.name} : {})} as unknown as Shot;
      drafts.splice(i + 1, 0, {shot: cont, visual: d.visual ? {...d.visual, priority: 'optional'} : undefined, split: true});
      fixes.push(`turn ${turnIdx}: "${image.split('/').pop()}" continues in another framing on "${phrase}" (${len.toFixed(1)}s hold split)`);
      changed = true;
      break;
    }
    if (!changed) break;
  }

  // 4. Variety: three same moves in a row -> the middle one takes its alternative, unless the storyboard said hold.
  const kindOf = (d: Draft): MoveKind | null => (['image_move', 'portrait'].includes(d.shot.type) ? moveOf(fromOf(d.shot), toOf(d.shot)) : null);
  for (let i = 1; i + 1 < drafts.length; i++) {
    const [a, b, c] = [kindOf(drafts[i - 1]), kindOf(drafts[i]), kindOf(drafts[i + 1])];
    if (!b || a !== b || b !== c) continue;
    const d = drafts[i];
    if (d.visual?.pace === 'hold' || d.visual?.move || d.shot.type === 'portrait') { warnings.push(`turn ${(d.shot.at as Cue).turn}: three ${b} moves in a row (kept: storyboard intent)`); continue; }
    const t = treatmentFor(String(d.shot.image));
    const alt = t && alternateFraming(t, b);
    if (!alt) { warnings.push(`turn ${(d.shot.at as Cue).turn}: three ${b} moves in a row (no alternative framing)`); continue; }
    Object.assign(d.shot, {from: alt.framing.from, to: alt.framing.to, framing: alt.name});
    fixes.push(`turn ${(d.shot.at as Cue).turn}: "${String(String(d.shot.image)).split('/').pop()}" switched to ${alt.name} (${alt.framing.move}) for variety`);
  }

  // A year stamp marks a new year: each year is stamped once, where it is first said (repeats are noise).
  const stamped = new Set<string>();
  const YEAR_MERGE_SEC = 1.5;
  const years = (sb.years ?? []).flatMap(y => {
    const index = indexOf.get(y.key);
    const at = index === undefined ? null : cue(index, y.phrase);
    if (!at) { storyboardIssues.push(`year ${y.text}: its line changed or "${y.phrase}" is not in it`); return []; }
    return [{at, text: y.text, index: index!}];
  }).sort((a, b) => a.index - b.index).flatMap(({at, text}) => {
    if (stamped.has(text)) { fixes.push(`turn ${at.turn}: year ${text} already stamped; not again`); return []; }
    stamped.add(text);
    return [{at, text}];
  });
  // Years said almost together ("1760 and 1761") are one stamp, "1760–1761", at the first.
  const timeOfCue = (c: Cue) => { try { return resolvePhrase(c, turns, timing, words, 'start', input.allowEstimated).sec; } catch { return NaN; } };
  for (let i = years.length - 1; i > 0; i--) {
    const [a, b] = [years[i - 1], years[i]];
    if (!(timeOfCue(b.at) - timeOfCue(a.at) < YEAR_MERGE_SEC)) continue;
    fixes.push(`turn ${b.at.turn}: years ${a.text} and ${b.text} said together; one stamp "${a.text}–${b.text}"`);
    years.splice(i - 1, 2, {at: a.at, text: `${a.text}–${b.text}`});
  }
  const shots = drafts.map(d => {
    const {framing: _f, ...rest} = d.shot as Record<string, unknown>;
    return rest as unknown as PlanShot;
  });
  // The timing passes can meet the same problem on several passes: report each once.
  const once = (list: string[]) => [...new Set(list)];
  return {plan: {episode: sb.episode, ...(sb.boxes ? {boxes: sb.boxes} : {}), shots, years, acts: sb.acts}, warnings: once(warnings), fixes: once([...withQuestions.fixes, ...fixes]), storyboardIssues: once(storyboardIssues)};
}
