/**
 * Derived overlays: things the pipeline generates from data that already exists, so
 * nobody authors (or forgets) them.
 *   traps     ← {trap} lines + short myth/fact text in the spec
 *   years     ← every year spoken in the script (timeline ribbon)
 *   terms     ← first spoken use of each glossary term (key-term chip)
 *   ranges    ← fact-registry `visual` entries (range bars)
 *   chapters  ← chapter anchors (banners, YouTube chapters, Shorts)
 *   sfx       ← stamps, box checks, trap reveals, banners, countdowns
 */
import { describeAnchor, findPhrase, resolveAnchor, wordOffset } from './anchors';
import { textRect, type RenderConfig } from './layout';
import { inflate } from './layout-engine';
import type { FactRegistry } from './lint-script';
import { norm, tokens } from './text';
import type {
  BoxEvent,
  ChapterSpec,
  Issue,
  RangeBeat,
  ResolvedBeat,
  ResolvedChapter,
  ResolvedPauseCard,
  ResolvedSection,
  ResolvedTrap,
  SfxCue,
  TermChip,
  TimelineTurn,
  TrapSpec,
  WordTimesFile,
  YearMark,
} from './types';

export interface TermsFile { terms: { term: string; match: string[]; definition: string; ced?: string }[] }

type Resolve = (where: string, a: Parameters<typeof resolveAnchor>[0]) => ReturnType<typeof resolveAnchor> | null;

/** Time of a phrase inside a turn (first occurrence), or null. */
function phraseTime(tt: TimelineTurn, phrase: string, wordTimes: WordTimesFile): number | null {
  if (tt.turn.kind !== 'speech') return null;
  const idx = findPhrase(tokens(tt.turn.text), tokens(phrase));
  if (idx < 0) return null;
  return tt.start + wordOffset(tt.turn.text, idx, wordTimes[tt.turn.id], tt.dur).offset;
}

export function deriveTraps(specs: TrapSpec[], timeline: TimelineTurn[], cfg: RenderConfig, resolve: Resolve, issues: Issue[]): ResolvedTrap[] {
  const out: ResolvedTrap[] = [];
  specs.forEach((t, i) => {
    const where = `trap[${i}]`;
    if (t.myth.length > 40) issues.push({ level: 'error', code: 'B007', where, msg: `myth is ${t.myth.length} chars (max 40)` });
    if (t.fact.length > 48) issues.push({ level: 'error', code: 'B007', where, msg: `fact is ${t.fact.length} chars (max 48)` });
    const r = resolve(where, t.at);
    if (!r) return;
    const turn = timeline[r.turnIdx].turn;
    if (turn.kind !== 'speech' || !turn.tags.includes('trap')) {
      issues.push({ level: 'error', code: 'E004', where, msg: `${describeAnchor(t.at)} is not a {trap} line` });
      return;
    }
    const corr = timeline[r.turnIdx + 1];
    if (!corr) return;
    out.push({
      spec: t,
      trapIdx: r.turnIdx,
      start: timeline[r.turnIdx].start,
      factStart: corr.start + cfg.overlayTiming.trapFactDelaySec,
      end: corr.visualEnd,
    });
  });
  for (const tt of timeline) {
    if (tt.turn.kind === 'speech' && tt.turn.tags.includes('trap') && !out.some(t => t.trapIdx === tt.turn.idx)) {
      issues.push({ level: 'error', code: 'E005', where: tt.turn.id, msg: '{trap} line has no trap card (add it to spec.traps with myth/fact)' });
    }
  }
  return out;
}

export function deriveYears(timeline: TimelineTurn[], wordTimes: WordTimesFile): YearMark[] {
  const marks: YearMark[] = [];
  for (const tt of timeline) {
    if (tt.turn.kind !== 'speech') continue;
    const toks = tokens(tt.turn.text);
    toks.forEach((tok, i) => {
      const m = /^(1[4-9]\d\d)(s?)$/.exec(tok);
      if (!m) return;
      const { offset } = wordOffset(tt.turn.kind === 'speech' ? tt.turn.text : '', i, wordTimes[tt.turn.id], tt.dur);
      marks.push({ year: Number(m[1]), label: `${m[1]}${m[2]}`, time: tt.start + offset, turnIdx: tt.turn.idx });
    });
  }
  return marks.sort((a, b) => a.time - b.time);
}

