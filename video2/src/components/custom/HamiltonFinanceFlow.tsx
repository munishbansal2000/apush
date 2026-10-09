import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';
import {FONT, COLOR, TYPE, RADIUS, alpha} from '../../theme/tokens';

/** Time-control contract: phases as 0-1 fractions of duration. No hardcoded frame numbers. */
export interface Phase {name: string; start: number; end: number}
export interface HamiltonFinanceFlowProps {
  durationInFrames?: number;
  phases?: Phase[];
}

const DEFAULT_PHASES: Phase[] = [
  {name: 'setup', start: 0, end: 0.12},
  {name: 'assumption', start: 0.12, end: 0.38},
  {name: 'bank', start: 0.38, end: 0.62},
  {name: 'tariff', start: 0.62, end: 0.85},
  {name: 'resolve', start: 0.85, end: 1.0},
];

const PHASE_LABELS: Record<string, string> = {
  setup: 'States drowning in war debt',
  assumption: 'Assumption: the feds take all state debts',
  bank: 'A national bank steadies the currency',
  tariff: 'Tariffs: the government’s income',
};

/** Representative state debt piles (x/y fractions of 1280×720, approx. 1790 figures). */
const STATES = [
  {abbr: 'MA', debt: '$4.5M', x: 0.13, y: 0.30},
  {abbr: 'SC', debt: '$3.9M', x: 0.24, y: 0.72},
  {abbr: 'VA', debt: '$3.4M', x: 0.44, y: 0.22},
  {abbr: 'NY', debt: '$2.7M', x: 0.62, y: 0.68},
  {abbr: 'PA', debt: '$2.0M', x: 0.76, y: 0.30},
  {abbr: 'CT', debt: '$1.6M', x: 0.90, y: 0.60},
];

const VAULT = {x: 0.5, y: 0.55};
const COINS_PER_STATE = 8;
const TARIFF_COINS = 16;

function quad(a: number[], b: number[], c: number[], t: number): [number, number] {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
  ];
}

