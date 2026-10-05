"""Overlay widgets that sit on top of any scene: lower thirds, captions."""

import copy
import math
import random
import zlib

import numpy as np
from PIL import Image, ImageDraw

from .timeline import Scene
from . import canvas as C
from .canvas import to_pil, to_np, paste_rgba, get_font
from .easing import ease_out, ease_out_back, smooth
from .slides import (a01, ACCENT, INK, MUTED, _outlined_line, _as_image,
                       card_image)


class Overlay:
    def __init__(self, start=0.0, duration=None):
        self.start = start
        self.duration = duration  # None = until scene end

    def _dur(self):
        # with_overlays resolves None to the scene remainder; applied
        # directly there is no scene end, so never fade out.
        return self.duration if self.duration is not None else float("inf")

    def apply(self, frame, t):
        raise NotImplementedError

    def apply_movie(self, frame, t, total):
        """Movie-level application: runs after transition blending, so the
        overlay never ghosts during crossfades. Default treats the whole
        movie as the scene. Never mutates the overlay: duration is restored
        afterwards so the instance stays reusable at scene level."""
        prev = self.duration
        if prev is None:
            self.duration = total - self.start
        try:
            return self.apply(frame, t)
        finally:
            self.duration = prev


class LowerThird(Overlay):
    """Name/role card sliding in at bottom-left, like broadcast TV."""

    def __init__(self, name, role="", start=0.5, duration=3.5, accent=ACCENT):
        super().__init__(start, duration)
        self.name = name
        self.role = role
        self.accent = accent

    def apply(self, frame, t):
        h, w = frame.shape[:2]
        dur = self._dur()
        local = t - self.start
        if local < 0 or local > dur:
            return frame
        e_in = a01(local, 0, 0.5)
        e_out = 1 - a01(local, dur - 0.5, 0.5)
        e = min(e_in, e_out)
        if e <= 0:
            return frame
        x = int(w * 0.06 + (1 - e) * -420)
        y0 = int(h * 0.74)
        nw, nh = C.text_block_size(self.name, int(h * 0.055), w * 0.5, bold=True)
        rw, rh = C.text_block_size(self.role, int(h * 0.038), w * 0.5) if self.role else (0, 0)
        bw, bh = max(nw, rw) + 70, nh + rh + 56
        frame = C.pill(frame, (x, y0, x + bw, y0 + bh), radius=10,
                       fill=(10, 12, 20), alpha=int(220 * e))
        pil = to_pil(frame)
        d = ImageDraw.Draw(pil, "RGBA")
        d.rectangle([x, y0 + 14, x + 8, y0 + bh - 14], fill=self.accent + (int(255 * e),))
        pil = C.draw_para(pil, (x + 28, y0 + 16, x + bw - 20, y0 + bh),
                          self.name, size=int(h * 0.055), fill=INK, bold=True,
                          alpha=int(255 * e))
        if self.role:
            pil = C.draw_para(pil, (x + 28, y0 + 16 + nh + 8, x + bw - 20, y0 + bh),
                              self.role, size=int(h * 0.038), fill=MUTED,
                              alpha=int(255 * e))
        return to_np(pil)


class Caption(Overlay):
    """Bottom-centered caption pill, fades in and out."""

    def __init__(self, text, start=0.3, duration=None):
        super().__init__(start, duration)
        self.text = text

    def apply(self, frame, t):
        h, w = frame.shape[:2]
        dur = self._dur()
        local = t - self.start
        if local < 0 or local > dur:
            return frame
        e = min(a01(local, 0, 0.4), 1 - a01(local, dur - 0.4, 0.4))
        if e <= 0:
            return frame
        size = int(h * 0.04)
        tw, th = C.text_block_size(self.text, size, w * 0.8)
        bx0 = w / 2 - tw / 2 - 26
        by0 = h * 0.86
        frame = C.pill(frame, (bx0, by0, bx0 + tw + 52, by0 + th + 26),
                       radius=16, fill=(8, 10, 16), alpha=int(215 * e))
        pil = to_pil(frame)
        pil = C.draw_para(pil, (bx0 + 26, by0 + 11, bx0 + tw + 26, by0 + th + 15),
                          self.text, size=size, fill=(255, 255, 255),
                          align="center", alpha=int(255 * e))
        return to_np(pil)


