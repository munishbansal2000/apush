/**
 * Explanatory motion primitives for <World> scenes. Each one shows a PROCESS (movement,
 * volume, spread) rather than revealing text. All deterministic (seeded), frame-driven.
 *
 * Consistency rules (enforced here, not per scene):
 * - One route = one path. A FlowArc and the Ship/Stowaways on it share `arc()`, so the ship
 *   always sails ON its flow.
 * - Everything readable (labels, ships, dots) is counter-scaled to a constant SCREEN size via
 *   TYPE / SIZE tokens; only geography scales with the camera.
 * - Labels appear only inside their time windows — nothing lingers into later sections.
 */
import React, { useMemo } from 'react';
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { alpha, COLOR, FONT, MOTION, TYPE } from '../theme/tokens';
import { estimateWidth } from './measure';
import { useWorld, WORLD_H, WORLD_W, WorldLayer, type LonLat } from './world';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const smoothstep = (v: number) => v * v * (3 - 2 * v);

// Visual tokens come from the one theme (src/theme/tokens.ts); re-exported for motion code.
export { TYPE } from '../theme/tokens';
/** Screen-pixel sizes for map symbols. */
export const SIZE = { ship: 120, townDot: 7, particle: 3 } as const;
export const INK = COLOR.ink;
export const HALO = COLOR.halo;
export const SERIF = FONT.text;

/** Deterministic PRNG (mulberry32). */
export const rng = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** 0→1→0 opacity over [from, to] with `ramp`-second fades. */
export const fadeWindow = (t: number, from: number, to: number, ramp = 0.4, rampOut = ramp) =>
  // in and out computed separately: windows shorter than the ramps can't produce a bad inputRange
  Math.min(interpolate(t, [from, from + ramp], [0, 1], clamp), interpolate(t, [to - rampOut, to], [1, 0], clamp));

/* ------------------------------------ parallax ------------------------------------ */

/**
 * Depth layer: drifts relative to the camera. depth < 1 = farther (moves less, e.g. ocean
 * swell), depth > 1 = nearer (moves more, e.g. clouds).
 */
export const Parallax: React.FC<{ depth: number; children: React.ReactNode }> = ({ depth, children }) => {
  const { cam, frameW, frameH } = useWorld();
  const s = cam.s * depth;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: WORLD_W, height: WORLD_H, transformOrigin: '0 0', pointerEvents: 'none',
      transform: `translate(${frameW / 2 - cam.x * s}px, ${frameH / 2 - cam.y * s}px) scale(${s})` }}>
      {children}
    </div>
  );
};

/** Ocean swell lines (far layer) drifting slowly. */
export const Swell: React.FC<{ opacity?: number }> = ({ opacity = 0.18 }) => {
  const { t } = useWorld();
  const lines = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 140 }, () => ({ x: r() * WORLD_W, y: r() * WORLD_H, w: 40 + r() * 90, ph: r() * 6 }));
  }, []);
  return (
    <svg width={WORLD_W} height={WORLD_H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {lines.map((l, i) => {
        const dx = Math.sin(t * 0.6 + l.ph) * 14;
        return <path key={i} d={`M ${l.x + dx} ${l.y} q ${l.w / 4} -8 ${l.w / 2} 0 t ${l.w / 2} 0`} fill="none" stroke={COLOR.swell} strokeWidth={3} opacity={opacity} />;
      })}
    </svg>
  );
};

/** Soft clouds (near layer). */
export const Clouds: React.FC<{ opacity?: number }> = ({ opacity = 0.32 }) => {
  const { t } = useWorld();
  const clouds = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: 26 }, () => ({ x: r() * WORLD_W, y: r() * WORLD_H, rx: 120 + r() * 260, ry: 40 + r() * 70, v: 6 + r() * 10 }));
  }, []);
  return (
    <svg width={WORLD_W} height={WORLD_H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <defs>
        <filter id="cloud-blur"><feGaussianBlur stdDeviation="22" /></filter>
      </defs>
      {clouds.map((c, i) => (
        <ellipse key={i} cx={((c.x + t * c.v) % (WORLD_W + 600)) - 300} cy={c.y} rx={c.rx} ry={c.ry} fill={COLOR.foam} opacity={opacity} filter="url(#cloud-blur)" />
      ))}
    </svg>
  );
};

