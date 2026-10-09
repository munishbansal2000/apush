import React from 'react';
import { geoPath } from 'd3-geo';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { NEIGHBORS, US_NATION, US_STATE_LINES, usProjection, type LonLat } from '../geo/usGeo';
import { FONT, COLOR, TYPE, RADIUS, alpha } from '../../theme/tokens';

export interface Phase {
  name: string;
  start: number; // 0-1 fraction of duration
  end: number; // 0-1 fraction of duration
}

export interface LexingtonConcordMapProps {
  durationInFrames?: number;
  phases: Phase[];
}

/**
 * Expected phases (documented here; the component reads them from props):
 * - setup   0.00-0.15  map establishes, road + towns fade in
 * - march   0.15-0.45  British column animates Boston -> Lexington -> Concord
 * - battle  0.45-0.65  fighting at Lexington ("shot heard round the world") and
 *                       Concord's North Bridge; British retreat begins
 * - retreat 0.65-0.90  British column falls back Concord -> Lexington -> Boston
 *                       under fire; minuteman ambush markers pop along the road
 * - resolve 0.90-1.00  casualty counters + "April 19, 1775" fade in
 * Missing phases degrade gracefully to 0 progress.
 */

const BOSTON: LonLat = [-71.06, 42.36];
const LEXINGTON: LonLat = [-71.23, 42.44];
const CONCORD: LonLat = [-71.35, 42.46];
const MENOTOMY: LonLat = [-71.18, 42.42];
/** North Bridge, just north of Concord's town center. */
const NORTH_BRIDGE: LonLat = [-71.353, 42.471];

/** Boston -> Menotomy -> Lexington -> Concord, the 1775 road. */
const ROAD: LonLat[] = [BOSTON, MENOTOMY, LEXINGTON, CONCORD];
/** Battle-area extent (lon-lat), fitted to the frame. */
const EXTENT: [LonLat, LonLat] = [
  [-71.56, 42.29],
  [-70.92, 42.53],
];
/** Ambush spots as fractions along the road (colonial militia hit-and-run points). */
const AMBUSH_FRACTIONS = [0.16, 0.34, 0.5, 0.66, 0.82];

const BASE = {
  ocean: COLOR.night,
  neighbor: COLOR.nightPanel,
  land: alpha(COLOR.onNight, 0.12),
  state: alpha(COLOR.paperDeep, 0.28),
  coast: COLOR.onNightMuted,
};

type XY = [number, number];

/** Position along a polyline at fractional distance t (0-1). */
const pointAlong = (pts: XY[], t: number): XY => {
  if (pts.length < 2) return pts[0] ?? [0, 0];
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(d);
    total += d;
  }
  const target = Math.max(0, Math.min(1, t)) * total;
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i] >= target || i === segs.length - 1) {
      const k = segs[i] === 0 ? 0 : (target - acc) / segs[i];
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    acc += segs[i];
  }
  return pts[pts.length - 1];
};

