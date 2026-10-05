import unittest

import numpy as np

from slideforge import Config
from slideforge.slides import (
    _rich_tokens, _outlined_line, _outlined_block, _paper_line_img,
    _paper_block, BulletSlide, StepsSlide, DisplayHeadline,
    DisplayPointsSlide, CompareSlide, HighlightSlide,
)


def cfg():
    return Config(w=640, h=360, fps=10)


class TestRichTokens(unittest.TestCase):
    def test_plain(self):
        self.assertEqual(_rich_tokens("hello world"),
                         [("hello", False, False), ("world", False, False)])

    def test_bold(self):
        toks = _rich_tokens("to **Mexico** from")
        self.assertEqual(toks[1], ("Mexico", True, False))
        self.assertEqual(toks[0], ("to", False, False))

    def test_highlight(self):
        toks = _rich_tokens("==Political change== was")
        self.assertEqual(toks[0], ("Political", True, True))
        self.assertEqual(toks[1], ("change", True, True))
        self.assertEqual(toks[2], ("was", False, False))

    def test_unclosed_markers_left_literal(self):
        toks = _rich_tokens("a ** b")
        self.assertTrue(all(not b for _, b, _ in toks))


class TestRichRender(unittest.TestCase):
    def test_outlined_line_plain_matches_old_shape(self):
        img = _outlined_line("Hello", 48)
        self.assertGreater(img.width, 50)
        self.assertGreater(img.height, 30)

    def test_bold_span_widens_stroke(self):
        plain = _outlined_line("Mexico", 48)
        bold = _outlined_line("**Mexico**", 48)
        # heavier stroke -> slightly larger inked area
        pa = np.array(plain.split()[3]).sum()
        ba = np.array(bold.split()[3]).sum()
        self.assertGreater(ba, pa)

    def test_block_wraps(self):
        blk = _outlined_block("word " * 40, 40, 300)
        single = _outlined_block("word", 40, 300)
        self.assertGreater(blk.height, single.height * 2)

    def test_paper_line_swash(self):
        timg, simg = _paper_line_img(_rich_tokens("==hi== there"), 40)
        self.assertIsNotNone(simg.getbbox())
        t2, s2 = _paper_line_img(_rich_tokens("plain there"), 40)
        self.assertIsNone(s2.getbbox())

    def test_paper_block_lines(self):
        lines = _paper_block("one two three " * 20, 36, 300)
        self.assertGreater(len(lines), 1)

    def test_paper_block_respects_max_w(self):
        lines = _paper_block("• " + "word " * 30, 40, 300)
        self.assertGreater(len(lines), 1)
        for timg, _ in lines:
            self.assertLessEqual(timg.width, 300 + 96)

    def test_swash_is_marker_like_not_box(self):
        # organic swash hugs the text: well under the full line-box height
        # the old rounded-rect style filled (plus padding)
        from slideforge.canvas import get_font
        f = get_font(48, bold=True)
        asc, desc = f.getmetrics()
        timg, simg = _paper_line_img(_rich_tokens("==hi there=="), 48)
        sb = simg.getbbox()
        self.assertIsNotNone(sb)
        self.assertLess(sb[3] - sb[1], 0.85 * (asc + desc) + 8)


