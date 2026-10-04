"""Tests for pipeline.gates (hard quality gates)."""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "video_pipeline"))

from pipeline.common import PipelineError
from pipeline import gates
from pipeline.gates import (
    cue_integrity,
    iter_cues,
    license_gate,
    prompt_subject_coherence,
    run_all_gates,
    spec_parity,
    text_quantity,
    tts_text,
    variety,
)
from pipeline.timing import _boundary_offset

CURRICULA_DIR = ROOT / "video_pipeline" / "curricula"
REPO = ROOT

OLD_L10_PROMPT = (
    "A still archival document resting under steady light. Dust drifts slowly "
    "across the page; soft light shimmer moves over the surface; faint "
    "reflections shift at the edges; a light breeze stirs nothing beyond the "
    "paper. The document stays unchanged and the frame holds steady. "
    "Do not add people or text or modern objects."
)
NEW_L10_PROMPT = (
    "A historical painting of a landing party on a tropical shore. Clouds drift "
    "slowly across the sky; tree leaves stir in a light breeze; water shimmers "
    "along the shoreline; dust drifts over the sand; the banner fabric ripples "
    "faintly in the wind. The painted scene stays unchanged and the frame "
    "holds steady. Do not add people or text or modern objects."
)
FIXED_L10_PROMPT = NEW_L10_PROMPT.replace(
    "a landing party", "Columbus's landing party", 1)


def scene(sid="s1", narration="A plain narration with [beat] simple words.",
          animation=None, beats=(), audio=None, visual=None, transition=None):
    out = {
        "id": sid,
        "narration": {"text": narration},
        "visual": visual or {},
        "animation": animation or {"type": "ken_burns"},
        "beats": list(beats),
    }
    if audio is not None:
        out["audio"] = audio
    if transition is not None:
        out["transition"] = transition
    return out


def lesson(scenes, lesson_id="test-lesson", presentation=None):
    manifest = {"lesson_id": lesson_id, "title": "Test lesson",
                "scenes": list(scenes)}
    if presentation is not None:
        manifest["presentation"] = presentation
    return manifest


def ai_clip_scene(prompt, image="saq-set-19-q3.jpg"):
    return scene(
        sid="clip-scene",
        narration="A narration about the landing and its aftermath.",
        visual={"base_image": f"../../assets/images/u1/{image}"},
        animation={"type": "ai_clip", "prompt": prompt, "duration": 8,
                   "provider": "meta-ui", "fallback_provider": "ltx"},
    )


class CueIntegrityTests(unittest.TestCase):
    def test_verbatim_cue_passes(self):
        sc = scene(beats=[{"type": "label", "cue": "plain narration",
                           "text": "OK"}])
        cue_integrity(lesson([sc]))  # no raise

    def test_audio_and_animation_cues_checked(self):
        sc = scene(
            narration="The silver crossed the ocean in great ships.",
            audio={"effects": [{"cue": "crossed the ocean", "kind": "whoosh"}]},
            animation={"type": "map", "moves": [
                {"cue": "great ships", "path": "a-b"}]},
        )
        cue_integrity(lesson([sc]))  # no raise

    def test_missing_cue_fails(self):
        sc = scene(beats=[{"type": "label", "cue": "words that never appear",
                           "text": "BAD"}])
        with self.assertRaisesRegex(PipelineError, "not a substring"):
            cue_integrity(lesson([sc]))

    def test_iter_cues_collects_all_sources(self):
        sc = scene(
            narration="Alpha beta gamma delta.",
            beats=[{"type": "label", "cue": "alpha"}],
            audio={"effects": [{"cue": "beta", "kind": "tick"}]},
            animation={"type": "timeline",
                       "events": [{"cue": "gamma", "label": "x"}]},
        )
        # 'events' is not a cue-bearing field; only beats + audio expected
        wheres = [w for w, _ in iter_cues(sc)]
        self.assertEqual(wheres, ["beats[0].cue", "audio.effects[0].cue"])


