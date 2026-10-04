"""Tests for pipeline.gates (hard quality gates)."""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "video_pipeline"))

from pipeline.common import PipelineError
from pipeline import gates
from pipeline.gates import (
    animation_consistency,
    beat_timing,
    cue_integrity,
    iter_cues,
    lesson_shape,
    license_gate,
    lo_traceability,
    narration_length,
    prompt_subject_coherence,
    run_all_gates,
    spec_parity,
    supplements_present,
    text_quantity,
    tts_text,
    variety,
    visual_asset_reuse,
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
          animation=None, beats=(), audio=None, visual=None, transition=None,
          covers_los=None, purpose=None):
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
    if covers_los is not None:
        out["covers_los"] = covers_los
    if purpose is not None:
        out["purpose"] = purpose
    return out


def lesson(scenes, lesson_id="test-lesson", presentation=None):
    manifest = {"lesson_id": lesson_id, "title": "Test lesson",
                "learning_objectives": ["First objective.", "Second objective."],
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
        # Cue-timed timeline events are first-class timing sources.
        wheres = [w for w, _ in iter_cues(sc)]
        self.assertEqual(wheres, ["beats[0].cue", "audio.effects[0].cue",
                                  "animation.events[0].cue"])


class AnimationConsistencyTests(unittest.TestCase):
    def test_raw_semantic_bounding_boxes_are_prohibited(self):
        sc = scene(animation={"type": "source_analysis", "highlights": [{
            "box": [0.1, 0.2, 0.8, 0.9], "label": "Guessed subject",
            "cue": "plain narration",
        }]})
        with self.assertRaisesRegex(PipelineError, "bounding boxes are prohibited"):
            animation_consistency(lesson([sc]))

    def test_timeline_cannot_repeat_labels_as_beats(self):
        sc = scene(
            narration="Day one begins. Day three follows.",
            animation={"type": "timeline", "events": [
                {"label": "DAY ONE", "caption": "Claim", "cue": "Day one"},
                {"label": "DAY THREE", "caption": "Reply", "cue": "Day three"},
            ]},
            beats=[{"type": "label", "text": "DAY ONE", "cue": "Day one"}],
        )
        with self.assertRaisesRegex(PipelineError, "one visual owner"):
            animation_consistency(lesson([sc]))

    def test_timeline_cues_must_follow_narration_order(self):
        sc = scene(
            narration="First claim. Second claim.",
            animation={"type": "timeline", "events": [
                {"label": "SECOND", "caption": "Later", "cue": "Second claim"},
                {"label": "FIRST", "caption": "Earlier", "cue": "First claim"},
            ]},
        )
        with self.assertRaisesRegex(PipelineError, "narration order"):
            animation_consistency(lesson([sc]))

    def test_moving_annotation_uses_stable_frame_by_default(self):
        sc = scene(animation={"type": "camera_path"})
        sc.update({"device": "annotate", "device_params": {"annotations": [
            {"type": "circle", "label": "Evidence", "cue": "plain narration",
             "x": 0.4, "y": 0.5}
        ]}})
        animation_consistency(lesson([sc]))

    def test_moving_annotation_cannot_disable_freeze(self):
        sc = scene(animation={"type": "zoom"})
        sc.update({"device": "annotate", "device_params": {
            "freeze_frame": False, "annotations": [
                {"type": "circle", "label": "Evidence", "cue": "plain narration",
                 "x": 0.4, "y": 0.5}
            ]}})
        with self.assertRaisesRegex(PipelineError, "cannot track"):
            animation_consistency(lesson([sc]))


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

    def test_music_claim_passes_with_lesson_bed(self):
        value = lesson([scene()], presentation={"music": "bed"})
        value["music"] = {"background": "music/bed.mp3"}
        spec_parity(value)  # no raise

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


class VisualAssetReuseTests(unittest.TestCase):
    def test_two_uses_allow_a_deliberate_callback(self):
        scenes = [
            scene(sid="a", visual={"base_image": "shared.webp"}),
            scene(sid="b", visual={"secondary_image": "shared.webp"}),
        ]
        visual_asset_reuse(lesson(scenes))

    def test_third_use_fails(self):
        scenes = [
            scene(sid="a", visual={"base_image": "shared.webp"}),
            scene(sid="b", visual={"secondary_image": "shared.webp"}),
            scene(sid="c", visual={"base_image": "shared.webp"}),
        ]
        with self.assertRaisesRegex(PipelineError, "more than two scene slots"):
            visual_asset_reuse(lesson(scenes))


class LoTraceabilityTests(unittest.TestCase):
    def test_missing_objectives_fails(self):
        manifest = lesson([scene(covers_los=[1])])
        del manifest["learning_objectives"]
        with self.assertRaisesRegex(PipelineError, "learning_objectives.*missing or empty"):
            lo_traceability(manifest)

    def test_uncovered_objective_fails(self):
        with self.assertRaisesRegex(PipelineError, "covered by no scene"):
            lo_traceability(lesson([scene(covers_los=[1])]))

    def test_invalid_lo_index_fails(self):
        with self.assertRaisesRegex(PipelineError, "not a valid.*LO index"):
            lo_traceability(lesson([scene(covers_los=[1, 3])]))

    def test_fully_covered_passes(self):
        lo_traceability(lesson([scene(sid="a", covers_los=[1]),
                                scene(sid="b", covers_los=[2])]))  # no raise


class LessonShapeTests(unittest.TestCase):
    def _shaped(self):
        return lesson([
            scene(sid="a", purpose="hook"),
            scene(sid="b", animation={"type": "objectives"}),
            scene(sid="c", purpose="close"),
        ])

    def test_good_shape_passes(self):
        lesson_shape(self._shaped())  # no raise

    def test_first_scene_must_be_hook(self):
        m = self._shaped()
        del m["scenes"][0]["purpose"]
        with self.assertRaisesRegex(PipelineError, "first scene must be the hook"):
            lesson_shape(m)

    def test_objectives_slide_required(self):
        m = self._shaped()
        m["scenes"][1]["animation"] = {"type": "ken_burns"}
        with self.assertRaisesRegex(PipelineError, "no objectives slide"):
            lesson_shape(m)

    def test_objectives_must_follow_hook(self):
        m = self._shaped()
        m["scenes"].insert(1, scene(sid="x", purpose="context"))
        with self.assertRaisesRegex(PipelineError, "immediately after the hook"):
            lesson_shape(m)

    def test_last_scene_must_land(self):
        m = self._shaped()
        m["scenes"][-1]["purpose"] = "evidence"
        with self.assertRaisesRegex(PipelineError, "must land the lesson"):
            lesson_shape(m)


class BeatTimingTests(unittest.TestCase):
    def test_beat_longer_than_scene_fails(self):
        sc = scene(narration="[beat] Short words here.",
                   beats=[{"type": "label", "cue": "Short",
                            "text": "TOO LONG", "duration": 30}])
        with self.assertRaisesRegex(PipelineError, "exceeds.*scene duration"):
            beat_timing(lesson([sc]))

    def test_fitting_beat_passes(self):
        sc = scene(narration="[beat] Short words here.",
                   beats=[{"type": "label", "cue": "Short",
                            "text": "OK", "duration": 2}])
        beat_timing(lesson([sc]))  # no raise


class NarrationLengthTests(unittest.TestCase):
    def test_too_short_fails(self):
        with self.assertRaisesRegex(PipelineError, r"\(<400\)"):
            narration_length(lesson([scene()]))

    def test_in_range_passes(self):
        long_text = "[beat] " + "word " * 450
        narration_length(lesson([scene(narration=long_text)]))  # no raise


class SupplementsPresentTests(unittest.TestCase):
    def test_missing_supplements_fail(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            mp = Path(tmp) / "lesson.json"
            with self.assertRaisesRegex(PipelineError, "missing shipped supplements"):
                supplements_present(lesson([]), mp, REPO)

    def test_present_supplements_pass(self):
        import tempfile
        manifest = lesson([])
        with tempfile.TemporaryDirectory() as tmp:
            mp = Path(tmp) / "lesson.json"
            supp = Path(tmp) / "supplements"
            supp.mkdir()
            for name in (f"{manifest['lesson_id']}-transcript.txt",
                         f"{manifest['lesson_id']}-transcript.srt",
                         f"{manifest['lesson_id']}-retrieval-check.md",
                         f"{manifest['lesson_id']}-exam-card.md"):
                (supp / name).write_text("ok")
            supplements_present(manifest, mp, REPO)  # no raise


class RunAllGatesTests(unittest.TestCase):
    def manifest_path(self):
        return CURRICULA_DIR / "test-curriculum.json"

    def _long_narration(self, seed):
        # 150 words, TTS-safe, with a direction tag.
        return "[beat] " + " ".join(f"word{seed}{i}" for i in range(150)) + "."

    def test_fully_compliant_lesson_passes(self):
        import tempfile
        scenes = [
            scene(sid="a", narration=self._long_narration("a"),
                  animation={"type": "title", "title": "Opening"},
                  beats=[{"type": "label", "cue": "worda0", "text": "OK",
                           "duration": 4}],
                  transition={"type": "dip_to_black"},
                  covers_los=[1], purpose="hook"),
            scene(sid="b", narration=self._long_narration("b"),
                  animation={"type": "objectives"},
                  transition={"type": "crossfade"}),
            scene(sid="c", narration=self._long_narration("c"),
                  animation={"type": "bullets", "bullets": ["one", "two"]},
                  transition={"type": "slide"},
                  covers_los=[2], purpose="close"),
        ]
        manifest = lesson(scenes)
        with tempfile.TemporaryDirectory() as tmp:
            mp = Path(tmp) / "lesson.json"
            supp = Path(tmp) / "supplements"
            supp.mkdir()
            for name in (f"{manifest['lesson_id']}-transcript.txt",
                         f"{manifest['lesson_id']}-transcript.srt",
                         f"{manifest['lesson_id']}-retrieval-check.md",
                         f"{manifest['lesson_id']}-exam-card.md"):
                (supp / name).write_text("ok")
            run_all_gates(manifest, mp, REPO)  # no raise

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
