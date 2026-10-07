import unittest

import numpy as np
from PIL import Image

from slideforge import Config
from slideforge.slides import (BulletSlide, CollageSlide, TitleCardSlide,
                               _rich_para_dark, _rich_block_size)
from slideforge.overlays import (Sticker, RegionGlow, card_image,
                                 with_overlays)
from slideforge import TitleSlide


def cfg():
    return Config(w=640, h=360, fps=10)


def red_square(path="/tmp/sf_red.png", size=200):
    Image.new("RGB", (size, size), (200, 40, 40)).save(path)
    return path


IMG = red_square()


class TestRichBullets(unittest.TestCase):
    def test_bold_lead_in_renders(self):
        s = BulletSlide("T", ["**Caravel:** fast ship",
                              ("**Lateen Sail:** wind", ["child"])],
                        cfg=cfg())
        f = s.frame(5.0)
        self.assertEqual(f.shape, (360, 640, 3))

    def test_rich_block_size(self):
        w, h = _rich_block_size("a b c", 30, 500)
        self.assertGreater(w, 0)
        self.assertGreater(h, 0)
        w2, h2 = _rich_block_size("word " * 40, 30, 200)
        self.assertGreater(h2, h)

    def test_plain_unchanged(self):
        s = BulletSlide("T", ["plain bullet"], cfg=cfg())
        s.frame(2.0)  # no crash


class TestSticker(unittest.TestCase):
    def _wrapped(self, **kw):
        base = TitleSlide("Hi", duration=6.0, cfg=cfg())
        st = Sticker(IMG, **kw)
        return base, with_overlays(base, [st])

    def test_rect_build(self):
        base, wrapped = self._wrapped(at=(0.5, 0.5), label="LONGHOUSE")
        f = wrapped.frame(2.0)
        self.assertEqual(f.shape, (360, 640, 3))
        self.assertFalse(np.array_equal(f, base.frame(2.0)))

    def test_circle_build(self):
        base, wrapped = self._wrapped(shape="circle")
        wrapped.frame(2.0)  # no crash

    def test_inactive_noop(self):
        base, wrapped = self._wrapped()
        np.testing.assert_array_equal(wrapped.frame(0.1), base.frame(0.1))

    def test_card_image_borders(self):
        for border in ("sticker", (200, 30, 30), None):
            im = card_image(IMG, 160, border=border)
            self.assertGreater(im.width, 100)
        im = card_image(IMG, 160, shape="circle")
        self.assertEqual(im.width, im.height)


class TestRegionGlow(unittest.TestCase):
    def test_glow_and_label(self):
        base = TitleSlide("Hi", duration=6.0, cfg=cfg())
        wrapped = with_overlays(
            base, [RegionGlow(at=(0.4, 0.5), label="GREAT BASIN")])
        f = wrapped.frame(2.0)
        self.assertEqual(f.shape, (360, 640, 3))
        self.assertFalse(np.array_equal(f, base.frame(2.0)))

    def test_inactive_noop(self):
        base = TitleSlide("Hi", duration=6.0, cfg=cfg())
        wrapped = with_overlays(base, [RegionGlow()])
        np.testing.assert_array_equal(wrapped.frame(0.1), base.frame(0.1))


class TestCollageSlide(unittest.TestCase):
    def _slide(self):
        return CollageSlide(
            cards=[{"image": IMG, "at": (0.16, 0.22), "w": 0.24,
                    "border": (200, 40, 40), "tilt": -2.0},
                   {"image": IMG, "at": (0.84, 0.24), "w": 0.20,
                    "shape": "circle"}],
            banner="INDIGENOUS SOCIETIES: EXAMPLES",
            notes=[{"text": "The native populations were ==diverse==",
                    "at": (0.35, 0.06), "align": "center", "width": 0.5}],
            cfg=cfg())

    def test_frames(self):
        s = self._slide()
        for t in (0.3, 3.0, 6.0):
            self.assertEqual(s.frame(t).shape, (360, 640, 3))

    def test_progression(self):
        s = self._slide()
        self.assertFalse(np.array_equal(s.frame(0.3), s.frame(7.0)))

    def test_validate(self):
        self.assertEqual(self._slide().validate(), [])
        bad = CollageSlide(
            cards=[{"image": "/nonexistent/x.jpg", "at": (2.0, 0.5)}],
            cfg=cfg())
        issues = bad.validate()
        self.assertTrue(any("not found" in i for i in issues))
        self.assertTrue(any("0..1" in i for i in issues))


class TestTitleCardSlide(unittest.TestCase):
    def test_frames(self):
        s = TitleCardSlide(IMG, "CAHOKIA", kicker="Greetings from...",
                           cfg=cfg())
        for t in (0.5, 2.5):
            self.assertEqual(s.frame(t).shape, (360, 640, 3))

    def test_progression(self):
        s = TitleCardSlide(IMG, "CAHOKIA", cfg=cfg())
        self.assertFalse(np.array_equal(s.frame(0.2), s.frame(3.0)))

    def test_multiline(self):
        s = TitleCardSlide(IMG, "NEW\nYORK", cfg=cfg())
        s.frame(2.0)  # no crash


if __name__ == "__main__":
    unittest.main()
