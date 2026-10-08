/**
 * Cut-out characters: flat 2D puppets built from SVG parts (head, torso, upper/lower arms,
 * legs) in period costumes, posed by keyframes. Deterministic and frame-driven.
 *
 * - <CutoutCharacter>: one puppet. Screen-space position: `x` (number or `{t, x}` keys, walked
 *   at constant speed between keys) and a ground `baseline`; `height` = px from soles to crown.
 *   `actions` = `{t, action, face?, target?}` keys; poses blend over 0.35 s. Moving between x
 *   keys plays the walk cycle on the legs (and arms, unless the action uses them). While walking
 *   the puppet is marked data-guard-moving, so entering from / leaving to the frame edge is legal.
 * - <Crowd>: N puppets with seeded variation (costume, height, skin, phase, delay), two rows.
 * - <CutoutFigure>: the bare SVG for a given pose (for previews/tests).
 *
 * Local puppet units: feet at y = 0, crown at about y = -188, facing +x (right).
 * Angles are degrees from straight down; positive swings forward (toward the facing side).
 */
import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { COLOR, FONT, STROKE, TYPE, RADIUS } from '../theme/tokens';
import { fadeWindow, rng } from './primitives';

const INK = COLOR.ink;

/* ------------------------------------ costumes ------------------------------------ */

export type CostumeId = 'gentleman' | 'continental' | 'redcoat' | 'woman' | 'farmer';

interface Costume {
  coat: string; trim: string; vest: string; shirt: string; sleeve: string; forearm: string | null;
  thigh: string; shin: string; shoes: string; hat: 'tricorn' | 'straw' | 'mobcap'; hatColor: string; hatTrim?: string;
  hair: string; tails: boolean; skirt?: string; apron?: string; crossbelt?: boolean;
}

/**
 * Costume-only colors (the one allowed palette exception, see src/theme/tokens.ts). Uniform
 * colors that have a theme role come from COLOR (patriot blue, british red, paper, ink).
 */
const COSTUME_PALETTE = {
  brownCoat: '#7a4b2a', brownTrim: '#5c3820', goldVest: '#c9a24a', linen: '#f4ecdc', breeches: '#c8b58a',
  stocking: '#f2ead8', black: '#2b2420', blackDeep: '#1d1814', powdered: '#d8d2c4', buff: '#e3cf9a',
  hairBrown: '#5a3b22', hairAuburn: '#6b4a2b', hairDark: '#4a2f1c', hairBlack: '#3e2a1a',
  gown: '#6d7f5a', apron: '#efe6d2', cap: '#f6f0e2', capLine: '#b9a98a', shoeBrown: '#3a2a1c',
  vestBrown: '#6b4a2b', vestTrim: '#4f3620', trousers: '#8a7350', shoeTan: '#4a3626', straw: '#d9b45a',
  cockade: '#6b5a3a', mouth: '#5a1e14',
  skin: ['#f1c9a5', '#e3b08a', '#c68b62', '#9a6440', '#6e4529'],
} as const;

