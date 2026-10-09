import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';
import {FONT, COLOR, TYPE, RADIUS, alpha} from '../../theme/tokens';

/** Time-control contract: phases as 0-1 fractions of duration. */
export interface Phase {name: string; start: number; end: number}
export interface StampActTaxProps {
  durationInFrames?: number;
  phases: Phase[];
}

const DEFAULT_PHASES: Phase[] = [
  {name: 'setup', start: 0, end: 0.15},
  {name: 'stamp', start: 0.15, end: 0.55},
  {name: 'cost', start: 0.55, end: 0.8},
  {name: 'resolve', start: 0.8, end: 1.0},
];

const CL = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
type ItemKind = 'news' | 'deed' | 'cards' | 'pamphlet' | 'license';

interface DeskItem {
  name: string; kind: ItemKind;
  x: number; y: number; // center, fractions of width/height
  w: number; h: number; // px at 1280x720
  rot: number; // degrees
  pre: number; post: number; unit: string; // price before/after tax
}

const ITEMS: DeskItem[] = [
  {name: 'Newspaper', kind: 'news', x: 0.14, y: 0.42, w: 250, h: 330, rot: -6, pre: 2, post: 3, unit: 'd'},
  {name: 'Deed', kind: 'deed', x: 0.33, y: 0.48, w: 240, h: 300, rot: 4, pre: 3, post: 5, unit: 's'},
  {name: 'Playing cards', kind: 'cards', x: 0.52, y: 0.42, w: 220, h: 280, rot: -4, pre: 1, post: 2, unit: 's'},
  {name: 'Pamphlet', kind: 'pamphlet', x: 0.70, y: 0.48, w: 220, h: 260, rot: 6, pre: 2, post: 4, unit: 'd'},
  {name: 'Marriage license', kind: 'license', x: 0.88, y: 0.42, w: 240, h: 300, rot: -5, pre: 5, post: 10, unit: 's'},
];

/** Abstract ink lines suggesting printed text (centered on x=0). */
function textLines(u: (n: number) => number, y0: number, count: number, gap: number, lw: number) {
  return Array.from({length: count}, (_, i) => (
    <rect key={i} x={u(-lw / 2)} y={u(y0 + i * gap)} width={u(lw)} height={u(5)} rx={u(2.5)} fill={alpha(COLOR.inkMuted, 0.55)} />
  ));
}

/** Per-item paper decoration, drawn around the item's center. */
function itemDetail(kind: ItemKind, w: number, h: number, u: (n: number) => number) {
  switch (kind) {
    case 'news': return (
      <g>
        <rect x={u(-w * 0.4)} y={u(-h / 2 + 20)} width={u(w * 0.8)} height={u(32)} fill={COLOR.ink} />
        <text x={0} y={u(-h / 2 + 45)} textAnchor="middle" fontFamily={FONT.display} fontSize={u(20)} fill={COLOR.paper}>GAZETTE</text>
        {textLines(u, -h / 2 + 92, 9, 22, w * 0.8)}
      </g>);
    case 'deed': return (
      <g>
        <rect x={u(-w * 0.32)} y={u(-h / 2 + 22)} width={u(w * 0.64)} height={u(24)} fill={COLOR.ink} />
        {textLines(u, -h / 2 + 80, 7, 24, w * 0.72)}
        <circle cx={u(w / 2 - 52)} cy={u(h / 2 - 52)} r={u(24)} fill={COLOR.redDeep} />
        <circle cx={u(w / 2 - 52)} cy={u(h / 2 - 52)} r={u(16)} fill="none" stroke={COLOR.gold} strokeWidth={u(2)} />
      </g>);
    case 'cards': return (
      <g>
        <g transform={`rotate(-9) translate(${u(-58)} ${u(-85)})`}>
          <rect width={u(116)} height={u(170)} rx={u(8)} fill={COLOR.paper} stroke={COLOR.inkSoft} strokeWidth={u(1.5)} />
          <path d={`M ${u(58)} ${u(48)} l ${u(16)} ${u(24)} l ${u(-16)} ${u(24)} l ${u(-16)} ${u(-24)} Z`} fill={COLOR.red} />
          <text x={u(58)} y={u(142)} textAnchor="middle" fontFamily={FONT.display} fontSize={u(34)} fill={COLOR.ink}>A</text>
        </g>
        <g transform={`rotate(8) translate(${u(-20)} ${u(-75)})`}>
          <rect width={u(116)} height={u(170)} rx={u(8)} fill={COLOR.paperDeep} stroke={COLOR.inkSoft} strokeWidth={u(1.5)} />
          <circle cx={u(58)} cy={u(68)} r={u(22)} fill={COLOR.red} />
          <text x={u(58)} y={u(142)} textAnchor="middle" fontFamily={FONT.display} fontSize={u(34)} fill={COLOR.ink}>K</text>
        </g>
      </g>);
    case 'pamphlet': return (
      <g>
        <rect x={u(-w * 0.42)} y={u(-h * 0.42)} width={u(w * 0.84)} height={u(h * 0.84)} fill="none" stroke={COLOR.inkSoft} strokeWidth={u(2)} />
        <rect x={u(-w * 0.3)} y={u(-h / 2 + 26)} width={u(w * 0.6)} height={u(22)} fill={COLOR.inkSoft} />
        {textLines(u, -h / 2 + 82, 6, 24, w * 0.68)}
      </g>);
    case 'license': return (
      <g>
        {textLines(u, -h / 2 + 40, 6, 26, w * 0.7)}
        <circle cx={u(-w / 2 + 52)} cy={u(h / 2 - 52)} r={u(22)} fill="none" stroke={COLOR.gold} strokeWidth={u(4)} />
        <path d={`M ${u(-w * 0.3)} ${u(h / 2 - 46)} c ${u(20)} ${u(-18)} ${u(40)} ${u(10)} ${u(70)} ${u(-8)}`}
          fill="none" stroke={COLOR.inkSoft} strokeWidth={u(2.5)} strokeLinecap="round" />
      </g>);
  }
}

