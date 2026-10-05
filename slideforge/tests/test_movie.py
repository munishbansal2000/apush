import os
import tempfile
import unittest

import numpy as np

from slideforge import Config, Movie, TitleSlide
from slideforge import easing


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


if __name__ == "__main__":
    unittest.main()
