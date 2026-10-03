#!/usr/bin/env python3
"""Unit tests for video/build_lesson.py orchestration logic.

Covers: step ordering, the skip/only flag matrix, voice-ref auto-discovery
(including the missing-ref error message), and ai_clip manifest parsing.
Nothing here touches the GPU, fish-speech, or LTX -- those steps are wired
but only ever executed on the 5090.
"""
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import build_lesson as bl


def ns(**kw):
    """Fake argparse namespace with build_lesson defaults."""
    d = dict(lesson="vid-x", preview=False, skip_tts=False,
             skip_ai_clips=False, regen_clips=False, only=None,
             ref_dir="/ref", voice=[], out=None)
    d.update(kw)
    return type("Args", (), d)()


class PlanStepsTest(unittest.TestCase):
    def test_full_run_order(self):
        self.assertEqual(bl.plan_steps(ns()),
                         ["tts", "clips", "video", "validate"])

    def test_skip_tts(self):
        self.assertEqual(bl.plan_steps(ns(skip_tts=True)),
                         ["clips", "video", "validate"])

    def test_skip_clips(self):
        self.assertEqual(bl.plan_steps(ns(skip_ai_clips=True)),
                         ["tts", "video", "validate"])

    def test_skip_both(self):
        self.assertEqual(bl.plan_steps(ns(skip_tts=True, skip_ai_clips=True)),
                         ["video", "validate"])

    def test_only_each(self):
        for step in bl.STEPS:
            self.assertEqual(bl.plan_steps(ns(only=step)), [step])

    def test_only_ignores_skips(self):
        # --only video runs video even with skips set: skips are irrelevant
        self.assertEqual(
            bl.plan_steps(ns(only="video", skip_tts=True, skip_ai_clips=True)),
            ["video"])


class DiscoverVoicesTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.ref = os.path.join(self.tmp, "ref")
        os.makedirs(self.ref)
        self.narr = os.path.join(self.tmp, "narration.json")

    def write(self, name, content="x"):
        p = os.path.join(self.ref, name)
        with open(p, "w") as f:
            f.write(content)
        return p

    def write_narration(self, voices):
        segs = [{"key": f"k{i}", "voice": v, "text": "hello"}
                for i, v in enumerate(voices)]
        with open(self.narr, "w") as f:
            json.dump(segs, f)

    def test_narrator_only(self):
        self.write("narrator_energetic.wav")
        self.write("narrator_energetic.txt")
        self.write_narration(["narrator", "narrator"])
        na, nt, specs = bl.discover_voices(self.narr, self.ref, [])
        self.assertTrue(na.endswith("narrator_energetic.wav"))
        self.assertTrue(nt.endswith("narrator_energetic.txt"))
        self.assertEqual(specs, [])

    def test_extra_voices_discovered(self):
        self.write("narrator_energetic.wav")
        self.write("narrator_energetic.txt")
        self.write("columbus.wav")
        self.write("columbus.txt")
        self.write_narration(["narrator", "columbus"])
        _na, _nt, specs = bl.discover_voices(self.narr, self.ref, [])
        self.assertEqual([n for n, _a, _t in specs], ["columbus"])

    def test_missing_voice_ref_error_names_files(self):
        self.write("narrator_energetic.wav")
        self.write("narrator_energetic.txt")
        self.write_narration(["narrator", "diaz"])
        with self.assertRaises(bl.LessonError) as cm:
            bl.discover_voices(self.narr, self.ref, [])
        msg = str(cm.exception)
        self.assertIn("diaz", msg)
        self.assertIn(os.path.join(self.ref, "diaz.wav"), msg)
        self.assertIn(os.path.join(self.ref, "diaz.txt"), msg)
        self.assertIn("--voice", msg)

    def test_missing_narrator_ref_errors(self):
        self.write_narration(["narrator"])
        with self.assertRaises(bl.LessonError) as cm:
            bl.discover_voices(self.narr, self.ref, [])
        self.assertIn("narrator_energetic.wav", str(cm.exception))

    def test_voice_override_wins(self):
        self.write("narrator_energetic.wav")
        self.write("narrator_energetic.txt")
        self.write("columbus.wav")
        self.write("columbus.txt")
        alt_a = self.write("alt.wav")
        alt_t = self.write("alt.txt")
        self.write_narration(["narrator", "columbus"])
        _na, _nt, specs = bl.discover_voices(
            self.narr, self.ref, [f"columbus={alt_a}:{alt_t}"])
        self.assertEqual(specs, [("columbus", alt_a, alt_t)])

    def test_voice_override_adds_new_voice(self):
        self.write("narrator_energetic.wav")
        self.write("narrator_energetic.txt")
        new_a = self.write("new.wav")
        new_t = self.write("new.txt")
        self.write_narration(["narrator"])
        _na, _nt, specs = bl.discover_voices(
            self.narr, self.ref, [f"newvoice={new_a}:{new_t}"])
        self.assertEqual(specs, [("newvoice", new_a, new_t)])


