import sys
import tempfile
import unittest
import wave
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "video_pipeline"))

from pipeline.common import PipelineError
from pipeline.layout import validate_text_layout
from pipeline.schema import validate_manifest
from pipeline.timing import resolve_scene_timing


class ManifestTests(unittest.TestCase):
    def fixture(self, root: Path):
        (root / "image.jpg").write_bytes(b"checked for existence only")
        (root / "voice.txt").write_text("Reference voice transcript.", encoding="utf-8")
        with wave.open(str(root / "voice.wav"), "wb") as handle:
            handle.setnchannels(1)
            handle.setsampwidth(2)
            handle.setframerate(24000)
            handle.writeframes(b"\0\0" * 2400)
        return {
            "schema_version": 1,
            "lesson_id": "test-lesson",
            "title": "Test",
            "output": "out.mp4",
            "tts": {
                "server_url": "http://127.0.0.1:8123",
                "reference_audio": "voice.wav",
                "reference_text": "voice.txt"
            },
            "scenes": [{
                "id": "intro",
                "narration": {"text": "This is valid narration."},
                "visual": {"base_image": "image.jpg"},
                "animation": {"type": "zoom", "cx": 0.5, "cy": 0.5}
            }]
        }

    def test_valid_manifest(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = self.fixture(root)
            result = validate_manifest(data, root / "lesson.json", ROOT)
            self.assertEqual(result["lesson_id"], "test-lesson")

    def test_unknown_field_fails_closed(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = self.fixture(root)
            data["surprise"] = True
            with self.assertRaisesRegex(PipelineError, "unknown field"):
                validate_manifest(data, root / "lesson.json", ROOT)

    def test_animation_contract(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = self.fixture(root)
            data["scenes"][0]["animation"] = {
                "type": "camera_path", "waypoints": [[0.5, 0.5, 1.0]]
            }
            with self.assertRaisesRegex(PipelineError, "at least two"):
                validate_manifest(data, root / "lesson.json", ROOT)

    def test_visual_path_type_fails_cleanly(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = self.fixture(root)
            data["scenes"][0]["visual"]["base_image"] = 42
            with self.assertRaisesRegex(PipelineError, "must be a string"):
                validate_manifest(data, root / "lesson.json", ROOT)

    def test_edge_manifest_needs_no_fish_reference(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = self.fixture(root)
            data["tts"] = {"engine": "edge", "edge_voice": "en-US-GuyNeural"}
            result = validate_manifest(data, root / "lesson.json", ROOT)
            self.assertEqual(result["tts"]["engine"], "edge")

    def test_missing_generated_clip_can_be_deferred(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = self.fixture(root)
            data["clip_generation"] = {"provider": "ltx"}
            data["scenes"][0]["visual"]["clip"] = "future.mp4"
            data["scenes"][0]["animation"] = {
                "type": "ai_clip", "prompt": "Clouds drift slowly.",
                "duration": 10, "seed": 7
            }
            validate_manifest(data, root / "lesson.json", ROOT,
                              allow_missing_clips=True)
            with self.assertRaisesRegex(PipelineError, "does not exist"):
                validate_manifest(data, root / "lesson.json", ROOT)

    def test_creative_scene_contracts(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = self.fixture(root)
            data["scenes"][0].update({
                "visual": {
                    "base_image": "image.jpg",
                    "layers": [{"image": "image.jpg", "depth": 1.5,
                                "entrance": "rise"}]
                },
                "animation": {"type": "parallax", "background_zoom": 0.08},
                "beats": [{"type": "question", "at": 1.0,
                           "text": "What evidence supports the claim?"}],
                "audio": {"effects": [{"at": 1.0, "kind": "chime",
                                        "volume": 0.2}]},
                "transition": {"type": "slide", "direction": "left",
                               "duration": 0.3}
            })
            validate_manifest(data, root / "lesson.json", ROOT)

    def test_source_annotation_box_must_have_positive_area(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = self.fixture(root)
            data["scenes"][0]["animation"] = {
                "type": "source_analysis",
                "highlights": [{"box": [0.8, 0.2, 0.3, 0.6],
                                "label": "Invalid", "at": 1.0}]
            }
            with self.assertRaisesRegex(PipelineError, "positive area"):
                validate_manifest(data, root / "lesson.json", ROOT)

    def test_narration_cue_scales_to_actual_audio_duration(self):
        scene = {
            "id": "cue-test",
            "narration": {"text": "First idea. The evidence appears here. Final idea."},
            "visual": {},
            "animation": {"type": "title", "title": "Test"},
            "beats": [{"type": "label", "cue": "The evidence",
                       "text": "EVIDENCE"}]
        }
        resolved = resolve_scene_timing(scene, 20.0)
        expected = scene["narration"]["text"].index("The evidence") / len(scene["narration"]["text"]) * 20.0
        self.assertAlmostEqual(resolved["beats"][0]["at"], expected)

    def test_narration_cue_uses_word_boundary_when_available(self):
        scene = {
            "id": "cue-test",
            "narration": {"text": "First idea. The evidence appears here."},
            "visual": {}, "animation": {"type": "title"},
            "beats": [{"type": "label", "cue": "The evidence",
                       "text": "EVIDENCE"}]
        }
        boundaries = [
            {"text": "First", "offset": 0.1}, {"text": "idea", "offset": 0.5},
            {"text": "The", "offset": 2.25}, {"text": "evidence", "offset": 2.5}
        ]
        resolved = resolve_scene_timing(scene, 10.0, boundaries)
        self.assertEqual(resolved["beats"][0]["at"], 2.25)
        self.assertEqual(resolved["beats"][0]["timing_source"], "word_boundary")

    def test_text_collision_fails_before_render(self):
        with tempfile.TemporaryDirectory() as value:
            root = Path(value)
            data = self.fixture(root)
            Image.new("RGB", (320, 480), (60, 70, 80)).save(root / "image.jpg")
            data["tts"] = {"engine": "edge"}
            data["scenes"][0]["animation"] = {
                "type": "title", "title": "Central title"
            }
            data["scenes"][0]["beats"] = [{
                "type": "label", "at": 0, "duration": 4,
                "text": "Conflicting label", "x": 0.5, "y": 0.5
            }]
            with self.assertRaisesRegex(PipelineError, "text layout validation failed"):
                validate_text_layout(data, root / "lesson.json", ROOT)


if __name__ == "__main__":
    unittest.main()
