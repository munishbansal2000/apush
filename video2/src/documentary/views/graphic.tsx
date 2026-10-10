/** Graphic shots: a reusable component (graphics-catalog.ts) filled with the storyboard's data, revealed on its beats. */
import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {COLOR} from '../../theme/tokens';
import {AnimatedChart} from '../../components/AnimatedChart';
import {CausalChainSlide} from '../../components/CausalChainSlide';
import {CompareSlide} from '../../components/CompareSlide';
import {HighlightSlide} from '../../components/HighlightSlide';
import {PrimarySourceSpotlight} from '../../components/PrimarySourceSpotlight';
import {QuoteSlide} from '../../components/QuoteSlide';
import {RevealProvider} from '../../components/reveal';
import type {GraphicShot} from '../types';

// Every name in GRAPHICS needs a component here (tests/graphics.test.ts checks both lists match).
export const GRAPHIC_COMPONENTS: Record<string, React.FC<never>> = {
  QuoteSlide, PrimarySourceSpotlight, HighlightSlide, CompareSlide, CausalChainSlide, AnimatedChart,
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
      <Component {...shot.props} />
    </RevealProvider>
  );
  if (!inset) return body;
  return (
    <AbsoluteFill style={{background: COLOR.night}}>
      <AbsoluteFill style={{transform: `scale(${INSET_SCALE})`, transformOrigin: '0% 100%'}}>{body}</AbsoluteFill>
    </AbsoluteFill>
  );
};
