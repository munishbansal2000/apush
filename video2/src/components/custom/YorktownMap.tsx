import React from 'react';
import { geoPath } from 'd3-geo';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { NEIGHBORS, US_NATION, US_STATE_LINES, riverPaths, usProjection, type LonLat } from '../geo/usGeo';
import { FONT, COLOR, TYPE, RADIUS, alpha } from '../../theme/tokens';

/**
 * Siege of Yorktown, 1781 (APUSH Unit 3, u3e5).
 *
 * Time-control contract: every animation derives from `phases` (0-1 fractions of the
 * composition) and `durationInFrames` — no hard-coded frame numbers. Expected phases:
 * setup (map + Cornwallis at Yorktown), trap (de Grasse seals the Chesapeake, Washington
 * marches south), siege (trench rings tighten), surrender. Missing phases degrade to 0-1.
 */
export interface Phase { name: string; start: number; end: number }
export interface YorktownMapProps {
  durationInFrames?: number;
  phases: Phase[];
}

const YORKTOWN: LonLat = [-76.51, 37.24];
const WILLIAMSBURG: LonLat = [-76.71, 37.27];
/** Camera fitted to the Virginia / Chesapeake theater. New York sits off-frame north. */
const EXTENT: [LonLat, LonLat] = [[-78.0, 36.0], [-74.9, 38.9]];
/** Washington + Rochambeau march south from the top edge toward Yorktown. */
const WASHINGTON_MARCH: LonLat[] = [[-76.48, 38.98], [-76.72, 38.35], [-76.7, 37.62], [-76.71, 37.27], [-76.64, 37.19]];
/** Hand-drawn York River (absent from the 10m rivers dataset). */
const YORK_RIVER: LonLat[] = [[-76.51, 37.24], [-76.72, 37.34], [-76.94, 37.5], [-77.2, 37.64]];
/** French blockade line across the Chesapeake mouth; ships sail in from offshore. */
const BLOCK_A: LonLat = [-76.16, 36.84];
const BLOCK_B: LonLat = [-75.84, 37.13];
const OFFSHORE: LonLat = [-75.22, 36.98];

const SIDE = { british: COLOR.redOnNight, american: COLOR.skyOnNight, french: COLOR.goldOnNight } as const;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Stylized 18th-century warship (hull, mast, sails). */
const ShipGlyph: React.FC<{ x: number; y: number; s: number; color: string; opacity: number }> = ({ x, y, s, color, opacity }) => (
  <g transform={`translate(${x}, ${y}) scale(${s})`} opacity={opacity}>
    <path d="M -11 -2 L 11 -2 L 7 5 L -7 5 Z" fill={color} />
    <line x1={0} y1={-2} x2={0} y2={-16} stroke={color} strokeWidth={1.6} />
    <path d="M 0 -16 L 0 0 L -8 0 Z" fill={alpha(color, 0.95)} />
    <path d="M 0 -16 L 0 0 L 8 0 Z" fill={alpha(color, 0.65)} />
  </g>
);

