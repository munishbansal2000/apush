import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, staticFile } from 'remotion';
import { ACQUISITIONS, ACQUISITION_LABELS, riverPaths, usProjection, useUsBase, type LonLat } from './geo/usGeo';
import { FORT_CLATSOP, LEWIS_CLARK_ROUTE, LOUISIANA_CITIES, LOUISIANA_EXTENT, polyline, projectAll } from './geo/historicSites';
import { authenticLouisianaMap1803 } from './motionStudioPresets';
import { COLOR, FONT, RADIUS, TYPE, alpha } from '../theme/tokens';

/** URLs, data URIs and already-resolved paths pass through; bare names go through staticFile. */
const resolveSrc = (src: string) =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

export const LouisianaPurchaseMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  // Map sizes are authored for a 1280-wide frame and scale with the composition width.
  const u = (n: number) => n * (width / 1280);
  // One projection for base map, territory, rivers, route and towns: they line up by construction.
  const projection = React.useMemo(() => usProjection(width, height, LOUISIANA_EXTENT, height * 0.1), [width, height]);
  const { base, clipId, path } = useUsBase(projection, 'parchment');
  const territoryD = React.useMemo(() => path(ACQUISITIONS.louisiana) ?? '', [path]);
  const rivers = React.useMemo(() => riverPaths(path, ['Mississippi', 'Missouri']), [path]);
  const route = React.useMemo(() => polyline(projectAll(projection, LEWIS_CLARK_ROUTE)), [projection]);
  const proj = (ll: LonLat): [number, number] => projection(ll) ?? [0, 0];
  // Camera move spans the whole clip (was hard-coded to 180 frames).
  const cameraEnd = Math.max(1, durationInFrames);

  // Cinematic Ken Burns push-in centering on Louisiana territory
  const cameraZoom = interpolate(frame, [0, cameraEnd], [1.01, 1.09], { extrapolateRight: 'clamp' });
  const cameraPanX = interpolate(frame, [0, cameraEnd], [10, -15], { extrapolateRight: 'clamp' }) * (width / 1280);

  // Watercolor paper soak reveal from frame 15 to 65
  const soakProgress = interpolate(frame, [15, 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Lewis & Clark exploratory path animation from frame 70 to 160
  const lewClarkProgress = interpolate(frame, [70, 160], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Smooth land area counter
  const animatedAcreage = Math.round(
    interpolate(frame, [20, 80], [0, 827987], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  const halo = { stroke: alpha(COLOR.paper, 0.9), strokeWidth: u(3), paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };
  const [labelX, labelY] = proj(ACQUISITION_LABELS.louisiana);
  const [clatsopX, clatsopY] = proj(FORT_CLATSOP);
  const [missX, missY] = proj([-91.75, 33.4]);
  const [moX, moY] = proj([-101.3, 45.7]);

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
      {/* 1–3. MAP: vector base + territory + rivers + route + towns in ONE svg, moved together by the camera */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${cameraZoom}) translate(${cameraPanX}px, 0px)`,
          transformOrigin: 'center center',
        }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          {base}
          {/* Optional historical atlas (decorative texture only; overlays align to the vector geography) */}
          {authenticLouisianaMap1803 !== '' && (
            <image href={resolveSrc(authenticLouisianaMap1803)} x={0} y={0} width={width} height={height} preserveAspectRatio="xMidYMid slice"
              opacity={0.14} style={{ mixBlendMode: 'multiply' }} />
          )}
          <defs>
            <filter id={`${clipId}-ink`} x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur stdDeviation={u(0.6)} result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 2. WATERCOLOR INK BLEED: the real 1803 boundary (Mississippi → Continental Divide,
              Adams–Onís line, 49°N), clipped to the US outline for exact coasts and borders */}
          <g clipPath={`url(#${clipId})`} style={{ mixBlendMode: 'multiply' }}>
            <g opacity={soakProgress} filter={`url(#${clipId}-ink)`}>
              <path d={territoryD} fill={alpha(COLOR.amber, 0.42)} stroke={COLOR.brown} strokeWidth={u(1.6)} strokeLinejoin="round" />
              {/* Hand-quill hatched border */}
              <path d={territoryD} fill="none" stroke={COLOR.brown} strokeWidth={u(2.2)} strokeDasharray={`${u(7)} ${u(3.5)}`} opacity={0.85} />
            </g>
          </g>

          {/* Mississippi & Missouri rivers (Natural Earth) */}
          <g fill="none" stroke={COLOR.blue} strokeWidth={u(2)} strokeLinecap="round" strokeLinejoin="round" opacity={0.85}>
            {rivers.map((r, i) => <path key={i} d={r.d} />)}
          </g>
          <text x={missX} y={missY} transform={`rotate(-80, ${missX}, ${missY})`} textAnchor="middle" fill={COLOR.blue} fontSize={u(TYPE.tag)} fontStyle="italic" fontWeight={700} {...halo}>
            Mississippi River
          </text>
          <text x={moX} y={moY} transform={`rotate(60, ${moX}, ${moY})`} textAnchor="middle" fill={COLOR.blue} fontSize={u(TYPE.tag)} fontStyle="italic" fontWeight={700} {...halo}>
            Missouri River
          </text>

          {/* 3. Territory name engraved across the central plains */}
          <g opacity={soakProgress}>
            <text x={labelX} y={labelY} fill={COLOR.ink} fontSize={u(TYPE.place)} fontFamily={FONT.display} fontWeight={900} letterSpacing="0.14em"
              textAnchor="middle" transform={`rotate(-8, ${labelX}, ${labelY})`} {...halo} strokeWidth={u(4)}>
              LOUISIANA PURCHASE
            </text>
            <text x={labelX} y={labelY + u(22)} fill={COLOR.brown} fontSize={u(TYPE.tag)} fontFamily={FONT.mono} fontWeight={700} letterSpacing="0.08em"
              textAnchor="middle" transform={`rotate(-8, ${labelX}, ${labelY + u(22)})`} {...halo}>
              1803 · 828,000 SQ MILES · $15,000,000
            </text>
          </g>

          {/* Lewis & Clark Corps of Discovery Expedition Route (1804–1806): up the Missouri, over the Divide, down the Columbia */}
          <path
            d={route.d}
            fill="none"
            stroke={COLOR.amber}
            strokeWidth={u(3.5)}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - lewClarkProgress}
            style={{ filter: `drop-shadow(0 0 ${u(4)}px ${alpha(COLOR.amber, 0.8)})` }}
          />
          <path
            d={route.d}
            fill="none"
            stroke={COLOR.onNight}
            strokeWidth={u(1.4)}
            pathLength={1}
            strokeDasharray="0.006 0.009"
            strokeDashoffset={-frame * 0.0015}
            opacity={interpolate(lewClarkProgress, [0, 0.05], [0, 0.9], { extrapolateRight: 'clamp' })}
            mask={`url(#${clipId}-route)`}
          />
          <defs>
            {/* white running dashes only along the already-drawn part of the route */}
            <mask id={`${clipId}-route`} maskUnits="userSpaceOnUse" x={-width} y={-height} width={width * 3} height={height * 3}>
              <path d={route.d} fill="none" stroke={COLOR.onNight} strokeWidth={u(6)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lewClarkProgress} />
            </mask>
          </defs>

          {/* Historic towns at their real locations */}
          {LOUISIANA_CITIES.map(c => {
            const [x, y] = proj(c.ll);
            return (
              <g key={c.name} transform={`translate(${x}, ${y})`}>
                <circle r={u(6)} fill={COLOR.amber} stroke={COLOR.ink} strokeWidth={u(1.5)} />
                <text x={u(10)} y={u(5)} fill={COLOR.ink} fontSize={u(TYPE.label)} fontFamily={FONT.display} fontWeight={800} {...halo}>
                  {c.name}
                </text>
                <text x={u(10)} y={u(20)} fill={COLOR.brown} fontSize={u(TYPE.micro)} fontFamily={FONT.mono} fontWeight={700} {...halo}>
                  {c.sub}
                </text>
              </g>
            );
          })}

          {/* Pacific Coast / Fort Clatsop */}
          {lewClarkProgress >= 0.9 && (
            <g transform={`translate(${clatsopX}, ${clatsopY})`}>
              <circle r={u(6)} fill={COLOR.amber} stroke={COLOR.ink} strokeWidth={u(1.5)} />
              <text x={u(8)} y={-u(10)} fill={COLOR.amber} fontSize={u(TYPE.town)} fontFamily={FONT.display} fontWeight={800} {...halo}>
                Fort Clatsop (1805)
              </text>
            </g>
          )}
        </svg>

        {/* Subtle paper vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 50% 50%, ${alpha(COLOR.night, 0)} 55%, ${alpha(COLOR.ink, 0.4)} 100%)`,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* 4. TOP HUD (Pristine, outside map focus) */}
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
        <div
          style={{
            backgroundColor: alpha(COLOR.night, 0.92),
            backdropFilter: 'blur(16px)',
            border: `1px solid ${alpha(COLOR.gold, 0.35)}`,
            borderLeft: `4px solid ${COLOR.gold}`,
            borderRadius: RADIUS.md,
            padding: '8px 16px',
            boxShadow: `0 10px 25px ${alpha(COLOR.night, 0.6)}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: FONT.display, fontSize: TYPE.nano, fontWeight: 900, color: COLOR.gold, letterSpacing: '0.12em' }}>
              APUSH PERIOD 4 · 1803
            </span>
            <span style={{ color: alpha(COLOR.onNight, 0.3) }}>·</span>
            <span style={{ fontSize: TYPE.tag, fontWeight: 800, color: COLOR.onNight }}>
              The Louisiana Purchase
            </span>
          </div>
        </div>

        {/* Financial & Land Metric Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: alpha(COLOR.night, 0.92),
            backdropFilter: 'blur(16px)',
            border: `1px solid ${alpha(COLOR.onNight, 0.15)}`,
            borderRadius: RADIUS.md,
            padding: '8px 16px',
            boxShadow: `0 10px 25px ${alpha(COLOR.night, 0.6)}`,
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.5) }}>
              PRICE
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: TYPE.label, fontWeight: 900, color: COLOR.mintOnNight }}>
              $15,000,000 <span style={{ fontSize: TYPE.nano, color: COLOR.onNightMuted }}>(~3¢/acre)</span>
            </div>
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: alpha(COLOR.onNight, 0.15) }} />

          <div>
            <div style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.5) }}>
              LAND ADDED
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: TYPE.label, fontWeight: 900, color: COLOR.gold }}>
              {animatedAcreage.toLocaleString()} sq mi
            </div>
          </div>
        </div>
      </div>

      {/* 5. CINEMATIC BROADCAST LOWER-THIRD (Clean educational breakdown) */}
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
          borderLeft: `4px solid ${COLOR.amber}`,
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
            <span style={{ fontFamily: FONT.display, fontSize: TYPE.micro, fontWeight: 900, color: COLOR.gold }}>
              CONSTITUTIONAL DILEMMA &amp; GEOGRAPHY
            </span>
            <span style={{ color: alpha(COLOR.onNight, 0.3) }}>·</span>
            <span style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: COLOR.onNight }}>
              828,000 SQ MILES FROM NAPOLEON BONAPARTE
            </span>
          </div>

          <div style={{ fontSize: TYPE.micro, color: alpha(COLOR.onNight, 0.9), lineHeight: 1.35 }}>
            Jefferson, an ardent strict constructionist, compromised his political philosophy by utilizing the President&apos;s treaty-making powers to double the nation and guarantee Western farmers unrestricted Mississippi River trade.
          </div>
        </div>

        <div style={{ minWidth: 150, textAlign: 'right' }}>
          <span style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: COLOR.gold, fontWeight: 800 }}>
            PERIOD 4 · 1800–1848
          </span>
          <div style={{ fontSize: TYPE.nano, color: alpha(COLOR.onNight, 0.6) }}>
            Corps of Discovery (1804–06)
          </div>
        </div>
      </div>
    </div>
  );
};