class KeywordPop(Overlay):
    """Giant outlined keyword that punches in beside the action.

    The Heimler-style "MAIZE" beat: one huge word, outlined display type,
    punching in at `start`, holding, then punching out. Position it out of
    the way of the subject: "right" (default), "left", or "center".
    """

    def __init__(self, word, position="right", start=0.6, duration=3.0,
                 size=0.16):
        super().__init__(start, duration)
        self.word = word
        self.position = position
        self.size = size
        self._img = None
        self._built_h = None

    def _build(self, h):
        # Rebuild if the frame size changed: a cached build from a
        # different render size would silently render wrong-sized art.
        if self._img is None or self._built_h != h:
            from .slides import _outlined_line
            self._img = _outlined_line(self.word, int(h * self.size))
            self._built_h = h

    def apply(self, frame, t):
        h, w = frame.shape[:2]
        dur = self._dur()
        local = t - self.start
        if local < 0 or local > dur:
            return frame
        self._build(h)
        e_in = a01(local, 0, 0.45, ease=ease_out_back)
        e_out = 1 - a01(local, dur - 0.45, 0.45)
        e = min(e_in, e_out)
        if e <= 0:
            return frame
        from .slides import _punch_in
        img = _punch_in(self._img, max(e, 0.001))
        ih, iw = img.shape[:2]
        if self.position == "right":
            x = w * 0.97 - iw
        elif self.position == "left":
            x = w * 0.03
        else:
            x = (w - iw) / 2
        y = h * 0.30
        return C.paste_rgba(frame, img, (x, y))




class Sticker(Overlay):
    """Cutout photo with a thick white sticker border, placed anywhere.

    The review-video map look: a cutout (longhouse, maize, portrait) slapped
    onto the map with a rough hand-cut white edge, optional outlined label
    across it ("LONGHOUSE"). shape: "rect" | "circle".
    at: (x, y) center in frame fractions. size: width as frame-width fraction.
    """

    def __init__(self, image, at=(0.7, 0.3), size=0.24, shape="rect",
                 label="", start=0.5, duration=None, tilt=0.0):
        super().__init__(start, duration)
        self.image = image
        self.at = at
        self.size = size
        self.shape = shape
        self.label = label
        self.tilt = tilt
        self._img = None
        self._built_w = None

    def _build(self, w):
        # Rebuild if the frame size changed: a cached build from a
        # different render size would silently render wrong-sized art.
        if self._img is not None and self._built_w == w:
            return
        # crc32, not hash(): identical output on every interpreter run.
        if isinstance(self.image, str):
            seed = zlib.crc32(self.image.encode("utf-8")) % 9999
        else:
            seed = 7
        border = "sticker" if self.shape == "rect" else (255, 255, 255)
        self._img = card_image(self.image, int(w * self.size),
                               shape=self.shape, border=border,
                               label=self.label, tilt=self.tilt, seed=seed)
        self._built_w = w

    def apply(self, frame, t):
        h, w = frame.shape[:2]
        dur = self._dur()
        local = t - self.start
        if local < 0 or local > dur:
            return frame
        self._build(w)
        e = min(a01(local, 0, 0.5, ease=ease_out_back),
                1 - a01(local, dur - 0.4, 0.4))
        if e <= 0:
            return frame
        from .slides import _punch_in
        img = _punch_in(self._img, max(e, 0.001))
        ih, iw = img.shape[:2]
        ax, ay = self.at
        return paste_rgba(frame, img, (ax * w - iw / 2, ay * h - ih / 2))


class RegionGlow(Overlay):
    """Soft glowing tint marking a map region + optional outlined label.

    The "Great Basin burns orange" beat: a gently pulsing radial tint blob
    at `at` with an outlined region label above it.
    """

    def __init__(self, at=(0.5, 0.5), size=0.32, color=(255, 96, 40),
                 label="", start=0.5, duration=None):
        super().__init__(start, duration)
        self.at = at
        self.size = size
        self.color = color
        self.label = label
        self._glow = None
        self._lab = None

    def apply(self, frame, t):
        h, w = frame.shape[:2]
        dur = self._dur()
        local = t - self.start
        if local < 0 or local > dur:
            return frame
        e = min(a01(local, 0, 0.6), 1 - a01(local, dur - 0.6, 0.6))
        if e <= 0:
            return frame
        ax, ay = self.at
        if self._glow is None:
            self._glow = C.radial_glow(w, h, ax, ay, self.color, self.size)
        pulse = 0.55 + 0.10 * math.sin(2 * math.pi * local / 3.0)
        frame = C.screen_blend(frame, self._glow, pulse * e * 3.2)
        if self.label:
            if self._lab is None:
                self._lab = _outlined_line(self.label, int(h * 0.062))
            from .slides import _punch_in
            lab = _punch_in(self._lab, e)
            lh, lw = lab.shape[:2]
            frame = paste_rgba(frame, lab,
                               (ax * w - lw / 2, ay * h - self.size * h * 0.78))
        return frame