export const YorktownMap: React.FC<YorktownMapProps> = ({ durationInFrames: propDuration, phases }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames: configDuration } = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  /** Sizes are authored for a 1280-wide frame and scale with the composition width. */
  const u = width / 1280;
  const total = Math.max(1, durationInFrames);

  /** Phase progress 0-1 from fractions of the composition; unknown phases degrade to 0-1. */
  const phase = (name: string): Phase => phases.find(p => p.name === name) ?? { name, start: 0, end: 1 };
  const pt = (name: string, easing?: (t: number) => number) =>
    interpolate(frame, [phase(name).start * total, phase(name).end * total], [0, 1],
      easing
        ? { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing }
        : { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const setupT = pt('setup');
  const trapT = pt('trap', Easing.inOut(Easing.cubic));
  const siegeT = pt('siege', Easing.inOut(Easing.cubic));
  const surrenderT = pt('surrender', Easing.inOut(Easing.cubic));
  const marchT = clamp01(trapT * 1.55);

  const projection = React.useMemo(() => usProjection(width, height, EXTENT, width * 0.04), [width, height]);
  const geo = React.useMemo(() => {
    const path = geoPath(projection);
    return { neighbors: NEIGHBORS.features.map(f => path(f) ?? ''), nation: path(US_NATION) ?? '',
      states: path(US_STATE_LINES) ?? '', rivers: riverPaths(path, ['James', 'Potomac', 'Susquehanna', 'S. Branch Potomac'], 8) };
  }, [projection]);

  const at = (ll: LonLat): [number, number] => projection(ll) ?? [0, 0];
  const line = (lls: LonLat[]) => lls.map((ll, i) => `${i ? 'L' : 'M'} ${at(ll).map(v => v.toFixed(1)).join(' ')}`).join(' ');
  const halo = { stroke: alpha(COLOR.night, 0.92), strokeWidth: 3.5 * u, paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };

  const [ykX, ykY] = at(YORKTOWN);
  const [wmX, wmY] = at(WILLIAMSBURG);

  // Camera: gentle zoom-in all clip; during the siege it drifts to center on Yorktown.
  const zoom = interpolate(frame, [0, total], [1.0, 1.14], { extrapolateRight: 'clamp' });
  const panX = (width / 2 - ykX) * 0.35 * siegeT;
  const panY = (height / 2 - ykY) * 0.35 * siegeT;

  // March marker walks the screen-space polyline by arc length.
  const walk = (pts: [number, number][], t: number): [number, number] => {
    let totalLen = 0;
    const lens = pts.slice(1).map((p, i) => { const d = Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]); totalLen += d; return d; });
    let dist = t * totalLen;
    for (let i = 1; i < pts.length; i++) {
      if (dist <= lens[i - 1]) { const f = lens[i - 1] ? dist / lens[i - 1] : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; }
      dist -= lens[i - 1];
    }
    return pts[pts.length - 1];
  };
  const marchPts = React.useMemo(() => WASHINGTON_MARCH.map(at), [projection]); // eslint-disable-line react-hooks/exhaustive-deps
  const marchHead = walk(marchPts, marchT);
  const marchNose = walk(marchPts, Math.min(1, marchT + 0.015));
  const marchAngle = (Math.atan2(marchNose[1] - marchHead[1], marchNose[0] - marchHead[0]) * 180) / Math.PI + 90;

  // French fleet: staggered sail-in from offshore onto the blockade line, then bobbing at anchor.
  const SHIPS = 7;
  const fleetT = pt('trap', Easing.inOut(Easing.cubic));
  const ships = Array.from({ length: SHIPS }, (_, i) => {
    const sail = Easing.out(Easing.cubic)(clamp01(fleetT * 1.5 - i * 0.07));
    const [ax, ay] = at(BLOCK_A); const [bx, by] = at(BLOCK_B); const [ox, oy] = at(OFFSHORE);
    const lx = ax + ((bx - ax) * i) / (SHIPS - 1), ly = ay + ((by - ay) * i) / (SHIPS - 1);
    const oxj = ox + (i % 2 ? 22 : -22) * u, oyj = oy + (((i * 37) % 3 - 1) * 16) * u;
    return { x: oxj + (lx - oxj) * sail, y: oyj + (ly - oyj) * sail + (sail >= 1 ? Math.sin(frame * 0.12 + i * 1.7) * 3 * u : 0),
      s: (0.85 + sail * 0.45) * u, o: sail };
  });
  const [baX, baY] = at(BLOCK_A);
  const [bbX, bbY] = at(BLOCK_B);

  // Siege rings: 3 trench ellipses tightening around Yorktown, drawn progressively.
  const ringRx = [52, 84, 116].map(r => r * u);
  const ringRy = ringRx.map(r => r * 0.72);
  const ringT = [0, 1, 2].map(i => clamp01(siegeT * 3.4 - i * 0.8));
  const ringCirc = (rx: number, ry: number) => 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);

  // Artillery flashes along the middle ring; flicker while its ring is drawn.
  const flashes = Array.from({ length: 8 }, (_, i) => {
    const a = ((i / 8) * Math.PI * 2) + 0.35;
    return { x: ykX + ringRx[1] * Math.cos(a), y: ykY + ringRy[1] * Math.sin(a),
      on: ringT[1] > 0.55 && Math.sin(frame * 1.05 + i * 2.4) > 0.05, s: 3 + (i % 3) * 1.5 };
  });

  const britishR = 10 * u * (1 - 0.25 * siegeT);
  const trapClosed = trapT >= 0.97 && surrenderT < 0.4;
  const trapPulse = 42 * u + Math.sin(frame * 0.25) * 6 * u;

  const phaseNames: Phase['name'][] = ['setup', 'trap', 'siege', 'surrender'];
  const activePhase = [...phaseNames].reverse().find(n => pt(n) >= 0.999) ?? 'setup';
  const captions: Record<string, string> = {
    setup: 'September 1781 — Cornwallis occupies Yorktown on the York River',
    trap: 'de Grasse seals the Chesapeake — Washington marches south. The trap closes.',
    siege: 'Allied trenches tighten ring by ring — artillery pounds the British lines',
    surrender: 'October 19, 1781 — the last major battle of the Revolution',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: COLOR.night, fontFamily: FONT.ui }}>
      {/* MAP in one svg, moved by the camera */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
          transformOrigin: 'center center',
          zIndex: 20,
          opacity: clamp01(setupT * 4),
        }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={COLOR.nightOcean} />
          {geo.neighbors.map((d, i) => (
            <path key={i} d={d} fill={COLOR.nightPanel} stroke={COLOR.nightCoast} strokeWidth={0.8 * u} />
          ))}
          <path d={geo.nation} fill={COLOR.nightLand} stroke={COLOR.nightCoast} strokeWidth={1.2 * u} />
          <path d={geo.states} fill="none" stroke={alpha(COLOR.paperDeep, 0.28)} strokeWidth={u} strokeDasharray={`${6 * u} ${4 * u}`} />
          <g fill="none" stroke={alpha(COLOR.skyOnNight, 0.55)} strokeLinecap="round">
            {geo.rivers.map((r, i) => (
              <path key={i} d={r.d} strokeWidth={2 * u} />
            ))}
            <path d={line(YORK_RIVER)} strokeWidth={2 * u} />
          </g>

          {/* Water labels */}
          <text x={at([-76.32, 37.66])[0]} y={at([-76.32, 37.66])[1]} transform={`rotate(-18, ${at([-76.32, 37.66])[0]}, ${at([-76.32, 37.66])[1]})`} textAnchor="middle" fill={alpha(COLOR.onNight, 0.85)} fontSize={TYPE.tag * u} fontStyle="italic" fontWeight={700} {...halo}>
            Chesapeake Bay
          </text>
          <text x={at([-75.1, 37.42])[0]} y={at([-75.1, 37.42])[1]} textAnchor="middle" fill={alpha(COLOR.onNight, 0.6)} fontSize={TYPE.tag * u} fontStyle="italic" fontWeight={700} {...halo}>
            Atlantic Ocean
          </text>
          <text x={at([-77.5, 37.62])[0]} y={at([-77.5, 37.62])[1]} textAnchor="middle" fill={alpha(COLOR.onNight, 0.55)} fontSize={TYPE.place * u} fontFamily={FONT.display} fontWeight={900} letterSpacing={3 * u} {...halo}>
            VIRGINIA
          </text>
          <text x={at([-76.28, 38.6])[0]} y={at([-76.28, 38.6])[1]} textAnchor="middle" fill={alpha(COLOR.onNight, 0.4)} fontSize={TYPE.tag * u} fontFamily={FONT.display} fontWeight={700} letterSpacing={2 * u} {...halo}>
            MARYLAND
          </text>

          {/* Williamsburg */}
          <g opacity={clamp01(setupT * 5)}>
            <circle cx={wmX} cy={wmY} r={4.5 * u} fill={COLOR.onNightMuted} stroke={COLOR.onNight} strokeWidth={1.2 * u} />
            <text x={wmX + 9 * u} y={wmY + 1 * u} fill={COLOR.onNight} fontSize={TYPE.town * u} fontWeight={700} {...halo}>
              Williamsburg
            </text>
          </g>

          {/* TRAP: French fleet seals the Chesapeake mouth */}
          <g opacity={clamp01(trapT * 3)}>
            <line x1={baX} y1={baY} x2={bbX} y2={bbY} stroke={alpha(SIDE.french, 0.5)} strokeWidth={3 * u} strokeDasharray={`${8 * u} ${6 * u}`} />
            {ships.map((s, i) => <ShipGlyph key={i} x={s.x} y={s.y} s={s.s} color={SIDE.french} opacity={s.o} />)}
            {fleetT > 0.55 && (
              <text x={(baX + bbX) / 2 + 130 * u} y={(baY + bbY) / 2 + 44 * u} textAnchor="middle" fill={SIDE.french} fontSize={TYPE.label * u} fontWeight={900} fontFamily={FONT.display} {...halo}>
                de Grasse · 29 warships
              </text>
            )}
          </g>

          {/* TRAP: Washington & Rochambeau march south */}
          <g opacity={clamp01(trapT * 3)}>
            <path d={line(WASHINGTON_MARCH)} fill="none" stroke={SIDE.american} strokeWidth={4 * u} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - marchT} style={{ filter: `drop-shadow(0 0 ${5 * u}px ${SIDE.american})` }} />
            {marchT > 0.02 && (
              <g transform={`translate(${marchHead[0]}, ${marchHead[1]}) rotate(${marchAngle})`}>
                <path d="M 0 -9 L 6 6 L 0 3 L -6 6 Z" fill={SIDE.american} stroke={COLOR.onNight} strokeWidth={1.2} transform={`scale(${u})`} />
              </g>
            )}
            {marchT > 0.25 && (
              <text x={marchHead[0] + 14 * u} y={marchHead[1] - 8 * u} fill={SIDE.american} fontSize={TYPE.label * u} fontWeight={900} fontFamily={FONT.display} {...halo}>
                Washington &amp; Rochambeau
              </text>
            )}
          </g>

          {/* SIEGE: concentric trench rings tightening around Yorktown */}
          <g opacity={clamp01(siegeT * 3)}>
            {[2, 1, 0].map(i => (
              <ellipse
                key={i}
                cx={ykX}
                cy={ykY}
                rx={ringRx[i]}
                ry={ringRy[i]}
                fill="none"
                stroke={i === 0 ? COLOR.gold : alpha(COLOR.amber, 0.9)}
                strokeWidth={(i === 0 ? 3 : 2.2) * u}
                strokeDasharray={`${ringCirc(ringRx[i], ringRy[i])}`}
                strokeDashoffset={ringCirc(ringRx[i], ringRy[i]) * (1 - ringT[i])}
                style={{ filter: `drop-shadow(0 0 ${5 * u}px ${alpha(COLOR.amber, 0.7)})` }}
                transform={`rotate(-90 ${ykX} ${ykY})`}
              />
            ))}
            {flashes.map((f, i) =>
              f.on ? (
                <g key={i} transform={`translate(${f.x}, ${f.y})`}>
                  <circle r={f.s * 3.2 * u} fill={alpha(COLOR.goldOnNight, 0.35)} />
                  <circle r={f.s * u} fill={COLOR.goldOnNight} style={{ filter: `drop-shadow(0 0 ${6 * u}px ${COLOR.amber})` }} />
                </g>
              ) : null
            )}
          </g>

          {/* Trap-closed pulse while Cornwallis is sealed in */}
          {trapClosed && (
            <g>
              <circle cx={ykX} cy={ykY} r={trapPulse} fill="none" stroke={SIDE.british} strokeWidth={2.5 * u} strokeDasharray={`${10 * u} ${8 * u}`} opacity={0.9} />
              <text x={ykX} y={ykY - trapPulse - 12 * u} textAnchor="middle" fill={SIDE.british} fontSize={TYPE.tag * u} fontFamily={FONT.mono} fontWeight={900} letterSpacing={2 * u} {...halo}>
                TRAPPED
              </text>
            </g>
          )}

          {/* British position at Yorktown — flips to surrender flag */}
          <g opacity={1 - surrenderT}>
            <circle cx={ykX} cy={ykY} r={britishR} fill={SIDE.british} stroke={COLOR.onNight} strokeWidth={2.5 * u} style={{ filter: `drop-shadow(0 0 ${7 * u}px ${SIDE.british})` }} opacity={1 - siegeT * 0.35} />
            <text x={ykX} y={ykY - 18 * u} textAnchor="middle" fill={COLOR.onNight} fontSize={TYPE.place * u} fontFamily={FONT.display} fontWeight={900} {...halo}>
              YORKTOWN
            </text>
            <text x={ykX} y={ykY + ringRy[0] + 24 * u} textAnchor="middle" fill={SIDE.british} fontSize={TYPE.tag * u} fontFamily={FONT.mono} fontWeight={700} {...halo}>
              Cornwallis · ~7,000 British
            </text>
          </g>
          <g opacity={clamp01(surrenderT * 4)} transform={`translate(${ykX}, ${ykY})`}>
            <circle r={16 * u} fill={COLOR.onNight} opacity={0.95} />
            <line x1={0} y1={-22 * u} x2={0} y2={10 * u} stroke={COLOR.night} strokeWidth={2.5 * u} />
            <path d={`M 0 ${-22 * u} L ${20 * u} ${-17 * u} L 0 ${-12 * u} Z`} fill={COLOR.onNight} stroke={COLOR.night} strokeWidth={1.2 * u} />
          </g>
        </svg>
      </div>

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, ${alpha(COLOR.night, 0)} 45%, ${alpha(COLOR.night, 0.72)} 100%)`,
          pointerEvents: 'none',
          zIndex: 21,
        }}
      />

      {/* Surrender announcement */}
      <div style={{ position: 'absolute', top: height * 0.16, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 40, pointerEvents: 'none',
          opacity: clamp01(surrenderT * 3), transform: `translateY(${(1 - clamp01(surrenderT * 2.5)) * -30 * u}px)` }}>
        <div style={{ backgroundColor: alpha(COLOR.night, 0.92), border: `1px solid ${alpha(COLOR.goldOnNight, 0.6)}`, borderRadius: RADIUS.lg,
            padding: `${10 * u}px ${28 * u}px`, textAlign: 'center', boxShadow: `0 12px 32px ${alpha(COLOR.night, 0.7)}` }}>
          <div style={{ fontFamily: FONT.display, fontSize: TYPE.h1 * u, fontWeight: 900, color: COLOR.goldOnNight, letterSpacing: `${2 * u}px` }}>OCT 19, 1781</div>
          <div style={{ fontSize: TYPE.h3 * u, fontWeight: 800, color: COLOR.onNight, marginTop: 4 * u }}>~8,000 British surrender</div>
          <div style={{ fontSize: TYPE.label * u, fontStyle: 'italic', color: COLOR.onNightMuted, marginTop: 4 * u }}>The last major battle of the Revolution</div>
        </div>
      </div>

      {/* Top HUD */}
      <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 40, pointerEvents: 'none' }}>
        <div style={{ backgroundColor: alpha(COLOR.night, 0.94), border: `1px solid ${alpha(COLOR.amber, 0.45)}`, borderLeft: `4px solid ${COLOR.amber}`, borderRadius: RADIUS.md, padding: '8px 16px' }}>
          <span style={{ fontFamily: FONT.display, fontSize: TYPE.nano, fontWeight: 900, color: COLOR.amber, letterSpacing: '0.12em' }}>APUSH PERIOD 3 · 1781</span>
          <span style={{ color: alpha(COLOR.onNight, 0.3) }}> · </span>
          <span style={{ fontSize: TYPE.tag, fontWeight: 800, color: COLOR.onNight }}>Siege of Yorktown</span>
        </div>
        <div style={{ display: 'flex', gap: 8, backgroundColor: alpha(COLOR.night, 0.94), border: `1px solid ${alpha(COLOR.onNight, 0.15)}`, borderRadius: RADIUS.md, padding: '8px 12px' }}>
          {phaseNames.map(n => (
            <span key={n} style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                color: activePhase === n ? COLOR.goldOnNight : alpha(COLOR.onNight, 0.35),
                borderBottom: activePhase === n ? `2px solid ${COLOR.goldOnNight}` : '2px solid transparent', paddingBottom: 2 }}>
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom phase caption strip */}
      <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16, backgroundColor: alpha(COLOR.night, 0.94), borderRadius: RADIUS.md,
          border: `1px solid ${alpha(COLOR.onNight, 0.12)}`, borderLeft: `4px solid ${SIDE.french}`, padding: '10px 18px', zIndex: 40, pointerEvents: 'none' }}>
        <span style={{ fontSize: TYPE.small, color: alpha(COLOR.onNight, 0.92), lineHeight: 1.35 }}>{captions[activePhase]}</span>
      </div>
    </div>
  );
};
