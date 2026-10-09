/**
 * Script linter: language, structure, facts, and TTS safety. Codes S0xx.
 * All rules are data (style-rules.json, fact-registry.json, pronunciations.json).
 */
import { parseScript, speechTurns } from './script';
import { sentences, tokens, wordCount } from './text';
import { termRegex, type Pronunciations } from './tts';
import type { Issue, ScriptTurn } from './types';

export interface StyleRules {
  speakers: string[];
  banned_phrases: { pattern: string; why: string }[];
  terminology: { pattern: string; prefer: string; level: 'error' | 'warn' | 'info' }[];
  limits: {
    maxTurnWords: number;
    targetWords: number;
    maxWords: number;
    speakerShareMin: number;
    maxConsecutiveSameSpeaker: number;
    shortSentenceWords: number;
    maxShortSentenceRatio: number;
    repeatedNgram: { n: number; maxRepeats: number };
    allowedPauses: number[];
    predictionBeats: number;
    selfTestPauses: number;
    minTraps: number;
    promptVerbs: string[];
  };
  trap: { correctionMarkers: string[] };
  emotionMarkers: { allowed: string[] };
  onscreen: { maxChars: Record<string, number>; emojiTones: string[]; maxConcurrentBeats: number };
}

type Scope = 'script' | 'onscreen';
interface ForbidRule { pattern: string; why: string; scope: Scope[] }
interface HedgeRule { trigger: string; words: string[]; window: number; scope: Scope[] }
export interface Fact {
  id: string;
  status: string;
  claim: string;
  sources: string[];
  forbid?: ForbidRule[];
  hedge?: HedgeRule;
  require?: { pattern: string; why: string; kinds?: ('episode' | 'practice')[] }[];
}
export interface FactRegistry { facts: Fact[] }

const rx = (p: string, flags = 'i') => new RegExp(p, flags);
const at = (t: ScriptTurn) => `${t.id} (line ${t.line})`;

/** Forbidden-claim check for one string; shared by script and on-screen linters. */
export function forbiddenClaims(text: string, facts: FactRegistry, scope: Scope): { id: string; why: string; match: string }[] {
  const out: { id: string; why: string; match: string }[] = [];
  for (const f of facts.facts) {
    for (const r of f.forbid ?? []) {
      if (!r.scope.includes(scope)) continue;
      const m = rx(r.pattern).exec(text);
      if (m) out.push({ id: f.id, why: r.why, match: m[0] });
    }
  }
  return out;
}

/** Hedge check: text matching a trigger must contain a hedge word (optionally in `context`). */
export function missingHedges(text: string, context: string, facts: FactRegistry, scope: Scope): { id: string; match: string; words: string[] }[] {
  const out: { id: string; match: string; words: string[] }[] = [];
  for (const f of facts.facts) {
    const h = f.hedge;
    if (!h || !h.scope.includes(scope)) continue;
    const m = rx(h.trigger).exec(text);
    if (!m) continue;
    const hay = `${context} ${text}`.toLowerCase();
    if (!h.words.some(w => hay.includes(w.toLowerCase()))) out.push({ id: f.id, match: m[0], words: h.words });
  }
  return out;
}

