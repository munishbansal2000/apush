import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export interface OregonTrailCinematicMapProps {
  mapAsset: string;
}

interface TrailStation {
  name: string;
  mile: number;
  elevation: number; // in feet
  month: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
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
    x: 88,
    y: 64,
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
    x: 74,
    y: 56,
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
    x: 63,
    y: 51,
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
    x: 56,
    y: 47,
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
    x: 46,
    y: 43,
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
    x: 35,
    y: 38,
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
    x: 21,
    y: 28,
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
    x: 13,
    y: 26,
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
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

  // Trail progress from frame 10 to 160 (smooth eased progress)
  const progress = interpolate(frame, [10, 160], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Camera pan & zoom tracking the wagon East to West
  const cameraZoom = interpolate(frame, [0, 180], [1.03, 1.14], { extrapolateRight: 'clamp' });
  const cameraPanX = interpolate(progress, [0, 1], [35, -45]);
  const cameraPanY = interpolate(progress, [0, 1], [10, -10]);

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

  // SVG Trail Path: Accurate East to West curve through landmarks
  // Independence (88,64) -> Ft Kearny (74,56) -> Chimney Rock (63,51) -> Ft Laramie (56,47) -> South Pass (46,43) -> Ft Hall (35,38) -> The Dalles (21,28) -> Oregon City (13,26)
  const trailPath =
    'M 88 64 C 82 60, 78 58, 74 56 C 70 54, 66 52, 63 51 C 60 50, 58 48, 56 47 C 52 45, 49 44, 46 43 C 41 41, 38 39, 35 38 C 29 34, 25 31, 21 28 C 18 26, 15 26, 13 26';

  const pathLength = 340;
  const strokeOffset = pathLength * (1 - progress);

  // Precise position of wagon along path
  const wagonX = interpolate(progress, [0, 0.15, 0.28, 0.42, 0.6, 0.85, 1], [88, 74, 63, 46, 35, 21, 13]);
  const wagonY = interpolate(progress, [0, 0.15, 0.28, 0.42, 0.6, 0.85, 1], [64, 56, 51, 43, 38, 28, 26]);

  // Determine active station & incident
  const activeStationIndex = stations.findIndex((s, i) => {
    const nextS = stations[i + 1];
    if (!nextS) return true;
    return currentMiles >= s.mile && currentMiles < nextS.mile;
  });
  const currentStation = stations[activeStationIndex] || stations[0];

  // Elevation profile data points for mini-chart

  // Animated wheel rotation
  const wheelAngle = frame * 18;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#090c13' }}>
      {/* 1. ARCHIVAL HISTORICAL MAP BACKGROUND */}
      <div
        style={{
          position: 'absolute',
          inset: -40,
          backgroundImage: `url(${mapAsset})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.9) contrast(1.18) saturate(1.12)',
          transform: `scale(${cameraZoom}) translate(${cameraPanX}px, ${cameraPanY}px)`,
          transformOrigin: 'center center',
          transition: 'transform 0.1s linear',
        }}
      />

      {/* Warm parchment paper overlay & cinematic dark vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(20, 24, 38, 0.25) 0%, rgba(9, 12, 19, 0.78) 90%)',
          pointerEvents: 'none',
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
            backgroundColor: 'rgba(10, 14, 23, 0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            borderLeft: '4px solid #f59e0b',
            borderRadius: 8,
            padding: '10px 18px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
            maxWidth: isPortrait ? '70%' : 480,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 900, color: '#f59e0b', letterSpacing: '0.12em' }}>
              THE OREGON TRAIL (1841–1869)
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#10b981', fontWeight: 700 }}>
              {currentStation.month}
            </span>
          </div>
          <div style={{ fontSize: isPortrait ? 16 : 20, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em' }}>
            {currentStation.name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(226, 232, 240, 0.85)', marginTop: 2, lineHeight: 1.35 }}>
            {currentStation.note}
          </div>
        </div>

        {/* Right Dashboard: Live Odometer & Elevation Gauge */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            backgroundColor: 'rgba(10, 14, 23, 0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
          }}
        >
          <div style={{ textAlign: 'center', paddingRight: 12, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }}>
              TRAIL DISTANCE
            </div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 19, fontWeight: 900, color: '#10b981' }}>
              {currentMiles.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 600 }}> mi</span>
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
              of 2,170 mi
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }}>
              ELEVATION
            </div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 19, fontWeight: 900, color: '#f59e0b' }}>
              {currentElevation.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 600 }}> ft</span>
            </div>
            <div style={{ fontSize: 9, color: currentElevation >= 7000 ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>
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
          fontFamily: "'Cinzel', serif",
          fontSize: 10,
          color: '#cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: 'rgba(10, 14, 23, 0.85)',
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <span style={{ fontWeight: 900, color: '#f59e0b', fontSize: 11 }}>N</span>
        <span style={{ fontSize: 13, color: '#ffffff' }}>▲</span>
        <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", opacity: 0.6 }}>WESTBOUND</span>
      </div>

      {/* 5. SVG TRAIL LAYER WITH WAGON, OXEN & STATIONS */}
      <svg
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          zIndex: 20,
        }}
      >
        {/* River Label Annotations */}
        <text x="76" y="52" fill="rgba(56, 189, 248, 0.85)" fontSize="2.2" fontStyle="italic" fontWeight="700">
          Platte River
        </text>
        <text x="36" y="34" fill="rgba(56, 189, 248, 0.85)" fontSize="2.2" fontStyle="italic" fontWeight="700">
          Snake River
        </text>
        <text x="18" y="23" fill="rgba(56, 189, 248, 0.85)" fontSize="2.2" fontStyle="italic" fontWeight="700">
          Columbia River
        </text>
        <text x="46" y="39" fill="rgba(251, 191, 36, 0.9)" fontSize="2.4" fontWeight="800" fontFamily="'Cinzel', serif">
          ▲ ROCKY MOUNTAINS (CONTINENTAL DIVIDE)
        </text>

        {/* Trail Shadow Route */}
        <path
          d={trailPath}
          fill="none"
          stroke="rgba(0, 0, 0, 0.85)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Golden Glowing Trail Line */}
        <path
          d={trailPath}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          strokeDashoffset={strokeOffset}
          style={{ filter: 'drop-shadow(0 0 8px #f59e0b)' }}
        />

        {/* Wagon Wheel Ruts (Double dotted white track) */}
        <path
          d={trailPath}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeDasharray="2.5 3"
          strokeDashoffset={-frame * 0.9}
          strokeLinecap="round"
          opacity={0.9}
        />

        {/* Trail Stations Pins */}
        {stations.map((s, idx) => {
          const stationThreshold = s.mile / 2170;
          const isPassed = progress >= stationThreshold;
          const isJustReached = Math.abs(progress - stationThreshold) < 0.05;

          return (
            <g key={idx} transform={`translate(${s.x}, ${s.y})`}>
              {/* Radar pulse for active station */}
              {isJustReached && (
                <circle
                  r="4"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="0.8"
                  opacity={0.8}
                />
              )}

              {/* Station Circle Core */}
              <circle
                r={isJustReached ? '2.4' : '1.8'}
                fill={isPassed ? '#f59e0b' : 'rgba(15, 23, 42, 0.9)'}
                stroke={isPassed ? '#ffffff' : 'rgba(255, 255, 255, 0.45)'}
                strokeWidth="0.6"
                style={{
                  filter: isPassed ? 'drop-shadow(0 0 5px #f59e0b)' : 'none',
                }}
              />

              {/* Historical cartographic station label engraved directly on the terrain (No balloon boxes!) */}
              {isPassed && (
                <g opacity={interpolate(frame - (s.mile / 2170) * 140, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
                  <text
                    x={idx % 2 === 0 ? 3 : -3}
                    y={idx % 2 === 0 ? 2.5 : -2}
                    textAnchor={idx % 2 === 0 ? 'start' : 'end'}
                    fill="#ffffff"
                    fontSize="1.9"
                    fontFamily="'Cinzel', serif"
                    fontWeight="800"
                    style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.95))' }}
                  >
                    {s.name}
                  </text>
                  <text
                    x={idx % 2 === 0 ? 3 : -3}
                    y={idx % 2 === 0 ? 4.5 : -0.2}
                    textAnchor={idx % 2 === 0 ? 'start' : 'end'}
                    fill="#fbbf24"
                    fontSize="1.2"
                    fontFamily="'JetBrains Mono', monospace"
                    fontWeight="600"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.95))' }}
                  >
                    Mile {s.mile} · {s.elevation}ft
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* 6. CONESTOGA COVERED WAGON & OXEN CARAVAN (Animated traversing trail Westbound!) */}
        <g transform={`translate(${wagonX}, ${wagonY}) scale(0.7)`}>
          {/* Dust cloud puffing behind wagon */}
          <ellipse
            cx="9"
            cy="4"
            rx={Math.max(3, Math.sin(frame * 0.4) * 3 + 5)}
            ry="2.5"
            fill="rgba(245, 230, 200, 0.45)"
            opacity={0.8}
          />
          {/* Ground shadow */}
          <ellipse cx="1" cy="4.5" rx="8" ry="2" fill="rgba(0,0,0,0.65)" />

          {/* Prairie Schooner White Canvas Bonnet */}
          <path
            d="M -5 2 C -5 -6.5, 5 -6.5, 5 2 Z"
            fill="#fef3c7"
            stroke="#78350f"
            strokeWidth="0.6"
          />

          {/* Wooden Wagon Box Bed */}
          <rect
            x="-6"
            y="0"
            width="12"
            height="3.2"
            rx="0.5"
            fill="#92400e"
            stroke="#451a03"
            strokeWidth="0.5"
          />

          {/* Rear large wooden spoke wheel with rotation */}
          <g transform={`translate(-4, 3.8) rotate(${wheelAngle})`}>
            <circle cx="0" cy="0" r="2.4" fill="#451a03" stroke="#f59e0b" strokeWidth="0.4" />
            <line x1="-2.4" y1="0" x2="2.4" y2="0" stroke="#f59e0b" strokeWidth="0.3" />
            <line x1="0" y1="-2.4" x2="0" y2="2.4" stroke="#f59e0b" strokeWidth="0.3" />
          </g>

          {/* Front small wooden spoke wheel with rotation */}
          <g transform={`translate(4, 3.8) rotate(${wheelAngle})`}>
            <circle cx="0" cy="0" r="1.9" fill="#451a03" stroke="#f59e0b" strokeWidth="0.4" />
            <line x1="-1.9" y1="0" x2="1.9" y2="0" stroke="#f59e0b" strokeWidth="0.3" />
            <line x1="0" y1="-1.9" x2="0" y2="1.9" stroke="#f59e0b" strokeWidth="0.3" />
          </g>

          {/* Oxen Yoke Hitch reaching forward (to the left / West) */}
          <line x1="-6" y1="1.5" x2="-11" y2="1.5" stroke="#451a03" strokeWidth="0.7" />

          {/* Oxen Pair (Silhouettes marching West) */}
          <g transform="translate(-13, 1)">
            {/* Ox body */}
            <ellipse cx="0" cy="0" rx="3.5" ry="2" fill="#78350f" />
            {/* Ox head */}
            <ellipse cx="-3" cy="-1" rx="1.5" ry="1.2" fill="#451a03" />
            {/* Ox horns */}
            <path d="M -4 -2 Q -5 -3 -3 -3" stroke="#fef3c7" strokeWidth="0.4" fill="none" />
            {/* Legs with walking animation */}
            <line x1="-2" y1="2" x2={-2 + Math.sin(frame * 0.5) * 1} y2="4.5" stroke="#451a03" strokeWidth="0.6" />
            <line x1="2" y1="2" x2={2 - Math.sin(frame * 0.5) * 1} y2="4.5" stroke="#451a03" strokeWidth="0.6" />
          </g>

          {/* Glowing Beacon above wagon */}
          <circle cx="0" cy="-6.5" r="1.6" fill="#f59e0b" style={{ filter: 'drop-shadow(0 0 8px #f59e0b)' }} />
        </g>
      </svg>

      {/* 7. BOTTOM ELEVATION PROFILE CHART & APUSH EXAM TICKER */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 16,
          right: 16,
          backgroundColor: 'rgba(10, 14, 23, 0.94)',
          backdropFilter: 'blur(16px)',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.12)',
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
            <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#f59e0b', fontWeight: 800 }}>
              ELEVATION PROFILE:
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: "'JetBrains Mono', monospace" }}>
              850 ft (MO) ➔ 7,412 ft (South Pass) ➔ 60 ft (Willamette)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>PROGRESS:</span>
            <span style={{ color: '#10b981', fontWeight: 800 }}>{Math.round(progress * 100)}%</span>
          </div>
        </div>

        {/* Mini SVG Elevation Chart */}
        <div style={{ position: 'relative', height: 26, width: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 4, overflow: 'hidden' }}>
          <svg viewBox="0 0 100 26" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            {/* Elevation filled polygon */}
            <polygon
              points="0,24 0,22 15,19 25,14 30,13 42,4 60,11 88,24 100,24 100,26 0,26"
              fill="rgba(245, 158, 11, 0.2)"
            />
            {/* Elevation curve stroke */}
            <polyline
              points="0,22 15,19 25,14 30,13 42,4 60,11 88,24 100,24"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.2"
            />
            {/* South Pass Summit Indicator (42%, y=4) */}
            <line x1="42" y1="0" x2="42" y2="26" stroke="rgba(239, 68, 68, 0.5)" strokeWidth="0.8" strokeDasharray="1 1" />
            <text x="43" y="8" fill="#fca5a5" fontSize="3" fontFamily="'JetBrains Mono', monospace">
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
              fill="#ffffff"
              stroke="#10b981"
              strokeWidth="0.8"
            />
          </svg>
        </div>

        {/* Bottom row: Historical takeaway */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                padding: '2px 6px',
                backgroundColor: '#f59e0b',
                color: '#0f172a',
                fontFamily: "'Cinzel', serif",
                fontSize: 9,
                fontWeight: 900,
                borderRadius: 3,
                whiteSpace: 'nowrap',
              }}
            >
              APUSH ESSENTIAL
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.3 }}>
              <strong>Manifest Destiny & The Oregon Treaty (1846):</strong> Over 400,000 pioneers migrated along this route. Their massive demographic presence forced Britain to compromise on the 49th parallel border rather than war (&apos;54° 40&apos; or Fight!&apos;).
            </span>
          </div>

          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
            PERIOD 5 · MANIFEST DESTINY
          </span>
        </div>
      </div>
    </div>
  );
};