export function deriveChapters(specs: ChapterSpec[], cfg: RenderConfig, totalSec: number, resolve: Resolve): ResolvedChapter[] {
  const resolved = specs
    .map((c, i) => {
      const r = resolve(`chapter[${i}]`, c.at);
      return r ? { spec: c, start: r.time } : null;
    })
    .filter((c): c is { spec: ChapterSpec; start: number } => c !== null)
    .sort((a, b) => a.start - b.start);
  return resolved.map((c, i) => ({
    ...c,
    end: resolved[i + 1]?.start ?? totalSec,
    bannerEnd: c.spec.box ? c.start + cfg.overlayTiming.chapterBannerSec : c.start,
  }));
}

/**
 * First spoken use of each glossary term. Self-correcting: a chip that would collide with
 * a chapter banner or another chip in the top band is delayed until the band is free
 * (L004); if that pushes it more than 3s past its turn, it is dropped (L005).
 */
export function deriveTerms(terms: TermsFile | undefined, timeline: TimelineTurn[], chapters: ResolvedChapter[], cfg: RenderConfig, wordTimes: WordTimesFile, issues: Issue[]): TermChip[] {
  if (!terms) return [];
  const busy: { start: number; end: number; id: string }[] = chapters.filter(c => c.spec.box).map(c => ({ start: c.start, end: c.bannerEnd, id: `chapter "${c.spec.label}"` }));
  const chips: TermChip[] = [];
  const firsts = terms.terms
    .map(t => {
      for (const tt of timeline) {
        for (const m of t.match) {
          const time = phraseTime(tt, m, wordTimes);
          if (time !== null) return { t, tt, time };
        }
      }
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.time - b.time);
  for (const { t, tt, time } of firsts) {
    let start = time;
    const len = cfg.overlayTiming.termChipSec;
    for (let guard = 0; guard < 10; guard++) {
      const hit = busy.find(b => start < b.end && b.start < start + len);
      if (!hit) break;
      issues.push({ level: 'info', code: 'L004', where: `term:${t.term}`, msg: `delayed ${(hit.end + 0.2 - start).toFixed(1)}s to clear ${hit.id}` });
      start = hit.end + 0.2;
    }
    if (start > tt.visualEnd + 3) {
      issues.push({ level: 'warn', code: 'L005', where: `term:${t.term}`, msg: 'dropped: top band busy for too long after the term is spoken' });
      continue;
    }
    const chip = { term: t.term, definition: t.definition, start, end: start + len, turnIdx: tt.turn.idx };
    busy.push({ start: chip.start, end: chip.end, id: `term "${t.term}"` });
    chips.push(chip);
  }
  return chips;
}

/** Range bars from fact-registry `visual` entries, placed where the trigger phrase is spoken. */
export function deriveRangeBeats(facts: FactRegistry | undefined, timeline: TimelineTurn[], wordTimes: WordTimesFile, issues: Issue[]): ResolvedBeat[] {
  const out: ResolvedBeat[] = [];
  for (const f of facts?.facts ?? []) {
    const v = (f as { visual?: { kind: 'range'; trigger: string; low: number; high: number; unit: string; label: string; caption: string } }).visual;
    if (!v) continue;
    const tt = timeline.find(x => x.turn.kind === 'speech' && ` ${norm(x.turn.text)} `.includes(` ${norm(v.trigger)} `));
    if (!tt) {
      issues.push({ level: 'info', code: 'E006', where: f.id, msg: `visual trigger "${v.trigger}" not spoken in this episode` });
      continue;
    }
    const time = phraseTime(tt, v.trigger, wordTimes) ?? tt.start;
    const beat: RangeBeat & { start: number; end: number; turnIdx: number; method: 'estimated' } = {
      id: `auto-range-${f.id}`,
      kind: 'range',
      at: { turn: tt.turn.kind === 'speech' ? tt.turn.text.slice(0, 30) : '', word: v.trigger },
      low: v.low,
      high: v.high,
      unit: v.unit,
      label: v.label,
      caption: v.caption,
      start: time,
      end: tt.visualEnd,
      turnIdx: tt.turn.idx,
      method: 'estimated',
    };
    out.push(beat);
  }
  return out;
}

export function deriveSfx(
  beats: ResolvedBeat[],
  sections: ResolvedSection[],
  boxEvents: BoxEvent[],
  traps: ResolvedTrap[],
  chapters: ResolvedChapter[],
  pauseCards: ResolvedPauseCard[],
  cfg: RenderConfig,
): SfxCue[] {
  const cues: SfxCue[] = [];
  const toneAt = (t: number) => sections.find(s => t >= s.start && t < s.end)?.tone ?? 'playful';
  for (const b of beats) {
    if (b.kind === 'text' && b.entrance === 'stamp' && cfg.sfx.stampTones.includes(toneAt(b.start))) cues.push({ name: 'hit', time: b.start, source: b.id });
    if (b.kind === 'stack') {
      for (const it of b.items) {
        const t = b.start + it.offset;
        if (it.entrance === 'stamp' && cfg.sfx.stampTones.includes(toneAt(t))) cues.push({ name: 'hit', time: t, source: it.sourceId });
      }
    }
  }
  for (const e of boxEvents) cues.push({ name: 'check', time: e.time, source: `box${e.box}` });
  for (const t of traps) if (cfg.sfx.stampTones.includes(toneAt(t.factStart))) cues.push({ name: 'whoosh', time: t.factStart, source: 'trap' });
  for (const c of chapters) if (c.spec.box) cues.push({ name: 'whoosh', time: c.start, source: `chapter:${c.spec.label}` });
  for (const s of sections.slice(1)) if (!cues.some(c => c.name === 'whoosh' && Math.abs(c.time - s.start) < 1.5)) cues.push({ name: 'whoosh', time: s.start, source: `tone:${s.tone}` });
  for (const p of pauseCards) {
    for (let s = Math.ceil(p.start + 1); s < p.end - 0.5; s++) cues.push({ name: 'tick', time: s, source: `pause@${p.pauseIdx}` });
  }
  return cues.sort((a, b) => a.time - b.time);
}

/**
 * Seconds (relative to the beat) at which each part of an "A → B → C" chain lights up:
 * the moment the part's first word is spoken after the beat starts; otherwise spaced
 * evenly. Always increasing, and all parts lit with ≥0.8s to spare (self-correcting).
 */
export function chainPartOffsets(beat: ResolvedBeat, timeline: TimelineTurn[], wordTimes: WordTimesFile): number[] {
  if (beat.kind !== 'text') return [];
  const parts = beat.text.split('→').map(p => p.trim());
  const tt = timeline[beat.turnIdx];
  const visible = beat.end - beat.start;
  const toks = tt.turn.kind === 'speech' ? tokens(tt.turn.text) : [];
  const out: number[] = [];
  parts.forEach((p, i) => {
    const first = tokens(p).find(t => toks.includes(t) && t.length > 2);
    let at: number | null = null;
    if (first && tt.turn.kind === 'speech') {
      const beatOffset = beat.start - tt.start;
      for (let k = 0; k < toks.length; k++) {
        if (toks[k] !== first) continue;
        const off = wordOffset(tt.turn.text, k, wordTimes[tt.turn.id], tt.dur).offset;
        if (off >= beatOffset - 0.05) {
          at = Math.max(0, off - beatOffset);
          break;
        }
      }
    }
    out.push(at ?? i * 0.6);
  });
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + 0.3);
  const latest = Math.max(0, visible - 0.8);
  return out.map((v, i) => Math.min(v, latest - (out.length - 1 - i) * 0.3));
}

