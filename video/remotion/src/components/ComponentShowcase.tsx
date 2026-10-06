import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { CanvasTrackerProvider } from '../validation/CanvasTracker';
import { AutoLayoutProvider } from '../validation/AutoLayout';
import { ToneProvider } from '../validation/ToneContext';
import { TalkingHead } from './TalkingHead';
import { Callout } from './Callout';
import { Duel } from './Duel';
import { Argument } from './Argument';
import { Ship } from './Ship';
import { SpeechBubble } from './SpeechBubble';
import { TitleCard } from './TitleCard';
import { DocumentOverlay } from './DocumentOverlay';
import { MapArrow } from './MapArrow';
import { CutoutFigure } from './CutoutFigure';
import { TextCallout } from './TextCallout';
import { PhotoPin } from './PhotoPin';
import { GravityText } from './GravityDrop';
import { CannonVolley } from './Projectile';
import { ShipRoute } from './ShipRoute';

/**
 * Default textured background — never blank.
 * Rich parchment/studio texture with visible depth.
 */
export const DefaultBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{
    background: `
      radial-gradient(ellipse at 25% 20%, rgba(201,162,39,0.25) 0%, transparent 60%),
      radial-gradient(ellipse at 75% 80%, rgba(139,69,19,0.20) 0%, transparent 60%),
      radial-gradient(ellipse at 50% 50%, rgba(60,40,20,0.30) 0%, transparent 80%),
      linear-gradient(135deg, #3a2d1f 0%, #241c14 50%, #141009 100%)
    `,
  }}>
    {/* Visible paper texture */}
    <div style={{
      position: 'absolute', inset: 0,
      background: `repeating-linear-gradient(
        45deg,
        transparent,
        transparent 8px,
        rgba(201,162,39,0.03) 8px,
        rgba(201,162,39,0.03) 16px
      )`,
    }} />
    {/* Vignette for depth */}
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
    }} />
    {children}
  </AbsoluteFill>
);

/**
 * Contextual image background with dark overlay for readability.
 */
const ImageBackground: React.FC<{
  src: string;
  children?: React.ReactNode;
  overlayOpacity?: number;
}> = ({ src, children, overlayOpacity = 0.6 }) => (
  <AbsoluteFill>
    <Img
      src={src}
      style={{
        width: '100%', height: '100%',
        objectFit: 'cover',
      }}
    />
    <div style={{
      position: 'absolute', inset: 0,
      backgroundColor: `rgba(10,8,5,${overlayOpacity})`,
    }} />
    <div style={{
      position: 'absolute', inset: 0,
      zIndex: 1,
    }}>
      {children}
    </div>
  </AbsoluteFill>
);

// Scene 1: TalkingHead with Callouts (SERIOUS tone = realistic Maya)
export const SceneTalkingHead: React.FC = () => (
  <ToneProvider tone="serious">
    <CanvasTrackerProvider debug={false}>
      <DefaultBackground>
        <TalkingHead
          speakerName="Maya"
          speakerColor="#c9a227"
          position="bottom-right"
          size={0.32}
          speaking={true}
          showName={true}
          assetPair={{
            realistic: staticFile('maya-real.webp'),
            stylized: staticFile('maya-toon.webp'),
          }}
        />
        {/* Callout positioned to NOT overlap the avatar */}
        <Callout
          text="The pile WAS the wealth — that's mercantilism in one image."
          anchor={[0.68, 0.50]}
          position="top"
          variant="speech"
          at={20}
        />
        <Callout
          text="Mercantilism"
          anchor={[0.5, 0.12]}
          variant="label"
          accent="#c9a227"
          at={60}
        />
      </DefaultBackground>
    </CanvasTrackerProvider>
  </ToneProvider>
);

