/**
 * Gallery part C: ShipRoute … WordPop (19 slots).
 * Every slot renders inside AutoLayoutProvider + ToneProvider('playful') in a
 * 1280×720 / 30 fps AbsoluteFill (see src/gallery/types.ts).
 */
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import type { GallerySlot } from './types';

import { ShipRoute } from '../legacy/ShipRoute';
import { SmartText } from '../components/SmartText';
import { SpectrumSlide } from '../components/SpectrumSlide';
import { SpeechBubble } from '../components/SpeechBubble';
import { SplitSlide } from '../legacy/SplitSlide';
import { StaggerSlide } from '../components/StaggerSlide';
import { TacticalSlide } from '../components/TacticalSlide';
import { TalkingHead } from '../components/TalkingHead';
import { TerritorialExpansionMap } from '../components/TerritorialExpansionMap';
import { TerritorySlide } from '../legacy/TerritorySlide';
import { TextCallout } from '../legacy/TextCallout';
import { ThreeBoxes } from '../legacy/ThreeBoxes';
import { TimedText } from '../legacy/TimedText';
import { TimelineRibbon } from '../components/TimelineRibbon';
import { TitleCard } from '../components/TitleCard';
import { TitleSlide } from '../legacy/TitleSlide';
import { TradeRoutes } from '../legacy/TradeRoutes';
import { VersusPolarization } from '../components/VersusPolarization';
import { WordPop } from '../legacy/WordPop';
import type { WordTiming } from '../validation/timing';

