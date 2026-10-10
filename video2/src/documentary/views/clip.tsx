/** Hero clips: an LTX boomerang loop (or the still, until the clip exists). */
import React from 'react';
import {Loop, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLOR} from '../../theme/tokens';
import type {ClipShot} from '../types';
import {clamp} from './common';
import {ImageMove, ParallaxMove} from './image';

/* --------------------------------- hero clips --------------------------------- */

/**
 * LTX motion from a real still. The file is a forward-then-reverse boomerang (seamless when looped); a slow push
 * keeps the frame alive. Without a generated clip, falls back to a camera move on the same still.
 */
export const ClipView: React.FC<{shot: ClipShot; lead: number}> = ({shot, lead}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  if (!shot.clip) {
    const duration = shot.endSec - shot.startSec + lead;
    return shot.depth
      ? <ParallaxMove image={shot.image} depth={shot.depth} from={shot.from} to={shot.to} durationSec={duration} />
      : <ImageMove image={shot.image} size={shot.size} from={shot.from} to={shot.to} durationSec={duration} />;
  }
  const push = interpolate(frame, [0, durationInFrames], [1, 1.05], clamp);
  // Loop two frames short of the clip's end: a container's duration can run past its last frame, and asking for a
  // moment after it fails the render ("no frame found"). Invisible in a forward-and-back boomerang.
  const clipFrames = Math.max(1, Math.floor(shot.clip.durationSec * fps) - 2);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: COLOR.night}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`}}>
        <Loop durationInFrames={clipFrames} layout="none">
          <OffthreadVideo src={staticFile(shot.clip.path)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Loop>
      </div>
    </div>
  );
};
