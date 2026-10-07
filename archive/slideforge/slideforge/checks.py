"""Visual validations: catch what eyeballing catches, automatically.

These run against a rendered frame plus the text elements the slide
registered while drawing it (see Slide._register_text). They catch:

- check_contrast: text too close in luminance to its background
  (the illegible MapNote sub-labels)
- check_bounds: text overflowing the frame edges
- check_min_size: type too small to read at the render size
- check_collisions: text elements overlapping each other
  (thin wrapper over slideforge.layout)

Each returns a list of human-readable issue strings; [] means clean.
Thresholds are conservative — they'd rather miss a borderline case than
cry wolf on a stylistic choice.
"""

from .layout import detect_collisions


def _luminance(rgb):
    r, g, b = (c / 255.0 for c in rgb[:3])

    def lin(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def contrast_ratio(c1, c2):
    """WCAG contrast ratio between two RGB colors (1..21)."""
    l1, l2 = _luminance(c1), _luminance(c2)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def check_contrast(frame, elements, min_ratio=3.0):
    """Flag text whose color is too close to what's behind it.

    frame: HxWx3 RGB array. elements: [{"key", "box", "color"}, ...].
    The background is estimated from the box's border pixels (the text
    itself would skew a whole-box average).
    """
    import numpy as np
    issues = []
    h, w = frame.shape[:2]
    for el in elements:
        x0, y0, x1, y1 = [int(round(v)) for v in el["box"]]
        x0, y0 = max(0, x0), max(0, y0)
        x1, y1 = min(w, x1), min(h, y1)
        if x1 - x0 < 8 or y1 - y0 < 8:
            continue
        crop = frame[y0:y1, x0:x1]
        # border ring ≈ background (avoids the glyph pixels inside)
        ring = np.concatenate([
            crop[0, :].reshape(-1, 3), crop[-1, :].reshape(-1, 3),
            crop[:, 0].reshape(-1, 3), crop[:, -1].reshape(-1, 3),
        ])
        bg = tuple(int(v) for v in ring.mean(axis=0))
        ratio = contrast_ratio(el["color"], bg)
        if ratio < min_ratio:
            issues.append(
                f"{el['key']!r} low contrast ({ratio:.1f}:1 < {min_ratio}:1): "
                f"text {tuple(el['color'][:3])} on ~{bg} — "
                f"add a backing pill or darken/lighten the text")
    return issues


def check_bounds(elements, w, h):
    """Flag text boxes that overflow the frame."""
    issues = []
    for el in elements:
        x0, y0, x1, y1 = el["box"]
        over = []
        if x0 < 0:
            over.append(f"left by {-x0:.0f}px")
        if y0 < 0:
            over.append(f"top by {-y0:.0f}px")
        if x1 > w:
            over.append(f"right by {x1 - w:.0f}px")
        if y1 > h:
            over.append(f"bottom by {y1 - h:.0f}px")
        if over:
            issues.append(
                f"{el['key']!r} overflows the frame "
                f"({', '.join(over)}) — shorten the text or reduce size")
    return issues


def check_min_size(elements, frame_h, min_px_at_720=18):
    """Flag type too small to read. Threshold scales with frame height."""
    min_px = min_px_at_720 * frame_h / 720.0
    issues = []
    for el in elements:
        size = el.get("size_px")
        if size is not None and size < min_px:
            issues.append(
                f"{el['key']!r} type is {size:.0f}px "
                f"(min readable ~{min_px:.0f}px at {frame_h}p) — "
                f"increase the size")
    return issues


def check_collisions(elements):
    """Flag overlapping text boxes. Elements named like 'title' or marked
    fixed=True are treated as obstacles; the rest are all checked pairwise."""
    boxes = {el["key"]: el["box"] for el in elements}
    issues = []
    for a, b, area in detect_collisions(boxes):
        issues.append(
            f"{a!r} overlaps {b!r} ({area:.0f}px²) — "
            f"move one of them or run it through slideforge.layout")
    return issues
