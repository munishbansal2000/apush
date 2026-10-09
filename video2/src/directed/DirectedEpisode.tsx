/**
 * DirectedEpisode: renders a validated scene plan in the kit frame at 1920×1080 (src/data/kit-render-config.json rects):
 *   - stage:      each scene renders at full composition size and is scaled into the stage rect
 *   - boxTracker: the kit Episode Sheet, driven by the plan's spoken box cues; it opens large mid-stage while the
 *                 boxes are named, then flies into its corner
 *   - head:       only the current speaker (kit HeadFace art, audio-reactive from per-frame levels)
 *   - captions:   the kit CaptionLine, word-timed from Vosk
 * Every element sits in a guard <Track>, and <LayoutGuard> measures each rendered frame.
 * Transitions: crossfade overlaps the incoming scene over the outgoing one; dip fades out and back in.
 */
import React, {useRef} from 'react';
import {AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {TitleCard} from '../components/TitleCard';
import {KenBurnsSlide} from '../components/KenBurnsSlide';
import {QuoteSlide} from '../components/QuoteSlide';
import {CompareSlide} from '../components/CompareSlide';
import {CausalChainSlide} from '../components/CausalChainSlide';
import {HighlightSlide} from '../components/HighlightSlide';
import {PrimarySourceSpotlight} from '../components/PrimarySourceSpotlight';
import {AnimatedChart} from '../components/AnimatedChart';
import {SpectrumSlide} from '../components/SpectrumSlide';
import {StaggerSlide} from '../components/StaggerSlide';
import {captionChunks} from '../kit/captions';
import {BoxTracker, CaptionLine, Vignette} from '../kit/components';
import {GUARD_WRAPPER, LayoutGuard, Track} from '../kit/guard';
import type {RenderConfig} from '../kit/layout';
import type {TimelineTurn, WordTimesFile} from '../kit/types';
import {ActiveHead, activeSpeakerAt} from './ActiveHead';
import {sheetTransform} from './boxIntro';
import {RevealProvider} from './reveal';
import renderConfigJson from '../data/kit-render-config.json';

const cfg = renderConfigJson as unknown as RenderConfig;

export type DirectedComponent = 'title' | 'ken_burns' | 'quote' | 'compare' | 'causal_chain' | 'highlight' | 'primary_source' | 'creative_clip' | 'chart' | 'spectrum' | 'stagger';
export interface DirectedTurn {id: string; kind: 'speech' | 'pause'; speaker?: string; text?: string}
export interface DirectedTiming {starts: number[]; durations: number[]; totalSec: number}
export interface DirectedScene {
  id: string;
  component: DirectedComponent;
  props: Record<string, unknown>;
  startSec: number;
  endSec: number;
  transition?: 'cut' | 'crossfade' | 'dip';
  /** Absolute seconds each revealable item appears (from the plan's spoken cues). */
  revealSec?: number[];
}
export interface DirectedBox {label: string; introSec: number; checkSec: number; startSec: number; endSec: number}
export interface DirectedProps extends Record<string, unknown> {
  episode: string;
  plan: {title: string; boxes?: DirectedBox[]; scenes: DirectedScene[]};
  turns: DirectedTurn[];
  timing: DirectedTiming;
  /** Vosk word times per turn id (seconds from the turn's start). */
  words?: Record<string, {w: string; s: number; e: number}[]>;
  /** Per-turn loudness per frame (0..1) for the audio-reactive heads. */
  levels?: Record<string, number[]>;
}

/** Frames of overlap for a crossfade, and of fade-out + fade-in for a dip. */
export const CROSSFADE_FRAMES = 12;
export const DIP_FRAMES = 9;

const SceneBody: React.FC<{scene: DirectedScene}> = ({scene}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- props were validated by the pipeline gate
  const p = scene.props as any;
  switch (scene.component) {
    case 'title': return <TitleCard title={p.title ?? ''} kicker={p.kicker} subline={p.subline} />;
    case 'ken_burns': return <KenBurnsSlide image={p.image ?? ''} title={p.title} caption={p.caption} stops={p.stops} />;
    case 'quote': return <QuoteSlide quote={p.quote ?? ''} byline={p.byline} />;
    case 'compare': return <CompareSlide title={p.title} left={p.left} right={p.right} />;
    case 'causal_chain': return <CausalChainSlide title={p.title} nodes={p.nodes ?? []} />;
    case 'highlight': return <HighlightSlide title={p.title} body={p.body ?? ''} highlights={p.highlights ?? []} />;
    case 'primary_source': return <PrimarySourceSpotlight {...p} />;
    case 'chart': return <AnimatedChart type={p.type} data={p.data ?? []} labels={p.labels} title={p.title} />;
    case 'spectrum': return <SpectrumSlide axis={p.axis} markers={p.markers ?? []} title={p.title} />;
    case 'stagger': return <StaggerSlide panels={p.panels ?? []} title={p.title} />;
    case 'creative_clip': return (
      <AbsoluteFill style={{background: '#0b1020'}}>
        <OffthreadVideo src={staticFile(p.clip)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        {(p.title || p.caption) && <AbsoluteFill style={{justifyContent: 'flex-end', padding: '48px 64px', background: 'linear-gradient(transparent 55%, rgba(7,12,25,.86))'}}>
          {p.title && <div style={{fontSize: 48, fontWeight: 800, color: 'white'}}>{p.title}</div>}
          {p.caption && <div style={{fontSize: 28, color: '#e8dfc5', marginTop: 12}}>{p.caption}</div>}
        </AbsoluteFill>}
      </AbsoluteFill>
    );
  }
};

/** Frame window of each scene's Sequence: a crossfade starts early so the incoming scene can blend over the outgoing one. */
export function sceneWindows(scenes: DirectedScene[], fps: number) {
  return scenes.map((scene, i) => {
    const start = Math.round(scene.startSec * fps);
    const end = Math.round(scene.endSec * fps);
    const lead = i > 0 && scene.transition === 'crossfade' ? CROSSFADE_FRAMES : 0;
    const from = Math.max(0, start - lead);
    return {from, durationInFrames: Math.max(1, end - from), lead: start - from, fadeOut: scenes[i + 1]?.transition === 'dip' ? DIP_FRAMES : 0};
  });
}

/** Opacity of a scene at local frame f: crossfade in over `lead`, dip in after a dip, dip out before a dip. */
export function sceneOpacity(scene: DirectedScene, index: number, f: number, window: ReturnType<typeof sceneWindows>[number]): number {
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  let o = 1;
  if (window.lead > 0) o = Math.min(o, interpolate(f, [0, window.lead], [0, 1], clamp));
  if (scene.transition === 'dip' || index === 0) o = Math.min(o, interpolate(f, [0, DIP_FRAMES], [0, 1], clamp));
  if (window.fadeOut > 0) o = Math.min(o, interpolate(f, [window.durationInFrames - window.fadeOut, window.durationInFrames], [1, 0], clamp));
  return o;
}

const ScaledScene: React.FC<{scene: DirectedScene; index: number; window: ReturnType<typeof sceneWindows>[number]}> = ({scene, index, window}) => {
  const f = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const [x0, y0, x1, y1] = cfg.stage;
  const stageW = (x1 - x0) * width;
  const stageH = (y1 - y0) * height;
  const scale = Math.min(stageW / width, stageH / height);
  const sceneStartSec = window.from / fps;
  const opacity = sceneOpacity(scene, index, f, window);
  return (
    // While fading (crossfade/dip) the two scenes overlap on purpose; the guard skips [data-guard-moving].
    <div {...GUARD_WRAPPER} data-guard-moving={opacity < 1 ? '' : undefined} style={{position: 'absolute', left: x0 * width + (stageW - width * scale) / 2, top: y0 * height + (stageH - height * scale) / 2,
      width: width * scale, height: height * scale, opacity}}>
      <div style={{width, height, transform: `scale(${scale})`, transformOrigin: 'top left', borderRadius: 16 / scale, overflow: 'hidden', background: '#0b1020'}}>
        <RevealProvider revealFrames={scene.revealSec?.map(sec => Math.round((sec - sceneStartSec) * fps))} textScale={1 / scale}>
          <SceneBody scene={scene} />
        </RevealProvider>
      </div>
    </div>
  );
};

/** Kit timeline view of the pipeline's turns (captions use it). */
function kitTimeline(turns: DirectedTurn[], timing: DirectedTiming): TimelineTurn[] {
  return turns.map((turn, idx) => ({
    turn: turn.kind === 'speech'
      ? {id: turn.id, idx, kind: 'speech', speaker: turn.speaker ?? 'narrator', text: (turn.text ?? '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim(), tags: []}
      : {id: turn.id, idx, kind: 'pause', pauseSec: timing.durations[idx], line: 0},
    start: timing.starts[idx],
    dur: timing.durations[idx],
  })) as unknown as TimelineTurn[];
}

export const DirectedEpisode: React.FC<DirectedProps> = ({episode, plan, turns, timing, words = {}, levels = {}}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const rootRef = useRef<HTMLDivElement>(null);
  const windows = sceneWindows(plan.scenes, fps);
  const timeline = React.useMemo(() => kitTimeline(turns, timing), [turns, timing]);
  const chunks = React.useMemo(() => captionChunks(timeline, words as WordTimesFile, cfg.captions.maxChars), [timeline, words]);
  const caption = chunks.find(c => t >= c.start && t < c.end) ?? null;
  const speakers = cfg.speakers as Record<string, {name: string; color: string; toon: string}>;
  const head = activeSpeakerAt(turns, timing, t, speaker => !!speakers[speaker]);
  const {width, height} = useVideoConfig();
  const boxes = plan.boxes ?? [];
  const currentBox = boxes.findIndex(b => t >= b.startSec && t < b.endSec);
  const sheet = sheetTransform(boxes.map(b => b.introSec), t, {width, height}, cfg.boxTracker.rect, cfg.stage);
  const [sx0, sy0, sx1, sy1] = cfg.stage;
  return (
    <AbsoluteFill ref={rootRef} data-kit-root style={{background: '#1a1512'}}>
      <Vignette />
      <Track id="stage" role="stage">
        {plan.scenes.map((scene, i) => (
          <Sequence key={scene.id} name={scene.id} from={windows[i].from} durationInFrames={windows[i].durationInFrames} layout="none">
            <ScaledScene scene={scene} index={i} window={windows[i]} />
          </Sequence>
        ))}
      </Track>
      {turns.map((turn, index) => turn.kind === 'speech' ? (
        <Sequence key={turn.id} from={Math.round(timing.starts[index] * fps)} durationInFrames={Math.max(1, Math.ceil(timing.durations[index] * fps))} layout="none">
          <Audio src={staticFile(`audio/${episode}/${turn.id}.mp3`)} />
        </Sequence>
      ) : null)}
      {sheet.dim > 0 && (
        // Dim only the stage while the big sheet is up; captions and the speaker stay bright.
        <div style={{position: 'absolute', left: sx0 * width, top: sy0 * height, width: (sx1 - sx0) * width, height: (sy1 - sy0) * height, borderRadius: 16, background: `rgba(10,8,6,${sheet.dim})`}} />
      )}
      {boxes.length > 0 && sheet.phase !== 'hidden' && (
        // Big/flying: a cover over the stage (guard-exempt). Docked: persistent chrome in its own rect.
        <Track id="chrome:box-tracker" role={sheet.phase === 'docked' ? 'chrome' : 'cover'}>
          <div {...GUARD_WRAPPER} style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${sheet.tx}px, ${sheet.ty}px) scale(${sheet.scale})`}}>
            <BoxTracker cfg={cfg} state={{
              boxes: boxes.map(b => b.label),
              checkedAt: boxes.map(b => b.checkSec),
              introAt: boxes.map(b => b.introSec),
              current: currentBox >= 0 ? {box: currentBox + 1, progress: (t - boxes[currentBox].startSec) / (boxes[currentBox].endSec - boxes[currentBox].startSec), since: boxes[currentBox].startSec} : null,
              t,
            }} />
          </div>
        </Track>
      )}
      <Track id="chrome:head" role="chrome" allowUnsafe>
        <ActiveHead
          state={head}
          level={head ? levels[turns[head.turnIndex].id]?.[frame - Math.round(timing.starts[head.turnIndex] * fps)] ?? 0 : 0}
          cfg={cfg}
        />
      </Track>
      {caption && (
        <Track id="chrome:captions" role="chrome">
          <CaptionLine words={caption.words} t={t} color={speakers[caption.speaker]?.color ?? '#fff'} cfg={cfg} />
        </Track>
      )}
      <LayoutGuard cfg={cfg} rootRef={rootRef} />
    </AbsoluteFill>
  );
};
