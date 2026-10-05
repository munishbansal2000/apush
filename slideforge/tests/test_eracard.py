"""EraCardSlide (designed unit title card) + era background coverage."""
import unittest

import numpy as np

from slideforge import Config
from slideforge.slides import EraCardSlide, DisplayHeadline, Slide
from slideforge.backgrounds import ERA_PALETTES
from slideforge.plugins import background_registry


def _cfg():
    return Config(w=640, h=360, fps=10)


class TestEraBackground(unittest.TestCase):
    def test_all_nine_units_render(self):
        for unit in range(1, 10):
            with self.subTest(unit=unit):
                s = Slide(2.0, bg={"type": "era", "unit": unit}, cfg=_cfg())
                f = s.bg_frame(0.0)
                self.assertEqual(f.shape, (360, 640, 3))
                self.assertIn(unit, ERA_PALETTES)

    def test_distinct_units_distinct_tints(self):
        means = {}
        for unit in (1, 6, 8):
            s = Slide(2.0, bg={"type": "era", "unit": unit}, cfg=_cfg())
            means[unit] = s.bg_frame(0.0).mean(axis=(0, 1))
        self.assertFalse(np.allclose(means[1], means[6], atol=2.0))
        self.assertFalse(np.allclose(means[6], means[8], atol=2.0))

    def test_bad_unit_falls_back_to_unit_1(self):
        s = Slide(2.0, bg={"type": "era", "unit": 99}, cfg=_cfg())
        f = s.bg_frame(0.0)
        s1 = Slide(2.0, bg={"type": "era", "unit": 1}, cfg=_cfg())
        self.assertTrue(np.array_equal(f, s1.bg_frame(0.0)))

    def test_era_bg_on_other_slide(self):
        s = DisplayHeadline("Hello", bg={"type": "era", "unit": 6},
                            duration=2.0, cfg=_cfg())
        f = s.frame(1.0)
        self.assertEqual(f.shape, (360, 640, 3))

    def test_registered(self):
        self.assertIn("era", background_registry.names())


class TestEraCardSlide(unittest.TestCase):
    def _card(self, **kw):
        base = dict(title="The French & Indian War",
                    kicker="APUSH - UNIT 2 - EP. 8",
                    subtitle="A 22-year-old starts a world war",
                    boxes=[{"label": "Jumonville Glen", "icon": "swords"},
                           {"label": "Braddock", "icon": "star"},
                           {"label": "Monongahela", "icon": "flag"}],
                    footer="French & Indian War - 1754-1763",
                    unit=2, duration=6.0, cfg=_cfg())
        base.update(kw)
        return EraCardSlide(**base)

    def test_full_card_renders_all_units(self):
        for unit in range(1, 10):
            with self.subTest(unit=unit):
                f = self._card(unit=unit).frame(4.5)
                self.assertEqual(f.shape, (360, 640, 3))

    def test_animation_progresses(self):
        s = self._card()
        early = s.frame(0.05).astype(float)
        late = s.frame(4.5).astype(float)
        self.assertGreater(np.abs(late - early).mean(), 1.0)

    def test_bare_variants(self):
        EraCardSlide(title="Title Only", unit=3, duration=3.0,
                     cfg=_cfg()).frame(1.5)
        EraCardSlide(title="T", subtitle="S", unit=9, duration=3.0,
                     cfg=_cfg()).frame(1.5)
        EraCardSlide(title="T", boxes=[{"label": "One"}], unit=1,
                     duration=3.0, cfg=_cfg()).frame(2.5)

    def test_box_cap_is_three(self):
        s = self._card(boxes=[{"label": str(i)} for i in range(6)])
        self.assertEqual(len(s.boxes), 3)

    def test_unknown_icon_falls_back(self):
        s = self._card(boxes=[{"label": "X", "icon": "nonsense"}])
        s.frame(2.5)  # must not raise

    def test_text_registered_for_validate_visual(self):
        s = self._card()
        s.frame(4.5)
        names = {e["key"] for e in s._text_elements}
        self.assertIn("title", names)
        self.assertIn("kicker", names)
        self.assertIn("subtitle", names)
        self.assertTrue(any(n.startswith("box:") for n in names))


if __name__ == "__main__":
    unittest.main()
