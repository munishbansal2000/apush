/**
 * Kit-owned components: the pieces every episode needs and none should re-implement.
 * All of them animate from local frame 0 (the shell mounts them in Sequences).
 */
import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { imageToCoverBox, type Rect, type RenderConfig } from './layout';
import type { BgSegment, LedgerBeat, PictogramBeat, ResolvedPauseCard } from './types';

const FONT = 'Georgia, "Times New Roman", serif';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const rectStyle = (r: Rect): React.CSSProperties => ({
  position: 'absolute',
  left: `${r[0] * 100}%`,
  top: `${r[1] * 100}%`,
  width: `${(r[2] - r[0]) * 100}%`,
  height: `${(r[3] - r[1]) * 100}%`,
});

/* ------------------------------- background ------------------------------- */

const FADE_FRAMES = 12;

/** One background segment: crossfades in, tone-specific motion and grade. */
export const BackgroundSegment: React.FC<{ seg: BgSegment; cfg: RenderConfig; focusRect?: Rect; imageAspect?: number; kick?: number }> = ({ seg, cfg, focusRect: imgRect, imageAspect, kick = 0 }) => {
  const focusRect = imgRect && imageAspect ? imageToCoverBox(imgRect, imageAspect, cfg.width / cfg.height) : imgRect;
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tone = cfg.tones[seg.tone];
  const lenFrames = (seg.end - seg.start) * fps;
  const p = Math.min(1, f / Math.max(1, lenFrames));
  // focus segments start brighter: the image is the content, not a backdrop
  const texture = seg.sourceId.startsWith('section:');
  const target = focusRect ? Math.max(0.8, tone.bgOpacity) : texture ? tone.bgOpacity * 0.55 : tone.bgOpacity;
  const opacity = interpolate(f, [0, FADE_FRAMES], [0, target], clamp);
  let transform: string;
  if (focusRect) {
    // push from the full image into the region over ~3s, then hold with a slow drift
    const [x0, y0, x1, y1] = focusRect;
    const target = Math.min(2.4, 1 / Math.max(x1 - x0, y1 - y0));
    const k = interpolate(f, [8, 3 * fps], [0, 1], { ...clamp, easing: (v: number) => 1 - Math.pow(1 - v, 3) });
    const scale = 1 + (target - 1) * k + p * 0.03;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    transform = `scale(${scale}) translate(${(0.5 - cx) * 100 * k}%, ${(0.5 - cy) * 100 * k}%)`;
  } else {
    transform =
      tone.kenBurns === 'push'
        ? `scale(${1.02 + p * 0.06})`
        : `scale(${1.06 + Math.sin(p * Math.PI) * 0.02}) translate(${Math.sin(p * Math.PI * 2) * 14}px, ${Math.cos(p * Math.PI * 2) * 8}px)`;
  }
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img
        src={staticFile(seg.image)}
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', opacity, transform: `${transform} scale(${1 + kick})`, filter: `saturate(${texture ? tone.saturate * 0.6 : tone.saturate})${texture ? ' blur(5px)' : ''}` }}
      />
    </AbsoluteFill>
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 38%, rgba(0,0,0,0.25) 100%)' }} />
);

/* ------------------------------- pause cards ------------------------------ */

