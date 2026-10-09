/**
 * Pontiac's War, 1763: a parchment Great Lakes map. Detroit is besieged first, then the British posts fall one by
 * one in the order they were taken; Detroit, Fort Pitt and Niagara hold. Real coastlines and lakes (Natural Earth
 * 50m, the same data as the documentary maps), a slow push-in over the whole shot. Labels are fort names only.
 *
 * DEFAULT_PHASES (6-8 s):
 * - setup    0.00-0.15  the posts appear
 * - uprising 0.15-0.75  siege ring at Detroit, then eight posts fall in chronological order, Fort Pitt besieged
 * - hold     0.75-1.00  the three that held glow gold
 */
import React, {useMemo} from 'react';
import {Easing, interpolate} from 'remotion';
import {geoPath} from 'd3-geo';
import type {FeatureCollection, MultiPolygon} from 'geojson';
import {feature} from 'topojson-client';
import type {GeometryCollection, Topology} from 'topojson-specification';
import landTopo from 'world-atlas/land-50m.json';
import lakesJson from '../../data/geo/lakes-50m.json';
import {usProjection, type LonLat} from '../geo/usGeo';
import {FONT, TYPE, alpha} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, paperHalo, usePhases, type CustomProps, type Phase} from './kit';

export const DEFAULT_PHASES: Phase[] = [
  {name: 'setup', start: 0, end: 0.15},
  {name: 'uprising', start: 0.15, end: 0.75},
  {name: 'hold', start: 0.75, end: 1.0},
];

export type PontiacFortsMapProps = CustomProps;

const LAND = (() => {
  const t = landTopo as unknown as Topology<{land: GeometryCollection}>;
  return feature(t, t.objects.land) as unknown as FeatureCollection<MultiPolygon>;
})();
const LAKES = lakesJson as unknown as FeatureCollection<MultiPolygon>;

interface Fort {
  name: string;
  ll: LonLat;
  /** label side (1 = right) and vertical offset, authored px */
  side: -1 | 1;
  ly: number;
}

/**
 * Posts that held in 1763. Basis: standard accounts (Dowd, War under Heaven; Middleton, Pontiac's War): Detroit
 * (besieged from May 9) and Fort Pitt (besieged from late June) held; Fort Niagara was never taken.
 * Sites: modern locations of the forts (Detroit; Pittsburgh's Point; Youngstown, NY).
 */
const HELD: Fort[] = [
  {name: 'Detroit', ll: [-83.05, 42.33], side: -1, ly: -8},
  {name: 'Fort Pitt', ll: [-80.01, 40.44], side: -1, ly: 6},
  {name: 'Niagara', ll: [-79.06, 43.26], side: 1, ly: -8},
];
const DETROIT = 0;
const PITT = 1;

/**
 * Posts that fell, in the order they were taken (May 16 - June 20, 1763; same sources). Eight fell; the narration
 * (E1 L90) only says "several", so no count is shown. Sites: Sandusky (Sandusky Bay, OH), St. Joseph (Niles, MI),
 * Miami (Fort Wayne, IN), Ouiatenon (near West Lafayette, IN), Michilimackinac (Mackinaw City, MI), Venango
 * (Franklin, PA), Le Boeuf (Waterford, PA), Presque Isle (Erie, PA).
 */
const FALLEN: Fort[] = [
  {name: 'Sandusky', ll: [-82.75, 41.45], side: 1, ly: 14},
  {name: 'St. Joseph', ll: [-86.25, 41.83], side: -1, ly: -6},
  {name: 'Miami', ll: [-85.13, 41.08], side: 1, ly: 14},
  {name: 'Ouiatenon', ll: [-86.98, 40.42], side: -1, ly: 8},
  {name: 'Michilimackinac', ll: [-84.73, 45.78], side: 1, ly: -8},
  {name: 'Venango', ll: [-79.83, 41.4], side: 1, ly: 6},
  {name: 'Le Boeuf', ll: [-79.98, 41.94], side: 1, ly: 6},
  {name: 'Presque Isle', ll: [-80.09, 42.13], side: -1, ly: -8},
];

/** Great Lakes and Ohio country. */
const EXTENT: [LonLat, LonLat] = [[-88.6, 39.6], [-77.2, 46.6]];

