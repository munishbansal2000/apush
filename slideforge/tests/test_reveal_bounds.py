import unittest

from slideforge import Config
from slideforge.slides import RevealSlide


class TestRevealBounds(unittest.TestCase):
    """Long titles/points stay in bounds (wrapped, shrunk, registered)."""

    def test_long_text_stays_clean(self):
        s = RevealSlide(
            "A deliberately overlong banner headline that must shrink",
            [{"text": ("This point is far too long for one line and must "
                       "wrap onto several lines without leaving the canvas"),
              "at": 0.0},
             {"text": "Short one", "at": -1,
              "sub": ("An equally overlong sub-bullet that also has to wrap "
                      "instead of running off the right edge")}],
            duration=12.0, cfg=Config(w=1280, h=720, fps=30))
        issues = s.validate_visual()
        self.assertEqual(issues, [])

    def test_cutaway_resume_pattern(self):
        # at<0 points are fully visible from frame 0 (return visit).
        s = RevealSlide(
            "Resume", [{"text": "Seen before", "at": -1},
                       {"text": "Typing now", "at": 1.0}],
            duration=6.0, cfg=Config(w=640, h=360, fps=10))
        f0 = s.frame(0.0)
        self.assertEqual(f0.shape, (360, 640, 3))
        self.assertEqual(s._visible_chars("Seen before", -1, 0.0), 11)
        self.assertEqual(s._visible_chars("Typing now", 1.0, 0.0), 0)


if __name__ == "__main__":
    unittest.main()