export const PauseCard: React.FC<{ card: ResolvedPauseCard; cfg: RenderConfig }> = ({ card, cfg }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = card.end - card.start;
  const pauseLen = Math.round(total);
  const elapsed = f / fps;
  const remaining = Math.max(0, Math.ceil(pauseLen - elapsed));
  const ring = Math.min(1, elapsed / Math.max(1, pauseLen));
  const label = card.spec.kind === 'predict' ? 'YOUR TURN · PREDICT' : 'SELF-TEST · SAY IT OUT LOUD';
  const C = 2 * Math.PI * 70;
  const lastThree = remaining <= 3 && remaining > 0;
  const beatPulse = lastThree ? 1 + 0.12 * Math.max(0, 1 - ((elapsed % 1) / 0.35)) : 1;
  const promptWords = card.spec.prompt.split(/\s+/);
  return (
    <div data-kit="pausecard" style={{ ...rectStyle(cfg.stage), display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      background: 'rgba(12,10,8,0.82)', borderRadius: 20, border: '2px solid rgba(255,209,102,0.5)', color: '#f5e6c8', fontFamily: FONT,
      opacity: interpolate(f, [0, 10], [0, 1], clamp), padding: 48, boxSizing: 'border-box' }}>
      <div style={{ fontSize: 30, letterSpacing: 5, color: '#ffd166' }}>{label}</div>
      <div style={{ fontSize: 54, fontWeight: 700, textAlign: 'center', margin: '28px 0', lineHeight: 1.2 }}>
        {promptWords.map((w, i) => (
          <span key={i} style={{ opacity: interpolate(f, [4 + i * 1.5, 10 + i * 1.5], [0, 1], clamp) }}>{w}{i < promptWords.length - 1 ? ' ' : ''}</span>
        ))}
      </div>
      <svg width={180} height={180} viewBox="0 0 180 180" style={{ transform: `scale(${beatPulse})` }}>
        <circle cx={90} cy={90} r={70} stroke="rgba(255,255,255,0.15)" strokeWidth={12} fill="none" />
        <circle cx={90} cy={90} r={70} stroke={lastThree ? '#e07a5f' : '#ffd166'} strokeWidth={12} fill="none" strokeDasharray={C} strokeDashoffset={C * ring}
          transform="rotate(-90 90 90)" strokeLinecap="round" />
        <text x={90} y={108} textAnchor="middle" fontSize={56} fill="#f5e6c8" fontFamily={FONT}>{remaining}</text>
      </svg>
      <div style={{ fontSize: 26, opacity: 0.7, marginTop: 16 }}>Pause the video if you need more time.</div>
    </div>
  );
};

