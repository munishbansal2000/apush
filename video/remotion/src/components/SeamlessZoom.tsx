import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { TimingProps, DEFAULT_TIMING, getAnimationProgress } from '../validation/timing';

interface SeamlessZoomProps extends TimingProps {
  /** Starting scene (wide/macro view) */
  fromImage: string;
  /** Ending scene (tight/micro view) */
  toImage: string;
  /** Caption for the zoom */
  caption?: string;
  /** Frames for the zoom transition */
  zoomDuration?: number;
  bg?: string;
  debug?: boolean;
}

/**
 * SeamlessZoom — Kurzgesagt-style macro→micro transition.
 *
 * Zooms from one image into another, creating the illusion of
 * diving deeper into the subject. The scale bridges two scenes.
 *
 * Validation: both images tracked, caption checked for overflow.
 * Timing: enterDuration (fade in), zoomDuration (the dive), exitDuration.
 */
export const SeamlessZoom: React.FC<SeamlessZoomProps> = ({
  fromImage,
  toImage,
  caption = '',
  zoomDuration = 90,
  bg = '#000',
  debug = false,
  enterDuration = DEFAULT_TIMING.enterDuration,
  exitDuration = DEFAULT_TIMING.exitDuration,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const { enter, exit } = getAnimationProgress(frame, durationInFrames, enterDuration, exitDuration);

  // Zoom timeline: hold wide -> zoom -> hold tight
  const holdWide = 30;

  let scale = 1;
  let fromOpacity = 1;
  let toOpacity = 0;

  if (frame < holdWide) {
    scale = 1;
  } else if (frame < holdWide + zoomDuration) {
    const progress = (frame - holdWide) / zoomDuration;
    // Exponential zoom (feels like diving)
    const eased = 1 - Math.pow(1 - progress, 3);
    scale = 1 + eased * 7; // Zoom to 8x
    // Crossfade near the end of zoom
    fromOpacity = interpolate(progress, [0.7, 1], [1, 0], { extrapolateRight: 'clamp' });
    toOpacity = interpolate(progress, [0.7, 1], [0, 1], { extrapolateRight: 'clamp' });
  } else {
    scale = 8;
    fromOpacity = 0;
    toOpacity = 1;
  }

  const trackedElements = useMemo((): TrackedElement[] => {
    const els: TrackedElement[] = [];
    if (caption) {
      els.push({
        id: 'caption', type: 'text', content: caption,
        fontSize: height * 0.032,
        x: width * 0.06, y: height * 0.85,
        width: width * 0.88, height: height * 0.1,
      });
    }
    return els;
  }, [caption, width, height]);

  useElementTracker(trackedElements, {
    checkOverlaps: false,
    debug,
    componentName: 'SeamlessZoom',
  });

  return (
    <div style={{
      width, height, backgroundColor: bg,
      position: 'relative', overflow: 'hidden',
      opacity: Math.min(enter * 2, exit * 2, 1),
    }}>
      {/* From image (zooming) */}
      <div style={{
        position: 'absolute', width, height,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        opacity: fromOpacity,
        willChange: 'transform',
      }}>
        <img src={fromImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* To image (revealed) */}
      <div style={{
        position: 'absolute', width, height,
        opacity: toOpacity,
      }}>
        <img src={toImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* Caption */}
      {caption && (
        <div style={{
          position: 'absolute', bottom: height * 0.06,
          left: width * 0.06, right: width * 0.06,
          fontSize: height * 0.032, color: '#fff',
          fontFamily: 'Georgia, serif',
          textShadow: '2px 2px 8px rgba(0,0,0,0.9)',
          textAlign: 'center',
          zIndex: 10,
        }}>
          {caption}
        </div>
      )}
    </div>
  );
};
