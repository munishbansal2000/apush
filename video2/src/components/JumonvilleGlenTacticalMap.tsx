import React from 'react';
import { geoPath } from 'd3-geo';
import { useCurrentFrame, useVideoConfig, interpolate, Easing, staticFile } from 'remotion';
import { NEIGHBORS, US_NATION, US_STATE_LINES, riverPaths, usProjection, type LonLat } from './geo/usGeo';
import {
  GREAT_MEADOWS,
  HALF_KING_CAMP,
  JUMONVILLE_GLEN,
  OHIO_COUNTRY_EXTENT,
  OHIO_COUNTRY_SITES,
  OHIO_RIVERS,
  OHIO_RIVER_LABELS,
  SENECA_BLOCK,
  SENECA_PINCER,
  WASHINGTON_LINE,
  WASHINGTON_MARCH,
  jumonvilleCamera,
} from './geo/historicSites';
import { jumonvilleMapAsset } from './motionStudioPresets';
import { FONT, COLOR, TYPE, RADIUS, alpha } from '../theme/tokens';

/** URLs, data URIs and already-resolved paths pass through; bare names go through staticFile. */
const resolveSrc = (src: string) =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

const SIDE_COLOR = { french: COLOR.red, british: COLOR.skyOnNight, native: COLOR.amber } as const;
/** Dark base palette (same tones as usGeo's 'dark'), with non-scaling strokes for the zoom. */
const BASE = { ocean: COLOR.night, neighbor: COLOR.nightPanel, land: alpha(COLOR.onNight, 0.12), state: alpha(COLOR.paperDeep, 0.28), coast: COLOR.onNightMuted };

export const JumonvilleGlenTacticalMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  // Map sizes are authored for a 1280-wide frame and scale with the composition width.
  const u = (n: number) => n * (width / 1280);
  // Camera move spans the whole clip (was hard-coded to 180 frames).
  const cameraEnd = Math.max(1, durationInFrames);

  // One projection (fitted to the Ohio Country) for base, rivers, forts and units. The zoom into the
  // glen is an SVG transform of that projection, so everything stays aligned at every frame.
  const projection = React.useMemo(() => usProjection(width, height, OHIO_COUNTRY_EXTENT, height * 0.06), [width, height]);
  const geo = React.useMemo(() => {
    const path = geoPath(projection);
    return {
      neighbors: NEIGHBORS.features.map(f => path(f) ?? ''),
      nation: path(US_NATION) ?? '',
      states: path(US_STATE_LINES) ?? '',
      rivers: riverPaths(path, OHIO_RIVERS),
    };
  }, [projection]);

  // Camera zoom and tactical pan
  const cameraZoom = interpolate(frame, [0, cameraEnd], [1.02, 1.12], { extrapolateRight: 'clamp' });
  const cameraPanX = interpolate(frame, [0, cameraEnd], [10, -20], { extrapolateRight: 'clamp' }) * (width / 1280);

  // Strategic → tactical zoom: Ohio Country (forts, rivers) → Great Meadows / Jumonville Glen.
  const zoomT = interpolate(frame, [20, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const cam = jumonvilleCamera(projection, width, height, zoomT);
  const at = (ll: LonLat): [number, number] => cam.toScreen(projection(ll) ?? [0, 0]);
  const line = (lls: LonLat[]) => lls.map((ll, i) => `${i ? 'L' : 'M'} ${at(ll).map(v => v.toFixed(1)).join(' ')}`).join(' ');
  const regionalFade = interpolate(zoomT, [0.15, 0.55], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tacticalFade = interpolate(zoomT, [0.6, 0.95], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Tactical advancement phases:
  const marchProgress = interpolate(frame, [10, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pincerProgress = interpolate(frame, [45, 95], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const isGunfireActive = frame >= 85 && frame <= 135;
  const gunflashR = isGunfireActive ? Math.sin((frame - 85) * 0.45) * 4 + 5 : 0;

  const halo = { stroke: alpha(COLOR.night, 0.92), strokeWidth: u(3.5), paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };
  const [glenX, glenY] = at(JUMONVILLE_GLEN);
  const [gmX, gmY] = at(GREAT_MEADOWS);
  const [wX, wY] = at(WASHINGTON_LINE);
  const [sX, sY] = at(SENECA_BLOCK);
  const [hkX, hkY] = at(HALF_KING_CAMP);
  // 1-mile scale bar at the glen's latitude
  const mileDeg = 1.609 / (111.32 * Math.cos((JUMONVILLE_GLEN[1] * Math.PI) / 180));
  const milePx = Math.abs(at([JUMONVILLE_GLEN[0] + mileDeg, JUMONVILLE_GLEN[1]])[0] - glenX);

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
      {/* 1 & 3. MAP + TACTICAL OVERLAY in ONE svg, moved together by the camera */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${cameraZoom}) translate(${cameraPanX}px, 0px)`,
          transformOrigin: 'center center',
          zIndex: 20,
        }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={BASE.ocean} />
          {/* Vector geography (projected once; zoom = SVG transform with non-scaling strokes) */}
          <g transform={cam.transform}>
            {geo.neighbors.map((d, i) => (
              <path key={i} d={d} fill={BASE.neighbor} stroke={BASE.coast} strokeWidth={u(0.8)} vectorEffect="non-scaling-stroke" />
            ))}
            <path d={geo.nation} fill={BASE.land} stroke={BASE.coast} strokeWidth={u(1.2)} vectorEffect="non-scaling-stroke" />
            <path d={geo.states} fill="none" stroke={BASE.state} strokeWidth={u(1)} strokeDasharray={`${u(6)} ${u(4)}`} vectorEffect="non-scaling-stroke" />
            <g fill="none" stroke={alpha(COLOR.skyOnNight, 0.8)} strokeLinecap="round" strokeLinejoin="round">
              {geo.rivers.map((r, i) => (
                <path key={i} d={r.d} strokeWidth={u(r.name === 'Ohio' ? 3 : 2.2)} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          </g>
          {/* Optional raster (decorative texture only; overlays align to the vector geography) */}
          {jumonvilleMapAsset !== '' && (
            <image href={resolveSrc(jumonvilleMapAsset)} x={0} y={0} width={width} height={height} preserveAspectRatio="xMidYMid slice" opacity={0.1} style={{ mixBlendMode: 'screen' }} />
          )}

          {/* STRATEGIC LAYER: the contested Ohio Country, 1754 (fades as the camera dives in) */}
          <g opacity={regionalFade}>
            {OHIO_RIVER_LABELS.map(r => {
              const [x, y] = at(r.ll);
              return (
                <text key={r.name} x={x} y={y} transform={`rotate(${r.angle}, ${x}, ${y})`} textAnchor="middle" fill={COLOR.onNight} fontSize={u(TYPE.tag)} fontStyle="italic" fontWeight={700} {...halo}>
                  {r.name}
                </text>
              );
            })}
            {OHIO_COUNTRY_SITES.map(s => {
              const [x, y] = at(s.ll);
              const left = s.name === 'Logstown';
              return (
                <g key={s.name} transform={`translate(${x}, ${y})`}>
                  {s.side === 'french' ? (
                    <rect x={-u(6)} y={-u(6)} width={u(12)} height={u(12)} fill={SIDE_COLOR[s.side]} stroke={COLOR.onNight} strokeWidth={u(1.5)} />
                  ) : (
                    <circle r={u(6)} fill={SIDE_COLOR[s.side]} stroke={COLOR.onNight} strokeWidth={u(1.5)} />
                  )}
                  <text x={left ? -u(11) : u(11)} y={u(1)} textAnchor={left ? 'end' : 'start'} fill={COLOR.onNight} fontSize={u(TYPE.town)} fontFamily={FONT.display} fontWeight={800} {...halo}>
                    {s.name}
                  </text>
                  <text x={left ? -u(11) : u(11)} y={u(16)} textAnchor={left ? 'end' : 'start'} fill={COLOR.onNight} fontSize={u(TYPE.micro)} fontFamily={FONT.mono} {...halo}>
                    {s.sub}
                  </text>
                </g>
              );
            })}
            {/* target: the glen */}
            <circle cx={glenX} cy={glenY} r={u(14 + Math.sin(frame * 0.3) * 3)} fill="none" stroke={COLOR.red} strokeWidth={u(2)} />
            <text x={glenX - u(14)} y={glenY + u(24)} textAnchor="end" fill={COLOR.onNight} fontSize={u(TYPE.small)} fontFamily={FONT.display} fontWeight={900} {...halo}>
              Jumonville Glen
            </text>
          </g>

          {/* TACTICAL LAYER: May 28, 1754, placed relative to the real glen and Great Meadows */}
          {/* Topographic Ravine Basin (Jumonville Depression) */}
          <g opacity={tacticalFade}>
            <ellipse cx={glenX} cy={glenY} rx={u(95)} ry={u(60)} fill={alpha(COLOR.red, 0.14)} stroke={alpha(COLOR.red, 0.5)} strokeWidth={u(1.5)} strokeDasharray={`${u(6)} ${u(5)}`} />
            <text x={glenX} y={glenY + u(92)} fill={alpha(COLOR.onNight, 0.95)} fontSize={u(TYPE.small)} fontFamily={FONT.display} fontWeight={800} textAnchor="middle" {...halo}>
              JUMONVILLE RAVINE BASIN
            </text>
            {/* Half-King's camp */}
            <circle cx={hkX} cy={hkY} r={u(5)} fill={COLOR.amber} stroke={COLOR.onNight} strokeWidth={u(1.2)} />
            <text x={hkX + u(9)} y={hkY - u(6)} fill={COLOR.gold} fontSize={u(TYPE.tag)} fontWeight={700} {...halo}>
              Half-King&apos;s Camp
            </text>
            {/* 1-mile scale */}
            <g transform={`translate(${u(40)}, ${height - u(150)})`}>
              <line x1={0} y1={0} x2={milePx} y2={0} stroke={COLOR.onNight} strokeWidth={u(2)} />
              <line x1={0} y1={-u(5)} x2={0} y2={u(5)} stroke={COLOR.onNight} strokeWidth={u(2)} />
              <line x1={milePx} y1={-u(5)} x2={milePx} y2={u(5)} stroke={COLOR.onNight} strokeWidth={u(2)} />
              <text x={milePx / 2} y={-u(9)} textAnchor="middle" fill={COLOR.onNight} fontSize={u(TYPE.tag)} fontFamily={FONT.mono} {...halo}>
                1 mile
              </text>
            </g>
          </g>

          {/* Washington's Provincial Line of Advance (Blue): Great Meadows → crest above the glen */}
          <path
            d={line(WASHINGTON_MARCH)}
            fill="none"
            stroke={COLOR.skyOnNight}
            strokeWidth={u(4)}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - marchProgress}
            style={{ filter: `drop-shadow(0 0 ${u(5)}px ${COLOR.skyOnNight})` }}
          />

          {/* Tanacharison Seneca Pincer Vector (Amber): Half-King's camp → around the west of the glen */}
          <path
            d={line(SENECA_PINCER)}
            fill="none"
            stroke={COLOR.amber}
            strokeWidth={u(4)}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - pincerProgress}
            style={{ filter: `drop-shadow(0 0 ${u(5)}px ${COLOR.amber})` }}
          />

          {/* Unit Pins & Labels */}
          {/* 1. Great Meadows Base Camp */}
          <g transform={`translate(${gmX}, ${gmY})`}>
            <circle r={u(7)} fill={COLOR.skyOnNight} stroke={COLOR.onNight} strokeWidth={u(2)} />
            <text x={0} y={u(26)} fill={COLOR.onNight} fontSize={u(TYPE.town)} fontWeight={700} textAnchor="middle" {...halo} opacity={Math.max(tacticalFade, 1 - regionalFade)}>
              Great Meadows (Camp)
            </text>
          </g>

          {/* 2. Washington's Provincial Firing Line on the rocky crest east of the glen */}
          {marchProgress >= 0.7 && (
            <g transform={`translate(${wX}, ${wY})`} opacity={tacticalFade}>
              <circle r={u(9)} fill={COLOR.skyOnNight} stroke={COLOR.onNight} strokeWidth={u(2.5)} style={{ filter: `drop-shadow(0 0 ${u(5)}px ${COLOR.skyOnNight})` }} />
              <text x={u(15)} y={u(2)} fill={COLOR.skyOnNight} fontSize={u(TYPE.label)} fontWeight={900} textAnchor="start" fontFamily={FONT.display} {...halo}>
                WASHINGTON · 40 VIRGINIANS
              </text>
              <text x={u(15)} y={u(18)} fill={COLOR.onNight} fontSize={u(TYPE.micro)} textAnchor="start" fontFamily={FONT.mono} {...halo}>
                High Rocky Crest · Musket Line
              </text>
            </g>
          )}

          {/* 3. Tanacharison Seneca Ambush Flank */}
          {pincerProgress >= 0.7 && (
            <g transform={`translate(${sX}, ${sY})`} opacity={tacticalFade}>
              <circle r={u(9)} fill={COLOR.amber} stroke={COLOR.onNight} strokeWidth={u(2.5)} style={{ filter: `drop-shadow(0 0 ${u(5)}px ${COLOR.amber})` }} />
              <text x={-u(60)} y={u(8)} fill={COLOR.gold} fontSize={u(TYPE.label)} fontWeight={900} textAnchor="end" fontFamily={FONT.display} {...halo}>
                HALF-KING · SENECA WARRIORS
              </text>
              <text x={-u(60)} y={u(24)} fill={COLOR.onNight} fontSize={u(TYPE.micro)} textAnchor="end" fontFamily={FONT.mono} {...halo}>
                Escape Ravine Blockade
              </text>
            </g>
          )}

          {/* 4. French Camp in the Hollow (at the glen) */}
          <g transform={`translate(${glenX}, ${glenY})`}>
            <circle r={u(10)} fill={COLOR.red} stroke={COLOR.onNight} strokeWidth={u(2.5)} style={{ filter: `drop-shadow(0 0 ${u(6)}px ${COLOR.red})` }} />
            <g opacity={tacticalFade}>
              <text x={u(8)} y={u(50)} fill={COLOR.onNight} fontSize={u(TYPE.town)} fontWeight={900} textAnchor="end" fontFamily={FONT.display} {...halo}>
                JUMONVILLE FRENCH DETACHMENT
              </text>
              <text x={u(8)} y={u(66)} fill={COLOR.onNight} fontSize={u(TYPE.micro)} textAnchor="end" fontFamily={FONT.mono} {...halo}>
                35 Troops Trapped in Rock Shelter
              </text>
            </g>

            {/* Gunfire Clash Animation */}
            {isGunfireActive && (
              <g>
                <circle r={u(gunflashR * 4)} fill={alpha(COLOR.gold, 0.85)} style={{ filter: `drop-shadow(0 0 ${u(10)}px ${COLOR.amber})` }} />
                <text y={-u(60)} fill={COLOR.gold} fontSize={u(TYPE.body)} fontFamily={FONT.display} fontWeight={900} textAnchor="middle" {...halo}>
                  💥 FIRST SHOTS FIRED!
                </text>
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* Atmospheric dark ravine vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, ${alpha(COLOR.night, 0)} 45%, ${alpha(COLOR.night, 0.7)} 100%)`,
          pointerEvents: 'none',
          zIndex: 21,
        }}
      />

      {/* 2. TOP MILITARY RECONNAISSANCE HUD */}
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
        {/* Left Mission Header */}
        <div
          style={{
            backgroundColor: alpha(COLOR.night, 0.94),
            backdropFilter: 'blur(16px)',
            border: `1px solid ${alpha(COLOR.amber, 0.45)}`,
            borderLeft: `4px solid ${COLOR.amber}`,
            borderRadius: RADIUS.md,
            padding: '8px 16px',
            boxShadow: `0 10px 25px ${alpha(COLOR.night, 0.6)}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: FONT.display, fontSize: TYPE.nano, fontWeight: 900, color: COLOR.amber, letterSpacing: '0.12em' }}>
              APUSH PERIOD 3 · MAY 28, 1754
            </span>
            <span style={{ color: alpha(COLOR.onNight, 0.3) }}>·</span>
            <span style={{ fontSize: TYPE.tag, fontWeight: 800, color: COLOR.onNight }}>
              Battle of Jumonville Glen (Tactical Assault)
            </span>
          </div>
        </div>

        {/* Right HUD: Military Timeline & Clock */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            backgroundColor: alpha(COLOR.night, 0.94),
            backdropFilter: 'blur(16px)',
            border: `1px solid ${alpha(COLOR.onNight, 0.15)}`,
            borderRadius: RADIUS.md,
            padding: '8px 16px',
            boxShadow: `0 10px 25px ${alpha(COLOR.night, 0.6)}`,
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.5) }}>
              TACTICAL TIME
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: TYPE.town, fontWeight: 900, color: COLOR.gold }}>
              07:15 AM <span style={{ fontSize: TYPE.nano, color: COLOR.onNightMuted }}>(Dawn)</span>
            </div>
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: alpha(COLOR.onNight, 0.15) }} />

          <div>
            <div style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.5) }}>
              OUTCOME
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: TYPE.town, fontWeight: 900, color: COLOR.red }}>
              10 Dead · 21 Captured
            </div>
          </div>
        </div>
      </div>

      {/* 4. CINEMATIC BOTTOM BROADCAST STRIP */}
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
              HORACE WALPOLE (BRITISH STATESMAN):
            </span>
            <span style={{ fontSize: TYPE.micro, fontStyle: 'italic', color: COLOR.onNight }}>
              &ldquo;A volley fired by a young Virginian in the backwoods of America set the world on fire.&rdquo;
            </span>
          </div>

          <div style={{ fontSize: TYPE.micro, color: alpha(COLOR.onNight, 0.9), lineHeight: 1.35 }}>
            <strong>Causal Chain:</strong> Jumonville Glen ➔ Seven Years&apos; War (1754–1763) ➔ British Imperial Debt doubles (£133M) ➔ End of Salutary Neglect ➔ Stamp Act &amp; Revolution.
          </div>
        </div>

        <div style={{ minWidth: 150, textAlign: 'right' }}>
          <span style={{ fontSize: TYPE.nano, fontFamily: FONT.mono, color: COLOR.gold, fontWeight: 800 }}>
            PERIOD 3 · 1754–1763
          </span>
          <div style={{ fontSize: TYPE.nano, color: alpha(COLOR.onNight, 0.6) }}>
            French &amp; Indian War Spark
          </div>
        </div>
      </div>
    </div>
  );
};