export const COSTUMES: Record<CostumeId, Costume> = {
  // colonial gentleman: brown frock coat, gold waistcoat, breeches, powdered hair, tricorn
  gentleman: { coat: COSTUME_PALETTE.brownCoat, trim: COSTUME_PALETTE.brownTrim, vest: COSTUME_PALETTE.goldVest, shirt: COSTUME_PALETTE.linen, sleeve: COSTUME_PALETTE.brownCoat, forearm: null,
    thigh: COSTUME_PALETTE.breeches, shin: COSTUME_PALETTE.stocking, shoes: COSTUME_PALETTE.black, hat: 'tricorn', hatColor: COSTUME_PALETTE.black, hair: COSTUME_PALETTE.powdered, tails: true },
  // Continental soldier: blue coat with buff facings, buff breeches
  continental: { coat: COLOR.patriot, trim: COSTUME_PALETTE.buff, vest: COSTUME_PALETTE.buff, shirt: COSTUME_PALETTE.linen, sleeve: COLOR.patriot, forearm: null,
    thigh: COSTUME_PALETTE.buff, shin: COSTUME_PALETTE.stocking, shoes: COSTUME_PALETTE.black, hat: 'tricorn', hatColor: COSTUME_PALETTE.blackDeep, hatTrim: COSTUME_PALETTE.apron, hair: COSTUME_PALETTE.hairBrown, tails: true },
  // British regular: red coat, white cross belts, white breeches, black gaiters
  redcoat: { coat: COLOR.british, trim: COSTUME_PALETTE.stocking, vest: COSTUME_PALETTE.stocking, shirt: COSTUME_PALETTE.linen, sleeve: COLOR.british, forearm: null,
    thigh: COSTUME_PALETTE.stocking, shin: COSTUME_PALETTE.black, shoes: COSTUME_PALETTE.blackDeep, hat: 'tricorn', hatColor: COSTUME_PALETTE.blackDeep, hatTrim: COSTUME_PALETTE.apron, hair: COSTUME_PALETTE.hairAuburn, tails: true, crossbelt: true },
  // 18th/19th-c. woman: long gown, shawl, mob cap
  woman: { coat: COSTUME_PALETTE.gown, trim: COSTUME_PALETTE.apron, vest: COSTUME_PALETTE.gown, shirt: COSTUME_PALETTE.apron, sleeve: COSTUME_PALETTE.gown, forearm: 'skin',
    thigh: COSTUME_PALETTE.gown, shin: COSTUME_PALETTE.apron, shoes: COSTUME_PALETTE.shoeBrown, hat: 'mobcap', hatColor: COSTUME_PALETTE.cap, hair: COSTUME_PALETTE.hairDark, tails: false, skirt: COSTUME_PALETTE.gown, apron: COSTUME_PALETTE.apron },
  // worker / farmer: shirt sleeves rolled, waistcoat, trousers, straw hat
  farmer: { coat: COSTUME_PALETTE.vestBrown, trim: COSTUME_PALETTE.vestTrim, vest: COSTUME_PALETTE.vestBrown, shirt: COSTUME_PALETTE.apron, sleeve: COSTUME_PALETTE.apron, forearm: 'skin',
    thigh: COSTUME_PALETTE.trousers, shin: COSTUME_PALETTE.trousers, shoes: COSTUME_PALETTE.shoeTan, hat: 'straw', hatColor: COSTUME_PALETTE.straw, hair: COSTUME_PALETTE.hairBlack, tails: false },
};

export const SKIN = COSTUME_PALETTE.skin;

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0');
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
};

/* -------------------------------------- pose -------------------------------------- */

export type Action = 'idle' | 'walk' | 'point' | 'speak' | 'cheer' | 'argue';

export interface Pose {
  lean: number; tilt: number; jaw: number; bob: number;
  /** back (far) leg/arm = l*, front (near) = r* */
  lHip: number; lKnee: number; rHip: number; rKnee: number;
  lSh: number; lEl: number; rSh: number; rEl: number;
  /** walk phase (radians) for skirt sway */
  swing: number;
}

const ZERO: Pose = { lean: 0, tilt: 0, jaw: 0, bob: 0, lHip: 0, lKnee: 0, rHip: 0, rKnee: 0, lSh: 0, lEl: 0, rSh: 0, rEl: 0, swing: 0 };
const KEYS = Object.keys(ZERO) as (keyof Pose)[];
const mix = (a: Pose, b: Pose, u: number): Pose => Object.fromEntries(KEYS.map(k => [k, a[k] + (b[k] - a[k]) * u])) as unknown as Pose;
const smooth = (v: number) => { const c = Math.min(1, Math.max(0, v)); return c * c * (3 - 2 * c); };

/* body geometry (units) */
const HIP_Y = -92, SH_Y = -148, NECK_Y = -156, HEAD_Y = -172, HEAD_R = 16;
const THIGH = 46, SHIN = 44, UPPER = 30, FORE = 28;
const SHOULDER: [number, number] = [0, SH_Y];
const deg = Math.PI / 180;
const seg = (o: [number, number], a: number, len: number): [number, number] => [o[0] + Math.sin(a * deg) * len, o[1] + Math.cos(a * deg) * len];

/**
 * Pose for one action at local time `ta` (s since it began) and global time `t`.
 * `pointAngle` = shoulder angle that aims the front arm at the target (computed by the caller).
 */
