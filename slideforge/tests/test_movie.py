import os
import tempfile
import unittest
from unittest import mock

import numpy as np

from slideforge import Config, Movie, TitleSlide
from slideforge import easing
from slideforge.timeline import Scene


class Solid(Scene):
    def __init__(self, color, duration=2.0, cfg=None):
        super().__init__(duration, cfg)
        self.color = np.full((180, 320, 3), color, dtype=np.uint8)

    def frame(self, t):
        return self.color.copy()


class TestEasing(unittest.TestCase):
    def test_boundaries(self):
        for fn in [easing.linear, easing.smooth, easing.ease_in,
                   easing.ease_out, easing.ease_in_out,
                   easing.ease_out_back]:
            self.assertAlmostEqual(fn(0.0), 0.0, msg=fn.__name__)
            self.assertAlmostEqual(fn(1.0), 1.0, places=5,
                                   msg=fn.__name__)

    def test_smooth_is_monotone(self):
        xs = [i / 20 for i in range(21)]
        ys = [easing.smooth(x) for x in xs]
        self.assertTrue(all(b >= a for a, b in zip(ys, ys[1:])))


class TestMovie(unittest.TestCase):
    def _movie(self):
        cfg = Config(w=320, h=180, fps=10)
        m = Movie(cfg)
        m.add(TitleSlide("A", duration=1.0, cfg=cfg), transition="cut")
        m.add(TitleSlide("B", duration=1.0, cfg=cfg),
              transition="crossfade", trans_dur=0.4)
        return m

    def test_total_duration_accounts_for_transitions(self):
        m = self._movie()
        # 1.0 + 1.0 - 0.4 overlap
        self.assertAlmostEqual(m.total_duration(), 1.6)

    def test_frame_at_shape(self):
        m = self._movie()
        for t in (0.0, 0.5, 1.0, 1.2, 1.59):
            f = m.frame_at(t)
            self.assertEqual(f.shape, (180, 320, 3), t)

    def test_render_produces_mp4(self):
        m = self._movie()
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "out.mp4")
            m.render(out)
            self.assertTrue(os.path.exists(out))
            self.assertGreater(os.path.getsize(out), 1000)

    def _blend_movie(self):
        cfg = Config(w=320, h=180, fps=10)
        m = Movie(cfg)
        m.add(Solid((255, 0, 0), cfg=cfg), transition="cut")
        m.add(Solid((0, 0, 255), cfg=cfg),
              transition="crossfade", trans_dur=1.0)
        return m

    def test_transition_blends_mid_overlap(self):
        # overlap window is [1.0, 2.0); its middle must mix both scenes
        f = self._blend_movie().frame_at(1.5)
        self.assertAlmostEqual(float(f[..., 0].mean()), 127, delta=2)
        self.assertAlmostEqual(float(f[..., 2].mean()), 127, delta=2)

    def test_transition_endpoints_are_pure(self):
        m = self._blend_movie()
        np.testing.assert_array_equal(m.frame_at(0.5)[0, 0], [255, 0, 0])
        np.testing.assert_array_equal(m.frame_at(2.9)[0, 0], [0, 0, 255])

    def test_cut_does_not_blend(self):
        cfg = Config(w=320, h=180, fps=10)
        m = Movie(cfg)
        m.add(Solid((1, 2, 3), cfg=cfg), transition="cut")
        m.add(Solid((4, 5, 6), cfg=cfg), transition="cut")
        np.testing.assert_array_equal(m.frame_at(0.5)[0, 0], [1, 2, 3])
        np.testing.assert_array_equal(m.frame_at(1.999)[0, 0], [4, 5, 6])

    def test_movie_overlay_applies_after_blend(self):
        from slideforge.overlays import Caption
        cfg = Config(w=320, h=180, fps=10)
        m = Movie(cfg)
        m.add(Solid((255, 0, 0), cfg=cfg), transition="cut")
        m.add(Solid((0, 0, 255), cfg=cfg),
              transition="crossfade", trans_dur=1.0)
        plain = m.frame_at(2.5)
        m.overlay(Caption("hi", start=0.0))
        dressed = m.frame_at(2.5)
        self.assertEqual(dressed.shape, (180, 320, 3))
        self.assertFalse(np.array_equal(dressed, plain))

    def test_empty_movie_raises(self):
        m = Movie(Config(w=320, h=180, fps=10))
        with self.assertRaises(ValueError):
            m.frame_at(0)
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                m.render(os.path.join(d, "x.mp4"))

    def test_render_popen_failure_is_not_masked(self):
        m = self._movie()
        with tempfile.TemporaryDirectory() as d:
            with mock.patch("subprocess.Popen",
                            side_effect=FileNotFoundError("no ffmpeg")):
                with self.assertRaises(FileNotFoundError):
                    m.render(os.path.join(d, "x.mp4"))


if __name__ == "__main__":
    unittest.main()
