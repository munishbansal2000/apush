/**
 * Demo (~20 s, no audio): PeopleDots.
 *  1. Kansas–Nebraska Act, House vote of May 22, 1854 — 213 dots (one per vote) fill a
 *     hemicycle, sort by section (free vs slave states), re-sort by vote (113–100, dots keep
 *     their section colour), then into section × vote bars (slave states 69–9, free 44–91).
 *  2. Three-Fifths Compromise — 1790 census, 697,681 enslaved people (1 dot ≈ 20,000); then
 *     2 of every 5 dim: 418,609 counted toward House seats.
 * Data: src/data/motion/votes.json. Zones: top-left chip, centre dots box, bottom caption —
 * each its own <Track>, inside the safe area.
 */
import React from 'react';
import votes from '../../data/motion/votes.json';
import { Track } from '../../kit/guard';
import type { Box } from '../../motion/causechain';
import { fmtNum, PeopleDots, type DotCohort, type Formation } from '../../motion/dots';
import { MotionScene } from '../../motion/MotionScene';
import { Slide } from '../../motion/primitives';
import { COLOR, FONT, RADIUS, SAFE, SURFACE, TYPE } from '../../theme/tokens';

const KN = votes.kansasNebraska;
const TF = votes.threeFifths;

export const VOTES_FPS = 30;
const END = 20.6;
export const VOTES_DEMO_FRAMES = Math.round(END * VOTES_FPS);

/** Beat times (s). */
export const BEAT = { house: 0.6, section: 3.8, vote: 7.8, split: 11.4, knEnd: 14.6, census: 14.9, weight: 17.3, end: 20.0 } as const;

/** Dots area (1280×720 px): between the top chip and the caption. */
export const DOTS_BOX: Box = { x: SAFE.x, y: 96, w: 1280 - 2 * SAFE.x, h: 520 };

const sectionColor = { free: COLOR.free, slave: COLOR.slave } as const;
export const KN_COHORTS: DotCohort[] = KN.cohorts.map(c => ({ id: c.id, count: c.count, color: sectionColor[c.section as 'free' | 'slave'] }));
const ids = (pred: (c: (typeof KN.cohorts)[number]) => boolean) => KN.cohorts.filter(pred).map(c => c.id);

export const KN_FORMATIONS: Formation[] = [
  { t: BEAT.house, layout: 'hemicycle', groups: [{ id: 'house', label: 'House votes cast', color: COLOR.inkSoft, cohorts: ids(() => true), shuffle: 7, unit: 'votes' }] },
  { t: BEAT.section, layout: 'hemicycle', groups: [
    { id: 'free', label: 'Free states', color: COLOR.free, cohorts: ids(c => c.section === 'free') },
    { id: 'slave', label: 'Slave states', color: COLOR.slave, cohorts: ids(c => c.section === 'slave') },
  ] },
  { t: BEAT.vote, layout: 'blocks', colorBy: 'cohort', groups: [
    { id: 'yea', label: 'Yea', color: COLOR.ink, cohorts: ids(c => c.vote === 'yea'), unit: 'votes' },
    { id: 'nay', label: 'Nay', color: COLOR.ink, cohorts: ids(c => c.vote === 'nay'), unit: 'votes' },
  ] },
  { t: BEAT.split, layout: 'bars', colorBy: 'cohort', groups: [
    { id: 'slave-yea', label: 'Slave states · Yea', color: COLOR.slave, cohorts: ids(c => c.section === 'slave' && c.vote === 'yea') },
    { id: 'slave-nay', label: 'Slave states · Nay', color: COLOR.slave, cohorts: ids(c => c.section === 'slave' && c.vote === 'nay') },
    { id: 'free-yea', label: 'Free states · Yea', color: COLOR.free, cohorts: ids(c => c.section === 'free' && c.vote === 'yea') },
    { id: 'free-nay', label: 'Free states · Nay', color: COLOR.free, cohorts: ids(c => c.section === 'free' && c.vote === 'nay') },
  ] },
];

