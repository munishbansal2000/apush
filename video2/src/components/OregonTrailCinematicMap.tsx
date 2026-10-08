import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, staticFile } from 'remotion';
import { riverPaths, useUsBase, type LonLat } from './geo/usGeo';
import {
  OREGON_TRAIL_RIVER_LABELS,
  OREGON_TRAIL_RIVERS,
  OREGON_TRAIL_TOTAL_MILES,
  ROCKIES_LABEL,
  oregonTrailLayout,
  oregonTrailProjection,
} from './geo/historicSites';
import { COLOR, FONT, RADIUS, TYPE, alpha } from '../theme/tokens';

/** URLs, data URIs and already-resolved paths pass through; bare names go through staticFile. */
const resolveSrc = (src: string) =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

export interface OregonTrailCinematicMapProps {
  mapAsset: string;
}

interface TrailStation {
  name: string;
  mile: number;
  elevation: number; // in feet
  month: string;
  ll: LonLat; // real [lon, lat]
  /** Label offset from the pin (px at 1280 wide) and text anchor. */
  label: { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' };
  note: string;
  incident?: {
    type: 'danger' | 'landmark' | 'milestone' | 'treaty';
    title: string;
    description: string;
  };
}

const stations: TrailStation[] = [
  {
    name: 'Independence, MO',
    mile: 0,
    elevation: 850,
    month: 'May 1',
    ll: [-94.42, 39.09],
    label: { dx: 12, dy: 22, anchor: 'start' },
    note: 'The Jumping-Off Point · 1,500 lbs supplies per wagon',
    incident: {
      type: 'milestone',
      title: 'SPRING WAGON TRAIN DEPARTURE',
      description: 'Pioneers gather on the Missouri frontier. Each family provisions 200 lbs flour, 150 lbs bacon, and teams of 4–6 oxen.',
    },
  },
  {
    name: 'Fort Kearny',
    mile: 319,
    elevation: 2150,
    month: 'May 28',
    ll: [-98.98, 40.64],
    label: { dx: 0, dy: 30, anchor: 'middle' },
    note: 'Platte River Valley · Guarding against cholera outbreaks',
    incident: {
      type: 'danger',
      title: '⚠️ CHOLERA OUTBREAK ON THE PLATTE',
      description: 'Contaminated river water causes lethal waterborne cholera. 1 in 10 emigrants perished; trail littered with unmarked graves.',
    },
  },
  {
    name: 'Chimney Rock',
    mile: 552,
    elevation: 4100,
    month: 'June 18',
    ll: [-103.35, 41.7],
    label: { dx: 10, dy: 26, anchor: 'start' },
    note: '325-ft sandstone spire marking entrance to the Rockies',
    incident: {
      type: 'landmark',
      title: '🗿 325-FT SANDSTONE SPIRE',
      description: 'Visible 30 miles across the prairie; confirmed pioneers had reached the Great Plains transition into rugged foothill territory.',
    },
  },
  {
    name: 'Fort Laramie',
    mile: 640,
    elevation: 4270,
    month: 'June 26',
    ll: [-104.56, 42.21],
    label: { dx: -12, dy: 26, anchor: 'end' },
    note: 'Crucial rest and wagon repair post in Wyoming',
    incident: {
      type: 'milestone',
      title: '🛠️ WAGON REPAIRS & TRADING POST',
      description: 'Pioneers reshoe oxen, purchase fresh salt pork at extortionate prices, and discard heavy parlor furniture into the desert.',
    },
  },
  {
    name: 'South Pass',
    mile: 914,
    elevation: 7412,
    month: 'July 16',
    ll: [-108.88, 42.37],
    label: { dx: 0, dy: -34, anchor: 'middle' },
    note: 'Continental Divide: Atlantic to Pacific watershed crossover',
    incident: {
      type: 'milestone',
      title: '⛰️ CONTINENTAL DIVIDE (7,412 FT)',
      description: 'Broad 20-mile gap in the Rocky Mountains. Reaching here by July 20 was critical to clear the Cascade snows before October.',
    },
  },
  {
    name: 'Fort Hall',
    mile: 1288,
    elevation: 4460,
    month: 'Aug 10',
    ll: [-112.43, 43.02],
    label: { dx: 12, dy: -24, anchor: 'start' },
    note: 'Snake River volcanic desert · California Trail branches off',
    incident: {
      type: 'treaty',
      title: '🔀 THE FORK IN THE TRAIL',
      description: 'California Gold Rush prospectors splinter south toward the Sierra Nevada; agrarian families press west along the Snake River.',
    },
  },
  {
    name: 'The Dalles',
    mile: 1930,
    elevation: 100,
    month: 'Sept 22',
    ll: [-121.18, 45.6],
    label: { dx: 4, dy: -30, anchor: 'middle' },
    note: 'Columbia River rapids or the treacherous Barlow Toll Road',
    incident: {
      type: 'danger',
      title: '🌊 COLUMBIA RAPIDS OR BARLOW ROAD',
      description: 'Float wagons on log rafts down lethal Columbia River cascades, or pay $5 to drag wagons over Mount Hood\'s southern shoulder.',
    },
  },
  {
    name: 'Oregon City',
    mile: 2170,
    elevation: 60,
    month: 'Oct 12',
    ll: [-122.61, 45.36],
    label: { dx: -12, dy: 26, anchor: 'end' },
    note: 'Willamette Valley Eden: 640 acres under Donation Land Act',
    incident: {
      type: 'milestone',
      title: '🌾 WILLAMETTE VALLEY: MISSION COMPLETE',
      description: '2,170 miles survived. Settlers claim 640 free fertile acres, anchoring American sovereignty and forcing the 1846 Oregon Treaty.',
    },
  },
];

export const OregonTrailCinematicMap: React.FC<OregonTrailCinematicMapProps> = ({
  mapAsset,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const isPortrait = height > width;
  // Map sizes are authored for a 1280-wide frame and scale with the composition width.
  const u = (n: number) => n * (width / 1280);

  // One projection for base map, rivers, trail, stations and wagon: they line up by construction.
  const projection = React.useMemo(() => oregonTrailProjection(width, height), [width, height]);
  const { base, path } = useUsBase(projection, 'dark');
  const trail = React.useMemo(() => oregonTrailLayout(projection), [projection]);
  const rivers = React.useMemo(() => riverPaths(path, OREGON_TRAIL_RIVERS), [path]);
  const minorSites = trail.sites.filter(s => !stations.some(st => st.mile === s.mile));
  const proj = (ll: LonLat): [number, number] => projection(ll) ?? [0, 0];

  // Trail progress from frame 10 to 160 (smooth eased progress)
  const progress = interpolate(frame, [10, 160], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Camera pan & zoom tracking the wagon East to West
  // Camera zoom spans the whole clip (was hard-coded to 180 frames).
  const cameraZoom = interpolate(frame, [0, Math.max(1, durationInFrames)], [1.03, 1.14], { extrapolateRight: 'clamp' });
  // Wagon starts east (right/low) and ends west (left/high): pan the map so it stays near centre.
  const cameraPanX = interpolate(progress, [0, 1], [-35, 45]) * (width / 1280);
  const cameraPanY = interpolate(progress, [0, 1], [-10, 10]) * (width / 1280);

  // Current miles and elevation
  const currentMiles = Math.round(interpolate(progress, [0, 1], [0, 2170]));

  // Elevation calculation based on current progress
  const currentElevation = Math.round(
    progress < 0.42
      ? interpolate(progress, [0, 0.42], [850, 7412]) // climbing to South Pass
      : progress < 0.6
      ? interpolate(progress, [0.42, 0.6], [7412, 4460]) // Snake river plateau
      : interpolate(progress, [0.6, 1], [4460, 60]) // Columbia River gorge descent
  );

  // Trail = projected polyline through real waypoints (Platte → North Platte → Sweetwater →
  // South Pass → Snake → Columbia). The wagon sits at the pixel length for the current mileage,
  // and the draw-on uses the same length (pathLength={1}, dash in [0, 1]) so line and wagon agree.
  const trailLen = trail.lenAtMile(progress * OREGON_TRAIL_TOTAL_MILES);
  const strokeOffset = 1 - trailLen / trail.line.total;
  const { x: wagonX, y: wagonY } = trail.line.at(trailLen);

  // Determine active station & incident
  const activeStationIndex = stations.findIndex((s, i) => {
    const nextS = stations[i + 1];
    if (!nextS) return true;
    return currentMiles >= s.mile && currentMiles < nextS.mile;
  });
  const currentStation = stations[activeStationIndex] || stations[0];

  // Animated wheel rotation
  const wheelAngle = frame * 18;
  const halo = { stroke: alpha(COLOR.night, 0.9), strokeWidth: u(3.5), paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: COLOR.night }}>
      {/* 1. MAP: vector base + rivers + trail + stations + wagon in ONE svg, moved together by the camera */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${cameraZoom}) translate(${cameraPanX}px, ${cameraPanY}px)`,
          transformOrigin: 'center center',
          zIndex: 20,
        }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          {base}
          {/* Optional raster (decorative only; overlays align to the vector geography) */}
          {mapAsset !== '' && (
            <image href={resolveSrc(mapAsset)} x={0} y={0} width={width} height={height} preserveAspectRatio="xMidYMid slice" opacity={0.12} style={{ mixBlendMode: 'screen' }} />
          )}

          {/* Rivers the trail follows */}
          <g fill="none" stroke={alpha(COLOR.skyOnNight, 0.75)} strokeWidth={u(1.6)} strokeLinecap="round" strokeLinejoin="round">
            {rivers.map((r, i) => <path key={i} d={r.d} />)}
          </g>
          {OREGON_TRAIL_RIVER_LABELS.map(r => {
            const [x, y] = proj(r.ll);
            return (
              <text key={r.name} x={x} y={y} transform={`rotate(${r.angle}, ${x}, ${y})`} textAnchor="middle" fill={COLOR.onNight}
                fontSize={u(TYPE.tag)} fontStyle="italic" fontWeight={700} {...halo}>
                {r.name}
              </text>
            );
          })}
          {(() => {
            const [x, y] = proj(ROCKIES_LABEL);
            return (
              <text x={x} y={y} textAnchor="middle" fill={alpha(COLOR.gold, 0.95)} fontSize={u(TYPE.small)} fontWeight={800} fontFamily={FONT.display} letterSpacing="0.06em" {...halo}>
                ▲ ROCKY MOUNTAINS (CONTINENTAL DIVIDE)
              </text>
            );
          })()}

          {/* Trail Shadow Route */}
          <path d={trail.line.d} fill="none" stroke={alpha(COLOR.night, 0.85)} strokeWidth={u(7)} strokeLinecap="round" strokeLinejoin="round" />

          {/* Golden Glowing Trail Line */}
          <path
            d={trail.line.d}
            fill="none"
            stroke={COLOR.amber}
            strokeWidth={u(4)}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={strokeOffset}
            style={{ filter: `drop-shadow(0 0 ${u(6)}px ${COLOR.amber})` }}
          />

          {/* Wagon Wheel Ruts (dotted white track) */}
          <path
            d={trail.line.d}
            fill="none"
            stroke={COLOR.onNight}
            strokeWidth={u(1.4)}
            strokeDasharray={`${u(5)} ${u(7)}`}
            strokeDashoffset={-frame * u(1.5)}
            strokeLinecap="round"
            opacity={0.8}
          />

          {/* Secondary landmarks on the route */}
          {minorSites.map(s => {
            const isPassed = currentMiles >= s.mile;
            const left = s.name === 'Fort Bridger';
            return (
              <g key={s.name} transform={`translate(${s.x}, ${s.y})`} opacity={isPassed ? 1 : 0.6}>
                <rect x={-u(4)} y={-u(4)} width={u(8)} height={u(8)} transform="rotate(45)" fill={isPassed ? COLOR.gold : alpha(COLOR.night, 0.9)} stroke={COLOR.onNight} strokeWidth={u(1)} />
                <text x={left ? -u(9) : u(9)} y={s.name === 'Fort Bridger' ? u(18) : -u(8)} textAnchor={left ? 'end' : 'start'} fill={COLOR.onNight} fontSize={u(TYPE.tag)}
                  fontFamily={FONT.display} fontWeight={700} {...halo}>
                  {s.name}
                </text>
              </g>
            );
          })}

          {/* Trail Stations Pins */}
          {stations.map((s, idx) => {
            const stationThreshold = s.mile / 2170;
            const isPassed = progress >= stationThreshold;
            const isJustReached = Math.abs(progress - stationThreshold) < 0.05;
            const [sx, sy] = proj(s.ll);
            const lx = u(s.label.dx), ly = u(s.label.dy);

            return (
              <g key={idx} transform={`translate(${sx}, ${sy})`}>
                {/* Radar pulse for active station */}
                {isJustReached && <circle r={u(18)} fill="none" stroke={COLOR.amber} strokeWidth={u(2)} opacity={0.8} />}

                {/* Station Circle Core */}
                <circle
                  r={u(isJustReached ? 9 : 7)}
                  fill={isPassed ? COLOR.amber : alpha(COLOR.night, 0.9)}
                  stroke={isPassed ? COLOR.onNight : alpha(COLOR.onNight, 0.55)}
                  strokeWidth={u(2)}
                  style={{ filter: isPassed ? `drop-shadow(0 0 ${u(4)}px ${COLOR.amber})` : 'none' }}
                />

                {/* Station label engraved on the terrain, at its real location */}
                {isPassed && (
                  <g opacity={interpolate(frame - (s.mile / 2170) * 140, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
                    <text x={lx} y={ly} textAnchor={s.label.anchor} fill={COLOR.onNight} fontSize={u(TYPE.label)} fontFamily={FONT.display} fontWeight={800} {...halo}>
                      {s.name}
                    </text>
                    <text x={lx} y={ly + u(15)} textAnchor={s.label.anchor} fill={COLOR.gold} fontSize={u(TYPE.micro)} fontFamily={FONT.mono} fontWeight={600} {...halo}>
                      Mile {s.mile} · {s.elevation}ft
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 6. CONESTOGA COVERED WAGON & OXEN CARAVAN (Animated traversing trail Westbound!) */}
          <g transform={`translate(${wagonX}, ${wagonY - u(10)}) scale(${u(2.6)})`}>
            {/* Dust cloud puffing behind wagon */}
            <ellipse cx="9" cy="4" rx={Math.max(3, Math.sin(frame * 0.4) * 3 + 5)} ry="2.5" fill={alpha(COLOR.paper, 0.45)} opacity={0.8} />
            {/* Ground shadow */}
            <ellipse cx="1" cy="4.5" rx="8" ry="2" fill={alpha(COLOR.night, 0.65)} />
            {/* Prairie Schooner White Canvas Bonnet */}
            <path d="M -5 2 C -5 -6.5, 5 -6.5, 5 2 Z" fill={COLOR.paper} stroke={COLOR.brown} strokeWidth="0.6" />
            {/* Wooden Wagon Box Bed */}
            <rect x="-6" y="0" width="12" height="3.2" rx="0.5" fill={COLOR.brown} stroke={COLOR.nightPanel} strokeWidth="0.5" />
            {/* Rear large wooden spoke wheel with rotation */}
            <g transform={`translate(-4, 3.8) rotate(${wheelAngle})`}>
              <circle cx="0" cy="0" r="2.4" fill={COLOR.nightPanel} stroke={COLOR.amber} strokeWidth="0.4" />
              <line x1="-2.4" y1="0" x2="2.4" y2="0" stroke={COLOR.amber} strokeWidth="0.3" />
              <line x1="0" y1="-2.4" x2="0" y2="2.4" stroke={COLOR.amber} strokeWidth="0.3" />
            </g>
            {/* Front small wooden spoke wheel with rotation */}
            <g transform={`translate(4, 3.8) rotate(${wheelAngle})`}>
              <circle cx="0" cy="0" r="1.9" fill={COLOR.nightPanel} stroke={COLOR.amber} strokeWidth="0.4" />
              <line x1="-1.9" y1="0" x2="1.9" y2="0" stroke={COLOR.amber} strokeWidth="0.3" />
              <line x1="0" y1="-1.9" x2="0" y2="1.9" stroke={COLOR.amber} strokeWidth="0.3" />
            </g>
            {/* Oxen Yoke Hitch reaching forward (to the left / West) */}
            <line x1="-6" y1="1.5" x2="-11" y2="1.5" stroke={COLOR.nightPanel} strokeWidth="0.7" />
            {/* Oxen Pair (Silhouettes marching West) */}
            <g transform="translate(-13, 1)">
              <ellipse cx="0" cy="0" rx="3.5" ry="2" fill={COLOR.brown} />
              <ellipse cx="-3" cy="-1" rx="1.5" ry="1.2" fill={COLOR.nightPanel} />
              <path d="M -4 -2 Q -5 -3 -3 -3" stroke={COLOR.paper} strokeWidth="0.4" fill="none" />
              <line x1="-2" y1="2" x2={-2 + Math.sin(frame * 0.5) * 1} y2="4.5" stroke={COLOR.nightPanel} strokeWidth="0.6" />
              <line x1="2" y1="2" x2={2 - Math.sin(frame * 0.5) * 1} y2="4.5" stroke={COLOR.nightPanel} strokeWidth="0.6" />
            </g>
            {/* Glowing Beacon above wagon */}
            <circle cx="0" cy="-6.5" r="1.6" fill={COLOR.amber} style={{ filter: `drop-shadow(0 0 3px ${COLOR.amber})` }} />
          </g>
        </svg>
      </div>

      {/* Cinematic dark vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, ${alpha(COLOR.night, 0)} 45%, ${alpha(COLOR.night, 0.7)} 100%)`,
          pointerEvents: 'none',
          zIndex: 21,
        }}
      />

