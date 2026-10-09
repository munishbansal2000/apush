import React from 'react';
import {geoPath} from 'd3-geo';
import {Easing, interpolate, useVideoConfig} from 'remotion';
import {NEIGHBORS, US_NATION, US_STATE_LINES, riverPaths, usProjection, type LonLat} from '../geo/usGeo';
import {FONT, TYPE, alpha} from '../../theme/tokens';
import {CLAMP, PAPER, PaperSheet, paperHalo, usePhases, type CustomProps, type Phase} from './kit';

/**
 * Trenton and Princeton, winter 1776-77 (APUSH Unit 3, u3e5 L44 / L48): the crossing and the two strikes.
 *
 * Parchment map of the Delaware above Trenton. Christmas night: the river runs dark, snow falls, lantern-lit boats
 * cross from McConkey's Ferry; at dawn two columns come down the river and Pennington roads and the Hessian marker
 * at Trenton collapses; then the march east and north to Princeton with a second flash. The camera drifts from the
 * crossing toward Trenton and Princeton throughout. Labels only (Delaware, Trenton, Princeton, Washington,
 * Hessians); no HUD, date chips, "Ten Days" card or closing sentence.
 *
 * DEFAULT_PHASES: crossing (night crossing in snow) / trenton (dawn attack) / princeton (march and second strike).
 */
export const DEFAULT_PHASES: Phase[] = [
  {name: 'crossing', start: 0, end: 0.35},
  {name: 'trenton', start: 0.35, end: 0.65},
  {name: 'princeton', start: 0.65, end: 1},
];

export type TrentonPrincetonMapProps = CustomProps;

// Basis: Washington Crossing Historic Park (McConkey's Ferry, PA) and the NJ landing opposite; Trenton Battle
// Monument / Old Barracks; Princeton Battlefield State Park (NPS / NJ state park sites). Routes per standard accounts:
// two columns on the River and Pennington roads to Trenton (Dec 26, 1776); the night march round Cornwallis via the
// Quaker Bridge road to Princeton (Jan 3, 1777).
const FERRY_PA: LonLat = [-74.876, 40.296];
const FERRY_NJ: LonLat = [-74.862, 40.3];
const TRENTON: LonLat = [-74.764, 40.222];
const PRINCETON: LonLat = [-74.677, 40.33];
const RIVER_ROAD: LonLat[] = [FERRY_NJ, [-74.835, 40.272], [-74.8, 40.245], [-74.772, 40.226]];
const PENNINGTON_ROAD: LonLat[] = [FERRY_NJ, [-74.83, 40.3], [-74.795, 40.272], [-74.762, 40.23]];
const TO_PRINCETON: LonLat[] = [TRENTON, [-74.725, 40.228], [-74.698, 40.275], PRINCETON];
const EXTENT: [LonLat, LonLat] = [[-74.98, 40.16], [-74.6, 40.38]];

type XY = [number, number];
const ease = Easing.inOut(Easing.cubic);

