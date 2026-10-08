import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import { VersusProps, VersusEntity } from './motionStudioTypes';
import { FONT, COLOR, TYPE, RADIUS, MOTION, alpha } from '../theme/tokens';

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
  // Scale with frame size: 1 at 1280×720 (landscape) / 720×1280 (portrait).
  const k = isPortrait ? width / 720 : width / 1280;
  const px = (n: number) => n * k;

  // Header spring
  const headerSpring = spring({
    frame,
    fps,
    config: MOTION.spring,
  });

  // Entity A slides from left / top
  const enterA = spring({
    frame: frame - 10,
    fps,
    config: MOTION.spring,
  });
  const offsetA = interpolate(enterA, [0, 1], [px(isPortrait ? -60 : -100), 0]);
  const opacityA = interpolate(enterA, [0, 1], [0, 1]);

  // Entity B slides from right / bottom
  const enterB = spring({
    frame: frame - 20,
    fps,
    config: MOTION.spring,
  });
  const offsetB = interpolate(enterB, [0, 1], [px(isPortrait ? 60 : 100), 0]);
  const opacityB = interpolate(enterB, [0, 1], [0, 1]);

  // VS Emblem slams in at frame 32
  const vsSpring = spring({
    frame: frame - 32,
    fps,
    config: { damping: 10, stiffness: 200, mass: 0.7 }, // intentional: stiff overshoot for the VS slam
  });
  const vsScale = interpolate(vsSpring, [0, 1], [3, 1]);
  const vsOpacity = interpolate(vsSpring, [0, 1], [0, 1]);

  // Normalize the two entity shapes: motion-studio ({faction, portraitDesc,
  // coreIdeology, keyStances, accentColor}) and kit beats ({name, subtitle,
  // points, color}). Kit beats must render their points, not empty panels.
  const accentA = entityA.accentColor ?? entityA.color ?? COLOR.gold;
  const accentB = entityB.accentColor ?? entityB.color ?? COLOR.gold;
  const descA = entityA.portraitDesc ?? entityA.subtitle ?? '';
  const descB = entityB.portraitDesc ?? entityB.subtitle ?? '';

  const renderBody = (e: VersusEntity, accent: string) => {
    if (e.keyStances?.length) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: px(10), marginTop: 'auto' }}>
          {e.keyStances.map((stance, idx) => (
            <div key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: px(8), fontSize: px(TYPE.town), marginBottom: px(3) }}>
                <span style={{ fontWeight: 600, color: alpha(COLOR.onNight, 0.9) }}>{stance.topic}</span>
                <span style={{ color: accent, fontSize: px(TYPE.tag), whiteSpace: 'nowrap', fontFamily: FONT.mono }}>
                  {stance.powerLevel}% FOCUS
                </span>
              </div>
              <div style={{ fontSize: px(TYPE.label), lineHeight: 1.35, color: alpha(COLOR.onNight, 0.7), marginBottom: px(4) }}>
                {stance.position}
              </div>
              <div style={{ height: px(4), backgroundColor: alpha(COLOR.onNight, 0.1), borderRadius: px(RADIUS.sm), overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${interpolate(frame - 40 - idx * 10, [0, 20], [0, stance.powerLevel], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}%`,
                    backgroundColor: accent,
                    borderRadius: px(RADIUS.sm),
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
        <ul style={{ margin: `${px(12)}px 0 0`, padding: 0, display: 'flex', flexDirection: 'column', gap: px(10), listStyle: 'none' }}>
          {e.points.map((pt, idx) => {
            const o = interpolate(frame - 55 - idx * 14, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <li key={idx} style={{ display: 'flex', gap: px(10), alignItems: 'flex-start', opacity: o, transform: `translateX(${(1 - o) * px(-16)}px)` }}>
                <span style={{ color: accent, fontSize: px(TYPE.body), lineHeight: 1.4 }}>▸</span>
                <span style={{ fontSize: px(TYPE.body), lineHeight: 1.4, color: alpha(COLOR.onNight, 0.92) }}>{pt}</span>
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
        backgroundColor: COLOR.night,
        color: COLOR.onNight,
        fontFamily: FONT.ui,
        padding: isPortrait ? `${px(36)}px ${px(20)}px` : `${px(30)}px ${px(48)}px`,
        boxSizing: 'border-box',
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
          background: `radial-gradient(circle at 20% 40%, ${alpha(COLOR.blue, 0.15)} 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: '50%',
          background: `radial-gradient(circle at 80% 40%, ${alpha(COLOR.red, 0.15)} 0%, transparent 70%)`,
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
          minHeight: 0,
        }}
      >
        {/* Header bar */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: px(isPortrait ? 16 : 18),
            opacity: interpolate(headerSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(headerSpring, [0, 1], [px(-20), 0])}px)`,
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: px(8), marginBottom: px(4) }}>
            <span
              style={{
                fontFamily: FONT.display,
                fontSize: px(TYPE.town),
                fontWeight: 800,
                color: COLOR.gold,
                letterSpacing: '0.12em',
              }}
            >
              {periodLabel}
            </span>
            <span style={{ color: alpha(COLOR.onNight, 0.3) }}>·</span>
            <span
              style={{
                fontSize: px(TYPE.tag),
                fontFamily: FONT.mono,
                color: alpha(COLOR.onNight, 0.6),
              }}
            >
              HISTORICAL POLARIZATION
            </span>
          </div>

          <h1
            style={{
              fontFamily: FONT.display,
              fontSize: px(isPortrait ? TYPE.h3 : TYPE.h2),
              fontWeight: 900,
              margin: 0,
              letterSpacing: '-0.02em',
              color: COLOR.onNight,
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
            gap: px(isPortrait ? 16 : 30),
            alignItems: 'stretch',
            minHeight: 0,
          }}
        >
          {/* Card A (Hamilton) */}
          <div
            style={{
              flex: 1,
              backgroundColor: alpha(COLOR.night, 0.85),
              backdropFilter: 'blur(16px)',
              border: `1px solid ${accentA}44`,
              borderLeft: `${px(4)}px solid ${accentA}`,
              borderRadius: px(RADIUS.lg),
              padding: isPortrait ? `${px(14)}px ${px(18)}px` : `${px(18)}px ${px(22)}px`,
              boxSizing: 'border-box',
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              opacity: opacityA,
              transform: isPortrait ? `translateY(${offsetA}px)` : `translateX(${offsetA}px)`,
              boxShadow: `0 ${px(12)}px ${px(32)}px ${alpha(COLOR.night, 0.4)}, inset 0 0 ${px(20)}px ${accentA}11`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: px(8) }}>
              <div>
                <span
                  style={{
                    fontSize: px(TYPE.small),
                    fontFamily: FONT.mono,
                    color: accentA,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {entityA.faction}
                </span>
                <h2
                  style={{
                    fontFamily: FONT.display,
                    fontSize: px(isPortrait ? TYPE.body : TYPE.h3),
                    fontWeight: 800,
                    margin: `${px(2)}px 0`,
                    color: COLOR.onNight,
                  }}
                >
                  {entityA.name}
                </h2>
                <div style={{ fontSize: px(TYPE.label), lineHeight: 1.3, color: alpha(COLOR.onNight, 0.7) }}>
                  {descA}
                </div>
              </div>
            </div>

            {entityA.coreIdeology ? (
            <p
              style={{
                fontSize: px(TYPE.label),
                lineHeight: 1.4,
                color: alpha(COLOR.onNight, 0.85),
                margin: `${px(6)}px 0 ${px(12)}px 0`,
                paddingBottom: px(10),
                borderBottom: `1px solid ${alpha(COLOR.onNight, 0.08)}`,
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
                width: px(isPortrait ? 44 : 64),
                height: px(isPortrait ? 44 : 64),
                borderRadius: '50%',
                backgroundColor: COLOR.night,
                border: `${px(3)}px solid ${COLOR.gold}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 25px ${alpha(COLOR.gold, 0.6)}, inset 0 0 10px ${alpha(COLOR.gold, 0.4)}`,
              }}
            >
              <span
                style={{
                  fontFamily: FONT.display,
                  fontSize: px(isPortrait ? TYPE.town : TYPE.body),
                  fontWeight: 900,
                  color: COLOR.gold,
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
              backgroundColor: alpha(COLOR.night, 0.85),
              backdropFilter: 'blur(16px)',
              border: `1px solid ${accentB}44`,
              borderRight: `${px(4)}px solid ${accentB}`,
              borderRadius: px(RADIUS.lg),
              padding: isPortrait ? `${px(14)}px ${px(18)}px` : `${px(18)}px ${px(22)}px`,
              boxSizing: 'border-box',
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              opacity: opacityB,
              transform: isPortrait ? `translateY(${offsetB}px)` : `translateX(${offsetB}px)`,
              boxShadow: `0 ${px(12)}px ${px(32)}px ${alpha(COLOR.night, 0.4)}, inset 0 0 ${px(20)}px ${accentB}11`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: px(8) }}>
              <div>
                <span
                  style={{
                    fontSize: px(TYPE.small),
                    fontFamily: FONT.mono,
                    color: accentB,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {entityB.faction}
                </span>
                <h2
                  style={{
                    fontFamily: FONT.display,
                    fontSize: px(isPortrait ? TYPE.body : TYPE.h3),
                    fontWeight: 800,
                    margin: `${px(2)}px 0`,
                    color: COLOR.onNight,
                  }}
                >
                  {entityB.name}
                </h2>
                <div style={{ fontSize: px(TYPE.label), lineHeight: 1.3, color: alpha(COLOR.onNight, 0.7) }}>
                  {descB}
                </div>
              </div>
            </div>

            {entityB.coreIdeology ? (
            <p
              style={{
                fontSize: px(TYPE.label),
                lineHeight: 1.4,
                color: alpha(COLOR.onNight, 0.85),
                margin: `${px(6)}px 0 ${px(12)}px 0`,
                paddingBottom: px(10),
                borderBottom: `1px solid ${alpha(COLOR.onNight, 0.08)}`,
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
            marginTop: px(isPortrait ? 14 : 16),
            padding: `${px(12)}px ${px(18)}px`,
            boxSizing: 'border-box',
            flexShrink: 0,
            backgroundColor: alpha(COLOR.night, 0.75),
            border: `1px solid ${alpha(COLOR.gold, 0.3)}`,
            borderRadius: px(RADIUS.md),
            display: 'flex',
            alignItems: 'center',
            gap: px(12),
          }}
        >
          <span
            style={{
              padding: `${px(3)}px ${px(8)}px`,
              backgroundColor: COLOR.gold,
              color: COLOR.night,
              fontFamily: FONT.display,
              fontSize: px(TYPE.tag),
              fontWeight: 800,
              borderRadius: px(RADIUS.sm),
              whiteSpace: 'nowrap',
            }}
          >
            SYNTHESIS
          </span>
          <span style={{ fontSize: px(TYPE.label), color: alpha(COLOR.onNight, 0.88), lineHeight: 1.35 }}>
            {verdictSummary}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