export const LexingtonConcordMap: React.FC<LexingtonConcordMapProps> = ({ durationInFrames: propDuration, phases }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames: configDuration } = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  // Map sizes are authored for a 1280-wide frame and scale with the composition width.
  const u = (n: number) => n * (width / 1280);
  const cameraEnd = Math.max(1, durationInFrames);

  /** Phase name -> 0-1 progress, driven only by props. Missing phase -> 0. */
  const phaseT = (name: string): number => {
    const p = phases.find(x => x.name === name);
    if (!p || p.end <= p.start) return 0;
    return interpolate(frame, [p.start * durationInFrames, p.end * durationInFrames], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  };

  const setupT = phaseT('setup');
  const marchT = interpolate(phaseT('march'), [0, 1], [0, 1], { easing: Easing.inOut(Easing.quad) });
  const battleT = phaseT('battle');
  const retreatT = interpolate(phaseT('retreat'), [0, 1], [0, 1], { easing: Easing.inOut(Easing.quad) });
  const resolveT = phaseT('resolve');

  const projection = React.useMemo(() => usProjection(width, height, EXTENT, height * 0.06), [width, height]);
  const geo = React.useMemo(() => {
    const path = geoPath(projection);
    return {
      neighbors: NEIGHBORS.features.map(f => path(f) ?? ''),
      nation: path(US_NATION) ?? '',
      states: path(US_STATE_LINES) ?? '',
    };
  }, [projection]);

  const at = React.useCallback(
    (ll: LonLat): XY => projection(ll) ?? [0, 0],
    [projection]
  );
  const line = (lls: LonLat[]) =>
    lls.map((ll, i) => `${i ? 'L' : 'M'} ${at(ll).map(v => v.toFixed(1)).join(' ')}`).join(' ');

  const roadXY = React.useMemo(() => ROAD.map(at), [at]);
  const retreatXY = React.useMemo(() => [...roadXY].reverse(), [roadXY]);
  const marchHead = pointAlong(roadXY, marchT);
  const retreatHead = pointAlong(retreatXY, retreatT);
  const marchActive = marchT > 0 && marchT < 1;
  const retreatActive = retreatT > 0 && retreatT < 1;

  const cameraZoom = interpolate(frame, [0, cameraEnd], [1.0, 1.05], { extrapolateRight: 'clamp' });

  const halo = { stroke: alpha(COLOR.night, 0.92), strokeWidth: u(3.5), paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };

  const lexFlash = battleT > 0 && battleT < 1 ? 0.5 + 0.5 * Math.sin(frame * 0.35) : 0;
  const concordFlash = battleT > 0.35 ? 0.5 + 0.5 * Math.sin(frame * 0.4 + 1.5) : 0;

  const townFade = interpolate(setupT, [0.25, 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const resolveFade = interpolate(resolveT, [0.1, 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const britishLosses = Math.round(interpolate(resolveT, [0.25, 0.95], [0, 273], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const colonialLosses = Math.round(interpolate(resolveT, [0.25, 0.95], [0, 95], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  const [bx, by] = at(BOSTON);
  const [lx, ly] = at(LEXINGTON);
  const [cx, cy] = at(CONCORD);
  const [nbX, nbY] = at(NORTH_BRIDGE);
  const shotLabelT = interpolate(battleT, [0.05, 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: COLOR.night, fontFamily: FONT.ui }}>
      {/* MAP in one svg, slow camera drift */}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cameraZoom})`, transformOrigin: 'center center', zIndex: 20 }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={BASE.ocean} />
          {geo.neighbors.map((d, i) => (
            <path key={i} d={d} fill={BASE.neighbor} stroke={BASE.coast} strokeWidth={u(0.8)} vectorEffect="non-scaling-stroke" />
          ))}
          <path d={geo.nation} fill={BASE.land} stroke={BASE.coast} strokeWidth={u(1.2)} vectorEffect="non-scaling-stroke" />
          <path d={geo.states} fill="none" stroke={BASE.state} strokeWidth={u(1)} strokeDasharray={`${u(6)} ${u(4)}`} vectorEffect="non-scaling-stroke" />

          {/* The 1775 road (faint, always visible once established) */}
          <path d={line(ROAD)} fill="none" stroke={alpha(COLOR.onNight, 0.28)} strokeWidth={u(2.5)} strokeDasharray={`${u(8)} ${u(6)}`} strokeLinecap="round" opacity={townFade} />

          {/* British advance: Boston -> Concord */}
          <path d={line(ROAD)} fill="none" stroke={COLOR.redOnNight} strokeWidth={u(5)} strokeLinecap="round"
            pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - marchT}
            style={{ filter: `drop-shadow(0 0 ${u(6)}px ${COLOR.redOnNight})` }} />

          {/* British retreat: Concord -> Boston (dashed fall-back) */}
          <path d={line([...ROAD].reverse())} fill="none" stroke={COLOR.redOnNight} strokeWidth={u(4)} strokeLinecap="round"
            pathLength={1} strokeDasharray="0.02 0.03" strokeDashoffset={1 - retreatT}
            style={{ filter: `drop-shadow(0 0 ${u(5)}px ${COLOR.redOnNight})` }}
            opacity={retreatT > 0 ? 0.9 : 0} />

          {/* Column heads */}
          {marchActive && (
            <g transform={`translate(${marchHead[0]}, ${marchHead[1]})`}>
              <circle r={u(11)} fill={COLOR.red} stroke={COLOR.onNight} strokeWidth={u(2.5)} style={{ filter: `drop-shadow(0 0 ${u(8)}px ${COLOR.red})` }} />
              <text x={0} y={-u(18)} textAnchor="middle" fill={COLOR.redOnNight} fontSize={u(TYPE.tag)} fontWeight={900} fontFamily={FONT.display} {...halo}>
                700 BRITISH
              </text>
            </g>
          )}
          {retreatActive && (
            <g transform={`translate(${retreatHead[0]}, ${retreatHead[1]})`}>
              <circle r={u(11)} fill={COLOR.red} stroke={COLOR.onNight} strokeWidth={u(2.5)} opacity={0.85} style={{ filter: `drop-shadow(0 0 ${u(8)}px ${COLOR.red})` }} />
              <text x={0} y={-u(18)} textAnchor="middle" fill={COLOR.redOnNight} fontSize={u(TYPE.tag)} fontWeight={900} fontFamily={FONT.display} {...halo}>
                RETREAT
              </text>
            </g>
          )}

          {/* Minuteman ambush markers pop along the road during the retreat */}
          {AMBUSH_FRACTIONS.map((f, i) => {
            const pop = interpolate(retreatT, [0.08 * i, 0.08 * i + 0.18], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back()),
            });
            if (pop <= 0) return null;
            const [ax, ay] = pointAlong(roadXY, f);
            const ringR = interpolate(retreatT, [0.08 * i, 0.08 * i + 0.35], [u(8), u(26)], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <g key={i} transform={`translate(${ax}, ${ay - u(26)}) scale(${pop})`}>
                <circle r={ringR} fill="none" stroke={alpha(COLOR.amber, 0.7)} strokeWidth={u(2)} />
                <circle r={u(7)} fill={COLOR.amber} stroke={COLOR.onNight} strokeWidth={u(1.8)} style={{ filter: `drop-shadow(0 0 ${u(6)}px ${COLOR.amber})` }} />
                <text x={u(13)} y={u(3)} fill={COLOR.goldOnNight} fontSize={u(TYPE.micro)} fontWeight={800} fontFamily={FONT.mono} {...halo}>
                  MILITIA
                </text>
              </g>
            );
          })}

          {/* Battle: Lexington - the shot heard round the world */}
          {battleT > 0 && (
            <g transform={`translate(${lx}, ${ly})`}>
              <circle r={u(14 + lexFlash * 10)} fill="none" stroke={alpha(COLOR.gold, 0.6 + lexFlash * 0.4)} strokeWidth={u(2.5)} />
              <circle r={u(30 + lexFlash * 14)} fill="none" stroke={alpha(COLOR.gold, 0.35)} strokeWidth={u(1.5)} />
              <circle r={u(6)} fill={COLOR.gold} style={{ filter: `drop-shadow(0 0 ${u(8)}px ${COLOR.gold})` }} />
              <g opacity={shotLabelT}>
                <text x={0} y={-u(48)} textAnchor="middle" fill={COLOR.goldOnNight} fontSize={u(TYPE.body)} fontWeight={900} fontFamily={FONT.display} {...halo}>
                  &ldquo;The shot heard round the world&rdquo;
                </text>
                <text x={0} y={-u(28)} textAnchor="middle" fill={COLOR.onNight} fontSize={u(TYPE.micro)} fontFamily={FONT.mono} {...halo}>
                  LEXINGTON GREEN · 5:00 AM
                </text>
              </g>
            </g>
          )}

          {/* Battle: Concord - North Bridge skirmish */}
          {battleT > 0.3 && (
            <g transform={`translate(${nbX}, ${nbY})`}>
              <circle r={u(12 + concordFlash * 8)} fill="none" stroke={alpha(COLOR.skyOnNight, 0.65 + concordFlash * 0.35)} strokeWidth={u(2.5)} />
              <circle r={u(6)} fill={COLOR.skyOnNight} style={{ filter: `drop-shadow(0 0 ${u(8)}px ${COLOR.skyOnNight})` }} />
              <text x={u(16)} y={-u(10)} fill={COLOR.skyOnNight} fontSize={u(TYPE.tag)} fontWeight={900} fontFamily={FONT.display} {...halo}>
                NORTH BRIDGE
              </text>
              <text x={u(16)} y={u(8)} fill={COLOR.onNight} fontSize={u(TYPE.micro)} fontFamily={FONT.mono} {...halo}>
                Colonial militia holds the bridge
              </text>
            </g>
          )}

          {/* Towns */}
          <g opacity={townFade}>
            {[
              { x: bx, y: by, name: 'Boston', anchor: 'start' as const, dx: u(12), dy: u(5) },
              { x: lx, y: ly, name: 'Lexington', anchor: 'middle' as const, dx: 0, dy: u(30) },
              { x: cx, y: cy, name: 'Concord', anchor: 'end' as const, dx: -u(12), dy: u(5) },
            ].map(t => (
              <g key={t.name} transform={`translate(${t.x}, ${t.y})`}>
                <circle r={u(4.5)} fill={COLOR.onNight} opacity={0.85} />
                <text x={t.dx} y={t.dy} textAnchor={t.anchor} fill={alpha(COLOR.onNight, 0.9)} fontSize={u(TYPE.small)} fontFamily={FONT.ui} {...halo}>
                  {t.name}
                </text>
              </g>
            ))}
          </g>

          {/* Resolve: casualty counters + date */}
          {resolveFade > 0 && (
            <g opacity={resolveFade} transform={`translate(${width / 2}, ${height - u(150)})`}>
              <text textAnchor="middle" fill={COLOR.goldOnNight} fontSize={u(TYPE.h3)} fontWeight={900} fontFamily={FONT.display} {...halo}>
                April 19, 1775
              </text>
              <text y={u(34)} textAnchor="middle" fill={COLOR.redOnNight} fontSize={u(TYPE.body)} fontWeight={800} fontFamily={FONT.mono} {...halo}>
                British losses: ~{britishLosses}
              </text>
              <text y={u(62)} textAnchor="middle" fill={COLOR.skyOnNight} fontSize={u(TYPE.body)} fontWeight={800} fontFamily={FONT.mono} {...halo}>
                Colonial losses: ~{colonialLosses}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Atmospheric dark vignette */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 50%, ${alpha(COLOR.night, 0)} 45%, ${alpha(COLOR.night, 0.7)} 100%)`, pointerEvents: 'none', zIndex: 21 }} />

      {/* TOP HUD */}
      <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 40, pointerEvents: 'none' }}>
        <div style={{ backgroundColor: alpha(COLOR.night, 0.94), border: `1px solid ${alpha(COLOR.amber, 0.45)}`, borderLeft: `4px solid ${COLOR.amber}`, borderRadius: RADIUS.md, padding: '8px 16px' }}>
          <span style={{ fontFamily: FONT.display, fontSize: TYPE.nano, fontWeight: 900, color: COLOR.amber, letterSpacing: '0.12em' }}>
            APUSH UNIT 3 &middot; APRIL 19, 1775
          </span>
          <span style={{ color: alpha(COLOR.onNight, 0.3) }}> &middot; </span>
          <span style={{ fontSize: TYPE.tag, fontWeight: 800, color: COLOR.onNight }}>
            Lexington &amp; Concord (Tactical Map)
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, backgroundColor: alpha(COLOR.night, 0.94), border: `1px solid ${alpha(COLOR.onNight, 0.15)}`, borderRadius: RADIUS.md, padding: '8px 16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.5) }}>BRITISH</div>
            <div style={{ fontFamily: FONT.mono, fontSize: TYPE.town, fontWeight: 900, color: COLOR.redOnNight }}>700 regulars</div>
          </div>
          <div style={{ width: 1, height: 24, backgroundColor: alpha(COLOR.onNight, 0.15) }} />
          <div>
            <div style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.5) }}>COLONIAL</div>
            <div style={{ fontFamily: FONT.mono, fontSize: TYPE.town, fontWeight: 900, color: COLOR.skyOnNight }}>~3,800 militia</div>
          </div>
        </div>
      </div>

      {/* BOTTOM STRIP */}
      <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16, backgroundColor: alpha(COLOR.night, 0.94), borderRadius: RADIUS.md, border: `1px solid ${alpha(COLOR.onNight, 0.12)}`, borderLeft: `4px solid ${COLOR.amber}`, padding: '10px 18px', zIndex: 40 }}>
        <div style={{ fontSize: TYPE.micro, color: alpha(COLOR.onNight, 0.9), lineHeight: 1.35 }}>
          <strong>Gage&apos;s plan:</strong> 700 regulars march overnight to seize the colonial arsenal at Concord
          {' '}&#8594; minutemen mobilize &#8594; shots at Lexington Green &#8594; bridge fight at Concord
          {' '}&#8594; a 20-mile running retreat under fire back to Boston.
        </div>
      </div>
    </div>
  );
};
