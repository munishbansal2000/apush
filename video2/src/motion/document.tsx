/**
 * DocumentLens: a real primary-source scan under a keyframed camera, with marker-pen
 * highlights, handwritten margin notes and a pull quote that lifts the highlighted words out
 * of the page into an analysis panel (HIPP tags). Frame-driven, deterministic.
 *
 * Coordinates: camera keys, highlight rects and note targets are in IMAGE pixels of the scan
 * (`imgW` × `imgH`). A camera key `{t, x, y, w}` shows a region of width `w` centred on (x, y);
 * `w` may exceed the image width (the page then sits on the desk). Notes and the quote panel
 * are screen px and constant size.
 *
 * Tracks (see docs/MOTION.md): the page + highlights = `<Track id="{id}" role="cover">`; notes
 * = `{id}-notes` overlay; pull quote = `{id}-quote` overlay. Readable parts carry
 * data-guard-item. Overlays must be placed inside the safe area by the caller (notes: x/y;
 * quote: `top`, `width`); the panel itself is pinned to the safe margins.
 */
import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Track } from '../kit/guard';
import { COLOR, FONT, MOTION, RADIUS, SAFE, SHADOW, STROKE, SURFACE, TYPE } from '../theme/tokens';
import { fadeWindow, rng, slideState } from './primitives';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const easeInOut = (p: number, k = 2.2) => (p < 0.5 ? 0.5 * Math.pow(2 * p, k) : 1 - 0.5 * Math.pow(2 * (1 - p), k));

/* ------------------------------------- types ------------------------------------- */

/** Camera key: show the image region of width `w` (image px) centred on (x, y), from time t. */
export interface DocCamKey { t: number; x: number; y: number; w: number; /** ease exponent into this key (default 2.2) */ ease?: number }
/** Rect in image px. */
export interface DocRect { x: number; y: number; w: number; h: number }

export interface DocHighlight {
  id: string;
  rect: DocRect;
  /** seconds: starts drawing */
  at: number;
  /** seconds: fades out (default: never) */
  to?: number;
  /** draw duration (default 0.5 s) */
  dur?: number;
  kind?: 'marker' | 'box' | 'underline';
}

export interface DocNote {
  id: string;
  text: string;
  at: number;
  to: number;
  /** screen px of the note's top-left (keep inside the safe area) */
  x: number;
  y: number;
  /** screen px max line width */
  width: number;
  /** image-px rect the note's arrow points at (optional) */
  target?: DocRect;
  /** slight hand tilt, degrees (default -2) */
  tilt?: number;
}

export type HippKey = 'H' | 'I' | 'P' | 'POV';
export interface HippTag { key: HippKey; text: string; at: number }

export interface DocPullQuote {
  /** image-px region that lifts out of the page */
  rect: DocRect;
  /** seconds: panel slides in, slip lifts */
  at: number;
  /** seconds: panel slides out */
  to: number;
  /** transcription of the lifted words */
  text: string;
  cite: string;
  hipp: HippTag[];
  /** panel width (px, default 480); right-aligned at the safe margin */
  width?: number;
  top?: number;
}

export interface DocumentLensProps {
  id?: string;
  /** path under public/ */
  src: string;
  imgW: number;
  imgH: number;
  camera: DocCamKey[];
  highlights?: DocHighlight[];
  notes?: DocNote[];
  quote?: DocPullQuote;
}

/* ------------------------------------- camera ------------------------------------- */

export function docCamAt(keys: DocCamKey[], t: number): { x: number; y: number; w: number } {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t < b.t) {
      const e = easeInOut((t - a.t) / (b.t - a.t), b.ease);
      return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, w: Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * e) };
    }
  }
  return keys[keys.length - 1];
}

/** image px → screen px for a camera state. */
export const docToScreen = (cam: { x: number; y: number; w: number }, W: number, H: number) => {
  const s = W / cam.w;
  return { s, pt: (x: number, y: number) => [W / 2 + (x - cam.x) * s, H / 2 + (y - cam.y) * s] as [number, number] };
};

const useT = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return { t: frame / fps, W: width, H: height };
};

/* ----------------------------------- highlights ----------------------------------- */

