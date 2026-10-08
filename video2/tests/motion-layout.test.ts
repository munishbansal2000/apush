/**
 * Layout-engine checks for the motion blocks PeopleDots (src/motion/dots.tsx) and CauseChain
 * (src/motion/causechain.tsx). Pure geometry, no DOM: text is measured with the conservative
 * width estimate (the browser uses measureText, never narrower than the estimate). Only
 * settled positions are judged (entrances/exits and camera moves are marked moving).
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  chainCamera, edgeFade, estimateWidth, landTimes, layoutChain, pack1D, pillFont, SAFE_BOX, titleFont, yearFont,
  type Box, type ChainLayout,
} from '../src/motion/causechain';
import { hemicycleSeats, layoutFormation, resolveFormations, type Formation, type Rect } from '../src/motion/dots';
import { CAPTIONS as ROAD_CAPTIONS, CHAIN_BOX, CHAIN_CARDS, CHAIN_LAYOUT, CHAIN_TIMING } from '../src/scenes/demos/RoadToRevolutionDemo';
import { CAPTIONS as VOTE_CAPTIONS, CHIPS, DOTS_BOX, KN_COHORTS, KN_FORMATIONS, TF_FORMATIONS } from '../src/scenes/demos/VotesDemo';
import { COLOR, FONT, SAFE, TYPE } from '../src/theme/tokens';

const EPS = 0.5;
const overlap = (a: Rect, b: Rect, pad = 0) => a.x < b.x + b.w + pad - EPS && b.x < a.x + a.w + pad - EPS && a.y < b.y + b.h + pad - EPS && b.y < a.y + a.h + pad - EPS;
const inside = (r: Rect, b: Box) => r.x >= b.x - EPS && r.y >= b.y - EPS && r.x + r.w <= b.x + b.w + EPS && r.y + r.h <= b.y + b.h + EPS;
const circleHitsRect = (x: number, y: number, r: number, R: Rect) => {
  const dx = Math.max(R.x - x, 0, x - (R.x + R.w));
  const dy = Math.max(R.y - y, 0, y - (R.y + R.h));
  return dx * dx + dy * dy < r * r - EPS;
};
const SAFE_RECT: Box = { x: SAFE.x, y: SAFE.y, w: 1280 - 2 * SAFE.x, h: 720 - 2 * SAFE.y };

function minDist(pts: { x: number; y: number }[]) {
  let m = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) m = Math.min(m, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
  return m;
}

/* ------------------------------------ PeopleDots ------------------------------------ */

function checkFormations(name: string, formations: Formation[], cohorts: typeof KN_COHORTS | undefined, box: Box) {
  const { N, resolved } = resolveFormations(formations, cohorts, box);
  resolved.forEach((f, k) => {
    const tag = `${name} formation ${k} (${formations[k].layout})`;
    const r = f.layout.dotR;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < N; i++) if (f.present[i]) pts.push({ x: f.x[i], y: f.y[i] });
    // every dot is placed once, inside the box
    assert.equal(pts.length, formations[k].groups.reduce((s, g, gi) => s + f.layout.slots[gi].length, 0), `${tag}: slot count`);
    for (const p of pts) assert.ok(p.x - r >= box.x - EPS && p.x + r <= box.x + box.w + EPS && p.y - r >= box.y - EPS && p.y + r <= box.y + box.h + EPS, `${tag}: dot outside box at ${p.x},${p.y}`);
    // no two dots overlap
    assert.ok(minDist(pts) >= 2 * r - EPS, `${tag}: dots overlap (min distance ${minDist(pts).toFixed(2)} < ${2 * r})`);
    assert.ok(r >= 2, `${tag}: dots too small (${r})`);
    // labels: one per group, inside the box, no label × label, no label × dot
    const L = f.layout.labels;
    assert.equal(L.filter(Boolean).length, formations[k].groups.length, `${tag}: missing label`);
    L.forEach((a, i) => {
      assert.ok(inside(a, box), `${tag}: label ${i} outside box ${JSON.stringify(a)}`);
      L.forEach((b, j) => { if (j > i) assert.ok(!overlap(a, b), `${tag}: labels ${i}×${j} overlap`); });
      for (const p of pts) assert.ok(!circleHitsRect(p.x, p.y, r, a), `${tag}: label ${i} covers a dot`);
    });
  });
  return resolved;
}

