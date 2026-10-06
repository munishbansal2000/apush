/**
 * DocumentOverlay — a historic document resting on the scene.
 *
 * NOT a rectangle. Torn parchment edges, wax seal, slight rotation —
 * like someone left a pamphlet on the map.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, staticFile } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';

interface DocumentOverlayProps {
  src: string;
  position?: [number, number];
  width?: number;
  rotation?: number;
  at?: number;
  caption?: string;
}

export const DocumentOverlay: React.FC<DocumentOverlayProps> = ({
  src,
  position = [0.5, 0.5],
  width: docWidth = 320,
  rotation = -4,
  at = 0,
  caption,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const dropIn = spring({
    frame: Math.max(0, frame - at),
    fps,
    config: { damping: 14, stiffness: 120 },
  });
  const settle = Math.sin((frame - at) / 30) * 0.8;

  const rawX = position[0] * width - docWidth / 2;
  const rawY = position[1] * height - docWidth * 0.7;

  const { x, y } = useAutoLayout(
    `document-${src}`, rawX, rawY, docWidth, docWidth * 1.4,
    Priority.DECORATION, 'image', caption || 'document'
  );

  if (frame < at) return null;

  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y,
      width: docWidth,
      transform: `rotate(${rotation + settle}deg) scale(${dropIn})`,
      zIndex: 15,
      filter: 'drop-shadow(6px 10px 16px rgba(0,0,0,0.45))',
    }}>
      <svg viewBox="0 0 320 440" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <filter id="torn-paper" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="10" />
          </filter>
          <clipPath id="doc-clip">
            <path
              d="M 12,8 C 80,4 200,6 308,10 C 312,120 310,280 306,430 C 200,434 90,432 14,428 C 10,280 8,140 12,8 Z"
              filter="url(#torn-paper)"
            />
          </clipPath>
        </defs>

        {/* Parchment base with torn edges */}
        <path
          d="M 12,8 C 80,4 200,6 308,10 C 312,120 310,280 306,430 C 200,434 90,432 14,428 C 10,280 8,140 12,8 Z"
          fill="#e8d5a8"
          filter="url(#torn-paper)"
          stroke="#5a4326"
          strokeWidth="2"
          opacity="0.95"
        />

        {/* Document image clipped to torn shape */}
        <g clipPath="url(#doc-clip)">
          <image
            href={src.startsWith('http') ? src : undefined}
            x="12" y="8" width="296" height="422"
            preserveAspectRatio="xMidYMid slice"
          />
          {/* Foreign object for staticFile images */}
          {!src.startsWith('http') && (
            <foreignObject x="12" y="8" width="296" height="422">
              <div
                // @ts-ignore
                xmlns="http://www.w3.org/1999/xhtml"
                style={{ width: '100%', height: '100%', overflow: 'hidden' }}
              >
                <img
                  src={staticFile(src)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </foreignObject>
          )}
        </g>

        {/* Aging: coffee stains, edge darkening */}
        <ellipse cx="260" cy="80" rx="30" ry="22" fill="rgba(101,67,33,0.08)" />
        <ellipse cx="60" cy="350" rx="24" ry="18" fill="rgba(101,67,33,0.06)" />
        <path
          d="M 12,8 C 80,4 200,6 308,10 C 312,120 310,280 306,430 C 200,434 90,432 14,428 C 10,280 8,140 12,8 Z"
          fill="none"
          stroke="rgba(90,67,38,0.3)"
          strokeWidth="8"
          filter="url(#torn-paper)"
        />
      </svg>

      {/* Wax seal */}
      <div style={{
        position: 'absolute',
        bottom: 18,
        right: 22,
        width: 44, height: 44,
        borderRadius: '48% 52% 50% 50%',
        background: 'radial-gradient(circle at 35% 30%, #a93226, #6e1a12)',
        boxShadow: '2px 3px 8px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, color: '#e8d5a8',
        transform: 'rotate(12deg)',
      }}>
        ✦
      </div>

      {caption && (
        <div style={{
          marginTop: 10,
          textAlign: 'center',
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          fontSize: 15,
          color: 'rgba(255,255,255,0.85)',
          textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
        }}>
          {caption}
        </div>
      )}
    </div>
  );
};