export const PontiacFortsMap: React.FC<PontiacFortsMapProps> = ({durationInFrames, phases}) => {
  const clock = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const {u, frame, fps} = clock;
  const width = u(1280);
  const height = u(720);

  const setupT = clock.t('setup');
  const upT = clock.t('uprising');
  const holdT = clock.t('hold');

  const {path, at} = useMemo(() => {
    const proj = usProjection(width, height, EXTENT).clipExtent([[-width * 0.2, -height * 0.2], [width * 1.2, height * 1.2]]);
    return {path: geoPath(proj), at: (ll: LonLat): [number, number] => proj(ll) ?? [0, 0]};
  }, [width, height]);
  const landD = useMemo(() => path(LAND) ?? '', [path]);
  const lakesD = useMemo(() => path(LAKES) ?? '', [path]);

  // Slow push toward Lake Erie across the whole shot.
  const D = Math.max(1, clock.durationInFrames);
  const zoom = interpolate(frame, [0, D], [1, 1.08], {...CLAMP, easing: Easing.inOut(Easing.quad)});
  const [fx, fy] = at([-81.6, 42.2]);

  const fallAt = (i: number) => interpolate(upT, [0.08 + 0.1 * i, 0.08 + 0.1 * i + 0.14], [0, 1], CLAMP);
  const siegeAt = (k: number) => (k === DETROIT ? interpolate(upT, [0, 0.08], [0, 1], CLAMP) : k === PITT ? interpolate(upT, [0.85, 1], [0, 1], CLAMP) : 0);
  const halo = paperHalo(u);
  const appear = interpolate(setupT, [0, 0.8], [0, 1], CLAMP);

  const label = (f: Fort, x: number, y: number, fill: string, opacity: number) => (
    <text x={x + u(11) * f.side} y={y + u(f.ly)} textAnchor={f.side === 1 ? 'start' : 'end'} fill={fill} opacity={opacity}
      fontSize={u(TYPE.town)} fontFamily={FONT.display} fontWeight={700} {...halo}>
      {f.name}
    </text>
  );

  return (
    <PaperSheet fontFamily={FONT.display}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(${fx} ${fy}) scale(${zoom}) translate(${-fx} ${-fy})`}>
          <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={PAPER.water} />
          <path d={landD} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(1.6)} strokeLinejoin="round" />
          <path d={lakesD} fill={PAPER.water} stroke={PAPER.coast} strokeWidth={u(1.2)} strokeLinejoin="round" />

          {/* the posts that fell */}
          {FALLEN.map((f, i) => {
            const [x, y] = at(f.ll);
            const p = fallAt(i);
            const flash = p > 0 && p < 1 ? Math.sin(Math.PI * p) : 0;
            const fallen = p >= 1;
            return (
              <g key={f.name} opacity={appear}>
                {flash > 0 && (
                  <circle cx={x} cy={y} r={u(6 + 22 * p)} fill="none" stroke={PAPER.red} strokeWidth={u(2.5)} opacity={flash} />
                )}
                <rect x={x - u(5.5)} y={y - u(5.5)} width={u(11)} height={u(11)}
                  fill={fallen ? PAPER.struck : PAPER.british} stroke={PAPER.ink} strokeWidth={u(1.2)} opacity={fallen ? 0.7 : 1} />
                {p > 0.5 && (
                  <g stroke={PAPER.red} strokeWidth={u(2.4)} strokeLinecap="round" opacity={interpolate(p, [0.5, 1], [0, 1], CLAMP)}>
                    <line x1={x - u(9)} y1={y - u(9)} x2={x + u(9)} y2={y + u(9)} />
                    <line x1={x + u(9)} y1={y - u(9)} x2={x - u(9)} y2={y + u(9)} />
                  </g>
                )}
                {label(f, x, y, fallen ? PAPER.muted : PAPER.ink, 1)}
              </g>
            );
          })}

          {/* the posts that held: siege rings at Detroit and Fort Pitt, then a gold glow on all three */}
          {HELD.map((f, k) => {
            const [x, y] = at(f.ll);
            const siege = siegeAt(k);
            return (
              <g key={f.name} opacity={appear}>
                {holdT > 0 && <circle cx={x} cy={y} r={u(16)} fill={alpha(PAPER.gold, 0.35 * holdT)} />}
                {siege > 0 && [0, 1].map(j => (
                  <circle key={j} cx={x} cy={y} r={u(14 + 4 * Math.sin((frame / fps) * 2.4 + j * Math.PI))} fill="none"
                    stroke={PAPER.red} strokeWidth={u(1.8)} strokeDasharray={`${u(5)} ${u(4)}`} opacity={siege * 0.85} />
                ))}
                <rect x={x - u(6)} y={y - u(6)} width={u(12)} height={u(12)} fill={PAPER.british}
                  stroke={holdT > 0 ? PAPER.gold : PAPER.ink} strokeWidth={u(1.2 + 1.3 * holdT)} />
                {label(f, x, y, PAPER.ink, 1)}
              </g>
            );
          })}
        </g>
      </svg>
    </PaperSheet>
  );
};
