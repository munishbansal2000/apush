/**
 * RegionMap — real Ortelius 1570 map with region highlights.
 *
 * Three regions light up as Marcus names them: Southwest → Plains → Northeast.
 * Uses the genuine 1570 Ortelius map, not AI.
 */
import React, { useId } from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';
import { PhotoPin } from '../components/PhotoPin';

interface RegionMapProps {
  activeRegions?: string[];
  at?: number;
  /** Absolute frame when each region first appears (for cumulative display) */
  regionAppearFrames?: Record<string, number>;
  /** Override the background map (public/ path, URL, or staticFile() result). Default: Ortelius 1570. '' = no map image. */
  mapImage?: string;
  /** Override per-region photo paths, keyed by region id ('southwest' | 'plains' | 'northeast'). */
  regionImages?: Partial<Record<string, string>>;
}

/** URLs, data URIs and already-resolved paths pass through; bare names go through staticFile. */
const resolveSrc = (src: string) =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

const REGION_DATA: Record<string, { label: string; sub: string; pos: [number, number]; image: string; caption: string }> = {
  southwest: { label: 'SOUTHWEST', sub: 'Pueblo · adobe villages', pos: [0.28, 0.72], image: 'historic/taos-pueblo.jpg', caption: 'Taos Pueblo' },
  plains: { label: 'PLAINS', sub: 'Bison herds · nomadic', pos: [0.5, 0.5], image: 'historic/bison-herd.jpg', caption: 'Plains bison' },
  northeast: { label: 'NORTHEAST', sub: 'Longhouses · palisades', pos: [0.72, 0.32], image: 'historic/debry_pomeiooc_1590.jpg', caption: 'Algonquian village (de Bry, 1590)' },
};

export const RegionMap: React.FC<RegionMapProps> = ({
  activeRegions = [],
  at = 0,
  regionAppearFrames = {},
  mapImage = 'historic/ortelius_america_1570.jpg',
  regionImages = {},
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const uid = useId().replace(/:/g, '');

  useAutoLayout('region-map', 0, 0, width, height, Priority.BACKGROUND, 'image', 'ortelius map');

  if (frame < at) return null;

  const fadeIn = interpolate(frame - at, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 5, opacity: fadeIn }}>
      {mapImage !== '' && (
        <Img
          src={resolveSrc(mapImage)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
        />
      )}
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
        const targetX = region.pos[0] * width;
        const targetY = region.pos[1] * height;
        const fromX = photoX * width + 110;
        const fromY = photoY * height + 80;
        const markerId = `arrow-${regionId}-${uid}`;
        return (
          <React.Fragment key={regionId}>
            <PhotoPin
              src={regionImages[regionId] ?? region.image}
              position={[photoX, photoY]}
              width={220}
              rotation={idx % 2 === 0 ? 3 : -3}
              at={panelAt}
              caption={region.caption}
            />
            {/* Hand-drawn arrow from photo to map location */}
            <svg
              viewBox={`0 0 ${width} ${height}`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 6, pointerEvents: 'none' }}
            >
              <defs>
                <marker id={markerId} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                  <path d="M0,0 L10,3 L0,6 Z" fill="#e74c3c" />
                </marker>
              </defs>
              <path
                d={`M ${fromX},${fromY} Q ${(fromX + targetX) / 2},${(fromY + targetY) / 2 - 30} ${targetX},${targetY}`}
                fill="none"
                stroke="#e74c3c"
                strokeWidth="5"
                strokeLinecap="round"
                markerEnd={`url(#${markerId})`}
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
