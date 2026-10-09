import React from 'react';
import { geoPath } from 'd3-geo';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { NEIGHBORS, US_NATION, US_STATE_LINES, usProjection, type LonLat } from '../geo/usGeo';
import { FONT, COLOR, TYPE, RADIUS, alpha } from '../../theme/tokens';

export interface Phase { name: string; start: number; end: number }
export interface SaratogaMapProps { durationInFrames: number; phases: Phase[] }

/* Saratoga campaign geography (LonLat) */
const MONTREAL: LonLat = [-73.57, 45.5];
const TICONDEROGA: LonLat = [-73.45, 43.84];
const SARATOGA: LonLat = [-73.58, 43.08];
const ALBANY: LonLat = [-73.75, 42.65];
/** Burgoyne's 1777 advance: Montreal → Richelieu → Lake Champlain → Ticonderoga → Lake George → Saratoga */
const BRITISH_ROUTE: LonLat[] = [MONTREAL, [-73.5, 45.05], [-73.42, 44.8], [-73.4, 44.5], [-73.43, 44.15], TICONDEROGA, [-73.65, 43.62], [-73.62, 43.35], SARATOGA];
const CHAMPLAIN: LonLat[] = [[-73.38, 45.02], [-73.42, 44.8], [-73.4, 44.5], [-73.42, 44.15], [-73.45, 43.9]];
const HUDSON: LonLat[] = [[-73.42, 44.0], [-73.5, 43.65], [-73.58, 43.3], SARATOGA, [-73.66, 42.85], ALBANY, [-73.85, 42.3]];
/** Columns that never arrived (stall phase ghosts) */
const GHOSTS = [
  { name: 'ST. LEGER', sub: 'from the west · stopped at Oriskany', from: [-75.7, 43.05] as LonLat, to: [-74.45, 43.08] as LonLat },
  { name: 'HOWE', sub: 'expected from the south · sailed to Philadelphia', from: [-73.85, 42.25] as LonLat, to: [-73.78, 42.55] as LonLat },
];
/** American columns closing in (encircle phase) */
const THREATS = [
  { name: 'GATES', sub: 'from the south', from: [-73.72, 42.5] as LonLat },
  { name: 'ARNOLD', sub: 'from the southeast', from: [-73.15, 42.8] as LonLat },
  { name: 'MORGAN', sub: 'riflemen, from the east', from: [-72.98, 43.15] as LonLat },
  { name: 'STARK', sub: 'militia, from the northeast', from: [-72.95, 43.55] as LonLat },
];
const EXTENT: [LonLat, LonLat] = [[-76.4, 42.0], [-72.3, 46.15]];
const SITES = [
  { ll: MONTREAL, name: 'Montreal', sub: 'British base, Canada', dx: 12, dy: -10 },
  { ll: TICONDEROGA, name: 'Fort Ticonderoga', sub: 'captured July 6', dx: 12, dy: 4 },
  { ll: SARATOGA, name: 'Saratoga', sub: 'Burgoyne stalls here', dx: -12, dy: -12, anchor: 'end' as const },
  { ll: ALBANY, name: 'Albany', sub: 'British objective', dx: 12, dy: 4 },
];
const WATER_LABELS = [
  { ll: [-73.32, 44.55] as LonLat, name: 'LAKE CHAMPLAIN', angle: -78 },
  { ll: [-73.7, 42.78] as LonLat, name: 'HUDSON RIVER', angle: -72 },
];
const NARRATION: Record<string, string> = {
  setup: 'British plan: three columns converge on Albany to split the colonies in two.',
  advance: 'Burgoyne marches south — down Lake Champlain, past Ticonderoga, toward the Hudson.',
  stall: 'Bogged down at Saratoga. Supply lines stretched thin — and the supporting columns never come.',
  encircle: 'American forces close in from every side. The trap shuts.',
  surrender: 'Oct 17, 1777 — 5,895 British troops surrender. The turning point of the war.',
};
const BASE = { ocean: COLOR.night, neighbor: COLOR.nightPanel, land: alpha(COLOR.onNight, 0.12), state: alpha(COLOR.paperDeep, 0.28), coast: COLOR.onNightMuted };

