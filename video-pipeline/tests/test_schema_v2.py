"""Schema v2 (absolute start_sec, sub-turn splits) compiler support."""
import json
import os
import subprocess
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import compile_scene_plan as csp
import lint_plan


def _v2_plan():
    # Two scenes with a mid-turn-style boundary at 13.5s (the Cahokia
    # pivot shape): inexpressible in v1, the whole point of v2.
    return {
        "version": 2,
        "episode": "v2test",
        "scenes": [
            {"id": "scene-00", "slide": "DisplayHeadline",
             "params": {"headline": "Three boxes", "sub": "x"},
             "overlays": [{"type": "keywordpop", "word": "BOXES",
                           "start": 1.0, "duration": 2.0,
                           "position": "right"}],
             "start_sec": 0.0, "duration_sec": 13.5},
            {"id": "scene-01", "slide": "DisplayHeadline",
             "params": {"headline": "Cahokia", "sub": "x"},
             "overlays": [{"type": "keywordpop", "word": "CAHOKIA",
                           "start": 1.0, "duration": 2.0,
                           "position": "left"}],
             "start_sec": 13.5, "duration_sec": 6.6},
        ],
    }


def _write(tmp_path, plan):
    p = str(tmp_path / "plan.json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(plan, f)
    return p


def test_v2_contiguous_compiles_tiny(tmp_path):
    out = str(tmp_path / "v2.mp4")
    summary = csp.compile_scene_plan(
        _write(tmp_path, _v2_plan()), str(tmp_path), out,
        width=320, height=180, fps=10)
    assert summary["scenes"] == 2
    assert abs(summary["duration_sec"] - 20.1) < 0.05


def test_v2_gap_rejected():
    plan = _v2_plan()
    plan["scenes"][1]["start_sec"] = 14.0  # 0.5s gap
    with pytest.raises(csp.PlanError, match="gap"):
        csp._validate_timeline(plan)


def test_v2_overlap_rejected():
    plan = _v2_plan()
    plan["scenes"][1]["start_sec"] = 13.0  # 0.5s overlap
    with pytest.raises(csp.PlanError, match="overlap"):
        csp._validate_timeline(plan)


def test_v2_subframe_dust_tolerated():
    plan = _v2_plan()
    plan["scenes"][1]["start_sec"] = 13.5 + 0.001
    csp._validate_timeline(plan)  # no raise


def test_v2_missing_start_rejected():
    plan = _v2_plan()
    del plan["scenes"][1]["start_sec"]
    with pytest.raises(csp.PlanError, match="start_sec"):
        csp._validate_timeline(plan)


def test_v2_must_start_at_zero():
    plan = _v2_plan()
    plan["scenes"][0]["start_sec"] = 1.8
    with pytest.raises(csp.PlanError, match="gap"):
        csp._validate_timeline(plan)


def test_v3_still_rejected(tmp_path):
    plan = _v2_plan()
    plan["version"] = 3
    with pytest.raises(csp.PlanError, match="unsupported"):
        csp.compile_scene_plan(
            _write(tmp_path, plan), str(tmp_path),
            str(tmp_path / "v3.mp4"), width=320, height=180, fps=10)


def test_v1_untouched_by_layout_gate():
    plan = {"version": 1, "episode": "v1",
            "scenes": [{"id": "a", "slide": "DisplayHeadline",
                        "params": {"headline": "x"}, "duration_sec": 5.0,
                        "turns": [0, 1]}]}
    csp._validate_layout(plan)  # turns path, no raise


def test_lint_flags_v2_gap():
    plan = _v2_plan()
    plan["scenes"][1]["start_sec"] = 15.0
    errors, _ = lint_plan.lint_plan(plan)
    assert any("gap" in e for e in errors)


def test_lint_accepts_v2_contiguous():
    errors, _ = lint_plan.lint_plan(_v2_plan())
    assert errors == []


def test_refit_refuses_v2(tmp_path):
    plan_path = _write(tmp_path, _v2_plan())
    r = subprocess.run(
        [sys.executable, "refit_durations.py", plan_path, str(tmp_path)],
        capture_output=True, text=True, cwd=os.path.join(
            os.path.dirname(os.path.abspath(__file__)), os.pardir))
    assert r.returncode != 0
    assert "only refits v1" in r.stdout + r.stderr


def test_direct_accepts_v2_contiguous():
    from stages import direct as direct_mod
    plan = _v2_plan()
    direct_mod._validate_plan_durations(plan, [], {})  # no raise


def test_direct_rejects_v2_gap():
    from stages import direct as direct_mod
    plan = _v2_plan()
    plan["scenes"][1]["start_sec"] = 20.0
    with pytest.raises(RuntimeError, match="REJECTED"):
        direct_mod._validate_plan_durations(plan, [], {})
