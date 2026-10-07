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


class TestMovieOverlays(unittest.TestCase):
    def test_movie_overlay_no_ghost_during_crossfade(self):
        # the movie-level ribbon must render exactly once even mid-transition
        from slideforge.slides import TitleSlide
        m = Movie(Config(w=W, h=H, fps=10))
        m.add(TitleSlide("A", duration=2.0, bg={"type": "solid",
                                              "color": (20, 20, 30)}, cfg=cfg()),
              transition="cut")
        m.add(TitleSlide("B", duration=2.0, bg={"type": "solid",
                                              "color": (20, 20, 30)}, cfg=cfg()),
              transition="crossfade", trans_dur=1.0)
        m.overlay(TimelineRibbon("ERA", events=[(0.5, "mid")], span=(0, 1)))
        # mid-crossfade: t=2.0 is the boundary (1.0s overlap)
        f = m.frame_at(2.0)
        self.assertEqual(f.shape, (H, W, 3))
        # count bright playhead dots on the track row: exactly one
        ty = int(H * 0.956)
        row = f[ty, int(W * 0.32):int(W * 0.96)]
        bright = (row[:, 0].astype(int) > 200)
        # label runs of bright pixels; the playhead is the widest run
        runs, cur = [], 0
        for v in bright:
            if v:
                cur += 1
            elif cur:
                runs.append(cur)
                cur = 0
        if cur:
            runs.append(cur)
        wide = [r for r in runs if r >= 8]
        self.assertEqual(len(wide), 1, f"playhead ghosted: runs={runs}")


class TestLineBoxes(unittest.TestCase):
    def test_highlight_ink_light_and_default(self):
        import numpy as np
        from slideforge import Config
        from slideforge.slides import HighlightSlide

        def glyph_lum(slide, pct):
            fr = np.asarray(slide.frame(5.9))
            b = slide.line_boxes()[0]
            x0, x1 = int(b["x0"] * 640), int(b["x1"] * 640)
            y0, y1 = int(b["y0"] * 360), int(b["y1"] * 360)
            return np.percentile(fr[y0:y1, x0:x1].mean(axis=2), pct)

        text = "The French called Jumonville an ==assassination==."
        # default ink is paper-black: dark glyphs on the light bg
        paper = HighlightSlide(text, duration=6.0,
                               cfg=Config(w=640, h=360))
        self.assertLess(glyph_lum(paper, 1), 100)
        # light ink reads on a dark textured bg (seen live: near-black
        # default ink on near-black bg was unreadable)
        dark = HighlightSlide(text, ink=[236, 230, 218],
                              bg={"type": "textured"}, duration=6.0,
                              cfg=Config(w=640, h=360))
        # glyphs cover <5% of the padded line box: p99 lands on them
        self.assertGreater(glyph_lum(dark, 99), 150)
        with self.assertRaises(ValueError):
            HighlightSlide(text, ink=[9, 9],
                           cfg=Config(w=640, h=360))

    def test_highlight_line_boxes(self):
        from slideforge import Config
        from slideforge.slides import HighlightSlide
        # geometry needs a realistic frame; the 640x360 test config wraps
        # the same paragraph onto more lines that overflow the frame
        s = HighlightSlide(
            "Bartolomé de las Casas watched the encomienda system devour "
            "entire villages. ==He wrote that the Spanish 'laid waste' to "
            "the islands==, and his account shocked readers back in Spain.",
            cfg=Config(w=1280, h=720))
        boxes = s.line_boxes()
        self.assertGreater(len(boxes), 1)
        for b in boxes:
            for k in ("x0", "x1", "y0", "y1", "yc"):
                self.assertIn(k, b)
                self.assertGreaterEqual(b[k], 0.0)
                self.assertLessEqual(b[k], 1.0)
            self.assertLess(b["x0"], b["x1"])
            self.assertLess(b["y0"], b["yc"])
            self.assertLess(b["yc"], b["y1"])
        # lines stack downward without overlap
        for a, b in zip(boxes, boxes[1:]):
            self.assertLessEqual(a["y1"], b["y0"] + 0.02)


class TestWordBoxes(unittest.TestCase):
    def test_bullet_word_boxes(self):
        from slideforge import Config
        from slideforge.slides import BulletSlide
        s = BulletSlide("Title", ["alpha **beta** gamma",
                                  "delta epsilon"], cfg=Config(w=1280, h=720))
        wb = s.word_boxes()
        for w in ("alpha", "beta", "gamma", "delta", "epsilon"):
            self.assertIn(w, wb, f"missing word {w!r}")
            x0, y0, x1, y1 = wb[w][0]
            self.assertLess(x0, x1)
            self.assertLess(y0, y1)
            for v in (x0, y0, x1, y1):
                self.assertGreaterEqual(v, 0.0)
                self.assertLessEqual(v, 1.0)
        # reading order: alpha before beta before gamma on line 1...
        self.assertLess(wb["alpha"][0][0], wb["beta"][0][0])
        self.assertLess(wb["beta"][0][0], wb["gamma"][0][0])
        # ...and line 2 below line 1
        self.assertLess(wb["gamma"][0][1], wb["delta"][0][1])


class TestMagnifierTrace(unittest.TestCase):
    def test_trace_line(self):
        from slideforge.overlays import Magnifier
        box = {"x0": 0.07, "x1": 0.90, "yc": 0.50,
               "y0": 0.45, "y1": 0.55}
        m = Magnifier.trace_line(box, 2.5, 9.0, radius=0.14, zoom=2.4)
        self.assertEqual(len(m.path), 2)
        (t0, x0, y0), (t1, x1, y1) = m.path
        self.assertEqual((t0, t1), (2.5, 9.0))
        # inside the line with margin, centered vertically on it
        self.assertGreater(x0, box["x0"])
        self.assertLess(x1, box["x1"])
        self.assertAlmostEqual(y0, 0.50)
        self.assertAlmostEqual(y1, 0.50)
        self.assertLess(x0, x1)
        self.assertEqual(m.radius, 0.14)
        self.assertEqual(m.zoom, 2.4)
        # mid-trace position interpolates along the line
        mx, my = m._center_at(5.75)
        self.assertAlmostEqual(my, 0.50)
        self.assertGreater(mx, x0)
        self.assertLess(mx, x1)


class TestPacing(unittest.TestCase):
    def test_bullet_stagger_param(self):
        from slideforge import Config
        from slideforge.slides import BulletSlide
        cfg = Config(w=1280, h=720)
        s = BulletSlide("T", ["a", "b", "c"], cfg=cfg, stagger=2.0)
        self.assertEqual(s.stagger, 2.0)
        # default duration scales with stagger
        self.assertAlmostEqual(s.duration, 2.4 + 2.0 * 3)

    def test_steps_stagger_param(self):
        from slideforge import Config
        from slideforge.slides import StepsSlide
        cfg = Config(w=1280, h=720)
        s = StepsSlide("T", ["a", "b"], cfg=cfg, stagger=1.0)
        self.assertEqual(s.stagger, 1.0)
        self.assertAlmostEqual(s.duration, 2.6 + 1.0 * 2)