/** Backdrop for overlay-style components (they render transparent on their own). */
const Backdrop: React.FC<{ image?: string; dim?: number; color?: string; children: React.ReactNode }> = ({
  image,
  dim = 0.45,
  color = '#1a1512',
  children,
}) => (
  <AbsoluteFill style={{ backgroundColor: color }}>
    {image && (
      <Img src={staticFile(image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    )}
    {image && <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${dim})` }} />}
    {children}
  </AbsoluteFill>
);

// Karaoke timings for TimedText: one word every 8 frames starting at frame 10.
const TIMED_TEXT = 'Smallpox, measles, and influenza killed millions of Native Americans who had no immunity';
const TIMED_WORDS: WordTiming[] = TIMED_TEXT.split(' ').map((word, i) => ({
  word,
  startFrame: 10 + i * 8,
  endFrame: 10 + i * 8 + 7,
}));

export const PART_C: GallerySlot[] = [
  // ShipRoute: a ship sails the Middle Passage leg across the Cantino planisphere, ports lighting up.
  {
    name: 'ShipRoute',
    file: '../legacy/ShipRoute.tsx',
    durationInFrames: 180,
    render: () => (
      <ShipRoute
        mapSrc="historic/u1e3/cantino-planisphere.jpg"
        waypoints={[[980, 300], [760, 420], [520, 460], [300, 380]]}
        at={0}
        duration={150}
        shipSize={64}
        routeColor="#c9a227"
        ports={[
          { x: 980, y: 300, label: 'West Africa' },
          { x: 520, y: 460, label: 'Mid-Atlantic' },
          { x: 300, y: 380, label: 'Caribbean' },
        ]}
      />
    ),
    notes:
      'legacy. Ship art defaults to tallship-real.webp, which is NOT in the synced public/ — pass `shipSrc` to override. Waypoints/ports are absolute pixels (assume 1280×720).',
  },

  // SmartText: auto-sized hero title + subtitle about the Columbian Exchange.
  {
    name: 'SmartText',
    file: 'SmartText.tsx',
    durationInFrames: 150,
    render: () => (
      <Backdrop image="historic/u1e3/maize-botanical.jpg" dim={0.55}>
        <SmartText text="The Columbian Exchange" level="hero" position={[0.5, 0.35]} entrance="stamp" at={0} />
        <SmartText
          text="Plants, animals, and diseases crossed the Atlantic after 1492"
          level="subtitle"
          position={[0.5, 0.62]}
          entrance="fade"
          at={20}
        />
      </Backdrop>
    ),
    notes:
      'Visibility gate split into an outer wrapper so hooks are unconditional; sizes/positions scale with the composition (identical at 1280×720).',
  },

  // SpectrumSlide: markers drop onto a "Coerced ↔ Free" labor axis; indentured servitude slides toward coerced.
  {
    name: 'SpectrumSlide',
    file: 'SpectrumSlide.tsx',
    durationInFrames: 180,
    render: () => (
      <SpectrumSlide
        title="Colonial Labor Systems"
        axis={['Coerced', 'Free']}
        stagger={20}
        markers={[
          { at: 0.08, label: 'Chattel slavery', color: '#d94a4a' },
          { at: 0.3, label: 'Encomienda', color: '#e07a5f' },
          { at: 0.6, label: 'Indentured', color: '#c9a227', move_to: 0.45, move_start: 90 },
          { at: 0.9, label: 'Wage labor', color: [127, 191, 127] },
        ]}
      />
    ),
    notes: 'From interface (no real usage found). Markers within 10% of either end put their label above the dot so it clears the axis end labels.',
  },

  // SpeechBubble: hand-drawn bubble pops in over a Tenochtitlan backdrop.
  {
    name: 'SpeechBubble',
    file: 'SpeechBubble.tsx',
    durationInFrames: 120,
    render: () => (
      <Backdrop image="historic/u1e3/tenochtitlan.jpg" dim={0.25}>
        <SpeechBubble text="A city of 200,000 on a lake!" position={[0.5, 0.35]} width={380} art="oval-hatched" at={5} />
      </Backdrop>
    ),
    notes:
      'All bundled bubble art is under bubbles/*.webp, none of it in the synced public/ — pass `artSrc` to supply custom art.',
  },

  // SplitSlide: sugarcane plantation image beside a headline on the sugar economy.
  {
    name: 'SplitSlide',
    file: '../legacy/SplitSlide.tsx',
    durationInFrames: 120,
    render: () => (
      <SplitSlide
        image={staticFile('historic/u1e3/sugarcane-plantation.jpg')}
        headline="Sugar drove the Atlantic slave trade"
        body="Caribbean plantations consumed enslaved labor at a brutal rate, fueling demand across the triangular trade."
      />
    ),
    notes: 'legacy. From interface (no real usage). `image` goes straight to <Img src>, so callers must pass a staticFile() URL.',
  },

  // StaggerSlide: four Columbian Exchange images slide in one after another.
  {
    name: 'StaggerSlide',
    file: 'StaggerSlide.tsx',
    durationInFrames: 150,
    render: () => (
      <StaggerSlide
        title="New World Crops Go Global"
        panels={[
          { image: staticFile('historic/u1e3/maize-botanical.jpg'), label: 'Maize', at: 20 },
          { image: staticFile('historic/u1e3/potato-plant.jpg'), label: 'Potato', at: 45 },
          { image: staticFile('historic/u1e3/tomato-plant.jpg'), label: 'Tomato', at: 70 },
          { image: staticFile('historic/u1e3/sugarcane-plantation.jpg'), label: 'Sugar (to the Americas)', at: 95 },
        ]}
      />
    ),
    notes:
      'Uses Remotion <Img> (accepts public/ paths or URLs). `anchor` resolves against `wordTimings`; enterDuration/exitDuration honoured.',
  },

  // TacticalSlide: blue cluster (Tenochtitlan defenders) is encircled by red dots (Cortés + Tlaxcalan allies).
  {
    name: 'TacticalSlide',
    file: 'TacticalSlide.tsx',
    durationInFrames: 180,
    render: () => (
      <TacticalSlide
        title="Siege of Tenochtitlan, 1521"
        blue_label="Mexica defenders"
        red_label="Cortés + Tlaxcalan allies"
        red_start={15}
        red_end={100}
        n_blue={14}
        n_red={30}
      />
    ),
    notes: 'From interface (no real usage). Deterministic seeded RNG; fine.',
  },

  // TalkingHead: Maya host avatar (toon art under the playful tone), speaking, bottom-right.
  {
    name: 'TalkingHead',
    file: 'TalkingHead.tsx',
    durationInFrames: 150,
    render: () => (
      <Backdrop image="historic/u1e3/cantino-planisphere.jpg" dim={0.5}>
        <TalkingHead
          speakerName="Maya"
          speakerColor="#c9a227"
          position="bottom-right"
          size={0.32}
          speaking
          showName
          assetPair={{
            realistic: staticFile('maya-real.webp'),
            stylized: staticFile('maya-toon.webp'),
          }}
        />
      </Backdrop>
    ),
    notes: 'Real usage in ComponentShowcase.tsx (SceneTalkingHead). Exit fade keys off useVideoConfig().durationInFrames.',
  },

  // TerritorialExpansionMap: 1783–1853 acquisitions soak onto the map with an odometer and timeline stepper.
  {
    name: 'TerritorialExpansionMap',
    file: 'TerritorialExpansionMap.tsx',
    durationInFrames: 210,
    render: () => <TerritorialExpansionMap />,
    notes:
      'Timeline is hard-coded (last territory at frame 156). The default atlas `acquisitionsAtlasMap1853` is empty, so no map layer is drawn (pass `mapSrc`); washes switch to normal blending without a map.',
  },

  // TerritorySlide: Spanish, French, and English colonial claims grow as ellipses over the Cantino map.
  {
    name: 'TerritorySlide',
    file: '../legacy/TerritorySlide.tsx',
    durationInFrames: 180,
    render: () => (
      <TerritorySlide
        map_image={staticFile('historic/u1e3/cantino-planisphere.jpg')}
        title="European Claims in the Americas"
        stagger={40}
        territories={[
          { at: [0.3, 0.6], rx: 0.12, ry: 0.15, label: 'New Spain', date: '1521', color: '#d9a441' },
          { at: [0.45, 0.3], rx: 0.1, ry: 0.1, label: 'New France', date: '1608', color: [74, 144, 217] },
          { at: [0.62, 0.42], rx: 0.06, ry: 0.12, label: 'English Colonies', date: '1607', color: '#d94a4a' },
        ]}
      />
    ),
    notes:
      'legacy. From interface (no real usage). Map uses Remotion <Img>; map_image may be a public/ path or a URL. The Cantino planisphere is not a North America map, so ellipse placement is illustrative only.',
  },

  // TextCallout: ink-stamped headline over the Brookes slave ship diagram.
  {
    name: 'TextCallout',
    file: '../legacy/TextCallout.tsx',
    durationInFrames: 120,
    render: () => (
      <Backdrop image="historic/u1e3/brookes-slave-ship.jpg" dim={0.55}>
        <TextCallout text="The Middle Passage" position={[0.5, 0.15]} fontSize={48} color="#f5e6c8" entrance="stamp" at={5} />
      </Backdrop>
    ),
    notes: 'legacy. Real usage in ComponentShowcase.tsx / U1E1Episode.tsx. Default ink is now light (#f5e6c8); theme="light" gives the old dark ink.',
  },

  // ThreeBoxes: Maize / Iroquois / Wilderness? boxes appear, then get checked and crossed.
  {
    name: 'ThreeBoxes',
    file: '../legacy/ThreeBoxes.tsx',
    durationInFrames: 120,
    render: () => (
      <Backdrop color="#1a1512">
        <ThreeBoxes
          at={0}
          boxes={[
            { id: 'maize', label: 'MAIZE', image: 'historic/u1e3/maize-botanical.jpg' },
            { id: 'iroquois', label: 'POTATO', image: 'historic/u1e3/potato-plant.jpg' },
            { id: 'wilderness', label: 'TOMATO?', image: 'historic/u1e3/tomato-plant.jpg' },
          ]}
          appearOffsets={[0, 0.5, 1]}
          checked={['maize', 'iroquois']}
          crossed={['wilderness']}
          position={[0.5, 0.5]}
        />
      </Backdrop>
    ),
    notes:
      'legacy. Real usage in U1E1Episode.tsx (t47). Default box images (historic/fuchs_maize_1542.jpg etc.) are not in the synced public/, so this slot passes `boxes` with available images.',
  },

  // TimedText: karaoke-style words light up in sync with synthetic TTS timings.
  {
    name: 'TimedText',
    file: '../legacy/TimedText.tsx',
    durationInFrames: 150,
    render: () => (
      <Backdrop color="#1a1512">
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <TimedText text={TIMED_TEXT} wordTimings={TIMED_WORDS} />
        </AbsoluteFill>
      </Backdrop>
    ),
    notes:
      'legacy. From interface (no real usage). The component does no positioning of its own, so the slot centers it. Current-word pop is frame-driven.',
  },

  // TimelineRibbon: bottom progress ribbon with one of three episode boxes checked.
  {
    name: 'TimelineRibbon',
    file: 'TimelineRibbon.tsx',
    durationInFrames: 120,
    render: () => (
      <Backdrop image="historic/u1e3/florentine-codex-page.jpg" dim={0.4}>
        <TimelineRibbon boxes={['Columbian Exchange', 'Encomienda', 'Triangular Trade']} checkedCount={1} />
      </Backdrop>
    ),
    notes: 'Real usage in Demo.tsx / U2E5Act1.tsx. Fully static (no animation at all).',
  },

  // TitleCard: Heimler-style red title banner for U1E3 "The Exchange".
  {
    name: 'TitleCard',
    file: 'TitleCard.tsx',
    durationInFrames: 120,
    render: () => (
      <Backdrop image="historic/u1e3/cantino-planisphere.jpg" dim={0.35}>
        <TitleCard at={0} kicker="UNIT 1 · EPISODE 3" title="THE EXCHANGE" subline="WHAT CROSSED THE ATLANTIC" />
      </Backdrop>
    ),
    notes:
      'Real usage in U1E3Episode.tsx (props from data/u1e3-plan). Subline moves down for titles estimated to wrap past 2 lines.',
  },

  // TitleSlide: full-screen episode title with staggered words and accent line.
  {
    name: 'TitleSlide',
    file: '../legacy/TitleSlide.tsx',
    durationInFrames: 150,
    render: () => (
      <TitleSlide
        title="The Triangular Trade"
        subtitle="Sugar, rum, and enslaved people across the Atlantic world"
        accent="#c9a227"
      />
    ),
    notes: 'legacy. Real usage shape from Demo.tsx / U2E5Act1.tsx (content adapted). Fades out over the final 15 frames of the slot.',
  },

  // TradeRoutes: turquoise, copper, and shell trade arrows draw themselves over the Cantino map.
  {
    name: 'TradeRoutes',
    file: '../legacy/TradeRoutes.tsx',
    durationInFrames: 120,
    render: () => (
      <Backdrop image="historic/u1e3/cantino-planisphere.jpg" dim={0.3}>
        <TradeRoutes at={0} active={['turquoise', 'copper', 'shell']} />
      </Backdrop>
    ),
    notes:
      'legacy. Real usage in U1E1Episode.tsx. Route coordinates are hard-coded for the Ortelius map (not available).',
  },

  // VersusPolarization: "Who gained? Who paid?" Europe vs. the Americas in the Columbian Exchange.
  {
    name: 'VersusPolarization',
    file: 'VersusPolarization.tsx',
    durationInFrames: 150,
    render: () => (
      <VersusPolarization
        clashTitle="WHO GAINED? WHO PAID?"
        periodLabel="The Columbian Exchange, 1492–1650"
        entityA={{
          name: 'EUROPE',
          subtitle: 'Gained',
          points: ['Calories: maize, potatoes', 'Wealth: silver, sugar, land', 'Population growth'],
          color: '#90d39a',
        }}
        entityB={{
          name: 'THE AMERICAS',
          subtitle: 'Paid, and also gained',
          points: ['Roughly 50–90% population loss, 1500–1650', 'Gained horses, wheat, cattle', 'Labor collapse → coerced labor'],
          color: '#e07a5f',
        }}
        verdictSummary="Evaluate both halves."
      />
    ),
    notes: 'Real usage in U1E3Episode.tsx (props from data/e3/beats_kit.json). Body text is 11–15px, small at 1280×720.',
  },

  // WordPop: keyword emphasis pill springs in near the top of the frame.
  {
    name: 'WordPop',
    file: '../legacy/WordPop.tsx',
    durationInFrames: 120,
    render: () => (
      <Backdrop image="historic/u1e3/smallpox-victims.jpg" dim={0.45}>
        <WordPop word="VIRGIN SOIL EPIDEMIC" accent="#d94a4a" />
      </Backdrop>
    ),
    notes: 'legacy. Real usage in Demo.tsx / U2E5Act1.tsx. Optional `at` / `duration` / `fadeOut`; without `duration` it holds to the end of the Sequence.',
  },
];
