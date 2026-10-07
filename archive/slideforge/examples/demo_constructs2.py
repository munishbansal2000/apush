"""New constructs from the reference review videos.

Recreates the beats we studied:
  1. DisplayHeadline with **bold** keywords      (Zimmerman Telegram)
  2. BulletSlide with nested child bullets        (Institutions)
  3. StepsSlide with a banner chip               (Cause #1: Gold)
  4. CompareSlide                                (Conflicting Worldviews)
  5. HighlightSlide with ==marker== + photo card (Political change)
  6. KeywordPop overlay over a moving map tour  (MAIZE — its real job:
     punching a keyword over live content mid-narration, not a still)

Run:  python3 examples/demo_constructs2.py  ->  demo_constructs2.mp4
"""

from pathlib import Path

from slideforge import (Config, Movie, DisplayHeadline, BulletSlide,
                        StepsSlide, CompareSlide, HighlightSlide,
                        KenBurnsSlide)
from slideforge.apush import apush_bg
from slideforge.overlays import with_overlays, KeywordPop
from slideforge import assets

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "demo_constructs2.mp4"


def card_image():
    """Fetch a period illustration through library code (no hand assets)."""
    dest = HERE.parent / "assets" / "apush" / "constantinople_1453.jpg"
    if not dest.exists():
        titles = assets.search("Siege of Constantinople 1453 miniature",
                               limit=3)
        print("commons:", titles)
        assets.download(titles[0], dest)
    return str(dest)


def main():
    card = card_image()
    m = Movie(Config(w=1280, h=720, fps=30))

    m.add(DisplayHeadline(
        "**Zimmerman** Telegram",
        sub="-an encrypted message to **Mexico** from **Germany** "
            "intercepted by **Britain**",
        bg=apush_bg("ww2", dim=0.55)))

    m.add(BulletSlide(
        "Institutions",
        [("Glass-Steagall Act (1933)",
          ["separated commercial banking from investment banking"]),
         ("Social Security Act (1935)",
          ["pensions, unemployment and disability aid"])],
        bg=apush_bg("twenties", dim=0.6)))

    m.add(StepsSlide(
        "", ["Renaissance", "Conquistadors",
             "Feudalism Replaced by Capitalism"],
        banner="Cause #1: Gold",
        bg=apush_bg("colonial", dim=0.6)))

    m.add(CompareSlide(
        "CONFLICTING WORLDVIEWS",
        left={"head": "EUROPEANS",
              "sections": [{"sub": "Land Use",
                            "points": ["Land could be owned by individuals",
                                       "Land as commodity"]}]},
        right={"head": "INDIGENOUS PEOPLES",
               "sections": [{"sub": "Land Use",
                             "points": ["Resource available to all",
                                        "Land possessed spiritual quality"]}]}))

    m.add(HighlightSlide(
        "==Political change== was occurring in some European states, in "
        "which ==large, multi-ethnic empires== were breaking apart while "
        "small kingdoms were uniting and becoming more powerful.",
        card={"image": card,
              "caption": "OTTOMANS SEIZE CONSTANTINOPLE"}))

    # KeywordPop is an OVERLAY, not a slide: its job is punching a keyword
    # over live content (talking head, map tour, b-roll) the moment the
    # narration lands on it. Here it pops over a slow map push-in, the way
    # the reference drops "MAIZE" beside the presenter mid-sentence.
    tour = KenBurnsSlide(
        str(HERE.parent / "assets" / "maps" / "america_gutierrez_1562.jpg"),
        stops=[(0.50, 0.50, 1.0), (0.56, 0.42, 0.72)], hold=1.6,
        caption="Maize cultivation supports large Mississippian towns")
    m.add(with_overlays(tour, [KeywordPop("MAIZE", position="right",
                                          start=1.4, duration=3.4)]))

    m.render(str(OUT))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
