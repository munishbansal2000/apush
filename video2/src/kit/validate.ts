/**
 * Episode validator. Pure: all IO (ffprobe, fs) is injected by tools/validate-episode.ts.
 *
 * Code families:
 *   S0xx script language/structure/facts (lint-script.ts)
 *   T0xx turns/timing/audio sync        A0xx anchors
 *   B0xx beats/layout/on-screen text     P0xx pause cards
 *   C0xx visual coverage                 I0xx images/manifest
 *   H0xx heads                           E0xx episode spec
 */
import { compileEpisode } from './episode';
import { textLines, type RenderConfig } from './layout';
import { forbiddenClaims, lintScript, missingHedges, type FactRegistry, type StyleRules } from './lint-script';
import { parseScript } from './script';
import { hasEmoji, hash } from './text';
import { toTtsText, type Pronunciations } from './tts';
import type { CompiledEpisode, EpisodeSpec, Issue, ResolvedBeat, TimingFile, TurnsFile, WordTimesFile } from './types';

export interface FocusRegion { id: string; rect: [number, number, number, number]; label?: string; verified?: boolean }
export interface ManifestEntry { description: string; license: string; source_url: string; used_in: string[]; credit?: string; focus?: FocusRegion[] }
export type Manifest = Record<string, ManifestEntry>;

export interface ValidateInput {
  spec: EpisodeSpec;
  scriptSrc: string;
  turns: TurnsFile;
  timing: TimingFile;
  wordTimes: WordTimesFile;
  manifest: Manifest;
  config: RenderConfig;
  style: StyleRules;
  facts: FactRegistry;
  pron: Pronunciations;
  strict: boolean;
  /** Measured audio durations by turn id (from ffprobe); missing key = file missing. */
  audioDurations?: Record<string, number>;
  /** Does a file exist under public/? */
  publicFileExists?: (relPath: string) => boolean;
  /** All image files under public/historic (for orphan detection). */
  publicImages?: string[];
  terms?: import('./derive').TermsFile;
  /** data/images.lock.json written by tools/fetch-images.ts */
  imageLock?: Record<string, { source_url: string; sha256: string }>;
  publicFileSha?: (relPath: string) => string | null;
  places?: Record<string, [number, number]>;
}

export interface ValidateResult {
  issues: Issue[];
  compiled: CompiledEpisode | null;
  stats: Record<string, string | number>;
}

const onscreenText = (b: ResolvedBeat): string[] => {
  switch (b.kind) {
    case 'text':
    case 'bubble':
      return [b.text];
    case 'map':
      return [b.caption];
    case 'route':
      return [b.caption, ...b.routes.map(r => r.label ?? r.to)];
    case 'board':
      return [...b.items.map(i => i.text), ...(b.footer ? [b.footer.text] : [])];
    case 'tour':
      return [...(b.caption ? [b.caption] : []), ...b.stops.flatMap(st => (st.callouts ?? []).map(c => c.label))];
    case 'document':
      return [b.title, b.attribution, b.excerpt, ...(b.hipp ? [b.hipp.text] : [])];
    case 'figure':
      return [b.name, b.dates, b.role, ...(b.note ? [b.note] : [])];
    case 'question':
      return [b.format, b.stem, ...(b.source ? [b.source.title, b.source.text] : [])];
    case 'stack':
      return b.items.map(i => i.text);
    case 'range':
      return [b.label, b.caption];
    case 'source':
      return [b.documentTitle, b.attribution, b.excerpt, b.hippExplanation];
    case 'versus':
      return [b.clashTitle, b.periodLabel, b.entityA.subtitle, b.entityB.subtitle, ...b.entityA.points, ...b.entityB.points, b.verdictSummary];
    case 'pictogram':
      return [b.label, b.caption];
    case 'ledger':
      return [...b.west, ...b.east];
    case 'bg':
      return [];
    default: {
      const _exhaustive: never = b;
      return _exhaustive;
    }
  }
};

