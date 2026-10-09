/**
 * Boston Tea Party, December 16, 1773: a parchment side view of the harbor at night (dark water, lantern glow, no
 * night sky). Dartmouth, Eleanor and Beaver ride at the wharf; the boarding party crosses from the wharf, every third
 * figure marked as disguised; then the chests tumble overboard with splashes while one counter climbs to 342.
 * Text: the three ship names and the counter (the number is the point).
 *
 * DEFAULT_PHASES (6-8 s):
 * - setup 0.00-0.12  wharf and the three ships fade in, lanterns light
 * - board 0.10-0.35  the boarding party crosses onto the ships
 * - dump  0.35-1.00  342 chests go over the side; the counter climbs
 */
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {FONT, TYPE, alpha} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, paperHalo, usePhases, type CustomProps, type Phase} from './kit';

export const DEFAULT_PHASES: Phase[] = [
  {name: 'setup', start: 0, end: 0.12},
  {name: 'board', start: 0.1, end: 0.35},
  {name: 'dump', start: 0.35, end: 1.0},
];

export type TeaPartyHarborProps = CustomProps;

// Authored at 1280x720; every coordinate passes through u().
/** The three tea ships at Griffin's Wharf (the fourth, William, ran aground off Cape Cod and never arrived). */
const SHIPS = [
  {name: 'DARTMOUTH', x: 560},
  {name: 'ELEANOR', x: 810},
  {name: 'BEAVER', x: 1055},
] as const;
const WATER_Y = 500; // hull waterline
const DECK_Y = 494; // where figures stand and chests launch
const DOCK_TIP: [number, number] = [330, 512];
/**
 * 342 chests: the East India Company's count of tea destroyed (standard figure in Labaree, The Boston Tea Party).
 * The narration rounds it ("some three hundred fifty chests", E3 L60, hedged from 5 Steps' "nearly 350").
 */
const CHESTS = 342;
const BOARDERS = 18;
const WAVE_ROWS: [number, number][] = [[560, 6], [600, 8], [645, 7], [690, 9]];

/** Gentle wave line across the water, in composition px. */
const wavePath = (u: (n: number) => number, y: number, a: number): string => {
  let d = `M ${u(-60)} ${u(y)}`;
  for (let x = -60; x <= 1340; x += 60) d += ` Q ${u(x + 30)} ${u(y + a)}, ${u(x + 60)} ${u(y)}`;
  return d;
};

