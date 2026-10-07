"""SketchSlide: Heimler-style whiteboard sketches from plan JSON.

The director authors simple elements (icons, arrows, text) with no image
assets. Stage A (this module) renders a deterministic vector master:
frame-exact and sync-safe. Stage B (video-pipeline/stages/sketch_ink.py)
optionally stylizes the settled frame via LTX into a lively ink hold,
cached by sketch hash. The master stays clean: LTX adds style, never
structure.
"""

import math

import numpy as np
from PIL import Image, ImageDraw

from .easing import ease_out
from .canvas import get_font, to_pil, to_np, paste_rgba
from .plugins import slide
from .slides import Slide


def a01(t, start, dur, ease=ease_out):
    """0..1 appear-progress of an element that starts at `start` seconds."""
    if t < start:
        return 0.0
    if dur <= 0:
        return 1.0
    return ease(min(1.0, (t - start) / dur))


INK = (58, 44, 30)
PAPER_BG = {"type": "gradient", "top": (247, 243, 233),
            "bottom": (232, 226, 210)}


def _moneybag(d, x0, y0, s, ink, w):
    d.ellipse([x0 + 0.18 * s, y0 + 0.34 * s, x0 + 0.82 * s, y0 + 0.92 * s],
              outline=ink, width=w)
    d.polygon([(x0 + 0.5 * s, y0 + 0.08 * s), (x0 + 0.38 * s, y0 + 0.30 * s),
               (x0 + 0.62 * s, y0 + 0.30 * s)], outline=ink)
    d.line([x0 + 0.36 * s, y0 + 0.34 * s, x0 + 0.64 * s, y0 + 0.34 * s],
           fill=ink, width=w)
    d.ellipse([x0 + 0.42 * s, y0 + 0.55 * s, x0 + 0.58 * s, y0 + 0.71 * s],
              outline=ink, width=max(1, w - 1))


def _soldier(d, x0, y0, s, ink, w):
    d.arc([x0 + 0.28 * s, y0 + 0.08 * s, x0 + 0.72 * s, y0 + 0.52 * s],
          start=180, end=360, fill=ink, width=w)
    d.line([x0 + 0.24 * s, y0 + 0.31 * s, x0 + 0.76 * s, y0 + 0.31 * s],
           fill=ink, width=w)
    d.ellipse([x0 + 0.40 * s, y0 + 0.33 * s, x0 + 0.60 * s, y0 + 0.53 * s],
              outline=ink, width=w)
    d.polygon([(x0 + 0.32 * s, y0 + 0.92 * s), (x0 + 0.38 * s, y0 + 0.58 * s),
               (x0 + 0.62 * s, y0 + 0.58 * s), (x0 + 0.68 * s, y0 + 0.92 * s)],
              outline=ink)
    d.line([x0 + 0.74 * s, y0 + 0.20 * s, x0 + 0.60 * s, y0 + 0.92 * s],
           fill=ink, width=w)


def _ship(d, x0, y0, s, ink, w):
    d.polygon([(x0 + 0.08 * s, y0 + 0.62 * s), (x0 + 0.92 * s, y0 + 0.62 * s),
               (x0 + 0.74 * s, y0 + 0.86 * s), (x0 + 0.26 * s, y0 + 0.86 * s)],
              outline=ink)
    for mx in (0.36, 0.62):
        d.line([x0 + mx * s, y0 + 0.14 * s, x0 + mx * s, y0 + 0.62 * s],
               fill=ink, width=w)
    d.polygon([(x0 + 0.36 * s, y0 + 0.18 * s), (x0 + 0.36 * s, y0 + 0.52 * s),
               (x0 + 0.12 * s, y0 + 0.52 * s)], outline=ink)
    d.polygon([(x0 + 0.62 * s, y0 + 0.18 * s), (x0 + 0.62 * s, y0 + 0.52 * s),
               (x0 + 0.88 * s, y0 + 0.52 * s)], outline=ink)


def _crown(d, x0, y0, s, ink, w):
    d.polygon([(x0 + 0.14 * s, y0 + 0.72 * s), (x0 + 0.14 * s, y0 + 0.34 * s),
               (x0 + 0.32 * s, y0 + 0.54 * s), (x0 + 0.50 * s, y0 + 0.28 * s),
               (x0 + 0.68 * s, y0 + 0.54 * s), (x0 + 0.86 * s, y0 + 0.34 * s),
               (x0 + 0.86 * s, y0 + 0.72 * s)], outline=ink)
    d.rectangle([x0 + 0.14 * s, y0 + 0.72 * s, x0 + 0.86 * s, y0 + 0.86 * s],
                outline=ink, width=w)
    for cx in (0.14, 0.50, 0.86):
        r = 0.035 * s
        d.ellipse([x0 + cx * s - r, y0 + 0.24 * s - r,
                   x0 + cx * s + r, y0 + 0.24 * s + r], fill=ink)