describe('PeopleDots layout', () => {
  it('Kansas–Nebraska formations: no dot/label overlaps, everything inside the box', () => {
    checkFormations('KN', KN_FORMATIONS, KN_COHORTS, DOTS_BOX);
  });

  it('Kansas–Nebraska data: 113–100 in the House, by section 69–9 and 44–91, identity kept', () => {
    const { N, resolved } = resolveFormations(KN_FORMATIONS, KN_COHORTS, DOTS_BOX);
    assert.equal(N, 213);
    const vote = resolved[2];
    assert.deepEqual(vote.values, [113, 100]);
    assert.deepEqual(resolved[3].values, [69, 9, 44, 91]);
    assert.deepEqual(resolved[1].values, [135, 78]);
    // colorBy cohort: a dot keeps its section colour when re-sorted by vote
    for (let i = 0; i < N; i++) assert.equal(vote.color[i], resolved[1].color[i], `dot ${i} changed section colour`);
  });

  it('Three-Fifths formations: 35 dots, 14 dimmed (2 of every 5), labels 697,681 → 418,609', () => {
    const res = checkFormations('3/5', TF_FORMATIONS, undefined, DOTS_BOX);
    assert.equal(res[0].dim.reduce((s, v) => s + v, 0), 0);
    assert.equal(res[1].dim.reduce((s, v) => s + v, 0), 14);
    assert.deepEqual(res[1].values, [418609]);
    assert.deepEqual(res[1].prevValues, [697681]);
    assert.equal(Math.round(697681 * 3 / 5), 418609);
    // same grid in both, so the dots stay put and only dim
    for (let i = 0; i < 35; i++) assert.ok(Math.abs(res[0].x[i] - res[1].x[i]) < EPS && Math.abs(res[0].y[i] - res[1].y[i]) < EPS);
  });

  it('every layout handles many groups and long labels (two label rows when needed)', () => {
    const box: Box = { x: 64, y: 96, w: 1152, h: 520 };
    const groups = [40, 7, 90, 15, 60, 3];
    for (const layout of ['blocks', 'hemicycle', 'bars', 'clusters'] as const) {
      const f: Formation[] = [{ t: 0, layout, groups: groups.map((n, i) => ({ id: `g${i}`, label: `A rather long group name ${i}`, color: COLOR.ink, count: n })) }];
      checkFormations(`synthetic ${layout}`, f, undefined, box);
    }
  });

  it('hemicycle seats never overlap for any size', () => {
    for (const N of [5, 35, 100, 213, 435]) {
      const { seats, pitch } = hemicycleSeats(N, 400);
      assert.equal(seats.length, N);
      assert.ok(minDist(seats) >= pitch - 1e-6, `N=${N}`);
      // ordered left → right so groups form wedges
      assert.ok(seats[0].x < seats[N - 1].x);
    }
  });

  it('weighted blocks use whole groups of 5 per row', () => {
    const lay = layoutFormation('blocks', [{ n: 35, of: 5 }], [{ w: 200, h: 46 }], DOTS_BOX);
    const xs = new Set(lay.slots[0].map(p => Math.round(p.x)));
    assert.equal(xs.size % 5, 0);
  });
});

/* ------------------------------------ CauseChain ------------------------------------ */

function checkChain(tag: string, L: ChainLayout) {
  const lineW = (s: string, size: number) => estimateWidth(s, titleFont(size));
  L.cards.forEach((c, i) => {
    assert.ok(c.fits, `${tag}: card ${i} title does not fit in ${c.titleLines.length} lines`);
    for (const l of c.titleLines) assert.ok(lineW(l, c.titleSize) <= c.innerW + EPS, `${tag}: card ${i} line "${l}" wider than ${c.innerW}`);
    assert.ok(estimateWidth(CHAIN_CARDS[i].year, yearFont) <= c.innerW + EPS, `${tag}: card ${i} year too wide`);
    assert.ok((TYPE as Record<string, number>)[Object.keys(TYPE).find(k => (TYPE as Record<string, number>)[k] === c.titleSize)!] === c.titleSize, 'title size is a TYPE token');
    // the text block fits the card's height
    assert.ok(c.h >= 2 * 13 + yearFont.size * 1.2 + c.titleLines.length * c.titleSize * 1.2, `${tag}: card ${i} too short`);
    L.cards.forEach((d, j) => { if (j > i) assert.ok(!overlap(c, d, 24), `${tag}: cards ${i}×${j} overlap or touch`); });
  });
  L.pills.forEach((p, i) => {
    if (!p) return;
    assert.ok(p.fits, `${tag}: pill ${i} text does not fit`);
    for (const l of p.lines) assert.ok(estimateWidth(l, pillFont) <= p.w - 2 * 12 + EPS, `${tag}: pill ${i} line too wide`);
    L.cards.forEach((c, j) => assert.ok(!overlap(p, c), `${tag}: pill ${i} × card ${j}`));
    L.pills.forEach((q, j) => { if (q && j > i) assert.ok(!overlap(p, q, 8), `${tag}: pills ${i}×${j} overlap`); });
    assert.ok(p.x >= -EPS && p.x + p.w <= L.contentW + EPS, `${tag}: pill ${i} outside content`);
  });
  // content fits the box on the non-panning axis; the panning axis is declared
  if (L.pan !== 'x') assert.ok(L.contentW <= L.box.w + EPS, `${tag}: content wider than the box without pan`);
  if (L.pan !== 'y') assert.ok(L.contentH <= L.box.h + EPS, `${tag}: content taller than the box without pan`);
  assert.ok(inside(L.box, SAFE_RECT), `${tag}: box outside the safe area`);
}

