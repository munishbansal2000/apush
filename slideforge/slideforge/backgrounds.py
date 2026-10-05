"""Background providers. Each is ``(slide, w, h, t, spec) -> np frame``.

The ``slide`` argument gives providers a per-slide cache
(``slide.__dict__.setdefault("_bg_cache", {})``) and the slide duration.
New background types are a plugin away::

    from slideforge.plugins import background

    @background("parchment")
    def parchment_bg(slide, w, h, t, spec):
        ...
"""

import numpy as np

from . import canvas as C
from . import easing  # noqa: F401  (re-exported for providers)
from .easing import smooth
from .kenburns import kb_frame
from .plugins import background


def _as_array(spec_img):
    if isinstance(spec_img, np.ndarray):
        return spec_img
    return C.load_image(spec_img)


def _cache(slide):
    return slide.__dict__.setdefault("_bg_cache", {})


@background("solid")
def _solid(slide, w, h, t, spec):
    return C.solid(w, h, spec["color"])


@background("gradient")
def _gradient(slide, w, h, t, spec):
    c = _cache(slide)
    if "frame" not in c:
        c["frame"] = C.vgradient(w, h, spec["top"], spec["bottom"])
    return c["frame"].copy()


@background("textured")
def _textured(slide, w, h, t, spec):
    """Procedural cinematic backdrop: gradient + grain + mottling + vignette.

    The library default — a slide must never render on a flat blank field,
    so even the fallback background has photographic texture. Authors should
    still pass a contextual image (era art, map, photo); validate() warns
    when they don't.
    """
    c = _cache(slide)
    if "frame" not in c:
        rng = np.random.default_rng(7)
        top = np.array(spec.get("top", (28, 32, 50)), dtype=np.float32)
        bottom = np.array(spec.get("bottom", (10, 11, 20)), dtype=np.float32)
        ys = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
        base = top[None, None, :] * (1 - ys) + bottom[None, None, :] * ys
        base = np.broadcast_to(base, (h, w, 3)).copy()
        # large soft mottling (low-res noise, block-upsampled)
        sh, sw = (h + 7) // 8, (w + 7) // 8
        mott = rng.normal(0, 1, (sh, sw, 1)).astype(np.float32)
        mott = np.repeat(np.repeat(mott, 8, axis=0), 8, axis=1)[:h, :w, :]
        base += mott * 7.0
        # fine film grain
        base += rng.normal(0, 1, (h, w, 1)).astype(np.float32) * 3.0
        frame = np.clip(base, 0, 255).astype(np.uint8)
        c["frame"] = C.vignette(frame, 0.45)
    return c["frame"].copy()


def _cache(slide):
    return slide.__dict__.setdefault("_bg_cache", {})


# APUSH period palettes for the "era" background. (top, bottom) gradient
# anchors + the accent used for kicker pills and box borders. Kept
# abstract: tint and grain, never fake documents or pseudo-text.
ERA_PALETTES = {
    1: {"name": "Contact 1491-1607",
        "top": (96, 76, 50), "bottom": (40, 30, 18),
        "accent": (212, 175, 105)},
    2: {"name": "Colonization 1607-1754",
        "top": (54, 60, 80), "bottom": (17, 19, 31),
        "accent": (205, 170, 100)},
    3: {"name": "Revolution 1754-1800",
        "top": (74, 62, 52), "bottom": (26, 20, 16),
        "accent": (200, 120, 90)},
    4: {"name": "Early republic 1800-1848",
        "top": (70, 78, 66), "bottom": (22, 26, 22),
        "accent": (190, 175, 120)},
    5: {"name": "Civil War 1844-1877",
        "top": (88, 66, 52), "bottom": (30, 20, 16),
        "accent": (185, 150, 100)},
    6: {"name": "Gilded / Industrial 1865-1898",
        "top": (58, 66, 80), "bottom": (18, 22, 30),
        "accent": (200, 170, 95)},
    7: {"name": "Modern America 1890-1945",
        "top": (66, 66, 70), "bottom": (20, 20, 24),
        "accent": (210, 180, 110)},
    8: {"name": "Cold War 1945-1980",
        "top": (46, 68, 72), "bottom": (14, 22, 26),
        "accent": (150, 200, 195)},
    9: {"name": "Contemporary 1980-present",
        "top": (40, 48, 66), "bottom": (12, 14, 24),
        "accent": (140, 170, 230)},
}


@background("era")
def _era(slide, w, h, t, spec):
    """Unit-contextualized historical backdrop.

    ``{"type": "era", "unit": 2}`` renders the textured cinematic backdrop
    tinted to the APUSH period: parchment and ink for the colonial units,
    steel and brass for the Gilded Age, cold slate for the Cold War, etc.
    Abstract and photographic — never fake artifacts or pseudo-text.
    Any slide accepts it as ``bg``; EraCardSlide defaults to it.
    """
    unit = spec.get("unit", 1)
    try:
        unit = int(unit)
    except (TypeError, ValueError):
        unit = 1
    if unit not in ERA_PALETTES:
        unit = 1
    era = ERA_PALETTES[unit]
    c = _cache(slide)
    key = f"era-{unit}"
    if key not in c:
        rng = np.random.default_rng(100 + unit)
        top = np.array(era["top"], dtype=np.float32)
        bottom = np.array(era["bottom"], dtype=np.float32)
        ys = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
        base = top[None, None, :] * (1 - ys) + bottom[None, None, :] * ys
        base = np.broadcast_to(base, (h, w, 3)).copy()
        sh, sw = (h + 7) // 8, (w + 7) // 8
        mott = rng.normal(0, 1, (sh, sw, 1)).astype(np.float32)
        mott = np.repeat(np.repeat(mott, 8, axis=0), 8, axis=1)[:h, :w, :]
        base += mott * 7.0
        base += rng.normal(0, 1, (h, w, 1)).astype(np.float32) * 3.0
        frame = np.clip(base, 0, 255).astype(np.uint8)
        c[key] = C.vignette(frame, 0.45)
    return c[key].copy()


@background("image")
def _image(slide, w, h, t, spec):
    c = _cache(slide)
    if "cover" not in c:
        src = spec.get("array")
        if src is None:
            src = spec.get("path")
        if src is None:
            raise ValueError("image bg needs 'array' or 'path'")
        arr = _as_array(src)
        c["cover"] = C.dim(C.cover(arr, w, h), spec.get("dim", 0.55))
    drift = spec.get("drift")
    if drift:
        try:
            a, b = drift
            a = (float(a[0]), float(a[1]), float(a[2]))
            b = (float(b[0]), float(b[1]), float(b[2]))
        except (TypeError, ValueError, IndexError, KeyError):
            raise ValueError(
                "image bg 'drift' must be [(cx, cy, fw), (cx, cy, fw)]")
        if not slide.duration or slide.duration <= 0:
            raise ValueError(
                "image bg 'drift' needs a positive slide duration")
        k = smooth(t / slide.duration)
        view = (a[0] + (b[0] - a[0]) * k,
                a[1] + (b[1] - a[1]) * k,
                a[2] + (b[2] - a[2]) * k)
        return kb_frame(c["cover"], w, h, *view)
    return c["cover"].copy()
