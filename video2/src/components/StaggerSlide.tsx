import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { TimingProps } from '../validation/timing';
import { COLOR, FONT, RADIUS, alpha } from '../theme/tokens';

interface StaggerPanel {
  image: string;
  label?: string;
  /** Frame when panel is FULLY VISIBLE (settled) */
  at?: number;
  from?: 'left' | 'right' | 'top' | 'bottom';
  /** Word anchor for TTS sync (alternative to 'at') */
  anchor?: { word: string };
}

interface StaggerSlideProps extends TimingProps {
  panels: StaggerPanel[];
  title?: string;
  /** Frames for entrance animation */
  entrance_dur?: number;
  bg?: string;
  debug?: boolean;
}

/** URLs / absolute paths / staticFile() results pass through; bare paths go through staticFile(). */
const resolveSrc = (src: string): string =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src);

const normWord = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

/**
 * StaggerSlide — ported from slideforge.
 *
 * Python: StaggerSlide(panels=[{image, label, at, from}], title, entrance_dur)
 * Remotion: Same interface. Spring physics for entrances.
 *
 * Quality delta: PIL entrances are mechanical (linear). Remotion's
 * spring physics makes panels feel physical — they overshoot slightly
 * and settle, like real objects landing.
 */
export const StaggerSlide: React.FC<StaggerSlideProps> = ({
  panels,
  title = '',
  entrance_dur = 20,
  bg = COLOR.nightPanel,
  debug = false,
  enterDuration,
  exitDuration,
  wordTimings,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  // TimingProps: enterDuration overrides entrance_dur when given; exitDuration
  // (optional) fades the whole slide out over the last N frames.
  const entranceFrames = enterDuration ?? entrance_dur;
  const exitOpacity = exitDuration && exitDuration > 0
    ? interpolate(frame, [durationInFrames - exitDuration, durationInFrames], [1, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : 1;

  const n = panels.length;
  const panelWidth = Math.min(width * 0.28, (width * 0.9) / n - 16);
  const panelHeight = height * 0.55;
  const totalWidth = n * panelWidth + (n - 1) * 16;
  const startX = (width - totalWidth) / 2;
  const panelY = height * 0.22;

  // Default stagger: 30 frames apart if 'at' not specified
  const panelsWithTiming = useMemo(() => {
    const anchorFrame = (p: StaggerPanel): number | undefined => {
      if (!p.anchor || !wordTimings) return undefined;
      const target = normWord(p.anchor.word);
      const hit = wordTimings.find((wt) => normWord(wt.word) === target);
      return hit?.startFrame;
    };
    return panels.map((p, i) => ({
      ...p,
      at: p.at ?? anchorFrame(p) ?? i * 30,
      from: p.from ?? (i % 2 === 0 ? 'left' : 'right') as 'left' | 'right' | 'top' | 'bottom',
    }));
  }, [panels, wordTimings]);

  // Track panels for validation
  const trackedElements = useMemo((): TrackedElement[] => {
    const els: TrackedElement[] = [];
    if (title) {
      els.push({
        id: 'title', type: 'text', content: title,
        fontSize: height * 0.045, fontWeight: 'bold',
        x: width * 0.05, y: height * 0.05,
        width: width * 0.9, height: height * 0.07,
      });
    }
    panelsWithTiming.forEach((p, i) => {
      const x = startX + i * (panelWidth + 16);
      els.push({
        id: `panel-${i}`, type: 'image', content: p.image,
        x, y: panelY, width: panelWidth, height: panelHeight,
      });
      if (p.label) {
        els.push({
          id: `panel-${i}-label`, type: 'text', content: p.label,
          fontSize: height * 0.028,
          x, y: panelY + panelHeight + 8,
          width: panelWidth, height: height * 0.05,
        });
      }
    });
    return els;
  }, [title, panelsWithTiming, width, height, startX, panelWidth, panelY, panelHeight]);

  useElementTracker(trackedElements, {
    checkOverlaps: true,
    allowedOverlap: 0,
    debug,
    componentName: 'StaggerSlide',
  });

  const getEntranceTransform = (from: string, progress: number) => {
    const distance = 120;
    const eased = interpolate(progress, [0, 1], [distance, 0]);
    switch (from) {
      case 'left': return `translateX(${-eased}px)`;
      case 'right': return `translateX(${eased}px)`;
      case 'top': return `translateY(${-eased}px)`;
      case 'bottom': return `translateY(${eased}px)`;
      default: return 'none';
    }
  };

  return (
    <div style={{ width, height, backgroundColor: bg, position: 'relative', overflow: 'hidden', fontFamily: FONT.text, opacity: exitOpacity }}>
      {title && (
        <div style={{
          position: 'absolute', top: height * 0.05, left: 0, right: 0,
          textAlign: 'center', fontSize: height * 0.045, fontWeight: 'bold',
          color: COLOR.onNight,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
        }}>
          {title}
        </div>
      )}

      {panelsWithTiming.map((panel, i) => {
        const settleFrame = panel.at!;
        const startFrame = settleFrame - entranceFrames;
        if (frame < startFrame) return null;

        const progress = spring({
          frame: frame - startFrame,
          fps,
          config: { damping: 13, stiffness: 110 }, // intentional: physical feel, slight overshoot
        });
        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const x = startX + i * (panelWidth + 16);

        return (
          <div key={i} style={{ position: 'absolute', left: x, top: panelY }}>
            <div style={{
              width: panelWidth,
              height: panelHeight,
              borderRadius: RADIUS.md,
              overflow: 'hidden',
              transform: getEntranceTransform(panel.from, progress),
              opacity,
              boxShadow: `0 8px 30px ${alpha(COLOR.night, 0.5)}`,
              border: `2px solid ${alpha(COLOR.gold, 0.3)}`,
            }}>
              <Img
                src={resolveSrc(panel.image)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {panel.label && (
              <div style={{
                width: panelWidth,
                textAlign: 'center',
                fontSize: height * 0.028,
                color: COLOR.onNight,
                marginTop: 12,
                opacity,
                lineHeight: 1.4,
              }}>
                {panel.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
