import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { FONT, COLOR, TYPE, RADIUS, alpha } from '../../theme/tokens';

export interface Phase {
  name: string;
  start: number; // 0-1 fraction of duration
  end: number; // 0-1 fraction of duration
}

export interface TeaPartyHarborProps {
  durationInFrames?: number;
  phases: Phase[];
}

/**
 * Boston Tea Party — December 16, 1773. Stylized night-harbor schematic.
 * Expected phases (all animation derives from these; a missing phase degrades to 0):
 * - setup   0.00-0.15  moon, waves, dock fade in; the three ships appear one by one
 * - board   0.15-0.40  colonist dots walk the dock and arc aboard the ships
 * - dump    0.40-0.75  342 tea chests tumble overboard with splashes; counters tick
 * - resolve 0.75-1.00  "December 16, 1773" + toll card: the Intolerable Acts
 */

// Authored at 1280x720; every coordinate passes through u().
const SHIPS = [
  { name: 'DARTMOUTH', x: 560 },
  { name: 'ELEANOR', x: 810 },
  { name: 'BEAVER', x: 1055 },
] as const;
const WATER_Y = 500; // hull waterline
const DECK_Y = 494; // where dots stand and chests launch
const DOCK_TIP: [number, number] = [330, 512];
const CHESTS = 342; // the historical count is the point
const CHEST_VALUE = 9659; // £9,659 of tea
const BOARDERS = 18;
const STARS: [number, number, number][] = [
  [120, 60, 2], [260, 140, 1.5], [420, 50, 2], [580, 110, 1.4], [700, 45, 2],
  [840, 120, 1.6], [950, 60, 2], [1240, 200, 1.5], [60, 220, 1.4], [340, 230, 2],
  [520, 190, 1.5], [760, 210, 1.8], [990, 180, 1.4], [1170, 250, 2],
];
const WAVE_ROWS: [number, number][] = [[560, 6], [600, 8], [645, 7], [690, 9]];

