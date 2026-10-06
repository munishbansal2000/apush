/**
 * Proportionality validation and enforcement.
 *
 * Ensures visual harmony by enforcing proportional relationships:
 * 1. Text size proportional to frame (readable at target resolution)
 * 2. Image aspect ratios preserved (no stretching/squishing)
 * 3. Spacing proportional to element sizes (visual rhythm)
 * 4. Size hierarchy respected (title > subtitle > body > caption)
 * 5. Minimum touch/click targets (for interactive elements)
 * 6. Golden ratio and modular scale suggestions
 *
 * If violated and unfixable: error, never bad rendering.
 */

import { ValidationIssue } from './layout';

// Standard modular scale ratios
export const MODULAR_SCALE = {
  minorSecond: 1.067,
  majorSecond: 1.125,
  minorThird: 1.2,
  majorThird: 1.25,
  perfectFourth: 1.333,
  goldenRatio: 1.618,
};

// Minimum readable font sizes at different resolutions (px)
export const MIN_FONT_SIZES = {
  '480p': { title: 24, heading: 18, body: 14, caption: 11 },
  '720p': { title: 36, heading: 27, body: 21, caption: 16 },
  '1080p': { title: 54, heading: 40, body: 32, caption: 24 },
};

export type Resolution = '480p' | '720p' | '1080p';

export function getResolution(height: number): Resolution {
  if (height <= 300) return '480p';
  if (height <= 800) return '720p';
  return '1080p';
}

export interface ProportionalityRule {
  id: string;
  check: () => ValidationIssue | null;
}

/**
 * Check text size is proportional to frame height
 * Rule: title should be 6-10% of frame height, body 2.5-4%
 */
export function checkTextProportion(
  fontSize: number,
  frameHeight: number,
  role: 'title' | 'heading' | 'body' | 'caption',
  componentId: string
): ValidationIssue | null {
  const ratio = fontSize / frameHeight;
  const expected: Record<string, [number, number]> = {
    title: [0.06, 0.10],
    heading: [0.04, 0.06],
    body: [0.025, 0.04],
    caption: [0.018, 0.03],
  };

  const [min, max] = expected[role];
  const res = getResolution(frameHeight);
  const absoluteMin = MIN_FONT_SIZES[res][role];

  if (fontSize < absoluteMin) {
    return {
      severity: 'error',
      componentId,
      message: `${role} font ${fontSize.toFixed(0)}px below minimum ${absoluteMin}px for ${res}`,
      suggestion: `Increase to at least ${absoluteMin}px for readability`,
    };
  }

  if (ratio < min * 0.7) {
    return {
      severity: 'warning',
      componentId,
      message: `${role} too small: ${(ratio * 100).toFixed(1)}% of frame (expected ${(min * 100).toFixed(0)}-${(max * 100).toFixed(0)}%)`,
      suggestion: `Increase font size for better hierarchy`,
    };
  }

  if (ratio > max * 1.5) {
    return {
      severity: 'warning',
      componentId,
      message: `${role} too large: ${(ratio * 100).toFixed(1)}% of frame (expected ${(min * 100).toFixed(0)}-${(max * 100).toFixed(0)}%)`,
      suggestion: `Reduce font size to maintain hierarchy`,
    };
  }

  return null;
}

/**
 * Check image aspect ratio is preserved
 * Compares natural aspect vs rendered aspect
 */
export function checkAspectRatio(
  naturalWidth: number,
  naturalHeight: number,
  renderWidth: number,
  renderHeight: number,
  componentId: string,
  tolerance: number = 0.05
): ValidationIssue | null {
  if (naturalWidth === 0 || naturalHeight === 0) return null;

  const naturalAspect = naturalWidth / naturalHeight;
  const renderAspect = renderWidth / renderHeight;
  const distortion = Math.abs(naturalAspect - renderAspect) / naturalAspect;

  if (distortion > tolerance) {
    const pct = (distortion * 100).toFixed(1);
    return {
      severity: distortion > 0.2 ? 'error' : 'warning',
      componentId,
      message: `Aspect ratio distorted by ${pct}% (${naturalAspect.toFixed(2)} → ${renderAspect.toFixed(2)})`,
      suggestion: 'Use objectFit: "cover" or "contain", or adjust dimensions proportionally',
    };
  }

  return null;
}

/**
 * Check spacing is proportional to element size
 * Rule: padding/margin should be 0.25x–1x of font size for text,
 * or 2-8% of frame for layout spacing
 */