def _church(d, x0, y0, s, ink, w):
    d.rectangle([x0 + 0.28 * s, y0 + 0.46 * s, x0 + 0.72 * s, y0 + 0.88 * s],
                outline=ink, width=w)
    d.polygon([(x0 + 0.22 * s, y0 + 0.46 * s), (x0 + 0.50 * s, y0 + 0.22 * s),
               (x0 + 0.78 * s, y0 + 0.46 * s)], outline=ink)
    d.line([x0 + 0.50 * s, y0 + 0.08 * s, x0 + 0.50 * s, y0 + 0.22 * s],
           fill=ink, width=w)
    d.line([x0 + 0.43 * s, y0 + 0.13 * s, x0 + 0.57 * s, y0 + 0.13 * s],
           fill=ink, width=w)
    d.rectangle([x0 + 0.43 * s, y0 + 0.64 * s, x0 + 0.57 * s, y0 + 0.88 * s],
                outline=ink, width=max(1, w - 1))


def _coin(d, x0, y0, s, ink, w):
    d.ellipse([x0 + 0.16 * s, y0 + 0.16 * s, x0 + 0.84 * s, y0 + 0.84 * s],
              outline=ink, width=w)
    d.ellipse([x0 + 0.30 * s, y0 + 0.30 * s, x0 + 0.70 * s, y0 + 0.70 * s],
              outline=ink, width=max(1, w - 1))


def _house(d, x0, y0, s, ink, w):
    d.rectangle([x0 + 0.24 * s, y0 + 0.44 * s, x0 + 0.76 * s, y0 + 0.88 * s],
                outline=ink, width=w)
    d.polygon([(x0 + 0.16 * s, y0 + 0.44 * s), (x0 + 0.50 * s, y0 + 0.16 * s),
               (x0 + 0.84 * s, y0 + 0.44 * s)], outline=ink)
    d.rectangle([x0 + 0.43 * s, y0 + 0.62 * s, x0 + 0.57 * s, y0 + 0.88 * s],
                outline=ink, width=max(1, w - 1))


def _tree(d, x0, y0, s, ink, w):
    d.rectangle([x0 + 0.46 * s, y0 + 0.70 * s, x0 + 0.54 * s, y0 + 0.90 * s],
                outline=ink, width=max(1, w - 1))
    for i, (top, base) in enumerate(((0.10, 0.40), (0.30, 0.58), (0.50, 0.78))):
        spread = 0.22 + 0.06 * i
        d.polygon([(x0 + 0.50 * s, y0 + top * s),
                   (x0 + (0.50 - spread) * s, y0 + base * s),
                   (x0 + (0.50 + spread) * s, y0 + base * s)], outline=ink)


def _cannon(d, x0, y0, s, ink, w):
    d.line([x0 + 0.12 * s, y0 + 0.56 * s, x0 + 0.88 * s, y0 + 0.36 * s],
           fill=ink, width=w + 2)
    for cx in (0.38, 0.60):
        r = 0.11 * s
        d.ellipse([x0 + cx * s - r, y0 + 0.62 * s - r,
                   x0 + cx * s + r, y0 + 0.62 * s + r],
                  outline=ink, width=w)
    d.line([x0 + 0.30 * s, y0 + 0.72 * s, x0 + 0.16 * s, y0 + 0.90 * s],
           fill=ink, width=w)
    d.line([x0 + 0.52 * s, y0 + 0.72 * s, x0 + 0.42 * s, y0 + 0.90 * s],
           fill=ink, width=w)


def _anchor(d, x0, y0, s, ink, w):
    r = 0.07 * s
    d.ellipse([x0 + 0.50 * s - r, y0 + 0.10 * s - r,
               x0 + 0.50 * s + r, y0 + 0.10 * s + r],
              outline=ink, width=w)
    d.line([x0 + 0.50 * s, y0 + 0.17 * s, x0 + 0.50 * s, y0 + 0.80 * s],
           fill=ink, width=w)
    d.line([x0 + 0.32 * s, y0 + 0.32 * s, x0 + 0.68 * s, y0 + 0.32 * s],
           fill=ink, width=w)
    d.arc([x0 + 0.20 * s, y0 + 0.50 * s, x0 + 0.80 * s, y0 + 0.92 * s],
          start=20, end=160, fill=ink, width=w)


