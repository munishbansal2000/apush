import React, { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import {
  validateProportions,
  proportional,
  getResolution,
} from './proportions';

export interface ProportionElement {
  id: string;
  fontSize?: number;
  role?: 'title' | 'heading' | 'body' | 'caption';
  naturalWidth?: number;
  naturalHeight?: number;
  renderWidth?: number;
  renderHeight?: number;
  spacing?: { value: number; referenceSize: number; type: 'padding' | 'margin' | 'gap' };
}

/**
 * Hook for proportionality validation.
 * Enforces: text sizes, aspect ratios, spacing, hierarchy.
 *
 * Usage:
 * const { valid, issues, px } = useProportions([
 *   { id: 'title', fontSize: 48, role: 'title' },
 *   { id: 'hero-img', naturalWidth: 1920, naturalHeight: 1080, renderWidth: 800, renderHeight: 450 },
 * ], { debug: true });
 *
 * // px() scales a 720p-base value to current resolution
 * const titleSize = px(54); // 54px at 720p → scaled proportionally
 */
export function useProportions(
  elements: ProportionElement[],
  options: {
    debug?: boolean;
    componentName?: string;
  } = {}
) {
  const { width, height } = useVideoConfig();
  const { debug = false, componentName = 'Slide' } = options;

  const result = useMemo(() => {
    const issues = validateProportions(elements, width, height);
    return {
      valid: !issues.some(i => i.severity === 'error'),
      issues,
      resolution: getResolution(height),
    };
  }, [elements, width, height]);

  // Proportional scaling helper (720p base)
  const px = (baseValue: number): number => proportional(baseValue, height, 720);

  React.useEffect(() => {
    if (debug && result.issues.length > 0) {
      console.group(`[${componentName} proportions] (${result.resolution})`);
      for (const issue of result.issues) {
        const fn = issue.severity === 'error' ? console.error : console.warn;
        fn(`${issue.componentId}: ${issue.message}`, issue.suggestion ? `→ ${issue.suggestion}` : '');
      }
      console.groupEnd();
    }
  }, [debug, result.issues, result.resolution, componentName]);

  return { ...result, px };
}

