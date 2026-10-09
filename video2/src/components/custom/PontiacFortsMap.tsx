import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';
import {FONT, COLOR, TYPE, RADIUS, alpha} from '../../theme/tokens';

/** Time-control contract: phases as 0-1 fractions of duration. No hardcoded frame numbers. */
export interface Phase {name: string; start: number; end: number}
export interface PontiacFortsMapProps {
  durationInFrames?: number;
  phases: Phase[];
}

const DEFAULT_PHASES: Phase[] = [
  {name: 'setup', start: 0, end: 0.15},
  {name: 'uprising', start: 0.15, end: 0.5},
  {name: 'siege', start: 0.5, end: 0.75},
  {name: 'resolve', start: 0.75, end: 1.0},
];

type LonLat = [number, number];

interface Fort {
  name: string;
  ll: LonLat;
  holds: boolean;
  /** label placement */
  side: -1 | 1;
  ly: number;
}

/** British forts of the pays d'en haut, 1763. Detroit & Pitt hold; the other eight fall. */
const FORTS: Fort[] = [
  {name: 'Fort Detroit', ll: [-83.05, 42.33], holds: true, side: -1, ly: -6},
  {name: 'Fort Pitt', ll: [-79.99, 40.44], holds: true, side: -1, ly: 6},
  {name: 'Fort Niagara', ll: [-79.06, 43.26], holds: false, side: 1, ly: -6},
  {name: 'Fort Michilimackinac', ll: [-84.61, 45.85], holds: false, side: 1, ly: -8},
  {name: 'Fort Sandusky', ll: [-82.9, 41.45], holds: false, side: 1, ly: 8},
  {name: 'Fort St. Joseph', ll: [-86.25, 41.83], holds: false, side: -1, ly: -6},
  {name: 'Fort Miami', ll: [-85.13, 41.08], holds: false, side: 1, ly: 8},
  {name: 'Fort Ouiatenon', ll: [-86.93, 40.13], holds: false, side: -1, ly: 8},
  {name: 'Fort Venango', ll: [-79.67, 41.77], holds: false, side: 1, ly: -8},
  {name: 'Fort Le Boeuf', ll: [-80.15, 41.93], holds: false, side: -1, ly: -8},
];

/** Stylized Great Lakes shorelines (lon/lat rings, deliberately simplified). */
const LAKES: LonLat[][] = [
  // Superior
  [[-92.1, 46.7], [-90.5, 46.9], [-88.8, 47.2], [-87.5, 47.6], [-86.8, 48.0], [-85.8, 47.9], [-84.8, 47.4], [-84.6, 46.8], [-85.4, 46.5], [-86.8, 46.4], [-88.4, 46.3], [-90.2, 46.3], [-91.5, 46.4]],
  // Michigan
  [[-88.0, 45.8], [-87.4, 46.0], [-86.9, 45.9], [-86.4, 45.2], [-86.0, 44.5], [-85.9, 43.8], [-86.2, 43.2], [-86.9, 42.8], [-87.5, 42.6], [-87.8, 43.2], [-87.9, 44.0], [-88.0, 44.8]],
  // Huron
  [[-84.7, 46.0], [-83.8, 46.2], [-82.8, 45.8], [-82.3, 45.2], [-82.0, 44.5], [-82.4, 43.8], [-83.0, 43.2], [-83.8, 43.0], [-84.3, 43.8], [-84.6, 44.5]],
  // Erie
  [[-83.5, 42.2], [-82.8, 42.3], [-82.0, 42.0], [-81.2, 41.9], [-80.3, 41.9], [-79.8, 42.2], [-79.5, 42.9], [-80.0, 42.9], [-81.0, 42.8], [-82.0, 42.7], [-83.0, 42.6]],
  // Ontario
  [[-79.8, 43.3], [-79.0, 43.3], [-78.3, 43.4], [-77.8, 43.6], [-77.4, 43.7], [-77.8, 44.0], [-78.8, 44.0], [-79.5, 43.9]],
];

/** Map extent: the Great Lakes and Ohio country. */
const MIN_LON = -94, MAX_LON = -75.5, MIN_LAT = 39.5, MAX_LAT = 49;

const CAPTIONS: Record<string, {chip: string; text: string}> = {
  setup: {chip: 'MAY 1763', text: 'A chain of British forts holds the Great Lakes and the Ohio country — the prize of the French and Indian War.'},
  uprising: {chip: 'THE UPRISING', text: "Pontiac's alliance strikes fort by fort — coordinated attacks sweep the pays d'en haut."},
  siege: {chip: 'THE SIEGES', text: 'Detroit and Fort Pitt endure months of siege. Both hold — the alliance\u2019s momentum breaks.'},
  resolve: {chip: 'AFTERMATH', text: 'Eight forts fall; two hold. Britain answers Native resistance with the Proclamation of 1763 — a line drawn across the Appalachians.'},
};

