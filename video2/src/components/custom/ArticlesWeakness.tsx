/**
 * ArticlesWeakness: the Confederation government as one small CONGRESS box on parchment. Three dashed empty slots
 * pop in around it and each takes a red X as its failure plays: coins thrown at Congress bounce off (no tax), an
 * order drawn down from Congress fizzles before it lands (no executive), two states' arrows meet at an empty court
 * slot under a red "?" (no national courts). Fits E6 L23 / L27.
 *
 * DEFAULT_PHASES (6-8 s shot): notax 0-0.34, noexec 0.34-0.67, nocourt 0.67-1. Each slot and its X persist once
 * shown. A missing phase leaves its slot hidden.
 */
import React from 'react';
import {Easing, interpolate, spring} from 'remotion';
import {FONT, RADIUS, TYPE, alpha} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, paperHalo, usePhases, type CustomProps, type Phase} from './kit';

export type ArticlesWeaknessProps = CustomProps;

export const DEFAULT_PHASES: Phase[] = [
  {name: 'notax', start: 0, end: 0.34},
  {name: 'noexec', start: 0.34, end: 0.67},
  {name: 'nocourt', start: 0.67, end: 1},
];

// Basis: Articles of Confederation (1781): Congress could requisition but not tax, had no executive and no national
// judiciary (E6 L23, L27).
/** The three missing powers, authored at 1280x720. */
const SLOTS = [
  {phase: 'notax', label: 'NO TAX', x: 256, y: 340, w: 205, h: 100},
  {phase: 'noexec', label: 'NO EXECUTIVE', x: 640, y: 560, w: 225, h: 92},
  {phase: 'nocourt', label: 'NO COURTS', x: 1024, y: 340, w: 235, h: 100},
] as const;

const CX = 640;
const CY = 330;
const BOX_W = 210;
const BOX_H = 96;

