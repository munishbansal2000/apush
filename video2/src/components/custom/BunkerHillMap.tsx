import React from 'react';
import { geoPath } from 'd3-geo';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { NEIGHBORS, US_NATION, usProjection, type LonLat } from '../geo/usGeo';
import { FONT, COLOR, TYPE, RADIUS, alpha } from '../../theme/tokens';

export interface Phase { name: string; start: number; end: number } // 0-1 fractions of duration
export interface BunkerHillMapProps {
  durationInFrames: number;
  phases: Phase[];
}

/**
 * BATTLE OF BUNKER HILL — June 17, 1775 (fought mostly on Breed's Hill).
 *
 * Expected phases (fractions of durationInFrames); a missing phase degrades to no motion:
 * - setup    0.00-0.15  Charlestown peninsula map: British hold Boston (red), colonials
 *                       fortify Breed's Hill overnight (blue redoubt markers appear)
 * - assault1 0.15-0.40  first British assault: red wave advances uphill, then recoils — repulsed
 * - assault2 0.40-0.60  second assault: same advance-and-collapse pattern
 * - assault3 0.60-0.85  third assault: wave advances and HOLDS — hill marker flips red,
 *                       colonial blues retreat across Charlestown Neck ("out of powder")
 * - resolve  0.85-1.00  casualty counters — British ~1,054 vs Colonial ~450, "Pyrrhic victory"
 *
 * All animation timing derives from `phases` + `durationInFrames`. No literal frame numbers.
 */

// Key coordinates (LonLat)
const BOSTON: LonLat = [-71.06, 42.36];
const CHARLESTOWN: LonLat = [-71.06, 42.375];
const BUNKER_HILL: LonLat = [-71.071, 42.381];
const BREEDS_HILL: LonLat = [-71.065, 42.376];
const NECK: LonLat = [-71.077, 42.384]; // Charlestown Neck — the only escape route
const LANDING: LonLat = [-71.049, 42.369]; // British boats come ashore near Moulton's Point

// Tight zoom on the Charlestown peninsula / Boston harbor
const EXTENT: [LonLat, LonLat] = [[-71.135, 42.345], [-70.965, 42.415]];

const MYSTIC_RIVER: LonLat[] = [[-71.115, 42.4], [-71.1, 42.395], [-71.085, 42.391], [-71.07, 42.387], [-71.055, 42.381]];
const CHARLES_RIVER: LonLat[] = [[-71.12, 42.351], [-71.105, 42.355], [-71.09, 42.359], [-71.075, 42.364], [-71.058, 42.369]];

const CAPTIONS: Record<string, string> = {
  setup: 'June 16, overnight — colonials entrench a redoubt on Breed\u2019s Hill',
  assault1: 'First assault — British redcoats climb the slope, then recoil under musketry',
  assault2: 'Second assault — again the line wavers and falls back',
  assault3: 'Third assault — colonials out of powder; the hill falls',
  resolve: 'A pyrrhic victory: the British hold the hill at devastating cost',
};

type Pt = [number, number];

/** Screen position + heading (deg) at fraction s along a polyline. */
const trace = (pts: Pt[], s: number): { x: number; y: number; angle: number } => {
  const c = Math.max(0, Math.min(1, s));
  const lens = pts.slice(0, -1).map((p, i) => Math.hypot(pts[i + 1][0] - p[0], pts[i + 1][1] - p[1]));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  let d = c * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const f = lens[i] === 0 ? 0 : d / lens[i];
      const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
      const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
      const angle = (Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]) * 180) / Math.PI;
      return { x, y, angle };
    }
    d -= lens[i];
  }
  return { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1], angle: 0 };
};

