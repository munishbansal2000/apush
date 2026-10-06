import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { useCanvasElements } from '../validation/CanvasTracker';
import { useAutoLayout, Priority } from '../validation/AutoLayout';
import { useProportions } from '../validation/useProportions';
import { TimingProps, DEFAULT_TIMING, getAnimationProgress } from '../validation/timing';
import { CharacterFace } from './CharacterFace';
import { useTone, resolveAsset } from '../validation/ToneContext';

interface TalkingHeadProps extends TimingProps {
  videoSrc?: string;
  /** Static image source (for realistic AI-generated portraits) */
  imageSrc?: string;
  /** Asset pair for tone switching: { realistic, stylized } */
  assetPair?: { realistic: string; stylized: string };
  /** Mood variants: { happy, serious, surprised, ... } — switches image by mood */
  moodAssets?: Record<string, string>;
  /** Current mood */
  mood?: string;
  /** Frame style: 'circle' | 'rounded' | 'full' (no crop) */
  frameStyle?: 'circle' | 'rounded' | 'full';
  speakerName?: string;
  speakerColor?: string;
  position?: 'left' | 'right' | 'bottom-left' | 'bottom-right' | 'fullscreen';
  size?: number;
  showName?: boolean;
  speaking?: boolean;
  /** Character expression */
  expression?: 'neutral' | 'happy' | 'serious' | 'surprised' | 'thinking';
  /** Character appearance */
  skinTone?: string;
  hairColor?: string;
  hairStyle?: 'bob' | 'short' | 'long' | 'curly';
  bg?: string;
  debug?: boolean;
}

/**
 * TalkingHead — illustrated character talking head.
 *
 * Real character with:
 * - Blinking eyes
 * - Expressive eyebrows
 * - Animated mouth when speaking
 * - Hair styles, skin tones
 * - Expressions: neutral, happy, serious, surprised, thinking
 *
 * Validation: position checked for out-of-bounds, no clipping.
 */