/* ------------------------------------ routes ------------------------------------ */

/** A route between two places: a quadratic arc in world px. bend > 0 bows left of travel. */
export interface Arc { d: string; at: (u: number) => { x: number; y: number; heading: number } }

export function arc(proj: (ll: LonLat) => [number, number] | null, from: LonLat, to: LonLat, bend: number): Arc {
  const a = proj(from) ?? [0, 0];
  const b = proj(to) ?? [0, 0];
  const c = [(a[0] + b[0]) / 2 - (b[1] - a[1]) * bend, (a[1] + b[1]) / 2 + (b[0] - a[0]) * bend];
  const pt = (u: number) => [
    (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0],
    (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1],
  ];
  return {
    d: `M ${a[0]} ${a[1]} Q ${c[0]} ${c[1]} ${b[0]} ${b[1]}`,
    at: (u: number) => {
      const v = Math.min(1, Math.max(0, u));
      const [x, y] = pt(v);
      const [x2, y2] = pt(Math.min(1, v + 0.01));
      const [x0, y0] = pt(Math.max(0, v - 0.01));
      return { x, y, heading: (Math.atan2(y2 - y0, x2 - x0) * 180) / Math.PI };
    },
  };
}

export interface RouteProps { from: LonLat; to: LonLat; bend: number }

/**
 * A ship sailing a route over [start, end] seconds, constant on-screen size. Fades in at the
 * start port and out after docking (it doesn't sit in port for the rest of the scene).
 */
export const Ship: React.FC<RouteProps & { start: number; end: number; src?: string; facesRight?: boolean }> = ({ from, to, bend, start, end, src = 'tallship-real.webp', facesRight = false }) => {
  const { proj, t, cam } = useWorld();
  const route = useMemo(() => arc(proj, from, to, bend), [proj, from, to, bend]);
  const vis = fadeWindow(t, start - 0.6, end + 0.6, 0.6, 0.5);
  if (vis <= 0) return null;
  const p = smoothstep(interpolate(t, [start, end], [0, 1], clamp));
  const k = 1 / cam.s;
  const size = SIZE.ship * k;
  const { x, y, heading } = route.at(p);
  const goingLeft = Math.abs(heading) > 90;
  const flip = goingLeft === facesRight;              // mirror so the bow points along travel
  const bob = Math.sin(t * 2.4) * 3 * k;
  const roll = Math.sin(t * 1.7) * 2.5;
  const moving = t > start && t < end;
  const wake = Array.from({ length: 12 }, (_, i) => route.at(p - (i + 1) * 0.012));
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: vis }}>
        {moving && wake.map((w, i) => (
          <circle key={i} cx={w.x} cy={w.y} r={(4 + i * 1.2) * k} fill="none" stroke={COLOR.foam} strokeWidth={2 * k} opacity={(1 - i / 12) * 0.6} />
        ))}
      </svg>
      <div data-guard-item="ship" style={{ position: 'absolute', left: x - size / 2, top: y - size * 0.82 + bob, width: size, height: size, opacity: vis,
        transform: `scaleX(${flip ? -1 : 1}) rotate(${roll}deg)`, filter: `drop-shadow(3px 6px 6px ${alpha(COLOR.black, 0.35)})` }}>
        <Img src={staticFile(src)} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    </WorldLayer>
  );
};

