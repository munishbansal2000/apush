import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "video_pipeline"))

from pipeline.common import PipelineError
from pipeline.curriculum import expand_curriculum


class CurriculumTests(unittest.TestCase):
    def fixture(self):
        return {
            "schema_version": 1,
            "course": {"id": "apush", "title": "APUSH"},
            "defaults": {
                "tts": {"engine": "edge", "edge_voice": "en-US-GuyNeural"},
                "presentation": {"audience": "AP students", "captions": True}
            },
            "units": [{
                "unit_id": "unit-1",
                "title": "Unit 1",
                "period": "Period 1",
                "themes": ["Geography and the Environment"],
                "chapters": [{
                    "chapter_id": "u1-ch1",
                    "title": "Chapter 1",
                    "essential_questions": ["How did environments shape societies?"],
                    "lessons": [{
                        "lesson_id": "u1-ch1-l1",
                        "title": "Lesson 1",
                        "output": "lesson.mp4",
                        "scenes": [{
                            "id": "hook",
                            "purpose": "hook",
                            "narration": {"text": "This narration is long enough."},
                            "visual": {},
                            "animation": {"type": "title", "title": "A title"}
                        }]
                    }]
                }]
            }]
        }

    def test_expands_inherited_defaults_and_alignment(self):
        with tempfile.TemporaryDirectory() as value:
            path = Path(value) / "curriculum.json"
            lessons = expand_curriculum(self.fixture(), path, ROOT)
            self.assertEqual(len(lessons), 1)
            lesson = lessons[0]
            self.assertEqual(lesson["course_id"], "apush")
            self.assertEqual(lesson["unit_id"], "unit-1")
            self.assertEqual(lesson["chapter_id"], "u1-ch1")
            self.assertEqual(lesson["tts"]["engine"], "edge")
            self.assertEqual(lesson["essential_question"], "How did environments shape societies?")
            self.assertEqual(lesson["ap_alignment"]["period"], "Period 1")
            self.assertEqual(lesson["ap_alignment"]["themes"], ["Geography and the Environment"])

    def test_unknown_hierarchy_field_fails_closed(self):
        with tempfile.TemporaryDirectory() as value:
            data = self.fixture()
            data["units"][0]["surprise"] = True
            with self.assertRaisesRegex(PipelineError, "unknown field"):
                expand_curriculum(data, Path(value) / "curriculum.json", ROOT)

    def test_duplicate_lesson_ids_are_rejected(self):
        with tempfile.TemporaryDirectory() as value:
            data = self.fixture()
            lesson = data["units"][0]["chapters"][0]["lessons"][0]
            data["units"][0]["chapters"][0]["lessons"].append(dict(lesson))
            with self.assertRaisesRegex(PipelineError, "duplicate curriculum lesson_id"):
                expand_curriculum(data, Path(value) / "curriculum.json", ROOT)


if __name__ == "__main__":
    unittest.main()