export const HamiltonFinanceFlow: React.FC<HamiltonFinanceFlowProps> = ({
  durationInFrames: propDuration,
  phases = DEFAULT_PHASES,
}) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames: configDuration} = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  const u = width / 1280;
  const t = frame / Math.max(1, durationInFrames);

  const getPhase = (name: string) => phases.find(p => p.name === name) ?? {start: 0, end: 1};
  const phaseT = (name: string, ease = true) => {
    const p = getPhase(name);
    return interpolate(t, [p.start, p.end], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: ease ? Easing.inOut(Easing.cubic) : Easing.linear,
    });
  };

  const setupT = phaseT('setup');
  const assumeT = phaseT('assumption');
  const bankT = phaseT('bank');
  const tariffT = phaseT('tariff');
  const resolveT = phaseT('resolve');

  const setupEnd = getPhase('setup').end;
  const bankStart = getPhase('bank').start;

  const cx = VAULT.x * width;
  const cy = VAULT.y * height;

  // Which phase label is currently active?
  const activeLabel = t < setupEnd ? PHASE_LABELS.setup
    : t < getPhase('assumption').end ? PHASE_LABELS.assumption
    : t < bankStart ? PHASE_LABELS.assumption
    : t < getPhase('bank').end ? PHASE_LABELS.bank
    : t < getPhase('tariff').end ? PHASE_LABELS.tariff
    : '';

  const dim = interpolate(resolveT, [0, 1], [1, 0.25]);

  // Assumption coins: staggered per state, arcing into the vault
  const assumptionCoins: React.ReactElement[] = [];
  STATES.forEach((s, si) => {
    const sx = s.x * width, sy = s.y * height;
    const ctrl: [number, number] = [(sx + cx) / 2, Math.min(sy, cy) - 90 * u];
    for (let i = 0; i < COINS_PER_STATE; i++) {
      const delay = si * 0.06 + i * 0.055;
      const lt = interpolate(assumeT, [delay, Math.min(1, delay + 0.45)], [0, 1], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });
      if (lt <= 0) continue;
      const [px, py] = quad([sx, sy], [cx, cy], ctrl, lt);
      const r = (7 - lt * 2) * u;
      assumptionCoins.push(
        <circle key={`a-${si}-${i}`} cx={px} cy={py} r={r}
          fill={COLOR.gold} stroke={COLOR.brown} strokeWidth={1.5 * u}
          opacity={0.4 + 0.6 * lt} />
      );
    }
  });

  // Tariff coins: from ships at both edges inward to the vault
  const tariffCoins: React.ReactElement[] = [];
  for (let i = 0; i < TARIFF_COINS; i++) {
    const fromLeft = i % 2 === 0;
    const sx = (fromLeft ? 0.06 : 0.94) * width;
    const sy = (0.32 + (i % 4) * 0.12) * height;
    const ctrl: [number, number] = [(sx + cx) / 2, (sy + cy) / 2 - 70 * u];
    const delay = i * 0.045;
    const lt = interpolate(tariffT, [delay, Math.min(1, delay + 0.4)], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    if (lt <= 0) continue;
    const [px, py] = quad([sx, sy], [cx, cy], ctrl, lt);
    tariffCoins.push(
      <circle key={`t-${i}`} cx={px} cy={py} r={6.5 * u}
        fill={COLOR.amber} stroke={COLOR.brown} strokeWidth={1.5 * u}
        opacity={0.4 + 0.6 * lt} />
    );
  }

  const bankScale = interpolate(bankT, [0, 0.45], [0.5, 1], {extrapolateRight: 'clamp'});
  const bankOp = interpolate(bankT, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'});
  const rings = [0, 1, 2].map(i => {
    const rt = interpolate(bankT, [0.15 + i * 0.18, 0.55 + i * 0.18], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    return rt;
  });

  const fedPileH = 26 * u + assumeT * 110 * u;
  const fedFade = interpolate(assumeT, [0.25, 0.45], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect width={width} height={height} fill={COLOR.paper} />
      <rect width={width} height={height} fill={COLOR.paperDeep} opacity={0.25} />

      <g opacity={dim}>
        {/* State debt piles */}
        {STATES.map((s, i) => {
          const pileScale = 1 - assumeT * 0.85;
          const pop = interpolate(setupT, [i * 0.1, i * 0.1 + 0.4], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6)),
          });
          const px = s.x * width, py = s.y * height;
          const w = 76 * u * pileScale * pop, h = 52 * u * pileScale * pop;
          return (
            <g key={s.abbr} opacity={pop}>
              <rect x={px - w / 2} y={py - h / 2} width={w} height={h}
                rx={RADIUS.sm * u} fill={alpha(COLOR.red, 0.16)} stroke={COLOR.red}
                strokeWidth={2 * u} />
              {[0, 1, 2].map(k => (
                <line key={k} x1={px - w / 2 + 8 * u} y1={py - h / 2 + (k + 1) * h / 4}
                  x2={px + w / 2 - 8 * u} y2={py - h / 2 + (k + 1) * h / 4}
                  stroke={COLOR.red} strokeWidth={2.4 * u} opacity={0.55} />
              ))}
              <text x={px} y={py - h / 2 - 14 * u} textAnchor="middle"
                fontFamily={FONT.ui} fontWeight={800} fontSize={TYPE.label * u} fill={COLOR.ink}>
                {s.abbr}
              </text>
              <text x={px} y={py + h / 2 + 22 * u} textAnchor="middle"
                fontFamily={FONT.mono} fontSize={TYPE.flow * u} fill={COLOR.red} fontWeight={700}>
                {s.debt}
              </text>
            </g>
          );
        })}

        {/* Money flows */}
        <g>{assumptionCoins}</g>
        <g>{tariffCoins}</g>

        {/* Federal vault */}
        <g opacity={Math.max(setupT > 0 ? fedFade : 0, assumeT > 0 ? fedFade : 0)}>
          <rect x={cx - 110 * u} y={cy - fedPileH - 10 * u} width={220 * u} height={fedPileH}
            rx={RADIUS.md * u} fill={alpha(COLOR.blue, 0.85)} />
          {[0, 1, 2, 3].map(k => (
            <ellipse key={k} cx={cx} cy={cy - 10 * u - k * (fedPileH / 4)}
              rx={100 * u} ry={9 * u} fill="none" stroke={COLOR.gold}
              strokeWidth={2 * u} opacity={0.8} />
          ))}
          <rect x={cx - 130 * u} y={cy + 6 * u} width={260 * u} height={44 * u}
            rx={RADIUS.sm * u} fill={COLOR.ink} />
          <text x={cx} y={cy + 36 * u} textAnchor="middle"
            fontFamily={FONT.ui} fontWeight={800} fontSize={TYPE.chip * u}
            fill={COLOR.paper} letterSpacing={2 * u}>
            FEDERAL GOVERNMENT
          </text>
        </g>

        {/* Bank of the United States */}
        {bankOp > 0 && (
          <g transform={`translate(${cx} ${cy - 250 * u}) scale(${bankScale})`} opacity={bankOp}>
            {rings.map((rt, i) => rt > 0 && (
              <circle key={i} cx={0} cy={0} r={120 * u + rt * 160 * u}
                fill="none" stroke={COLOR.gold} strokeWidth={3 * u} opacity={(1 - rt) * 0.7} />
            ))}
            <g fill={alpha(COLOR.paper, 0.96)} stroke={COLOR.ink} strokeWidth={2.5 * u}>
              <polygon points={`0,${-70 * u} ${-90 * u},${-20 * u} ${90 * u},${-20 * u}`} />
              {[-60, -30, 0, 30, 60].map(x => (
                <rect key={x} x={(x - 9) * u} y={-20 * u} width={18 * u} height={58 * u} />
              ))}
              <rect x={-100 * u} y={38 * u} width={200 * u} height={14 * u} />
              <rect x={-100 * u} y={52 * u} width={200 * u} height={10 * u} />
            </g>
            <text x={0} y={86 * u} textAnchor="middle" fontFamily={FONT.ui}
              fontWeight={800} fontSize={TYPE.flow * u} fill={COLOR.ink} letterSpacing={1 * u}>
              BANK OF THE UNITED STATES
            </text>
          </g>
        )}

        {/* Ships (tariff sources) */}
        {tariffT > 0 && (
          <g opacity={interpolate(tariffT, [0, 0.15], [0, 1], {extrapolateRight: 'clamp'})}>
            {[0.06, 0.94].map((fx, i) => {
              const sx = fx * width, sy = 0.44 * height;
              const flip = i === 1 ? -1 : 1;
              return (
                <g key={i} transform={`translate(${sx} ${sy}) scale(${flip * u} ${u})`}>
                  <path d="M -46 10 L 46 10 L 30 34 L -30 34 Z"
                    fill={COLOR.coast} stroke={COLOR.ink} strokeWidth={2} />
                  <rect x={-5} y={-38} width={10} height={48} fill={COLOR.ink} />
                  <path d="M 5 -38 L 5 -6 L 44 -6 Z" fill={COLOR.paperDeep}
                    stroke={COLOR.ink} strokeWidth={2} />
                  <path d="M -5 -30 L -5 -6 L -38 -6 Z" fill={COLOR.paperDeep}
                    stroke={COLOR.ink} strokeWidth={2} />
                </g>
              );
            })}
          </g>
        )}
      </g>

      {/* Active phase label */}
      {activeLabel && (
        <g opacity={interpolate(setupT, [0, 0.05], [0, 1], {extrapolateRight: 'clamp'})}>
          <rect x={0} y={0} width={width} height={74 * u} fill={COLOR.ink} opacity={0.88} />
          <text x={width / 2} y={47 * u} textAnchor="middle"
            fontFamily={FONT.display} fontWeight={700} fontSize={TYPE.h3 * u} fill={COLOR.paper}>
            {activeLabel}
          </text>
        </g>
      )}

      {/* Resolve: summary + payoff */}
      {resolveT > 0 && (
        <g opacity={interpolate(resolveT, [0, 0.25], [0, 1], {extrapolateRight: 'clamp'})}>
          <rect x={width / 2 - 430 * u} y={height * 0.28} width={860 * u} height={250 * u}
            rx={RADIUS.lg * u} fill={COLOR.ink} opacity={0.94} />
          <text x={width / 2} y={height * 0.28 + 62 * u} textAnchor="middle"
            fontFamily={FONT.display} fontWeight={700} fontSize={TYPE.h3 * u} fill={COLOR.gold}>
            Hamilton’s bet
          </text>
          <text x={width / 2} y={height * 0.28 + 118 * u} textAnchor="middle"
            fontFamily={FONT.text} fontSize={TYPE.body * u} fill={COLOR.paper}>
            a funded debt + a bank + tariffs = American credit
          </text>
          <text x={width / 2} y={height * 0.28 + 178 * u} textAnchor="middle"
            fontFamily={FONT.text} fontStyle="italic" fontSize={TYPE.caption * u}
            fill={COLOR.gold}>
            By 1794, U.S. bonds trade at par in Europe
          </text>
        </g>
      )}
    </svg>
  );
};

export default HamiltonFinanceFlow;
