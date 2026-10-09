import React from 'react';
import {geoPath} from 'd3-geo';
import {Easing, interpolate, useVideoConfig} from 'remotion';
import {NEIGHBORS, US_NATION, US_STATE_LINES, usProjection, type LonLat} from '../geo/usGeo';
import {FONT, TYPE, alpha} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, paperHalo, usePhases, type CustomProps, type Phase} from './kit';

/**
 * Lexington and Concord, April 1775 (APUSH Unit 3, u3e5 L10): the march out and the running fight back.
 *
 * Parchment road map west of Boston. The British column (red) crosses the Back Bay by boat and marches out through
 * Menotomy; shots flash at Lexington Green as the column passes, then at Concord's North Bridge where militia (blue)
 * hold the bridge; on the march back, militia fire pops along the road from the Concord end toward Charlestown, the
 * camera drifting in. Labels only (towns, North Bridge, British, Militia); no quote (u3e5 L14: Emerson's line is
 * literature about Concord, not words spoken on the green), no date card (the documentary's year stamp carries it).
 *
 * DEFAULT_PHASES: march (column out, Lexington flash as it passes) / bridge (North Bridge fight) /
 * retreat (militia fire along the road back).
 */
export const DEFAULT_PHASES: Phase[] = [
  {name: 'march', start: 0, end: 0.4},
  {name: 'bridge', start: 0.4, end: 0.55},
  {name: 'retreat', start: 0.55, end: 1},
];

export type LexingtonConcordMapProps = CustomProps;

// Basis: modern positions of the 1775 sites (Boston Common, Lechmere Point, Arlington center = Menotomy, Lexington
// Battle Green, Concord center, Old North Bridge, Charlestown Neck/village); route per standard accounts (NPS
// Minute Man NHP): the regulars crossed the Back Bay by boat to Lechmere Point, and fell back through Menotomy to
// Charlestown at nightfall.
const BOSTON: LonLat = [-71.066, 42.355];
const LECHMERE: LonLat = [-71.077, 42.369];
const CAMBRIDGE_ROAD: LonLat = [-71.115, 42.395];
const MENOTOMY: LonLat = [-71.156, 42.415];
const LEXINGTON: LonLat = [-71.231, 42.449];
const CONCORD: LonLat = [-71.349, 42.46];
const NORTH_BRIDGE: LonLat = [-71.35, 42.469];
const CHARLESTOWN_NECK: LonLat = [-71.077, 42.384];
const CHARLESTOWN: LonLat = [-71.06, 42.375];

/** Out: boats to Lechmere Point, then the road through Menotomy and Lexington to Concord. */
const MARCH: LonLat[] = [BOSTON, LECHMERE, CAMBRIDGE_ROAD, MENOTOMY, LEXINGTON, CONCORD];
/** Back: Concord to Charlestown under fire. */
const RETREAT: LonLat[] = [CONCORD, LEXINGTON, MENOTOMY, CAMBRIDGE_ROAD, CHARLESTOWN_NECK, CHARLESTOWN];
/** Militia fire points as fractions along RETREAT (Concord end first). */
const AMBUSH_FRACTIONS = [0.08, 0.24, 0.4, 0.56, 0.72, 0.86];
const EXTENT: [LonLat, LonLat] = [[-71.42, 42.33], [-71.0, 42.5]];

type XY = [number, number];

/** Cumulative arc-length fractions at each vertex of a screen polyline. */
const vertexFractions = (pts: XY[]): number[] => {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = acc[acc.length - 1] || 1;
  return acc.map(d => d / total);
};

/** Position along a screen polyline at arc-length fraction t (0-1). */
const pointAlong = (pts: XY[], t: number): XY => {
  const fr = vertexFractions(pts);
  const c = Math.max(0, Math.min(1, t));
  for (let i = 1; i < pts.length; i++) {
    if (c <= fr[i] || i === pts.length - 1) {
      const span = fr[i] - fr[i - 1];
      const k = span > 0 ? (c - fr[i - 1]) / span : 0;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    }
  }
  return pts[pts.length - 1];
};

