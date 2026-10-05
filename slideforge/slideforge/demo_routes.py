"""Spanish routes demo on two ORIGINAL 16th-century maps.

- Europa: Abraham Ortelius, 1572 (Wikimedia Commons, public domain)
- America: Diego Gutierrez, 1562 (Wikimedia Commons, public domain)
  (a Spanish Casa de la Contratacion cartographer, fittingly)

Waypoints were read off coordinate-grid overlays by a vision LLM.

Run: python -m slideforge.demo_routes
"""

from .timeline import Config, Movie
from .slides import TitleSlide, RouteSlide

EUROPA = "assets/maps/europa_ortelius_1572.jpg"
AMERICA = "assets/maps/america_gutierrez_1562.jpg"


def main():
    cfg = Config(w=1280, h=720, fps=30)
    m = Movie(cfg, progress_bar=True)

    europa_bg = {"type": "image", "path": EUROPA, "dim": 0.42,
                 "drift": [(0.5, 0.5, 1.0), (0.52, 0.48, 0.88)]}

    m.add(TitleSlide("Spanish Routes", "To the New World · 1492–1521",
                     duration=4.0, bg=europa_bg),
          transition="cut", trans_dur=0)

    # Columbus's first voyage, 1492 — waypoints live in routes/columbus_1492.json
    # (written by the vision LLM off a gridded map; the script just renders).
    m.add(RouteSlide.from_route("columbus_1492", zoom=2.4, hold=1.7, move_dur=2.0),
        transition="crossfade", trans_dur=0.6)

    # Cortes, 1519-1521
    m.add(RouteSlide.from_route("cortes_1519", zoom=2.8, hold=1.7, move_dur=2.0),
        transition="crossfade", trans_dur=0.6)

    m.add(TitleSlide("Two maps. One empire.", "",
                     duration=3.5, bg=europa_bg),
          transition="crossfade", trans_dur=0.6)

    print(f"total duration: {m.total_duration():.1f}s")
    m.render("demo_routes.mp4", crf=20, preset="medium")


if __name__ == "__main__":
    main()
