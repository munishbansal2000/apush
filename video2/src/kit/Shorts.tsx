/**
 * Shorts recomposer: one 9:16 video per box chapter, built from the same compiled episode.
 * The 16:9 episode plays letterboxed (embedded: no head/guard/captions of its own) with a
 * fitted chapter header, large word-timed captions, and a footer, all inside a Shorts-safe
 * area that avoids the platform's right-rail buttons and bottom description. The runtime
 * guard checks the Short with that safe area.
 */
import React, { useRef } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { captionChunks } from './captions';
import { EpisodeShell, type EpisodeShellProps } from './EpisodeShell';
import { LayoutGuard, Track } from './guard';
import type { Rect, RenderConfig } from './layout';
import { SANS, SERIF, useFit } from './overlays';
import type { ResolvedChapter } from './types';

/** Platform UI keep-out for 9:16 (fractions of the frame). */
export const SHORTS_SAFE: Rect = [0.05, 0.08, 0.84, 0.8];

export const shortsConfig = (cfg: RenderConfig): RenderConfig => ({ ...cfg, width: cfg.shorts.width, height: cfg.shorts.height, safe: SHORTS_SAFE });

export const ShortFrame: React.FC<EpisodeShellProps & { chapter: ResolvedChapter; seriesLabel: string }> = props => {
  const { chapter, config: cfg, episode: ep, wordTimes, seriesLabel } = props;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const rootRef = useRef<HTMLDivElement>(null);
  const t = chapter.start + frame / fps;
  const scale = width / cfg.width;
  const videoTop = cfg.shorts.videoTop * height;
  const videoH = cfg.height * scale;
  const chunks = React.useMemo(() => captionChunks(ep.timeline, wordTimes, 34), [ep, wordTimes]);
  const chunk = chunks.find(c => t >= c.start && t < c.end);
  const contentW = (SHORTS_SAFE[2] - SHORTS_SAFE[0]) * width;
  const headSize = useFit(chapter.spec.label.toUpperCase(), contentW, 2, 72);
  const capSize = useFit(chunk?.text ?? ' ', contentW, 2, 64, SANS, 700);
  const sCfg = shortsConfig(cfg);
  const speakerColor = chunk ? cfg.speakers[chunk.speaker]?.color : '#fff';

  return (
    <AbsoluteFill ref={rootRef} data-kit-root style={{ background: '#120f0c' }}>
      <Track id="short:header" role="chrome">
        <div style={{ position: 'absolute', left: SHORTS_SAFE[0] * width, width: contentW, top: SHORTS_SAFE[1] * height, height: videoTop - SHORTS_SAFE[1] * height - 24,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ fontFamily: SANS, fontSize: 30, letterSpacing: 5, color: '#ffd166' }}>{seriesLabel}</div>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: headSize, color: '#f5e6c8', lineHeight: 1.1 }}>{chapter.spec.label.toUpperCase()}</div>
        </div>
      </Track>
      <div style={{ position: 'absolute', left: 0, top: videoTop, width: cfg.width, height: cfg.height, transform: `scale(${scale})`, transformOrigin: 'top left', overflow: 'hidden' }}>
        <Sequence from={-Math.round(chapter.start * fps)} layout="none">
          <EpisodeShell {...props} captions={false} embedded />
        </Sequence>
      </div>
      {chunk && (
        <Track id="short:captions" role="chrome">
          <div style={{ position: 'absolute', left: SHORTS_SAFE[0] * width, width: contentW, top: videoTop + videoH + 60, display: 'flex', justifyContent: 'center' }}>
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: capSize, color: '#fff', textAlign: 'center', lineHeight: 1.2,
              borderBottom: `8px solid ${speakerColor}`, paddingBottom: 8 }}>{chunk.text}</span>
          </div>
        </Track>
      )}
      <Track id="short:footer" role="chrome">
        <div style={{ position: 'absolute', left: SHORTS_SAFE[0] * width, width: contentW, top: SHORTS_SAFE[3] * height - 70, fontFamily: SANS, fontSize: 30, color: 'rgba(245,230,200,0.75)' }}>
          Full episode: {ep.spec.title.kicker} · {ep.spec.title.title}
        </div>
      </Track>
      <LayoutGuard cfg={sCfg} rootRef={rootRef} />
    </AbsoluteFill>
  );
};
