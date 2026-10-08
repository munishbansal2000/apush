// Barrel of KEPT components. Superseded components live in src/legacy (see src/legacy/README.md)
// and are intentionally not re-exported here.
// Slideforge components ported to Remotion (same interface as Python)
export { KenBurnsSlide } from './KenBurnsSlide';
export { CompareSlide } from './CompareSlide';

// NEW components (not in slideforge)
export { TimelineRibbon } from './TimelineRibbon';

// Validation system
export * from '../validation/layout';
export * from '../validation/timing';

// Tier 1 conversions (biggest quality delta)
export { TacticalSlide } from './TacticalSlide';
export { CausalChainSlide } from './CausalChainSlide';

// Tier 2 conversions
export { StaggerSlide } from './StaggerSlide';
export { SpectrumSlide } from './SpectrumSlide';

// Market analysis additions (Tier 3)
export { CharacterDialogue } from './CharacterDialogue';
export { AnimatedChart } from './AnimatedChart';
export { ParticleSystem } from './ParticleSystem';
export { IrisTransition } from './IrisTransition';

// Talking heads
export { TalkingHead } from './TalkingHead';
export { Callout } from './Callout';

// Fun history animations
export { Ship } from './Ship';
export { CharacterFace } from './CharacterFace';

// Heimler-style components
export { SpeechBubble } from './SpeechBubble';
export { TitleCard } from './TitleCard';

// Motion Studio components (from apush-motion-studio)
export { PrimarySourceSpotlight } from './PrimarySourceSpotlight';
export { KineticCaptions } from './KineticCaptions';
export { VersusPolarization } from './VersusPolarization';
export { CinematicLowerThird } from './CinematicLowerThird';

// Slideforge Tier 4 (final ports)
export { QuoteSlide } from './QuoteSlide';
export { CollageSlide } from './CollageSlide';
export { HighlightSlide } from './HighlightSlide';

// Motion Studio maps (pre-built for Unit 2/3 content)
export { OregonTrailCinematicMap } from './OregonTrailCinematicMap';
export { JumonvilleGlenTacticalMap } from './JumonvilleGlenTacticalMap';
export { LouisianaPurchaseMap } from './LouisianaPurchaseMap';
export { TerritorialExpansionMap } from './TerritorialExpansionMap';

// Standalone MapJourney (extracted from U1E2Episode — no more inline components)
