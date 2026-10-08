import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { TimingProps, DEFAULT_TIMING, getAnimationProgress } from '../validation/timing';
import { FONT, COLOR, TYPE, RADIUS, MOTION, alpha } from '../theme/tokens';

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

interface AvatarProps {
  x: number;
  y: number;
  color: string;
  name: string;
  speaking: boolean;
  frame: number;
  labelSize: number;
}

const Avatar: React.FC<AvatarProps> = ({ x, y, color, name, speaking, frame, labelSize }) => {
  const bounce = speaking ? Math.sin(frame / 8) * 4 : 0;
  const scale = speaking ? 1.1 : 1;

  return (
    <div style={{
      position: 'absolute', left: x - 50, top: y + bounce,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      transform: `scale(${scale})`,
      zIndex: 5,
    }}>
      {/* Avatar circle */}
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        backgroundColor: color,
        border: speaking ? `4px solid ${COLOR.onNight}` : `3px solid ${color}88`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: TYPE.h2, fontWeight: 'bold', color: COLOR.onNight,
        boxShadow: speaking ? `0 0 30px ${color}` : 'none',
        fontFamily: FONT.text,
      }}>
        {name[0].toUpperCase()}
      </div>
      <div style={{
        marginTop: 8, fontSize: labelSize,
        color: speaking ? COLOR.onNight : COLOR.onNightMuted,
        fontWeight: speaking ? 'bold' : 'normal',
        fontFamily: FONT.text,
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

/** Bubble layout: each line gets its own vertical slot; Maya/Marcus columns never overlap. */
const getBubbleRect = (i: number, count: number, isMaya: boolean, width: number, height: number) => {
  const top = height * 0.06;
  const bottom = height * 0.6; // avatars start at 0.65
  const gap = height * 0.015;
  const slot = (bottom - top) / Math.max(1, count);
  const bubbleH = Math.min(height * 0.16, slot - gap);
  const colW = width * 0.44;
  return {
    x: isMaya ? width * 0.05 : width * 0.51,
    y: top + i * slot,
    width: colW,
    height: bubbleH,
  };
};

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
  bg = COLOR.nightPanel,
  debug = false,
  enterDuration = DEFAULT_TIMING.enterDuration,
  exitDuration = DEFAULT_TIMING.exitDuration,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();

  const { enter, exit } = getAnimationProgress(frame, durationInFrames, enterDuration, exitDuration);

  const mayaColor = COLOR.maya; // Gold
  const marcusColor = COLOR.marcus; // Blue

  const mayaX = width * 0.2;
  const marcusX = width * 0.8;
  const avatarY = height * 0.65;

  // Font shrinks when many lines share the space (max 0.028h; ~2 lines of text per bubble)
  const bubbleFont = (bubbleH: number) => Math.min(height * 0.028, (bubbleH - 24) / 2.8);

  // Track speech bubbles
  const trackedElements = useMemo((): TrackedElement[] => {
    const els: TrackedElement[] = [];
    lines.forEach((line, i) => {
      if (frame >= line.at) {
        const isMaya = line.speaker === 'maya';
        const r = getBubbleRect(i, lines.length, isMaya, width, height);
        els.push({
          id: `bubble-${i}`, type: 'text', content: line.text,
          fontSize: bubbleFont(r.height),
          x: r.x, y: r.y, width: r.width, height: r.height,
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

  return (
    <div style={{
      width, height, backgroundColor: bg,
      position: 'relative', overflow: 'hidden',
      opacity: Math.min(enter * 2, exit * 2, 1),
    }}>
      <Avatar x={mayaX} y={avatarY} color={mayaColor} name="Maya" speaking={mayaSpeaking} frame={frame} labelSize={height * 0.028} />
      <Avatar x={marcusX} y={avatarY} color={marcusColor} name="Marcus" speaking={marcusSpeaking} frame={frame} labelSize={height * 0.028} />

      {/* Speech bubbles */}
      {lines.map((line, i) => {
        if (frame < line.at) return null;

        const progress = spring({
          frame: frame - line.at,
          fps,
          config: MOTION.spring,
        });
        const scale = interpolate(progress, [0, 1], [0.7, 1]);
        const opacity = interpolate(progress, [0, 1], [0, 1]);

        const isMaya = line.speaker === 'maya';
        const color = isMaya ? mayaColor : marcusColor;
        const r = getBubbleRect(i, lines.length, isMaya, width, height);

        // Fade out old bubbles
        const isCurrent = line === currentLine;
        const bubbleOpacity = isCurrent ? opacity : opacity * 0.4;

        return (
          <div key={i} style={{
            position: 'absolute', left: r.x, top: r.y,
            maxWidth: r.width, maxHeight: r.height,
            boxSizing: 'border-box', overflow: 'hidden',
            display: 'flex', alignItems: 'center',
            backgroundColor: alpha(COLOR.paper, 0.95),
            borderRadius: RADIUS.lg,
            padding: '12px 18px',
            transform: `scale(${scale})`,
            opacity: bubbleOpacity,
            zIndex: 6,
            borderLeft: `4px solid ${color}`,
            boxShadow: `0 4px 15px ${alpha(COLOR.night, 0.3)}`,
          }}>
            <div style={{
              fontSize: bubbleFont(r.height), color: COLOR.ink,
              fontFamily: FONT.text, lineHeight: 1.4,
            }}>
              {line.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};
