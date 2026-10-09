import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';
import {FONT, COLOR, TYPE, RADIUS, alpha} from '../../theme/tokens';

/** Time-control contract: phases as 0-1 fractions of duration. No hardcoded frames. */
export interface Phase {name: string; start: number; end: number} // 0-1 fractions of duration
export interface ProclamationLineMapProps {
  durationInFrames: number;
  phases: Phase[];
}

const DEFAULT_PHASES: Phase[] = [
  {name: 'setup', start: 0, end: 0.15},
  {name: 'draw', start: 0.15, end: 0.45},
  {name: 'settlers', start: 0.45, end: 0.7},
  {name: 'tension', start: 0.7, end: 1.0},
];

/** Proclamation Line: along the Appalachian crest, north to south. */
const APPALACHIAN_CREST: [number, number][] = [
  [-74.5, 45.0], [-75.5, 43.5], [-77.0, 42.0], [-78.5, 40.5],
  [-79.8, 39.0], [-81.0, 37.5], [-82.5, 36.0], [-83.5, 34.5],
];

/** Simplified eastern seaboard + Gulf coast (lon/lat, north to south). */
const COASTLINE: [number, number][] = [
  [-67.0, 45.0], [-68.5, 44.5], [-70.0, 43.9], [-70.8, 43.2],
  [-71.3, 42.3], [-70.1, 41.8], [-71.0, 41.3], [-71.5, 41.2],
  [-72.4, 40.9], [-73.9, 40.6], [-73.5, 40.5], [-74.2, 39.5],
  [-75.0, 38.4], [-75.3, 37.8], [-76.0, 37.0], [-75.9, 36.2],
  [-75.7, 35.2], [-76.2, 34.6], [-78.5, 33.8], [-79.3, 33.0],
  [-80.2, 32.4], [-81.0, 31.5], [-81.3, 30.5], [-80.0, 29.0],
  [-80.3, 27.2], [-80.6, 25.9], [-81.6, 25.9], [-82.4, 27.0],
  [-82.8, 28.2], [-84.0, 30.0], [-85.0, 29.6], [-86.5, 30.3],
  [-88.0, 30.2], [-89.2, 29.5], [-90.5, 29.0], [-92.0, 29.5],
  [-93.8, 29.6],
];

/** Colonial cities (lon/lat) for grounding, with per-city label offsets. */
const CITIES: {name: string; lon: number; lat: number; dx: number; dy: number; anchor: 'start' | 'end'}[] = [
  {name: 'Boston', lon: -71.0, lat: 42.3, dx: 8, dy: 4, anchor: 'start'},
  {name: 'New York', lon: -74.0, lat: 40.7, dx: 8, dy: -8, anchor: 'start'},
  {name: 'Philadelphia', lon: -75.1, lat: 39.9, dx: 8, dy: 16, anchor: 'start'},
  {name: 'Charleston', lon: -79.9, lat: 32.8, dx: 8, dy: 4, anchor: 'start'},
];

/** Settler dots: already west of the line, in the Indian Reserve (lon/lat). */
const SETTLERS: [number, number][] = [
  [-88.0, 34.0], [-90.0, 37.0], [-86.5, 38.5], [-92.0, 40.0],
  [-87.0, 41.0], [-89.0, 43.0], [-94.0, 36.5],
];

/** Map extent (lon/lat) and equirectangular projection with cos correction. */
const LON_MIN = -98, LON_MAX = -66, LAT_MIN = 26, LAT_MAX = 48;
const MEAN_LAT = (LAT_MIN + LAT_MAX) / 2;
const COS_LAT = Math.cos((MEAN_LAT * Math.PI) / 180);

const catmullRom = (pts: [number, number][]): string => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i];
    const p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

/** Halo text: ink on a soft paper outline, legible over the map. */
const Halo: React.FC<{x: number; y: number; size: number; color: string; opacity: number;
  anchor?: 'start' | 'middle' | 'end'; weight?: number | string; children: React.ReactNode}> =
  ({x, y, size, color, opacity, anchor = 'middle', weight = 'normal', children}) => (
    <text x={x} y={y} textAnchor={anchor} fontFamily={FONT.text} fontSize={size}
      fill={color} fontWeight={weight} opacity={opacity}
      stroke={COLOR.paper} strokeWidth={size * 0.22} paintOrder="stroke" strokeLinejoin="round">
      {children}
    </text>
  );

