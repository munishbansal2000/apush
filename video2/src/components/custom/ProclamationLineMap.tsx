/**
 * Proclamation of 1763: a parchment map of eastern North America. The line draws down the Appalachian divide; the
 * land between it and the Mississippi washes in as the Indian Reserve; then settler dots appear already past the
 * line (western Pennsylvania, the upper Ohio and Virginia valleys) while the line pulses. Real coastlines, lakes and
 * the Mississippi (Natural Earth, the same data as the documentary maps), slow push-in. Labels: "Indian Reserve",
 * "Thirteen Colonies", "Mississippi".
 *
 * DEFAULT_PHASES (6-8 s):
 * - draw     0.00-0.40  the line draws north to south
 * - reserve  0.35-0.60  the reserve washes in, west of the line to the Mississippi
 * - settlers 0.60-1.00  settlers appear west of the line; the line pulses
 */
import React, {useMemo} from 'react';
import {Easing, interpolate} from 'remotion';
import {geoPath} from 'd3-geo';
import type {FeatureCollection, MultiPolygon} from 'geojson';
import {feature} from 'topojson-client';
import type {GeometryCollection, Topology} from 'topojson-specification';
import landTopo from 'world-atlas/land-50m.json';
import lakesJson from '../../data/geo/lakes-50m.json';
import {ringPolygon, riverPaths, usProjection, type LonLat} from '../geo/usGeo';
import {FONT, TYPE, alpha} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, paperHalo, usePhases, type CustomProps, type Phase} from './kit';

export const DEFAULT_PHASES: Phase[] = [
  {name: 'draw', start: 0, end: 0.4},
  {name: 'reserve', start: 0.35, end: 0.6},
  {name: 'settlers', start: 0.6, end: 1.0},
];

export type ProclamationLineMapProps = CustomProps;

const LAND = (() => {
  const t = landTopo as unknown as Topology<{land: GeometryCollection}>;
  return feature(t, t.objects.land) as unknown as FeatureCollection<MultiPolygon>;
})();
const LAKES = lakesJson as unknown as FeatureCollection<MultiPolygon>;

/**
 * The line, north to south (approximate). Basis: the proclamation reserves the lands "beyond the heads or sources of
 * any of the rivers which fall into the Atlantic Ocean from the west and northwest", i.e. the eastern continental
 * divide (E1 L42: "along the crest of the Appalachians"). It starts where Quebec's 1763 boundary crosses the
 * St. Lawrence at 45°N and runs through Georgia to the Florida line at about 31°N. The New York stretch was never
 * surveyed in 1763 and is the least certain.
 */
const LINE: LonLat[] = [
  [-74.7, 45.0], [-75.5, 43.5], [-77.0, 42.2], [-78.0, 41.6], [-78.6, 40.5], [-79.1, 39.6], [-79.6, 38.9],
  [-80.1, 38.0], [-80.4, 37.3], [-81.2, 36.4], [-82.3, 35.6], [-83.1, 35.0], [-83.9, 34.4], [-84.2, 33.6],
  [-83.6, 32.3], [-82.6, 30.8],
];

/**
 * Reserve outline: west of the line, north of the Floridas (31°N, 1763), east of the Mississippi (Spanish Louisiana
 * lay beyond it after 1763), south-west of Quebec (St. Lawrence at 45°N to Lake Nipissing). The Mississippi edge
 * follows the same points as the documentary's acquisition maps (usGeo MISSISSIPPI); clipped to land on screen.
 */
const RESERVE: LonLat[] = [
  ...LINE,
  [-91.6, 31.0], [-91.4, 31.9], [-91.1, 33.1], [-90.1, 35.1], [-89.4, 36.6], [-90.2, 38.6], [-91.4, 40.4],
  [-91.2, 42.7], [-92.0, 44.5], [-93.3, 45.0], [-94.4, 46.4], [-95.2, 47.2], [-95.2, 49.5], [-79.6, 49.5],
  [-79.6, 46.3],
];

/**
 * Settlers already west of the line in the early 1760s (E1 L54: "Settlers were already west of it"). Basis: the
 * squatters Bouquet and the Pennsylvania government tried to evict on Redstone Creek and around Fort Pitt (1762-
 * 1766), the Cheat valley, the Greenbrier settlements, and the Holston valley.
 */
const SETTLERS: LonLat[] = [
  [-80.05, 40.35], [-79.88, 40.02], [-79.85, 39.3], [-80.45, 37.8], [-81.6, 36.85], [-81.95, 36.6],
];

const EXTENT: [LonLat, LonLat] = [[-93.5, 29.5], [-68.5, 47.5]];