class TtsTextTests(unittest.TestCase):
    def test_plain_narration_passes(self):
        tts_text(lesson([scene()]))

    def test_em_dash_fails(self):
        sc = scene(narration="Columbus was wrong \u2014 his math shrank.")
        with self.assertRaisesRegex(PipelineError, "em dash"):
            tts_text(lesson([sc]))

    def test_en_dash_and_curly_quotes_fail(self):
        for text, hint in [("years 1491\u20131507", "en dash"),
                           ("\u201cquoted\u201d words", "double quote"),
                           ("it\u2019s here", "single quote"),
                           ("and then\u2026", "ellipsis")]:
            with self.assertRaisesRegex(PipelineError, hint):
                tts_text(lesson([scene(narration=text)]))

    def test_all_caps_acronym_fails(self):
        sc = scene(narration="Answer the SAQs carefully.")
        with self.assertRaisesRegex(PipelineError, "SAQs"):
            tts_text(lesson([sc]))

    def test_hyphen_spaced_acronym_passes(self):
        sc = scene(narration="Answer the S-A-Qs carefully.")
        tts_text(lesson([sc]))  # no raise

    def test_allowlisted_caps_pass(self):
        sc = scene(narration="The AP exam covers US history.")
        tts_text(lesson([sc]))  # no raise


class TextQuantityTests(unittest.TestCase):
    def test_ok_text_passes(self):
        sc = scene(beats=[{"type": "label", "cue": "plain",
                           "text": "SHORT LABEL"}],
                   animation={"type": "bullets", "bullets": ["one", "two"]})
        text_quantity(lesson([sc]))  # no raise

    def test_long_beat_text_fails(self):
        sc = scene(beats=[{"type": "label", "cue": "plain",
                           "text": "one two three four five six seven eight nine"}])
        with self.assertRaisesRegex(PipelineError, "9 words"):
            text_quantity(lesson([sc]))

    def test_too_many_bullets_fails(self):
        sc = scene(animation={"type": "bullets",
                              "bullets": ["a", "b", "c", "d", "e"]})
        with self.assertRaisesRegex(PipelineError, "5 bullets"):
            text_quantity(lesson([sc]))

    def test_long_bullet_fails(self):
        long_bullet = " ".join(f"w{i}" for i in range(13))
        sc = scene(animation={"type": "bullets", "bullets": [long_bullet]})
        with self.assertRaisesRegex(PipelineError, "13 words"):
            text_quantity(lesson([sc]))


class LicenseGateTests(unittest.TestCase):
    def manifest_path(self):
        return CURRICULA_DIR / "test-curriculum.json"

    def test_pd_image_passes(self):
        sc = scene(visual={"base_image":
                           "../../assets/images/u1/saq-set-19-q3.jpg"})
        license_gate(lesson([sc]), self.manifest_path(), REPO)  # no raise

    def test_missing_catalog_entry_fails(self):
        sc = scene(visual={"base_image":
                           "../../assets/images/u1/no-such-image.jpg"})
        with self.assertRaisesRegex(PipelineError, "no CATALOG.json entry"):
            license_gate(lesson([sc]), self.manifest_path(), REPO)

    def test_scene_without_image_is_skipped(self):
        license_gate(lesson([scene()]), self.manifest_path(), REPO)  # no raise


class CoherenceGateTests(unittest.TestCase):
    def manifest_path(self):
        return CURRICULA_DIR / "test-curriculum.json"

    def test_old_document_prompt_fails_on_painting(self):
        sc = ai_clip_scene(OLD_L10_PROMPT)
        with self.assertRaisesRegex(PipelineError, "shares only 0 content"):
            prompt_subject_coherence(lesson([sc]), self.manifest_path(), REPO)

    def test_fixed_prompt_passes(self):
        sc = ai_clip_scene(FIXED_L10_PROMPT)
        prompt_subject_coherence(lesson([sc]), self.manifest_path(), REPO)  # no raise

    def test_non_clip_scenes_ignored(self):
        prompt_subject_coherence(lesson([scene()]),
                                 self.manifest_path(), REPO)  # no raise


