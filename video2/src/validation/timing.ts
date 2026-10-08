/**
 * Animation timing controls for TTS synchronization.
 *
 * Every slide accepts timing props:
 * - enterDuration: frames for entrance animation (default: 15)
 * - exitDuration: frames for exit animation (default: 15)
 * - holdDuration: frames to hold steady (auto-calculated if not set)
 *
 * For word-level sync (matching TTS):
 * - wordTimings: array of {word, startFrame, endFrame}
 * - Use <TimedWord> to highlight words as they're spoken
 */

export interface WordTiming {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface TimingProps {
  /** Frames for entrance animation */
  enterDuration?: number;
  /** Frames for exit animation */
  exitDuration?: number;
  /** Word-level timings for TTS sync (frame numbers) */
  wordTimings?: WordTiming[];
}

export const DEFAULT_TIMING = {
  enterDuration: 15,
  exitDuration: 15,
};

/**
 * Calculate animation progress with custom enter/exit durations
 * Returns 0→1 for enter, 1→0 for exit, 1 during hold
 */
export function getAnimationProgress(
  frame: number,
  durationInFrames: number,
  enterDuration: number = DEFAULT_TIMING.enterDuration,
  exitDuration: number = DEFAULT_TIMING.exitDuration
): { enter: number; exit: number; hold: number } {
  const enterEnd = Math.min(enterDuration, durationInFrames);
  const exitStart = Math.max(enterEnd, durationInFrames - exitDuration);

  const enter = Math.min(1, frame / enterEnd);
  const exit = frame >= exitStart
    ? 1 - Math.min(1, (frame - exitStart) / exitDuration)
    : 1;
  const hold = frame >= enterEnd && frame < exitStart ? 1 : 0;

  return { enter, exit, hold };
}

/**
 * Find the currently spoken word from TTS timings
 */
export function getCurrentWord(
  frame: number,
  wordTimings: WordTiming[]
): WordTiming | null {
  for (const wt of wordTimings) {
    if (frame >= wt.startFrame && frame <= wt.endFrame) {
      return wt;
    }
  }
  return null;
}

/**
 * Get word index for highlighting (e.g., karaoke-style).
 *
 * Returns -1 before the first word's startFrame (narration hasn't started, so
 * nothing is highlighted or spoken), the index of the word being spoken (or the
 * next word during a gap between words), and wordTimings.length once every
 * word has ended.
 */
export function getWordIndex(
  frame: number,
  wordTimings: WordTiming[]
): number {
  if (wordTimings.length > 0 && frame < wordTimings[0].startFrame) {
    return -1;
  }
  for (let i = 0; i < wordTimings.length; i++) {
    if (frame <= wordTimings[i].endFrame) {
      return i;
    }
  }
  return wordTimings.length;
}
