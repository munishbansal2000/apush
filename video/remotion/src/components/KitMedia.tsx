/**
 * Motion components: kinetic typography, camera tours with callouts, archival documents,
 * figure cards, transitions, film grain, spring pops. All animate from local frame 0, are
 * timed to speech where it matters, and stay inside their own rect (runtime guard).
 */
import { measureText } from '@remotion/layout-utils';
import React from 'react';
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Rect } from '../lib/guard';
import type { RenderConfig } from './KitComponents';
const imageToCoverBox = <T extends number[]>(v: T, imageAspect: number, boxAspect: number): T => {
  let sx = 1, sy = 1;
  if (imageAspect > boxAspect) sx = imageAspect / boxAspect;
  else sy = boxAspect / imageAspect;
  const ox = (1 - sx) / 2, oy = (1 - sy) / 2;
  return v.map((n, i) => (i % 2 === 0 ? ox + n * sx : oy + n * sy)) as T;
};
import { GUARD_WRAPPER } from '../lib/guard';
import { SANS, SERIF, useFit } from './KitOverlays';
export type TextLevel = 'hero' | 'title' | 'subtitle' | 'body';
export interface DocumentBeat { title: string; attribution: string; excerpt: string; quoteStatus: string; highlight?: string; image?: string; marks?: { word: string; point: [number, number]; label?: string }[]; hipp?: { type: string; text: string }; }
export interface FigureBeat { name: string; dates: string; role: string; note?: string; image?: string; likeness?: string; }
export interface TourBeat { image: string; caption?: string; stops: { region?: string; rect?: [number, number, number, number]; callouts?: { point: [number, number]; label: string }[] }[]; }

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.65, 0, 0.35, 1);
const rectStyle = (r: Rect): React.CSSProperties => ({
  position: 'absolute', left: `${r[0] * 100}%`, top: `${r[1] * 100}%`, width: `${(r[2] - r[0]) * 100}%`, height: `${(r[3] - r[1]) * 100}%`,
});
const px = (r: Rect, cfg: RenderConfig) => ({ w: (r[2] - r[0]) * cfg.width, h: (r[3] - r[1]) * cfg.height });

/* ------------------------------ kinetic typography ------------------------------ */

const NUM_RE = /^([^\d]*)(\d[\d,]*)(\+?)([^\d]*)$/;

/** Count a number up from a sensible start (years count the last few decades; others from 0). */
const countUp = (word: string, p: number): string => {
  const m = NUM_RE.exec(word);
  if (!m) return word;
  const target = Number(m[2].replace(/,/g, ''));
  const isYear = target >= 1000 && target <= 2100 && !m[2].includes(',');
  const from = isYear ? target - 40 : 0;
  const v = Math.round(from + (target - from) * p);
  const shown = m[2].includes(',') ? v.toLocaleString('en-US') : String(v);
  return `${m[1]}${shown}${p >= 1 ? m[3] : ''}${m[4]}`;
};

/**
 * A line that builds word by word as it is spoken: each word rises and unblurs at its
 * offset, numbers count up, key words get a highlighter swipe. Same box as the static line
 * (centre + max width), so the layout engine's placement still holds.
 */
