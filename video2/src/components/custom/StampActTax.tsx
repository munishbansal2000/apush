import React from 'react';
import {Easing, interpolate} from 'remotion';
import {FONT, RADIUS, alpha} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, usePhases, type CustomProps, type Phase} from './kit';

/**
 * The Stamp Act, 1765 (APUSH Unit 3, u3e2 L8 / L16 / L54): a direct tax that reached every desk.
 *
 * Everyday papers and goods land on a parchment desk (newspaper, will, deed, playing cards, dice); a red revenue
 * stamp slams onto each in turn; then the camera pulls back to reveal desk after desk, every item stamped. The point
 * is reach, not rate (E2 L54, L140), so there are no prices and no captions.
 *
 * DEFAULT_PHASES: setup (items land) / stamp (each item stamped) / reach (pull back: every desk stamped).
 */
export const DEFAULT_PHASES: Phase[] = [
  {name: 'setup', start: 0, end: 0.18},
  {name: 'stamp', start: 0.18, end: 0.65},
  {name: 'reach', start: 0.65, end: 1},
];

export type StampActTaxProps = CustomProps;

type ItemKind = 'news' | 'will' | 'deed' | 'cards' | 'dice';

interface DeskItem {
  kind: ItemKind;
  x: number; y: number; // center, authored 1280x720
  w: number; h: number; // authored size
  rot: number; // degrees
}

/** Items the script names (E2 L16: wills, deeds, licenses, newspapers, pamphlets, almanacs, playing cards, dice). */
const ITEMS: DeskItem[] = [
  {kind: 'news', x: 190, y: 330, w: 240, h: 320, rot: -6},
  {kind: 'will', x: 430, y: 380, w: 220, h: 290, rot: 4},
  {kind: 'deed', x: 660, y: 320, w: 220, h: 280, rot: -3},
  {kind: 'cards', x: 880, y: 380, w: 200, h: 250, rot: 5},
  {kind: 'dice', x: 1090, y: 340, w: 190, h: 190, rot: -4},
];

/** Abstract ink lines suggesting handwriting or print (centered on x=0). */
function textLines(u: (n: number) => number, y0: number, count: number, gap: number, lw: number) {
  return Array.from({length: count}, (_, i) => (
    <rect key={i} x={u(-lw / 2)} y={u(y0 + i * gap)} width={u(lw * (i % 3 === 2 ? 0.7 : 1))} height={u(5)} rx={u(2.5)} fill={alpha(PAPER.inkSoft, 0.5)} />
  ));
}

const Pip: React.FC<{u: (n: number) => number; x: number; y: number}> = ({u, x, y}) => <circle cx={u(x)} cy={u(y)} r={u(7)} fill={PAPER.ink} />;

/** One die face, authored around its own center. */
function Die({u, x, y, rot, pips}: {u: (n: number) => number; x: number; y: number; rot: number; pips: [number, number][]}) {
  return (
    <g transform={`translate(${u(x)} ${u(y)}) rotate(${rot})`}>
      <rect x={u(-40)} y={u(-40)} width={u(80)} height={u(80)} rx={u(12)} fill={PAPER.bg} stroke={PAPER.ink} strokeWidth={u(2)} />
      {pips.map(([px, py], i) => <Pip key={i} u={u} x={px} y={py} />)}
    </g>
  );
}

