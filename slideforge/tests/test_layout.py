"""Tests for slideforge.layout: collision detection + nudge/shrink/warn."""
import unittest

from slideforge.layout import Layout, detect_collisions


class TestDetect(unittest.TestCase):
    def test_no_overlap(self):
        boxes = {"a": (0, 0, 10, 10), "b": (20, 20, 30, 30)}
        self.assertEqual(detect_collisions(boxes), [])

    def test_overlap_reported(self):
        boxes = {"a": (0, 0, 10, 10), "b": (5, 5, 15, 15)}
        hits = detect_collisions(boxes)
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0][:2], ("a", "b"))
        self.assertAlmostEqual(hits[0][2], 25.0)

    def test_touching_edges_not_collision(self):
        boxes = {"a": (0, 0, 10, 10), "b": (10, 0, 20, 10)}
        self.assertEqual(detect_collisions(boxes), [])


class TestResolve(unittest.TestCase):
    def test_clean_layout_untouched(self):
        lo = Layout(1280, 720)
        lo.add_fixed("title", (400, 50, 880, 120), priority=100)
        lo.add("pill", box=(100, 200, 250, 260), priority=10)
        resolved, warnings = lo.resolve()
        self.assertEqual(resolved["pill"], (100, 200, 250, 260))
        self.assertEqual(warnings, [])

    def test_pill_nudged_off_title(self):
        # the Louisiana scenario: pill overlapping the title gets moved clear
        lo = Layout(1280, 720)
        lo.add_fixed("title", (140, 50, 1140, 122), priority=100)
        lo.add("pill", box=(180, 94, 330, 164), priority=10)
        resolved, warnings = lo.resolve()
        self.assertEqual(warnings, [])
        self.assertEqual(detect_collisions(
            {"title": (140, 50, 1140, 122), "pill": resolved["pill"]}), [])
        # it moved, but not far (smallest clearing nudge wins)
        x0, y0, x1, y1 = resolved["pill"]
        self.assertLess(abs((x0 + x1) / 2 - 255), 150)
        self.assertLess(abs((y0 + y1) / 2 - 129), 150)

    def test_fixed_never_moves(self):
        lo = Layout(1280, 720)
        lo.add_fixed("title", (400, 50, 880, 120), priority=100)
        lo.add("pill", box=(400, 60, 550, 130), priority=10)
        resolved, warnings = lo.resolve()
        self.assertEqual(resolved["title"], (400, 50, 880, 120))

    def test_higher_priority_wins(self):
        lo = Layout(1280, 720)
        lo.add("a", box=(100, 100, 200, 160), priority=20)
        lo.add("b", box=(150, 120, 250, 180), priority=5)
        resolved, warnings = lo.resolve()
        self.assertEqual(resolved["a"], (100, 100, 200, 160))
        self.assertEqual(detect_collisions(resolved), [])

    def test_duplicate_keys_rejected(self):
        lo = Layout(1280, 720)
        lo.add("pill", box=(100, 100, 200, 160))
        with self.assertRaises(ValueError):
            lo.add("pill", box=(150, 120, 250, 180))
        with self.assertRaises(ValueError):
            lo.add_fixed("pill", (0, 0, 10, 10))

    def test_unresolvable_warns(self):
        # a pill nearly as big as the frame cannot dodge the title
        lo = Layout(200, 200)
        lo.add_fixed("title", (10, 10, 190, 60), priority=100)
        lo.add("pill", box=(10, 10, 190, 190), priority=10, movable=True)
        # shrink the nudge search so it provably fails
        lo.STEPS = (2,)
        resolved, warnings = lo.resolve()
        self.assertEqual(len(warnings), 1)
        self.assertIn("pill", warnings[0])
        self.assertIn("title", warnings[0])

    def test_shrink_when_nudge_fails(self):
        # a tall label that can't nudge clear at full size shrinks first:
        # shrinking reduces the nudge distance needed to escape
        def measure(fs):
            wdt, hht = fs * 10, fs * 1.0
            return (300 - wdt / 2, 100 - hht / 2, 300 + wdt / 2, 100 + hht / 2)
        lo = Layout(1280, 720)
        lo.add_fixed("title", (140, 50, 1140, 122), priority=100)
        lo.STEPS = (6, 12, 20, 32)  # 32px nudge can't clear the 40px-tall box
        lo.add("note", measure=measure, font_size=40, min_font_size=10,
               priority=10)
        resolved, warnings = lo.resolve()
        self.assertEqual(warnings, [])
        self.assertEqual(detect_collisions(
            {"title": (140, 50, 1140, 122), "note": resolved["note"]}), [])
        x0, _, x1, _ = resolved["note"]
        self.assertLess(x1 - x0, 400)  # shrunk from 400px wide


