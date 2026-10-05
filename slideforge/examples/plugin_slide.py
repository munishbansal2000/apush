"""Third-party plugin slide example — no changes to slideforge itself.

Run:  python3 examples/plugin_slide.py       (from the slideforge project root)
Renders a 3-second sample to /tmp/plugin_slide_example.mp4.

A plugin slide is any Scene subclass registered with the @slide decorator:
it needs a duration and a frame(t) method returning an RGB numpy array.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from PIL import ImageDraw

from slideforge import Movie, Config
from slideforge.slides import Slide
from slideforge.plugins import slide, slide_registry
from slideforge import canvas as C
from slideforge.canvas import to_pil, to_np, get_font


@slide("ripple")
class RippleSlide(Slide):
    """Centered text with expanding ripple rings — a minimal plugin slide."""

    def __init__(self, text, duration=3.0, cfg=None):
        super().__init__(duration, {"type": "gradient",
                                    "top": (28, 40, 70),
                                    "bottom": (10, 12, 24)}, cfg)
        self.text = text

    def frame(self, t):
        w, h = self.cfg.w, self.cfg.h
        pil = to_pil(C.vignette(self.bg_frame(t), 0.3))
        d = ImageDraw.Draw(pil, "RGBA")
        cx, cy = w / 2, h / 2
        # expanding rings, one per second
        for i in range(3):
            if t < i * 1.0:
                continue
            k = ((t - i * 1.0) / 1.5) % 1.0
            r = 60 + k * 320
            alpha = int(160 * (1 - k))
            d.ellipse([cx - r, cy - r, cx + r, cy + r],
                      outline=(255, 176, 66, alpha), width=6)
        font = get_font(int(h * 0.11), bold=True)
        d.text((cx, cy), self.text, font=font, fill=(255, 255, 255, 255),
               anchor="mm", stroke_width=3, stroke_fill=(10, 10, 12, 255))
        return to_np(pil)


def main():
    assert "ripple" in slide_registry.names(), "plugin did not register"
    cfg = Config(w=1280, h=720, fps=30)
    m = Movie(cfg)
    m.add(slide_registry.get("ripple")("Hello from a plugin!", cfg=cfg),
          transition="cut")
    out = "/tmp/plugin_slide_example.mp4"
    m.render(out)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