/** A wobbly closed rectangle (marker-pen box), seeded so it is the same every frame. */
const roughRect = (r: DocRect, j: number, seed: number) => {
  const q = rng(seed);
  const d = () => (q() - 0.5) * j;
  const x0 = r.x, y0 = r.y, x1 = r.x + r.w, y1 = r.y + r.h;
  return `M ${x0 + d()} ${y0 + d()} Q ${(x0 + x1) / 2 + d()} ${y0 + d() - j * 0.3} ${x1 + d()} ${y0 + d()} Q ${x1 + d() + j * 0.3} ${(y0 + y1) / 2} ${x1 + d()} ${y1 + d()}
    Q ${(x0 + x1) / 2 + d()} ${y1 + d() + j * 0.3} ${x0 + d()} ${y1 + d()} Q ${x0 + d() - j * 0.3} ${(y0 + y1) / 2} ${x0 + d() + j * 0.4} ${y0 + d() - j * 0.2}`;
};

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

const Highlight: React.FC<{ h: DocHighlight; t: number; k: number }> = ({ h, t, k }) => {
  const o = fadeWindow(t, h.at, h.to ?? 1e9, 0.01, MOTION.fade);
  if (o <= 0) return null;
  const p = easeInOut(interpolate(t, [h.at, h.at + (h.dur ?? 0.5)], [0, 1], clamp), 1.6);
  const { rect: r } = h;
  const kind = h.kind ?? 'marker';
  if (kind === 'marker') {
    // marker stroke: slightly slanted ends, drawn left → right, multiplied onto the ink
    const pad = r.h * 0.12;
    const x1 = r.x - pad + (r.w + pad * 2) * p;
    const sl = r.h * 0.18;
    return (
      <path d={`M ${r.x - pad + sl} ${r.y - pad} L ${x1} ${r.y - pad + sl * 0.3} L ${x1 - sl} ${r.y + r.h + pad} L ${r.x - pad} ${r.y + r.h + pad - sl * 0.3} Z`}
        fill={COLOR.amber} fillOpacity={0.42 * o} />
    );
  }
  if (kind === 'box') {
    const pad = Math.max(10 * k, r.h * 0.08);
    const box = { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
    return (
      <g opacity={o} fill="none" stroke={COLOR.red} strokeLinecap="round" strokeLinejoin="round">
        <path d={roughRect(box, 8 * k, hash(h.id))} strokeWidth={STROKE.bold * k} pathLength={1} strokeDasharray={`${p} 1`} />
        <path d={roughRect(box, 8 * k, hash(h.id) + 1)} strokeWidth={STROKE.thin * k} strokeOpacity={0.6} pathLength={1} strokeDasharray={`${Math.max(0, p * 1.1 - 0.1)} 1`} />
      </g>
    );
  }
  const y = r.y + r.h + Math.max(6 * k, r.h * 0.1);
  const q = rng(hash(h.id));
  return (
    <path d={`M ${r.x} ${y + (q() - 0.5) * 4 * k} Q ${r.x + r.w * 0.5} ${y + (q() + 0.3) * 6 * k} ${r.x + r.w} ${y + (q() - 0.5) * 4 * k}`}
      fill="none" stroke={COLOR.red} strokeWidth={STROKE.bold * k} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} opacity={o} />
  );
};

/* -------------------------------------- notes -------------------------------------- */

