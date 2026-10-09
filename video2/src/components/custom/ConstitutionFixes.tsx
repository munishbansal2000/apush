import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { FONT, COLOR, TYPE, RADIUS, alpha } from '../../theme/tokens';

export interface Phase {
  name: string;
  start: number; // 0-1 fraction of duration
  end: number; // 0-1 fraction of duration
}

export interface ConstitutionFixesProps {
  durationInFrames?: number;
  phases: Phase[];
}

/**
 * Expected phases (from props): setup 0–0.12 (the Articles' dashed empty slots, dimmed),
 * branches 0.12–0.45 (three solid branch boxes spring-grow in), compromise 0.45–0.7
 * (Legislative splits into House + Senate), checks 0.7–0.9 (curved arrows between
 * branches), resolve 0.9–1.0 ("WE THE PEOPLE"). Missing phases → 0 progress.
 */

interface BranchDef { id: string; name: string; power: string; fix: string; slot: string }

const BRANCHES: BranchDef[] = [
  { id: 'legislative', name: 'LEGISLATIVE', power: 'Makes the laws — and CAN TAX', fix: 'answers "no tax"', slot: 'no tax' },
  { id: 'executive', name: 'EXECUTIVE', power: 'Enforces the laws', fix: 'answers "no executive"', slot: 'no executive' },
  { id: 'judicial', name: 'JUDICIAL', power: 'Judges the laws', fix: 'answers "no courts"', slot: 'no courts' },
];

/** Branch box centers (authored at 1280×720, scaled by u). */
const BX = [290, 640, 990];
const BOX_Y = 470;
const BOX_W = 310;
const BOX_H = 230;
/** Setup slot geometry — mirrors the ArticlesWeakness dashed-slot language. */
const SLOT_Y = 200;
const SLOT_W = 170;
const SLOT_H = 84;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
/** Shared interpolate clamp — keeps every phase-driven animation bounded. */
const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 5-point star polygon points. */
const star = (cx: number, cy: number, r: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
};

