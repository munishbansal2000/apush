import React from 'react';
import { useVideoConfig } from 'remotion';
import { TalkingHead } from './TalkingHead';
import { TimingProps } from '../validation/timing';

interface Speaker {
  name: string;
  color: string;
  videoSrc?: string;
}

interface DualTalkingHeadsProps extends TimingProps {
  maya: Speaker;
  marcus: Speaker;
  /** Who is currently speaking ('maya' | 'marcus' | 'both' | 'none') */
  activeSpeaker?: 'maya' | 'marcus' | 'both' | 'none';
  /** Layout: 'side-by-side' | 'pip' (one large, one small) */
  layout?: 'side-by-side' | 'pip';
  debug?: boolean;
}

/**
 * DualTalkingHeads — Maya + Marcus together.
 *
 * The core APUSH format: two hosts in conversation.
 * Active speaker gets glow + mouth animation, inactive dims slightly.
 *
 * Layouts:
 * - side-by-side: equal size, for dialogue-heavy beats
 * - pip: one large (main), one small corner (reacting)
 */
export const DualTalkingHeads: React.FC<DualTalkingHeadsProps> = ({
  maya,
  marcus,
  activeSpeaker = 'none',
  layout = 'side-by-side',
  debug = false,
}) => {
  const { width, height } = useVideoConfig();

  if (layout === 'pip') {
    // Main speaker large, other in corner
    const mainSpeaker = activeSpeaker === 'marcus' ? 'marcus' : 'maya';
    const main = mainSpeaker === 'maya' ? maya : marcus;
    const secondary = mainSpeaker === 'maya' ? marcus : maya;

    return (
      <>
        <TalkingHead
          layoutId="talking-head-main"
          speakerName={main.name}
          speakerColor={main.color}
          videoSrc={main.videoSrc}
          position="fullscreen"
          speaking={true}
          showName={true}
          debug={debug}
        />
        <TalkingHead
          layoutId="talking-head-secondary"
          speakerName={secondary.name}
          speakerColor={secondary.color}
          videoSrc={secondary.videoSrc}
          position="bottom-right"
          size={0.2}
          speaking={false}
          showName={true}
          debug={debug}
        />
      </>
    );
  }

  // Side-by-side
  const mayaActive = activeSpeaker === 'maya' || activeSpeaker === 'both';
  const marcusActive = activeSpeaker === 'marcus' || activeSpeaker === 'both';
  const dimInactive = activeSpeaker !== 'none' && activeSpeaker !== 'both';

  return (
    <div style={{
      width, height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: width * 0.05,
    }}>
      <div style={{
        opacity: dimInactive && !mayaActive ? 0.6 : 1,
        transition: 'opacity 0.3s',
      }}>
        <TalkingHead
          speakerName={maya.name}
          speakerColor={maya.color}
          videoSrc={maya.videoSrc}
          position="left"
          size={0.35}
          speaking={mayaActive}
          showName={true}
          debug={debug}
        />
      </div>
      <div style={{
        opacity: dimInactive && !marcusActive ? 0.6 : 1,
        transition: 'opacity 0.3s',
      }}>
        <TalkingHead
          speakerName={marcus.name}
          speakerColor={marcus.color}
          videoSrc={marcus.videoSrc}
          position="right"
          size={0.35}
          speaking={marcusActive}
          showName={true}
          debug={debug}
        />
      </div>
    </div>
  );
};
