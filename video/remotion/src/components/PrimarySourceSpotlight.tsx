import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import { PrimarySourceProps } from './motionStudioTypes';
const parchmentAsset = ''; // TODO: add parchment texture

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
    config: { damping: 15, mass: 1 },
  });
  const docY = interpolate(docEnter, [0, 1], [40, 0]);
  const docOpacity = interpolate(docEnter, [0, 1], [0, 1]);

  // Highlighter sweep starts at frame 35
  const highlightProgress = spring({
    frame: frame - 35,
    fps,
    config: { damping: 18, mass: 0.9, stiffness: 80 },
  });
  const highlightWidth = interpolate(highlightProgress, [0, 1], [0, 100]);

  // HIPP card pops up at frame 65
  const hippEnter = spring({
    frame: frame - 65,
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const hippY = interpolate(hippEnter, [0, 1], [30, 0]);
  const hippOpacity = interpolate(hippEnter, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0d14',
        color: '#1e293b',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
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
          background: 'radial-gradient(ellipse at 50% 30%, rgba(30, 41, 59, 0.6) 0%, rgba(10, 13, 20, 0.98) 80%)',
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
                fontFamily: "'Cinzel', serif",
                fontSize: isPortrait ? 13 : 15,
                fontWeight: 800,
                color: '#fbbf24',
                letterSpacing: '0.1em',
              }}
            >
              DBQ PRIMARY SOURCE ANALYSIS
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span
              style={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {documentType}
            </span>
          </div>

          <div
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              backgroundColor: 'rgba(251, 191, 36, 0.15)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              color: '#fef08a',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
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
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#f5ecd7',
            backgroundImage: `url(${parchmentAsset})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 0 40px rgba(120, 53, 15, 0.25)',
            border: '1px solid rgba(217, 119, 6, 0.4)',
            opacity: docOpacity,
            transform: `translateY(${docY}px)`,
            display: 'flex',
            flexDirection: 'column',
            padding: isPortrait ? '28px 24px' : '36px 44px',
          }}
        >
          {/* Document Header & Wax Seal Motif */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              borderBottom: '2px solid rgba(120, 53, 15, 0.3)',
              paddingBottom: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: isPortrait ? 24 : 32,
                  fontWeight: 900,
                  color: '#451a03',
                  margin: '0 0 6px 0',
                  letterSpacing: '-0.02em',
                }}
              >
                {documentTitle}
              </h2>
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: isPortrait ? 13 : 15,
                  fontWeight: 600,
                  color: '#78350f',
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
                border: '2px dashed rgba(120, 53, 15, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#78350f',
                fontFamily: "'Cinzel', serif",
                fontSize: 10,
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
                fontFamily: "'Georgia', serif",
                fontSize: isPortrait ? 17 : 22,
                lineHeight: 1.6,
                color: '#291e13',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '1.4em', color: '#b45309', marginRight: 4 }}>“</span>
              {/* Highlight container logic */}
              {excerptText.includes(highlightedPhrase) ? (
                <>
                  {excerptText.split(highlightedPhrase).map((part, i, arr) => (
                    <React.Fragment key={i}>
                      <span>{part}</span>
                      {i < arr.length - 1 && (
                        <span
                          style={{
                            position: 'relative',
                            display: 'inline',
                            fontWeight: 700,
                            color: '#1c1917',
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
                              backgroundColor: 'rgba(250, 204, 21, 0.55)',
                              borderRadius: 3,
                              zIndex: -1,
                              boxShadow: '0 0 8px rgba(250, 204, 21, 0.4)',
                            }}
                          />
                          {highlightedPhrase}
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </>
              ) : (
                <span>{excerptText}</span>
              )}
              <span style={{ fontSize: '1.4em', color: '#b45309', marginLeft: 4 }}>”</span>
            </blockquote>
          </div>
        </div>

        {/* HIPP AP Analysis Callout Card */}
        <div
          style={{
            opacity: hippOpacity,
            transform: `translateY(${hippY}px)`,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            borderRadius: 12,
            border: '1px solid rgba(251, 191, 36, 0.3)',
            padding: isPortrait ? '14px 18px' : '18px 24px',
            display: 'flex',
            flexDirection: isPortrait ? 'column' : 'row',
            alignItems: isPortrait ? 'flex-start' : 'center',
            gap: isPortrait ? 10 : 20,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              backgroundColor: 'rgba(251, 191, 36, 0.15)',
              borderRadius: 6,
              border: '1px solid #fbbf24',
              color: '#fef08a',
              fontFamily: "'Cinzel', serif",
              fontWeight: 800,
              fontSize: 14,
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
                fontSize: isPortrait ? 13 : 14,
                lineHeight: 1.45,
                color: 'rgba(241, 245, 249, 0.9)',
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