export const TeaPartyHarbor: React.FC<TeaPartyHarborProps> = ({durationInFrames, phases}) => {
  const clock = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const {u, frame, fps} = clock;
  const sec = frame / fps;

  const setupT = clock.t('setup');
  const dumpT = clock.t('dump');
  const hasBoard = clock.has('board');
  const hasDump = clock.has('dump');
  const [boardStart, boardEnd] = clock.bounds('board');
  const boardLen = Math.max(0.0001, boardEnd - boardStart);
  const [dumpStart, dumpEnd] = clock.bounds('dump');
  const dumpLen = Math.max(0.0001, dumpEnd - dumpStart);

  const halo = paperHalo(u);
  /** Ships ride at the wharf (authored units). */
  const bob = (i: number) => 3 * Math.sin(sec * 0.9 + i * 1.4);
  const shipIn = (i: number) => interpolate(setupT, [i * 0.2, i * 0.2 + 0.6], [0, 1], {...CLAMP, easing: Easing.out(Easing.cubic)});

  // ---- board: figures walk the wharf (first 35% of their move), then arc aboard (authored units) ----
  const boarders: {x: number; y: number; disguised: boolean; show: boolean}[] = [];
  for (let j = 0; j < BOARDERS; j++) {
    const s0 = boardStart + (j / BOARDERS) * 0.68 * boardLen;
    const bt = interpolate(frame, [s0, s0 + 0.32 * boardLen], [0, 1], CLAMP);
    const si = j % SHIPS.length;
    const x1 = SHIPS[si].x + ((j * 41) % 96) - 48;
    const y1 = DECK_Y - 6 + bob(si) * bt;
    let x: number;
    let y: number;
    if (bt < 0.35) {
      x = 150 + (DOCK_TIP[0] - 150) * (bt / 0.35);
      y = 506;
    } else {
      const k = (bt - 0.35) / 0.65;
      x = DOCK_TIP[0] + (x1 - DOCK_TIP[0]) * k;
      y = DOCK_TIP[1] + (y1 - DOCK_TIP[1]) * k - 24 * Math.sin(Math.PI * k);
    }
    boarders.push({x, y, disguised: j % 3 === 0, show: bt > 0});
  }

  // ---- dump: chests tumble overboard in staggered arcs, splash, sink (authored units) ----
  const FLIGHT = 0.16 * dumpLen;
  const SPREAD = 0.74 * dumpLen;
  const SINK = 0.1 * dumpLen;
  const chests: {cx: number; cy: number; rot: number; o: number; dx: number; sp: number; show: boolean}[] = [];
  for (let i = 0; i < CHESTS; i++) {
    const s0 = dumpStart + (i / CHESTS) * SPREAD;
    const ft = interpolate(frame, [s0, s0 + FLIGHT], [0, 1], CLAMP);
    if (ft <= 0) continue;
    const sx = SHIPS[i % SHIPS.length].x + ((i * 53) % 84) - 42;
    const sy = DECK_Y - 2;
    const dx = sx + 64; // over the starboard side
    const sink = interpolate(frame, [s0 + FLIGHT, s0 + FLIGHT + SINK], [0, 1], CLAMP);
    if (sink >= 1) continue;
    const sp = interpolate(frame, [s0 + FLIGHT, s0 + FLIGHT + 0.05 * dumpLen], [0, 1], CLAMP);
    const xe = ft * ft * (3 - 2 * ft);
    chests.push({
      cx: sx + (dx - sx) * xe,
      cy: sy + (508 - sy) * ft - 58 * Math.sin(Math.PI * ft) + sink * 34,
      rot: 240 * ft, o: Math.min(1, ft * 6) * (1 - sink), dx, sp, show: true,
    });
  }

  const chestCount = Math.round(interpolate(dumpT, [0, 0.95], [0, CHESTS], CLAMP));
  const countO = interpolate(dumpT, [0, 0.08], [0, 1], CLAMP);
  const sceneO = interpolate(setupT, [0, 0.5], [0, 1], CLAMP);
  const lantern = 0.75 + 0.25 * Math.sin(sec * 5.3);

  return (
    <PaperSheet fontFamily={FONT.display}>
      <svg viewBox={`0 0 ${u(1280)} ${u(720)}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
        <defs>
          <linearGradient id="tph-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={PAPER.water} />
            <stop offset="1" stopColor={PAPER.waterDeep} />
          </linearGradient>
          <radialGradient id="tph-lantern" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={alpha(PAPER.gold, 0.6)} />
            <stop offset="1" stopColor={alpha(PAPER.gold, 0)} />
          </radialGradient>
        </defs>

        {/* night: a soft ink wash over the paper sky, darker water below */}
        <rect x={u(-60)} y={u(-60)} width={u(1400)} height={u(420)} fill={alpha(PAPER.ink, 0.1)} />
        <rect x={u(-60)} y={u(300)} width={u(1400)} height={u(480)} fill="url(#tph-water)" />
        <rect x={u(-60)} y={u(300)} width={u(1400)} height={u(480)} fill={alpha(PAPER.ink, 0.12)} />
        {WAVE_ROWS.map(([wy, wa], r) => (
          <path key={r} d={wavePath(u, wy, wa)} fill="none" stroke={PAPER.wave} strokeWidth={u(2)}
            transform={`translate(${u(10) * Math.sin(sec * 0.6 + r * 1.7)}, 0)`} />
        ))}

        {/* shore and wharf */}
        <g opacity={sceneO}>
          <polygon points={`${u(-60)},${u(470)} ${u(190)},${u(470)} ${u(120)},${u(780)} ${u(-60)},${u(780)}`} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(2)} />
          <rect x={u(120)} y={u(502)} width={u(DOCK_TIP[0] - 120)} height={u(16)} fill={PAPER.brown} stroke={PAPER.ink} strokeWidth={u(1.6)} />
          {[170, 230, 290].map(px => (
            <line key={px} x1={u(px)} y1={u(518)} x2={u(px)} y2={u(566)} stroke={PAPER.ink} strokeWidth={u(4)} />
          ))}
        </g>

        {/* the three ships */}
        {SHIPS.map((ship, i) => {
          const fade = shipIn(i);
          if (fade <= 0) return null;
          return (
            <g key={ship.name} transform={`translate(${u(ship.x)}, ${u(WATER_Y + bob(i) + (1 - fade) * 18)})`} opacity={fade}>
              <circle cx={u(-50)} cy={u(-40)} r={u(46)} fill="url(#tph-lantern)" opacity={lantern * fade} />
              {[-38, 2, 42].map((mx, mi) => (
                <g key={mi}>
                  <line x1={u(mx)} y1={0} x2={u(mx)} y2={u(mi === 1 ? -182 : -150)} stroke={PAPER.ink} strokeWidth={u(4)} />
                  <line x1={u(mx - 44)} y1={u(-108)} x2={u(mx + 44)} y2={u(-108)} stroke={PAPER.ink} strokeWidth={u(3)} />
                  <line x1={u(mx - 30)} y1={u(-70)} x2={u(mx + 30)} y2={u(-70)} stroke={PAPER.ink} strokeWidth={u(2.5)} />
                </g>
              ))}
              <line x1={u(-74)} y1={0} x2={u(2)} y2={u(-182)} stroke={PAPER.inkSoft} strokeWidth={u(1.4)} opacity={0.6} />
              <line x1={u(74)} y1={0} x2={u(2)} y2={u(-182)} stroke={PAPER.inkSoft} strokeWidth={u(1.4)} opacity={0.6} />
              <path d={`M ${u(-74)} 0 L ${u(74)} 0 L ${u(54)} ${u(26)} L ${u(-54)} ${u(26)} Z`} fill={PAPER.brown} stroke={PAPER.ink} strokeWidth={u(2)} />
              <rect x={u(-66)} y={u(-26)} width={u(30)} height={u(26)} fill={PAPER.brown} stroke={PAPER.ink} strokeWidth={u(1.6)} />
              <circle cx={u(-50)} cy={u(-34)} r={u(3.5)} fill={PAPER.gold} />
              <polygon points={`${u(2)},${u(-182)} ${u(2)},${u(-160)} ${u(20)},${u(-171)}`} fill={PAPER.british} />
              <text x={0} y={u(54)} textAnchor="middle" fill={PAPER.ink} fontSize={u(TYPE.tag)} fontFamily={FONT.display} fontWeight={700} letterSpacing={u(2)} {...halo}>
                {ship.name}
              </text>
            </g>
          );
        })}

        {/* boarding party: every third figure marked as disguised */}
        {hasBoard && boarders.map((b, j) => b.show && (
          <g key={j} transform={`translate(${u(b.x)}, ${u(b.y)})`}>
            <circle r={u(6)} fill={PAPER.ink} stroke={PAPER.bg} strokeWidth={u(1.4)} />
            {b.disguised && <line x1={0} y1={u(-7)} x2={0} y2={u(-13)} stroke={PAPER.red} strokeWidth={u(2.4)} strokeLinecap="round" />}
          </g>
        ))}

        {/* chests: tumbling arcs, splash rings, sinking fade */}
        {hasDump && chests.map((c, i) => (
          <g key={i}>
            {c.sp > 0 && c.sp < 1 && (
              <circle cx={u(c.dx)} cy={u(508)} r={u(5 + c.sp * 22)} fill="none" stroke={PAPER.bg} strokeWidth={u(2.5)} opacity={(1 - c.sp) * 0.8} />
            )}
            <g transform={`translate(${u(c.cx)}, ${u(c.cy)}) rotate(${c.rot})`} opacity={c.o}>
              <rect x={u(-6)} y={u(-6)} width={u(12)} height={u(12)} rx={u(2)} fill={PAPER.land} stroke={PAPER.brown} strokeWidth={u(1.6)} />
              <line x1={u(-6)} y1={0} x2={u(6)} y2={0} stroke={PAPER.brown} strokeWidth={u(1.6)} />
            </g>
          </g>
        ))}

        {/* the one number */}
        {hasDump && countO > 0 && (
          <text x={u(72)} y={u(150)} opacity={countO} fill={PAPER.ink} fontSize={u(TYPE.display)} fontFamily={FONT.display} fontWeight={700} {...halo}>
            {chestCount}
          </text>
        )}
      </svg>
    </PaperSheet>
  );
};