export const TalkingHead: React.FC<TalkingHeadProps> = ({
  videoSrc,
  imageSrc,
  assetPair,
  moodAssets,
  mood = 'neutral',
  frameStyle = 'circle',
  speakerName = 'Speaker',
  speakerColor = '#c9a227',
  position = 'bottom-right',
  size = 0.25,
  showName = true,
  speaking = false,
  expression = 'neutral',
  skinTone = '#f0c8a0',
  hairColor = '#4a2a10',
  hairStyle = 'bob',
  bg = 'transparent',
  debug = false,
  enterDuration = DEFAULT_TIMING.enterDuration,
  exitDuration = DEFAULT_TIMING.exitDuration,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const { realistic } = useTone();

  const { enter, exit } = getAnimationProgress(frame, durationInFrames, enterDuration, exitDuration);

  // Calculate position and size with SAFE margins (no clipping)
  const headSize = Math.min(width, height) * size;
  const margin = width * 0.05; // Increased from 0.03 for safety
  const labelHeight = showName ? 40 : 0;

  const positions = {
    'left': { x: margin, y: (height - headSize - labelHeight) / 2 },
    'right': { x: width - headSize - margin, y: (height - headSize - labelHeight) / 2 },
    'bottom-left': { x: margin, y: height - headSize - labelHeight - margin },
    'bottom-right': { x: width - headSize - margin, y: height - headSize - labelHeight - margin },
    'fullscreen': { x: 0, y: 0 },
  };

  const pos = positions[position];
  const isFullscreen = position === 'fullscreen';

  // Validation: ensure within bounds with margin
  const { px } = useProportions([{
    id: 'talking-head',
    renderWidth: headSize,
    renderHeight: headSize + labelHeight,
  }], { debug, componentName: 'TalkingHead' });

  const trackedElements: TrackedElement[] = [{
    id: 'talking-head',
    type: 'image',
    content: speakerName,
    x: pos.x,
    y: pos.y,
    width: headSize,
    height: headSize + labelHeight,
  }];

  useElementTracker(trackedElements, {
    checkOverlaps: false,
    debug,
    componentName: 'TalkingHead',
  });

  // Entrance: slide + fade (computed BEFORE registration so bounds are accurate)
  const entranceX = position.includes('right') ? 50 : position.includes('left') ? -50 : 0;
  const entranceY = position.includes('bottom') ? 50 : 0;
  const animX = interpolate(enter, [0, 1], [entranceX, 0]);
  const animY = interpolate(enter, [0, 1], [entranceY, 0]);

  // Bounce when speaking (subtle)
  const bounce = speaking ? Math.sin(frame / 10) * 2 : 0;

  // LIFE: idle motion — sway, breathing (affects true position)
  const idleSway = Math.sin(frame / 45) * 4;
  const breathing = Math.sin(frame / 30) * 2;

  // True animated position
  const trueX = pos.x + animX + idleSway;
  const trueY = pos.y + animY + bounce + breathing;

  // Register TRUE position and get auto-adjusted coordinates (priority-based)
  const { x: resolvedX, y: resolvedY } = useAutoLayout(
    'talking-head', trueX, trueY, headSize, headSize + labelHeight,
    Priority.CHARACTER, 'image', speakerName
  );

  // Legacy static registration (kept for debug overlay)
  useCanvasElements([{
    id: 'talking-head-static',
    type: 'image',
    content: speakerName,
    x: trueX,
    y: trueY,
    width: headSize,
    height: headSize + labelHeight,
  }], 'TalkingHead');
  const headTilt = Math.sin(frame / 60) * 2.5;
  const excitementCycle = frame % 90;
  const excitement = speaking && excitementCycle < 15
    ? Math.sin((excitementCycle / 15) * Math.PI) * 0.05
    : 0;

  // Photo mode: realistic image (Maya/Marcus/Hamilton/Jefferson)
  // Asset pair switches based on tone context (serious=real, fun=toon)
  // Mood assets switch by mood prop
  if (assetPair || imageSrc || videoSrc || moodAssets) {
    let mediaSrc: string;
    if (moodAssets && moodAssets[mood]) {
      mediaSrc = moodAssets[mood];
    } else if (assetPair) {
      mediaSrc = resolveAsset(assetPair, realistic);
    } else {
      mediaSrc = imageSrc || videoSrc!;
    }
    const isVideo = !!videoSrc && !assetPair && !moodAssets;

    // Frame style: circle, rounded rect, or full (no crop)
    const frameStyles = {
      circle: { borderRadius: '50%', aspectRatio: '1/1' },
      rounded: { borderRadius: 24, aspectRatio: '3/4' },
      full: { borderRadius: 16, aspectRatio: 'auto' },
    };
    const fs = frameStyles[frameStyle];
    const frameHeight = frameStyle === 'circle' ? headSize : headSize * 1.3;
    return (
      <div style={{
        position: 'absolute',
        left: resolvedX,
        top: resolvedY,
        width: isFullscreen ? width : headSize,
        height: isFullscreen ? width : frameHeight,
        borderRadius: fs.borderRadius as any,
        overflow: 'hidden',
        border: `4px solid ${speakerColor}`,
        boxShadow: speaking
          ? `0 0 25px ${speakerColor}`
          : '0 8px 30px rgba(0,0,0,0.5)',
        opacity: Math.min(enter * 2, exit * 2, 1),
        zIndex: 20,
        transform: `rotate(${headTilt}deg) scale(${1 + excitement})`,
      }}>
        {isVideo ? (
          <video
            src={mediaSrc}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            autoPlay muted loop playsInline
          />
        ) : (
          <Img
            src={mediaSrc}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
          />
        )}
        {showName && !isFullscreen && (
          <div style={{
            position: 'absolute', bottom: 8, left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.85)',
            color: speakerColor,
            fontSize: px(20),
            fontWeight: 'bold',
            padding: '6px 18px',
            borderRadius: 12,
            border: `2px solid ${speakerColor}`,
            fontFamily: 'Georgia, serif',
            whiteSpace: 'nowrap',
          }}>
            {speakerName}
          </div>
        )}
      </div>
    );
  }

  // Character mode: illustrated face with expression
  return (
    <div style={{
      position: 'absolute',
      left: resolvedX,
      top: resolvedY,
      width: headSize,
      zIndex: 20,
      opacity: Math.min(enter * 2, exit * 2, 1),
    }}>
      {/* Character face in circle frame */}
      <div style={{
        width: headSize,
        height: headSize,
        borderRadius: '50%',
        overflow: 'hidden',
        border: `4px solid ${speakerColor}`,
        boxShadow: speaking
          ? `0 0 25px ${speakerColor}`
          : '0 8px 30px rgba(0,0,0,0.5)',
        backgroundColor: '#fff',
      }}>
        <CharacterFace
          size={headSize}
          skinTone={skinTone}
          hairColor={hairColor}
          hairStyle={hairStyle}
          speaking={speaking}
          frame={frame}
          expression={speaking ? expression : expression}
        />
      </div>

      {/* Speaking indicator: subtle waves */}
      {speaking && (
        <div style={{
          position: 'absolute',
          right: -8,
          top: '40%',
          display: 'flex',
          gap: 3,
          alignItems: 'center',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 4,
              height: 10 + 8 * Math.abs(Math.sin(frame / 8 + i * 0.8)),
              backgroundColor: speakerColor,
              borderRadius: 2,
              opacity: 0.9,
            }} />
          ))}
        </div>
      )}

      {/* Name label (below, not overlapping) */}
      {showName && !isFullscreen && (
        <div style={{
          marginTop: 8,
          textAlign: 'center',
        }}>
          <span style={{
            backgroundColor: 'rgba(0,0,0,0.85)',
            color: speakerColor,
            fontSize: px(20),
            fontWeight: 'bold',
            padding: '6px 20px',
            borderRadius: 12,
            border: `2px solid ${speakerColor}`,
            fontFamily: 'Georgia, serif',
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}>
            {speakerName}
          </span>
        </div>
      )}
    </div>
  );
};
