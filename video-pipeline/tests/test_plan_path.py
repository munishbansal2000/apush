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
