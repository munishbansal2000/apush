import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { TimingProps, DEFAULT_TIMING, getAnimationProgress } from '../validation/timing';

interface DialogueLine {
  speaker: 'maya' | 'marcus';
  text: string;
  /** Frame when this line starts */
  at: number;
}

interface CharacterDialogueProps extends TimingProps {
  lines: DialogueLine[];
  bg?: string;
  debug?: boolean;
}

/**
 * CharacterDialogue — Maya/Marcus as animated avatars talking.
 *
 * CrashCourse does "Me from the Past" — we do our two hosts as
 * visual characters. Avatars bounce slightly when speaking,
 * speech bubbles pop in with spring physics.
 *
 * Validation: all bubbles tracked for overflow/overlap.
 * Timing: each line has 'at' frame; enter/exit control slide bounds.
 */
export const CharacterDialogue: React.FC<CharacterDialogueProps> = ({
  lines,
  bg = '#1a1512',
  debug = false,
  enterDuration = DEFAULT_TIMING.enterDuration,
  exitDuration = DEFAULT_TIMING.exitDuration,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();

  const { enter, exit } = getAnimationProgress(frame, durationInFrames, enterDuration, exitDuration);

  const mayaColor = '#c9a227'; // Gold
  const marcusColor = '#4a90d9'; // Blue

  const mayaX = width * 0.2;
  const marcusX = width * 0.8;
  const avatarY = height * 0.65;

  // Track speech bubbles
  const trackedElements = useMemo((): TrackedElement[] => {
    const els: TrackedElement[] = [];
    lines.forEach((line, i) => {
      if (frame >= line.at) {
        const isMaya = line.speaker === 'maya';
        els.push({
          id: `bubble-${i}`, type: 'text', content: line.text,
          fontSize: height * 0.03,
          x: isMaya ? width * 0.05 : width * 0.45,
          y: height * 0.15 + (i % 3) * height * 0.18,
          width: width * 0.5, height: height * 0.15,
        });
      }
    });
    return els;
  }, [lines, frame, width, height]);

  useElementTracker(trackedElements, {
    checkOverlaps: true,
    allowedOverlap: 10,
    debug,
    componentName: 'CharacterDialogue',
  });

  // Determine who's speaking
  const currentLine = [...lines].reverse().find(l => frame >= l.at);
  const mayaSpeaking = currentLine?.speaker === 'maya';
  const marcusSpeaking = currentLine?.speaker === 'marcus';

  const Avatar = ({ x, color, name, speaking }: { x: number; color: string; name: string; speaking: boolean }) => {
    const bounce = speaking ? Math.sin(frame / 8) * 4 : 0;
    const scale = speaking ? 1.1 : 1;

    return (
      <div style={{
        position: 'absolute', left: x - 50, top: avatarY + bounce,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        transform: `scale(${scale})`,
        transition: 'transform 0.2s',
        zIndex: 5,
      }}>
        {/* Avatar circle */}
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          backgroundColor: color,
          border: speaking ? `4px solid #fff` : `3px solid ${color}88`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, fontWeight: 'bold', color: '#fff',
          boxShadow: speaking ? `0 0 30px ${color}` : 'none',
          fontFamily: 'Georgia, serif',
        }}>
          {name[0].toUpperCase()}
        </div>
        <div style={{
          marginTop: 8, fontSize: height * 0.028,
          color: speaking ? '#fff' : '#888',
          fontWeight: speaking ? 'bold' : 'normal',
          fontFamily: 'Georgia, serif',
        }}>
          {name}
        </div>
        {/* Speaking indicator */}
        {speaking && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: color,
                opacity: 0.4 + 0.6 * Math.abs(Math.sin(frame / 10 + i)),
              }} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      width, height, backgroundColor: bg,
      position: 'relative', overflow: 'hidden',
      opacity: Math.min(enter * 2, exit * 2, 1),
    }}>
      <Avatar x={mayaX} color={mayaColor} name="Maya" speaking={mayaSpeaking} />
      <Avatar x={marcusX} color={marcusColor} name="Marcus" speaking={marcusSpeaking} />

      {/* Speech bubbles */}
      {lines.map((line, i) => {
        if (frame < line.at) return null;

        const progress = spring({
          frame: frame - line.at,
          fps,
          config: { damping: 12, stiffness: 150 },
        });
        const scale = interpolate(progress, [0, 1], [0.7, 1]);
        const opacity = interpolate(progress, [0, 1], [0, 1]);

        const isMaya = line.speaker === 'maya';
        const color = isMaya ? mayaColor : marcusColor;
        const bubbleX = isMaya ? width * 0.05 : width * 0.45;
        const bubbleY = height * 0.12 + (i % 3) * height * 0.16;

        // Fade out old bubbles
        const isCurrent = line === currentLine;
        const bubbleOpacity = isCurrent ? opacity : opacity * 0.4;

        return (
          <div key={i} style={{
            position: 'absolute', left: bubbleX, top: bubbleY,
            maxWidth: width * 0.5,
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: 16,
            padding: '12px 18px',
            transform: `scale(${scale})`,
            opacity: bubbleOpacity,
            zIndex: 6,
            borderLeft: `4px solid ${color}`,
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              fontSize: height * 0.028, color: '#1a1512',
              fontFamily: 'Georgia, serif', lineHeight: 1.4,
            }}>
              {line.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};
