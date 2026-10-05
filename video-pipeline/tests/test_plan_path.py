"""Scene-plan resolution: work/ copy wins, episode-root reviewed plan is the
fallback, missing is reported (not improvised around)."""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), os.pardir)))

from stages.plan_path import resolve_plan


def _ep(tmp, work_plan=None, root_plan=None):
    ep = os.path.join(tmp, "u1-e2")
    os.makedirs(os.path.join(ep, "work"), exist_ok=True)
    plan = {"version": 1, "episode": "u1-e2", "scenes": []}
    if work_plan:
        with open(os.path.join(ep, "work", "scene_plan.json"), "w") as f:
            json.dump(plan, f)
    if root_plan:
        with open(os.path.join(ep, "scene_plan.json"), "w") as f:
            json.dump(plan, f)
    return ep


class TestResolvePlan(unittest.TestCase):
    def test_work_wins(self):
        with tempfile.TemporaryDirectory() as tmp:
            ep = _ep(tmp, work_plan=True, root_plan=True)
            path, source = resolve_plan(ep)
            self.assertEqual(source, "work")
            self.assertTrue(path.endswith(os.path.join("work", "scene_plan.json")))

    def test_episode_root_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            ep = _ep(tmp, root_plan=True)
            path, source = resolve_plan(ep)
            self.assertEqual(source, "episode-root")
            self.assertEqual(path, os.path.join(ep, "scene_plan.json"))

    def test_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            ep = _ep(tmp)
            _, source = resolve_plan(ep)
            self.assertEqual(source, "missing")


if __name__ == "__main__":
    unittest.main()


class TestValidateDurations(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, os.path.normpath(os.path.join(
            os.path.dirname(os.path.abspath(__file__)), os.pardir)))
        from stages.direct import _validate_plan_durations, _load_recipe
        self.validate = _validate_plan_durations
        self.load_recipe = _load_recipe

    def _turns(self, durs):
        return [{"duration_sec": d} for d in durs]

    def _plan(self, scenes):
        # scenes: [(id, lo, hi, dur)]
        return {"version": 1,
                "scenes": [{"id": sid, "turns": [lo, hi], "duration_sec": d}
                           for sid, lo, hi, d in scenes]}

    def test_zero_gap_raw_sums_pass(self):
        turns = self._turns([4.0, 5.0, 6.0])
        plan = self._plan([("a", 0, 1, 9.0), ("b", 2, 2, 6.0)])
        self.validate(plan, turns, {"gap": 0, "offset": 0, "tail": 0})

    def test_gap_aware_pass(self):
        # 1.8 offset, 0.6 gap, 4.5 tail (the Act-1 recipe)
        turns = self._turns([4.0, 5.0, 6.0])
        plan = self._plan([
            ("a", 0, 1, 1.8 + (4.0 + 0.6) + (5.0 + 0.6)),   # offset + Σ(dur+gap)
            ("b", 2, 2, (6.0 + 0.6) + 4.5),                # Σ(dur+gap) + tail
        ])
        self.validate(plan, turns, {"gap": 0.6, "offset": 1.8, "tail": 4.5})

    def test_gap_aware_rejects_raw_sums(self):
        # raw sums are WRONG under a gap recipe — must reject, not accept
        turns = self._turns([4.0, 5.0, 6.0])
        plan = self._plan([("a", 0, 1, 9.0), ("b", 2, 2, 6.0)])
        with self.assertRaises(RuntimeError):
            self.validate(plan, turns, {"gap": 0.6, "offset": 1.8, "tail": 4.5})

    def test_one_frame_tolerance(self):
        turns = self._turns([4.0])
        plan = self._plan([("a", 0, 0, 4.0 + 1 / 30 - 0.001)])
        self.validate(plan, turns, {"gap": 0, "offset": 0, "tail": 0})
        bad = self._plan([("a", 0, 0, 4.0 + 1 / 30 + 0.001)])
        with self.assertRaises(RuntimeError):
            self.validate(bad, turns, {"gap": 0, "offset": 0, "tail": 0})

    def test_segments_still_checked(self):
        turns = self._turns([10.0])
        plan = {"version": 1, "scenes": [
            {"id": "a", "turns": [0, 0], "duration_sec": 10.0,
             "segments": [{"duration_sec": 4.0}, {"duration_sec": 5.0}]}]}
        with self.assertRaises(RuntimeError):
            self.validate(plan, turns, {"gap": 0, "offset": 0, "tail": 0})

    def test_load_recipe_defaults_and_values(self):
        with tempfile.TemporaryDirectory() as tmp:
            ep = os.path.join(tmp, "ep")
            os.makedirs(os.path.join(ep, "work"))
            r = self.load_recipe(ep)
            self.assertEqual(r, {"gap": 0.0, "offset": 0.0, "tail": 0.0})
            with open(os.path.join(ep, "work", "timings.json"), "w") as f:
                json.dump({"gap": 0.6, "offset": 1.8, "tail": 4.5,
                           "turns": []}, f)
            r = self.load_recipe(ep)
            self.assertEqual(r, {"gap": 0.6, "offset": 1.8, "tail": 4.5})
