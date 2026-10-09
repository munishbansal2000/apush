/**
 * Deterministic fix-ups for director output: mechanical problems the code can solve exactly, so repair rounds are
 * spent on judgment (phrases, pacing) instead of bookkeeping an LLM cannot do across independently directed acts.
 *
 *  per act (before validation)
 *   - question cards: a shot anchored on a pause becomes that pause's question card; every 5s+ pause gets exactly one
 *     card; the card's text is copied verbatim from the line before the pause; nested cues on a pause become offsets
 *  across the lesson (after assembly)
 *   - zoom clamped to each image's max zoom (and >= 1), keeping the camera moving
 *   - image budget: occurrences past LOOK_RULES.maxImageUses are swapped for the act's least-used relevant images
 *   - custom explainers: repeats and those past the lesson budget become image shots; clips past the budget become
 *     camera moves on the same still
 *   - cuts shorter than the minimum are dropped (the previous shot holds), when the resolver reports them
 * Every change is listed in the director log as "auto-fix".
 */
import type {PipelineTurn} from '../pipeline-core';
import {cleanSpeech} from './speech';
import {LOOK_RULES, type PlanShot, type ShotRules} from './shots';
import type {ViewMapShot} from './map-views';
import type {ActOutput, CatalogEntry, Outline} from './doc-director';

type Shot = PlanShot | ViewMapShot;
type Framing = {x: number; y: number; zoom: number};
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** The question to show for a pause: the last question sentence of the line before it (verbatim), else its last sentence. */
export function questionBefore(turns: PipelineTurn[], pause: number): string | null {
  const prev = turns[pause - 1];
  if (!prev || prev.kind !== 'speech') return null;
  const sentences = cleanSpeech(prev.text ?? '').split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean);
  const pick = [...sentences].reverse().find(s => s.includes('?')) ?? sentences[sentences.length - 1];
  if (!pick) return null;
  const words = pick.split(/\s+/);
  return words.length > 40 ? words.slice(-40).join(' ') : pick;
}

/** Question cards for one act: convert, dedupe, insert, and fill their text. */
export function fixActQuestions(act: ActOutput, range: {from: number; to: number}, turns: PipelineTurn[], durations: number[], rules: ShotRules = LOOK_RULES): {act: ActOutput; fixes: string[]} {
  const fixes: string[] = [];
  const carded = new Set<number>();
  const shots: Shot[] = [];
  for (const raw of act.shots as Shot[]) {
    if (!isObj(raw) || !isObj(raw.at)) { shots.push(raw); continue; }
    const turn = raw.at.turn as number;
    // Nested cues may not point at a pause (no words): move them to a small offset into the shot.
    for (const key of ['camera', 'fills', 'lines', 'points', 'labels', 'bullets', 'moves'] as const) {
      const list = (raw as Record<string, unknown>)[key];
      if (Array.isArray(list)) for (const item of list) if (isObj(item) && isObj(item.at) && turns[item.at.turn as number]?.kind === 'pause') {
        item.at = {offset: 0.5};
        fixes.push(`turn ${turn}: a ${key} cue on a pause now starts 0.5s into its shot`);
      }
    }
    if (turns[turn]?.kind === 'pause') {
      if (carded.has(turn)) { fixes.push(`turn ${turn}: dropped an extra shot on the pause (one question card per pause)`); continue; }
      const question = questionBefore(turns, turn);
      if (!question) { fixes.push(`turn ${turn}: dropped a shot on a pause with no question before it`); continue; }
      carded.add(turn);
      if (raw.type !== 'question') fixes.push(`turn ${turn}: ${raw.type} on a pause became its question card`);
      shots.push({type: 'question', at: {turn}, question, ...(raw.type === 'question' && raw.practice ? {practice: true} : {}), ...(raw.type === 'question' && raw.backdrop ? {backdrop: raw.backdrop} : {})} as Shot);
      continue;
    }
    shots.push(raw);
  }
  // Every long pause in the act gets one card, placed in time order.
  for (let turn = range.from; turn <= range.to; turn++) {
    if (turns[turn]?.kind !== 'pause' || durations[turn] < rules.questionPauseSec || carded.has(turn)) continue;
    const question = questionBefore(turns, turn);
    if (!question) continue;
    const at = shots.findIndex(s => isObj(s) && isObj(s.at) && (s.at.turn as number) > turn);
    shots.splice(at < 0 ? shots.length : at, 0, {type: 'question', at: {turn}, question} as Shot);
    carded.add(turn);
    fixes.push(`turn ${turn}: added the missing question card for the ${durations[turn]}s pause`);
  }
  // Card text is always the verbatim question (the director may paraphrase).
  for (const s of shots) if (isObj(s) && s.type === 'question' && isObj(s.at)) {
    const q = questionBefore(turns, s.at.turn as number);
    if (q && (s as {question?: string}).question !== q) (s as {question: string}).question = q;
  }
  return {act: {...act, shots: shots as ActOutput['shots']}, fixes};
}

