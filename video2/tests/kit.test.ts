/**
 * Kit tests. Each "regression" test names the production bug it locks out.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { AnchorError, alignTokens, resolveAnchor } from '../src/kit/anchors';
import { compileEpisode, defineEpisode, until } from '../src/kit/episode';
import { beatRect, intersects, type RenderConfig } from '../src/kit/layout';
import { lintScript, type FactRegistry, type StyleRules } from '../src/kit/lint-script';
import { parseScript } from '../src/kit/script';
import { activeTurnAt, buildTimeline, framesFor, headAssets, headTurnAt, layoutStarts } from '../src/kit/timeline';
import { toTtsText, type Pronunciations } from '../src/kit/tts';
import type { ResolvedBeat, TurnsFile } from '../src/kit/types';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const json = <T>(p: string) => JSON.parse(read(p)) as T;
const style = json<StyleRules>('src/data/style-rules.json');
const facts = json<FactRegistry>('src/data/fact-registry.json');
const pron = json<Pronunciations>('src/data/pronunciations.json');
const cfg = json<RenderConfig>('src/data/kit-render-config.json');

const MINI = `# @episode: test
# @boxes: alpha | beta
# @midcheck: 1
Maya: Hello there, this is the first line.
Marcus: Westbound first, wheat and horses.
Maya: Your turn. Which way did horses go?

[10-second pause]

Marcus: West. Horses went west.
Maya: Checking that one.
Maya: Box two, checked.
Marcus: The food went both ways —

[hold 1.0s]

Maya: and the dying only went one.
`;
const RULES = { leadInSec: 0.5, gapSec: 0.3, shortReplyGapSec: 0.1, shortReplyMaxWords: 3, tailSec: 2 };

function miniEpisode() {
  const parsed = parseScript(MINI, ['maya', 'marcus']);
  const turnsFile: TurnsFile = { _generated: '', source: '', meta: parsed.meta, turns: parsed.turns };
  const timing = layoutStarts(parsed.turns, t => (t.kind === 'pause' ? t.pauseSec : 2), RULES);
  return { parsed, turnsFile, timing, timeline: buildTimeline(parsed.turns, timing) };
}

describe('script parser', () => {
  it('counts pause lines as turns and attaches holds to the previous turn', () => {
    const { parsed } = miniEpisode();
    assert.equal(parsed.turns.length, 9);
    assert.equal(parsed.turns[3].kind, 'pause');
    const closing = parsed.turns[7];
    assert.equal(closing.kind === 'speech' && closing.holdAfterSec, 1);
    assert.deepEqual(parsed.meta.boxes, ['alpha', 'beta']);
  });

  it('rejects unknown speakers and unparseable lines', () => {
    const { issues } = parseScript('# @episode: x\nNarrator: hi\nrandom text', ['maya', 'marcus']);
    assert.deepEqual(issues.map(i => i.code).sort(), ['S001', 'S002']);
  });

  it('strips {trap} and leading {emotion} tags from display text', () => {
    const { turns } = parseScript('# @episode: x\nMarcus: {soft tone} Quiet now. {trap}', ['maya', 'marcus']);
    const t = turns[0];
    assert.ok(t.kind === 'speech');
    assert.equal(t.text, 'Quiet now.');
    assert.equal(t.emotion, 'soft tone');
    assert.deepEqual(t.tags, ['trap']);
  });
});

describe('timeline', () => {
  it('regression: holds the last turn through gaps (legacy blanked between turns)', () => {
    const { timeline } = miniEpisode();
    const gapTime = timeline[0].start + timeline[0].dur + 0.15; // inside the 0.3s gap
    assert.equal(activeTurnAt(timeline, gapTime)?.turn.id, 't00');
    assert.equal(activeTurnAt(timeline, 0.1), null);
  });

  it('hides the head during pause turns', () => {
    const { timeline } = miniEpisode();
    assert.equal(headTurnAt(timeline, timeline[3].start + 1), null);
    assert.equal(headTurnAt(timeline, timeline[4].start + 0.5)?.turn.speaker, 'marcus');
  });

  it('applies [hold] as the gap after a turn', () => {
    const { timeline } = miniEpisode();
    assert.equal(+(timeline[8].start - (timeline[7].start + timeline[7].dur)).toFixed(3), 1);
  });

  it('regression: audio frames round up (legacy floor clipped the tail)', () => {
    assert.equal(framesFor(0, 2.01, 30), 61);
  });

  it('regression: Marcus gets Marcus art (legacy ternary gave him maya-toon)', () => {
    const speakers = cfg.speakers as Parameters<typeof headAssets>[0];
    assert.equal(headAssets(speakers, 'marcus').stylized, 'marcus-toon.webp');
    assert.notEqual(headAssets(speakers, 'marcus').stylized, headAssets(speakers, 'maya').stylized);
  });
});

describe('anchors', () => {
  it('resolves by text and survives renumbering', () => {
    const { parsed, timeline } = miniEpisode();
    const r = resolveAnchor({ turn: 'Westbound first' }, parsed.turns, timeline, {});
    assert.equal(r.turnIdx, 1);
    const shifted = parseScript(MINI.replace('Maya: Hello', 'Maya: New first line.\nMaya: Hello'), ['maya', 'marcus']);
    const shiftedTl = buildTimeline(shifted.turns, layoutStarts(shifted.turns, () => 2, RULES));
    assert.equal(resolveAnchor({ turn: 'Westbound first' }, shifted.turns, shiftedTl, {}).turnIdx, 2);
  });

  it('fails loudly on missing or ambiguous snippets', () => {
    const { parsed, timeline } = miniEpisode();
    assert.throws(() => resolveAnchor({ turn: 'nonexistent line' }, parsed.turns, timeline, {}), AnchorError);
    assert.throws(() => resolveAnchor({ turn: 'horses' }, parsed.turns, timeline, {}), /matches 3 turns/);
    assert.throws(() => resolveAnchor({ turn: 'Westbound first', word: 'cattle' }, parsed.turns, timeline, {}), /not found/);
  });

  it('uses measured word times and aligns past Vosk mishearings', () => {
    const { parsed, timeline } = miniEpisode();
    const words = { t01: [
      { w: 'westbound', s: 0.1, e: 0.6 }, { w: 'first', s: 0.6, e: 0.9 }, { w: 'wheat', s: 1.0, e: 1.3 },
      { w: 'and', s: 1.3, e: 1.4 }, { w: 'forces', s: 1.4, e: 1.9 }, // "horses" misheard
    ] };
    const exact = resolveAnchor({ turn: 'Westbound first', word: 'wheat' }, parsed.turns, timeline, words);
    assert.equal(exact.method, 'measured');
    assert.equal(exact.offset, 1.0);
    const misheard = resolveAnchor({ turn: 'Westbound first', word: 'horses' }, parsed.turns, timeline, words);
    assert.equal(misheard.method, 'interpolated');
    assert.ok(misheard.offset >= 1.4 && misheard.offset <= 2);
    assert.equal(alignTokens(['a', 'b', 'c'], ['a', 'x', 'c']).get(2), 2);
  });
});

describe('compileEpisode', () => {
  const spec = defineEpisode({
    id: 'test', manifestKey: 'T', script: '',
    title: { kicker: '', title: '', subline: '', at: { turn: 'Hello there' } },
    sections: [{ from: { turn: 'Hello there' }, tone: 'playful', bg: 'a.jpg' }],
    pauseCards: [{ after: { turn: 'Your turn.' }, kind: 'predict', prompt: 'Which way?', reveal: 'West.' }],
    traps: [],
    chapters: [],
    beats: [
      { id: 'w', kind: 'text', at: { turn: 'Westbound first' }, text: 'WEST', level: 'title', position: [0.38, 0.3] },
      { id: 'close', kind: 'text', at: { turn: 'The food went both ways' }, until: until.turns(2), text: 'BOTH WAYS', level: 'title', position: [0.38, 0.3] },
      { id: 'bg', kind: 'bg', at: { turn: 'Westbound first' }, image: 'b.jpg' },
    ],
  });

  it('regression: closing text spans both closing turns (legacy t81 text never showed)', () => {
    const { turnsFile, timing } = miniEpisode();
    const ep = compileEpisode(spec, { turns: turnsFile, timing, wordTimes: {}, config: cfg });
    const close = ep.beats.find(b => b.id === 'close')!;
    assert.equal(close.end, ep.timeline[8].visualEnd);
    assert.deepEqual(ep.issues.filter(i => i.level === 'error'), []);
    assert.ok(ep.issues.some(i => i.code === 'E009'), 'boxes never said aloud are flagged');
  });

  it('puts a prompt card on every pause turn and a reveal on the answer', () => {
    const { turnsFile, timing } = miniEpisode();
    const ep = compileEpisode(spec, { turns: turnsFile, timing, wordTimes: {}, config: cfg });
    assert.equal(ep.pauseCards.length, 1);
    assert.equal(ep.pauseCards[0].revealStart, ep.timeline[4].start);
    const noCards = compileEpisode({ ...spec, pauseCards: [] }, { turns: turnsFile, timing, wordTimes: {}, config: cfg });
    assert.ok(noCards.issues.some(i => i.code === 'P001'));
  });

  it('derives box events from the script text', () => {
    const { turnsFile, timing } = miniEpisode();
    const ep = compileEpisode(spec, { turns: turnsFile, timing, wordTimes: {}, config: cfg });
    assert.deepEqual(ep.boxEvents.map(e => [e.box, e.mid]), [[1, true], [2, false]]);
  });

  it('bg beats hold until the next bg or section end', () => {
    const { turnsFile, timing } = miniEpisode();
    const ep = compileEpisode(spec, { turns: turnsFile, timing, wordTimes: {}, config: cfg });
    assert.deepEqual(ep.backgrounds.map(b => b.image), ['a.jpg', 'b.jpg']);
    assert.equal(ep.backgrounds[1].end, ep.totalSec);
  });
});

describe('layout', () => {
  it('flags overlapping text and head collisions', () => {
    const base = { start: 0, end: 1, turnIdx: 0, method: 'measured' as const, at: { turn: 'x' } };
    const a = { ...base, id: 'a', kind: 'text', text: 'VIRGIN SOIL', level: 'title', position: [0.38, 0.2] } as ResolvedBeat;
    const b = { ...base, id: 'b', kind: 'bubble', text: 'That phrase bugs me...', position: [0.38, 0.27], width: 340 } as ResolvedBeat;
    assert.ok(intersects(beatRect(a, cfg)!, beatRect(b, cfg)!));
    const wide = { ...base, id: 'c', kind: 'text', text: 'A VERY LONG LINE THAT RUNS RIGHT', level: 'title', position: [0.6, 0.75] } as ResolvedBeat;
    assert.ok(intersects(beatRect(wide, cfg)!, cfg.head.rect));
  });
});

describe('tts', () => {
  it('applies pronunciations (longest first), number rules, and the em-dash hand-off', () => {
    const t = { id: 't0', idx: 0, kind: 'speech' as const, speaker: 'maya' as const, tags: [], line: 1,
      text: 'The Tlaxcalans and São Tomé in the 1500s. The food went both ways —' };
    assert.equal(toTtsText(t, pron, { emotion: false }), 'The tlash-kah-lunz and sow toh-may in the fifteen hundreds. The food went both ways,');
  });
});

describe('script lint', () => {
  it('regression: v9 script fails the fact registry on the errors found in review', () => {
    const v9 = read('tests/fixtures/u1e3.v9.md');
    const withMeta = `# @episode: u1e3\n${v9}`;
    const { issues } = lintScript(withMeta, style, facts, pron, false);
    const facts9 = issues.filter(i => i.code === 'S006').map(i => i.msg.slice(0, 8));
    for (const id of ['F-U1-013', 'F-U1-014', 'F-U1-015', 'F-U1-016', 'F-U1-019', 'F-U1-022', 'F-U1-023']) {
      assert.ok(facts9.includes(id), `expected ${id} in v9 lint; got ${facts9.join(', ')}`);
    }
    assert.ok(issues.some(i => i.code === 'S005'), 'banned phrases (Fun fact / exam tip) flagged');
  });

  it('v10 script has no lint errors', () => {
    const { issues } = lintScript(read('script/u1e3.v10.md'), style, facts, pron, false);
    assert.deepEqual(issues.filter(i => i.level === 'error'), []);
  });

  it('a {trap} must be corrected by the other speaker', () => {
    const src = '# @episode: x\nMaya: Europe won the Exchange. {trap}\nMaya: Moving on.';
    const { issues } = lintScript(src, style, facts, pron, false);
    assert.ok(issues.some(i => i.code === 'S022' && i.level === 'error'));
  });
});

/* ------------------------- overlays, layout engine, audio ------------------------- */
import { chainPartOffsets, deriveTerms, deriveYears } from '../src/kit/derive';
import { resolveLayout } from '../src/kit/layout-engine';
import { duckAt } from '../src/kit/timeline';