def with_overlays(scene, overlays):
    """Wrap a scene so overlays render on top of it."""

    class _OverlayScene(Scene):
        def __init__(self):
            super().__init__(scene.duration, scene.cfg)
            self._scene = scene
            # Resolve None durations against this scene WITHOUT mutating the
            # caller's overlay instances: copy any overlay that needs its
            # duration filled in, so the same instance stays reusable.
            resolved = []
            for ov in overlays:
                if ov.duration is None:
                    ov = copy.copy(ov)
                    ov.duration = scene.duration - ov.start
                resolved.append(ov)
            self._overlays = resolved

        def validate(self):
            inner = self._scene
            if hasattr(inner, "validate"):
                return inner.validate()
            return []

        def frame(self, t):
            if self._scene.cfg is None:
                self._scene.cfg = self.cfg
            frame = self._scene.frame(t)
            for ov in self._overlays:
                frame = ov.apply(frame, t)
            return frame

    return _OverlayScene()


class TimelineRibbon(Overlay):
    """Persistent era ribbon along the bottom: era label, event ticks, and a
    playhead that advances across this slide's `span` of the whole video.

    events: [(frac, "label"), ...] with frac in 0..1 across the whole video.
    span: (a, b) — the fraction of the video this slide covers.
    """

    def __init__(self, era, events=(), span=(0.0, 1.0), start=0.0,
                 duration=None, accent=ACCENT):
        super().__init__(start, duration)
        self.era = era
        self.events = list(events)
        self.span = tuple(span)
        self.accent = accent

    def apply(self, frame, t):
        h, w = frame.shape[:2]
        dur = self._dur()  # None duration = persist (playhead holds at span start)
        local = (t - self.start) / max(dur, 1e-6)
        if local < 0 or local > 1:
            return frame
        e_in = a01(t, self.start, 0.5)
        if e_in <= 0:
            return frame
        prog = self.span[0] + (self.span[1] - self.span[0]) * local
        bh = int(h * 0.115)
        y0 = h - bh
        frame = C.pill(frame, (0, y0, w, h), radius=0,
                       fill=(8, 10, 16), alpha=int(232 * e_in))
        pil = to_pil(frame)
        d = ImageDraw.Draw(pil, "RGBA")
        d.line([(0, y0), (w, y0)], fill=self.accent + (int(255 * e_in),), width=3)
        # era label
        fs = int(h * 0.034)
        d.text((w * 0.025, y0 + bh * 0.22), self.era,
               font=get_font(fs, bold=True), anchor="lm",
               fill=(235, 238, 245, int(255 * e_in)))
        # track
        tx0, tx1 = w * 0.32, w * 0.96
        ty = y0 + bh * 0.62
        d.line([(tx0, ty), (tx1, ty)], fill=(90, 100, 120, int(255 * e_in)), width=3)
        for frac, label in self.events:
            tx = tx0 + frac * (tx1 - tx0)
            passed = frac <= prog + 1e-9
            col = self.accent if passed else (110, 120, 140)
            d.line([(tx, ty - 9), (tx, ty + 9)], fill=col + (int(255 * e_in),),
                   width=3)
            d.text((tx, ty - 14), label, font=get_font(int(h * 0.024)),
                   anchor="mb", fill=col + (int(230 * e_in),))
        # playhead
        px = tx0 + prog * (tx1 - tx0)
        d.line([(px, ty - 16), (px, ty + 16)],
               fill=(255, 255, 255, int(255 * e_in)), width=3)
        pr = 7
        d.ellipse([px - pr, ty - pr, px + pr, ty + pr],
                  fill=self.accent + (int(255 * e_in),),
                  outline=(255, 255, 255, int(255 * e_in)), width=2)
        return to_np(pil)