export const ProclamationLineMap: React.FC<ProclamationLineMapProps> = ({durationInFrames, phases}) => {
  const clock = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const {u, frame, fps} = clock;
  const width = u(1280);
  const height = u(720);

  const drawT = clock.t('draw');
  const reserveT = clock.t('reserve');
  const settlerT = clock.t('settlers');

  const geo = useMemo(() => {
    const proj = usProjection(width, height, EXTENT).clipExtent([[-width * 0.2, -height * 0.2], [width * 1.2, height * 1.2]]);
    const path = geoPath(proj);
    return {
      at: (ll: LonLat): [number, number] => proj(ll) ?? [0, 0],
      land: path(LAND) ?? '',
      lakes: path(LAKES) ?? '',
      reserve: path(ringPolygon(RESERVE)) ?? '',
      line: path({type: 'LineString', coordinates: LINE}) ?? '',
      rivers: riverPaths(path, ['Mississippi', 'Ohio']),
    };
  }, [width, height]);

  // Slow push toward the line across the whole shot.
  const D = Math.max(1, clock.durationInFrames);
  const zoom = interpolate(frame, [0, D], [1, 1.07], {...CLAMP, easing: Easing.inOut(Easing.quad)});
  const [fx, fy] = geo.at([-80.5, 38.5]);

  const drawn = Easing.inOut(Easing.cubic)(drawT);
  const pulse = settlerT > 0 ? 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 2) : 0;
  const halo = paperHalo(u);
  const label = (text: string, ll: LonLat, opacity: number, size: number, italic = false) => {
    const [x, y] = geo.at(ll);
    return (
      <text x={x} y={y} textAnchor="middle" fill={PAPER.inkSoft} opacity={opacity} fontSize={u(size)} fontFamily={FONT.display}
        fontWeight={700} fontStyle={italic ? 'italic' : 'normal'} letterSpacing={u(1)} {...halo}>
        {text}
      </text>
    );
  };

  return (
    <PaperSheet fontFamily={FONT.display}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0}}>
        <defs>
          <clipPath id="plm-land">
            <path d={geo.land} />
          </clipPath>
        </defs>
        <g transform={`translate(${fx} ${fy}) scale(${zoom}) translate(${-fx} ${-fy})`}>
          <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={PAPER.water} />
          <path d={geo.land} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(1.6)} strokeLinejoin="round" />

          {/* the Indian Reserve, clipped to land */}
          <g clipPath="url(#plm-land)">
            <path d={geo.reserve} fill={alpha(PAPER.gold, 0.32)} opacity={reserveT} />
          </g>
          <path d={geo.lakes} fill={PAPER.water} stroke={PAPER.coast} strokeWidth={u(1.2)} strokeLinejoin="round" />
          {geo.rivers.map((r, i) => (
            <path key={i} d={r.d} fill="none" stroke={PAPER.waterDeep} strokeWidth={u(r.name === 'Mississippi' ? 2.4 : 1.6)} strokeLinecap="round" />
          ))}

          {/* the line: draws north to south, then pulses while settlers appear */}
          {settlerT > 0 && (
            <path d={geo.line} fill="none" stroke={PAPER.red} strokeWidth={u(10)} strokeLinecap="round" strokeLinejoin="round" opacity={0.25 * pulse * settlerT} />
          )}
          <path d={geo.line} fill="none" stroke={PAPER.red} strokeWidth={u(4)} strokeLinecap="round" strokeLinejoin="round"
            pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - drawn} opacity={drawT > 0 ? 1 : 0} />

          {/* settlers already past the line */}
          {SETTLERS.map((ll, i) => {
            const [x, y] = geo.at(ll);
            const p = interpolate(settlerT, [i * 0.1, i * 0.1 + 0.25], [0, 1], CLAMP);
            if (p <= 0) return null;
            return (
              <g key={i}>
                {p < 1 && <circle cx={x} cy={y} r={u(4 + 16 * p)} fill="none" stroke={PAPER.red} strokeWidth={u(2)} opacity={1 - p} />}
                <circle cx={x} cy={y} r={u(4.5) * (0.5 + 0.5 * p)} fill={PAPER.ink} stroke={PAPER.bg} strokeWidth={u(1.2)} opacity={p} />
              </g>
            );
          })}

          {label('Indian Reserve', [-86.0, 38.6], reserveT, TYPE.place)}
          {label('Thirteen Colonies', [-77.2, 37.4], interpolate(drawT, [0.5, 1], [0, 1], CLAMP), TYPE.label)}
          {label('Mississippi', [-91.9, 35.6], reserveT, TYPE.small, true)}
        </g>
      </svg>
    </PaperSheet>
  );
};