class TestTerritoryLayout(unittest.TestCase):
    @staticmethod
    def _map():
        # a real image file: TerritorySlide loads its map in __init__
        import tempfile, os
        from PIL import Image
        p = os.path.join(tempfile.gettempdir(), "layout_test_map.png")
        if not os.path.exists(p):
            Image.new("RGB", (64, 64), (40, 60, 90)).save(p)
        return p

    def test_territory_pill_avoids_title(self):
        from slideforge import Config
        from slideforge.slides import TerritorySlide
        cfg = Config(w=1280, h=720)
        terrs = [{"at": (0.5, 0.5), "rx": 0.1, "ry": 0.1,
                  "label": "Louisiana", "date": "1803",
                  "color": (255, 170, 60),
                  # deliberately parked on the title: the resolver must move it
                  "label_at": (0.5, 0.12)}]
        s = TerritorySlide(self._map(), terrs, title="The United States grows",
                           cfg=cfg)
        # validate() surfaces layout warnings (empty when resolved)
        self.assertEqual(s.validate(), [])
        lx, ly = s.territories[0]["label_at"]
        # moved off the title band (title occupies y < ~0.19)
        self.assertGreater(ly, 0.19)

    def test_layout_warnings_surface(self):
        from slideforge import Config
        from slideforge.slides import TerritorySlide
        cfg = Config(w=200, h=200)
        terrs = [{"at": (0.5, 0.5), "rx": 0.4, "ry": 0.4,
                  "label": "X" * 60, "date": "1803",
                  "color": (255, 170, 60), "label_at": (0.5, 0.12)}]
        s = TerritorySlide(self._map(), terrs, title="T" * 80, cfg=cfg)
        issues = s.validate()
        self.assertTrue(any("collides" in i for i in issues),
                        f"expected a collision warning, got {issues}")

    def test_construction_without_cfg_defers_layout(self):
        from slideforge import Config
        from slideforge.slides import TerritorySlide
        terrs = [{"at": (0.5, 0.5), "rx": 0.1, "ry": 0.1,
                  "label": "Louisiana", "date": "1803",
                  "color": (255, 170, 60), "label_at": (0.5, 0.12)}]
        s = TerritorySlide(self._map(), terrs)  # no cfg: must not crash
        self.assertFalse(s._labels_resolved)
        self.assertEqual(s.validate(), [])
        s.cfg = Config(w=1280, h=720)
        f = s.frame(1.0)
        self.assertEqual(f.shape, (720, 1280, 3))
        self.assertTrue(s._labels_resolved)

    def test_duplicate_labels_resolve_independently(self):
        from slideforge import Config
        from slideforge.slides import TerritorySlide
        cfg = Config(w=1280, h=720)
        terrs = [{"at": (0.3, 0.5), "rx": 0.1, "ry": 0.1, "label": "X",
                  "date": "1803", "color": (255, 170, 60),
                  "label_at": (0.5, 0.5)},
                 {"at": (0.7, 0.5), "rx": 0.1, "ry": 0.1, "label": "X",
                  "date": "1845", "color": (120, 220, 130),
                  "label_at": (0.5, 0.5)}]
        s = TerritorySlide(self._map(), terrs, title="T", cfg=cfg)
        s.frame(1.0)  # must not raise on duplicate layout keys
        self.assertNotEqual(s.territories[0]["label_at"],
                            s.territories[1]["label_at"])


if __name__ == "__main__":
    unittest.main()
