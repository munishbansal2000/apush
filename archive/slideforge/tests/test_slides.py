import json
import os
import tempfile
import unittest
from unittest import mock

import numpy as np

from slideforge import Config, validate
from slideforge import routes as routes_mod
from slideforge.slides import (
    TitleSlide, BulletSlide, StepsSlide, DisplayPointsSlide,
    DisplayHeadline, DuoSlide, ImageSlide, SplitSlide, QuoteSlide,
    StatSlide, KenBurnsSlide, CalloutSlide, MapZoomSlide, RouteSlide,
    CausalChainSlide,
)
from slideforge.apush import apush_bg

W, H = 640, 360
IMG = np.full((400, 500, 3), 150, dtype=np.uint8)


def cfg():
    return Config(w=W, h=H, fps=10)


def portrait_panels():
    return ({"image": IMG, "label": "Left"},
            {"image": IMG, "label": "Right"})


class TestSlideFrames(unittest.TestCase):
    def _check(self, s, t=None):
        t = s.duration / 2 if t is None else t
        f = s.frame(t)
        self.assertEqual(f.shape, (H, W, 3), type(s).__name__)
        self.assertEqual(f.dtype, np.uint8)
        return f

    def test_title(self):
        self._check(TitleSlide("Hi", "there", cfg=cfg()))

    def test_bullets(self):
        self._check(BulletSlide("T", ["a", "b"], cfg=cfg()))

    def test_steps(self):
        self._check(StepsSlide("T", [("1", "one"), ("2", "two")], cfg=cfg()))

    def test_display_points(self):
        self._check(DisplayPointsSlide(["1. A", "2. B"], cfg=cfg()))

    def test_display_headline(self):
        self._check(DisplayHeadline("Big", "small", cfg=cfg()))

    def test_duo_images(self):
        self._check(DuoSlide(*portrait_panels(), cfg=cfg()))

    def test_duo_mixed(self):
        self._check(DuoSlide({"image": IMG, "label": "P"},
                             {"points": ["-one", "-two"]}, cfg=cfg()))

    def test_image_slide(self):
        self._check(ImageSlide(IMG, caption="c", title="t", cfg=cfg()))

    def test_split(self):
        self._check(SplitSlide(IMG, "H", ["body"], cfg=cfg()))

    def test_quote(self):
        self._check(QuoteSlide("to be", "someone", cfg=cfg()))

    def test_stat(self):
        self._check(StatSlide(42, "things", cfg=cfg()))

    def test_kenburns(self):
        stops = [(0.5, 0.5, 1.0), (0.3, 0.3, 0.5)]
        self._check(KenBurnsSlide(IMG, stops=stops, cfg=cfg()))

    def test_callout(self):
        self._check(CalloutSlide(
            IMG, [{"at": (0.5, 0.5), "zoom": 2.0, "label": "X"}],
            cfg=cfg()))

    def test_map_zoom(self):
        self._check(MapZoomSlide(
            IMG, [{"at": (0.5, 0.5), "label": "X"}], cfg=cfg()))

    def test_route_from_json(self):
        s = RouteSlide.from_route("columbus_1492", cfg=cfg())
        self.assertEqual(len(s.waypoints), 3)
        self._check(s)

    def test_route_inline(self):
        s = RouteSlide(IMG, [{"at": (0.2, 0.2), "label": "A"},
                             {"at": (0.8, 0.8), "label": "B"}], cfg=cfg())
        self._check(s)

    def test_route_starts_at_first_waypoint(self):
        s = RouteSlide(IMG, [{"at": (0.2, 0.3), "label": "A"},
                             {"at": (0.8, 0.7), "label": "B"}],
                       cfg=cfg(), start_wide=False)
        # camera opens on waypoint 0 (no backwards establishing move)
        self.assertEqual(s._view_waypoint[0], 0)
        s2 = RouteSlide(IMG, [{"at": (0.2, 0.3), "label": "A"},
                              {"at": (0.8, 0.7), "label": "B"}],
                        cfg=cfg(), start_wide=True)
        self.assertIsNone(s2._view_waypoint[0])

    def test_callout_first_marker_without_start_wide(self):
        from slideforge import canvas as C
        from slideforge.kenburns import kb_frame
        s = CalloutSlide(IMG, [{"at": (0.5, 0.5), "zoom": 2.0,
                               "label": "HELLO"}],
                         cfg=cfg(), start_wide=False)
        plain = C.vignette(kb_frame(IMG, W, H, 0.5, 0.5, 0.5), 0.3)
        # first hold must carry the marker + label, not a bare frame
        self.assertFalse(np.array_equal(s.frame(0.5), plain))

    def test_route_projection_clamps_like_camera(self):
        from slideforge.kenburns import clamp_view
        # edge waypoint: raw view center 0.05, clamped ~0.19 for this geometry
        view = (0.05, 0.5, 1.0 / 2.6)
        ih, iw = IMG.shape[:2]
        cx, cy, fw = clamp_view(iw, ih, W, H, *view)
        fh = fw * (iw / ih) / (W / H)
        want = ((0.05 - (cx - fw / 2)) / fw * W,
                (0.5 - (cy - fh / 2)) / fh * H)
        got = RouteSlide._project(0.05, 0.5, view, W, H, iw, ih)
        self.assertAlmostEqual(got[0], want[0])
        self.assertAlmostEqual(got[1], want[1])
        # and the full frame renders the edge route without error
        s = RouteSlide(IMG, [{"at": (0.05, 0.5), "label": "EDGE"},
                             {"at": (0.9, 0.5), "label": "B"}], cfg=cfg())
        self._check(s)

    def test_kenburns_caption_scrims_once(self):
        import slideforge.slides as S
        stops = [(0.5, 0.5, 1.0), (0.3, 0.3, 0.5)]
        s = KenBurnsSlide(IMG, stops=stops, caption="c", cfg=cfg())
        with mock.patch.object(S.C, "bottom_scrim",
                               wraps=S.C.bottom_scrim) as m:
            s.frame(2.0)
        self.assertEqual(m.call_count, 1)

    def test_steps_single_tuple_step(self):
        s = StepsSlide("T", [("only-head",)], cfg=cfg())
        self.assertEqual(s.steps, [("only-head", "")])
        s.frame(2.0)  # no crash

    def test_steps_bad_arity_rejected(self):
        with self.assertRaises(ValueError):
            StepsSlide("T", [("a", "b", "c")], cfg=cfg())
        with self.assertRaises(ValueError):
            StepsSlide("T", [42], cfg=cfg())

    def test_bullet_string_children(self):
        s = BulletSlide("T", [("parent", "single child")], cfg=cfg())
        self.assertEqual(s.bullets, [("parent", ["single child"])])
        s.frame(3.0)  # no crash

    def test_bullet_short_tuple_rejected(self):
        with self.assertRaises(ValueError):
            BulletSlide("T", [("lonely",)], cfg=cfg())

    def test_causal_chain_empty_renders_and_warns(self):
        s = CausalChainSlide([], title="Why?", cfg=cfg())
        f = s.frame(0.5)
        self.assertEqual(f.shape, (H, W, 3))
        self.assertTrue(any("no nodes" in i for i in validate.slide(s)))

    def test_duo_entrance_top_rows_show_backdrop(self):
        bg = {"type": "solid", "color": (10, 10, 40)}
        bright = np.full((400, 300, 3), 250, dtype=np.uint8)
        s = DuoSlide({"image": bright, "label": "L"},
                     {"image": bright, "label": "R"},
                     bg=bg, cfg=cfg())
        f = s.frame(0.2)  # mid-entrance: alpha < 1, rise dy > 0
        x0, y0, pw, ph = s._panel_rects()[0]
        top = f[int(y0):int(y0) + 3, int(x0):int(x0 + pw)].astype(float)
        # rolled-in rows are backdrop-filled, never wrapped panel content
        self.assertLess(abs(top[..., 0].mean() - 10), 30)
        self.assertLess(abs(top[..., 2].mean() - 40), 30)

    def test_from_route_dict_resolves_relative_map(self):
        route_file = os.path.join(os.path.dirname(routes_mod.__file__),
                                  "routes", "columbus_1492.json")
        with open(route_file) as fp:
            raw = json.load(fp)
        self.assertFalse(os.path.isabs(raw["map"]))
        here = os.getcwd()
        with tempfile.TemporaryDirectory() as d:
            os.chdir(d)  # relative map must NOT resolve against cwd
            try:
                s = RouteSlide.from_route(raw, cfg=cfg())
            finally:
                os.chdir(here)
        self.assertEqual(len(s.waypoints), 3)
        self._check(s)

    def test_from_route_dict_missing_map_raises(self):
        raw = {"map": "no-such-map.jpg",
               "waypoints": [{"at": [0.1, 0.1], "label": "A"},
                             {"at": [0.2, 0.2], "label": "B"}]}
        with self.assertRaises(FileNotFoundError):
            RouteSlide.from_route(raw, cfg=cfg())


