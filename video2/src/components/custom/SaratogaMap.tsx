import React from 'react';
import {geoPath} from 'd3-geo';
import type {FeatureCollection, MultiPolygon} from 'geojson';
import {Easing, interpolate, useVideoConfig} from 'remotion';
import {NATURAL_LAKES} from '../../motion/natural-lakes';
import {NEIGHBORS, US_NATION, US_STATE_LINES, riverPaths, usProjection, type LonLat} from '../geo/usGeo';
import {FONT, TYPE} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, paperHalo, usePhases, type CustomProps, type Phase} from './kit';

/**
 * Saratoga, 1777 (APUSH Unit 3, u3e5 L56): Burgoyne comes down from Canada and is caught at Saratoga.
 *
 * Parchment map of the Champlain-Hudson corridor (Natural Earth lakes and rivers). Burgoyne's column (red) draws
 * south from Montreal up the Richelieu, down Lake Champlain past Ticonderoga, overland from Skenesborough to Fort
 * Edward and down the Hudson to Saratoga; then Gates's army (blue) comes up from Albany and a ring closes around
 * the British, the route back to Canada fading; a white flag goes up at Saratoga, the camera pushing in. Labels only
 * (four places, two waters, Burgoyne, Gates); no HUD, strip, counters or surrender banner.
 *
 * DEFAULT_PHASES: advance (Burgoyne's march) / encircle (Gates closes in) / surrender (white flag).
 */
export const DEFAULT_PHASES: Phase[] = [
  {name: 'advance', start: 0, end: 0.5},
  {name: 'encircle', start: 0.5, end: 0.82},
  {name: 'surrender', start: 0.82, end: 1},
];

export type SaratogaMapProps = CustomProps;

const LAKES = NATURAL_LAKES;
const CORRIDOR_LAKES: FeatureCollection<MultiPolygon> = {
  type: 'FeatureCollection',
  features: LAKES.features.filter(f => ['Lake Champlain', 'Lake George'].includes(String((f.properties as {name?: string} | null)?.name))),
};

// Places (modern positions). Saratoga = old Saratoga village (Schuylerville), where the army surrendered.
const MONTREAL: LonLat = [-73.57, 45.5];
const TICONDEROGA: LonLat = [-73.388, 43.842];
const SARATOGA: LonLat = [-73.582, 43.1];
const ALBANY: LonLat = [-73.756, 42.653];
/**
 * Burgoyne's 1777 route. Basis: standard accounts (NPS Saratoga NHP): from Canada via St. Johns on the Richelieu,
 * down Lake Champlain, Ticonderoga taken July 6, overland from Skenesborough to Fort Edward on the Hudson (the
 * baggage and guns went by Lake George), then down the Hudson to Saratoga.
 */
const BRITISH_ROUTE: LonLat[] = [
  MONTREAL, [-73.25, 45.31], [-73.35, 44.99], [-73.3, 44.6], [-73.38, 44.2], [-73.42, 43.95], TICONDEROGA,
  [-73.405, 43.555], [-73.585, 43.267], SARATOGA,
];
/** Gates's army moving north from the Albany side to block the road (Bemis Heights, Sept 1777). */
const GATES_ROUTE: LonLat[] = [[-73.72, 42.72], [-73.67, 42.86], [-73.64, 42.99]];
const EXTENT: [LonLat, LonLat] = [[-74.3, 42.5], [-72.7, 45.62]];

type XY = [number, number];
const ease = Easing.inOut(Easing.quad);

/** Walk a screen polyline by arc length; returns position and heading. */
const ptOn = (pts: XY[], tt: number) => {
  const c = Math.min(1, Math.max(0, tt));
  let len = 0;
  const segs = pts.slice(1).map((p, i) => {
    const d = Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]);
    len += d;
    return d;
  });
  let target = c * len;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const k = segs[i] === 0 ? 0 : Math.min(1, Math.max(0, target / segs[i]));
      return {
        x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k,
        y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k,
        ang: (Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]) * 180) / Math.PI,
      };
    }
    target -= segs[i];
  }
  const l = pts[pts.length - 1];
  return {x: l[0], y: l[1], ang: 0};
};

