import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';
import {FONT, COLOR, TYPE, RADIUS, alpha} from '../../theme/tokens';

/** Time-control contract: phases as 0-1 fractions of duration. */
export interface Phase {name: string; start: number; end: number}
export interface BostonHarborClosedProps {
  durationInFrames?: number;
  phases: Phase[];
}

const DEFAULT_PHASES: Phase[] = [
  {name: 'setup', start: 0, end: 0.15},
  {name: 'closure', start: 0.15, end: 0.5},
  {name: 'strangle', start: 0.5, end: 0.8},
  {name: 'resolve', start: 0.8, end: 1.0},
];

/** Shipping lane: offscreen east → harbor mouth → inner harbor (design space 1280×720). */
const LANE: number[][] = [
  [1310, 362], [1050, 360], [880, 360], [760, 360], [620, 358], [480, 356], [390, 356],
];

/** U-turn path: an inbound merchant reaches the blockade, curves north, and flees east. */
const UTURN: number[][] = [
  [1260, 332], [1090, 345], [995, 360], [955, 395],
  [970, 448], [1040, 478], [1140, 470], [1300, 452],
];

/** Blockade stations across the harbor mouth (east of the tips at x≈760). */
const WARSHIP_STATIONS: number[][] = [[900, 272], [900, 360], [900, 448]];

const NORTH_LAND =
  'M 0 0 L 900 0 C 870 120 830 210 760 298 L 690 330 C 520 285 260 270 0 270 Z';
const SOUTH_LAND =
  'M 0 720 L 900 720 C 870 600 830 510 760 422 L 690 390 C 520 435 260 450 0 450 Z';

function samplePath(path: number[][], s: number): {x: number; y: number; ang: number} {
  const total = path.length - 1;
  const c = Math.min(0.9999, Math.max(0, s));
  const seg = Math.min(total - 1, Math.floor(c * total));
  const f = c * total - seg;
  const [x1, y1] = path[seg];
  const [x2, y2] = path[seg + 1];
  return {
    x: x1 + (x2 - x1) * f,
    y: y1 + (y2 - y1) * f,
    ang: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
  };
}

const ShipIcon: React.FC<{
  size: number;
  hull: string;
  hullEdge: string;
  sail: string;
  warship?: boolean;
}> = ({size, hull, hullEdge, sail, warship = false}) => {
  const s = size;
  const masts = warship ? [s * 0.25, -s * 0.35] : [0];
  return (
    <g>
      <polygon
        points={`${-s * 0.9},${-s * 0.22} ${s * 0.7},${-s * 0.22} ${s * 0.95},0 ${s * 0.7},${s * 0.22} ${-s * 0.9},${s * 0.22}`}
        fill={hull}
        stroke={hullEdge}
        strokeWidth={s * 0.06}
        strokeLinejoin="round"
      />
      {masts.map((mx, i) => (
        <g key={i}>
          <line
            x1={mx} y1={-s * 0.05} x2={mx} y2={-s * 1.05}
            stroke={COLOR.brown} strokeWidth={s * 0.07} strokeLinecap="round"
          />
          <polygon
            points={`${mx},${-s * 1.05} ${mx + s * 0.78},${-s * 0.12} ${mx},${-s * 0.12}`}
            fill={sail} opacity={0.94}
          />
          <polygon
            points={`${mx},${-s * 1.05} ${mx + s * 0.28},${-s * 0.96} ${mx},${-s * 0.87}`}
            fill={warship ? COLOR.red : COLOR.gold}
          />
        </g>
      ))}
    </g>
  );
};

