import React from 'react';
import {Easing, interpolate} from 'remotion';
import {FONT, TYPE, alpha} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, paperHalo, usePhases, type CustomProps, type Phase} from './kit';

/**
 * Hamilton's assumption of state debts, 1790 (APUSH Unit 3, u3e9 L11 / L35): the federal government takes on the
 * states' war debts.
 *
 * Thirteen stacks of state debt certificates rise across a parchment sheet, each in proportion to the amount the
 * federal government agreed to assume for that state; then the certificates fly, sheet by sheet, onto one federal
 * pile, the camera easing in. Funding (paying the national debt at face value) is a separate beat and not shown.
 * No dollar figures on screen; the stack heights carry the proportions.
 *
 * DEFAULT_PHASES: setup (state stacks rise) / assumption (certificates fly to the federal pile).
 */
export const DEFAULT_PHASES: Phase[] = [
  {name: 'setup', start: 0, end: 0.28},
  {name: 'assumption', start: 0.28, end: 1},
];

export type HamiltonFinanceFlowProps = CustomProps;

/**
 * Assumption allotments, $ millions, north to south. Basis: Funding Act of 1790 (Act of Aug. 4, 1790, sec. 13), which
 * capped assumption at $21.5M in these per-state amounts (total 21.5). One sheet drawn per $0.2M.
 */
const STATES = [
  {abbr: 'NH', m: 0.3}, {abbr: 'MA', m: 4.0}, {abbr: 'RI', m: 0.2}, {abbr: 'CT', m: 1.6}, {abbr: 'NY', m: 1.2},
  {abbr: 'NJ', m: 0.8}, {abbr: 'PA', m: 2.2}, {abbr: 'DE', m: 0.2}, {abbr: 'MD', m: 0.8}, {abbr: 'VA', m: 3.5},
  {abbr: 'NC', m: 2.4}, {abbr: 'SC', m: 4.0}, {abbr: 'GA', m: 0.3},
];
const SHEET_M = 0.2;
const SHEET_H = 7; // authored px per sheet
const SHEET_W = 64;
const FED = {x: 640, y: 640}; // base of the federal pile (authored)
const FED_W = 230;

const sheetsOf = (m: number) => Math.max(1, Math.round(m / SHEET_M));
const TOTAL_SHEETS = STATES.reduce((n, s) => n + sheetsOf(s.m), 0);
const FED_LAYER_H = 5; // authored px per sheet on the federal pile (several sheets per row)
const FED_PER_ROW = 3;

/** Base of each state stack: an even arc across the top of the frame. */
const stateBase = (i: number): [number, number] => {
  const f = i / (STATES.length - 1);
  return [90 + f * 1100, 330 - Math.sin(f * Math.PI) * 60];
};

function quad(a: [number, number], b: [number, number], c: [number, number], t: number): [number, number] {
  const s = 1 - t;
  return [s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]];
}

