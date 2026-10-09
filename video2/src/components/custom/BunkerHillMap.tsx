import React from 'react';
import {geoPath} from 'd3-geo';
import {Easing, interpolate, useVideoConfig} from 'remotion';
import {ringPolygon, usProjection, type LonLat} from '../geo/usGeo';
import {FONT, TYPE, alpha} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, paperHalo, usePhases, type CustomProps, type Phase} from './kit';

/**
 * Bunker Hill, June 1775 (APUSH Unit 3, u3e5 L18): three British charges up Breed's Hill.
 *
 * Parchment map of the 1775 Charlestown and Boston peninsulas (hand-drawn period shoreline; the modern coastline is
 * filled land). The American redoubt sits on Breed's Hill; a British wave climbs from the landing at Moulton's Point
 * and is thrown back, twice; the third wave carries the hill (the Americans are out of powder), the hill marker turns
 * red and the defenders fall back over Charlestown Neck, the camera pushing in. Labels only (Breed's Hill, Bunker
 * Hill, Charlestown, Boston, the two rivers); no caption strip, no casualty card.
 *
 * DEFAULT_PHASES: assault1 (repulsed) / assault2 (repulsed) / assault3 (takes the hill, retreat over the Neck).
 */
export const DEFAULT_PHASES: Phase[] = [
  {name: 'assault1', start: 0, end: 0.3},
  {name: 'assault2', start: 0.3, end: 0.6},
  {name: 'assault3', start: 0.6, end: 1},
];

export type BunkerHillMapProps = CustomProps;

// Sites. Basis: Bunker Hill Monument (on Breed's Hill) 42.3763 N, 71.0608 W; Bunker Hill's summit ~400 m NW near
// today's Bunker Hill St; Charlestown Neck at the peninsula's NW end; Moulton's Point the SE tip where the British
// landed (NPS Boston NHP; standard battle maps).
const BREEDS_HILL: LonLat = [-71.0608, 42.3763];
const BUNKER_HILL: LonLat = [-71.0655, 42.3795];
const NECK: LonLat = [-71.0768, 42.3842];
const LANDING: LonLat = [-71.0538, 42.3738];
const CHARLESTOWN: LonLat = [-71.0585, 42.3722];
const BOSTON: LonLat = [-71.0605, 42.3585];

// 1775 shoreline, hand-drawn and simplified from period maps (e.g. Page's 1775 plan of the action; Boston before the
// Back Bay and Mill Pond fills). Approximate: it shows the two peninsulas, the Charles and Mystic, and the Neck.
/** Cambridge / Somerville mainland, Charlestown peninsula and its Neck, as one landmass. */
const MAINLAND_WEST: LonLat[] = [
  [-71.14, 42.3555], [-71.11, 42.3565], [-71.095, 42.3595], [-71.085, 42.3628], [-71.079, 42.3662], [-71.0755, 42.3688],
  [-71.0785, 42.3722], [-71.0805, 42.3778], [-71.0782, 42.3826],
  // Charlestown peninsula: Charles side to Moulton's Point, back up the Mystic side
  [-71.0732, 42.3787], [-71.0692, 42.3748], [-71.065, 42.3716], [-71.061, 42.3701], [-71.0565, 42.3705], [-71.0525, 42.3722],
  [-71.0522, 42.3746], [-71.0572, 42.3782], [-71.0628, 42.3812], [-71.0688, 42.3837], [-71.0745, 42.3858],
  [-71.08, 42.3878], [-71.09, 42.3902], [-71.14, 42.3915],
];
/** Medford / Malden / Chelsea shore north of the Mystic. */
const MAINLAND_NORTH: LonLat[] = [
  [-71.14, 42.3985], [-71.09, 42.3968], [-71.07, 42.3942], [-71.05, 42.3918], [-71.035, 42.3882], [-71.02, 42.3832],
  [-70.99, 42.3832], [-70.99, 42.43], [-71.14, 42.43],
];
/** Roxbury / Dorchester shore south of the Back Bay. */
const MAINLAND_SOUTH: LonLat[] = [
  [-71.14, 42.3525], [-71.115, 42.35], [-71.1, 42.3452], [-71.085, 42.3402], [-71.0745, 42.3335], [-71.066, 42.3332],
  [-71.055, 42.3302], [-71.03, 42.3255], [-70.99, 42.3255], [-70.99, 42.29], [-71.14, 42.29],
];
/** Shawmut (Boston) peninsula on its narrow Neck. */
const BOSTON_PENINSULA: LonLat[] = [
  [-71.0555, 42.3696], [-71.051, 42.3676], [-71.0498, 42.3642], [-71.0522, 42.3612], [-71.049, 42.3592], [-71.0508, 42.3556],
  [-71.0545, 42.3516], [-71.061, 42.3482], [-71.0662, 42.3432], [-71.0688, 42.3362], [-71.0705, 42.3336], [-71.0728, 42.3338],
  [-71.0712, 42.3372], [-71.0705, 42.3442], [-71.0702, 42.3492], [-71.0722, 42.3546], [-71.0702, 42.3602], [-71.0652, 42.3652],
  [-71.0602, 42.3672],
];
/** Noddle's Island (East Boston). */
const NODDLES: LonLat[] = [[-71.0455, 42.3722], [-71.031, 42.3752], [-71.022, 42.3685], [-71.03, 42.3602], [-71.0425, 42.3622]];
const LANDS = [MAINLAND_WEST, MAINLAND_NORTH, MAINLAND_SOUTH, BOSTON_PENINSULA, NODDLES].map(ringPolygon);

