/** Custom explainers: a registered component, its phases re-timed to the spoken beats. */
import React from 'react';
import {useVideoConfig} from 'remotion';
import {CUSTOM_COMPONENTS} from '../../components/custom/registry';
import type {CustomName} from '../../components/custom/catalog';
import type {CustomShot} from '../types';

/* ---------------------------------- custom explainer ---------------------------------- */

/** A custom component plays its default phases over the whole shot (lead included, so a crossfade shows it moving). */
export const CustomView: React.FC<{shot: CustomShot; lead: number}> = ({shot, lead}) => {
  const {fps} = useVideoConfig();
  const entry = CUSTOM_COMPONENTS[shot.component as CustomName];
  if (!entry) throw new Error(`unknown custom component "${shot.component}"`);
  const Component = entry.component;
  const total = shot.endSec - shot.startSec + lead;
  // Phases re-timed to the spoken beats: phase i runs from beat i to beat i+1 (the last to the end of the shot).
  const phases = shot.beatsSec?.length
    ? entry.phases.map((p, i) => {
      const at = (sec: number | undefined, fallback: number) => (sec === undefined ? fallback : Math.min(1, Math.max(0, (sec - shot.startSec + lead) / total)));
      return {...p, start: at(shot.beatsSec![i], p.start), end: at(shot.beatsSec![i + 1], i + 1 < shot.beatsSec!.length ? p.end : 1)};
    })
    : entry.phases;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Component durationInFrames={Math.max(1, Math.round(total * fps))} phases={phases} />
    </div>
  );
};
