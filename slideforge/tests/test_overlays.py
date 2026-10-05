import os
import subprocess
import sys
import unittest
from unittest import mock

import numpy as np

from slideforge import Config, TitleSlide, validate
from slideforge.overlays import LowerThird, Caption, Sticker, RegionGlow, \
    MapNote, TimelineRibbon, with_overlays
from slideforge.slides import MapZoomSlide
from slideforge.timeline import Movie


def cfg():
    return Config(w=640, h=360, fps=10)


class TestOverlays(unittest.TestCase):
    def _wrapped(self):
        base = TitleSlide("Hi", duration=4.0, cfg=cfg())
        wrapped = with_overlays(base, [LowerThird("Name", "Role"),
                                       Caption("a caption")])
        return base, wrapped

    def test_wrapper_preserves_duration_and_shape(self):
        base, wrapped = self._wrapped()
        self.assertEqual(wrapped.duration, base.duration)
        f = wrapped.frame(2.0)
        self.assertEqual(f.shape, (360, 640, 3))
        self.assertEqual(f.dtype, np.uint8)

    def test_inactive_overlays_are_noop(self):
        base, wrapped = self._wrapped()
        # both overlays start after t=0.1 (Caption 0.3, LowerThird 0.5)
        np.testing.assert_array_equal(wrapped.frame(0.1), base.frame(0.1))

    def test_active_overlays_change_frame(self):
        base, wrapped = self._wrapped()
        self.assertFalse(np.array_equal(wrapped.frame(2.0), base.frame(2.0)))

    def test_caption_duration_defaults_to_scene_remainder(self):
        base = TitleSlide("Hi", duration=4.0, cfg=cfg())
        cap = Caption("x")
        wrapped = with_overlays(base, [cap])
        # The wrapper resolves None against the scene — on its own copy.
        # The caller's instance is never mutated (stays reusable).
        self.assertIsNone(cap.duration)
        resolved = wrapped._overlays[0]
        self.assertIsNot(resolved, cap)
        self.assertAlmostEqual(resolved.duration, 4.0 - 0.3)

    def test_lower_third_apply_guard(self):
        cfg0 = cfg()
        frame = np.zeros((360, 640, 3), dtype=np.uint8)
        lt = LowerThird("Name", start=0.5, duration=3.5)
        np.testing.assert_array_equal(lt.apply(frame, 0.1), frame)

    def test_direct_apply_without_duration(self):
        # duration=None means "until scene end" inside with_overlays; applied
        # directly there is no end, so overlays stay visible, never crash.
        img = np.full((200, 200, 3), 150, dtype=np.uint8)
        for ov in (Caption("hello"), Sticker(img), RegionGlow()):
            frame = np.zeros((360, 640, 3), dtype=np.uint8)
            before = frame.copy()
            out = ov.apply(frame, 5.0)
            self.assertEqual(out.shape, (360, 640, 3), type(ov).__name__)
            self.assertFalse(np.array_equal(out, before), type(ov).__name__)

    def test_mapnote_sub_pill_stays_in_frame(self):
        import PIL.ImageDraw
        cfg0 = cfg()
        img = np.full((360, 640, 3), 140, dtype=np.uint8)
        cam = MapZoomSlide(img, [{"at": (0.08, 0.5), "zoom": 1.0,
                                  "label": "A", "sub": "s"}], cfg=cfg0)
        note = MapNote(cam, [{"at": (0.08, 0.5), "label": "A",
                              "sub": "X" * 60}])
        real_draw = PIL.ImageDraw.Draw
        boxes = []

        class RecDraw:
            def __init__(self, *a, **k):
                self._d = real_draw(*a, **k)

            def rounded_rectangle(self, xy, *a, **k):
                boxes.append([float(v) for v in xy])
                return self._d.rounded_rectangle(xy, *a, **k)

            def __getattr__(self, name):
                return getattr(self._d, name)

        with mock.patch.object(PIL.ImageDraw, "Draw", RecDraw):
            note.apply(img.copy(), 2.0)
        sub_box = boxes[-1]  # sub pill is drawn after the label pill
        self.assertGreaterEqual(sub_box[0], 0)
        self.assertLessEqual(sub_box[2], 640)

    def test_apply_movie_does_not_mutate_overlay(self):
        frame = np.zeros((180, 320, 3), dtype=np.uint8)
        cap = Caption("hello", start=1.0)
        out = cap.apply_movie(frame, 5.0, 20.0)
        self.assertIsNone(cap.duration)
        self.assertFalse(np.array_equal(out, frame))

    def test_wrapped_scene_forwards_validate(self):
        base = TitleSlide("Hi", duration=4.0, cfg=cfg())  # no bg -> warns
        m = Movie(cfg())
        m.add(with_overlays(base, [Caption("x")]), transition="cut")
        bad = validate.movie(m)
        self.assertEqual(len(bad), 1)
        self.assertTrue(any("no contextual background" in i
                            for i in bad[0][1]), bad)

    def test_sticker_deterministic_across_processes(self):
        repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        img = os.path.join(repo, "assets", "stickers", "maize_cob.jpg")
        code = ("import sys, hashlib; sys.path.insert(0, %r); "
                "import numpy as np; "
                "from slideforge.overlays import Sticker; "
                "st = Sticker(%r); st._build(640); "
                "print(hashlib.sha256(np.asarray(st._img).tobytes()).hexdigest())"
                % (repo, img))
        digests = set()
        for seed in ("1", "2"):
            env = dict(os.environ, PYTHONHASHSEED=seed)
            out = subprocess.run([sys.executable, "-c", code], capture_output=True,
                                 text=True, env=env, timeout=120)
            self.assertEqual(out.returncode, 0, out.stderr)
            digests.add(out.stdout.strip())
        self.assertEqual(len(digests), 1)  # same bytes under both seeds