class TestSlideValidation(unittest.TestCase):
    def test_missing_bg_warns(self):
        # library rule: never render on a blank background. Slides without an
        # explicit contextual bg validate with a warning.
        s = TitleSlide("T", cfg=cfg())
        issues = validate.slide(s)
        self.assertTrue(any("no contextual background" in i for i in issues), issues)

    def test_explicit_bg_is_clean(self):
        slides = [
            TitleSlide("T", bg=apush_bg("colonial"), cfg=cfg()),
            DuoSlide(*portrait_panels(), bg=apush_bg("gilded"), cfg=cfg()),
            RouteSlide.from_route("columbus_1492", cfg=cfg()),
            SplitSlide(IMG, "H", ["body"], bg=apush_bg("colonial"), cfg=cfg()),
        ]
        for s in slides:
            self.assertEqual(validate.slide(s), [], type(s).__name__)

    def test_image_driven_slides_are_bg_clean(self):
        # full-bleed imagery IS the contextual background
        stops = [((0.5, 0.5, 1.0),), ((0.5, 0.5, 0.5),)]
        slides = [
            KenBurnsSlide(IMG, stops=stops, cfg=cfg()),
            CalloutSlide(IMG, [{"at": (0.5, 0.5), "label": "X"}], cfg=cfg()),
            MapZoomSlide(IMG, [{"at": (0.5, 0.5), "label": "X"}], cfg=cfg()),
        ]
        for s in slides:
            self.assertEqual(validate.slide(s), [], type(s).__name__)

    def test_default_bg_is_textured_not_flat(self):
        from slideforge.plugins import background_registry
        self.assertIn("textured", background_registry.names())
        s = TitleSlide("T", cfg=cfg())
        self.assertEqual(s.bg["type"], "textured")
        f = s.bg_frame(0)
        self.assertEqual(f.shape, (H, W, 3))
        # must have photographic texture, not a flat field
        self.assertGreater(float(f.std()), 4.0)

    def test_route_waypoint_out_of_bounds(self):
        s = RouteSlide(IMG, [{"at": (1.82, 0.3), "label": "A"},
                             {"at": (0.8, 0.8), "label": "B"}], cfg=cfg())
        issues = validate.slide(s)
        self.assertTrue(any("outside the 0..1" in i for i in issues), issues)

    def test_route_missing_label(self):
        s = RouteSlide(IMG, [{"at": (0.2, 0.2), "label": ""},
                             {"at": (0.8, 0.8), "label": "B"}], cfg=cfg())
        issues = validate.slide(s)
        self.assertTrue(any("no label" in i for i in issues), issues)

    def test_duo_missing_image(self):
        s = DuoSlide({"image": "/tmp/does-not-exist.png", "label": "X"},
                     {"points": ["a"]}, cfg=cfg())
        issues = validate.slide(s)
        self.assertTrue(any("not found" in i for i in issues), issues)

    def test_bad_bg_type(self):
        s = TitleSlide("T", bg={"type": "nope"}, cfg=cfg())
        issues = validate.slide(s)
        self.assertTrue(any("unknown bg type" in i for i in issues), issues)

    def test_route_validate_has_no_duplicates(self):
        s = RouteSlide(IMG, [{"at": (1.82, 0.3), "label": ""},
                             {"at": (0.8, 0.8), "label": "B"}], cfg=cfg())
        issues = validate.slide(s)
        self.assertEqual(len(issues), len(set(issues)), issues)
        self.assertTrue(any("outside the 0..1" in i for i in issues))

    def test_image_bg_without_source_warns(self):
        s = TitleSlide("T", bg={"type": "image"}, cfg=cfg())
        issues = validate.slide(s)
        self.assertTrue(any("needs 'array' or 'path'" in i for i in issues),
                        issues)


class TestExports(unittest.TestCase):
    def test_all_lists_every_public_component(self):
        import slideforge
        for name in ("CausalChainSlide", "TerritorySlide", "RecallSlide",
                     "SpectrumSlide", "TitleCardSlide",
                     "TimelineRibbon", "RedPen", "Magnifier", "MapNote",
                     "Sticker", "RegionGlow"):
            self.assertIn(name, slideforge.__all__, name)


if __name__ == "__main__":
    unittest.main()
