/**
 * Minimal entry point for component episodes (U1E1-U2E10) only.
 * Excludes kit episodes (U1E3, U1-PRACTICE) which need compiled data.
 */
import { registerRoot } from 'remotion';
import React from 'react';
import { Composition } from 'remotion';

// Import all component episodes
import { U1E1Episode } from './components/U1E1Episode';
import { U1E2Episode } from './components/U1E2Episode';
import { U1E3Episode } from './components/U1E3Episode';
import { U1E4Episode } from './components/U1E4Episode';
import { U1E5Episode } from './components/U1E5Episode';
import { U1E6Episode } from './components/U1E6Episode';
import { U1E7Episode } from './components/U1E7Episode';
import { U1E8Episode } from './components/U1E8Episode';
import { U1E9Episode } from './components/U1E9Episode';
import { U2E1Episode } from './components/U2E1Episode';
import { U2E2Episode } from './components/U2E2Episode';
import { U2E3Episode } from './components/U2E3Episode';
import { U2E4Episode } from './components/U2E4Episode';
import { U2E5Episode } from './components/U2E5Episode';
import { U2E6Episode } from './components/U2E6Episode';
import { U2E7Episode } from './components/U2E7Episode';
import { U2E8Episode } from './components/U2E8Episode';
import { U2E9Episode } from './components/U2E9Episode';
import { U2E10Episode } from './components/U2E10Episode';

const EPISODES = [
  U1E1Episode, U1E2Episode, U1E3Episode, U1E4Episode, U1E5Episode,
  U1E6Episode, U1E7Episode, U1E8Episode, U1E9Episode,
  U2E1Episode, U2E2Episode, U2E3Episode, U2E4Episode, U2E5Episode,
  U2E6Episode, U2E7Episode, U2E8Episode, U2E9Episode, U2E10Episode,
];

function episodeMetadata({ props }: { props: { episodeData?: { starts: number[]; durations: number[] } } }) {
  const d = props.episodeData;
  let durationInFrames = 30;
  if (d && d.starts.length > 0 && d.durations.length > 0) {
    const totalSec = d.starts[d.starts.length - 1] + d.durations[d.durations.length - 1];
    durationInFrames = Math.max(30, Math.ceil(totalSec * 30));
  }
  return { durationInFrames };
}

export const RemotionRoot: React.FC = () => {
  return React.createElement(
    React.Fragment,
    null,
    EPISODES.map((Comp, i) => {
      const id = Comp.name;
      return React.createElement(Composition, {
        key: id,
        id,
        component: Comp,
        durationInFrames: 30,
        fps: 30,
        width: 1280,
        height: 720,
        calculateMetadata: episodeMetadata,
      });
    })
  );
};

registerRoot(RemotionRoot);