/** Red-ink tax seal: double ring, abstract crown, TAX / STAMP ACT lettering. */
function StampSeal({u}: {u: (n: number) => number}) {
  const s = u(1);
  return (
    <g>
      <circle r={36 * s} fill={alpha(COLOR.red, 0.14)} stroke={COLOR.red} strokeWidth={4 * s} />
      <circle r={29 * s} fill="none" stroke={COLOR.red} strokeWidth={1.8 * s} />
      <path d={`M ${-15 * s} ${-8 * s} L ${-10 * s} ${-20 * s} L ${-5 * s} ${-11 * s} L 0 ${-22 * s} L ${5 * s} ${-11 * s} L ${10 * s} ${-20 * s} L ${15 * s} ${-8 * s} L ${15 * s} ${-2 * s} L ${-15 * s} ${-2 * s} Z`} fill={COLOR.red} />
      <text y={14 * s} textAnchor="middle" fontFamily={FONT.display} fontWeight="bold" fontSize={17 * s} fill={COLOR.red}>TAX</text>
      <text y={25 * s} textAnchor="middle" fontFamily={FONT.ui} fontSize={8.5 * s} letterSpacing={1.5 * s} fill={COLOR.red}>STAMP ACT</text>
    </g>
  );
}

export const StampActTax: React.FC<StampActTaxProps> = ({durationInFrames: propDuration, phases = DEFAULT_PHASES}) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames: configDuration} = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  const u = (n: number) => (n * width) / 1280;
  const dur = Math.max(1, durationInFrames);
  const getPhase = (name: string): Phase => phases.find((p) => p.name === name) ?? {name, start: 0, end: 1};
  const phaseT = (name: string) => {
    const p = getPhase(name);
    return interpolate(frame, [p.start * dur, p.end * dur], [0, 1], CL);
  };
  const setupT = phaseT('setup'), stampT = phaseT('stamp'), costT = phaseT('cost'), resolveT = phaseT('resolve');
  const n = ITEMS.length;

  const rendered = ITEMS.map((it, i) => {
    const seg: [number, number] = [i / n, (i + 1) / n];
    const enter = interpolate(setupT, seg, [0, 1], {...CL, easing: Easing.out(Easing.quad)});
    const slam = interpolate(stampT, seg, [0, 1], CL);
    const sealScale = interpolate(slam, [0, 0.35], [1.5, 1], {...CL, easing: Easing.out(Easing.back(2))});
    const sealOpacity = interpolate(slam, [0, 0.12], [0, 1], CL);
    const sealRot = interpolate(slam, [0, 0.35], [-12, -4], CL);
    const dip = interpolate(slam, [0.25, 0.4, 0.6], [0, 1, 0], CL);
    const ring = interpolate(slam, [0.35, 1], [0, 1], CL);
    const tagT = interpolate(costT, seg, [0, 1], CL);
    const curPrice = Math.round(interpolate(tagT, [0, 1], [it.pre, it.post], CL));
    const cx = it.x * width, cy = it.y * height + (1 - enter) * u(60) + dip * u(12);
    return (
      <g key={it.name} opacity={enter} transform={`translate(${cx} ${cy}) rotate(${it.rot})`}>
        <rect x={u(-it.w / 2 + 7)} y={u(-it.h / 2 + 9)} width={u(it.w)} height={u(it.h)} rx={u(RADIUS.md)} fill={alpha(COLOR.night, 0.28)} />
        <rect x={u(-it.w / 2)} y={u(-it.h / 2)} width={u(it.w)} height={u(it.h)} rx={u(RADIUS.md)} fill={COLOR.paper} stroke={COLOR.inkSoft} strokeWidth={u(1.5)} />
        {itemDetail(it.kind, it.w, it.h, u)}
        <text y={u(it.h / 2) + u(24)} textAnchor="middle" fontFamily={FONT.ui} fontSize={u(TYPE.small)} fill={COLOR.inkSoft}>{it.name}</text>
        {slam > 0 && (
          <g transform={`translate(0 ${u(-10)}) rotate(${sealRot}) scale(${sealScale})`} opacity={sealOpacity}>
            <StampSeal u={u} />
          </g>)}
        {ring > 0 && <circle r={u(36) + ring * u(34)} fill="none" stroke={COLOR.red} strokeWidth={u(3)} opacity={(1 - ring) * 0.6} />}
        {tagT > 0 && (
          <g transform={`translate(${u(it.w / 2 - 62)} ${u(it.h / 2 - 52)})`} opacity={tagT}>
            <rect width={u(124)} height={u(40)} rx={u(RADIUS.sm)} fill={COLOR.paperDeep} stroke={COLOR.ink} strokeWidth={u(1.5)} />
            <text x={u(62)} y={u(27)} textAnchor="middle" fontFamily={FONT.mono} fontSize={u(19)} fill={COLOR.ink}>
              {`${it.pre}${it.unit} → ${curPrice}${it.unit}`}
            </text>
          </g>)}
      </g>
    );
  });

  // Phase captions (fade in/out across phase boundaries)
  const capSetup = interpolate(setupT, [0.4, 0.8], [0, 1], CL) * (1 - interpolate(stampT, [0, 0.15], [0, 1], CL));
  const capStamp = interpolate(stampT, [0.1, 0.3], [0, 1], CL) * (1 - interpolate(stampT, [0.85, 1], [0, 1], CL))
    * (1 - interpolate(costT, [0, 0.15], [0, 1], CL));
  const capCost = interpolate(costT, [0.1, 0.3], [0, 1], CL) * (1 - interpolate(resolveT, [0, 0.2], [0, 1], CL));
  const captions = [
    {op: capSetup, text: 'Boston, 1765 — paper is part of everyday life'},
    {op: capStamp, text: 'Parliament decrees: every paper must carry a paid tax stamp'},
    {op: capCost, text: 'The added cost lands on the colonists'},
  ];

  const bannerOp = interpolate(resolveT, [0, 0.25], [0, 1], CL);
  const bannerScale = interpolate(resolveT, [0, 0.35], [0.92, 1], {...CL, easing: Easing.out(Easing.back(1.4))});

  return (
    <div style={{width, height, backgroundColor: COLOR.brown, position: 'relative', overflow: 'hidden'}}>
      <svg width={width} height={height} style={{position: 'absolute'}}>
        <defs>
          <radialGradient id="deskVignette" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor={alpha(COLOR.night, 0)} />
            <stop offset="100%" stopColor={alpha(COLOR.night, 0.35)} />
          </radialGradient>
        </defs>
        {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((fy, i) => (
          <path key={i} fill="none" stroke={alpha(COLOR.ink, 0.14)} strokeWidth={u(2)}
            d={`M 0 ${height * fy} C ${width * 0.3} ${height * fy + (i % 2 ? 18 : -18)} ${width * 0.7} ${height * fy + (i % 2 ? -18 : 18)} ${width} ${height * fy}`} />
        ))}
        {rendered}
        {resolveT > 0 && <rect width={width} height={height} fill={alpha(COLOR.ink, resolveT * 0.3)} />}
        {captions.map((c, i) => c.op > 0 && (
          <text key={i} x={width / 2} y={height - u(44)} textAnchor="middle" fontFamily={FONT.text} fontSize={u(TYPE.body)}
            fill={COLOR.ink} opacity={c.op} stroke={COLOR.paper} strokeWidth={u(5)} style={{paintOrder: 'stroke'}}>{c.text}</text>
        ))}
        {resolveT > 0 && (
          <g transform={`translate(${width / 2} ${height * 0.5}) scale(${bannerScale})`} opacity={bannerOp}>
            <rect x={u(-470)} y={u(-132)} width={u(940)} height={u(264)} rx={u(RADIUS.lg)} fill={COLOR.paperDeep} stroke={COLOR.ink} strokeWidth={u(3)} />
            <rect x={u(-458)} y={u(-120)} width={u(916)} height={u(240)} rx={u(RADIUS.md)} fill="none" stroke={COLOR.inkSoft} strokeWidth={u(1.5)} />
            <text y={u(-56)} textAnchor="middle" fontFamily={FONT.display} fontSize={u(TYPE.h1)} fill={COLOR.ink}>The Stamp Act, 1765</text>
            <text y={u(-4)} textAnchor="middle" fontFamily={FONT.text} fontSize={u(TYPE.body)} fill={COLOR.inkSoft}>A tax on every newspaper, deed, card deck, and pamphlet</text>
            <text y={u(58)} textAnchor="middle" fontFamily={FONT.hand} fontSize={u(30)} fill={COLOR.red}>Colonists: “No taxation without representation”</text>
          </g>
        )}
      </svg>
    </div>
  );
};
