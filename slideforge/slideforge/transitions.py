"""Transitions between scenes. Each takes (frame_a, frame_b, k) -> frame.

Register a new one::

    from slideforge.plugins import transition

    @transition("glitch")
    def glitch(a, b, k):
        ...
"""

from collections.abc import Mapping

import numpy as np
from PIL import Image

from .plugins import transition, transition_registry


@transition("crossfade")
def crossfade(a, b, k):
    return ((1 - k) * a.astype(np.float32) + k * b.astype(np.float32)).astype(np.uint8)


@transition("dip")
def dip_to_black(a, b, k):
    if k < 0.5:
        f = 1 - k * 2
        return (a.astype(np.float32) * f).astype(np.uint8)
    f = (k - 0.5) * 2
    return (b.astype(np.float32) * f).astype(np.uint8)


@transition("wipe")
def wipe(a, b, k):
    """B wipes in left-to-right over A."""
    h, w = a.shape[:2]
    x = int(round(k * w))
    out = a.copy()
    if x > 0:
        out[:, :x] = b[:, :x]
    return out


@transition("slide")
def slide_over(a, b, k):
    """B slides in from the right, pushing over A."""
    h, w = a.shape[:2]
    x = int(round((1 - k) * w))
    out = a.copy()
    if x < w:
        out[:, x:] = b[:, :w - x]
    return out


@transition("zoom")
def zoom_fade(a, b, k):
    """A gently scales up while crossfading into B — cinematic feel."""
    h, w = a.shape[:2]
    z = 1 + 0.07 * k
    nw, nh = int(w * z), int(h * z)
    big = np.array(Image.fromarray(a).resize((nw, nh), Image.BILINEAR))
    x0, y0 = (nw - w) // 2, (nh - h) // 2
    az = big[y0:y0 + h, x0:x0 + w]
    return crossfade(az, b, k)


# Backwards-compatible name -> fn mapping. A live read-only view of the
# registry (not a snapshot), so plugins registered later show up too.
class _LiveTransitionMap(Mapping):
    def __getitem__(self, name):
        return transition_registry.get(name)

    def __iter__(self):
        return iter(transition_registry.names())

    def __len__(self):
        return len(transition_registry.names())

    def __repr__(self):
        return repr(dict(self))


TRANSITIONS = _LiveTransitionMap()
