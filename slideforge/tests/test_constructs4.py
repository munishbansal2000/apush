"""Tests for the differentiation controls (round 4)."""

import unittest

import numpy as np

from slideforge import Config, Movie, with_overlays
from slideforge.slides import (CausalChainSlide, TerritorySlide, RecallSlide,
                               SpectrumSlide)
from slideforge.overlays import (TimelineRibbon, RedPen, Magnifier, MapNote)
from slideforge.kenburns import KenBurns

W, H = 640, 360
IMG = np.full((400, 500, 3), 150, dtype=np.uint8)


def cfg():
    return Config(w=W, h=H, fps=10)


class TestRound4Slides(unittest.TestCase):
    def _check(self, s):
        for t in (0.1, s.duration / 2, s.duration - 0.1):
            f = s.frame(t)
            self.assertEqual(f.shape, (H, W, 3), (type(s).__name__, t))
            self.assertEqual(f.dtype, np.uint8)

    def test_causal_chain(self):
        s = CausalChainSlide([("A", "aa"), ("B", "bb"), ("C", "cc")],
                             title="Why?", cfg=cfg())
        self._check(s)
        # arrows only appear after the second node pops
        early = s.frame(0.5)
        late = s.frame(s.duration - 0.3)
        self.assertFalse(np.array_equal(early, late))

    def test_territory(self):
        terrs = [
            {"at": (0.35, 0.45), "rx": 0.10, "ry": 0.08, "label": "T1",
             "date": "1783", "color": (90, 140, 255)},
            {"at": (0.55, 0.55), "rx": 0.12, "ry": 0.09, "label": "T2",
             "date": "1803", "color": (255, 170, 60)},
        ]
        s = TerritorySlide(IMG, terrs, title="Expansion", cfg=cfg())
        self._check(s)
        # second territory's fill appears late, not early
        px, py = int(0.55 * W), int(0.55 * H)
        early = s.frame(0.5)[py, px].astype(int)
        late = s.frame(s.duration - 0.5)[py, px].astype(int)
        self.assertGreater(np.abs(late - early).sum(), 20)

    def test_recall(self):
        s = RecallSlide("Name the causes", ["Gold", "God", "Glory"], cfg=cfg())
        self._check(s)
        # answer 1 sharpens over time: edge energy in its card crop rises
        y = int(H * 0.34)
        x0, x1 = int(W * 0.19), int(W * 0.81)
        def edge(f):
            crop = f[y:y + int(H * 0.105), x0:x1].astype(int)
            return np.abs(np.diff(crop, axis=1)).mean()
        blurred = s.frame(1.3)   # answer 1 mid-sharpen
        sharp = s.frame(2.6)     # answer 1 fully sharp
        self.assertGreater(edge(sharp), edge(blurred))

    def test_spectrum(self):
        s = SpectrumSlide(
            ("Loose", "Strict"),
            [{"at": 0.15, "label": "Hamilton", "color": (90, 140, 255)},
             {"at": 0.85, "label": "Jefferson", "color": (255, 170, 60),
              "move_to": 0.45, "move_start": 3.0}],
            title="Reading the Constitution", cfg=cfg())
        self._check(s)
        # knob x before the move vs after
        x0, x1 = W * 0.12, W * 0.88
        before = s._marker_x(s.markers[1], 1, 1.0, x0, x1)
        after = s._marker_x(s.markers[1], 1, s.duration - 0.2, x0, x1)
        self.assertAlmostEqual(before, x0 + 0.85 * (x1 - x0), delta=2)
        self.assertAlmostEqual(after, x0 + 0.45 * (x1 - x0), delta=2)

    def test_registered(self):
        from slideforge.plugins import slide_registry
        for name in ("causal-chain", "territory", "recall", "spectrum"):
            self.assertIn(name, slide_registry.names())


class TestRound4Overlays(unittest.TestCase):
    def test_timeline_ribbon(self):
        base = CausalChainSlide([("A", ""), ("B", "")], cfg=cfg())
        ov = TimelineRibbon("PERIOD 1 · 1491–1607",
                           events=[(0.0, "1492"), (0.5, "1607")],
                           span=(0.0, 0.5))
        m = with_overlays(base, [ov])
        f0 = m.frame(0.6)
        f1 = m.frame(base.duration - 0.2)
        ty = int(H * 0.956)
        x0, x1 = int(W * 0.36), int(W * 0.96)  # right of the frac=0 tick
        def head_x(f):
            row = f[ty, x0:x1, 0].astype(int)
            return x0 + int(np.argmax(row))
        self.assertEqual(f0.shape, (H, W, 3))
        # playhead (brightest thing on the track) moves right over time
        self.assertGreater(head_x(f1), head_x(f0) + 5)

    def test_redpen(self):
        base = CausalChainSlide([("A", "")], cfg=cfg())
        ov = RedPen([
            {"kind": "circle", "at": (0.5, 0.5), "r": 0.1, "start": 0.5},
            {"kind": "underline", "from": (0.2, 0.7), "to": (0.8, 0.7),
             "start": 1.5},
            {"kind": "check", "at": (0.85, 0.3), "start": 2.0},
            {"kind": "note", "at": (0.7, 0.85), "text": "KEY IDEA",
             "start": 2.5},
        ])
        m = with_overlays(base, [ov])
        before = m.frame(0.2)
        after = m.frame(base.duration - 0.2)
        self.assertFalse(np.array_equal(before, after))
        # red ink present late
        late = after.astype(int)
        red = (late[:, :, 0] > 180) & (late[:, :, 1] < 110) & (late[:, :, 2] < 110)
        self.assertGreater(red.sum(), 50)

    def test_magnifier(self):
        base = RecallSlide("Q?", ["answer one"], cfg=cfg())
        ov = Magnifier([(0.0, 0.3, 0.5), (3.0, 0.7, 0.5)], radius=0.15, zoom=2.2)
        m = with_overlays(base, [ov])
        f0 = m.frame(1.0)
        f1 = m.frame(3.0)
        self.assertEqual(f0.shape, (H, W, 3))
        # lens travels: frames differ
        self.assertFalse(np.array_equal(f0, f1))

    def test_mapnote_tracks_camera(self):
        kb = KenBurns(IMG, duration=6.0,
                      stops=[(0.5, 0.5, 1.0), (0.3, 0.3, 0.5)], hold=1.0,
                      cfg=cfg())
        notes = [{"at": (0.3, 0.3), "label": "Here", "start": 0.5}]
        ov = MapNote(kb, notes)
        sx0, sy0 = ov._to_screen(0.3, 0.3, kb.view_at(0.5), W, H)
        sx1, sy1 = ov._to_screen(0.3, 0.3, kb.view_at(5.5), W, H)
        # camera moved toward the point: it drifts toward screen center
        d0 = abs(sx0 - W / 2) + abs(sy0 - H / 2)
        d1 = abs(sx1 - W / 2) + abs(sy1 - H / 2)
        self.assertLess(d1, d0)
        # renders through with_overlays
        from slideforge.slides import KenBurnsSlide
        slide = KenBurnsSlide(IMG, stops=[(0.5, 0.5, 1.0), (0.3, 0.3, 0.5)],
                              cfg=cfg())
        m = with_overlays(slide, [MapNote(slide.kb, notes)])
        f = m.frame(3.0)
        self.assertEqual(f.shape, (H, W, 3))


if __name__ == "__main__":
    unittest.main()
