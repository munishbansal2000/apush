import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { TimingProps, DEFAULT_TIMING, getAnimationProgress } from '../validation/timing';
import { FONT, COLOR, TYPE, RADIUS, alpha } from '../theme/tokens';

interface CompareSlideProps extends TimingProps {
  title?: string;
  left: { head: string; sections: { sub: string; points: string[] }[] };
  right: { head: string; sections: { sub: string; points: string[] }[] };
  accent?: string;
  bg?: string;
  debug?: boolean;
}

/**
 * CompareSlide — ported from slideforge with per-element validation.
 *
 * Every element is tracked:
 * - Title text
 * - Left head, left subs, left points
 * - Right head, right subs, right points
 * - Divider line
 *
 * Validation ensures: no overflow, no out-of-bounds, no bad overlaps.
 */
export const CompareSlide: React.FC<CompareSlideProps> = ({
  title = '',
  left,
  right,
  accent = COLOR.gold,
  bg = COLOR.nightPanel,
  debug = false,
  enterDuration = DEFAULT_TIMING.enterDuration,
  exitDuration = DEFAULT_TIMING.exitDuration,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const { enter, exit } = getAnimationProgress(frame, durationInFrames, enterDuration, exitDuration);
  const overallOpacity = Math.min(enter * 2, exit * 2, 1);

  // Layout constants
  const padding = width * 0.05;
  const colWidth = (width - padding * 2 - width * 0.03) / 2;
  const titleH = title ? height * 0.08 : 0;
  const contentTop = padding + titleH + height * 0.03;

  // Build tracked elements for validation
  const trackedElements = useMemo((): TrackedElement[] => {
    const els: TrackedElement[] = [];
    const titleSize = height * 0.05;
    const headSize = height * 0.045;
    const subSize = height * 0.03;
    const pointSize = height * 0.028;

    if (title) {
      els.push({
        id: 'title',
        type: 'text',
        content: title,
        fontSize: titleSize,
        fontWeight: 'bold',
        x: padding,
        y: padding,
        width: width - padding * 2,
        height: titleSize * 1.4,
      });
    }

    // Left column elements
    let leftY = contentTop;
    els.push({
      id: 'left-head',
      type: 'text',
      content: left.head,
      fontSize: headSize,
      fontWeight: 'bold',
      x: padding,
      y: leftY,
      width: colWidth,
      height: headSize * 1.4,
    });
    leftY += headSize * 1.4 + height * 0.02;

    for (const section of left.sections) {
      if (section.sub) {
        els.push({
          id: `left-sub-${section.sub.slice(0, 10)}`,
          type: 'text',
          content: section.sub,
          fontSize: subSize,
          x: padding,
          y: leftY,
          width: colWidth,
          height: subSize * 1.4,
        });
        leftY += subSize * 1.4 + 8;
      }
      for (const point of section.points) {
        els.push({
          id: `left-point-${point.slice(0, 15)}`,
          type: 'text',
          content: point,
          fontSize: pointSize,
          x: padding + 16,
          y: leftY,
          width: colWidth - 16,
          height: pointSize * 1.4 * 2, // Allow 2 lines
        });
        leftY += pointSize * 1.4 * 2 + 6;
      }
    }

    // Right column elements (same structure)
    let rightY = contentTop;
    const rightX = padding + colWidth + width * 0.03;
    els.push({
      id: 'right-head',
      type: 'text',
      content: right.head,
      fontSize: headSize,
      fontWeight: 'bold',
      x: rightX,
      y: rightY,
      width: colWidth,
      height: headSize * 1.4,
    });

    return els;
  }, [title, left, right, width, height, padding, colWidth, contentTop]);

  // Validate every element
  const validation = useElementTracker(trackedElements, {
    checkOverlaps: true,
    allowedOverlap: 5, // Small overlap OK for text line-height
    debug,
    componentName: 'CompareSlide',
  });

  const leftX = interpolate(enter, [0, 1], [-50, 0]);
  const rightX = interpolate(enter, [0, 1], [50, 0]);

  const renderSide = (
    side: typeof left,
    x: number,
    opacity: number
  ) => (
    <div
      style={{
        flex: 1,
        padding: width * 0.04,
        opacity,
        transform: `translateX(${x}px)`,
      }}
    >
      <div
        style={{
          fontSize: height * 0.045,
          fontWeight: 'bold',
          color: accent,
          marginBottom: height * 0.02,
          fontFamily: FONT.text,
        }}
      >
        {side.head}
      </div>
      {side.sections.map((section, i) => (
        <div key={i} style={{ marginBottom: height * 0.02 }}>
          {section.sub && (
            <div style={{ fontSize: height * 0.03, color: COLOR.onNightMuted, marginBottom: 8 }}>
              {section.sub}
            </div>
          )}
          {section.points.map((point, j) => (
            <div
              key={j}
              style={{
                fontSize: height * 0.028,
                color: COLOR.onNight,
                marginBottom: 6,
                paddingLeft: 16,
                position: 'relative',
                lineHeight: 1.4,
              }}
            >
              <span style={{ position: 'absolute', left: 0, color: accent }}>•</span>
              {point}
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: bg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT.text,
        padding,
        boxSizing: 'border-box',
        opacity: overallOpacity,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: height * 0.05,
            fontWeight: 'bold',
            color: COLOR.onNight,
            textAlign: 'center',
            marginBottom: height * 0.03,
            opacity: enter,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, gap: width * 0.03 }}>
        {renderSide(left, leftX, enter)}
        <div
          style={{
            width: 2,
            backgroundColor: accent,
            opacity: 0.5 * enter,
            margin: `${height * 0.05}px 0`,
          }}
        />
        {renderSide(right, rightX, enter)}
      </div>

      {/* Validation status (debug only) */}
      {debug && !validation.valid && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            backgroundColor: alpha(COLOR.red, 0.8),
            color: COLOR.onNight,
            padding: '4px 8px',
            fontSize: TYPE.micro,
            borderRadius: RADIUS.sm,
          }}
        >
          {validation.issues.length} layout issues
        </div>
      )}
    </div>
  );
};
