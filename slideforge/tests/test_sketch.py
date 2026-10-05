import unittest

import numpy as np

from slideforge import Config
from slideforge.sketch import ICON_SHAPES, SketchSlide


def cfg():
    return Config(w=640, h=360, fps=10)


PITT = [
    {"type": "icon", "shape": "moneybag", "label": "Britain",
     "x": 0.2, "y": 0.5},
    {"type": "arrow", "from": [0.3, 0.5], "to": [0.55, 0.5],
     "label": "subsidies"},
    {"type": "icon", "shape": "soldier", "label": "Prussia",
     "x": 0.65, "y": 0.5},
]


class TestSketchSlide(unittest.TestCase):
    def test_every_icon_renders(self):
        for shape in ICON_SHAPES:
            s = SketchSlide(
                [{"type": "icon", "shape": shape, "x": 0.5, "y": 0.5}],
                duration=2.0, cfg=cfg())
            f = s.frame(1.9)
            self.assertEqual(f.shape, (360, 640, 3))
            self.assertEqual(f.dtype, np.uint8)

    def test_draw_on_progresses(self):
        s = SketchSlide(PITT, duration=6.0, stagger=1.0, cfg=cfg())
        early = s.frame(0.1)
        mid = s.frame(2.5)
        late = s.frame(5.9)
        # nothing drawn yet vs partially vs fully settled
        self.assertTrue((early == s.frame(0.0)).all())
        self.assertFalse((mid == early).all())
        self.assertFalse((late == mid).all())

    def test_deterministic(self):
        a = SketchSlide(PITT, duration=6.0, cfg=cfg()).frame(4.2)
        b = SketchSlide(PITT, duration=6.0, cfg=cfg()).frame(4.2)
        np.testing.assert_array_equal(a, b)

    def test_registers_labels(self):
        s = SketchSlide(PITT, duration=6.0, cfg=cfg())
        s.frame(5.9)
        keys = [e["key"] for e in s._text_elements]
        self.assertIn("sketch:label:Britain", keys)
        self.assertIn("sketch:arrow:subsidies", keys)
        self.assertIn("sketch:label:Prussia", keys)

    def test_unknown_shape_lists_choices(self):
        with self.assertRaises(ValueError) as cm:
            SketchSlide([{"type": "icon", "shape": "tank",
                          "x": 0.5, "y": 0.5}], cfg=cfg())
        self.assertIn("moneybag", str(cm.exception))

    def test_bad_geometry_rejected(self):
        with self.assertRaises(ValueError):
            SketchSlide([{"type": "icon", "shape": "coin",
                          "x": 1.5, "y": 0.5}], cfg=cfg())
        with self.assertRaises(ValueError):
            SketchSlide([{"type": "arrow", "from": [0.1, 0.1],
                          "to": [0.1, 0.1]}], cfg=cfg())
        with self.assertRaises(ValueError):
            SketchSlide([{"type": "text", "text": "  ",
                          "x": 0.5, "y": 0.5}], cfg=cfg())
        with self.assertRaises(ValueError):
            SketchSlide([{"type": "mural"}], cfg=cfg())
        with self.assertRaises(ValueError):
            SketchSlide([], cfg=cfg())

    def test_custom_ink_and_text(self):
        s = SketchSlide(
            [{"type": "icon", "shape": "crown", "x": 0.5, "y": 0.4,
              "ink": [180, 40, 40]},
             {"type": "text", "text": "Long live Pitt", "x": 0.5,
              "y": 0.75, "bold": True}],
            duration=3.0, cfg=cfg())
        f = s.frame(2.9)
        self.assertEqual(f.shape, (360, 640, 3))
        keys = [e["key"] for e in s._text_elements]
        self.assertIn("sketch:text:Long live Pitt", keys)

    def test_validate_warns_on_clutter(self):
        many = [{"type": "text", "text": "t%d" % i, "x": 0.5, "y": 0.5}
                for i in range(13)]
        self.assertTrue(SketchSlide(many, cfg=cfg()).validate())
        self.assertEqual(SketchSlide(PITT, cfg=cfg()).validate(), [])


if __name__ == "__main__":
    unittest.main()
