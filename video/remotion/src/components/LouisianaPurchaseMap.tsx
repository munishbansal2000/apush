import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { authenticLouisianaMap1803 } from './motionStudioPresets';

export const LouisianaPurchaseMap: React.FC = () => {
  const frame = useCurrentFrame();

  // Cinematic Ken Burns push-in centering on Louisiana territory
  const cameraZoom = interpolate(frame, [0, 180], [1.01, 1.09], { extrapolateRight: 'clamp' });
  const cameraPanX = interpolate(frame, [0, 180], [10, -15], { extrapolateRight: 'clamp' });

  // Watercolor paper soak reveal from frame 15 to 65
  const soakProgress = interpolate(frame, [15, 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Lewis & Clark exploratory path animation from frame 70 to 160
  const lewClarkProgress = interpolate(frame, [70, 160], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Smooth land area counter
  const animatedAcreage = Math.round(
    interpolate(frame, [20, 80], [0, 827987], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#0c0f17',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* 1. REAL HISTORICAL ATLAS CARTOGRAPHY BASE */}
      <div
        style={{
          position: 'absolute',
          inset: -40,
          backgroundImage: `url(${authenticLouisianaMap1803})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.92) contrast(1.18) sepia(0.12)',
          transform: `scale(${cameraZoom}) translate(${cameraPanX}px, 0px)`,
          transformOrigin: 'center center',
          transition: 'transform 0.1s linear',
        }}
      />

      {/* Subtle paper vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(245, 230, 200, 0.05) 0%, rgba(10, 14, 23, 0.6) 90%)',
          pointerEvents: 'none',
        }}
      />

      {/* 2. NATURAL WATERCOLOR INK BLEED (mix-blend-mode: multiply) */}
      {/* Blends seamlessly into map paper, showing mountain contours and river lines through the ink! */}
      <svg
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          zIndex: 15,
          mixBlendMode: 'multiply',
        }}
      >
        <defs>
          <filter id="parchmentInk" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.35" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g opacity={soakProgress} filter="url(#parchmentInk)">
          {/* Authentic Louisiana Territory boundary polygon (Mississippi to Continental Divide) */}
          <path
            d="M 64 26 C 63 32, 62 40, 62 48 C 63 60, 64 74, 66 84 C 58 83, 52 78, 48 72 C 44 64, 40 54, 38 42 C 40 40, 44 38, 50 36 C 56 42, 60 48, 64 26 Z"
            fill="rgba(194, 120, 20, 0.42)" // Rich warm saffron watercolor bleed
            stroke="#92400e"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />

          {/* Hand-quill hatched border */}
          <path
            d="M 64 26 C 63 32, 62 40, 62 48 C 63 60, 64 74, 66 84 C 58 83, 52 78, 48 72 C 44 64, 40 54, 38 42 C 40 40, 44 38, 50 36 C 56 42, 60 48, 64 26 Z"
            fill="none"
            stroke="#78350f"
            strokeWidth="1.3"
            strokeDasharray="3 1.5"
            opacity={0.85}
          />
        </g>
      </svg>

      {/* 3. ENGRAVED COPPERPLATE CARTOGRAPHY (Directly on the terrain, NO balloons!) */}
      <svg
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        {/* Territory Name engraved across the central plains */}
        <g opacity={soakProgress}>
          <text
            x="50"
            y="52"
            fill="#ffffff"
            fontSize="3.2"
            fontFamily="'Cinzel', serif"
            fontWeight="900"
            letterSpacing="0.14em"
            textAnchor="middle"
            transform="rotate(-8, 50, 52)"
            style={{
              filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.95)) drop-shadow(0 0 10px rgba(0,0,0,0.7))',
            }}
          >
            LOUISIANA PURCHASE
          </text>
          <text
            x="50"
            y="56"
            fill="#fef08a"
            fontSize="1.6"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="700"
            letterSpacing="0.08em"
            textAnchor="middle"
            transform="rotate(-8, 50, 56)"
            style={{
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.95))',
            }}
          >
            1803 · 828,000 SQ MILES · $15,000,000
          </text>
        </g>

        {/* Mississippi River Line */}
        <path
          d="M 64 26 C 63 32, 62 40, 62 48 C 63 60, 64 74, 66 84"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.4"
          opacity={0.8}
        />
        <text
          x="65"
          y="62"
          fill="#7dd3fc"
          fontSize="1.6"
          fontStyle="italic"
          fontWeight="700"
          transform="rotate(82, 65, 62)"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          Mississippi River
        </text>

        {/* Lewis & Clark Corps of Discovery Expedition Route (1804–1806) */}
        <path
          d="M 62 48 C 55 42, 48 36, 38 34 C 28 32, 20 28, 14 26"
          fill="none"
          stroke="#ea580c"
          strokeWidth="2.2"
          strokeDasharray="90"
          strokeDashoffset={90 * (1 - lewClarkProgress)}
          style={{ filter: 'drop-shadow(0 0 6px rgba(234, 88, 12, 0.8))' }}
        />
        <path
          d="M 62 48 C 55 42, 48 36, 38 34 C 28 32, 20 28, 14 26"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1"
          strokeDasharray="2 3"
          strokeDashoffset={-frame * 0.8}
        />

        {/* Historic Towns engraved with classical star markers (No rectangular cards!) */}
        {/* 1. Port of New Orleans */}
        <g transform="translate(66, 84)">
          <circle r="1.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.5" />
          <text
            x="3"
            y="1"
            fill="#ffffff"
            fontSize="1.8"
            fontFamily="'Cinzel', serif"
            fontWeight="800"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
          >
            New Orleans
          </text>
          <text
            x="3"
            y="3"
            fill="#a7f3d0"
            fontSize="1.2"
            fontFamily="'JetBrains Mono', monospace"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
          >
            Mississippi River Outlet
          </text>
        </g>

        {/* 2. St. Louis */}
        <g transform="translate(62, 48)">
          <circle r="1.4" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.5" />
          <text
            x="3"
            y="0"
            fill="#ffffff"
            fontSize="1.8"
            fontFamily="'Cinzel', serif"
            fontWeight="800"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
          >
            St. Louis
          </text>
          <text
            x="3"
            y="2"
            fill="#fed7aa"
            fontSize="1.2"
            fontFamily="'JetBrains Mono', monospace"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
          >
            Lewis &amp; Clark (1804)
          </text>
        </g>

        {/* 3. Pacific Coast / Fort Clatsop */}
        {lewClarkProgress >= 0.9 && (
          <g transform="translate(14, 26)">
            <circle r="1.4" fill="#ea580c" stroke="#ffffff" strokeWidth="0.5" />
            <text
              x="2"
              y="-1"
              fill="#fed7aa"
              fontSize="1.6"
              fontFamily="'Cinzel', serif"
              fontWeight="800"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
            >
              Fort Clatsop (1805)
            </text>
          </g>
        )}
      </svg>

      {/* 4. TOP HUD (Pristine, outside map focus) */}
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
        <div
          style={{
            backgroundColor: 'rgba(10, 14, 23, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(251, 191, 36, 0.35)',
            borderLeft: '4px solid #fbbf24',
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 900, color: '#fbbf24', letterSpacing: '0.12em' }}>
              APUSH PERIOD 4 · 1803
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>
              The Louisiana Purchase
            </span>
          </div>
        </div>

        {/* Financial & Land Metric Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'rgba(10, 14, 23, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>
              PRICE
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 900, color: '#10b981' }}>
              $15,000,000 <span style={{ fontSize: 10, color: '#94a3b8' }}>(~3¢/acre)</span>
            </div>
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' }} />

          <div>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>
              LAND ADDED
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 900, color: '#fbbf24' }}>
              {animatedAcreage.toLocaleString()} sq mi
            </div>
          </div>
        </div>
      </div>

      {/* 5. CINEMATIC BROADCAST LOWER-THIRD (Clean educational breakdown) */}
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
          borderLeft: '4px solid #b45309',
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
              CONSTITUTIONAL DILEMMA &amp; GEOGRAPHY
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#a7f3d0' }}>
              828,000 SQ MILES FROM NAPOLEON BONAPARTE
            </span>
          </div>

          <div style={{ fontSize: 11, color: 'rgba(241, 245, 249, 0.9)', lineHeight: 1.35 }}>
            Jefferson, an ardent strict constructionist, compromised his political philosophy by utilizing the President&apos;s treaty-making powers to double the nation and guarantee Western farmers unrestricted Mississippi River trade.
          </div>
        </div>

        <div style={{ minWidth: 150, textAlign: 'right' }}>
          <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#fbbf24', fontWeight: 800 }}>
            PERIOD 4 · 1800–1848
          </span>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
            Corps of Discovery (1804–06)
          </div>
        </div>
      </div>
    </div>
  );
};
