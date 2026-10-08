/**
 * defineEpisode / compileEpisode: the single path from (spec + generated data) to
 * a fully resolved episode. The shell renders the compiled result and the
 * validator inspects it, so they can't disagree.
 */
import { AnchorError, describeAnchor, findPhrase, resolveAnchor, wordOffset } from './anchors';
import { deriveBoxIntro, deriveChapters, deriveRangeBeats, deriveSfx, deriveTerms, deriveTransitions, deriveTraps, deriveYears, groupStacks, type TermsFile } from './derive';
import type { RenderConfig } from './layout';
import { resolveLayout, type OverlayWindow } from './layout-engine';
import type { FactRegistry } from './lint-script';
import { buildTimeline } from './timeline';
import { tokens } from './text';
import type {
  BgSegment,
  BoxEvent,
  CompiledEpisode,
  EpisodeSpec,
  Issue,
  ResolvedBeat,
  ResolvedPauseCard,
  ResolvedSection,
  TimelineTurn,
  TimingFile,
  TurnsFile,
  Until,
  WordTimesFile,
} from './types';

/** Identity helper that pins the spec's type (and gives editors completion). */
export const defineEpisode = <T extends EpisodeSpec>(spec: T): T => spec;

export const until = {
  turnEnd: (): Until => ({ kind: 'turn-end' }),
  turns: (count: number): Until => ({ kind: 'turns', count }),
  at: (turn: string, word?: string): Until => ({ kind: 'anchor', at: { turn, word } }),
};

const NUM_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

export interface EpisodeData {
  turns: TurnsFile;
  timing: Pick<TimingFile, 'starts' | 'durations' | 'totalSec'>;
  wordTimes: WordTimesFile;
  config: RenderConfig;
  terms?: TermsFile;
  facts?: FactRegistry;
}

