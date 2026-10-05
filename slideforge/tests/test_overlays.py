import unittest

import numpy as np

from slideforge import Config, TitleSlide
from slideforge.overlays import LowerThird, Caption, with_overlays


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
        with_overlays(base, [cap])
        self.assertAlmostEqual(cap.duration, 4.0 - 0.3)

    def test_lower_third_apply_guard(self):
        cfg0 = cfg()
        frame = np.zeros((360, 640, 3), dtype=np.uint8)
        lt = LowerThird("Name", start=0.5, duration=3.5)
        np.testing.assert_array_equal(lt.apply(frame, 0.1), frame)


if __name__ == "__main__":
    unittest.main()
