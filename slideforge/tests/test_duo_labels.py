import unittest

import numpy as np

from slideforge import Config
from slideforge.slides import DuoSlide

W, H = 640, 360
IMG = np.full((400, 500, 3), 150, dtype=np.uint8)


def cfg():
    return Config(w=W, h=H, fps=10)


class TestDuoImageLabelsFit(unittest.TestCase):
    """Image-panel labels must shrink to fit (like points panels do).

    Regression test for the u1-e1 marquee frame audit: "Iroquois --
    Confederacy" overflowed its panel onto the canvas edge and into the
    neighboring panel because _draw_image_panel never shrank its labels.
    """

    def test_long_labels_stay_inside_panels(self):
        s = DuoSlide({"image": IMG, "label": "Iroquois \u2014 Confederacy"},
                     {"image": IMG, "label": "Pueblo \u2014 Villages"},
                     duration=6.0, cfg=cfg())
        s.frame(5.0)  # settled: punch-in done, shrink applied
        (lx0, _ly0, lpw, _lph), (rx0, _ry0, rpw, _rph) = s._panel_rects()
        boxes = {e["key"]: e["box"] for e in s._text_elements}
        lb, rb = boxes["l:label:0"], boxes["r:label:0"]
        self.assertGreaterEqual(lb[0], lx0 - 1, "left label off panel left")
        self.assertLessEqual(lb[2], lx0 + lpw + 1, "left label bleeds right")
        self.assertGreaterEqual(rb[0], rx0 - 1, "right label bleeds left")
        self.assertLessEqual(rb[2], rx0 + rpw + 1, "right label off panel")
        self.assertLessEqual(lb[2], rb[0], "labels overlap each other")


if __name__ == "__main__":
    unittest.main()
