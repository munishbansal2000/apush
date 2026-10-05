"""Reusable slide components. Each is a Scene: construct, add to a Movie, render.

Views for camera moves are (cx, cy, fw) — see kenburns.py.
"""

import math
import random
import re
import zlib

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .timeline import Scene
from . import easing
from .easing import ease_out, ease_out_back, ease_in_out, smooth
from . import canvas as C
from .canvas import get_font, to_pil, to_np, paste_rgba
from .kenburns import KenBurns, kb_frame, full_view, clamp_view
from .plugins import slide, background_registry

ACCENT = (255, 176, 66)
INK = (235, 238, 245)
MUTED = (160, 168, 185)


def a01(t, start, dur, ease=ease_out):
    """0..1 appear-progress of an element that starts at `start` seconds."""
    if t < start:
        return 0.0
    return ease(min(1.0, (t - start) / dur))


def _as_image(spec):
    if isinstance(spec, np.ndarray):
        return spec
    return C.load_image(spec)


class Slide(Scene):
    """Base slide with a flexible background spec.
    bg may be:
      None                                    textured cinematic default
      {"type": "solid", "color": (r,g,b)}
      {"type": "gradient", "top": ..., "bottom": ...}
      {"type": "textured", "top": ..., "bottom": ...}
      {"type": "image", "path"|"array": ..., "dim": 0.5,
       "drift": [(cx,cy,fw), (cx,cy,fw)]}     slow Ken Burns drift

    Rule: a slide never renders on a blank background. The default is a
    textured backdrop, but authors should pass a contextual image
    (apush_bg(era), a map, a photo) — validate() warns when they don't.

    Subclasses that render full-bleed imagery (the image IS the background)
    set ``_image_driven = True`` to opt out of that warning.
    """

    _image_driven = False

    def __init__(self, duration, bg=None, cfg=None):
        super().__init__(duration, cfg)
        # _image_driven slides (KenBurns, Callout, ...) are full-bleed imagery:
        # the image IS the contextual background, so no warning is due.
        self._bg_explicit = bg is not None or self._image_driven
        self.bg = bg or {"type": "textured"}
        # text elements registered during frame(): {"key", "box", "color",
        # "size_px"} — fuels validate_visual(). Slides call
        # self._register_text(...) as they draw.
        self._text_elements = []

    def bg_frame(self, t):
        spec = self.bg
        kind = spec.get("type", "gradient")
        try:
            provider = background_registry.get(kind)
        except KeyError:
            raise ValueError(f"unknown bg type: {kind!r}")
        return provider(self, self.cfg.w, self.cfg.h, t, spec)

    def validate(self):
        """Return a list of issue strings; empty means clean.

        Plugin authors: override to add per-slide checks.
        """
        issues = []
        if not isinstance(self.bg, dict) or "type" not in self.bg:
            issues.append("bg spec must be a dict with a 'type' key")
        elif self.bg["type"] not in background_registry.names():
            issues.append(f"unknown bg type: {self.bg['type']!r}")
        if not self._bg_explicit:
            issues.append(
                "no contextual background: pass bg=apush_bg(era), a map, "
                "or a photo — slides never render on blank backgrounds")
        return issues

    def _register_text(self, key, box, color=(235, 238, 245), size_px=None):
        """Record a text element's bounds while drawing. box is
        (x0, y0, x1, y1) pixels; color is the RGB text color. Re-registering
        the same key replaces the old entry (frame() runs many times)."""
        self._text_elements = [e for e in self._text_elements
                               if e["key"] != key]
        self._text_elements.append({"key": key, "box": tuple(box),
                                    "color": tuple(color),
                                    "size_px": size_px})

    def validate_visual(self, t=None):
        """Render at a settled time and run pixel-level checks (contrast,
        bounds, min size, collisions) on the registered text elements.
        Returns [issues]; [] means clean."""
        from . import checks
        w, h = self.cfg.w, self.cfg.h
        if t is None:
            t = max(0.0, self.duration - 0.5)
        self._text_elements = []
        frame = self.frame(t)
        elements = self._text_elements
        issues = []
        issues.extend(checks.check_bounds(elements, w, h))
        issues.extend(checks.check_min_size(elements, h))
        issues.extend(checks.check_contrast(frame, elements))
        issues.extend(checks.check_collisions(elements))
        return issues


def _word_stagger(pil_img, text, size, y_center, t, t0=0.3, step=0.09,
                  fill=INK, bold=True, rise=26, align_cx=None):
    """Draw words fading/rising in one by one, centered on y_center."""
    w, h = pil_img.size
    cx = align_cx if align_cx is not None else w / 2
    draw = ImageDraw.Draw(pil_img, "RGBA")
    font = get_font(size, bold=bold)
    words = text.split()
    widths = [draw.textlength(wd + " ", font=font) for wd in words]
    total = sum(widths)
    x = cx - total / 2
    ascent, descent = font.getmetrics()
    for i, wd in enumerate(words):
        e = a01(t, t0 + i * step, 0.55)
        if e <= 0:
            x += widths[i]
            continue
        alpha = int(255 * e)
        yy = y_center - (ascent + descent) / 2 + (1 - e) * rise
        draw.text((x, yy), wd, font=font, fill=tuple(fill) + (alpha,))
        x += widths[i]
    return pil_img


@slide('title')
class TitleSlide(Slide):
    """Big centered title, staggered word entrance, breathing glow."""

    def __init__(self, title, subtitle="", duration=4.5, accent=ACCENT, bg=None, cfg=None):
        super().__init__(duration, bg, cfg)
        self.title = title
        self.subtitle = subtitle
        self.accent = accent
        self._glow = None

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        frame = self.bg_frame(t)
        if self._glow is None:
            self._glow = C.radial_glow(w, h, 0.5, 0.42, self.accent, 0.55)
        breathe = 0.10 + 0.06 * math.sin(2 * math.pi * t / 6.0)
        frame = C.screen_blend(frame, self._glow, breathe * 8)

        pil = to_pil(frame)
        draw = ImageDraw.Draw(pil, "RGBA")

        # accent bar grows under the title zone
        bw = int(300 * a01(t, 0.15, 0.5))
        if bw > 0:
            draw.rounded_rectangle([w / 2 - bw / 2, h * 0.66, w / 2 + bw / 2, h * 0.66 + 8],
                                  radius=4, fill=self.accent + (255,))

        pil = _word_stagger(pil, self.title, size=int(h * 0.105), y_center=h * 0.44, t=t)
        if self.subtitle:
            e = a01(t, 0.9, 0.8)
            if e > 0:
                pil = C.draw_para(pil, (w * 0.15, h * 0.72, w * 0.85, h * 0.9),
                                  self.subtitle, size=int(h * 0.045), fill=MUTED,
                                  align="center", alpha=int(255 * e))
        return to_np(pil)


@slide('bullets')
class BulletSlide(Slide):
    """Title + bullets that reveal one by one.

    bullets: ["plain", ("parent", ["child one", "child two"])] —
    tuples nest indented child bullets under a parent, like the
    classic review-video "Institutions" breakdown.
    """

    def __init__(self, title, bullets, duration=None, accent=ACCENT, bg=None,
                 cfg=None, stagger=1.25):
        norm = [self._norm(b) for b in bullets]
        nlines = sum(1 + len(ch) for _, ch in norm)
        duration = duration or (2.4 + stagger * nlines)
        super().__init__(duration, bg, cfg)
        self.title = title
        self.bullets = norm
        self.accent = accent
        self.stagger = stagger
        self._word_boxes = None

    def word_boxes(self):
        """{word.lower(): [(x0,y0,x1,y1), ...]} in frame fractions, at the
        settled (fully revealed) layout. Lets overlays like RedPen target
        a word by content instead of guessing coordinates."""
        if self._word_boxes is None:
            self._word_boxes = {}
            w, h = self.cfg.w, self.cfg.h
            dummy = Image.new("RGBA", (w, h))
            y = h * 0.36
            for b, children in self.bullets:
                y = self._collect_words(dummy, w * 0.09, y, b,
                                        int(h * 0.052), "disc")
                for ch in children:
                    y = self._collect_words(dummy, w * 0.09 + 52, y, ch,
                                            int(h * 0.042), "dash")
                y += h * 0.02
        return self._word_boxes

    def _collect_words(self, dummy, x, y, text, size, dot):
        """Run one bullet's layout, recording word boxes. Returns next y."""
        w, h = self.cfg.w, self.cfg.h
        # at e=1 the slide-in offset (1-e)*70 is zero, so tx = x + 44
        tx = x + 44
        box = (tx, y, w * 0.91, y + h * 0.2)
        collect = []
        _rich_para_dark(dummy, box, text, size=size, collect=collect)
        for word, x0, y0, x1, y1 in collect:
            key = word.strip().lower()
            if key:
                self._word_boxes.setdefault(key, []).append(
                    (x0 / w, y0 / h, x1 / w, y1 / h))
        _, bh = _rich_block_size(text, size, w * 0.91 - tx)
        return y + bh + h * 0.03

    @staticmethod
    def _norm(b):
        if isinstance(b, (tuple, list)):
            text, children = b[0], list(b[1])
            return text, children
        return b, []

    def _draw_bullet(self, pil, d, x, y, text, size, e, dot):
        alpha = int(255 * e)
        xx = x + (1 - e) * 70
        if dot == "disc":
            d.ellipse([xx, y + 14, xx + 20, y + 34], fill=self.accent + (alpha,))
            tx = xx + 44
        else:  # dash for nested children
            d.rounded_rectangle([xx, y + 26, xx + 26, y + 32],
                               radius=3, fill=self.accent + (alpha,))
            tx = xx + 44
        box = (tx, y, self.cfg.w * 0.91, y + self.cfg.h * 0.2)
        pil = _rich_para_dark(pil, box, text, size=size, fill=INK, alpha=alpha)
        _, bh = _rich_block_size(text, size, self.cfg.w * 0.91 - tx)
        return pil, bh

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        frame = self.bg_frame(t)
        pil = to_pil(frame)

        tsize = int(h * 0.075)
        _tw, _th = C.text_block_size(self.title, tsize, w * 0.82, bold=True)
        self._register_text("title", (w * 0.09, h * 0.08,
                                      w * 0.09 + _tw, h * 0.08 + _th),
                            INK, tsize)
        # title + underline via the shared helper (single source of truth —
        # the underline anchors to measured text, never the layout box)
        frame = _title_block(frame, self.title, t, y_frac=0.08,
                             size_frac=0.075, accent=self.accent, align="left")
        pil = to_pil(frame)

        y = h * 0.36
        d = ImageDraw.Draw(pil, "RGBA")
        for i, (b, children) in enumerate(self.bullets):
            e = a01(t, 0.9 + i * self.stagger, 0.5)
            if e <= 0:
                continue
            pil, bh = self._draw_bullet(pil, d, w * 0.09, y, b,
                                        int(h * 0.052), e, "disc")
            # settled x (slide-in offset is zero at e=1, which is when we validate)
            self._register_text(f"bullet:{i}", (w * 0.09 + 44, y,
                                                w * 0.91, y + bh),
                                INK, int(h * 0.052))
            y += bh + h * 0.03
            for j, ch in enumerate(children):
                ce = a01(t, 0.9 + i * self.stagger + 0.35 + j * 0.4, 0.45)
                if ce <= 0:
                    continue
                pil, cbh = self._draw_bullet(pil, d, w * 0.09 + 52, y, ch,
                                             int(h * 0.042), ce, "dash")
                self._register_text(f"bullet:{i}.{j}", (w * 0.09 + 52 + 44, y,
                                                        w * 0.91, y + cbh),
                                    INK, int(h * 0.042))
                y += cbh + h * 0.03
            y += h * 0.02
        return to_np(pil)