/** One pill label in the shared style, at a world point, constant screen size. */
const Pill: React.FC<{ x: number; y: number; text: string; color: string; k: number; opacity: number }> = ({ x, y, text, color, k, opacity }) => {
  const fs = TYPE.flow * k;
  const w = estimateWidth(text, { size: fs, family: SERIF, weight: 700, letterSpacing: fs * 0.06 }) + fs * 1.2;
  return (
    <g opacity={opacity} data-guard-item={`flow:${text}`}>
      <rect x={x - w / 2} y={y - fs * 0.85} width={w} height={fs * 1.55} rx={fs * 0.35} fill={COLOR.foam} stroke={color} strokeWidth={2 * k} />
      <text x={x} y={y + fs * 0.32} textAnchor="middle" fontSize={fs} fontFamily={SERIF} fontWeight={700} letterSpacing={fs * 0.06} fill={INK}>{text}</text>
    </g>
  );
};

/**
 * A flow whose THICKNESS is the volume: it thickens as each item is named (`growAt` seconds).
 * It carries ONE label (at `labelU` along the route) shown only in `labelWindows`, so labels
 * never pile up or linger. Item names belong in a screen-space term list, not on the arc.
 */
export const FlowArc: React.FC<RouteProps & {
  color: string; start: number; growAt: number[]; maxWidth?: number;
  label: string; labelU?: number; labelWindows: [number, number][];
}> = ({ from, to, bend, color, start, growAt, maxWidth = 22, label, labelU = 0.5, labelWindows }) => {
  const { proj, t, cam } = useWorld();
  const route = useMemo(() => arc(proj, from, to, bend), [proj, from, to, bend]);
  const draw = interpolate(t, [start, start + 1.2], [0, 1], clamp);
  if (draw <= 0) return null;
  const k = 1 / cam.s;
  const named = growAt.filter(g => t >= g).length;
  const grow = growAt.length ? interpolate(named, [0, growAt.length], [0.25, 1]) : 1;
  const w = maxWidth * grow * k;                            // screen-constant width, grows with volume
  const labelO = Math.max(0, ...labelWindows.map(([a, b]) => fadeWindow(t, a, b)));
  const lp = route.at(labelU);
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <path d={route.d} fill="none" stroke={color} strokeOpacity={0.3} strokeWidth={w + 8 * k} strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} />
        <path d={route.d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} />
        {/* current: dashes moving in the direction of the flow */}
        {draw >= 1 && <path d={route.d} fill="none" stroke={COLOR.foam} strokeOpacity={0.6} strokeWidth={Math.max(1.5 * k, w * 0.2)} strokeDasharray={`${10 * k} ${18 * k}`} strokeDashoffset={-t * 40 * k} />}
        {labelO > 0 && <Pill x={lp.x} y={lp.y} text={label} color={color} k={k} opacity={labelO} />}
      </svg>
    </WorldLayer>
  );
};

/* ------------------------------------ spread ------------------------------------ */

/** Seconds for contagion particles to travel from the origin to a town (sound cues use it too). */
export const SPREAD_TRAVEL_SEC = 1.1;