/** Gentle sine wave line across the water. */
const wavePath = (y: number, a: number): string => {
  let d = `M -60 ${y}`;
  for (let x = -60; x <= 1340; x += 60) d += ` Q ${x + 30} ${y + a}, ${x + 60} ${y}`;
  return d;
};

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const TeaPartyHarbor: React.FC<TeaPartyHarborProps> = ({ durationInFrames: propDuration, phases }) => {
  const frame = useCurrentFrame();
  const { width, durationInFrames: configDuration } = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  // All layout authored at 1280 wide; u() scales every coordinate and size.
  const u = (n: number) => (n * width) / 1280;

  /** Phase name -> 0..1 progress. Missing or empty phase -> 0. */
  const phaseT = (name: string): number => {
    const p = phases.find((x) => x.name === name);
    if (!p || p.end <= p.start || durationInFrames <= 0) return 0;
    return interpolate(frame, [p.start * durationInFrames, p.end * durationInFrames], [0, 1], CLAMP);
  };
  /** Phase boundaries in frames; [0,0] when missing. */
  const bounds = (name: string): [number, number] => {
    const p = phases.find((x) => x.name === name);
    if (!p || p.end <= p.start) return [0, 0];
    return [p.start * durationInFrames, p.end * durationInFrames];
  };

  const setupT = phaseT('setup');
  const dumpT = phaseT('dump');
  const resolveT = phaseT('resolve');
  /** A missing phase degrades its whole beat to invisible, never to a snapped end-state. */
  const hasPhase = (name: string) => phases.some((x) => x.name === name && x.end > x.start);
  const hasBoard = hasPhase('board');
  const hasDump = hasPhase('dump');
  const [boardStart, boardEnd] = bounds('board');
  const boardLen = Math.max(0.0001, boardEnd - boardStart);
  const [dumpStart, dumpEnd] = bounds('dump');
  const dumpLen = Math.max(0.0001, dumpEnd - dumpStart);

  const halo = { stroke: alpha(COLOR.night, 0.92), strokeWidth: u(3.5), paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };
  const bob = (i: number) => u(3) * Math.sin(frame * 0.03 + i * 1.4); // ships ride at anchor
  const shipIn = (i: number) =>
    interpolate(setupT, [i * 0.22, i * 0.22 + 0.55], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });

  // ---- board: dots walk the dock (first 35% of their flight), then arc aboard ----
  const boarders: { x: number; y: number; disguised: boolean; show: boolean }[] = [];
  for (let j = 0; j < BOARDERS; j++) {
    const s0 = boardStart + (j / BOARDERS) * 0.68 * boardLen;
    const bt = interpolate(frame, [s0, s0 + 0.28 * boardLen], [0, 1], CLAMP);
    const si = j % SHIPS.length;
    const ship = SHIPS[si];
    const x1 = ship.x + ((j * 41) % 96) - 48;
    const y1 = DECK_Y - 6 + bob(si) * bt;
    let x: number; let y: number;
    if (bt < 0.35) {
      const k = bt / 0.35;
      x = 150 + (DOCK_TIP[0] - 150) * k; y = 506; // walk the pier
    } else {
      const k = (bt - 0.35) / 0.65; // arc from dock tip to the deck
      x = DOCK_TIP[0] + (x1 - DOCK_TIP[0]) * k;
      y = DOCK_TIP[1] + (y1 - DOCK_TIP[1]) * k - u(24) * Math.sin(Math.PI * k);
    }
    boarders.push({ x, y, disguised: j % 3 === 0, show: bt > 0 });
  }
  const boarderFade = 1 - interpolate(resolveT, [0, 0.5], [0, 1], CLAMP);

  // ---- dump: 342 chests tumble overboard in staggered arcs, splash, sink ----
  const FLIGHT = 0.2 * dumpLen; // each chest's flight time, in frames
  const SPREAD = 0.72 * dumpLen; // launch stagger window, in frames
  const SINK = 0.14 * dumpLen; // sink-and-fade time after landing
  interface Chest { cx: number; cy: number; rot: number; o: number; dx: number; sp: number; show: boolean }
  const chests: Chest[] = [];
  for (let i = 0; i < CHESTS; i++) {
    const s0 = dumpStart + (i / CHESTS) * SPREAD;
    const ft = interpolate(frame, [s0, s0 + FLIGHT], [0, 1], CLAMP);
    const sx = SHIPS[i % SHIPS.length].x + ((i * 53) % 84) - 42;
    const sy = DECK_Y - 2;
    const dx = sx + 64; // tossed over the starboard side
    const sink = interpolate(frame, [s0 + FLIGHT, s0 + FLIGHT + SINK], [0, 1], CLAMP);
    const sp = interpolate(frame, [s0 + FLIGHT, s0 + FLIGHT + 0.05 * dumpLen], [0, 1], CLAMP);
    const xe = ft * ft * (3 - 2 * ft); // smoothstep on x, parabolic rise on y
    chests.push({
      cx: sx + (dx - sx) * xe,
      cy: sy + (508 - sy) * ft - u(58) * Math.sin(Math.PI * ft) + sink * u(34),
      rot: 240 * ft, o: Math.min(1, ft * 6) * (1 - sink), dx, sp, show: ft > 0 && sink < 1,
    });
  }

  // ---- counters ----
  const chestCount = Math.round(interpolate(dumpT, [0, 0.97], [0, CHESTS], CLAMP));
  const poundValue = Math.round(interpolate(dumpT, [0.06, 1], [0, CHEST_VALUE], CLAMP));
  const hudO = interpolate(dumpT, [0, 0.1], [0, 1], CLAMP);
  const labelO = interpolate(setupT, [0.3, 0.8], [0, 1], CLAMP);

  // ---- resolve: the date and the toll ----
  const resO = interpolate(resolveT, [0, 0.3], [0, 1], CLAMP);
  const resY = u(28) * (1 - interpolate(resolveT, [0, 0.45], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) }));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: COLOR.night, fontFamily: FONT.ui }}>
      <svg viewBox={`0 0 ${u(1280)} ${u(720)}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="tph-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={COLOR.nightOcean} />
            <stop offset="1" stopColor={alpha(COLOR.black, 0.55)} />
          </linearGradient>
          <radialGradient id="tph-moonglow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={alpha(COLOR.foam, 0.55)} />
            <stop offset="1" stopColor={alpha(COLOR.foam, 0)} />
          </radialGradient>
        </defs>

        {/* sky, stars, moon */}
        <rect x={-u(60)} y={-u(60)} width={u(1400)} height={u(420)} fill={COLOR.night} />
        {STARS.map(([sx, sy, sr], i) => (
          <circle key={i} cx={u(sx)} cy={u(sy)} r={u(sr)} fill={COLOR.foam} opacity={0.35 + 0.35 * Math.sin(frame * 0.06 + sx)} />
        ))}
        <g opacity={interpolate(setupT, [0, 0.4], [0, 1], CLAMP)}>
          <circle cx={u(1110)} cy={u(120)} r={u(120)} fill="url(#tph-moonglow)" />
          <circle cx={u(1110)} cy={u(120)} r={u(44)} fill={COLOR.foam} opacity={0.92} />
          <circle cx={u(1096)} cy={u(108)} r={u(36)} fill={alpha(COLOR.night, 0.08)} />
        </g>

        {/* water: gradient, moonlight shimmer, drifting wave lines */}
        <rect x={-u(60)} y={u(300)} width={u(1400)} height={u(480)} fill="url(#tph-water)" />
        <rect x={u(1056)} y={u(310)} width={u(108)} height={u(410)} fill={alpha(COLOR.foam, 0.06)} opacity={0.6 + 0.4 * Math.sin(frame * 0.045)} />
        {WAVE_ROWS.map(([wy, wa], r) => (
          <path key={r} d={wavePath(wy, wa)} fill="none" stroke={alpha(COLOR.skyOnNight, 0.16)} strokeWidth={u(2)}
            transform={`translate(${u(10) * Math.sin(frame * 0.02 + r * 1.7)}, 0) scale(${width / 1280}, ${width / 1280})`} />
        ))}

        {/* shore + dock */}
        <g opacity={interpolate(setupT, [0, 0.5], [0, 1], CLAMP)}>
          <polygon points={`${u(0)},${u(470)} ${u(190)},${u(470)} ${u(120)},${u(720)} ${u(0)},${u(720)}`} fill={COLOR.nightLand} stroke={COLOR.nightCoast} strokeWidth={u(2)} />
          <rect x={u(120)} y={u(502)} width={u(DOCK_TIP[0] - 120)} height={u(16)} fill={COLOR.nightPanel} stroke={COLOR.nightCoast} strokeWidth={u(1.6)} />
          {[170, 230, 290].map((px) => (
            <line key={px} x1={u(px)} y1={u(518)} x2={u(px)} y2={u(566)} stroke={COLOR.nightCoast} strokeWidth={u(4)} />
          ))}
        </g>

        {/* the three ships at anchor */}
        {SHIPS.map((ship, i) => {
          const fade = shipIn(i);
          if (fade <= 0) return null;
          return (
            <g key={ship.name} transform={`translate(${u(ship.x)}, ${u(WATER_Y) + bob(i) + (1 - fade) * u(18)})`} opacity={fade}>
              {[-38, 2, 42].map((mx, mi) => (
                <g key={mi}>
                  <line x1={u(mx)} y1={0} x2={u(mx)} y2={u(mi === 1 ? -182 : -150)} stroke={COLOR.nightCoast} strokeWidth={u(4)} />
                  <line x1={u(mx - 44)} y1={u(-108)} x2={u(mx + 44)} y2={u(-108)} stroke={COLOR.nightCoast} strokeWidth={u(3)} />
                  <line x1={u(mx - 30)} y1={u(-70)} x2={u(mx + 30)} y2={u(-70)} stroke={COLOR.nightCoast} strokeWidth={u(2.5)} />
                </g>
              ))}
              <line x1={u(-74)} y1={0} x2={u(2)} y2={u(-182)} stroke={alpha(COLOR.onNightMuted, 0.35)} strokeWidth={u(1.4)} />
              <line x1={u(74)} y1={0} x2={u(2)} y2={u(-182)} stroke={alpha(COLOR.onNightMuted, 0.35)} strokeWidth={u(1.4)} />
              <line x1={u(-38)} y1={u(-150)} x2={u(-74)} y2={0} stroke={alpha(COLOR.onNightMuted, 0.3)} strokeWidth={u(1.2)} />
              <line x1={u(42)} y1={u(-150)} x2={u(74)} y2={0} stroke={alpha(COLOR.onNightMuted, 0.3)} strokeWidth={u(1.2)} />
              <path d={`M ${u(-74)} 0 L ${u(74)} 0 L ${u(54)} ${u(26)} L ${u(-54)} ${u(26)} Z`} fill={COLOR.nightLand} stroke={COLOR.nightCoast} strokeWidth={u(2)} />
              <rect x={u(-66)} y={u(-26)} width={u(30)} height={u(26)} fill={COLOR.nightLand} stroke={COLOR.nightCoast} strokeWidth={u(1.6)} />
              <line x1={u(74)} y1={u(2)} x2={u(88)} y2={u(46)} stroke={alpha(COLOR.onNightMuted, 0.5)} strokeWidth={u(1.6)} />
              <circle cx={u(88)} cy={u(48)} r={u(4)} fill={COLOR.nightCoast} />
              <polygon points={`${u(2)},${u(-182)} ${u(2)},${u(-160)} ${u(20)},${u(-171)}`} fill={COLOR.redOnNight} />
              <text x={0} y={u(52)} textAnchor="middle" fill={alpha(COLOR.goldOnNight, 0.85)} fontSize={u(TYPE.tag)} fontFamily={FONT.mono} letterSpacing={u(2)} {...halo}>
                {ship.name}
              </text>
            </g>
          );
        })}

        {/* boarding colonists: abstract dots, every third marked as disguised */}
        {hasBoard && boarderFade > 0 && boarders.map((b, j) => b.show && (
          <g key={j} transform={`translate(${u(b.x)}, ${u(b.y)})`} opacity={boarderFade}>
            <circle r={u(6)} fill={COLOR.skyOnNight} stroke={COLOR.night} strokeWidth={u(1.6)} />
            {b.disguised && <line x1={0} y1={u(-7)} x2={0} y2={u(-13)} stroke={COLOR.redOnNight} strokeWidth={u(2.4)} strokeLinecap="round" />}
          </g>
        ))}

        {/* tea chests: tumbling arcs, splash rings, sinking fade */}
        {hasDump && chests.map((c, i) => c.show && (
          <g key={i}>
            {c.sp > 0 && c.sp < 1 && (
              <circle cx={u(c.dx)} cy={u(508)} r={u(5) + c.sp * u(22)} fill="none" stroke={COLOR.skyOnNight} strokeWidth={u(2.5)} opacity={(1 - c.sp) * 0.75} />
            )}
            <g transform={`translate(${u(c.cx)}, ${u(c.cy)}) rotate(${c.rot})`} opacity={c.o}>
              <rect x={u(-6)} y={u(-6)} width={u(12)} height={u(12)} rx={u(2)} fill={COLOR.paperDeep} stroke={COLOR.brown} strokeWidth={u(1.6)} />
              <line x1={u(-6)} y1={0} x2={u(6)} y2={0} stroke={COLOR.brown} strokeWidth={u(1.6)} />
            </g>
          </g>
        ))}

        {/* "Boston Harbor — night" label */}
        {labelO > 0 && (
          <text x={u(64)} y={u(88)} opacity={labelO} fill={COLOR.onNight} fontSize={u(TYPE.h2)} fontFamily={FONT.display} letterSpacing={u(4)} {...halo}>
            Boston Harbor — night
          </text>
        )}

        {/* dump counter HUD */}
        {hudO > 0 && (
          <g opacity={hudO} transform={`translate(${u(64)}, ${u(128)})`}>
            <rect width={u(340)} height={u(152)} rx={u(RADIUS.lg)} fill={alpha(COLOR.nightPanel, 0.88)} stroke={COLOR.goldOnNight} strokeWidth={u(1.6)} />
            <text x={u(20)} y={u(38)} fill={COLOR.onNightMuted} fontSize={u(TYPE.label)} fontFamily={FONT.ui} letterSpacing={u(2)}>TEA CHESTS DUMPED</text>
            <text x={u(20)} y={u(92)} fill={COLOR.goldOnNight} fontSize={u(TYPE.h1)} fontFamily={FONT.mono} fontWeight={700}>{chestCount}</text>
            <text x={u(20)} y={u(128)} fill={COLOR.onNightMuted} fontSize={u(TYPE.label)} fontFamily={FONT.ui}>£{poundValue.toLocaleString('en-US')} OF TEA</text>
          </g>
        )}

        {/* resolve: date + toll card */}
        {resO > 0 && (
          <g>
            <rect x={-u(60)} y={-u(60)} width={u(1400)} height={u(840)} fill={alpha(COLOR.black, 0.38 * resO)} />
            <g opacity={resO} transform={`translate(${u(640)}, ${u(360) + resY})`}>
              <rect x={u(-330)} y={u(-140)} width={u(660)} height={u(280)} rx={u(RADIUS.lg)} fill={alpha(COLOR.nightPanel, 0.94)} stroke={COLOR.goldOnNight} strokeWidth={u(2)} />
              <text y={u(-60)} textAnchor="middle" fill={COLOR.goldOnNight} fontSize={u(TYPE.h1)} fontFamily={FONT.display} fontWeight={700} letterSpacing={u(3)}>
                DECEMBER 16, 1773
              </text>
              <text y={u(-6)} textAnchor="middle" fill={COLOR.onNight} fontSize={u(TYPE.body)} fontFamily={FONT.text}>
                342 chests — £9,659 of tea destroyed
              </text>
              <line x1={u(-280)} y1={u(36)} x2={u(280)} y2={u(36)} stroke={alpha(COLOR.goldOnNight, 0.5)} strokeWidth={u(1.5)} />
              <text y={u(80)} textAnchor="middle" fill={COLOR.redOnNight} fontSize={u(TYPE.caption)} fontFamily={FONT.text} fontStyle="italic">
                Parliament’s response: the Intolerable Acts
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};