/** Curved arrow path from a to b, bowed by `bow` px on `flip` side. */
const arc = (a: [number, number], b: [number, number], bow: number, flip: 1 | -1): string => {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1, nx = (-dy / len) * flip * bow, ny = (dx / len) * flip * bow;
  return `M ${a[0].toFixed(1)} ${a[1].toFixed(1)} Q ${(mx + nx).toFixed(1)} ${(my + ny).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
};

export const ConstitutionFixes: React.FC<ConstitutionFixesProps> = ({ durationInFrames: propDuration, phases }) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames: configDuration } = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  const u = (n: number) => n * (width / 1280);

  /** Phase name → 0–1 progress, driven only by props. Missing phase → 0. */
  const phaseT = (name: string): number => {
    const p = phases.find(x => x.name === name);
    if (!p || p.end <= p.start) return 0;
    return interpolate(frame, [p.start * durationInFrames, p.end * durationInFrames], [0, 1], CL);
  };

  const setupT = phaseT('setup');
  const branchesT = phaseT('branches');
  const compromiseT = phaseT('compromise');
  const checksT = phaseT('checks');
  const resolveT = phaseT('resolve');

  const setupFade = interpolate(setupT, [0.05, 0.45], [0, 1], CL);
  const slotDim = interpolate(branchesT, [0, 0.35], [1, 0.28], CL);
  const problemVis = 1 - compromiseT; // the problem exits once the compromise begins
  const connectorT = interpolate(branchesT, [0, 0.4], [0, 1], CL);

  const chamberT = interpolate(compromiseT, [0.1, 0.55], [0, 1], CL);
  const compromiseTagT = interpolate(compromiseT, [0, 0.3], [0, 1], CL);
  const legFocus = interpolate(compromiseT, [0, 0.25], [0, 1], CL);
  const arrowsT = interpolate(checksT, [0.05, 0.75], [0, 1], CL);
  const checksTagT = interpolate(checksT, [0, 0.25], [0, 1], CL);
  const resolveFade = interpolate(resolveT, [0.05, 0.55], [0, 1], CL);

  const branchPhase = phases.find(x => x.name === 'branches');
  /** Spring scale per branch, staggered — no literal frames, offset from phase start. */
  const branchScale = (i: number): number => {
    if (!branchPhase) return 0;
    const startFrame = branchPhase.start * durationInFrames + i * (durationInFrames / 45);
    const s = spring({ frame: Math.max(0, frame - startFrame), fps, config: { damping: 14, mass: 0.8, stiffness: 120 } });
    return clamp01(branchesT) <= 0 ? 0 : s;
  };

  /** Coins dropping into the Legislative box — "can tax, fixed!" (relative to box center). */
  const coin = (k: number) => {
    const t = interpolate(branchesT, [0.25 + k * 0.12, 0.62 + k * 0.12], [0, 1], CL);
    return { t, y: u(75) - (1 - t) * u(110), x: -42 + k * 42 };
  };
  const coins = [coin(0), coin(1), coin(2)];

  /** Curved check-arrows: every branch points at the other two (6 arrows). */
  const arrowPairs: { a: number; b: number; flip: 1 | -1; k: number }[] = [];
  let ak = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === j) continue;
      arrowPairs.push({ a: i, b: j, flip: i < j ? 1 : -1, k: ak++ });
    }
  }
  const arrowPath = (p: { a: number; b: number; flip: 1 | -1 }): string => {
    const a: [number, number] = [BX[p.a], BOX_Y];
    const b: [number, number] = [BX[p.b], BOX_Y];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const s: [number, number] = [a[0] + (dx / len) * 165, a[1] + (dy / len) * 100];
    const e: [number, number] = [b[0] - (dx / len) * 170, b[1] - (dy / len) * 100];
    return arc(s, e, 95, p.flip);
  };
  const arrowT = (k: number) => interpolate(arrowsT, [k * 0.09, 0.45 + k * 0.09], [0, 1], CL);

  /** Small state vs big state seat dots for the House panel. */
  const seats = (cx: number, cy: number, n: number, r: number) => {
    const dots: React.ReactNode[] = [];
    const perRow = 5;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inRow = Math.min(perRow, n - row * perRow);
      dots.push(
        <circle
          key={i}
          cx={cx + (col - (inRow - 1) / 2) * r * 2.4}
          cy={cy + row * r * 2.6}
          r={r}
          fill={COLOR.blue}
          opacity={chamberT}
        />
      );
    }
    return <g>{dots}</g>;
  };

  const sceneOpacity = 1 - resolveFade;
  const captionStyle: React.CSSProperties = { fontFamily: FONT.ui, textAlign: 'center' };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: COLOR.paper, fontFamily: FONT.text }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        {/* parchment document frame */}
        <rect x={u(24)} y={u(18)} width={width - u(48)} height={height - u(36)} fill="none" stroke={COLOR.coast} strokeWidth={u(2)} opacity={0.5} />
        <rect x={u(32)} y={u(26)} width={width - u(64)} height={height - u(52)} fill="none" stroke={COLOR.coast} strokeWidth={u(1)} opacity={0.3} />

        {/* header */}
        <text x={width / 2} y={u(64)} textAnchor="middle" fontFamily={FONT.display} fontSize={u(TYPE.h2)} fill={COLOR.ink} opacity={sceneOpacity}>
          The Constitution fixes the Articles
        </text>

        <g opacity={sceneOpacity}>
          {/* ── setup: the problem — dashed empty slots (mirror of ArticlesWeakness) ── */}
          <text x={width / 2} y={u(128)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.label)} fill={COLOR.red} opacity={setupFade * slotDim * problemVis} letterSpacing={u(3)}>
            THE PROBLEM — THE ARTICLES LEFT THESE EMPTY
          </text>
          {BRANCHES.map((b, i) => (
            <g key={b.id} opacity={setupFade * slotDim * problemVis}>
              <rect
                x={u(BX[i] - SLOT_W / 2)}
                y={u(SLOT_Y - SLOT_H / 2)}
                width={u(SLOT_W)}
                height={u(SLOT_H)}
                rx={u(RADIUS.md)}
                fill="none"
                stroke={COLOR.inkMuted}
                strokeWidth={u(2.5)}
                strokeDasharray={`${u(10)} ${u(7)}`}
              />
              <text x={u(BX[i])} y={u(SLOT_Y + 6)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.label)} fill={COLOR.inkMuted}>
                {b.slot}
              </text>
            </g>
          ))}

          {/* ── branches: three solid boxes spring-grow in ── */}
          {BRANCHES.map((b, i) => {
            const s = branchScale(i);
            if (s <= 0) return null;
            const dimmed = i !== 0 && legFocus > 0 ? 1 - legFocus * 0.78 : 1;
            const isLeg = i === 0;
            return (
              <g key={b.id} opacity={dimmed}>
                <g transform={`translate(${u(BX[i])} ${u(BOX_Y)}) scale(${s})`}>
                  <rect x={u(-BOX_W / 2)} y={u(-BOX_H / 2)} width={u(BOX_W)} height={u(BOX_H)} rx={u(RADIUS.lg)} fill={COLOR.halo} stroke={COLOR.ink} strokeWidth={u(3)} />
                  <rect x={u(-BOX_W / 2)} y={u(-BOX_H / 2)} width={u(BOX_W)} height={u(64)} rx={u(RADIUS.lg)} fill={COLOR.ink} />
                  <rect x={u(-BOX_W / 2)} y={u(-BOX_H / 2 + 40)} width={u(BOX_W)} height={u(24)} fill={COLOR.ink} />
                  <text y={u(-BOX_H / 2 + 42)} textAnchor="middle" fontFamily={FONT.display} fontSize={u(TYPE.h3)} fill={COLOR.paper}>
                    {b.name}
                  </text>
                  <text y={u(-BOX_H / 2 + 96)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.small)} fill={COLOR.inkSoft}>
                    {isLeg && chamberT > 0 ? '' : b.power}
                  </text>
                  <text y={u(-BOX_H / 2 + 118)} textAnchor="middle" fontFamily={FONT.hand} fontSize={u(TYPE.small)} fill={COLOR.green} opacity={isLeg ? 1 - chamberT : 1}>
                    {isLeg && chamberT > 0 ? '' : b.fix}
                  </text>
                  {/* branch icons */}
                  {isLeg && chamberT <= 0 && (
                    <g>
                      {coins.map((c, k) => (
                        <circle key={k} cx={u(c.x)} cy={c.y} r={u(13)} fill={COLOR.gold} stroke={COLOR.coast} strokeWidth={u(2)} opacity={c.t} />
                      ))}
                    </g>
                  )}
                  {i === 1 && chamberT <= 0 && (
                    <g>
                      <circle cx={u(0)} cy={u(75)} r={u(28)} fill={COLOR.gold} stroke={COLOR.coast} strokeWidth={u(3)} />
                      <polygon points={star(u(0), u(75), u(13))} fill={COLOR.paper} />
                    </g>
                  )}
                  {i === 2 && chamberT <= 0 && (
                    <g transform={`translate(${u(0)} ${u(75)}) rotate(-32)`}>
                      <rect x={u(-8)} y={u(-34)} width={u(16)} height={u(72)} rx={u(8)} fill={COLOR.brown} />
                      <rect x={u(-30)} y={u(-58)} width={u(60)} height={u(24)} rx={u(8)} fill={COLOR.inkSoft} />
                    </g>
                  )}
                  {/* compromise: House + Senate inside the Legislative box */}
                  {isLeg && chamberT > 0 && (
                    <g opacity={chamberT}>
                      <rect x={u(-140)} y={u(-30)} width={u(130)} height={u(150)} rx={u(RADIUS.md)} fill={alpha(COLOR.blue, 0.12)} stroke={COLOR.blue} strokeWidth={u(2.5)} />
                      <rect x={u(10)} y={u(-30)} width={u(130)} height={u(150)} rx={u(RADIUS.md)} fill={alpha(COLOR.red, 0.1)} stroke={COLOR.red} strokeWidth={u(2.5)} />
                      <text x={u(-75)} y={u(-6)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.label)} fill={COLOR.ink}>HOUSE</text>
                      <text x={u(-75)} y={u(14)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.micro)} fill={COLOR.inkSoft}>by population</text>
                      <text x={u(75)} y={u(-6)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.label)} fill={COLOR.ink}>SENATE</text>
                      <text x={u(75)} y={u(14)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.micro)} fill={COLOR.inkSoft}>equal — 2 per state</text>
                      <text x={u(-75)} y={u(38)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.micro)} fill={COLOR.inkSoft}>VA (big)</text>
                      {seats(u(-75), u(54), 10, u(6.5))}
                      <text x={u(-75)} y={u(100)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.micro)} fill={COLOR.inkSoft}>DE (small)</text>
                      {seats(u(-75), u(110), 3, u(6.5))}
                      <text x={u(75)} y={u(46)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.micro)} fill={COLOR.inkSoft}>VA</text>
                      {seats(u(75), u(58), 2, u(6.5))}
                      <text x={u(75)} y={u(96)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.micro)} fill={COLOR.inkSoft}>DE</text>
                      {seats(u(75), u(108), 2, u(6.5))}
                    </g>
                  )}
                </g>
                {/* dashed connector: empty slot → its answer */}
                {connectorT > 0 && (
                  <path
                    d={`M ${u(BX[i])} ${u(SLOT_Y + SLOT_H / 2)} Q ${u(BX[i])} ${u((SLOT_Y + BOX_Y) / 2)} ${u(BX[i])} ${u(BOX_Y - BOX_H / 2 - 6)}`}
                    fill="none"
                    stroke={COLOR.green}
                    strokeWidth={u(2.5)}
                    strokeDasharray={`${u(8)} ${u(6)}`}
                    opacity={connectorT * (1 - slotDim) * problemVis}
                  />
                )}
              </g>
            );
          })}

          {/* compromise tag — exits as the checks phase begins */}
          <g opacity={compromiseTagT * (1 - checksT)}>
            <rect x={u(490)} y={u(96)} width={u(300)} height={u(44)} rx={u(RADIUS.pill)} fill={COLOR.ink} />
            <text x={width / 2} y={u(125)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.chip)} fill={COLOR.paper} letterSpacing={u(2)}>
              THE GREAT COMPROMISE
            </text>
          </g>

          {/* ── checks: curved arrows between every pair of branches ── */}
          {checksT > 0 && (
            <g>
              <defs>
                <marker id="cf-ah" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill={COLOR.red} />
                </marker>
              </defs>
              {arrowPairs.map(p => (
                <path
                  key={p.k}
                  d={arrowPath(p)}
                  fill="none"
                  stroke={COLOR.red}
                  strokeWidth={u(3.5)}
                  pathLength={1}
                  strokeDasharray="1 1"
                  strokeDashoffset={1 - arrowT(p.k)}
                  markerEnd="url(#cf-ah)"
                  opacity={0.9}
                />
              ))}
              <text x={width / 2} y={u(150)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.body)} fill={COLOR.ink} opacity={checksTagT}>
                Checks and balances
              </text>
              <text x={width / 2} y={u(180)} textAnchor="middle" fontFamily={FONT.hand} fontSize={u(TYPE.body)} fill={COLOR.inkSoft} opacity={checksTagT}>
                “ambition must be made to counteract ambition”
              </text>
            </g>
          )}
        </g>

        {/* ── resolve: We the People ── */}
        <g opacity={resolveFade}>
          <text x={width / 2} y={u(330)} textAnchor="middle" fontFamily={FONT.display} fontSize={u(96)} fill={COLOR.ink} letterSpacing={u(6)}>
            WE THE PEOPLE
          </text>
          <rect x={u(470)} y={u(366)} width={u(340)} height={u(3)} fill={COLOR.gold} />
          <text x={width / 2} y={u(420)} textAnchor="middle" style={captionStyle} fontSize={u(TYPE.h3)} fill={COLOR.inkSoft}>
            1787 — a government that can actually govern
          </text>
        </g>
      </svg>
    </div>
  );
};