const NoteView: React.FC<{ n: DocNote; t: number; cam: { x: number; y: number; w: number }; W: number; H: number }> = ({ n, t, cam, W, H }) => {
  const o = fadeWindow(t, n.at, n.to, 0.05, MOTION.fade);
  if (o <= 0) return null;
  const typeDur = Math.min(2, n.text.length * 0.04);
  const shown = Math.floor(interpolate(t, [n.at, n.at + typeDur], [0, n.text.length], clamp));
  const arrowP = interpolate(t, [n.at + typeDur, n.at + typeDur + 0.5], [0, 1], clamp);
  let arrow: React.ReactNode = null;
  if (n.target && arrowP > 0) {
    const { pt } = docToScreen(cam, W, H);
    const tr = n.target;
    // aim at the target edge facing the note
    const [tx0, ty0] = pt(tr.x, tr.y);
    const [tx1, ty1] = pt(tr.x + tr.w, tr.y + tr.h);
    const ax = n.x + n.width / 2 < tx0 ? n.x + n.width * 0.6 : n.x + n.width * 0.4;
    const ay = n.y + TYPE.chip * 2.2;
    const bx = n.x + n.width < tx0 ? tx0 - 10 : n.x > tx1 ? tx1 + 10 : (tx0 + tx1) / 2;
    const by = n.x + n.width < tx0 || n.x > tx1 ? (ty0 + ty1) / 2 : ay < ty0 ? ty0 - 10 : ty1 + 10;
    const cx = (ax + bx) / 2;
    const cy = Math.min(ay, by) - 30;
    const ang = Math.atan2(by - cy, bx - cx);
    const head = (s: number) => `${bx - 14 * Math.cos(ang + s)} ${by - 14 * Math.sin(ang + s)}`;
    arrow = (
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: o }}>
        <path d={`M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`} fill="none" stroke={COLOR.red} strokeWidth={STROKE.base} strokeLinecap="round" pathLength={1} strokeDasharray={`${arrowP} 1`} />
        {arrowP >= 1 && <path d={`M ${head(0.45)} L ${bx} ${by} L ${head(-0.45)}`} fill="none" stroke={COLOR.red} strokeWidth={STROKE.base} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    );
  }
  return (
    <>
      {arrow}
      <div data-guard-item={`note:${n.id}`} style={{ position: 'absolute', left: n.x, top: n.y, maxWidth: n.width, opacity: o, transform: `rotate(${n.tilt ?? -2}deg)`, transformOrigin: '0 0',
        fontFamily: FONT.hand, fontSize: TYPE.chip, lineHeight: 1.25, color: COLOR.red }}>
        <span>{n.text.slice(0, shown)}</span>
        <span style={{ opacity: 0 }}>{n.text.slice(shown)}</span>
      </div>
    </>
  );
};

/* ----------------------------------- pull quote ----------------------------------- */

const HIPP_LABEL: Record<HippKey, { label: string; color: string }> = {
  H: { label: 'Historical situation', color: COLOR.brown },
  I: { label: 'Intended audience', color: COLOR.blue },
  P: { label: 'Purpose', color: COLOR.green },
  POV: { label: 'Point of view', color: COLOR.red },
};

const BORDER = 3;
const PAD = 16;

/** The lifted words: a crop of the scan, with the marker tint carried along. */
const Slip: React.FC<{ src: string; imgW: number; r: DocRect; w: number; style?: React.CSSProperties }> = ({ src, imgW, r, w, style }) => {
  const sc = w / r.w;
  return (
    <div style={{ position: 'relative', width: w, height: r.h * sc, overflow: 'hidden', background: COLOR.paper, boxShadow: SHADOW.card, flex: 'none', ...style }}>
      <Img src={staticFile(src)} style={{ position: 'absolute', left: -r.x * sc, top: -r.y * sc, width: imgW * sc, maxWidth: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: COLOR.amber, opacity: 0.3, mixBlendMode: 'multiply' }} />
    </div>
  );
};

