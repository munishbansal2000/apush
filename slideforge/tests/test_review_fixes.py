"""Regression tests for the 2026-10-05 blind-review bugfix batch.

Fast, pure-logic tests: no rendering, no ffmpeg, no network.
"""
import unittest
import warnings

import numpy as np

from slideforge import canvas as C
from slideforge import easing
from slideforge import kenburns as KB
from slideforge import overlays as O
from slideforge import routes
from slideforge import slides
from slideforge import transitions as T
from slideforge import vision
from slideforge.timeline import Movie, Scene, Config


def _rgb():
    return np.zeros((48, 64, 3), dtype=np.uint8)


def _rgba():
    return np.zeros((48, 64, 4), dtype=np.uint8)


class TestA01(unittest.TestCase):
    def test_zero_duration_is_instant(self):
        self.assertEqual(slides.a01(1.0, 0.5, 0), 1.0)

    def test_negative_duration_is_instant(self):
        self.assertEqual(slides.a01(1.0, 0.5, -2), 1.0)

    def test_before_start(self):
        self.assertEqual(slides.a01(0.1, 0.5, 1.0), 0.0)


class TestTimeline(unittest.TestCase):
    def test_negative_duration_rejected(self):
        with self.assertRaises(ValueError):
            Scene(-1.0)

    def test_none_duration_allowed_for_overlays(self):
        s = Scene(None)
        self.assertIsNone(s.duration)

    def test_cut_consumes_no_time(self):
        m = Movie(Config(w=64, h=48, fps=10))
        m.add(slides.TitleSlide("a", duration=2.0, cfg=m.cfg), transition="cut")
        m.add(slides.TitleSlide("b", duration=2.0, cfg=m.cfg), transition="cut")
        self.assertEqual(m.transitions[1], (None, 0.0))
        self.assertAlmostEqual(m.total_duration(), 4.0)

    def test_negative_trans_dur_rejected(self):
        m = Movie(Config(w=64, h=48, fps=10))
        with self.assertRaises(ValueError):
            m.add(slides.TitleSlide("a", duration=1.0, cfg=m.cfg),
                  trans_dur=-0.5)


class TestOverlays(unittest.TestCase):
    def test_with_overlays_does_not_mutate(self):
        ov = O.KeywordPop("word", duration=None)
        scene = slides.TitleSlide("t", duration=3.0)
        O.with_overlays(scene, [ov])
        self.assertIsNone(ov.duration)

    def test_timeline_ribbon_none_duration_persists(self):
        r = O.TimelineRibbon("era", duration=None)
        self.assertEqual(r._dur(), float("inf"))

    def test_magnifier_empty_path(self):
        with self.assertRaises(ValueError):
            O.Magnifier([])

    def test_magnifier_bad_keyframe(self):
        with self.assertRaises(ValueError):
            O.Magnifier([(1.0, 0.5)])

    def test_redpen_unknown_kind(self):
        with self.assertRaises(ValueError):
            O.RedPen([{"kind": "scribble", "at": (0.5, 0.5)}])

    def test_redpen_missing_key(self):
        with self.assertRaises(ValueError):
            O.RedPen([{"kind": "circle"}])


class TestCanvas(unittest.TestCase):
    def test_dim_clips_instead_of_wrapping(self):
        out = C.dim(np.full((4, 4, 3), 200, dtype=np.uint8), 2.0)
        self.assertTrue(np.all(out == 255))

    def test_dim_negative_rejected(self):
        with self.assertRaises(ValueError):
            C.dim(_rgb(), -1.0)

    def test_vgradient_clips(self):
        out = C.vgradient(4, 4, (300, 0, 0), (-5, 0, 0))
        self.assertTrue(np.all(out[:, :, 0] <= 255))

    def test_radial_glow_zero_radius(self):
        with self.assertRaises(ValueError):
            C.radial_glow(64, 48, 0.5, 0.5, (255, 0, 0), 0)

    def test_bottom_scrim_clamps_params(self):
        img = _rgb()
        out = C.bottom_scrim(img, height_frac=5.0, max_alpha=9.0)
        self.assertEqual(out.shape, img.shape)

    def test_paste_rgba_rejects_rgb(self):
        with self.assertRaises(ValueError):
            C.paste_rgba(_rgb(), _rgb(), (0, 0))

    def test_cover_zero_target(self):
        with self.assertRaises(ValueError):
            C.cover(_rgb(), 0, 48)

    def test_draw_para_bad_align(self):
        from PIL import Image
        with self.assertRaises(ValueError):
            C.draw_para(Image.new("RGB", (64, 48)), (0, 0, 64, 48),
                        "hi", 12, (255, 255, 255), align="sideways")

    def test_draw_para_bad_fill(self):
        from PIL import Image
        with self.assertRaises(ValueError):
            C.draw_para(Image.new("RGB", (64, 48)), (0, 0, 64, 48),
                        "hi", 12, (255, 255, 255, 0))

    def test_get_font_warns_on_missing(self):
        orig_resolved, orig_cache = C._RESOLVED, C._font_cache
        C._RESOLVED, C._font_cache = {}, {}
        try:
            with warnings.catch_warnings(record=True) as w:
                warnings.simplefilter("always")
                C.get_font(24)
            self.assertTrue(any(issubclass(x.category, RuntimeWarning)
                                for x in w))
        finally:
            C._RESOLVED, C._font_cache = orig_resolved, orig_cache


