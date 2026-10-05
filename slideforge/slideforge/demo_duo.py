"""Reference-style demo: display points + "we will look at two people".

Replicates the beats from the reference review video:
  1. outlined display points ("1. New Tech", "2. Mass Media")
  2. two-person split (Henry Ford vs Frederick Taylor)
  3. portrait + big outlined bullets (Ford's assembly lines)
  4. section headline ("Scientific Management")

Run: python -m slideforge.demo_duo
"""

from .timeline import Config, Movie
from .slides import DisplayPointsSlide, DisplayHeadline, DuoSlide
from .apush import apush_bg

FORD = "assets/portraits/henry_ford_1919.jpg"
TAYLOR = "assets/portraits/frederick_taylor.jpg"


def main():
    cfg = Config(w=1280, h=720, fps=30)
    m = Movie(cfg, progress_bar=True)
    bg = apush_bg("twenties", dim=0.5)

    # 1. display points
    m.add(DisplayPointsSlide(["1. New Tech", "2. Mass Media"],
                             bg=bg, stagger=1.6),
          transition="cut", trans_dur=0)

    # 2. two people
    m.add(DuoSlide({"image": FORD, "label": "Henry Ford"},
                   {"image": TAYLOR, "label": "Frederick Taylor",
                    "focus": 0.30},
                   bg=bg),
          transition="crossfade", trans_dur=0.6)

    # 3. portrait + big bullets
    m.add(DuoSlide({"image": FORD, "label": "Henry Ford"},
                   {"points": ["-Assembly lines",
                               "-breaking down production",
                               "into repeated steps"]},
                   bg=bg),
          transition="crossfade", trans_dur=0.6)

    # 4. section headline
    m.add(DisplayHeadline("Scientific Management",
                          "prioritize efficiency over everything else",
                          bg=bg),
          transition="crossfade", trans_dur=0.6)

    print(f"total duration: {m.total_duration():.1f}s")
    m.render("demo_duo.mp4", crf=20, preset="medium")


if __name__ == "__main__":
    main()