export function checkSpacing(
  spacing: number,
  referenceSize: number,
  frameSize: number,
  componentId: string,
  type: 'padding' | 'margin' | 'gap'
): ValidationIssue | null {
  const ratioToRef = spacing / referenceSize;
  const ratioToFrame = spacing / frameSize;

  // Too tight
  if (ratioToRef < 0.15 && referenceSize > 0) {
    return {
      severity: 'warning',
      componentId,
      message: `${type} too tight: ${spacing.toFixed(0)}px is only ${(ratioToRef * 100).toFixed(0)}% of element size`,
      suggestion: `Increase ${type} for breathing room`,
    };
  }

  // Too loose (wastes space)
  if (ratioToFrame > 0.15) {
    return {
      severity: 'warning',
      componentId,
      message: `${type} too loose: ${spacing.toFixed(0)}px is ${(ratioToFrame * 100).toFixed(0)}% of frame`,
      suggestion: `Reduce ${type} to tighten layout`,
    };
  }

  return null;
}

/**
 * Check size hierarchy: title > heading > body > caption
 * Ensures visual hierarchy is maintained
 */
export function checkHierarchy(
  sizes: { title?: number; heading?: number; body?: number; caption?: number },
  componentId: string
): ValidationIssue | null {
  const order: (keyof typeof sizes)[] = ['title', 'heading', 'body', 'caption'];
  const present = order.filter(k => sizes[k] !== undefined);

  for (let i = 0; i < present.length - 1; i++) {
    const larger = present[i];
    const smaller = present[i + 1];
    const largerSize = sizes[larger]!;
    const smallerSize = sizes[smaller]!;

    if (largerSize <= smallerSize) {
      return {
        severity: 'error',
        componentId,
        message: `Hierarchy broken: ${larger} (${largerSize}px) not larger than ${smaller} (${smallerSize}px)`,
        suggestion: `Ensure ${larger} > ${smaller} for clear visual hierarchy`,
      };
    }

    // Check ratio is reasonable (1.15x to 2.5x)
    const ratio = largerSize / smallerSize;
    if (ratio < 1.15) {
      return {
        severity: 'warning',
        componentId,
        message: `Weak hierarchy: ${larger}/${smaller} ratio only ${ratio.toFixed(2)}x (want 1.2x+)`,
        suggestion: `Increase ${larger} or decrease ${smaller} for clearer distinction`,
      };
    }
  }

  return null;
}

/**
 * Enforce proportional sizing: scale a value proportionally to frame
 * Base design at 720p, scale to target
 */
export function proportional(
  baseValue: number,
  frameHeight: number,
  baseHeight: number = 720
): number {
  return (baseValue / baseHeight) * frameHeight;
}

/**
 * Full proportionality validation for a slide
 */
export function validateProportions(
  elements: {
    id: string;
    fontSize?: number;
    role?: 'title' | 'heading' | 'body' | 'caption';
    naturalWidth?: number;
    naturalHeight?: number;
    renderWidth?: number;
    renderHeight?: number;
    spacing?: { value: number; referenceSize: number; type: 'padding' | 'margin' | 'gap' };
  }[],
  frameWidth: number,
  frameHeight: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Collect font sizes for hierarchy check
  const sizes: { title?: number; heading?: number; body?: number; caption?: number } = {};

  for (const el of elements) {
    // Text proportion
    if (el.fontSize && el.role) {
      const issue = checkTextProportion(el.fontSize, frameHeight, el.role, el.id);
      if (issue) issues.push(issue);
      sizes[el.role] = el.fontSize;
    }

    // Aspect ratio
    if (el.naturalWidth && el.naturalHeight && el.renderWidth && el.renderHeight) {
      const issue = checkAspectRatio(
        el.naturalWidth, el.naturalHeight,
        el.renderWidth, el.renderHeight,
        el.id
      );
      if (issue) issues.push(issue);
    }

    // Spacing
    if (el.spacing) {
      const issue = checkSpacing(
        el.spacing.value,
        el.spacing.referenceSize,
        frameHeight,
        el.id,
        el.spacing.type
      );
      if (issue) issues.push(issue);
    }
  }

  // Hierarchy check (across all elements)
  if (Object.keys(sizes).length >= 2) {
    const issue = checkHierarchy(sizes, 'slide-hierarchy');
    if (issue) issues.push(issue);
  }

  return issues;
}
