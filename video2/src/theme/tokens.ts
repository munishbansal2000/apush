/**
 * The one visual system. Every component and motion block takes fonts, colors, type sizes,
 * radii, strokes and motion timings from here — no literal font stacks or hex colors elsewhere
 * (tests/theme.test.ts enforces it). Two surfaces share the same color roles:
 *   parchment — maps, documents, explainers (light)
 *   night     — cinematic titles, dramatic beats (dark)
 * Sizes are screen px at 1280×720; scale with `sx = width / 1280` at other sizes.
 */

/** Self-hosted (public/fonts, OFL) and loaded by src/theme/fonts.ts before any frame renders. */
export const FONT = {
  /** titles, headings, date chips */
  display: "'Cinzel', 'Libre Baskerville', Georgia, serif",
  /** body text, labels, captions on parchment */
  text: "'Libre Baskerville', Georgia, serif",
  /** UI chrome: counters, small tags, numbers */
  ui: "'Plus Jakarta Sans', system-ui, sans-serif",
  /** code-like tags, coordinates, data readouts */
  mono: "'JetBrains Mono', ui-monospace, monospace",
  /** handwritten margin notes */
  hand: "'Segoe Script', 'Bradley Hand', cursive",
} as const;

export const COLOR = {
  // parchment surface
  ink: '#2b1d0e',
  inkSoft: '#5a4a36',
  inkMuted: '#77716a',
  paper: '#f5f0e8',
  paperDeep: '#ead9b0',
  halo: 'rgba(250,244,228,0.92)',
  ocean: '#9fb7b4',
  oceanDeep: '#7f9c9a',
  coast: '#6b5536',
  // night surface
  night: '#0f1419',
  nightPanel: '#1a1512',
  onNight: '#f5f0e8',
  onNightMuted: '#a89f91',
  /** bright roles for strokes/text ON the night surface (the base roles are too dark there) */
  skyOnNight: '#7dd3fc',
  mintOnNight: '#6ee7b7',
  goldOnNight: '#fbbf24',
  redOnNight: '#fca5a5',
  /** night map */
  nightOcean: '#0f1a22',
  nightLand: '#2b3138',
  nightCoast: '#7d725f',
  // map details
  foam: '#fffaf0',
  swell: '#f4ecd8',
  townLive: '#e2a33b',
  townStruck: '#77716a',
  inkStruck: '#5a554d',
  black: '#000000',
  // roles (same on both surfaces)
  gold: '#c9a227',
  amber: '#f59e0b',
  red: '#b3261e',
  blue: '#2c5aa0',
  green: '#3d7a3a',
  brown: '#8a5a2b',
  grey: '#77716a',
  // historical sides
  union: '#2c5aa0',
  confederate: '#77716a',
  patriot: '#2c5aa0',
  british: '#b3261e',
  // free/slave: blue vs burnt orange — distinguishable with red-green color blindness
  // (never encode a pair as red vs green; tests/theme.test.ts checks role pairs)
  free: '#2c6fb0',
  slave: '#c8641e',
  // speakers
  maya: '#c9a227',
  marcus: '#2c5aa0',
  // deep accent fill (dark red panels, mouth interiors)
  redDeep: '#5a1a1a',
  // character faces (CharacterFace defaults)
  skin: '#f0c8a0',
  skinShade: '#d4a070',
  blush: '#e89090',
} as const;

/**
 * Translucent variant of a token: alpha(COLOR.night, 0.6) → 'rgba(15,20,25,0.6)'.
 * Accepts #rgb / #rrggbb (token values); `a` is clamped to 0..1.
 */
export function alpha(hex: string, a: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  const k = Math.max(0, Math.min(1, a));
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.round(k * 1000) / 1000})`;
}

/** Type scale (px at 1280×720). */
export const TYPE = {
  display: 72,
  h1: 56,
  h2: 40,
  h3: 30,
  term: 30,
  place: 24,
  caption: 25,
  body: 22,
  chip: 22,
  flow: 17,
  label: 17,
  town: 16,
  small: 15,
  /** HUD / map-panel chrome (unscaled overlays) */
  tag: 13,
  micro: 11,
  nano: 9,
} as const;

export const RADIUS = { sm: 6, md: 10, lg: 16, pill: 999 } as const;
export const STROKE = { hair: 1, thin: 1.6, base: 2.5, bold: 4 } as const;
export const SHADOW = {
  card: '0 6px 18px rgba(20,12,4,0.28)',
  lift: '0 12px 28px rgba(20,12,4,0.35)',
  text: '0 2px 6px rgba(0,0,0,0.45)',
} as const;

/** Safe area margins (px at 1280×720) — matches render-config safe [0.05…0.95]. */
export const SAFE = { x: 64, y: 36 } as const;

/** Motion timings shared by every entrance/exit/emphasis. */
export const MOTION = {
  /** seconds for a Slide in/out */
  enter: 0.55,
  /** seconds for fades */
  fade: 0.4,
  /** stagger between list items (s) */
  stagger: 0.12,
  /** Remotion spring() config for pops/settles */
  spring: { damping: 14, mass: 0.8, stiffness: 120 },
  /** cubic-bezier for camera/slow moves */
  camera: [0.65, 0, 0.35, 1] as const,
} as const;

/** Surface presets for panels. */
export const SURFACE = {
  parchment: { bg: 'rgba(250,244,228,0.92)', fg: COLOR.ink, muted: COLOR.inkSoft, border: COLOR.ink },
  night: { bg: 'rgba(20,14,8,0.82)', fg: COLOR.onNight, muted: COLOR.onNightMuted, border: COLOR.gold },
} as const;
