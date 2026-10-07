// Slideforge components ported to Remotion (same interface as Python)
export { TitleSlide } from './TitleSlide';
export { KenBurnsSlide } from './KenBurnsSlide';
export { DisplayHeadline } from './DisplayHeadline';
export { CompareSlide } from './CompareSlide';

// NEW components (not in slideforge)
export { WordPop } from './WordPop';
export { TimelineRibbon } from './TimelineRibbon';
export { TimedText } from './TimedText';

// Validation system
export * from '../validation/layout';
export * from '../validation/timing';

// Tier 1 conversions (biggest quality delta)
export { TacticalSlide } from './TacticalSlide';
export { TerritorySlide } from './TerritorySlide';
export { CausalChainSlide } from './CausalChainSlide';

// Tier 2 conversions
export { StaggerSlide } from './StaggerSlide';
export { SpectrumSlide } from './SpectrumSlide';
export { MapZoomSlide } from './MapZoomSlide';

// Market analysis additions (Tier 3)
export { SeamlessZoom } from './SeamlessZoom';
export { CharacterDialogue } from './CharacterDialogue';
export { AnimatedChart } from './AnimatedChart';
export { ParticleSystem } from './ParticleSystem';
export { DocumentReveal } from './DocumentReveal';
export { IrisTransition } from './IrisTransition';

// Talking heads
export { TalkingHead } from './TalkingHead';
export { DualTalkingHeads } from './DualTalkingHeads';
export { Callout } from './Callout';

// Fun history animations
export { Duel } from './Duel';
export { Argument } from './Argument';
export { Ship } from './Ship';
export { CharacterFace } from './CharacterFace';

// Heimler-style components
export { SpeechBubble } from './SpeechBubble';
export { TitleCard } from './TitleCard';

// Motion Studio components (from apush-motion-studio)
export { PrimarySourceSpotlight } from './PrimarySourceSpotlight';
export { KineticCaptions } from './KineticCaptions';
export { HistoricalTimeline } from './HistoricalTimeline';
export { VersusPolarization } from './VersusPolarization';
export { CinematicLowerThird } from './CinematicLowerThird';

// Slideforge Tier 4 (final ports)
export { QuoteSlide } from './QuoteSlide';
export { DuoSlide } from './DuoSlide';
export { SplitSlide } from './SplitSlide';
export { CollageSlide } from './CollageSlide';
export { HighlightSlide } from './HighlightSlide';

// Motion Studio maps (pre-built for Unit 2/3 content)
export { OregonTrailCinematicMap } from './OregonTrailCinematicMap';
export { JumonvilleGlenTacticalMap } from './JumonvilleGlenTacticalMap';
export { LouisianaPurchaseMap } from './LouisianaPurchaseMap';
export { TerritorialExpansionMap } from './TerritorialExpansionMap';

// Standalone MapJourney (extracted from U1E2Episode — no more inline components)
export { MapJourney } from './MapJourney';
export type { JourneyItem } from './MapJourney';
