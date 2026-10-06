import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { useCanvasElements } from '../validation/CanvasTracker';
import { useProportions } from '../validation/useProportions';
import { TimingProps } from '../validation/timing';
import { CharacterFace } from './CharacterFace';

interface Debater {
  name: string;
  color: string;
  skinTone?: string;
  hairColor?: string;
  hairStyle?: 'bob' | 'short' | 'long' | 'curly';
}

interface ArgumentProps extends TimingProps {
  left?: Debater;
  right?: Debater;
  phrases?: string[];
  intensity?: number;
  bg?: string;
  debug?: boolean;
}

/**
 * Argument — two CHARACTERS in heated debate (not circles).
 *
 * Features:
 * - Real illustrated faces with expressions
 * - Speaking character animates mouth, other listens
 * - Exclamation marks, intensity meter
 * - Validation: proper spacing, no overlaps
 */
export const Argument: React.FC<ArgumentProps> = ({
  left = {
    name: 'Federalist',
    color: '#2c5aa0',
    skinTone: '#f0c8a0',
    hairColor: '#2a1a0a',
    hairStyle: 'short',
  },
  right = {
    name: 'Anti-Federalist',
    color: '#a02c2c',
    skinTone: '#e8b890',
    hairColor: '#5a3a1a',
    hairStyle: 'bob',
  },
  phrases = ['We need unity!', 'Tyranny!', 'Strong union!', 'Liberty!'],
  intensity = 5,
  bg = '#1a1512',
  debug = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const { px } = useProportions([], { debug: false });

  // Layout with proper spacing
  const centerX = width / 2;
  const characterSize = px(140);
  const spacing = px(320);
  const leftX = centerX - spacing - characterSize / 2;
  const rightX = centerX + spacing - characterSize / 2;
  const charY = height * 0.42;

  // Debate rhythm
  const phraseDuration = Math.max(25, 65 - intensity * 4);
  const phraseIndex = Math.floor(frame / phraseDuration) % phrases.length;
  const isLeftSpeaking = Math.floor(frame / phraseDuration) % 2 === 0;
  const currentPhrase = phrases[phraseIndex];

  const bubbleScale = spring({
    frame: frame % phraseDuration,
    fps,
    config: { damping: 11, stiffness: 170 },
  });

  // Shake intensity
  const shake = intensity * 0.6;
  const leftShake = Math.sin(frame / 4) * shake;
  const rightShake = Math.sin(frame / 4 + Math.PI) * shake;

  // Track all elements
  const trackedElements: TrackedElement[] = [
    {
      id: 'debater-left',
      type: 'image',
      content: left.name,
      x: leftX,
      y: charY,
      width: characterSize,
      height: characterSize + 50,
    },
    {
      id: 'debater-right',
      type: 'image',
      content: right.name,
      x: rightX,
      y: charY,
      width: characterSize,
      height: characterSize + 50,
    },
    {
      id: 'speech-bubble',
      type: 'text',
      content: currentPhrase,
      fontSize: px(28),
      x: isLeftSpeaking ? leftX - 60 : rightX - 60,
      y: charY - 150,
      width: 300,
      height: 110,
    },
  ];

  useElementTracker(trackedElements, {
    checkOverlaps: true,
    allowedOverlap: 0,
    debug,
    componentName: 'Argument',
  });

  useCanvasElements(trackedElements.map(({ id, type, content, x, y, width: w, height: h }) => ({
    id, type, content, x, y, width: w, height: h,
  })), 'Argument');

  const renderDebater = (debater: Debater, x: number, shakeOffset: number, isSpeaking: boolean) => (
    <div style={{
      position: 'absolute',
      left: x + shakeOffset,
      top: charY,
      width: characterSize,
    }}>
      <div style={{
        width: characterSize,
        height: characterSize,
        borderRadius: '50%',
        overflow: 'hidden',
        border: isSpeaking ? `5px solid ${debater.color}` : `3px solid ${debater.color}88`,
        boxShadow: isSpeaking ? `0 0 30px ${debater.color}` : '0 8px 25px rgba(0,0,0,0.5)',
        backgroundColor: '#fff',
        transform: isSpeaking ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform 0.2s, border 0.2s',
      }}>
        <CharacterFace
          size={characterSize}
          skinTone={debater.skinTone}
          hairColor={debater.hairColor}
          hairStyle={debater.hairStyle}
          expression={isSpeaking ? 'serious' : 'neutral'}
          speaking={isSpeaking}
          frame={frame}
        />
      </div>

      {/* Name plate */}
      <div style={{ marginTop: 10, textAlign: 'center' }}>
        <span style={{
          backgroundColor: isSpeaking ? debater.color : 'rgba(0,0,0,0.7)',
          color: isSpeaking ? '#fff' : debater.color,
          fontSize: px(24),
          fontWeight: 'bold',
          padding: '7px 20px',
          borderRadius: 12,
          border: `2px solid ${debater.color}`,
          fontFamily: 'Georgia, serif',
          whiteSpace: 'nowrap',
          display: 'inline-block',
        }}>
          {debater.name}
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ width, height, backgroundColor: bg, position: 'relative', overflow: 'hidden' }}>
      {/* Exclamation marks */}
      {[0, 1, 2].map(i => {
        const p = spring({ frame: Math.max(0, frame - i * 20), fps, config: { damping: 8 } });
        if (frame < i * 20) return null;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: centerX - 70 + i * 55 + Math.sin(frame / 6 + i) * 12,
            top: height * 0.18 + Math.cos(frame / 5 + i) * 12,
            fontSize: px(52 + intensity * 3),
            fontWeight: 'bold',
            color: i % 2 === 0 ? left.color : right.color,
            transform: `scale(${p}) rotate(${Math.sin(frame / 10 + i) * 12}deg)`,
            opacity: Math.min(p * 1.5, 1),
            textShadow: '2px 2px 8px rgba(0,0,0,0.6)',
          }}>
            !
          </div>
        );
      })}

      {renderDebater(left, leftX, leftShake, isLeftSpeaking)}
      {renderDebater(right, rightX, rightShake, !isLeftSpeaking)}

      {/* Speech bubble (above speaking character) */}
      <div style={{
        position: 'absolute',
        left: (isLeftSpeaking ? leftX : rightX) - 60,
        top: charY - 155,
        transform: `scale(${bubbleScale})`,
        transformOrigin: 'bottom center',
        zIndex: 10,
      }}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: '16px 26px',
          maxWidth: 320,
          boxShadow: '0 8px 25px rgba(0,0,0,0.45)',
          border: `4px solid ${isLeftSpeaking ? left.color : right.color}`,
          position: 'relative',
        }}>
          <div style={{
            fontSize: px(28),
            fontWeight: 'bold',
            fontFamily: 'Georgia, serif',
            color: '#1a1512',
            lineHeight: 1.35,
          }}>
            {currentPhrase}
          </div>
          <div style={{
            position: 'absolute',
            bottom: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderTop: `14px solid ${isLeftSpeaking ? left.color : right.color}`,
          }} />
        </div>
      </div>

      {/* Intensity meter (bottom, centered, not overlapping) */}
      <div style={{
        position: 'absolute',
        bottom: 35,
        left: centerX - 160,
        width: 320,
      }}>
        <div style={{
          textAlign: 'center',
          color: '#fff',
          fontSize: px(20),
          fontFamily: 'Georgia, serif',
          marginBottom: 8,
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        }}>
          Heated debate level: {intensity}/10
        </div>
        <div style={{
          height: 14,
          backgroundColor: 'rgba(255,255,255,0.25)',
          borderRadius: 7,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${(intensity / 10) * 100}%`,
            height: '100%',
            backgroundColor: intensity > 7 ? '#ff4444' : intensity > 4 ? '#ffaa00' : '#44ff44',
            borderRadius: 7,
          }} />
        </div>
      </div>
    </div>
  );
};
