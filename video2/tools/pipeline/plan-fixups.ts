/**
 * Deterministic fix-ups used by the scene builder: bookkeeping the code does exactly instead of asking an LLM.
 *
 *  per act (before validation)
 *   - question cards: a shot anchored on a pause becomes that pause's question card; every 5s+ pause gets exactly one
 *     card; the card's text is copied verbatim from the line before the pause; nested cues on a pause become offsets
 *  after the build
 *   - cuts the checks report as too short or out of order are dropped (the previous shot holds)
 * Every change is listed in the director log as "auto-fix".
 */
import type {PipelineTurn} from '../pipeline-core';
import {cleanSpeech} from './speech';
import {LOOK_RULES, type PlanShot, type ShotRules} from './shots';
import type {ViewMapShot} from './map-views';
import type {ActOutput} from './doc-director';

type Shot = PlanShot | ViewMapShot;
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
