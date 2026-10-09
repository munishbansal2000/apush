/** Remotion Studio / CLI entry for previewing the custom explainer components on their own (1920x1080, 8 s each). */
import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {CUSTOM_NAMES} from './components/custom/catalog';
import {CUSTOM_COMPONENTS} from './components/custom/registry';
import './theme/fonts';

const FPS = 30;
const D = 8 * FPS;

const Root: React.FC = () => (
  <>
    {CUSTOM_NAMES.map(name => (
      <Composition key={name} id={name} component={CUSTOM_COMPONENTS[name].component} durationInFrames={D} fps={FPS} width={1920} height={1080} defaultProps={{}} />
    ))}
  </>
);

registerRoot(Root);
