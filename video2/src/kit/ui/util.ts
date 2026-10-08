import { interpolate, useCurrentFrame } from 'remotion';

export const useFadeIn = (at = 0, frames = 10) => {
  const f = useCurrentFrame();
  return interpolate(f - at, [0, frames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};
export const FONT = 'Georgia, "Times New Roman", serif';
