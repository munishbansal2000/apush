/**
 * Boston Port Act, 1774: a parchment harbor schematic (Boston inside, the harbor mouth opening east). Merchant ships
 * come and go; three Royal Navy warships sail in and take station across the mouth; inbound merchants turn back and
 * the traffic thins. Labels: "Boston" only. (The Act closed the port to commerce until the destroyed tea was paid for,
 * E3 L64; licensed coastal food and fuel still came in, so nothing here claims "no ships".)
 *
 * DEFAULT_PHASES (6-8 s):
 * - trade    0.00-0.30  merchant traffic in and out
 * - blockade 0.25-0.65  warships sail in and take station; the closure line draws
 * - turned   0.60-1.00  inbound merchants turn back; traffic thins
 */
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {FONT, TYPE} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, paperHalo, usePhases, type CustomProps, type Phase} from './kit';

export const DEFAULT_PHASES: Phase[] = [
  {name: 'trade', start: 0, end: 0.3},
  {name: 'blockade', start: 0.25, end: 0.65},
  {name: 'turned', start: 0.6, end: 1.0},
];

export type BostonHarborClosedProps = CustomProps;

// Everything below is authored at 1280x720 and drawn inside one scale(u(1)) group.

/** Shipping lane: offscreen east -> harbor mouth -> inner harbor. */
const LANE: number[][] = [
  [1310, 362], [1050, 360], [880, 360], [760, 360], [620, 358], [480, 356], [390, 356],
];

/** Turn-back path: an inbound merchant reaches the blockade, swings south and heads back out to sea. */
const UTURN: number[][] = [
  [1300, 332], [1120, 342], [1010, 356], [965, 392], [980, 446], [1050, 474], [1150, 466], [1320, 450],
];

/** Blockade stations across the harbor mouth (east of the headlands at x~760). */
const WARSHIP_STATIONS: number[][] = [[900, 272], [900, 360], [900, 448]];

const NORTH_LAND = 'M -40 -40 L 900 -40 L 900 0 C 870 120 830 210 760 298 L 690 330 C 520 285 260 270 -40 270 Z';
const SOUTH_LAND = 'M -40 760 L 900 760 L 900 720 C 870 600 830 510 760 422 L 690 390 C 520 435 260 450 -40 450 Z';

const WAVES: number[][] = [[980, 250], [1120, 300], [1040, 540], [1180, 600], [520, 330], [600, 395]];

function samplePath(path: number[][], s: number): {x: number; y: number; ang: number} {
  const total = path.length - 1;
  const c = Math.min(0.9999, Math.max(0, s));
  const seg = Math.min(total - 1, Math.floor(c * total));
  const f = c * total - seg;
  const [x1, y1] = path[seg];
  const [x2, y2] = path[seg + 1];
  return {x: x1 + (x2 - x1) * f, y: y1 + (y2 - y1) * f, ang: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI};
}