describe('CauseChain layout', () => {
  it('Road to Revolution: line layout (demo) — cards/pills fit their text and never overlap', () => {
    const L = layoutChain(CHAIN_CARDS, { box: CHAIN_BOX, layout: CHAIN_LAYOUT });
    checkChain('line', L);
    assert.equal(L.pan, 'x');
  });

  it('Road to Revolution: snake layout wraps rows inside the safe area', () => {
    const L = layoutChain(CHAIN_CARDS, { box: SAFE_BOX, layout: 'snake' });
    checkChain('snake', L);
    assert.ok(new Set(L.cards.map(c => c.row)).size > 1);
    // a short chain fits without panning
    const S = layoutChain(CHAIN_CARDS.slice(0, 6), { box: SAFE_BOX, layout: 'snake' });
    checkChain('snake-short', S);
    assert.equal(S.pan, 'none');
  });

  for (const [mode, box] of [[CHAIN_LAYOUT, CHAIN_BOX], ['snake', SAFE_BOX]] as const) it(`camera (${mode}): visible cards/pills always whole inside the viewport; newest card and its cause visible`, () => {
    const L = layoutChain(CHAIN_CARDS, { box, layout: mode });
    const times = landTimes(CHAIN_CARDS.length, CHAIN_TIMING);
    const end = times[times.length - 1] + 3;
    for (let f = 0; f < end * 30; f++) {
      const t = f / 30;
      const cam = chainCamera(L, times, CHAIN_TIMING.travel, t);
      assert.ok(cam.x >= -EPS && cam.x <= Math.max(0, L.contentW - L.box.w) + EPS, `camera out of range at ${t}`);
      assert.ok(cam.y >= -EPS && cam.y <= Math.max(0, L.contentH - L.box.h) + EPS, `camera out of range at ${t}`);
      for (const r of [...L.cards, ...L.pills.filter((p): p is NonNullable<typeof p> => !!p)]) {
        if (edgeFade(L, r, cam) <= 0.05) continue;
        const sx = L.box.x + L.offset[0] + r.x - cam.x;
        const sy = L.box.y + L.offset[1] + r.y - cam.y;
        assert.ok(inside({ x: sx, y: sy, w: r.w, h: r.h }, L.box), `visible element leaves the viewport at t=${t.toFixed(2)}`);
        assert.ok(inside({ x: sx, y: sy, w: r.w, h: r.h }, SAFE_RECT), 'visible element outside the safe area');
      }
    }
    times.forEach((tl, i) => {
      const cam = chainCamera(L, times, CHAIN_TIMING.travel, tl + 0.8);
      assert.ok(!cam.moving, `camera still moving after card ${i} lands`);
      assert.ok(edgeFade(L, L.cards[i], cam) > 0.99, `card ${i} not fully visible after landing`);
      const p = L.pills[i];
      if (p) assert.ok(edgeFade(L, p, cam) > 0.99, `pill ${i} not fully visible after landing`);
      if (i > 0) assert.ok(edgeFade(L, L.cards[i - 1], cam) > 0.99, `card ${i - 1} (the cause) not visible with card ${i}`);
    });
  });

  it('pack1D keeps order, gaps and bounds', () => {
    const xs = pack1D([{ c: 10, w: 50 }, { c: 20, w: 50 }, { c: 400, w: 80 }], 0, 420, 10)!;
    assert.deepEqual(xs.map(Math.round), [0, 60, 340]);
    assert.equal(pack1D([{ c: 0, w: 300 }, { c: 0, w: 300 }], 0, 500, 10), null);
  });
});

/* ------------------------------------ demo zones ------------------------------------ */

describe('motion demo zones', () => {
  const captionFont = { size: TYPE.caption, family: FONT.text };
  const chipFont = { size: TYPE.chip, family: FONT.display, weight: 700, letterSpacing: 3 };
  const captionTop = 720 - SAFE.y - (TYPE.caption * 1.3 + 18);
  const chipBottom = SAFE.y + TYPE.chip * 1.2 + 18;
  it('captions are one line inside the safe area and below the stage boxes', () => {
    for (const c of [...VOTE_CAPTIONS, ...ROAD_CAPTIONS]) {
      assert.ok(estimateWidth(c.text, captionFont) + 44 <= 1280 - 2 * SAFE.x, `caption too wide: "${c.text}"`);
    }
    for (const b of [DOTS_BOX, CHAIN_BOX]) {
      assert.ok(b.y + b.h < captionTop, 'stage overlaps caption');
      assert.ok(b.y > chipBottom, 'stage overlaps chip');
    }
  });
  it('chips fit', () => {
    for (const c of CHIPS) assert.ok(estimateWidth(c.text, chipFont) + 36 <= 1280 - 2 * SAFE.x, c.text);
  });
});