/**
 * Text → stack cards. Every text beat is rendered on a backing card (legible on any
 * background); text beats that share a turn and overlap in time become ONE card whose
 * lines appear as they are spoken (L006). Runs after the layout engine, so each line keeps
 * its verified position; the card is the union of the lines, padded only where the padding
 * doesn't touch another element (self-correcting).
 */
export function groupStacks(beats: ResolvedBeat[], boxes: import('./layout-engine').TimedBox[], cfg: RenderConfig, issues: Issue[], timeline: TimelineTurn[], wordTimes: WordTimesFile): ResolvedBeat[] {
  const isText = (b: ResolvedBeat): b is Extract<ResolvedBeat, { kind: 'text' }> => b.kind === 'text';
  const out: ResolvedBeat[] = [];
  const used = new Set<string>();
  const texts = beats.filter(isText).sort((a, b) => a.start - b.start);
  for (const first of texts) {
    if (used.has(first.id)) continue;
    const group = [first];
    let end = first.end;
    for (const b of texts) {
      if (used.has(b.id) || b === first || b.turnIdx !== first.turnIdx) continue;
      if (b.start < end) {
        group.push(b);
        end = Math.max(end, b.end);
      }
    }
    group.forEach(g => used.add(g.id));
    const start = first.start;
    const PAD = 0.014;
    const lineRect = (g: (typeof group)[number]): [number, number, number, number] => {
      const r = textRect(g.text, g.level, g.position, cfg);
      const tight = (g.entrance === 'stamp' ? inflate(r, cfg.text.stampOvershoot) : r) as [number, number, number, number];
      const padded: [number, number, number, number] = [tight[0] - PAD, tight[1] - PAD, tight[2] + PAD, tight[3] + PAD];
      // pad only if, during THIS line's window, the padding touches nothing and stays in the safe area
      const others = boxes.filter(x => !group.some(o => x.id === `beat:${o.id}`) && x.start < g.end && g.start < x.end);
      const clear = !others.some(o => o.rect[0] < padded[2] && padded[0] < o.rect[2] && o.rect[1] < padded[3] && padded[1] < o.rect[3]) &&
        padded[0] >= cfg.safe[0] && padded[1] >= cfg.safe[1] && padded[2] <= cfg.safe[2] && padded[3] <= cfg.safe[3];
      return clear ? padded : tight;
    };
    const items = group.map(g => ({
      text: g.text, offset: g.start - start, endOffset: g.end - start, y: g.position[1], x: g.position[0], level: g.level, color: g.color,
      chain: g.text.includes('→'), allowWrap: g.allowWrap, entrance: g.entrance, sourceId: g.id, rect: lineRect(g),
      wordOffsets: wordRevealOffsets(g.text, g.turnIdx, g.start, g.end, timeline, wordTimes),
    }));
    const union: [number, number, number, number] = [
      Math.min(...items.map(i => i.rect[0])), Math.min(...items.map(i => i.rect[1])), Math.max(...items.map(i => i.rect[2])), Math.max(...items.map(i => i.rect[3])),
    ];
    if (group.length > 1) issues.push({ level: 'info', code: 'L006', where: `beat:${first.id}`, msg: `grouped ${group.length} lines into a stack card (${group.map(g => g.id).join(', ')})` });
    out.push({
      id: group.length > 1 ? `stack:${first.id}` : first.id,
      kind: 'stack',
      at: first.at,
      start,
      end,
      turnIdx: first.turnIdx,
      method: first.method,
      rect: union,
      items,
    } as ResolvedBeat);
  }
  return [...beats.filter(b => !isText(b)), ...out].sort((a, b) => a.start - b.start);
}