export const SaratogaMap: React.FC<SaratogaMapProps> = ({durationInFrames, phases}) => {
  const clock = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const {frame, fps, u, t} = clock;
  const {width, height} = useVideoConfig();
  const total = Math.max(1, clock.durationInFrames);
  const sec = frame / fps;

  const advanceP = interpolate(t('advance'), [0, 1], [0, 1], {easing: ease});
  const encircleP = t('encircle');
  const surrenderP = t('surrender');

  const projection = React.useMemo(() => usProjection(width, height, EXTENT, height * 0.04), [width, height]);
  const geo = React.useMemo(() => {
    const path = geoPath(projection);
    return {
      neighbors: NEIGHBORS.features.map(f => path(f) ?? ''),
      nation: path(US_NATION) ?? '',
      states: path(US_STATE_LINES) ?? '',
      lakes: path(CORRIDOR_LAKES) ?? '',
      rivers: riverPaths(path, ['Hudson', 'Richelieu']),
    };
  }, [projection]);
  const at = (ll: LonLat): XY => projection(ll) ?? [0, 0];
  const dOf = (lls: LonLat[]) => lls.map((ll, i) => `${i ? 'L' : 'M'}${at(ll).map(v => v.toFixed(1)).join(' ')}`).join(' ');
  const halo = paperHalo(u);

  const routePts = BRITISH_ROUTE.map(at);
  const burg = ptOn(routePts, advanceP);
  const gatesPts = GATES_ROUTE.map(at);
  const gatesP = interpolate(encircleP, [0, 0.55], [0, 1], {...CLAMP, easing: ease});
  const gates = ptOn(gatesPts, gatesP);
  const ringP = interpolate(encircleP, [0.35, 1], [0, 1], {...CLAMP, easing: ease});
  const [sx, sy] = at(SARATOGA);

  const zoom = interpolate(frame, [0, total], [1, 1.14], {...CLAMP, easing: ease});
  const ringPulse = 1 + (surrenderP > 0 ? Math.sin(sec * 2 * Math.PI * 0.6) * 0.03 : 0);
  const sites = [
    {ll: MONTREAL, name: 'Montreal', dx: 12, dy: -8, anchor: 'start' as const},
    {ll: TICONDEROGA, name: 'Ticonderoga', dx: -14, dy: 6, anchor: 'end' as const},
    {ll: SARATOGA, name: 'Saratoga', dx: 16, dy: 22, anchor: 'start' as const},
    {ll: ALBANY, name: 'Albany', dx: 12, dy: 6, anchor: 'start' as const},
  ];
  const waterLabels = [
    {ll: [-73.2, 44.62] as LonLat, name: 'Lake Champlain', angle: -78},
    {ll: [-73.8, 42.86] as LonLat, name: 'Hudson', angle: -80},
  ];

  return (
    <PaperSheet fontFamily={FONT.display}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: `${(sx / width) * 100}% ${(sy / height) * 100}%`}}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
          <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={PAPER.water} />
          {geo.neighbors.map((d, i) => (
            <path key={i} d={d} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(0.8)} />
          ))}
          <path d={geo.nation} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(1.2)} />
          <path d={geo.states} fill="none" stroke={PAPER.rule} strokeWidth={u(1)} strokeDasharray={`${u(6)} ${u(4)}`} />
          <path d={geo.lakes} fill={PAPER.water} stroke={PAPER.coast} strokeWidth={u(1.2)} strokeLinejoin="round" />
          <g fill="none" stroke={PAPER.waterDeep} strokeWidth={u(2.6)} strokeLinecap="round">
            {geo.rivers.map((r, i) => <path key={i} d={r.d} />)}
          </g>
          {waterLabels.map(w => {
            const [x, y] = at(w.ll);
            return (
              <text key={w.name} x={x} y={y} transform={`rotate(${w.angle}, ${x}, ${y})`} textAnchor="middle" fill={PAPER.inkSoft}
                fontSize={u(TYPE.label)} fontStyle="italic" fontFamily={FONT.display} {...halo}>
                {w.name}
              </text>
            );
          })}

          {/* Burgoyne's route; it fades as the road back to Canada is lost */}
          {advanceP > 0.005 && (
            <path d={dOf(BRITISH_ROUTE)} fill="none" stroke={PAPER.british} strokeWidth={u(4.5)} strokeLinecap="round" strokeLinejoin="round"
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - advanceP} opacity={0.9 - 0.55 * encircleP} />
          )}

          {/* Places */}
          {sites.map(s => {
            const [x, y] = at(s.ll);
            return (
              <g key={s.name}>
                <circle cx={x} cy={y} r={u(5)} fill={PAPER.ink} stroke={PAPER.halo} strokeWidth={u(1.5)} />
                <text x={x + u(s.dx)} y={y + u(s.dy)} textAnchor={s.anchor} fill={PAPER.ink} fontSize={u(TYPE.place)} fontWeight={700} fontFamily={FONT.display} {...halo}>
                  {s.name}
                </text>
              </g>
            );
          })}

          {/* Gates comes up from Albany */}
          {gatesP > 0.01 && (
            <g>
              <path d={dOf(GATES_ROUTE)} fill="none" stroke={PAPER.patriot} strokeWidth={u(4.5)} strokeLinecap="round" strokeLinejoin="round"
                pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - gatesP} />
              <g transform={`translate(${gates.x}, ${gates.y})`}>
                <circle r={u(8)} fill={PAPER.patriot} stroke={PAPER.halo} strokeWidth={u(2.5)} />
                <text x={u(14)} y={u(6)} fill={PAPER.patriot} fontSize={u(TYPE.place)} fontWeight={800} fontFamily={FONT.display} {...halo}>
                  Gates
                </text>
              </g>
            </g>
          )}

          {/* The ring closes around the British at Saratoga */}
          {ringP > 0.01 && (
            <ellipse cx={sx} cy={sy} rx={u(70) * ringPulse} ry={u(56) * ringPulse} fill="none" stroke={PAPER.patriot}
              strokeWidth={u(3.5)} strokeDasharray="1 1" pathLength={1} strokeDashoffset={1 - ringP} />
          )}

          {/* Burgoyne's column head */}
          {advanceP > 0.02 && (
            <g transform={`translate(${burg.x}, ${burg.y})`}>
              {advanceP < 1 && (
                <g transform={`rotate(${burg.ang})`}>
                  <path d={`M${u(16)},0 L${u(-2)},${u(-9)} L${u(-2)},${u(9)} Z`} fill={PAPER.british} />
                </g>
              )}
              <circle r={u(8)} fill={PAPER.british} stroke={PAPER.halo} strokeWidth={u(2.5)} />
              {encircleP <= 0 && (
                <text x={u(14)} y={-u(12)} fill={PAPER.british} fontSize={u(TYPE.place)} fontWeight={800} fontFamily={FONT.display} {...halo}>
                  Burgoyne
                </text>
              )}
            </g>
          )}

          {/* White flag at Saratoga */}
          {surrenderP > 0 && (
            <g transform={`translate(${sx - u(4)}, ${sy - u(8)})`} opacity={interpolate(surrenderP, [0, 0.3], [0, 1], CLAMP)}>
              <line x1={0} y1={0} x2={0} y2={-u(46) * interpolate(surrenderP, [0, 0.4], [0.4, 1], CLAMP)} stroke={PAPER.ink} strokeWidth={u(3)} />
              <g transform={`translate(0, ${-u(46) * interpolate(surrenderP, [0, 0.4], [0.4, 1], CLAMP)}) rotate(${Math.sin(sec * 2 * Math.PI * 0.7) * 6})`}>
                <rect x={u(2)} y={0} width={u(36)} height={u(22)} fill={PAPER.halo} stroke={PAPER.ink} strokeWidth={u(1.5)} />
              </g>
            </g>
          )}
        </svg>
      </div>
    </PaperSheet>
  );
};