export function actionPose(action: Action, t: number, ta: number, ph: number, pointAngle = 120): Pose {
  const breathe = Math.sin(t * 2 + ph);
  const base: Pose = { ...ZERO, bob: breathe * 0.9, lean: breathe * 0.6, lHip: -3, rHip: 3, lSh: -5 + breathe * 2, lEl: 8, rSh: 5 - breathe * 2, rEl: 10 };
  const talk = Math.abs(Math.sin(t * 13 + ph)) * (0.55 + 0.45 * Math.sin(t * 3.1 + ph));
  switch (action) {
    case 'idle':
    case 'walk':
      return base;
    case 'speak':
      return { ...base, tilt: Math.sin(t * 6 + ph) * 3, jaw: Math.max(0, talk), rSh: 32 + Math.sin(t * 3 + ph) * 10, rEl: 55 + Math.sin(t * 2.3) * 10 };
    case 'point': {
      const raise = smooth(ta / 0.45);
      return { ...base, tilt: -4 * raise, rSh: 5 + (pointAngle - 5) * raise, rEl: 30 * (1 - raise) + 4 };
    }
    case 'cheer': {
      const jump = Math.abs(Math.sin(t * 5.5 + ph));
      return { ...base, bob: -jump * 9, lHip: -6 + jump * 4, rHip: 8 - jump * 4, lKnee: -jump * 14, rKnee: -jump * 10, jaw: 0.75, tilt: -6,
        lSh: -148 + Math.sin(t * 9 + ph) * 12, lEl: -12 + Math.sin(t * 9 + ph + 1) * 10, rSh: 150 + Math.sin(t * 9 + ph + 2) * 12, rEl: 12 + Math.sin(t * 9 + ph + 3) * 10 };
    }
    case 'argue':
      return { ...base, lean: 6 + Math.sin(t * 2.2 + ph) * 2, tilt: Math.sin(t * 7 + ph) * 4, jaw: Math.max(0, talk),
        rSh: 70 + Math.sin(t * 4.6 + ph) * 26, rEl: 45 + Math.sin(t * 4.6 + ph + 1) * 25, lSh: -28, lEl: 95 };
  }
}

/** Walk cycle overlay: legs (and arms when `arms`) by stride phase φ. */
function walkOverlay(p: Pose, phi: number, arms: boolean): Pose {
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const out: Pose = { ...p, rHip: 26 * s, lHip: -26 * s, rKnee: -40 * Math.max(0, c), lKnee: -40 * Math.max(0, -c), bob: -Math.abs(s) * 3 + 1.5, swing: phi };
  if (arms) { out.rSh = -22 * s; out.lSh = 22 * s; out.rEl = 14; out.lEl = 14; }
  return out;
}

/* ------------------------------------ drawing ------------------------------------ */

const Limb: React.FC<{ a: [number, number]; b: [number, number]; w: number; color: string }> = ({ a, b, w, color }) => (
  <>
    <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={INK} strokeWidth={w + 3} strokeLinecap="round" />
    <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" />
  </>
);

const Arm: React.FC<{ sh: number; el: number; sleeve: string; fore: string; skin: string; cuff: string; dark?: number }> = ({ sh, el, sleeve, fore, skin, cuff, dark = 1 }) => {
  const elbow = seg(SHOULDER, sh, UPPER);
  const wrist = seg(elbow, sh + el, FORE);
  const cuffAt = seg(elbow, sh + el, FORE - 6);
  return (
    <g>
      <Limb a={SHOULDER} b={elbow} w={10} color={shade(sleeve, dark)} />
      <Limb a={elbow} b={wrist} w={9} color={shade(fore, dark)} />
      {fore !== skin && <circle cx={cuffAt[0]} cy={cuffAt[1]} r={5} fill={shade(cuff, dark)} stroke={INK} strokeWidth={1.5} />}
      <circle cx={wrist[0]} cy={wrist[1]} r={5} fill={shade(skin, dark)} stroke={INK} strokeWidth={1.5} />
    </g>
  );
};

