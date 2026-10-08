import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import type { GallerySlot } from './types';

import { AnimatedChart } from '../components/AnimatedChart';
import { Argument } from '../legacy/Argument';
import { Callout } from '../components/Callout';
import { CausalChainSlide } from '../components/CausalChainSlide';
import { CharacterDialogue } from '../components/CharacterDialogue';
import { CharacterFace } from '../components/CharacterFace';
import { CinematicLowerThird } from '../components/CinematicLowerThird';
import { CollageSlide } from '../components/CollageSlide';
import { CompareSlide } from '../components/CompareSlide';
import { CutoutFigure } from '../components/CutoutFigure';
import { DisplayHeadline } from '../legacy/DisplayHeadline';
import { DocumentOverlay } from '../legacy/DocumentOverlay';
import { DocumentReveal } from '../legacy/DocumentReveal';
import { DualTalkingHeads } from '../legacy/DualTalkingHeads';
import { Duel } from '../legacy/Duel';
import { DuoSlide } from '../legacy/DuoSlide';
import { GravityDrop } from '../components/GravityDrop';
import { HighlightSlide } from '../components/HighlightSlide';
import { HistoricalTimeline } from '../legacy/HistoricalTimeline';

/** Full-frame historic photo used as a backdrop for overlay-style components. */
const Backdrop: React.FC<{ src: string; dim?: number }> = ({ src, dim = 0.35 }) => (
  <AbsoluteFill>
    <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    <AbsoluteFill style={{ backgroundColor: `rgba(10,8,6,${dim})` }} />
  </AbsoluteFill>
);

