"""Round-3 constructs from the reference frames.

Recreates the beats from the new batch:
  1. Sticker cutouts + keyword on a map      (NORTHEAST / LONGHOUSE)
  2. RegionGlow tints + labels on a map      (GREAT BASIN burns orange)
  3. BulletSlide with **bold** lead-ins      (Cause #1: Gold detail)
  4. CollageSlide                           (INDIGENOUS SOCIETIES: EXAMPLES)
  5. TitleCardSlide                         (Greetings from CAHOKIA)

Run:  PYTHONPATH=. python3 examples/demo_constructs3.py
"""

from pathlib import Path

from slideforge import (Config, Movie, BulletSlide, ImageSlide,
                        CollageSlide, TitleCardSlide)
from slideforge.apush import apush_bg
from slideforge.overlays import (with_overlays, KeywordPop, Sticker,
                                 RegionGlow)
from slideforge import assets

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
AP = ROOT / "assets" / "stickers"
AP.mkdir(parents=True, exist_ok=True)
OUT = ROOT / "demo_constructs3.mp4"

GUT = str(ROOT / "assets" / "maps" / "america_gutierrez_1562.jpg")
FORD = str(ROOT / "assets" / "portraits" / "frederick_taylor.jpg")


def fetch(query, name):
    dest = AP / name
    if not dest.exists():
        titles = assets.search(query, limit=3)
        print("commons:", query, "->", titles[0])
        assets.download(titles[0], dest)
    return str(dest)


def main():
    longhouse = fetch("Iroquois longhouse reconstruction", "longhouse.jpg")
    maize = fetch("corn on the cob", "maize_cob.jpg")
    tipi = fetch("tipi", "tipi.jpg")
    cahokia = fetch("Cahokia mounds illustration", "cahokia.jpg")

    m = Movie(Config(w=1280, h=720, fps=30))

    # 1. sticker cutouts + keyword on the map
    m.add(with_overlays(
        ImageSlide(GUT, duration=6.5),
        [KeywordPop("NORTHEAST", position="left", size=0.10,
                    start=0.5, duration=5.5),
         Sticker(longhouse, at=(0.68, 0.30), size=0.30, label="LONGHOUSE",
                 start=1.2, tilt=1.5),
         Sticker(maize, at=(0.30, 0.58), size=0.15, tilt=-12, start=2.0)]))

    # 2. glowing regions
    m.add(with_overlays(
        ImageSlide(GUT, duration=5.5),
        [RegionGlow(at=(0.22, 0.46), size=0.28, color=(255, 96, 40),
                    label="GREAT BASIN", start=0.5),
         RegionGlow(at=(0.46, 0.28), size=0.24, color=(255, 170, 40),
                    label="GREAT PLAINS", start=1.6)]))

    # 3. nested bullets with bold lead-ins — over a contextual era backdrop
    #    (library rule: never render on a blank background)
    m.add(BulletSlide(
        "1. Renaissance",
        ["Sparked **cultural and technological** innovations",
         ("**Shipbuilding & Maritime Technologies:**",
          ["**Caravel:** fast and highly navigable ship",
           "**Lateen Sail:** took wind from both directions",
           "**Magnetic Compass:** gave direction",
           "**Astrolabe:** gave latitude"]),
         "**Joint-Stock Companies**"],
        bg=apush_bg("colonial")))

    # 4. scrapbook collage
    m.add(CollageSlide(
        cards=[
            {"image": tipi, "at": (0.13, 0.20), "w": 0.24,
             "border": (200, 40, 40), "tilt": -1.5},
            {"image": FORD, "at": (0.86, 0.22), "w": 0.17,
             "shape": "circle"},
            {"image": longhouse, "at": (0.16, 0.82), "w": 0.30, "tilt": 1.5},
            {"image": maize, "at": (0.84, 0.78), "w": 0.20, "tilt": -3.0},
        ],
        banner="INDIGENOUS SOCIETIES: EXAMPLES",
        notes=[
            {"text": "The native populations were ==diverse and varied,== "
                     "and ==geography== played a significant role",
             "at": (0.50, 0.045), "align": "center", "width": 0.52, "size": 0.028},
            {"text": "When a settlement becomes more complex, labor becomes "
                     "more ==specialized==",
             "at": (0.30, 0.60), "width": 0.34, "size": 0.026},
        ]))

    # 5. postcard title card
    m.add(TitleCardSlide(cahokia, "CAHOKIA", kicker="Greetings from...",
                         duration=4.5))

    m.render(str(OUT))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
