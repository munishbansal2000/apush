import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { KineticCaptionsProps } from './motionStudioTypes';
import { colonialHallAsset } from './motionStudioPresets';
import { FONT, COLOR, TYPE, RADIUS, alpha } from '../theme/tokens';

/** URLs, data URIs and already-resolved paths pass through; bare names go through staticFile. */
const resolveSrc = (src: string) =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

export const KineticCaptions: React.FC<KineticCaptionsProps> = ({
  tokens,
  speakerName = 'Franklin D. Roosevelt · 1933',
  highlightColor = COLOR.amber,
  showWaveform = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;

  // Background subtle zoom
  const bgScale = interpolate(frame, [0, 180], [1, 1.06]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLOR.night,
        color: COLOR.onNight,
        fontFamily: FONT.ui,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background cinematic atmosphere (skipped until the asset exists) */}
      {colonialHallAsset !== '' && (
        <Img
          src={resolveSrc(colonialHallAsset)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'brightness(0.28) contrast(1.15) blur(3px)',
            transform: `scale(${bgScale})`,
          }}
        />
      )}

      {/* Radial vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${alpha(COLOR.night, 0.4)} 0%, ${alpha(COLOR.night, 0.95)} 85%)`,
        }}
      />

      {/* Main Content Box */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: isPortrait ? '92%' : '80%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isPortrait ? 24 : 32,
        }}
      >
        {/* Speaker Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 18px',
            borderRadius: RADIUS.pill,
            backgroundColor: alpha(COLOR.night, 0.85),
            border: `1px solid ${alpha(COLOR.onNight, 0.15)}`,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: highlightColor,
              boxShadow: `0 0 8px ${highlightColor}`,
            }}
          />
          <span
            style={{
              fontFamily: FONT.display,
              fontSize: TYPE.tag,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: COLOR.onNight,
            }}
          >
            {speakerName}
          </span>
        </div>

        {/* Dynamic Word-by-Word Kinetic Display */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: isPortrait ? '10px 12px' : '14px 18px',
            lineHeight: 1.3,
          }}
        >
          {tokens.map((token, idx) => {
            const isSpoken = frame >= token.startFrame;
            const isCurrent = frame >= token.startFrame && frame <= token.endFrame;

            // Bouncy entrance when spoken
            const wordSpring = spring({
              frame: frame - token.startFrame,
              fps,
              config: { damping: 9, stiffness: 220, mass: 0.6 }, // intentional: snappy bouncy word pop, faster than MOTION.spring
            });

            const scale = isCurrent
              ? token.emphasis ? 1.35 : 1.2
              : isSpoken ? 1.0 : 0.9;


            return (
              <span
                key={idx}
                style={{
                  display: 'inline-block',
                  fontFamily: token.emphasis ? FONT.display : FONT.ui,
                  fontSize: isPortrait
                    ? token.emphasis ? TYPE.h2 : TYPE.h3
                    : token.emphasis ? TYPE.h1 * 0.86 : TYPE.h2,
                  fontWeight: token.emphasis ? 900 : 700,
                  color: isCurrent
                    ? COLOR.onNight
                    : isSpoken
                    ? token.emphasis ? highlightColor : COLOR.onNight
                    : alpha(COLOR.onNight, 0.25),
                  textShadow: isCurrent
                    ? `0 0 24px ${highlightColor}, 0 2px 10px ${alpha(COLOR.night, 0.8)}`
                    : token.emphasis && isSpoken
                    ? `0 0 16px ${highlightColor}88`
                    : `0 2px 8px ${alpha(COLOR.night, 0.6)}`,
                  transform: `scale(${scale * (isSpoken ? wordSpring : 1)})`,
                  padding: isCurrent ? '2px 6px' : '0',
                  borderRadius: RADIUS.sm,
                  backgroundColor: isCurrent ? alpha(COLOR.amber, 0.25) : 'transparent',
                }}
              >
                {token.text ?? token.word}
              </span>
            );
          })}
        </div>

        {/* Audio Waveform reactive simulation */}
        {showWaveform && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              height: 36,
              padding: '6px 16px',
              backgroundColor: alpha(COLOR.night, 0.6),
              borderRadius: RADIUS.lg,
              border: `1px solid ${alpha(COLOR.onNight, 0.08)}`,
            }}
          >
            {Array.from({ length: 28 }).map((_, i) => {
              // Simulated voice frequency ripple
              const barHeight = Math.max(
                4,
                Math.sin(frame * 0.35 + i * 0.4) * 14 +
                  Math.cos(frame * 0.2 + i * 0.6) * 10 +
                  12
              );

              return (
                <div
                  key={i}
                  style={{
                    width: 3,
                    height: `${barHeight}px`,
                    backgroundColor: i % 2 === 0 ? highlightColor : alpha(COLOR.onNight, 0.7),
                    borderRadius: RADIUS.sm,
                    boxShadow: i % 2 === 0 ? `0 0 6px ${highlightColor}` : 'none',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
