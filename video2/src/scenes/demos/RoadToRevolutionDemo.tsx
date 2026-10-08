/**
 * Demo (~30 s, no audio): CauseChain — the Road to Revolution, 1754–1776, as a line of
 * dominoes. Each card lands, an impulse runs along the connector, the "because" pill appears
 * on it, and the next card tips into place; the camera pans along the chain so the newest
 * card stays in view (older cards fade out at the left edge of the viewport).
 * Data: src/data/motion/causes-revolution.json. Zones: top-left chip, centre chain viewport,
 * bottom caption — each its own <Track>, inside the safe area.
 */
import React from 'react';
import data from '../../data/motion/causes-revolution.json';
import { Track } from '../../kit/guard';
import { CauseChain, type Box, type CauseCard } from '../../motion/causechain';
import { MotionScene } from '../../motion/MotionScene';
import { Slide } from '../../motion/primitives';
import { COLOR, FONT, RADIUS, SAFE, SURFACE, TYPE } from '../../theme/tokens';

export const ROAD_FPS = 30;
const END = 30.5;
export const ROAD_TO_REVOLUTION_DEMO_FRAMES = Math.round(END * ROAD_FPS);

export const CHAIN_CARDS: CauseCard[] = data.cards;
/** Chain viewport (1280×720 px): between the top chip and the caption. */
export const CHAIN_BOX: Box = { x: SAFE.x, y: 96, w: 1280 - 2 * SAFE.x, h: 520 };
export const CHAIN_TIMING = { start: 1.0, step: 2.1, travel: 0.8 } as const;
export const CHAIN_LAYOUT = 'line' as const;
const t = (i: number) => CHAIN_TIMING.start + i * CHAIN_TIMING.step;

export const CAPTIONS = [
  { text: 'Each event set off the next. Watch the chain.', from: 0.6, to: t(2) },
  { text: 'Deep in war debt, Parliament taxes the colonies.', from: t(2), to: t(5) },
  { text: 'Colonists resist: boycotts, protests, then bloodshed.', from: t(5), to: t(8) },
  { text: 'Britain cracks down; the colonies unite.', from: t(8), to: t(10) },
  { text: 'War comes in 1775. Independence follows in 1776.', from: t(10), to: END - 0.8 },
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

export const RoadToRevolutionDemo: React.FC = () => (
  <MotionScene background={COLOR.paper}>
    <Track id="chain" role="stage">
      <CauseChain cards={CHAIN_CARDS} layout={CHAIN_LAYOUT} box={CHAIN_BOX} {...CHAIN_TIMING} accent={COLOR.british} to={END - 0.6} id="rev" />
    </Track>
    <Track id="chip" role="chrome">
      <Slide at={0.3} out={END - 1.2} from="left" distance={60} dur={0.45}>
        <div data-guard-item="chip:road" style={{ position: 'absolute', left: SAFE.x, top: SAFE.y, background: COLOR.ink, color: COLOR.onNight,
          padding: '9px 18px', borderRadius: RADIUS.sm, fontFamily: FONT.display, fontSize: TYPE.chip, fontWeight: 700, letterSpacing: 3, whiteSpace: 'nowrap' }}>
          ROAD TO REVOLUTION · 1754–1776
        </div>
      </Slide>
    </Track>
    <Track id="caption" role="text">{CAPTIONS.map(c => <Caption key={c.text} {...c} />)}</Track>
  </MotionScene>
);
