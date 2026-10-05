"""The lint must catch the bad-rendering classes it was built for."""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from compile_scene_plan import PlanError, compile_scene_plan  # noqa: E402
from lint_plan import lint_plan, main as lint_main  # noqa: E402
from tests.conftest import write_plan  # noqa: E402


def _plan(scenes):
    return {"version": 1, "episode": "test-lint", "scenes": scenes}


def _scene(sid="s1", dur=10.0, **kw):
    spec = {"id": sid, "slide": "QuoteSlide",
            "params": {"quote": "Short.", "byline": "x"},
            "duration_sec": dur, "transition": "cut", "trans_dur": 0}
    spec.update(kw)
    return spec


def test_overlapping_captions_are_an_error():
    plan = _plan([_scene(overlays=[
        {"type": "caption", "text": "one", "start": 1.0, "duration": 4.0},
        {"type": "caption", "text": "two", "start": 2.0, "duration": 4.0},
    ])])
    errors, _ = lint_plan(plan)
    assert any("collides" in e for e in errors)


def test_staggered_overlays_are_fine():
    plan = _plan([_scene(overlays=[
        {"type": "caption", "text": "one", "start": 1.0, "duration": 3.0},
        {"type": "caption", "text": "two", "start": 5.0, "duration": 3.0},
        {"type": "keywordpop", "word": "Gold", "position": "left",
         "start": 1.0, "duration": 2.0},
    ])])
    errors, warns = lint_plan(plan)
    assert errors == []


def test_overlay_running_past_scene_end_is_an_error():
    plan = _plan([_scene(
        dur=10.0,
        overlays=[{"type": "caption", "text": "x",
                   "start": 8.0, "duration": 5.0}])])
    errors, _ = lint_plan(plan)
    assert any("runs past" in e for e in errors)


def test_sub_second_scene_is_an_error():
    errors, _ = lint_plan(_plan([_scene(dur=0.5)]))
    assert any("floor" in e for e in errors)


def test_unreadable_pacing_warns():
    plan = _plan([_scene(
        dur=4.0,
        params={"quote": " ".join(["word"] * 60), "byline": "x"})])
    errors, warns = lint_plan(plan)
    assert errors == []
    assert any("on-screen words" in w for w in warns)


def test_flashing_overlay_warns():
    plan = _plan([_scene(overlays=[
        {"type": "keywordpop", "word": "Gold", "start": 1.0, "duration": 0.5},
    ])])
    errors, warns = lint_plan(plan)
    assert errors == []
    assert any("don't-flash" in w for w in warns)


def test_transition_eating_scene_is_an_error():
    plan = _plan([
        _scene(sid="s1", dur=10.0),
        _scene(sid="s2", dur=4.0, trans_dur=5.0, transition="dip"),
    ])
    errors, _ = lint_plan(plan)
    assert any("transition" in e for e in errors)


def test_lint_errors_block_compile(tmp_path, assets_dir):
    plan = _plan([_scene(dur=0.5)])
    plan_path = write_plan(tmp_path, plan["scenes"])
    with pytest.raises(PlanError, match="visual lint failed"):
        compile_scene_plan(plan_path, assets_dir, str(tmp_path / "x.mp4"),
                           width=320, height=180, fps=10, quiet=True)


def test_overlay_starting_past_scene_end_is_an_error():
    plan = _plan([_scene(
        dur=10.0,
        overlays=[{"type": "caption", "text": "x", "start": 11.0}])])
    errors, _ = lint_plan(plan)
    assert any("never visible" in e for e in errors)


def test_zero_duration_overlay_is_an_error():
    plan = _plan([_scene(
        dur=10.0,
        overlays=[{"type": "caption", "text": "x", "start": 1.0,
                   "duration": 0}])])
    errors, _ = lint_plan(plan)
    assert any("never visible" in e for e in errors)


def test_negative_start_names_the_direction():
    plan = _plan([_scene(
        overlays=[{"type": "caption", "text": "x", "start": -1.0,
                   "duration": 2.0}])])
    errors, _ = lint_plan(plan)
    assert any("before the scene starts" in e for e in errors)


def test_lowerthird_name_and_role_count_for_pacing():
    plan = _plan([_scene(
        dur=3.0,
        params={"quote": "Short.", "byline": "x"},
        overlays=[{"type": "lowerthird",
                   "name": " ".join(["name"] * 8),
                   "role": " ".join(["role"] * 8),
                   "start": 0.0, "duration": 3.0}])])
    errors, warns = lint_plan(plan)
    assert errors == []
    assert any("on-screen words" in w for w in warns)


def test_slash_words_are_not_paths():
    plan = _plan([_scene(
        dur=3.0,
        params={"quote": " ".join(["word"] * 7 + ["and/or"]),
                "byline": "x"})])
    errors, warns = lint_plan(plan)
    assert errors == []
    assert any("on-screen words" in w for w in warns)


def test_cli_no_args_is_usage_error(capsys):
    assert lint_main([]) == 2
    assert "usage" in capsys.readouterr().err


def test_cli_missing_file_is_error(capsys):
    assert lint_main(["/tmp/sf-definitely-missing-plan.json"]) == 2
    assert "ERROR" in capsys.readouterr().err
