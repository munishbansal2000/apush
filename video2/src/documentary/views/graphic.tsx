/** Graphic shots: a reusable component (graphics-catalog.ts) filled with the storyboard's data, revealed on its beats. */
import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLOR} from '../../theme/tokens';
import {AnimatedChart} from '../../components/AnimatedChart';
import {CausalChainSlide} from '../../components/CausalChainSlide';
import {CompareSlide} from '../../components/CompareSlide';
import {HighlightSlide} from '../../components/HighlightSlide';
import {PrimarySourceSpotlight} from '../../components/PrimarySourceSpotlight';
import {CollageSlide} from '../../components/CollageSlide';
import {FigureCard, KineticText} from '../../components/KitMedia';
import {QuoteSlide} from '../../components/QuoteSlide';
import {SpectrumSlide} from '../../components/SpectrumSlide';
import {StaggerSlide} from '../../components/StaggerSlide';
import {useRevealFrame} from '../../components/reveal';
import kitConfig from '../../data/kit-render-config.json';
import type {RenderConfig} from '../../components/KitComponents';
import {RevealProvider} from '../../components/reveal';
import type {GraphicShot} from '../types';

const cfg = kitConfig as unknown as RenderConfig;

/** The collage takes image URLs: lesson paths go through staticFile. */
const CollageGraphic: React.FC<{title?: string; columns?: number; items: {image: string; label?: string}[]}> = ({items, ...rest}) => (
  <CollageSlide {...rest} items={items.map(i => ({...i, image: staticFile(i.image)}))} />
);

/** A person: their portrait large, dim and drifting behind the kit's figure card. */
const PersonCard: React.FC<{name: string; dates: string; role: string; note?: string; image?: string; likeness?: 'from life' | 'later likeness' | 'none'}> = props => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1.05, 1.15], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: COLOR.night}}>
      {props.image && <Img src={staticFile(props.image)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '60% 25%',
        transform: `scale(${zoom})`, filter: 'brightness(0.45) blur(2px)'}} />}
      <FigureCard beat={{kind: 'figure', start: 0, end: durationInFrames, ...props} as never} cfg={cfg} />
    </AbsoluteFill>
  );
};

/** A key term stamps in; its definition follows on the first beat (or after a moment). */
const KeyTerm: React.FC<{term: string; definition: string}> = ({term, definition}) => {
  const {fps} = useVideoConfig();
  const defAt = useRevealFrame(0, Math.round(1.0 * fps)) / fps;
  const termWords = term.split(/\s+/);
  const defWords = definition.split(/\s+/);
  return (
    <AbsoluteFill style={{background: COLOR.night}}>
      <KineticText text={term} level="hero" position={[0.5, 0.42]} color={COLOR.paper} entrance="stamp" cfg={cfg}
        wordOffsets={termWords.map((_, i) => i * 0.12)} keywords={new Set(termWords.map(w => w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '')))} />
      <KineticText text={definition} level="body" position={[0.5, 0.62]} color={COLOR.paperDeep} entrance="fade" cfg={cfg}
        wordOffsets={defWords.map((_, i) => defAt + i * 0.08)} keywords={new Set()} />
    </AbsoluteFill>
  );
};

// Every name in GRAPHICS needs a component here (tests/graphics.test.ts checks both lists match).
export const GRAPHIC_COMPONENTS: Record<string, React.FC<never>> = {
  QuoteSlide, PrimarySourceSpotlight, HighlightSlide, CompareSlide, CausalChainSlide, AnimatedChart,
  KeyTerm, SpectrumSlide, StaggerSlide, CollageSlide: CollageGraphic, PersonCard,
} as unknown as Record<string, React.FC<never>>;

// Inset: scaled into the frame's lower left, clear of the docked Episode Sheet's corner (top right, to 25.5% down / from 73% across).
const INSET_SCALE = 0.72;

export const GraphicView: React.FC<{shot: GraphicShot; lead: number; inset?: boolean}> = ({shot, lead, inset = false}) => {
  const {fps} = useVideoConfig();
  const Component = GRAPHIC_COMPONENTS[shot.component] as unknown as React.FC<Record<string, unknown>> | undefined;
  if (!Component) throw new Error(`unknown graphic "${shot.component}"`);
  // Beats are absolute seconds; the component counts frames from its Sequence start (lead included).
  const revealFrames = shot.beatsSec?.map(sec => Math.max(0, Math.round((sec - shot.startSec + lead) * fps)));
  const body = (
    <RevealProvider revealFrames={revealFrames}>
      {/* The documentary's gold, not the old slide theme's green (a storyboard can still set its own accent). */}
      <Component accent={COLOR.gold} {...shot.props} />
    </RevealProvider>
  );
  if (!inset) return body;
  return (
    <AbsoluteFill style={{background: COLOR.night}}>
      <AbsoluteFill style={{transform: `scale(${INSET_SCALE})`, transformOrigin: '0% 100%'}}>{body}</AbsoluteFill>
    </AbsoluteFill>
  );
};