/** Per-item drawing, around the item's center. Papers get a sheet; dice sit on the desk. */
function itemDetail(kind: ItemKind, w: number, h: number, u: (n: number) => number) {
  switch (kind) {
    case 'news': return (
      <g>
        <rect x={u(-w * 0.4)} y={u(-h / 2 + 20)} width={u(w * 0.8)} height={u(32)} fill={PAPER.ink} />
        <text x={0} y={u(-h / 2 + 44)} textAnchor="middle" fontFamily={FONT.display} fontSize={u(19)} fill={PAPER.bg}>GAZETTE</text>
        {textLines(u, -h / 2 + 76, 10, 20, w * 0.8)}
      </g>);
    case 'will': return (
      <g>
        {textLines(u, -h / 2 + 40, 8, 24, w * 0.7)}
        <path d={`M ${u(-w * 0.3)} ${u(h / 2 - 40)} c ${u(20)} ${u(-18)} ${u(40)} ${u(10)} ${u(70)} ${u(-8)}`}
          fill="none" stroke={PAPER.inkSoft} strokeWidth={u(2.5)} strokeLinecap="round" />
      </g>);
    case 'deed': return (
      <g>
        <rect x={u(-w * 0.32)} y={u(-h / 2 + 22)} width={u(w * 0.64)} height={u(22)} fill={PAPER.ink} />
        {textLines(u, -h / 2 + 70, 6, 24, w * 0.72)}
        <circle cx={u(w / 2 - 46)} cy={u(h / 2 - 46)} r={u(22)} fill={PAPER.red} />
        <circle cx={u(w / 2 - 46)} cy={u(h / 2 - 46)} r={u(14)} fill="none" stroke={PAPER.gold} strokeWidth={u(2)} />
      </g>);
    case 'cards': return (
      <g>
        <g transform={`rotate(-9) translate(${u(-58)} ${u(-85)})`}>
          <rect width={u(116)} height={u(170)} rx={u(8)} fill={PAPER.bg} stroke={PAPER.inkSoft} strokeWidth={u(1.5)} />
          <path d={`M ${u(58)} ${u(48)} l ${u(16)} ${u(24)} l ${u(-16)} ${u(24)} l ${u(-16)} ${u(-24)} Z`} fill={PAPER.red} />
          <text x={u(58)} y={u(142)} textAnchor="middle" fontFamily={FONT.display} fontSize={u(34)} fill={PAPER.ink}>A</text>
        </g>
        <g transform={`rotate(8) translate(${u(-20)} ${u(-75)})`}>
          <rect width={u(116)} height={u(170)} rx={u(8)} fill={PAPER.land} stroke={PAPER.inkSoft} strokeWidth={u(1.5)} />
          <circle cx={u(58)} cy={u(68)} r={u(22)} fill={PAPER.red} />
          <text x={u(58)} y={u(142)} textAnchor="middle" fontFamily={FONT.display} fontSize={u(34)} fill={PAPER.ink}>K</text>
        </g>
      </g>);
    case 'dice': return (
      <g>
        <Die u={u} x={-38} y={10} rot={-10} pips={[[-20, -20], [20, -20], [0, 0], [-20, 20], [20, 20]]} />
        <Die u={u} x={42} y={-18} rot={12} pips={[[-20, -20], [0, 0], [20, 20]]} />
      </g>);
  }
}

/**
 * Red revenue stamp: double ring and crown. Basis: the 1765 stamps were embossed or inked marks bearing a crown and
 * the word AMERICA (E2 L12: "a mark pressed into the paper itself"). No duty value is shown (reach, not rate).
 */
function StampSeal({u}: {u: (n: number) => number}) {
  return (
    <g>
      <circle r={u(36)} fill={alpha(PAPER.red, 0.14)} stroke={PAPER.red} strokeWidth={u(4)} />
      <circle r={u(29)} fill="none" stroke={PAPER.red} strokeWidth={u(1.8)} />
      <path d={`M ${u(-15)} ${u(-4)} L ${u(-10)} ${u(-16)} L ${u(-5)} ${u(-7)} L 0 ${u(-18)} L ${u(5)} ${u(-7)} L ${u(10)} ${u(-16)} L ${u(15)} ${u(-4)} L ${u(15)} ${u(2)} L ${u(-15)} ${u(2)} Z`} fill={PAPER.red} />
      <text y={u(18)} textAnchor="middle" fontFamily={FONT.display} fontWeight="bold" fontSize={u(9.5)} letterSpacing={u(1.2)} fill={PAPER.red}>AMERICA</text>
    </g>
  );
}