def _wobbly(pts, seed, amp):
    rng = random.Random(seed)
    return [(x + rng.uniform(-amp, amp), y + rng.uniform(-amp, amp))
            for x, y in pts]


class RedPen(Overlay):
    """A teacher's red pen: circles, underlines, check marks and margin notes
    that draw themselves over the slide, with a hand-drawn wobble.

    annotations: [{"kind": "circle", "at": (x, y), "r": 0.08, "start": 1.0},
                  {"kind": "underline", "from": (x1, y1), "to": (x2, y2),
                   "start": 2.0},
                  {"kind": "check", "at": (x, y), "size": 0.05, "start": 3.0},
                  {"kind": "note", "at": (x, y), "text": "KEY IDEA",
                   "start": 2.5}, ...]
    coordinates are fractions of the frame.
    """

    _REQUIRED = {
        "circle": ("at",),
        "underline": ("from", "to"),
        "check": ("at",),
        "note": ("at",),
    }

    def __init__(self, annotations, start=0.0, duration=None,
                 color=(232, 48, 48)):
        super().__init__(start, duration)
        self.annotations = [self._checked(a, i) for i, a in enumerate(annotations)]
        self.color = color

    @classmethod
    def _checked(cls, ann, i):
        if not isinstance(ann, dict):
            raise ValueError(f"annotation {i} must be a dict, got {type(ann).__name__}")
        kind = ann.get("kind")
        if kind not in cls._REQUIRED:
            raise ValueError(
                f"annotation {i}: unknown kind {kind!r}; "
                f"expected one of {sorted(cls._REQUIRED)}")
        missing = [k for k in cls._REQUIRED[kind] if k not in ann]
        if missing:
            raise ValueError(
                f"annotation {i} ({kind}): missing keys {missing}")
        return ann

    def _draw_ann(self, d, w, h, ann, idx, t):
        e = a01(t, ann.get("start", 0.0), ann.get("dur", 0.8))
        if e <= 0:
            return
        col = self.color + (int(255 * min(1.0, e * 1.3)),)
        lw = max(2, int(h * 0.009))
        kind = ann["kind"]
        if kind == "circle":
            cx, cy = ann["at"][0] * w, ann["at"][1] * h
            if "rx" in ann or "ry" in ann:
                rx = ann.get("rx", ann.get("r", 0.08)) * w
                ry = ann.get("ry", ann.get("r", 0.08)) * h
            else:
                rx = ann.get("r", 0.08) * min(w, h)
                ry = rx * 0.72
            # smooth hand-drawn wobble: a couple of low-frequency radial
            # waves, so it reads as a teacher's circle, not a scribble.
            # (per-point jitter looked like noise.)
            rng = random.Random(idx * 7 + 1)
            waves = [(rng.uniform(0.015, 0.035), rng.uniform(0, 6.283),
                      rng.randint(2, 3)) for _ in range(2)]
            n = 64
            pts = []
            for i in range(n + 1):
                a = i / n * 2 * math.pi
                wob = 1.0 + sum(amp * math.sin(fr * a + ph)
                                for amp, ph, fr in waves)
                pts.append((cx + rx * wob * math.cos(a),
                            cy + ry * wob * math.sin(a)))
            d.line(pts[:max(2, int(len(pts) * e))], fill=col, width=lw,
                   joint="curve")
        elif kind == "underline":
            x1, y1 = ann["from"][0] * w, ann["from"][1] * h
            x2, y2 = ann["to"][0] * w, ann["to"][1] * h
            n = 24
            pts = [(x1 + (x2 - x1) * i / n,
                    y1 + (y2 - y1) * i / n + math.sin(i * 1.7) * h * 0.004)
                   for i in range(n + 1)]
            pts = _wobbly(pts, idx * 7 + 2, h * 0.004)
            d.line(pts[:max(2, int(len(pts) * e))], fill=col, width=lw,
                   joint="curve")
        elif kind == "check":
            cx, cy = ann["at"][0] * w, ann["at"][1] * h
            s = ann.get("size", 0.05) * min(w, h)
            pts = _wobbly([(cx - s, cy), (cx - s * 0.25, cy + s * 0.8),
                           (cx + s, cy - s * 0.7)], idx * 7 + 3, s * 0.06)
            shown = pts[:max(2, int(len(pts) * e + 0.5))]
            d.line(shown, fill=col, width=lw + 1, joint="curve")
        elif kind == "note":
            x, y = ann["at"][0] * w, ann["at"][1] * h
            rise = (1 - e) * 14
            d.text((x, y + rise), ann.get("text", ""),
                   font=get_font(int(h * 0.036), bold=True), anchor="lm",
                   fill=col)

    def apply(self, frame, t):
        h, w = frame.shape[:2]
        if t < self.start:
            return frame
        pil = to_pil(frame)
        d = ImageDraw.Draw(pil, "RGBA")
        for i, ann in enumerate(self.annotations):
            self._draw_ann(d, w, h, ann, i, t)
        return to_np(pil)


