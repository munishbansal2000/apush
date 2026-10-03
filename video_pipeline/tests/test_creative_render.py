import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "video"))

import motion


class CreativeRenderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        motion.set_scale(0.1)

    @classmethod
    def tearDownClass(cls):
        motion.set_scale(1.0)

    def test_creative_primitives_produce_rgb_frames(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            bg = root / "background.jpg"
            layer = root / "layer.png"
            Image.new("RGB", (320, 480), (90, 110, 130)).save(bg)
            Image.new("RGBA", (120, 180), (220, 170, 60, 210)).save(layer)

            clips = [
                motion.parallax_scene(str(bg), [{
                    "image": str(layer), "x": 0.6, "y": 0.55,
                    "scale": 0.3, "depth": 1.5, "entrance": "rise"
                }], 2.0, "Layered evidence"),
                motion.source_analysis_scene(str(bg), 2.0, [{
                    "box": [0.1, 0.2, 0.7, 0.6], "label": "Evidence",
                    "at": 0.1, "duration": 1.5
                }], "Read the source"),
                motion.diagram_scene(str(bg), 2.0, [
                    {"id": "cause", "label": "Cause", "x": 0.5, "y": 0.3, "at": 0},
                    {"id": "effect", "label": "Effect", "x": 0.5, "y": 0.7, "at": 0.5}
                ], [{"from": "cause", "to": "effect", "at": 0.3}], "Causal chain")
            ]
            clips.append(motion.beat_overlay(clips[-1], [{
                "type": "host", "at": 0.1, "duration": 1.5,
                "text": "Explain the connection", "x": 0.5, "y": 0.88
            }], 2.0))
            try:
                for clip in clips:
                    frame = clip.get_frame(1.0)
                    self.assertEqual(frame.shape, (motion.H, motion.W, 3))
                    self.assertEqual(frame.dtype, np.uint8)
            finally:
                for clip in clips:
                    clip.close()


if __name__ == "__main__":
    unittest.main()
