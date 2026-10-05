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

    # beat slides (overlays listed per beat; the ribbon is added to every
    # beat afterwards with its real span of the whole video)
    beats = []

    # 1. timeline ribbon over a map tour
    kb1 = KenBurnsSlide(
        MAP, stops=[(0.5, 0.5, 1.0), (0.42, 0.40, 0.42)], hold=1.6,
        title="The Spanish Atlantic", caption="Spain's first American empire",
        cfg=cfg)
    beats.append((kb1, [], "cut"))

    # 2. causal chain
    chain = CausalChainSlide(
        [("Asian goods", "Europe craves spices & silk"),
         ("Ottoman chokehold", "Constantinople falls, 1453 — prices spike"),
         ("A new route", "Sail west to reach the east"),
         ("1492", "Columbus lands in the Caribbean")],
        title="Why did Europeans cross the Atlantic?",
        bg=apush_bg("colonial"), cfg=cfg)
    check(chain, "chain")
    beats.append((chain, [], "crossfade"))

    # 3. territory expansion on one map
    terr = TerritorySlide(
        MAP1863,
        [# coordinates read off the gridded 1863 map (map_grid tool), not guessed
         {"at": (0.78, 0.44), "rx": 0.15, "ry": 0.26,
          "label": "Treaty of Paris", "date": "1783",
          "color": (90, 140, 255), "label_at": (0.90, 0.22)},
         {"at": (0.42, 0.49), "rx": 0.13, "ry": 0.24, "label": "Louisiana",
          "date": "1803", "color": (255, 170, 60),
          # deliberately naive: the layout engine nudges this off the title
          "label_at": (0.30, 0.13)},
         {"at": (0.82, 0.80), "rx": 0.045, "ry": 0.08, "label": "Florida",
          "date": "1819", "color": (120, 220, 130), "label_at": (0.82, 0.66)},
         {"at": (0.42, 0.77), "rx": 0.11, "ry": 0.11, "label": "Texas",
          "date": "1845", "color": (220, 120, 220), "label_at": (0.62, 0.85)},
         {"at": (0.16, 0.60), "rx": 0.11, "ry": 0.16,
          "label": "Mexican Cession", "date": "1848",
          "color": (255, 110, 110), "label_at": (0.13, 0.84)}],
        title="The United States grows", stagger=1.3, cfg=cfg)
    check(terr, "territory")
    beats.append((terr, [], "crossfade"))

    # 4. red pen over bullets — annotations target measured word boxes,
    # so they track the text instead of guessed coordinates; starts are
    # timed after each bullet settles (bullet i lands at 0.9+i*1.25+0.5)
    bullets = BulletSlide(
        "The encomienda system",
        ["Spanish crown grants **labor** of natives to colonists",
         "In theory: **protection** + Christian instruction",
         "In practice: **forced labor**, disease, collapse"],
        bg=apush_bg("colonial"), cfg=cfg)
    check(bullets, "bullets")
    wb = bullets.word_boxes()
    labor = wb["labor"][0]
    prot = wb["protection"][0]
    instr = wb["instruction"][0]
    pen = RedPen([
        {"kind": "underline",
         "from": (labor[0], labor[3] + 0.008),
         "to": (labor[2], labor[3] + 0.008), "start": 1.5},
        {"kind": "circle",
         "at": ((prot[0] + prot[2]) / 2, (prot[1] + prot[3]) / 2),
         "rx": (prot[2] - prot[0]) / 2 + 0.022,
         "ry": (prot[3] - prot[1]) / 2 + 0.028, "start": 2.8},
        {"kind": "note", "at": (0.70, 0.72), "text": "KEY IDEA", "start": 3.6},
        {"kind": "check", "at": (instr[2] + 0.035, (instr[1] + instr[3]) / 2),
         "size": 0.035, "start": 4.4},
    ])
    beats.append((bullets, [pen], "crossfade"))

    # 5. recall / self-test
    recall = RecallSlide(
        "Pause: what were the 3 G's of Spanish colonization?",
        ["Gold — the crown's hunger for bullion",
         "God — spreading Catholicism",
         "Glory — rivalry with England and France"],
        bg=apush_bg("colonial"), cfg=cfg)
    check(recall, "recall")
    beats.append((recall, [], "crossfade"))

    # 6. spectrum
    spec = SpectrumSlide(
        ("Loose construction", "Strict construction"),
        [{"at": 0.15, "label": "Hamilton", "color": (90, 140, 255)},
         {"at": 0.85, "label": "Jefferson", "color": (255, 170, 60),
          "move_to": 0.45, "move_start": 3.2,
          "sub": "Louisiana Purchase, 1803"}],
        title="Reading the Constitution", bg=apush_bg("revolution"), cfg=cfg)
    check(spec, "spectrum")
    beats.append((spec, [], "crossfade"))

    # 7. magnifier over a primary source — the lens path is built from the
    # slide's real line geometry, so it tracks text instead of guessing.
    # It performs a SLOW close reading of the highlighted quote (not a tour
    # of the whole paragraph): ~160px/s lets you read along with the lens.
    doc = HighlightSlide(
        "Bartolomé de las Casas watched the encomienda system devour entire "
        "villages. ==He wrote that the Spanish 'laid waste' to the islands==, "
        "and his account shocked readers back in Spain.",
        duration=10.5, cfg=cfg)
    check(doc, "doc")
    lb = doc.line_boxes()
    mag = Magnifier.trace_line(lb[2], 2.5, 9.0, radius=0.14, zoom=2.4)
    beats.append((doc, [mag], "crossfade"))

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
    beats.append((kb2, [notes], "crossfade"))

    # The ribbon is movie-level chrome: it renders after transition blending,
    # so it never ghosts during crossfades and the playhead stays continuous.
    m = Movie(cfg)
    m.overlay(TimelineRibbon("THE AMERICAN STORY · 1491–1848",
                             events=[(0.04, "1492"), (0.30, "1783"),
                                     (0.55, "1803"), (0.85, "1848")],
                             span=(0.0, 1.0)))
    for i, (slide, overlays, trans) in enumerate(beats):
        kwargs = {} if trans == "cut" else {"transition": trans,
                                            "trans_dur": 0.5}
        m.add(with_overlays(slide, overlays), **kwargs)

    out = "demo_constructs4.mp4"
    m.render(out)
    print("wrote", out)


if __name__ == "__main__":
    main()