class TestKenburnsEasing(unittest.TestCase):
    def test_zoom_on_zero(self):
        with self.assertRaises(ValueError):
            KB.zoom_on(0.5, 0.5, 0)

    def test_kenburns_empty_stops(self):
        with self.assertRaises(ValueError):
            KB.KenBurns(_rgb(), 2.0, [])

    def test_kenburns_frame_without_cfg(self):
        kb = KB.KenBurns(_rgb(), 2.0, [KB.full_view()])
        frame = kb.frame(0.5)  # must not raise AttributeError
        self.assertEqual(frame.shape[2], 3)

    def test_easing_nan(self):
        with self.assertRaises(ValueError):
            easing.smooth(float("nan"))


class TestTransitions(unittest.TestCase):
    def test_crossfade_clamps_k(self):
        a = np.zeros((8, 8, 3), dtype=np.uint8)
        b = np.full((8, 8, 3), 255, dtype=np.uint8)
        np.testing.assert_array_equal(T.crossfade(a, b, 1.5), b)
        np.testing.assert_array_equal(T.crossfade(a, b, -0.5), a)

    def test_shape_mismatch(self):
        a = np.zeros((8, 8, 3), dtype=np.uint8)
        b = np.zeros((8, 10, 3), dtype=np.uint8)
        with self.assertRaises(ValueError):
            T.wipe(a, b, 0.5)


class TestRoutesVision(unittest.TestCase):
    def test_load_route_traversal_neutralized(self):
        # "../.." is stripped by Path.name: the lookup stays inside
        # slideforge/routes/ and raises FileNotFoundError (no escape).
        with self.assertRaises(FileNotFoundError) as cm:
            routes.load_route("../../etc/passwd")
        self.assertIn("routes", str(cm.exception))

    def test_load_route_bad_json(self):
        import tempfile, os
        with tempfile.NamedTemporaryFile("w", suffix=".json",
                                         delete=False) as f:
            f.write("{not json")
            path = f.name
        try:
            with self.assertRaises(ValueError):
                routes.load_route(path)
        finally:
            os.unlink(path)

    def test_parse_waypoints_malformed(self):
        with self.assertRaises(ValueError):
            vision.parse_waypoints('[{"name": "x"}]',
                                   [{"name": "x"}])

    def test_parse_waypoints_out_of_range(self):
        with self.assertRaises(ValueError):
            vision.parse_waypoints('[{"name": "x", "at": [2.0, 0.5]}]',
                                   [{"name": "x"}])

    def test_parse_waypoints_empty_fence(self):
        with self.assertRaises(ValueError):
            vision.parse_waypoints('```', [{"name": "x"}])


class TestSlides(unittest.TestCase):
    def test_causal_chain_string_node(self):
        s = slides.CausalChainSlide(["abc"])
        self.assertEqual(s.nodes, [("abc", "")])

    def test_causal_chain_bad_node(self):
        with self.assertRaises(ValueError):
            slides.CausalChainSlide([{"nope": 1}])

    def test_display_points_string(self):
        s = slides.DisplayPointsSlide("hello")
        self.assertEqual(s.points, ["hello"])

    def test_display_points_title_kwarg(self):
        s = slides.DisplayPointsSlide(["a"], title="T")
        self.assertEqual(s.title, "T")

    def test_split_bad_side(self):
        with self.assertRaises(ValueError):
            slides.SplitSlide(_rgb(), "h", "b", side="middle")

    def test_stat_bad_decimals(self):
        with self.assertRaises(ValueError):
            slides.StatSlide(5, "lbl", decimals=-1)

    def test_stat_none_value(self):
        with self.assertRaises(ValueError):
            slides.StatSlide(None, "lbl")

    def test_spectrum_bad_axis(self):
        with self.assertRaises(ValueError):
            slides.SpectrumSlide(["only-one"], [])

    def test_spectrum_move_start_unified(self):
        s = slides.SpectrumSlide(
            ["L", "R"],
            [{"at": 0.2, "label": "m", "move_to": 0.8, "sub": "s"}])
        self.assertAlmostEqual(s.markers[0]["move_start"], 0.8 + 0 + 0.8)

    def test_duo_both_keys(self):
        with self.assertRaises(ValueError):
            slides.DuoSlide({"image": _rgb(), "points": ["a"]},
                            {"points": ["b"]})

    def test_slide_bg_string(self):
        with self.assertRaises(ValueError):
            slides.TitleSlide("t", bg="nope")

    def test_callout_zero_zoom(self):
        with self.assertRaises(ValueError):
            slides.CalloutSlide(_rgb(), [{"at": (0.5, 0.5), "zoom": 0}])

    def test_callout_missing_at(self):
        with self.assertRaises(ValueError):
            slides.CalloutSlide(_rgb(), [{"zoom": 2.0}])

    def test_collage_missing_image(self):
        with self.assertRaises(ValueError):
            slides.CollageSlide(cards=[{"at": (0.5, 0.5)}])

    def test_recall_negative_blur(self):
        with self.assertRaises(ValueError):
            slides.RecallSlide("q", ["a"], blur_px=-1)

    def test_recall_layout_fits_five_answers(self):
        s = slides.RecallSlide("q", ["a"] * 5)
        slot, ch = s._layout(720, 5)
        self.assertLessEqual(0.30 + 5 * slot, 0.80 + 1e-9)

    def test_validate_none_title_no_crash(self):
        s = slides.CompareSlide("t", {"head": "L"}, {"head": "R"})
        s.title = None
        self.assertIn("title is empty", s.validate())


if __name__ == "__main__":
    unittest.main()
