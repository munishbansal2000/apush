"""Demo: builds a ~40s showcase video exercising every component.

Run:  python -m slideforge.demo
"""

import random

import numpy as np
from PIL import Image, ImageDraw

from .timeline import Config, Movie
from . import canvas as C
from .canvas import to_np
from .slides import (TitleSlide, BulletSlide, SplitSlide, QuoteSlide,
                     StatSlide, KenBurnsSlide, CalloutSlide, ImageSlide)
from .overlays import LowerThird, with_overlays
from .kenburns import full_view, zoom_on


# ---------------------------------------------------------------- artwork

def art_mountains(w, h):
    rng = random.Random(7)
    img = C.vgradient(w, h, (38, 52, 96), (224, 138, 90))
    pil = C.to_pil(img)
    d = ImageDraw.Draw(pil)
    # sun + glow
    sx, sy, sr = w * 0.68, h * 0.42, h * 0.09
    d.ellipse([sx - sr * 2.2, sy - sr * 2.2, sx + sr * 2.2, sy + sr * 2.2],
              fill=(255, 200, 130, 60))
    d.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(255, 236, 200))
    # mountain ranges, far to near
    for base_y, amp, col in [(h * 0.62, h * 0.22, (64, 58, 92)),
                            (h * 0.74, h * 0.26, (44, 40, 68)),
                            (h * 0.88, h * 0.30, (26, 24, 44))]:
        pts = [(0, h)]
        x = 0
        while x < w:
            pts.append((x, base_y - rng.random() * amp))
            x += rng.randint(w // 9, w // 5)
        pts += [(w, h)]
        d.polygon(pts, fill=col)
    # lake + sun reflection
    d.rectangle([0, h * 0.88, w, h], fill=(20, 22, 44))
    for i in range(14):
        rw = w * 0.16 * (1 - i / 20)
        d.rectangle([sx - rw / 2, h * 0.90 + i * h * 0.007,
                     sx + rw / 2, h * 0.90 + i * h * 0.007 + 3],
                    fill=(255, 190, 120, 140))
    # birds
    for bx, by in [(w * 0.25, h * 0.3), (w * 0.32, h * 0.26), (w * 0.2, h * 0.36)]:
        d.arc([bx - 18, by - 10, bx + 18, by + 10], 200, 340, fill=(30, 30, 50), width=3)
    return to_np(pil)


def art_city(w, h):
    rng = random.Random(21)
    img = C.vgradient(w, h, (8, 10, 26), (26, 24, 54))
    pil = C.to_pil(img)
    d = ImageDraw.Draw(pil, "RGBA")
    # moon
    mx, my, mr = w * 0.8, h * 0.18, h * 0.06
    d.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=(235, 238, 250))
    d.ellipse([mx - mr * 0.4, my - mr * 0.2, mx + mr * 0.7, my + mr * 0.9],
              fill=(8, 10, 26))
    # stars
    for _ in range(90):
        x, y = rng.random() * w, rng.random() * h * 0.5
        d.ellipse([x, y, x + 2, y + 2], fill=(255, 255, 255, 160))
    # buildings
    x = 0
    while x < w:
        bw = rng.randint(w // 14, w // 8)
        bh = rng.randint(int(h * 0.35), int(h * 0.75))
        d.rectangle([x, h - bh, x + bw, h], fill=(16, 18, 34))
        for wy in range(int(h - bh + 14), h - 10, 26):
            for wx in range(int(x + 10), int(x + bw - 10), 24):
                if rng.random() < 0.45:
                    lit = (255, 200, 110) if rng.random() < 0.7 else (170, 200, 255)
                    d.rectangle([wx, wy, wx + 12, wy + 16], fill=lit + (220,))
        x += bw + rng.randint(4, 20)
    return to_np(pil)


def art_ocean(w, h):
    rng = random.Random(3)
    img = C.vgradient(w, h, (120, 170, 220), (250, 200, 150))
    pil = C.to_pil(img)
    d = ImageDraw.Draw(pil, "RGBA")
    # sun low on horizon
    sx, sy, sr = w * 0.5, h * 0.52, h * 0.08
    d.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(255, 244, 214))
    # sea
    d.rectangle([0, h * 0.55, w, h], fill=(24, 60, 110))
    for i in range(9):
        y = h * 0.58 + i * h * 0.045
        for _ in range(14):
            wx = rng.random() * w
            ww = rng.randint(40, 130)
            d.arc([wx, y - 8, wx + ww, y + 8], 180, 360,
                  fill=(255, 255, 255, 70), width=3)
    # sun glitter path
    for i in range(10):
        gw = w * 0.1 * (1 - i / 14)
        d.rectangle([sx - gw / 2, h * 0.6 + i * h * 0.038,
                     sx + gw / 2, h * 0.6 + i * h * 0.038 + 4],
                    fill=(255, 220, 150, 120))
    return to_np(pil)