export const ProclamationLineMap: React.FC<ProclamationLineMapProps> = ({
  durationInFrames: propDuration,
  phases = DEFAULT_PHASES,
}) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames: configDuration} = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  const total = Math.max(1, durationInFrames);
  const u = (n: number) => n * (width / 1280);

  /** Find a named phase, falling back to the built-in default if the caller omitted it. */
  const findPhase = (name: string): Phase =>
    phases.find(p => p.name === name) ?? DEFAULT_PHASES.find(p => p.name === name)!;
  /** Local 0-1 progress inside a named phase. */
  const phaseP = (name: string): number => {
    const p = findPhase(name);
    return interpolate(frame, [p.start * total, p.end * total], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic),
    });
  };

  const setupT = phaseP('setup');
  const drawT = phaseP('draw');
  const settlerT = phaseP('settlers');
  const tensionT = phaseP('tension');

  // Fit the extent into the frame, preserving aspect; leave room for title and caption.
  const pad = u(50), topMargin = u(150), bottomMargin = u(120);
  const spanX = (LON_MAX - LON_MIN) * COS_LAT, spanY = LAT_MAX - LAT_MIN;
  const s = Math.min((width - pad * 2) / spanX, (height - topMargin - bottomMargin) / spanY);
  const ox = (width - spanX * s) / 2;
  const oy = topMargin + (height - topMargin - bottomMargin - spanY * s) / 2;
  const X = (lon: number) => ox + (lon - LON_MIN) * COS_LAT * s;
  const Y = (lat: number) => oy + (LAT_MAX - lat) * s;

  const landPts = COASTLINE.map(([lo, la]) => [X(lo), Y(la)] as [number, number]);
  const landD = catmullRom(landPts)
    + ` L ${X(LON_MIN)} ${Y(LAT_MIN)} L ${X(LON_MIN)} ${Y(LAT_MAX)} L ${X(LON_MAX)} ${Y(LAT_MAX)} Z`;

  const linePts = APPALACHIAN_CREST.map(([lo, la]) => [X(lo), Y(la)] as [number, number]);
  const lineD = catmullRom(linePts);

  // Indian Reserve: everything west of the line within the map extent.
  // Closes diagonally off the top edge so the line reads as continuing north.
  const reserveD = catmullRom(linePts)
    + ` L ${X(LON_MIN)} ${Y(34.5)} L ${X(LON_MIN)} ${Y(LAT_MAX)} Z`;

  const wipeOffset = interpolate(drawT, [0, 1], [100, 0]);
  const dashOpacity = interpolate(drawT, [0.55, 0.95], [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const wipeOut = interpolate(drawT, [0.9, 1], [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const reserveBase = interpolate(drawT, [0.4, 1], [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Pulsing forbidden tint during tension (frame-derived frequency; not a hardcoded frame).
  const pulse = tensionT * (0.32 + 0.22 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI * 2)));

  const mapOpacity = interpolate(setupT, [0, 0.6], [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const titleOpacity = interpolate(setupT, [0.3, 1], [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const labelT = (name: string) => interpolate(phaseP(name), [0.5, 1], [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div style={{width, height, backgroundColor: COLOR.paper, position: 'relative', overflow: 'hidden'}}>
      <svg width={width} height={height} style={{position: 'absolute'}}>
        {/* Ocean wash */}
        <rect width={width} height={height} fill={alpha(COLOR.ocean, 0.35)} />
        {/* Land */}
        <g opacity={mapOpacity}>
          <path d={landD} fill={COLOR.paperDeep} stroke={COLOR.coast} strokeWidth={u(2.5)} strokeLinejoin="round" />
        </g>

        {/* Indian Reserve: green wash once the line exists, pulsing red forbidden tint in tension */}
        <g opacity={mapOpacity}>
          <path d={reserveD} fill={alpha(COLOR.green, 0.2)} opacity={reserveBase * (1 - tensionT)} />
          <path d={reserveD} fill={COLOR.red} opacity={pulse} />
        </g>

        {/* The Proclamation Line: wipe-draws down the Appalachians, settles as a dashed line */}
        <path d={lineD} fill="none" stroke={COLOR.red} strokeWidth={u(4.5)}
          pathLength={100} strokeDasharray="100" strokeDashoffset={wipeOffset}
          strokeLinecap="round" opacity={mapOpacity * wipeOut} />
        <path d={lineD} fill="none" stroke={COLOR.red} strokeWidth={u(4)}
          pathLength={100} strokeDasharray="5 4" strokeLinecap="round"
          opacity={mapOpacity * dashOpacity} />

        {/* Settler dots: already there, west of the line */}
        {SETTLERS.map(([lo, la], i) => {
          const local = interpolate(settlerT, [i * 0.1, i * 0.1 + 0.3], [0, 1],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <circle key={i} cx={X(lo)} cy={Y(la)} r={u(6) * (0.6 + 0.4 * local)}
              fill={COLOR.british} stroke={COLOR.paper} strokeWidth={u(1.5)}
              opacity={mapOpacity * local} />
          );
        })}

        {/* Cities */}
        {CITIES.map(c => (
          <g key={c.name} opacity={mapOpacity}>
            <circle cx={X(c.lon)} cy={Y(c.lat)} r={u(3.5)} fill={COLOR.ink} />
            <text x={X(c.lon) + u(c.dx)} y={Y(c.lat) + u(c.dy)} textAnchor={c.anchor}
              fontFamily={FONT.ui} fontSize={u(TYPE.town)} fill={COLOR.inkSoft}>{c.name}</text>
          </g>
        ))}

        {/* Map furniture: north arrow */}
        <g opacity={mapOpacity * 0.8} transform={`translate(${width - u(70)}, ${u(70)})`}>
          <polygon points={`0,${-u(14)} ${u(7)},${u(8)} 0,${u(3)} ${-u(7)},${u(8)}`}
            fill={COLOR.ink} />
          <text y={u(26)} textAnchor="middle" fontFamily={FONT.ui}
            fontSize={u(TYPE.town)} fill={COLOR.inkSoft}>N</text>
        </g>

        {/* Labels */}
        <g opacity={mapOpacity}>
          <Halo x={X(-77.8)} y={Y(37.3)} size={u(TYPE.flow)} color={COLOR.inkSoft}
            opacity={labelT('draw')}>The Thirteen Colonies</Halo>
          <Halo x={X(-93.5)} y={Y(44.5)} size={u(TYPE.flow)} color={COLOR.inkSoft}
            opacity={labelT('settlers')}>Indian Reserve</Halo>
        </g>
        <Halo x={X(-82.6) + u(10)} y={Y(35.3)} size={u(TYPE.place)} color={COLOR.red}
          anchor="start" weight="bold" opacity={labelT('tension')}>
          Proclamation Line, 1763
        </Halo>
        <Halo x={X(-89)} y={Y(40)} size={u(TYPE.h3)} color={COLOR.red} weight="bold"
          opacity={labelT('tension')}>No settlement west of here</Halo>
      </svg>

      {/* Document frame */}
      <div style={{position: 'absolute', inset: u(14), border: `${u(2)} solid ${COLOR.ink}`,
        borderRadius: RADIUS.md, pointerEvents: 'none', opacity: mapOpacity}} />
      <div style={{position: 'absolute', inset: u(22), border: `${u(1)} solid ${COLOR.inkSoft}`,
        borderRadius: RADIUS.sm, pointerEvents: 'none', opacity: mapOpacity}} />

      {/* Title */}
      <div style={{position: 'absolute', top: u(40), left: u(52), opacity: titleOpacity}}>
        <div style={{fontFamily: FONT.display, fontSize: u(TYPE.h2), color: COLOR.ink}}>
          The Proclamation of 1763
        </div>
        <div style={{fontFamily: FONT.text, fontSize: u(TYPE.body), color: COLOR.inkSoft, marginTop: u(6)}}>
          After the Seven Years&rsquo; War, Britain drew a line down the Appalachians
        </div>
      </div>

      {/* Colonist anger: the teaching caption */}
      <div style={{
        position: 'absolute', left: u(52), right: u(52), bottom: u(48),
        display: 'flex', justifyContent: 'center', opacity: tensionT, pointerEvents: 'none',
      }}>
        <div style={{
          backgroundColor: COLOR.paper, border: `${u(2)} solid ${COLOR.red}`,
          borderRadius: RADIUS.md, padding: `${u(12)} ${u(28)}`,
          boxShadow: '0 6px 18px rgba(20,12,4,0.28)', textAlign: 'center',
        }}>
          <div style={{fontFamily: FONT.hand, fontSize: u(TYPE.h3), color: COLOR.red}}>
            &ldquo;We fought for that land!&rdquo;
          </div>
          <div style={{fontFamily: FONT.ui, fontSize: u(TYPE.small), color: COLOR.inkSoft, marginTop: u(4)}}>
            Colonial reaction — settlers and veterans felt robbed of their prize
          </div>
        </div>
      </div>
    </div>
  );
};