class SpecParityTests(unittest.TestCase):
    def test_captions_claim_fails(self):
        with self.assertRaisesRegex(PipelineError, "caption renderer"):
            spec_parity(lesson([scene()], presentation={"captions": True}))

    def test_music_claim_requires_ambience(self):
        sc = scene(audio={"effects": []})
        with self.assertRaisesRegex(PipelineError, "audio.ambience"):
            spec_parity(lesson([sc], presentation={"music": "bed"}))

    def test_music_claim_passes_with_ambience(self):
        sc = scene(audio={"ambience": "music/bed.mp3"})
        spec_parity(lesson([sc], presentation={"music": "bed"}))  # no raise

    def test_no_claims_pass(self):
        spec_parity(lesson([scene()]))  # no raise


class VarietyTests(unittest.TestCase):
    def varied(self):
        return [
            scene(sid="a", animation={"type": "ken_burns"},
                  transition={"type": "dip_to_black"}),
            scene(sid="b", animation={"type": "bullets", "bullets": ["x"]},
                  transition={"type": "crossfade"}),
            scene(sid="c", animation={"type": "timeline", "events": []},
                  transition={"type": "slide"}),
        ]

    def test_varied_lesson_passes(self):
        variety(lesson(self.varied()))  # no raise

    def test_single_animation_type_fails(self):
        scenes = [scene(sid=f"s{i}", animation={"type": "ken_burns"},
                        transition={"type": t})
                  for i, t in enumerate(["dip_to_black", "crossfade", "slide"])]
        with self.assertRaisesRegex(PipelineError, "distinct animation"):
            variety(lesson(scenes))

    def test_three_consecutive_transitions_fail(self):
        scenes = [scene(sid=f"s{i}",
                        animation={"type": t},
                        transition={"type": "dip_to_black"})
                  for i, t in enumerate(["ken_burns", "bullets", "timeline"])]
        with self.assertRaisesRegex(PipelineError, "consecutive scenes"):
            variety(lesson(scenes))


class RunAllGatesTests(unittest.TestCase):
    def manifest_path(self):
        return CURRICULA_DIR / "test-curriculum.json"

    def test_fully_compliant_lesson_passes(self):
        scenes = [
            scene(sid="a", narration="First scene with [beat] simple words.",
                  animation={"type": "ken_burns"},
                  visual={"base_image":
                          "../../assets/images/u1/saq-set-19-q3.jpg"},
                  beats=[{"type": "label", "cue": "simple words", "text": "OK"}],
                  transition={"type": "dip_to_black"}),
            scene(sid="b", narration="Second scene with [beat] simple words.",
                  animation={"type": "bullets", "bullets": ["one", "two"]},
                  transition={"type": "crossfade"}),
            scene(sid="c", narration="Third scene with [beat] simple words.",
                  animation={"type": "timeline", "events": []},
                  transition={"type": "slide"}),
        ]
        run_all_gates(lesson(scenes), self.manifest_path(), REPO)  # no raise

    def test_first_violation_reported(self):
        sc = scene(narration="Bad \u2014 narration.")
        with self.assertRaises(PipelineError):
            run_all_gates(lesson([sc]), self.manifest_path(), REPO)


class BoundaryOffsetContractTests(unittest.TestCase):
    """Documents the word-boundary contract used by tts.render_scene's
    cue-resolution check (Edge path)."""

    def boundaries(self):
        return [
            {"text": "hello", "offset": 0.0, "duration": 0.2},
            {"text": "brave", "offset": 0.25, "duration": 0.2},
            {"text": "world", "offset": 0.5, "duration": 0.2},
        ]

    def test_matching_cue_resolves(self):
        self.assertEqual(
            _boundary_offset("brave world", self.boundaries()), 0.25)

    def test_missing_cue_returns_none(self):
        self.assertIsNone(_boundary_offset("missing words", self.boundaries()))

    def test_no_boundaries_returns_none(self):
        self.assertIsNone(_boundary_offset("hello", []))
        self.assertIsNone(_boundary_offset("hello", None))


if __name__ == "__main__":
    unittest.main()