describe('layout engine (self-correcting)', () => {
  const base = { turnIdx: 0, method: 'measured' as const, at: { turn: 'x' } };
  const text = (id: string, y: number, start = 0, end = 3) =>
    ({ ...base, id, kind: 'text', text: 'A SHORT LINE', level: 'title', position: [0.38, y], start, end }) as ResolvedBeat;

  it('moves a text beat out from under a trap card and logs the fix', () => {
    const trap = { id: 'trap card', rect: cfg.trapCard.rect, start: 0, end: 5 };
    const { beats, issues } = resolveLayout([text('a', 0.3)], [trap], cfg, 10);
    const moved = beats[0];
    assert.ok(moved.kind === 'text' && moved.position[1] > cfg.trapCard.rect[3]);
    assert.deepEqual(issues.map(i => i.code), ['L001']);
  });

  it('stacks concurrent text into free slots instead of overlapping', () => {
    const { beats, issues } = resolveLayout([text('a', 0.34), text('b', 0.34, 1, 3)], [], cfg, 10);
    const [a, b] = beats.map(x => (x.kind === 'text' ? x.position[1] : -1));
    assert.notEqual(a, b);
    assert.ok(issues.some(i => i.code === 'L001' && i.where === 'beat:b'));
  });

  it('pulls text that runs off the right edge back into the safe area', () => {
    const wide = { ...text('w', 0.5), text: 'SUGAR FIRST, NOT COTTON', position: [0.85, 0.5] } as ResolvedBeat;
    const { beats, issues } = resolveLayout([wide], [], cfg, 10);
    assert.ok(issues.some(i => i.code.startsWith('L')));
    assert.ok(beats[0].kind === 'text' && beats[0].position[0] < 0.85);
  });

  it('reports an error when a beat sits under a pause card (exclusive, unfixable)', () => {
    const pause = { id: 'pause card', rect: cfg.stage, start: 0, end: 5, exclusive: true };
    const { issues } = resolveLayout([text('a', 0.3)], [pause], cfg, 10);
    assert.ok(issues.some(i => i.code === 'B010'));
  });
});