const QuoteView: React.FC<{ q: DocPullQuote; src: string; imgW: number; camera: DocCamKey[]; t: number; W: number; H: number }> = ({ q, src, imgW, camera, t, W, H }) => {
  const width = q.width ?? 480;
  const panelX = W - SAFE.x - width;
  const panelY = q.top ?? SAFE.y;
  const slipW = width - 2 * (BORDER + PAD);
  const slipH = (q.rect.h * slipW) / q.rect.w;
  const panel = slideState(t, { at: q.at, from: 'right', out: q.to, to: 'right', dur: MOTION.enter }, W, H);
  // the slip lifts off the page (q.at → +0.15), flies (→ +0.95) and lands in the panel's slot
  const fly0 = q.at + 0.15;
  const fly1 = q.at + 0.95;
  const lift = interpolate(t, [q.at, fly0], [0, 1], clamp);
  const fp = easeInOut(interpolate(t, [fly0, fly1], [0, 1], clamp));
  const landed = t >= fly1;
  let flying: React.ReactNode = null;
  if (t >= q.at && !landed) {
    const { pt, s } = docToScreen(docCamAt(camera, t), W, H);
    const [sx, sy] = pt(q.rect.x, q.rect.y);
    const sw = q.rect.w * s;
    const x = sx + (panelX + BORDER + PAD - sx) * fp;
    const y = sy + (panelY + BORDER + PAD - sy) * fp - Math.sin(fp * Math.PI) * 40 - lift * 6;
    const w = sw + (slipW - sw) * fp;
    flying = (
      <div data-guard-moving="1" style={{ position: 'absolute', left: x, top: y, transform: `rotate(${-Math.sin(fp * Math.PI) * 4}deg) scale(${1 + lift * 0.03})` }}>
        <Slip src={src} imgW={imgW} r={q.rect} w={w} style={{ boxShadow: SHADOW.lift }} />
      </div>
    );
  }
  return (
    <>
      {panel.visible && (
        <div data-guard-moving={panel.moving ? '1' : undefined} style={{ position: 'absolute', left: panelX, top: panelY, width, opacity: panel.opacity, transform: `translate(${panel.x}px, ${panel.y}px)`,
          boxSizing: 'border-box', background: SURFACE.parchment.bg, border: `${BORDER}px solid ${SURFACE.parchment.border}`, borderRadius: RADIUS.md, padding: PAD,
          boxShadow: SHADOW.card, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {landed ? <Slip src={src} imgW={imgW} r={q.rect} w={slipW} /> : <div style={{ width: slipW, height: slipH, flex: 'none' }} />}
          <div data-guard-item="quote:text" style={{ fontFamily: FONT.text, fontStyle: 'italic', fontSize: TYPE.body, lineHeight: 1.3, color: COLOR.ink }}>
            “{q.text}”
          </div>
          <div data-guard-item="quote:cite" style={{ fontFamily: FONT.ui, fontSize: TYPE.small, lineHeight: 1.3, color: COLOR.inkSoft }}>— {q.cite}</div>
          <div style={{ height: 2, background: COLOR.ink, opacity: 0.25, margin: '2px 0' }} />
          {q.hipp.map(h => {
            const s = slideState(t, { at: h.at, from: 'up', distance: 36, dur: 0.45 }, W, H);
            const meta = HIPP_LABEL[h.key];
            return (
              <div key={h.key} data-guard-item={`hipp:${h.key}`} data-guard-moving={s.moving ? '1' : undefined}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: t >= h.at ? s.opacity : 0, transform: `translateY(${t >= h.at ? s.y : 0}px)` }}>
                <span style={{ flex: 'none', minWidth: 42, textAlign: 'center', background: meta.color, color: COLOR.paper, borderRadius: RADIUS.sm, padding: '2px 6px',
                  fontFamily: FONT.ui, fontWeight: 700, fontSize: TYPE.small, lineHeight: 1.3 }}>{h.key}</span>
                <span style={{ fontFamily: FONT.ui, fontSize: TYPE.small, lineHeight: 1.35, color: COLOR.ink }}>
                  <b style={{ color: meta.color }}>{meta.label}: </b>{h.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {flying}
    </>
  );
};

/* ------------------------------------ the lens ------------------------------------ */

export const DocumentLens: React.FC<DocumentLensProps> = ({ id = 'document', src, imgW, imgH, camera, highlights = [], notes = [], quote }) => {
  const { t, W, H } = useT();
  const cam = docCamAt(camera, t);
  const s = W / cam.w;
  const k = 1 / s;
  return (
    <>
      <Track id={id} role="cover">
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: COLOR.paperDeep }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: imgW, height: imgH, transformOrigin: '0 0',
            transform: `translate(${W / 2 - cam.x * s}px, ${H / 2 - cam.y * s}px) scale(${s})`, boxShadow: SHADOW.lift }}>
            <Img src={staticFile(src)} style={{ position: 'absolute', left: 0, top: 0, width: imgW, height: imgH }} />
            <svg width={imgW} height={imgH} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', mixBlendMode: 'multiply' }}>
              {highlights.map(h => <Highlight key={h.id} h={h} t={t} k={k} />)}
            </svg>
          </div>
        </div>
      </Track>
      {notes.length > 0 && (
        <Track id={`${id}-notes`} role="overlay">
          {notes.map(n => <NoteView key={n.id} n={n} t={t} cam={cam} W={W} H={H} />)}
        </Track>
      )}
      {quote && (
        <Track id={`${id}-quote`} role="overlay">
          <QuoteView q={quote} src={src} imgW={imgW} camera={camera} t={t} W={W} H={H} />
        </Track>
      )}
    </>
  );
};
