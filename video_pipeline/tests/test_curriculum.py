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
                "presentation": {"audience": "AP students"}
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
                        "learning_objectives": ["First objective.", "Second objective."],
                        "scenes": [
                            {
                                "id": "hook",
                                "purpose": "hook",
                                "narration": {"text": "This narration is [beat] long enough. pad0 pad1 pad2 pad3 pad4 pad5 pad6 pad7 pad8 pad9 pad10 pad11 pad12 pad13 pad14 pad15 pad16 pad17 pad18 pad19 pad20 pad21 pad22 pad23 pad24 pad25 pad26 pad27 pad28 pad29 pad30 pad31 pad32 pad33 pad34 pad35 pad36 pad37 pad38 pad39 pad40 pad41 pad42 pad43 pad44 pad45 pad46 pad47 pad48 pad49 pad50 pad51 pad52 pad53 pad54 pad55 pad56 pad57 pad58 pad59 pad60 pad61 pad62 pad63 pad64 pad65 pad66 pad67 pad68 pad69 pad70 pad71 pad72 pad73 pad74 pad75 pad76 pad77 pad78 pad79 pad80 pad81 pad82 pad83 pad84 pad85 pad86 pad87 pad88 pad89 pad90 pad91 pad92 pad93 pad94 pad95 pad96 pad97 pad98 pad99 pad100 pad101 pad102 pad103 pad104 pad105 pad106 pad107 pad108 pad109 pad110 pad111 pad112 pad113"},
                                "visual": {},
                                "animation": {"type": "title", "title": "A title"},
                                "beats": [{"type": "label", "cue": "long enough",
                                           "text": "OK"}],
                                "transition": {"type": "dip_to_black", "duration": 0.25}
                            },
                            {
                                "id": "objectives",
                                "purpose": "context",
                                "narration": {"text": "By the end you will [beat] know two things. pad0 pad1 pad2 pad3 pad4 pad5 pad6 pad7 pad8 pad9 pad10 pad11 pad12 pad13 pad14 pad15 pad16 pad17 pad18 pad19 pad20 pad21 pad22 pad23 pad24 pad25 pad26 pad27 pad28 pad29 pad30 pad31 pad32 pad33 pad34 pad35 pad36 pad37 pad38 pad39 pad40 pad41 pad42 pad43 pad44 pad45 pad46 pad47 pad48 pad49 pad50 pad51 pad52 pad53 pad54 pad55 pad56 pad57 pad58 pad59 pad60 pad61 pad62 pad63 pad64 pad65 pad66 pad67 pad68 pad69 pad70 pad71 pad72 pad73 pad74 pad75 pad76 pad77 pad78 pad79 pad80 pad81 pad82 pad83 pad84 pad85 pad86 pad87 pad88 pad89 pad90 pad91 pad92 pad93 pad94 pad95 pad96 pad97 pad98 pad99 pad100 pad101 pad102 pad103 pad104 pad105 pad106 pad107 pad108 pad109 pad110"},
                                "visual": {},
                                "animation": {"type": "objectives"},
                                "transition": {"type": "crossfade", "duration": 0.25}
                            },
                            {
                                "id": "evidence",
                                "purpose": "evidence",
                                "narration": {"text": "A second narration with [emphasis]plain words[/emphasis]. pad0 pad1 pad2 pad3 pad4 pad5 pad6 pad7 pad8 pad9 pad10 pad11 pad12 pad13 pad14 pad15 pad16 pad17 pad18 pad19 pad20 pad21 pad22 pad23 pad24 pad25 pad26 pad27 pad28 pad29 pad30 pad31 pad32 pad33 pad34 pad35 pad36 pad37 pad38 pad39 pad40 pad41 pad42 pad43 pad44 pad45 pad46 pad47 pad48 pad49 pad50 pad51 pad52 pad53 pad54 pad55 pad56 pad57 pad58 pad59 pad60 pad61 pad62 pad63 pad64 pad65 pad66 pad67 pad68 pad69 pad70 pad71 pad72 pad73 pad74 pad75 pad76 pad77 pad78 pad79 pad80 pad81 pad82 pad83 pad84 pad85 pad86 pad87 pad88 pad89 pad90 pad91 pad92 pad93 pad94 pad95 pad96 pad97 pad98 pad99 pad100 pad101 pad102 pad103 pad104 pad105 pad106 pad107 pad108 pad109 pad110 pad111 pad112 pad113"},
                                "visual": {},
                                "animation": {"type": "bullets",
                                              "bullets": ["first point", "second point"]},
                                "covers_los": [1],
                                "transition": {"type": "crossfade", "duration": 0.25}
                            },
                            {
                                "id": "close",
                                "purpose": "close",
                                "narration": {"text": "A third narration with plain words. [beat] pad0 pad1 pad2 pad3 pad4 pad5 pad6 pad7 pad8 pad9 pad10 pad11 pad12 pad13 pad14 pad15 pad16 pad17 pad18 pad19 pad20 pad21 pad22 pad23 pad24 pad25 pad26 pad27 pad28 pad29 pad30 pad31 pad32 pad33 pad34 pad35 pad36 pad37 pad38 pad39 pad40 pad41 pad42 pad43 pad44 pad45 pad46 pad47 pad48 pad49 pad50 pad51 pad52 pad53 pad54 pad55 pad56 pad57 pad58 pad59 pad60 pad61 pad62 pad63 pad64 pad65 pad66 pad67 pad68 pad69 pad70 pad71 pad72 pad73 pad74 pad75 pad76 pad77 pad78 pad79 pad80 pad81 pad82 pad83 pad84 pad85 pad86 pad87 pad88 pad89 pad90 pad91 pad92 pad93 pad94 pad95 pad96 pad97 pad98 pad99 pad100 pad101 pad102 pad103 pad104 pad105 pad106 pad107 pad108 pad109 pad110 pad111 pad112"},
                                "visual": {},
                                "animation": {"type": "typewriter", "text": "Closing words."},
                                "covers_los": [2],
                                "transition": {"type": "slide", "duration": 0.25}
                            }
                        ]
                    }]
                }]
            }]
        }

    def _write_supplements(self, value):
        supp = Path(value) / "supplements"
        supp.mkdir(exist_ok=True)
        for name in ("u1-ch1-l1-transcript.txt", "u1-ch1-l1-transcript.srt",
                     "u1-ch1-l1-retrieval-check.md", "u1-ch1-l1-exam-card.md"):
            (supp / name).write_text("ok")

    def test_expands_inherited_defaults_and_alignment(self):
        with tempfile.TemporaryDirectory() as value:
            self._write_supplements(value)
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
            self._write_supplements(value)
            data = self.fixture()
            lesson = data["units"][0]["chapters"][0]["lessons"][0]
            data["units"][0]["chapters"][0]["lessons"].append(dict(lesson))
            with self.assertRaisesRegex(PipelineError, "duplicate curriculum lesson_id"):
                expand_curriculum(data, Path(value) / "curriculum.json", ROOT)


if __name__ == "__main__":
    unittest.main()
