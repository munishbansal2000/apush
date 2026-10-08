/**
 * Demo (~25 s, no audio): DocumentLens on the title page of Thomas Paine's *Common Sense*
 * (sixth edition, Providence: John Carter, 1776; public domain scan, see docs/COMPONENT_ASSETS.md).
 *
 * Beats: whole page (0–3.2) → title boxed (5.0) → "ADDRESSED TO THE / INHABITANTS / OF /
 * AMERICA" marked line by line (8.3–9.8) → margin note (10.4) → page slides left, the marked
 * words lift into a pull-quote panel (15.4) → HIPP tags drop in (16.9, 18.3, 19.7, 21.1).
 *
 * Region rects are image px on the 1920×2602 scan, checked by cropping the scan.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Track } from '../../kit/guard';
import { DocumentLens, type DocCamKey, type DocHighlight, type DocNote, type DocPullQuote, type DocRect } from '../../motion/document';
import { MotionScene } from '../../motion/MotionScene';
import { fadeWindow, Slide } from '../../motion/primitives';
import { COLOR, FONT, MOTION, RADIUS, SAFE, SURFACE, TYPE } from '../../theme/tokens';

export const DOCUMENT_DEMO_FPS = 30;
export const DOCUMENT_DEMO_FRAMES = 25 * DOCUMENT_DEMO_FPS;
const END = 25;

const SRC = 'historic/docs/common_sense_1776.jpg';
const IMG_W = 1920;
const IMG_H = 2602;

/** Words on the page (image px). */
const R: Record<string, DocRect> = {
  title: { x: 70, y: 95, w: 1555, h: 175 },          // COMMON SENSE:
  addressed: { x: 540, y: 315, w: 500, h: 60 },      // ADDRESSED TO THE
  inhabitants: { x: 230, y: 440, w: 1210, h: 105 },  // I N H A B I T A N T S
  of: { x: 760, y: 615, w: 150, h: 75 },             // O F
  america: { x: 70, y: 740, w: 1820, h: 150 },       // A M E R I C A,
  address: { x: 70, y: 315, w: 1820, h: 575 },       // the whole address block
};

const CAMERA: DocCamKey[] = [
  { t: 0, x: IMG_W / 2, y: IMG_H / 2, w: 5000 },          // the whole page on the desk
  { t: 3.2, x: IMG_W / 2, y: IMG_H / 2, w: 5000 },
  { t: 5.0, x: 850, y: 190, w: 2000 },                     // the title
  { t: 6.6, x: 850, y: 190, w: 2000 },
  { t: 8.2, x: 548, y: 600, w: 3048 },                     // the address, page on the right, margin on the left
  { t: 14.0, x: 548, y: 600, w: 3048 },
  { t: 15.4, x: 1781, y: 900, w: 4000 },                   // page to the left: room for the panel
];

const HIGHLIGHTS: DocHighlight[] = [
  { id: 'title', rect: R.title, at: 5.0, to: 7.2, dur: 0.8, kind: 'box' },
  { id: 'addressed', rect: R.addressed, at: 8.3, to: END },
  { id: 'inhabitants', rect: R.inhabitants, at: 8.7, to: END, dur: 0.6 },
  { id: 'of', rect: R.of, at: 9.25, to: END, dur: 0.25 },
  { id: 'america', rect: R.america, at: 9.5, to: END, dur: 0.6 },
];

const NOTES: DocNote[] = [
  { id: 'audience', text: 'Audience: ordinary colonists, not the King or Parliament!', at: 10.4, to: 14.0, x: SAFE.x + 6, y: 228, width: 320, target: R.inhabitants },
];

const QUOTE: DocPullQuote = {
  rect: R.address,
  at: 15.4,
  to: 24.3,
  text: 'Addressed to the Inhabitants of America',
  cite: 'Thomas Paine, Common Sense (1776), title page · 6th ed., Providence',
  width: 480,
  hipp: [
    { key: 'H', text: 'Jan. 1776: war since Lexington (Apr. 1775), yet many colonists still hoped to reconcile with the King.', at: 16.9 },
    { key: 'I', text: 'Ordinary colonists, in plain everyday language.', at: 18.3 },
    { key: 'P', text: 'Persuade Americans to break with Britain and declare independence.', at: 19.7 },
    { key: 'POV', text: 'A recent English immigrant (arrived 1774) and radical critic of monarchy.', at: 21.1 },
  ],
};

export interface CaptionLine { from: number; to: number; text: string; side?: 'center' | 'left' }
const CAPTIONS: CaptionLine[] = [
  { from: 0.3, to: 3.4, text: 'Thomas Paine’s Common Sense, 1776: this copy is a sixth edition, reprinted in Providence.' },
  { from: 3.6, to: 6.6, text: 'The title promises plain reasoning that anyone can follow.' },
  { from: 6.9, to: 10.2, text: 'It is addressed to the inhabitants of America, not to the King or Parliament.' },
  { from: 10.4, to: 14.0, text: 'That choice of audience is the point: Paine wrote for ordinary colonists.' },
  { from: 15.5, to: 19.5, text: 'Read it with HIPP: situation, audience, purpose, point of view.', side: 'left' },
  { from: 19.7, to: 24.4, text: 'Ask what the words were meant to do, and for whom.', side: 'left' },
];

/** Bottom caption: rises from below, sinks out. Left-aligned while the quote panel is up. */
export const DemoCaptions: React.FC<{ lines: CaptionLine[] }> = ({ lines }) => (
  <>
    {lines.map(l => (
      <Slide key={l.text} at={l.from} out={l.to - MOTION.enter} from="down" to="down" distance={40}>
        <div style={{ position: 'absolute', bottom: SAFE.y, left: SAFE.x, right: l.side === 'left' ? undefined : SAFE.x, display: 'flex', justifyContent: l.side === 'left' ? 'flex-start' : 'center' }}>
          <div style={{ maxWidth: l.side === 'left' ? 600 : 980, background: SURFACE.night.bg, color: SURFACE.night.fg, padding: '10px 22px', borderRadius: RADIUS.md,
            fontFamily: FONT.text, fontSize: TYPE.body, lineHeight: 1.35, textAlign: l.side === 'left' ? 'left' : 'center' }}>
            {l.text}
          </div>
        </div>
      </Slide>
    ))}
  </>
);

const Chip: React.FC<{ text: string; from: number; to: number }> = ({ text, from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fadeWindow(frame / fps, from, to);
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: SAFE.x, top: SAFE.y, opacity: o, background: COLOR.ink, color: COLOR.paper, padding: '8px 16px', borderRadius: RADIUS.sm,
      fontFamily: FONT.display, fontSize: TYPE.chip, fontWeight: 700, letterSpacing: 3 }}>
      {text}
    </div>
  );
};

export const DocumentDemo: React.FC = () => (
  <MotionScene background={COLOR.paperDeep}>
    <DocumentLens id="document" src={SRC} imgW={IMG_W} imgH={IMG_H} camera={CAMERA} highlights={HIGHLIGHTS} notes={NOTES} quote={QUOTE} />
    <Track id="date" role="chrome">
      <Chip text="1776 · PRIMARY SOURCE" from={0.4} to={3.4} />
    </Track>
    <Track id="caption" role="text">
      <DemoCaptions lines={CAPTIONS} />
    </Track>
  </MotionScene>
);
