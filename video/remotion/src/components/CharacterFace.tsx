import React from 'react';

interface CharacterFaceProps {
  size: number;
  skinTone?: string;
  hairColor?: string;
  hairStyle?: 'bob' | 'short' | 'long' | 'curly';
  speaking?: boolean;
  frame?: number;
  expression?: 'neutral' | 'happy' | 'serious' | 'surprised' | 'thinking';
}

/**
 * CharacterFace — illustrated SVG character with real expression.
 *
 * Features:
 * - Eyes that blink
 * - Eyebrows that move with expression
 * - Animated mouth (proper shape, opens when speaking)
 * - Hair styles
 * - Expressions: neutral, happy, serious, surprised, thinking
 */
export const CharacterFace: React.FC<CharacterFaceProps> = ({
  size,
  skinTone = '#f0c8a0',
  hairColor = '#4a2a10',
  hairStyle = 'bob',
  speaking = false,
  frame = 0,
  expression = 'neutral',
}) => {
  const s = size / 200; // Scale factor (design at 200px)

  // Blink: eyes close briefly every ~90 frames
  const blinkCycle = frame % 90;
  const isBlinking = blinkCycle > 82 && blinkCycle < 88;
  const eyeHeight = isBlinking ? 2 : 14;

  // Mouth animation when speaking
  const mouthOpen = speaking ? (0.5 + 0.5 * Math.abs(Math.sin(frame / 6))) : 0;

  // Expression-based eyebrow positions
  const browY = {
    neutral: 0,
    happy: -4,
    serious: 3,
    surprised: -8,
    thinking: 2,
  }[expression] * s;

  const browTilt = {
    neutral: 0,
    happy: 0,
    serious: -8,
    surprised: 0,
    thinking: -5,
  }[expression];

  // Mouth shapes by expression
  const renderMouth = () => {
    if (speaking) {
      // Open mouth that animates
      const h = (8 + mouthOpen * 20) * s;
      return (
        <ellipse
          cx={100 * s} cy={140 * s}
          rx={18 * s} ry={h}
          fill="#5a1a1a"
        >
          {/* Tongue */}
          <ellipse cx={100 * s} cy={(140 + h * 0.4) * s} rx={10 * s} ry={h * 0.4} fill="#c96a6a" />
        </ellipse>
      );
    }

    switch (expression) {
      case 'happy':
        return <path d={`M ${75 * s},${135 * s} Q ${100 * s},${160 * s} ${125 * s},${135 * s}`} stroke="#5a1a1a" strokeWidth={4 * s} fill="none" strokeLinecap="round" />;
      case 'serious':
        return <line x1={80 * s} y1={142 * s} x2={120 * s} y2={142 * s} stroke="#5a1a1a" strokeWidth={4 * s} strokeLinecap="round" />;
      case 'surprised':
        return <ellipse cx={100 * s} cy={142 * s} rx={10 * s} ry={14 * s} fill="#5a1a1a" />;
      case 'thinking':
        return <path d={`M ${85 * s},${142 * s} Q ${100 * s},${135 * s} ${115 * s},${142 * s}`} stroke="#5a1a1a" strokeWidth={3 * s} fill="none" strokeLinecap="round" />;
      default:
        return <path d={`M ${85 * s},${140 * s} Q ${100 * s},${148 * s} ${115 * s},${140 * s}`} stroke="#5a1a1a" strokeWidth={3 * s} fill="none" strokeLinecap="round" />;
    }
  };

  const renderHair = () => {
    switch (hairStyle) {
      case 'bob':
        return (
          <path
            d={`M ${40 * s},${90 * s} Q ${40 * s},${20 * s} ${100 * s},${20 * s} Q ${160 * s},${20 * s} ${160 * s},${90 * s} L ${155 * s},${110 * s} Q ${140 * s},${60 * s} ${100 * s},${60 * s} Q ${60 * s},${60 * s} ${45 * s},${110 * s} Z`}
            fill={hairColor}
          />
        );
      case 'short':
        return (
          <path
            d={`M ${45 * s},${80 * s} Q ${50 * s},${25 * s} ${100 * s},${25 * s} Q ${150 * s},${25 * s} ${155 * s},${80 * s} Q ${130 * s},${55 * s} ${100 * s},${55 * s} Q ${70 * s},${55 * s} ${45 * s},${80 * s} Z`}
            fill={hairColor}
          />
        );
      case 'long':
        return (
          <>
            <path
              d={`M ${35 * s},${100 * s} Q ${35 * s},${15 * s} ${100 * s},${15 * s} Q ${165 * s},${15 * s} ${165 * s},${100 * s} L ${165 * s},${160 * s} L ${145 * s},${160 * s} L ${145 * s},${80 * s} Q ${120 * s},${55 * s} ${100 * s},${55 * s} Q ${80 * s},${55 * s} ${55 * s},${80 * s} L ${55 * s},${160 * s} L ${35 * s},${160 * s} Z`}
              fill={hairColor}
            />
          </>
        );
      case 'curly':
        return (
          <g fill={hairColor}>
            {[...Array(8)].map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const cx = (100 + 55 * Math.cos(angle)) * s;
              const cy = (65 + 45 * Math.sin(angle)) * s;
              return <circle key={i} cx={cx} cy={cy} r={22 * s} />;
            })}
          </g>
        );
    }
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${200 * s} ${200 * s}`}>
      {/* Hair (behind face) */}
      {renderHair()}

      {/* Face */}
      <ellipse cx={100 * s} cy={105 * s} rx={58 * s} ry={68 * s} fill={skinTone} />

      {/* Ears */}
      <circle cx={42 * s} cy={110 * s} r={10 * s} fill={skinTone} />
      <circle cx={158 * s} cy={110 * s} r={10 * s} fill={skinTone} />

      {/* Eyebrows */}
      <g transform={`rotate(${browTilt}, ${75 * s}, ${(70 + browY) * s})`}>
        <rect x={60 * s} y={(66 + browY) * s} width={30 * s} height={6 * s} rx={3 * s} fill={hairColor} />
      </g>
      <g transform={`rotate(${-browTilt}, ${125 * s}, ${(70 + browY) * s})`}>
        <rect x={110 * s} y={(66 + browY) * s} width={30 * s} height={6 * s} rx={3 * s} fill={hairColor} />
      </g>

      {/* Eyes */}
      <ellipse cx={75 * s} cy={95 * s} rx={12 * s} ry={eyeHeight * s} fill="#fff" />
      <ellipse cx={125 * s} cy={95 * s} rx={12 * s} ry={eyeHeight * s} fill="#fff" />
      {!isBlinking && (
        <>
          <circle cx={77 * s} cy={97 * s} r={6 * s} fill="#2a1a0a" />
          <circle cx={127 * s} cy={97 * s} r={6 * s} fill="#2a1a0a" />
          <circle cx={79 * s} cy={95 * s} r={2 * s} fill="#fff" />
          <circle cx={129 * s} cy={95 * s} r={2 * s} fill="#fff" />
        </>
      )}

      {/* Nose */}
      <path
        d={`M ${100 * s},${110 * s} L ${95 * s},${125 * s} Q ${100 * s},${128 * s} ${105 * s},${125 * s}`}
        stroke="#d4a070" strokeWidth={3 * s} fill="none" strokeLinecap="round"
      />

      {/* Mouth */}
      {renderMouth()}

      {/* Cheeks (happy) */}
      {expression === 'happy' && (
        <>
          <ellipse cx={65 * s} cy={125 * s} rx={10 * s} ry={6 * s} fill="#e89090" opacity={0.6} />
          <ellipse cx={135 * s} cy={125 * s} rx={10 * s} ry={6 * s} fill="#e89090" opacity={0.6} />
        </>
      )}
    </svg>
  );
};
