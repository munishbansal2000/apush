/**
 * Demo (~20 s, no audio): cut-out characters. The Stamp Act crisis in one street.
 *
 * Beats: a colonist walks in from the left (0.4–4.0) and points at the sign (4.2) → a British
 * soldier walks in from the right (7.0–10.0) → they argue in turns (10.0–15.0) → a crowd gathers
 * (13.8) and cheers (15.0) → the soldier walks off to the right (16.2–18.6).
 *
 * Facts: Stamp Act passed 1765, repealed March 1766; British officials argued colonists were
 * "virtually represented" in Parliament (settled; AP CED Topic 3.2).
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Track } from '../../kit/guard';
import { Crowd, CutoutCharacter, SKIN, type ActionKey } from '../../motion/characters';
import { MotionScene } from '../../motion/MotionScene';
import { fadeWindow } from '../../motion/primitives';
import { COLOR, FONT, RADIUS, SAFE, SHADOW, STROKE, TYPE } from '../../theme/tokens';
import { DemoCaptions, type CaptionLine } from './DocumentDemo';

export const CHARACTERS_DEMO_FPS = 30;
export const CHARACTERS_DEMO_FRAMES = 20 * CHARACTERS_DEMO_FPS;

const GROUND = 600;
const SIGN_X = 640;
const SIGN_TOP = 140;
const SIGN_AIM: [number, number] = [SIGN_X, 205];

const COLONIST: ActionKey[] = [
  { t: 0, action: 'idle' },
  { t: 4.2, action: 'point', target: SIGN_AIM },
  { t: 7.4, action: 'idle', face: 'right' },
  { t: 10.0, action: 'argue', face: 'right' },
  { t: 12.0, action: 'idle', face: 'right' },
  { t: 13.6, action: 'speak', face: 'right' },
  { t: 15.0, action: 'cheer', face: 'right' },
];

const SOLDIER: ActionKey[] = [
  { t: 0, action: 'idle' },
  { t: 10.0, action: 'idle', face: 'left' },
  { t: 12.0, action: 'argue', face: 'left' },
  { t: 13.6, action: 'idle', face: 'left' },
];

const CROWD: ActionKey[] = [
  { t: 0, action: 'idle' },
  { t: 15.0, action: 'cheer' },
];

const CAPTIONS: CaptionLine[] = [
  { from: 0.5, to: 4.0, text: '1765: Parliament’s Stamp Act taxed the colonies directly.' },
  { from: 4.2, to: 7.2, text: 'Colonists objected: they elected no one to Parliament.' },
  { from: 7.4, to: 10.0, text: 'British officials replied that Parliament spoke for every subject.' },
  { from: 10.2, to: 14.0, text: 'Colonists rejected this “virtual representation.”' },
  { from: 14.2, to: 17.5, text: 'Protest spread: boycotts, petitions and crowds in the streets.' },
  { from: 17.7, to: 19.6, text: 'In 1766, Parliament repealed the Stamp Act.' },
];

/** Street backdrop: sky, row houses, ground, the sign post (no text, so it is a bg track). */
const Street: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${COLOR.paper}, ${COLOR.paperDeep})` }}>
    <svg width={1280} height={720} style={{ position: 'absolute', inset: 0 }}>
      {[0, 1, 2, 3, 4, 5].map(i => {
        const x = i * 220 - 20;
        const h = 230 + ((i * 53) % 70);
        return (
          <g key={i} opacity={0.22}>
            <rect x={x} y={GROUND - h} width={200} height={h} fill={COLOR.brown} stroke={COLOR.ink} strokeWidth={STROKE.thin} />
            <path d={`M ${x - 6} ${GROUND - h} L ${x + 100} ${GROUND - h - 50} L ${x + 206} ${GROUND - h} Z`} fill={COLOR.inkSoft} />
            {[0, 1, 2].map(c => [0, 1].map(r => (
              <rect key={`${c}${r}`} x={x + 24 + c * 58} y={GROUND - h + 30 + r * 80} width={36} height={48} fill={COLOR.paper} stroke={COLOR.ink} strokeWidth={STROKE.hair} />
            )))}
          </g>
        );
      })}
      <rect x={0} y={GROUND} width={1280} height={120} fill={COLOR.coast} opacity={0.55} />
      <rect x={0} y={GROUND} width={1280} height={4} fill={COLOR.ink} opacity={0.35} />
      {/* sign post */}
      <rect x={SIGN_X - 7} y={SIGN_TOP + 100} width={14} height={GROUND - SIGN_TOP - 100} fill={COLOR.brown} stroke={COLOR.ink} strokeWidth={STROKE.thin} />
    </svg>
  </div>
);

const Sign: React.FC = () => (
  <div style={{ position: 'absolute', left: SIGN_X, top: SIGN_TOP, transform: 'translateX(-50%) rotate(-1.5deg)' }}>
    <div data-guard-item="sign:no-taxation" style={{ background: COLOR.brown, border: `${STROKE.bold}px solid ${COLOR.ink}`, borderRadius: RADIUS.sm, boxShadow: SHADOW.card,
      padding: '10px 22px', textAlign: 'center', fontFamily: FONT.display, fontWeight: 700, fontSize: TYPE.body, lineHeight: 1.25, letterSpacing: 2, color: COLOR.paper, whiteSpace: 'nowrap' }}>
      NO TAXATION<br />WITHOUT<br />REPRESENTATION
    </div>
  </div>
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

export const CharactersDemo: React.FC = () => (
  <MotionScene background={COLOR.paper}>
    <Track id="street" role="bg"><Street /></Track>
    <Track id="stage" role="stage">
      <Sign />
      <Crowd count={14} x0={130} x1={1150} baseline={GROUND - 14} height={150} seed={17} costumes={['gentleman', 'woman', 'farmer', 'woman', 'farmer']}
        actions={CROWD} stagger={0.5} from={13.8} faceX={SIGN_X} />
      <CutoutCharacter costume="gentleman" x={[{ t: 0.4, x: -90 }, { t: 4.0, x: 440 }]} baseline={GROUND} height={220} actions={COLONIST}
        skin={SKIN[1]} tag={{ text: 'COLONIST', from: 2.0 }} from={0.4} />
      <CutoutCharacter costume="redcoat" x={[{ t: 7.0, x: 1380 }, { t: 10.0, x: 860 }, { t: 16.2, x: 860 }, { t: 18.6, x: 1400 }]} baseline={GROUND} height={226}
        actions={SOLDIER} phase={1.3} face="left" tag={{ text: 'BRITISH SOLDIER', from: 9.4, to: 16.2 }} from={7.0} to={18.6} />
    </Track>
    <Track id="date" role="chrome">
      <Chip text="1765 · THE STAMP ACT CRISIS" from={0.4} to={6.8} />
    </Track>
    <Track id="caption" role="text">
      <DemoCaptions lines={CAPTIONS} />
    </Track>
  </MotionScene>
);
