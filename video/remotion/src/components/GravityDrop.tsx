/**
 * GravityDrop — things that fall and land with weight.
 *
 * NOT a spring pop. Real gravity: accelerates downward, bounces with
 * energy loss, settles with a thud. For text, objects, anything heavy.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { useAutoLayout, Priority } from '../validation/AutoLayout';

interface GravityDropProps {
  children: React.ReactNode;
  /** Target landing position [x, y] as fractions */
  landAt?: [number, number];
  /** How high above to start (pixels) */
  dropHeight?: number;
  /** Frame when drop starts */
  at?: number;
  /** Gravity strength (pixels/frame^2) */
  gravity?: number;
  /** Bounce energy retention (0-1, lower = deader thud) */
  bounciness?: number;
  /** Width for layout */
  width?: number;
  /** Height for layout */
  height?: number;
  /** Rotation on landing (degrees, for natural settle) */
  landRotation?: number;
}

/**
 * Physics: natural falling with air resistance, tumble, and sway.
 * y(t) uses eased gravity (not pure parabola) for organic feel.
 */
function gravityY(
  t: number,
  dropHeight: number,
  gravity: number,
  bounciness: number
): { y: number; rotation: number; swayX: number } {
  if (t <= 0) return { y: -dropHeight, rotation: 0, swayX: 0 };

  // Hang time: brief suspension before gravity takes over (1-2 frames)
  const hangTime = 3;
  const ft = Math.max(0, t - hangTime);

  // Eased gravity: starts slow (air resistance), accelerates
  // Using t^2.2 instead of t^2 for slightly more natural acceleration curve
  const tImpact = Math.pow(dropHeight / gravity, 1 / 2.2);

  if (ft < tImpact) {
    const progress = ft / tImpact;
    // Ease-in quad for acceleration feel + slight overshoot wobble
    const eased = progress * progress * (0.85 + 0.15 * Math.sin(progress * Math.PI));
    const y = -dropHeight + dropHeight * eased;
    // Tumble accelerates with fall speed (not linear)
    const rotation = progress * progress * 14;
    // Sway: gentle sinusoidal drift that grows then settles
    const swayX = Math.sin(ft * 0.35) * 10 * progress * (1 - progress * 0.5);
    return { y, rotation, swayX };
  }

  // Bouncing: each bounce is organic, not a perfect parabola
  let remaining = ft - tImpact;
  let bounceHeight = dropHeight * bounciness * bounciness;
  let bounceNum = 0;
  const maxBounces = 5;

  while (bounceNum < maxBounces && bounceHeight > 3) {
    // Bounce timing slightly irregular (not metronomic)
    const irregularity = 1 + Math.sin(bounceNum * 2.7) * 0.08;
    const tUp = Math.sqrt(bounceHeight / gravity) * irregularity;
    const tBounce = tUp * 2;

    if (remaining < tBounce) {
      const tb = remaining - tUp;
      // Parabola with slight asymmetry (up faster than down, like real bounce)
      const asym = tb < 0 ? 1.08 : 0.94;
      const y = (-bounceHeight + gravity * tb * tb) * asym;
      // Settle rotation with damped oscillation
      const rotDecay = Math.pow(0.55, bounceNum);
      const rotation = Math.sin(bounceNum * 2.4 + remaining * 0.4) * 5 * rotDecay;
      // Tiny horizontal settle
      const swayX = Math.sin(bounceNum * 1.8) * 4 * rotDecay * (1 - remaining / tBounce);
      return { y: Math.min(0, y), rotation, swayX };
    }

    remaining -= tBounce;
    bounceHeight *= bounciness * bounciness;
    bounceNum++;
  }

  return { y: 0, rotation: 0, swayX: 0 };
}

export const GravityDrop: React.FC<GravityDropProps> = ({
  children,
  landAt = [0.5, 0.5],
  dropHeight = 500,
  at = 0,
  gravity = 1.2,
  bounciness = 0.45,
  width: w = 400,
  height: h = 100,
  landRotation = 0,
}) => {
  const frame = useCurrentFrame();
  const { width: fw, height: fh } = useVideoConfig();

  const t = Math.max(0, frame - at);
  const { y: yOffset, rotation, swayX } = gravityY(t, dropHeight, gravity, bounciness);

  // Impact shake: small screen nudge on first landing
  const tImpact = Math.pow(dropHeight / gravity, 1 / 2.2) + 3;
  const impactShake = t > tImpact && t < tImpact + 10
    ? Math.sin((t - tImpact) * 2.5) * 5 * (1 - (t - tImpact) / 10)
    : 0;

  const landX = landAt[0] * fw - w / 2;
  const landY = landAt[1] * fh - h / 2;

  const { x, y } = useAutoLayout(
    `gravity-${at}`, landX, landY + yOffset, w, h,
    Priority.BUBBLE, 'text', 'gravity drop'
  );

  if (frame < at) return null;

  // Squash on impact — more pronounced, with stretch on the way down
  const isFalling = yOffset < -10;
  const stretch = isFalling ? 1 + Math.min(0.08, Math.abs(yOffset) / 4000) : 1;
  const isImpact = Math.abs(yOffset) < 8 && t > tImpact;
  const squash = isImpact ? 1 - 0.16 * Math.max(0, 1 - (t - tImpact) / 8) : 1;

  return (
    <div style={{
      position: 'absolute',
      left: x + impactShake + swayX,
      top: y,
      width: w,
      zIndex: 25,
      transform: `rotate(${rotation + landRotation}deg) scaleY(${squash / stretch}) scaleX(${(2 - squash) * stretch})`,
      transformOrigin: 'bottom center',
    }}>
      {children}
    </div>
  );
};

/**
 * GravityText — convenience wrapper for dropping text with weight.
 */
export const GravityText: React.FC<{
  text: string;
  landAt?: [number, number];
  fontSize?: number;
  color?: string;
  at?: number;
  dropHeight?: number;
}> = ({ text, landAt, fontSize = 64, color = '#fff', at = 0, dropHeight = 500 }) => {
  return (
    <GravityDrop
      landAt={landAt}
      at={at}
      dropHeight={dropHeight}
      width={800}
      height={fontSize * 1.4}
    >
      <div style={{
        fontSize,
        fontWeight: 900,
        fontFamily: 'Arial Black, Impact, sans-serif',
        color,
        textAlign: 'center',
        textShadow: '3px 4px 0 rgba(0,0,0,0.4)',
        letterSpacing: '1px',
      }}>
        {text}
      </div>
    </GravityDrop>
  );
};
