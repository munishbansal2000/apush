import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import {
  Bounds,
  ValidationIssue,
  validateLayout,
  estimateTextWidth,
} from './layout';

/**
 * Per-element validation tracker.
 *
 * Every visual element in a slide registers itself:
 * - Text elements: id, estimated bounds from font size
 * - Image elements: id, position + dimensions
 * - Shapes: id, position + dimensions
 *
 * The tracker validates ALL elements:
 * 1. Each against frame bounds (no out-of-bounds)
 * 2. Each text against its container (no overflow/cutting)
 * 3. All pairs against each other (no bad overlaps)
 *
 * If unresolvable: returns issues with severity error/warning.
 * The component should warn/fail, never render bad.
 */

export interface TrackedElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  /** For text: the string. For image/shape: description */
  content: string;
  /** Font size in px (text only) */
  fontSize?: number;
  /** Font weight (text only) */
  fontWeight?: string;
  /** Position */
  x: number;
  y: number;
  /** Dimensions (or max allowed) */
  width: number;
  height: number;
  /** Max width for text wrapping (if different from width) */
  maxWidth?: number;
}

export function useElementTracker(
  elements: TrackedElement[],
  options: {
    checkOverlaps?: boolean;
    allowedOverlap?: number;
    debug?: boolean;
    componentName?: string;
  } = {}
) {
  const { width: frameWidth, height: frameHeight } = useVideoConfig();
  const {
    checkOverlaps = true,
    allowedOverlap = 0,
    debug = false,
    componentName = 'Slide',
  } = options;

  const result = useMemo(() => {
    const issues: ValidationIssue[] = [];
    const bounds: Bounds[] = [];

    for (const el of elements) {
      // For text: estimate actual width, use it for bounds
      let effectiveWidth = el.width;
      let effectiveHeight = el.height;

      if (el.type === 'text' && el.fontSize) {
        const estimatedWidth = estimateTextWidth(
          el.content,
          el.fontSize,
          el.fontWeight || 'normal'
        );
        // Text height heuristic: line height ~1.4 × font size, wrap if needed
        const maxW = el.maxWidth || el.width;
        const lines = Math.ceil(estimatedWidth / maxW);
        effectiveWidth = Math.min(estimatedWidth, maxW);
        effectiveHeight = el.fontSize * 1.4 * lines;

        // Check text fit
        if (estimatedWidth > maxW * 1.5 && lines > 3) {
          issues.push({
            severity: 'warning',
            componentId: el.id,
            message: `Text wraps to ${lines} lines — may look cramped`,
            suggestion: 'Shorten text or increase container width',
          });
        }
      }

      bounds.push({
        id: el.id,
        type: el.type,
        x: el.x,
        y: el.y,
        width: effectiveWidth,
        height: effectiveHeight,
      });
    }

    // Run full validation
    const validation = validateLayout(bounds, frameWidth, frameHeight, {
      checkOverlaps,
      allowedOverlap,
    });
    issues.push(...validation.issues);

    return {
      valid: !issues.some(i => i.severity === 'error'),
      issues,
      bounds, // For debugging/visualization
    };
  }, [elements, frameWidth, frameHeight, checkOverlaps, allowedOverlap]);

  // Log in debug mode
  React.useEffect(() => {
    if (debug && result.issues.length > 0) {
      console.group(`[${componentName} validation]`);
      for (const issue of result.issues) {
        const fn = issue.severity === 'error' ? console.error : console.warn;
        fn(`${issue.componentId}: ${issue.message}`, issue.suggestion ? `→ ${issue.suggestion}` : '');
      }
      console.groupEnd();
    }
  }, [debug, result.issues, componentName]);

  return result;
}
