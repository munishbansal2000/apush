/** One component in the gallery: rendered full-frame (1280×720) for durationInFrames. */
import type React from 'react';

export interface GallerySlot {
  /** Component export name, e.g. 'TacticalSlide' */
  name: string;
  /** File under src/components, e.g. 'TacticalSlide.tsx' (legacy components: '../legacy/TitleSlide.tsx') */
  file: string;
  /** 90–240 frames (3–8 s at 30 fps); enough for the entrance animation to finish */
  durationInFrames: number;
  /** Renders the component with valid, representative props (local frame starts at 0) */
  render: () => React.ReactNode;
  /** Anything a reviewer should know (needs real assets, odd behaviour, bug found) */
  notes?: string;
}