/**
 * When each word of an on-screen line should appear (seconds after the line starts): the
 * moment that word is spoken in its turn, if it is; otherwise a short stagger after the
 * previous word. Always increasing and fully revealed with ≥0.8s of the line left.
 */
export function wordRevealOffsets(text: string, turnIdx: number, startAbs: number, endAbs: number, timeline: TimelineTurn[], wordTimes: WordTimesFile): number[] {
  const words = text.split(/\s+/).filter(Boolean);
  const tt = timeline[turnIdx];
  const toks = tt.turn.kind === 'speech' ? tokens(tt.turn.text) : [];
  const lineOffset = startAbs - tt.start;
  const used = new Set<number>();
  const out: number[] = [];
  words.forEach((w, i) => {
    const tk = tokens(w)[0];
    let at: number | null = null;
    if (tk && tk.length > 1 && tt.turn.kind === 'speech') {
      for (let k = 0; k < toks.length; k++) {
        if (used.has(k) || toks[k] !== tk) continue;
        const off = wordOffset(tt.turn.text, k, wordTimes[tt.turn.id], tt.dur).offset;
        if (off >= lineOffset - 0.05) {
          at = off - lineOffset;
          used.add(k);
          break;
        }
      }
    }
    out.push(Math.max(0, at ?? (i === 0 ? 0 : out[i - 1] + 0.09)));
  });
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + 0.06);
  // never let a line spend more than ~1.4s building, and finish with time to read
  const budget = Math.max(0.2, Math.min(1.4, endAbs - startAbs - 0.8));
  const last = out[out.length - 1] ?? 0;
  return last > budget ? out.map(v => (v / last) * budget) : out;
}

/** Transition points: every tone change and every box chapter (deduped within 1.5s). */
export function deriveTransitions(sections: ResolvedSection[], chapters: ResolvedChapter[], titleStart: number): number[] {
  const pts = [...sections.slice(1).map(s => s.start), ...chapters.filter(c => c.spec.box).map(c => c.start)].filter(t => Math.abs(t - titleStart) > 1).sort((a, b) => a - b);
  return pts.filter((t, i) => i === 0 || t - pts[i - 1] > 1.5);
}

/** When each box is first named in the dialogue (the episode sheet builds itself row by row). */
export function deriveBoxIntro(boxes: string[], timeline: TimelineTurn[], wordTimes: WordTimesFile): (number | null)[] {
  return boxes.map(label => {
    for (const tt of timeline) {
      const time = phraseTime(tt, label, wordTimes);
      if (time !== null) return time;
    }
    return null;
  });
}
