/**
 * ConstitutionFixes: the Constitution's three branches spring up on parchment (coins drop into Legislative: it can
 * tax), the Legislative box splits into House (seats by population: Virginia 10 dots, Delaware 1) and Senate (2 and
 * 2), then red check arrows draw between every pair of branches. Fits E7 L35 (Great Compromise) and E7 L95 (three
 * branches, each with ways to check the others).
 *
 * DEFAULT_PHASES (6-8 s shot): branches 0-0.3, compromise 0.3-0.65, checks 0.65-1. A missing phase reads as 0:
 * no branches means an empty sheet; no compromise keeps the single Legislative box; no checks draws no arrows.
 */
import React from 'react';
import {interpolate, spring} from 'remotion';
import {FONT, RADIUS, TYPE, alpha} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, usePhases, type CustomProps, type Phase} from './kit';

export type ConstitutionFixesProps = CustomProps;

export const DEFAULT_PHASES: Phase[] = [
  {name: 'branches', start: 0, end: 0.3},
  {name: 'compromise', start: 0.3, end: 0.65},
  {name: 'checks', start: 0.65, end: 1},
];

const BRANCHES = ['LEGISLATIVE', 'EXECUTIVE', 'JUDICIAL'] as const;

/** Branch box centers and size, authored at 1280x720. */
const BX = [290, 640, 990];
const BOX_Y = 400;
const BOX_W = 310;
const BOX_H = 230;

// Basis: U.S. Constitution Art. I, sec. 2 (first apportionment, pending a census): Virginia 10 Representatives,
// Delaware 1. Art. I, sec. 3: two Senators per state.
const HOUSE_VA = 10;
const HOUSE_DE = 1;
const SENATE_PER_STATE = 2;

/** 5-point star polygon points (already in px). */
const star = (cx: number, cy: number, r: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
};

