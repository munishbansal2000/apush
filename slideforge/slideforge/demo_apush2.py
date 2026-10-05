"""Map-zoom demo: the Civil War in three battles.

Run: python -m slideforge.demo_apush2
"""

from .timeline import Config, Movie
from .slides import TitleSlide, BulletSlide, MapZoomSlide
from .apush import apush_bg, era_path


def main():
    cfg = Config(w=1280, h=720, fps=30)
    m = Movie(cfg, progress_bar=True)

    m.add(TitleSlide("The Civil War in 3 Battles", "1861–1865",
                     duration=4.0, bg=apush_bg("civilwar", dim=0.5)),
          transition="cut", trans_dur=0)

    m.add(MapZoomSlide(
        era_path("map1863"),
        markers=[
            {"at": (0.825, 0.64), "zoom": 3.4, "label": "Fort Sumter",
             "sub": "April 1861 — the first shots"},
            {"at": (0.820, 0.52), "zoom": 3.4, "label": "Gettysburg",
             "sub": "July 1863 — the turning point"},
            {"at": (0.630, 0.71), "zoom": 3.4, "label": "Vicksburg",
             "sub": "July 1863 — the Mississippi falls"},
        ]),
        transition="crossfade", trans_dur=0.6)

    m.add(BulletSlide(
        "Why these three",
        ["Sumter: secession becomes shooting war",
         "Gettysburg: Lee's invasion fails — the tide turns",
         "Vicksburg: Grant splits the Confederacy in two"],
        bg=apush_bg("civilwar", dim=0.5)),
        transition="crossfade", trans_dur=0.6)

    print(f"total duration: {m.total_duration():.1f}s")
    m.render("demo_apush2.mp4", crf=20, preset="medium")


if __name__ == "__main__":
    main()
