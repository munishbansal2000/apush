/**
 * Election1800: Electoral College bars grow on parchment (Jefferson 73, Burr 73, Adams 65), the two tied bars glow;
 * below them the House ballot counter ticks 1 to 35 under a red DEADLOCK stamp, then the 36th ballot lands in gold
 * and Jefferson's bar takes the win while Burr's fades. Fits E11 L8 (73-73-65), L16 (35 ballots, then the 36th),
 * cram L199.
 *
 * DEFAULT_PHASES (6-8 s shot): tie 0-0.3, deadlock 0.3-0.75, break 0.75-1. A missing phase reads as 0: no tie means
 * empty bars, no deadlock hides the counter, no break never reaches ballot 36.
 */
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {FONT, RADIUS, TYPE, alpha} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, paperHalo, usePhases, type CustomProps, type Phase} from './kit';

export type Election1800Props = CustomProps;

export const DEFAULT_PHASES: Phase[] = [
  {name: 'tie', start: 0, end: 0.3},
  {name: 'deadlock', start: 0.3, end: 0.75},
  {name: 'break', start: 0.75, end: 1},
];

// Basis: 1800 electoral vote, Jefferson 73, Burr 73, Adams 65 (E11 L8; 5steps2024 ch12). Democratic-Republicans
// drawn blue, Federalists red.
const CANDIDATES = [
  {name: 'Jefferson', color: PAPER.blue, votes: 73},
  {name: 'Burr', color: PAPER.blue, votes: 73},
  {name: 'Adams', color: PAPER.red, votes: 65},
] as const;

// Basis: the House, voting by state, deadlocked for 35 ballots; Jefferson won on the 36th, Feb 17, 1801 (E11 L16;
// 5steps2024 ch12; registry F-U3-050).
const DEADLOCKED_BALLOTS = 35;

/** Bar track, authored at 1280x720. */
const TRACK = {x: 400, w: 640, h: 44};
const BAR_Y = [110, 190, 270];
const BAR_MAX = 75;