export const SaratogaMap: React.FC<SaratogaMapProps> = ({ durationInFrames: propDuration, phases }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames: configDuration } = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  const u = (n: number) => n * (width / 1280);
  const total = Math.max(1, durationInFrames);

  const ph = (name: string) => phases.find((p) => p.name === name);
  const has = (name: string) => ph(name) !== undefined;
  /** 0→1 progress through a phase; null when the phase is absent so callers degrade gracefully. */
  const tOf = (name: string): number | null => {
    const p = ph(name);
    if (!p) return null;
    if (p.end <= p.start) return frame < p.start * total ? 0 : 1; // degenerate phase
    return interpolate(frame, [p.start * total, p.end * total], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  };

  const projection = React.useMemo(() => usProjection(width, height, EXTENT, width * 0.05), [width, height]);
  const path = React.useMemo(() => geoPath(projection), [projection]);
  const at = (ll: LonLat): [number, number] => projection(ll) ?? [0, 0];
  const dOf = (lls: LonLat[]) => lls.map((ll, i) => `${i ? 'L' : 'M'}${at(ll).map((v) => v.toFixed(1)).join(' ')}`).join(' ');
  const geo = React.useMemo(
    () => ({ neighbors: NEIGHBORS.features.map((f) => path(f) ?? ''), nation: path(US_NATION) ?? '', states: path(US_STATE_LINES) ?? '' }),
    [path],
  );
  /** Walk a screen-space polyline; returns position + heading at fraction t. */
  const ptOn = (pts: [number, number][], t: number) => {
    const tt = Math.min(1, Math.max(0, t));
    let len = 0;
    const segs = pts.slice(1).map((p, i) => { const d = Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]); len += d; return d; });
    let target = tt * len;
    for (let i = 0; i < segs.length; i++) {
      if (target <= segs[i] || i === segs.length - 1) {
        const k = segs[i] === 0 ? 0 : Math.min(1, Math.max(0, target / segs[i]));
        return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k,
          ang: (Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]) * 180) / Math.PI };
      }
      target -= segs[i];
    }
    const l = pts[pts.length - 1];
    return { x: l[0], y: l[1], ang: 0 };
  };

  /* Phase progress — every animation derives from phases + durationInFrames only. */
  const setupP = tOf('setup') ?? 1;
  const advanceP = tOf('advance') ?? (has('stall') || has('encircle') || has('surrender') ? 1 : 0); // absent advance + later phases → column already there
  const stallP = tOf('stall') ?? 0;
  const encircleP = tOf('encircle') ?? 0;
  const surrenderP = tOf('surrender') ?? 0;

  const routePts = BRITISH_ROUTE.map(at);
  const burg = ptOn(routePts, advanceP);
  const [mx, my] = at(MONTREAL);
  const [sx, sy] = at(SARATOGA);

  const zoom = interpolate(frame, [0, total], [1, 1.09], { extrapolateRight: 'clamp' });
  const frac = frame / total;
  const current = phases.find((p) => frac >= p.start && frac < p.end) ?? phases[phases.length - 1];
  const narration = (current && NARRATION[current.name]) || 'The Saratoga campaign, 1777.';
  const ghostO = Math.min( // ghost columns fade in, then out (they never came)
    interpolate(stallP, [0, 0.35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(stallP, [0.65, 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );
  const cutPulse = 0.55 + 0.45 * Math.sin(frame * 0.25);
  const cutMark = (k: number) => ({ x: mx + (burg.x - mx) * k, y: my + (burg.y - my) * k });
  const arrowT = (i: number) => interpolate(encircleP, [i * 0.14, Math.min(1, i * 0.14 + 0.55)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ringPulse = 1 + (surrenderP > 0 ? Math.sin(frame * 0.12) * 0.03 : 0);
  const halo = { stroke: alpha(COLOR.night, 0.92), strokeWidth: u(3.5), paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: COLOR.night, fontFamily: FONT.ui }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <g opacity={setupP}>
            <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={BASE.ocean} />
            {geo.neighbors.map((d, i) => (
              <path key={i} d={d} fill={BASE.neighbor} stroke={BASE.coast} strokeWidth={u(0.8)} vectorEffect="non-scaling-stroke" />
            ))}
            <path d={geo.nation} fill={BASE.land} stroke={BASE.coast} strokeWidth={u(1.2)} vectorEffect="non-scaling-stroke" />
            <path d={geo.states} fill="none" stroke={BASE.state} strokeWidth={u(1)} strokeDasharray={`${u(6)} ${u(4)}`} vectorEffect="non-scaling-stroke" />
            <path d={dOf(CHAMPLAIN)} fill="none" stroke={COLOR.skyOnNight} strokeWidth={u(9)} strokeLinecap="round" opacity={0.45} />
            <path d={dOf(HUDSON)} fill="none" stroke={COLOR.skyOnNight} strokeWidth={u(2.6)} strokeLinecap="round" opacity={0.8} />
            {SITES.map((s) => {
              const [x, y] = at(s.ll);
              const anchor = s.anchor ?? 'start';
              return (
                <g key={s.name} opacity={s.ll === SARATOGA && surrenderP > 0.5 ? 0 : 1}>
                  <circle cx={x} cy={y} r={u(5)} fill={COLOR.onNight} stroke={COLOR.night} strokeWidth={u(1.5)} />
                  <text x={x + u(s.dx)} y={y + u(s.dy)} textAnchor={anchor} fill={COLOR.onNight} fontSize={u(TYPE.town)} fontWeight={800} fontFamily={FONT.display} {...halo}>
                    {s.name}
                  </text>
                  <text x={x + u(s.dx)} y={y + u(s.dy) + u(14)} textAnchor={anchor} fill={COLOR.onNightMuted} fontSize={u(TYPE.micro)} fontFamily={FONT.mono} {...halo}>
                    {s.sub}
                  </text>
                </g>
              );
            })}
            {WATER_LABELS.map((w) => {
              const [x, y] = at(w.ll);
              return (
                <text key={w.name} x={x} y={y} transform={`rotate(${w.angle}, ${x}, ${y})`} textAnchor="middle" fill={COLOR.skyOnNight} fontSize={u(TYPE.tag)} fontStyle="italic" fontWeight={700} {...halo}>
                  {w.name}
                </text>
              );
            })}

            {/* British advance: red arrow drawing south along the route */}
            {advanceP > 0.005 && (
              <path d={dOf(BRITISH_ROUTE)} fill="none" stroke={COLOR.redOnNight} strokeWidth={u(4.5)} strokeLinecap="round"
                pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - advanceP}
                style={{ filter: `drop-shadow(0 0 ${u(6)}px ${COLOR.redOnNight})` }} />
            )}
            {/* Supply line back to Canada: stretches and thins as the advance goes on */}
            {advanceP > 0.02 && surrenderP < 1 && (
              <line x1={mx} y1={my} x2={burg.x} y2={burg.y} stroke={COLOR.redOnNight} strokeWidth={u(3 - 1.5 * advanceP)}
                strokeDasharray={`${u(7)} ${u(5)}`} opacity={0.85 - 0.35 * advanceP} />
            )}
            {/* British column head */}
            {advanceP > 0.02 && (
              <g transform={`translate(${burg.x}, ${burg.y})`}>
                <g transform={`rotate(${burg.ang})`}>
                  <path d={`M${u(16)},0 L${u(-2)},${u(-9)} L${u(-2)},${u(9)} Z`} fill={COLOR.redOnNight} style={{ filter: `drop-shadow(0 0 ${u(6)}px ${COLOR.redOnNight})` }} />
                </g>
                <circle r={u(8)} fill={COLOR.british} stroke={COLOR.onNight} strokeWidth={u(2.5)} />
                {advanceP < 1 && (
                  <text x={u(14)} y={-u(12)} fill={COLOR.redOnNight} fontSize={u(TYPE.label)} fontWeight={900} fontFamily={FONT.display} {...halo}>
                    BURGOYNE
                  </text>
                )}
              </g>
            )}
            {/* Stall: pulsing "supply line cut" marks */}
            {stallP > 0 && surrenderP < 1 && [0.35, 0.65].map((k) => {
              const c = cutMark(k);
              const r = u(8);
              return (
                <g key={k} transform={`translate(${c.x}, ${c.y})`} opacity={cutPulse} stroke={COLOR.amber} strokeWidth={u(3)} strokeLinecap="round">
                  <line x1={-r} y1={-r} x2={r} y2={r} />
                  <line x1={-r} y1={r} x2={r} y2={-r} />
                </g>
              );
            })}
            {/* Ghost columns that never arrived */}
            {ghostO > 0.01 && GHOSTS.map((g) => {
              const [fx, fy] = at(g.from);
              const [tx, ty] = at(g.to);
              const ang = (Math.atan2(ty - fy, tx - fx) * 180) / Math.PI;
              return (
                <g key={g.name} opacity={ghostO * 0.75}>
                  <path d={`M${fx},${fy} L${tx},${ty}`} fill="none" stroke={COLOR.onNightMuted} strokeWidth={u(3)} strokeDasharray={`${u(8)} ${u(6)}`} strokeLinecap="round" />
                  <g transform={`translate(${tx}, ${ty}) rotate(${ang})`}>
                    <path d={`M${u(12)},0 L${u(-2)},${u(-7)} L${u(-2)},${u(7)} Z`} fill={COLOR.onNightMuted} />
                  </g>
                  <text x={(fx + tx) / 2} y={(fy + ty) / 2 - u(14)} textAnchor="middle" fill={COLOR.onNightMuted} fontSize={u(TYPE.label)} fontWeight={900} fontFamily={FONT.display} {...halo}>
                    {g.name}
                  </text>
                  <text x={(fx + tx) / 2} y={(fy + ty) / 2 + u(2)} textAnchor="middle" fill={COLOR.onNightMuted} fontSize={u(TYPE.micro)} fontFamily={FONT.mono} {...halo}>
                    {g.sub}
                  </text>
                </g>
              );
            })}
            {/* Encircle: American columns converge from four directions */}
            {THREATS.map((t, i) => {
              const p = arrowT(i);
              if (p <= 0.01) return null;
              const [fx, fy] = at(t.from);
              const dx = sx - fx;
              const dy = sy - fy;
              const len = Math.hypot(dx, dy) || 1;
              const ex = sx - (dx / len) * u(118);
              const ey = sy - (dy / len) * u(88);
              const head = ptOn([[fx, fy], [ex, ey]], p);
              return (
                <g key={t.name}>
                  <path d={`M${fx},${fy} L${ex},${ey}`} fill="none" stroke={COLOR.skyOnNight} strokeWidth={u(3.5)} strokeLinecap="round"
                    pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p}
                    style={{ filter: `drop-shadow(0 0 ${u(5)}px ${COLOR.skyOnNight})` }} />
                  {p >= 0.95 ? (
                    <g transform={`translate(${ex}, ${ey})`}>
                      <circle r={u(8)} fill={COLOR.patriot} stroke={COLOR.onNight} strokeWidth={u(2.5)} />
                      <text x={u(13)} y={u(2)} fill={COLOR.skyOnNight} fontSize={u(TYPE.label)} fontWeight={900} fontFamily={FONT.display} {...halo}>
                        {t.name}
                      </text>
                      <text x={u(13)} y={u(18)} fill={COLOR.onNight} fontSize={u(TYPE.micro)} fontFamily={FONT.mono} {...halo}>
                        {t.sub}
                      </text>
                    </g>
                  ) : (
                    <g transform={`translate(${head.x}, ${head.y}) rotate(${head.ang})`}>
                      <path d={`M${u(14)},0 L${u(-2)},${u(-8)} L${u(-2)},${u(8)} Z`} fill={COLOR.skyOnNight} />
                    </g>
                  )}
                </g>
              );
            })}
            {/* Closing ring around the British position */}
            {encircleP > 0.02 && (
              <ellipse cx={sx} cy={sy} rx={u(105) * ringPulse} ry={u(80) * ringPulse} fill="none" stroke={COLOR.skyOnNight}
                strokeWidth={u(2.5)} strokeDasharray={`${u(10)} ${u(7)}`} pathLength={1} strokeDashoffset={1 - encircleP} opacity={0.9} />
            )}
            {/* Surrender: white flag at Saratoga */}
            {surrenderP > 0 && (
              <g transform={`translate(${sx + u(16)}, ${sy - u(8)})`} opacity={surrenderP}>
                <line x1={0} y1={0} x2={0} y2={-u(46)} stroke={COLOR.onNight} strokeWidth={u(3)} />
                <g transform={`rotate(${Math.sin(frame * 0.15) * 6})`}>
                  <rect x={u(3)} y={-u(46)} width={u(38)} height={u(24)} fill={COLOR.onNight} stroke={COLOR.night} strokeWidth={u(1.5)} />
                </g>
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 50%, ${alpha(COLOR.night, 0)} 45%, ${alpha(COLOR.night, 0.7)} 100%)` }} />

      {/* TOP HUD */}
      <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ backgroundColor: alpha(COLOR.night, 0.94), border: `1px solid ${alpha(COLOR.amber, 0.45)}`,
          borderLeft: `4px solid ${COLOR.amber}`, borderRadius: RADIUS.md, padding: '8px 16px' }}>
          <span style={{ fontFamily: FONT.display, fontSize: TYPE.nano, fontWeight: 900, color: COLOR.amber, letterSpacing: '0.12em' }}>
            APUSH UNIT 3 · 1777
          </span>
          <span style={{ color: alpha(COLOR.onNight, 0.3) }}> · </span>
          <span style={{ fontSize: TYPE.tag, fontWeight: 800, color: COLOR.onNight }}>Saratoga Campaign</span>
          {current && (
            <span style={{ marginLeft: 10, fontSize: TYPE.nano, fontFamily: FONT.mono, fontWeight: 800, color: COLOR.skyOnNight, textTransform: 'uppercase' }}>
              {current.name}
            </span>
          )}
        </div>
        <div style={{ backgroundColor: alpha(COLOR.night, 0.94), border: `1px solid ${alpha(COLOR.onNight, 0.15)}`, borderRadius: RADIUS.md, padding: '8px 16px', textAlign: 'right' }}>
          <div style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.5) }}>BURGOYNE&apos;S ARMY</div>
          <div style={{ fontFamily: FONT.mono, fontSize: TYPE.town, fontWeight: 900, color: COLOR.redOnNight }}>
            {Math.round(7200 * Math.min(1, advanceP)).toLocaleString()} men in the field
          </div>
        </div>
      </div>

      {/* Surrender banner */}
      {surrenderP > 0 && (
        <div style={{ position: 'absolute', top: 76, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', opacity: surrenderP }}>
          <div style={{ backgroundColor: alpha(COLOR.onNight, 0.95), border: `2px solid ${COLOR.onNight}`, borderRadius: RADIUS.md, padding: '10px 28px', textAlign: 'center' }}>
            <div style={{ fontFamily: FONT.display, fontSize: TYPE.h3, fontWeight: 900, color: COLOR.night }}>
              Oct 17, 1777 — 5,895 British surrender
            </div>
            <div style={{ fontSize: TYPE.small, fontWeight: 700, color: COLOR.night, marginTop: 2 }}>
              Turning point: France enters the war
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM BROADCAST STRIP */}
      <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16, backgroundColor: alpha(COLOR.night, 0.94),
        borderRadius: RADIUS.md, border: `1px solid ${alpha(COLOR.onNight, 0.12)}`, borderLeft: `4px solid ${COLOR.amber}`,
        padding: '10px 18px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: TYPE.micro, color: alpha(COLOR.onNight, 0.9), lineHeight: 1.4 }}>{narration}</div>
        <div style={{ minWidth: 150, textAlign: 'right', marginLeft: 16 }}>
          <span style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: COLOR.gold, fontWeight: 800 }}>UNIT 3 · 1777</span>
          <div style={{ fontSize: TYPE.nano, color: alpha(COLOR.onNight, 0.6) }}>Northern Campaign</div>
        </div>
      </div>
    </div>
  );
};