export const KineticText: React.FC<{
  text: string;
  level: TextLevel;
  position: [number, number];
  color: string;
  wordOffsets: number[];
  entrance?: 'stamp' | 'fade' | 'typewriter';
  keywords: Set<string>;
  cfg: RenderConfig;
}> = ({ text, level, position, color, wordOffsets, entrance, keywords, cfg }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  const size = cfg.text[level].fontPx;
  const stamp = entrance === 'stamp' ? interpolate(f, [0, 6], [cfg.text.stampOvershoot, 1], { ...clamp, easing: Easing.out(Easing.back(2)) }) : 1;
  return (
    <div
      data-kit="kinetic"
      style={{
        position: 'absolute', left: `${position[0] * 100}%`, top: `${position[1] * 100}%`, transform: `translate(-50%, -50%) scale(${stamp})`,
        maxWidth: `${cfg.text.maxWidthFrac * 100}%`, width: 'max-content', textAlign: 'center', fontFamily: SERIF, fontWeight: 700,
        fontSize: size, lineHeight: cfg.text[level].lineHeight, color, textShadow: '0 3px 12px rgba(0,0,0,0.75)',
      }}
    >
      {words.map((w, i) => {
        const at = (wordOffsets[i] ?? 0) * fps;
        const p = interpolate(f, [at, at + 7], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const key = /\d/.test(w) || keywords.has(w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, ''));
        const swipe = key ? interpolate(f, [at + 5, at + 14], [0, 100], clamp) : 0;
        const count = NUM_RE.test(w) ? interpolate(f, [at, at + 0.6 * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 1;
        return (
          <React.Fragment key={i}>
            <span
              style={{
                display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * size * 0.35}px)`, filter: `blur(${(1 - p) * 6}px)`,
                backgroundImage: key ? 'linear-gradient(transparent 62%, rgba(255,209,102,0.45) 62%, rgba(255,209,102,0.45) 92%, transparent 92%)' : undefined,
                backgroundSize: `${swipe}% 100%`, backgroundRepeat: 'no-repeat',
              }}
            >
              {count < 1 ? countUp(w, count) : w}
            </span>
            {i < words.length - 1 ? ' ' : ''}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ---------------------------------- camera ---------------------------------- */

type Cam = [number, number, number, number];
const FULL: Cam = [0, 0, 1, 1];
const lerpCam = (a: Cam, b: Cam, t: number): Cam => a.map((v, i) => v + (b[i] - v) * t) as Cam;

/** Transform that frames `cam` (box fractions) in a box of w×h. */
const camTransform = (cam: Cam) => {
  const s = Math.min(3, 1 / Math.max(cam[2] - cam[0], cam[3] - cam[1]));
  const cx = (cam[0] + cam[2]) / 2;
  const cy = (cam[1] + cam[3]) / 2;
  return { s, cx, cy, css: `translate(${(0.5 - cx) * s * 100}%, ${(0.5 - cy) * s * 100}%) scale(${s})` };
};

/** Where a point (box fractions) lands on screen (box fractions) under the camera. */
const project = (p: [number, number], cam: Cam): [number, number] => {
  const { s, cx, cy } = camTransform(cam);
  return [0.5 + (p[0] - cx) * s, 0.5 + (p[1] - cy) * s];
};

/* ----------------------------------- tour ----------------------------------- */

export const TourView: React.FC<{
  beat: TourBeat & { itemOffsets?: number[] };
  regionRect: (id: string) => Cam | undefined;
  imageAspect: number;
  cfg: RenderConfig;
}> = ({ beat, regionRect, imageAspect, cfg }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const box = px(cfg.stage, cfg);
  const capH = beat.caption ? 64 : 0;
  const H = box.h - capH;
  const t = f / fps;
  const offs = beat.itemOffsets ?? beat.stops.map((_, i) => i * 2);
  // stops and callouts are in full-image fractions; map them into this (cover-cropped) box
  const boxAspect = box.w / H;
  const toBox = <T extends number[]>(v: T) => imageToCoverBox(v, imageAspect, boxAspect);
  const cams = beat.stops.map(st => {
    const r = st.region ? regionRect(st.region) : st.rect;
    return r ? toBox([...r] as Cam) : FULL;
  });
  // camera: hold the wide shot, then glide (1s, eased) to each stop as it is spoken
  let cam: Cam = FULL;
  let current = -1;
  offs.forEach((o, i) => {
    if (t >= o) {
      const k = interpolate(t, [o, o + 1], [0, 1], { ...clamp, easing: ease });
      cam = lerpCam(i === 0 ? FULL : cams[i - 1], cams[i], k);
      current = i;
    }
  });
  const drift = 1 + 0.015 * Math.sin(t * 0.6);
  const { css } = camTransform(cam);
  const settled = current >= 0 ? t - offs[current] - 1 : -1;
  const labelSize = 26;

  // callout labels: try positions around each point, first one that fits and touches nothing
  const placed = (() => {
    const out: { x: number; y: number; w: number; h: number; px: number; py: number; label: string }[] = [];
    if (current < 0) return out;
    for (const c of beat.stops[current].callouts ?? []) {
      const [sx, sy] = project(toBox([...c.point] as [number, number]), cams[current]);
      const pxX = sx * box.w;
      const pxY = sy * H;
      const w = (typeof document === 'undefined' ? c.label.length * 14 : measureText({ text: c.label, fontFamily: SANS, fontSize: labelSize, fontWeight: 700 }).width) + 28;
      const h = labelSize + 16;
      const cands: [number, number][] = [
        [pxX + 60, pxY - h - 40], [pxX - w - 60, pxY - h - 40], [pxX + 60, pxY + 40], [pxX - w - 60, pxY + 40], [pxX - w / 2, pxY - h - 70], [pxX - w / 2, pxY + 70],
      ];
      const ok = ([x, y]: [number, number]) => x >= 8 && y >= 8 && x + w <= box.w - 8 && y + h <= H - 8 && !out.some(p => x < p.x + p.w + 8 && p.x < x + w + 8 && y < p.y + p.h + 8 && p.y < y + h + 8);
      const [x, y] = cands.find(ok) ?? [Math.min(Math.max(8, pxX - w / 2), box.w - w - 8), Math.min(Math.max(8, pxY + 40), H - h - 8)];
      out.push({ x, y, w, h, px: pxX, py: pxY, label: c.label });
    }
    return out;
  })();

  return (
    <div data-kit="tour" style={{ ...rectStyle(cfg.stage), borderRadius: 16, overflow: 'hidden', background: '#000', boxShadow: '0 14px 40px rgba(0,0,0,0.5)' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: box.w, height: H, overflow: 'hidden' }}>
        <Img src={staticFile(beat.image)} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', transform: `${css} scale(${drift})`, transformOrigin: '50% 50%' }} />
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 120px rgba(0,0,0,0.55)' }} />
        <svg width={box.w} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
          {placed.map((p, i) => {
            const at = i * 0.35 * fps;
            const local = settled * fps - at;
            const line = interpolate(local, [0, 10], [0, 1], clamp);
            const lx = p.x + p.w / 2;
            const ly = p.y + p.h / 2;
            const ring = (local % (1.2 * fps)) / (1.2 * fps);
            return (
              <g key={i} opacity={local >= 0 ? 1 : 0}>
                <circle cx={p.px} cy={p.py} r={10 + 30 * ring} fill="none" stroke="#ffd166" strokeWidth={3} opacity={1 - ring} />
                <circle cx={p.px} cy={p.py} r={9} fill="#ffd166" stroke="#1a1512" strokeWidth={3} />
                <line x1={p.px} y1={p.py} x2={p.px + (lx - p.px) * line} y2={p.py + (ly - p.py) * line} stroke="#ffd166" strokeWidth={3} />
              </g>
            );
          })}
        </svg>
        {placed.map((p, i) => {
          const local = settled * fps - i * 0.35 * fps;
          const o = interpolate(local, [8, 16], [0, 1], clamp);
          return (
            <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(12,10,8,0.88)', border: '2px solid #ffd166', borderRadius: 8, color: '#f5e6c8', fontFamily: SANS, fontWeight: 700, fontSize: labelSize,
              opacity: o, transform: `scale(${0.9 + 0.1 * o})`, whiteSpace: 'nowrap' }}>
              {p.label}
            </div>
          );
        })}
      </div>
      {beat.caption && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: capH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 32, color: '#f5e6c8', background: 'rgba(0,0,0,0.6)' }}>
          {beat.caption}
        </div>
      )}
    </div>
  );
};

/* ---------------------------------- document ---------------------------------- */

/** Index range [start, end) of a phrase inside a word list (normalized), or null. */
const phraseRange = (words: string[], phrase: string): [number, number] | null => {
  const n = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const hay = words.map(n);
  const needle = phrase.split(/\s+/).map(n).filter(Boolean);
  for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((w, j) => hay[i + j] === w)) return [i, i + needle.length];
  return null;
};

export const DocumentView: React.FC<{ beat: DocumentBeat; wordOffsets: number[]; imageAspect: number; cfg: RenderConfig }> = ({ beat, wordOffsets, imageAspect, cfg }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const box = px(cfg.stage, cfg);
  const words = beat.excerpt.split(/\s+/);
  const doneAt = ((wordOffsets[wordOffsets.length - 1] ?? 0) + 0.3) * fps;

  // scan slot: the image at its real aspect (no crop), so mark points map 1:1
  const MAX_TILT = 3.5;
  const slotW = beat.image ? box.w * 0.48 : 0;
  const slotH = box.h - 30;
  let scanW = slotW;
  let scanH = scanW / imageAspect;
  if (scanH > slotH * 0.86) {
    scanH = slotH * 0.86;
    scanW = scanH * imageAspect;
  }
  const cardW = box.w - slotW - (beat.image ? 30 : 0);

  const inScan = Math.min(1, spring({ frame: f, fps, config: { damping: 14, stiffness: 90 } }));
  const inCard = Math.min(1, spring({ frame: f - 6, fps, config: { damping: 14, stiffness: 90 } }));
  const stamp = spring({ frame: f - doneAt, fps, config: { damping: 8, stiffness: 160 } });
  const hl = beat.highlight ? phraseRange(words, beat.highlight) : null;
  const excerptSize = useFit(beat.excerpt, cardW - 64, 5, 40);

  // magnifier: glide to each mark as its word is typed (0.6s, eased)
  const marks = (beat.marks ?? []).map(m => {
    const r = phraseRange(words, m.word);
    return { ...m, at: r ? (wordOffsets[r[0]] ?? 0) * fps : 0 };
  });
  const R = 74;
  const ZOOM = 2.4;
  let lens: [number, number] | null = null;
  let markIdx = -1;
  marks.forEach((m, i) => {
    if (f >= m.at) {
      const k = interpolate(f, [m.at, m.at + 0.6 * fps], [0, 1], { ...clamp, easing: ease });
      const from = i === 0 ? m.point : marks[i - 1].point;
      lens = [from[0] + (m.point[0] - from[0]) * k, from[1] + (m.point[1] - from[1]) * k];
      markIdx = i;
    }
  });
  const lensIn = marks.length ? interpolate(f, [marks[0].at, marks[0].at + 8], [0, 1], clamp) : 0;
  const label = markIdx >= 0 ? marks[markIdx].label : undefined;
  const labelIn = markIdx >= 0 ? interpolate(f, [marks[markIdx].at + 0.5 * fps, marks[markIdx].at + 0.7 * fps], [0, 1], clamp) : 0;
  const lp = lens as [number, number] | null;
  const lx = lp ? lp[0] * scanW : 0;
  const ly = lp ? lp[1] * scanH : 0;

  return (
    <div data-kit="document" style={{ ...rectStyle(cfg.stage), display: 'flex', gap: 30, alignItems: 'center', fontFamily: SERIF }}>
      {beat.image && (
        <div style={{ width: slotW, height: slotH, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div data-guard-item="scan" style={{ position: 'relative', width: scanW, height: scanH, background: '#e9dcc0', boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
            transform: `scale(${0.9 + 0.1 * inScan}) rotate(${-2 - (1 - inScan) * (MAX_TILT - 2)}deg)`, opacity: inScan, overflow: 'hidden', outline: '12px solid #e9dcc0' }}>
            <Img src={staticFile(beat.image)} style={{ display: 'block', width: '100%', height: '100%', filter: 'sepia(0.3) contrast(1.05)' }} />
            {lp && (
              <div style={{ position: 'absolute', left: lx - R, top: ly - R, width: R * 2, height: R * 2, borderRadius: '50%', overflow: 'hidden',
                border: '5px solid #2a2018', boxShadow: '0 8px 22px rgba(0,0,0,0.5)', opacity: lensIn, transform: `scale(${0.7 + 0.3 * lensIn})` }}>
                <Img src={staticFile(beat.image)} style={{ display: 'block', position: 'absolute', maxWidth: 'none', width: scanW * ZOOM, height: scanH * ZOOM,
                  left: R - lx * ZOOM, top: R - ly * ZOOM, filter: 'sepia(0.15) contrast(1.15)' }} />
              </div>
            )}
            {lp && label && (
              <div style={{ position: 'absolute', left: Math.min(Math.max(8, lx - 120), scanW - 248), top: ly + R + 10 > scanH - 44 ? ly - R - 46 : ly + R + 10, width: 240,
                textAlign: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 19, color: '#f5e6c8', background: 'rgba(26,21,18,0.9)', borderRadius: 6, padding: '5px 8px',
                boxSizing: 'border-box', opacity: labelIn }}>
                {label}
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ position: 'relative', width: cardW, maxHeight: box.h - 20, background: '#f6eedb', color: '#231c14', padding: '24px 28px', boxSizing: 'border-box', borderRadius: 4,
        boxShadow: '0 14px 36px rgba(0,0,0,0.5)', opacity: inCard, transform: `scale(${0.94 + 0.06 * inCard})`, overflow: 'hidden' }}>
        {/* header: title block + a reserved slot for the stamp, so it never lands on text */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <div data-guard-item="title" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.15 }}>{beat.title}</div>
            <div style={{ fontFamily: SANS, fontSize: 18, color: '#6b5530', marginTop: 4 }}>{beat.attribution}</div>
          </div>
          {beat.quoteStatus === 'paraphrase' && (
            <div style={{ width: 168, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {f >= doneAt && (
                <div data-guard-item="stamp" style={{ transform: `rotate(-8deg) scale(${1.25 - 0.25 * Math.min(1, stamp)})`, opacity: Math.min(1, stamp * 1.3),
                  border: '3px solid #a33a2a', color: '#a33a2a', fontFamily: SANS, fontWeight: 700, fontSize: 17, letterSpacing: 3, padding: '4px 10px', borderRadius: 4 }}>
                  PARAPHRASED
                </div>
              )}
            </div>
          )}
        </div>
        <div data-guard-item="excerpt" style={{ fontSize: excerptSize, lineHeight: 1.35, fontStyle: beat.quoteStatus === 'quote' ? 'italic' : 'normal' }}>
          {beat.quoteStatus === 'quote' ? '“' : ''}
          {words.map((w, i) => {
            const at = (wordOffsets[i] ?? 0) * fps;
            const o = interpolate(f, [at, at + 5], [0, 1], clamp);
            const inHl = hl !== null && i >= hl[0] && i < hl[1];
            const swipe = inHl ? interpolate(f, [doneAt + (i - hl![0]) * 2, doneAt + (i - hl![0]) * 2 + 6], [0, 100], clamp) : 0;
            return (
              <span key={i} style={{ opacity: o, backgroundImage: inHl ? 'linear-gradient(transparent 55%, rgba(233,196,106,0.75) 55%)' : undefined, backgroundSize: `${swipe}% 100%`, backgroundRepeat: 'no-repeat' }}>
                {w}{i < words.length - 1 ? ' ' : ''}
              </span>
            );
          })}
          {beat.quoteStatus === 'quote' ? '”' : ''}
        </div>
        {beat.hipp && (
          <div data-guard-item="hipp" style={{ marginTop: 16, fontFamily: SANS, fontSize: 19, opacity: interpolate(f, [doneAt + 10, doneAt + 20], [0, 1], clamp) }}>
            <b style={{ color: '#7a5c1f' }}>{beat.hipp.type.toUpperCase()}:</b> {beat.hipp.text}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------------------------- figure card ---------------------------------- */

export const FigureCard: React.FC<{ beat: FigureBeat; cfg: RenderConfig }> = ({ beat, cfg }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const box = px(cfg.figureCard.rect, cfg);
  const flip = spring({ frame: f, fps, config: { damping: 13, stiffness: 110 } });
  const develop = interpolate(f, [6, 1.4 * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const nameChars = Math.floor(interpolate(f, [10, 10 + beat.name.length * 1.2], [0, beat.name.length], clamp));
  const portraitH = box.h * 0.55;
  const nameSize = useFit(beat.name, box.w - 40, 1, 34);
  const roleSize = useFit(beat.role, box.w - 40, 2, 22, SANS, 400);
  const initials = beat.name.split(/\s+/).filter(w => /^[A-Z]/.test(w)).map(w => w[0]).slice(0, 2).join('');
  return (
    <div data-kit="figure" style={{ ...rectStyle(cfg.figureCard.rect), perspective: 900 }}>
      <div style={{ width: '100%', height: '100%', background: '#f3ead6', color: '#231c14', borderRadius: 10, overflow: 'hidden', boxShadow: '0 14px 34px rgba(0,0,0,0.5)',
        transform: `rotateY(${(1 - flip) * 80}deg)`, transformOrigin: 'left center', opacity: Math.min(1, flip * 1.5) }}>
        <div style={{ position: 'relative', height: portraitH, background: '#3a3026', overflow: 'hidden' }}>
          {beat.image ? (
            <Img src={staticFile(beat.image)} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 20%',
              filter: `sepia(${1 - develop * 0.7}) blur(${(1 - develop) * 8}px) contrast(${0.8 + develop * 0.25})`, transform: `scale(${1.08 - develop * 0.08})` }} />
          ) : (
            <svg width="100%" height="100%" viewBox="0 0 100 80" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', opacity: 0.4 + develop * 0.6 }}>
              <circle cx={50} cy={30} r={15} fill="#6b5b48" />
              <path d="M18 80 Q50 42 82 80 Z" fill="#6b5b48" />
              <text x={50} y={35} textAnchor="middle" fontSize={11} fontFamily={SERIF} fill="#f3ead6" fontWeight={700}>{initials}</text>
            </svg>
          )}
          {beat.likeness && beat.likeness !== 'from life' && (
            <div style={{ position: 'absolute', right: 8, bottom: 8, fontFamily: SANS, fontSize: 14, color: '#f3ead6', background: 'rgba(0,0,0,0.55)', padding: '2px 8px', borderRadius: 4 }}>
              {beat.likeness === 'none' ? 'no portrait survives' : 'later likeness'}
            </div>
          )}
        </div>
        <div style={{ padding: '14px 20px' }}>
          <div data-guard-item="name" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: nameSize, whiteSpace: 'nowrap' }}>
            {beat.name.slice(0, nameChars)}
            <span style={{ opacity: nameChars < beat.name.length ? 1 : 0 }}>|</span>
          </div>
          <div data-guard-item="dates" style={{ fontFamily: SANS, fontSize: 20, color: '#7a5c1f', marginTop: 2, opacity: interpolate(f, [20, 28], [0, 1], clamp) }}>{beat.dates}</div>
          <div data-guard-item="role" style={{ fontFamily: SANS, fontSize: roleSize, marginTop: 8, lineHeight: 1.25, opacity: interpolate(f, [26, 34], [0, 1], clamp) }}>{beat.role}</div>
          {beat.note && <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, marginTop: 8, opacity: interpolate(f, [34, 42], [0, 1], clamp) }}>{beat.note}</div>}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------- transitions & texture ------------------------------- */

/** Diagonal sweep across the frame at tone changes / box chapters (0.8s). */
export const SweepTransition: React.FC<{ accent: string }> = ({ accent }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(f, [0, 0.8 * fps], [-0.7, 1.4], { ...clamp, easing: ease });
  return (
    <div data-kit="sweep" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: '-20%', bottom: '-20%', left: `${p * 100}%`, width: '55%', transform: 'skewX(-18deg)',
        background: `linear-gradient(90deg, transparent, ${accent}55 30%, rgba(20,16,12,0.92) 50%, ${accent}55 70%, transparent)` }} />
    </div>
  );
};

/** Animated film grain (seeded by frame: deterministic). */
export const FilmGrain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const f = useCurrentFrame();
  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity, mixBlendMode: 'overlay', pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 480 270">
      <filter id="kit-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 9} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="480" height="270" filter="url(#kit-grain)" />
    </svg>
  );
};

/** Spring pop with a small decaying wobble, scaled about `origin` (frame fractions). */
export const Pop: React.FC<{ origin: [number, number]; children: React.ReactNode }> = ({ origin, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 10, stiffness: 200 } });
  const wobble = Math.sin(f / 2.2) * 2.5 * Math.exp(-f / 9);
  return (
    <div {...GUARD_WRAPPER} style={{ position: 'absolute', inset: 0, transform: `scale(${0.65 + 0.35 * s}) rotate(${wobble}deg)`, transformOrigin: `${origin[0] * 100}% ${origin[1] * 100}%` }}>
      {children}
    </div>
  );
};
