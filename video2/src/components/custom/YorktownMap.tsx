import React from 'react';
import {geoPath} from 'd3-geo';
import {Easing, interpolate} from 'remotion';
import {NEIGHBORS, US_NATION, US_STATE_LINES, riverPaths, usProjection, type LonLat} from '../geo/usGeo';
import {FONT, TYPE, alpha} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, paperHalo, usePhases, type CustomProps, type Phase} from './kit';

/**
 * Siege of Yorktown, 1781 (APUSH Unit 3, u3e5 L76 / L124): the trap closes on Cornwallis.
 *
 * Parchment Chesapeake map. Cornwallis is dug in at Yorktown; de Grasse's French fleet sails in and seals the bay
 * mouth while Washington and Rochambeau's allied army comes down the bay and up the James; then the allied siege
 * lines tighten ring by ring around Yorktown with artillery flashes, the camera drifting in. Labels only (places,
 * commanders); dates come from the documentary's year stamps.
 *
 * DEFAULT_PHASES: setup (map + Cornwallis at Yorktown) / trap (fleet seals the bay, allied army arrives) /
 * siege (siege lines tighten).
 */
export const DEFAULT_PHASES: Phase[] = [
  {name: 'setup', start: 0, end: 0.15},
  {name: 'trap', start: 0.15, end: 0.6},
  {name: 'siege', start: 0.6, end: 1},
];

export type YorktownMapProps = CustomProps;

const YORKTOWN: LonLat = [-76.51, 37.24];
const WILLIAMSBURG: LonLat = [-76.71, 37.27];
/** Camera fitted to the Virginia / Chesapeake theater. New York sits off-frame north. */
const EXTENT: [LonLat, LonLat] = [[-78.0, 36.0], [-74.9, 38.9]];
/**
 * Allied army's approach. Basis: after marching from New York to the head of the Chesapeake, most of the allied army
 * was carried down the bay by water (Head of Elk / Annapolis) to the James River and landed near Williamsburg in late
 * September 1781 (standard accounts; review note). Drawn as a water route from the top edge, then a short march.
 */
const ALLIED_ROUTE: LonLat[] = [
  [-76.45, 39.0], [-76.38, 38.55], [-76.22, 38.0], [-76.12, 37.5], [-76.1, 37.12],
  [-76.3, 36.98], [-76.47, 36.99], [-76.62, 37.12], [-76.74, 37.2], [-76.71, 37.27], [-76.6, 37.24],
];
/** Hand-drawn York River (absent from the 10m rivers dataset). */
const YORK_RIVER: LonLat[] = [[-76.51, 37.24], [-76.72, 37.34], [-76.94, 37.5], [-77.2, 37.64]];
/** French blockade line across the Chesapeake mouth (Cape Henry - Cape Charles); ships sail in from offshore. */
const BLOCK_A: LonLat = [-76.16, 36.84];
const BLOCK_B: LonLat = [-75.84, 37.13];
const OFFSHORE: LonLat = [-75.22, 36.98];

const SIDE = {british: PAPER.british, american: PAPER.patriot, french: PAPER.gold} as const;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Stylized 18th-century warship (hull, mast, sails), authored at unit size; `s` carries the scale. */
const ShipGlyph: React.FC<{x: number; y: number; s: number; color: string; opacity: number}> = ({x, y, s, color, opacity}) => (
  <g transform={`translate(${x}, ${y}) scale(${s})`} opacity={opacity}>
    <path d="M -11 -2 L 11 -2 L 7 5 L -7 5 Z" fill={color} stroke={PAPER.ink} strokeWidth={0.8} />
    <line x1={0} y1={-2} x2={0} y2={-16} stroke={PAPER.ink} strokeWidth={1.4} />
    <path d="M 0 -16 L 0 0 L -8 0 Z" fill={alpha(color, 0.95)} />
    <path d="M 0 -16 L 0 0 L 8 0 Z" fill={alpha(color, 0.65)} />
  </g>
);

/** Walk a screen-space polyline by arc length. */
const walk = (pts: [number, number][], t: number): [number, number] => {
  let totalLen = 0;
  const lens = pts.slice(1).map((p, i) => {
    const d = Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]);
    totalLen += d;
    return d;
  });
  let dist = t * totalLen;
  for (let i = 1; i < pts.length; i++) {
    if (dist <= lens[i - 1]) {
      const f = lens[i - 1] ? dist / lens[i - 1] : 0;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
    }
    dist -= lens[i - 1];
  }
  return pts[pts.length - 1];
};

