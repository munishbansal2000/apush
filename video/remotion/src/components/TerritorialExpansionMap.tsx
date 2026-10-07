import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { acquisitionsAtlasMap1853 } from './motionStudioPresets';

interface TerritoryData {
  id: string;
  year: number;
  name: string;
  formalName: string;
  treaty: string;
  sqMiles: number;
  // Natural archival watercolor tones
  inkColor: string;
  fillColor: string;
  path: string; // Accurate SVG path for the territory
  labelX: number;
  labelY: number;
  labelRotate?: number;
  startFrame: number;
  treatyDetail: string;
}

// 7 Historical territorial acquisitions with authentic geographic contours
const historicalTerritories: TerritoryData[] = [
  {
    id: 'original_13',
    year: 1783,
    name: 'UNITED STATES',
    formalName: 'Original 13 States & Northwest Territory',
    treaty: 'Treaty of Paris (1783)',
    sqMiles: 888685,
    inkColor: '#1e3a8a',
    fillColor: 'rgba(30, 58, 138, 0.42)', // Natural Prussian blue ink wash
    // East Coast from Maine down to Georgia, west to Mississippi River
    path: 'M 64 26 C 72 24, 82 22, 88 28 C 92 32, 94 36, 92 42 C 90 50, 86 64, 84 72 C 78 78, 72 82, 66 84 C 64 74, 63 60, 62 48 C 62 40, 63 32, 64 26 Z',
    labelX: 78,
    labelY: 52,
    startFrame: 0,
    treatyDetail: 'Ceded by Great Britain at the end of the Revolutionary War; sets western boundary at Mississippi River.',
  },
  {
    id: 'louisiana',
    year: 1803,
    name: 'LOUISIANA PURCHASE',
    formalName: 'The Louisiana Purchase',
    treaty: 'Purchased from France ($15M)',
    sqMiles: 827987,
    inkColor: '#b45309',
    fillColor: 'rgba(180, 83, 9, 0.38)', // Antique saffron watercolor bleed
    // Mississippi River west to Rocky Mountain Continental Divide
    path: 'M 64 26 C 63 32, 62 40, 62 48 C 63 60, 64 74, 66 84 C 58 83, 52 78, 48 72 C 44 64, 40 54, 38 42 C 40 40, 44 38, 50 36 C 56 42, 60 48, 64 26 Z',
    labelX: 50,
    labelY: 52,
    labelRotate: -8,
    startFrame: 26,
    treatyDetail: 'Jefferson purchases 828,000 sq miles from Napoleon for $15M (~3¢/acre), doubling the republic.',
  },
  {
    id: 'florida',
    year: 1819,
    name: 'FLORIDA',
    formalName: 'Florida Cession',
    treaty: 'Adams-Onís Treaty (Spain)',
    sqMiles: 72101,
    inkColor: '#15803d',
    fillColor: 'rgba(21, 128, 61, 0.44)', // Spanish moss botanical green wash
    // Florida peninsula and Gulf coast strip
    path: 'M 72 80 C 80 76, 84 72, 88 80 C 86 86, 82 90, 78 86 C 74 84, 72 82, 72 80 Z',
    labelX: 81,
    labelY: 82,
    startFrame: 52,
    treatyDetail: 'Spain cedes East & West Florida following Jackson’s military campaign; U.S. assumes $5M debt.',
  },
  {
    id: 'texas',
    year: 1845,
    name: 'TEXAS',
    formalName: 'Texas Annexation',
    treaty: 'Joint Congressional Resolution',
    sqMiles: 389166,
    inkColor: '#c2410c',
    fillColor: 'rgba(194, 65, 12, 0.4)', // Warm southwestern terracotta wash
    // Texas boundary along Rio Grande and Red River
    path: 'M 48 72 C 54 74, 58 80, 56 86 C 48 88, 42 84, 38 74 C 42 72, 46 72, 48 72 Z',
    labelX: 47,
    labelY: 79,
    startFrame: 78,
    treatyDetail: 'Admitted as 28th state after 9 years of independence; triggers border dispute and war with Mexico.',
  },
  {
    id: 'oregon',
    year: 1846,
    name: 'OREGON COUNTRY',
    formalName: 'Oregon Territory',
    treaty: 'Oregon Treaty (49th Parallel)',
    sqMiles: 286541,
    inkColor: '#0f766e',
    fillColor: 'rgba(15, 118, 110, 0.42)', // Pacific Northwest pine wash
    // Pacific Northwest above 42° parallel up to 49° line
    path: 'M 14 24 C 24 24, 34 24, 38 24 C 38 34, 36 40, 34 44 C 26 44, 18 42, 14 42 C 14 36, 14 30, 14 24 Z',
    labelX: 25,
    labelY: 34,
    startFrame: 104,
    treatyDetail: 'Diplomatic compromise with Great Britain along 49° parallel, securing Puget Sound and Columbia River.',
  },
  {
    id: 'mexican_cession',
    year: 1848,
    name: 'MEXICAN CESSION',
    formalName: 'Mexican Cession',
    treaty: 'Treaty of Guadalupe Hidalgo',
    sqMiles: 529189,
    inkColor: '#991b1b',
    fillColor: 'rgba(153, 27, 27, 0.42)', // Antique crimson watercolor wash
    // California, Nevada, Utah, Arizona, New Mexico
    path: 'M 14 42 C 20 42, 28 44, 34 44 C 36 52, 38 60, 38 72 C 30 72, 24 70, 18 68 C 16 60, 14 52, 14 42 Z',
    labelX: 25,
    labelY: 57,
    startFrame: 130,
    treatyDetail: 'Mexico cedes California and American Southwest for $15M; reignites sectional conflict over slavery expansion.',
  },
  {
    id: 'gadsden',
    year: 1853,
    name: 'GADSDEN',
    formalName: 'Gadsden Purchase',
    treaty: 'Purchased from Mexico ($10M)',
    sqMiles: 29670,
    inkColor: '#7c2d12',
    fillColor: 'rgba(124, 45, 18, 0.5)', // Deep desert amber
    // Southern rail strip south of Gila River
    path: 'M 24 70 C 30 70, 36 72, 38 72 C 38 76, 30 76, 24 74 C 24 72, 24 70, 24 70 Z',
    labelX: 30,
    labelY: 74,
    startFrame: 156,
    treatyDetail: 'Purchased for $10M to facilitate a southern transcontinental railroad route, finalizing contiguous U.S. borders.',
  },
];