/** Deterministic pseudo-random from a seed (stable across frames). */
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const TrentonPrincetonMap: React.FC<TrentonPrincetonMapProps> = ({durationInFrames, phases}) => {
  const clock = usePhases(phases, DEFAULT_PHASES, durationInFrames);
  const {frame, fps, u, t, bounds} = clock;
  const {width, height} = useVideoConfig();
  const total = Math.max(1, clock.durationInFrames);

  const crossingT = interpolate(t('crossing'), [0, 1], [0, 1], {easing: ease});
  const trentonT = interpolate(t('trenton'), [0, 1], [0, 1], {easing: ease});
  const princetonT = interpolate(t('princeton'), [0, 1], [0, 1], {easing: ease});

  const projection = React.useMemo(() => usProjection(width, height, EXTENT, height * 0.05), [width, height]);
  const geo = React.useMemo(() => {
    const path = geoPath(projection);
    return {
      neighbors: NEIGHBORS.features.map(f => path(f) ?? ''),
      nation: path(US_NATION) ?? '',
      states: path(US_STATE_LINES) ?? '',
      delaware: riverPaths(path, ['Delaware']),
    };
  }, [projection]);
  const at = (ll: LonLat): XY => projection(ll) ?? [0, 0];
  const line = (lls: LonLat[]) => lls.map((ll, i) => `${i ? 'L' : 'M'} ${at(ll).map(v => v.toFixed(1)).join(' ')}`).join(' ');
  const halo = paperHalo(u);

  const [ax, ay] = at(FERRY_PA);
  const [bx, by] = at(FERRY_NJ);
  const [tx, ty] = at(TRENTON);
  const [px, py] = at(PRINCETON);

  // Night until the dawn attack: the river runs dark, then lightens as the Trenton beat starts.
  const nightShown = clock.has('crossing') ? 1 - interpolate(t('trenton'), [0, 0.35], [0, 1], CLAMP) : 0;
  const riverColor = nightShown > 0.5 ? PAPER.waterDeep : PAPER.water;

  // Camera: from the crossing toward the Trenton-Princeton country.
  const s = interpolate(frame, [0, total], [1.3, 1.08], {...CLAMP, easing: Easing.inOut(Easing.quad)});
  const fx = interpolate(frame, [0, total], [ax, (tx + px) / 2], {...CLAMP, easing: Easing.inOut(Easing.quad)});
  const fy = interpolate(frame, [0, total], [ay, (ty + py) / 2], {...CLAMP, easing: Easing.inOut(Easing.quad)});

  const hessianScale = interpolate(trentonT, [0.45, 0.8], [1, 0], CLAMP);
  const flash = (p: number) => Math.max(0, Math.sin(Math.min(1, Math.max(0, (p - 0.4) / 0.5)) * Math.PI));
  const trentonFlash = flash(trentonT);
  const princetonFlash = flash(princetonT);

  // Snow during the crossing, moved in seconds (fps-independent).
  const [cs, ce] = bounds('crossing');
  const snowOn = frame >= cs && frame < ce ? interpolate(frame, [cs, cs + 0.3 * fps, ce - 0.4 * fps, ce], [0, 1, 1, 0], CLAMP) : 0;
  const flakes = React.useMemo(
    () => Array.from({length: 46}, (_, i) => ({x: rand(i * 3.1), speed: 0.25 + rand(i * 7.7) * 0.35, drift: rand(i * 5.3) - 0.5, r: 1 + rand(i * 9.2) * 2.2, y0: rand(i * 13.7)})),
    [],
  );
  const local = Math.max(0, frame - cs) / fps;

  return (
    <PaperSheet fontFamily={FONT.display}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${width / 2 - fx * s}px, ${height / 2 - fy * s}px) scale(${s})`}}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
          <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={PAPER.water} />
          {geo.neighbors.map((d, i) => (
            <path key={i} d={d} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(0.8)} />
          ))}
          <path d={geo.nation} fill={PAPER.land} stroke={PAPER.coast} strokeWidth={u(1.2)} />
          <path d={geo.states} fill="none" stroke={PAPER.rule} strokeWidth={u(1)} strokeDasharray={`${u(6)} ${u(4)}`} />
          {/* Delaware River: dark on Christmas night, lighter at dawn */}
          <g fill="none" stroke={riverColor} strokeLinecap="round" strokeLinejoin="round">
            {geo.delaware.map((r, i) => <path key={i} d={r.d} strokeWidth={u(7)} />)}
          </g>
          <text x={ax - u(36)} y={ay + u(70)} transform={`rotate(-58, ${ax - u(36)}, ${ay + u(70)})`} textAnchor="middle" fill={PAPER.inkSoft}
            fontSize={u(TYPE.label)} fontStyle="italic" fontFamily={FONT.display} {...halo}>
            Delaware
          </text>

          {/* Washington on the Pennsylvania shore */}
          <g transform={`translate(${ax}, ${ay})`} opacity={1 - interpolate(crossingT, [0.6, 1], [0, 0.6], CLAMP)}>
            <circle r={u(8)} fill={PAPER.patriot} stroke={PAPER.halo} strokeWidth={u(2)} />
            <text x={-u(14)} y={-u(10)} textAnchor="end" fill={PAPER.patriot} fontSize={u(TYPE.label)} fontWeight={800} fontFamily={FONT.display} {...halo}>
              Washington
            </text>
          </g>

          {/* Crossing: lantern-lit boats */}
          {crossingT > 0 && [0, 1, 2, 3].map(i => {
            const along = Math.max(0, Math.min(1, crossingT * 1.3 - i * 0.1));
            if (along <= 0) return null;
            const x = ax + (bx - ax) * along;
            const y = ay + (by - ay) * along + (i - 1.5) * u(7);
            return (
              <g key={i} transform={`translate(${x}, ${y})`}>
                <circle r={u(7)} fill={alpha(PAPER.gold, 0.35 * nightShown)} />
                <path d={`M ${-u(6)} 0 L ${u(6)} 0 L ${u(3)} ${u(4)} L ${-u(3)} ${u(4)} Z`} fill={PAPER.patriot} stroke={PAPER.halo} strokeWidth={u(0.8)} />
                <circle cy={-u(2)} r={u(1.6)} fill={PAPER.gold} />
              </g>
            );
          })}

          {/* Hessian garrison at Trenton */}
          {hessianScale > 0.01 && (
            <g transform={`translate(${tx}, ${ty}) scale(${hessianScale})`}>
              <rect x={-u(8)} y={-u(8)} width={u(16)} height={u(16)} fill={PAPER.british} stroke={PAPER.halo} strokeWidth={u(2)} transform="rotate(45)" />
              <text x={u(16)} y={u(22)} fill={PAPER.british} fontSize={u(TYPE.label)} fontWeight={800} fontFamily={FONT.display} {...halo}>
                Hessians
              </text>
            </g>
          )}

          {/* Dawn: two columns strike Trenton */}
          {trentonT > 0 && [RIVER_ROAD, PENNINGTON_ROAD].map((road, i) => (
            <path key={i} d={line(road)} fill="none" stroke={PAPER.patriot} strokeWidth={u(4)} strokeLinecap="round" strokeLinejoin="round"
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, trentonT * 1.5)} />
          ))}
          {trentonFlash > 0.02 && <circle cx={tx} cy={ty} r={u(10 + trentonFlash * 36)} fill={alpha(PAPER.gold, 0.45 * trentonFlash)} />}

          {/* March to Princeton */}
          {princetonT > 0 && (
            <path d={line(TO_PRINCETON)} fill="none" stroke={PAPER.patriot} strokeWidth={u(4)} strokeLinecap="round" strokeLinejoin="round"
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, princetonT * 1.4)} />
          )}
          {princetonFlash > 0.02 && <circle cx={px} cy={py} r={u(10 + princetonFlash * 32)} fill={alpha(PAPER.gold, 0.45 * princetonFlash)} />}

          {/* Towns */}
          {[{x: tx, y: ty, name: 'Trenton', dx: -14, dy: 6, anchor: 'end' as const}, {x: px, y: py, name: 'Princeton', dx: 14, dy: -8, anchor: 'start' as const}].map(tw => (
            <g key={tw.name}>
              <circle cx={tw.x} cy={tw.y} r={u(4.5)} fill={PAPER.ink} stroke={PAPER.halo} strokeWidth={u(1.5)} />
              <text x={tw.x + u(tw.dx)} y={tw.y + u(tw.dy)} textAnchor={tw.anchor} fill={PAPER.ink} fontSize={u(TYPE.place)} fontWeight={700} fontFamily={FONT.display} {...halo}>
                {tw.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Snow over the crossing (screen space, so it is not scaled by the camera) */}
      {snowOn > 0 && (
        <svg viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none'}} opacity={0.85 * snowOn}>
          {flakes.map((f, i) => {
            const y = ((f.y0 + local * f.speed) % 1) * height;
            const x = f.x * width + f.drift * u(40) * Math.sin(local * 1.2 + i);
            return <circle key={i} cx={x} cy={y} r={u(f.r)} fill={PAPER.halo} stroke={PAPER.wave} strokeWidth={u(0.5)} />;
          })}
        </svg>
      )}
    </PaperSheet>
  );
};