/** Lesson-wide budgets and zoom limits, applied to the acts in place of LLM repairs. */
export function fixPlanBudgets(acts: ActOutput[], outline: Outline, turns: PipelineTurn[], catalog: CatalogEntry[], assetsForAct: (catalog: CatalogEntry[], actText: string) => CatalogEntry[], rules: ShotRules = LOOK_RULES, placeIds: Set<string> = new Set()): {acts: ActOutput[]; fixes: string[]} {
  const fixes: string[] = [];
  const byPath = new Map(catalog.map(c => [c.path, c]));
  const uses = new Map<string, number>();
  const imageOf = (s: Record<string, unknown>): string | null => (typeof s.image === 'string' ? s.image : s.type === 'point' && typeof s.backdrop === 'string' ? s.backdrop : null);
  const clampFraming = (image: string, from: Framing, to: Framing): [Framing, Framing] => {
    const max = byPath.get(image)?.maxZoom ?? 3;
    const z = (v: number) => Math.min(max, Math.max(1, v));
    const f = {...from, zoom: z(from.zoom)};
    const t = {...to, zoom: z(to.zoom)};
    // Keep the camera moving after clamping: change zoom if there is room, otherwise pan.
    if (Math.abs(f.zoom - t.zoom) < 0.05 && Math.hypot(f.x - t.x, f.y - t.y) < 0.05) {
      if (max - 1 >= 0.08) { f.zoom = 1; t.zoom = Math.min(max, 1.12); } else { f.x = 0.45; t.x = 0.55; }
    }
    return [f, t];
  };
  const fresh = (image: string): [Framing, Framing] => clampFraming(image, {x: 0.5, y: 0.5, zoom: 1}, {x: 0.5, y: 0.45, zoom: 1.15});
  // Portraits are never swapped (the name tag belongs to the person), so their uses are reserved up front.
  const portraitsLeft = new Map<string, number>();
  for (const act of acts) for (const sh of act.shots as Shot[]) if (isObj(sh) && sh.type === 'portrait' && typeof sh.image === 'string') portraitsLeft.set(sh.image, (portraitsLeft.get(sh.image) ?? 0) + 1);
  const committed = (p: string) => (uses.get(p) ?? 0) + (portraitsLeft.get(p) ?? 0);
  let customs = 0;
  let clips = 0;
  const customSeen = new Set<string>();

  const out = acts.map((act, i) => {
    const {from, to} = outline.acts[i].turns;
    const actText = [outline.acts[i].title, outline.acts[i].purpose, ...turns.slice(from, to + 1).map(t => cleanSpeech(t.text ?? ''))].join(' ');
    let pool: CatalogEntry[] | null = null;
    /** The act's least-used relevant image with budget left (never the one being replaced). */
    const replacement = (not: string | null): string | null => {
      pool ??= assetsForAct(catalog, actText);
      const ranked = pool.map((c, n) => ({c, n})).filter(({c}) => c.path !== not && committed(c.path) < rules.maxImageUses)
        .sort((a, b) => committed(a.c.path) - committed(b.c.path) || a.n - b.n);
      return ranked[0]?.c.path ?? null;
    };
    const shots = (act.shots as Shot[]).flatMap((raw): Shot[] => {
      if (!isObj(raw)) return [raw];
      const s = {...raw} as Record<string, unknown>;
      if (s.type === 'custom') {
        const name = String(s.component);
        if (!customSeen.has(name) && customs < rules.maxCustoms) { customSeen.add(name); customs++; return [s as unknown as Shot]; }
        const image = replacement(null);
        fixes.push(`act ${i + 1}: custom explainer "${name}" ${customSeen.has(name) ? 'already used' : 'over the lesson budget'}; ${image ? `now an image shot on ${image}` : 'dropped (no image left)'}`);
        if (!image) return [];
        uses.set(image, (uses.get(image) ?? 0) + 1);
        const [f, t] = fresh(image);
        return [{type: 'image_move', at: s.at, image, from: f, to: t, ...(s.transition ? {transition: s.transition} : {})} as unknown as Shot];
      }
      if (s.type === 'clip') {
        clips++;
        // The fallback camera move on the still must respect the image's zoom limit too.
        if (typeof s.image === 'string' && (!isObj(s.from) || !isObj(s.to))) {
          const focus = Array.isArray(s.focus) ? s.focus as number[] : [0.5, 0.5];
          [s.from, s.to] = clampFraming(s.image, {x: focus[0], y: focus[1], zoom: 1}, {x: focus[0], y: focus[1], zoom: 1.08});
        }
        if (clips > rules.maxClips) {
          const focus = Array.isArray(s.focus) ? s.focus as number[] : [0.5, 0.5];
          s.type = 'image_move';
          s.from = s.from ?? {x: focus[0], y: focus[1], zoom: 1};
          s.to = s.to ?? {x: focus[0], y: focus[1], zoom: 1.12};
          delete s.prompt; delete s.seed; delete s.focus;
          fixes.push(`act ${i + 1}: LTX clip over the lesson budget became a camera move on its still`);
        }
      }
      if (s.type === 'portrait' && typeof s.image === 'string') portraitsLeft.set(s.image, (portraitsLeft.get(s.image) ?? 1) - 1);
      // Place ids written without their "place." prefix.
      for (const key of ['points', 'moves'] as const) {
        const list = s[key];
        if (Array.isArray(list)) for (const item of list) if (isObj(item)) for (const field of ['place', 'to'] as const) {
          const v = item[field];
          if (typeof v === 'string' && !placeIds.has(v) && placeIds.has(`place.${v}`)) { item[field] = `place.${v}`; fixes.push(`act ${i + 1}: place "${v}" -> "place.${v}"`); }
        }
      }
      const image = imageOf(s);
      if (image && s.type !== 'portrait' && committed(image) >= rules.maxImageUses) {
        const swap = replacement(image);
        if (swap) {
          fixes.push(`act ${i + 1}: "${image}" past its ${rules.maxImageUses}-use budget; swapped for "${swap}"`);
          if (s.type === 'point') s.backdrop = swap;
          else {
            s.image = swap;
            [s.from, s.to] = fresh(swap);
          }
        }
      }
      const used = imageOf(s);
      if (used) uses.set(used, (uses.get(used) ?? 0) + 1);
      if (typeof s.image === 'string' && isObj(s.from) && isObj(s.to)) {
        const before = JSON.stringify([s.from, s.to]);
        [s.from, s.to] = clampFraming(s.image, s.from as Framing, s.to as Framing);
        if (JSON.stringify([s.from, s.to]) !== before) fixes.push(`act ${i + 1}: framing on "${s.image}" kept within its max zoom`);
      }
      return [s as unknown as Shot];
    });
    return {...act, shots: shots as ActOutput['shots']};
  });
  return {acts: out, fixes};
}

/**
 * Drops shots the resolver reported as too short or out of order (by plan-wide shot number), never the first shot of
 * an act or a question card; the previous shot holds instead.
 */
export function dropShortShots(acts: ActOutput[], message: string): {acts: ActOutput[]; fixes: string[]} {
  const fixes: string[] = [];
  const short = new Set([
    ...[...message.matchAll(/shot0*(\d+): -?[\d.]+s is shorter than/g)].map(m => Number(m[1]) - 1),
    ...[...message.matchAll(/shot (\d+) starts at or before shot \d+/g)].map(m => Number(m[1]) - 1),
  ]);
  if (!short.size) return {acts, fixes};
  let g = 0;
  const out = acts.map((act, i) => {
    const kept = (act.shots as Shot[]).filter((s, n) => {
      const id = g++;
      const drop = short.has(id) && n > 0 && !(isObj(s) && s.type === 'question');
      if (drop) fixes.push(`act ${i + 1}: dropped shot index ${n} (cut too short or out of order); the previous shot holds`);
      return !drop;
    });
    return {...act, shots: kept as ActOutput['shots']};
  });
  return {acts: out, fixes};
}