if __name__ == "__main__":
    unittest.main()

class TestTimelineRibbonHeight(unittest.TestCase):
    def test_slim_ribbon_leaves_caption_band_clear(self):
        # scene captions sit in the bottom band; a slim movie ribbon
        # must not paint where they live.
        base = np.zeros((360, 640, 3), dtype=np.uint8)
        slim = TimelineRibbon("era", duration=10.0, height_frac=0.07)
        full = TimelineRibbon("era", duration=10.0)
        fs = slim.apply(base.copy(), 5.0)
        ff = full.apply(base.copy(), 5.0)
        slim_top = 360 - int(360 * 0.07)
        full_top = 360 - int(360 * 0.115)
        # (the 2 rows above the band may carry the accent divider
        # line + era-text tops, which straddle the band edge.)
        np.testing.assert_array_equal(fs[full_top:slim_top - 2],
                                      base[full_top:slim_top - 2])
        self.assertFalse((fs[slim_top:] == base[slim_top:]).all())
        self.assertFalse((ff[full_top:] == base[full_top:]).all())

    def test_bad_height_frac_rejected(self):
        with self.assertRaises(ValueError):
            TimelineRibbon("era", height_frac=0)
        with self.assertRaises(ValueError):
            TimelineRibbon("era", height_frac=0.9)


class TestRibbonLabelCulling(unittest.TestCase):
    def test_dense_labels_culled_middle_first(self):
        from slideforge.overlays import _cull_ribbon_labels
        # the middle tick crowds the first: it goes, the outer two stay
        show = _cull_ribbon_labels([100.0, 101.0, 200.0],
                                   [40.0, 40.0, 40.0], 2)
        self.assertEqual(show, {0, 2})

    def test_wall_of_labels_keeps_leftmost_only(self):
        from slideforge.overlays import _cull_ribbon_labels
        show = _cull_ribbon_labels([100.0, 101.0, 102.0],
                                   [40.0, 40.0, 40.0], 2)
        self.assertEqual(show, {0})

    def test_sparse_labels_all_kept(self):
        from slideforge.overlays import _cull_ribbon_labels
        show = _cull_ribbon_labels([0.0, 100.0, 200.0],
                                   [40.0, 40.0, 40.0], 2)
        self.assertEqual(show, {0, 1, 2})

    def test_culling_order_independent(self):
        from slideforge.overlays import _cull_ribbon_labels
        # events listed out of order cull identically (greedy by x)
        show = _cull_ribbon_labels([102.0, 100.0, 200.0],
                                   [40.0, 40.0, 40.0], 2)
        self.assertEqual(show, {1, 2})

    def test_ribbon_still_renders_with_culling(self):
        base = np.zeros((360, 640, 3), dtype=np.uint8)
        rib = TimelineRibbon(
            "THE COLLISION", duration=10.0, height_frac=0.07,
            events=[(0.0, "1453"), (0.42, "1492"), (0.44, "Oct 1492"),
                    (0.47, "1494"), (0.8, "1521"), (1.0, "1542")])
        out = rib.apply(base.copy(), 5.0)
        # ticks still draw in the culled zone (only text is culled)
        band = out[360 - int(360 * 0.07):]
        self.assertTrue((band != 0).any())