export function compileEpisode(spec: EpisodeSpec, data: EpisodeData): CompiledEpisode {
  const issues: Issue[] = [];
  const { turns, meta } = data.turns;
  const timeline = buildTimeline(turns, data.timing);
  const totalSec = data.timing.totalSec;

  const tryResolve = (where: string, a: Parameters<typeof resolveAnchor>[0]) => {
    try {
      return resolveAnchor(a, turns, timeline, data.wordTimes);
    } catch (e) {
      if (e instanceof AnchorError) {
        issues.push({ level: 'error', code: e.code, where, msg: `${describeAnchor(a)}: ${e.message}` });
        return null;
      }
      throw e;
    }
  };

  /* sections */
  const sectionStarts = spec.sections
    .map((s, i) => {
      const r = tryResolve(`section[${i}]`, s.from);
      return r ? { ...s, start: timeline[r.turnIdx].start, turnIdx: r.turnIdx } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => a.start - b.start);
  if (sectionStarts.length && sectionStarts[0].turnIdx !== 0) {
    issues.push({ level: 'error', code: 'E001', where: 'sections', msg: 'first section must start at the first turn' });
  }
  const sections: ResolvedSection[] = sectionStarts.map((s, i) => ({
    tone: s.tone,
    bg: s.bg,
    turnIdx: s.turnIdx,
    start: i === 0 ? 0 : s.start,
    end: sectionStarts[i + 1]?.start ?? totalSec,
  }));

  /* beats */
  const endOf = (where: string, u: Until | undefined, turnIdx: number, start: number): number => {
    if (!u || u.kind === 'turn-end') return timeline[turnIdx].visualEnd;
    if (u.kind === 'turns') return timeline[Math.min(timeline.length - 1, turnIdx + u.count - 1)].visualEnd;
    const r = tryResolve(`${where}.until`, u.at);
    if (!r) return timeline[turnIdx].visualEnd;
    if (r.time <= start) {
      issues.push({ level: 'error', code: 'B002', where, msg: `until ${describeAnchor(u.at)} is before the beat starts` });
    }
    return r.time;
  };

  const ids = new Set<string>();
  const beats: ResolvedBeat[] = [];
  for (const b of spec.beats) {
    const where = `beat:${b.id}`;
    if (ids.has(b.id)) issues.push({ level: 'error', code: 'E002', where, msg: 'duplicate beat id' });
    ids.add(b.id);
    const r = tryResolve(where, b.at);
    if (!r) continue;
    const end = b.kind === 'bg' && !b.until ? Number.NaN : endOf(where, b.until, r.turnIdx, r.time);
    const resolved: ResolvedBeat = { ...b, start: r.time, end, turnIdx: r.turnIdx, method: r.method };
    if (b.kind === 'board') {
      resolved.itemOffsets = b.items.map((it, i) => {
        const ri = tryResolve(`${where}.items[${i}]`, it.at);
        if (ri && (ri.time < r.time || ri.time >= end)) issues.push({ level: 'error', code: 'B002', where, msg: `item ${i} lands outside the board's window` });
        return ri ? Math.max(0, ri.time - r.time) : 0;
      });
      if (b.footer) resolved.footerOffset = Math.max(0, (tryResolve(`${where}.footer`, b.footer.at)?.time ?? r.time) - r.time);
    }
    if (b.kind === 'tour') {
      resolved.itemOffsets = b.stops.map((st, i) => {
        const ri = tryResolve(`${where}.stops[${i}]`, st.at);
        if (ri && (ri.time < r.time - 0.01 || ri.time >= end)) issues.push({ level: 'error', code: 'B002', where, msg: `stop ${i} lands outside the tour's window` });
        return ri ? Math.max(0, ri.time - r.time) : i * 2;
      });
      for (let i = 1; i < resolved.itemOffsets.length; i++) {
        if (resolved.itemOffsets[i] - resolved.itemOffsets[i - 1] < 1.2) issues.push({ level: 'warn', code: 'B014', where, msg: `stops ${i - 1}→${i} are ${(resolved.itemOffsets[i] - resolved.itemOffsets[i - 1]).toFixed(1)}s apart; the camera needs ≥1.2s to settle` });
      }
    }
    beats.push(resolved);
  }
  beats.push(...deriveRangeBeats(data.facts, timeline, data.wordTimes, issues));
  beats.sort((a, b) => a.start - b.start);

  /* backgrounds: section default, overridden by bg beats until the next bg beat or section end */
  const backgrounds: BgSegment[] = [];
  for (const s of sections) {
    const events = beats.filter(b => b.kind === 'bg' && b.start >= s.start && b.start < s.end);
    let cursor = s.start;
    events.forEach((ev, i) => {
      if (ev.kind !== 'bg') return;
      if (ev.start > cursor) backgrounds.push({ image: s.bg, start: cursor, end: ev.start, tone: s.tone, sourceId: `section:${s.turnIdx}` });
      const nextStart = events[i + 1]?.start ?? s.end;
      const end = Number.isNaN(ev.end) ? nextStart : Math.min(ev.end, nextStart);
      ev.end = end;
      backgrounds.push({ image: ev.image, start: ev.start, end, tone: s.tone, sourceId: ev.id, ...(ev.focus ? { focus: ev.focus } : {}) });
      cursor = end;
    });
    if (cursor < s.end) backgrounds.push({ image: s.bg, start: cursor, end: s.end, tone: s.tone, sourceId: `section:${s.turnIdx}` });
  }
  for (const b of beats) {
    if (b.kind === 'bg' && Number.isNaN(b.end)) {
      issues.push({ level: 'error', code: 'E003', where: `beat:${b.id}`, msg: 'bg beat falls outside every section' });
      b.end = b.start;
    }
  }

  /* pause cards */
  const pauseCards: ResolvedPauseCard[] = [];
  spec.pauseCards.forEach((c, i) => {
    const where = `pauseCard[${i}]`;
    const r = tryResolve(where, c.after);
    if (!r) return;
    const p = timeline[r.turnIdx + 1];
    const answer = timeline[r.turnIdx + 2];
    if (!p || p.turn.kind !== 'pause') {
      issues.push({ level: 'error', code: 'P003', where, msg: `turn after ${describeAnchor(c.after)} is not a pause` });
      return;
    }
    pauseCards.push({
      spec: c,
      pauseIdx: p.turn.idx,
      start: p.start,
      end: p.visualEnd,
      revealStart: answer ? answer.start : p.visualEnd,
      revealEnd: answer ? answer.visualEnd : p.visualEnd,
    });
  });
  for (const tt of timeline) {
    if (tt.turn.kind !== 'pause') continue;
    const n = pauseCards.filter(c => c.pauseIdx === tt.turn.idx).length;
    if (n !== 1) {
      issues.push({ level: 'error', code: 'P001', where: tt.turn.id, msg: `pause turn has ${n} prompt cards (need exactly 1)` });
    }
  }

  const boxEvents = deriveBoxEvents(timeline, meta.midcheck, data.wordTimes);
  const titleStart = tryResolve('title', spec.title.at)?.time ?? 0;
  const cfg = data.config;

  /* derived overlays */
  const traps = deriveTraps(spec.traps, timeline, cfg, tryResolve, issues);
  const chapters = deriveChapters(spec.chapters, cfg, totalSec, tryResolve);
  const terms = deriveTerms(data.terms, timeline, chapters, cfg, data.wordTimes, issues);
  const years = deriveYears(timeline, data.wordTimes);

  /* self-correcting layout over every timed element */
  const overlays: OverlayWindow[] = [
    ...pauseCards.map(c => ({ id: `pause card ${timeline[c.pauseIdx].turn.id}`, rect: cfg.stage, start: c.start, end: c.end, exclusive: true })),
    ...pauseCards.map(c => ({ id: `answer reveal ${timeline[c.pauseIdx].turn.id}`, rect: cfg.reveal.rect, start: c.revealStart, end: c.revealEnd })),
    ...traps.map(t => ({ id: `trap card ${timeline[t.trapIdx].turn.id}`, rect: cfg.trapCard.rect, start: t.start, end: t.end })),
    ...terms.map(t => ({ id: `term chip "${t.term}"`, rect: cfg.topBand.rect, start: t.start, end: t.end })),
    ...chapters.filter(c => c.spec.box).map(c => ({ id: `chapter banner "${c.spec.label}"`, rect: cfg.topBand.rect, start: c.start, end: c.bannerEnd })),
  ];
  const layout = resolveLayout(beats, overlays, cfg, totalSec);
  issues.push(...layout.issues);
  const placedBeats = groupStacks(layout.beats, layout.boxes, cfg, issues, timeline, data.wordTimes);
  const boxIntro = deriveBoxIntro(meta.boxes, timeline, data.wordTimes);
  meta.boxes.forEach((b, i) => {
    if (boxIntro[i] === null) issues.push({ level: 'warn', code: 'E009', where: `box ${i + 1}`, msg: `"${b}" is never said in the dialogue, so its row never appears on the episode sheet` });
  });
  const sfx = deriveSfx(placedBeats, sections, boxEvents, traps, chapters, pauseCards, cfg);
  for (const t of boxIntro) if (t !== null) sfx.push({ name: 'tick', time: t, source: 'sheet-row' });
  sfx.sort((a, b) => a.time - b.time);

  return {
    spec, meta, timeline, beats: placedBeats, sections, pauseCards, backgrounds, boxEvents,
    traps, years, terms, chapters, sfx, boxIntro, transitions: deriveTransitions(sections, chapters, titleStart), boxes: layout.boxes, titleStart, totalSec, issues,
  };
}

/** Box check-offs come from the script text itself; nothing to keep in sync. */
export function deriveBoxEvents(timeline: TimelineTurn[], midcheck: number | null, wordTimes: WordTimesFile): BoxEvent[] {
  const events: BoxEvent[] = [];
  for (const tt of timeline) {
    if (tt.turn.kind !== 'speech') continue;
    const text = tt.turn.text;
    const toks = tokens(text);
    for (const m of text.matchAll(/\bbox (one|two|three|four|five|six|\d), checked\b/gi)) {
      const word = m[1].toLowerCase();
      const box = NUM_WORDS[word] ?? Number(word);
      const idx = findPhrase(toks, ['box', ...tokens(word), 'checked']);
      const { offset } = wordOffset(text, idx + 2, wordTimes[tt.turn.id], tt.dur);
      events.push({ box, time: tt.start + offset, turnIdx: tt.turn.idx, mid: false });
    }
    if (/^checking that one\b/i.test(text) && midcheck) {
      events.push({ box: midcheck, time: tt.start, turnIdx: tt.turn.idx, mid: true });
    }
  }
  return events.sort((a, b) => a.time - b.time);
}

/** Render-time guard: refuse to render an episode with errors. */
export function assertRenderable(ep: CompiledEpisode): CompiledEpisode {
  const errors = ep.issues.filter(i => i.level === 'error');
  if (errors.length) {
    throw new Error(
      `${ep.spec.id}: ${errors.length} error(s); run npm run validate\n` +
        errors.slice(0, 10).map(e => `  ${e.code} ${e.where}: ${e.msg}`).join('\n'),
    );
  }
  return ep;
}
