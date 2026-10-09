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
    calculateMetadata={({props}) => ({durationInFrames: Math.max(30, Math.ceil(props.timing.totalSec * 30))})}
  />
);

registerRoot(Root);