@slide('steps')
class StepsSlide(Slide):
    """Numbered points: big accent numerals, staggered reveal.

    steps: list of "heading" strings or (heading, body) tuples.
    banner: optional red label chip above the steps ("Cause #1: Gold").
    """

    def __init__(self, title, steps, duration=None, accent=ACCENT, bg=None,
                 cfg=None, banner=None, banner_fill=(211, 47, 47),
                 stagger=1.6):
        norm = [(s, "") if isinstance(s, str) else tuple(s) for s in steps]
        duration = duration or (2.6 + stagger * len(norm))
        super().__init__(duration, bg, cfg)
        self.title = title
        self.steps = norm
        self.accent = accent
        self.banner = banner
        self.banner_fill = banner_fill
        self.stagger = stagger

    @staticmethod
    def _banner_chip(text, size, fill):
        font = get_font(size, bold=True)
        tmp = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
        tw = tmp.textlength(text, font=font)
        asc, desc = font.getmetrics()
        pad_x, pad_y = int(size * 0.7), int(size * 0.35)
        img = Image.new("RGBA", (int(tw) + pad_x * 2, asc + desc + pad_y * 2),
                        (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([0, 0, img.width - 1, img.height - 1],
                           radius=int(size * 0.25), fill=fill + (255,))
        d.text((pad_x, pad_y), text, font=font, fill=(20, 16, 14, 255))
        return img

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        frame = self.bg_frame(t)
        pil = to_pil(frame)

        y_top = h * 0.08
        if self.banner:
            e = a01(t, 0.0, 0.5, ease=easing.ease_out_back)
            if e > 0:
                chip = self._banner_chip(self.banner, int(h * 0.062),
                                         self.banner_fill)
                cw, chh = chip.size
                sc = 0.7 + 0.3 * e
                chip = chip.resize((int(cw * sc), int(chh * sc)),
                                   Image.BILINEAR)
                a = chip.split()[3].point(lambda v: int(v * min(1.0, e)))
                chip.putalpha(a)
                frame = paste_rgba(frame, np.array(chip),
                                   ((w - chip.width) / 2, y_top))
                pil = to_pil(frame)
            y_top += h * 0.13

        if self.title:
            e = a01(t, 0.0, 0.6)
            pil = C.draw_para(pil, (w * 0.09, y_top, w * 0.91, y_top + h * 0.18),
                              self.title, size=int(h * 0.075), fill=INK,
                              bold=True, alpha=int(255 * e))
            y_top += h * 0.18

        y = max(y_top + h * 0.06, h * 0.34) if not self.banner else y_top + h * 0.04
        num_size = int(h * 0.085)
        for i, (head, body) in enumerate(self.steps):
            e = a01(t, 0.9 + i * self.stagger, 0.55)
            if e <= 0:
                continue
            alpha = int(255 * e)
            x = w * 0.09 + (1 - e) * 70
            pil = C.draw_para(pil, (x, y, x + w * 0.12, y + h * 0.2),
                              f"{i + 1:02d}", size=num_size, fill=self.accent,
                              bold=True, alpha=alpha)
            pil = C.draw_para(pil, (x + w * 0.11, y + 6, w * 0.91, y + h * 0.22),
                              head, size=int(h * 0.052), fill=INK, bold=True,
                              alpha=alpha)
            if body:
                _, hh = C.text_block_size(head, int(h * 0.052), w * 0.91 - (x + w * 0.11),
                                          bold=True)
                pil = C.draw_para(pil, (x + w * 0.11, y + 6 + hh + 8, w * 0.91, y + h * 0.3),
                                  body, size=int(h * 0.04), fill=MUTED, alpha=alpha)
                _, bh = C.text_block_size(body, int(h * 0.04), w * 0.91 - (x + w * 0.11))
                y += hh + bh + h * 0.075
            else:
                _, hh = C.text_block_size(head, int(h * 0.052), w * 0.91 - (x + w * 0.11),
                                          bold=True)
                y += hh + h * 0.075
        return to_np(pil)


@slide('display-points')
class DisplayPointsSlide(Slide):
    """Huge punchy display points over a drifting background.

    points: ["1. New Tech", "2. Mass Media"] — big white type with hard
    shadow, punching in one by one like the classic review-video style.
    """

    def __init__(self, points, bg=None, duration=None, stagger=1.7, cfg=None):
        points = list(points)
        duration = duration or (2.2 + stagger * len(points))
        super().__init__(duration, bg, cfg)
        self.points = points
        self.stagger = stagger
        self._lines = None  # cached RGBA line images, built on first frame

    def _build_lines(self):
        size = int(self.cfg.h * 0.115)
        max_w = self.cfg.w * 0.86
        self._lines = [_outlined_block(text, size, max_w)
                       for text in self.points]

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        frame = C.vignette(self.bg_frame(t), 0.35)
        if self._lines is None:
            self._build_lines()
        n = len(self._lines)
        slot = h * 0.19
        y0 = (h - slot * n) / 2
        for i, line in enumerate(self._lines):
            raw = a01(t, 0.5 + i * self.stagger, 0.5, ease=easing.ease_out_back)
            if raw <= 0:
                continue
            alpha = min(1.0, raw)
            scale = 0.82 + 0.18 * raw  # overshoot gives the punch
            lw, lh = line.size
            nl = line.resize((max(1, int(lw * scale)), max(1, int(lh * scale))),
                             Image.BILINEAR)
            if alpha < 1:
                r, g, b, a = nl.split()
                a = a.point(lambda v: int(v * alpha))
                nl = Image.merge("RGBA", (r, g, b, a))
            nlw, nlh = nl.size
            frame = paste_rgba(frame, np.array(nl),
                               (w * 0.08, y0 + i * slot + (slot - nlh) / 2))
        return frame


def _outlined_line(text, size):
    """White display type with black stroke + hard drop shadow (RGBA image).

    The classic review-video look: readable over any background.
    Inline markers: **bold** renders with a heavier stroke (keyword pop),
    ==highlight== is ignored here (paper slides handle it separately).
    """
    return _rich_line_img(_rich_tokens(text), size)


_rich_re = re.compile(r"(\*\*.+?\*\*|==.+?==)")


def _rich_tokens(text):
    """Split marked text into [(word, bold, hl)] tokens.

    **bold** -> heavier stroke / bolder face. ==highlight== -> marker swash
    (rendered by paper-style slides; treated as bold here).
    """
    tokens = []
    for part in _rich_re.split(text):
        if not part:
            continue
        bold, hl = False, False
        if len(part) > 4 and part.startswith("**") and part.endswith("**"):
            part, bold = part[2:-2], True
        elif len(part) > 4 and part.startswith("==") and part.endswith("=="):
            part, bold, hl = part[2:-2], True, True
        for w in part.split(" "):
            if w:
                tokens.append((w, bold, hl))
    return tokens


def _rich_line_img(tokens, size):
    """One line of tokens -> RGBA image, white outlined display type."""
    font = get_font(size, bold=True)
    sw = max(2, round(size / 28))
    meas = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    widths = [meas.textlength(w + " ", font=font) for w, _, _ in tokens]
    total = int(sum(widths)) + 48
    asc, desc = font.getmetrics()
    img = Image.new("RGBA", (total, asc + desc + 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x, y0 = 24, 24
    for (w, bold, _), tw in zip(tokens, widths):
        bsw = sw + (2 if bold else 0)
        d.text((x + 7, y0 + 9), w + " ", font=font, fill=(0, 0, 0, 230),
               stroke_width=bsw + 1, stroke_fill=(0, 0, 0, 230))
        d.text((x, y0), w + " ", font=font, fill=(255, 255, 255, 255),
               stroke_width=bsw, stroke_fill=(15, 15, 18, 255))
        x += tw
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def _outlined_block(text, size, max_w):
    """Wrapped rich text -> single RGBA image (stacked outlined lines)."""
    tokens = _rich_tokens(text)
    meas = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    font = get_font(size, bold=True)
    widths = [meas.textlength(w + " ", font=font) for w, _, _ in tokens]
    lines, cur, cw = [], [], 0
    for tok, tw in zip(tokens, widths):
        if cur and cw + tw > max_w:
            lines.append(cur)
            cur, cw = [], 0
        cur.append(tok)
        cw += tw
    if cur:
        lines.append(cur)
    if not lines:
        lines = [[]]
    imgs = [_rich_line_img(ln, size) for ln in lines]
    w = max(i.width for i in imgs)
    gap = int(size * 0.28)
    h = sum(i.height for i in imgs) + gap * (len(imgs) - 1)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    y = 0
    for i in imgs:
        out.alpha_composite(i, (0, y))
        y += i.height + gap
    return out


def _punch_in(line, raw):
    """Scale + fade an outlined-text line image by its appear progress."""
    alpha = min(1.0, raw)
    scale = 0.82 + 0.18 * raw
    lw, lh = line.size
    nl = line.resize((max(1, int(lw * scale)), max(1, int(lh * scale))),
                     Image.BILINEAR)
    if alpha < 1:
        r, g, b, a = nl.split()
        a = a.point(lambda v: int(v * alpha))
        nl = Image.merge("RGBA", (r, g, b, a))
    return np.array(nl)


@slide('duo')
class DuoSlide(Slide):
    """Two panels side by side — the classic "we will look at two people".

    Each panel is either:
      {"image": path_or_array, "label": "Henry Ford"}   portrait + name plate
      {"points": ["-Assembly lines", "..."]}            big outlined text lines

    Image panels accept "focus" (0..1, default 0.42): which vertical part of
    a tall portrait stays in frame (faces sit high; lower it for headroom).

    Portraits get a slow Ken Burns drift inside a dark frame; labels and
    points punch in with the outlined display-type treatment.
    """

    def __init__(self, left, right, bg=None, duration=None, stagger=0.8,
                 cfg=None):
        self.left = left
        self.right = right
        self.stagger = stagger
        n = max(self._items(panel) for panel in (left, right))
        duration = duration or (2.8 + stagger * n + 1.2)
        super().__init__(duration, bg, cfg)
        self._covers = {}   # (side) -> cover image
        self._built = {}    # (side) -> list of RGBA line images

    @staticmethod
    def _items(panel):
        if "points" in panel:
            return len(panel["points"])
        return 1 if panel.get("label") else 0

    def _panel_rects(self):
        w, h = self.cfg.w, self.cfg.h
        mx, gap, my = w * 0.03, w * 0.025, h * 0.07
        pw = (w - 2 * mx - gap) / 2
        ph = h - 2 * my
        return (mx, my, pw, ph), (mx + pw + gap, my, pw, ph)

    def _build(self):
        if self._built:
            return
        w, h = self.cfg.w, self.cfg.h
        for side, panel in (("l", self.left), ("r", self.right)):
            if "image" in panel:
                x0, y0, pw, ph = self._panel_rects()[0 if side == "l" else 1]
                # cover TALLER than the panel: kb_frame then picks a
                # panel-sized window, so "focus" can reach the headroom
                # that a plain center-crop would discard
                self._covers[side] = C.cover(_as_image(panel["image"]),
                                             int(pw), int(ph * 1.8))
                lines = []
                if panel.get("label"):
                    lines.append(_outlined_line(panel["label"],
                                                int(h * 0.082)))
                self._built[side] = lines
            else:
                self._built[side] = [_outlined_line(p, int(h * 0.078))
                                     for p in panel["points"]]

    def _draw_image_panel(self, pil, side, t):
        panel = self.left if side == "l" else self.right
        x0, y0, pw, ph = self._panel_rects()[0 if side == "l" else 1]
        ix0, iy0, ipw, iph = int(x0), int(y0), int(pw), int(ph)
        k = smooth(min(1.0, t / self.duration))
        focus = panel.get("focus", 0.42)
        img = kb_frame(self._covers[side], ipw, iph,
                       0.5 + 0.03 * k, focus - 0.03 * k, 1.0 - 0.06 * k)
        img = C.vignette(img, 0.22)
        frame = to_np(pil)
        frame[iy0:iy0 + iph, ix0:ix0 + ipw] = img
        pil = to_pil(frame)
        d = ImageDraw.Draw(pil, "RGBA")
        d.rectangle([ix0, iy0, ix0 + ipw, iy0 + iph], outline=(8, 8, 10, 255),
                    width=max(4, int(ipw * 0.012)))
        # label plate
        lines = self._built[side]
        base = 0.5 + (0.35 if side == "r" else 0.0)
        for i, line in enumerate(lines):
            raw = a01(t, base + i * self.stagger, 0.5,
                      ease=easing.ease_out_back)
            if raw <= 0:
                continue
            nl = _punch_in(line, raw)
            nlh, nlw = nl.shape[0], nl.shape[1]
            lx = x0 + (pw - nlw) / 2
            ly = y0 + ph - nlh - self.cfg.h * 0.035
            pil = to_pil(paste_rgba(to_np(pil), nl, (lx, ly)))
        return pil

    def _draw_points_panel(self, pil, side, t):
        x0, y0, pw, ph = self._panel_rects()[0 if side == "l" else 1]
        lines = self._built[side]
        slot = ph / max(1, len(lines))
        base = 0.9 + (0.35 if side == "r" else 0.0)
        for i, line in enumerate(lines):
            raw = a01(t, base + i * self.stagger, 0.5,
                      ease=easing.ease_out_back)
            if raw <= 0:
                continue
            nl = _punch_in(line, raw)
            nlh, nlw = nl.shape[0], nl.shape[1]
            # shrink-to-fit if a line is wider than the panel
            if nlw > pw * 0.94:
                s = pw * 0.94 / nlw
                li = to_pil(nl).resize((int(nlw * s), int(nlh * s)),
                                       Image.BILINEAR)
                nl = np.array(li)
                nlh, nlw = nl.shape[0], nl.shape[1]
            lx = x0 + (pw - nlw) / 2
            ly = y0 + i * slot + (slot - nlh) / 2
            pil = to_pil(paste_rgba(to_np(pil), nl, (lx, ly)))
        return pil

    def frame(self, t):
        self._build()
        frame = C.vignette(self.bg_frame(t), 0.3)
        pil = to_pil(frame)
        for side, panel in (("l", self.left), ("r", self.right)):
            delay = 0.0 if side == "l" else 0.25
            e = a01(t, delay, 0.6)
            if e <= 0:
                continue
            # fade+rise entrance per panel: draw to temp then composite
            if "image" in panel:
                sub = self._draw_image_panel(to_pil(frame.copy()), side, t)
            else:
                sub = self._draw_points_panel(to_pil(frame.copy()), side, t)
            # panel-local alpha + rise
            dy = int((1 - e) * 26)
            alpha = e
            tmp = np.array(sub).astype(np.float32)
            base = frame.astype(np.float32)
            if dy:
                tmp = np.roll(tmp, dy, axis=0)
            comp = (base * (1 - alpha) + tmp * alpha).astype(np.uint8)
            # only take the panel's region so panels don't cross-fade each other
            x0, y0, pw, ph = self._panel_rects()[0 if side == "l" else 1]
            x0, y0, pw, ph = int(x0), int(y0), int(pw), int(ph)
            frame[y0:y0 + ph, x0:x0 + pw] = comp[y0:y0 + ph, x0:x0 + pw]
            pil = to_pil(frame)
        return to_np(pil)

    def validate(self):
        from pathlib import Path
        issues = super().validate()
        for side, panel in (("left", self.left), ("right", self.right)):
            if "image" in panel:
                img = panel["image"]
                if isinstance(img, str) and not Path(img).exists():
                    issues.append(f"{side} panel image not found: {img}")
                if not panel.get("label"):
                    issues.append(f"{side} image panel has no label")
            elif "points" in panel:
                if not panel["points"]:
                    issues.append(f"{side} points panel is empty")
            else:
                issues.append(f"{side} panel needs 'image' or 'points'")
        return issues


@slide('display-headline')
class DisplayHeadline(Slide):
    """Section header: huge centered outlined headline + smaller outlined sub,
    punching in over a drifting background."""

    def __init__(self, headline, sub="", bg=None, duration=4.2, cfg=None):
        super().__init__(duration, bg, cfg)
        self.headline = headline
        self.sub = sub
        self._lines = None

    def _build(self):
        if self._lines is None:
            h, w = self.cfg.h, self.cfg.w
            self._lines = [_outlined_block(self.headline, int(h * 0.125),
                                           w * 0.92)]
            if self.sub:
                self._lines.append(_outlined_block(self.sub, int(h * 0.056),
                                                   w * 0.9))

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        self._build()
        frame = C.vignette(self.bg_frame(t), 0.35)
        y = h * 0.30
        for i, line in enumerate(self._lines):
            raw = a01(t, 0.4 + i * 0.9, 0.5, ease=easing.ease_out_back)
            if raw <= 0:
                continue
            nl = _punch_in(line, raw)
            nlh, nlw = nl.shape[0], nl.shape[1]
            if nlw > w * 0.92:
                s = w * 0.92 / nlw
                li = to_pil(nl).resize((int(nlw * s), int(nlh * s)),
                                       Image.BILINEAR)
                nl = np.array(li)
                nlh, nlw = nl.shape[0], nl.shape[1]
            frame = paste_rgba(frame, nl, ((w - nlw) / 2, y))
            y += nlh + h * 0.05
        return frame


def _paper_line_img(tokens, size, hl_fill=(229, 45, 39)):
    """Black paper-style text line -> (text_img, swash_img).

    **bold** uses the bold face. ==highlight== spans are black on a red
    marker swash; swashes live on their own layer so a slide can wipe
    them in separately.
    """
    f_reg = get_font(size, bold=False)
    f_bld = get_font(size, bold=True)
    meas = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    widths = [meas.textlength(w + " ", font=f_bld if b else f_reg)
              for w, b, _ in tokens]
    asc, desc = f_bld.getmetrics()
    W = int(sum(widths)) + 64
    H = asc + desc + 64
    text_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    swash_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(text_img)
    x, y0 = 32, 32
    runs = []
    cur = None
    for (w, b, hl), tw in zip(tokens, widths):
        if hl and cur is None:
            cur = [x]
        elif not hl and cur is not None:
            cur.append(x)
            runs.append(tuple(cur))
            cur = None
        d.text((x, y0), w + " ", font=f_bld if b else f_reg,
               fill=(24, 22, 20, 255))
        x += tw
    if cur is not None:
        runs.append((cur[0], x))
    for x0, x1 in runs:
        # organic marker stroke: wavy edges, hugging the x-height like a
        # real highlighter (not a geometric box)
        pad = int(size * 0.12)
        rx0, rx1 = x0 - pad, x1 + pad
        top = y0 + int(asc * 0.12)
        bot = top + int((asc + desc) * 0.78)
        seed = zlib.crc32(f"{rx0:.0f}:{rx1:.0f}".encode())
        rnd = random.Random(seed)
        n = max(4, int((rx1 - rx0) / 50))
        pts = [(rx0 + (rx1 - rx0) * i / n, top + rnd.uniform(-2.5, 2.5))
               for i in range(n + 1)]
        pts += [(rx0 + (rx1 - rx0) * i / n, bot + rnd.uniform(-2.5, 2.5))
                for i in range(n, -1, -1)]
        lay = Image.new("RGBA", (int(rx1 - rx0) + 40, bot - top + 40),
                        (0, 0, 0, 0))
        dl = ImageDraw.Draw(lay)
        dl.polygon([(x - rx0 + 20, y - top + 20) for x, y in pts],
                   fill=hl_fill + (255,))
        lay = lay.rotate(-1.0, expand=True, resample=Image.BICUBIC)
        cx, cy = (rx0 + rx1) / 2, (top + bot) / 2
        swash_img.paste(lay, (int(cx - lay.width / 2), int(cy - lay.height / 2)),
                        lay)
    return text_img, swash_img


def _paper_block(text, size, max_w, hl_fill=(229, 45, 39)):
    """Wrapped paper text -> list of (text_img, swash_img) per line."""
    tokens = _rich_tokens(text)
    f_bld = get_font(size, bold=True)
    meas = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    widths = [meas.textlength(w + " ", font=f_bld if b else get_font(size))
              for w, b, _ in tokens]
    lines, cur, cw = [], [], 0
    for tok, tw in zip(tokens, widths):
        if cur and cw + tw > max_w:
            lines.append(cur)
            cur, cw = [], 0
        cur.append(tok)
        cw += tw
    if cur:
        lines.append(cur)
    return [_paper_line_img(ln, size, hl_fill) for ln in lines or [[]]]


_PAPER_BG = {"type": "gradient", "top": (247, 243, 233), "bottom": (230, 223, 205)}


def _rich_block_size(text, size, max_w, line_spacing=1.35):
    """Measure (width, height) of a wrapped rich paragraph."""
    tokens = _rich_tokens(text)
    f_reg = get_font(size, bold=False)
    f_bld = get_font(size, bold=True)
    meas = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    widths = [meas.textlength(w + " ", font=f_bld if b else f_reg)
              for w, b, _ in tokens]
    lines, cur, cw = [], [], 0
    for tw in widths:
        if cur and cw + tw > max_w:
            lines.append(cur)
            cur, cw = [], 0
        cur.append(tw)
        cw += tw
    if cur:
        lines.append(cur)
    asc, desc = f_bld.getmetrics()
    lh = int((asc + desc) * line_spacing)
    w = max((sum(l) for l in lines), default=0)
    return w, lh * len(lines)


def _rich_para_dark(pil, box, text, size, fill=(235, 238, 245),
                    line_spacing=1.35, alpha=255, collect=None):
    """Wrapped paragraph on dark bg with **bold** spans (bold lead-ins).

    Plain text renders exactly like the old draw_para path (regular face);
    **marked** words use the bold face. ==highlight== is treated as bold.

    collect: optional list; appends (word, x0, y0, x1, y1) pixel boxes.
    """
    tokens = _rich_tokens(text)
    f_reg = get_font(size, bold=False)
    f_bld = get_font(size, bold=True)
    meas = ImageDraw.Draw(pil)
    widths = [meas.textlength(w + " ", font=f_bld if b else f_reg)
              for w, b, _ in tokens]
    x0, y0, x1, y1 = box
    max_w = x1 - x0
    lines, cur, cw = [], [], 0
    for tok, tw in zip(tokens, widths):
        if cur and cw + tw > max_w:
            lines.append(cur)
            cur, cw = [], 0
        cur.append((tok, tw))
        cw += tw
    if cur:
        lines.append(cur)
    asc, desc = f_bld.getmetrics()
    lh = int((asc + desc) * line_spacing)
    d = ImageDraw.Draw(pil, "RGBA")
    y = y0
    for line in lines:
        x = x0
        for (w, b, _), tw in line:
            if collect is not None:
                collect.append((w, x, y, x + tw, y + lh))
            d.text((x, y), w + " ", font=f_bld if b else f_reg,
                   fill=tuple(fill) + (alpha,))
            x += tw
        y += lh
    return pil


def _rough_silhouette(w, h, seed=7, jitter=6, border=14):
    """White hand-cut sticker edge: wavy polygon silhouette behind a photo."""
    rnd = random.Random(seed)
    W, H = w + border * 2, h + border * 2
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    edges = [((border, border), (border + w, border)),
             ((border + w, border), (border + w, border + h)),
             ((border + w, border + h), (border, border + h)),
             ((border, border + h), (border, border))]
    pts = []
    for (x0, y0), (x1, y1) in edges:
        n = max(4, int(math.hypot(x1 - x0, y1 - y0) / 40))
        for i in range(n):
            t = i / n
            pts.append((x0 + (x1 - x0) * t + rnd.uniform(-jitter, jitter),
                        y0 + (y1 - y0) * t + rnd.uniform(-jitter, jitter)))
    d.polygon(pts, fill=(255, 255, 255, 255))
    return img



def card_image(image, tw, shape="rect", border="sticker", label="",
               tilt=0.0, seed=7):
    """Photo card with a border treatment. Returns an RGBA PIL image.

    border: "sticker" = rough hand-cut white edge | (r,g,b) = flat frame
            | None = plain. shape: "rect" | "circle".
    label: outlined display text across the card ("LONGHOUSE").
    """
    src = to_pil(C.cover(_as_image(image), tw, int(tw * 0.72))).convert("RGBA")
    if shape == "circle":
        side = min(src.size)
        src = src.crop(((src.width - side) // 2, (src.height - side) // 2,
                        (src.width + side) // 2, (src.height + side) // 2))
        ring = int(side * 0.055)
        ring_fill = border if isinstance(border, tuple) else (255, 255, 255)
        base = Image.new("RGBA", (side + ring * 2, side + ring * 2),
                         (0, 0, 0, 0))
        d = ImageDraw.Draw(base)
        d.ellipse([0, 0, side + ring * 2 - 1, side + ring * 2 - 1],
                  fill=ring_fill + (255,))
        mask = Image.new("L", (side, side), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, side - 1, side - 1], fill=255)
        base.paste(src, (ring, ring), mask)
    elif border == "sticker":
        tw_, th_ = src.size
        sil = _rough_silhouette(tw_, th_, seed=seed)
        base = Image.new("RGBA", sil.size, (0, 0, 0, 0))
        base.alpha_composite(sil, (0, 0))
        base.alpha_composite(src, (14, 14))
    elif isinstance(border, tuple):
        bw = max(4, int(tw * 0.028))
        base = Image.new("RGBA", (src.width + bw * 2, src.height + bw * 2),
                         border + (255,))
        base.alpha_composite(src, (bw, bw))
    else:
        base = src
    if label:
        lab = _outlined_line(label, max(18, int(base.height * 0.16)))
        lw, lh = lab.size
        if lw > base.width * 0.96:
            s = base.width * 0.96 / lw
            lab = lab.resize((int(lw * s), int(lh * s)), Image.BILINEAR)
        lw, lh = lab.size
        base.alpha_composite(lab, ((base.width - lw) // 2,
                                   (base.height - lh) // 2))
    if tilt:
        base = base.rotate(tilt, expand=True, resample=Image.BICUBIC)
    return base



@slide('highlight')
class HighlightSlide(Slide):
    """Bold paper-style statement with red marker highlights.

    text: paragraph with **bold** / ==highlight== markers; lines stagger
    in and each marker swash wipes on after its line lands.
    card: optional {"image": path, "caption": "..."} — a tilted photo card
    pinned top-right with a caption bar, like the review-video cutaway.
    """

    def __init__(self, text, card=None, duration=None, bg=None, stagger=0.8,
                 cfg=None):
        bg = _PAPER_BG if bg is None else bg
        self.text = text
        self.card = card
        self.stagger = stagger
        n = max(1, len(text) // 60)
        duration = duration or (2.6 + stagger * n + 1.6)
        super().__init__(duration, bg, cfg)
        self._lines = None
        self._card_img = None

    def _build(self):
        if self._lines is None:
            h, w = self.cfg.h, self.cfg.w
            max_w = w * (0.56 if self.card else 0.86)
            self._lines = _paper_block(self.text, int(h * 0.058), max_w)
            # record each line's fractional geometry so overlays (e.g.
            # Magnifier) can target text instead of guessing coordinates
            self._line_boxes = []
            x0, y = w * 0.07, h * (0.30 if self.card else 0.24)
            for timg, _simg in self._lines:
                tw, th = timg.size
                self._line_boxes.append({
                    "x0": x0 / w, "x1": (x0 + tw) / w,
                    "y0": y / h, "y1": (y + th) / h,
                    "yc": (y + th / 2) / h,
                })
                y += th + h * 0.018
        if self.card and self._card_img is None:
            self._card_img = self._build_card()

    def line_boxes(self):
        """Fractional boxes of each laid-out text line: [{x0, x1, y0, y1, yc}]."""
        self._build()
        return list(self._line_boxes)

    def _build_card(self):
        w, h = self.cfg.w, self.cfg.h
        cw, chh = int(w * 0.30), int(h * 0.30)
        img = to_pil(C.cover(_as_image(self.card["image"]), cw,
                             int(chh * 0.72)))
        cap_h = int(chh * 0.28)
        card = Image.new("RGBA", (cw, chh), (250, 248, 242, 255))
        card.paste(img, (0, 0))
        d = ImageDraw.Draw(card)
        d.rectangle([0, chh - cap_h, cw, chh], fill=(18, 18, 20, 255))
        cap = self.card.get("caption", "")
        if cap:
            # shrink caption to fit the card width
            csize = int(cap_h * 0.42)
            font = get_font(csize, bold=True)
            meas = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
            while csize > 8 and meas.textlength(cap, font=font) > cw - 28:
                csize -= 1
                font = get_font(csize, bold=True)
            asc, _ = font.getmetrics()
            d.text((14, chh - cap_h + (cap_h - asc) // 2),
                   cap, font=font, fill=(255, 255, 255, 255))
        # drop shadow
        sh = Image.new("RGBA", (cw + 30, chh + 30), (0, 0, 0, 0))
        ds = ImageDraw.Draw(sh)
        ds.rounded_rectangle([15, 15, 15 + cw, 15 + chh], radius=6,
                             fill=(0, 0, 0, 110))
        sh = sh.filter(ImageFilter.GaussianBlur(10))
        base = Image.new("RGBA", (cw + 30, chh + 30), (0, 0, 0, 0))
        base.alpha_composite(sh, (0, 0))
        base.alpha_composite(card, (15, 15))
        return base.rotate(1.8, expand=True, resample=Image.BICUBIC)

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        self._build()
        frame = self.bg_frame(t)
        for i, lb in enumerate(self._line_boxes):
            self._register_text(
                f"line:{i}",
                (lb["x0"] * w, lb["y0"] * h, lb["x1"] * w, lb["y1"] * h),
                (35, 32, 28), int(h * 0.058))
        x0, y = w * 0.07, h * (0.30 if self.card else 0.24)
        for i, (timg, simg) in enumerate(self._lines):
            e = a01(t, 0.4 + i * self.stagger, 0.5)
            if e <= 0:
                continue
            # swash wipes in left-to-right (under the text) after line lands
            se = a01(t, 0.4 + i * self.stagger + 0.45, 0.45)
            dy = int((1 - e) * 18)
            tw, th = timg.size
            if se > 0 and simg.getbbox():
                sw, shh = simg.size
                clip = simg.crop((0, 0, int(sw * se), shh))
                frame = paste_rgba(frame, np.array(clip), (x0, y + dy))
            # text fades/rises in on top
            tmp = timg.copy()
            a = tmp.split()[3].point(lambda v, e=e: int(v * min(1.0, e)))
            tmp.putalpha(a)
            frame = paste_rgba(frame, np.array(tmp), (x0, y + dy))
            y += th + h * 0.018
        if self.card and self._card_img is not None:
            ce = a01(t, 0.3, 0.7, ease=easing.ease_out_back)
            if ce > 0:
                ci = self._card_img
                sc = 0.6 + 0.4 * ce
                ci = ci.resize((int(ci.width * sc), int(ci.height * sc)),
                               Image.BILINEAR)
                a = ci.split()[3].point(lambda v, ce=ce: int(v * min(1.0, ce)))
                ci.putalpha(a)
                frame = paste_rgba(frame, np.array(ci),
                                   (w * 0.66, h * 0.05 - (1 - ce) * 60))
        return frame

    def validate(self):
        from pathlib import Path
        issues = super().validate()
        if self.card:
            img = self.card.get("image")
            if isinstance(img, str) and not Path(img).exists():
                issues.append(f"card image not found: {img}")
            if not self.card.get("caption"):
                issues.append("card has no caption")
        if not self.text.strip():
            issues.append("text is empty")
        return issues


@slide('compare')
class CompareSlide(Slide):
    """Banner header + two-column comparison, review-video style.

    CompareSlide("CONFLICTING WORLDVIEWS",
        left={"head": "EUROPEANS",
              "sections": [{"sub": "Land Use",
                            "points": ["Land could be owned by individuals"]}]},
        right={...})
    """

    def __init__(self, title, left, right, duration=None, stagger=1.0,
                 banner_fill=(211, 47, 47), bg=None, cfg=None):
        bg = _PAPER_BG if bg is None else bg
        self.title = title
        self.cols = [left, right]
        self.stagger = stagger
        self.banner_fill = banner_fill
        nsec = sum(len(c.get("sections", [])) for c in self.cols)
        duration = duration or (2.4 + stagger * nsec + 1.6)
        super().__init__(duration, bg, cfg)
        self._banner = None
        self._heads = None

    def _build(self):
        if self._banner is None:
            h = self.cfg.h
            # white text on the red banner
            font = get_font(int(h * 0.055), bold=True)
            tmp = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
            tw = tmp.textlength(self.title, font=font)
            asc, desc = font.getmetrics()
            pad_x, pad_y = int(h * 0.03), int(h * 0.012)
            bw, bh = int(tw) + pad_x * 2, asc + desc + pad_y * 2
            img = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            d.rounded_rectangle([0, 0, bw - 1, bh - 1],
                               radius=int(h * 0.014),
                               fill=self.banner_fill + (255,))
            d.text((pad_x, pad_y), self.title, font=font,
                   fill=(255, 255, 255, 255))
            self._banner = img
            max_hw = self.cfg.w * 0.40
            heads = []
            for c in self.cols:
                hi = _outlined_line(c.get("head", ""), int(h * 0.072))
                if hi.width > max_hw:
                    s = max_hw / hi.width
                    hi = hi.resize((int(hi.width * s), int(hi.height * s)),
                                   Image.BILINEAR)
                heads.append(hi)
            self._heads = heads

    def _column_x(self, i):
        w = self.cfg.w
        return w * 0.07 if i == 0 else w * 0.53

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        self._build()
        frame = self.bg_frame(t)
        # banner
        be = a01(t, 0.1, 0.5, ease=easing.ease_out_back)
        if be > 0:
            bw, bh = self._banner.size
            sc = 0.7 + 0.3 * be
            b = self._banner.resize((int(bw * sc), int(bh * sc)),
                                    Image.BILINEAR)
            a = b.split()[3].point(lambda v, be=be: int(v * min(1.0, be)))
            b.putalpha(a)
            frame = paste_rgba(frame, np.array(b), ((w - b.width) / 2, h * 0.055))
        # divider
        pil = to_pil(frame)
        d = ImageDraw.Draw(pil, "RGBA")
        de = a01(t, 0.5, 0.6)
        if de > 0:
            dh = int(h * 0.62 * de)
            d.line([w / 2, h * 0.24, w / 2, h * 0.24 + dh],
                   fill=(120, 112, 96, 200), width=3)
        frame = to_np(pil)
        # columns
        sec_idx = 0
        for ci, col in enumerate(self.cols):
            x0 = self._column_x(ci)
            he = a01(t, 0.5 + ci * 0.3, 0.5, ease=easing.ease_out_back)
            if he > 0:
                head = _punch_in(self._heads[ci], he)
                frame = paste_rgba(frame, head, (x0, h * 0.22))
            y = h * 0.36
            for sec in col.get("sections", []):
                se = a01(t, 0.9 + sec_idx * self.stagger, 0.45)
                sec_idx += 1
                if se <= 0:
                    continue
                pil = to_pil(frame)
                d = ImageDraw.Draw(pil, "RGBA")
                sub = sec.get("sub", "")
                if sub:
                    font = get_font(int(h * 0.046), bold=True)
                    a = int(255 * min(1.0, se))
                    d.text((x0 + (1 - se) * 40, y), sub, font=font,
                           fill=(178, 34, 30, a))
                    y += int(h * 0.062)
                for j, pt in enumerate(sec.get("points", [])):
                    pe = a01(t, 0.9 + (sec_idx - 1) * self.stagger + 0.25 + j * 0.4,
                             0.4)
                    if pe <= 0:
                        continue
                    # wrap inside the column: bullets never cross the divider
                    blines = _paper_block("• " + pt, int(h * 0.040), w * 0.40)
                    for li, (timg, _) in enumerate(blines):
                        tw, th = timg.size
                        a = timg.split()[3].point(
                            lambda v, pe=pe: int(v * min(1.0, pe)))
                        timg.putalpha(a)
                        frame = paste_rgba(to_np(pil), np.array(timg),
                                           (x0 + (1 - pe) * 40, y))
                        pil = to_pil(frame)
                        y += th + (h * 0.012 if li == len(blines) - 1
                                   else h * 0.006)
                y += h * 0.03
                frame = to_np(pil)
        return frame

    def validate(self):
        issues = super().validate()
        for i, col in enumerate(self.cols):
            side = ("left", "right")[i]
            if not col.get("head"):
                issues.append(f"{side} column has no head")
            if not col.get("sections"):
                issues.append(f"{side} column has no sections")
        if not self.title.strip():
            issues.append("title is empty")
        return issues


def _banner_img(text, size, fill, fg=(255, 255, 255)):
    """Red banner chip with bold text (module-level; CompareSlide inlines its own)."""
    font = get_font(size, bold=True)
    tmp = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    tw = tmp.textlength(text, font=font)
    asc, desc = font.getmetrics()
    pad_x, pad_y = int(size * 0.7), int(size * 0.35)
    img = Image.new("RGBA", (int(tw) + pad_x * 2, asc + desc + pad_y * 2),
                    (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, img.width - 1, img.height - 1],
                        radius=int(size * 0.25), fill=fill + (255,))
    d.text((pad_x, pad_y), text, font=font, fill=fg + (255,))
    return img


@slide('collage')
class CollageSlide(Slide):
    """Scrapbook layout: photo cards + center banner + marker text notes.

    cards: [{"image": path, "at": (0.14, 0.22), "w": 0.24,
             "shape": "rect"|"circle", "border": "sticker"|(r,g,b)|None,
             "caption": "", "tilt": -2.0, "label": ""}]
      at = card center in frame fractions; w = width as frame fraction.
    banner: "INDIGENOUS SOCIETIES: EXAMPLES" — red banner, white text.
    notes: [{"text": "==marker== text", "at": (0.5, 0.08), "size": 0.030,
             "align": "center"|"left", "width": 0.4}]
    """

    def __init__(self, cards=(), banner="", notes=(), duration=None,
                 stagger=0.7, banner_fill=(211, 47, 47), bg=None, cfg=None):
        bg = _PAPER_BG if bg is None else bg
        self.cards = list(cards)
        self.banner = banner
        self.notes = list(notes)
        self.stagger = stagger
        self.banner_fill = banner_fill
        duration = duration or (2.2 + stagger * (len(self.cards) +
                                                 len(self.notes) + 1) + 1.4)
        super().__init__(duration, bg, cfg)
        self._built = None

    def _build(self):
        if self._built is not None:
            return
        w, h = self.cfg.w, self.cfg.h
        cards = []
        for i, c in enumerate(self.cards):
            img = card_image(c["image"], int(w * c.get("w", 0.24)),
                             shape=c.get("shape", "rect"),
                             border=c.get("border", "sticker"),
                             label=c.get("label", ""),
                             tilt=c.get("tilt", 0.0), seed=100 + i)
            # soft drop shadow
            sh = Image.new("RGBA", (img.width + 24, img.height + 24),
                           (0, 0, 0, 0))
            ImageDraw.Draw(sh).rounded_rectangle(
                [12, 12, 12 + img.width, 12 + img.height], radius=8,
                fill=(0, 0, 0, 90))
            sh = sh.filter(ImageFilter.GaussianBlur(8))
            base = Image.new("RGBA", sh.size, (0, 0, 0, 0))
            base.alpha_composite(sh, (0, 0))
            base.alpha_composite(img, (12, 12))
            cap = c.get("caption", "")
            if cap:
                font = get_font(int(h * 0.026), bold=True)
                cb = Image.new("RGBA", (base.width, int(h * 0.05)),
                               (0, 0, 0, 0))
                d = ImageDraw.Draw(cb)
                d.text((12, 6), cap, font=font, fill=(24, 22, 20, 255))
                full = Image.new("RGBA", (base.width,
                                           base.height + cb.height),
                                 (0, 0, 0, 0))
                full.alpha_composite(base, (0, 0))
                full.alpha_composite(cb, (0, base.height))
                base = full
            cards.append(base)
        banner = (_banner_img(self.banner, int(h * 0.052), self.banner_fill)
                  if self.banner else None)
        notes = []
        for n in self.notes:
            size = int(h * n.get("size", 0.030))
            lines = _paper_block(n["text"], size, w * n.get("width", 0.4))
            notes.append(lines)
        self._built = (cards, banner, notes)

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        self._build()
        cards, banner, notes = self._built
        frame = self.bg_frame(t)
        for i, c in enumerate(self.cards):
            e = a01(t, 0.3 + i * self.stagger, 0.6, ease=easing.ease_out_back)
            if e <= 0:
                continue
            img = cards[i]
            sc = 0.7 + 0.3 * e
            im = img.resize((int(img.width * sc), int(img.height * sc)),
                            Image.BILINEAR)
            a = im.split()[3].point(lambda v, e=e: int(v * min(1.0, e)))
            im.putalpha(a)
            ax, ay = c["at"]
            frame = paste_rgba(frame, np.array(im),
                               (ax * w - im.width / 2, ay * h - im.height / 2))
        if banner is not None:
            be = a01(t, 0.2 + len(self.cards) * self.stagger, 0.5,
                     ease=easing.ease_out_back)
            if be > 0:
                bw, bh = banner.size
                sc = 0.7 + 0.3 * be
                b = banner.resize((int(bw * sc), int(bh * sc)), Image.BILINEAR)
                a = b.split()[3].point(lambda v, be=be: int(v * min(1.0, be)))
                b.putalpha(a)
                frame = paste_rgba(frame, np.array(b),
                                   ((w - b.width) / 2, h * 0.44))
        for k, n in enumerate(self.notes):
            ne = a01(t, 0.5 + (len(self.cards) + k) * self.stagger, 0.5)
            if ne <= 0:
                continue
            ax, ay = self.notes[k]["at"]
            align = self.notes[k].get("align", "left")
            y = ay * h
            se = a01(t, 0.5 + (len(self.cards) + k) * self.stagger + 0.4, 0.4)
            for timg, simg in notes[k]:
                tw, th = timg.size
                x = ax * w - (tw / 2 if align == "center" else 0)
                if se > 0 and simg.getbbox():
                    sw, shh = simg.size
                    clip = simg.crop((0, 0, int(sw * se), shh))
                    frame = paste_rgba(frame, np.array(clip), (x, y))
                tmp = timg.copy()
                a = tmp.split()[3].point(
                    lambda v, ne=ne: int(v * min(1.0, ne)))
                tmp.putalpha(a)
                frame = paste_rgba(frame, np.array(tmp), (x, y))
                y += th + h * 0.012
        return frame

    def validate(self):
        from pathlib import Path
        issues = super().validate()
        for i, c in enumerate(self.cards):
            img = c.get("image")
            if isinstance(img, str) and not Path(img).exists():
                issues.append(f"card {i} image not found: {img}")
            at = c.get("at", (0, 0))
            if not (0 <= at[0] <= 1 and 0 <= at[1] <= 1):
                issues.append(f"card {i} at= is outside 0..1")
        return issues


@slide('title-card')
class TitleCardSlide(Slide):
    """Postcard title: script kicker + giant heavy title over full-bleed art.

    The "Greetings from CAHOKIA" beat: a slow-drifting illustration with a
    casual kicker line on top and enormous title type across it.
    title may contain "\\n" for stacked lines.
    """

    def __init__(self, image, title, kicker="", title_fill=(18, 18, 20),
                 kicker_fill=(52, 130, 120), duration=4.5,
                 drift=(full_view(), (0.52, 0.5, 0.85)), cfg=None):
        bg = {"type": "image", "array": _as_image(image), "dim": 1.0,
              "drift": drift}
        super().__init__(duration, bg, cfg)
        self.title = title
        self.kicker = kicker
        self.title_fill = title_fill
        self.kicker_fill = kicker_fill
        self._built = None

    def _build(self):
        if self._built is not None:
            return
        w, h = self.cfg.w, self.cfg.h
        parts = []
        if self.kicker:
            kf = get_font(int(h * 0.055), serif=True)
            parts.append(("kicker", self.kicker, kf, self.kicker_fill))
        size = int(h * 0.21)
        font = get_font(size, bold=True)
        meas = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
        lines = self.title.split("\n")
        while size > 20:
            widths = [meas.textlength(l, font=font) for l in lines]
            if max(widths) <= w * 0.94:
                break
            size = int(size * 0.92)
            font = get_font(size, bold=True)
        asc, desc = font.getmetrics()
        for l in lines:
            parts.append(("title", l, font, self.title_fill))
        self._built = (parts, asc + desc)

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        self._build()
        parts, lh = self._built
        frame = C.vignette(self.bg_frame(t), 0.25)
        total = sum(lh if k == "title" else int(h * 0.075)
                    for k, _, _, _ in parts)
        y = (h - total) / 2
        for k, text, font, fill in parts:
            e = a01(t, 0.3 if k == "kicker" else 0.7, 0.6,
                    ease=easing.ease_out if k == "kicker"
                    else easing.ease_out_back)
            step = lh if k == "title" else int(h * 0.075)
            if e > 0:
                a = int(255 * min(1.0, e))
                if k == "title":
                    tmp = Image.new("RGBA", (w, lh + 40), (0, 0, 0, 0))
                    dt = ImageDraw.Draw(tmp)
                    tw = dt.textlength(text, font=font)
                    dt.text(((w - tw) / 2, 20), text, font=font,
                            fill=fill + (255,))
                    sc = 0.85 + 0.15 * e
                    nw, nh = int(w * sc), int(tmp.height * sc)
                    tmp = tmp.resize((nw, nh), Image.BILINEAR)
                    al = tmp.split()[3].point(lambda v, a=a: int(v * a / 255))
                    tmp.putalpha(al)
                    frame = paste_rgba(frame, np.array(tmp),
                                       ((w - nw) / 2, y + 20 - 20 * sc))
                else:
                    pil = to_pil(frame)
                    d = ImageDraw.Draw(pil, "RGBA")
                    tw = d.textlength(text, font=font)
                    d.text(((w - tw) / 2, y), text, font=font,
                           fill=fill + (a,))
                    frame = to_np(pil)
            y += step
        return frame


@slide('image')
class ImageSlide(Slide):
    """Full-bleed image with a slow drift, title + caption over scrims."""

    def __init__(self, image, caption="", title="", duration=5.0,
                 drift=(full_view(), (0.52, 0.5, 0.82)), cfg=None):
        bg = {"type": "image", "array": _as_image(image), "dim": 1.0, "drift": drift}
        super().__init__(duration, bg, cfg)
        self.caption = caption
        self.title = title

    def frame(self, t):
        frame = self.bg_frame(t)
        frame = C.vignette(frame, 0.3)
        if self.caption:
            frame = C.bottom_scrim(frame)
        pil = to_pil(frame)
        w, h = self.cfg.w, self.cfg.h
        if self.title:
            e = a01(t, 0.2, 0.7)
            pil = C.draw_para(pil, (w * 0.06, h * 0.06, w * 0.94, h * 0.2),
                              self.title, size=int(h * 0.07), fill=(255, 255, 255),
                              bold=True, stroke=2, alpha=int(255 * e))
        if self.caption:
            e = a01(t, 0.5, 0.7)
            pil = C.draw_para(pil, (w * 0.06, h * 0.78, w * 0.94, h * 0.95),
                              self.caption, size=int(h * 0.045), fill=(255, 255, 255),
                              stroke=2, alpha=int(255 * e))
        return to_np(pil)


@slide('split')
class SplitSlide(Slide):
    """Image on one half, text panel on the other."""

    def __init__(self, image, heading, body, side="left", duration=5.5,
                 accent=ACCENT, bg=None, cfg=None):
        super().__init__(duration, bg, cfg)
        self.image = _as_image(image)
        self.heading = heading
        self.body = body if isinstance(body, list) else [body]
        self.side = side
        self.accent = accent
        self._img_cover = None

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        frame = self.bg_frame(t)
        hw = w // 2
        if self._img_cover is None:
            self._img_cover = C.cover(self.image, hw, h)
        k = smooth(t / self.duration)
        img = kb_frame(self._img_cover, hw, h, 0.5, 0.5, 1.0 - 0.15 * k)
        img = C.vignette(img, 0.25)
        if self.side == "left":
            frame[:, :hw] = img
            px0 = hw
        else:
            frame[:, hw:] = img
            px0 = 0

        pil = to_pil(frame)
        d = ImageDraw.Draw(pil, "RGBA")
        # accent divider
        dx = hw if self.side == "left" else hw
        d.rectangle([dx - 3, 0, dx + 3, h], fill=self.accent + (255,))

        e = a01(t, 0.25, 0.6)
        pil = C.draw_para(pil, (px0 + w * 0.05, h * 0.12, px0 + hw - w * 0.05, h * 0.4),
                          self.heading, size=int(h * 0.075), fill=INK, bold=True,
                          alpha=int(255 * e))
        y = h * 0.42
        for i, para in enumerate(self.body):
            e = a01(t, 0.7 + i * 0.5, 0.6)
            if e <= 0:
                continue
            pil = C.draw_para(pil, (px0 + w * 0.05, y, px0 + hw - w * 0.05, h * 0.92),
                              para, size=int(h * 0.042), fill=MUTED,
                              alpha=int(255 * e))
            _, ph = C.text_block_size(para, int(h * 0.042), hw - w * 0.1)
            y += ph + h * 0.04
        return to_np(pil)


@slide('quote')
class QuoteSlide(Slide):
    """Centered serif pull-quote."""

    def __init__(self, quote, byline="", duration=4.5, accent=ACCENT, bg=None, cfg=None):
        super().__init__(duration, bg, cfg)
        self.quote = quote
        self.byline = byline
        self.accent = accent

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        frame = self.bg_frame(t)
        pil = to_pil(frame)
        e = a01(t, 0.15, 0.8)
        if e > 0:
            alpha = int(255 * e)
            d = ImageDraw.Draw(pil, "RGBA")
            mark = get_font(int(h * 0.28), bold=True, serif=True)
            d.text((w * 0.09, h * 0.10), "\u201c", font=mark,
                   fill=self.accent + (int(160 * e),))
            pil = C.draw_para(pil, (w * 0.14, h * 0.28, w * 0.86, h * 0.72),
                              self.quote, size=int(h * 0.062), fill=INK, serif=True,
                              align="center", valign="center", alpha=alpha)
        if self.byline:
            e2 = a01(t, 0.9, 0.7)
            if e2 > 0:
                pil = C.draw_para(pil, (w * 0.2, h * 0.74, w * 0.8, h * 0.88),
                                  "\u2014 " + self.byline, size=int(h * 0.04),
                                  fill=MUTED, align="center", alpha=int(255 * e2))
        return to_np(pil)


@slide('stat')
class StatSlide(Slide):
    """Big animated count-up number."""

    def __init__(self, value, label, prefix="", suffix="", decimals=0,
                 duration=4.0, accent=ACCENT, bg=None, cfg=None):
        super().__init__(duration, bg, cfg)
        self.value = value
        self.label = label
        self.prefix = prefix
        self.suffix = suffix
        self.decimals = decimals
        self.accent = accent

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        frame = self.bg_frame(t)
        pil = to_pil(frame)
        k = ease_out(min(1.0, t / 1.6))
        v = self.value * k
        txt = f"{self.prefix}{v:,.{self.decimals}f}{self.suffix}"
        e = a01(t, 0.1, 0.5)
        if e > 0:
            pil = C.draw_para(pil, (0, h * 0.28, w, h * 0.58), txt,
                              size=int(h * 0.24), fill=INK, bold=True,
                              align="center", alpha=int(255 * e))
            uw = int(w * 0.2 * a01(t, 0.4, 0.6))
            if uw:
                d = ImageDraw.Draw(pil, "RGBA")
                d.rounded_rectangle([w / 2 - uw / 2, h * 0.62, w / 2 + uw / 2, h * 0.62 + 8],
                                   radius=4, fill=self.accent + (255,))
        e2 = a01(t, 0.8, 0.7)
        if e2 > 0:
            pil = C.draw_para(pil, (w * 0.15, h * 0.68, w * 0.85, h * 0.9),
                              self.label, size=int(h * 0.05), fill=MUTED,
                              align="center", alpha=int(255 * e2))
        return to_np(pil)


@slide('kenburns')
class KenBurnsSlide(Slide):
    """Full-bleed camera tour through a list of views, with title + caption."""

    _image_driven = True

    def __init__(self, image, stops, hold=1.2, title="", caption="",
                 duration=None, cfg=None):
        n = len(stops)
        duration = duration or (hold * n + 1.4 * (n - 1))
        super().__init__(duration, None, cfg)
        self.kb = KenBurns(_as_image(image), duration, stops, hold=hold, cfg=cfg)
        self.title = title
        self.caption = caption

    def frame(self, t):
        if self.kb.cfg is None:
            self.kb.cfg = self.cfg
        frame = C.vignette(self.kb.frame(t), 0.3)
        w, h = self.cfg.w, self.cfg.h
        if self.title or self.caption:
            # top scrim for title readability
            sh = int(h * 0.24)
            alpha = np.linspace(0.55, 0, sh, dtype=np.float32)[:, None, None]
            top = frame[:sh].astype(np.float32) * (1 - alpha)
            frame[:sh] = top.astype(np.uint8)
        if self.caption:
            frame = C.bottom_scrim(frame)
        pil = to_pil(frame)
        if self.title:
            e = a01(t, 0.2, 0.7)
            pil = C.draw_para(pil, (w * 0.06, h * 0.05, w * 0.94, h * 0.2),
                              self.title, size=int(h * 0.065), fill=(255, 255, 255),
                              bold=True, stroke=2, alpha=int(255 * e))
        if self.caption:
            frame_np = to_np(pil)
            frame_np = C.bottom_scrim(frame_np)
            pil = to_pil(frame_np)
            e = a01(t, 0.5, 0.7)
            pil = C.draw_para(pil, (w * 0.06, h * 0.8, w * 0.94, h * 0.96),
                              self.caption, size=int(h * 0.045), fill=(255, 255, 255),
                              stroke=2, alpha=int(255 * e))
        return to_np(pil)


@slide('callout')
class CalloutSlide(Slide):
    """Hold the full image, then zoom into labeled regions one by one.

    callouts: [{"at": (cx, cy), "zoom": 2.4, "label": "..."}, ...]
    """

    _image_driven = True

    def __init__(self, image, callouts, intro_hold=1.0, zoom_hold=1.8,
                 move_dur=0.9, duration=None, accent=ACCENT, cfg=None,
                 start_wide=True):
        self.image = _as_image(image)
        self.callouts = list(callouts)
        self.accent = accent
        self.move_dur = move_dur
        # build keyframed timeline: [full] -> zoom_i (hold) -> ... -> full
        views = []
        holds = []
        self._callout_info = []
        if start_wide:
            views.append(full_view())
            holds.append(intro_hold)
            self._callout_info.append((None, None))
        for c in self.callouts:
            views.append((c["at"][0], c["at"][1], 1.0 / c.get("zoom", 2.4)))
            holds.append(zoom_hold)
            self._callout_info.append((c.get("label", ""), c.get("sub", "")))
        views.append(full_view())
        holds.append(0.8)
        self._callout_info.append((None, None))
        total = sum(holds) + move_dur * (len(views) - 1)
        duration = duration or total
        super().__init__(duration, None, cfg)
        # segments: (t0, t1, kind, view_a, view_b, label_idx)
        self._segs = []
        t = 0.0
        for i, (v, hold_t) in enumerate(zip(views, holds)):
            self._segs.append((t, t + hold_t, "hold", v, v, i))
            t += hold_t
            if i < len(views) - 1:
                self._segs.append((t, t + move_dur, "move", v, views[i + 1], None))
                t += move_dur
        s0, s1, kind, a, b, li = self._segs[-1]
        self._segs[-1] = (s0, duration, kind, a, b, li)

    def _seg_at(self, t):
        t = min(max(t, 0.0), self.duration - 1e-6)
        for seg in self._segs:
            if t <= seg[1]:
                return seg
        return self._segs[-1]

    def view_at(self, t):
        """Interpolated camera view (cx, cy, fw) at scene-local time t."""
        t0, t1, kind, va, vb, li = self._seg_at(t)
        if kind == "move":
            k = ease_in_out((t - t0) / max(1e-6, t1 - t0))
            return (va[0] + (vb[0] - va[0]) * k,
                    va[1] + (vb[1] - va[1]) * k,
                    va[2] + (vb[2] - va[2]) * k)
        return va

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        t0, t1, kind, va, vb, li = self._seg_at(t)
        if kind == "move":
            k = ease_in_out((t - t0) / max(1e-6, t1 - t0))
            view = (va[0] + (vb[0] - va[0]) * k,
                    va[1] + (vb[1] - va[1]) * k,
                    va[2] + (vb[2] - va[2]) * k)
        else:
            view = va
        frame = C.vignette(kb_frame(self.image, w, h, *view), 0.3)
        pil = to_pil(frame)

        # marker + label while holding on a zoomed callout
        if kind == "hold" and li not in (0, len(self._callout_info) - 1):
            label, sub = self._callout_info[li]
            # fade the callout in/out at the hold edges
            e = max(0.0, min(1.0, (t - t0) / 0.4, (t1 - t) / 0.4))
            pil = self._draw_marker(pil, w, h, t, e, label, sub)
        return to_np(pil)

    def _draw_marker(self, pil, w, h, t, e, label, sub):
        """Pulsing ring + label. Override for custom markers (e.g. map pins)."""
        r = int(h * 0.075 + h * 0.012 * math.sin(2 * math.pi * t * 2))
        d = ImageDraw.Draw(pil, "RGBA")
        alpha = int(255 * max(0.0, e))
        d.ellipse([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r],
                  outline=self.accent + (alpha,), width=max(3, h // 180))
        d.ellipse([w / 2 - r - 14, h / 2 - r - 14, w / 2 + r + 14, h / 2 + r + 14],
                  outline=self.accent + (int(alpha * 0.35),), width=2)
        if label:
            return self._label_pill(pil, w, h, e, label, sub, h / 2 + r + 26)
        return pil

    def _label_pill(self, pil, w, h, e, label, sub, top_y):
        ls, ss = int(h * 0.042), int(h * 0.034)
        lw, lh = C.text_block_size(label, ls, w * 0.7, bold=True)
        sw, sh = C.text_block_size(sub, ss, w * 0.7) if sub else (0, 0)
        bw = max(lw, sw) + 48
        bh = lh + (sh + 10 if sub else 0) + 28
        bx0 = w / 2 - bw / 2
        alpha = int(255 * max(0.0, e))
        frame_np = C.pill(to_np(pil), (bx0, top_y, bx0 + bw, top_y + bh),
                          radius=14, fill=(12, 14, 22),
                          alpha=int(225 * max(0.0, e)))
        pil = to_pil(frame_np)
        pil = C.draw_para(pil, (bx0 + 24, top_y + 12, bx0 + bw - 24, top_y + bh),
                          label, size=ls, fill=(255, 255, 255),
                          bold=True, alpha=alpha)
        if sub:
            pil = C.draw_para(pil, (bx0 + 24, top_y + 12 + lh + 8, bx0 + bw - 24,
                                    top_y + bh),
                              sub, size=ss, fill=MUTED, alpha=alpha)
        return pil


@slide('map-zoom')
class MapZoomSlide(CalloutSlide):
    """Zoom-to-location tour over a map, with pulsing map pins.

    markers: [{"at": (cx, cy), "zoom": 3.2, "label": "Gettysburg",
               "sub": "July 1863"}, ...]
    """

    def __init__(self, map_image, markers, intro_hold=1.2, zoom_hold=2.2,
                 move_dur=1.0, duration=None, accent=(226, 74, 74), cfg=None,
                 start_wide=True):
        callouts = [{"at": m["at"], "zoom": m.get("zoom", 3.2),
                     "label": m.get("label", ""), "sub": m.get("sub", "")}
                    for m in markers]
        super().__init__(map_image, callouts, intro_hold=intro_hold,
                         zoom_hold=zoom_hold, move_dur=move_dur,
                         duration=duration, accent=accent, cfg=cfg,
                         start_wide=start_wide)

    def _draw_marker(self, pil, w, h, t, e, label, sub):
        pulse = 1 + 0.10 * math.sin(2 * math.pi * t * 2)
        r = int(h * 0.045 * pulse)
        cx, cy = w / 2, h / 2 - r * 0.7
        alpha = int(255 * max(0.0, e))
        col = self.accent + (alpha,)
        d = ImageDraw.Draw(pil, "RGBA")
        d.ellipse([cx - r * 1.9, cy - r * 1.9, cx + r * 1.9, cy + r * 1.9],
                  outline=self.accent + (int(alpha * 0.35),), width=2)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
        d.polygon([(cx - r * 0.68, cy + r * 0.30),
                   (cx + r * 0.68, cy + r * 0.30),
                   (cx, cy + r * 1.65)], fill=col)
        d.ellipse([cx - r * 0.36, cy - r * 0.36, cx + r * 0.36, cy + r * 0.36],
                  fill=(255, 255, 255, alpha))
        if label:
            return self._label_pill(pil, w, h, e, label, sub, cy + r * 1.65 + 18)
        return pil

    def validate(self):
        issues = super().validate()
        for i, m in enumerate(self.callouts):
            issues.extend(_check_at(m.get("at"), f"callouts[{i}].at"))
            if not m.get("label"):
                issues.append(f"callouts[{i}] has no label")
        return issues


def _check_at(at, what):
    """Validate a fractional (x, y) coordinate; return [issues]."""
    if not isinstance(at, (list, tuple)) or len(at) != 2:
        return [f"{what} must be an [x, y] pair, got {at!r}"]
    issues = []
    for v, axis in zip(at, "xy"):
        if not isinstance(v, (int, float)) or isinstance(v, bool):
            issues.append(f"{what}.{axis} must be a number, got {v!r}")
        elif not 0.0 <= v <= 1.0:
            issues.append(f"{what}.{axis}={v} is outside the 0..1 map range")
    return issues


@slide('route')
class RouteSlide(MapZoomSlide):
    """Animated travel route over a map.

    The camera starts AT the first waypoint (no backwards establishing
    move) and hops forward while a glowing, gently arcing route line draws
    itself with marching dashes, pins + labels at each stop.

    waypoints: [{"at": (cx, cy), "label": "...", "sub": "..."}, ...]
    """

    def __init__(self, map_image, waypoints, zoom=2.6, hold=1.6, move_dur=1.8,
                 duration=None, accent=(255, 176, 66), line_width=6,
                 curvature=0.16, start_wide=False, cfg=None):
        self.waypoints = list(waypoints)
        self.line_width = line_width
        self.curvature = curvature
        markers = [{"at": w["at"], "zoom": zoom,
                    "label": w.get("label", ""), "sub": w.get("sub", "")}
                   for w in self.waypoints]
        super().__init__(map_image, markers, intro_hold=hold, zoom_hold=hold,
                         move_dur=move_dur, duration=duration,
                         accent=accent, cfg=cfg, start_wide=start_wide)
        W = len(self.waypoints)
        # waypoint index per view (None = full-map establishing/outro views)
        self._view_waypoint = (([None] if start_wide else [])
                               + list(range(W)) + [None])

    @classmethod
    def from_route(cls, route, cfg=None, **kwargs):
        """Build from a route JSON file: RouteSlide.from_route("columbus_1492").

        `route` is a name under slideforge/routes/, a path to a .json file,
        or an already-loaded route dict. Extra kwargs (zoom, hold, ...) pass
        through to the constructor.
        """
        from .routes import load_route
        data = load_route(route) if isinstance(route, str) else dict(route)
        return cls(data["map"], data["waypoints"], cfg=cfg, **kwargs)

    def validate(self):
        issues = super().validate()
        if len(self.waypoints) < 2:
            issues.append(f"route needs >= 2 waypoints, got {len(self.waypoints)}")
        for i, wpt in enumerate(self.waypoints):
            issues.extend(_check_at(wpt.get("at"), f"waypoints[{i}].at"))
            if not wpt.get("label"):
                issues.append(f"waypoints[{i}] has no label")
        return issues

    def route_progress(self, t):
        """0..1 — how much of the route is drawn at scene-local time t."""
        W = len(self.waypoints)
        if W < 2:
            return 1.0
        segs = self._segs
        tt = min(max(t, 0.0), self.duration - 1e-6)
        idx = next((i for i, s in enumerate(segs) if tt <= s[1]), len(segs) - 1)
        t0, t1, kind, va, vb, li = segs[idx]
        vw = self._view_waypoint
        if kind == "hold":
            wi = vw[li]
            if wi is None:
                return 0.0 if li == 0 else 1.0
            return wi / (W - 1)
        m = idx // 2  # move m goes view m -> view m+1
        wi_from, wi_to = vw[m], vw[m + 1]
        if wi_from is None:    # establishing move: full -> first waypoint
            return 0.0
        if wi_to is None:      # outro move: last waypoint -> full
            return 1.0
        k = ease_in_out((tt - t0) / max(1e-6, t1 - t0))
        return min(1.0, (wi_from + k) / (W - 1))

    @staticmethod
    def _arc(a, b, curvature, samples=44):
        """Quadratic bezier arc bulging right-of-travel (flight-path look)."""
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / L, dx / L
        qx, qy = mx + nx * curvature * L, my + ny * curvature * L
        pts = []
        for i in range(samples + 1):
            u = i / samples
            x = (1 - u) ** 2 * a[0] + 2 * (1 - u) * u * qx + u ** 2 * b[0]
            y = (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * qy + u ** 2 * b[1]
            pts.append((x, y))
        return pts

    def frame(self, t):
        base = super().frame(t)
        w, h = self.cfg.w, self.cfg.h
        p = self.route_progress(t)
        if p <= 0:
            return base
        cx, cy, fw = self.view_at(t)
        ih, iw = self.image.shape[:2]
        fh = fw * (iw / ih) / (w / h)

        def proj(wx, wy):
            return ((wx - (cx - fw / 2)) / fw * w,
                    (wy - (cy - fh / 2)) / fh * h)

        wps = [wp["at"] for wp in self.waypoints]
        n = len(wps)
        total = n - 1
        target = p * total
        # revealed sample points across the arced segments
        shown = []
        for i in range(n - 1):
            pts = self._arc(proj(*wps[i]), proj(*wps[i + 1]), self.curvature)
            if i < int(target):
                shown.extend(pts)
            elif i == int(target):
                frac = target - i
                k = int(frac * (len(pts) - 1))
                shown.extend(pts[:k + 1])
                break
            else:
                break
        if len(shown) < 2:
            return base

        pil = to_pil(base)
        d = ImageDraw.Draw(pil, "RGBA")
        lw = max(3, int(self.line_width))
        # soft solid underlay so the route always reads
        for i in range(len(shown) - 1):
            d.line([shown[i], shown[i + 1]], fill=self.accent + (55,),
                   width=int(lw * 2.8), joint="curve")
        # marching dashes — alive even while the camera holds
        period, dash_len = 36.0, 21.0
        phase = (t * 60.0) % period
        dist = 0.0
        for i in range(len(shown) - 1):
            x0, y0 = shown[i]
            x1, y1 = shown[i + 1]
            segL = math.hypot(x1 - x0, y1 - y0)
            steps = max(1, int(segL / 6))
            for s in range(steps):
                f0, f1 = s / steps, (s + 1) / steps
                d0, d1 = dist + segL * f0, dist + segL * f1
                if ((d0 - phase) % period < dash_len
                        or (d1 - phase) % period < dash_len):
                    d.line([(x0 + (x1 - x0) * f0, y0 + (y1 - y0) * f0),
                            (x0 + (x1 - x0) * f1, y0 + (y1 - y0) * f1)],
                           fill=self.accent + (255,), width=lw)
            dist += segL
        # waypoint dots for visited stops
        for i in range(n):
            if i / total <= p + 1e-9:
                x, y = proj(*wps[i])
                r = lw * 0.9
                d.ellipse([x - r, y - r, x + r, y + r],
                          fill=self.accent + (255,),
                          outline=(255, 255, 255, 255), width=2)
        # glowing pulsing head
        hx, hy = shown[-1]
        pulse = 1 + 0.18 * math.sin(2 * math.pi * t * 2.5)
        for rr, al in [(lw * 3.4, 55), (lw * 2.1, 130)]:
            r = rr * pulse
            d.ellipse([hx - r, hy - r, hx + r, hy + r],
                      fill=self.accent + (al,))
        hr = lw * 1.15
        d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr],
                  outline=(255, 255, 255, 235), width=3)
        return to_np(pil)


def _title_block(frame, title, t, y_frac=0.10, size_frac=0.075, accent=ACCENT,
                 align="center"):
    """Title with an accent underline that draws itself in.

    Single source of truth for title+underline: the underline anchors to the
    *measured* text bottom, never to the layout box — so it can't drift into
    dead space when the title is shorter than its box. align="center" or
    "left".
    """
    w, h = frame.shape[1], frame.shape[0]
    pil = to_pil(frame)
    e = a01(t, 0.0, 0.6)
    size = int(h * size_frac)
    y_top = h * y_frac
    # measure the real wrapped height so the underline sits below the text
    # even when the title wraps to two lines; subtract ~half a cap-height
    # because the measured block includes trailing descent + line spacing
    # that would otherwise leave the underline floating in dead space
    _, text_h = C.text_block_size(title, size, w * 0.82, bold=True)
    y_line = y_top + text_h - int(size * 0.5) + 4
    pil = C.draw_para(pil, (w * 0.09, y_top, w * 0.91, y_top + h * 0.30),
                      title, size=size, fill=INK, bold=True,
                      align=align, alpha=int(255 * e))
    if align == "center":
        uw = int(w * 0.10 * a01(t, 0.2, 0.5))
    else:
        uw = int(w * 0.12 * a01(t, 0.2, 0.5))
    if uw:
        d = ImageDraw.Draw(pil, "RGBA")
        if align == "center":
            d.line([(w / 2 - uw / 2, y_line), (w / 2 + uw / 2, y_line)],
                   fill=accent + (int(255 * e),),
                   width=max(2, int(h * 0.008)))
        else:
            d.rounded_rectangle([w * 0.09, y_line, w * 0.09 + uw, y_line + 6],
                                radius=3, fill=accent + (255,))
    return to_np(pil)


def _bezier(p0, p1, p2, n=40):
    pts = []
    for i in range(n + 1):
        k = i / n
        x = (1 - k) ** 2 * p0[0] + 2 * (1 - k) * k * p1[0] + k ** 2 * p2[0]
        y = (1 - k) ** 2 * p0[1] + 2 * (1 - k) * k * p1[1] + k ** 2 * p2[1]
        pts.append((x, y))
    return pts


@slide("causal-chain")
class CausalChainSlide(Slide):
    """Cause-and-effect chain: node cards pop in left to right while hand-drawn
    arrows draw themselves between them.

    nodes: [(label, sub), ...] — up to 5 reads well.
    """

    def __init__(self, nodes, title="", duration=None, accent=ACCENT,
                 bg=None, cfg=None, stagger=0.9, arrow_dur=0.7):
        duration = duration or (1.2 + stagger * len(nodes))
        super().__init__(duration, bg, cfg)
        self.nodes = [(n[0], n[1] if len(n) > 1 else "") for n in nodes]
        self.title = title
        self.accent = accent
        self.stagger = stagger
        self.arrow_dur = arrow_dur

    def frame(self, t):
        frame = self.bg_frame(t)
        w, h = self.cfg.w, self.cfg.h
        n = len(self.nodes)
        if self.title:
            frame = _title_block(frame, self.title, t, y_frac=0.10)
        # card geometry
        gap = w * 0.035
        cw = min(w * 0.26, (w * 0.92 - gap * (n - 1)) / n)
        ch = h * 0.34
        total_w = cw * n + gap * (n - 1)
        x0 = (w - total_w) / 2
        y0 = h * 0.37
        pil = to_pil(frame)
        d = ImageDraw.Draw(pil, "RGBA")
        centers = []
        for i, (label, sub) in enumerate(self.nodes):
            e = a01(t, 0.4 + i * self.stagger, 0.6)
            if e <= 0:
                centers.append(None)
                continue
            pop = ease_out_back(min(1.0, e * 1.15))
            bw, bh = cw * pop, ch * pop
            x, y = x0 + i * (cw + gap), y0
            cx, cy = x + cw / 2, y + ch / 2
            centers.append((cx, cy))
            bx, by = cx - bw / 2, cy - bh / 2
            d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=18,
                                fill=(16, 20, 32, int(235 * e)),
                                outline=self.accent + (int(255 * e),), width=3)
            # node number chip
            chip_r = h * 0.028 * pop
            d.ellipse([cx - chip_r, by - chip_r, cx + chip_r, by + chip_r],
                      fill=self.accent + (int(255 * e),))
            font_n = get_font(int(h * 0.034), bold=True)
            d.text((cx, by), str(i + 1), font=font_n, anchor="mm",
                   fill=(10, 10, 12, int(255 * e)))
            pil = C.draw_para(pil, (bx + 14, by + ch * 0.16, bx + bw - 14, by + bh),
                              label, size=int(h * 0.042), fill=INK, bold=True,
                              align="center", alpha=int(255 * e))
            if sub:
                pil = C.draw_para(pil, (bx + 14, by + ch * 0.48, bx + bw - 14, by + bh - 10),
                                  sub, size=int(h * 0.030), fill=MUTED,
                                  align="center", alpha=int(255 * e))
            d = ImageDraw.Draw(pil, "RGBA")
        # arrows between consecutive visible cards
        for i in range(n - 1):
            if centers[i] is None or centers[i + 1] is None:
                continue
            ae = a01(t, 0.4 + i * self.stagger + 0.55, self.arrow_dur)
            if ae <= 0:
                continue
            x1 = x0 + i * (cw + gap) + cw + 6
            x2 = x0 + (i + 1) * (cw + gap) - 6
            ym = y0 + ch / 2
            ctrl = ((x1 + x2) / 2, ym - h * 0.055)
            pts = _bezier((x1, ym), ctrl, (x2, ym))
            shown = pts[:max(2, int(len(pts) * ae))]
            d.line(shown, fill=self.accent + (int(255 * min(1, ae * 1.2)),),
                   width=max(2, int(h * 0.008)), joint="curve")
            if ae > 0.85:
                # arrowhead
                ex, ey = pts[-1]
                ang = math.atan2(ey - pts[-3][1], ex - pts[-3][0])
                s = h * 0.022
                for da in (2.6, -2.6):
                    d.line([(ex, ey),
                            (ex - s * math.cos(ang + da), ey - s * math.sin(ang + da))],
                           fill=self.accent + (255,), width=max(2, int(h * 0.008)))
        return to_np(pil)


@slide("territory")
class TerritorySlide(Slide):
    """One map, borders filling in over time: territories appear in sequence
    with date stamps — territorial expansion as animation.

    territories: [{"at": (cx, cy), "rx": 0.09, "ry": 0.07, "label": "Louisiana",
                   "date": "1803", "color": (90, 140, 255)}, ...]
    at/rx/ry are fractions of the frame.
    """

    def __init__(self, map_image, territories, title="", duration=None,
                 bg=None, cfg=None, stagger=1.6, drift=False):
        # drift defaults to False: territories are pinned to frame fractions,
        # so a moving bg would silently misalign them.
        self.map_image = _as_image(map_image)
        # deep-ish copy: the layout resolver rewrites label_at in place
        self.territories = [dict(t) for t in territories]
        self.title = title
        self.stagger = stagger
        self.drift = drift
        self._layout_warnings = []
        duration = duration or (2.0 + stagger * len(territories))
        if bg is None:
            views = [full_view(), (0.5, 0.5, 0.9)] if drift else None
            bg = {"type": "image", "array": self.map_image, "dim": 0.45,
                  "drift": views}
        super().__init__(duration, bg, cfg)
        self._resolve_labels()

    def _pill_size(self, label, date):
        """Pixel (bw, bh, lh, dh) of a label pill at the standard sizes."""
        h = self.cfg.h
        w = self.cfg.w
        lw_, lh_ = C.text_block_size(label, int(h * 0.036), w * 0.3, bold=True)
        dw_, dh_ = C.text_block_size(date, int(h * 0.030), w * 0.3) if date else (0, 0)
        return max(lw_, dw_) + 30, lh_ + dh_ + 22, lh_, dh_

    def _resolve_labels(self):
        """Run label pills through the layout engine: pills nudge away from
        the title (and each other) instead of overlapping it. Warnings land
        in validate()."""
        from .layout import Layout
        w, h = self.cfg.w, self.cfg.h
        lo = Layout(w, h)
        if self.title:
            # _title_block draws centered at y_frac=0.07
            size = int(h * 0.075)
            tw_, th_ = C.text_block_size(self.title, size, w * 0.82, bold=True)
            tx0 = (w - tw_) / 2
            lo.add_fixed("title", (tx0, h * 0.07, tx0 + tw_, h * 0.07 + th_),
                         priority=100)
        for i, terr in enumerate(self.territories):
            lat = terr.get("label_at")
            if lat is None:
                continue
            bw, bh, _lh, _dh = self._pill_size(terr.get("label", ""),
                                             terr.get("date", ""))
            lx, ly = lat[0] * w, lat[1] * h
            lo.add(f"pill:{terr.get('label', i)}",
                   box=(lx - bw / 2, ly - bh / 2, lx + bw / 2, ly + bh / 2),
                   priority=10)
        resolved, warnings = lo.resolve()
        self._layout_warnings = warnings
        for i, terr in enumerate(self.territories):
            key = f"pill:{terr.get('label', i)}"
            if key in resolved:
                x0, y0, x1, y1 = resolved[key]
                terr["label_at"] = ((x0 + x1) / 2 / w, (y0 + y1) / 2 / h)

    def validate(self):
        issues = super().validate()
        issues.extend(self._layout_warnings)
        return issues

    def frame(self, t):
        frame = self.bg_frame(t)
        w, h = self.cfg.w, self.cfg.h
        if self.title:
            frame = _title_block(frame, self.title, t, y_frac=0.07)
            _tw, _th = C.text_block_size(self.title, int(h * 0.075),
                                         w * 0.82, bold=True)
            self._register_text("title", ((w - _tw) / 2, h * 0.07,
                                          (w + _tw) / 2, h * 0.07 + _th),
                                INK, int(h * 0.075))
        pil = to_pil(frame)
        d = ImageDraw.Draw(pil, "RGBA")
        # the newest territory that has started appearing stays vivid;
        # older ones fade to ghost outlines so the map never becomes a
        # Venn diagram of overlapping fills
        active = -1
        for i in range(len(self.territories)):
            if a01(t, 0.6 + i * self.stagger, 0.9) > 0:
                active = i
        for i, terr in enumerate(self.territories):
            e = a01(t, 0.6 + i * self.stagger, 0.9)
            if e <= 0:
                continue
            dim = i < active
            cx, cy = terr["at"][0] * w, terr["at"][1] * h
            rx, ry = terr.get("rx", 0.08) * w, terr.get("ry", 0.06) * h
            color = terr.get("color", (90, 140, 255))
            grow = ease_out(min(1.0, e * 1.2))
            if dim:
                # ghost: thin outline only, no fill, no pulse
                d.ellipse([cx - rx * grow, cy - ry * grow,
                           cx + rx * grow, cy + ry * grow],
                          outline=color + (int(110 * e),), width=2)
            else:
                # soft fill
                for k in range(3):
                    rr = (rx * (0.55 + 0.15 * k) * grow, ry * (0.55 + 0.15 * k) * grow)
                    d.ellipse([cx - rr[0], cy - rr[1], cx + rr[0], cy + rr[1]],
                              fill=color + (int(46 * e),))
                # edge
                pulse = 1 + 0.05 * math.sin(2 * math.pi * t * 2 + i)
                d.ellipse([cx - rx * grow * pulse, cy - ry * grow * pulse,
                           cx + rx * grow * pulse, cy + ry * grow * pulse],
                          outline=color + (int(255 * e),), width=3)
            label, date = terr.get("label", ""), terr.get("date", "")
            if e > 0.5 and label:
                le = a01(t, 0.6 + i * self.stagger + 0.45, 0.5)
                # the dark pill fades in ahead of the text so the label never
                # floats unreadably on the map mid-fade
                pill_e = min(1.0, le * 1.6)
                text_e = max(0.0, (le - 0.25) / 0.75)
                bw, bh, lh_, dh_ = self._pill_size(label, date)
                lat = terr.get("label_at")
                if lat is not None:
                    lx, ly = lat[0] * w, lat[1] * h
                else:
                    ly = cy - ry * grow - h * 0.055
                    if ly - bh / 2 < h * 0.27:
                        # title zone — flip the label below the territory
                        ly = cy + ry * grow + h * 0.055
                    lx = cx
                bx = min(max(lx - bw / 2, 8), w - bw - 8)
                by = ly - bh / 2
                if lat is not None:
                    # leader from pill to territory center
                    d.line([(bx + bw / 2, by + bh), (cx, cy)],
                           fill=(255, 255, 255, int(150 * pill_e)), width=2)
                d.rounded_rectangle([bx, by, bx + bw, by + bh],
                                    radius=10, fill=(12, 14, 22, int(225 * pill_e)))
                self._register_text(f"pill:{label}", (bx, by, bx + bw, by + bh),
                                    (255, 255, 255), int(h * 0.036))
                d.text((bx + bw / 2, by + lh_ / 2 - 2), label,
                       font=get_font(int(h * 0.036), bold=True), anchor="mm",
                       fill=(255, 255, 255, int(255 * text_e)))
                if date:
                    d.text((bx + bw / 2, by + lh_ + dh_ / 2 + 2), date,
                           font=get_font(int(h * 0.030), bold=True), anchor="mm",
                           fill=color + (int(255 * text_e),))
        return to_np(pil)


@slide("recall")
class RecallSlide(Slide):
    """Self-test beat: a question up top, answers rendered blurred that sharpen
    into focus one by one — turns passive watching into recall practice."""

    def __init__(self, question, answers, duration=None, bg=None, cfg=None,
                 stagger=1.4, blur_px=14):
        self.question = question
        self.answers = list(answers)
        self.stagger = stagger
        self.blur_px = blur_px
        duration = duration or (2.2 + stagger * len(answers))
        super().__init__(duration, bg, cfg)

    def frame(self, t):
        frame = self.bg_frame(t)
        w, h = self.cfg.w, self.cfg.h
        frame = _title_block(frame, self.question, t, y_frac=0.12,
                             size_frac=0.052)
        pil = to_pil(frame)
        for i, ans in enumerate(self.answers):
            t0 = 0.8 + i * self.stagger
            appear = a01(t, t0, 0.4)
            if appear <= 0:
                continue
            e = a01(t, t0 + 0.35, 0.9)  # sharpen progress
            y = h * (0.34 + i * 0.15)
            # answer card
            cw, chh = w * 0.62, h * 0.105
            x = (w - cw) / 2
            d = ImageDraw.Draw(pil, "RGBA")
            d.rounded_rectangle([x, y, x + cw, y + chh], radius=14,
                                fill=(16, 20, 32, int(230 * appear)),
                                outline=(120, 140, 180, int(120 * appear)), width=2)
            # text on its own layer so we can blur it
            layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            dl = ImageDraw.Draw(layer)
            dl.text((w / 2, y + chh / 2), ans,
                    font=get_font(int(h * 0.040), bold=True), anchor="mm",
                    fill=(235, 238, 245, int(255 * appear)))
            # number chip (stays sharp)
            d.ellipse([x - h * 0.032, y + chh / 2 - h * 0.032,
                       x - h * 0.032 + h * 0.064, y + chh / 2 + h * 0.032],
                      fill=ACCENT + (int(255 * appear),))
            d.text((x, y + chh / 2), str(i + 1),
                   font=get_font(int(h * 0.034), bold=True), anchor="mm",
                   fill=(10, 10, 12, int(255 * appear)))
            r = self.blur_px * (1 - e)
            if r > 0.5:
                layer = layer.filter(ImageFilter.GaussianBlur(r))
            pil = Image.alpha_composite(pil.convert("RGBA"), layer).convert("RGB")
        # "pause and think" hint early on
        he = min(a01(t, 0.3, 0.4), 1 - a01(t, 1.6, 0.5))
        if he > 0:
            d = ImageDraw.Draw(pil, "RGBA")
            d.text((w / 2, h * 0.84), "pause — try to recall before it sharpens",
                   font=get_font(int(h * 0.028)), anchor="mm",
                   fill=(150, 160, 180, int(200 * he)))
        return to_np(pil)


@slide("spectrum")
class SpectrumSlide(Slide):
    """Position-on-a-spectrum visualizer: an axis with end labels, markers that
    drop in, and markers that can *move* along the axis mid-slide.

    markers: [{"at": 0.15, "label": "Hamilton", "color": (90,140,255),
               "move_to": 0.5, "move_start": 4.0}, ...]
    """

    def __init__(self, axis, markers, title="", duration=None, bg=None,
                 cfg=None, stagger=1.0):
        self.axis = tuple(axis)
        self.markers = list(markers)
        self.title = title
        self.stagger = stagger
        moves = [m.get("move_start", 0) for m in markers if "move_to" in m]
        duration = duration or (2.5 + stagger * len(markers)
                                + (1.5 if moves else 0))
        super().__init__(duration, bg, cfg)

    def _marker_x(self, m, i, t, x0, x1):
        base = m["at"]
        if "move_to" in m:
            k = a01(t, m.get("move_start", 0.8 + i * self.stagger + 0.8), 1.4)
            k = smooth(k)
            base = base + (m["move_to"] - base) * k
        return x0 + base * (x1 - x0)

    def frame(self, t):
        frame = self.bg_frame(t)
        w, h = self.cfg.w, self.cfg.h
        if self.title:
            frame = _title_block(frame, self.title, t, y_frac=0.10)
        pil = to_pil(frame)
        d = ImageDraw.Draw(pil, "RGBA")
        x0, x1 = w * 0.12, w * 0.88
        ay = h * 0.52
        # axis
        ae = a01(t, 0.3, 0.6)
        if ae > 0:
            d.line([(x0, ay), (x0 + (x1 - x0) * ae, ay)],
                   fill=(140, 150, 170, int(255 * ae)), width=4)
            for k in range(11):
                tx = x0 + (x1 - x0) * k / 10 * ae
                d.line([(tx, ay - 8), (tx, ay + 8)],
                       fill=(140, 150, 170, int(200 * ae)), width=2)
            fs = int(h * 0.036)
            d.text((x0, ay + h * 0.045), self.axis[0], font=get_font(fs, bold=True),
                   anchor="mt", fill=(200, 205, 215, int(255 * ae)))
            d.text((x1, ay + h * 0.045), self.axis[1], font=get_font(fs, bold=True),
                   anchor="mt", fill=(200, 205, 215, int(255 * ae)))
        # markers
        for i, m in enumerate(self.markers):
            e = a01(t, 0.8 + i * self.stagger, 0.5)
            if e <= 0:
                continue
            color = m.get("color", ACCENT)
            mx = self._marker_x(m, i, t, x0, x1)
            drop = (1 - ease_out(min(1.0, e * 1.2))) * -h * 0.10
            my = ay + drop
            r = h * 0.026
            # stem
            d.line([(mx, ay), (mx, my - h * 0.055)], fill=color + (int(255 * e),),
                   width=3)
            # knob
            d.ellipse([mx - r, my - h * 0.055 - r, mx + r, my - h * 0.055 + r],
                      fill=color + (int(255 * e),),
                      outline=(255, 255, 255, int(255 * e)), width=2)
            label = m.get("label", "")
            if label:
                d.text((mx, my - h * 0.055 - r - h * 0.018), label,
                       font=get_font(int(h * 0.034), bold=True), anchor="mb",
                       fill=(235, 238, 245, int(255 * e)))
            sub = m.get("sub", "")
            if sub and "move_to" in m and a01(t, m.get("move_start", 0), 0.3) > 0:
                se = a01(t, m.get("move_start", 0) + 0.2, 0.5)
                d.text((mx, ay + h * 0.10), sub,
                       font=get_font(int(h * 0.028)), anchor="mt",
                       fill=color + (int(255 * se),))
        return to_np(pil)
