/**
 * CutoutFigure — a historical figure cut from an old book.
 *
 * NOT a white-bordered rectangle. Torn paper edges, aged backing —
 * like someone cut this from an 18th-century engraving.
 */
import React, { useId } from 'react';
import { useCurrentFrame, useVideoConfig, spring, staticFile, Img } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';
import { FONT, COLOR, TYPE, MOTION, alpha } from '../theme/tokens';

interface CutoutFigureProps {
  src: string;
  name?: string;
  position?: [number, number];
  height?: number;
  /** Which side of the frame: 'left' | 'right' */
  side?: 'left' | 'right';
  at?: number;
  /** Allow overlap with background elements */
  allowOverlapWith?: string[];
}

export const CutoutFigure: React.FC<CutoutFigureProps> = ({
  src,
  name,
  position,
  height: figHeight = 480,
  side = 'left',
  at = 0,
  allowOverlapWith,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  // Unique per instance; ':' is not safe inside url(#id) references
  const filterId = `torn-${useId().replace(/:/g, '')}`;

  const riseIn = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: MOTION.spring,
  });
  const breathe = Math.sin(frame / 40) * 3;

  // Default: hug the frame edge
  const defaultX = side === 'left' ? -20 : width - figHeight * 0.6 + 20;
  const rawX = position ? position[0] * width : defaultX;
  const rawY = position ? position[1] * height : height - figHeight - 40 + breathe;

  const figWidth = figHeight * 0.62;

  const { x, y } = useAutoLayout(
    `cutout-${name || src}`, rawX, rawY, figWidth, figHeight,
    Priority.CHARACTER, 'image', name || 'figure',
    { allowOverlapWith, overlapGroup: 'cutout-figures' }
  );

  if (frame < at) return null;

  const viewBoxH = 200 * (figHeight / figWidth);

  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y,
      width: figWidth,
      height: figHeight,
      zIndex: 18,
      transform: `translateY(${(1 - riseIn) * 60}px)`,
      opacity: riseIn,
    }}>
      <svg viewBox={`0 0 200 ${viewBoxH}`} style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
        <defs>
          <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="12" />
          </filter>
          <clipPath id={`cut-${filterId}`}>
            {/* Torn silhouette — rough oval, not a rectangle */}
            <ellipse
              cx="100" cy="48%"
              rx="88" ry="46%"
              filter={`url(#${filterId})`}
            />
          </clipPath>
        </defs>

        {/* Aged paper backing (slightly larger, offset) */}
        <ellipse
          cx="102" cy="49%"
          rx="92" ry="47%"
          fill={COLOR.paperDeep}
          filter={`url(#${filterId})`}
          opacity="0.9"
          transform={`rotate(-1.5 100 ${viewBoxH / 2})`}
        />

        {/* Figure image clipped to torn shape */}
        <g clipPath={`url(#cut-${filterId})`}>
          <foreignObject x="12" y="2%" width="176" height="96%">
            <div
              // @ts-ignore
              xmlns="http://www.w3.org/1999/xhtml"
              style={{ width: '100%', height: '100%', overflow: 'hidden' }}
            >
              <Img
                src={src.startsWith('http') ? src : staticFile(src)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
              />
            </div>
          </foreignObject>
          {/* Sepia aging overlay */}
          <ellipse cx="100" cy="48%" rx="88" ry="46%" fill={alpha(COLOR.brown, 0.12)} />
        </g>

        {/* Torn edge highlight */}
        <ellipse
          cx="100" cy="48%"
          rx="88" ry="46%"
          fill="none"
          stroke={COLOR.brown}
          strokeWidth="2.5"
          filter={`url(#${filterId})`}
          opacity="0.6"
        />
      </svg>

      {name && (
        <div style={{
          position: 'absolute',
          bottom: -8,
          left: '50%',
          transform: 'translateX(-50%) rotate(-2deg)',
          backgroundColor: COLOR.ink,
          color: COLOR.paperDeep,
          fontFamily: FONT.text,
          fontSize: TYPE.town,
          fontStyle: 'italic',
          padding: '4px 16px',
          whiteSpace: 'nowrap',
          boxShadow: `2px 3px 8px ${alpha(COLOR.night, 0.4)}`,
          // Torn label edges via clip
          clipPath: 'polygon(3% 0%, 97% 2%, 100% 90%, 95% 100%, 5% 98%, 0% 88%)',
        }}>
          {name}
        </div>
      )}
    </div>
  );
};
