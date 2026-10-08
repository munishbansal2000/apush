/**
 * THE ONLY SEAM to UI components the kit renders with.
 *
 * The kit uses its OWN small UI set (src/kit/ui), built to the kit's contract: animate from
 * local frame 0, fill their parent, no independent layout system. This repo's components
 * (src/components) run their own AutoLayout that repositions elements during render and are
 * sized for 1280×720; inside the kit that fights the layout engine and the runtime guard.
 *
 * To use this repo's TalkingHead instead of the kit's head pair, set heads.mode = "single" in
 * data/render-config.json and switch the TalkingHead export below.
 */
export { TalkingHead } from './ui/TalkingHead';
export { TitleCard } from './ui/TitleCard';
export { SpeechBubble } from './ui/SpeechBubble';
export { SmartText } from './ui/SmartText';
export { MapJourney, type JourneyItem } from './ui/MapJourney';
export { PrimarySourceSpotlight } from './ui/PrimarySourceSpotlight';
export { VersusPolarization } from './ui/VersusPolarization';
export { ToneProvider } from './ui/ToneContext';
export { AutoLayoutProvider } from './ui/AutoLayout';
