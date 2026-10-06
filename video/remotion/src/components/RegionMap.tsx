/**
 * RegionMap — real Ortelius 1570 map with region highlights.
 *
 * Three regions light up as Marcus names them: Southwest → Plains → Northeast.
 * Uses the genuine 1570 Ortelius map, not AI.
 */
import React from 'react';
import { Img, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';
import { PhotoPin } from './PhotoPin';

interface RegionMapProps {
  activeRegions?: string[];
  at?: number;
  /** Absolute frame when each region first appears (for cumulative display) */
  regionAppearFrames?: Record<string, number>;
}

const REGION_DATA: Record<string, { label: string; sub: string; pos: [number, number]; image: string; caption: string }> = {
  southwest: { label: 'SOUTHWEST', sub: 'Pueblo · adobe villages', pos: [0.28, 0.72], image: 'historic/taos-pueblo.jpg', caption: 'Taos Pueblo' },
  plains: { label: 'PLAINS', sub: 'Bison herds · nomadic', pos: [0.5, 0.5], image: 'historic/bison-herd.jpg', caption: 'Plains bison' },
  northeast: { label: 'NORTHEAST', sub: 'Longhouses · palisades', pos: [0.72, 0.32], image: 'historic/debry_pomeiooc_1590.jpg', caption: 'Algonquian village (de Bry, 1590)' },
};

export const RegionMap: React.FC<RegionMapProps> = ({
  activeRegions = [],
  at = 0,
  regionAppearFrames = {},
}) => {
  const frame = useCurrentFrame();

  useAutoLayout('region-map', 0, 0, 1280, 720, Priority.BACKGROUND, 'image', 'ortelius map');

  if (frame < at) return null;

  const fadeIn = interpolate(frame - at, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 5, opacity: fadeIn }}>
      <Img
        src={staticFile('historic/ortelius_america_1570.jpg')}
        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
      />
      {/* Region labels + pinned photo panels with arrows */}
      {activeRegions.map((regionId, idx) => {
        const region = REGION_DATA[regionId];
        if (!region) return null;
        // Use absolute appear frame so regions don't re-animate on turn change
        const panelAt = regionAppearFrames[regionId] ?? (at + idx * 10);
        // Photo sits above-left, arrow points down to the map location
        // Clamp to keep within frame bounds
        const photoX = Math.max(0.12, Math.min(0.76, region.pos[0] - 0.12));
        const photoY = Math.max(0.18, region.pos[1] - 0.15);
        const targetX = region.pos[0] * 1280;
        const targetY = region.pos[1] * 720;
        const fromX = photoX * 1280 + 110;
        const fromY = photoY * 720 + 80;
        return (
          <React.Fragment key={regionId}>
            <PhotoPin
              src={region.image}
              position={[photoX, photoY]}
              width={220}
              rotation={idx % 2 === 0 ? 3 : -3}
              at={panelAt}
              caption={region.caption}
            />
            {/* Hand-drawn arrow from photo to map location */}
            <svg
              viewBox="0 0 1280 720"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 6, pointerEvents: 'none' }}
            >
              <defs>
                <marker id={`arrow-${regionId}`} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                  <path d="M0,0 L10,3 L0,6 Z" fill="#e74c3c" />
                </marker>
              </defs>
              <path
                d={`M ${fromX},${fromY} Q ${(fromX + targetX) / 2},${(fromY + targetY) / 2 - 30} ${targetX},${targetY}`}
                fill="none"
                stroke="#e74c3c"
                strokeWidth="5"
                strokeLinecap="round"
                markerEnd={`url(#arrow-${regionId})`}
                opacity="0.9"
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                left: targetX - 140,
                top: targetY + 12,
                width: 280,
                textAlign: 'center',
                zIndex: 6,
              }}
            >
              <div style={{
                fontFamily: 'Georgia, serif',
                fontSize: 28,
                fontWeight: 'bold',
                letterSpacing: '2px',
                color: '#fff',
                textShadow: '2px 2px 8px rgba(0,0,0,0.9)',
              }}>
                {region.label}
              </div>
              <div style={{
                fontFamily: 'Georgia, serif',
                fontSize: 15,
                fontStyle: 'italic',
                color: '#f5e6c8',
                textShadow: '1px 1px 4px rgba(0,0,0,0.9)',
              }}>
                {region.sub}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