# ---------------------------------------------------------------- movie

def build_movie():
    cfg = Config(w=1280, h=720, fps=30)
    m = Movie(cfg, progress_bar=True)

    mountains = art_mountains(1280, 720)
    city = art_city(1280, 720)
    ocean = art_ocean(1280, 720)

    m.add(TitleSlide("MOTION, COMPOSED",
                     "A reusable animated-slides engine in pure Python",
                     duration=4.5),
          transition="cut", trans_dur=0)

    m.add(KenBurnsSlide(
        mountains,
        stops=[full_view(),
               zoom_on(0.68, 0.42, 2.2),   # push into the sun
               zoom_on(0.30, 0.62, 2.6),   # pan across to the peaks
               zoom_on(0.68, 0.93, 2.0),   # drift down to the reflection
               full_view()],               # pull back out
        hold=1.1,
        title="The Ken Burns camera",
        caption="Pan and zoom to any part of an image — eased, never linear"),
        transition="crossfade", trans_dur=0.7)

    m.add(with_overlays(
        CalloutSlide(
            city,
            callouts=[
                {"at": (0.80, 0.18), "zoom": 3.0, "label": "The moon — zoom to 3x"},
                {"at": (0.35, 0.72), "zoom": 2.6, "label": "Lit windows, dead center"},
            ]),
        [LowerThird("Ken Burns + Callouts", "Two-phase zoom with pulsing markers",
                    start=0.6, duration=4.0)]),
        transition="wipe", trans_dur=0.6)

    m.add(SplitSlide(
        ocean, "Reusable components",
        ["Every slide is a Scene subclass — compose, subclass, remix.",
         "Text, images, camera moves and overlays all share one timeline."],
        side="left", duration=5.5),
        transition="slide", trans_dur=0.6)

    m.add(StatSlide(30, "frames per second · eased motion · rendered frame by frame",
                    suffix=" fps", duration=4.0),
          transition="zoom", trans_dur=0.6)

    m.add(BulletSlide(
        "What you get",
        ["Fancy slides: titles, bullets, quotes, stats, splits",
         "Zoom in / out and pan to any region of any image",
         "Callouts that dive into details with pulsing markers",
         "Transitions: crossfade, wipe, slide, dip, zoom-fade"],
        duration=7.0),
        transition="dip", trans_dur=0.6)

    m.add(QuoteSlide("The best animation is the one you can reuse a hundred times.",
                     "slideforge README, probably", duration=4.5),
          transition="crossfade", trans_dur=0.6)

    m.add(ImageSlide(mountains, caption="Built with PIL + numpy + ffmpeg. No heavy deps.",
                     title="Now build yours.", duration=4.0),
          transition="zoom", trans_dur=0.8)
    return m


def main():
    movie = build_movie()
    print(f"total duration: {movie.total_duration():.1f}s")
    movie.render("demo.mp4", crf=20, preset="medium")


if __name__ == "__main__":
    main()
