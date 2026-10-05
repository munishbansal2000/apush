"""Round 4: differentiation controls.

Beats:
  1. TimelineRibbon over a Ken Burns map tour (persistent era playhead)
  2. CausalChainSlide (cause -> effect, self-drawing arrows)
  3. TerritorySlide (US expansion fills in on one map)
  4. RedPen over bullets (teacher's live annotations)
  5. RecallSlide (blurred answers sharpen = self-test)
  6. SpectrumSlide (Hamilton vs Jefferson, marker moves)
  7. Magnifier over a primary-source paragraph
  8. MapNote pins riding the camera over the Gutierrez map
"""

from slideforge import (Config, Movie, BulletSlide, HighlightSlide,
                        KenBurnsSlide, CausalChainSlide, TerritorySlide,
                        RecallSlide, SpectrumSlide, with_overlays,
                        TimelineRibbon, RedPen, Magnifier, MapNote, validate)
from slideforge.apush import apush_bg, era_path

MAP = "assets/maps/america_gutierrez_1562.jpg"
MAP1863 = era_path("map1863")


def check(slide, name):
    issues = validate.slide(slide)
    assert not issues, (name, issues)


def main():
    cfg = Config(w=1280, h=720, fps=30)
    m = Movie(cfg)

    # 1. timeline ribbon over a map tour
    kb1 = KenBurnsSlide(
        MAP, stops=[(0.5, 0.5, 1.0), (0.42, 0.40, 0.42)], hold=1.6,
        title="The Spanish Atlantic", caption="Spain's first American empire",
        cfg=cfg)
    ribbon = TimelineRibbon(
        "PERIOD 1 · 1491–1607",
        events=[(0.0, "1492"), (0.35, "1519 · Cortés"),
                (0.70, "1565 · St. Augustine"), (1.0, "1607 · Jamestown")],
        span=(0.0, 1.0))
    m.add(with_overlays(kb1, [ribbon]), transition="cut")

    # 2. causal chain
    chain = CausalChainSlide(
        [("Asian goods", "Europe craves spices & silk"),
         ("Ottoman chokehold", "Constantinople falls, 1453 — prices spike"),
         ("A new route", "Sail west to reach the east"),
         ("1492", "Columbus lands in the Caribbean")],
        title="Why did Europeans cross the Atlantic?",
        bg=apush_bg("colonial"), cfg=cfg)
    check(chain, "chain")
    m.add(chain, transition="crossfade", trans_dur=0.5)

    # 3. territory expansion on one map
    terr = TerritorySlide(
        MAP1863,
        [{"at": (0.78, 0.45), "rx": 0.10, "ry": 0.16,
          "label": "Treaty of Paris", "date": "1783",
          "color": (90, 140, 255), "label_at": (0.78, 0.24)},
         {"at": (0.44, 0.38), "rx": 0.10, "ry": 0.15, "label": "Louisiana",
          "date": "1803", "color": (255, 170, 60), "label_at": (0.44, 0.19)},
         {"at": (0.82, 0.76), "rx": 0.045, "ry": 0.06, "label": "Florida",
          "date": "1819", "color": (120, 220, 130)},
         {"at": (0.48, 0.70), "rx": 0.08, "ry": 0.08, "label": "Texas",
          "date": "1845", "color": (220, 120, 220), "label_at": (0.48, 0.88)},
         {"at": (0.22, 0.50), "rx": 0.10, "ry": 0.18,
          "label": "Mexican Cession", "date": "1848",
          "color": (255, 110, 110)}],
        title="The United States grows", stagger=1.3, cfg=cfg)
    check(terr, "territory")
    m.add(terr, transition="crossfade", trans_dur=0.5)

    # 4. red pen over bullets
    bullets = BulletSlide(
        "The encomienda system",
        ["Spanish crown grants **labor** of natives to colonists",
         "In theory: **protection** + Christian instruction",
         "In practice: **forced labor**, disease, collapse"],
        bg=apush_bg("colonial"), cfg=cfg)
    check(bullets, "bullets")
    pen = RedPen([
        {"kind": "underline", "from": (0.30, 0.435), "to": (0.52, 0.435),
         "start": 1.0},
        {"kind": "circle", "at": (0.37, 0.53), "r": 0.14, "start": 2.2},
        {"kind": "note", "at": (0.70, 0.72), "text": "KEY IDEA", "start": 3.2},
        {"kind": "check", "at": (0.90, 0.53), "size": 0.035, "start": 4.0},
    ])
    m.add(with_overlays(bullets, [pen]), transition="crossfade", trans_dur=0.5)

    # 5. recall / self-test
    recall = RecallSlide(
        "Pause: what were the 3 G's of Spanish colonization?",
        ["Gold — the crown's hunger for bullion",
         "God — spreading Catholicism",
         "Glory — rivalry with England and France"],
        bg=apush_bg("colonial"), cfg=cfg)
    check(recall, "recall")
    m.add(recall, transition="crossfade", trans_dur=0.5)

    # 6. spectrum
    spec = SpectrumSlide(
        ("Loose construction", "Strict construction"),
        [{"at": 0.15, "label": "Hamilton", "color": (90, 140, 255)},
         {"at": 0.85, "label": "Jefferson", "color": (255, 170, 60),
          "move_to": 0.45, "move_start": 3.2,
          "sub": "Louisiana Purchase, 1803"}],
        title="Reading the Constitution", bg=apush_bg("revolution"), cfg=cfg)
    check(spec, "spectrum")
    m.add(spec, transition="crossfade", trans_dur=0.5)

    # 7. magnifier over a primary source
    doc = HighlightSlide(
        "Bartolomé de las Casas watched the encomienda system devour entire "
        "villages. ==He wrote that the Spanish 'laid waste' to the islands==, "
        "and his account shocked readers back in Spain.",
        cfg=cfg)
    check(doc, "doc")
    mag = Magnifier([(0.0, 0.35, 0.42), (2.5, 0.55, 0.48), (5.0, 0.68, 0.44)],
                    radius=0.14, zoom=2.4)
    m.add(with_overlays(doc, [mag]), transition="crossfade", trans_dur=0.5)

    # 8. map notes riding the camera
    kb2 = KenBurnsSlide(
        MAP, stops=[(0.5, 0.5, 1.0), (0.40, 0.40, 0.40)], hold=1.6,
        title="First landfalls", cfg=cfg)
    notes = MapNote(kb2.kb, [
        {"at": (0.375, 0.365), "label": "San Salvador", "sub": "Oct 1492",
         "start": 2.2},
        {"at": (0.43, 0.43), "label": "Hispaniola", "sub": "La Navidad fort",
         "start": 3.4},
    ])
    m.add(with_overlays(kb2, [notes]), transition="crossfade", trans_dur=0.5)

    out = "demo_constructs4.mp4"
    m.render(out)
    print("wrote", out)


if __name__ == "__main__":
    main()