const Leg: React.FC<{ hipX: number; hip: number; knee: number; c: Costume; dark?: number }> = ({ hipX, hip, knee, c, dark = 1 }) => {
  const h: [number, number] = [hipX, HIP_Y];
  const k = seg(h, hip, THIGH);
  const a = seg(k, hip + knee, SHIN);
  // shoe stays near flat, pointing forward
  const toe: [number, number] = [a[0] + 13, a[1] + 1];
  return (
    <g>
      <Limb a={h} b={k} w={13} color={shade(c.thigh, dark)} />
      <Limb a={k} b={a} w={11} color={shade(c.shin, dark)} />
      <path d={`M ${a[0] - 5} ${a[1] - 4} L ${toe[0]} ${toe[1] - 3} Q ${toe[0] + 3} ${toe[1] + 2} ${toe[0] - 1} ${toe[1] + 3} L ${a[0] - 5} ${a[1] + 3} Z`}
        fill={shade(c.shoes, dark)} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
    </g>
  );
};

const Hat: React.FC<{ c: Costume }> = ({ c }) => {
  if (c.hat === 'tricorn') {
    return (
      <g>
        <path d="M -22 -182 L 24 -184 L 17 -192 Q 2 -208 -15 -192 Z" fill={c.hatColor} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
        {c.hatTrim && <path d="M -22 -182 L 24 -184" stroke={c.hatTrim} strokeWidth={2} fill="none" />}
        <circle cx={14} cy={-188} r={2.2} fill={c.hatTrim ?? COSTUME_PALETTE.cockade} />
      </g>
    );
  }
  if (c.hat === 'straw') {
    return (
      <g>
        <ellipse cx={1} cy={-185} rx={28} ry={5} fill={c.hatColor} stroke={INK} strokeWidth={1.8} />
        <path d="M -12 -186 L -10 -201 Q 1 -205 12 -201 L 14 -186 Z" fill={c.hatColor} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
        <path d="M -11 -190 L 13 -190" stroke={COLOR.brown} strokeWidth={2.5} />
      </g>
    );
  }
  return (
    <g>
      <path d="M -18 -176 Q -20 -196 0 -197 Q 20 -196 18 -178 Q 10 -183 0 -183 Q -10 -183 -18 -176 Z" fill={c.hatColor} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M -17 -179 Q 0 -186 17 -180" stroke={COSTUME_PALETTE.capLine} strokeWidth={1.2} fill="none" />
    </g>
  );
};

const Head: React.FC<{ c: Costume; skin: string; jaw: number }> = ({ c, skin, jaw }) => (
  <g>
    {/* hair (behind) + queue ribbon for men */}
    <ellipse cx={-4} cy={HEAD_Y - 3} rx={14} ry={14} fill={c.hair} stroke={INK} strokeWidth={1.6} />
    {c.hat !== 'mobcap' && <path d="M -16 -168 Q -22 -160 -19 -152" stroke={c.hair} strokeWidth={5} strokeLinecap="round" fill="none" />}
    {c.hat !== 'mobcap' && <path d="M -18 -166 l -5 -3 m 5 3 l -4 4" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />}
    <rect x={-4} y={NECK_Y - 6} width={9} height={12} fill={skin} stroke={INK} strokeWidth={1.4} />
    <circle cx={2} cy={HEAD_Y} r={HEAD_R} fill={skin} stroke={INK} strokeWidth={1.8} />
    {/* hairline over the back/top of the face */}
    <path d={`M -13 ${HEAD_Y - 6} Q -6 ${HEAD_Y - 20} 12 ${HEAD_Y - 13} Q 2 ${HEAD_Y - 12} -3 ${HEAD_Y - 2} Z`} fill={c.hair} />
    <circle cx={-2} cy={HEAD_Y + 1} r={3} fill={shade(skin, 0.88)} stroke={INK} strokeWidth={1} />
    <circle cx={10} cy={HEAD_Y - 3} r={1.7} fill={INK} />
    <path d={`M 7 ${HEAD_Y - 7} l 6 -1`} stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
    <path d={`M 17 ${HEAD_Y - 3} L 21 ${HEAD_Y + 3} L 17 ${HEAD_Y + 4}`} fill={skin} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
    {jaw > 0.08
      ? <ellipse cx={12} cy={HEAD_Y + 9} rx={3.2} ry={0.8 + jaw * 3.2} fill={COSTUME_PALETTE.mouth} stroke={INK} strokeWidth={1} />
      : <path d={`M 9 ${HEAD_Y + 9} q 3 1.5 6 0`} stroke={INK} strokeWidth={1.4} fill="none" strokeLinecap="round" />}
  </g>
);