/** Heading -> transform: westbound ships are mirrored, not rotated 180° (which would put the sails under the hull). */
const heading = (x: number, y: number, ang: number) => {
  const west = Math.abs(ang) > 90;
  const tilt = west ? (ang > 0 ? ang - 180 : ang + 180) : ang;
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${tilt.toFixed(1)}) scale(${west ? -1 : 1} 1)`;
};

/** Side-view ship; bow toward +x. */
const ShipIcon: React.FC<{size: number; hull: string; sail: string; pennant: string; warship?: boolean}> = ({size: s, hull, sail, pennant, warship = false}) => {
  const masts = warship ? [s * 0.25, -s * 0.35] : [0];
  return (
    <g>
      <polygon points={`${-s * 0.9},${-s * 0.22} ${s * 0.7},${-s * 0.22} ${s * 0.95},0 ${s * 0.7},${s * 0.22} ${-s * 0.9},${s * 0.22}`}
        fill={hull} stroke={PAPER.ink} strokeWidth={s * 0.06} strokeLinejoin="round" />
      {masts.map((mx, i) => (
        <g key={i}>
          <line x1={mx} y1={-s * 0.05} x2={mx} y2={-s * 1.05} stroke={PAPER.ink} strokeWidth={s * 0.07} strokeLinecap="round" />
          <polygon points={`${mx},${-s * 1.05} ${mx + s * 0.78},${-s * 0.12} ${mx},${-s * 0.12}`} fill={sail} stroke={PAPER.inkSoft} strokeWidth={s * 0.04} />
          <polygon points={`${mx},${-s * 1.05} ${mx - s * 0.28},${-s * 0.96} ${mx},${-s * 0.87}`} fill={pennant} />
        </g>
      ))}
    </g>
  );
};

export const BostonHarborClosed: React.FC<BostonHarborClosedProps> = ({durationInFrames, phases}) => {
  const clock = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const {u, frame, fps} = clock;
  const width = u(1280);
  const height = u(720);

  const tradeT = clock.t('trade');
  const blockT = Easing.inOut(Easing.cubic)(clock.t('blockade'));
  const turnedT = clock.t('turned');
  const sec = frame / fps;

  // Merchant traffic: flows through trade, slows in the blockade, thins out once ships are turned back.
  const shipClock = tradeT * 1.2 + blockT * 0.5 + turnedT * 0.1;
  const merchantIntro = interpolate(tradeT, [0, 0.2], [0, 1], CLAMP);
  const merchantFade = interpolate(turnedT, [0, 1], [1, 0.15], CLAMP);
  const merchants = [0, 1, 2, 3, 4].map(i => {
    const inbound = i % 2 === 0;
    const s = ((i / 5 + shipClock) % 1 + 1) % 1;
    return {...samplePath(LANE, inbound ? s : 1 - s), ang: inbound ? 180 : 0, inbound};
  });

  const lineT = interpolate(blockT, [0.6, 1], [0, 1], CLAMP);
  const warships = WARSHIP_STATIONS.map(([sx, sy], k) => {
    const w = interpolate(blockT, [k * 0.2, Math.min(1, k * 0.2 + 0.6)], [0, 1], {...CLAMP, easing: Easing.inOut(Easing.cubic)});
    return {x: interpolate(w, [0, 1], [1360, sx]), y: interpolate(w, [0, 1], [sy + 60, sy]), w};
  });

  const turnarounds = [0, 1].map(j => {
    const p = interpolate(turnedT, [j * 0.3, Math.min(1, 0.6 + j * 0.3)], [0, 1], CLAMP);
    return {...samplePath(UTURN, p), opacity: p <= 0 ? 0 : interpolate(p, [0.8, 1], [1, 0], CLAMP)};
  });

  // Slow push toward the harbor mouth.
  const D = Math.max(1, clock.durationInFrames);
  const zoom = interpolate(frame, [0, D], [1, 1.07], {...CLAMP, easing: Easing.inOut(Easing.quad)});

  return (
    <PaperSheet fontFamily={FONT.display}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0}}>
        <g transform={`scale(${u(1)}) translate(830 360) scale(${zoom}) translate(-830 -360)`}>
          <rect x={-200} y={-200} width={1680} height={1120} fill={PAPER.water} />
          <ellipse cx={1150} cy={360} rx={260} ry={420} fill={PAPER.waterDeep} opacity={0.35} />
          {WAVES.map(([wx, wy], i) => (
            <path key={i} d={`M ${wx - 24} ${wy} q 12 -7 24 0 t 24 0`} fill="none" stroke={PAPER.wave} strokeWidth={2}
              transform={`translate(${6 * Math.sin(sec * 1.1 + i)} 0)`} />
          ))}
          <path d={NORTH_LAND} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={2.5} strokeLinejoin="round" />
          <path d={SOUTH_LAND} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={2.5} strokeLinejoin="round" />

          {/* Boston */}
          <circle cx={430} cy={244} r={6} fill={PAPER.ink} />
          <text x={446} y={252} fontFamily={FONT.display} fontWeight={700} fontSize={TYPE.place} fill={PAPER.ink} {...paperHalo(n => n)}>
            Boston
          </text>

          {/* closure line across the mouth */}
          {lineT > 0 && <line x1={900} y1={240} x2={900} y2={240 + 240 * lineT} stroke={PAPER.red} strokeWidth={3} strokeDasharray="10 8" opacity={0.9} />}

          {merchants.map((m, i) => (
            <g key={i} transform={heading(m.x, m.y, m.ang)} opacity={merchantIntro * merchantFade * (m.inbound ? 1 - lineT : 1)}>
              <ShipIcon size={16} hull={PAPER.brown} sail={PAPER.bg} pennant={PAPER.gold} />
            </g>
          ))}

          {turnarounds.map((m, i) => (
            <g key={i} transform={heading(m.x, m.y, m.ang)} opacity={m.opacity}>
              <ShipIcon size={16} hull={PAPER.brown} sail={PAPER.bg} pennant={PAPER.gold} />
            </g>
          ))}

          {/* Royal Navy: bow-first westward into station */}
          {warships.map((w, k) => (
            <g key={k} transform={heading(w.x, w.y, 180)} opacity={w.w > 0 ? 1 : 0}>
              <ShipIcon size={24} hull={PAPER.british} sail={PAPER.bg} pennant={PAPER.red} warship />
            </g>
          ))}
        </g>
      </svg>
    </PaperSheet>
  );
};
