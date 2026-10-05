import unittest

import numpy as np

from slideforge import Config, validate
from slideforge.slides import (
    TitleSlide, BulletSlide, StepsSlide, DisplayPointsSlide,
    DisplayHeadline, DuoSlide, ImageSlide, SplitSlide, QuoteSlide,
    StatSlide, KenBurnsSlide, CalloutSlide, MapZoomSlide, RouteSlide,
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


if __name__ == "__main__":
    unittest.main()