export const RevealCard: React.FC<{ text: string; cfg: RenderConfig }> = ({ text, cfg }) => {
  const f = useCurrentFrame();
  return (
    <div data-kit="reveal" style={{ position: 'absolute', left: `${cfg.stage[0] * 100}%`, top: `${cfg.stage[1] * 100}%`, maxWidth: `${(cfg.stage[2] - cfg.stage[0]) * 100}%`,
      background: 'rgba(20,40,24,0.88)', border: '2px solid #7bc47f', borderRadius: 14, padding: '18px 28px', color: '#eaf6ea', fontFamily: FONT,
      opacity: interpolate(f, [0, 10], [0, 1], clamp), transform: `translateY(${interpolate(f, [0, 10], [-14, 0], clamp)}px)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, letterSpacing: 4, color: '#7bc47f' }}>
        <svg width={26} height={26} viewBox="0 0 26 26" style={{ display: 'block' }}>
          <circle cx={13} cy={13} r={11} fill="none" stroke="#7bc47f" strokeWidth={2.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - interpolate(f, [0, 10], [0, 1], clamp)} />
          <path d="M7.5 13.5 L11.5 17.5 L19 9" fill="none" stroke="#7bc47f" strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - interpolate(f, [8, 16], [0, 1], clamp)} />
        </svg>
        CHECK YOUR ANSWER
      </div>
      <div style={{ fontSize: 40, fontWeight: 700, marginTop: 6 }}>{text}</div>
    </div>
  );
};

/* ------------------------------- box tracker ------------------------------ */

export interface TrackerState {
  boxes: string[];
  /** time each box is checked, or null */
  checkedAt: (number | null)[];
  /** when each box is first named; rows (and the card) appear only once named */
  introAt: (number | null)[];
  /** box currently being covered (1-based) and how far through its chapter (0..1) */
  current: { box: number; progress: number; since: number } | null;
  t: number;
}

const CHECK_FRAMES = 12;
const BURST = 10;

/**
 * The episode sheet. Follows the episode without breaking the one-mid-episode-check rule:
 * the box being covered is marked NOW with a filling progress bar; checks draw in with a
 * spring pop, strike-through, and a particle burst; all four checked plays a finale.
 * Everything is clipped to the card, so no animation leaves its rect.
 */
export const BoxTracker: React.FC<{ state: TrackerState; cfg: RenderConfig }> = ({ state, cfg }) => {
  const { fps } = useVideoConfig();
  const { boxes, checkedAt, current, t, introAt } = state;
  const box = rectPx(cfg.boxTracker.rect, cfg);
  const firstIntro = Math.min(...introAt.map(x => (x === null ? Infinity : x)));
  if (!(t >= firstIntro - 0.25)) return null; // the sheet arrives when Maya starts naming the boxes
  const cardIn = spring({ frame: (t - firstIntro + 0.25) * fps, fps, config: { damping: 14, stiffness: 150 } });
  const rowH = (box.h - 46) / boxes.length;
  const allDoneAt = checkedAt.every(c => c !== null) ? Math.max(...(checkedAt as number[])) : null;
  const finale = allDoneAt !== null && t >= allDoneAt ? (t - allDoneAt) * fps : -1;
  return (
    <div data-kit="boxtracker" style={{ ...rectStyle(cfg.boxTracker.rect), background: 'rgba(245,230,200,0.95)', borderRadius: 12, padding: '10px 14px',
      boxSizing: 'border-box', fontFamily: FONT, color: '#2a2018', boxShadow: '0 6px 18px rgba(0,0,0,0.35)', overflow: 'hidden',
      opacity: Math.min(1, cardIn), transform: `scale(${0.85 + 0.15 * Math.min(1, cardIn)})`, transformOrigin: 'top right' }}>
      <div style={{ fontSize: 18, letterSpacing: 3, opacity: 0.7, height: 26, display: 'flex', justifyContent: 'space-between' }}>
        <span>EPISODE SHEET</span>
        <span>{checkedAt.filter(c => c !== null && t >= c).length}/{introAt.filter(x => x !== null && t >= x).length}</span>
      </div>
      {boxes.map((label, i) => {
        const c = checkedAt[i];
        const since = c !== null && t >= c ? (t - c) * fps : -1;
        const isCurrent = current?.box === i + 1 && since < 0;
        const named = introAt[i];
        if (named === null || t < named) return <div key={label} style={{ height: rowH }} />;
        const rowIn = Math.min(1, spring({ frame: (t - named) * fps, fps, config: { damping: 12, stiffness: 170 } }));
        return (
          <div key={label} style={{ opacity: rowIn, transform: `translateX(${(1 - rowIn) * 30}px)`, background: t - named < 1.2 ? `rgba(255,209,102,${0.35 * (1 - (t - named) / 1.2)})` : 'transparent', borderRadius: 8 }}>
          <TrackerRow label={label} h={rowH} since={since} isCurrent={isCurrent}
            progress={isCurrent ? current!.progress : 0} currentSince={isCurrent ? (t - current!.since) * fps : 0} index={i} />
          </div>
        );
      })}
      {finale >= 0 && finale < 3 * fps && <Finale frame={finale} w={box.w} h={box.h} count={boxes.length} />}
    </div>
  );
};

const TrackerRow: React.FC<{ label: string; h: number; since: number; isCurrent: boolean; progress: number; currentSince: number; index: number }> = ({ label, h, since, isCurrent, progress, currentSince, index }) => {
  const { fps } = useVideoConfig();
  const checked = since >= 0;
  const pop = checked ? spring({ frame: since, fps, config: { damping: 9, stiffness: 180 } }) : 0;
  const draw = interpolate(since, [2, CHECK_FRAMES], [0, 1], clamp);
  const strike = interpolate(since, [6, 18], [0, 1], clamp);
  const fill = interpolate(since, [0, 6], [0, 1], clamp);
  const nowIn = interpolate(currentSince, [0, 10], [0, 1], clamp);
  const pulse = isCurrent ? 0.5 + 0.5 * Math.sin((currentSince / fps) * Math.PI * 1.6) : 0;
  return (
    <div style={{ position: 'relative', height: h, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 8,
      background: isCurrent ? `rgba(255,209,102,${0.18 + 0.12 * pulse})` : 'transparent', borderRadius: 8, transition: 'none' }}>
      {isCurrent && <div style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 4 * nowIn, background: '#c9a227', borderRadius: 2 }} />}
      <div style={{ position: 'relative', width: 26, height: 26, flexShrink: 0, transform: `scale(${checked ? 0.7 + 0.3 * pop : 1})` }}>
        <svg width={26} height={26} viewBox="0 0 26 26" style={{ display: 'block' }}>
          <rect x={1.5} y={1.5} width={23} height={23} rx={4} fill={`rgba(47,125,74,${fill})`} stroke="#2a2018" strokeWidth={3} />
          <path d="M6 13.5 L11 18.5 L20 8" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        </svg>
        {checked && since < 0.9 * fps && <Burst frame={since} seed={index} />}
      </div>
      <div style={{ position: 'relative', fontSize: 20, lineHeight: 1.1, opacity: checked ? 0.55 + 0.45 * (1 - strike) : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip', flex: 1 }}>
        {label}
        <div style={{ position: 'absolute', left: 0, top: '55%', height: 2, width: `${strike * 100}%`, background: '#2a2018' }} />
      </div>
      {isCurrent && (
        <span style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: 1, color: '#7a5c1f',
          opacity: nowIn, transform: `translateX(${(1 - nowIn) * 12}px)`, marginRight: 6 }}>NOW</span>
      )}
      {isCurrent && (
        <div style={{ position: 'absolute', left: 44, right: 10, bottom: 2, height: 3, background: 'rgba(42,32,24,0.12)', borderRadius: 2 }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', background: '#c9a227', borderRadius: 2 }} />
        </div>
      )}
    </div>
  );
};

/** Deterministic particle burst around a checkbox (stays inside the tracker card). */
const Burst: React.FC<{ frame: number; seed: number }> = ({ frame, seed }) => {
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [0, 0.9 * fps], [0, 1], clamp);
  const colors = ['#2f7d4a', '#ffd166', '#e07a5f', '#8ecae6'];
  return (
    <>
      {Array.from({ length: BURST }, (_, k) => {
        const ang = ((k + seed * 0.37) / BURST) * Math.PI * 2;
        const dist = 8 + 26 * Math.sin(p * Math.PI * 0.5);
        return (
          <div key={k} style={{ position: 'absolute', left: 13 + Math.cos(ang) * dist - 3, top: 13 + Math.sin(ang) * dist - 3, width: 6, height: 6,
            borderRadius: k % 2 ? 1 : 3, background: colors[k % colors.length], opacity: 1 - p, transform: `rotate(${p * 180 + k * 30}deg)` }} />
        );
      })}
    </>
  );
};

/** All boxes checked: stamp + confetti inside the card. */
const NUM = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'];
const Finale: React.FC<{ frame: number; w: number; h: number; count: number }> = ({ frame, w, h, count }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 10, stiffness: 140 } });
  const out = interpolate(frame, [2.4 * fps, 3 * fps], [1, 0], clamp);
  const colors = ['#2f7d4a', '#ffd166', '#e07a5f', '#8ecae6', '#c9a227'];
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: out, pointerEvents: 'none' }}>
      {Array.from({ length: 28 }, (_, k) => {
        const x = ((k * 37) % 100) / 100;
        const fall = interpolate(frame, [0, 2.4 * fps], [-0.1, 1.1], clamp);
        const y = (fall + ((k * 13) % 30) / 100) % 1.1;
        return <div key={k} style={{ position: 'absolute', left: x * w, top: y * h, width: 7, height: 11, background: colors[k % colors.length], transform: `rotate(${frame * 9 + k * 40}deg)`, borderRadius: 1 }} />;
      })}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${0.6 + 0.4 * s}) rotate(-6deg)`, border: '4px solid #2f7d4a', color: '#2f7d4a', borderRadius: 10, padding: '6px 16px',
          fontFamily: FONT, fontWeight: 700, fontSize: 34, background: 'rgba(245,230,200,0.9)', letterSpacing: 2 }}>ALL {NUM[count] ?? count} ✓</div>
      </div>
    </div>
  );
};