class AiClipJobsTest(unittest.TestCase):
    def manifest(self, ai_clips):
        fd, p = tempfile.mkstemp(suffix=".json")
        with os.fdopen(fd, "w") as f:
            json.dump({"ai_clips": ai_clips}, f)
        self.addCleanup(os.remove, p)
        return p

    def test_jobs_parsed(self):
        p = self.manifest({"beat2": {"image": "a.jpg", "prompt": "water flows",
                                     "seed": 42, "clip": "video/ai_clips/x.mp4",
                                     "duration": 4}})
        jobs = bl.ai_clip_jobs(p)
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["seed"], 42)
        self.assertEqual(jobs[0]["duration"], 4)

    def test_duration_defaults_to_5(self):
        p = self.manifest({"b": {"image": "a.jpg", "prompt": "mist drifts",
                                  "seed": 7, "clip": "c.mp4"}})
        self.assertEqual(bl.ai_clip_jobs(p)[0]["duration"], 5)

    def test_no_ai_clips_section_ok(self):
        fd, p = tempfile.mkstemp(suffix=".json")
        with os.fdopen(fd, "w") as f:
            json.dump({}, f)
        self.addCleanup(os.remove, p)
        self.assertEqual(bl.ai_clip_jobs(p), [])

    def test_missing_seed_fails_fast(self):
        p = self.manifest({"b": {"image": "a.jpg", "prompt": "mist drifts",
                                  "clip": "c.mp4"}})
        with self.assertRaises(bl.LessonError) as cm:
            bl.ai_clip_jobs(p)
        self.assertIn("seed", str(cm.exception))

    def test_missing_field_fails_fast(self):
        p = self.manifest({"b": {"image": "a.jpg", "seed": 1, "clip": "c.mp4"}})
        with self.assertRaises(bl.LessonError) as cm:
            bl.ai_clip_jobs(p)
        self.assertIn("prompt", str(cm.exception))


class StepValidateEnvTest(unittest.TestCase):
    def test_out_sets_build_lesson_mp4(self):
        import subprocess
        from unittest import mock
        args = ns(out="/tmp/x.mp4", lesson="vid-x")
        paths = {"manifest": "/m.json"}
        fake = mock.Mock(returncode=0, stdout="ALL GATES GREEN\n", stderr="")
        with mock.patch.object(subprocess, "run", return_value=fake) as mr:
            bl.step_validate(args, paths)
        _cmd, kwargs = mr.call_args[0][0], mr.call_args[1]
        self.assertEqual(kwargs["env"]["BUILD_LESSON_MP4"], "/tmp/x.mp4")

    def test_no_out_no_env_override(self):
        import subprocess
        from unittest import mock
        args = ns(out=None, lesson="vid-x")
        paths = {"manifest": "/m.json"}
        fake = mock.Mock(returncode=0, stdout="ALL GATES GREEN\n", stderr="")
        with mock.patch.object(subprocess, "run", return_value=fake) as mr:
            with mock.patch.dict("os.environ", {}, clear=False):
                os.environ.pop("BUILD_LESSON_MP4", None)
                bl.step_validate(args, paths)
        _cmd, kwargs = mr.call_args[0][0], mr.call_args[1]
        self.assertNotIn("BUILD_LESSON_MP4", kwargs["env"])


if __name__ == "__main__":
    unittest.main()
