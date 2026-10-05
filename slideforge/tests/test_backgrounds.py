import unittest

import numpy as np

from slideforge import Config
from slideforge.slides import Slide
from slideforge.plugins import background_registry
from slideforge.apush import apush_bg, ERAS


def _slide(bg, duration=2.0):
    cfg = Config(w=320, h=180, fps=10)
    s = Slide(duration, bg=bg, cfg=cfg)
    return s


class TestBackgrounds(unittest.TestCase):
    def test_solid(self):
        s = _slide({"type": "solid", "color": (10, 20, 30)})
        f = s.bg_frame(0.0)
        self.assertEqual(f.shape, (180, 320, 3))
        self.assertTrue(np.all(f[:, :, 0] == 10))
        self.assertTrue(np.all(f[:, :, 1] == 20))

    def test_gradient(self):
        s = _slide({"type": "gradient", "top": (0, 0, 0),
                    "bottom": (255, 255, 255)})
        f = s.bg_frame(1.0)
        self.assertEqual(f.shape, (180, 320, 3))
        self.assertLess(f[0, 0].mean(), f[-1, 0].mean())  # dark top

    def test_image_with_drift(self):
        img = np.full((400, 400, 3), 200, dtype=np.uint8)
        s = _slide({"type": "image", "array": img, "dim": 1.0,
                    "drift": [(0.5, 0.5, 1.0), (0.5, 0.5, 0.8)]})
        f0 = s.bg_frame(0.0)
        f1 = s.bg_frame(1.9)
        self.assertEqual(f0.shape, (180, 320, 3))
        self.assertEqual(f1.shape, (180, 320, 3))

    def test_apush_bg_spec_and_render(self):
        spec = apush_bg("twenties", dim=0.5)
        self.assertEqual(spec["type"], "apush")
        s = _slide(spec)
        f = s.bg_frame(1.0)
        self.assertEqual(f.shape, (180, 320, 3))
        self.assertGreater(f.mean(), 1)  # not black

    def test_apush_unknown_era(self):
        with self.assertRaises(ValueError):
            apush_bg("nope")

    def test_unknown_bg_type_raises_valueerror(self):
        s = _slide({"type": "nope"})
        with self.assertRaises(ValueError):
            s.bg_frame(0.0)

    def test_all_eras_have_files(self):
        import os
        from slideforge.apush import era_path
        for era in ERAS:
            self.assertTrue(os.path.exists(era_path(era)), era)


if __name__ == "__main__":
    unittest.main()