export const LexingtonConcordMap: React.FC<LexingtonConcordMapProps> = ({durationInFrames, phases}) => {
  const clock = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const {frame, fps, u, t} = clock;
  const {width, height} = useVideoConfig();
  const total = Math.max(1, clock.durationInFrames);
  const sec = frame / fps;

  const marchT = interpolate(t('march'), [0, 1], [0, 1], {easing: Easing.inOut(Easing.quad)});
  const bridgeT = t('bridge');
  const retreatT = interpolate(t('retreat'), [0, 1], [0, 1], {easing: Easing.inOut(Easing.quad)});

  const projection = React.useMemo(() => usProjection(width, height, EXTENT, height * 0.06), [width, height]);
  const geo = React.useMemo(() => {
    const path = geoPath(projection);
    return {
      neighbors: NEIGHBORS.features.map(f => path(f) ?? ''),
      nation: path(US_NATION) ?? '',
      states: path(US_STATE_LINES) ?? '',
    };
  }, [projection]);
  const at = React.useCallback((ll: LonLat): XY => projection(ll) ?? [0, 0], [projection]);
  const line = (lls: LonLat[]) => lls.map((ll, i) => `${i ? 'L' : 'M'} ${at(ll).map(v => v.toFixed(1)).join(' ')}`).join(' ');

  const marchXY = React.useMemo(() => MARCH.map(at), [at]);
  const retreatXY = React.useMemo(() => RETREAT.map(at), [at]);
  /** Where Lexington falls along the march, so the shots fire as the column passes it. */
  const lexFrac = React.useMemo(() => vertexFractions(marchXY)[MARCH.indexOf(LEXINGTON)], [marchXY]);
  const marchHead = pointAlong(marchXY, marchT);
  const retreatHead = pointAlong(retreatXY, retreatT);

  const halo = paperHalo(u);
  const cameraZoom = interpolate(frame, [0, total], [1, 1.07], CLAMP);

  // Lexington: a burst as the column reaches the green, then a faint mark that stays.
  const lexBurst = interpolate(marchT, [lexFrac - 0.01, lexFrac + 0.03, lexFrac + 0.18], [0, 1, 0], CLAMP);
  const lexMark = interpolate(marchT, [lexFrac, lexFrac + 0.05], [0, 1], CLAMP);
  // North Bridge: militia hold the bridge; shots flicker through the beat.
  const bridgeIn = interpolate(bridgeT, [0, 0.25], [0, 1], CLAMP);
  const bridgeFlash = bridgeT > 0 && bridgeT < 1 ? 0.5 + 0.5 * Math.sin(sec * 2 * Math.PI * 1.6) : 0;

  const [lx, ly] = at(LEXINGTON);
  const [nbX, nbY] = at(NORTH_BRIDGE);
  const towns = [
    {ll: BOSTON, name: 'Boston', anchor: 'start' as const, dx: 12, dy: 14},
    {ll: LEXINGTON, name: 'Lexington', anchor: 'middle' as const, dx: 0, dy: 30},
    {ll: CONCORD, name: 'Concord', anchor: 'end' as const, dx: -14, dy: 18},
  ];

  const columnHead = (p: XY, label: string, opacity: number) => (
    <g transform={`translate(${p[0]}, ${p[1]})`} opacity={opacity}>
      <circle r={u(10)} fill={PAPER.british} stroke={PAPER.halo} strokeWidth={u(2.5)} />
      {label && (
        <text y={-u(18)} textAnchor="middle" fill={PAPER.british} fontSize={u(TYPE.label)} fontWeight={800} fontFamily={FONT.display} {...halo}>
          {label}
        </text>
      )}
    </g>
  );

  return (
    <PaperSheet fontFamily={FONT.display}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${cameraZoom})`, transformOrigin: '45% 45%'}}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
          <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={PAPER.water} />
          {geo.neighbors.map((d, i) => (
            <path key={i} d={d} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(0.8)} />
          ))}
          <path d={geo.nation} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(1.4)} />
          <path d={geo.states} fill="none" stroke={PAPER.rule} strokeWidth={u(1)} strokeDasharray={`${u(6)} ${u(4)}`} />

          {/* The road, faint from the start */}
          <path d={line(MARCH.slice(1))} fill="none" stroke={PAPER.rule} strokeWidth={u(2.5)} strokeDasharray={`${u(8)} ${u(6)}`} strokeLinecap="round" />

          {/* March out: Boston -> Concord */}
          <path d={line(MARCH)} fill="none" stroke={PAPER.british} strokeWidth={u(5)} strokeLinecap="round" strokeLinejoin="round"
            pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - marchT} opacity={retreatT > 0 ? 0.45 : 0.9} />

          {/* March back: Concord -> Charlestown */}
          {retreatT > 0 && (
            <path d={line(RETREAT)} fill="none" stroke={PAPER.british} strokeWidth={u(5)} strokeLinecap="round" strokeLinejoin="round"
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - retreatT} />
          )}

          {/* Lexington Green: shots as the column passes */}
          {lexMark > 0 && (
            <g transform={`translate(${lx}, ${ly})`}>
              <circle r={u(10 + 34 * lexBurst)} fill={alpha(PAPER.gold, 0.45 * lexBurst)} />
              <circle r={u(12)} fill="none" stroke={PAPER.gold} strokeWidth={u(2.5)} opacity={0.4 + 0.6 * lexMark} />
            </g>
          )}

          {/* North Bridge: militia hold the bridge */}
          {bridgeIn > 0 && (
            <g transform={`translate(${nbX}, ${nbY})`} opacity={bridgeIn}>
              <circle r={u(12 + bridgeFlash * 10)} fill="none" stroke={PAPER.gold} strokeWidth={u(2.5)} opacity={0.5 + 0.5 * bridgeFlash} />
              <circle r={u(8)} fill={PAPER.patriot} stroke={PAPER.halo} strokeWidth={u(2)} />
              <text x={u(16)} y={-u(12)} fill={PAPER.ink} fontSize={u(TYPE.label)} fontWeight={800} fontFamily={FONT.display} {...halo}>
                North Bridge
              </text>
            </g>
          )}

          {/* Militia fire along the road back, popping as the retreating column passes each point */}
          {AMBUSH_FRACTIONS.map((f, i) => {
            const pop = interpolate(retreatT, [f - 0.03, f + 0.05], [0, 1], {...CLAMP, easing: Easing.out(Easing.back(1.6))});
            if (pop <= 0) return null;
            const [ax, ay] = pointAlong(retreatXY, f);
            const side = i % 2 ? 1 : -1;
            const ring = interpolate(retreatT, [f, f + 0.2], [0, 1], CLAMP);
            return (
              <g key={f} transform={`translate(${ax}, ${ay + side * u(20)})`}>
                <circle r={u(8 + 18 * ring)} fill="none" stroke={PAPER.gold} strokeWidth={u(2)} opacity={1 - ring} />
                <circle r={u(6.5) * pop} fill={PAPER.patriot} stroke={PAPER.halo} strokeWidth={u(1.8)} />
                {i === 0 && (
                  <text x={u(12)} y={side * u(16)} fill={PAPER.patriot} fontSize={u(TYPE.label)} fontWeight={800} fontFamily={FONT.display} opacity={pop} {...halo}>
                    Militia
                  </text>
                )}
              </g>
            );
          })}

          {/* Towns */}
          {towns.map(tw => {
            const [x, y] = at(tw.ll);
            return (
              <g key={tw.name} transform={`translate(${x}, ${y})`}>
                <circle r={u(4.5)} fill={PAPER.ink} stroke={PAPER.halo} strokeWidth={u(1.5)} />
                <text x={u(tw.dx)} y={u(tw.dy)} textAnchor={tw.anchor} fill={PAPER.ink} fontSize={u(TYPE.place)} fontWeight={700} fontFamily={FONT.display} {...halo}>
                  {tw.name}
                </text>
              </g>
            );
          })}

          {/* Column heads */}
          {marchT > 0 && marchT < 1 && columnHead(marchHead, 'British', 1)}
          {retreatT > 0 && retreatT < 1 && columnHead(retreatHead, '', 1)}
        </svg>
      </div>
    </PaperSheet>
  );
};
