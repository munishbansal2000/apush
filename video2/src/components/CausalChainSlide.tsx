import React, { useId, useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { useElementTracker, TrackedElement } from '../validation/tracker';
import { TimingProps } from '../validation/timing';
import { FONT, COLOR, TYPE, RADIUS, MOTION, alpha } from '../theme/tokens';
import { useRevealFrames, useTextScale } from '../directed/reveal';

interface CausalChainSlideProps extends TimingProps {
  nodes: (string | [string, string])[];
  title?: string;
  accent?: string;
  bg?: string;
  /** Frames between node appearances */
  stagger?: number;
  /** Frames for arrow draw animation */
  arrow_dur?: number;
  debug?: boolean;
}

/** Horizontal node layout, kept inside the 5% safe margins (the old formula left 14px at the edge for 4 nodes). */
export function chainLayout(n: number, width: number) {
  const gap = 60; // room for the arrows
  const nodeWidth = Math.min(width * 0.22, (width * 0.9 - (n - 1) * gap) / n);
  const totalWidth = n * nodeWidth + (n - 1) * gap;
  return {gap, nodeWidth, totalWidth, startX: (width - totalWidth) / 2};
}

/**
 * CausalChainSlide — ported from slideforge.
 *
 * Python: CausalChainSlide(nodes=[(label, sub)], title, stagger=0.9, arrow_dur=0.7)
 * Remotion: Same interface. SVG path-draw animation for arrows.
 *
 * Quality delta: PIL draws arrows frame-by-frame (painful). Remotion uses
 * SVG stroke-dashoffset — arrows literally draw themselves between nodes.
 * Spring entrances make each node land with weight.
 */
export const CausalChainSlide: React.FC<CausalChainSlideProps> = ({
  nodes,
  title = '',
  accent = COLOR.gold,
  bg = COLOR.nightPanel,
  stagger = 27, // ~0.9s at 30fps
  arrow_dur = 21, // ~0.7s at 30fps
  debug = false,
}) => {
  const frame = useCurrentFrame();
  const arrowId = `arrowhead-${useId().replace(/:/g, '')}`;
  const { width, height, fps } = useVideoConfig();
  const revealFrames = useRevealFrames();
  const ts = useTextScale();
  // Spoken cue per node when directed; otherwise the fixed stagger.
  const appearAt = (i: number) => revealFrames?.[i] ?? i * stagger;

  // Normalize nodes to [label, sub]
  const normalizedNodes = useMemo(() => {
    return nodes.map(n => Array.isArray(n) ? n : [n, ''] as [string, string]);
  }, [nodes]);

  const n = normalizedNodes.length;
  const {gap, nodeWidth, startX} = chainLayout(n, width);
  const nodeHeight = height * 0.28;
  const nodeY = height * 0.38;

  // Track all nodes for validation
  const trackedElements = useMemo((): TrackedElement[] => {
    const els: TrackedElement[] = [];
    if (title) {
      els.push({
        id: 'title', type: 'text', content: title,
        fontSize: height * 0.045, fontWeight: 'bold',
        x: width * 0.05, y: height * 0.08,
        width: width * 0.9, height: height * 0.07,
      });
    }
    normalizedNodes.forEach(([label, sub], i) => {
      const x = startX + i * (nodeWidth + gap);
      els.push({
        id: `node-${i}`, type: 'text', content: label,
        fontSize: height * 0.032, fontWeight: 'bold',
        x, y: nodeY, width: nodeWidth, height: nodeHeight,
      });
    });
    return els;
  }, [title, normalizedNodes, width, height, startX, nodeWidth, nodeY, nodeHeight]);

  useElementTracker(trackedElements, {
    checkOverlaps: true,
    allowedOverlap: 0,
    debug,
    componentName: 'CausalChainSlide',
  });

  // Node positions
  const nodePositions = normalizedNodes.map((_, i) => ({
    x: startX + i * (nodeWidth + gap),
    y: nodeY,
    centerX: startX + i * (nodeWidth + gap) + nodeWidth / 2,
  }));

  return (
    <div style={{ width, height, backgroundColor: bg, position: 'relative', overflow: 'hidden', fontFamily: FONT.text }}>
      {/* Title */}
      {title && (
        <div style={{
          position: 'absolute', top: height * 0.08, left: 0, right: 0,
          textAlign: 'center', fontSize: height * 0.045 * ts, fontWeight: 'bold',
          color: COLOR.onNight, zIndex: 10,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
        }}>
          {title}
        </div>
      )}

      {/* SVG arrows (drawn between nodes) */}
      <svg width={width} height={height} style={{ position: 'absolute', zIndex: 5 }}>
        <defs>
          <marker id={arrowId} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={accent} />
          </marker>
        </defs>
        {nodePositions.slice(0, -1).map((pos, i) => {
          // The arrow draws into the next node as it lands.
          const arrowStartFrame = Math.max(appearAt(i), appearAt(i + 1) - arrow_dur);
          if (frame < arrowStartFrame) return null;

          const x1 = pos.centerX + nodeWidth / 2;
          const x2 = nodePositions[i + 1].centerX - nodeWidth / 2;
          const y = nodeY + nodeHeight / 2;

          // Path draw animation
          const drawProgress = interpolate(
            frame,
            [arrowStartFrame, arrowStartFrame + arrow_dur],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );
          const pathLength = x2 - x1;

          return (
            <line
              key={`arrow-${i}`}
              x1={x1} y1={y} x2={x2} y2={y}
              stroke={accent}
              strokeWidth={4}
              strokeDasharray={pathLength}
              strokeDashoffset={pathLength * (1 - drawProgress)}
              markerEnd={`url(#${arrowId})`}
              opacity={0.9}
            />
          );
        })}
      </svg>

      {/* Nodes */}
      {normalizedNodes.map(([label, sub], i) => {
        const appearFrame = appearAt(i);
        if (frame < appearFrame) return null;

        const progress = spring({
          frame: frame - appearFrame,
          fps,
          config: MOTION.spring,
        });
        const scale = interpolate(progress, [0, 1], [0.6, 1]);
        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const y = interpolate(progress, [0, 1], [30, 0]);

        const pos = nodePositions[i];

        return (
          <div
            key={i}
            data-guard-item={`node ${i + 1}`}
            data-guard-moving={progress < 0.99 ? '' : undefined}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y + y,
              width: nodeWidth,
              height: nodeHeight,
              backgroundColor: COLOR.nightPanel,
              border: `2px solid ${accent}`,
              borderRadius: RADIUS.md,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              transform: `scale(${scale})`,
              opacity,
              zIndex: 6,
              boxShadow: `0 4px 20px ${alpha(COLOR.night, 0.5)}, 0 0 20px ${accent}22`,
            }}
          >
            {/* Node number */}
            <div style={{
              position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
              width: 28, height: 28, borderRadius: '50%',
              backgroundColor: accent, color: COLOR.nightPanel,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: TYPE.town, fontWeight: 'bold',
            }}>
              {i + 1}
            </div>
            <div style={{
              fontSize: height * 0.032 * ts, fontWeight: 'bold',
              color: COLOR.onNight, textAlign: 'center', lineHeight: 1.3,
            }}>
              {label}
            </div>
            {sub && (
              <div style={{
                fontSize: height * 0.024 * ts, color: COLOR.onNightMuted,
                textAlign: 'center', marginTop: 8, lineHeight: 1.4,
              }}>
                {sub}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