describe('derived overlays', () => {
  it('finds every spoken year (including decades) for the timeline ribbon', () => {
    const turns = parseScript('# @episode: x\nMarcus: In 1972 he named it; by the 1840s blight hit; 1492 started it.', ['maya', 'marcus']).turns;
    const tl = buildTimeline(turns, layoutStarts(turns, () => 6, RULES));
    assert.deepEqual(deriveYears(tl, {}).map(y => y.label), ['1972', '1840s', '1492']);
  });

  it('delays a key-term chip that would collide with a chapter banner', () => {
    const turns = parseScript('# @episode: x\nMarcus: Historians call it the Columbian Exchange today.', ['maya', 'marcus']).turns;
    const tl = buildTimeline(turns, layoutStarts(turns, () => 4, RULES));
    const banner = { spec: { label: 'Box 1', box: 1, at: { turn: 'x' } }, start: 0, end: 10, bannerEnd: 4 };
    const issues: import('../src/kit/types').Issue[] = [];
    const chips = deriveTerms(json('src/data/terms.json'), tl, [banner], cfg, {}, issues);
    assert.equal(chips.length, 1);
    assert.ok(chips[0].start >= 4);
    assert.ok(issues.some(i => i.code === 'L004'));
  });

  it('chain parts light up in order and all before the beat ends', () => {
    const turns = parseScript('# @episode: x\nMarcus: Germs, then sugar, then chains, in that order.', ['maya', 'marcus']).turns;
    const tl = buildTimeline(turns, layoutStarts(turns, () => 3, RULES));
    const beat = { id: 'c', kind: 'text', text: 'GERMS → SUGAR → CHAINS', level: 'title', position: [0.38, 0.3], at: { turn: 'x' }, start: tl[0].start, end: tl[0].visualEnd, turnIdx: 0, method: 'estimated' } as ResolvedBeat;
    const offs = chainPartOffsets(beat, tl, {});
    assert.equal(offs.length, 3);
    assert.ok(offs[0] < offs[1] && offs[1] < offs[2]);
    assert.ok(offs[2] <= beat.end - beat.start - 0.8 + 1e-9);
  });

  it('every {trap} line needs a trap card (E005)', () => {
    const src = MINI.replace('Maya: Your turn. Which way did horses go?', 'Maya: Your turn. Which way did horses go? {trap}');
    const parsed = parseScript(src, ['maya', 'marcus']);
    const turnsFile: TurnsFile = { _generated: '', source: '', meta: parsed.meta, turns: parsed.turns };
    const timing = layoutStarts(parsed.turns, t => (t.kind === 'pause' ? t.pauseSec : 2), RULES);
    const spec = defineEpisode({ id: 't', manifestKey: 'T', script: '', title: { kicker: '', title: '', subline: '', at: { turn: 'Hello there' } },
      sections: [{ from: { turn: 'Hello there' }, tone: 'playful', bg: 'a.jpg' }], beats: [], traps: [], chapters: [],
      pauseCards: [{ after: { turn: 'Your turn.' }, kind: 'predict', prompt: 'p', reveal: 'r' }] });
    const ep = compileEpisode(spec, { turns: turnsFile, timing, wordTimes: {}, config: cfg });
    assert.ok(ep.issues.some(i => i.code === 'E005'));
  });
});

