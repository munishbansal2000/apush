import unittest

import numpy as np

from slideforge import Config, TitleSlide
from slideforge.overlays import KeywordPop, with_overlays


def cfg():
    return Config(w=640, h=360, fps=10)


class TestKeywordPop(unittest.TestCase):
    def _wrapped(self):
        base = TitleSlide("Hi", duration=6.0, cfg=cfg())
        pop = KeywordPop("MAIZE", position="right", start=0.6, duration=3.0)
        return base, with_overlays(base, [pop]), pop

    def test_inactive_is_noop(self):
        base, wrapped, _ = self._wrapped()
        np.testing.assert_array_equal(wrapped.frame(0.1), base.frame(0.1))

    def test_active_changes_frame(self):
        base, wrapped, _ = self._wrapped()
        self.assertFalse(np.array_equal(wrapped.frame(2.0), base.frame(2.0)))

    def test_expires(self):
        base, wrapped, _ = self._wrapped()
        np.testing.assert_array_equal(wrapped.frame(5.9), base.frame(5.9))

    def test_positions(self):
        for pos in ("left", "right", "center"):
            base = TitleSlide("Hi", duration=6.0, cfg=cfg())
            wrapped = with_overlays(base, [KeywordPop("MAIZE", position=pos)])
            wrapped.frame(2.0)  # no crash

    def test_word_rendered_large(self):
        _, _, pop = self._wrapped()
        pop._build(360)
        self.assertGreater(pop._img.width, 200)


if __name__ == "__main__":
    unittest.main()