// Scene 1b: TalkingHead FUN tone (semi-cartoon Maya)
export const SceneTalkingHeadFun: React.FC = () => (
  <ToneProvider tone="fun">
    <CanvasTrackerProvider debug={false}>
      <DefaultBackground>
        <TalkingHead
          speakerName="Maya"
          speakerColor="#c9a227"
          position="bottom-right"
          size={0.32}
          speaking={true}
          showName={true}
          assetPair={{
            realistic: staticFile('maya-real.webp'),
            stylized: staticFile('maya-toon.webp'),
          }}
        />
        <Callout
          text="Wait — the pile WAS the money?! Mind blown!"
          anchor={[0.68, 0.50]}
          position="top"
          variant="speech"
          at={20}
        />
      </DefaultBackground>
    </CanvasTrackerProvider>
  </ToneProvider>
);

// Scene 6: Heimler-style — Title card + speech bubble over historic image
export const SceneHeimlerStyle: React.FC = () => (
  <ToneProvider tone="serious">
    <AutoLayoutProvider debug={false}>
      <ImageBackground
        src={staticFile('apush-revolution-bg.webp')}
        overlayOpacity={0.25}
      >
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <TitleCard
            kicker="ACT I:"
            title="CAUSES OF THE AMERICAN REVOLUTION"
            subline="SCENE III: REVOLUTIONARY IDEALS"
            at={10}
          />
          <SpeechBubble
            text="Still want to be British?"
            position={[0.50, 0.92]}
            art="oval-hatched"
            width={260}
            fontSize={24}
            at={50}
          />
        </div>
      </ImageBackground>
    </AutoLayoutProvider>
  </ToneProvider>
);
// Scene 1c: Maya moods showcase (frameless)
export const SceneMayaMoods: React.FC = () => (
  <ToneProvider tone="fun">
    <DefaultBackground>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 80,
        height: '100%',
      }}>
        {[
          { mood: 'happy', label: 'Happy', src: 'maya-toon-happy.webp' },
          { mood: 'serious', label: 'Serious', src: 'maya-toon-serious.webp' },
          { mood: 'surprised', label: 'Surprised', src: 'maya-toon-surprised.webp' },
        ].map(({ mood, label, src }) => (
          <div key={mood} style={{ textAlign: 'center' }}>
            {/* Balanced — shows full face, not too tall */}
            <div style={{
              width: 300,
              height: 300,
              overflow: 'hidden',
            }}>
              <Img
                src={staticFile(src)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'top center',
                }}
              />
            </div>
            <div style={{
              marginTop: 8,
              fontSize: 32,
              fontWeight: 'bold',
              color: '#c9a227',
              fontFamily: 'Georgia, serif',
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </DefaultBackground>
  </ToneProvider>
);

// Scene 2: Duel — Hamilton vs Jefferson (revolutionary era bg)
export const SceneDuel: React.FC = () => (
  <CanvasTrackerProvider debug={false}>
    <ImageBackground
      src={staticFile('apush-revolution-bg.webp')}
      overlayOpacity={0.35}
    >
      <Duel
        left={{
          name: 'Hamilton',
          color: '#2c5aa0',
          imageSrc: staticFile('hamilton-real.webp'),
          argument: 'Strong central government!',
        }}
        right={{
          name: 'Jefferson',
          color: '#a02c2c',
          imageSrc: staticFile('jefferson-real.webp'),
          argument: "States' rights!",
        }}
        variant="ideas"
        climaxAt={120}
        bg="transparent"
      />
    </ImageBackground>
  </CanvasTrackerProvider>
);

// Scene 3: Argument — Federalist vs Anti-Federalist (colonial bg)
export const SceneArgument: React.FC = () => (
  <CanvasTrackerProvider debug={false}>
    <ImageBackground
      src={staticFile('apush-colonial-bg.webp')}
      overlayOpacity={0.35}
    >
      <Argument
        left={{
          name: 'Federalist',
          color: '#2c5aa0',
          skinTone: '#f0c8a0',
          hairColor: '#2a1a0a',
          hairStyle: 'short',
        }}
        right={{
          name: 'Anti-Federalist',
          color: '#a02c2c',
          skinTone: '#e8b890',
          hairColor: '#5a3a1a',
          hairStyle: 'bob',
        }}
        phrases={[
          'We need a strong union!',
          'That\'s tyranny!',
          'The Articles failed!',
          'States know best!',
        ]}
        intensity={7}
        bg="transparent"
      />
    </ImageBackground>
  </CanvasTrackerProvider>
);

// Scene 4: Ship — realistic tall ship (sailing)
export const SceneShip: React.FC = () => (
  <CanvasTrackerProvider debug={false}>
    <Ship
      shipName="Santa María — 1492"
      variant="sail"
    />
  </CanvasTrackerProvider>
);

// Scene 5: Ship with cannons — naval battle (realistic)
export const SceneShipBattle: React.FC = () => (
  <CanvasTrackerProvider debug={false}>
    <Ship
      shipName="USS Constitution — 1812"
      variant="battle"
      fireAt={45}
    />
  </CanvasTrackerProvider>
);

// Scene: Controls showcase — all 5 new natural controls
export const SceneControlsShowcase: React.FC = () => (
  <ToneProvider tone="serious">
    <AutoLayoutProvider debug={false}>
      <ImageBackground
        src={staticFile('apush-revolution-bg.webp')}
        overlayOpacity={0.3}
      >
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          {/* Pinned historic photo */}
          <PhotoPin
            src="apush-colonial-bg.webp"
            position={[0.22, 0.35]}
            width={380}
            rotation={-4}
            at={10}
            caption="Jamestown, 1607"
          />

          {/* Torn document */}
          <DocumentOverlay
            src="apush-revolution-bg.webp"
            position={[0.72, 0.62]}
            width={280}
            rotation={5}
            at={40}
            caption="Colonial charter"
          />

          {/* Hand-drawn map arrows */}
          <MapArrow
            d="M 40,240 C 120,200 200,160 320,100"
            color="#c9a227"
            offset={[700, 80]}
            at={70}
          />
          <MapArrow
            d="M 60,80 C 140,120 220,160 300,200"
            color="#a83232"
            offset={[120, 400]}
            at={100}
          />

          {/* Bold text stamped on image */}
          <TextCallout
            text="No taxation without representation"
            position={[0.5, 0.12]}
            fontSize={44}
            color="#f5e6c8"
            entrance="stamp"
            at={120}
          />

          {/* Cutout figure */}
          <CutoutFigure
            src="hamilton-real.webp"
            name="Hamilton"
            side="right"
            at={140}
          />
        </div>
      </ImageBackground>
    </AutoLayoutProvider>
  </ToneProvider>
);

// Scene: Physics showcase — gravity, projectiles, ship routes
export const ScenePhysics: React.FC = () => (
  <ToneProvider tone="dramatic">
    <AutoLayoutProvider debug={false}>
      <ImageBackground
        src={staticFile('apush-revolution-bg.webp')}
        overlayOpacity={0.35}
      >
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          {/* Gravity-dropped title */}
          <GravityText
            text="LEXINGTON & CONCORD"
            landAt={[0.5, 0.18]}
            fontSize={56}
            color="#f5e6c8"
            at={10}
            dropHeight={400}
          />

          {/* Cannon volley */}
          <CannonVolley
            from={[200, 600]}
            targets={[[900, 400], [950, 420], [880, 380]]}
            at={80}
            interval={15}
            arcHeight={150}
          />

          {/* Ship route demo (bottom) */}
          <ShipRoute
            waypoints={[[100, 620], [400, 580], [700, 620], [1000, 580]]}
            at={120}
            duration={150}
            shipSize={56}
            showRoute={true}
            routeColor="#c9a227"
            ports={[
              { x: 100, y: 620, label: 'Boston' },
              { x: 1000, y: 580, label: 'New York' },
            ]}
          />
        </div>
      </ImageBackground>
    </AutoLayoutProvider>
  </ToneProvider>
);