/** CharacterFace is a pure SVG that takes `frame` as a prop — drive it from the timeline. */
const CharacterFaceDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const faces: {
    label: string;
    props: Omit<React.ComponentProps<typeof CharacterFace>, 'size' | 'frame'>;
  }[] = [
    { label: 'Columbus (happy)', props: { skinTone: '#f0c8a0', hairColor: '#8a8a8a', hairStyle: 'long', expression: 'happy' } },
    { label: 'Taíno cacique (speaking)', props: { skinTone: '#b07a4a', hairColor: '#1a1008', hairStyle: 'long', expression: 'serious', speaking: true } },
    { label: 'Queen Isabella (thinking)', props: { skinTone: '#f3d2b0', hairColor: '#a0522d', hairStyle: 'bob', expression: 'thinking' } },
    { label: 'Sailor (surprised)', props: { skinTone: '#e8b890', hairColor: '#3a2a1a', hairStyle: 'curly', expression: 'surprised' } },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1512', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' }}>
      {faces.map((f) => (
        <div key={f.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 240, height: 240, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#f5f0e8', border: '4px solid #c9a227' }}>
            <CharacterFace size={240} frame={frame} {...f.props} />
          </div>
          <div style={{ color: '#f5f0e8', fontFamily: 'Georgia, serif', fontSize: 22 }}>{f.label}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

export const PART_A: GallerySlot[] = [
  // AnimatedChart: bar chart of central Mexico's Indigenous population collapse after 1519
  {
    name: 'AnimatedChart',
    file: 'AnimatedChart.tsx',
    durationInFrames: 180,
    render: () => (
      <AnimatedChart
        type="bar"
        title="Central Mexico Population (millions), 1519–1605"
        data={[
          { label: '1519', value: 25.2 },
          { label: '1532', value: 16.8 },
          { label: '1548', value: 6.3 },
          { label: '1568', value: 2.6 },
          { label: '1605', value: 1.1, color: '#a02c2c' },
        ]}
        stagger={20}
      />
    ),
    notes: 'No real usage found; props from interface. enterDuration/exitDuration fade the whole chart at slot start/end.',
  },

  // Argument: Las Casas vs Sepúlveda shouting at the Valladolid debate (1550)
  {
    name: 'Argument',
    file: '../legacy/Argument.tsx',
    durationInFrames: 150,
    render: () => (
      <Argument
        left={{ name: 'Las Casas', color: '#2c5aa0', skinTone: '#f0c8a0', hairColor: '#d8d8d8', hairStyle: 'short' }}
        right={{ name: 'Sepúlveda', color: '#a02c2c', skinTone: '#e8b890', hairColor: '#2a1a0a', hairStyle: 'bob' }}
        phrases={['They have souls!', 'Natural slaves!', 'End the encomienda!', 'Conquest is just!']}
        intensity={7}
      />
    ),
    notes: 'legacy. Prop shape adapted from ComponentShowcase.tsx SceneArgument.',
  },

  // Callout: speech bubble + label annotating the Tenochtitlan image
  {
    name: 'Callout',
    file: 'Callout.tsx',
    durationInFrames: 150,
    render: () => (
      <AbsoluteFill>
        <Backdrop src="historic/u1e3/tenochtitlan.jpg" />
        <Callout
          text="200,000 people lived here — bigger than any city in Spain."
          anchor={[0.55, 0.55]}
          position="top"
          variant="speech"
          at={20}
        />
        <Callout text="Tenochtitlan, 1519" anchor={[0.5, 0.12]} variant="label" accent="#c9a227" at={60} />
      </AbsoluteFill>
    ),
    notes: 'Callout renders only the bubble (transparent background), so the slot adds a historic backdrop. Props adapted from ComponentShowcase.tsx.',
  },

  // CausalChainSlide: four-step Columbian Exchange cause/effect chain
  {
    name: 'CausalChainSlide',
    file: 'CausalChainSlide.tsx',
    durationInFrames: 165,
    render: () => (
      <CausalChainSlide
        title="The Columbian Exchange"
        nodes={[
          ['Columbus lands, 1492', 'Hemispheres connect'],
          ['Old World germs cross', 'Smallpox, measles'],
          ['Native populations collapse', 'Up to 90% die'],
          ['Europeans import enslaved Africans', 'Labor shortage'],
        ]}
        stagger={30}
      />
    ),
    notes: 'Prop shape from real usage in U2E5Act1.tsx (stagger 30 so all 4 nodes + arrows land by ~f111).',
  },

  // CharacterDialogue: Maya and Marcus trade lines about the Louisiana Purchase
  {
    name: 'CharacterDialogue',
    file: 'CharacterDialogue.tsx',
    durationInFrames: 180,
    render: () => (
      <CharacterDialogue
        lines={[
          { speaker: 'maya', text: 'Wait — Jefferson bought HALF a continent for $15 million?', at: 0 },
          { speaker: 'marcus', text: 'About three cents an acre. Napoleon needed cash for his wars.', at: 40 },
          { speaker: 'maya', text: 'But the Constitution never says the president can buy land!', at: 80 },
          { speaker: 'marcus', text: 'Exactly. The strict constructionist bent his own rules.', at: 120 },
        ]}
      />
    ),
    notes: 'No real usage; props from interface. With 4+ lines, bubble i and i+3 reuse the same y slot (i % 3) and the left/right bubble columns overlap horizontally (5%–55% vs 45%–95%), so line 4 sits on top of line 1.',
  },

  // CharacterFace: four illustrated SVG faces showing expressions, blinking, and an animated speaking mouth
  {
    name: 'CharacterFace',
    file: 'CharacterFace.tsx',
    durationInFrames: 120,
    render: () => <CharacterFaceDemo />,
    notes: 'Pure SVG primitive (no hooks); `frame` must be passed in, so the slot drives it with useCurrentFrame. Props shape from Argument/Duel/TalkingHead usage. The speaking tongue never renders (nested <ellipse> inside <ellipse>).',
  },

  // CinematicLowerThird: glassy lower-third caption over the Cantino planisphere
  {
    name: 'CinematicLowerThird',
    file: 'CinematicLowerThird.tsx',
    durationInFrames: 150,
    render: () => (
      <AbsoluteFill>
        <Backdrop src="historic/u1e3/cantino-planisphere.jpg" dim={0.1} />
        <CinematicLowerThird
          backdropSrc="historic/u1e3/cantino-planisphere.jpg"
          name="Cantino Planisphere"
          primaryTitle="The Cantino Planisphere, 1502"
          secondaryTitle="The earliest surviving map to show the Line of Tordesillas splitting the Americas between Spain and Portugal."
          chapterNumber="KEY CONCEPT 1.2.I"
          badgeText="AP EXAM MUST-KNOW"
          citationDate="Lisbon, 1502"
          accentColor="#c9a227"
        />
      </AbsoluteFill>
    ),
    notes: 'No real usage; props from LowerThirdProps. backdropSrc matches the subject (default backdrop is the colonial hall).',
  },

  // CollageSlide: grid of six Columbian Exchange images with labels
  {
    name: 'CollageSlide',
    file: 'CollageSlide.tsx',
    durationInFrames: 150,
    render: () => (
      <CollageSlide
        title="What Crossed the Atlantic"
        columns={3}
        items={[
          { image: staticFile('historic/u1e3/maize-botanical.jpg'), label: 'Maize → Europe & Africa' },
          { image: staticFile('historic/u1e3/potato-plant.jpg'), label: 'Potato → Europe' },
          { image: staticFile('historic/u1e3/tomato-plant.jpg'), label: 'Tomato → Europe' },
          { image: staticFile('historic/u1e3/feral-pigs.jpg'), label: 'Pigs → Americas' },
          { image: staticFile('historic/u1e3/sugarcane-plantation.jpg'), label: 'Sugarcane → Caribbean' },
          { image: staticFile('historic/u1e2/comanche-horses.jpg'), label: 'Horses → Great Plains' },
        ]}
      />
    ),
    notes: 'No real usage; props from interface. `image` goes straight into <Img src>, so it must be a staticFile() URL.',
  },

  // CompareSlide: two-column comparison of what flowed each way in the Columbian Exchange
  {
    name: 'CompareSlide',
    file: 'CompareSlide.tsx',
    durationInFrames: 150,
    render: () => (
      <CompareSlide
        title="The Columbian Exchange"
        left={{
          head: 'Old World → New',
          sections: [
            { sub: 'Animals & crops', points: ['Horses, pigs, cattle', 'Wheat, sugarcane, rice'] },
            { sub: 'Disease', points: ['Smallpox, measles, influenza'] },
          ],
        }}
        right={{
          head: 'New World → Old',
          sections: [
            { sub: 'Crops', points: ['Maize, potatoes, tomatoes', 'Tobacco, cacao'] },
            { sub: 'Wealth', points: ['Silver from Potosí funds Spain'] },
          ],
        }}
      />
    ),
    notes: 'Prop shape from real usage in Demo.tsx. The root div sets width/height AND padding without box-sizing:border-box, so it is 1408×848 and the right column spills past the frame edge.',
  },

  // CutoutFigure: torn-paper cutout of Bernardino de Sahagún rising in from the left
  {
    name: 'CutoutFigure',
    file: 'CutoutFigure.tsx',
    durationInFrames: 150,
    render: () => (
      <AbsoluteFill>
        <Backdrop src="historic/u1e3/florentine-codex-page.jpg" dim={0.55} />
        <CutoutFigure src="historic/u1e3/sahagun-portrait.jpg" name="Bernardino de Sahagún" side="left" at={10} />
      </AbsoluteFill>
    ),
    notes: 'Prop shape from ComponentShowcase.tsx (src is a public/ path; the component wraps it in staticFile). The image is a plain <img> inside <foreignObject>, so Remotion does not wait for it to load and frames may render blank.',
  },

  // DisplayHeadline: big centered headline + rule + subline on Spanish silver
  {
    name: 'DisplayHeadline',
    file: '../legacy/DisplayHeadline.tsx',
    durationInFrames: 120,
    render: () => (
      <DisplayHeadline
        headline="Silver from Potosí made Spain the richest empire on Earth — for a while."
        sub="The Columbian Exchange, 1492–1600"
      />
    ),
    notes: 'legacy. Prop shape from real usage in U2E5Act1.tsx / Demo.tsx. Root div has width/height plus padding (content-box), so it is ~1485×925 and the centered text sits ~100px right/low of true center.',
  },

  // DocumentOverlay: Florentine Codex page dropping onto the scene as torn parchment with a wax seal
  {
    name: 'DocumentOverlay',
    file: '../legacy/DocumentOverlay.tsx',
    durationInFrames: 150,
    render: () => (
      <AbsoluteFill>
        <Backdrop src="historic/u1e3/tenochtitlan.jpg" dim={0.5} />
        <DocumentOverlay
          src="historic/u1e3/florentine-codex-page.jpg"
          position={[0.7, 0.6]}
          width={300}
          rotation={5}
          at={15}
          caption="Florentine Codex, c. 1577"
        />
      </AbsoluteFill>
    ),
    notes: 'legacy. Prop shape from ComponentShowcase.tsx (src is a public/ path, wrapped in staticFile internally). It uses a plain <img> inside <foreignObject>, plus hard-coded SVG ids ("torn-paper", "doc-clip") that clash when two overlays are on screen.',
  },

  // DocumentReveal: typewriter reveal of Jefferson's 1802 letter about New Orleans
  {
    name: 'DocumentReveal',
    file: '../legacy/DocumentReveal.tsx',
    durationInFrames: 180,
    render: () => (
      <DocumentReveal
        title="Jefferson to Robert Livingston, April 18, 1802"
        text={
          'There is on the globe one single spot, the possessor of which is our natural and habitual enemy. ' +
          'It is New Orleans, through which the produce of three-eighths of our territory must pass to market.'
        }
        source="Thomas Jefferson"
        charsPerFrame={1.6}
      />
    ),
    notes: 'legacy. No real usage; props from interface. ~200 chars at 1.6 chars/frame finishes at ~f125. Known bugs: the source line never fades in (opacity stays ~0); padding+width overflow (content-box); enter/exitDuration are accepted but ignored.',
  },

  // DualTalkingHeads: Maya and Marcus side by side, Maya active (illustrated-face fallback)
  {
    name: 'DualTalkingHeads',
    file: '../legacy/DualTalkingHeads.tsx',
    durationInFrames: 150,
    render: () => (
      <AbsoluteFill style={{ backgroundColor: '#1a1512' }}>
        <DualTalkingHeads
          maya={{ name: 'Maya', color: '#c9a227' }}
          marcus={{ name: 'Marcus', color: '#4a90d9' }}
          activeSpeaker="maya"
          layout="side-by-side"
        />
      </AbsoluteFill>
    ),
    notes: 'legacy. No real usage; props from interface. Speaker only takes `videoSrc`, which TalkingHead plays in a plain <video autoPlay> (not Remotion <Video>), and no video asset exists. Passing maya-real.webp there would put a .webp in <video>, so videoSrc is left out and both hosts use the default CharacterFace. They look identical because appearance props are not forwarded. TalkingHead renders transparent, so the slot adds a dark background.',
  },

  // Duel: Las Casas vs Sepúlveda face-off with VS badge, argument bubbles, and a climax flash
  {
    name: 'Duel',
    file: '../legacy/Duel.tsx',
    durationInFrames: 180,
    render: () => (
      <Duel
        left={{
          name: 'Las Casas',
          color: '#2c5aa0',
          skinTone: '#f0c8a0',
          hairColor: '#d8d8d8',
          hairStyle: 'short',
          expression: 'serious',
          argument: 'Natives are fully human!',
        }}
        right={{
          name: 'Sepúlveda',
          color: '#a02c2c',
          skinTone: '#e8b890',
          hairColor: '#2a1a0a',
          hairStyle: 'bob',
          expression: 'serious',
          argument: 'Conquest is a just war!',
        }}
        variant="ideas"
        climaxAt={120}
      />
    ),
    notes: 'legacy. Prop shape from ComponentShowcase.tsx SceneDuel (variant/climaxAt). That scene uses imageSrc portraits (hamilton/jefferson-real.webp), which are not available, so this slot uses the CharacterFace fallback.',
  },

  // DuoSlide: side-by-side images, Tenochtitlan before vs smallpox after
  {
    name: 'DuoSlide',
    file: '../legacy/DuoSlide.tsx',
    durationInFrames: 120,
    render: () => (
      <DuoSlide
        leftImage={staticFile('historic/u1e3/tenochtitlan.jpg')}
        rightImage={staticFile('historic/u1e3/smallpox-victims.jpg')}
        leftLabel="Tenochtitlan, 1519"
        rightLabel="Smallpox, 1520"
        leftSub="A city of 200,000"
        rightSub="Up to half the city dead within a year"
      />
    ),
    notes: 'legacy. No real usage; props from interface. Images go straight into <Img src>, so they are passed as staticFile() URLs.',
  },

  // GravityDrop: a heavy "LOUISIANA PURCHASE" title card falls, bounces, and settles mid-frame
  {
    name: 'GravityDrop',
    file: 'GravityDrop.tsx',
    durationInFrames: 120,
    render: () => (
      <AbsoluteFill style={{ backgroundColor: '#1a1512' }}>
        <GravityDrop landAt={[0.5, 0.45]} at={10} dropHeight={450} width={760} height={150} landRotation={-2}>
          <div
            style={{
              backgroundColor: '#e8d5a8',
              color: '#2a1f14',
              border: '4px solid #5a4326',
              borderRadius: 8,
              padding: '18px 28px',
              textAlign: 'center',
              fontFamily: 'Georgia, serif',
              boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 54, fontWeight: 900, letterSpacing: 2 }}>LOUISIANA PURCHASE</div>
            <div style={{ fontSize: 26, fontStyle: 'italic' }}>1803 · 828,000 sq mi · $15 million</div>
          </div>
        </GravityDrop>
      </AbsoluteFill>
    ),
    notes: 'GravityDrop takes arbitrary children. Episodes only use the GravityText wrapper (e.g. U1E2Episode.tsx, ComponentShowcase.tsx: landAt/at/dropHeight), and those props are reused here. Background is transparent, so the slot adds one.',
  },

  // HighlightSlide: Columbus journal excerpt with animated highlighter marks and margin notes
  {
    name: 'HighlightSlide',
    file: 'HighlightSlide.tsx',
    durationInFrames: 150,
    render: () => (
      <HighlightSlide
        title="Columbus's Journal, October 12, 1492"
        body={
          'They ought to make good and skilled servants, for they repeat very quickly whatever we say to them. ' +
          'I think they can very easily be made Christians, for they seem to have no religion. ' +
          'With fifty men they can all be subjugated and made to do what is required of them.'
        }
        highlights={[
          { text: 'good and skilled servants', note: 'Labor' },
          { text: 'easily be made Christians', note: 'Religion' },
          { text: 'all be subjugated', note: 'Conquest' },
        ]}
      />
    ),
    notes: 'No real usage; props from interface. Each highlight text must appear verbatim in body (only the first match is used). Notes sit 28px above the line and can collide with the line above.',
  },

  // HistoricalTimeline: four-card road-to-revolution timeline with progress gauge
  {
    name: 'HistoricalTimeline',
    file: '../legacy/HistoricalTimeline.tsx',
    durationInFrames: 180,
    render: () => (
      <HistoricalTimeline
        eraTitle="The Road to Revolution"
        periodBadge="Period 3 · 1754–1800"
        milestones={[
          { year: '1764', title: 'Sugar Act', subtitle: 'Revenue, not regulation', significance: 'First tax passed explicitly to raise revenue from the colonies.' },
          { year: '1765', title: 'Stamp Act', subtitle: 'Direct internal tax', significance: 'Sparks the Stamp Act Congress and colonial boycotts.' },
          { year: '1767', title: 'Townshend Acts', subtitle: 'Duties on imports', significance: 'Non-importation agreements spread through the colonies.' },
          { year: '1773', title: 'Tea Act', subtitle: 'East India monopoly', significance: 'Boston Tea Party leads to the Coercive Acts.' },
        ]}
        themeColor="#d97706"
      />
    ),
    notes: 'legacy. No real usage; props from TimelineProps. The footer banner ("each internal tax… THEME: POL-1.0") is hard-coded, so content is chosen to match it. The progress gauge is hard-wired to frames 10–150, not the composition length.',
  },
];
