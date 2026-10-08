import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import { KineticCaptionsProps } from './motionStudioTypes';
const colonialHallAsset = ''; // TODO: add colonial hall image

export const KineticCaptions: React.FC<KineticCaptionsProps> = ({
  tokens,
  speakerName = 'Franklin D. Roosevelt · 1933',
  highlightColor = '#f59e0b',
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
        backgroundColor: '#0a0d14',
        color: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background cinematic atmosphere */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${colonialHallAsset})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.28) contrast(1.15) blur(3px)',
          transform: `scale(${bgScale})`,
        }}
      />

      {/* Radial vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(10, 13, 20, 0.4) 0%, rgba(10, 13, 20, 0.95) 85%)',
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
            borderRadius: 30,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
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
              fontFamily: "'Cinzel', serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#ffffff',
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
              config: { damping: 9, stiffness: 220, mass: 0.6 },
            });

            const scale = isCurrent
              ? token.emphasis ? 1.35 : 1.2
              : isSpoken ? 1.0 : 0.9;


            return (
              <span
                key={idx}
                style={{
                  display: 'inline-block',
                  fontFamily: token.emphasis ? "'Cinzel', serif" : "'Plus Jakarta Sans', sans-serif",
                  fontSize: isPortrait
                    ? token.emphasis ? 36 : 28
                    : token.emphasis ? 48 : 38,
                  fontWeight: token.emphasis ? 900 : 700,
                  color: isCurrent
                    ? '#ffffff'
                    : isSpoken
                    ? token.emphasis ? highlightColor : '#e2e8f0'
                    : 'rgba(255, 255, 255, 0.25)',
                  textShadow: isCurrent
                    ? `0 0 24px ${highlightColor}, 0 2px 10px rgba(0,0,0,0.8)`
                    : token.emphasis && isSpoken
                    ? `0 0 16px ${highlightColor}88`
                    : '0 2px 8px rgba(0,0,0,0.6)',
                  transform: `scale(${scale * (isSpoken ? wordSpring : 1)})`,
                  transition: 'color 0.1s ease',
                  padding: isCurrent ? '2px 6px' : '0',
                  borderRadius: 6,
                  backgroundColor: isCurrent ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
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
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 20,
              border: '1px solid rgba(255, 255, 255, 0.08)',
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
                    backgroundColor: i % 2 === 0 ? highlightColor : 'rgba(255,255,255,0.7)',
                    borderRadius: 2,
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