const EXTENT: [LonLat, LonLat] = [[-71.092, 42.352], [-71.03, 42.392]];

type Pt = [number, number];
const ease = Easing.inOut(Easing.quad);

/** Screen position + heading (deg) at fraction s along a polyline. */
const trace = (pts: Pt[], s: number): {x: number; y: number; angle: number} => {
  const c = Math.max(0, Math.min(1, s));
  const lens = pts.slice(0, -1).map((p, i) => Math.hypot(pts[i + 1][0] - p[0], pts[i + 1][1] - p[1]));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  let d = c * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const f = lens[i] === 0 ? 0 : d / lens[i];
      const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
      const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
      const angle = (Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]) * 180) / Math.PI;
      return {x, y, angle};
    }
    d -= lens[i];
  }
  return {x: pts[pts.length - 1][0], y: pts[pts.length - 1][1], angle: 0};
};

/** Wave advance / recoil from 0-1 phase progress. `holds` keeps the hill instead of falling back. */
const waveState = (t: number, holds: boolean) => {
  const opacity = interpolate(t, [0, 0.08, 0.9, 1], [0, 1, 1, holds ? 1 : 0], CLAMP);
  const climb = interpolate(t, [0, 0.55], [0, 1], {...CLAMP, easing: ease});
  const pos = holds ? climb : climb - interpolate(t, [0.6, 0.95], [0, 0.85], {...CLAMP, easing: ease});
  // repulsed waves thin out as they fall back
  const collapse = holds ? 1 : interpolate(t, [0.55, 0.95], [1, 0.4], CLAMP);
  return {opacity, pos, collapse};
};

