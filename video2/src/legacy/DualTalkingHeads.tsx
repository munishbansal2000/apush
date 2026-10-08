import React from 'react';
import { useVideoConfig } from 'remotion';
import { TalkingHead } from '../components/TalkingHead';
import { TimingProps } from '../validation/timing';

interface Speaker {
  name: string;
  color: string;
  videoSrc?: string;
  /** Optional per-host art (passed through to TalkingHead) so the two hosts can differ */
  imageSrc?: string;
  skinTone?: string;
  hairColor?: string;
  hairStyle?: 'bob' | 'short' | 'long' | 'curly';
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
          speakerName={main.name}
          speakerColor={main.color}
          videoSrc={main.videoSrc}
          imageSrc={main.imageSrc}
          skinTone={main.skinTone}
          hairColor={main.hairColor}
          hairStyle={main.hairStyle}
          position="fullscreen"
          layoutId="talking-head-main"
          speaking={true}
          showName={true}
          debug={debug}
        />
        <TalkingHead
          speakerName={secondary.name}
          speakerColor={secondary.color}
          videoSrc={secondary.videoSrc}
          imageSrc={secondary.imageSrc}
          skinTone={secondary.skinTone}
          hairColor={secondary.hairColor}
          hairStyle={secondary.hairStyle}
          position="bottom-right"
          layoutId="talking-head-pip"
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
      }}>
        <TalkingHead
          speakerName={maya.name}
          speakerColor={maya.color}
          videoSrc={maya.videoSrc}
          imageSrc={maya.imageSrc}
          skinTone={maya.skinTone}
          hairColor={maya.hairColor}
          hairStyle={maya.hairStyle}
          position="left"
          layoutId="talking-head-maya"
          size={0.35}
          speaking={mayaActive}
          showName={true}
          debug={debug}
        />
      </div>
      <div style={{
        opacity: dimInactive && !marcusActive ? 0.6 : 1,
      }}>
        <TalkingHead
          speakerName={marcus.name}
          speakerColor={marcus.color}
          videoSrc={marcus.videoSrc}
          imageSrc={marcus.imageSrc}
          skinTone={marcus.skinTone}
          hairColor={marcus.hairColor}
          hairStyle={marcus.hairStyle}
          position="right"
          layoutId="talking-head-marcus"
          size={0.35}
          speaking={marcusActive}
          showName={true}
          debug={debug}
        />
      </div>
    </div>
  );
};
