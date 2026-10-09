import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {DirectedEpisode, type DirectedProps} from './directed/DirectedEpisode';
import './theme/fonts';

const Root: React.FC = () => (
  <Composition<any, DirectedProps>
    id="DirectedEpisode"
    component={DirectedEpisode}
    durationInFrames={30}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{episode: 'episode', plan: {title: '', scenes: []}, turns: [], timing: {starts: [], durations: [], totalSec: 1}}}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(30, Math.ceil(props.timing.totalSec * 30))})}
  />
);

registerRoot(Root);
