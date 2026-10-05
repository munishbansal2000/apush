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


@background("image")
def _image(slide, w, h, t, spec):
    c = _cache(slide)
    if "cover" not in c:
        arr = _as_array(spec.get("array", spec.get("path")))
        c["cover"] = C.dim(C.cover(arr, w, h), spec.get("dim", 0.55))
    drift = spec.get("drift")
    if drift:
        k = smooth(t / slide.duration)
        a, b = drift[0], drift[1]
        view = (a[0] + (b[0] - a[0]) * k,
                a[1] + (b[1] - a[1]) * k,
                a[2] + (b[2] - a[2]) * k)
        return kb_frame(c["cover"], w, h, *view)
    return c["cover"].copy()