export const YorktownMap: React.FC<YorktownMapProps> = ({durationInFrames, phases}) => {
  const clock = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const {frame, u} = clock;
  const width = u(1280);
  const height = u(720);
  const ease = Easing.inOut(Easing.cubic);

  const setupT = clock.t('setup');
  const trapT = ease(clock.t('trap'));
  const siegeT = ease(clock.t('siege'));
  // Fleet first (seals the bay), then the army comes down behind it.
  const fleetT = clamp01(trapT * 1.6);
  const marchT = clamp01(trapT * 1.5 - 0.5);

  const projection = React.useMemo(() => usProjection(width, height, EXTENT, width * 0.04), [width, height]);
  const geo = React.useMemo(() => {
    const path = geoPath(projection);
    return {
      neighbors: NEIGHBORS.features.map(f => path(f) ?? ''),
      nation: path(US_NATION) ?? '',
      states: path(US_STATE_LINES) ?? '',
      rivers: riverPaths(path, ['James', 'Potomac', 'Susquehanna', 'S. Branch Potomac'], 8),
    };
  }, [projection]);

  const at = (ll: LonLat): [number, number] => projection(ll) ?? [0, 0];
  const line = (lls: LonLat[]) => lls.map((ll, i) => `${i ? 'L' : 'M'} ${at(ll).map(v => v.toFixed(1)).join(' ')}`).join(' ');
  const halo = paperHalo(u);

  const [ykX, ykY] = at(YORKTOWN);
  const [wmX, wmY] = at(WILLIAMSBURG);

  // Camera: gentle zoom-in across the shot; during the siege it drifts to center on Yorktown.
  const zoom = interpolate(frame, [0, Math.max(1, clock.durationInFrames)], [1.0, 1.14], CLAMP);
  const panX = (width / 2 - ykX) * 0.35 * siegeT;
  const panY = (height / 2 - ykY) * 0.35 * siegeT;

  const marchPts = ALLIED_ROUTE.map(at);
  const marchHead = walk(marchPts, marchT);
  const marchNose = walk(marchPts, Math.min(1, marchT + 0.015));
  const marchAngle = (Math.atan2(marchNose[1] - marchHead[1], marchNose[0] - marchHead[0]) * 180) / Math.PI + 90;

  // French fleet: staggered sail-in from offshore onto the blockade line, then riding at anchor.
  const SHIPS = 7;
  const [ax, ay] = at(BLOCK_A);
  const [bx, by] = at(BLOCK_B);
  const [ox, oy] = at(OFFSHORE);
  const ships = Array.from({length: SHIPS}, (_, i) => {
    const sail = Easing.out(Easing.cubic)(clamp01(fleetT * 1.5 - i * 0.07));
    const lx = ax + ((bx - ax) * i) / (SHIPS - 1);
    const ly = ay + ((by - ay) * i) / (SHIPS - 1);
    const oxj = ox + u(i % 2 ? 22 : -22);
    const oyj = oy + u((((i * 37) % 3) - 1) * 16);
    const bob = sail >= 1 ? Math.sin(frame * 0.12 + i * 1.7) * u(3) : 0;
    return {x: oxj + (lx - oxj) * sail, y: oyj + (ly - oyj) * sail + bob, s: (0.85 + sail * 0.45) * u(1), o: sail};
  });

  // Siege lines: 3 ellipses tightening around Yorktown, drawn progressively (outer first).
  const ringRx = [52, 84, 116].map(r => u(r));
  const ringRy = ringRx.map(r => r * 0.72);
  const ringT = [0, 1, 2].map(i => clamp01(siegeT * 3.4 - (2 - i) * 0.8));
  const ringCirc = (rx: number, ry: number) => 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);

  // Artillery flashes along the middle ring while it is drawn.
  const flashes = Array.from({length: 8}, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.35;
    return {
      x: ykX + ringRx[1] * Math.cos(a),
      y: ykY + ringRy[1] * Math.sin(a),
      on: ringT[1] > 0.55 && Math.sin(frame * 1.05 + i * 2.4) > 0.05,
      s: 3 + (i % 3) * 1.5,
    };
  });

  const britishR = u(10) * (1 - 0.25 * siegeT);
  const waterLabel = (ll: LonLat, text: string, rot = 0) => {
    const [x, y] = at(ll);
    return (
      <text x={x} y={y} transform={rot ? `rotate(${rot}, ${x}, ${y})` : undefined} textAnchor="middle" fill={PAPER.inkSoft}
        fontSize={u(TYPE.label)} fontFamily={FONT.display} fontStyle="italic" letterSpacing={u(2)} {...halo}>
        {text}
      </text>
    );
  };

  return (
    <PaperSheet fontFamily={FONT.display}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`, transformOrigin: 'center center', opacity: clamp01(setupT * 4)}}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
          <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={PAPER.water} />
          {geo.neighbors.map((d, i) => (
            <path key={i} d={d} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(0.8)} />
          ))}
          <path d={geo.nation} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(1.2)} />
          <path d={geo.states} fill="none" stroke={PAPER.rule} strokeWidth={u(1)} strokeDasharray={`${u(6)} ${u(4)}`} />
          <g fill="none" stroke={PAPER.waterDeep} strokeLinecap="round">
            {geo.rivers.map((r, i) => (
              <path key={i} d={r.d} strokeWidth={u(2)} />
            ))}
            <path d={line(YORK_RIVER)} strokeWidth={u(2)} />
          </g>

          {waterLabel([-76.32, 37.66], 'CHESAPEAKE BAY', -18)}
          {waterLabel([-75.1, 37.42], 'ATLANTIC OCEAN')}
          {(() => {
            const [x, y] = at([-77.5, 37.62]);
            return (
              <text x={x} y={y} textAnchor="middle" fill={PAPER.ink} opacity={0.75} fontSize={u(TYPE.place)} fontWeight={700} letterSpacing={u(5)} {...halo}>
                VIRGINIA
              </text>
            );
          })()}

          {/* Williamsburg */}
          <g opacity={clamp01(setupT * 5)}>
            <circle cx={wmX} cy={wmY} r={u(4.5)} fill={PAPER.ink} stroke={PAPER.halo} strokeWidth={u(1.5)} />
            <text x={wmX - u(9)} y={wmY - u(8)} textAnchor="end" fill={PAPER.ink} fontSize={u(TYPE.town)} fontWeight={700} {...halo}>
              WILLIAMSBURG
            </text>
          </g>

          {/* TRAP: French fleet seals the Chesapeake mouth */}
          <g opacity={clamp01(fleetT * 3)}>
            <line x1={ax} y1={ay} x2={bx} y2={by} stroke={alpha(SIDE.french, 0.7)} strokeWidth={u(3)} strokeDasharray={`${u(8)} ${u(6)}`} />
            {ships.map((s, i) => <ShipGlyph key={i} x={s.x} y={s.y} s={s.s} color={SIDE.french} opacity={s.o} />)}
            {fleetT > 0.55 && (
              <text x={(ax + bx) / 2 + u(110)} y={(ay + by) / 2 + u(44)} textAnchor="middle" fill={PAPER.ink} fontSize={u(TYPE.label)} fontWeight={700} {...halo}>
                DE GRASSE
              </text>
            )}
          </g>

          {/* TRAP: Washington & Rochambeau come down the bay and up the James */}
          <g opacity={clamp01(marchT * 6)}>
            <path d={line(ALLIED_ROUTE)} fill="none" stroke={SIDE.american} strokeWidth={u(4)} strokeLinecap="round" strokeLinejoin="round"
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - marchT} />
            {marchT > 0.02 && (
              <g transform={`translate(${marchHead[0]}, ${marchHead[1]}) rotate(${marchAngle}) scale(${u(1)})`}>
                <path d="M 0 -9 L 6 6 L 0 3 L -6 6 Z" fill={SIDE.american} stroke={PAPER.halo} strokeWidth={1.2} />
              </g>
            )}
            {marchT > 0.1 && (
              <text x={at([-76.45, 38.3])[0] + u(16)} y={at([-76.45, 38.3])[1]} fill={SIDE.american} fontSize={u(TYPE.label)} fontWeight={700} {...halo}>
                WASHINGTON &amp; ROCHAMBEAU
              </text>
            )}
          </g>

          {/* SIEGE: allied siege lines tightening around Yorktown */}
          <g opacity={clamp01(siegeT * 3)}>
            {[2, 1, 0].map(i => (
              <ellipse key={i} cx={ykX} cy={ykY} rx={ringRx[i]} ry={ringRy[i]} fill="none" stroke={SIDE.american}
                strokeWidth={u(i === 0 ? 3 : 2.2)} opacity={i === 0 ? 1 : 0.7}
                strokeDasharray={`${ringCirc(ringRx[i], ringRy[i])}`} strokeDashoffset={ringCirc(ringRx[i], ringRy[i]) * (1 - ringT[i])}
                transform={`rotate(-90 ${ykX} ${ykY})`} />
            ))}
            {flashes.map((f, i) =>
              f.on ? (
                <g key={i} transform={`translate(${f.x}, ${f.y})`}>
                  <circle r={u(f.s * 3.2)} fill={alpha(PAPER.gold, 0.35)} />
                  <circle r={u(f.s)} fill={PAPER.gold} stroke={PAPER.ink} strokeWidth={u(0.6)} />
                </g>
              ) : null,
            )}
          </g>

          {/* British position at Yorktown */}
          <circle cx={ykX} cy={ykY} r={britishR} fill={SIDE.british} stroke={PAPER.halo} strokeWidth={u(2.5)} />
          <text x={ykX} y={ykY - u(18)} textAnchor="middle" fill={PAPER.ink} fontSize={u(TYPE.place)} fontWeight={700} letterSpacing={u(2)} {...halo}>
            YORKTOWN
          </text>
          <text x={ykX + u(4)} y={ykY + ringRy[0] + u(26)} textAnchor="middle" fill={SIDE.british} fontSize={u(TYPE.label)} fontWeight={700} {...halo}>
            CORNWALLIS
          </text>
        </svg>
      </div>
    </PaperSheet>
  );
};
