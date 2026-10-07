import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { jumonvilleMapAsset } from './motionStudioPresets';

export const JumonvilleGlenTacticalMap: React.FC = () => {
  const frame = useCurrentFrame();

  // Camera zoom and tactical pan
  const cameraZoom = interpolate(frame, [0, 180], [1.02, 1.12], { extrapolateRight: 'clamp' });
  const cameraPanX = interpolate(frame, [0, 180], [10, -20], { extrapolateRight: 'clamp' });

  // Tactical advancement phases:
  const marchProgress = interpolate(frame, [10, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pincerProgress = interpolate(frame, [45, 95], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const isGunfireActive = frame >= 85 && frame <= 135;
  const gunflashR = isGunfireActive ? Math.sin((frame - 85) * 0.45) * 4 + 5 : 0;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#070a10',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* 1. TACTICAL RECONNAISSANCE MAP BACKGROUND */}
      <div
        style={{
          position: 'absolute',
          inset: -40,
          backgroundImage: `url(${jumonvilleMapAsset})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.88) contrast(1.22) saturate(1.1)',
          transform: `scale(${cameraZoom}) translate(${cameraPanX}px, 0px)`,
          transformOrigin: 'center center',
          transition: 'transform 0.1s linear',
        }}
      />

      {/* Atmospheric rain & dark ravine vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(15, 23, 42, 0.25) 0%, rgba(7, 10, 16, 0.75) 90%)',
          pointerEvents: 'none',
        }}
      />

      {/* 2. TOP MILITARY RECONNAISSANCE HUD */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 40,
          pointerEvents: 'none',
        }}
      >
        {/* Left Mission Header */}
        <div
          style={{
            backgroundColor: 'rgba(10, 14, 23, 0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            borderLeft: '4px solid #f59e0b',
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 900, color: '#f59e0b', letterSpacing: '0.12em' }}>
              APUSH PERIOD 3 · MAY 28, 1754
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>
              Battle of Jumonville Glen (Tactical Assault)
            </span>
          </div>
        </div>

        {/* Right HUD: Military Timeline & Clock */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            backgroundColor: 'rgba(10, 14, 23, 0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>
              TACTICAL TIME
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 900, color: '#fbbf24' }}>
              07:15 AM <span style={{ fontSize: 10, color: '#94a3b8' }}>(Dawn)</span>
            </div>
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' }} />

          <div>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>
              OUTCOME
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 900, color: '#ef4444' }}>
              10 Dead · 21 Captured
            </div>
          </div>
        </div>
      </div>

      {/* 3. TACTICAL OVERLAY: TROOP VECTORS & ENGRAVED MILITARY LABELS (NO BALLOON BOXES!) */}
      <svg
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          zIndex: 20,
        }}
      >
        {/* Topographic Ravine Basin (Jumonville Depression) */}
        <ellipse
          cx="68"
          cy="46"
          rx="16"
          ry="11"
          fill="rgba(239, 68, 68, 0.14)"
          stroke="rgba(239, 68, 68, 0.45)"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />
        <text
          x="68"
          y="38"
          fill="rgba(239, 68, 68, 0.9)"
          fontSize="2"
          fontFamily="'Cinzel', serif"
          fontWeight="800"
          textAnchor="middle"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          JUMONVILLE RAVINE BASIN
        </text>

        {/* Washington's Provincial Line of Advance (Blue) */}
        <path
          d="M 16 78 C 28 66, 42 52, 58 38"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeDasharray="100"
          strokeDashoffset={100 * (1 - marchProgress)}
          style={{ filter: 'drop-shadow(0 0 6px #38bdf8)' }}
        />
        <path
          d="M 16 78 C 28 66, 42 52, 58 38"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeDasharray="2 3"
          strokeDashoffset={-frame * 0.8}
        />

        {/* Tanacharison Seneca Pincer Vector (Amber) */}
        <path
          d="M 44 48 C 56 46, 70 38, 80 40 C 82 46, 80 54, 76 56"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeDasharray="80"
          strokeDashoffset={80 * (1 - pincerProgress)}
          style={{ filter: 'drop-shadow(0 0 6px #f59e0b)' }}
        />

        {/* Unit Pins & Labels (Directly on the terrain, no balloon boxes!) */}
        {/* 1. Great Meadows Base Camp (16, 78) */}
        <g transform="translate(16, 78)">
          <circle r="1.8" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.6" />
          <text
            x="0"
            y="4.5"
            fill="#ffffff"
            fontSize="1.8"
            fontWeight="700"
            textAnchor="middle"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
          >
            Great Meadows (Camp)
          </text>
        </g>

        {/* 2. Washington's Provincial Firing Line on High Rocks (58, 38) */}
        {marchProgress >= 0.7 && (
          <g transform="translate(58, 38)">
            <circle r="2.2" fill="#0284c7" stroke="#ffffff" strokeWidth="0.8" style={{ filter: 'drop-shadow(0 0 6px #38bdf8)' }} />
            <text
              x="0"
              y="-3.5"
              fill="#38bdf8"
              fontSize="2"
              fontWeight="900"
              textAnchor="middle"
              fontFamily="'Cinzel', serif"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.95)' }}
            >
              WASHINGTON · 40 VIRGINIANS
            </text>
            <text
              x="0"
              y="-1.5"
              fill="#e2e8f0"
              fontSize="1.3"
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
            >
              High Rocky Crest · Musket Line
            </text>
          </g>
        )}

        {/* 3. Tanacharison Seneca Ambush Flank (76, 56) */}
        {pincerProgress >= 0.7 && (
          <g transform="translate(76, 56)">
            <circle r="2.2" fill="#d97706" stroke="#ffffff" strokeWidth="0.8" style={{ filter: 'drop-shadow(0 0 6px #f59e0b)' }} />
            <text
              x="0"
              y="4.5"
              fill="#fbbf24"
              fontSize="2"
              fontWeight="900"
              textAnchor="middle"
              fontFamily="'Cinzel', serif"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.95)' }}
            >
              HALF-KING · SENECA WARRIORS
            </text>
            <text
              x="0"
              y="6.5"
              fill="#e2e8f0"
              fontSize="1.3"
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
            >
              Escape Ravine Blockade
            </text>
          </g>
        )}

        {/* 4. French Camp in the Hollow (68, 46) */}
        <g transform="translate(68, 46)">
          <circle r="2.4" fill="#dc2626" stroke="#ffffff" strokeWidth="0.8" style={{ filter: 'drop-shadow(0 0 8px #ef4444)' }} />
          <text
            x="0"
            y="4.5"
            fill="#fca5a5"
            fontSize="1.9"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="'Cinzel', serif"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.95)' }}
          >
            JUMONVILLE FRENCH DETACHMENT
          </text>
          <text
            x="0"
            y="6.5"
            fill="#ffffff"
            fontSize="1.2"
            textAnchor="middle"
            fontFamily="'JetBrains Mono', monospace"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
          >
            35 Troops Trapped in Rock Shelter
          </text>

          {/* Gunfire Clash Animation */}
          {isGunfireActive && (
            <g>
              <circle r={gunflashR} fill="rgba(251, 191, 36, 0.85)" style={{ filter: 'drop-shadow(0 0 12px #f59e0b)' }} />
              <text y="-4.5" fill="#fef08a" fontSize="2.6" fontFamily="'Cinzel', serif" fontWeight="900" textAnchor="middle">
                💥 FIRST SHOTS FIRED!
              </text>
            </g>
          )}
        </g>
      </svg>

      {/* 4. CINEMATIC BOTTOM BROADCAST STRIP */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 16,
          right: 16,
          backgroundColor: 'rgba(10, 14, 23, 0.94)',
          backdropFilter: 'blur(16px)',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderLeft: '4px solid #f59e0b',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 900, color: '#fbbf24' }}>
              HORACE WALPOLE (BRITISH STATESMAN):
            </span>
            <span style={{ fontSize: 11, fontStyle: 'italic', color: '#f8fafc' }}>
              &ldquo;A volley fired by a young Virginian in the backwoods of America set the world on fire.&rdquo;
            </span>
          </div>

          <div style={{ fontSize: 11, color: 'rgba(241, 245, 249, 0.9)', lineHeight: 1.35 }}>
            <strong>Causal Chain:</strong> Jumonville Glen ➔ Seven Years&apos; War (1754–1763) ➔ British Imperial Debt doubles (£133M) ➔ End of Salutary Neglect ➔ Stamp Act &amp; Revolution.
          </div>
        </div>

        <div style={{ minWidth: 150, textAlign: 'right' }}>
          <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#fbbf24', fontWeight: 800 }}>
            PERIOD 3 · 1754–1763
          </span>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
            French &amp; Indian War Spark
          </div>
        </div>
      </div>
    </div>
  );
};
