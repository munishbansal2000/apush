import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { useCanvasElements } from '../validation/CanvasTracker';
import { useProportions } from '../validation/useProportions';
import { TimingProps } from '../validation/timing';
import { COLOR, FONT, TYPE, alpha } from '../theme/tokens';

interface ShipProps extends TimingProps {
  shipName?: string;
  /** 'sail' = peaceful sailing, 'battle' = with cannon fire */
  variant?: 'sail' | 'battle';
  fireAt?: number;
  /** Background colour behind the image (default COLOR.night) */
  bg?: string;
  debug?: boolean;
  /**
   * Ship image: a path in public/ (passed through staticFile), an http(s) URL,
   * or an already-resolved staticFile() result. Default 'tallship-real.webp'.
   * Pass '' to render no image.
   */
  shipImage?: string;
}

/** URLs, data URIs and already-resolved paths pass through; bare names go through staticFile. */
const resolveSrc = (src: string) =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

/**
 * Ship — REALISTIC tall ship (not geometric SVG).
 *
 * Uses AI-generated photorealistic tall ship image.
 * - Slow Ken Burns drift (cinematic)
 * - Optional cannon fire with realistic smoke/flash
 * - Ship name label
 *
 * No stupid geometry. Real ship, real ocean.
 */
export const Ship: React.FC<ShipProps> = ({
  shipName = 'Santa María — 1492',
  variant = 'sail',
  fireAt = 60,
  bg,
  debug = false,
  shipImage = 'tallship-real.webp',
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const { px } = useProportions([], { debug: false });

  // Cinematic slow zoom (Ken Burns)
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // LIFE: ocean motion — ship bobs, camera sways, waves feel alive
  const bobY = Math.sin(frame / 25) * 12; // Ship riding waves
  const bobX = Math.sin(frame / 32) * 8;
  const roll = Math.sin(frame / 28) * 1.2; // Ship rolling
  const cameraSwayX = Math.sin(frame / 50) * 15; // Handheld feel
  const cameraSwayY = Math.cos(frame / 42) * 10;

  // Subtle pan
  const panX = interpolate(frame, [0, durationInFrames], [0, -20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Cannon fire (battle variant)
  const isBattle = variant === 'battle';
  const isFiring = isBattle && frame >= fireAt && frame < fireAt + 40;
  const fireProgress = isFiring ? (frame - fireAt) / 40 : 0;

  // Screen shake when cannons fire
  const shakeX = isFiring ? Math.sin(frame * 3) * 8 * (1 - fireProgress) : 0;
  const shakeY = isFiring ? Math.cos(frame * 2.5) * 6 * (1 - fireProgress) : 0;

  // Track ship image bounds
  useCanvasElements([{
    id: 'ship-image',
    type: 'image',
    content: shipName,
    x: 0,
    y: 0,
    width,
    height: height * 0.85,
  }], 'Ship');

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', backgroundColor: bg ?? COLOR.night }}>
      {/* Realistic tall ship image with Ken Burns + ocean motion */}
      <div style={{
        position: 'absolute',
        width: width * 1.15,
        height: height * 1.15,
        left: -width * 0.075 + panX + cameraSwayX + bobX + shakeX,
        top: -height * 0.075 + cameraSwayY + bobY + shakeY,
        transform: `scale(${zoom}) rotate(${roll}deg)`,
      }}>
        {shipImage !== '' && (
          <Img
            src={resolveSrc(shipImage)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </div>

      {/* Cinematic vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, transparent 50%, ${alpha(COLOR.night, 0.5)} 100%)`,
        pointerEvents: 'none',
      }} />

      {/* Cannon fire effects (realistic smoke and flash) */}
      {isFiring && (
        <>
          {/* Muzzle flashes along the hull */}
          {[0.35, 0.45, 0.55].map((posY, i) => {
            const delay = i * 5;
            const localProgress = Math.max(0, Math.min(1, (frame - fireAt - delay) / 25));
            if (localProgress <= 0 || localProgress >= 1) return null;
            return (
              <div key={i} style={{
                position: 'absolute',
                left: width * 0.3 + i * width * 0.15,
                top: height * posY,
                width: 120 * (1 - localProgress * 0.5),
                height: 120 * (1 - localProgress * 0.5),
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(COLOR.gold, 0.9 - localProgress * 0.9)} 0%, ${alpha(COLOR.amber, 0.6 - localProgress * 0.6)} 40%, transparent 70%)`,
                transform: 'translate(-50%, -50%)',
                filter: 'blur(8px)',
              }} />
            );
          })}

          {/* Smoke clouds drifting */}
          {[0, 1, 2, 3, 4].map(i => {
            const smokeX = width * (0.25 + i * 0.15) + fireProgress * 100;
            const smokeY = height * 0.45 - fireProgress * 80 + Math.sin(i * 2) * 30;
            const smokeSize = 60 + fireProgress * 120 + i * 20;
            return (
              <div key={`smoke-${i}`} style={{
                position: 'absolute',
                left: smokeX - smokeSize / 2,
                top: smokeY - smokeSize / 2,
                width: smokeSize,
                height: smokeSize,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(COLOR.onNightMuted, 0.5 - fireProgress * 0.4)} 0%, transparent 70%)`,
                filter: 'blur(15px)',
              }} />
            );
          })}
        </>
      )}

      {/* Ship name label (cinematic lower third) */}
      <div style={{
        position: 'absolute',
        bottom: height * 0.08,
        left: 0,
        right: 0,
        textAlign: 'center',
      }}>
        <span style={{
          fontSize: px(TYPE.h2),
          fontWeight: 'bold',
          fontFamily: FONT.text,
          color: COLOR.onNight,
          textShadow: `2px 2px 12px ${alpha(COLOR.night, 0.9)}, 0 0 30px ${alpha(COLOR.night, 0.7)}`,
          letterSpacing: '2px',
        }}>
          {shipName}
        </span>
      </div>
    </div>
  );
};