export const TerritorialExpansionMap: React.FC = () => {
  const frame = useCurrentFrame();

  // Gentle, cinematic Ken Burns camera push (subtle and archival, not jerky)
  const cameraZoom = interpolate(frame, [0, 180], [1.01, 1.08], { extrapolateRight: 'clamp' });
  const cameraPanX = interpolate(frame, [0, 180], [12, -18], { extrapolateRight: 'clamp' });

  // Determine current active territory
  const activeTerritories = historicalTerritories.filter((t) => frame >= t.startFrame);
  const currentTerritory = activeTerritories[activeTerritories.length - 1] || historicalTerritories[0];

  // Dynamic calculation of cumulative square mileage (smooth organic odometer)
  const totalSqMiles = historicalTerritories.reduce((sum, t) => {
    if (frame < t.startFrame) return sum;
    const blockProgress = interpolate(frame - t.startFrame, [0, 18], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return sum + Math.round(t.sqMiles * blockProgress);
  }, 0);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#11141c',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* 1. ARCHIVAL HISTORICAL ATLAS BASE (Warm sepia cartography with natural mountain relief) */}
      <div
        style={{
          position: 'absolute',
          inset: -40,
          backgroundImage: `url(${acquisitionsAtlasMap1853})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.92) contrast(1.18) sepia(0.12)',
          transform: `scale(${cameraZoom}) translate(${cameraPanX}px, 0px)`,
          transformOrigin: 'center center',
          transition: 'transform 0.1s linear',
        }}
      />

      {/* Natural paper parchment grain and subtle archival vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(245, 230, 200, 0.04) 0%, rgba(10, 14, 23, 0.55) 90%)',
          pointerEvents: 'none',
        }}
      />

      {/* 2. THE ORGANIC WATERCOLOR INK-BLEED LAYER (mix-blend-mode: multiply!) */}
      {/* This makes the color tint absorb INTO the paper fibers so rivers and mountain ridges show through naturally! */}
      <svg
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          zIndex: 15,
          mixBlendMode: 'multiply', // CRITICAL: Blends ink into the underlying historical paper!
        }}
      >
        <defs>
          {/* Subtle paper ink bleed filter */}
          <filter id="inkBleed" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {historicalTerritories.map((t) => {
          const isRevealed = frame >= t.startFrame;
          if (!isRevealed) return null;

          // Smooth watercolor soak progress
          const soakProgress = interpolate(frame - t.startFrame, [0, 22], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <g key={t.id} opacity={soakProgress} filter="url(#inkBleed)">
              {/* Organic Watercolor Wash Fill (Absorbed into map paper) */}
              <path
                d={t.path}
                fill={t.fillColor}
                stroke={t.inkColor}
                strokeWidth="0.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Hand-drawn frontier outline that traces the border */}
              <path
                d={t.path}
                fill="none"
                stroke={t.inkColor}
                strokeWidth="1.2"
                strokeDasharray="3 1.5"
                opacity={0.85}
              />
            </g>
          );
        })}
      </svg>

      {/* 3. ENGRAVED HISTORICAL CARTOGRAPHY LETTERING (No cards, no balloon stickers!) */}
      <svg
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        {historicalTerritories.map((t) => {
          const isRevealed = frame >= t.startFrame;
          if (!isRevealed) return null;

          const textFade = interpolate(frame - t.startFrame, [6, 24], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const isCurrentFocus = t.id === currentTerritory.id;

          return (
            <g key={`label-${t.id}`} opacity={textFade}>
              {/* Classical copperplate engraved title, styled like a 19th-century printed atlas */}
              <text
                x={t.labelX}
                y={t.labelY}
                fill="#ffffff"
                fontSize={t.id === 'original_13' || t.id === 'louisiana' ? 2.6 : 2.2}
                fontFamily="'Cinzel', serif"
                fontWeight="900"
                letterSpacing="0.12em"
                textAnchor="middle"
                transform={t.labelRotate ? `rotate(${t.labelRotate}, ${t.labelX}, ${t.labelY})` : undefined}
                style={{
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.95)) drop-shadow(0 0 8px rgba(0,0,0,0.7))',
                }}
              >
                {t.name}
              </text>

              {/* Year & Treaty Tagline burned gently into the cartography */}
              <text
                x={t.labelX}
                y={t.labelY + 2.8}
                fill={isCurrentFocus ? '#fef08a' : 'rgba(255, 255, 255, 0.85)'}
                fontSize="1.4"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="700"
                letterSpacing="0.06em"
                textAnchor="middle"
                transform={t.labelRotate ? `rotate(${t.labelRotate}, ${t.labelX}, ${t.labelY + 2.8})` : undefined}
                style={{
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))',
                }}
              >
                {t.year} · {t.treaty.split('(')[0].trim()}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 4. CLEAN ELEGANT BROADCAST HEADER (Timeline Progress Strip) */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 40,
          pointerEvents: 'none',
        }}
      >
        {/* Title HUD */}
        <div
          style={{
            backgroundColor: 'rgba(10, 14, 23, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(251, 191, 36, 0.35)',
            borderLeft: '4px solid #fbbf24',
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 900, color: '#fbbf24', letterSpacing: '0.12em' }}>
              APUSH PERIOD 4 &amp; 5
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>
              Continental Expansion (1783–1853)
            </span>
          </div>
        </div>

        {/* Live Cumulative Area Odometer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'rgba(10, 14, 23, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }}>
              U.S. CONTINENTAL LAND AREA
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 900, color: '#10b981' }}>
              {totalSqMiles.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 600 }}> sq mi</span>
            </div>
          </div>

          <div style={{ width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.15)' }} />

          <div>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>
              CHRONOLOGY
            </div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 900, color: '#fbbf24' }}>
              {currentTerritory.year}
            </div>
          </div>
        </div>
      </div>

      {/* 5. SLENDER CHRONOLOGICAL TIMELINE STEPPER (Clean top-bar progress, non-intrusive) */}
      <div
        style={{
          position: 'absolute',
          top: 66,
          left: 16,
          right: 16,
          display: 'flex',
          gap: 6,
          zIndex: 35,
          pointerEvents: 'none',
        }}
      >
        {historicalTerritories.map((t, idx) => {
          const isReached = frame >= t.startFrame;
          const isCurrent = t.id === currentTerritory.id;

          return (
            <div
              key={t.id}
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: 4,
                backgroundColor: isCurrent
                  ? 'rgba(251, 191, 36, 0.95)'
                  : isReached
                  ? 'rgba(15, 23, 42, 0.88)'
                  : 'rgba(15, 23, 42, 0.5)',
                border: isCurrent
                  ? '1px solid #fbbf24'
                  : isReached
                  ? '1px solid rgba(255, 255, 255, 0.2)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(8px)',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 800,
                  color: isCurrent ? '#090d16' : isReached ? '#ffffff' : 'rgba(255,255,255,0.4)',
                }}
              >
                {t.year}
              </div>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 600,
                  color: isCurrent ? '#090d16' : isReached ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {t.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* 6. CINEMATIC LOWER-THIRD BROADCAST STRIP (All historical info sits neatly here, not over the terrain!) */}
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
          borderLeft: `4px solid ${currentTerritory.inkColor}`,
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 11,
                fontWeight: 900,
                color: '#fbbf24',
                letterSpacing: '0.08em',
              }}
            >
              {currentTerritory.year} · {currentTerritory.formalName.toUpperCase()}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#a7f3d0' }}>
              +{currentTerritory.sqMiles.toLocaleString()} sq mi ({currentTerritory.treaty})
            </span>
          </div>

          <div style={{ fontSize: 11, color: 'rgba(241, 245, 249, 0.9)', lineHeight: 1.35 }}>
            {currentTerritory.treatyDetail}
          </div>
        </div>

        {/* Sectional Crisis Exam Anchor */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            paddingLeft: 16,
            minWidth: 200,
          }}
        >
          <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#ef4444', fontWeight: 800 }}>
            APUSH EXAM ESSENTIAL
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'right', lineHeight: 1.3 }}>
            Slavery expansion debate in new federal lands
          </span>
        </div>
      </div>
    </div>
  );
};