/** One desk of items; `stampT` 0..1 stamps the items in turn, `enterT` 0..1 lands them. */
function Desk({u, enterT, stampT}: {u: (n: number) => number; enterT: number; stampT: number}) {
  const n = ITEMS.length;
  return (
    <g>
      {ITEMS.map((it, i) => {
        const seg: [number, number] = [i / n, (i + 1) / n];
        const enter = interpolate(enterT, seg, [0, 1], {...CLAMP, easing: Easing.out(Easing.quad)});
        const slam = interpolate(stampT, seg, [0, 1], CLAMP);
        const sealScale = interpolate(slam, [0, 0.35], [1.5, 1], {...CLAMP, easing: Easing.out(Easing.back(2))});
        const sealOpacity = interpolate(slam, [0, 0.12], [0, 1], CLAMP);
        const sealRot = interpolate(slam, [0, 0.35], [-12, -4], CLAMP);
        const dip = interpolate(slam, [0.25, 0.4, 0.6], [0, 1, 0], CLAMP);
        const ring = interpolate(slam, [0.35, 1], [0, 1], CLAMP);
        const paper = it.kind !== 'dice';
        return (
          <g key={it.kind} opacity={enter} transform={`translate(${u(it.x)} ${u(it.y) + (1 - enter) * u(60) + dip * u(12)}) rotate(${it.rot})`}>
            {paper && (
              <>
                <rect x={u(-it.w / 2 + 7)} y={u(-it.h / 2 + 9)} width={u(it.w)} height={u(it.h)} rx={u(RADIUS.md)} fill={alpha(PAPER.ink, 0.2)} />
                <rect x={u(-it.w / 2)} y={u(-it.h / 2)} width={u(it.w)} height={u(it.h)} rx={u(RADIUS.md)} fill={PAPER.bg} stroke={PAPER.inkSoft} strokeWidth={u(1.5)} />
              </>
            )}
            {itemDetail(it.kind, it.w, it.h, u)}
            {slam > 0 && (
              <g transform={`translate(0 ${u(paper ? -10 : 70)}) rotate(${sealRot}) scale(${sealScale})`} opacity={sealOpacity}>
                <StampSeal u={u} />
              </g>
            )}
            {ring > 0 && ring < 1 && (
              <circle cy={u(paper ? -10 : 70)} r={u(36) + ring * u(34)} fill="none" stroke={PAPER.red} strokeWidth={u(3)} opacity={(1 - ring) * 0.6} />
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Neighbouring desks revealed by the pull-back: offsets in authored units, and the order they get stamped. */
const OTHER_DESKS: {dx: number; dy: number; order: number}[] = [
  {dx: -1320, dy: 0, order: 0}, {dx: 1320, dy: 0, order: 1}, {dx: 0, dy: -760, order: 2}, {dx: 0, dy: 760, order: 3},
  {dx: -1320, dy: -760, order: 4}, {dx: 1320, dy: 760, order: 5}, {dx: 1320, dy: -760, order: 6}, {dx: -1320, dy: 760, order: 7},
];

export const StampActTax: React.FC<StampActTaxProps> = ({durationInFrames, phases}) => {
  const {u, t} = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const setupT = t('setup');
  const stampT = t('stamp');
  const reachT = t('reach');

  // Camera: a slow push during setup/stamp, then pull back to roughly 1/3 scale so the neighbouring desks show.
  const push = 1 + 0.04 * stampT;
  const pull = interpolate(reachT, [0, 0.7], [1, 0.34], {...CLAMP, easing: Easing.inOut(Easing.cubic)});
  const scale = push * pull;

  return (
    <PaperSheet fontFamily={FONT.display}>
      <svg width="100%" height="100%" viewBox={`0 0 ${u(1280)} ${u(720)}`} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(${u(640)} ${u(360)}) scale(${scale}) translate(${u(-640)} ${u(-360)})`}>
          {/* Desk blotters: the central one, then its neighbours (already laid out, stamped as the camera pulls back). */}
          {[{dx: 0, dy: 0, order: -1}, ...OTHER_DESKS].map(({dx, dy, order}) => {
            const enterT = order < 0 ? setupT : 1;
            const deskStamp = order < 0 ? stampT : interpolate(reachT, [0.15 + order * 0.06, 0.5 + order * 0.06], [0, 1], CLAMP);
            return (
              <g key={`${dx},${dy}`} transform={`translate(${u(dx)} ${u(dy)})`} opacity={order < 0 ? 1 : interpolate(reachT, [0, 0.2], [0, 1], CLAMP)}>
                <rect x={u(30)} y={u(110)} width={u(1220)} height={u(500)} rx={u(RADIUS.lg)} fill={alpha(PAPER.brown, 0.18)} stroke={PAPER.rule} strokeWidth={u(2)} />
                <Desk u={u} enterT={enterT} stampT={deskStamp} />
              </g>
            );
          })}
        </g>
      </svg>
    </PaperSheet>
  );
};