/** A town on the map; `label` = screen-px offset + anchor, chosen so labels don't collide. */
export interface Town { name: string; at: LonLat; label?: { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' } }

/**
 * Contagion: particles leave `origin`, reach towns in order of distance; each town is struck
 * when its particles arrive (warm dot → grey, with a ring pulse). Timing in seconds.
 */
export const Spread: React.FC<{ origin: LonLat; towns: Town[]; start: number; perTown?: number; color?: string; labelsUntil?: number }> = ({ origin, towns, start, perTown = 0.7, color = COLOR.red, labelsUntil = 1e9 }) => {
  const { proj, t, cam } = useWorld();
  const o = useMemo(() => proj(origin) ?? [0, 0], [proj, origin]);
  const ordered = useMemo(() => {
    const pts = towns.map(tw => ({ ...tw, p: proj(tw.at) ?? [0, 0] }));
    return pts.sort((a, b) => Math.hypot(a.p[0] - o[0], a.p[1] - o[1]) - Math.hypot(b.p[0] - o[0], b.p[1] - o[1]));
  }, [towns, proj, o]);
  const jitter = useMemo(() => { const r = rng(99); return ordered.map(() => Array.from({ length: 6 }, () => [r() - 0.5, r() - 0.5])); }, [ordered]);
  const appear = interpolate(t, [start - 0.6, start], [0, 1], clamp);
  if (appear <= 0) return null;
  const k = 1 / cam.s;
  const labelO = appear * interpolate(t, [labelsUntil, labelsUntil + 0.5], [1, 0], clamp);
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {ordered.map((tw, i) => {
          const leave = start + i * perTown;
          const arrive = leave + SPREAD_TRAVEL_SEC;
          const struck = interpolate(t, [arrive, arrive + 0.6], [0, 1], clamp);
          const ring = interpolate(t, [arrive, arrive + 1.2], [0, 1], clamp);
          const L = tw.label ?? { dx: 0, dy: 20, anchor: 'middle' as const };
          return (
            <g key={tw.name} opacity={appear}>
              {t >= leave && t < arrive + 0.2 && jitter[i].map((j, n) => {
                const u = interpolate(t, [leave + n * 0.06, arrive], [0, 1], clamp);
                const lift = Math.sin(u * Math.PI);
                const x = o[0] + (tw.p[0] - o[0]) * u + j[0] * 30 * k * lift;
                const y = o[1] + (tw.p[1] - o[1]) * u + j[1] * 30 * k * lift;
                return <circle key={n} cx={x} cy={y} r={SIZE.particle * k} fill={color} opacity={0.9} />;
              })}
              {ring > 0 && ring < 1 && <circle cx={tw.p[0]} cy={tw.p[1]} r={(SIZE.townDot + ring * 26) * k} fill="none" stroke={color} strokeWidth={2.5 * k} opacity={1 - ring} />}
              <circle cx={tw.p[0]} cy={tw.p[1]} r={SIZE.townDot * k} fill={struck > 0.5 ? COLOR.townStruck : COLOR.townLive} stroke={INK} strokeWidth={1.6 * k} />
              {labelO > 0 && (
                <text data-guard-item={`town:${tw.name}`} x={tw.p[0] + L.dx * k} y={tw.p[1] + L.dy * k} textAnchor={L.anchor} dominantBaseline="middle" fontSize={TYPE.town * k} fontFamily={SERIF} fontWeight={700}
                  fill={struck > 0.5 ? COLOR.inkStruck : INK} stroke={HALO} strokeWidth={3.5 * k} paintOrder="stroke" opacity={labelO}>
                  {tw.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </WorldLayer>
  );
};

/** Particles riding in a ship's hold (same route + timing as the Ship) — hidden until `reveal`. */
export const Stowaways: React.FC<RouteProps & { start: number; end: number; reveal: number; color?: string }> = ({ from, to, bend, start, end, reveal, color = COLOR.red }) => {
  const { proj, t, cam } = useWorld();
  const route = useMemo(() => arc(proj, from, to, bend), [proj, from, to, bend]);
  const pts = useMemo(() => { const r = rng(5); return Array.from({ length: 16 }, () => [r() * 2 - 1, r() * 2 - 1, r() * 6]); }, []);
  const show = fadeWindow(t, reveal, end + 0.6, 0.8, 0.5);
  if (show <= 0) return null;
  const k = 1 / cam.s;
  const { x, y } = route.at(smoothstep(interpolate(t, [start, end], [0, 1], clamp)));
  const hold = { x, y: y - SIZE.ship * 0.22 * k };             // the hull, just above the waterline
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <circle cx={hold.x} cy={hold.y} r={SIZE.ship * 0.42 * k} fill={color} opacity={show * 0.12} />
        {pts.map(([a, b, ph], i) => (
          <circle key={i} cx={hold.x + (a * 0.34 * SIZE.ship + Math.sin(t * 3 + ph) * 3) * k} cy={hold.y + (b * 0.12 * SIZE.ship + Math.cos(t * 2.6 + ph) * 2) * k}
            r={SIZE.particle * k} fill={color} opacity={show * 0.9} />
        ))}
      </svg>
    </WorldLayer>
  );
};

/** A place name pinned to a world point (constant screen size, shared style). */
export const PlaceLabel: React.FC<{ at: LonLat; text: string; from: number; to?: number; dx?: number; dy?: number; anchor?: 'start' | 'middle' | 'end'; dot?: boolean }> = ({ at, text, from, to = 1e9, dx = 0, dy = -22, anchor = 'middle', dot = true }) => {
  const w = useWorld();
  const o = fadeWindow(w.t, from, to);
  if (o <= 0) return null;
  const [x, y] = w.proj(at) ?? [0, 0];
  const k = 1 / w.cam.s;
  const fs = TYPE.place * k;
  return (
    <WorldLayer>
      <svg width={1} height={1} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {dot && <circle cx={x} cy={y} r={4 * k} fill={INK} opacity={o} />}
        <text data-guard-item={`place:${text}`} x={x + dx * k} y={y + dy * k} textAnchor={anchor} dominantBaseline="middle" fontSize={fs} fontFamily={SERIF} fontWeight={700} letterSpacing={fs * 0.14}
          fill={INK} stroke={HALO} strokeWidth={fs * 0.2} paintOrder="stroke" opacity={o}>
          {text}
        </text>
      </svg>
    </WorldLayer>
  );
};

/* ------------------------------ entrances / exits ------------------------------ */

export type Dir = 'left' | 'right' | 'up' | 'down';

export interface Entrance {
  /** seconds: entrance starts */
  at: number;
  /** side it comes in FROM (default 'right'); 'fade' = no travel */
  from?: Dir | 'fade';
  /** seconds: exit starts (omit = stays) */
  out?: number;
  /** side it leaves TOWARD (default: back the way it came) */
  to?: Dir | 'fade';
  /** seconds per move (default 0.55) */
  dur?: number;
  /** travel distance in px; default = a full frame width/height, so it starts fully off-screen */
  distance?: number;
}

const vec = (d: Dir | 'fade'): [number, number] => (d === 'left' ? [-1, 0] : d === 'right' ? [1, 0] : d === 'up' ? [0, -1] : d === 'down' ? [0, 1] : [0, 0]);
const easeOutBack = (v: number) => { const c = 1.4; return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); };
const easeInCubic = (v: number) => v * v * v;

/** Offset/opacity of a directional entrance+exit at time t. `moving` = mid-move (the guard skips it). */
export function slideState(t: number, e: Entrance, frameW: number, frameH: number) {
  const { at, from = 'right', out, to = from, dur = MOTION.enter } = e;
  const pin = interpolate(t, [at, at + dur], [0, 1], clamp);
  const pout = out === undefined ? 0 : interpolate(t, [out, out + dur], [0, 1], clamp);
  const [fx, fy] = vec(from);
  const [tx, ty] = vec(to);
  const dx = e.distance ?? frameW;
  const dy = e.distance ?? frameH;
  const kin = 1 - easeOutBack(pin);          // 1 → 0 with a small overshoot
  const kout = easeInCubic(pout);            // 0 → 1, accelerating away
  return {
    x: fx * dx * kin + tx * dx * kout,
    y: fy * dy * kin + ty * dy * kout,
    opacity: (from === 'fade' ? pin : Math.min(1, pin * 4)) * (to === 'fade' ? 1 - pout : 1 - Math.max(0, pout * 4 - 3)),
    visible: t >= at && (out === undefined || pout < 1),
    moving: (pin > 0 && pin < 1) || (pout > 0 && pout < 1),
  };
}

/**
 * <Slide at from out to>: slides its children in from a side (left/right/up/down) and out to a
 * side. Works in screen space (overlays, panels, cards, characters). While moving it is marked
 * data-guard-moving, so the layout guard doesn't report the intentional off-screen travel.
 */
export const Slide: React.FC<Entrance & { children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style, ...e }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = slideState(frame / fps, e, width, height);
  if (!s.visible) return null;
  return (
    <div data-guard-wrapper="" data-guard-moving={s.moving ? '1' : undefined}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transform: `translate(${s.x}px, ${s.y}px)`, opacity: s.opacity, ...style }}>
      {children}
    </div>
  );
};
