import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { FONT, COLOR, TYPE, RADIUS, alpha } from '../../theme/tokens';

export interface Phase { name: string; start: number; end: number } // 0-1 fractions of duration
export interface Election1800Props {
  durationInFrames?: number;
  phases: Phase[];
}

/** Scene order; each scene fades in during its own phase and out as the next one starts. */
const ORDER = ['setup', 'tie', 'deadlock', 'break', 'resolve'];

const DEFAULT_PHASES: Phase[] = [
  { name: 'setup', start: 0, end: 0.15 },
  { name: 'tie', start: 0.15, end: 0.4 },
  { name: 'deadlock', start: 0.4, end: 0.7 },
  { name: 'break', start: 0.7, end: 0.9 },
  { name: 'resolve', start: 0.9, end: 1 },
];

const CANDIDATES = [
  { name: 'Thomas Jefferson', party: 'Democratic-Republican', color: COLOR.blue, note: 'challenger', votes: 73 },
  { name: 'Aaron Burr', party: 'Democratic-Republican', color: COLOR.blue, note: 'his running mate!', votes: 73 },
  { name: 'John Adams', party: 'Federalist', color: COLOR.red, note: 'incumbent president', votes: 65 },
] as const;

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const Election1800: React.FC<Election1800Props> = ({ durationInFrames: propDuration, phases }) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: configDuration } = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  const total = Math.max(1, durationInFrames);
  /** scale: type scale is authored at 1280x720 */
  const u = (n: number) => (n * width) / 1280;

  /** A missing phase degrades to its default timing instead of breaking the scene. */
  const find = (name: string): Phase =>
    phases.find((p) => p.name === name) ??
    DEFAULT_PHASES.find((p) => p.name === name) ?? { name, start: 0, end: 0 };

  /** 0-1 progress inside a named phase; every animation below derives from this. */
  const t = (name: string) =>
    interpolate(frame, [find(name).start * total, find(name).end * total], [0, 1], {
      ...CLAMP,
      easing: Easing.inOut(Easing.cubic),
    });

  const sceneOp = ORDER.map((name, i) => {
    const fadeIn = interpolate(t(name), [0, 0.15], [0, 1], CLAMP);
    const next = ORDER[i + 1];
    const fadeOut = next ? 1 - interpolate(t(next), [0, 0.2], [0, 1], CLAMP) : 1;
    return fadeIn * fadeOut;
  });
  const [opSetup, opTie, opDeadlock, opBreak, opResolve] = sceneOp;

  // Gentle shimmer (relative to fps, never an absolute frame number).
  const shimmer = (hz: number) => 0.5 + 0.5 * Math.abs(Math.sin(((frame / fps) * Math.PI * hz)));

  // ---------- setup: the candidates ----------
  const setupT = t('setup');
  const flawOp = interpolate(setupT, [0.6, 0.85], [0, 1], CLAMP);
  const cardEnter = (i: number) => interpolate(setupT, [i * 0.15, i * 0.15 + 0.4], [0, 1], CLAMP);

  // ---------- tie: electoral votes ----------
  const tieT = t('tie');
  const grow = interpolate(tieT, [0.05, 0.55], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const tieGlow = interpolate(tieT, [0.55, 0.8], [0, 1], CLAMP) * (0.35 + 0.65 * shimmer(1.4));
  const tieLabelOp = interpolate(tieT, [0.68, 0.88], [0, 1], CLAMP);

  // ---------- deadlock: the House ballots ----------
  const dlT = t('deadlock');
  const rawBallot = dlT * 35;
  const ballot = Math.min(35, Math.floor(rawBallot) + 1);
  const ballotFrac = rawBallot - Math.floor(rawBallot);
  const stampScale = 1 + 0.22 * (1 - ballotFrac); // "TIE" thumps each new ballot
  const stuckOp = interpolate(dlT, [0.82, 0.96], [0, 1], CLAMP);

  // ---------- break: the 36th ballot ----------
  const brT = t('break');
  const landT = interpolate(brT, [0.45, 0.85], [0, 1.6], CLAMP);
  const finalBallot = 35 + Math.min(1, Math.floor(landT));
  const winFlash = interpolate(brT, [0.82, 1], [0, 1], CLAMP) * (0.45 + 0.55 * shimmer(2.2));
  const winOp = interpolate(brT, [0.55, 0.75], [0, 1], CLAMP);
  const noteOp = interpolate(brT, [0.8, 0.95], [0, 1], CLAMP);

  // ---------- resolve ----------
  const resT = t('resolve');
  const resTitleOp = interpolate(resT, [0.05, 0.3], [0, 1], CLAMP);
  const resSubOp = interpolate(resT, [0.32, 0.55], [0, 1], CLAMP);
  const resFootOp = interpolate(resT, [0.58, 0.8], [0, 1], CLAMP);

  const TRACK = { x: u(470), w: u(640), h: u(44) };
  const barW = (votes: number) => grow * (votes / 75) * TRACK.w;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* parchment surface */}
      <rect width={width} height={height} fill={COLOR.paper} />
      <rect width={width} height={height} fill={alpha(COLOR.paperDeep, 0.3)} />
      <rect x={u(24)} y={u(24)} width={width - u(48)} height={height - u(48)} fill="none"
        stroke={COLOR.coast} strokeWidth={u(2)} opacity={0.55} />

      {/* ============ SETUP ============ */}
      <g opacity={opSetup}>
        <text x={u(640)} y={u(130)} textAnchor="middle" fontFamily={FONT.display}
          fontSize={u(TYPE.h1)} fill={COLOR.ink} fontWeight={700}>
          The Election of 1800
        </text>
        <text x={u(640)} y={u(172)} textAnchor="middle" fontFamily={FONT.text}
          fontSize={u(TYPE.caption)} fill={COLOR.inkSoft} fontStyle="italic">
          Three candidates. One broken system.
        </text>
        {CANDIDATES.map((c, i) => {
          const e = cardEnter(i);
          const cx = u(110 + i * 360);
          const cy = u(235) + (1 - e) * u(60);
          return (
            <g key={c.name} opacity={e}>
              <rect x={cx} y={cy} width={u(340)} height={u(215)} rx={u(RADIUS.lg)}
                fill={COLOR.halo} stroke={c.color} strokeWidth={u(3.5)} />
              <text x={cx + u(170)} y={cy + u(58)} textAnchor="middle" fontFamily={FONT.display}
                fontSize={u(TYPE.h3)} fill={COLOR.ink} fontWeight={700}>
                {c.name}
              </text>
              <rect x={cx + u(170) - u(105)} y={cy + u(78)} width={u(210)} height={u(40)} rx={u(RADIUS.pill)}
                fill={alpha(c.color, 0.16)} />
              <text x={cx + u(170)} y={cy + u(105)} textAnchor="middle" fontFamily={FONT.ui}
                fontSize={u(TYPE.chip)} fill={c.color} fontWeight={600}>
                {c.party}
              </text>
              <text x={cx + u(170)} y={cy + u(160)} textAnchor="middle" fontFamily={FONT.text}
                fontSize={u(TYPE.body)} fill={COLOR.inkSoft} fontStyle="italic">
                {c.note}
              </text>
            </g>
          );
        })}
        <text x={u(640)} y={u(620)} textAnchor="middle" fontFamily={FONT.text} fontSize={u(TYPE.body)}
          fill={COLOR.inkSoft} fontStyle="italic" opacity={flawOp}>
          The flaw: electors voted twice, and the system couldn’t tell a vote for president
        </text>
        <text x={u(640)} y={u(652)} textAnchor="middle" fontFamily={FONT.text} fontSize={u(TYPE.body)}
          fill={COLOR.inkSoft} fontStyle="italic" opacity={flawOp}>
          from a vote for vice president.
        </text>
      </g>

      {/* ============ TIE ============ */}
      <g opacity={opTie}>
        <text x={u(640)} y={u(110)} textAnchor="middle" fontFamily={FONT.display}
          fontSize={u(TYPE.h2)} fill={COLOR.ink} fontWeight={700}>
          Electoral votes
        </text>
        <text x={u(640)} y={u(148)} textAnchor="middle" fontFamily={FONT.text}
          fontSize={u(TYPE.caption)} fill={COLOR.inkSoft} fontStyle="italic">
          Each elector voted twice — president and vice president indistinguishable.
        </text>
        {/* pulsing gold halo behind the two tied bars */}
        <rect x={TRACK.x - u(14)} y={u(248)} width={TRACK.w + u(28)} height={u(182)} rx={u(RADIUS.lg)}
          fill="none" stroke={COLOR.gold} strokeWidth={u(5)} opacity={tieGlow} />
        {CANDIDATES.map((c, i) => {
          const y = u(268 + i * 92);
          const w = barW(c.votes);
          return (
            <g key={c.name}>
              <text x={u(450)} y={y + u(29)} textAnchor="end" fontFamily={FONT.text}
                fontSize={u(TYPE.place)} fill={COLOR.ink}>
                {c.name}
              </text>
              <rect x={TRACK.x} y={y} width={TRACK.w} height={TRACK.h} rx={u(RADIUS.pill)}
                fill={alpha(COLOR.ink, 0.1)} />
              <rect x={TRACK.x} y={y} width={w} height={TRACK.h} rx={u(RADIUS.pill)} fill={c.color} />
              <text x={TRACK.x + w + u(22)} y={y + u(30)} fontFamily={FONT.mono}
                fontSize={u(TYPE.place)} fill={COLOR.ink} fontWeight={700}>
                {Math.round(grow * c.votes)}
              </text>
            </g>
          );
        })}
        <text x={u(640)} y={u(610)} textAnchor="middle" fontFamily={FONT.display}
          fontSize={u(TYPE.h2)} fill={COLOR.red} fontWeight={700} opacity={tieLabelOp}>
          73–73 — tie!
        </text>
      </g>

      {/* ============ DEADLOCK ============ */}
      <g opacity={opDeadlock}>
        <text x={u(640)} y={u(115)} textAnchor="middle" fontFamily={FONT.display}
          fontSize={u(TYPE.h2)} fill={COLOR.ink} fontWeight={700}>
          Goes to the House
        </text>
        <text x={u(640)} y={u(155)} textAnchor="middle" fontFamily={FONT.text}
          fontSize={u(TYPE.caption)} fill={COLOR.inkSoft} fontStyle="italic">
          State delegations vote, one vote per state. Federalists block Jefferson.
        </text>
        <text x={u(640)} y={u(235)} textAnchor="middle" fontFamily={FONT.ui}
          fontSize={u(TYPE.chip)} fill={COLOR.inkSoft} letterSpacing={u(6)}>
          BALLOT
        </text>
        <text x={u(640)} y={u(350)} textAnchor="middle" fontFamily={FONT.display}
          fontSize={u(TYPE.display)} fill={COLOR.ink} fontWeight={700}>
          {ballot}
        </text>
        <g transform={`translate(${u(640)},${u(455)}) rotate(-6) scale(${stampScale})`}>
          <text x={0} y={0} textAnchor="middle" fontFamily={FONT.display}
            fontSize={u(TYPE.h2)} fill={COLOR.red} fontWeight={700} letterSpacing={u(10)}>
            TIE
          </text>
        </g>
        {/* ballot ticks */}
        {Array.from({ length: 35 }, (_, i) => {
          const tw = u(18);
          const gap = u(8);
          const totalW = 35 * (tw + gap) - gap;
          return (
            <rect key={i} x={u(640) - totalW / 2 + i * (tw + gap)} y={u(515)}
              width={tw} height={u(26)} rx={u(RADIUS.sm)}
              fill={i < ballot ? COLOR.red : alpha(COLOR.ink, 0.14)} />
          );
        })}
        <text x={u(640)} y={u(605)} textAnchor="middle" fontFamily={FONT.text}
          fontSize={u(TYPE.h3)} fill={COLOR.ink} fontWeight={700} opacity={stuckOp}>
          35 ballots. Still tied.
        </text>
      </g>

      {/* ============ BREAK ============ */}
      <g opacity={opBreak}>
        <text x={u(640)} y={u(170)} textAnchor="middle" fontFamily={FONT.ui}
          fontSize={u(TYPE.chip)} fill={COLOR.inkSoft} letterSpacing={u(6)}>
          BALLOT
        </text>
        <text x={u(640)} y={u(285)} textAnchor="middle" fontFamily={FONT.display}
          fontSize={u(TYPE.display)} fill={COLOR.ink} fontWeight={700}>
          {finalBallot}
        </text>
        <text x={u(640)} y={u(360)} textAnchor="middle" fontFamily={FONT.display}
          fontSize={u(TYPE.h2)} fill={COLOR.ink} fontWeight={700} opacity={winOp}>
          36th ballot — Jefferson wins
        </text>
        <rect x={u(390)} y={u(405)} width={u(500)} height={u(90)} rx={u(RADIUS.lg)}
          fill={COLOR.blue} opacity={0.95} />
        <rect x={u(390)} y={u(405)} width={u(500)} height={u(90)} rx={u(RADIUS.lg)}
          fill={COLOR.gold} opacity={winFlash} />
        <text x={u(640)} y={u(461)} textAnchor="middle" fontFamily={FONT.display}
          fontSize={u(TYPE.h3)} fill={COLOR.foam} fontWeight={700}>
          Thomas Jefferson — President
        </text>
        <text x={u(640)} y={u(580)} textAnchor="middle" fontFamily={FONT.text}
          fontSize={u(TYPE.body)} fill={COLOR.inkSoft} fontStyle="italic" opacity={noteOp}>
          Hamilton’s letters tipped Federalists away from Burr.
        </text>
      </g>

      {/* ============ RESOLVE ============ */}
      <g opacity={opResolve}>
        <text x={u(640)} y={u(290)} textAnchor="middle" fontFamily={FONT.display}
          fontSize={u(TYPE.h1)} fill={COLOR.ink} fontWeight={700} opacity={resTitleOp}>
          The Revolution of 1800
        </text>
        <line x1={u(470)} y1={u(340)} x2={u(810)} y2={u(340)} stroke={COLOR.gold}
          strokeWidth={u(4)} opacity={resSubOp} />
        <text x={u(640)} y={u(425)} textAnchor="middle" fontFamily={FONT.text}
          fontSize={u(TYPE.h3)} fill={COLOR.ink} opacity={resSubOp}>
          Power changed hands peacefully — the system held.
        </text>
        <text x={u(640)} y={u(510)} textAnchor="middle" fontFamily={FONT.text}
          fontSize={u(TYPE.caption)} fill={COLOR.inkSoft} fontStyle="italic" opacity={resFootOp}>
          It led to the 12th Amendment — separate votes for president and vice president.
        </text>
      </g>
    </svg>
  );
};