export function lintScript(src: string, style: StyleRules, facts: FactRegistry, pron: Pronunciations, strict: boolean): { issues: Issue[]; turns: ScriptTurn[] } {
  const parsed = parseScript(src, style.speakers);
  const issues: Issue[] = [...parsed.issues];
  const { turns, meta } = parsed;
  const speech = speechTurns(turns);
  const L = style.limits;
  const push = (level: Issue['level'], code: string, where: string, msg: string) => issues.push({ level, code, where, msg });

  /* per-turn language rules */
  for (const t of speech) {
    const isTrap = t.tags.includes('trap');
    for (const tag of t.tags) {
      if (tag !== 'trap') push('error', 'S019', at(t), `unknown production tag {${tag}}`);
    }
    if (t.emotion && !style.emotionMarkers.allowed.includes(t.emotion)) {
      push('error', 'S019', at(t), `emotion marker {${t.emotion}} not in allowed list`);
    }
    for (const b of style.banned_phrases) {
      const m = rx(b.pattern).exec(t.text);
      if (m) push('error', 'S005', at(t), `banned phrase "${m[0]}": ${b.why}`);
    }
    for (const term of style.terminology) {
      const m = rx(term.pattern).exec(t.text);
      if (m && term.level !== 'info') push(term.level, 'S020', at(t), `"${m[0]}" → prefer ${term.prefer}`);
    }
    if (!isTrap) {
      for (const f of forbiddenClaims(t.text, facts, 'script')) push('error', 'S006', at(t), `${f.id}: "${f.match}" (${f.why})`);
    }
    const prev = speech.filter(x => x.idx < t.idx);
    for (const f of facts.facts) {
      const h = f.hedge;
      if (!h || !h.scope.includes('script')) continue;
      const ctx = h.window ? prev.slice(-h.window).map(x => x.text).join(' ') : '';
      for (const miss of missingHedges(t.text, ctx, { facts: [f] }, 'script')) {
        push('error', 'S007', at(t), `${f.id}: "${miss.match}" needs a hedge (${h.words.slice(0, 4).join(' / ')}…) in this turn${h.window ? ` or the ${h.window} before` : ''}`);
      }
    }
    const wc = wordCount(t.text);
    if (wc > L.maxTurnWords) push('warn', 'S010', at(t), `${wc} words; TTS prosody degrades past ${L.maxTurnWords}. Split the turn.`);
    if (/\b\d{3,4}s\b/.test(t.text) && !pron.numbers.some(n => rx(n.pattern, '').test(t.text))) {
      push('error', 'S009', at(t), `"${/\b\d{3,4}s\b/.exec(t.text)![0]}" has no TTS number rule in pronunciations.json`);
    }
  }

  /* pronunciation coverage */
  const termList = pron.terms.map(x => x.term);
  const allText = speech.map(t => t.text).join('\n');
  const watched = new Set<string>();
  for (const w of allText.match(/[\p{L}'-]+/gu) ?? []) {
    if (/[^\x00-\x7F]/.test(w) || pron.watch.patterns.some(p => new RegExp(p, 'u').test(w))) watched.add(w.replace(/'s$/, ''));
  }
  for (const w of watched) {
    if (!termList.some(term => term === w || term.split(' ').includes(w))) {
      push(strict ? 'error' : 'warn', 'S008', 'script', `"${w}" needs a pronunciation entry in src/data/pronunciations.json`);
    }
  }
  for (const term of pron.terms) {
    if (!term.approved && termRegex(term.term).test(allText)) {
      push(strict ? 'error' : 'info', 'S021', 'pronunciations', `"${term.term}" (${term.guide}) not yet auditioned/approved`);
    }
  }

  const isEpisode = meta.kind === 'episode';

  /* structure: pauses, prediction beats, self-tests */
  const pauses = turns.filter(t => t.kind === 'pause');
  for (const p of pauses) {
    if (p.kind !== 'pause') continue;
    if (!L.allowedPauses.includes(p.pauseSec)) push('error', 'S003', at(p), `pause ${p.pauseSec}s not in ${L.allowedPauses.join('/')}`);
    const before = turns[p.idx - 1];
    const after = turns[p.idx + 1];
    const lastSentence = before?.kind === 'speech' ? sentences(before.text).pop() ?? '' : '';
    const isPrompt = /\?\s*$/.test(lastSentence) || L.promptVerbs.some(v => new RegExp(`^${v}\\b`, 'i').test(lastSentence));
    if (!isPrompt) push('error', 'S004', at(p), 'a pause must follow a question or a prompt verb (limits.promptVerbs)');
    if (!after || after.kind !== 'speech') push('error', 'S004', at(p), 'a pause must be followed by an answer turn');
  }
  const predictions = pauses.filter(p => p.kind === 'pause' && p.pauseSec === 10);
  const selfTests = pauses.filter(p => p.kind === 'pause' && p.pauseSec !== 10);
  if (isEpisode && predictions.length !== L.predictionBeats) push('error', 'S016', 'script', `${predictions.length} prediction beats (10s); expected ${L.predictionBeats}`);
  if (isEpisode && selfTests.length !== L.selfTestPauses) push('error', 'S016', 'script', `${selfTests.length} self-test pauses; expected ${L.selfTestPauses}`);
  for (const p of predictions) {
    const q = turns[p.idx - 1];
    if (q?.kind === 'speech' && !/^your turn\b/i.test(q.text)) push('warn', 'S016', at(q), 'prediction beats should open with "Your turn."');
  }

  /* traps: each {trap} is corrected by the other speaker's next turn */
  const traps = speech.filter(t => t.tags.includes('trap'));
  for (const t of traps) {
    const next = turns[t.idx + 1];
    const ok = next?.kind === 'speech' && next.speaker !== t.speaker && style.trap.correctionMarkers.some(m => next.text.toLowerCase().includes(m));
    if (!ok) push('error', 'S022', at(t), `{trap} must be corrected by the other speaker's next turn (markers: ${style.trap.correctionMarkers.join(', ')})`);
  }
  if (isEpisode && traps.length < L.minTraps) push('warn', 'S022', 'script', `${traps.length} {trap} lines; aim for ${L.minTraps} (one per box)`);

  /* boxes (frozen rule: exactly one mid-episode check, rest in the recap) */
  if (isEpisode && !meta.boxes.length) push('error', 'S015', 'script', 'episodes need # @boxes:');
  if (isEpisode && meta.boxes.length) {
    const mids = speech.filter(t => /^checking that one\b/i.test(t.text));
    if (mids.length !== 1) push('error', 'S015', 'script', `${mids.length} "Checking that one." lines; the guide allows exactly one`);
    if (meta.midcheck === null) push('error', 'S015', 'script', 'missing # @midcheck: N');
    const names = ['one', 'two', 'three', 'four', 'five', 'six'];
    const checked: number[] = [];
    for (const t of speech) {
      for (const m of t.text.matchAll(/\bbox (one|two|three|four|five|six), checked\b/gi)) checked.push(names.indexOf(m[1].toLowerCase()) + 1);
    }
    const expected = meta.boxes.map((_, i) => i + 1).filter(n => n !== meta.midcheck);
    if (checked.join(',') !== expected.join(',')) {
      push('error', 'S015', 'script', `recap checks boxes [${checked.join(', ')}]; expected [${expected.join(', ')}] in order`);
    }
    meta.boxes.forEach((b, i) => {
      const n = names[i];
      if (!new RegExp(`\\b(box ${n}|${n}:|${n},)`, 'i').test(allText)) push('warn', 'S015', 'script', `box ${i + 1} ("${b}") never named in dialogue`);
    });
  }

  /* closing hand-off: em dash must be followed by a hold */
  for (const t of speech) {
    if (/—\s*$/.test(t.text) && !t.holdAfterSec) push('error', 'S017', at(t), 'line ends with an em dash hand-off; add [hold N s] after it');
  }

  /* required claims */
  for (const f of facts.facts) {
    for (const r of f.require ?? []) {
      if (r.kinds && !r.kinds.includes(meta.kind)) continue;
      if (!rx(r.pattern).test(allText)) push('error', 'S023', 'script', `${f.id}: required mention missing: ${r.why}`);
    }
  }

  /* budget, balance, rhythm, repetition */
  const words = speech.reduce((n, t) => n + wordCount(t.text), 0);
  if (words > L.maxWords) push('error', 'S011', 'script', `${words} words (max ${L.maxWords}, target ${L.targetWords})`);
  else if (words > L.targetWords) push('warn', 'S011', 'script', `${words} words (target ${L.targetWords})`);

  const bySpeaker = new Map<string, number>();
  speech.forEach(t => bySpeaker.set(t.speaker, (bySpeaker.get(t.speaker) ?? 0) + wordCount(t.text)));
  for (const [s, n] of bySpeaker) {
    if (n / words < L.speakerShareMin) push('warn', 'S012', 'script', `${s} has ${Math.round((100 * n) / words)}% of words (min ${Math.round(100 * L.speakerShareMin)}%)`);
  }

  let run = 0;
  let last = '';
  for (const t of turns) {
    if (t.kind !== 'speech') {
      run = 0;
      last = '';
      continue;
    }
    run = t.speaker === last ? run + 1 : 1;
    last = t.speaker;
    if (run === L.maxConsecutiveSameSpeaker + 1) push('warn', 'S013', at(t), `${t.speaker} has ${run}+ turns in a row; the duo collapses into a monologue`);
  }

  const sents = speech.flatMap(t => sentences(t.text));
  const short = sents.filter(s => wordCount(s) <= L.shortSentenceWords).length;
  if (short / sents.length > L.maxShortSentenceRatio) {
    push('warn', 'S014', 'script', `${short}/${sents.length} sentences are ≤${L.shortSentenceWords} words (${Math.round((100 * short) / sents.length)}%); vary the rhythm`);
  }

  const { n, maxRepeats } = L.repeatedNgram;
  const grams = new Map<string, string[]>();
  for (const t of speech) {
    // Recap and quiz restate on purpose; count them once.
    const tk = tokens(t.text);
    const seen = new Set<string>();
    for (let i = 0; i + n <= tk.length; i++) {
      const g = tk.slice(i, i + n).join(' ');
      if (seen.has(g)) continue;
      seen.add(g);
      grams.set(g, [...(grams.get(g) ?? []), t.id]);
    }
  }
  for (const [g, where] of grams) {
    if (where.length > maxRepeats + 1) push('warn', 'S018', where.join(','), `"${g}" repeated ${where.length}×`);
  }

  return { issues, turns };
}