/** Curved arrow path from a to b (px), bowed by `bow` px on the `flip` side. */
const arc = (a: [number, number], b: [number, number], bow: number, flip: 1 | -1): string => {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * flip * bow;
  const ny = (dx / len) * flip * bow;
  return `M ${a[0].toFixed(1)} ${a[1].toFixed(1)} Q ${(mx + nx).toFixed(1)} ${(my + ny).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
};

/** Every branch points at the other two (6 arrows). */
const ARROWS: {a: number; b: number; flip: 1 | -1; k: number}[] = [];
for (let i = 0, k = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (i !== j) ARROWS.push({a: i, b: j, flip: i < j ? 1 : -1, k: k++});
  }
}

export const ConstitutionFixes: React.FC<ConstitutionFixesProps> = ({durationInFrames, phases}) => {
  const clock = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const {frame, fps, u, t, has, bounds} = clock;
  const width = u(1280);
  const height = u(720);

  const branchesT = t('branches');
  const compromiseT = t('compromise');
  const checksT = t('checks');

  const chamberT = interpolate(compromiseT, [0.1, 0.55], [0, 1], CLAMP);
  const legFocus = interpolate(compromiseT, [0, 0.25], [0, 1], CLAMP) * (1 - interpolate(checksT, [0, 0.2], [0, 1], CLAMP));
  const arrowsT = interpolate(checksT, [0.05, 0.85], [0, 1], CLAMP);

  /** Spring scale per branch, staggered by 0.2 s from the branches phase start. */
  const branchScale = (i: number): number => {
    if (!has('branches')) return 0;
    const startFrame = bounds('branches')[0] + i * 0.2 * fps;
    if (frame < startFrame) return 0;
    return spring({frame: frame - startFrame, fps, config: {damping: 14, mass: 0.8, stiffness: 120}});
  };

  /** Coins dropping into the Legislative box (authored offsets from the box center). */
  const coins = [0, 1, 2].map((k) => {
    const c = interpolate(branchesT, [0.3 + k * 0.12, 0.65 + k * 0.12], [0, 1], CLAMP);
    return {c, x: -42 + k * 42, y: 75 - (1 - c) * 110};
  });

  const arrowPath = (p: {a: number; b: number; flip: 1 | -1}): string => {
    // Left-to-right checks arc over the boxes, right-to-left ones under them; the long Legislative-Judicial pair
    // leaves from the box centers and bows wider than the neighbour pairs.
    const dir = Math.sign(BX[p.b] - BX[p.a]);
    const long = Math.abs(BX[p.b] - BX[p.a]) > 400;
    const off = long ? 0 : 70;
    const y = p.flip === 1 ? BOX_Y - BOX_H / 2 - 8 : BOX_Y + BOX_H / 2 + 8;
    const s: [number, number] = [u(BX[p.a] + dir * off), u(y)];
    const e: [number, number] = [u(BX[p.b] - dir * off), u(y)];
    // with flip -1, arc bows up on a left-to-right chord and down on a right-to-left one
    return arc(s, e, u(long ? 140 : 70), -1);
  };
  const arrowT = (k: number) => interpolate(arrowsT, [k * 0.08, 0.5 + k * 0.08], [0, 1], CLAMP);

  /** Seat dots centered at authored (cx, cy). */
  const seats = (cx: number, cy: number, n: number, color: string) =>
    Array.from({length: n}, (_, i) => {
      const perRow = 5;
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inRow = Math.min(perRow, n - row * perRow);
      return <circle key={i} cx={u(cx + (col - (inRow - 1) / 2) * 15.6)} cy={u(cy + row * 17)} r={u(6.5)} fill={color} />;
    });

  const label = (x: number, y: number, text: string, size: number, color: string = PAPER.ink) => (
    <text x={u(x)} y={u(y)} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={u(size)} letterSpacing={u(1.5)} fill={color}>
      {text}
    </text>
  );

  return (
    <PaperSheet fontFamily={FONT.text}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs>
          <marker id="cf-ah" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={PAPER.red} />
          </marker>
        </defs>

        {BRANCHES.map((name, i) => {
          const s = branchScale(i);
          if (s <= 0) return null;
          const isLeg = i === 0;
          const dimmed = isLeg ? 1 : 1 - legFocus * 0.7;
          const x = BX[i];
          return (
            <g key={name} opacity={dimmed} transform={`translate(${u(x)} ${u(BOX_Y)}) scale(${s})`}>
              <rect x={u(-BOX_W / 2)} y={u(-BOX_H / 2)} width={u(BOX_W)} height={u(BOX_H)} rx={u(RADIUS.lg)}
                fill={PAPER.panel} stroke={PAPER.ink} strokeWidth={u(3)} />
              <rect x={u(-BOX_W / 2)} y={u(-BOX_H / 2)} width={u(BOX_W)} height={u(64)} rx={u(RADIUS.lg)} fill={PAPER.ink} />
              <rect x={u(-BOX_W / 2)} y={u(-BOX_H / 2 + 40)} width={u(BOX_W)} height={u(24)} fill={PAPER.ink} />
              {label(0, -BOX_H / 2 + 42, name, TYPE.h3 - 4, PAPER.bg)}

              {isLeg && chamberT <= 0 && coins.map((c, k) => (
                <circle key={k} cx={u(c.x)} cy={u(c.y)} r={u(13)} fill={PAPER.gold} stroke={PAPER.brown} strokeWidth={u(2)} opacity={c.c} />
              ))}
              {i === 1 && (
                <g opacity={1 - legFocus * 0.5}>
                  <circle cx={0} cy={u(40)} r={u(34)} fill={PAPER.gold} stroke={PAPER.brown} strokeWidth={u(3)} />
                  <polygon points={star(0, u(40), u(16))} fill={PAPER.bg} />
                </g>
              )}
              {i === 2 && (
                <g transform={`translate(0 ${u(40)}) rotate(-32)`}>
                  <rect x={u(-8)} y={u(-34)} width={u(16)} height={u(72)} rx={u(8)} fill={PAPER.brown} />
                  <rect x={u(-30)} y={u(-58)} width={u(60)} height={u(24)} rx={u(8)} fill={PAPER.inkSoft} />
                </g>
              )}

              {/* compromise: House (by population) + Senate (2 per state) inside Legislative */}
              {isLeg && chamberT > 0 && (
                <g opacity={chamberT}>
                  <rect x={u(-140 + (1 - chamberT) * 65)} y={u(-40)} width={u(130)} height={u(150)} rx={u(RADIUS.md)}
                    fill={alpha(PAPER.gold, 0.14)} stroke={PAPER.gold} strokeWidth={u(2.5)} />
                  <rect x={u(10 - (1 - chamberT) * 65)} y={u(-40)} width={u(130)} height={u(150)} rx={u(RADIUS.md)}
                    fill={alpha(PAPER.red, 0.1)} stroke={PAPER.red} strokeWidth={u(2.5)} />
                  {label(-75, -14, 'HOUSE', TYPE.label)}
                  {label(75, -14, 'SENATE', TYPE.label)}
                  {label(-75, 14, 'VA', TYPE.micro, PAPER.inkSoft)}
                  {seats(-75, 28, HOUSE_VA, PAPER.gold)}
                  {label(-75, 78, 'DE', TYPE.micro, PAPER.inkSoft)}
                  {seats(-75, 92, HOUSE_DE, PAPER.gold)}
                  {label(75, 14, 'VA', TYPE.micro, PAPER.inkSoft)}
                  {seats(75, 28, SENATE_PER_STATE, PAPER.red)}
                  {label(75, 78, 'DE', TYPE.micro, PAPER.inkSoft)}
                  {seats(75, 92, SENATE_PER_STATE, PAPER.red)}
                </g>
              )}
            </g>
          );
        })}

        {/* checks: curved arrows between every pair of branches */}
        {checksT > 0 && ARROWS.map((p) => (
          <path key={p.k} d={arrowPath(p)} fill="none" stroke={PAPER.red} strokeWidth={u(3.5)} strokeLinecap="round"
            pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - arrowT(p.k)} markerEnd="url(#cf-ah)"
            opacity={arrowT(p.k) > 0 ? 0.9 : 0} />
        ))}
      </svg>
    </PaperSheet>
  );
};

export default ConstitutionFixes;
