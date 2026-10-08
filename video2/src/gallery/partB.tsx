/**
 * Gallery part B — one slot per component (IrisTransition … Ship).
 * Every slot renders full-frame at 1280×720 / 30 fps, local frame 0.
 * Only assets listed in AVAILABLE_ASSETS.txt are referenced.
 */
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import type { GallerySlot } from './types';

import { IrisTransition } from '../components/IrisTransition';
import { JumonvilleGlenTacticalMap } from '../components/JumonvilleGlenTacticalMap';
import { KenBurnsSlide } from '../components/KenBurnsSlide';
import { KineticCaptions } from '../components/KineticCaptions';
import { LouisianaPurchaseMap } from '../components/LouisianaPurchaseMap';
import { LtxClip } from '../legacy/LtxClip';
import { MapArrow } from '../legacy/MapArrow';
import { MapJourney, type JourneyItem } from '../legacy/MapJourney';
import { MapZoomSlide } from '../legacy/MapZoomSlide';
import { OregonTrailCinematicMap } from '../components/OregonTrailCinematicMap';
import { ParticleSystem } from '../components/ParticleSystem';
import { PhotoPin } from '../components/PhotoPin';
import { PrimarySourceSpotlight } from '../components/PrimarySourceSpotlight';
import { Projectile } from '../components/Projectile';
import { QuoteSlide } from '../components/QuoteSlide';
import { RegionMap } from '../legacy/RegionMap';
import { SeamlessZoom } from '../legacy/SeamlessZoom';
import { Ship } from '../components/Ship';
import type { WordToken } from '../components/motionStudioTypes';

const CANTINO = 'historic/u1e3/cantino-planisphere.jpg';
const TENOCHTITLAN = 'historic/u1e3/tenochtitlan.jpg';

/** Full-bleed still with a label — used as the two scenes of IrisTransition. */
const StillScene: React.FC<{ src: string; label: string }> = ({ src, label }) => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    <div
      style={{
        position: 'absolute', bottom: 48, left: 0, right: 0, textAlign: 'center',
        fontFamily: 'Georgia, serif', fontSize: 44, fontWeight: 'bold', color: '#fff',
        textShadow: '2px 2px 10px rgba(0,0,0,0.9)',
      }}
    >
      {label}
    </div>
  </AbsoluteFill>
);

// Walpole on Jumonville Glen, word by word (startFrame = 10 + 8*i).
const WALPOLE_WORDS: Array<[string, boolean]> = [
  ['A', false], ['volley', true], ['fired', false], ['by', false], ['a', false],
  ['young', false], ['Virginian', true], ['in', false], ['the', false],
  ['backwoods', false], ['of', false], ['America', true], ['set', false],
  ['the', false], ['world', true], ['on', false], ['fire.', true],
];
const WALPOLE_TOKENS: WordToken[] = WALPOLE_WORDS.map(([w, emphasis], i) => {
  const startFrame = 10 + i * 8;
  const endFrame = startFrame + 7;
  return { text: w, word: w, start: startFrame / 30, end: endFrame / 30, startFrame, endFrame, emphasis };
});

// Columbian Exchange items (adapted from U1E2Episode ExchangeArrows).
const EXCHANGE_ITEMS: JourneyItem[] = [
  { id: 'potato', content: '🥔', from: [150, 450], to: [750, 320], duration: 2.5, delay: 0, arcHeight: 120, style: 'spin', trail: true },
  { id: 'maize', content: '🌽', from: [150, 510], to: [750, 380], duration: 2.5, delay: 0.7, arcHeight: 100, style: 'spin', trail: true },
  { id: 'tomato', content: '🍅', from: [150, 570], to: [750, 440], duration: 2.5, delay: 1.4, arcHeight: 80, style: 'fly', trail: true },
  { id: 'horse', content: '🐴', from: [750, 320], to: [150, 450], duration: 2.5, delay: 0.4, arcHeight: 60, style: 'gallop', trail: true },
  { id: 'wheat', content: '🌾', from: [750, 380], to: [150, 510], duration: 2.5, delay: 1.1, arcHeight: 80, style: 'float', trail: true },
  { id: 'disease', content: '☠️', from: [750, 440], to: [150, 570], duration: 2.5, delay: 1.8, arcHeight: 40, style: 'ooze', trail: true, glow: '#00ff00' },
];