export const ArticlesWeakness: React.FC<ArticlesWeaknessProps> = ({durationInFrames, phases}) => {
  const clock = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const {frame, fps, u, t} = clock;
  const width = u(1280);
  const height = u(720);
  const halo = paperHalo(u);

  const nt = t('notax');
  const nx = t('noexec');
  const nc = t('nocourt');
  const sec = frame / fps;

  // Congress is on screen from the first frame; it pops in over the first ~0.5 s.
  const boxPop = spring({frame, fps, config: {damping: 13, mass: 0.7, stiffness: 140}});
  const failShake = Math.max(
    interpolate(nt, [0.55, 0.68, 1], [0, 1, 0], CLAMP),
    interpolate(nx, [0.5, 0.63, 1], [0, 1, 0], CLAMP),
    interpolate(nc, [0.5, 0.63, 1], [0, 1, 0], CLAMP),
  );
  const boxX = CX + failShake * Math.sin(sec * 27) * 3;

  /** Dashed empty slot + red X: the same grammar for all three failures. */
  const slot = (def: (typeof SLOTS)[number], n: number) => {
    if (n <= 0) return null;
    const pop = interpolate(n, [0, 0.18], [0, 1], {...CLAMP, easing: Easing.out(Easing.back(1.5))});
    const xPop = interpolate(n, [0.55, 0.75], [0, 1], {...CLAMP, easing: Easing.out(Easing.back(1.8))});
    const alert = n > 0.4;
    const s = 44 * xPop;
    return (
      <g key={def.phase} opacity={Math.min(1, pop)} transform={`translate(${u(def.x)} ${u(def.y)}) scale(${Math.max(0.001, pop)})`}>
        <rect x={u(-def.w / 2)} y={u(-def.h / 2)} width={u(def.w)} height={u(def.h)} rx={u(RADIUS.md)}
          fill={alpha(PAPER.red, alert ? 0.06 : 0)} stroke={alert ? PAPER.red : PAPER.muted}
          strokeWidth={u(3)} strokeDasharray={`${u(10)} ${u(8)}`} />
        <g opacity={xPop}>
          <line x1={u(-s)} y1={u(-s)} x2={u(s)} y2={u(s)} stroke={PAPER.red} strokeWidth={u(7)} strokeLinecap="round" />
          <line x1={u(s)} y1={u(-s)} x2={u(-s)} y2={u(s)} stroke={PAPER.red} strokeWidth={u(7)} strokeLinecap="round" />
        </g>
        <text x={0} y={u(def.h / 2 + 30)} textAnchor="middle" fontFamily={FONT.display} fontWeight={700}
          fontSize={u(TYPE.label)} letterSpacing={u(1.5)} fill={alert ? PAPER.red : PAPER.inkSoft} {...halo}>
          {def.label}
        </text>
      </g>
    );
  };

  // notax: coins fly in toward Congress, bounce off, spin away.
  const coinX0 = SLOTS[0].x + SLOTS[0].w / 2 + 30;
  const coinXHit = CX - BOX_W / 2 - 18;
  const coinX = interpolate(nt, [0, 0.55, 1], [coinX0, coinXHit, coinX0 + 34], CLAMP);
  const coinArc = interpolate(nt, [0.55, 0.68, 0.8, 1], [0, -16, 8, 0], CLAMP);
  const coinSpin = interpolate(nt, [0.55, 1], [0, 300], CLAMP);
  const coinOp = nt > 0 ? interpolate(nt, [0, 0.08, 0.92, 1], [0, 1, 1, 0], CLAMP) : 0;
  const ripple = interpolate(nt, [0.5, 0.82], [0, 1], CLAMP);
  const rippleOp = interpolate(nt, [0.5, 0.82], [0.7, 0], CLAMP);

  // noexec: the order draws down from Congress, then fizzles into sparks short of the slot.
  const drawP = interpolate(nx, [0.05, 0.45], [0, 1], {...CLAMP, easing: Easing.inOut(Easing.quad)});
  const ordY0 = CY + BOX_H / 2 + 10;
  const ordY1 = SLOTS[1].y - SLOTS[1].h / 2 - 12;
  const ordY = interpolate(drawP, [0, 1], [ordY0, ordY1]);
  const ordOp = nx > 0 ? interpolate(nx, [0.5, 0.62, 0.95], [1, 1, 0], CLAMP) : 0;
  const fzDist = interpolate(nx, [0.55, 1], [0, 46], CLAMP);
  const fzOp = interpolate(nx, [0.55, 0.7, 1], [0, 0.9, 0], CLAMP);

  // nocourt: two states' arrows meet at the empty slot, with nowhere to be judged.
  const move = interpolate(nc, [0.05, 0.5], [0, 1], {...CLAMP, easing: Easing.inOut(Easing.quad)});
  const courtCx = SLOTS[2].x;
  const courtHalf = SLOTS[2].w / 2;
  const jit = interpolate(nc, [0.5, 1], [0, 1], CLAMP) * Math.sin(sec * 33) * 4;
  const ax = interpolate(move, [0, 1], [courtCx - courtHalf - 150, courtCx - courtHalf - 26]) + jit;
  const bx = interpolate(move, [0, 1], [courtCx + courtHalf + 150, courtCx + courtHalf + 26]) - jit;
  const dispY = SLOTS[2].y;
  const dispOp = nc > 0 ? interpolate(nc, [0, 0.08, 0.6, 0.95], [0, 1, 1, 0], CLAMP) : 0;
  const qOp = interpolate(nc, [0.45, 0.6, 0.85], [0, 1, 0], CLAMP);

  /** Arrowhead at authored (x, y) pointing in `dir`. */
  const head = (x: number, y: number, dir: 1 | -1, color: string) => (
    <polygon points={`${u(x)},${u(y)} ${u(x - dir * 12)},${u(y - 6.6)} ${u(x - dir * 12)},${u(y + 6.6)}`} fill={color} />
  );

  return (
    <PaperSheet fontFamily={FONT.text}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0}}>
        {/* CONGRESS: the entire federal government, one small box */}
        <g opacity={Math.min(1, boxPop)} transform={`translate(${u(boxX)} ${u(CY)}) scale(${Math.max(0.001, boxPop)})`}>
          <rect x={u(-BOX_W / 2)} y={u(-BOX_H / 2)} width={u(BOX_W)} height={u(BOX_H)} rx={u(RADIUS.md)}
            fill={PAPER.panel} stroke={PAPER.ink} strokeWidth={u(3.5)}
            style={{filter: `drop-shadow(0 ${u(6)}px ${u(10)}px ${alpha(PAPER.ink, 0.3)})`}} />
          <text x={0} y={u(12)} textAnchor="middle" fontFamily={FONT.display} fontWeight={700}
            fontSize={u(34)} letterSpacing={u(3)} fill={PAPER.ink}>
            CONGRESS
          </text>
        </g>

        {SLOTS.map((s) => slot(s, t(s.phase)))}

        {/* notax: coins bounce off Congress */}
        <g opacity={coinOp}>
          <circle cx={u(coinXHit)} cy={u(CY)} r={u(10 + ripple * 34)} fill="none" stroke={PAPER.red} strokeWidth={u(3)} opacity={rippleOp} />
          {[-24, 0, 24].map((dy) => (
            <g key={dy} transform={`translate(${u(coinX)} ${u(CY + dy + coinArc)}) rotate(${coinSpin})`}>
              <circle r={u(15)} fill={PAPER.gold} stroke={PAPER.brown} strokeWidth={u(2.5)} />
              <circle r={u(9.5)} fill="none" stroke={PAPER.brown} strokeWidth={u(1.2)} />
            </g>
          ))}
        </g>

        {/* noexec: the order fizzles before it reaches the slot */}
        <g opacity={ordOp}>
          <line x1={u(CX)} y1={u(ordY0)} x2={u(CX)} y2={u(ordY)} stroke={PAPER.ink} strokeWidth={u(5)} strokeLinecap="round" />
          <polygon points={`${u(CX)},${u(ordY + 12)} ${u(CX - 8)},${u(ordY - 4)} ${u(CX + 8)},${u(ordY - 4)}`}
            fill={PAPER.ink} opacity={drawP > 0.02 ? 1 : 0} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2 + 0.5;
            return <circle key={i} cx={u(CX + Math.cos(a) * fzDist)} cy={u(ordY1 + Math.sin(a) * fzDist)} r={u(3.2)} fill={PAPER.red} opacity={fzOp} />;
          })}
        </g>

        {/* nocourt: two states, nowhere to be judged */}
        <g opacity={dispOp}>
          <line x1={u(ax - 56)} y1={u(dispY)} x2={u(ax)} y2={u(dispY)} stroke={PAPER.inkSoft} strokeWidth={u(5)} strokeLinecap="round" />
          {head(ax, dispY, 1, PAPER.inkSoft)}
          <line x1={u(bx + 56)} y1={u(dispY)} x2={u(bx)} y2={u(dispY)} stroke={PAPER.inkSoft} strokeWidth={u(5)} strokeLinecap="round" />
          {head(bx, dispY, -1, PAPER.inkSoft)}
          <text x={u(courtCx)} y={u(dispY - 70)} textAnchor="middle" fontFamily={FONT.display} fontWeight={700}
            fontSize={u(48)} fill={PAPER.red} opacity={qOp} {...halo}>?</text>
        </g>
      </svg>
    </PaperSheet>
  );
};

export default ArticlesWeakness;