const Torso: React.FC<{ c: Costume; swing: number }> = ({ c, swing }) => {
  const sway = Math.sin(swing) * 3;
  return (
    <g>
      {c.tails && <path d="M -11 -104 L -17 -58 L -3 -62 L 2 -96 Z" fill={shade(c.coat, 0.85)} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />}
      {c.skirt && (
        <path d={`M -12 -106 L 12 -106 L ${26 + sway} -4 Q ${2 + sway} 2 ${-24 + sway} -4 Z`} fill={c.skirt} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      )}
      {c.apron && <path d={`M 4 -104 L 13 -104 L ${22 + sway} -14 L ${8 + sway} -12 Z`} fill={c.apron} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />}
      {/* body */}
      <path d="M -11 -153 Q 1 -158 12 -152 L 14 -120 L 12 -88 L -12 -88 L -13 -122 Z" fill={c.skirt ? c.coat : c.shirt} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      {!c.skirt && <path d="M 3 -150 L 12 -151 L 14 -120 L 12 -90 L 3 -90 Z" fill={c.vest} stroke={INK} strokeWidth={1.2} />}
      {!c.skirt && c.hat !== 'straw' && (
        // coat: back panel + front edge, open over the waistcoat
        <path d="M -11 -153 Q -3 -157 4 -154 L 4 -128 L 9 -86 L -13 -84 L -13 -122 Z" fill={c.coat} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      )}
      {c.hat === 'straw' && <path d="M -11 -153 Q -3 -157 2 -155 L 3 -90 L -12 -90 L -13 -122 Z" fill={c.coat} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />}
      {!c.skirt && c.trim !== c.coat && <path d="M 4 -154 L 4 -128 L 9 -86" stroke={c.trim} strokeWidth={3} fill="none" />}
      {!c.skirt && [0, 1, 2, 3].map(i => <circle key={i} cx={8.5} cy={-142 + i * 11} r={1.3} fill={INK} />)}
      {c.crossbelt && <path d="M -9 -152 L 12 -98 M 10 -152 L -11 -100" stroke={c.trim} strokeWidth={3.5} fill="none" />}
      {c.skirt && <path d="M -13 -154 Q 0 -146 13 -153 L 6 -128 Q 0 -124 -6 -128 Z" fill={c.trim} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />}
      {/* cravat / collar */}
      {!c.skirt && <path d="M 1 -155 L 9 -155 L 6 -146 Z" fill={c.shirt} stroke={INK} strokeWidth={1.2} />}
      {c.skirt && <path d="M -12 -106 L 12 -106" stroke={INK} strokeWidth={1.4} />}
    </g>
  );
};

/** The bare puppet SVG group (local units). */
export const CutoutFigure: React.FC<{ costume: CostumeId; pose: Pose; skin?: string }> = ({ costume, pose, skin = SKIN[1] }) => {
  const c = COSTUMES[costume];
  const fore = c.forearm === 'skin' ? skin : c.sleeve;
  const p = pose;
  return (
    <g transform={`translate(0 ${p.bob})`}>
      <g transform={`rotate(${-p.lean} 0 ${HIP_Y})`}>
        <Arm sh={p.lSh} el={p.lEl} sleeve={c.sleeve} fore={fore} skin={skin} cuff={c.shirt} dark={0.82} />
      </g>
      {/* a long skirt hides the stride: legs swing less so they stay under the hem */}
      <Leg hipX={-3} hip={p.lHip * (c.skirt ? 0.4 : 1)} knee={p.lKnee * (c.skirt ? 0.3 : 1)} c={c} dark={0.82} />
      <Leg hipX={3} hip={p.rHip * (c.skirt ? 0.4 : 1)} knee={p.rKnee * (c.skirt ? 0.3 : 1)} c={c} />
      <g transform={`rotate(${-p.lean} 0 ${HIP_Y})`}>
        <Torso c={c} swing={p.swing} />
        <g transform={`rotate(${-p.tilt} 0 ${NECK_Y})`}>
          <Head c={c} skin={skin} jaw={p.jaw} />
          <Hat c={c} />
        </g>
        <Arm sh={p.rSh} el={p.rEl} sleeve={c.sleeve} fore={fore} skin={skin} cuff={c.shirt} />
      </g>
    </g>
  );
};

/* ------------------------------------ keyframes ------------------------------------ */