export const PART_B: GallerySlot[] = [
  // IrisTransition: iris wipe from a maize botanical plate to a potato plant (Columbian Exchange foods).
  {
    name: 'IrisTransition',
    file: 'IrisTransition.tsx',
    durationInFrames: 120,
    render: () => (
      <IrisTransition duration={60} color="#000">
        <StillScene src="historic/u1e3/maize-botanical.jpg" label="Maize — from the Americas" />
        <StillScene src="historic/u1e3/potato-plant.jpg" label="Potato — feeding Europe" />
      </IrisTransition>
    ),
    notes:
      'First half is inverted: the black mask is a filled circle clipped to the shrinking radius, so at frame 0 scene A is fully covered by black and is revealed as the circle shrinks (an iris-OPEN on A), instead of closing in on A. Second half (B opening) is correct.',
  },

  // JumonvilleGlenTacticalMap: 1754 Jumonville Glen ambush — Washington's advance, Seneca pincer, first shots.
  {
    name: 'JumonvilleGlenTacticalMap',
    file: 'JumonvilleGlenTacticalMap.tsx',
    durationInFrames: 180,
    render: () => <JumonvilleGlenTacticalMap />,
    notes:
      "No props; all content hard-coded. Background map is jumonvilleMapAsset = '' in motionStudioPresets.ts, so the terrain layer is empty (dark bg + overlays only). Animation timeline is hard-coded to frames 0–180.",
  },

  // KenBurnsSlide: slow push-in on Tenochtitlan with title + caption.
  {
    name: 'KenBurnsSlide',
    file: 'KenBurnsSlide.tsx',
    durationInFrames: 180,
    render: () => (
      <KenBurnsSlide
        image={staticFile(TENOCHTITLAN)}
        title="Tenochtitlan, 1519"
        caption="A city of 200,000 on Lake Texcoco — larger than any in Spain when Cortés arrived."
        stops={[[0.5, 0.5, 1.0], [0.55, 0.45, 1.25]]}
      />
    ),
    notes: 'Uses a plain <img src={image}> (no staticFile), so the slot passes staticFile(...) itself. Caption fades out over the last 30 frames by design.',
  },

  // KineticCaptions: Horace Walpole's "a volley fired by a young Virginian…" word-by-word.
  {
    name: 'KineticCaptions',
    file: 'KineticCaptions.tsx',
    durationInFrames: 180,
    render: () => (
      <KineticCaptions tokens={WALPOLE_TOKENS} speakerName="Horace Walpole · 1754" highlightColor="#f59e0b" showWaveform />
    ),
    notes:
      "Component renders token.word (optional in WordToken) instead of token.text (required) — tokens with only `text` render empty spans, so both are set here. Background image colonialHallAsset is ''.",
  },

  // LouisianaPurchaseMap: 1803 territory watercolor reveal, acreage counter, Lewis & Clark route.
  {
    name: 'LouisianaPurchaseMap',
    file: 'LouisianaPurchaseMap.tsx',
    durationInFrames: 180,
    render: () => <LouisianaPurchaseMap />,
    notes:
      "No props; hard-coded content. authenticLouisianaMap1803 = '' in motionStudioPresets.ts, so there is no base map — the territory polygon (mix-blend-mode: multiply) is drawn over a near-black background and is barely visible.",
  },

  // LtxClip: Ken Burns placeholder on the sugarcane plantation image (no LTX video available).
  {
    name: 'LtxClip',
    file: '../legacy/LtxClip.tsx',
    durationInFrames: 150,
    render: () => (
      <LtxClip episode="e3" beatId="t05_ltx_0" baseImage="historic/u1e3/sugarcane-plantation.jpg" durationSec={5} />
    ),
    notes:
      'legacy. No ltx/*.mp4 assets exist; window.__LTX_MANIFEST__ is unset so the component always takes its placeholder branch (Ken Burns on baseImage). The real <Video> path is untested here.',
  },

  // MapArrow: two brushstroke arrows over the Cantino planisphere — goods east, livestock/disease west.
  {
    name: 'MapArrow',
    file: '../legacy/MapArrow.tsx',
    durationInFrames: 150,
    render: () => (
      <AbsoluteFill style={{ backgroundColor: '#1a1512' }}>
        <Img src={staticFile(CANTINO)} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
        <MapArrow d="M 40,240 C 120,200 200,160 320,100" color="#c9a227" offset={[420, 120]} at={10} />
        <MapArrow d="M 360,60 C 280,120 180,180 60,220" color="#a83232" offset={[420, 360]} at={50} drawDuration={50} />
      </AbsoluteFill>
    ),
    notes: 'legacy. Real usage (ComponentShowcase) draws arrows over an image background; the map backdrop here is part of the slot, not the component.',
  },

  // MapJourney: Columbian Exchange "Great Grocery Run" — crops east, horses/wheat/smallpox west.
  {
    name: 'MapJourney',
    file: '../legacy/MapJourney.tsx',
    durationInFrames: 150,
    render: () => (
      <AbsoluteFill style={{ backgroundColor: '#0d0b09' }}>
        <MapJourney
          at={0}
          mapImage={CANTINO}
          items={EXCHANGE_ITEMS}
          guides={[
            { from: [150, 500], to: [750, 370], color: '#7CFC00' },
            { from: [750, 370], to: [150, 500], color: '#ff6b6b' },
          ]}
          labels={[
            { x: 120, y: 100, text: 'AMERICAS' },
            { x: 880, y: 100, text: 'EUROPE' },
          ]}
          caption="The Great Grocery Run: food EAST, livestock WEST"
          variant="overview"
        />
      </AbsoluteFill>
    ),
    notes: 'legacy. Real usage uses historic/u1e2/tordesillas-map.jpg, which is not available; Cantino planisphere substituted.',
  },

  // MapZoomSlide: camera dives to three Atlantic-world markers on the Cantino planisphere.
  {
    name: 'MapZoomSlide',
    file: '../legacy/MapZoomSlide.tsx',
    durationInFrames: 200,
    render: () => (
      <MapZoomSlide
        map_image={staticFile(CANTINO)}
        markers={[
          { at: [0.3, 0.45], zoom: 2.0, label: 'Hispaniola', sub: 'Columbus lands, 1492' },
          { at: [0.55, 0.3], zoom: 2.0, label: 'Line of Tordesillas', sub: 'Spain and Portugal split the world, 1494' },
          { at: [0.62, 0.55], zoom: 1.6, label: 'West Africa', sub: 'Origin of the Atlantic slave trade' },
        ]}
        intro_hold={24}
        zoom_hold={42}
        move_dur={24}
      />
    ),
    notes: 'legacy. Timeline = 24 + 3×42 + 2×24 = 198 frames. map_image goes into a plain <img>, so staticFile(...) is passed. Marker fractions are approximate for the Cantino image.',
  },

  // OregonTrailCinematicMap: wagon travels Independence → Oregon City with mileage/elevation HUD.
  {
    name: 'OregonTrailCinematicMap',
    file: 'OregonTrailCinematicMap.tsx',
    durationInFrames: 180,
    render: () => <OregonTrailCinematicMap mapAsset="historic/maps/oregon_trail_nps.jpg" />,
    notes:
      'mapAsset is used as a CSS background url(); no US/Oregon map exists in AVAILABLE_ASSETS, so an empty string is passed and the trail/stations render over the dark background. Station x/y are tuned for a specific US map, so substituting the Cantino map would mislead. Progress is hard-coded to frames 10–160.',
  },

  // ParticleSystem: drifting golden dust over Tenochtitlan.
  {
    name: 'ParticleSystem',
    file: 'ParticleSystem.tsx',
    durationInFrames: 150,
    render: () => (
      <AbsoluteFill style={{ backgroundColor: '#000' }}>
        <Img src={staticFile(TENOCHTITLAN)} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
        <ParticleSystem count={60} color="#c9a227" size={[2, 7]} speed={1.2} opacity={[0.15, 0.5]} />
      </AbsoluteFill>
    ),
    notes: 'Real usage in U2E5Act1 (count 30, #c9a227) layered over a slide; backdrop added here so particles are visible.',
  },

  // PhotoPin: Florentine Codex smallpox image pinned at an angle with handwritten caption.
  {
    name: 'PhotoPin',
    file: 'PhotoPin.tsx',
    durationInFrames: 120,
    render: () => (
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 40%, #3b2f22 0%, #15100b 90%)' }}>
        <PhotoPin
          src="historic/u1e3/smallpox-victims.jpg"
          position={[0.5, 0.42]}
          width={520}
          rotation={-3}
          at={10}
          caption="Smallpox among the Nahua — Florentine Codex, c. 1577"
        />
      </AbsoluteFill>
    ),
    notes: 'Image is a plain <img> inside an SVG foreignObject (no delayRender) — may render blank on early frames in headless renders.',
  },

  // PrimarySourceSpotlight: Las Casas DBQ card with highlighter sweep + HIPP Point of View callout.
  {
    name: 'PrimarySourceSpotlight',
    file: 'PrimarySourceSpotlight.tsx',
    durationInFrames: 150,
    render: () => (
      <PrimarySourceSpotlight
        documentTitle="Brevísima relación de la destrucción de las Indias"
        authorAndDate="Bartolomé de las Casas, written 1542, printed 1552"
        excerptText="Village by village: the mines, the forced labor. Testimony from a man who watched it happen — not a scholar who read about it."
        highlightedPhrase="a man who watched it happen"
        hippType="Point of View"
        hippExplanation="An eyewitness testifies from inside the events. Against Sepúlveda’s library-built case, Las Casas answers with lived experience."
        documentType="Eyewitness Account"
      />
    ),
    notes: "parchmentAsset is '' (solid #f5ecd7 fallback is used).",
  },

  // Projectile: three cannonballs arcing across the frame with smoke trails and impact bursts.
  {
    name: 'Projectile',
    file: 'Projectile.tsx',
    durationInFrames: 150,
    render: () => (
      <AbsoluteFill style={{ background: 'linear-gradient(#2b3a4a 0%, #6b5a45 70%, #3a2c18 100%)' }}>
        <Projectile from={[140, 560]} to={[1040, 540]} at={10} arcHeight={240} duration={50} />
        <Projectile from={[140, 580]} to={[980, 600]} at={30} arcHeight={200} duration={48} size={16} />
        <Projectile from={[140, 570]} to={[1120, 500]} at={50} arcHeight={280} duration={56} />
      </AbsoluteFill>
    ),
    notes: 'No real usages. Coordinates are absolute pixels (assumes 1280×720).',
  },

  // QuoteSlide: O'Sullivan's 1845 "manifest destiny" pull-quote.
  {
    name: 'QuoteSlide',
    file: 'QuoteSlide.tsx',
    durationInFrames: 120,
    render: () => (
      <QuoteSlide
        quote="Our manifest destiny to overspread the continent allotted by Providence for the free development of our yearly multiplying millions."
        byline="John L. O'Sullivan, 1845"
        accent="#c9a227"
      />
    ),
  },

  // RegionMap: Ortelius 1570 map with Southwest / Plains / Northeast regions pinned in sequence.
  {
    name: 'RegionMap',
    file: '../legacy/RegionMap.tsx',
    durationInFrames: 150,
    render: () => (
      <RegionMap
        at={0}
        activeRegions={['southwest', 'plains', 'northeast']}
        regionAppearFrames={{ southwest: 20, plains: 50, northeast: 80 }}
      />
    ),
    notes:
      'legacy. WILL FAIL TO RENDER: hard-coded assets historic/ortelius_america_1570.jpg, historic/taos-pueblo.jpg, historic/bison-herd.jpg, historic/debry_pomeiooc_1590.jpg are not in public/ and cannot be overridden via props. Slot kept with real-usage props (U1E1Episode).',
  },

  // SeamlessZoom: macro→micro dive from the Cantino world map into Tenochtitlan.
  {
    name: 'SeamlessZoom',
    file: '../legacy/SeamlessZoom.tsx',
    durationInFrames: 180,
    render: () => (
      <SeamlessZoom
        fromImage={staticFile(CANTINO)}
        toImage={staticFile(TENOCHTITLAN)}
        caption="From the Atlantic world to the Mexica capital"
        zoomDuration={90}
      />
    ),
    notes: 'legacy. Hold-wide is hard-coded to 30 frames, so zoom ends at frame 120; exit fade uses the last 15 frames. Images are plain <img>, so staticFile(...) is passed.',
  },

  // Ship: tall ship in battle variant with cannon fire at frame 45.
  {
    name: 'Ship',
    file: 'Ship.tsx',
    durationInFrames: 150,
    render: () => <Ship shipName="A frigate under sail" variant="battle" fireAt={45} />,
    notes:
      "WILL FAIL TO RENDER: image is hard-coded to staticFile('tallship-real.webp'), which is not in public/. Props `bg`, `debug`, and TimingProps are accepted but ignored. Real usage (ComponentShowcase) wraps it in CanvasTrackerProvider, but it works without it (tracker is optional).",
  },
];
