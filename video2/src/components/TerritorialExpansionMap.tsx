import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { ACQUISITIONS, ACQUISITION_LABELS, usProjection, useUsBase } from './geo/usGeo';
import { COLOR, FONT, RADIUS, TYPE, alpha } from '../theme/tokens';

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
    inkColor: COLOR.blue,
    fillColor: alpha(COLOR.blue, 0.42), // Natural Prussian blue ink wash
    // East Coast from Maine down to Georgia, west to Mississippi River
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
    inkColor: COLOR.amber,
    fillColor: alpha(COLOR.amber, 0.38), // Antique saffron watercolor bleed
    // Mississippi River west to Rocky Mountain Continental Divide
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
    inkColor: COLOR.green,
    fillColor: alpha(COLOR.green, 0.44), // Spanish moss botanical green wash
    // Florida peninsula and Gulf coast strip
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
    inkColor: COLOR.gold,
    fillColor: alpha(COLOR.gold, 0.4), // Warm southwestern terracotta wash (gold: distinct from neighbouring Louisiana amber)
    // Texas boundary along Rio Grande and Red River
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
    inkColor: COLOR.oceanDeep,
    fillColor: alpha(COLOR.oceanDeep, 0.42), // Pacific Northwest pine wash (teal: distinct from Florida green)
    // Pacific Northwest above 42° parallel up to 49° line
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
    inkColor: COLOR.red,
    fillColor: alpha(COLOR.red, 0.42), // Antique crimson watercolor wash
    // California, Nevada, Utah, Arizona, New Mexico
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
    inkColor: COLOR.brown,
    fillColor: alpha(COLOR.brown, 0.5), // Deep desert amber
    // Southern rail strip south of Gila River
    startFrame: 156,
    treatyDetail: 'Purchased for $10M to facilitate a southern transcontinental railroad route, finalizing contiguous U.S. borders.',
  },
];

/** URLs / absolute paths / data URIs pass through; bare paths go through staticFile(). */
const resolveSrc = (src: string): string =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

interface TerritorialExpansionMapProps {
  /**
   * Optional raster atlas shown UNDER the vector map (decorative only — overlays are aligned to
   * the vector geography, not to the raster). Default: none.
   */
  mapSrc?: string;
}

