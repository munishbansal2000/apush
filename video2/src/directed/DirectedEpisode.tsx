import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {TitleCard} from '../components/TitleCard';
import {KenBurnsSlide} from '../components/KenBurnsSlide';
import {QuoteSlide} from '../components/QuoteSlide';
import {CompareSlide} from '../components/CompareSlide';
import {CausalChainSlide} from '../components/CausalChainSlide';
import {HighlightSlide} from '../components/HighlightSlide';
import {PrimarySourceSpotlight} from '../components/PrimarySourceSpotlight';

export interface DirectedTurn { id: string; kind: 'speech' | 'pause'; text?: string }
export interface DirectedTiming { starts: number[]; durations: number[]; totalSec: number }
export interface DirectedScene {
  id: string;
  component: 'title' | 'ken_burns' | 'quote' | 'compare' | 'causal_chain' | 'highlight' | 'primary_source' | 'creative_clip';
  props: Record<string, unknown>;
  startSec: number;
  endSec: number;
  transition?: 'cut' | 'crossfade' | 'dip';
}
export interface DirectedProps extends Record<string, unknown> {
  episode: string;
  plan: {title: string; scenes: DirectedScene[]};
  turns: DirectedTurn[];
  timing: DirectedTiming;
}

const SceneBody: React.FC<{scene: DirectedScene}> = ({scene}) => {
  const p = scene.props as any;
  switch (scene.component) {
    case 'title': return <TitleCard title={p.title ?? ''} kicker={p.kicker} subline={p.subline} />;
    case 'ken_burns': return <KenBurnsSlide image={p.image ?? ''} title={p.title} caption={p.caption} stops={p.stops} />;
    case 'quote': return <QuoteSlide quote={p.quote ?? ''} byline={p.byline} />;
    case 'compare': return <CompareSlide title={p.title} left={p.left} right={p.right} />;
    case 'causal_chain': return <CausalChainSlide title={p.title} nodes={p.nodes ?? []} />;
    case 'highlight': return <HighlightSlide title={p.title} body={p.body ?? ''} highlights={p.highlights ?? []} />;
    case 'primary_source': return <PrimarySourceSpotlight {...p} />;
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

const SceneFrame: React.FC<{scene: DirectedScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const fade = scene.transition === 'crossfade' ? 12 : scene.transition === 'dip' ? 18 : 0;
  const opacity = fade
    ? Math.min(
        interpolate(frame, [0, fade], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        interpolate(frame, [durationInFrames - fade, durationInFrames - 1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
      )
    : 1;
  return <AbsoluteFill style={{opacity, background: '#0b1020'}}><SceneBody scene={scene} /></AbsoluteFill>;
};

export const DirectedEpisode: React.FC<DirectedProps> = ({episode, plan, turns, timing}) => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#0b1020'}}>
      {plan.scenes.map(scene => {
        const from = Math.round(scene.startSec * fps);
        const durationInFrames = Math.max(1, Math.ceil((scene.endSec - scene.startSec) * fps));
        return <Sequence key={scene.id} name={scene.id} from={from} durationInFrames={durationInFrames}><SceneFrame scene={scene} /></Sequence>;
      })}
      {turns.map((turn, index) => turn.kind === 'speech' ? (
        <Sequence key={turn.id} from={Math.round(timing.starts[index] * fps)} durationInFrames={Math.max(1, Math.ceil(timing.durations[index] * fps))}>
          <Audio src={staticFile(`audio/${episode}/${turn.id}.mp3`)} />
        </Sequence>
      ) : null)}
    </AbsoluteFill>
  );
};
