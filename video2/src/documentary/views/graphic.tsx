/** Graphic shots: a reusable component (graphics-catalog.ts) filled with the storyboard's data, revealed on its beats. */
import React from 'react';
import {useVideoConfig} from 'remotion';
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

export const GraphicView: React.FC<{shot: GraphicShot; lead: number}> = ({shot, lead}) => {
  const {fps} = useVideoConfig();
  const Component = GRAPHIC_COMPONENTS[shot.component] as unknown as React.FC<Record<string, unknown>> | undefined;
  if (!Component) throw new Error(`unknown graphic "${shot.component}"`);
  // Beats are absolute seconds; the component counts frames from its Sequence start (lead included).
  const revealFrames = shot.beatsSec?.map(sec => Math.max(0, Math.round((sec - shot.startSec + lead) * fps)));
  return (
    <RevealProvider revealFrames={revealFrames}>
      <Component {...shot.props} />
    </RevealProvider>
  );
};
