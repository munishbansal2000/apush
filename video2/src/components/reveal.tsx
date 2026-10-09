/**
 * Scene context for directed rendering. Components read it through hooks and fall back to their built-in timing and
 * sizes when no provider is present, so the hand-built component episodes render exactly as before.
 *   revealFrames[i]  scene-local frame at which item i appears (spoken cue resolved from Vosk)
 *   textScale        type multiplier for scenes scaled down into the kit stage
 */
import React, {createContext, useContext} from 'react';

interface SceneContextValue {revealFrames?: number[]; textScale: number}
const SceneContext = createContext<SceneContextValue>({textScale: 1});

export const RevealProvider: React.FC<{revealFrames?: number[]; textScale?: number; children: React.ReactNode}> = ({revealFrames, textScale, children}) => (
  // Scenes shrink by `s` in the stage; boosting type by 1/s would overflow layouts designed full-frame, so use 1/sqrt(s).
  <SceneContext.Provider value={{revealFrames, textScale: textScale ? Math.sqrt(textScale) : 1}}>{children}</SceneContext.Provider>
);

/** Frame item `index` appears: the spoken cue when the plan has one, else the component's own `fallback`. */
export const useRevealFrame = (index: number, fallback: number): number => {
  const frames = useContext(SceneContext).revealFrames;
  const cue = frames?.[index];
  return typeof cue === 'number' && Number.isFinite(cue) ? Math.max(0, cue) : fallback;
};

/** All reveal frames at once (for components that compute positions in a loop). */
export const useRevealFrames = (): number[] | undefined => useContext(SceneContext).revealFrames;

export const useTextScale = (): number => useContext(SceneContext).textScale;
