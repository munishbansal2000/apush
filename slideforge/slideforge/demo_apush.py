"""APUSH-style demo: display points + drifting era backgrounds.

Run: python -m slideforge.demo_apush
"""

from .timeline import Config, Movie
from .slides import TitleSlide, BulletSlide, DisplayPointsSlide
from .apush import apush_bg


def main():
    cfg = Config(w=1280, h=720, fps=30)
    m = Movie(cfg, progress_bar=True)
    bg = apush_bg("twenties", dim=0.5)

    m.add(TitleSlide("Innovations of the 1920s", "The Roaring Twenties",
                     duration=4.0, bg=bg),
          transition="cut", trans_dur=0)

    m.add(DisplayPointsSlide(
        ["1. New Tech", "2. Mass Media", "3. Consumer Credit"],
        bg=bg, stagger=1.6),
        transition="crossfade", trans_dur=0.6)

    m.add(BulletSlide(
        "Why it mattered",
        ["Assembly lines made cars and appliances affordable",
         "Radio and film created the first national mass culture",
         "Installment credit let ordinary families buy it all now"],
        bg=bg),
        transition="crossfade", trans_dur=0.6)

    print(f"total duration: {m.total_duration():.1f}s")
    m.render("demo_apush.mp4", crf=20, preset="medium")


if __name__ == "__main__":
    main()