const rectPx = (r: Rect, cfg: RenderConfig) => ({ w: (r[2] - r[0]) * cfg.width, h: (r[3] - r[1]) * cfg.height });

/* -------------------------------- captions -------------------------------- */

/** Karaoke captions: spoken words full white, the current word in the speaker's colour, the rest dim. */
export const CaptionLine: React.FC<{ words: { w: string; t: number }[]; t: number; color: string; cfg: RenderConfig }> = ({ words, t, color, cfg }) => {
  const currentIdx = words.reduce((acc, w, i) => (w.t <= t ? i : acc), -1);
  return (
    <div data-kit="captions" style={{ ...rectStyle(cfg.captions.rect), display: 'flex', alignItems: 'center' }}>
      <span style={{ background: 'rgba(0,0,0,0.72)', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 40, padding: '6px 16px', borderRadius: 8, borderLeft: `6px solid ${color}`, whiteSpace: 'nowrap' }}>
        {words.map((w, i) => (
          <span key={i} style={{ color: i === currentIdx ? color : i < currentIdx ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: i === currentIdx ? 700 : 400 }}>
            {w.w}{i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </div>
  );
};

export const ImageCredit: React.FC<{ credit: string; cfg: RenderConfig }> = ({ credit, cfg }) => (
  <div data-kit="credit" style={{ ...rectStyle(cfg.credit.rect), color: 'rgba(255,255,255,0.7)', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 20 }}>{credit}</div>
);

/* ------------------------------ diagrams ---------------------------------- */

/** Ten figures; the first `lost[0]` fade fully, the range up to `lost[1]` fades halfway. */
export const Pictogram: React.FC<{ beat: PictogramBeat; cfg: RenderConfig }> = ({ beat, cfg }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div data-kit="pictogram" style={{ ...rectStyle(cfg.stage), display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: FONT, color: '#e8dcc8' }}>
      <div style={{ fontSize: 44, letterSpacing: 3, marginBottom: 30 }}>{beat.label}</div>
      <div style={{ display: 'flex', gap: 22 }}>
        {Array.from({ length: beat.total }, (_, i) => {
          const order = beat.total - 1 - i;
          const fadeStart = 0.8 * fps + order * 0.18 * fps;
          const target = order < beat.lost[0] ? 0 : order < beat.lost[1] ? 0.45 : 1;
          const o = interpolate(f, [fadeStart, fadeStart + 0.5 * fps], [1, target], clamp);
          return (
            <svg key={i} width={70} height={150} viewBox="0 0 70 150">
              <g stroke="#e8dcc8" strokeWidth={3} fill="none" opacity={0.6}>
                <circle cx={35} cy={22} r={18} />
                <rect x={14} y={46} width={42} height={64} rx={14} />
                <rect x={16} y={104} width={14} height={44} rx={6} />
                <rect x={40} y={104} width={14} height={44} rx={6} />
              </g>
              <g fill="#e8dcc8" opacity={o}>
                <circle cx={35} cy={22} r={18} />
                <rect x={14} y={46} width={42} height={64} rx={14} />
                <rect x={16} y={104} width={14} height={44} rx={6} />
                <rect x={40} y={104} width={14} height={44} rx={6} />
              </g>
            </svg>
          );
        })}
      </div>
      <div style={{ fontSize: 30, marginTop: 30, opacity: 0.85 }}>{beat.caption}</div>
    </div>
  );
};

/** Two-crate ledger: items fill in one by one; the exception gets a marker. */
export const ExchangeLedger: React.FC<{ beat: LedgerBeat; cfg: RenderConfig }> = ({ beat, cfg }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const col = (title: string, arrow: string, items: string[], color: string, base: number) => (
    <div style={{ flex: 1, background: 'rgba(30,22,14,0.8)', border: `3px solid ${color}`, borderRadius: 14, padding: 24 }}>
      <div style={{ fontSize: 40, fontWeight: 700, color }}>{title}</div>
      <div style={{ fontSize: 24, opacity: 0.75, marginBottom: 14 }}>{arrow}</div>
      {items.map((it, i) => {
        const startF = (base + i * 0.35) * fps;
        const sp = spring({ frame: f - startF, fps, config: { damping: 12, stiffness: 140 } });
        const o = interpolate(f, [startF, startF + 6], [0, 1], clamp);
        const isEx = it === beat.exception;
        const from = title === 'WESTBOUND' ? 60 : -60;
        return (
          <div key={it} style={{ fontSize: 34, margin: '8px 0', opacity: o, transform: `translateX(${(1 - sp) * from}px)`, color: isEx ? '#ffd166' : '#f5e6c8', fontWeight: isEx ? 700 : 400 }}>
            {isEx ? '★ ' : '• '}{it}{isEx ? ' (the exception)' : ''}
          </div>
        );
      })}
    </div>
  );
  return (
    <div data-kit="ledger" style={{ ...rectStyle(cfg.stage), display: 'flex', gap: 28, alignItems: 'stretch', fontFamily: FONT, color: '#f5e6c8', padding: 12, boxSizing: 'border-box' }}>
      {col('WESTBOUND', 'Europe → the Americas', beat.west, '#e9c46a', 0.3)}
      {col('EASTBOUND', 'the Americas → Europe', beat.east, '#8ecae6', 0.3 + beat.west.length * 0.35)}
    </div>
  );
};

/* --------------------------------- debug ---------------------------------- */

export const DebugOverlay: React.FC<{ label: string }> = ({ label }) => (
  <div data-kit="debug" style={{ position: 'absolute', top: 10, left: 10, fontFamily: 'monospace', fontSize: 14, color: 'rgba(255,255,255,0.75)',
    background: 'rgba(0,0,0,0.5)', padding: '2px 6px', zIndex: 100 }}>{label}</div>
);