export const HamiltonFinanceFlow: React.FC<HamiltonFinanceFlowProps> = ({durationInFrames, phases}) => {
  const {u, t} = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const setupT = t('setup');
  const assumeT = t('assumption');
  const halo = paperHalo(u);

  // Departure schedule: states stagger in, each sends its sheets top-first; every sheet flies for 0.14 of the phase.
  const FLY = 0.14;
  let arrived = 0;
  const stacks: React.ReactElement[] = [];
  const flying: React.ReactElement[] = [];

  STATES.forEach((s, si) => {
    const n = sheetsOf(s.m);
    const [bx, by] = stateBase(si);
    const rise = interpolate(setupT, [si * 0.04, si * 0.04 + 0.45], [0, 1], {...CLAMP, easing: Easing.out(Easing.cubic)});
    let remaining = 0;
    for (let j = n - 1; j >= 0; j--) {
      // top sheet (j = n-1) leaves first
      const order = (n - 1 - j) / Math.max(1, n);
      const depart = si * 0.035 + order * 0.38;
      const p = interpolate(assumeT, [depart, depart + FLY], [0, 1], {...CLAMP, easing: Easing.inOut(Easing.quad)});
      if (p <= 0) {
        remaining++;
      } else if (p >= 1) {
        arrived++;
      } else {
        const from: [number, number] = [bx, by - (j + 1) * SHEET_H];
        const to: [number, number] = [FED.x + ((si % 5) - 2) * 30, FED.y - 20 - assumeT * 170];
        const ctrl: [number, number] = [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - 120];
        const [x, y] = quad(from, to, ctrl, p);
        flying.push(
          <rect key={`f${si}-${j}`} x={u(x - SHEET_W / 2)} y={u(y)} width={u(SHEET_W)} height={u(SHEET_H + 2)} fill={PAPER.bg} stroke={PAPER.red}
            strokeWidth={u(1.2)} transform={`rotate(${(p - 0.5) * 30 * (si % 2 ? 1 : -1)} ${u(x)} ${u(y)})`} />,
        );
      }
    }
    // the stack: remaining sheets, revealed bottom-up by the setup rise
    const shown = Math.round(remaining * rise);
    stacks.push(
      <g key={s.abbr} opacity={Math.min(1, rise * 3)}>
        {Array.from({length: shown}, (_, k) => (
          <rect key={k} x={u(bx - SHEET_W / 2 + ((k * 7) % 3) - 1)} y={u(by - (k + 1) * SHEET_H)} width={u(SHEET_W)} height={u(SHEET_H)}
            fill={k % 2 ? PAPER.bg : PAPER.land} stroke={PAPER.red} strokeWidth={u(1)} />
        ))}
        <text x={u(bx)} y={u(by + 26)} textAnchor="middle" fill={PAPER.ink} fontSize={u(TYPE.town)} fontWeight={700} {...halo}>{s.abbr}</text>
      </g>,
    );
  });

  // Federal pile grows as sheets land.
  const rows = Math.ceil(arrived / FED_PER_ROW);
  const fedIn = interpolate(setupT, [0.5, 1], [0, 1], CLAMP);
  const fedFull = arrived / TOTAL_SHEETS;
  const zoom = 1 + 0.06 * assumeT;

  return (
    <PaperSheet fontFamily={FONT.display}>
      <svg width="100%" height="100%" viewBox={`0 0 ${u(1280)} ${u(720)}`} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(${u(640)} ${u(400)}) scale(${zoom}) translate(${u(-640)} ${u(-400)})`}>
          {stacks}

          {/* Federal pile */}
          <g opacity={fedIn}>
            <ellipse cx={u(FED.x)} cy={u(FED.y + 6)} rx={u(FED_W * 0.62)} ry={u(14)} fill={alpha(PAPER.ink, 0.15)} />
            {Array.from({length: rows}, (_, r) => (
              <rect key={r} x={u(FED.x - FED_W / 2 + ((r * 5) % 4) - 2)} y={u(FED.y - (r + 1) * FED_LAYER_H)} width={u(FED_W)} height={u(FED_LAYER_H)}
                fill={r % 2 ? PAPER.bg : PAPER.land} stroke={PAPER.gold} strokeWidth={u(1)} />
            ))}
            {fedFull > 0.98 && (
              <rect x={u(FED.x - FED_W / 2 - 6)} y={u(FED.y - rows * FED_LAYER_H - 4)} width={u(FED_W + 12)} height={u(rows * FED_LAYER_H + 8)} fill="none"
                stroke={PAPER.gold} strokeWidth={u(3)} opacity={interpolate(assumeT, [0.92, 1], [0, 1], CLAMP)} />
            )}
            <text x={u(FED.x)} y={u(FED.y + 44)} textAnchor="middle" fill={PAPER.ink} fontSize={u(TYPE.place)} fontWeight={700} letterSpacing={u(4)} {...halo}>
              UNITED STATES
            </text>
          </g>

          {flying}
        </g>
      </svg>
    </PaperSheet>
  );
};

export default HamiltonFinanceFlow;
