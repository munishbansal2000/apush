import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { useCanvasElements } from '../validation/CanvasTracker';
import { useAutoLayout, Priority } from '../validation/AutoLayout';
import { useProportions } from '../validation/useProportions';
import { TimingProps } from '../validation/timing';
import { CharacterFace } from './CharacterFace';

interface DuelParticipant {
  name: string;
  color: string;
  /** Realistic image source (preferred) */
  imageSrc?: string;
  /** Fallback SVG character */
  skinTone?: string;
  hairColor?: string;
  hairStyle?: 'bob' | 'short' | 'long' | 'curly';
  expression?: 'neutral' | 'happy' | 'serious' | 'surprised' | 'thinking';
  argument?: string;
}

interface DuelProps extends TimingProps {
  left?: DuelParticipant;
  right?: DuelParticipant;
  variant?: 'ideas' | 'standoff';
  climaxAt?: number;
  bg?: string;
  debug?: boolean;
}

/**
 * Duel — two CHARACTERS facing off (not circles with initials).
 *
 * Features:
 * - Real illustrated faces with expressions
 * - Proper alignment: characters face each other across VS badge
 * - Speech bubbles anchored to each character (no overlap)
 * - Validation: all elements tracked, no clipping, proper spacing
 */
export const Duel: React.FC<DuelProps> = ({
  left = {
    name: 'Hamilton',
    color: '#2c5aa0',
    skinTone: '#f0c8a0',
    hairColor: '#3a2a1a',
    hairStyle: 'short',
    expression: 'serious',
    argument: 'Strong central government!',
  },
  right = {
    name: 'Jefferson',
    color: '#a02c2c',
    skinTone: '#e8b890',
    hairColor: '#6a4a2a',
    hairStyle: 'bob',
    expression: 'serious',
    argument: "States' rights!",
  },
  variant = 'ideas',
  climaxAt = 90,
  bg = '#1a1512',
  debug = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const { px } = useProportions([], { debug: false });

  // Layout: proper spacing with validation
  const centerX = width / 2;
  const characterSize = px(160);
  const vsSize = px(90);
  const spacing = px(280); // Distance from center to each character

  const leftX = centerX - spacing - characterSize / 2;
  const rightX = centerX + spacing - characterSize / 2;
  const charY = height * 0.45;

  // Entrance: characters slide in from sides
  const entrance = interpolate(frame, [0, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const leftEntranceX = interpolate(entrance, [0, 1], [-characterSize, 0]);
  const rightEntranceX = interpolate(entrance, [0, 1], [characterSize, 0]);

  // VS badge pulse at climax
  const isClimax = frame >= climaxAt;
  const vsScale = isClimax ? 1 + 0.1 * Math.sin((frame - climaxAt) / 8) : 1;

  // LIFE: characters lean in, bob with argument energy
  const leftLean = Math.sin(frame / 20) * 8; // Lean toward center
  const rightLean = Math.sin(frame / 20 + Math.PI) * 8;
  const leftBob = Math.sin(frame / 15) * 5;
  const rightBob = Math.sin(frame / 15 + 1) * 5;
  const leftTilt = Math.sin(frame / 35) * 2;
  const rightTilt = Math.sin(frame / 35 + 2) * 2;

  // Speech bubbles (ideas variant)
  const showLeftBubble = variant === 'ideas' && frame >= 30;
  const showRightBubble = variant === 'ideas' && frame >= 60;
  const leftBubbleScale = spring({ frame: Math.max(0, frame - 30), fps, config: { damping: 12 } });
  const rightBubbleScale = spring({ frame: Math.max(0, frame - 60), fps, config: { damping: 12 } });

  // TRUE animated positions (including lean, bob, entrance)
  const leftTrueX = leftX + leftEntranceX + leftLean;
  const leftTrueY = charY + leftBob;
  const rightTrueX = rightX + rightEntranceX - rightLean;
  const rightTrueY = charY + rightBob;

  // Auto-resolved positions for all elements (priority-based)
  const leftPos = useAutoLayout(
    'duelist-left', leftTrueX, leftTrueY, characterSize, characterSize + 50,
    Priority.CHARACTER, 'image', left.name
  );
  const rightPos = useAutoLayout(
    'duelist-right', rightTrueX, rightTrueY, characterSize, characterSize + 50,
    Priority.CHARACTER, 'image', right.name
  );
  const vsPos = useAutoLayout(
    'vs-badge', centerX - vsSize / 2, charY + characterSize / 2 - vsSize / 2,
    vsSize, vsSize, Priority.DECORATION, 'shape', 'VS'
  );
  const bubbleLeftPos = useAutoLayout(
    'bubble-left', leftX - 40, charY - 130, 260, 100,
    Priority.BUBBLE, 'text', left.argument || ''
  );
  const bubbleRightPos = useAutoLayout(
    'bubble-right', rightX - 60, charY - 130, 260, 100,
    Priority.BUBBLE, 'text', right.argument || ''
  );

  // Track ALL elements for validation (legacy, uses true positions)
  const trackedElements: TrackedElement[] = [
    {
      id: 'duelist-left',
      type: 'image',
      content: left.name,
      x: leftTrueX,
      y: leftTrueY,
      width: characterSize,
      height: characterSize + 50,
    },
    {
      id: 'duelist-right',
      type: 'image',
      content: right.name,
      x: rightTrueX,
      y: rightTrueY,
      width: characterSize,
      height: characterSize + 50,
    },
    {
      id: 'vs-badge',
      type: 'shape',
      content: 'VS',
      x: centerX - vsSize / 2,
      y: charY + characterSize / 2 - vsSize / 2,
      width: vsSize,
      height: vsSize,
    },
  ];

  if (showLeftBubble && left.argument) {
    trackedElements.push({
      id: 'bubble-left',
      type: 'text',
      content: left.argument,
      fontSize: px(24),
      x: leftX - 40,
      y: charY - 130,
      width: 260,
      height: 100,
    });
  }

  if (showRightBubble && right.argument) {
    trackedElements.push({
      id: 'bubble-right',
      type: 'text',
      content: right.argument,
      fontSize: px(24),
      x: rightX - 60,
      y: charY - 130,
      width: 260,
      height: 100,
    });
  }

  useElementTracker(trackedElements, {
    checkOverlaps: true,
    allowedOverlap: 0,
    debug,
    componentName: 'Duel',
  });

  useCanvasElements(trackedElements.map(({ id, type, content, x, y, width: w, height: h }) => ({
    id, type, content, x, y, width: w, height: h,
  })), 'Duel');

  const renderCharacter = (
    participant: DuelParticipant,
    resolvedPos: { x: number; y: number },
    isLeft: boolean
  ) => {
    const tilt = isLeft ? leftTilt : rightTilt;
    return (
    <div style={{
      position: 'absolute',
      left: resolvedPos.x,
      top: resolvedPos.y,
      width: characterSize,
      opacity: entrance,
      transform: `rotate(${tilt}deg)`,
    }}>
      {/* Character face - realistic image preferred, SVG fallback */}
      <div style={{
        width: characterSize,
        height: characterSize,
        borderRadius: '50%',
        overflow: 'hidden',
        border: `5px solid ${participant.color}`,
        boxShadow: isClimax && isLeft
          ? `0 0 40px ${participant.color}`
          : '0 10px 35px rgba(0,0,0,0.6)',
        backgroundColor: '#fff',
        transform: isClimax && isLeft ? `scale(${vsScale})` : 'scale(1)',
      }}>
        {participant.imageSrc ? (
          <Img
            src={participant.imageSrc}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <CharacterFace
            size={characterSize}
            skinTone={participant.skinTone}
            hairColor={participant.hairColor}
            hairStyle={participant.hairStyle}
            expression={participant.expression}
            speaking={false}
            frame={frame}
          />
        )}
      </div>

      {/* Name plate (below face, centered, no overlap) */}
      <div style={{
        marginTop: 12,
        textAlign: 'center',
      }}>
        <span style={{
          backgroundColor: participant.color,
          color: '#fff',
          fontSize: px(26),
          fontWeight: 'bold',
          padding: '8px 24px',
          borderRadius: 14,
          fontFamily: 'Georgia, serif',
          whiteSpace: 'nowrap',
          display: 'inline-block',
          boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
        }}>
          {participant.name}
        </span>
      </div>
    </div>
    );
  };

  return (
    <div style={{ width, height, backgroundColor: bg, position: 'relative', overflow: 'hidden' }}>
      {/* VS badge (centered between characters) */}
      <div style={{
        position: 'absolute',
        left: vsPos.x,
        top: vsPos.y,
        width: vsSize,
        height: vsSize,
        borderRadius: '50%',
        backgroundColor: '#c9a227',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: px(36),
        fontWeight: 'bold',
        color: '#1a1512',
        fontFamily: 'Georgia, serif',
        transform: `scale(${vsScale})`,
        boxShadow: isClimax ? '0 0 50px #c9a227' : '0 6px 25px rgba(0,0,0,0.5)',
        zIndex: 5,
      }}>
        VS
      </div>

      {renderCharacter(left, leftPos, true)}
      {renderCharacter(right, rightPos, false)}

      {/* Speech bubbles (positioned above, not overlapping) */}
      {showLeftBubble && left.argument && (
        <div style={{
          position: 'absolute',
          left: bubbleLeftPos.x,
          top: bubbleLeftPos.y,
          transform: `scale(${leftBubbleScale})`,
          transformOrigin: 'bottom center',
          zIndex: 10,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 18,
            padding: '14px 22px',
            maxWidth: 280,
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            border: `3px solid ${left.color}`,
            position: 'relative',
          }}>
            <div style={{
              fontSize: px(24),
              fontFamily: 'Georgia, serif',
              color: '#1a1512',
              lineHeight: 1.35,
            }}>
              {left.argument}
            </div>
            {/* Tail pointing down to character */}
            <div style={{
              position: 'absolute',
              bottom: -12,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: `12px solid ${left.color}`,
            }} />
          </div>
        </div>
      )}

      {showRightBubble && right.argument && (
        <div style={{
          position: 'absolute',
          left: bubbleRightPos.x,
          top: bubbleRightPos.y,
          transform: `scale(${rightBubbleScale})`,
          transformOrigin: 'bottom center',
          zIndex: 10,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 18,
            padding: '14px 22px',
            maxWidth: 280,
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            border: `3px solid ${right.color}`,
            position: 'relative',
          }}>
            <div style={{
              fontSize: px(24),
              fontFamily: 'Georgia, serif',
              color: '#1a1512',
              lineHeight: 1.35,
            }}>
              {right.argument}
            </div>
            <div style={{
              position: 'absolute',
              bottom: -12,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: `12px solid ${right.color}`,
            }} />
          </div>
        </div>
      )}

      {/* Climax flash */}
      {isClimax && frame < climaxAt + 10 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#fff',
          opacity: interpolate(frame, [climaxAt, climaxAt + 10], [0.25, 0], {
            extrapolateRight: 'clamp',
          }),
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
};
