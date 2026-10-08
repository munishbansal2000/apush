import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TitleSlide } from '../legacy/TitleSlide';
import { DisplayHeadline } from '../legacy/DisplayHeadline';
import { KenBurnsSlide } from './KenBurnsSlide';
import { CausalChainSlide } from './CausalChainSlide';
import { MapZoomSlide } from '../legacy/MapZoomSlide';
import { WordPop } from '../legacy/WordPop';
import { TimelineRibbon } from './TimelineRibbon';
import { ParticleSystem } from './ParticleSystem';

/**
 * U2-E5 Act 1: Mercantilism theory + Navigation Acts
 * Built with Remotion components (ported from slideforge + new)
 *
 * Timing (30fps):
 * - Beat 1 (Title): 0-600 frames (20s)
 * - Beat 2 (Pile): 600-1050 (15s)
 * - Beat 3 (Piggy bank): 1050-1500 (15s)
 * - Beat 4 (Colonial deal): 1500-2100 (20s)
 * - Beat 5 (Navigation Acts): 2100-2550 (15s)
 * - Beat 6 (Trade route): 2550-3150 (20s)
 * - Beat 7 (Smuggling): 3150-3900 (25s)
 * Total: 3900 frames (130s)
 */

const boxes = ['Mercantilism', 'Navigation Acts', 'Salutary Neglect'];

export const U2E5Act1: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1512' }}>
      {/* Beat 1: Title */}
      <Sequence from={0} durationInFrames={600}>
        <TitleSlide
          title="The money underneath it all"
          subtitle="Mercantilism, the Navigation Acts, and the great colonial dodge"
          debug={false}
        />
        <TimelineRibbon boxes={boxes} checkedCount={0} />
      </Sequence>

      {/* Beat 2: The fixed pile */}
      <Sequence from={600} durationInFrames={450}>
        <DisplayHeadline
          headline="The pile is fixed"
          sub="One country's gain = another's loss"
        />
        <WordPop word="FIXED PIE" />
        <TimelineRibbon boxes={boxes} checkedCount={0} />
      </Sequence>

      {/* Beat 3: Maya's piggy bank */}
      <Sequence from={1050} durationInFrames={450}>
        <KenBurnsSlide
          image="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Piggy_bank.jpg/640px-Piggy_bank.jpg"
          caption="Maya, age 10: counting coins, refusing to spend. The pile WAS the wealth."
          title=""
          stops={[[0.5, 0.5, 1.0], [0.5, 0.5, 1.2]]}
        />
        <WordPop word="TEN-YEAR-OLD MERCANTILIST" />
        <TimelineRibbon boxes={boxes} checkedCount={0} />
      </Sequence>

      {/* Beat 4: The colonial deal */}
      <Sequence from={1500} durationInFrames={600}>
        <CausalChainSlide
          title="The colonial deal"
          nodes={[
            ['Colonies ship raw materials', 'cheap'],
            ['England manufactures', ''],
            ['Colonies buy finished goods', 'full price'],
          ]}
          stagger={40}
          debug={false}
        />
        <TimelineRibbon boxes={boxes} checkedCount={0} />
      </Sequence>

      {/* Beat 5: Navigation Acts */}
      <Sequence from={2100} durationInFrames={450}>
        <DisplayHeadline
          headline="Enumerated goods — tobacco chief among them — could only be shipped to England."
          sub="Navigation Acts, 1651–1663"
        />
        <TimelineRibbon boxes={boxes} checkedCount={1} />
      </Sequence>

      {/* Beat 6: Trade forced through London */}
      <Sequence from={2550} durationInFrames={600}>
        <MapZoomSlide
          map_image="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Atlantic_Ocean.png/640px-Atlantic_Ocean.png"
          markers={[
            { at: [0.3, 0.4], zoom: 2.0, label: 'Virginia tobacco', sub: '→ London only' },
            { at: [0.6, 0.35], zoom: 2.0, label: 'French cloth', sub: '→ via London' },
            { at: [0.5, 0.5], zoom: 1.5, label: 'London takes its cut', sub: 'at every stop' },
          ]}
          intro_hold={30}
          zoom_hold={90}
          move_dur={45}
          debug={false}
        />
        <TimelineRibbon boxes={boxes} checkedCount={1} />
      </Sequence>

      {/* Beat 7: Smuggling */}
      <Sequence from={3150} durationInFrames={750}>
        <KenBurnsSlide
          image="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Smuggling_ship.jpg/640px-Smuggling_ship.jpg"
          caption="Smuggling: a way of life. John Hancock's fortune ran on dodging the customs house."
          title=""
          stops={[[0.5, 0.5, 1.0], [0.5, 0.5, 1.25]]}
        />
        <WordPop word="SMUGGLING" />
        <ParticleSystem count={30} color="#c9a227" opacity={[0.1, 0.3]} />
        <TimelineRibbon boxes={boxes} checkedCount={1} />
      </Sequence>
    </AbsoluteFill>
  );
};