export const PontiacFortsMap: React.FC<PontiacFortsMapProps> = ({durationInFrames: propDuration, phases}) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames: configDuration} = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  const u = (n: number) => n * (width / 1280);

  // Degrade gracefully if phases are missing or malformed.
  const ps = phases && phases.length > 0 ? phases : DEFAULT_PHASES;
  const D = Math.max(1, durationInFrames);
  const tGlobal = frame / D;

  /** 0→1 progress of a named phase, clamped. */
  const phaseT = (name: string) => {
    const p = ps.find(q => q.name === name) ?? {start: 0, end: 1};
    return interpolate(frame, [p.start * D, p.end * D], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    });
  };
  const setupT = phaseT('setup');
  const upT = phaseT('uprising');
  const siegeT = Math.max(phaseT('siege'), phaseT('resolve'));
  const resolveT = phaseT('resolve');

  // Equirectangular projection fitted to the Great Lakes extent (latitude-corrected).
  const K = Math.cos((((MIN_LAT + MAX_LAT) / 2) * Math.PI) / 180);
  const s = Math.min(width / ((MAX_LON - MIN_LON) * K), height / (MAX_LAT - MIN_LAT));
  const ox = (width - (MAX_LON - MIN_LON) * K * s) / 2;
  const oy = (height - (MAX_LAT - MIN_LAT) * s) / 2;
  const at = ([lon, lat]: LonLat): [number, number] => [ox + (lon - MIN_LON) * K * s, oy + (MAX_LAT - lat) * s];
  const ring = (lls: LonLat[]) => lls.map((ll, i) => `${i ? 'L' : 'M'} ${at(ll).map(v => v.toFixed(1)).join(' ')}`).join(' ') + ' Z';

  // Slow cinematic drift across the whole clip.
  const zoom = 1 + 0.05 * tGlobal;
  const panX = interpolate(tGlobal, [0, 1], [u(30), -u(30)]);

  // "Detroit & Pitt hold out" annotation anchor (midpoint between the two, lifted up).
  const [detX, detY] = at(FORTS[0].ll);
  const [pitX, pitY] = at(FORTS[1].ll);
  const annX = (detX + pitX) / 2;
  const annY = (detY + pitY) / 2 - u(52);

  const halo = {
    stroke: alpha(COLOR.night, 0.92),
    strokeWidth: u(3.5),
    paintOrder: 'stroke' as const,
    strokeLinejoin: 'round' as const,
  };

  /** Shared HUD panel chrome. */
  const hudPanel: React.CSSProperties = {
    backgroundColor: alpha(COLOR.night, 0.94),
    backdropFilter: 'blur(16px)',
    border: `1px solid ${alpha(COLOR.onNight, 0.15)}`,
    borderRadius: RADIUS.md,
    padding: '8px 16px',
    boxShadow: `0 10px 25px ${alpha(COLOR.night, 0.6)}`,
  };

  // Fort-by-fort fall windows within the uprising phase.
  const fallers = FORTS.filter(f => !f.holds);
  const fallLocal = (i: number) =>
    interpolate(upT, [0.06 * i, 0.06 * i + 0.22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fallenCount = fallers.filter((_, i) => fallLocal(i) >= 0.98).length;

  // Bottom-strip caption: latest phase whose window has started.
  const activePhase = [...ps].reverse().find(p => frame >= p.start * D) ?? ps[0];
  const caption = CAPTIONS[activePhase?.name ?? 'setup'] ?? CAPTIONS.setup;

  // Graticule every 3 degrees.
  const seg = (a: LonLat, b: LonLat) => `M ${at(a).map(v => v.toFixed(1)).join(' ')} L ${at(b).map(v => v.toFixed(1)).join(' ')}`;
  const grid: string[] = [];
  for (let lon = -93; lon <= -78; lon += 3) grid.push(seg([lon, MIN_LAT], [lon, MAX_LAT]));
  for (let lat = 42; lat <= 48; lat += 3) grid.push(seg([MIN_LON, lat], [MAX_LON, lat]));

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: COLOR.night,
        fontFamily: FONT.ui,
      }}
    >
      {/* MAP LAYER */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${zoom}) translate(${panX}px, 0px)`,
          transformOrigin: 'center center',
          zIndex: 20,
        }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
          <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={COLOR.nightOcean} />
          <rect x={0} y={0} width={width} height={height} fill={COLOR.nightLand} />
          {/* graticule */}
          <g stroke={alpha(COLOR.onNight, 0.07)} strokeWidth={u(1)} vectorEffect="non-scaling-stroke">
            {grid.map((d, i) => (
              <path key={i} d={d} fill="none" />
            ))}
          </g>
          {/* Great Lakes */}
          {LAKES.map((lake, i) => (
            <path
              key={i}
              d={ring(lake)}
              fill={alpha(COLOR.nightOcean, 0.92)}
              stroke={alpha(COLOR.nightCoast, 0.7)}
              strokeWidth={u(1.4)}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* lake labels */}
          {(
            [
              ['Lake Superior', [-88.5, 47.1]],
              ['Lake Michigan', [-87.0, 44.3]],
              ['Lake Huron', [-82.9, 44.6]],
              ['Lake Erie', [-81.3, 42.4]],
              ['L. Ontario', [-78.6, 43.6]],
            ] as [string, LonLat][]
          ).map(([name, ll]) => {
            const [x, y] = at(ll);
            return (
              <text key={name} x={x} y={y} textAnchor="middle" fill={alpha(COLOR.skyOnNight, 0.55)} fontSize={u(TYPE.tag)} fontStyle="italic" fontWeight={700} {...halo}>
                {name}
              </text>
            );
          })}

          {/* FORTS */}
          {FORTS.map((fort, fi) => {
            const [x, y] = at(fort.ll);
            const fallIdx = fallers.indexOf(fort);
            const local = fort.holds ? -1 : fallLocal(fallIdx);
            const ignite = local > 0 && local < 0.5 ? 1 - local / 0.5 : 0;
            const fallen = local >= 0.98;
            const dart = local > 0.02 && local < 0.6
              ? interpolate(local, [0.02, 0.4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
              : 0;
            return (
              <g key={fort.name} opacity={setupT}>
                {/* ignition glow: coordinated attack strikes */}
                {ignite > 0 && (
                  <g>
                    <circle cx={x} cy={y} r={u(6 + 26 * (1 - ignite))} fill="none" stroke={COLOR.amber} strokeWidth={u(3)} opacity={0.85 * ignite} />
                    <circle cx={x} cy={y} r={u(5)} fill={alpha(COLOR.amber, 0.9 * ignite)} style={{filter: `drop-shadow(0 0 ${u(8)}px ${COLOR.amber})`}} />
                  </g>
                )}
                {/* attack vector dart */}
                {dart > 0 && (
                  <line x1={x - u(34)} y1={y - u(26)} x2={x} y2={y} stroke={COLOR.amber} strokeWidth={u(3)} strokeLinecap="round"
                    pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - dart} opacity={0.9} />
                )}
                {/* fort marker: square = British post; dims to grey as it falls */}
                <rect x={x - u(6)} y={y - u(6)} width={u(12)} height={u(12)} fill={fallen ? COLOR.grey : COLOR.british}
                  stroke={fallen ? alpha(COLOR.onNight, 0.4) : COLOR.onNight} strokeWidth={u(1.5)}
                  style={fallen ? undefined : {filter: `drop-shadow(0 0 ${u(4)}px ${alpha(COLOR.red, 0.7)})`}} />
                {/* strike-through when fallen */}
                {fallen && (
                  <line x1={x - u(10)} y1={y - u(10)} x2={x + u(10)} y2={y + u(10)} stroke={COLOR.amber} strokeWidth={u(2.5)} strokeLinecap="round" />
                )}
                {/* siege rings: Detroit & Pitt hold out — pulse but never fall */}
                {fort.holds && siegeT > 0 && (
                  <g opacity={siegeT}>
                    {[0, 1].map(k => (
                      <circle key={k} cx={x} cy={y} r={u(15 + 7 * Math.sin(frame * 0.12 + k * Math.PI + fi))}
                        fill="none" stroke={COLOR.goldOnNight} strokeWidth={u(2)} strokeDasharray={`${u(7)} ${u(5)}`} />
                    ))}
                  </g>
                )}
                <text x={x + u(11) * fort.side} y={y + u(fort.ly)} textAnchor={fort.side === 1 ? 'start' : 'end'}
                  fill={fallen ? alpha(COLOR.onNight, 0.45) : COLOR.onNight} fontSize={u(TYPE.town)} fontFamily={FONT.display}
                  fontWeight={800} textDecoration={fallen ? 'line-through' : 'none'} {...halo}>
                  {fort.name}
                </text>
              </g>
            );
          })}

          {/* "Detroit & Pitt hold out" annotation with leader lines */}
          {siegeT > 0 && (
            <g opacity={siegeT}>
              <line x1={annX} y1={annY + u(12)} x2={detX} y2={detY - u(10)} stroke={alpha(COLOR.goldOnNight, 0.7)} strokeWidth={u(1.5)} />
              <line x1={annX} y1={annY + u(12)} x2={pitX} y2={pitY - u(10)} stroke={alpha(COLOR.goldOnNight, 0.7)} strokeWidth={u(1.5)} />
              <rect x={annX - u(120)} y={annY - u(18)} width={u(240)} height={u(34)} rx={u(6)} fill={alpha(COLOR.night, 0.88)} stroke={alpha(COLOR.goldOnNight, 0.6)} strokeWidth={u(1.5)} />
              <text x={annX} y={annY + u(6)} textAnchor="middle" fill={COLOR.goldOnNight} fontSize={u(TYPE.label)} fontFamily={FONT.display} fontWeight={900} letterSpacing={u(1)}>
                DETROIT & PITT HOLD OUT
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 45%, ${alpha(COLOR.night, 0)} 50%, ${alpha(COLOR.night, 0.75)} 100%)`,
          pointerEvents: 'none',
          zIndex: 21,
        }}
      />

      {/* TOP HUD */}
      <div style={{position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 40, pointerEvents: 'none'}}>
        <div style={{...hudPanel, border: `1px solid ${alpha(COLOR.amber, 0.45)}`, borderLeft: `4px solid ${COLOR.amber}`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{fontFamily: FONT.display, fontSize: TYPE.nano, fontWeight: 900, color: COLOR.amber, letterSpacing: '0.12em'}}>
              APUSH PERIOD 3 · 1763
            </span>
            <span style={{color: alpha(COLOR.onNight, 0.3)}}>·</span>
            <span style={{fontSize: TYPE.tag, fontWeight: 800, color: COLOR.onNight}}>Pontiac&apos;s Rebellion</span>
          </div>
        </div>
        {/* tally: forts fallen vs holding */}
        <div style={{...hudPanel, display: 'flex', gap: 14}}>
          <div style={{textAlign: 'right'}}>
            <div style={{fontSize: TYPE.nano, fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.5)}}>FORTS FALLEN</div>
            <div style={{fontFamily: FONT.mono, fontSize: TYPE.town, fontWeight: 900, color: COLOR.amber}}>
              {fallenCount} <span style={{fontSize: TYPE.nano, color: COLOR.onNightMuted}}>/ 8</span>
            </div>
          </div>
          <div style={{width: 1, height: 24, backgroundColor: alpha(COLOR.onNight, 0.15)}} />
          <div>
            <div style={{fontSize: TYPE.nano, fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.5)}}>HOLDING</div>
            <div style={{fontFamily: FONT.mono, fontSize: TYPE.town, fontWeight: 900, color: COLOR.mintOnNight}}>2</div>
          </div>
        </div>
      </div>

      {/* RESOLVE title card */}
      {resolveT > 0 && (
        <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -58%) scale(${interpolate(resolveT, [0, 1], [0.92, 1])})`,
            backgroundColor: alpha(COLOR.night, 0.92), border: `1px solid ${alpha(COLOR.gold, 0.55)}`,
            borderRadius: RADIUS.lg, padding: `${u(22)}px ${u(40)}px`, textAlign: 'center', zIndex: 45,
            opacity: resolveT, boxShadow: `0 18px 50px ${alpha(COLOR.night, 0.7)}`, pointerEvents: 'none',
          }}
        >
          <div style={{fontFamily: FONT.display, fontSize: u(TYPE.h2), fontWeight: 900, color: COLOR.onNight, letterSpacing: '0.04em'}}>
            PONTIAC&apos;S REBELLION, 1763
          </div>
          <div style={{marginTop: u(10), fontFamily: FONT.mono, fontSize: u(TYPE.label), fontWeight: 800, color: COLOR.amber, letterSpacing: '0.14em'}}>
            8 FORTS FALL · 2 HOLD
          </div>
          <div style={{marginTop: u(10), fontSize: u(TYPE.small), color: alpha(COLOR.onNight, 0.75), fontStyle: 'italic', maxWidth: u(560)}}>
            Native resistance to British occupation — answered by the Proclamation Line of 1763.
          </div>
        </div>
      )}

      {/* BOTTOM phase caption strip */}
      <div style={{
          position: 'absolute', bottom: 12, left: 16, right: 16, backgroundColor: alpha(COLOR.night, 0.94),
          backdropFilter: 'blur(16px)', borderRadius: RADIUS.md, border: `1px solid ${alpha(COLOR.onNight, 0.12)}`,
          borderLeft: `4px solid ${COLOR.amber}`, padding: '10px 18px', display: 'flex', alignItems: 'center',
          gap: 16, zIndex: 40, pointerEvents: 'none',
        }}
      >
        <span style={{
            fontFamily: FONT.mono, fontSize: TYPE.nano, fontWeight: 900, color: COLOR.night,
            backgroundColor: COLOR.amber, borderRadius: RADIUS.pill, padding: '4px 12px',
            letterSpacing: '0.1em', whiteSpace: 'nowrap',
          }}
        >
          {caption.chip}
        </span>
        <div style={{fontSize: TYPE.micro, color: alpha(COLOR.onNight, 0.92), lineHeight: 1.4}}>{caption.text}</div>
      </div>
    </div>
  );
};
