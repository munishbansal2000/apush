"""Overlay widgets that sit on top of any scene: lower thirds, captions."""

import math
import random

import numpy as np
from PIL import Image, ImageDraw

from .timeline import Scene
from . import canvas as C
from .canvas import to_pil, to_np, paste_rgba
from .easing import ease_out, ease_out_back
from .slides import (a01, ACCENT, INK, MUTED, _outlined_line, _as_image,
                       card_image)


class Overlay:
    def __init__(self, start=0.0, duration=None):
        self.start = start
        self.duration = duration  # None = until scene end

    def apply(self, frame, t):
        raise NotImplementedError


class LowerThird(Overlay):
    """Name/role card sliding in at bottom-left, like broadcast TV."""

    def __init__(self, name, role="", start=0.5, duration=3.5, accent=ACCENT):
        super().__init__(start, duration)
        self.name = name
        self.role = role
        self.accent = accent

    def apply(self, frame, t):
        h, w = frame.shape[:2]
        dur = self.duration
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
        dur = self.duration
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

    def _build(self, h):
        if self._img is None:
            from .slides import _outlined_line
            self._img = _outlined_line(self.word, int(h * self.size))

    def apply(self, frame, t):
        h, w = frame.shape[:2]
        dur = self.duration
        local = t - self.start
        if local < 0 or local > dur:
            return frame
        self._build(h)
        e_in = a01(local, 0, 0.45, ease=ease_out_back)
        e_out = 1 - a01(local, dur - 0.45, 0.45, ease=ease_out_back)
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

    def _build(self, w):
        if self._img is not None:
            return
        seed = abs(hash(self.image)) % 9999 if isinstance(self.image, str) else 7
        border = "sticker" if self.shape == "rect" else (255, 255, 255)
        self._img = card_image(self.image, int(w * self.size),
                               shape=self.shape, border=border,
                               label=self.label, tilt=self.tilt, seed=seed)

    def apply(self, frame, t):
        h, w = frame.shape[:2]
        dur = self.duration
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
        dur = self.duration
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
            self._overlays = list(overlays)
            for ov in self._overlays:
                if ov.duration is None:
                    ov.duration = scene.duration - ov.start

        def frame(self, t):
            if self._scene.cfg is None:
                self._scene.cfg = self.cfg
            frame = self._scene.frame(t)
            for ov in self._overlays:
                frame = ov.apply(frame, t)
            return frame

    return _OverlayScene()
