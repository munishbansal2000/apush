import unittest

from slideforge import Config
from slideforge.slides import RevealSlide

W, H = 640, 360


def cfg():
    return Config(w=W, h=H, fps=10)


class TestRevealTitleAndWrap(unittest.TestCase):
    """RevealSlide title color, wrapping, and registration.

    Regression test for the c6b1be6 pull: the incoming lane reverted
    RevealSlide to black-on-red titles, unwrapped single-line points,
    and no text registration (its base predated those fixes). The
    bounds test did not catch any of it — this one pins the behavior.
    """

    def test_white_shrunk_title(self):
        s = RevealSlide(
            "A deliberately overlong banner title that must shrink to fit",
            [{"text": "Short point", "at": 0.0}],
            duration=6.0, cfg=cfg())
        s.frame(5.0)
        els = {e["key"]: e for e in s._text_elements}
        self.assertIn("title", els)
        self.assertEqual(els["title"]["color"], (255, 255, 255),
                         "title must stay white on the red banner")
        x0, _y0, x1, _y1 = els["title"]["box"]
        self.assertGreaterEqual(x0, 0, "shrunk title off left edge")
        self.assertLessEqual(x1, W, "unshrunk title bleeds past frame")

    def test_long_point_wraps_and_registers(self):
        long_point = ("Peninsulares, born in Spain, stood at the very top "
                      "of the colonial social ladder in New Spain")
        s = RevealSlide("The social ladder",
                        [{"text": long_point, "at": 0.0}],
                        duration=10.0, cfg=cfg())
        s.frame(9.0)  # fully typed
        els = {e["key"]: e for e in s._text_elements}
        self.assertIn("point:0", els)
        self.assertIn("num:0", els)
        _x0, y0, x1, y1 = els["point:0"]["box"]
        self.assertLessEqual(x1, W * 0.90 + 1,
                             "unwrapped point bleeds past the margin")
        self.assertGreater(y1 - y0, H * 0.05,
                           "wrapped point should span 2+ lines")


if __name__ == "__main__":
    unittest.main()