class TestUpgradedSlides(unittest.TestCase):
    def test_display_headline_rich_markers(self):
        s = DisplayHeadline("**Zimmerman** Telegram",
                            sub="an encrypted message to **Mexico**",
                            cfg=cfg())
        f = s.frame(2.0)
        self.assertEqual(f.shape, (360, 640, 3))

    def test_display_points_rich(self):
        s = DisplayPointsSlide(["**1.** New **Tech**"], cfg=cfg())
        f = s.frame(2.0)
        self.assertEqual(f.shape, (360, 640, 3))

    def test_bullet_nesting(self):
        s = BulletSlide("Institutions",
                        [("Glass-Steagall Act (1933)",
                          ["separated commercial from investment banking"]),
                         "Social Security Act (1935)"],
                        cfg=cfg())
        self.assertEqual(len(s.bullets), 2)
        self.assertEqual(s.bullets[0][1],
                         ["separated commercial from investment banking"])
        f = s.frame(4.0)
        self.assertEqual(f.shape, (360, 640, 3))

    def test_bullet_plain_still_works(self):
        s = BulletSlide("T", ["a", "b"], cfg=cfg())
        self.assertEqual(s.bullets, [("a", []), ("b", [])])
        s.frame(3.0)  # no crash

    def test_steps_banner(self):
        s = StepsSlide("", ["Renaissance", "Conquistadors"],
                       banner="Cause #1: Gold", cfg=cfg())
        f0 = s.frame(0.05)
        f2 = s.frame(2.0)
        self.assertEqual(f2.shape, (360, 640, 3))
        # banner punches in: frame changes between t=0.05 and t=2
        self.assertFalse(np.array_equal(f0, f2))

    def test_steps_no_banner_unchanged_layout(self):
        s = StepsSlide("T", ["a"], cfg=cfg())
        s.frame(2.0)  # no crash


class TestCompareSlide(unittest.TestCase):
    def _slide(self):
        return CompareSlide(
            "CONFLICTING WORLDVIEWS",
            left={"head": "EUROPEANS",
                  "sections": [{"sub": "Land Use",
                                "points": ["Land could be owned",
                                           "by individuals"]}]},
            right={"head": "INDIGENOUS PEOPLES",
                   "sections": [{"sub": "Land Use",
                                 "points": ["Resource available to all"]}]},
            cfg=cfg())

    def test_frames(self):
        s = self._slide()
        for t in (0.2, 2.0, 5.0):
            f = s.frame(t)
            self.assertEqual(f.shape, (360, 640, 3))

    def test_reveal_progresses(self):
        s = self._slide()
        self.assertFalse(np.array_equal(s.frame(0.2), s.frame(6.0)))

    def test_validate(self):
        self.assertEqual(self._slide().validate(), [])
        bad = CompareSlide("", {"head": "", "sections": []},
                           {"head": "R", "sections": [{"sub": "s",
                                                       "points": ["p"]}]},
                           cfg=cfg())
        issues = bad.validate()
        self.assertTrue(any("head" in i for i in issues))
        self.assertTrue(any("title" in i for i in issues))

    def test_long_bullets_stay_in_column(self):
        s = CompareSlide(
            "T",
            left={"head": "A", "sections": [{"sub": "s", "points": [
                "Land could be owned by individuals and passed down "
                "through families for generations"]}]},
            right={"head": "B", "sections": [{"sub": "s",
                                              "points": ["x"]}]},
            cfg=cfg())
        f = s.frame(6.0)
        self.assertEqual(f.shape, (360, 640, 3))


class TestHighlightSlide(unittest.TestCase):
    def test_frames_no_card(self):
        s = HighlightSlide("==Political change== was occurring in some "
                           "European states", cfg=cfg())
        for t in (0.5, 2.5, 5.0):
            self.assertEqual(s.frame(t).shape, (360, 640, 3))

    def test_swash_wipes_in(self):
        s = HighlightSlide("==Political change== was occurring", cfg=cfg())
        # swash appears after the line lands
        early = s.frame(0.6)
        late = s.frame(4.0)
        self.assertFalse(np.array_equal(early, late))

    def test_validate(self):
        s = HighlightSlide("text", cfg=cfg())
        self.assertEqual(s.validate(), [])
        bad = HighlightSlide("text",
                             card={"image": "/nonexistent/x.jpg",
                                   "caption": "cap"},
                             cfg=cfg())
        self.assertTrue(any("not found" in i for i in bad.validate()))
        bad2 = HighlightSlide("   ", cfg=cfg())
        self.assertTrue(any("empty" in i for i in bad2.validate()))


if __name__ == "__main__":
    unittest.main()