export interface XKey { t: number; x: number }
export interface ActionKey { t: number; action: Action; face?: 'left' | 'right'; target?: [number, number] }

const UNITS_H = 190;               // soles → crown (with a little hat)
const STRIDE = 92;                 // units of ground per full walk cycle

function xAt(keys: XKey[], t: number) {
  if (t <= keys[0].t) return { x: keys[0].x, v: 0, dist: 0, lastDir: 0 };
  let dist = 0;
  let lastDir = 0;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    const dx = b.x - a.x;
    if (t < b.t) {
      const u = (t - a.t) / (b.t - a.t);
      if (dx !== 0) lastDir = Math.sign(dx);
      return { x: a.x + dx * u, v: dx / (b.t - a.t), dist: dist + Math.abs(dx) * u, lastDir };
    }
    dist += Math.abs(dx);
    if (dx !== 0) lastDir = Math.sign(dx);
  }
  return { x: keys[keys.length - 1].x, v: 0, dist, lastDir };
}

/** End time of the last finished x move before t (an action's `face` set after it wins). */
function lastMoveEnd(keys: XKey[], t: number) {
  let end = -Infinity;
  for (let i = 0; i < keys.length - 1; i++) if (keys[i + 1].t <= t && keys[i + 1].x !== keys[i].x) end = keys[i + 1].t;
  return end;
}

export interface CharacterProps {
  costume: CostumeId;
  /** screen px of the feet centre: constant, or keys walked at constant speed between */
  x: number | XKey[];
  /** screen px of the ground line */
  baseline: number;
  /** screen px soles → crown */
  height: number;
  actions?: ActionKey[];
  face?: 'left' | 'right';
  skin?: string;
  phase?: number;
  /** name tag above the head (data-guard-item) */
  tag?: { text: string; from?: number; to?: number };
  /** visible window (s) */
  from?: number;
  to?: number;
  /** extra wrapper style (e.g. a filter for back rows) */
  style?: React.CSSProperties;
}

