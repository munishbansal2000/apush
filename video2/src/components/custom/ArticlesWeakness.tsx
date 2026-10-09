import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';
import {FONT, COLOR, TYPE, RADIUS, alpha} from '../../theme/tokens';

/** Time-control contract: phases as 0-1 fractions of duration. */
export interface Phase {name: string; start: number; end: number}
export interface ArticlesWeaknessProps {
  durationInFrames?: number;
  phases: Phase[];
}

/** Fallback timing when phase entries are missing. */
const DEFAULT_PHASES: Phase[] = [
  {name: 'setup', start: 0, end: 0.15},
  {name: 'notax', start: 0.15, end: 0.35},
  {name: 'noexec', start: 0.35, end: 0.55},
  {name: 'nocourt', start: 0.55, end: 0.75},
  {name: 'resolve', start: 0.75, end: 1},
];

const CAPTIONS: Record<string, string> = {
  setup: 'One small box. That was the entire federal government.',
  notax: 'Congress begs states for money',
  noexec: 'No president to enforce laws',
  nocourt: 'No courts to settle disputes',
};

/** The three missing powers — dashed empty outlines, one per failure phase. */
const SLOTS = [
  {phase: 'notax', label: 'NO POWER TO TAX', fx: 0.2, fy: 0.46, w: 205, h: 100},
  {phase: 'noexec', label: 'NO EXECUTIVE', fx: 0.5, fy: 0.77, w: 225, h: 92},
  {phase: 'nocourt', label: 'NO NATIONAL COURTS', fx: 0.8, fy: 0.46, w: 235, h: 100},
] as const;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const ArticlesWeakness: React.FC<ArticlesWeaknessProps> = ({durationInFrames: propDuration, phases}) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames: configDuration} = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  const u = width / 1280;

  const list = phases && phases.length ? phases : DEFAULT_PHASES;
  const phaseT = (name: string): number => {
    const p = list.find((q) => q.name === name) ?? {name, start: 0, end: 1};
    return interpolate(frame, [p.start * durationInFrames, p.end * durationInFrames], [0, 1], clamp);
  };

  const st = phaseT('setup');
  const nt = phaseT('notax');
  const nx = phaseT('noexec');
  const nc = phaseT('nocourt');
  const nr = phaseT('resolve');

  const cxC = width * 0.5;
  const cyC = height * 0.46;
  const boxW = 190 * u;
  const boxH = 96 * u;

  // Congress box entrance + a weak wobble whenever an attempt fails.
  const boxPop = interpolate(st, [0, 1], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.4))});
  const failShake = Math.max(
    interpolate(nt, [0.55, 0.68, 1], [0, 1, 0], clamp),
    interpolate(nx, [0.5, 0.63, 1], [0, 1, 0], clamp),
    interpolate(nc, [0.5, 0.63, 1], [0, 1, 0], clamp),
  );
  const boxX = cxC + failShake * Math.sin(frame * 0.9) * 3 * u;

  /** Dashed empty slot + red ✗. Same visual grammar for all three failures. */
  const slot = (def: (typeof SLOTS)[number], n: number) => {
    const w = def.w * u;
    const h = def.h * u;
    const pop = interpolate(n, [0, 0.18], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.5))});
    const xPop = interpolate(n, [0.55, 0.75], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.8))});
    const alert = interpolate(n, [0.3, 0.45], [0, 1], clamp) > 0.5;
    const s = 44 * u * xPop;
    return (
      <g key={def.phase} opacity={pop} transform={`translate(${def.fx * width} ${def.fy * height}) scale(${Math.max(0.001, pop)})`}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={RADIUS.md * u}
          fill={alpha(COLOR.red, alert ? 0.05 : 0)} stroke={alert ? COLOR.red : COLOR.inkMuted}
          strokeWidth={3 * u} strokeDasharray={`${10 * u} ${8 * u}`} />
        <g opacity={xPop}>
          <line x1={-s} y1={-s} x2={s} y2={s} stroke={COLOR.red} strokeWidth={7 * u} strokeLinecap="round" />
          <line x1={s} y1={-s} x2={-s} y2={s} stroke={COLOR.red} strokeWidth={7 * u} strokeLinecap="round" />
        </g>
        <text x={0} y={h / 2 - 13 * u} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700}
          fontSize={TYPE.label * u} letterSpacing={1.5 * u} fill={alert ? COLOR.red : COLOR.inkMuted}>
          {def.label}
        </text>
      </g>
    );
  };

  // notax: coins fly IN toward Congress, bounce off, spin away.
  const coinX0 = SLOTS[0].fx * width + (SLOTS[0].w / 2) * u + 30 * u;
  const coinXHit = boxX - boxW / 2 - 18 * u;
  const coinX = interpolate(nt, [0, 0.55, 1], [coinX0, coinXHit, coinX0 + 34 * u], clamp);
  const coinArc = interpolate(nt, [0.55, 0.68, 0.8, 1], [0, -16 * u, 8 * u, 0], clamp);
  const coinSpin = interpolate(nt, [0.55, 1], [0, 300], clamp);
  const coinOp = interpolate(nt, [0, 0.08, 0.92, 1], [0, 1, 1, 0], clamp);
  const ripple = interpolate(nt, [0.5, 0.82], [0, 1], clamp);
  const rippleOp = interpolate(nt, [0.5, 0.82], [0.7, 0], clamp);

  // noexec: the ENFORCE order draws downward, then fizzles into sparks.
  const drawP = interpolate(nx, [0.05, 0.45], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const execTop = SLOTS[1].fy * height - (SLOTS[1].h / 2) * u;
  const ordY0 = cyC + boxH / 2 + 10 * u;
  const ordY1 = execTop - 12 * u;
  const ordY = interpolate(drawP, [0, 1], [ordY0, ordY1]);
  const ordOp = interpolate(nx, [0.5, 0.62, 0.95], [1, 1, 0], clamp);
  const fzDist = interpolate(nx, [0.55, 1], [0, 46 * u], clamp);
  const fzOp = interpolate(nx, [0.55, 0.7, 1], [0, 0.9, 0], clamp);

  // nocourt: two states' arrows meet at the empty slot — nowhere to be judged.
  const move = interpolate(nc, [0.05, 0.5], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const courtCx = SLOTS[2].fx * width;
  const courtHalf = (SLOTS[2].w / 2) * u;
  const jit = interpolate(nc, [0.5, 1], [0, 1], clamp) * Math.sin(frame * 1.1) * 4 * u;
  const ax = interpolate(move, [0, 1], [courtCx - courtHalf - 150 * u, courtCx - courtHalf - 26 * u]) + jit;
  const bx = interpolate(move, [0, 1], [courtCx + courtHalf + 150 * u, courtCx + courtHalf + 26 * u]) - jit;
  const dispY = height * 0.46;
  const dispOp = interpolate(nc, [0, 0.08, 0.6, 0.95], [0, 1, 1, 0], clamp);
  const qOp = interpolate(nc, [0.45, 0.6, 0.85], [0, 1, 0], clamp);

  const capOp = (n: number) =>
    Math.min(interpolate(n, [0, 0.12], [0, 1], clamp), interpolate(n, [0.88, 1], [1, 0], clamp));
  const resolveOp = interpolate(nr, [0, 0.15], [0, 1], clamp);
  const shaysOp = interpolate(nr, [0.25, 0.45], [0, 1], clamp);

  const head = (x: number, y: number, dir: 1 | -1, color: string) => (
    <polygon points={`${x},${y} ${x - dir * 12 * u},${y - 6.6 * u} ${x - dir * 12 * u},${y + 6.6 * u}`} fill={color} />
  );

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="paperGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7f2e6" />
          <stop offset="1" stopColor={COLOR.paperDeep} />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#paperGrad)" />
      <rect x={18 * u} y={18 * u} width={width - 36 * u} height={height - 36 * u} fill="none" stroke={COLOR.ink} strokeWidth={3 * u} />
      <rect x={26 * u} y={26 * u} width={width - 52 * u} height={height - 52 * u} fill="none" stroke={COLOR.inkMuted} strokeWidth={1 * u} />

      {/* header */}
      <rect x={52 * u} y={44 * u} width={262 * u} height={30 * u} rx={RADIUS.pill * u} fill={COLOR.ink} />
      <text x={183 * u} y={65 * u} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700}
        fontSize={TYPE.micro * u} letterSpacing={2.5 * u} fill={COLOR.paper}>
        U3E6 · THE CONFEDERATION ERA
      </text>
      <text x={width / 2} y={118 * u} textAnchor="middle" fontFamily={FONT.display} fontWeight={700}
        fontSize={52 * u} fill={COLOR.ink}>
        Why the Articles Failed
      </text>

      {/* resolve: faint tethers from Congress to each empty slot */}
      <g opacity={resolveOp * 0.6}>
        {SLOTS.map((s) => (
          <line key={s.phase} x1={cxC} y1={cyC} x2={s.fx * width} y2={s.fy * height}
            stroke={COLOR.inkMuted} strokeWidth={1.5 * u} strokeDasharray={`${6 * u} ${6 * u}`} />
        ))}
      </g>

      {/* CONGRESS — the entire federal government, one small box */}
      <g opacity={boxPop} transform={`translate(${boxX} ${cyC}) scale(${Math.max(0.001, boxPop)})`}>
        <rect x={-boxW / 2} y={-boxH / 2} width={boxW} height={boxH} rx={RADIUS.md * u}
          fill={COLOR.halo} stroke={COLOR.ink} strokeWidth={3.5 * u}
          style={{filter: `drop-shadow(0 ${6 * u}px ${10 * u}px rgba(20,12,4,0.3))`}} />
        <text x={0} y={-6 * u} textAnchor="middle" fontFamily={FONT.display} fontWeight={700}
          fontSize={34 * u} letterSpacing={3 * u} fill={COLOR.ink}>
          CONGRESS
        </text>
        <text x={0} y={24 * u} textAnchor="middle" fontFamily={FONT.text} fontStyle="italic"
          fontSize={TYPE.small * u} fill={COLOR.inkSoft}>
          the entire federal government
        </text>
      </g>

      {/* the three missing-power slots (persist once revealed) */}
      {slot(SLOTS[0], Math.max(nt, nr))}
      {slot(SLOTS[1], Math.max(nx, nr))}
      {slot(SLOTS[2], Math.max(nc, nr))}

      {/* notax: coins bounce off Congress */}
      <g opacity={coinOp}>
        <circle cx={coinXHit} cy={cyC} r={10 * u + ripple * 34 * u} fill="none" stroke={COLOR.red} strokeWidth={3 * u} opacity={rippleOp} />
        {[-24, 0, 24].map((dy) => (
          <g key={dy} transform={`translate(${coinX} ${cyC + dy * u + coinArc}) rotate(${coinSpin})`}>
            <circle r={15 * u} fill={COLOR.gold} stroke={COLOR.brown} strokeWidth={2.5 * u} />
            <circle r={9.5 * u} fill="none" stroke={COLOR.brown} strokeWidth={1.2 * u} />
            <text x={0} y={6 * u} textAnchor="middle" fontFamily={FONT.ui} fontWeight={800}
              fontSize={16 * u} fill={COLOR.brown}>$</text>
          </g>
        ))}
        <text x={coinX0 - 40 * u} y={cyC - 52 * u} textAnchor="middle" fontFamily={FONT.hand}
          fontSize={TYPE.body * u} fill={COLOR.inkSoft} opacity={interpolate(nt, [0, 0.2, 0.5], [0, 1, 0], clamp)}>
          tax revenue?
        </text>
      </g>

      {/* noexec: the order fizzles before reaching the slot */}
      <g opacity={ordOp}>
        <line x1={cxC} y1={ordY0} x2={cxC} y2={ordY} stroke={COLOR.blue} strokeWidth={5 * u} strokeLinecap="round" />
        <polygon points={`${cxC},${ordY + 12 * u} ${cxC - 8 * u},${ordY - 4 * u} ${cxC + 8 * u},${ordY - 4 * u}`}
          fill={COLOR.blue} opacity={drawP > 0.02 ? 1 : 0} />
        <text x={cxC + 26 * u} y={(ordY0 + ordY) / 2} fontFamily={FONT.ui} fontWeight={700}
          fontSize={TYPE.micro * u} letterSpacing={2 * u} fill={COLOR.blue}>
          ENFORCE
        </text>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2 + 0.5;
          return <circle key={i} cx={cxC + Math.cos(a) * fzDist} cy={ordY1 + Math.sin(a) * fzDist} r={3.2 * u} fill={COLOR.red} opacity={fzOp} />;
        })}
      </g>

      {/* nocourt: STATE A vs STATE B — nowhere to be judged */}
      <g opacity={dispOp}>
        <text x={ax - 60 * u} y={dispY - 34 * u} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700}
          fontSize={TYPE.micro * u} letterSpacing={1.5 * u} fill={COLOR.inkSoft}>STATE A</text>
        <text x={bx + 60 * u} y={dispY - 34 * u} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700}
          fontSize={TYPE.micro * u} letterSpacing={1.5 * u} fill={COLOR.inkSoft}>STATE B</text>
        <line x1={ax - 56 * u} y1={dispY} x2={ax} y2={dispY} stroke={COLOR.brown} strokeWidth={5 * u} strokeLinecap="round" />
        {head(ax, dispY, 1, COLOR.brown)}
        <line x1={bx + 56 * u} y1={dispY} x2={bx} y2={dispY} stroke={COLOR.brown} strokeWidth={5 * u} strokeLinecap="round" />
        {head(bx, dispY, -1, COLOR.brown)}
        <text x={courtCx} y={dispY - 44 * u} textAnchor="middle" fontFamily={FONT.hand}
          fontSize={44 * u} fill={COLOR.red} opacity={qOp}>?</text>
      </g>

      {/* resolve: the summary */}
      <g opacity={resolveOp}>
        <text x={width / 2} y={172 * u} textAnchor="middle" fontFamily={FONT.display} fontWeight={700}
          fontSize={40 * u} fill={COLOR.ink}>
          A government that can&apos;t tax,
        </text>
        <text x={width / 2} y={222 * u} textAnchor="middle" fontFamily={FONT.display} fontWeight={700}
          fontSize={40 * u} fill={COLOR.red}>
          enforce, or judge — can&apos;t govern.
        </text>
      </g>
      <text x={width / 2} y={height - 74 * u} textAnchor="middle" fontFamily={FONT.text} fontStyle="italic"
        fontSize={TYPE.caption * u} fill={COLOR.inkSoft} opacity={shaysOp}>
        Shays&apos; Rebellion proved it, 1786–87
      </text>

      {/* phase captions */}
      {[
        {key: 'setup', n: st},
        {key: 'notax', n: nt},
        {key: 'noexec', n: nx},
        {key: 'nocourt', n: nc},
      ].map(({key, n}) => (
        <text key={key} x={width / 2} y={height - 74 * u} textAnchor="middle" fontFamily={FONT.text}
          fontStyle="italic" fontSize={TYPE.h3 * u} fill={COLOR.ink} opacity={capOp(n)}>
          {CAPTIONS[key]}
        </text>
      ))}
    </svg>
  );
};

export default ArticlesWeakness;
