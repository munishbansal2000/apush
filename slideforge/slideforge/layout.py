"""Text layout: track text-element bounds, detect collisions, and resolve them.

When a slide draws more than one text element (titles, labels, pills, pins),
their boxes are registered here. ``Layout.resolve()`` then:

1. detects every overlap,
2. nudges lower-priority boxes out of the way (smallest move that clears),
3. shrinks the font when nudging can't help (if the element allows it),
4. returns warnings for anything still colliding.

Usage::

    lo = Layout(w, h)
    lo.add_fixed("title", title_box, priority=100)   # never moves
    lo.add("pill", box=pill_box, priority=10)        # nudged if needed
    lo.add("note", measure=measure_fn, font_size=30, min_font_size=22)
    resolved, warnings = lo.resolve()
    # resolved["pill"] -> (x0, y0, x1, y1), possibly moved/shrunk

Boxes are (x0, y0, x1, y1) in pixels. Higher priority wins; equal priority
is resolved in insertion order.
"""

import math


def _overlap(a, b):
    """Overlap area of two boxes; 0 when they don't touch."""
    x0 = max(a[0], b[0])
    y0 = max(a[1], b[1])
    x1 = min(a[2], b[2])
    y1 = min(a[3], b[3])
    return max(0.0, x1 - x0) * max(0.0, y1 - y0)


def _shift(box, dx, dy):
    return (box[0] + dx, box[1] + dy, box[2] + dx, box[3] + dy)


def _in_bounds(box, w, h, margin=4):
    return (box[0] >= margin and box[1] >= margin and
            box[2] <= w - margin and box[3] <= h - margin)


def detect_collisions(boxes):
    """boxes: {key: (x0,y0,x1,y1)}. Returns [(key_a, key_b, area), ...]."""
    keys = list(boxes)
    out = []
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            area = _overlap(boxes[keys[i]], boxes[keys[j]])
            if area > 0:
                out.append((keys[i], keys[j], area))
    return out


class Layout:
    """Collect text boxes, then resolve collisions by nudge/shrink/warn."""

    # nudge search: (step_px, 8 compass directions), smallest first
    STEPS = (6, 12, 20, 32, 48, 72, 104)
    DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1),
            (1, 1), (-1, -1), (1, -1), (-1, 1)]
    SHRINK_FACTOR = 0.85

    def __init__(self, w, h):
        self.w = w
        self.h = h
        self._items = {}   # key -> dict
        self._order = []   # insertion order

    def add_fixed(self, key, box, priority=100):
        """An obstacle: never moves, everything else avoids it."""
        self._items[key] = {"box": tuple(box), "priority": priority,
                            "movable": False, "measure": None}
        self._order.append(key)
        return self

    def add(self, key, box=None, measure=None, font_size=None,
            min_font_size=None, priority=0, movable=True):
        """A text element. Either a static ``box`` (nudged as a whole) or a
        ``measure(font_size) -> box`` callable plus ``font_size`` /
        ``min_font_size`` for shrinkable text."""
        if box is None and measure is None:
            raise ValueError(f"layout {key!r}: need box= or measure=")
        if measure is not None and font_size is None:
            raise ValueError(f"layout {key!r}: measure= needs font_size=")
        self._items[key] = {
            "box": tuple(box) if box is not None else measure(font_size),
            "priority": priority, "movable": movable,
            "measure": measure, "font_size": font_size,
            "min_font_size": min_font_size,
        }
        self._order.append(key)
        return self

    # -- resolution ----------------------------------------------------

    def resolve(self):
        """Returns (resolved_boxes, warnings).

        resolved_boxes: {key: (x0, y0, x1, y1)} with collisions removed
        where possible. warnings: human-readable strings for the rest.
        """
        warnings = []
        # highest priority first; ties keep insertion order
        ranked = sorted(self._order,
                        key=lambda k: (-self._items[k]["priority"],
                                       self._order.index(k)))
        placed = {}   # key -> box, already fixed in final position
        for key in ranked:
            item = self._items[key]
            box = item["box"]
            if not item["movable"]:
                placed[key] = box
                continue
            box, fs = self._place(key, item, placed, warnings)
            placed[key] = box
            item["box"] = box
            if fs is not None:
                item["font_size"] = fs
        return {k: self._items[k]["box"] for k in self._order}, warnings

    def _collides(self, box, placed, ignore=()):
        return any(_overlap(box, pbox) > 0
                   for k, pbox in placed.items() if k not in ignore)

    def _place(self, key, item, placed, warnings):
        box = item["box"]
        if not self._collides(box, placed):
            return box, item["font_size"]
        # 1) nudge: smallest displacement that clears, staying in bounds
        for step in self.STEPS:
            for dx, dy in self.DIRS:
                n = _normalize(dx, dy)
                cand = _shift(box, n[0] * step, n[1] * step)
                if _in_bounds(cand, self.w, self.h) and \
                        not self._collides(cand, placed):
                    return cand, item["font_size"]
        # 2) shrink the font and try nudging again at each smaller size
        if item["measure"] is not None and item["min_font_size"]:
            fs = item["font_size"]
            while fs * self.SHRINK_FACTOR >= item["min_font_size"]:
                fs = fs * self.SHRINK_FACTOR
                small = item["measure"](fs)
                # keep the element centered where it was
                cx = (box[0] + box[2]) / 2
                cy = (box[1] + box[3]) / 2
                scx = (small[0] + small[2]) / 2
                scy = (small[1] + small[3]) / 2
                small = _shift(small, cx - scx, cy - scy)
                if not self._collides(small, placed) and \
                        _in_bounds(small, self.w, self.h):
                    return small, fs
                for step in self.STEPS:
                    for dx, dy in self.DIRS:
                        n = _normalize(dx, dy)
                        cand = _shift(small, n[0] * step, n[1] * step)
                        if _in_bounds(cand, self.w, self.h) and \
                                not self._collides(cand, placed):
                            return cand, fs
        # 3) give up: keep the original spot, warn loudly
        worst = max(((_overlap(box, pbox), k)
                     for k, pbox in placed.items()),
                    default=(0, None))
        other = worst[1]
        warnings.append(
            f"{key!r} collides with {other!r} "
            f"({worst[0]:.0f}px² overlap) and could not be moved or "
            f"shrunk clear — adjust its position or text by hand")
        return box, item["font_size"]


def _normalize(dx, dy):
    m = math.hypot(dx, dy)
    return (dx / m, dy / m)