class Magnifier(Overlay):
    """A magnifying glass that travels over the frame, showing a zoomed crop
    of whatever is beneath the lens.

    path: [(t, x, y), ...] keyframes in scene-local seconds + fractional coords.
    """

    def __init__(self, path, radius=0.15, zoom=2.2, start=0.0, duration=None):
        super().__init__(start, duration)
        path = list(path)
        if not path:
            raise ValueError("Magnifier path must not be empty")
        for i, pt in enumerate(path):
            if len(pt) != 3:
                raise ValueError(
                    f"path keyframe {i} must be (t, x, y), got {pt!r}")
        self.path = sorted(path)
        self.radius = radius
        self.zoom = zoom

    @classmethod
    def trace_line(cls, line_box, t_start, t_end, radius=0.14, zoom=2.4,
                   margin=0.08):
        """Build a magnifier that slowly traces one text line — the
        close-reading pattern. line_box is a HighlightSlide.line_boxes()
        entry (or any {"x0","x1","yc"} fractional box). Pace is set by
        t_start/t_end: ~6-8s across a full line reads comfortably; the
        author controls it, the library just makes the pattern reusable."""
        span = line_box["x1"] - line_box["x0"]
        x0 = line_box["x0"] + span * margin
        x1 = line_box["x1"] - span * margin
        return cls([(t_start, x0, line_box["yc"]),
                    (t_end, x1, line_box["yc"])],
                   radius=radius, zoom=zoom)

    def _center_at(self, t):
        pts = self.path
        if t <= pts[0][0]:
            return pts[0][1], pts[0][2]
        for (t0, x0, y0), (t1, x1, y1) in zip(pts, pts[1:]):
            if t <= t1:
                k = smooth((t - t0) / max(t1 - t0, 1e-6))
                return x0 + (x1 - x0) * k, y0 + (y1 - y0) * k
        return pts[-1][1], pts[-1][2]

    def apply(self, frame, t):
        h, w = frame.shape[:2]
        if t < self.start:
            return frame
        e = a01(t, self.start, 0.5)
        if e <= 0:
            return frame
        lx, ly = self._center_at(t)
        lx, ly = lx * w, ly * h
        r = self.radius * min(w, h) * (0.6 + 0.4 * e)
        src_r = min(r / self.zoom, w / 2, h / 2)
        # clamp the lens center so the source crop stays fully in-frame:
        # without this, near an edge the crop clamps but the lens doesn't,
        # misregistering the magnification (shows the wrong content)
        lx = min(max(lx, src_r), w - src_r)
        ly = min(max(ly, src_r), h - src_r)
        x0, y0 = int(lx - src_r), int(ly - src_r)
        crop = frame[y0:y0 + int(2 * src_r), x0:x0 + int(2 * src_r)]
        if crop.size == 0:
            return frame
        lens = np.array(Image.fromarray(crop).resize((int(2 * r), int(2 * r)),
                                                     Image.BILINEAR))
        mask = Image.new("L", (int(2 * r), int(2 * r)), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, int(2 * r), int(2 * r)], fill=255)
        pil = to_pil(frame)
        pil.paste(Image.fromarray(lens), (int(lx - r), int(ly - r)), mask)
        d = ImageDraw.Draw(pil, "RGBA")
        # glass rim + highlight
        d.ellipse([lx - r, ly - r, lx + r, ly + r],
                  outline=(30, 32, 40, int(255 * e)), width=max(3, int(r * 0.07)))
        d.arc([lx - r * 0.82, ly - r * 0.82, lx + r * 0.82, ly + r * 0.82],
              start=200, end=300, fill=(255, 255, 255, int(160 * e)),
              width=max(2, int(r * 0.04)))
        # handle
        hx, hy = lx + r * 0.72, ly + r * 0.72
        d.line([(hx, hy), (hx + r * 0.55, hy + r * 0.55)],
               fill=(30, 32, 40, int(255 * e)), width=max(4, int(r * 0.09)))
        return to_np(pil)