export const TF_FORMATIONS: Formation[] = [
  { t: BEAT.census, layout: 'blocks', groups: [{ id: 'enslaved', label: `Enslaved people, ${TF.census} census`, color: COLOR.slave, count: TF.dots, value: TF.enslaved, weight: { keep: 5, of: 5 } }] },
  { t: BEAT.weight, layout: 'blocks', groups: [{ id: 'enslaved', label: 'Counted toward House seats', color: COLOR.slave, count: TF.dots, value: TF.counted, weight: { keep: 3, of: 5 } }] },
];

export const CAPTIONS = [
  { text: 'One dot = one House vote on the Kansas–Nebraska Act.', from: BEAT.house, to: BEAT.section },
  { text: 'Sort by section: free states vs. slave states.', from: BEAT.section, to: BEAT.vote },
  { text: `Sort by vote: it passed ${KN.yea}–${KN.nay} (Senate: ${KN.senate.yea}–${KN.senate.nay}).`, from: BEAT.vote, to: BEAT.split },
  { text: `Slave states: ${KN.totals.slave.yea}–${KN.totals.slave.nay} for. Free states: ${KN.totals.free.yea}–${KN.totals.free.nay}.`, from: BEAT.split, to: BEAT.knEnd },
  { text: `${TF.census} census · 1 dot ≈ ${fmtNum(TF.dotEquals)} enslaved people`, from: BEAT.census, to: BEAT.weight },
  { text: 'Three-Fifths Compromise: 3 of every 5 were counted.', from: BEAT.weight, to: BEAT.end },
];

export const CHIPS = [
  { text: 'KANSAS–NEBRASKA ACT · HOUSE, MAY 22, 1854', from: 0.3, to: BEAT.knEnd },
  { text: 'THREE-FIFTHS COMPROMISE · 1787', from: BEAT.census, to: BEAT.end },
];

const Caption: React.FC<{ text: string; from: number; to: number }> = ({ text, from, to }) => (
  <Slide at={from} out={to - 0.4} from="down" distance={40} dur={0.4}>
    <div style={{ position: 'absolute', left: SAFE.x, right: SAFE.x, bottom: SAFE.y, display: 'flex', justifyContent: 'center' }}>
      <div data-guard-item={`caption:${text.slice(0, 24)}`} style={{ background: SURFACE.night.bg, color: SURFACE.night.fg, padding: '9px 22px', borderRadius: RADIUS.md,
        fontFamily: FONT.text, fontSize: TYPE.caption, lineHeight: 1.3, textAlign: 'center', whiteSpace: 'nowrap' }}>
        {text}
      </div>
    </div>
  </Slide>
);

const Chip: React.FC<{ text: string; from: number; to: number }> = ({ text, from, to }) => (
  <Slide at={from} out={to - 0.5} from="left" distance={60} dur={0.45}>
    <div data-guard-item={`chip:${text.slice(0, 20)}`} style={{ position: 'absolute', left: SAFE.x, top: SAFE.y, background: COLOR.ink, color: COLOR.onNight,
      padding: '9px 18px', borderRadius: RADIUS.sm, fontFamily: FONT.display, fontSize: TYPE.chip, fontWeight: 700, letterSpacing: 3, whiteSpace: 'nowrap' }}>
      {text}
    </div>
  </Slide>
);

export const VotesDemo: React.FC = () => (
  <MotionScene background={COLOR.paper}>
    <Track id="dots" role="stage">
      <PeopleDots id="kn" formations={KN_FORMATIONS} cohorts={KN_COHORTS} box={DOTS_BOX} to={BEAT.knEnd} />
      <PeopleDots id="tf" formations={TF_FORMATIONS} box={DOTS_BOX} to={BEAT.end + 0.4} />
    </Track>
    <Track id="chip" role="chrome">{CHIPS.map(c => <Chip key={c.text} {...c} />)}</Track>
    <Track id="caption" role="text">{CAPTIONS.map(c => <Caption key={c.text} {...c} />)}</Track>
  </MotionScene>
);