/** Wave advance/collapse state from 0-1 phase progress. `sticks=true` holds the hill. */
const waveState = (t: number, sticks: boolean) => {
  const opacity = interpolate(t, [0, 0.08, 0.92, 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  let pos: number;
  if (t < 0.55) pos = t / 0.55; // advance uphill
  else if (sticks) pos = 1; // hold the hill
  else pos = 1 - ((t - 0.55) / 0.4) * 0.85; // recoil toward the water
  // repulsed waves visibly collapse as they fall back
  const collapse = sticks ? 1 : interpolate(t, [0.55, 0.95], [1, 0.35], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return { opacity, pos: Math.max(0, Math.min(1, pos)), collapse };
};

export const BunkerHillMap: React.FC<BunkerHillMapProps> = ({ durationInFrames: propDuration, phases = [
  {name: 'setup', start: 0, end: 0.2},
  {name: 'assault1', start: 0.2, end: 0.4},
  {name: 'assault2', start: 0.4, end: 0.6},
  {name: 'assault3', start: 0.6, end: 0.8},
  {name: 'resolve', start: 0.8, end: 1.0},
] }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames: configDuration } = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  const u = (n: number) => n * (width / 1280);
  const D = Math.max(1, durationInFrames);

  /** 0-1 progress of a named phase; missing/degenerate phase → 0 (graceful no-op). */
  const prog = (name: string): number => {
    const p = phases.find(x => x.name === name);
    if (!p || p.end <= p.start) return 0;
    return interpolate(frame, [p.start * D, p.end * D], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
  };

  const setup = prog('setup');
  const a1 = prog('assault1');
  const a2 = prog('assault2');
  const a3 = prog('assault3');
  const res = prog('resolve');

  const projection = React.useMemo(() => usProjection(width, height, EXTENT, height * 0.04), [width, height]);
  const geo = React.useMemo(() => {
    const path = geoPath(projection);
    const line = (lls: LonLat[]) => `M ${lls.map(ll => (projection(ll) ?? [0, 0]).map(v => v.toFixed(1)).join(' ')).join(' L ')}`;
    return {
      neighbors: NEIGHBORS.features.map(f => path(f) ?? ''),
      nation: path(US_NATION) ?? '',
      mystic: line(MYSTIC_RIVER),
      charles: line(CHARLES_RIVER),
    };
  }, [projection]);

  const at = (ll: LonLat): Pt => (projection(ll) ?? [0, 0]) as Pt;

  // Slow push-in across the whole clip (no literal frames — anchored to D).
  const camZoom = interpolate(frame, [0, D], [1.03, 1.12], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });

  const halo = { stroke: alpha(COLOR.night, 0.92), strokeWidth: u(3.5), paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };

  const [bx, by] = at(BOSTON);
  const [hx, hy] = at(BREEDS_HILL);
  const [khx, khy] = at(BUNKER_HILL);
  const [cx, cy] = at(CHARLESTOWN);

  // Assault route: landing beach → mid-slope → Breed's Hill summit.
  const wavePts: Pt[] = [at(LANDING), at([-71.057, 42.373]), at(BREEDS_HILL)];
  const waveD = `M ${wavePts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L ')}`;
  const retreatPts: Pt[] = [at(BREEDS_HILL), at(BUNKER_HILL), at(NECK)];

  /** British assault wave: 9 redcoats in a wedge + drawn route line. */
  const renderWave = (t: number, sticks: boolean, n: number) => {
    if (t <= 0) return null;
    const { opacity, pos, collapse } = waveState(t, sticks);
    const { x, y, angle } = trace(wavePts, pos);
    // Local frame: +x = heading. col = across the front, row = back along -heading.
    const gap = u(13) * collapse;
    return (
      <g key={n} opacity={opacity}>
        <path d={waveD} fill="none" stroke={COLOR.british} strokeWidth={u(3.5)} strokeLinecap="round"
          pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pos} opacity={0.55} />
        <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
          {Array.from({ length: 9 }).map((_, i) => {
            const col = (i % 3) - 1; const row = Math.floor(i / 3);
            return <circle key={i} cx={-row * gap * 1.15} cy={col * gap}
              r={u(5.5) * collapse} fill={COLOR.british} stroke={COLOR.onNight} strokeWidth={u(1.2)} />;
          })}
          <polygon points={`${u(26)},0 ${u(12)},${u(-9)} ${u(12)},${u(9)}`} fill={COLOR.redOnNight} opacity={0.9} />
        </g>
      </g>
    );
  };

  // Hill control: blue (colonial) crossfades to red (British) once assault 3 takes it.
  const hillRed = interpolate(a3, [0.75, 0.92], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Colonial retreat across Charlestown Neck during assault 3.
  const retT = interpolate(a3, [0.3, 0.95], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const retOp = interpolate(a3, [0.25, 0.4, 0.95, 1], [0, 1, 1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // "REPULSED" stamps for the first two assaults (visible as each wave recoils).
  const repulse = (t: number) =>
    interpolate(t, [0.6, 0.7, 0.88, 0.97], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Casualty count-up during resolve.
  const britLoss = Math.floor(interpolate(res, [0, 0.7], [0, 1054], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const amerLoss = Math.floor(interpolate(res, [0.1, 0.8], [0, 450], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  // Active-phase caption (drives the bottom strip).
  const f = frame / D;
  const activePhase = phases.find(x => f >= x.start && f < x.end) ?? phases[phases.length - 1];
  const caption = activePhase ? CAPTIONS[activePhase.name] ?? '' : '';

  const label = (x: number, y: number, text: string, opts?: { anchor?: 'start' | 'middle' | 'end'; size?: number; color?: string; weight?: number; italic?: boolean }) => (
    <text x={x} y={y} textAnchor={opts?.anchor ?? 'middle'} fontSize={u(opts?.size ?? TYPE.label)}
      fontFamily={FONT.display} fontWeight={opts?.weight ?? 800} fill={opts?.color ?? COLOR.onNight}
      fontStyle={opts?.italic ? 'italic' : 'normal'} {...halo}>{text}</text>
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: COLOR.night, fontFamily: FONT.ui }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${camZoom})`, transformOrigin: 'center center', zIndex: 20 }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={COLOR.nightOcean} />
          {geo.neighbors.map((d, i) => (
            <path key={i} d={d} fill={COLOR.nightPanel} stroke={COLOR.nightCoast} strokeWidth={u(0.8)} vectorEffect="non-scaling-stroke" />
          ))}
          <path d={geo.nation} fill={COLOR.nightLand} stroke={COLOR.nightCoast} strokeWidth={u(1.2)} vectorEffect="non-scaling-stroke" />
          {/* Rivers */}
          <g fill="none" stroke={COLOR.skyOnNight} strokeWidth={u(2.5)} strokeLinecap="round" opacity={0.75} vectorEffect="non-scaling-stroke">
            <path d={geo.mystic} /><path d={geo.charles} />
          </g>
          {label((at([-71.085, 42.394]))[0], (at([-71.085, 42.394]))[1], 'Mystic River', { size: TYPE.tag, italic: true, color: alpha(COLOR.onNight, 0.75), weight: 700 })}
          {label((at([-71.09, 42.356]))[0], (at([-71.09, 42.356]))[1], 'Charles River', { size: TYPE.tag, italic: true, color: alpha(COLOR.onNight, 0.75), weight: 700 })}
          {label((at([-71.0, 42.36]))[0], (at([-71.0, 42.36]))[1], 'Boston Harbor', { size: TYPE.tag, italic: true, color: alpha(COLOR.onNight, 0.6), weight: 700 })}

          {/* British garrison in Boston */}
          <g transform={`translate(${bx}, ${by})`} opacity={interpolate(setup, [0, 0.25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
            <circle r={u(11 + Math.sin(frame * 0.25) * 2)} fill="none" stroke={COLOR.british} strokeWidth={u(2)} opacity={0.7} />
            <circle r={u(8)} fill={COLOR.british} stroke={COLOR.onNight} strokeWidth={u(2)} style={{ filter: `drop-shadow(0 0 ${u(6)}px ${COLOR.british})` }} />
            {label(u(14), u(6), 'Boston — British garrison', { anchor: 'start', size: TYPE.small, color: COLOR.redOnNight })}
          </g>

          {/* Colonial redoubt dug overnight on Breed's Hill */}
          <g opacity={interpolate(setup, [0.3, 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
            <rect x={hx - u(18)} y={hy - u(18)} width={u(36)} height={u(36)} fill={alpha(COLOR.patriot, 0.25)}
              stroke={COLOR.skyOnNight} strokeWidth={u(2)} strokeDasharray={`${u(5)} ${u(4)}`} transform={`rotate(12, ${hx}, ${hy})`} />
            {label(hx, hy - u(30), 'American redoubt', { size: TYPE.micro, color: COLOR.skyOnNight, weight: 900 })}
            {label(hx, hy - u(16), 'dug overnight, June 16', { size: TYPE.nano, color: alpha(COLOR.onNight, 0.7), weight: 700 })}
          </g>

          {/* The two hills — label both (the battle raged on Breed's) */}
          <g opacity={interpolate(setup, [0.1, 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
            <circle cx={khx} cy={khy} r={u(6)} fill={COLOR.patriot} stroke={COLOR.onNight} strokeWidth={u(1.5)} />
            {label(khx - u(12), khy + u(4), 'Bunker Hill', { anchor: 'end', size: TYPE.town, color: alpha(COLOR.onNight, 0.85) })}
            {/* Breed's Hill: colonial blue crossfades to British red in assault 3 */}
            <circle cx={hx} cy={hy} r={u(10)} fill={COLOR.patriot} stroke={COLOR.onNight} strokeWidth={u(2.5)}
              opacity={1 - hillRed} style={{ filter: `drop-shadow(0 0 ${u(6)}px ${COLOR.skyOnNight})` }} />
            <circle cx={hx} cy={hy} r={u(10)} fill={COLOR.british} stroke={COLOR.onNight} strokeWidth={u(2.5)}
              opacity={hillRed} style={{ filter: `drop-shadow(0 0 ${u(8)}px ${COLOR.british})` }} />
            {label(hx + u(16), hy - u(2), "Breed's Hill", { anchor: 'start', size: TYPE.label, color: hillRed > 0.5 ? COLOR.redOnNight : COLOR.skyOnNight, weight: 900 })}
            {label(hx + u(16), hy + u(16), 'most fighting here', { anchor: 'start', size: TYPE.micro, color: alpha(COLOR.onNight, 0.65), weight: 700 })}
          </g>

          {label(cx + u(12), cy + u(26), 'Charlestown', { anchor: 'start', size: TYPE.small, color: alpha(COLOR.onNight, 0.7) })}

          {/* Assault waves */}
          {renderWave(a1, false, 1)}
          {renderWave(a2, false, 2)}
          {renderWave(a3, true, 3)}

          {/* REPULSED stamps */}
          <g opacity={repulse(a1)}>
            {label(hx, hy + u(52), 'REPULSED', { size: TYPE.h3, color: COLOR.skyOnNight, weight: 900 })}
          </g>
          <g opacity={repulse(a2)}>
            {label(hx, hy + u(52), 'REPULSED', { size: TYPE.h3, color: COLOR.skyOnNight, weight: 900 })}
          </g>

          {/* Out of powder chip (assault 3) */}
          <g opacity={interpolate(a3, [0.45, 0.55, 0.95, 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
            transform={`translate(${hx + u(16)}, ${hy + u(40)})`}>
            <rect x={-u(8)} y={-u(14)} width={u(196)} height={u(24)} rx={RADIUS.sm} fill={alpha(COLOR.night, 0.92)} stroke={COLOR.amber} strokeWidth={u(1.5)} />
            <text x={u(90)} y={u(3)} textAnchor="middle" fontSize={u(TYPE.tag)} fontFamily={FONT.ui} fontWeight={900} fill={COLOR.amber} letterSpacing={1}>
              AMERICANS OUT OF POWDER
            </text>
          </g>

          {/* Colonial retreat across Charlestown Neck */}
          <g opacity={retOp}>
            {trace(retreatPts, retT).x > 0 && [0, 1, 2].map(i => {
              const p = trace(retreatPts, Math.max(0, retT - i * 0.04));
              return <circle key={i} cx={p.x} cy={p.y} r={u(6)} fill={COLOR.patriot} stroke={COLOR.onNight} strokeWidth={u(1.5)} opacity={1 - i * 0.25} />;
            })}
            {retT > 0.7 && label((at(NECK))[0], (at(NECK))[1] + u(24), 'retreat across Charlestown Neck', { size: TYPE.tag, color: COLOR.skyOnNight, weight: 700 })}
          </g>

          {/* Resolve: casualty counters */}
          {res > 0 && (
            <g opacity={interpolate(res, [0, 0.15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
              transform={`translate(${width / 2}, ${height * 0.62})`}>
              <rect x={-u(250)} y={-u(78)} width={u(500)} height={u(156)} rx={RADIUS.lg}
                fill={alpha(COLOR.night, 0.94)} stroke={alpha(COLOR.gold, 0.6)} strokeWidth={u(2)} />
              <text x={0} y={-u(50)} textAnchor="middle" fontSize={u(TYPE.micro)} fontFamily={FONT.mono} fontWeight={800}
                fill={COLOR.gold} letterSpacing={3}>CASUALTIES · A PYRRHIC VICTORY</text>
              <text x={-u(120)} y={u(12)} textAnchor="middle" fontSize={u(TYPE.display - 24)} fontFamily={FONT.mono}
                fontWeight={900} fill={COLOR.redOnNight} {...halo}>{britLoss.toLocaleString('en-US')}</text>
              <text x={-u(120)} y={u(40)} textAnchor="middle" fontSize={u(TYPE.tag)} fontFamily={FONT.ui} fontWeight={700}
                fill={alpha(COLOR.onNight, 0.8)}>BRITISH killed &amp; wounded</text>
              <text x={u(120)} y={u(12)} textAnchor="middle" fontSize={u(TYPE.display - 24)} fontFamily={FONT.mono}
                fontWeight={900} fill={COLOR.skyOnNight} {...halo}>{amerLoss.toLocaleString('en-US')}</text>
              <text x={u(120)} y={u(40)} textAnchor="middle" fontSize={u(TYPE.tag)} fontFamily={FONT.ui} fontWeight={700}
                fill={alpha(COLOR.onNight, 0.8)}>COLONIAL killed &amp; wounded</text>
            </g>
          )}
        </svg>
      </div>

      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 21,
        background: `radial-gradient(ellipse at 50% 50%, ${alpha(COLOR.night, 0)} 45%, ${alpha(COLOR.night, 0.72)} 100%)` }} />

      {/* Top HUD */}
      <div style={{ position: 'absolute', top: 14, left: 16, zIndex: 40, pointerEvents: 'none',
        backgroundColor: alpha(COLOR.night, 0.94), border: `1px solid ${alpha(COLOR.amber, 0.45)}`,
        borderLeft: `4px solid ${COLOR.amber}`, borderRadius: RADIUS.md, padding: '8px 16px' }}>
        <span style={{ fontFamily: FONT.display, fontSize: TYPE.nano, fontWeight: 900, color: COLOR.amber, letterSpacing: '0.12em' }}>
          APUSH PERIOD 3 · JUNE 17, 1775
        </span>
        <span style={{ color: alpha(COLOR.onNight, 0.3) }}> · </span>
        <span style={{ fontSize: TYPE.tag, fontWeight: 800, color: COLOR.onNight }}>
          Battle of Bunker Hill (fought on Breed&rsquo;s Hill)
        </span>
      </div>

      {/* Bottom phase caption */}
      {caption !== '' && (
        <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16, zIndex: 40, pointerEvents: 'none',
          backgroundColor: alpha(COLOR.night, 0.94), border: `1px solid ${alpha(COLOR.onNight, 0.12)}`,
          borderLeft: `4px solid ${COLOR.skyOnNight}`, borderRadius: RADIUS.md, padding: '10px 18px' }}>
          <span style={{ fontFamily: FONT.display, fontSize: TYPE.small, fontWeight: 800, color: COLOR.onNight }}>{caption}</span>
        </div>
      )}
    </div>
  );
};
