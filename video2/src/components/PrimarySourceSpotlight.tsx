import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { PrimarySourceProps } from './motionStudioTypes';
import { parchmentAsset } from './motionStudioPresets';
import { COLOR, FONT, MOTION, RADIUS, TYPE, alpha } from '../theme/tokens';

/** URLs, data URIs and already-resolved paths pass through; bare names go through staticFile. */
const resolveSrc = (src: string) =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

export const PrimarySourceSpotlight: React.FC<PrimarySourceProps> = ({
  documentTitle,
  authorAndDate,
  excerptText,
  highlightedPhrase,
  hippType,
  hippExplanation,
  documentType = 'Political Pamphlet',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;

  // Ken Burns subtle camera zoom
  const cameraZoom = interpolate(frame, [0, 180], [1, 1.05], {
    extrapolateRight: 'clamp',
  });

  // Document paper enter spring
  const docEnter = spring({
    frame,
    fps,
    config: MOTION.spring,
  });
  const docY = interpolate(docEnter, [0, 1], [40, 0]);
  const docOpacity = interpolate(docEnter, [0, 1], [0, 1]);

  // Highlighter sweep starts at frame 35
  const highlightProgress = spring({
    frame: frame - 35,
    fps,
    // intentional: slower, overshoot-free highlighter sweep
    config: { damping: 18, mass: 0.9, stiffness: 80 },
  });
  const highlightWidth = interpolate(highlightProgress, [0, 1], [0, 100]);

  // HIPP card pops up at frame 65
  const hippEnter = spring({
    frame: frame - 65,
    fps,
    config: MOTION.spring,
  });
  const hippY = interpolate(hippEnter, [0, 1], [30, 0]);
  const hippOpacity = interpolate(hippEnter, [0, 1], [0, 1]);

  // Split the excerpt so every occurrence of the phrase is highlighted and no
  // text is dropped (odd indices are the phrase itself).
  const excerptParts =
    highlightedPhrase && excerptText.includes(highlightedPhrase)
      ? excerptText.split(highlightedPhrase)
      : null;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLOR.night,
        color: COLOR.ink,
        fontFamily: FONT.ui,
        padding: isPortrait ? '40px 24px' : '40px 60px',
        overflow: 'hidden',
        transform: `scale(${cameraZoom})`,
        transformOrigin: 'center center',
      }}
    >
      {/* Background atmosphere */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 30%, ${alpha(COLOR.nightPanel, 0.6)} 0%, ${alpha(COLOR.night, 0.98)} 80%)`,
        }}
      />

      {/* Main Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
        }}
      >
        {/* Top Header Kicker */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontFamily: FONT.display,
                fontSize: isPortrait ? TYPE.tag : TYPE.small,
                fontWeight: 800,
                color: COLOR.gold,
                letterSpacing: '0.1em',
              }}
            >
              DBQ PRIMARY SOURCE ANALYSIS
            </span>
            <span style={{ color: alpha(COLOR.onNight, 0.3) }}>·</span>
            <span
              style={{
                fontSize: TYPE.tag,
                fontFamily: FONT.mono,
                color: alpha(COLOR.onNight, 0.6),
              }}
            >
              {documentType}
            </span>
          </div>

          <div
            style={{
              padding: '4px 12px',
              borderRadius: RADIUS.sm,
              backgroundColor: alpha(COLOR.gold, 0.15),
              border: `1px solid ${alpha(COLOR.gold, 0.3)}`,
              color: COLOR.gold,
              fontSize: TYPE.micro,
              fontWeight: 600,
              fontFamily: FONT.mono,
            }}
          >
            HIPP RUBRIC POINT +1
          </div>
        </div>

        {/* Parchment Document Frame */}
        <div
          style={{
            marginTop: isPortrait ? 16 : 22,
            marginBottom: isPortrait ? 16 : 22,
            flex: 1,
            position: 'relative',
            borderRadius: RADIUS.lg,
            overflow: 'hidden',
            backgroundColor: COLOR.paper,
            boxShadow: `0 25px 50px -12px ${alpha(COLOR.night, 0.7)}, inset 0 0 40px ${alpha(COLOR.brown, 0.25)}`,
            border: `1px solid ${alpha(COLOR.amber, 0.4)}`,
            opacity: docOpacity,
            transform: `translateY(${docY}px)`,
            display: 'flex',
            flexDirection: 'column',
            padding: isPortrait ? '28px 24px' : '36px 44px',
          }}
        >
          {/* Parchment texture (skipped until the asset exists). zIndex -1 keeps it
              under the in-flow content; the frame's transform makes it a stacking context. */}
          {parchmentAsset !== '' && (
            <Img
              src={resolveSrc(parchmentAsset)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                zIndex: -1,
              }}
            />
          )}

          {/* Document Header & Wax Seal Motif */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              borderBottom: `2px solid ${alpha(COLOR.brown, 0.3)}`,
              paddingBottom: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: FONT.display,
                  fontSize: isPortrait ? TYPE.place : TYPE.h3,
                  fontWeight: 900,
                  color: COLOR.ink,
                  margin: '0 0 6px 0',
                  letterSpacing: '-0.02em',
                }}
              >
                {documentTitle}
              </h2>
              <div
                style={{
                  fontFamily: FONT.ui,
                  fontSize: isPortrait ? TYPE.tag : TYPE.small,
                  fontWeight: 600,
                  color: COLOR.brown,
                  fontStyle: 'italic',
                }}
              >
                {authorAndDate}
              </div>
            </div>

            {/* Vintage archival seal badge */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: `2px dashed ${alpha(COLOR.brown, 0.5)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLOR.brown,
                fontFamily: FONT.display,
                fontSize: TYPE.nano,
                fontWeight: 800,
                textAlign: 'center',
                lineHeight: 1,
              }}
            >
              ARCHIVE
            </div>
          </div>

          {/* Primary Source Text Body with Animated Highlighter */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <blockquote
              style={{
                margin: 0,
                fontFamily: FONT.text,
                fontSize: isPortrait ? TYPE.label : TYPE.body,
                lineHeight: 1.6,
                color: COLOR.ink,
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '1.4em', color: COLOR.amber, marginRight: 4 }}>“</span>
              {/* Highlight container logic */}
              {excerptParts ? (
                excerptParts.map((part, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span
                        style={{
                          position: 'relative',
                          display: 'inline',
                          fontWeight: 700,
                          color: COLOR.ink,
                        }}
                      >
                        {/* Animated highlighter ink bar */}
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '12%',
                            bottom: '8%',
                            width: `${highlightWidth}%`,
                            backgroundColor: alpha(COLOR.gold, 0.55),
                            borderRadius: RADIUS.sm,
                            zIndex: -1,
                            boxShadow: `0 0 8px ${alpha(COLOR.gold, 0.4)}`,
                          }}
                        />
                        {highlightedPhrase}
                      </span>
                    )}
                    {part && <span>{part}</span>}
                  </React.Fragment>
                ))
              ) : (
                <span>{excerptText}</span>
              )}
              <span style={{ fontSize: '1.4em', color: COLOR.amber, marginLeft: 4 }}>”</span>
            </blockquote>
          </div>
        </div>

        {/* HIPP AP Analysis Callout Card */}
        <div
          style={{
            opacity: hippOpacity,
            transform: `translateY(${hippY}px)`,
            backgroundColor: alpha(COLOR.night, 0.95),
            backdropFilter: 'blur(16px)',
            borderRadius: RADIUS.md,
            border: `1px solid ${alpha(COLOR.gold, 0.3)}`,
            padding: isPortrait ? '14px 18px' : '18px 24px',
            display: 'flex',
            flexDirection: isPortrait ? 'column' : 'row',
            alignItems: isPortrait ? 'flex-start' : 'center',
            gap: isPortrait ? 10 : 20,
            boxShadow: `0 10px 30px ${alpha(COLOR.night, 0.5)}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              backgroundColor: alpha(COLOR.gold, 0.15),
              borderRadius: RADIUS.sm,
              border: `1px solid ${COLOR.gold}`,
              color: COLOR.gold,
              fontFamily: FONT.display,
              fontWeight: 800,
              fontSize: TYPE.tag,
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}
          >
            ★ HIPP: {hippType.toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: TYPE.tag,
                lineHeight: 1.45,
                color: alpha(COLOR.onNight, 0.9),
              }}
            >
              {hippExplanation}
            </p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
