import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TitleSlide } from './TitleSlide';
import { DisplayHeadline } from './DisplayHeadline';
import { CompareSlide } from './CompareSlide';
import { WordPop } from './WordPop';
import { TimelineRibbon } from './TimelineRibbon';

/**
 * Demo: U2-E5 Act 1 beats rebuilt in Remotion
 * Shows ported slideforge components + new WordPop/TimelineRibbon
 */
export const Demo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1512' }}>
      {/* Beat 1: Title */}
      <Sequence from={0} durationInFrames={90}>
        <TitleSlide
          title="The money underneath it all"
          subtitle="Mercantilism, the Navigation Acts, and the great colonial dodge"
        />
        <TimelineRibbon
          boxes={['Mercantilism', 'Navigation Acts', 'Salutary Neglect']}
          checkedCount={0}
        />
      </Sequence>

      {/* Beat 2: The fixed pile */}
      <Sequence from={90} durationInFrames={90}>
        <DisplayHeadline
          headline="The pile is fixed"
          sub="One country's gain = another's loss"
        />
        <WordPop word="FIXED PIE" />
        <TimelineRibbon
          boxes={['Mercantilism', 'Navigation Acts', 'Salutary Neglect']}
          checkedCount={0}
        />
      </Sequence>

      {/* Beat 3: Not digging. Stacking. */}
      <Sequence from={180} durationInFrames={120}>
        <CompareSlide
          title="Not digging. Stacking."
          left={{
            head: 'Maya thinks',
            sections: [{ sub: 'Gold-rush', points: ['Dig it up', 'Whoever finds most wins'] }],
          }}
          right={{
            head: 'Marcus corrects',
            sections: [{ sub: 'Mercantilism', points: ['Stack it up', 'Whoever hoards most wins'] }],
          }}
        />
        <TimelineRibbon
          boxes={['Mercantilism', 'Navigation Acts', 'Salutary Neglect']}
          checkedCount={1}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