class MapNote(Overlay):
    """Annotations pinned to *content* coordinates of a moving camera: the pin
    rides the pan/zoom instead of sitting fixed on screen.

    camera: a KenBurns instance (uses .view_at/.image) or a
            callable t -> (cx, cy, fw); then image_shape=(ih, iw) is required.
    notes: [{"at": (cx, cy), "label": "...", "sub": "...", "start": 1.0}, ...]
    """

    def __init__(self, camera, notes, image_shape=None, start=0.0,
                 duration=None, accent=ACCENT):
        super().__init__(start, duration)
        self.camera = camera
        self.notes = list(notes)
        self.image_shape = image_shape
        self.accent = accent

    def _view(self, t):
        if hasattr(self.camera, "view_at"):
            return self.camera.view_at(t)
        return self.camera(t)

    def _to_screen(self, px, py, view, w, h):
        from .kenburns import clamp_view
        cx, cy, fw = view
        if self.image_shape is not None:
            ih, iw = self.image_shape
        else:
            ih, iw = self.camera.image.shape[:2]
        cx, cy, fw = clamp_view(iw, ih, w, h, cx, cy, fw)
        fh = fw * (iw / ih) / (w / h)
        sx = (px - (cx - fw / 2)) / fw * w
        sy = (py - (cy - fh / 2)) / fh * h
        return sx, sy

    def apply(self, frame, t):
        h, w = frame.shape[:2]
        if t < self.start:
            return frame
        view = self._view(t)
        pil = to_pil(frame)
        d = ImageDraw.Draw(pil, "RGBA")
        for i, note in enumerate(self.notes):
            e = a01(t, note.get("start", 0.0), 0.5)
            if e <= 0:
                continue
            sx, sy = self._to_screen(note["at"][0], note["at"][1], view, w, h)
            if not (-40 <= sx <= w + 40 and -40 <= sy <= h + 40):
                continue
            pop = ease_out_back(min(1.0, e * 1.2))
            # pulsing dot
            pulse = 1 + 0.25 * math.sin(2 * math.pi * t * 2.2 + i)
            pr = h * 0.014 * pulse * pop
            d.ellipse([sx - pr * 2.2, sy - pr * 2.2, sx + pr * 2.2, sy + pr * 2.2],
                      fill=self.accent + (70,))
            d.ellipse([sx - pr, sy - pr, sx + pr, sy + pr],
                      fill=self.accent + (int(255 * e),),
                      outline=(255, 255, 255, int(255 * e)), width=2)
            # label pill above with leader
            label = note.get("label", "")
            if label:
                fs = int(h * 0.030)
                tw_, th_ = C.text_block_size(label, fs, w * 0.4, bold=True)
                bw, bh = tw_ + 26, th_ + 16
                bx, by = sx - bw / 2, sy - h * 0.075 - bh
                bx = min(max(bx, 6), w - bw - 6)
                d.line([(sx, sy - pr), (bx + bw / 2, by + bh)],
                       fill=(255, 255, 255, int(200 * e)), width=2)
                d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=9,
                                    fill=(10, 12, 20, int(225 * e)))
                d.text((bx + bw / 2, by + bh / 2), label, font=get_font(fs, bold=True),
                       anchor="mm", fill=(255, 255, 255, int(255 * e)))
                sub = note.get("sub", "")
                if sub:
                    sfs = int(h * 0.024)
                    stw_, sth_ = C.text_block_size(sub, sfs, w * 0.4)
                    sbw, sbh = stw_ + 20, sth_ + 10
                    sbx = min(max(bx + bw / 2 - sbw / 2, 6), w - sbw - 6)
                    sby = by + bh + h * 0.010
                    d.rounded_rectangle([sbx, sby, sbx + sbw, sby + sbh],
                                        radius=7,
                                        fill=(10, 12, 20, int(200 * e)))
                    d.text((sbx + sbw / 2, sby + sbh / 2), sub,
                           font=get_font(sfs), anchor="mm",
                           fill=(235, 238, 245, int(255 * e)))
        return to_np(pil)
