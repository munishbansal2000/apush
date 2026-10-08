/**
 * Compositions for episodes built on the kit (same as apush's src/Root.tsx). Registered from
 * the repo's RemotionRoot. Kit episodes render at render-config.json size (1920×1080).
 */
import React from 'react';
import { Composition } from 'remotion';
import { renderConfig as cfg } from './make';
import { U1E3 } from './U1E3Episode';
import { U1Practice } from './U1PracticeEpisode';

const EPISODES = [
  { id: 'U1E3', ep: U1E3 },
  { id: 'U1-PRACTICE', ep: U1Practice },
];

export const KitCompositions: React.FC = () => (
  <>
    {EPISODES.map(({ id, ep }) => (
      <React.Fragment key={id}>
        <Composition id={id} component={ep.Full} durationInFrames={Math.ceil(ep.compiled.totalSec * cfg.fps)} fps={cfg.fps} width={cfg.width} height={cfg.height} />
        {ep.shorts.map((c, i) => (
          <Composition
            key={`${id}-short-${i}`}
            id={c.spec.box ? `${id}-BOX${c.spec.box}` : `${id}-Q${i + 1}`}
            component={ep.Short}
            defaultProps={{ chapter: c }}
            durationInFrames={Math.ceil((c.end - c.start) * cfg.fps)}
            fps={cfg.fps}
            width={cfg.shorts.width}
            height={cfg.shorts.height}
          />
        ))}
      </React.Fragment>
    ))}
  </>
);