export const TerritorialExpansionMap: React.FC<TerritorialExpansionMapProps> = ({
  mapSrc = '',
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  // One projection for base map, territories and labels: they line up by construction.
  const projection = React.useMemo(() => usProjection(width, height, [[-125.5, 22.5], [-66, 50.5]], height * 0.1), [width, height]);
  const { base, clipId, path } = useUsBase(projection, 'parchment');
  // HUD sizes are authored for a 1280-wide frame and scale with the composition width.
  const u = (n: number) => n * (width / 1280);
  const hasMap = !!mapSrc;

  // Gentle, cinematic Ken Burns camera push (subtle and archival, not jerky)
  const cameraZoom = interpolate(frame, [0, 180], [1.01, 1.08], { extrapolateRight: 'clamp' });
  const cameraPanX = interpolate(frame, [0, 180], [12, -18], { extrapolateRight: 'clamp' }) * (width / 1280);

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
        backgroundColor: COLOR.night,
        fontFamily: FONT.ui,
      }}
    >
      {/* 1–3. MAP: vector base + acquisitions + labels in ONE svg, moved together by the camera */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${cameraZoom}) translate(${cameraPanX}px, 0px)`,
          transformOrigin: 'center center',
        }}
      >
        {hasMap && (
          <Img src={resolveSrc(mapSrc)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25 }} />
        )}
        <svg viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {base}
          <defs>
            <filter id={`${clipId}-bleed`} x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur stdDeviation={u(0.6)} result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* watercolor washes, clipped to the US outline (exact coasts, lakes, borders) */}
          <g clipPath={`url(#${clipId})`} style={{ mixBlendMode: 'multiply' }}>
            {historicalTerritories.map((t) => {
              if (frame < t.startFrame) return null;
              const soak = interpolate(frame - t.startFrame, [0, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              const d = path(ACQUISITIONS[t.id]) ?? '';
              return (
                <g key={t.id} opacity={soak} filter={`url(#${clipId}-bleed)`}>
                  <path d={d} fill={t.fillColor} stroke={t.inkColor} strokeWidth={u(1.4)} strokeLinejoin="round" />
                  <path d={d} fill="none" stroke={t.inkColor} strokeWidth={u(2)} strokeDasharray={`${u(6)} ${u(3)}`} opacity={0.85} />
                </g>
              );
            })}
          </g>
          {/* engraved lettering at each region's label point */}
          {historicalTerritories.map((t) => {
            if (frame < t.startFrame) return null;
            const fade = interpolate(frame - t.startFrame, [6, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const [x, y] = projection(ACQUISITION_LABELS[t.id]) ?? [0, 0];
            const isFocus = t.id === currentTerritory.id;
            const big = t.id === 'original_13' || t.id === 'louisiana';
            return (
              <g key={`label-${t.id}`} opacity={fade}>
                <text x={x} y={y} textAnchor="middle" fill={COLOR.ink} fontSize={u(big ? TYPE.label : TYPE.tag)} fontFamily={FONT.display} fontWeight={900}
                  letterSpacing="0.08em" stroke={alpha(COLOR.paper, 0.85)} strokeWidth={u(3)} paintOrder="stroke">
                  {t.name}
                </text>
                <text x={x} y={y + u(big ? 17 : 15)} textAnchor="middle" fill={isFocus ? COLOR.red : COLOR.inkSoft} fontSize={u(TYPE.micro)}
                  fontFamily={FONT.mono} fontWeight={700} stroke={alpha(COLOR.paper, 0.85)} strokeWidth={u(2.5)} paintOrder="stroke">
                  {t.year} · {t.treaty.split('(')[0].trim()}
                </text>
              </g>
            );
          })}
        </svg>
        {/* archival vignette */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 50%, ${alpha(COLOR.night, 0)} 55%, ${alpha(COLOR.ink, 0.35)} 100%)`, pointerEvents: 'none' }} />
      </div>

      {/* 4. CLEAN ELEGANT BROADCAST HEADER (Timeline Progress Strip) */}
      <div
        style={{
          position: 'absolute',
          top: u(14),
          left: u(16),
          right: u(16),
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
            backgroundColor: alpha(COLOR.night, 0.92),
            backdropFilter: 'blur(16px)',
            border: `1px solid ${alpha(COLOR.gold, 0.35)}`,
            borderLeft: `${u(4)}px solid ${COLOR.gold}`,
            borderRadius: u(RADIUS.md),
            padding: `${u(8)}px ${u(16)}px`,
            boxShadow: `0 ${u(10)}px ${u(25)}px ${alpha(COLOR.night, 0.6)}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: u(8) }}>
            <span style={{ fontFamily: FONT.display, fontSize: u(TYPE.town), fontWeight: 900, color: COLOR.gold, letterSpacing: '0.12em' }}>
              APUSH PERIOD 4 &amp; 5
            </span>
            <span style={{ color: alpha(COLOR.onNight, 0.3) }}>·</span>
            <span style={{ fontSize: u(TYPE.body), fontWeight: 800, color: COLOR.onNight }}>
              Continental Expansion (1783–1853)
            </span>
          </div>
        </div>

        {/* Live Cumulative Area Odometer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: u(12),
            backgroundColor: alpha(COLOR.night, 0.92),
            backdropFilter: 'blur(16px)',
            border: `1px solid ${alpha(COLOR.onNight, 0.15)}`,
            borderRadius: u(RADIUS.md),
            padding: `${u(8)}px ${u(16)}px`,
            boxShadow: `0 ${u(10)}px ${u(25)}px ${alpha(COLOR.night, 0.6)}`,
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: u(TYPE.tag), fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.5), letterSpacing: '0.05em' }}>
              U.S. CONTINENTAL LAND AREA
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: u(TYPE.caption), fontWeight: 900, color: COLOR.green }}>
              {totalSqMiles.toLocaleString()}<span style={{ fontSize: u(TYPE.label), fontWeight: 600 }}> sq mi</span>
            </div>
          </div>

          <div style={{ width: 1, height: u(36), backgroundColor: alpha(COLOR.onNight, 0.15) }} />

          <div>
            <div style={{ fontSize: u(TYPE.tag), fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.5) }}>
              CHRONOLOGY
            </div>
            <div style={{ fontFamily: FONT.display, fontSize: u(TYPE.caption), fontWeight: 900, color: COLOR.gold }}>
              {currentTerritory.year}
            </div>
          </div>
        </div>
      </div>

      {/* 5. SLENDER CHRONOLOGICAL TIMELINE STEPPER (Clean top-bar progress, non-intrusive) */}
      <div
        style={{
          position: 'absolute',
          top: u(92),
          left: u(16),
          right: u(16),
          display: 'flex',
          gap: u(6),
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
                padding: `${u(4)}px ${u(8)}px`,
                borderRadius: u(RADIUS.sm),
                backgroundColor: isCurrent
                  ? alpha(COLOR.gold, 0.95)
                  : isReached
                  ? alpha(COLOR.night, 0.88)
                  : alpha(COLOR.night, 0.5),
                border: isCurrent
                  ? `1px solid ${COLOR.gold}`
                  : isReached
                  ? `1px solid ${alpha(COLOR.onNight, 0.2)}`
                  : `1px solid ${alpha(COLOR.onNight, 0.06)}`,
                backdropFilter: 'blur(8px)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: u(TYPE.town),
                  fontFamily: FONT.mono,
                  fontWeight: 800,
                  color: isCurrent ? COLOR.night : isReached ? COLOR.onNight : alpha(COLOR.onNight, 0.4),
                }}
              >
                {t.year}
              </div>
              <div
                style={{
                  fontSize: u(TYPE.tag),
                  fontWeight: 600,
                  color: isCurrent ? COLOR.night : isReached ? alpha(COLOR.onNight, 0.7) : alpha(COLOR.onNight, 0.3),
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
          bottom: u(12),
          left: u(16),
          right: u(16),
          backgroundColor: alpha(COLOR.night, 0.94),
          backdropFilter: 'blur(16px)',
          borderRadius: u(RADIUS.md),
          border: `1px solid ${alpha(COLOR.onNight, 0.12)}`,
          borderLeft: `${u(4)}px solid ${currentTerritory.inkColor}`,
          padding: `${u(10)}px ${u(18)}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
          gap: u(16),
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: u(2), flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: u(10), rowGap: u(2) }}>
            <span
              style={{
                fontFamily: FONT.display,
                fontSize: u(TYPE.label),
                fontWeight: 900,
                color: COLOR.gold,
                letterSpacing: '0.08em',
              }}
            >
              {currentTerritory.year} · {currentTerritory.formalName.toUpperCase()}
            </span>
            <span style={{ color: alpha(COLOR.onNight, 0.3) }}>·</span>
            <span style={{ fontSize: u(TYPE.town), fontFamily: FONT.mono, color: COLOR.onNight }}>
              +{currentTerritory.sqMiles.toLocaleString()} sq mi ({currentTerritory.treaty})
            </span>
          </div>

          <div style={{ fontSize: u(TYPE.label), color: alpha(COLOR.onNight, 0.9), lineHeight: 1.35 }}>
            {currentTerritory.treatyDetail}
          </div>
        </div>

        {/* Sectional Crisis Exam Anchor */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            borderLeft: `1px solid ${alpha(COLOR.onNight, 0.1)}`,
            paddingLeft: u(16),
            minWidth: u(260),
          }}
        >
          <span style={{ fontSize: u(TYPE.tag), fontFamily: FONT.mono, color: COLOR.red, fontWeight: 800 }}>
            APUSH EXAM ESSENTIAL
          </span>
          <span style={{ fontSize: u(TYPE.town), color: alpha(COLOR.onNight, 0.7), textAlign: 'right', lineHeight: 1.3 }}>
            Slavery expansion debate in new federal lands
          </span>
        </div>
      </div>
    </div>
  );
};