/** Pose + facing + position of a character at time t (pure; used by the component and tests). */
export function characterState(p: CharacterProps, t: number) {
  const keys = typeof p.x === 'number' ? [{ t: 0, x: p.x }] : p.x;
  const { x, v, dist, lastDir } = xAt(keys, t);
  const scale = p.height / UNITS_H;
  const acts = p.actions?.length ? p.actions : [{ t: 0, action: 'idle' as Action }];
  let i = -1;
  for (let n = 0; n < acts.length; n++) if (acts[n].t <= t) i = n;
  const cur = i >= 0 ? acts[i] : { t: 0, action: 'idle' as Action };
  const prev = i >= 1 ? acts[i - 1] : cur;
  const walking = Math.abs(v) > 1;
  // facing: walking direction > current action's face > last walked direction > prop
  let faceSign = p.face === 'left' ? -1 : 1;
  if (lastDir) faceSign = lastDir;
  for (let n = 0; n <= i; n++) {
    const f = acts[n].face;
    if (f && acts[n].t >= lastMoveEnd(keys, t)) faceSign = f === 'left' ? -1 : 1;
  }
  if (walking) faceSign = Math.sign(v);
  const ph = p.phase ?? 0;
  const aim = (a: ActionKey) => {
    if (!a.target) return 120;
    const sx = x;
    const sy = p.baseline + (SH_Y) * scale;
    const dx = (a.target[0] - sx) * faceSign;
    const dy = a.target[1] - sy;
    return Math.atan2(dx, dy) / deg;
  };
  let pose = actionPose(cur.action, t, t - cur.t, ph, aim(cur));
  if (prev !== cur) {
    const u = smooth((t - cur.t) / 0.35);
    if (u < 1) pose = mix(actionPose(prev.action, t, t - prev.t, ph, aim(prev)), pose, u);
  }
  if (walking || cur.action === 'walk') {
    const freeArms = cur.action === 'idle' || cur.action === 'walk' || cur.action === 'speak';
    pose = walkOverlay(pose, (dist / scale / STRIDE) * Math.PI * 2 + ph, freeArms);
  }
  return { x, scale, pose, faceSign, walking };
}

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/** A cut-out puppet in screen space. */
export const CutoutCharacter: React.FC<CharacterProps> = props => {
  const t = useT();
  const vis = props.from === undefined && props.to === undefined ? 1 : fadeWindow(t, props.from ?? -1, props.to ?? 1e9, 0.3);
  if (vis <= 0) return null;
  const { x, scale, pose, faceSign, walking } = characterState(props, t);
  const w = 130 * scale;
  const h = 225 * scale;
  const tagO = props.tag ? fadeWindow(t, props.tag.from ?? -1, props.tag.to ?? 1e9, 0.3) : 0;
  return (
    <div data-guard-moving={walking ? '1' : undefined} style={{ position: 'absolute', left: 0, top: 0, opacity: vis, ...props.style }}>
      <svg width={w} height={h} viewBox="-65 -215 130 225" style={{ position: 'absolute', left: x - w / 2, top: props.baseline - 215 * scale, overflow: 'visible' }}>
        <ellipse cx={0} cy={2} rx={24} ry={4} fill={INK} opacity={0.2} />
        <g transform={`scale(${faceSign} 1)`}>
          <CutoutFigure costume={props.costume} pose={pose} skin={props.skin} />
        </g>
      </svg>
      {props.tag && tagO > 0 && (
        <div data-guard-item={`tag:${props.tag.text}`} style={{ position: 'absolute', left: x, top: props.baseline - (UNITS_H + 26) * scale - 30, transform: 'translateX(-50%)', opacity: tagO,
          background: COLOR.halo, border: `${STROKE.thin}px solid ${INK}`, borderRadius: RADIUS.sm, padding: '3px 10px', whiteSpace: 'nowrap',
          fontFamily: FONT.ui, fontSize: TYPE.town, fontWeight: 700, letterSpacing: 2, color: INK }}>
          {props.tag.text}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------- crowd -------------------------------------- */

export interface CrowdProps {
  count: number;
  /** screen px span of the front row */
  x0: number; x1: number;
  baseline: number;
  /** px height of an average front-row member */
  height: number;
  seed?: number;
  costumes?: CostumeId[];
  /** shared action keys; each member gets a seeded delay of up to `stagger` s */
  actions?: ActionKey[];
  stagger?: number;
  rows?: 1 | 2;
  from?: number; to?: number;
  /** members face toward this screen x (default: the middle of the span) */
  faceX?: number;
}

/** N puppets with seeded variation (costume, height, skin, phase, timing), back row first. */
export const Crowd: React.FC<CrowdProps> = ({ count, x0, x1, baseline, height, seed = 1, costumes = ['gentleman', 'woman', 'farmer', 'continental', 'farmer', 'woman'], actions, stagger = 0.4, rows = 2, from, to, faceX }) => {
  const members = useMemo(() => {
    const r = rng(seed);
    const fx = faceX ?? (x0 + x1) / 2;
    return Array.from({ length: count }, (_, i) => {
      const row = rows === 2 ? i % 2 : 0;                     // 1 = back row
      const n = rows === 2 ? Math.floor(i / 2) : i;
      const perRow = rows === 2 ? Math.ceil(count / 2) : count;
      const span = (x1 - x0) * (row ? 0.9 : 1);
      const left = x0 + (x1 - x0 - span) / 2;
      const x = left + ((n + 0.5 + (r() - 0.5) * 0.5) / perRow) * span;
      const delay = r() * stagger;
      return {
        key: i, row, x,
        costume: costumes[Math.floor(r() * costumes.length)],
        h: height * (0.88 + r() * 0.18) * (row ? 0.9 : 1),
        skin: SKIN[Math.floor(r() * SKIN.length)],
        phase: r() * 6.28,
        face: (x < fx ? 'right' : 'left') as 'left' | 'right',
        actions: actions?.map(a => ({ ...a, t: a.t + delay })),
      };
    }).sort((a, b) => b.row - a.row);
  }, [count, x0, x1, height, seed, costumes, actions, stagger, rows, faceX]);
  return (
    <>
      {members.map(m => (
        <CutoutCharacter key={m.key} costume={m.costume} x={m.x} baseline={baseline - m.row * 16} height={m.h} skin={m.skin} phase={m.phase}
          face={m.face} actions={m.actions?.map(a => ({ ...a, face: a.face ?? m.face }))} from={from} to={to}
          style={m.row ? { filter: 'saturate(0.75) brightness(0.93)' } : undefined} />
      ))}
    </>
  );
};
