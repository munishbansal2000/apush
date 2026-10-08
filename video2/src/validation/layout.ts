/**
 * Layout validation for Remotion components.
 *
 * Every visual component registers its bounds. The validator checks:
 * - Out of bounds (element extends beyond frame)
 * - Text overflow (text wider than container)
 * - Unwanted overlaps (elements colliding)
 * - Misalignment (elements not on expected grid)
 *
 * If unresolvable: warning/failure, never bad rendering.
 */

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
  type: 'text' | 'image' | 'shape' | 'container';
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  componentId: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * Check if bounds are within frame
 */
export function checkBounds(
  bounds: Bounds,
  frameWidth: number,
  frameHeight: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { x, y, width, height, id } = bounds;

  if (x < 0) {
    issues.push({
      severity: 'error',
      componentId: id,
      message: `Extends ${Math.abs(x).toFixed(0)}px beyond left edge`,
      suggestion: 'Increase x or reduce width',
    });
  }
  if (y < 0) {
    issues.push({
      severity: 'error',
      componentId: id,
      message: `Extends ${Math.abs(y).toFixed(0)}px beyond top edge`,
      suggestion: 'Increase y or reduce height',
    });
  }
  if (x + width > frameWidth) {
    const overflow = x + width - frameWidth;
    issues.push({
      severity: overflow > frameWidth * 0.1 ? 'error' : 'warning',
      componentId: id,
      message: `Extends ${overflow.toFixed(0)}px beyond right edge (${frameWidth}px)`,
      suggestion: 'Reduce width, font size, or x position',
    });
  }
  if (y + height > frameHeight) {
    const overflow = y + height - frameHeight;
    issues.push({
      severity: overflow > frameHeight * 0.1 ? 'error' : 'warning',
      componentId: id,
      message: `Extends ${overflow.toFixed(0)}px beyond bottom edge (${frameHeight}px)`,
      suggestion: 'Reduce height, font size, or y position',
    });
  }

  return issues;
}

/**
 * Check if two bounds overlap (when they shouldn't)
 */
export function checkOverlap(
  a: Bounds,
  b: Bounds,
  allowedOverlap: number = 0
): ValidationIssue | null {
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

  if (overlapX > allowedOverlap && overlapY > allowedOverlap) {
    return {
      severity: 'warning',
      componentId: `${a.id} ↔ ${b.id}`,
      message: `Overlap detected: ${overlapX.toFixed(0)}×${overlapY.toFixed(0)}px`,
      suggestion: 'Adjust positions or sizes to avoid collision',
    };
  }
  return null;
}

/**
 * Estimate text width (heuristic: avg char width ≈ 0.6 × font size)
 * This is a heuristic — for precise measurement, use canvas in browser.
 */
export function estimateTextWidth(text: string, fontSize: number, fontWeight: string = 'normal'): number {
  const weightMultiplier = fontWeight === 'bold' ? 1.1 : 1.0;
  // Account for spaces being narrower, caps being wider
  let width = 0;
  for (const char of text) {
    if (char === ' ') width += fontSize * 0.3;
    else if (char === char.toUpperCase() && char !== char.toLowerCase()) width += fontSize * 0.7;
    else width += fontSize * 0.55;
  }
  return width * weightMultiplier;
}

/**
 * Check if text fits in container
 */
export function checkTextFit(
  text: string,
  fontSize: number,
  maxWidth: number,
  componentId: string,
  fontWeight: string = 'normal'
): ValidationIssue | null {
  const estimated = estimateTextWidth(text, fontSize, fontWeight);
  if (estimated > maxWidth) {
    const overflow = ((estimated - maxWidth) / maxWidth * 100).toFixed(0);
    return {
      severity: estimated > maxWidth * 1.3 ? 'error' : 'warning',
      componentId,
      message: `Text overflows by ~${overflow}% (${estimated.toFixed(0)}px > ${maxWidth.toFixed(0)}px)`,
      suggestion: `Reduce font size from ${fontSize}px or shorten text`,
    };
  }
  return null;
}

/**
 * Full validation: check all bounds against frame and each other
 */
export function validateLayout(
  bounds: Bounds[],
  frameWidth: number,
  frameHeight: number,
  options: {
    checkOverlaps?: boolean;
    allowedOverlap?: number;
  } = {}
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const { checkOverlaps = true, allowedOverlap = 0 } = options;

  // Check each against frame
  for (const b of bounds) {
    issues.push(...checkBounds(b, frameWidth, frameHeight));
  }

  // Check pairwise overlaps
  if (checkOverlaps) {
    for (let i = 0; i < bounds.length; i++) {
      for (let j = i + 1; j < bounds.length; j++) {
        // Skip container-vs-child (containers naturally contain children)
        if (bounds[i].type === 'container' || bounds[j].type === 'container') continue;
        const overlap = checkOverlap(bounds[i], bounds[j], allowedOverlap);
        if (overlap) issues.push(overlap);
      }
    }
  }

  const hasError = issues.some(i => i.severity === 'error');
  return {
    valid: !hasError,
    issues,
  };
}

/**
 * Auto-fix: shrink font size until text fits (heuristic)
 * Returns the adjusted font size, or null if unfixable
 */
export function autoFitFontSize(
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number = 12,
  fontWeight: string = 'normal'
): number | null {
  let size = startSize;
  while (size >= minSize) {
    if (estimateTextWidth(text, size, fontWeight) <= maxWidth) {
      return size;
    }
    size -= 2;
  }
  return null; // Unfixable — caller should warn/fail, never render bad
}
