/**
 * LtxClip — Renders an LTX AI video clip if present, else a Ken Burns
 * placeholder on the base image with the exact beat duration.
 *
 * VM mode: placeholder holds the timing slot (exact duration).
 * Windows mode: real LTX clips in public/ltx/<episode>/<beatId>.mp4
 *   are picked up automatically with zero code changes.
 *
 * The placeholder uses the same base image and exact duration as the
 * real clip would, so timing never drifts between VM and Windows renders.
 */
import React from 'react';
import {
  AbsoluteFill,
  Img,
  Video,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

interface LtxClipProps {
  episode: string;       // e.g. 'e3'
  beatId: string;        // e.g. 't05_ltx_0' (matches stage_clips.py output)
  baseImage: string;     // path in public/, e.g. 'historic/u1e3/cantino-planisphere.jpg'
  durationSec: number;   // exact beat duration (placeholder matches this)
  style?: React.CSSProperties;
}

export const LtxClip: React.FC<LtxClipProps> = ({
  episode,
  beatId,
  baseImage,
  durationSec,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clipPath = `ltx/${episode}/${beatId}.mp4`;

  // Check if the real LTX clip exists.
  // NOTE: staticFile() doesn't throw for missing files at render time;
  // the Video component will fail gracefully. We use a try/catch-free
  // approach: attempt Video, fall back to placeholder on error boundary.
  // In practice, stage_clips.py MANIFEST.json is the source of truth;
  // this component defaults to placeholder unless the clip is confirmed.
  // Read the manifest synchronously during render (window.__LTX_MANIFEST__ is
  // set before the bundle renders), so the very first rendered frame already
  // picks the right branch — no effect/state round-trip, no delayRender needed.
  const clipExists = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const manifest = (window as any).__LTX_MANIFEST__?.[episode];
    if (!manifest) return false;
    const record = manifest.find((r: any) => r.beat === beatId);
    return !!record?.ready;
  }, [episode, beatId]);

  // Ken Burns placeholder: slow drift on the base image, exact duration.
  const kbProgress = frame / (durationSec * fps);
  const kbScale = 1.08 + Math.sin(kbProgress * Math.PI) * 0.04;
  const kbX = interpolate(kbProgress, [0, 1], [-15, 15]);
  const kbY = interpolate(kbProgress, [0, 1], [-10, 10]);

  if (clipExists) {
    return (
      <AbsoluteFill style={style}>
        <Video
          src={staticFile(clipPath)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>
    );
  }

  // Placeholder: base image with Ken Burns, exact duration.
  // This is what renders on the VM. Timing is identical to the real clip.
  return (
    <AbsoluteFill style={{ ...style, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: -60,
        transform: `scale(${kbScale}) translate(${kbX}px, ${kbY}px)`,
      }}>
        <Img
          src={staticFile(baseImage)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      {/* Subtle indicator in dev that this is a placeholder */}
      {typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute', bottom: 8, right: 12,
          fontSize: 11, color: 'rgba(255,255,255,0.4)',
          fontFamily: 'monospace',
        }}>
          LTX placeholder
        </div>
      )}
    </AbsoluteFill>
  );
};