export const BunkerHillMap: React.FC<BunkerHillMapProps> = ({durationInFrames, phases}) => {
  const clock = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const {frame, fps, u, t} = clock;
  const {width, height} = useVideoConfig();
  const total = Math.max(1, clock.durationInFrames);
  const sec = frame / fps;

  const a1 = t('assault1');
  const a2 = t('assault2');
  const a3 = t('assault3');

  const projection = React.useMemo(() => usProjection(width, height, EXTENT, height * 0.02), [width, height]);
  const geo = React.useMemo(() => {
    const path = geoPath(projection);
    return {lands: LANDS.map(f => path(f) ?? '')};
  }, [projection]);
  const at = (ll: LonLat): Pt => (projection(ll) ?? [0, 0]) as Pt;
  const halo = paperHalo(u);

  const camZoom = interpolate(frame, [0, total], [1.02, 1.12], {...CLAMP, easing: ease});
  const [hx, hy] = at(BREEDS_HILL);
  const [kx, ky] = at(BUNKER_HILL);

  // Assault route: landing at Moulton's Point -> up the slope -> the redoubt.
  const wavePts: Pt[] = [at(LANDING), at([-71.0565, 42.3748]), at(BREEDS_HILL)];
  const waveD = `M ${wavePts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L ')}`;
  const retreatPts: Pt[] = [at(BREEDS_HILL), at(BUNKER_HILL), at(NECK)];

  /** One British wave: nine redcoats in a block, plus the drawn route. */
  const renderWave = (tt: number, holds: boolean, key: number) => {
    if (tt <= 0) return null;
    const {opacity, pos, collapse} = waveState(tt, holds);
    const {x, y, angle} = trace(wavePts, pos);
    const gap = u(11) * collapse;
    return (
      <g key={key} opacity={opacity}>
        <path d={waveD} fill="none" stroke={PAPER.british} strokeWidth={u(3)} strokeLinecap="round"
          pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pos} opacity={0.5} />
        <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
          {Array.from({length: 9}).map((_, i) => {
            const col = (i % 3) - 1;
            const row = Math.floor(i / 3);
            return <circle key={i} cx={-row * gap * 1.15} cy={col * gap} r={u(5) * collapse} fill={PAPER.british} stroke={PAPER.halo} strokeWidth={u(1.2)} />;
          })}
        </g>
      </g>
    );
  };

  // Musket fire from the redoubt while a wave is on the slope (stops in assault 3: out of powder).
  const fireFrom = (tt: number) => (tt > 0.3 && tt < 0.65 ? 0.5 + 0.5 * Math.sin(sec * 2 * Math.PI * 2.2) : 0);
  const fire = Math.max(fireFrom(a1), fireFrom(a2), a3 > 0.3 && a3 < 0.42 ? fireFrom(a3) : 0);
  // The hill changes hands late in assault 3; defenders fall back over the Neck.
  const hillRed = interpolate(a3, [0.5, 0.65], [0, 1], CLAMP);
  const retT = interpolate(a3, [0.5, 0.95], [0, 1], {...CLAMP, easing: ease});
  const retOp = interpolate(a3, [0.45, 0.55], [0, 1], CLAMP);

  const label = (x: number, y: number, text: string, o?: {anchor?: 'start' | 'middle' | 'end'; size?: number; color?: string; italic?: boolean}) => (
    <text x={x} y={y} textAnchor={o?.anchor ?? 'middle'} fontSize={u(o?.size ?? TYPE.place)} fontFamily={FONT.display} fontWeight={o?.italic ? 400 : 700}
      fill={o?.color ?? PAPER.ink} fontStyle={o?.italic ? 'italic' : 'normal'} {...halo}>{text}</text>
  );
  const water = (ll: LonLat, text: string) => {
    const [x, y] = at(ll);
    return label(x, y, text, {size: TYPE.label, color: PAPER.inkSoft, italic: true});
  };

  return (
    <PaperSheet fontFamily={FONT.display}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${camZoom})`, transformOrigin: `${(hx / width) * 100}% ${(hy / height) * 100}%`}}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
          <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={PAPER.water} />
          {geo.lands.map((d, i) => (
            <path key={i} d={d} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(1.6)} strokeLinejoin="round" />
          ))}
          {water([-71.0715, 42.3655], 'Charles River')}
          {water([-71.062, 42.3885], 'Mystic River')}

          {/* Bunker Hill (behind) */}
          <circle cx={kx} cy={ky} r={u(6)} fill={PAPER.inkSoft} stroke={PAPER.halo} strokeWidth={u(1.5)} />
          {label(kx - u(12), ky - u(8), 'Bunker Hill', {anchor: 'end', size: TYPE.label, color: PAPER.inkSoft})}

          {/* The redoubt on Breed's Hill */}
          <rect x={hx - u(16)} y={hy - u(16)} width={u(32)} height={u(32)} fill={alpha(PAPER.patriot, 0.18)} stroke={PAPER.patriot}
            strokeWidth={u(2.5)} transform={`rotate(12, ${hx}, ${hy})`} opacity={1 - hillRed * 0.6} />
          {fire > 0 && <circle cx={hx} cy={hy} r={u(20 + fire * 14)} fill="none" stroke={PAPER.gold} strokeWidth={u(2.5)} opacity={fire} />}
          <circle cx={hx} cy={hy} r={u(9)} fill={PAPER.patriot} stroke={PAPER.halo} strokeWidth={u(2.5)} opacity={1 - hillRed} />
          <circle cx={hx} cy={hy} r={u(9)} fill={PAPER.british} stroke={PAPER.halo} strokeWidth={u(2.5)} opacity={hillRed} />
          {label(hx + u(26), hy - u(18), "Breed's Hill", {anchor: 'start'})}

          {label(at(CHARLESTOWN)[0], at(CHARLESTOWN)[1] + u(6), 'Charlestown', {size: TYPE.label, color: PAPER.inkSoft})}
          {label(at(BOSTON)[0], at(BOSTON)[1], 'Boston')}

          {/* Assault waves */}
          {renderWave(a1, false, 1)}
          {renderWave(a2, false, 2)}
          {renderWave(a3, true, 3)}

          {/* Defenders fall back over Charlestown Neck */}
          {retOp > 0 && (
            <g opacity={retOp}>
              {[0, 1, 2].map(i => {
                const p = trace(retreatPts, Math.max(0, retT - i * 0.06));
                return <circle key={i} cx={p.x} cy={p.y} r={u(5.5)} fill={PAPER.patriot} stroke={PAPER.halo} strokeWidth={u(1.5)} opacity={1 - i * 0.25} />;
              })}
            </g>
          )}
        </svg>
      </div>
    </PaperSheet>
  );
};
