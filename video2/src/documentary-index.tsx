import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {DocEpisode} from './documentary/DocEpisode';
import type {DocEpisodeProps} from './documentary/types';
import './theme/fonts';

const Root: React.FC = () => (
  <Composition<any, DocEpisodeProps>
    id="DocEpisode"
    component={DocEpisode}
    durationInFrames={30}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{episode: 'episode', shots: [], turns: [], timing: {starts: [], durations: [], totalSec: 1}}}
    // A preview render passes a lower frame rate (everything is timed in seconds, so it plays the same).
    calculateMetadata={({props}) => { const fps = props.fps ?? 30; return {fps, durationInFrames: Math.max(fps, Math.ceil(props.timing.totalSec * fps))}; }}
  />
);

registerRoot(Root);
