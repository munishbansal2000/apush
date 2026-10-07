"""Ken Burns camera: smooth pan & zoom over a still image.

A camera "view" is (cx, cy, fw):
    cx, cy — center of the view, as fractions of image width/height (0..1)
    fw     — view width as a fraction of image width; smaller = more zoomed in

The crop box always matches the output aspect ratio, so there is never
any stretching. Views are interpolated with easing for buttery moves.
"""

import numpy as np
from PIL import Image

from .timeline import Scene, Config
from .easing import ease_in_out


def full_view():
    """The whole image, no zoom."""
    return (0.5, 0.5, 1.0)


def zoom_on(cx, cy, zoom):
    """A view centered at (cx, cy) zoomed in by `zoom` (e.g. 2.5 = 2.5x)."""
    if zoom <= 0:
        raise ValueError(f"zoom must be > 0, got {zoom!r}")
    return (cx, cy, 1.0 / zoom)


def clamp_view(img_w, img_h, out_w, out_h, cx, cy, fw):
    ai = img_w / img_h
    ao = out_w / out_h
    fw_max = min(1.0, ao / ai)
    fw = min(max(fw, 0.04), fw_max)
    fh = fw * ai / ao
    cx = 0.5 if fw >= 1.0 else min(max(cx, fw / 2), 1 - fw / 2)
    cy = 0.5 if fh >= 1.0 else min(max(cy, fh / 2), 1 - fh / 2)
    return cx, cy, fw


def kb_frame(img, out_w, out_h, cx, cy, fw):
    """Render one Ken Burns frame from an RGB numpy image."""
    ih, iw = img.shape[:2]
    cx, cy, fw = clamp_view(iw, ih, out_w, out_h, cx, cy, fw)
    ai = iw / ih
    ao = out_w / out_h
    fh = fw * ai / ao
    x0 = int(round((cx - fw / 2) * iw))
    y0 = int(round((cy - fh / 2) * ih))
    x1 = int(round((cx + fw / 2) * iw))
    y1 = int(round((cy + fh / 2) * ih))
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(iw, x1), min(ih, y1)
    if x1 <= x0:
        x1 = x0 + 1
    if y1 <= y0:
        y1 = y0 + 1
    crop = img[y0:y1, x0:x1]
    return np.array(Image.fromarray(crop).resize((out_w, out_h), Image.BILINEAR))


def _lerp_view(a, b, k):
    return (a[0] + (b[0] - a[0]) * k,
            a[1] + (b[1] - a[1]) * k,
            a[2] + (b[2] - a[2]) * k)


class KenBurns(Scene):
    """A Scene that drifts the camera through a list of views.

    Each view is held for `hold` seconds; moves between views share the
    remaining time evenly and are eased (smooth by default).
    """

    def __init__(self, image, duration, stops, hold=1.0, ease=ease_in_out, cfg=None):
        if duration is None or duration <= 0:
            raise ValueError(f"KenBurns duration must be > 0, got {duration!r}")
        stops = list(stops)
        if not stops:
            raise ValueError("KenBurns stops must not be empty")
        # Accept dicts {"scale": s, "cx": x, "cy": y} or tuples (cx, cy, fw).
        # Dict scale 1.0 = full frame; fw = 1/scale.
        norm = []
        for st in stops:
            if isinstance(st, dict):
                try:
                    scale = float(st["scale"]); cx = float(st["cx"]); cy = float(st["cy"])
                except (KeyError, TypeError, ValueError):
                    raise ValueError(
                        f"KenBurns stop dict must have 'scale', 'cx', 'cy' "
                        f"(got {st!r})")
                norm.append((cx, cy, 1.0 / scale if scale > 0 else 1.0))
            else:
                norm.append(tuple(st))
        stops = norm
        super().__init__(duration, cfg)
        self.image = image  # RGB numpy array
        self.stops = stops
        self.hold = hold
        self.ease = ease
        self._segments = self._build_segments(duration)

    def _build_segments(self, duration):
        n = len(self.stops)
        if n == 1:
            return [(0.0, duration, self.stops[0], self.stops[0])]
        total_hold = self.hold * n
        move = max(0.3, (duration - total_hold) / (n - 1))
        # re-normalize so segments exactly fill duration
        total = total_hold + move * (n - 1)
        scale = duration / total if total > 0 else 1.0
        hold, move = self.hold * scale, move * scale
        segs, t = [], 0.0
        for i, stop in enumerate(self.stops):
            segs.append((t, t + hold, stop, stop))  # hold
            t += hold
            if i < n - 1:
                segs.append((t, t + move, stop, self.stops[i + 1]))  # move
                t += move
        # fix floating point drift on the last segment
        s0, s1, a, b = segs[-1]
        segs[-1] = (s0, duration, a, b)
        return segs

    def view_at(self, t):
        t = min(max(t, 0.0), self.duration - 1e-6)
        for s0, s1, a, b in self._segments:
            if t <= s1 or (s0, s1) == (self._segments[-1][0], self._segments[-1][1]):
                if a == b or s1 <= s0:
                    return a
                return _lerp_view(a, b, self.ease((t - s0) / (s1 - s0)))
        return self.stops[-1]

    def frame(self, t):
        # Standalone scenes (never added to a Movie) get the default config
        # instead of crashing on None.
        cfg = self.cfg or Config()
        w, h = cfg.w, cfg.h
        cx, cy, fw = self.view_at(t)
        return kb_frame(self.image, w, h, cx, cy, fw)