export const Election1800: React.FC<Election1800Props> = ({durationInFrames, phases}) => {
  const clock = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const {frame, fps, u, t} = clock;
  const width = u(1280);
  const height = u(720);
  const halo = paperHalo(u);
  const ease = Easing.inOut(Easing.cubic);

  const tieT = ease(t('tie'));
  const dlT = t('deadlock');
  const brT = t('break');

  // Gentle shimmer from seconds, never absolute frames.
  const shimmer = (hz: number) => 0.5 + 0.5 * Math.abs(Math.sin((frame / fps) * Math.PI * hz));

  // tie: the bars grow, the two 73s glow
  const grow = interpolate(tieT, [0.05, 0.7], [0, 1], {...CLAMP, easing: Easing.out(Easing.cubic)});
  const tieGlow = interpolate(tieT, [0.7, 0.9], [0, 1], CLAMP) * (1 - interpolate(brT, [0.4, 0.7], [0, 1], CLAMP))
    * (0.35 + 0.65 * shimmer(1.4));

  // deadlock: ballots 1..35 tick by, the stamp thumps each one
  const counterOp = interpolate(dlT, [0, 0.08], [0, 1], CLAMP);
  const rawBallot = dlT * DEADLOCKED_BALLOTS;
  const deadBallots = dlT > 0 ? Math.min(DEADLOCKED_BALLOTS, Math.floor(rawBallot) + 1) : 0;
  const ballotFrac = rawBallot - Math.floor(rawBallot);
  const landed = brT > 0.3;
  const ballot = landed ? DEADLOCKED_BALLOTS + 1 : deadBallots;
  const stampScale = dlT < 1 ? 1 + 0.18 * (1 - ballotFrac) : 1;
  const stampOp = counterOp * (1 - interpolate(brT, [0.2, 0.4], [0, 1], CLAMP));

  // break: the 36th ballot lands, Jefferson wins, Burr fades
  const winPop = interpolate(brT, [0.3, 0.5], [1.25, 1], {...CLAMP, easing: Easing.out(Easing.back(2))});
  const winGlow = interpolate(brT, [0.35, 0.6], [0, 1], CLAMP);
  const burrFade = 1 - 0.6 * interpolate(brT, [0.4, 0.7], [0, 1], CLAMP);

  const TICK_W = 18;
  const TICK_GAP = 7;
  const ticks = DEADLOCKED_BALLOTS + 1;
  const ticksW = ticks * (TICK_W + TICK_GAP) - TICK_GAP;

  return (
    <PaperSheet fontFamily={FONT.text}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0}}>
        {/* glow around the two tied bars */}
        <rect x={u(TRACK.x - 14)} y={u(BAR_Y[0] - 16)} width={u(TRACK.w + 28)} height={u(BAR_Y[1] - BAR_Y[0] + TRACK.h + 32)}
          rx={u(RADIUS.lg)} fill="none" stroke={PAPER.gold} strokeWidth={u(5)} opacity={tieGlow} />

        {CANDIDATES.map((c, i) => {
          const y = BAR_Y[i];
          const w = grow * (c.votes / BAR_MAX) * TRACK.w;
          const isJ = i === 0;
          const op = i === 1 ? burrFade : 1;
          return (
            <g key={c.name} opacity={op}>
              <text x={u(TRACK.x - 20)} y={u(y + 31)} textAnchor="end" fontFamily={FONT.display} fontWeight={700}
                fontSize={u(TYPE.place)} fill={PAPER.ink} {...halo}>
                {c.name}
              </text>
              <rect x={u(TRACK.x)} y={u(y)} width={u(TRACK.w)} height={u(TRACK.h)} rx={u(RADIUS.pill)} fill={alpha(PAPER.ink, 0.1)} />
              <rect x={u(TRACK.x)} y={u(y)} width={u(w)} height={u(TRACK.h)} rx={u(RADIUS.pill)} fill={c.color} />
              {isJ && <rect x={u(TRACK.x)} y={u(y)} width={u(w)} height={u(TRACK.h)} rx={u(RADIUS.pill)} fill={PAPER.gold} opacity={winGlow} />}
              <text x={u(TRACK.x + w + 18)} y={u(y + 31)} fontFamily={FONT.mono} fontWeight={700}
                fontSize={u(TYPE.place)} fill={PAPER.ink} opacity={grow > 0 ? 1 : 0}>
                {Math.round(grow * c.votes)}
              </text>
            </g>
          );
        })}

        {/* the House: ballot counter */}
        <g opacity={counterOp}>
          <text x={u(640)} y={u(392)} textAnchor="middle" fontFamily={FONT.display} fontWeight={700}
            fontSize={u(TYPE.label)} letterSpacing={u(6)} fill={PAPER.inkSoft}>
            BALLOT
          </text>
          <g transform={`translate(${u(640)} ${u(500)}) scale(${landed ? winPop : 1})`}>
            <text x={0} y={0} textAnchor="middle" fontFamily={FONT.display} fontWeight={700}
              fontSize={u(TYPE.display + 24)} fill={landed ? PAPER.gold : PAPER.ink} {...halo}>
              {ballot}
            </text>
          </g>
          <g transform={`translate(${u(905)} ${u(470)}) rotate(-8) scale(${stampScale})`} opacity={stampOp}>
            <rect x={u(-112)} y={u(-30)} width={u(224)} height={u(46)} rx={u(RADIUS.sm)} fill="none" stroke={PAPER.red} strokeWidth={u(3)} />
            <text x={0} y={u(4)} textAnchor="middle" fontFamily={FONT.display} fontWeight={700}
              fontSize={u(TYPE.h3 - 2)} letterSpacing={u(5)} fill={PAPER.red}>
              DEADLOCK
            </text>
          </g>
          {Array.from({length: ticks}, (_, i) => {
            const isLast = i === DEADLOCKED_BALLOTS;
            const filled = isLast ? landed : i < deadBallots;
            return (
              <rect key={i} x={u(640 - ticksW / 2 + i * (TICK_W + TICK_GAP))} y={u(560)} width={u(TICK_W)} height={u(26)}
                rx={u(RADIUS.sm)} fill={filled ? (isLast ? PAPER.gold : PAPER.red) : alpha(PAPER.ink, 0.14)} />
            );
          })}
        </g>
      </svg>
    </PaperSheet>
  );
};

export default Election1800;
