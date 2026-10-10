/**
 * DocEpisode: the visuals-first documentary renderer (docs/LOOK.md). Full-bleed shots cut on spoken cues, film grain
 * and vignette, year stamps, the Episode Sheet (opens mid-screen as boxes are named, then docks), narration, a music
 * bed ducked under speech, and sound effects on cuts and cues. Every element is inside a guard <Track>.
 */
import React, {useRef} from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BoxTracker, Vignette} from '../kit/components';
import {GUARD_WRAPPER, LayoutGuard, Track} from '../kit/guard';
import type {RenderConfig} from '../kit/layout';
import {FilmGrain} from '../kit/media';
import {sheetTransform} from './sheet';
import kitConfig from '../data/kit-render-config.json';
import {AtmosphereLayers} from './atmosphere';
// Shot views are reached only through ShotBody's switch on shot type: each segment's render cache is keyed by the
// views its shots use (tools/pipeline/stages/doc.ts), so a view must not render outside its shot type.
import {ClipView} from './views/clip';
import {CustomView} from './views/custom';
import {GraphicView} from './views/graphic';
import {ImageMoveView} from './views/image';
import {MapView} from './views/map';
import {PointView} from './views/point';
import {QuestionView} from './views/question';
import {YearStampView, YEAR_STAMP_LEAD_SEC, yearStampSpans, yearStampZone} from './views/year-stamp';
import {ChromeZones} from './chrome-zones';
import type {DocEpisodeProps, DocShot} from './types';

const cfg = kitConfig as unknown as RenderConfig;
export const DOC_CROSSFADE_FRAMES = 10;
/** Where the big Episode Sheet sits while the boxes are named: the middle of the frame. */
const SHEET_STAGE: [number, number, number, number] = [0.15, 0.12, 0.85, 0.88];

const SFX = {whoosh: 'sfx/whoosh-soft.wav', hit: 'sfx/hit.wav', quill: 'sfx/quill.wav', tick: 'sfx/tick.wav', check: 'sfx/check.wav'} as const;
const SFX_VOLUME: Record<keyof typeof SFX, number> = {whoosh: 0.22, hit: 0.32, quill: 0.3, tick: 0.2, check: 0.4};

/** Sequence window per shot: a crossfade starts early so the incoming shot blends over the outgoing one. */
export function shotWindows(shots: DocShot[], fps: number) {
  return shots.map((shot, i) => {
    const start = Math.round(shot.startSec * fps);
    const lead = i > 0 && shot.transition === 'crossfade' ? DOC_CROSSFADE_FRAMES : 0;
    return {from: start - lead, durationInFrames: Math.max(1, Math.round(shot.endSec * fps) - start + lead), leadFrames: lead};
  });
}

/** Sound cues derived from the plan: whoosh on every cut, hit on year stamps, quill per bullet, tick/check on the sheet. */
export function soundCues(props: Pick<DocEpisodeProps, 'shots' | 'years' | 'boxes'>): {name: keyof typeof SFX; sec: number}[] {
  const cues: {name: keyof typeof SFX; sec: number}[] = [];
  props.shots.forEach((shot, i) => {
    if (i > 0) cues.push({name: 'whoosh', sec: shot.startSec - 0.15});
    if (shot.type === 'point') for (const b of shot.bullets) cues.push({name: 'quill', sec: b.sec});
  });
  for (const y of props.years ?? []) cues.push({name: 'hit', sec: y.sec});
  for (const b of props.boxes ?? []) cues.push({name: 'tick', sec: b.introSec}, {name: 'check', sec: b.checkSec});
  return cues.filter(c => c.sec >= 0).sort((a, b) => a.sec - b.sec);
}