/** Expected manifest used_in entries for this episode, derived from the compiled beats. */
export function expectedUsedIn(ep: CompiledEpisode): Map<string, Set<string>> {
  const key = ep.spec.manifestKey;
  const out = new Map<string, Set<string>>();
  const add = (img: string, id: string) => out.set(img, (out.get(img) ?? new Set()).add(`${key}:${id}`));
  ep.sections.forEach((s, i) => add(s.bg, `section${i}`));
  for (const b of ep.beats) {
    if (b.kind === 'bg') add(b.image, b.id);
    if (b.kind === 'map') add(b.mapImage, b.id);
    if ((b.kind === 'tour' || b.kind === 'document' || b.kind === 'figure') && b.image) add(b.image, b.id);
  }
  return out;
}

export function validateEpisode(input: ValidateInput): ValidateResult {
  const { spec, config: cfg, style, facts, pron, strict } = input;
  const issues: Issue[] = [];
  const push = (level: Issue['level'], code: string, where: string, msg: string) => issues.push({ level, code, where, msg });

  /* ---------------- manifest shape (report, never crash) ---------------- */
  const manifest: Manifest = {};
  for (const [key, entry] of Object.entries(input.manifest as Record<string, unknown>)) {
    const e = entry as Partial<ManifestEntry> | null;
    const ok = e && typeof e === 'object' && Array.isArray(e.used_in) && typeof e.license === 'string' && typeof e.source_url === 'string';
    if (!ok) {
      push('error', 'I012', `images.json["${key}"]`, 'malformed entry (needs description, license, source_url, used_in[]); put notes in docs, not in the manifest');
      continue;
    }
    manifest[key] = e as ManifestEntry;
  }
  input = { ...input, manifest };

  /* ---------------- render config self-check ---------------- */
  {
    const chrome: [string, [number, number, number, number]][] = [
      ['head', cfg.head.rect], ['boxTracker', cfg.boxTracker.rect], ['ribbon', cfg.ribbon.rect], ['captions', cfg.captions.rect],
      ['credit', cfg.credit.rect], ['topBand', cfg.topBand.rect], ['stage', cfg.stage], ['trapCard', cfg.trapCard.rect], ['reveal', cfg.reveal.rect],
    ];
    const inSafe = (r: number[]) => r[0] >= cfg.safe[0] && r[1] >= cfg.safe[1] && r[2] <= cfg.safe[2] && r[3] <= cfg.safe[3];
    for (const [name, r] of chrome) if (!inSafe(r)) push('error', 'CFG001', `render-config.${name}`, `[${r.join(', ')}] leaves the safe area [${cfg.safe.join(', ')}]`);
    const fixedChrome = chrome.filter(([n]) => ['head', 'boxTracker', 'ribbon', 'captions', 'credit', 'topBand', 'stage'].includes(n));
    for (let i = 0; i < fixedChrome.length; i++) {
      for (let j = i + 1; j < fixedChrome.length; j++) {
        const [na, a] = fixedChrome[i];
        const [nb, b] = fixedChrome[j];
        if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) push('error', 'CFG002', `render-config.${na}`, `overlaps ${nb}`);
      }
    }
    for (const [name, r] of [['trapCard', cfg.trapCard.rect], ['reveal', cfg.reveal.rect]] as const) {
      const st = cfg.stage;
      if (!(r[0] >= st[0] && r[1] >= st[1] && r[2] <= st[2] && r[3] <= st[3])) push('error', 'CFG003', `render-config.${name}`, 'must sit inside the stage');
    }
    for (const y of cfg.textSlotsY) if (y < cfg.stage[1] || y > cfg.stage[3]) push('error', 'CFG004', 'render-config.textSlotsY', `slot ${y} is outside the stage`);
  }

  /* ---------------- script ---------------- */
  const lint = lintScript(input.scriptSrc, style, facts, pron, strict);
  issues.push(...lint.issues);

  /* ---------------- turns.json in sync with script ---------------- */
  const fresh = parseScript(input.scriptSrc, style.speakers);
  if (JSON.stringify(fresh.turns) !== JSON.stringify(input.turns.turns) || JSON.stringify(fresh.meta) !== JSON.stringify(input.turns.meta)) {
    push('error', 'T001', 'turns.json', 'out of sync with the script. Run: npm run build:turns');
  }

  /* ---------------- timing / audio ---------------- */
  const turns = input.turns.turns;
  const tm = input.timing;
  if (tm.starts.length !== turns.length || tm.durations.length !== turns.length) {
    push('error', 'T002', 'timing_map.json', `${tm.starts.length} starts for ${turns.length} turns. Run: npm run build:timing`);
    return { issues, compiled: null, stats: {} };
  }
  if (tm.fps !== cfg.fps) push('error', 'T002', 'timing_map.json', `fps ${tm.fps} ≠ render-config fps ${cfg.fps}`);
  for (const t of turns) {
    const i = t.idx;
    if (i > 0 && tm.starts[i] < tm.starts[i - 1] + tm.durations[i - 1] - 0.001) {
      push('error', 'T007', t.id, `starts at ${tm.starts[i]}s before ${turns[i - 1].id} ends`);
    }
    if (t.kind === 'pause') {
      if (Math.abs(tm.durations[i] - t.pauseSec) > 0.01) push('error', 'T005', t.id, `pause is ${t.pauseSec}s in script but ${tm.durations[i]}s in timing`);
      continue;
    }
    const expected = hash(toTtsText(t, pron, { emotion: false }));
    if (tm.ttsHash[t.id] !== expected) {
      push('error', 'T006', t.id, `script text changed since its audio was generated. Regenerate ${t.id}.mp3, then build:timing`);
    }
    if (input.audioDurations) {
      const real = input.audioDurations[t.id];
      if (real === undefined) push('error', 'T003', t.id, `missing audio/${spec.id}/${t.id}.mp3`);
      else if (Math.abs(real - tm.durations[i]) > cfg.timing.audioDurationToleranceSec) {
        push('error', 'T004', t.id, `audio is ${real.toFixed(2)}s but timing says ${tm.durations[i]}s. Run: npm run build:timing`);
      }
    }
  }

  /* ---------------- compile (anchors, sections, pause cards) ---------------- */
  let ep: CompiledEpisode;
  try {
    ep = compileEpisode(spec, { turns: input.turns, timing: tm, wordTimes: input.wordTimes, config: cfg, terms: input.terms, facts });
  } catch (e) {
    push('error', 'E000', spec.id, (e as Error).message);
    return { issues, compiled: null, stats: {} };
  }
  issues.push(...ep.issues);

  const estimated = ep.beats.filter(b => b.method === 'estimated');
  if (estimated.length) {
    push(
      strict ? 'error' : 'warn',
      'A003',
      'word_times.json',
      `${estimated.length}/${ep.beats.length} beats use estimated timing (no Vosk word times). Run: npm run import:vosk`,
    );
  }

  /* ---------------- beats: hold, text, facts, emoji ---------------- */
  for (const b of ep.beats) {
    const where = `beat:${b.id}`;
    const tt = ep.timeline[b.turnIdx];
    const visible = b.end - b.start;
    if (visible < cfg.minHoldSec) {
      push('error', 'B001', where, `visible ${visible.toFixed(2)}s (< ${cfg.minHoldSec}s) in ${tt.turn.id}. Anchor earlier or extend with until`);
    }
    if (b.start >= tt.visualEnd) push('error', 'B002', where, `starts after its turn ${tt.turn.id} ends`);

    const section = ep.sections.find(s => b.start >= s.start && b.start < s.end);
    const tone = section?.tone ?? 'playful';
    const concurrentText = ep.beats
      .filter(o => o.start < b.end && b.start < o.end)
      .flatMap(onscreenText)
      .join(' ');
    for (const txt of onscreenText(b)) {
      for (const f of forbiddenClaims(txt, facts, 'onscreen')) push('error', 'B006', where, `${f.id}: on-screen "${f.match}" (${f.why})`);
      for (const h of missingHedges(txt, concurrentText, facts, 'onscreen')) {
        push('error', 'B006', where, `${h.id}: on-screen "${h.match}" needs a visible hedge (${h.words.slice(0, 3).join(' / ')})`);
      }
      if (hasEmoji(txt)) {
        if (!style.onscreen.emojiTones.includes(tone)) push('error', 'B005', where, `emoji in a ${tone} section`);
        else push('warn', 'B005', where, 'emoji depends on a color-emoji font in the render environment; prefer an icon');
      }
    }
    const lineChecks = b.kind === 'text'
      ? [{ id: b.id, text: b.text, level: b.level, allowWrap: b.allowWrap, visible: b.end - b.start }]
      : b.kind === 'stack'
        ? b.items.map(it => ({ id: it.sourceId, text: it.text, level: it.level, allowWrap: it.allowWrap, visible: it.endOffset - it.offset }))
        : [];
    for (const line of lineChecks) {
      if (b.kind === 'stack' && line.visible < cfg.minHoldSec) push('error', 'B001', `beat:${line.id}`, `line visible ${line.visible.toFixed(2)}s (< ${cfg.minHoldSec}s)`);
      const max = style.onscreen.maxChars[line.level];
      if (max && line.text.length > max) push('error', 'B007', `beat:${line.id}`, `${line.text.length} chars for level ${line.level} (max ${max})`);
      const lines = textLines(line.text, line.level, cfg);
      if ((line.level === 'hero' || line.level === 'title') && lines.length > 1 && !line.allowWrap) {
        push('warn', 'B012', `beat:${line.id}`, `${line.level} wraps to ${lines.length} lines ("${lines.join(' / ')}"); shorten or use subtitle`);
      }
    }
    if (b.kind === 'board') {
      const covered = new Set(b.items.map(i => i.box));
      ep.meta.boxes.forEach((_, i) => { if (!covered.has(i + 1)) push('error', 'E008', where, `recap board has no card for box ${i + 1}`); });
    }
    if ((b.kind === 'source' || b.kind === 'document') && b.quoteStatus === 'paraphrase' && /^["“]/.test(b.excerpt)) {
      push('error', 'B008', where, 'paraphrase must not be styled as a quotation');
    }
  }

  /* ---------------- layout ----------------
   * Collisions, safe area, chrome and overlay conflicts are resolved (and logged as
   * L001–L005, or reported as B003/B004/B010 when unfixable) by the layout engine
   * inside compileEpisode; those issues are already in ep.issues. */
  for (const b of ep.beats) {
    if (b.kind === 'bg') continue;
    if (b.start < ep.titleStart + cfg.titleCardSec && ep.titleStart < b.end) push('warn', 'B011', `beat:${b.id}`, 'partly hidden under the title card');
  }

  // concurrency ceiling (sampled at every beat start)
  for (const b of ep.beats) {
    const n = ep.beats.filter(o => o.kind !== 'bg' && o.start <= b.start && b.start < o.end).length;
    if (n > style.onscreen.maxConcurrentBeats) push('warn', 'B009', `beat:${b.id}`, `${n} elements on screen at once (max ${style.onscreen.maxConcurrentBeats})`);
  }

  /* ---------------- pause cards ---------------- */
  for (const c of ep.pauseCards) {
    if (!c.spec.prompt.trim() || !c.spec.reveal.trim()) push('error', 'P002', `pauseCard:${turns[c.pauseIdx].id}`, 'prompt and reveal are required');
    for (const txt of [c.spec.prompt, c.spec.reveal]) {
      for (const f of forbiddenClaims(txt, facts, 'onscreen')) push('error', 'B006', `pauseCard:${turns[c.pauseIdx].id}`, `${f.id}: "${f.match}" (${f.why})`);
    }
  }

  /* ---------------- visual coverage ---------------- */
  const events = [
    ...ep.beats.map(b => b.start),
    ...ep.backgrounds.map(s => s.start),
    ...ep.pauseCards.flatMap(c => [c.start, c.revealStart]),
    ...ep.boxEvents.map(e => e.time),
  ].sort((a, b) => a - b);
  let speechSec = 0;
  let coveredSec = 0;
  for (const tt of ep.timeline) {
    if (tt.turn.kind !== 'speech') continue;
    speechSec += tt.dur;
    const inTurn = events.filter(t => t >= tt.start && t < tt.start + tt.dur);
    const overlaps = (a: number, b: number) => a < tt.start + tt.dur && tt.start < b;
    const active =
      ep.beats.some(b => b.kind !== 'bg' && overlaps(b.start, b.end)) ||
      ep.pauseCards.some(c => overlaps(c.revealStart, c.revealEnd)) ||
      ep.traps.some(x => overlaps(x.start, x.end)) ||
      overlaps(ep.titleStart, ep.titleStart + cfg.titleCardSec);
    if (active) coveredSec += tt.dur;
    const marks = [tt.start, ...inTurn, tt.start + tt.dur];
    let worst = 0;
    for (let i = 1; i < marks.length; i++) worst = Math.max(worst, marks[i] - marks[i - 1]);
    if (worst > cfg.maxSilentVisualSec && !active) {
      push('warn', 'C001', tt.turn.id, `${worst.toFixed(1)}s with no visual change ("${tt.turn.text.slice(0, 40)}…")`);
    }
  }
  const coverage = speechSec ? coveredSec / speechSec : 0;
  if (coverage < cfg.minVisualCoverage) {
    push('warn', 'C002', spec.id, `${Math.round(coverage * 100)}% of speech has an on-screen element (target ${Math.round(cfg.minVisualCoverage * 100)}%)`);
  }

  /* ---------------- derived overlays ---------------- */
  for (const tr of ep.traps) {
    const where = `trap:${turns[tr.trapIdx].id}`;
    // the myth is deliberately wrong; the fact must pass the registry
    for (const f of forbiddenClaims(tr.spec.fact, facts, 'onscreen')) push('error', 'B006', where, `${f.id}: fact "${f.match}" (${f.why})`);
    if (tr.factStart >= tr.end - cfg.minHoldSec) push('error', 'B001', where, 'fact is visible for less than minHoldSec');
  }
  for (const c of ep.terms) {
    for (const f of forbiddenClaims(c.definition, facts, 'onscreen')) push('error', 'B006', `term:${c.term}`, `${f.id}: "${f.match}" (${f.why})`);
  }
  for (const c of ep.chapters) {
    if (c.spec.box && !ep.meta.boxes[c.spec.box - 1]) push('error', 'E007', `chapter:${c.spec.label}`, `box ${c.spec.box} is not declared in # @boxes`);
  }
  const boxChapters = ep.chapters.filter(c => c.spec.box).map(c => c.spec.box);
  ep.meta.boxes.forEach((_, i) => {
    if (!boxChapters.includes(i + 1)) push('warn', 'E007', 'chapters', `box ${i + 1} has no chapter (no banner, no Short)`);
  });
  for (const b of ep.beats) {
    if (b.kind === 'route') {
      for (const r of b.routes) {
        for (const name of [r.from, r.to]) if (!input.places?.[name]) push('error', 'G001', `beat:${b.id}`, `unknown place "${name}" (add it to data/places.json)`);
      }
    }
    if (b.kind === 'tour') {
      b.stops.forEach((st, i) => {
        if (st.region) {
          const region = input.manifest[b.image]?.focus?.find(x => x.id === st.region);
          if (!region) push('error', 'I007', `beat:${b.id}`, `stop ${i}: no focus region "${st.region}" on ${b.image}`);
          else if (!region.verified) push(strict ? 'error' : 'warn', 'I008', `beat:${b.id}`, `stop ${i}: focus region "${st.region}" not verified against the real image`);
        }
        for (const c of st.callouts ?? []) {
          if (c.point.some(v => v < 0 || v > 1)) push('error', 'B015', `beat:${b.id}`, `stop ${i}: callout point ${c.point} outside the image`);
          if (c.label.length > 34) push('error', 'B007', `beat:${b.id}`, `callout "${c.label}" is ${c.label.length} chars (max 34)`);
        }
      });
    }
    if (b.kind === 'document' && b.image) {
      if (!b.marks?.length) push('error', 'B017', `beat:${b.id}`, 'a scan needs magnifier marks (word → point → label); an aimless lens shows nothing');
      const ex = b.excerpt.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '');
      for (const m of b.marks ?? []) {
        if (!ex.includes(m.word.toLowerCase())) push('error', 'B018', `beat:${b.id}`, `mark word "${m.word}" is not in the excerpt`);
        if (m.point.some(v => v < 0 || v > 1)) push('error', 'B015', `beat:${b.id}`, `mark point ${m.point} outside the image`);
        if (m.label && m.label.length > 34) push('error', 'B007', `beat:${b.id}`, `mark label "${m.label}" is ${m.label.length} chars (max 34)`);
      }
      if (b.marks?.length && !b.marksVerified) push(strict ? 'error' : 'warn', 'I011', `beat:${b.id}`, 'magnifier marks not verified against the real scan (set marksVerified: true)');
      if (b.highlight && !ex.includes(b.highlight.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ''))) push('error', 'B018', `beat:${b.id}`, `highlight "${b.highlight}" is not a phrase of the excerpt`);
    }
    if (b.kind === 'figure' && b.image && !b.likeness) push('warn', 'B016', `beat:${b.id}`, 'say whether the portrait is from life or a later likeness');
    if (b.kind === 'bg' && b.focus) {
      const region = input.manifest[b.image]?.focus?.find(x => x.id === b.focus);
      if (!region) push('error', 'I007', `beat:${b.id}`, `no focus region "${b.focus}" on ${b.image}`);
      else if (!region.verified) push(strict ? 'error' : 'warn', 'I008', `beat:${b.id}`, `focus region "${b.focus}" not verified against the real image`);
    }
    if (b.kind === 'text' && b.text.includes('→')) {
      const parts = b.text.split('→').map(x => x.trim());
      if (parts.some(x => !x)) push('error', 'B013', `beat:${b.id}`, 'empty part in an arrow chain');
      if (b.end - b.start < parts.length * 0.6 + 0.8) push('warn', 'B013', `beat:${b.id}`, `${parts.length}-part chain needs ≥${(parts.length * 0.6 + 0.8).toFixed(1)}s on screen`);
    }
  }
  if (input.publicFileExists) {
    for (const [name, file] of Object.entries({ hit: cfg.sfx.hit, check: cfg.sfx.check, whoosh: cfg.sfx.whoosh, tick: cfg.sfx.tick })) {
      if (ep.sfx.some(c => c.name === name) && !input.publicFileExists(file)) push('error', 'X001', `sfx:${name}`, `missing public/${file} (npm run make:sfx)`);
    }
    if (cfg.music && !input.publicFileExists(cfg.music.file)) push('error', 'X002', 'music', `missing public/${cfg.music.file}`);
  }

  /* ---------------- monotony ---------------- */
  // V001: long runs of plain text beats with nothing else happening (any other visual resets the run)
  const isPlainText = (b: ResolvedBeat) => (b.kind === 'text' && !b.text.includes('→')) || (b.kind === 'stack' && b.items.length === 1 && !b.items[0].chain);
  const breaks = [
    ...ep.pauseCards.flatMap(c => [c.start, c.revealStart]),
    ...ep.traps.map(x => x.start),
    ...ep.terms.map(x => x.start),
    ...ep.chapters.filter(c => c.spec.box).map(c => c.start),
  ];
  let run: ResolvedBeat[] = [];
  for (const b of ep.beats.filter(x => x.kind !== 'bg')) {
    const prev = run[run.length - 1];
    const broken = prev && breaks.some(t => t > prev.start && t <= b.start);
    if (!isPlainText(b) || broken) run = isPlainText(b) ? [b] : [];
    else run.push(b);
    if (run.length === 6) push('warn', 'V001', `beat:${run[0].id}`, `6 plain text beats in a row (${run[0].id} … ${b.id}); add a diagram, map, chain, or image`);
  }
  // V002: per-minute variety (distinct element kinds visible) and V003: background reuse
  const minutes = Math.ceil(ep.totalSec / 60);
  const variety: number[] = [];
  for (let m = 0; m < minutes; m++) {
    const a = m * 60;
    const z = a + 60;
    const kinds = new Set<string>();
    for (const b of ep.beats) if (b.start < z && a < b.end) kinds.add(b.kind === 'stack' ? (b.items.some(i => i.chain) ? 'chain' : b.items.length > 1 ? 'list' : 'text') : b.kind);
    if (ep.traps.some(x => x.start < z && a < x.end)) kinds.add('trap');
    if (ep.terms.some(x => x.start < z && a < x.end)) kinds.add('term');
    if (ep.pauseCards.some(x => x.start < z && a < x.end)) kinds.add('pause');
    if (ep.pauseCards.some(x => x.revealStart < z && a < x.revealEnd)) kinds.add('reveal');
    if (ep.years.some(y => y.time >= a && y.time < z)) kinds.add('year');
    variety.push(kinds.size);
    if (kinds.size <= 2 && z <= ep.totalSec) push('warn', 'V002', `minute ${m + 1}`, `only ${kinds.size} kind(s) of visual (${[...kinds].join(', ') || 'none'})`);
  }
  const bgUses = new Map<string, number>();
  ep.backgrounds.forEach((seg, i) => {
    if (i > 0 && ep.backgrounds[i - 1].image === seg.image) return;
    bgUses.set(seg.image, (bgUses.get(seg.image) ?? 0) + 1);
  });
  for (const [img, n] of bgUses) if (n > 3) push('info', 'V003', `image:${img}`, `background returns ${n} times`);

  /* ---------------- images / manifest ---------------- */
  const used = expectedUsedIn(ep);
  for (const [img, ids] of used) {
    const where = `image:${img}`;
    const m = input.manifest[img];
    if (!m) {
      push('error', 'I001', where, 'not in images.json');
      continue;
    }
    if (!m.license || m.license === 'unknown' || !m.source_url) push('error', 'I003', where, `no provenance (license "${m.license}", source_url ${m.source_url ? 'set' : 'empty'})`);
    if (!m.credit) push(strict ? 'error' : 'warn', 'I005', where, 'missing "credit" (shown on screen with the date)');
    if (input.publicFileExists && !input.publicFileExists(img)) push('error', 'I002', where, `file missing: public/${img}`);
    else if (input.imageLock && input.publicFileSha) {
      const entry = input.imageLock[img];
      if (!entry) push(strict ? 'error' : 'warn', 'I009', where, 'not fetched from its source (placeholder?). Run: npm run fetch:images');
      else if (entry.source_url !== m.source_url) push('warn', 'I010', where, 'source_url changed since fetch. Run: npm run fetch:images');
      else if (input.publicFileSha(img) !== entry.sha256) push('warn', 'I010', where, 'file differs from the fetched original (edited or replaced)');
    }
    const have = new Set(m.used_in.filter(u => u.startsWith(`${spec.manifestKey}:`)));
    const want = ids;
    if ([...want].some(u => !have.has(u)) || [...have].some(u => !want.has(u))) {
      push('error', 'I004', where, 'used_in out of sync with beats. Run: npm run sync:manifest');
    }
  }
  for (const [img, m] of Object.entries(input.manifest)) {
    const mine = m.used_in.filter(u => u.startsWith(`${spec.manifestKey}:`));
    if (mine.length && !used.has(img)) push('error', 'I004', `image:${img}`, `lists ${mine.join(', ')} but no beat uses it. Run: npm run sync:manifest`);
    if (new Set(m.used_in).size !== m.used_in.length) push('warn', 'I006', `image:${img}`, 'duplicate used_in entries');
  }
  if (input.publicImages) {
    for (const f of input.publicImages) if (!input.manifest[f]) push('warn', 'I006', `image:${f}`, 'file on disk is not in images.json');
  }

  /* ---------------- heads ---------------- */
  for (const sp of style.speakers) {
    const s = cfg.speakers[sp];
    if (!s) {
      push('error', 'H001', sp, 'speaker missing from render-config.json');
      continue;
    }
    if (s.real === s.toon) push('error', 'H002', sp, 'realistic and stylized head art are the same file');
    for (const other of style.speakers) {
      if (other !== sp && (cfg.speakers[other]?.toon === s.toon || cfg.speakers[other]?.real === s.real)) {
        push('error', 'H002', sp, `shares head art with ${other}`);
      }
    }
    if (input.publicFileExists) {
      for (const f of [s.real, s.toon]) if (!input.publicFileExists(f)) push('error', 'H001', sp, `missing public/${f}`);
    }
  }

  const stats = {
    turns: turns.length,
    speechTurns: turns.filter(t => t.kind === 'speech').length,
    beats: ep.beats.length,
    durationSec: ep.totalSec.toFixed(1),
    visualCoverage: `${Math.round(coverage * 100)}%`,
    anchorsMeasured: ep.beats.filter(b => b.method === 'measured').length,
    anchorsEstimated: estimated.length,
    autoFixes: ep.issues.filter(i => i.code.startsWith('L')).length,
    varietyPerMin: (variety.reduce((x, y) => x + y, 0) / Math.max(1, variety.length)).toFixed(1),
    traps: ep.traps.length,
    terms: ep.terms.length,
    years: new Set(ep.years.map(y => y.year)).size,
  };
  return { issues, compiled: ep, stats };
}