export const BostonHarborClosed: React.FC<BostonHarborClosedProps> = ({
  durationInFrames: propDuration,
  phases = DEFAULT_PHASES,
}) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames: configDuration} = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  const u = width / 1280;
  const total = Math.max(1, durationInFrames);

  const span = (name: string): Phase => {
    const p = phases.find((q) => q.name === name);
    if (!p || p.end <= p.start) return {name, start: 0, end: 1};
    return p;
  };
  /** Phase-local 0→1 progress; all animation derives from phases + durationInFrames. */
  const phaseT = (name: string, ease?: (v: number) => number) => {
    const p = span(name);
    return interpolate(frame, [p.start * total, p.end * total], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      ...(ease ? {easing: ease} : {}),
    });
  };

  const setupT = phaseT('setup');
  const closureT = phaseT('closure', Easing.inOut(Easing.cubic));
  const strangleT = phaseT('strangle', Easing.inOut(Easing.cubic));
  const resolveT = phaseT('resolve', Easing.out(Easing.cubic));

  // --- Merchant traffic: loops during setup, slows in closure, dims out in strangle ---
  const shipClock = setupT * 1.8 + closureT * 1.0 + strangleT * 0.12;
  const merchantFade = interpolate(strangleT, [0, 1], [1, 0.18]);
  const merchantIntro = interpolate(setupT, [0.02, 0.25], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const merchants = [0, 1, 2, 3, 4].map((i) => {
    const inbound = i % 2 === 0;
    const s = (((i / 5) + shipClock) % 1 + 1) % 1;
    const pos = samplePath(LANE, inbound ? s : 1 - s);
    return {pos, opacity: merchantIntro * merchantFade, key: i};
  });

  // --- British warships: sail in staggered and take station across the mouth ---
  const warships = WARSHIP_STATIONS.map(([sx, sy], k) => {
    const w = interpolate(closureT, [k * 0.22, Math.min(1, k * 0.22 + 0.55)], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic),
    });
    return {
      x: interpolate(w, [0, 1], [1340, sx]),
      y: interpolate(w, [0, 1], [sy + 70, sy]),
      ang: interpolate(w, [0, 1], [-12, 0]),
      opacity: w > 0 ? 1 : 0,
      key: k,
    };
  });
  const blockadeLineOp = interpolate(closureT, [0.7, 1], [0, 0.9], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // --- Strangle: inbound merchants turn away at the blockade ---
  const turnarounds = [0, 1].map((j) => {
    const uT = interpolate(strangleT, [j * 0.3, Math.min(1, 0.55 + j * 0.3)], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    const pos = samplePath(UTURN, uT);
    const opacity = uT <= 0 ? 0 : interpolate(uT, [0.72, 1], [1, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    return {pos, opacity, key: j};
  });

  // --- Labels ---
  const setupLabelOp = interpolate(setupT, [0.1, 0.4], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }) * (1 - closureT);
  const closureLabelOp = interpolate(closureT, [0.35, 0.7], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }) * (1 - strangleT);
  const strangleLabelOp = interpolate(strangleT, [0.15, 0.45], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }) * (1 - resolveT);
  const resolveDim = interpolate(resolveT, [0, 0.6], [0, 0.55], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const panelScale = interpolate(resolveT, [0, 1], [0.92, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const mouthPulse = 0.55 + 0.45 * Math.sin(frame * 0.18);

  return (
    <div style={{width, height, backgroundColor: COLOR.night, position: 'relative', overflow: 'hidden'}}>
      <svg width={width} height={height} style={{position: 'absolute'}}>
        <g transform={`scale(${u})`}>
          {/* Sea */}
          <rect x={0} y={0} width={1280} height={720} fill={COLOR.nightOcean} />
          {/* Harbor basin glow */}
          <ellipse cx={470} cy={360} rx={290} ry={82} fill={alpha(COLOR.skyOnNight, 0.07)} />
          {/* Land masses */}
          <path d={NORTH_LAND} fill={COLOR.nightLand} stroke={COLOR.nightCoast} strokeWidth={3} />
          <path d={SOUTH_LAND} fill={COLOR.nightLand} stroke={COLOR.nightCoast} strokeWidth={3} />

          {/* Boston town marker */}
          <circle cx={430} cy={244} r={6} fill={COLOR.goldOnNight} />
          <text x={446} y={252} fontFamily={FONT.ui} fontSize={TYPE.place} fill={COLOR.onNight}>
            Boston
          </text>

          {/* Blockade line */}
          <line
            x1={900} y1={248} x2={900} y2={472}
            stroke={COLOR.red} strokeWidth={3} strokeDasharray="10 8"
            opacity={blockadeLineOp}
          />

          {/* Merchant ships */}
          {merchants.map(({pos, opacity, key}) => (
            <g key={key} transform={`translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)}) rotate(${pos.ang.toFixed(1)})`} opacity={opacity}>
              <ShipIcon size={16} hull={COLOR.brown} hullEdge={alpha(COLOR.foam, 0.5)} sail={alpha(COLOR.foam, 0.88)} />
            </g>
          ))}

          {/* Turned-away merchants (strangle) */}
          {turnarounds.map(({pos, opacity, key}) => (
            <g key={key} transform={`translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)}) rotate(${pos.ang.toFixed(1)})`} opacity={opacity}>
              <ShipIcon size={16} hull={COLOR.brown} hullEdge={alpha(COLOR.foam, 0.5)} sail={alpha(COLOR.foam, 0.88)} />
            </g>
          ))}

          {/* British warships */}
          {warships.map(({x, y, ang, opacity, key}) => (
            <g key={key} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})`} opacity={opacity}>
              <ShipIcon size={24} hull={COLOR.redDeep} hullEdge={COLOR.red} sail={alpha(COLOR.grey, 0.9)} warship />
            </g>
          ))}

          {/* Pulsing marker at the harbor mouth during closure */}
          {closureT > 0.5 && strangleT < 0.5 && (
            <circle
              cx={830} cy={360} r={26}
              fill="none" stroke={COLOR.red} strokeWidth={2.5}
              opacity={mouthPulse * closureLabelOp}
            />
          )}

          {/* Phase labels */}
          {setupLabelOp > 0 && (
            <g opacity={setupLabelOp}>
              <text x={640} y={76} textAnchor="middle" fontFamily={FONT.display} fontSize={TYPE.h3} fill={COLOR.goldOnNight}>
                Boston: busiest port in New England
              </text>
              <text x={640} y={110} textAnchor="middle" fontFamily={FONT.ui} fontSize={TYPE.body} fill={COLOR.onNightMuted}>
                merchant ships come and go freely
              </text>
            </g>
          )}
          {closureLabelOp > 0 && (
            <g opacity={closureLabelOp}>
              <text x={1040} y={150} textAnchor="middle" fontFamily={FONT.ui} fontSize={TYPE.body} fill={COLOR.redOnNight}>
                British warships take station
              </text>
              <text x={1040} y={180} textAnchor="middle" fontFamily={FONT.ui} fontSize={TYPE.body} fill={COLOR.redOnNight}>
                across the harbor mouth
              </text>
            </g>
          )}
          {strangleLabelOp > 0 && (
            <g opacity={strangleLabelOp}>
              <text x={640} y={76} textAnchor="middle" fontFamily={FONT.display} fontSize={TYPE.h3} fill={COLOR.redOnNight}>
                Trade stops — no ships in or out
              </text>
              <text x={1150} y={430} textAnchor="middle" fontFamily={FONT.ui} fontSize={TYPE.label} fill={COLOR.onNightMuted}>
                turned away
              </text>
            </g>
          )}

          {/* Resolve: dim + act panel */}
          {resolveDim > 0 && <rect x={0} y={0} width={1280} height={720} fill={alpha(COLOR.night, resolveDim)} />}
          {resolveT > 0 && (
            <g opacity={resolveT} transform={`translate(640 360) scale(${panelScale.toFixed(3)}) translate(-640 -360)`}>
              <rect x={340} y={210} width={600} height={300} rx={RADIUS.lg}
                fill={alpha(COLOR.nightPanel, 0.95)} stroke={COLOR.gold} strokeWidth={2.5} />
              <text x={640} y={285} textAnchor="middle" fontFamily={FONT.display} fontSize={TYPE.h2} fill={COLOR.goldOnNight}>
                THE BOSTON PORT ACT
              </text>
              <text x={640} y={325} textAnchor="middle" fontFamily={FONT.ui} fontSize={TYPE.body} fill={COLOR.onNightMuted}>
                1774 — one of the Intolerable Acts
              </text>
              <text x={640} y={385} textAnchor="middle" fontFamily={FONT.ui} fontSize={TYPE.body} fill={COLOR.onNight}>
                Harbor closed until the tea is paid for
              </text>
              <text x={640} y={425} textAnchor="middle" fontFamily={FONT.ui} fontSize={TYPE.body} fill={COLOR.onNight}>
                No trade in or out
              </text>
              <text x={640} y={475} textAnchor="middle" fontFamily={FONT.ui} fontSize={TYPE.caption} fill={COLOR.redOnNight}>
                1 in 3 Bostonians out of work
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
