import React, { useRef, useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { TalkingHead } from './TalkingHead';
import { ToneProvider, SceneTone } from '../validation/ToneContext';
import { AutoLayoutProvider } from '../validation/AutoLayout';
import { LayoutGuard, Track, DEFAULT_GUARD_CONFIG } from '../lib/guard';
import { deriveTermChips } from '../lib/derive-terms';
import { TermChipView } from './KitOverlays';
import renderConfig from '../data/render-config.json';

interface Turn {
  id: string;
  speaker: string;
  text: string;
}

interface EpisodeShellProps {
  episode: string; // 'E3', 'E4', etc.
  turns: Turn[];
  starts: number[]; // seconds
  durations: number[]; // seconds
  audioPath: (turnId: string) => string; // e.g. (id) => `audio/e3/${id}.mp3`
  backgroundForTurn: (turnId: string) => string; // image src
  seriousFromTurn?: number; // turn index where serious tone starts
  /** Per-turn tone override (e.g. from a lesson plan). Wins over seriousFromTurn. */
  toneForTurn?: (turnId: string) => SceneTone;
  /** Skip the shell's built-in pause card (e.g. when the episode renders its own). */
  hideDefaultPauseCard?: boolean;
  /** Show auto-derived CED key-term chips. Default true. */
  termChips?: boolean;
  children: (ctx: ShellContext) => React.ReactNode;
}

export interface ShellContext {
  frame: number;
  fps: number;
  timeSec: number;
  activeTurn: Turn | null;
  activeIndex: number;
  activeStartFrame: number;
  isPaused: boolean; // true if in a pause/gap
}

/**
 * EpisodeShell — owns all episode boilerplate so bugs can't be re-copied.
 *
 * Handles:
 * - Active-turn resolution (holds last turn through gaps, no flicker)
 * - Pause cards for [N-second pause] turns (question on screen during silence)
 * - Audio sequencing with Math.ceil (no clipping)
 * - Talking head (correct toon per speaker)
 * - Tone provider (serious/playful)
 * - Background layer
 * - Debug overlay (studio only, never in render)
 *
 * Episode files provide: turns, timing, audio path, background fn, and
 * a render function for their beats. The shell owns everything else.
 */
export const EpisodeShell: React.FC<EpisodeShellProps> = ({
  episode,
  turns,
  starts,
  durations,
  audioPath,
  backgroundForTurn,
  seriousFromTurn = 0,
  toneForTurn,
  hideDefaultPauseCard = false,
  termChips = true,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;
  const rootRef = useRef<HTMLDivElement>(null);

  // Auto-derived CED key-term chips (from data/terms.json)
  const chips = useMemo(() => {
    if (!termChips) return [];
    return deriveTermChips(episode.toLowerCase());
  }, [episode, termChips]);
  const activeChips = chips.filter(c => timeSec >= c.start && timeSec < c.end);

  // Validate lengths match
  if (turns.length !== starts.length || starts.length !== durations.length) {
    throw new Error(
      `EpisodeShell[${episode}]: length mismatch — ` +
      `turns=${turns.length}, starts=${starts.length}, durations=${durations.length}`
    );
  }

  // Find active turn (hold last turn through gaps — no flicker)
  let activeIndex = -1;
  let isPaused = false;
  for (let i = turns.length - 1; i >= 0; i--) {
    if (timeSec >= starts[i]) {
      const turnEnd = starts[i] + durations[i];
      if (timeSec < turnEnd) {
        activeIndex = i;
      } else {
        // In a gap — hold the last turn (don't unmount)
        activeIndex = i;
        isPaused = turns[i].speaker === 'pause';
      }
      break;
    }
  }

  const activeTurn = activeIndex >= 0 ? turns[activeIndex] : null;
  const activeStartFrame = activeIndex >= 0 ? Math.floor(starts[activeIndex] * fps) : 0;

  // Tone: per-turn override wins; otherwise binary serious/playful threshold
  const turnNum = activeTurn ? parseInt(activeTurn.id.slice(1), 10) : 0;
  const tone: SceneTone = activeTurn && toneForTurn
    ? toneForTurn(activeTurn.id)
    : turnNum >= seriousFromTurn ? 'serious' : 'playful';

  // Background (held through gaps)
  const bgSrc = activeTurn ? backgroundForTurn(activeTurn.id) : backgroundForTurn(turns[0]?.id ?? 't00');

  // Debug overlay — studio only
  const isStudio = typeof window !== 'undefined' && (window as any).__REMOTION_STUDIO__;

  const ctx: ShellContext = {
    frame,
    fps,
    timeSec,
    activeTurn,
    activeIndex,
    activeStartFrame,
    isPaused,
  };

  return (
    <ToneProvider tone={tone}>
      <AutoLayoutProvider debug={false}>
        <AbsoluteFill ref={rootRef} style={{ backgroundColor: '#1a1512' }}>
          {/* Background */}
          <Track id="bg" role="bg">
            <img
              src={staticFile(bgSrc)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Track>

          {/* Audio — ceil to avoid clipping last frame */}
          {turns.map((turn, i) => (
            <Sequence
              key={`audio-${turn.id}`}
              from={Math.floor(starts[i] * fps)}
              durationInFrames={Math.max(1, Math.ceil(durations[i] * fps))}
            >
              <Audio src={staticFile(audioPath(turn.id))} />
            </Sequence>
          ))}

          {/* Talking head — correct toon per speaker */}
          {activeTurn && activeTurn.speaker !== 'pause' && (
            <Track id="head" role="chrome">
              <TalkingHead
                key={`head-${activeTurn.id}`}
                speakerName={activeTurn.speaker === 'maya' ? 'Maya' : activeTurn.speaker === 'marcus' ? 'Marcus' : 'Jay'}
                speakerColor={activeTurn.speaker === 'maya' ? '#c9a227' : '#2c5aa0'}
                position="bottom-right"
                assetPair={{
                  realistic: staticFile(`${activeTurn.speaker}.webp`),
                  stylized: staticFile(`${activeTurn.speaker}-toon.webp`),
                }}
              />
            </Track>
          )}

          {/* Pause card — show question during silence (episodes may supply their own) */}
          {isPaused && activeTurn && !hideDefaultPauseCard && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.7)',
            }}>
              <div style={{
                fontSize: 48,
                color: '#fff',
                textAlign: 'center',
                maxWidth: '80%',
                fontFamily: 'system-ui',
              }}>
                {activeTurn.text || 'Think...'}
              </div>
            </div>
          )}

          {/* Episode beats */}
          <Track id="beats" role="stage" allowOverlap>
            {children(ctx)}
          </Track>

          {/* Auto-derived CED key-term chips */}
          {activeChips.map((chip, i) => (
            <Sequence
              key={`${chip.term}-${i}`}
              from={Math.round(chip.start * fps)}
              durationInFrames={Math.round((chip.end - chip.start) * fps)}
            >
              <TermChipView
                chip={{ term: chip.term, definition: chip.definition, start: chip.start, end: chip.end }}
                cfg={renderConfig as any}
              />
            </Sequence>
          ))}

          {/* Runtime layout guard — measures real DOM, reports overlaps/cuts/clips */}
          <LayoutGuard cfg={DEFAULT_GUARD_CONFIG} rootRef={rootRef} />

          {/* Debug overlay — studio only, never burns into export */}
          {isStudio && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              fontFamily: 'monospace', fontSize: 13,
              color: 'rgba(255,255,255,0.5)', zIndex: 100,
            }}>
              {activeTurn ? `${activeTurn.id} [${activeTurn.speaker}] ${timeSec.toFixed(1)}s` : '—'}
            </div>
          )}
        </AbsoluteFill>
      </AutoLayoutProvider>
    </ToneProvider>
  );
};
