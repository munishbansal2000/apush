import React from 'react';
import {Easing, interpolate} from 'remotion';
import {FONT, TYPE, alpha} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, paperHalo, usePhases, type CustomProps, type Phase} from './kit';

/**
 * The Stamp Act boycott, 1765-66 (APUSH Unit 3, u3e2 L48 / L58): nonimportation turns the pressure back on London.
 *
 * Schematic parchment Atlantic. Loaded British ships sail west to Boston, New York and Philadelphia; a NONIMPORTATION
 * stamp lands on the colonial coast and the ships turn back with their cargo; unsold goods pile up at the London
 * merchant houses and the merchants' petitions stream to Parliament. Repeal and the Declaratory Act are separate
 * beats (year stamp / narration), not shown here.
 *
 * DEFAULT_PHASES: setup (ships sail west) / boycott (stamp, ships turned back) / pressure (goods pile up, petitions
 * to Parliament).
 */
export const DEFAULT_PHASES: Phase[] = [
  {name: 'setup', start: 0, end: 0.25},
  {name: 'boycott', start: 0.25, end: 0.62},
  {name: 'pressure', start: 0.62, end: 1},
];

export type BoycottPressureProps = CustomProps;

/**
 * Ports, north to south (authored y). Basis: the 1765 nonimportation agreements were signed by merchants in New York
 * (October), Philadelphia (November) and Boston (December) (standard accounts; review note). Charleston dropped.
 */
const PORTS = [
  {name: 'BOSTON', y: 250},
  {name: 'NEW YORK', y: 370},
  {name: 'PHILADELPHIA', y: 490},
];

const COAST_X = 250; // colonial shoreline (authored x)
const PORT_X = COAST_X + 70; // where ships stop off each port
const LONDON = {x: 1120, y: 290};
const PARLIAMENT = {x: 1120, y: 500};
const BRITAIN_X = 1030; // British shoreline (authored x)

/** Quadratic bezier point. */
function quad(a: [number, number], b: [number, number], c: [number, number], t: number): [number, number] {
  const s = 1 - t;
  return [s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]];
}