def _scroll(d, x0, y0, s, ink, w):
    d.rectangle([x0 + 0.16 * s, y0 + 0.30 * s, x0 + 0.84 * s, y0 + 0.74 * s],
                outline=ink, width=w)
    d.ellipse([x0 + 0.08 * s, y0 + 0.26 * s, x0 + 0.24 * s, y0 + 0.78 * s],
              outline=ink, width=w)
    d.ellipse([x0 + 0.76 * s, y0 + 0.26 * s, x0 + 0.92 * s, y0 + 0.78 * s],
              outline=ink, width=w)
    for yy in (0.44, 0.56):
        d.line([x0 + 0.30 * s, y0 + yy * s, x0 + 0.70 * s, y0 + yy * s],
               fill=ink, width=max(1, w - 1))


def _flag(d, x0, y0, s, ink, w):
    d.line([x0 + 0.30 * s, y0 + 0.10 * s, x0 + 0.30 * s, y0 + 0.92 * s],
           fill=ink, width=w)
    r = 0.04 * s
    d.ellipse([x0 + 0.30 * s - r, y0 + 0.08 * s - r,
               x0 + 0.30 * s + r, y0 + 0.08 * s + r], fill=ink)
    d.polygon([(x0 + 0.30 * s, y0 + 0.16 * s), (x0 + 0.82 * s, y0 + 0.26 * s),
               (x0 + 0.30 * s, y0 + 0.44 * s)], outline=ink)


def _star(d, x0, y0, s, ink, w):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rad = 0.40 * s if i % 2 == 0 else 0.16 * s
        pts.append((x0 + 0.50 * s + rad * math.cos(ang),
                    y0 + 0.50 * s + rad * math.sin(ang)))
    d.polygon(pts, outline=ink)


def _sword(d, x0, y0, s, ink, w):
    d.polygon([(x0 + 0.45 * s, y0 + 0.08 * s), (x0 + 0.55 * s, y0 + 0.08 * s),
               (x0 + 0.55 * s, y0 + 0.60 * s), (x0 + 0.50 * s, y0 + 0.68 * s),
               (x0 + 0.45 * s, y0 + 0.60 * s)], outline=ink)
    d.line([x0 + 0.32 * s, y0 + 0.72 * s, x0 + 0.68 * s, y0 + 0.72 * s],
           fill=ink, width=w)
    d.line([x0 + 0.50 * s, y0 + 0.72 * s, x0 + 0.50 * s, y0 + 0.86 * s],
           fill=ink, width=w)
    r = 0.045 * s
    d.ellipse([x0 + 0.50 * s - r, y0 + 0.88 * s - r,
               x0 + 0.50 * s + r, y0 + 0.88 * s + r], fill=ink)


_ICONS = {
    "moneybag": _moneybag, "soldier": _soldier, "ship": _ship,
    "crown": _crown, "church": _church, "coin": _coin, "house": _house,
    "tree": _tree, "cannon": _cannon, "anchor": _anchor, "scroll": _scroll,
    "flag": _flag, "star": _star, "sword": _sword,
}
ICON_SHAPES = sorted(_ICONS)