const ShotBody: React.FC<{shot: DocShot; lead: number}> = ({shot, lead}) => {
  switch (shot.type) {
    case 'image_move':
    case 'portrait': return <ImageMoveView shot={shot} lead={lead} />;
    case 'clip': return <ClipView shot={shot} lead={lead} />;
    case 'map': return <MapView shot={shot} lead={lead} />;
    case 'point': return <PointView shot={shot} lead={lead} />;
    case 'question': return <QuestionView shot={shot} lead={lead} />;
    case 'custom': return <CustomView shot={shot} lead={lead} />;
    case 'graphic': return <GraphicView shot={shot} lead={lead} />;
  }
};

/** A shot plus its atmosphere. Portraits and point cards place it themselves, under their text. */
const ShotView: React.FC<{shot: DocShot; lead: number}> = ({shot, lead}) => (
  <>
    <ShotBody shot={shot} lead={lead} />
    {shot.type !== 'point' && shot.type !== 'portrait' && shot.type !== 'question' && shot.type !== 'custom' && shot.type !== 'graphic' && <AtmosphereLayers kinds={shot.atmosphere} seed={shot.id} />}
  </>
);

const Fade: React.FC<{leadFrames: number; children: React.ReactNode}> = ({leadFrames, children}) => {
  const f = useCurrentFrame();
  const o = leadFrames > 0 ? interpolate(f, [0, leadFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  return <div {...GUARD_WRAPPER} data-guard-moving={o < 1 ? '' : undefined} style={{position: 'absolute', inset: 0, opacity: o}}>{children}</div>;
};

export const DocEpisode: React.FC<DocEpisodeProps> = ({episode, shots, years: yearsIn = [], boxes = [], turns, timing, audioTrack, guard = true, reviewLabel = false, acts = []}) => {
  // One year stamp at a time: a stamp gives way (fades out early) when the next year is spoken.
  const years = [...yearsIn].sort((a, b) => a.sec - b.sec);
  const spans = yearStampSpans(years, useVideoConfig().fps);
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const rootRef = useRef<HTMLDivElement>(null);
  const windows = shotWindows(shots, fps);
  const sheet = sheetTransform(boxes.map(b => b.introSec), t, {width, height}, cfg.boxTracker.rect, SHEET_STAGE);
  const currentBox = boxes.findIndex(b => t >= b.startSec && t < b.endSec);
  // The Episode Sheet steps aside while a question card is up.
  const onQuestion = shots.some(s => s.type === 'question' && t >= s.startSec && t < s.endSec);
  // Map labels step aside from the chrome on screen: a year stamp while it is up, the docked sheet while it shows.
  const sheetOpacity = boxes.length && sheet.phase === 'docked' ? (onQuestion ? 0 : dockedOpacity(t, boxes)) : 0;
  const [rx0, ry0, rx1, ry1] = cfg.boxTracker.rect;
  const zones = [
    ...years.map((y, i) => ({y, span: spans[i]})).filter(({y, span}) => t >= y.sec - YEAR_STAMP_LEAD_SEC && t < y.sec + span).map(({y, span}) => yearStampZone(y.text, frame - Math.round(y.sec * fps), fps, width, height, span)),
    ...(sheetOpacity > 0 ? [{rect: [rx0 * width, ry0 * height, rx1 * width, ry1 * height] as [number, number, number, number], opacity: Math.min(1, sheetOpacity / 0.04)}] : []), // gone before the sheet is visible (the guard judges from 0.05)
  ];
  const speaking = (sec: number) => turns.some((turn, i) => turn.kind === 'speech' && sec >= timing.starts[i] && sec < timing.starts[i] + timing.durations[i]);
  return (
    <AbsoluteFill ref={rootRef} data-kit-root style={{background: '#0b0907'}}>
      <ChromeZones.Provider value={zones}>
      <Track id="shots" role="cover">
        {shots.map((shot, i) => (
          <Sequence key={shot.id} name={`${shot.id} ${shot.type}`} from={windows[i].from} durationInFrames={windows[i].durationInFrames} layout="none">
            <Fade leadFrames={windows[i].leadFrames}><ShotView shot={shot} lead={windows[i].leadFrames / fps} /></Fade>
          </Sequence>
        ))}
      </Track>
      </ChromeZones.Provider>
      <Vignette />
      <Track id="bg:grain" role="bg"><FilmGrain opacity={0.08} /></Track>
      {years.map((y, i) => (
        <Sequence key={`y-${y.sec}`} from={Math.round(y.sec * fps)} durationInFrames={Math.max(1, Math.round(spans[i] * fps))} layout="none">
          <Track id={`chrome:year-${y.text}`} role="chrome"><YearStampView text={y.text} holdSec={spans[i]} /></Track>
        </Sequence>
      ))}
      {boxes.length > 0 && sheet.phase !== 'hidden' && (
        <>
          {sheet.dim > 0 && <div style={{position: 'absolute', inset: 0, background: `rgba(8,6,4,${sheet.dim})`}} />}
          <Track id="chrome:box-tracker" role={sheet.phase === 'docked' ? 'chrome' : 'cover'}>
            <div {...GUARD_WRAPPER} style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${sheet.tx}px, ${sheet.ty}px) scale(${sheet.scale})`,
              // Docked, the sheet recedes to a translucent tab and comes forward around box events.
              opacity: sheet.phase === 'docked' ? sheetOpacity : 1}}>
              <BoxTracker cfg={cfg} state={{
                boxes: boxes.map(b => b.label),
                checkedAt: boxes.map(b => b.checkSec),
                introAt: boxes.map(b => b.introSec),
                current: currentBox >= 0 ? {box: currentBox + 1, progress: (t - boxes[currentBox].startSec) / (boxes[currentBox].endSec - boxes[currentBox].startSec), since: boxes[currentBox].startSec} : null,
                t,
              }} />
            </div>
          </Track>
        </>
      )}
      {audioTrack ? <Audio src={staticFile(audioTrack)} /> : turns.map((turn, index) => turn.kind === 'speech' ? (
        <Sequence key={turn.id} from={Math.round(timing.starts[index] * fps)} durationInFrames={Math.max(1, Math.ceil(timing.durations[index] * fps))} layout="none">
          <Audio src={staticFile(`audio/${episode}/${turn.id}.mp3`)} />
        </Sequence>
      ) : null)}
      {!audioTrack && <Audio src={staticFile('music/bed.mp3')} loop volume={f => (speaking(f / fps) ? 0.05 : 0.14) * Math.min(1, f / fps / 1.5)} />}
      {!audioTrack && soundCues({shots, years, boxes}).map((c, i) => (
        <Sequence key={`sfx-${i}`} from={Math.round(c.sec * fps)} durationInFrames={Math.round(1.5 * fps)} layout="none">
          <Audio src={staticFile(SFX[c.name])} volume={SFX_VOLUME[c.name]} />
        </Sequence>
      ))}
      {reviewLabel && (() => {
        // Which line, shot and act is on screen: what a review note refers to (npm run review -- <lesson> note ...).
        const line = timing.starts.reduce((found, s, i) => (t >= s ? i : found), 0);
        const shot = shots.find(s => t >= s.startSec && t < s.endSec);
        const act = acts.findIndex(a => line >= a.turns.from && line <= a.turns.to) + 1;
        return (
          <div style={{position: 'absolute', left: 16, bottom: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', color: '#fff',
            fontFamily: 'monospace', fontSize: 22, zIndex: 300}}>
            {`line ${line}${act ? ` · act ${act}` : ''}${shot ? ` · ${shot.id} ${shot.type}` : ''}`}
          </div>
        );
      })()}
      {guard && <LayoutGuard cfg={cfg} rootRef={rootRef} />}
    </AbsoluteFill>
  );
};

/** Docked sheet opacity: a quiet 0.55 tab, full for 2.5s around each box start and check. */
export function dockedOpacity(t: number, boxes: {startSec: number; checkSec: number}[]): number {
  const near = boxes.some(b => Math.abs(t - b.startSec) < 2.5 || (t >= b.checkSec - 0.5 && t < b.checkSec + 2.5));
  return near ? 1 : 0.55;
}