describe('music ducking', () => {
  it('ducks under speech and ramps (no clicks) at the edges', () => {
    const { timeline } = miniEpisode();
    const s = timeline[0];
    assert.equal(duckAt(timeline, s.start + 0.5, 0.25), 0.25);
    const mid = duckAt(timeline, s.start + s.dur + 0.15, 0.25);
    assert.ok(mid > 0.25 && mid < 1);
    assert.equal(duckAt(timeline, timeline[3].start + 5, 0.25), 1); // inside a 10s pause
  });
});

describe('U1E3 compiled episode', () => {
  it('compiles with zero errors and self-corrects its own collisions', async () => {
    const { u1e3 } = await import('../src/episodes/u1e3');
    const ep = compileEpisode(u1e3, {
      turns: json('data/e3/turns.json'), timing: json('data/e3/timing_map.json'), wordTimes: json('data/e3/word_times.json'),
      config: cfg, terms: json('src/data/terms.json'), facts,
    });
    assert.deepEqual(ep.issues.filter(i => i.level === 'error'), []);
    assert.equal(ep.traps.length, 5);
    assert.ok(ep.terms.length >= 4);
    assert.ok(ep.sfx.some(c => c.name === 'tick') && ep.sfx.some(c => c.name === 'check'));
  });
});

