import React from 'react';
import { geoPath } from 'd3-geo';
import { useCurrentFrame, useVideoConfig, interpolate, Easing, spring } from 'remotion';
import { NEIGHBORS, US_NATION, US_STATE_LINES, riverPaths, usProjection, type LonLat } from '../geo/usGeo';
import { FONT, COLOR, TYPE, RADIUS, SHADOW, alpha } from '../../theme/tokens';

export interface Phase { name: string; start: number; end: number } // 0-1 fractions of duration
export interface TrentonPrincetonMapProps {
  durationInFrames?: number;
  phases: Phase[];
}

// Trenton & Princeton campaign, Dec 1776 – Jan 1777 (LonLat)
const CROSSING: LonLat = [-74.87, 40.32]; // McConkey's Ferry, PA side
const CROSSING_EAST: LonLat = [-74.84, 40.32]; // NJ landing side
const TRENTON: LonLat = [-74.76, 40.22];
const PRINCETON: LonLat = [-74.66, 40.36];
const EXTENT: [LonLat, LonLat] = [
  [-75.2, 40.02],
  [-74.4, 40.56],
];

const DEFAULT_PHASES: Phase[] = [
  { name: 'setup', start: 0, end: 0.15 },
  { name: 'crossing', start: 0.15, end: 0.4 },
  { name: 'trenton', start: 0.4, end: 0.6 },
  { name: 'princeton', start: 0.6, end: 0.85 },
  { name: 'resolve', start: 0.85, end: 1 },
];

