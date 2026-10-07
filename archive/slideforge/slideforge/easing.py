"""Easing functions. Each takes k in [0,1] and returns eased k.

Most return values in [0,1]; ease_out_back and ease_out_elastic
intentionally overshoot above 1 (documented on each).
"""

import math


def _clamp(k):
    if k != k:  # NaN: comparisons are False, so guard explicitly
        raise ValueError("easing input must not be NaN")
    return 0.0 if k < 0 else (1.0 if k > 1 else k)


def linear(k):
    return _clamp(k)


def smooth(k):
    """Smoothstep — gentle ease in and out. Good default for camera moves."""
    k = _clamp(k)
    return k * k * (3 - 2 * k)


def ease_in(k):
    k = _clamp(k)
    return k ** 3


def ease_out(k):
    k = _clamp(k)
    return 1 - (1 - k) ** 3


def ease_in_out(k):
    k = _clamp(k)
    if k < 0.5:
        return 4 * k ** 3
    return 1 - (-2 * k + 2) ** 3 / 2


def ease_out_back(k):
    """Slight overshoot at the end — nice for UI elements popping in."""
    k = _clamp(k)
    c = 1.70158
    return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2


def ease_out_elastic(k):
    k = _clamp(k)
    if k == 0 or k == 1:
        return k
    return 2 ** (-10 * k) * math.sin((k * 10 - 0.75) * (2 * math.pi / 3)) + 1
