import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { TimingProps, DEFAULT_TIMING, getAnimationProgress } from '../validation/timing';
import { FONT, COLOR, RADIUS } from '../theme/tokens';
import { useRevealFrames, useTextScale } from '../directed/reveal';

interface ChartBar {
  label: string;
  value: number;
  color?: string;
  /** Display override (e.g. "400+", "~2,000"); defaults to String(value) */
  display?: string;
}

interface AnimatedChartProps extends TimingProps {
  /** Chart type */
  type: 'bar' | 'line';
  data: ChartBar[] | number[];
  labels?: string[];
  title?: string;
  /** Max value for scaling (auto if not set) */
  maxValue?: number;
  accent?: string;
  bg?: string;
  /** Frames between bar/point appearances */
  stagger?: number;
  debug?: boolean;
}

/**
 * AnimatedChart — bars/lines that draw themselves.
 *
 * Every explainer needs this. StatSlide does count-up numbers;
 * this does full data visualization with draw-in animation.
 *
 * Validation: all bars, labels, and title tracked.
 * Timing: stagger controls appearance rhythm.
 */
export const AnimatedChart: React.FC<AnimatedChartProps> = ({
  type,
  data,
  labels = [],
  title = '',
  maxValue,
  accent = COLOR.gold,
  bg = COLOR.nightPanel,
  stagger = 20,
  debug = false,
  enterDuration = DEFAULT_TIMING.enterDuration,
  exitDuration = DEFAULT_TIMING.exitDuration,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const revealFrames = useRevealFrames();
  const ts = useTextScale();
  // Spoken cue per bar/point when directed; otherwise the fixed stagger.
  const appearAt = (i: number) => revealFrames?.[i] ?? i * stagger;

  const { enter, exit } = getAnimationProgress(frame, durationInFrames, enterDuration, exitDuration);

  // Normalize data
  const bars: ChartBar[] = useMemo(() => {
    if (type === 'bar') {
      return data as ChartBar[];
    }
    // Line chart: convert numbers to bars
    return (data as number[]).map((v, i) => ({
      label: labels[i] || `P${i + 1}`,
      value: v,
    }));
  }, [type, data, labels]);

  const max = maxValue || Math.max(...bars.map(b => b.value), 1);

  const chartLeft = width * 0.12;
  const chartRight = width * 0.92;
  const chartTop = height * 0.22;
  const chartBottom = height * 0.78;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  const trackedElements = useMemo((): TrackedElement[] => {
    const els: TrackedElement[] = [];
    if (title) {
      els.push({
        id: 'title', type: 'text', content: title,
        fontSize: height * 0.04 * ts, fontWeight: 'bold',
        x: width * 0.05, y: height * 0.05,
        width: width * 0.9, height: height * 0.06,
      });
    }
    bars.forEach((bar, i) => {
      els.push({
        id: `bar-label-${i}`, type: 'text', content: bar.label,
        fontSize: height * 0.024 * ts,
        x: chartLeft + (i / bars.length) * chartWidth,
        y: chartBottom + 8,
        width: chartWidth / bars.length, height: 30,
      });
    });
    return els;
  }, [title, bars, width, height, chartLeft, chartWidth, chartBottom]);

  useElementTracker(trackedElements, {
    checkOverlaps: true,
    allowedOverlap: 5,
    debug,
    componentName: 'AnimatedChart',
  });

  if (type === 'bar') {
    const barWidth = (chartWidth / bars.length) * 0.6;
    const gap = (chartWidth / bars.length) * 0.4;

    return (
      <div style={{
        width, height, backgroundColor: bg,
        position: 'relative', overflow: 'hidden',
        opacity: Math.min(enter * 2, exit * 2, 1),
        fontFamily: FONT.text,
      }}>
        {title && (
          <div style={{
            position: 'absolute', top: height * 0.05, left: 0, right: 0,
            textAlign: 'center', fontSize: height * 0.04 * ts, fontWeight: 'bold',
            color: COLOR.onNight,
          }}>{title}</div>
        )}

        {/* Axes */}
        <div style={{
          position: 'absolute', left: chartLeft, top: chartTop,
          width: 2, height: chartHeight, backgroundColor: COLOR.onNightMuted,
        }} />
        <div style={{
          position: 'absolute', left: chartLeft, top: chartBottom,
          width: chartWidth, height: 2, backgroundColor: COLOR.onNightMuted,
        }} />

        {/* Bars */}
        {bars.map((bar, i) => {
          const appearFrame = appearAt(i);
          if (frame < appearFrame) return null;

          const barHeight = (bar.value / max) * chartHeight;
          const growProgress = interpolate(
            frame,
            [appearFrame, appearFrame + 30],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );
          // Ease out for natural growth
          const eased = 1 - Math.pow(1 - growProgress, 3);
          const currentHeight = barHeight * eased;

          const x = chartLeft + (i / bars.length) * chartWidth + gap / 2;
          const color = bar.color || accent;

          return (
            <div key={i}>
              <div style={{
                position: 'absolute',
                left: x, top: chartBottom - currentHeight,
                width: barWidth, height: Math.max(1, currentHeight),
                backgroundColor: color,
                borderRadius: `${RADIUS.sm}px ${RADIUS.sm}px 0 0`,
                boxShadow: `0 0 15px ${color}44`,
              }} />
              {/* Value label */}
              <div data-guard-item={`value ${i + 1}`} style={{
                position: 'absolute',
                left: x - 20, top: chartBottom - currentHeight - 30,
                width: barWidth + 40, textAlign: 'center',
                fontSize: height * 0.026 * ts, fontWeight: 'bold',
                color: COLOR.onNight,
                opacity: growProgress,
              }}>
                {bar.display ?? String(bar.value)}
              </div>
              {/* Category label */}
              <div data-guard-item={`label ${i + 1}`} style={{
                position: 'absolute',
                left: x - 30, top: chartBottom + 10,
                width: barWidth + 60, textAlign: 'center',
                fontSize: height * 0.024 * ts, color: COLOR.onNightMuted,
                opacity: growProgress,
              }}>
                {bar.label}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Line chart
  const points = bars.map((bar, i) => ({
    // Single point: centre it (avoid 0/0 = NaN)
    x: bars.length > 1 ? chartLeft + (i / (bars.length - 1)) * chartWidth : chartLeft + chartWidth / 2,
    y: chartBottom - (bar.value / max) * chartHeight,
    label: bar.label,
    value: bar.value,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const drawProgress = interpolate(frame, [0, Math.max(1, appearAt(bars.length - 1) + stagger)], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{
      width, height, backgroundColor: bg,
      position: 'relative', overflow: 'hidden',
      opacity: Math.min(enter * 2, exit * 2, 1),
      fontFamily: FONT.text,
    }}>
      {title && (
        <div style={{
          position: 'absolute', top: height * 0.05, left: 0, right: 0,
          textAlign: 'center', fontSize: height * 0.04 * ts, fontWeight: 'bold',
          color: COLOR.onNight,
        }}>{title}</div>
      )}

      <svg width={width} height={height} style={{ position: 'absolute' }}>
        {/* Grid */}
        {[0.25, 0.5, 0.75].map(frac => (
          <line key={frac}
            x1={chartLeft} y1={chartTop + frac * chartHeight}
            x2={chartRight} y2={chartTop + frac * chartHeight}
            stroke={COLOR.nightPanel} strokeWidth={1} strokeDasharray="4 4" opacity={0.5}
          />
        ))}
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={accent}
          strokeWidth={4}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - drawProgress}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Points */}
        {points.map((p, i) => {
          const appearFrame = appearAt(i);
          if (frame < appearFrame) return null;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={8} fill={accent} stroke={COLOR.onNight} strokeWidth={3} />
              <text x={p.x} y={p.y - 18} textAnchor="middle"
                fill={COLOR.onNight} fontSize={height * 0.026 * ts} fontWeight="bold">
                {p.value}
              </text>
              <text x={p.x} y={chartBottom + 25} textAnchor="middle"
                fill={COLOR.onNightMuted} fontSize={height * 0.024 * ts}>
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