/** Deterministic pseudo-random from a seed (stable across frames). */
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const TrentonPrincetonMap: React.FC<TrentonPrincetonMapProps> = ({
  durationInFrames: propDuration,
  phases,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames: configDuration } = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  const total = Math.max(1, durationInFrames);
  const u = (n: number) => n * (width / 1280);

  const find = React.useCallback(
    (name: string) => phases.find(p => p.name === name) ?? DEFAULT_PHASES.find(p => p.name === name)!,
    [phases]
  );
  /** local 0-1 progress inside a named phase */
  const t = React.useCallback(
    (name: string) =>
      interpolate(frame, [find(name).start * total, find(name).end * total], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
      }),
    [frame, total, find]
  );

  const projection = React.useMemo(() => usProjection(width, height, EXTENT, height * 0.08), [width, height]);
  const geo = React.useMemo(() => {
    const path = geoPath(projection);
    return {
      neighbors: NEIGHBORS.features.map(f => path(f) ?? ''),
      nation: path(US_NATION) ?? '',
      states: path(US_STATE_LINES) ?? '',
      delaware: riverPaths(path, ['Delaware']),
    };
  }, [projection]);

  const at = (ll: LonLat): [number, number] => projection(ll) ?? [0, 0];
  const line = (lls: LonLat[]) => lls.map((ll, i) => `${i ? 'L' : 'M'} ${at(ll).map(v => v.toFixed(1)).join(' ')}`).join(' ');
  const halo = { stroke: alpha(COLOR.night, 0.92), strokeWidth: u(3.5), paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };

  const crossingT = t('crossing');
  const trentonT = t('trenton');
  const princetonT = t('princeton');
  const resolveT = spring({ frame, fps: 30, from: 0, to: find('resolve').start * total <= frame ? 1 : 0, config: { damping: 14, stiffness: 120 } });

  const [cx, cy] = at(CROSSING);
  const [tx, ty] = at(TRENTON);
  const [px, py] = at(PRINCETON);

  // Hessian marker collapse (springy defeat at Trenton)
  const hessianScale = interpolate(trentonT, [0.35, 0.75], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const trentonFlash = Math.max(0, Math.sin(trentonT * Math.PI)) * (1 - Math.abs(trentonT - 0.5) * 1.4);
  const princetonFlash = Math.max(0, Math.sin(princetonT * Math.PI)) * (1 - Math.abs(princetonT - 0.5) * 1.4);

  // Snow particles: fall during crossing phase only
  const snow = React.useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        x: rand(i * 3.1) * width,
        speed: 0.6 + rand(i * 7.7) * 1.4,
        drift: (rand(i * 5.3) - 0.5) * 40,
        r: u(1 + rand(i * 9.2) * 2.2),
        seed: i * 13.7,
      })),
    [width]
  );
  const crossingSpan = find('crossing').end * total - find('crossing').start * total;
  const snowFall = (s: (typeof snow)[number]) => {
    const local = Math.max(0, frame - find('crossing').start * total);
    const y = (s.seed * 47 + local * s.speed * u(1)) % (height + u(20)) - u(10);
    const x = s.x + s.drift * Math.sin((local + s.seed) * 0.03);
    return { x, y };
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: COLOR.night, fontFamily: FONT.ui }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={COLOR.nightOcean} />
          {geo.neighbors.map((d, i) => (
            <path key={i} d={d} fill={COLOR.nightPanel} stroke={alpha(COLOR.nightCoast, 0.6)} strokeWidth={u(0.8)} />
          ))}
          <path d={geo.nation} fill={COLOR.nightLand} stroke={COLOR.nightCoast} strokeWidth={u(1.2)} />
          <path d={geo.states} fill="none" stroke={alpha(COLOR.onNight, 0.22)} strokeWidth={u(1)} strokeDasharray={`${u(6)} ${u(4)}`} />
          {/* Delaware River — glowing night thread */}
          <g fill="none" stroke={COLOR.skyOnNight} strokeLinecap="round">
            {geo.delaware.map((r, i) => (
              <g key={i}>
                <path d={r.d} strokeWidth={u(7)} opacity={0.18} />
                <path d={r.d} strokeWidth={u(3)} opacity={0.75} />
              </g>
            ))}
          </g>
          <text x={cx - u(70)} y={cy + u(90)} fill={alpha(COLOR.skyOnNight, 0.85)} fontSize={u(TYPE.tag)} fontStyle="italic" fontFamily={FONT.text} {...halo}>
            Delaware River
          </text>

          {/* SETUP: night positions */}
          <g opacity={1}>
            {/* American position, PA side */}
            <g transform={`translate(${cx - u(46)}, ${cy - u(30)})`}>
              <circle r={u(9)} fill={COLOR.skyOnNight} stroke={COLOR.onNight} strokeWidth={u(2)} style={{ filter: `drop-shadow(0 0 ${u(6)}px ${COLOR.skyOnNight})` }} />
              <text x={-u(16)} y={u(2)} textAnchor="end" fill={COLOR.skyOnNight} fontSize={u(TYPE.town)} fontWeight={800} fontFamily={FONT.display} {...halo}>
                WASHINGTON
              </text>
              <text x={-u(16)} y={u(17)} textAnchor="end" fill={COLOR.onNight} fontSize={u(TYPE.micro)} fontFamily={FONT.mono} {...halo}>
                2,400 Continentals · PA shore
              </text>
            </g>
            {/* Hessian / British garrison at Trenton */}
            <g transform={`translate(${tx}, ${ty}) scale(${Math.max(0.001, hessianScale)})`}>
              <rect x={-u(8)} y={-u(8)} width={u(16)} height={u(16)} fill={COLOR.red} stroke={COLOR.onNight} strokeWidth={u(2)} transform="rotate(45)" style={{ filter: `drop-shadow(0 0 ${u(6)}px ${COLOR.red})` }} />
              <text x={u(16)} y={u(2)} fill={COLOR.redOnNight} fontSize={u(TYPE.town)} fontWeight={800} fontFamily={FONT.display} {...halo}>
                RALL · HESSIANS
              </text>
              <text x={u(16)} y={u(17)} fill={COLOR.onNight} fontSize={u(TYPE.micro)} fontFamily={FONT.mono} {...halo}>
                Trenton garrison
              </text>
            </g>
            {/* town pins */}
            <g transform={`translate(${px}, ${py})`}>
              <circle r={u(6)} fill="none" stroke={COLOR.onNightMuted} strokeWidth={u(1.5)} />
              <text x={u(12)} y={u(2)} fill={COLOR.onNightMuted} fontSize={u(TYPE.town)} fontWeight={700} fontFamily={FONT.display} {...halo}>
                Princeton
              </text>
            </g>
          </g>

          {/* CROSSING: stylized blue boats across the river */}
          {crossingT > 0 && (
            <g>
              <path d={line([CROSSING, CROSSING_EAST])} fill="none" stroke={COLOR.skyOnNight} strokeWidth={u(4)} strokeLinecap="round" strokeDasharray={`${u(10)} ${u(8)}`} opacity={0.9} style={{ filter: `drop-shadow(0 0 ${u(6)}px ${COLOR.skyOnNight})` }} />
              {[0, 0.25, 0.5, 0.75, 1].map(i => {
                const along = Math.min(1, crossingT * 1.25 - i * 0.05);
                if (along <= 0) return null;
                const lx = cx + (at(CROSSING_EAST)[0] - cx) * along;
                const ly = cy + (at(CROSSING_EAST)[1] - cy) * along + Math.sin(along * Math.PI * 3) * u(4);
                return (
                  <g key={i} transform={`translate(${lx}, ${ly})`} opacity={0.6 + along * 0.4}>
                    <path d={`M ${-u(7)} 0 L ${u(7)} 0 L ${u(3)} ${u(6)} L ${-u(3)} ${u(6)} Z`} fill={COLOR.skyOnNight} stroke={COLOR.onNight} strokeWidth={u(1.2)} />
                    <circle cx={-u(2)} cy={u(2.5)} r={u(1.4)} fill={COLOR.night} />
                    <circle cx={u(2)} cy={u(2.5)} r={u(1.4)} fill={COLOR.night} />
                  </g>
                );
              })}
              {/* ice floe texture dots */}
              {[0.3, 0.7].map(i => (
                <g key={i} opacity={crossingT * 0.8}>
                  {Array.from({ length: 9 }, (_, k) => {
                    const lx = cx - u(50) + rand(i * 100 + k) * u(160);
                    const ly = cy - u(40) + rand(i * 77 + k * 3) * u(90);
                    return <circle key={k} cx={lx} cy={ly} r={u(1.5 + rand(k * 5 + i) * 2)} fill={alpha(COLOR.foam, 0.55)} />;
                  })}
                </g>
              ))}
              <text x={cx - u(120)} y={cy - u(70)} fill={COLOR.gold} fontSize={u(TYPE.label)} fontWeight={900} fontFamily={FONT.display} letterSpacing="0.08em" {...halo} opacity={Math.min(1, crossingT * 3)}>
                DEC 25, 1776 — CHRISTMAS NIGHT
              </text>
            </g>
          )}

          {/* TRENTON: blue arrow sweeps in at dawn */}
          {trentonT > 0 && (
            <g>
              <path
                d={line([CROSSING_EAST, [-74.8, 40.28], TRENTON])}
                fill="none"
                stroke={COLOR.skyOnNight}
                strokeWidth={u(5)}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - Math.min(1, trentonT * 1.4)}
                style={{ filter: `drop-shadow(0 0 ${u(6)}px ${COLOR.skyOnNight})` }}
              />
              {trentonFlash > 0.02 && (
                <g transform={`translate(${tx}, ${ty})`}>
                  <circle r={u(10 + trentonFlash * 46)} fill={alpha(COLOR.gold, 0.5 * trentonFlash)} style={{ filter: `drop-shadow(0 0 ${u(14)}px ${COLOR.amber})` }} />
                  <text y={-u(56)} textAnchor="middle" fill={COLOR.gold} fontSize={u(TYPE.body)} fontWeight={900} fontFamily={FONT.display} {...halo}>
                    DAWN ATTACK
                  </text>
                </g>
              )}
              {hessianScale <= 0.4 && (
                <g opacity={Math.min(1, (0.4 - hessianScale) * 3)}>
                  <text x={tx} y={ty + u(58)} textAnchor="middle" fill={COLOR.gold} fontSize={u(TYPE.label)} fontWeight={900} fontFamily={FONT.display} {...halo}>
                    DEC 26 — TRENTON
                  </text>
                  <text x={tx} y={ty + u(76)} textAnchor="middle" fill={COLOR.onNight} fontSize={u(TYPE.small)} fontFamily={FONT.mono} {...halo}>
                    ~900 Hessians captured
                  </text>
                </g>
              )}
            </g>
          )}

          {/* PRINCETON: march north, second battle */}
          {princetonT > 0 && (
            <g>
              <path
                d={line([TRENTON, [-74.71, 40.29], PRINCETON])}
                fill="none"
                stroke={COLOR.skyOnNight}
                strokeWidth={u(5)}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - Math.min(1, princetonT * 1.4)}
                style={{ filter: `drop-shadow(0 0 ${u(6)}px ${COLOR.skyOnNight})` }}
              />
              {princetonFlash > 0.02 && (
                <g transform={`translate(${px}, ${py})`}>
                  <circle r={u(8 + princetonFlash * 38)} fill={alpha(COLOR.gold, 0.45 * princetonFlash)} style={{ filter: `drop-shadow(0 0 ${u(12)}px ${COLOR.amber})` }} />
                </g>
              )}
              <g opacity={interpolate(princetonT, [0.55, 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
                <text x={px + u(20)} y={py - u(34)} textAnchor="start" fill={COLOR.gold} fontSize={u(TYPE.label)} fontWeight={900} fontFamily={FONT.display} {...halo}>
                  JAN 3, 1777 — PRINCETON
                </text>
                <text x={px + u(20)} y={py - u(16)} textAnchor="start" fill={COLOR.onNight} fontSize={u(TYPE.small)} fontFamily={FONT.mono} {...halo}>
                  Second victory · Cornwallis outmaneuvered
                </text>
              </g>
            </g>
          )}

          {/* Snowfall (cheap animated circles, crossing phase only) */}
          {crossingT > 0 && crossingT < 1 && (
            <g opacity={0.75 * Math.min(1, crossingSpan / 30)}>
              {snow.map((s, i) => {
                const { x, y } = snowFall(s);
                return <circle key={i} cx={x} cy={y} r={s.r} fill={alpha(COLOR.foam, 0.5)} />;
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Night vignette */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 45%, ${alpha(COLOR.night, 0)} 50%, ${alpha(COLOR.night, 0.72)} 100%)`, pointerEvents: 'none' }} />

      {/* HUD header */}
      <div style={{ position: 'absolute', top: u(14), left: u(16), right: u(16), display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ backgroundColor: alpha(COLOR.night, 0.9), border: `1px solid ${alpha(COLOR.skyOnNight, 0.4)}`, borderLeft: `4px solid ${COLOR.skyOnNight}`, borderRadius: RADIUS.md, padding: `${u(8)} ${u(16)}` }}>
          <span style={{ fontFamily: FONT.display, fontSize: u(TYPE.nano), fontWeight: 900, color: COLOR.skyOnNight, letterSpacing: '0.12em' }}>
            APUSH PERIOD 3 · DEC 1776 – JAN 1777
          </span>
          <span style={{ fontSize: u(TYPE.tag), fontWeight: 800, color: COLOR.onNight }}> · Trenton &amp; Princeton</span>
        </div>
        <div style={{ backgroundColor: alpha(COLOR.night, 0.9), border: `1px solid ${alpha(COLOR.onNight, 0.15)}`, borderRadius: RADIUS.md, padding: `${u(8)} ${u(16)}` }}>
          <span style={{ fontSize: u(TYPE.nano), fontFamily: FONT.mono, color: alpha(COLOR.onNight, 0.55) }}>CAMPAIGN </span>
          <span style={{ fontFamily: FONT.mono, fontSize: u(TYPE.town), fontWeight: 900, color: COLOR.gold }}>TEN DAYS</span>
        </div>
      </div>

      {/* RESOLVE: closing caption */}
      {resolveT > 0.01 && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: u(64), display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', opacity: resolveT }}>
          <div style={{ backgroundColor: alpha(COLOR.night, 0.92), border: `1px solid ${alpha(COLOR.gold, 0.5)}`, borderRadius: RADIUS.lg, padding: `${u(16)} ${u(32)}`, textAlign: 'center', transform: `translateY(${(1 - resolveT) * u(24)}px)` }}>
            <div style={{ fontFamily: FONT.display, fontSize: u(TYPE.h2), fontWeight: 900, color: COLOR.gold, textShadow: SHADOW.text }}>
              The Ten Days that Saved the Revolution
            </div>
            <div style={{ fontSize: u(TYPE.small), color: COLOR.onNight, marginTop: u(8), maxWidth: u(720) }}>
              Two victories in nine days — enlistments renewed, Congress regained the field,
              and Britain lost the war it had already won.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