def _icon_tile(shape, size_px, ink):
    """RGBA tile with the icon centered, for scale-pop rendering."""
    tile = Image.new("RGBA", (size_px, size_px), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    _ICONS[shape](d, 0, 0, size_px, ink + (255,),
                  max(2, size_px // 22))
    return tile


def _frac_pair(val, what, i):
    if (not isinstance(val, (list, tuple)) or len(val) != 2
            or not all(isinstance(v, (int, float)) for v in val)
            or not all(0.0 <= v <= 1.0 for v in val)):
        raise ValueError(
            f"sketch element #{i}: {what} must be an [x, y] pair in "
            f"[0, 1], got {val!r}")
    return [float(val[0]), float(val[1])]


def _ink_color(val, i):
    if val is None:
        return INK
    if (not isinstance(val, (list, tuple)) or len(val) != 3
            or not all(isinstance(v, int) and 0 <= v <= 255 for v in val)):
        raise ValueError(
            f"sketch element #{i}: ink must be [r, g, b] ints, got {val!r}")
    return tuple(val)


def _checked_element(el, i):
    """Validate + normalize one sketch element (compiler-checkable)."""
    if not isinstance(el, dict):
        raise ValueError(f"sketch element #{i} must be a dict, got {el!r}")
    kind = el.get("type")
    if kind == "icon":
        shape = el.get("shape")
        if shape not in _ICONS:
            raise ValueError(
                f"sketch element #{i}: unknown icon shape {shape!r} "
                f"(choose from: {', '.join(ICON_SHAPES)})")
        for k in ("x", "y"):
            v = el.get(k)
            if not isinstance(v, (int, float)) or not 0.0 <= v <= 1.0:
                raise ValueError(
                    f"sketch element #{i}: {k} must be in [0, 1], "
                    f"got {v!r}")
        size = el.get("size", 0.18)
        if not isinstance(size, (int, float)) or not 0.0 < size <= 0.6:
            raise ValueError(
                f"sketch element #{i}: size must be in (0, 0.6], "
                f"got {size!r}")
        label = el.get("label", "")
        if not isinstance(label, str):
            raise ValueError(
                f"sketch element #{i}: label must be a string, got {label!r}")
        return {"type": "icon", "shape": shape, "x": float(el["x"]),
                "y": float(el["y"]), "size": float(size), "label": label,
                "ink": _ink_color(el.get("ink"), i)}
    if kind == "arrow":
        frm = _frac_pair(el.get("from"), '"from"', i)
        to = _frac_pair(el.get("to"), '"to"', i)
        if frm == to:
            raise ValueError(
                f"sketch element #{i}: arrow from/to must differ")
        label = el.get("label", "")
        if not isinstance(label, str):
            raise ValueError(
                f"sketch element #{i}: label must be a string, got {label!r}")
        return {"type": "arrow", "from": frm, "to": to, "label": label,
                "ink": _ink_color(el.get("ink"), i)}
    if kind == "text":
        text = el.get("text")
        if not isinstance(text, str) or not text.strip():
            raise ValueError(
                f"sketch element #{i}: text must be a non-empty string, "
                f"got {text!r}")
        for k in ("x", "y"):
            v = el.get(k)
            if not isinstance(v, (int, float)) or not 0.0 <= v <= 1.0:
                raise ValueError(
                    f"sketch element #{i}: {k} must be in [0, 1], "
                    f"got {v!r}")
        size = el.get("size", 0.042)
        if not isinstance(size, (int, float)) or not 0.0 < size <= 0.2:
            raise ValueError(
                f"sketch element #{i}: size must be in (0, 0.2], "
                f"got {size!r}")
        return {"type": "text", "text": text, "x": float(el["x"]),
                "y": float(el["y"]), "size": float(size),
                "bold": bool(el.get("bold", False)),
                "ink": _ink_color(el.get("ink"), i)}
    raise ValueError(
        f"sketch element #{i}: unknown type {kind!r} "
        f"(choose from: icon, arrow, text)")


@slide("sketch")
class SketchSlide(Slide):
    """Whiteboard sketch from plan JSON: icons, arrows, and text labels.

    Deterministic vector master (Stage A): elements reveal in order with
    a draw-on feel (arrows wipe, icons pop, text fades). No image assets.
    """

    def __init__(self, elements, title="", duration=None, stagger=1.0,
                 bg=None, cfg=None):
        if not isinstance(elements, list) or not elements:
            raise ValueError("sketch needs a non-empty elements list, "
                             f"got {elements!r}")
        self.elements = [_checked_element(el, i)
                         for i, el in enumerate(elements)]
        self.title = title
        self.stagger = stagger
        duration = duration if duration is not None \
            else (1.2 + stagger * len(self.elements) + 1.5)
        super().__init__(duration, bg if bg is not None else dict(PAPER_BG),
                         cfg)
        self._tiles = {}

    def validate(self):
        if len(self.elements) > 12:
            return [f"sketch: {len(self.elements)} elements may clutter; "
                    f"consider splitting the beat"]
        return []

    def _tile(self, shape, size_px, ink):
        key = (shape, size_px, ink)
        tile = self._tiles.get(key)
        if tile is None:
            tile = _icon_tile(shape, size_px, ink)
            self._tiles[key] = tile
        return tile

    def _draw_icon(self, pil, el, e, w, h):
        s = max(8, int(el["size"] * h))
        sc = 0.5 + 0.5 * e
        ns = max(1, int(s * sc))
        tile = self._tile(el["shape"], s, el["ink"])
        small = tile.resize((ns, ns), Image.BILINEAR)
        alpha = small.split()[3].point(lambda v: int(v * e))
        small.putalpha(alpha)
        cx, cy = int(el["x"] * w), int(el["y"] * h)
        grown = paste_rgba(to_np(pil), np.array(small),
                           (cx - ns // 2, cy - ns // 2))
        pil.paste(to_pil(grown))
        if el["label"] and e > 0.4:
            le = min(1.0, (e - 0.4) / 0.6)
            fs = int(h * 0.038)
            font = get_font(fs, bold=True)
            d = ImageDraw.Draw(pil, "RGBA")
            lx, ly = cx, cy + s // 2 + int(h * 0.035)
            d.text((lx, ly), el["label"], font=font, anchor="ma",
                   fill=el["ink"] + (int(255 * le),))
            tw = d.textlength(el["label"], font=font)
            self._register_text(f"sketch:label:{el['label']}",
                                (lx - tw / 2, ly, lx + tw / 2, ly + fs),
                                el["ink"], fs)

    def _draw_arrow(self, pil, el, e, w, h):
        x0, y0 = el["from"][0] * w, el["from"][1] * h
        x1, y1 = el["to"][0] * w, el["to"][1] * h
        p = max(0.001, e)
        tx, ty = x0 + (x1 - x0) * p, y0 + (y1 - y0) * p
        d = ImageDraw.Draw(pil, "RGBA")
        lw = max(2, int(h * 0.008))
        d.line([(x0, y0), (tx, ty)], fill=el["ink"] + (255,), width=lw,
               joint="curve")
        if e > 0.75:
            he = min(1.0, (e - 0.75) / 0.25)
            ang = math.atan2(y1 - y0, x1 - x0)
            hs = h * 0.028 * (0.5 + 0.5 * he)
            pts = [(x1, y1),
                   (x1 - hs * math.cos(ang - 0.42),
                    y1 - hs * math.sin(ang - 0.42)),
                   (x1 - hs * math.cos(ang + 0.42),
                    y1 - hs * math.sin(ang + 0.42))]
            d.polygon(pts, fill=el["ink"] + (int(255 * he),))
        if el["label"] and e > 0.5:
            le = min(1.0, (e - 0.5) / 0.5)
            mx, my = (x0 + x1) / 2, (y0 + y1) / 2 - h * 0.035
            fs = int(h * 0.034)
            font = get_font(fs)
            d.text((mx, my), el["label"], font=font, anchor="ma",
                   fill=el["ink"] + (int(255 * le),))
            tw = d.textlength(el["label"], font=font)
            self._register_text(f"sketch:arrow:{el['label']}",
                                (mx - tw / 2, my, mx + tw / 2, my + fs),
                                el["ink"], fs)

    def _draw_text(self, pil, el, e, w, h):
        d = ImageDraw.Draw(pil, "RGBA")
        fs = int(el["size"] * h)
        font = get_font(fs, bold=el["bold"])
        x, y = el["x"] * w, el["y"] * h - (1 - e) * h * 0.01
        d.text((x, y), el["text"], font=font, anchor="ma",
               fill=el["ink"] + (int(255 * e),))
        tw = d.textlength(el["text"], font=font)
        self._register_text(f"sketch:text:{el['text'][:24]}",
                            (x - tw / 2, y, x + tw / 2, y + fs),
                            el["ink"], fs)

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        frame = self.bg_frame(t)
        pil = to_pil(frame)
        if self.title:
            d = ImageDraw.Draw(pil, "RGBA")
            fs = int(h * 0.072)
            font = get_font(fs, bold=True)
            d.text((w / 2, h * 0.10), self.title, font=font, anchor="ma",
                   fill=INK + (255,))
            tw = d.textlength(self.title, font=font)
            self._register_text("sketch:title",
                                (w / 2 - tw / 2, h * 0.10,
                                 w / 2 + tw / 2, h * 0.10 + fs),
                                INK, fs)
        for i, el in enumerate(self.elements):
            e = a01(t, 0.5 + i * self.stagger, 0.7)
            if e <= 0:
                continue
            if el["type"] == "icon":
                self._draw_icon(pil, el, e, w, h)
            elif el["type"] == "arrow":
                self._draw_arrow(pil, el, e, w, h)
            else:
                self._draw_text(pil, el, e, w, h)
        return to_np(pil)
