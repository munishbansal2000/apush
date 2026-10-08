import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import { VersusProps, VersusEntity } from './motionStudioTypes';

export const VersusPolarization: React.FC<VersusProps> = ({
  clashTitle,
  periodLabel,
  entityA,
  entityB,
  verdictSummary,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;

  // Header spring
  const headerSpring = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  // Entity A slides from left / top
  const enterA = spring({
    frame: frame - 10,
    fps,
    config: { damping: 13, mass: 0.9 },
  });
  const offsetA = interpolate(enterA, [0, 1], [isPortrait ? -60 : -100, 0]);
  const opacityA = interpolate(enterA, [0, 1], [0, 1]);

  // Entity B slides from right / bottom
  const enterB = spring({
    frame: frame - 20,
    fps,
    config: { damping: 13, mass: 0.9 },
  });
  const offsetB = interpolate(enterB, [0, 1], [isPortrait ? 60 : 100, 0]);
  const opacityB = interpolate(enterB, [0, 1], [0, 1]);

  // VS Emblem slams in at frame 32
  const vsSpring = spring({
    frame: frame - 32,
    fps,
    config: { damping: 10, stiffness: 200, mass: 0.7 },
  });
  const vsScale = interpolate(vsSpring, [0, 1], [3, 1]);
  const vsOpacity = interpolate(vsSpring, [0, 1], [0, 1]);

  // Normalize the two entity shapes: motion-studio ({faction, portraitDesc,
  // coreIdeology, keyStances, accentColor}) and kit beats ({name, subtitle,
  // points, color}). Kit beats must render their points, not empty panels.
  const accentA = entityA.accentColor ?? entityA.color ?? '#fbbf24';
  const accentB = entityB.accentColor ?? entityB.color ?? '#fbbf24';
  const descA = entityA.portraitDesc ?? entityA.subtitle ?? '';
  const descB = entityB.portraitDesc ?? entityB.subtitle ?? '';

  const renderBody = (e: VersusEntity, accent: string) => {
    if (e.keyStances?.length) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
          {e.keyStances.map((stance, idx) => (
            <div key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{stance.topic}</span>
                <span style={{ color: accent, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                  {stance.powerLevel}% FOCUS
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                {stance.position}
              </div>
              <div style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${interpolate(frame - 40 - idx * 10, [0, 20], [0, stance.powerLevel], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}%`,
                    backgroundColor: accent,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (e.points?.length) {
      return (
        <ul style={{ margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none' }}>
          {e.points.map((pt, idx) => {
            const o = interpolate(frame - 55 - idx * 14, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <li key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: o, transform: `translateX(${(1 - o) * -16}px)` }}>
                <span style={{ color: accent, fontSize: 15, lineHeight: 1.4 }}>▸</span>
                <span style={{ fontSize: 15, lineHeight: 1.45, color: 'rgba(241,245,249,0.92)' }}>{pt}</span>
              </li>
            );
          })}
        </ul>
      );
    }
    return null;
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0d14',
        color: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: isPortrait ? '36px 20px' : '36px 54px',
        overflow: 'hidden',
      }}
    >
      {/* Background dual ambient lighting */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '50%',
          background: 'radial-gradient(circle at 20% 40%, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: '50%',
          background: 'radial-gradient(circle at 80% 40%, rgba(239, 68, 68, 0.15) 0%, transparent 70%)',
        }}
      />

      {/* Main Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Header bar */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: isPortrait ? 16 : 24,
            opacity: interpolate(headerSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(headerSpring, [0, 1], [-20, 0])}px)`,
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 13,
                fontWeight: 800,
                color: '#fbbf24',
                letterSpacing: '0.12em',
              }}
            >
              {periodLabel}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span
              style={{
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              HISTORICAL POLARIZATION
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: isPortrait ? 28 : 38,
              fontWeight: 900,
              margin: 0,
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            {clashTitle}
          </h1>
        </div>

        {/* Versus Battle Arena */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: isPortrait ? 'column' : 'row',
            position: 'relative',
            gap: isPortrait ? 16 : 30,
            alignItems: 'stretch',
          }}
        >
          {/* Card A (Hamilton) */}
          <div
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${accentA}44`,
              borderLeft: `4px solid ${accentA}`,
              borderRadius: 14,
              padding: isPortrait ? '14px 18px' : '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              opacity: opacityA,
              transform: isPortrait ? `translateY(${offsetA}px)` : `translateX(${offsetA}px)`,
              boxShadow: `0 12px 32px rgba(0,0,0,0.4), inset 0 0 20px ${accentA}11`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: accentA,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {entityA.faction}
                </span>
                <h2
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: isPortrait ? 20 : 26,
                    fontWeight: 800,
                    margin: '2px 0',
                    color: '#ffffff',
                  }}
                >
                  {entityA.name}
                </h2>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  {descA}
                </div>
              </div>
            </div>

            {entityA.coreIdeology ? (
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                color: 'rgba(241, 245, 249, 0.85)',
                margin: '8px 0 16px 0',
                paddingBottom: 12,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {entityA.coreIdeology}
            </p>
            ) : null}

            {renderBody(entityA, accentA)}
          </div>

          {/* Animated Center "VS" Emblem */}
          <div
            style={{
              position: isPortrait ? 'relative' : 'absolute',
              left: isPortrait ? 'auto' : '50%',
              top: isPortrait ? 'auto' : '50%',
              transform: isPortrait ? 'none' : `translate(-50%, -50%) scale(${vsScale})`,
              alignSelf: isPortrait ? 'center' : 'auto',
              opacity: vsOpacity,
              zIndex: 30,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: isPortrait ? 44 : 64,
                height: isPortrait ? 44 : 64,
                borderRadius: '50%',
                backgroundColor: '#0f172a',
                border: '3px solid #fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(251, 191, 36, 0.6), inset 0 0 10px rgba(251, 191, 36, 0.4)',
              }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: isPortrait ? 16 : 22,
                  fontWeight: 900,
                  color: '#fbbf24',
                  letterSpacing: '0.05em',
                }}
              >
                VS
              </span>
            </div>
          </div>

          {/* Card B (Jefferson) */}
          <div
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${accentB}44`,
              borderRight: `4px solid ${accentB}`,
              borderRadius: 14,
              padding: isPortrait ? '14px 18px' : '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              opacity: opacityB,
              transform: isPortrait ? `translateY(${offsetB}px)` : `translateX(${offsetB}px)`,
              boxShadow: `0 12px 32px rgba(0,0,0,0.4), inset 0 0 20px ${accentB}11`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: accentB,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {entityB.faction}
                </span>
                <h2
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: isPortrait ? 20 : 26,
                    fontWeight: 800,
                    margin: '2px 0',
                    color: '#ffffff',
                  }}
                >
                  {entityB.name}
                </h2>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  {descB}
                </div>
              </div>
            </div>

            {entityB.coreIdeology ? (
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                color: 'rgba(241, 245, 249, 0.85)',
                margin: '8px 0 16px 0',
                paddingBottom: 12,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {entityB.coreIdeology}
            </p>
            ) : null}

            {renderBody(entityB, accentB)}
          </div>
        </div>

        {/* Bottom Synthesis Verdict */}
        <div
          style={{
            marginTop: isPortrait ? 14 : 20,
            padding: '12px 18px',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span
            style={{
              padding: '3px 8px',
              backgroundColor: '#fbbf24',
              color: '#0f172a',
              fontFamily: "'Cinzel', serif",
              fontSize: 11,
              fontWeight: 800,
              borderRadius: 4,
              whiteSpace: 'nowrap',
            }}
          >
            SYNTHESIS
          </span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
            {verdictSummary}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