describe('stack cards (derived)', () => {
  it('groups overlapping text in one turn into one card and keeps lines timed', async () => {
    const { groupStacks } = await import('../src/kit/derive');
    const mk = (id: string, y: number, start: number, end: number, turnIdx = 0) =>
      ({ id, kind: 'text', text: id.toUpperCase(), level: 'subtitle', position: [0.38, y], at: { turn: 'x' }, start, end, turnIdx, method: 'measured' }) as ResolvedBeat;
    const issues: import('../src/kit/types').Issue[] = [];
    const turns = parseScript('# @episode: x\nMarcus: A and then B arrive.\nMaya: C comes later.', ['maya', 'marcus']).turns;
    const tl = buildTimeline(turns, layoutStarts(turns, () => 5, RULES));
    const out = groupStacks([mk('a', 0.2, 0, 4), mk('b', 0.34, 1, 4), mk('c', 0.2, 6, 8, 1)], [], cfg, issues, tl, {});
    const stacks = out.filter(b => b.kind === 'stack');
    assert.equal(stacks.length, 2);
    const first = stacks[0];
    assert.ok(first.kind === 'stack' && first.items.length === 2 && first.items[1].offset === 1);
    assert.ok(issues.some(i => i.code === 'L006'));
    assert.ok(first.kind === 'stack' && first.items.every(it => it.wordOffsets.length === it.text.split(/\s+/).length));
  });
});

