import React, { createContext, useContext } from 'react';

export type SceneTone = 'serious' | 'fun' | 'dramatic' | 'playful';

interface ToneContextValue {
  tone: SceneTone;
  /** Whether to use realistic (true) or stylized (false) assets */
  realistic: boolean;
}

const ToneContext = createContext<ToneContextValue>({
  tone: 'serious',
  realistic: true,
});

interface ToneProviderProps {
  tone: SceneTone;
  children: React.ReactNode;
}

/**
 * ToneProvider — captures the narrative context for a scene.
 *
 * serious: Photorealistic assets. For key facts, primary sources, solemn moments.
 * fun: Semi-cartoon stylized assets. For humor, engagement, memorable moments.
 * dramatic: Photorealistic with cinematic treatment. For turning points, tension.
 * playful: Semi-cartoon with extra energy. For games, quizzes, light moments.
 *
 * Components read this context and switch assets automatically.
 * Set once per scene — everything adapts.
 */
export const ToneProvider: React.FC<ToneProviderProps> = ({ tone, children }) => {
  const realistic = tone === 'serious' || tone === 'dramatic';

  return (
    <ToneContext.Provider value={{ tone, realistic }}>
      {children}
    </ToneContext.Provider>
  );
};

export const useTone = () => useContext(ToneContext);

/**
 * Resolve asset path based on tone.
 * Provide both versions: { realistic: 'maya-real.webp', stylized: 'maya-toon.webp' }
 */
export function resolveAsset(
  assets: { realistic: string; stylized: string },
  realistic: boolean
): string {
  return realistic ? assets.realistic : assets.stylized;
}
