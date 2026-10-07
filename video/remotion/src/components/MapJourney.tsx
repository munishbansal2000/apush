import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';

// Frames per second (must match episode config)
const FPS = 30;

export type JourneyItem = {
  id: string;
  content: string;
  isImage?: boolean;
  from: [number, number];
  to: [number, number];
  duration: number;
  delay?: number;
  arcHeight?: number;
  style?: 'fly' | 'gallop' | 'ooze' | 'spin' | 'float';
  size?: number;
  trail?: boolean;
  glow?: string;
};

export interface MapJourneyProps {
  at: number;
  mapImage: string;
  items: JourneyItem[];
  guides?: { from: [number, number]; to: [number, number]; color: string }[];
  labels?: { x: number; y: number; text: string; color?: string }[];
  caption?: string;
  variant?: 'overview' | 'detail' | 'dark';
}

/**
 * MapJourney — Animated items moving across a map.
 *
 * Declarative: you specify what moves, from where to where,
 * with what style. The component handles the animation.
 *
 * Styles:
 * - fly: arc with tilt (default)
 * - gallop: bouncy (horses)
 * - ooze: sickly wobble (disease)
 * - spin: rotates while moving
 * - float: gentle bob
 *
 * Variants:
 * - overview: full map
 * - detail: zoomed 1.35x
 * - dark: ominous red-black (disease, death)
 */
export const MapJourney: React.FC<MapJourneyProps> = ({
  at,
  mapImage,
  items,
  guides = [],
  labels = [],
  caption,
  variant = 'overview',
}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const elapsed = (frame - at) / FPS;

  const isDark = variant === 'dark';
  const isDetail = variant === 'detail';

  const renderItem = (item: JourneyItem) => {
    const delay = item.delay || 0;
    const t = Math.min(1, Math.max(0, (elapsed - delay) / item.duration));
    if (t <= 0) return null;

    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const x = item.from[0] + (item.to[0] - item.from[0]) * eased;
    const arc = Math.sin(eased * Math.PI) * (item.arcHeight || 0);
    const baseY = item.from[1] + (item.to[1] - item.from[1]) * eased;

    let y = baseY - arc;
    let rotation = 0;
    let scaleY = 1;

    switch (item.style) {
      case 'gallop':
        y -= Math.abs(Math.sin(eased * Math.PI * 8)) * 25 * (1 - eased * 0.3);
        rotation = Math.sin(eased * Math.PI * 8) * 8;
        break;
      case 'ooze':
        y += Math.sin(eased * Math.PI * 5) * 15;
        rotation = Math.sin(eased * Math.PI * 3) * 20;
        scaleY = 1 + Math.sin(eased * Math.PI * 4) * 0.15;
        break;
      case 'spin':
        rotation = eased * 720;
        break;
      case 'float':
        y -= Math.sin(eased * Math.PI * 3) * 20;
        rotation = Math.sin(eased * Math.PI * 2) * 10;
        break;
      case 'fly':
      default:
        rotation = (item.to[0] > item.from[0] ? 1 : -1) * 15 * Math.sin(eased * Math.PI);
        break;
    }

    const popIn = Math.min(1, t / 0.1);
    const size = item.size || 56;

    return (
      <g key={item.id}>
        {item.trail && t < 1 && t > 0.05 && (
          <circle
            cx={x - (item.to[0] > item.from[0] ? 25 : -25)}
            cy={y}
            r={size * 0.3}
            fill={item.glow || '#ffffff'}
            opacity={0.25 * (1 - t)}
          />
        )}
        {item.isImage ? (
          <image
            href={staticFile(item.content)}
            x={x - size / 2} y={y - size / 2}
            width={size} height={size}
            transform={`rotate(${rotation} ${x} ${y}) scale(1 ${scaleY})`}
            opacity={popIn}
            style={item.glow ? { filter: `drop-shadow(0 0 10px ${item.glow})` } : {}}
          />
        ) : (
          <text
            x={x} y={y}
            textAnchor="middle" dominantBaseline="central"
            fontSize={size}
            transform={`rotate(${rotation} ${x} ${y}) scale(${popIn} ${popIn * scaleY})`}
            opacity={popIn}
            style={item.glow ? { filter: `drop-shadow(0 0 12px ${item.glow})` } : {}}>
            {item.content}
          </text>
        )}
      </g>
    );
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ position: 'relative', width: '92%', height: '92%' }}>
        <Img src={staticFile(mapImage)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12,
            transform: isDetail ? 'scale(1.35)' : 'scale(1)',
            transition: 'transform 0.8s ease-out',
          }} />
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 12,
          background: isDark ? 'rgba(20,0,0,0.65)' : 'rgba(0,0,0,0.3)',
        }} />
        {isDark && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 12,
            boxShadow: `inset 0 0 ${100 + Math.sin(elapsed * 3) * 20}px rgba(180,0,0,0.6)`,
            pointerEvents: 'none',
          }} />
        )}
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {guides.map((g, i) => (
            <path key={i}
              d={`M ${g.from[0]} ${g.from[1]} Q 500 ${(g.from[1] + g.to[1]) / 2 - 100} ${g.to[0]} ${g.to[1]}`}
              fill="none" stroke={g.color} strokeWidth="3"
              strokeDasharray="12,8" opacity="0.35" />
          ))}
          {labels.map((l, i) => (
            <text key={i} x={l.x} y={l.y} textAnchor="middle"
              fill={l.color || '#ffd700'} fontSize="36" fontWeight="900"
              fontFamily="Georgia, serif"
              style={{ textShadow: '2px 2px 8px #000' }}>
              {l.text}
            </text>
          ))}
          {items.map(renderItem)}
        </svg>
        {caption && (
          <div style={{
            position: 'absolute', bottom: '4%', left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 22,
            color: '#f5e6c8', textShadow: '2px 2px 6px #000',
            background: 'rgba(0,0,0,0.6)', padding: '8px 24px', borderRadius: 20,
            whiteSpace: 'nowrap',
          }}>
            {caption}
          </div>
        )}
      </div>
    </div>
  );
};