describe('kinetic timing', () => {
  it('words appear in order, no later than the build budget', async () => {
    const { wordRevealOffsets } = await import('../src/kit/derive');
    const turns = parseScript('# @episode: x\nMarcus: In 1972 a historian named it the Columbian Exchange.', ['maya', 'marcus']).turns;
    const tl = buildTimeline(turns, layoutStarts(turns, () => 5, RULES));
    const offs = wordRevealOffsets('THE COLUMBIAN EXCHANGE', 0, tl[0].start, tl[0].start + 5, tl, {});
    assert.equal(offs.length, 3);
    assert.ok(offs[0] <= offs[1] && offs[1] <= offs[2] && offs[2] <= 1.4);
  });
});

describe('layout engine: reading order', () => {
  it('a moved line never lands above a line authored above it in the same turn', () => {
    const base = { turnIdx: 0, method: 'measured' as const, at: { turn: 'x' } };
    const title = { ...base, id: 'title', kind: 'text', text: 'THE COMANCHE', level: 'title', position: [0.38, 0.22], start: 0, end: 4 } as ResolvedBeat;
    const sub = { ...base, id: 'sub', kind: 'text', text: 'REBUILT LIFE AROUND THE HORSE', level: 'subtitle', position: [0.38, 0.36], start: 1, end: 4 } as ResolvedBeat;
    const trap = { id: 'trap card', rect: cfg.trapCard.rect, start: 0, end: 5 };
    const { beats } = resolveLayout([title, sub], [trap], cfg, 10);
    const y = (id: string) => { const b = beats.find(x => x.id === id)!; return b.kind === 'text' ? b.position[1] : -1; };
    assert.ok(y('title') < y('sub'), `title ${y('title')} should stay above sub ${y('sub')}`);
  });
});

describe('image → cover-box mapping', () => {
  it('maps full-image fractions into a cover-cropped box', async () => {
    const { imageToCoverBox } = await import('../src/kit/layout');
    // portrait image (aspect 0.85) in a 16:9 box: sides fit, top/bottom cropped
    const [x0, y0, x1, y1] = imageToCoverBox([0, 0.5, 1, 0.5], 0.85, 16 / 9);
    assert.equal(x0, 0);
    assert.equal(x1, 1);
    assert.ok(Math.abs(y0 - 0.5) < 1e-9 && Math.abs(y1 - 0.5) < 1e-9); // centre stays centre
    const [, top] = imageToCoverBox([0, 0], 0.85, 16 / 9);
    assert.ok(top < 0); // the image's top edge is cropped out of view
  });
});