      {/* 2. TOP METRICS & STATION DASHBOARD */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 40,
          pointerEvents: 'none',
        }}
      >
        {/* Left Badge: Title & Current Station */}
        <div
          style={{
            backgroundColor: alpha(COLOR.night, 0.94),
            backdropFilter: 'blur(16px)',
            border: `1px solid ${alpha(COLOR.amber, 0.45)}`,
            borderLeft: `4px solid ${COLOR.amber}`,
            borderRadius: RADIUS.md,
            padding: '10px 18px',
            boxShadow: `0 12px 30px ${alpha(COLOR.night, 0.7)}`,
            maxWidth: isPortrait ? '70%' : 480,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: FONT.display, fontSize: TYPE.micro, fontWeight: 900, color: COLOR.amber, letterSpacing: '0.12em' }}>
              THE OREGON TRAIL (1841–1869)
            </span>
            <span style={{ color: alpha(COLOR.onNight, 0.3) }}>·</span>
            <span style={{ fontFamily: FONT.mono, fontSize: TYPE.nano, color: COLOR.mintOnNight, fontWeight: 700 }}>
              {currentStation.month}
            </span>
          </div>
          <div style={{ fontSize: isPortrait ? TYPE.town : TYPE.body, fontWeight: 900, color: COLOR.onNight, letterSpacing: '-0.01em' }}>
            {currentStation.name}
          </div>
          <div style={{ fontSize: TYPE.micro, color: alpha(COLOR.onNight, 0.85), marginTop: 2, lineHeight: 1.35 }}>
            {currentStation.note}
          </div>
        </div>

        {/* Right Dashboard: Live Odometer & Elevation Gauge */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            backgroundColor: alpha(COLOR.night, 0.94),
            backdropFilter: 'blur(16px)',
            border: `1px solid ${alpha(COLOR.onNight, 0.15)}`,
            borderRadius: RADIUS.md,
            padding: '8px 16px',
            boxShadow: `0 12px 30px ${alpha(COLOR.night, 0.7)}`,
          }}
        >
          <div style={{ textAlign: 'center', paddingRight: 12, borderRight: `1px solid ${alpha(COLOR.onNight, 0.1)}` }}>
            <div style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.5), letterSpacing: '0.05em' }}>
              TRAIL DISTANCE
            </div>
            <div style={{ fontFamily: FONT.display, fontSize: TYPE.label, fontWeight: 900, color: COLOR.mintOnNight }}>
              {currentMiles.toLocaleString()}<span style={{ fontSize: TYPE.micro, fontWeight: 600 }}> mi</span>
            </div>
            <div style={{ fontSize: TYPE.nano, color: alpha(COLOR.onNight, 0.4) }}>
              of 2,170 mi
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.5), letterSpacing: '0.05em' }}>
              ELEVATION
            </div>
            <div style={{ fontFamily: FONT.display, fontSize: TYPE.label, fontWeight: 900, color: COLOR.amber }}>
              {currentElevation.toLocaleString()}<span style={{ fontSize: TYPE.micro, fontWeight: 600 }}> ft</span>
            </div>
            <div style={{ fontSize: TYPE.nano, color: currentElevation >= 7000 ? COLOR.red : COLOR.onNightMuted, fontWeight: 600 }}>
              {currentElevation >= 7000 ? 'Snow Summit' : currentElevation >= 4000 ? 'High Rockies' : 'River Basin'}
            </div>
          </div>
        </div>
      </div>



      {/* 4. COMPASS ROSE (VINTAGE ANTIQUE CARTOGRAPHY) */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: isPortrait ? 16 : 220,
          zIndex: 30,
          opacity: 0.85,
          fontFamily: FONT.display,
          fontSize: TYPE.nano,
          color: COLOR.onNight,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: alpha(COLOR.night, 0.85),
          padding: '6px 10px',
          borderRadius: RADIUS.sm,
          border: `1px solid ${alpha(COLOR.onNight, 0.15)}`,
        }}
      >
        <span style={{ fontWeight: 900, color: COLOR.amber, fontSize: TYPE.micro }}>N</span>
        <span style={{ fontSize: TYPE.tag, color: COLOR.onNight }}>▲</span>
        <span style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, opacity: 0.6 }}>WESTBOUND</span>
      </div>

      {/* 7. BOTTOM ELEVATION PROFILE CHART & APUSH EXAM TICKER */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 16,
          right: 16,
          backgroundColor: alpha(COLOR.night, 0.94),
          backdropFilter: 'blur(16px)',
          borderRadius: RADIUS.md,
          border: `1px solid ${alpha(COLOR.onNight, 0.12)}`,
          padding: '8px 16px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
          gap: 6,
        }}
      >
        {/* Top row: Elevation Profile Visualizer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: COLOR.amber, fontWeight: 800 }}>
              ELEVATION PROFILE:
            </span>
            <span style={{ fontSize: TYPE.nano, color: alpha(COLOR.onNight, 0.7), fontFamily: FONT.mono }}>
              850 ft (MO) ➔ 7,412 ft (South Pass) ➔ 60 ft (Willamette)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: TYPE.nano, fontFamily: FONT.mono }}>
            <span style={{ color: alpha(COLOR.onNight, 0.5) }}>PROGRESS:</span>
            <span style={{ color: COLOR.mintOnNight, fontWeight: 800 }}>{Math.round(progress * 100)}%</span>
          </div>
        </div>

        {/* Mini SVG Elevation Chart */}
        <div style={{ position: 'relative', height: 26, width: '100%', backgroundColor: alpha(COLOR.night, 0.6), borderRadius: RADIUS.sm, overflow: 'hidden' }}>
          <svg viewBox="0 0 100 26" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            {/* Elevation filled polygon */}
            <polygon
              points="0,24 0,22 15,19 25,14 30,13 42,4 60,11 88,24 100,24 100,26 0,26"
              fill={alpha(COLOR.amber, 0.2)}
            />
            {/* Elevation curve stroke */}
            <polyline
              points="0,22 15,19 25,14 30,13 42,4 60,11 88,24 100,24"
              fill="none"
              stroke={COLOR.amber}
              strokeWidth="1.2"
            />
            {/* South Pass Summit Indicator (42%, y=4) */}
            <line x1="42" y1="0" x2="42" y2="26" stroke={alpha(COLOR.red, 0.5)} strokeWidth="0.8" strokeDasharray="1 1" />
            <text x="43" y="8" fill={COLOR.onNight} fontSize="3" fontFamily={FONT.mono}>
              7,412 ft
            </text>

            {/* Current Position Marker on elevation graph */}
            <circle
              cx={progress * 100}
              cy={
                progress < 0.42
                  ? 22 - (progress / 0.42) * 18
                  : progress < 0.6
                  ? 4 + ((progress - 0.42) / 0.18) * 7
                  : 11 + ((progress - 0.6) / 0.4) * 13
              }
              r="2"
              fill={COLOR.onNight}
              stroke={COLOR.mintOnNight}
              strokeWidth="0.8"
            />
          </svg>
        </div>

        {/* Bottom row: Historical takeaway */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: `1px solid ${alpha(COLOR.onNight, 0.08)}`, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                padding: '2px 6px',
                backgroundColor: COLOR.amber,
                color: COLOR.night,
                fontFamily: FONT.display,
                fontSize: TYPE.nano,
                fontWeight: 900,
                borderRadius: RADIUS.sm,
                whiteSpace: 'nowrap',
              }}
            >
              APUSH ESSENTIAL
            </span>
            <span style={{ fontSize: TYPE.micro, color: alpha(COLOR.onNight, 0.9), lineHeight: 1.3 }}>
              <strong>Manifest Destiny & The Oregon Treaty (1846):</strong> Over 400,000 pioneers migrated along this route. Their massive demographic presence forced Britain to compromise on the 49th parallel border rather than war (&apos;54° 40&apos; or Fight!&apos;).
            </span>
          </div>

          <span style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.4), whiteSpace: 'nowrap' }}>
            PERIOD 5 · MANIFEST DESTINY
          </span>
        </div>
      </div>
    </div>
  );
};

/** Exported for geometry checks. */
export { stations as OREGON_TRAIL_STATIONS };