export const BoycottPressure: React.FC<BoycottPressureProps> = ({durationInFrames, phases}) => {
  const {frame, u, t} = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const ease = Easing.inOut(Easing.cubic);
  const setupT = t('setup');
  const boycottT = t('boycott');
  const pressureT = t('pressure');
  const halo = paperHalo(u);

  // ---- Ships: setup sails Britain -> port loaded; boycott swings round and sails home, cargo still aboard.
  const ships = PORTS.map((port, i) => {
    const out = interpolate(setupT, [i * 0.15, Math.min(1, i * 0.15 + 0.7)], [0, 1], {...CLAMP, easing: ease});
    const b = interpolate(boycottT, [0.2 + i * 0.1, Math.min(1, 0.2 + i * 0.1 + 0.6)], [0, 1], CLAMP);
    let x: number;
    let dir: number;
    if (b <= 0) {
      x = BRITAIN_X - 40 - (BRITAIN_X - 40 - PORT_X) * out;
      dir = -1;
    } else if (b < 0.25) {
      // the U-turn just off the port
      const s = b / 0.25;
      x = PORT_X + Math.sin(s * Math.PI) * 36;
      dir = s < 0.5 ? -1 : 1;
    } else {
      x = interpolate(b, [0.25, 1], [PORT_X, BRITAIN_X - 40], {...CLAMP, easing: ease});
      dir = 1;
    }
    // ships home: fade as their cargo goes ashore in London
    const home = interpolate(b, [0.9, 1], [1, 0.35], CLAMP);
    return {x, y: port.y + 30, dir, home, i};
  });

  // ---- NONIMPORTATION stamp on the colonial coast.
  const stampScale = interpolate(boycottT, [0, 0.2], [1.6, 1], {...CLAMP, easing: Easing.out(Easing.back(1.6))});
  const stampOp = interpolate(boycottT, [0, 0.08], [0, 1], CLAMP);

  // ---- Pressure: crates pile up at London, petitions arc to Parliament, Parliament takes the pressure.
  const crates = Array.from({length: 9}, (_, i) => interpolate(pressureT, [i * 0.05, i * 0.05 + 0.2], [0, 1], {...CLAMP, easing: Easing.out(Easing.back(1.4))}));
  const petitions = Array.from({length: 7}, (_, i) => interpolate(pressureT, [0.2 + i * 0.08, 0.45 + i * 0.08], [0, 1], CLAMP));
  const pulse = pressureT > 0.4 ? interpolate((frame % 24) / 24, [0, 1], [0, 1]) : -1;
  const shake = pressureT > 0.55 ? Math.sin(frame * 1.7) * u(1.5) * pressureT : 0;

  // ---- Waves
  const waves = [180, 320, 460, 600].map((y, i) => {
    const dy = 4 * Math.sin(frame / 20 + i * 1.7);
    return (
      <path key={i} fill="none" stroke={PAPER.wave} strokeWidth={u(2)}
        d={`M ${u(420)} ${u(y)} q ${u(30)} ${u(-10 + dy)} ${u(60)} 0 t ${u(60)} 0 t ${u(60)} 0 t ${u(60)} 0 t ${u(60)} 0 t ${u(60)} 0`} />
    );
  });

  const colonies = `M 0 ${u(80)} L ${u(COAST_X - 30)} ${u(80)} Q ${u(COAST_X + 20)} ${u(180)} ${u(COAST_X)} ${u(260)} Q ${u(COAST_X - 20)} ${u(330)} ${u(COAST_X + 10)} ${u(390)}
    Q ${u(COAST_X + 30)} ${u(460)} ${u(COAST_X - 10)} ${u(520)} Q ${u(COAST_X - 40)} ${u(600)} ${u(COAST_X - 90)} ${u(720)} L 0 ${u(720)} Z`;
  const britain = `M ${u(1280)} ${u(150)} L ${u(BRITAIN_X + 60)} ${u(150)} Q ${u(BRITAIN_X)} ${u(230)} ${u(BRITAIN_X + 20)} ${u(320)}
    Q ${u(BRITAIN_X - 10)} ${u(420)} ${u(BRITAIN_X + 30)} ${u(560)} Q ${u(BRITAIN_X + 60)} ${u(620)} ${u(BRITAIN_X + 140)} ${u(640)} L ${u(1280)} ${u(640)} Z`;

  return (
    <PaperSheet fontFamily={FONT.display}>
      <svg width="100%" height="100%" viewBox={`0 0 ${u(1280)} ${u(720)}`} style={{position: 'absolute', inset: 0}}>
        <rect width={u(1280)} height={u(720)} fill={PAPER.water} />
        {waves}

        {/* Colonies and Britain */}
        <path d={colonies} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(2.5)} />
        <path d={britain} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(2.5)} />

        {PORTS.map(p => (
          <g key={p.name}>
            <circle cx={u(COAST_X - 6)} cy={u(p.y)} r={u(7)} fill={PAPER.ink} stroke={PAPER.halo} strokeWidth={u(2)} />
            <text x={u(COAST_X - 20)} y={u(p.y + 6)} textAnchor="end" fill={PAPER.ink} fontSize={u(TYPE.town)} fontWeight={700} {...halo}>{p.name}</text>
          </g>
        ))}

        {/* London merchant houses */}
        <g transform={`translate(${u(LONDON.x)} ${u(LONDON.y)})`}>
          {[-44, 0, 44].map(dx => (
            <g key={dx}>
              <rect x={u(dx - 18)} y={u(-30)} width={u(36)} height={u(40)} fill={PAPER.bg} stroke={PAPER.ink} strokeWidth={u(2)} />
              <path d={`M ${u(dx - 22)} ${u(-30)} L ${u(dx)} ${u(-50)} L ${u(dx + 22)} ${u(-30)} Z`} fill={PAPER.british} stroke={PAPER.ink} strokeWidth={u(2)} />
            </g>
          ))}
          <text y={u(-62)} textAnchor="middle" fill={PAPER.ink} fontSize={u(TYPE.town)} fontWeight={700} {...halo}>LONDON</text>
          {/* unsold goods pile up beside the warehouses */}
          {crates.map((c, i) => c > 0 && (
            <rect key={i} x={u(-66 + (i % 5) * 26 + (Math.floor(i / 5) * 13))} y={u(14 + 26 - Math.floor(i / 5) * 24) - (1 - c) * u(20)}
              width={u(22)} height={u(22)} fill={PAPER.gold} stroke={PAPER.ink} strokeWidth={u(1.5)} opacity={c} />
          ))}
        </g>

        {/* Parliament (Westminster: hall and tower) */}
        <g transform={`translate(${u(PARLIAMENT.x) + shake} ${u(PARLIAMENT.y)})`}>
          {pulse >= 0 && <circle r={u(50 + pulse * 60)} fill="none" stroke={PAPER.red} strokeWidth={u(3)} opacity={(1 - pulse) * 0.6} />}
          <rect x={u(-60)} y={u(-14)} width={u(110)} height={u(40)} fill={PAPER.bg} stroke={PAPER.ink} strokeWidth={u(2)} />
          {[-46, -26, -6, 14, 34].map(x => <rect key={x} x={u(x)} y={u(-6)} width={u(8)} height={u(18)} fill={PAPER.inkSoft} />)}
          <rect x={u(50)} y={u(-62)} width={u(22)} height={u(88)} fill={PAPER.bg} stroke={PAPER.ink} strokeWidth={u(2)} />
          <path d={`M ${u(48)} ${u(-62)} L ${u(61)} ${u(-84)} L ${u(74)} ${u(-62)} Z`} fill={PAPER.ink} />
          <circle cx={u(61)} cy={u(-44)} r={u(6)} fill="none" stroke={PAPER.ink} strokeWidth={u(1.5)} />
          <text y={u(52)} textAnchor="middle" fill={PAPER.ink} fontSize={u(TYPE.town)} fontWeight={700} {...halo}>PARLIAMENT</text>
        </g>

        {/* Petitions: merchants' papers arc from London to Parliament */}
        {petitions.map((p, i) => {
          if (p <= 0 || p >= 1) return null;
          const [x, y] = quad([u(LONDON.x - 20), u(LONDON.y + 10)], [u(PARLIAMENT.x - 10), u(PARLIAMENT.y - 10)], [u(LONDON.x - 150 - (i % 3) * 30), u((LONDON.y + PARLIAMENT.y) / 2)], p);
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${-20 + p * 40 + i * 7})`} opacity={Math.min(1, p * 5, (1 - p) * 5)}>
              <rect x={u(-14)} y={u(-18)} width={u(28)} height={u(36)} fill={PAPER.bg} stroke={PAPER.ink} strokeWidth={u(1.5)} />
              {[0, 1, 2].map(l => <line key={l} x1={u(-8)} y1={u(-8 + l * 8)} x2={u(8)} y2={u(-8 + l * 8)} stroke={PAPER.inkSoft} strokeWidth={u(1.5)} />)}
            </g>
          );
        })}

        {/* Ships */}
        {ships.map(s => (
          <g key={s.i} transform={`translate(${u(s.x)} ${u(s.y)}) scale(${s.dir * u(1)} ${u(1)})`} opacity={setupT > 0 ? s.home : 0}>
            <path d="M -46 0 L 46 0 L 32 20 L -32 20 Z" fill={PAPER.brown} stroke={PAPER.ink} strokeWidth={2} />
            <line x1={-18} y1={0} x2={-18} y2={-52} stroke={PAPER.ink} strokeWidth={3} />
            <line x1={16} y1={0} x2={16} y2={-52} stroke={PAPER.ink} strokeWidth={3} />
            <path d="M -16 -50 q 22 8 0 28 Z" fill={PAPER.bg} stroke={PAPER.inkSoft} strokeWidth={1} />
            <path d="M 18 -50 q 22 8 0 28 Z" fill={PAPER.bg} stroke={PAPER.inkSoft} strokeWidth={1} />
            <rect x={-34} y={-16} width={16} height={14} fill={PAPER.gold} stroke={PAPER.ink} strokeWidth={1.5} />
            <rect x={-16} y={-16} width={16} height={14} fill={PAPER.gold} stroke={PAPER.ink} strokeWidth={1.5} />
            <rect x={-25} y={-30} width={16} height={14} fill={PAPER.gold} stroke={PAPER.ink} strokeWidth={1.5} />
          </g>
        ))}

        {/* NONIMPORTATION stamp across the colonial coast, below the ports */}
        {stampOp > 0 && (
          <g transform={`translate(${u(COAST_X + 10)} ${u(625)}) rotate(-8) scale(${stampScale})`} opacity={stampOp * 0.9}>
            <rect x={u(-190)} y={u(-30)} width={u(380)} height={u(60)} rx={u(4)} fill={alpha(PAPER.bg, 0.4)} stroke={PAPER.red} strokeWidth={u(5)} />
            <rect x={u(-182)} y={u(-22)} width={u(364)} height={u(44)} rx={u(3)} fill="none" stroke={PAPER.red} strokeWidth={u(1.5)} />
            <text y={u(10)} textAnchor="middle" fill={PAPER.red} fontSize={u(TYPE.h3)} fontWeight={700} letterSpacing={u(4)}>NONIMPORTATION</text>
          </g>
        )}
      </svg>
    </PaperSheet>
  );
};
