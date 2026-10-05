"""Regression: bg image specs without an explicit "type" must render.

The u1-e2 scene plan used bg={"path": ...} (no "type"). slideforge's
spec.get("type", "gradient") default routed those scenes to _gradient,
which KeyError'd on the missing "top" at frame-render time — a crash the
original test suite missed because no test rendered a bg image path.
The compiler must normalize {"path": ...} to {"type": "image", ...}.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from compile_scene_plan import compile_scene_plan  # noqa: E402
from tests.conftest import (ffprobe_duration, ffprobe_streams,  # noqa: E402
                      write_plan)


def test_bg_path_without_type_renders(tmp_path, assets_dir):
    scenes = [
        {"id": "scene-00", "slide": "TitleSlide",
         "params": {"title": "The Collision", "subtitle": "Europe sails west",
                    "bg": {"path": "taylor.jpg"}},
         "duration_sec": 3.0, "transition": "cut", "trans_dur": 0},
        {"id": "scene-01", "slide": "DisplayPointsSlide",
         "params": {"points": ["**Gold**", "**God**", "**Glory**"],
                    "bg": {"path": "taylor.jpg"}},
         "duration_sec": 3.0, "transition": "cut", "trans_dur": 0},
    ]
    plan = write_plan(tmp_path, scenes)
    out = str(tmp_path / "bgpath.mp4")
    summary = compile_scene_plan(plan, assets_dir, out, fps=15)

    assert os.path.exists(out)
    assert os.path.getsize(out) > 10_000
    streams = ffprobe_streams(out)
    assert [s["codec_type"] for s in streams] == ["video"]
    assert abs(ffprobe_duration(out) - 6.0) < 0.5
    assert abs(summary["duration_sec"] - 6.0) < 0.5
    assert summary["scenes"] == 2


def test_bg_path_with_explicit_type_still_renders(tmp_path, assets_dir):
    scenes = [
        {"id": "scene-00", "slide": "TitleSlide",
         "params": {"title": "Explicit", "subtitle": "image bg",
                    "bg": {"type": "image", "path": "taylor.jpg"}},
         "duration_sec": 2.0, "transition": "cut", "trans_dur": 0},
    ]
    plan = write_plan(tmp_path, scenes)
    out = str(tmp_path / "bgtype.mp4")
    compile_scene_plan(plan, assets_dir, out, fps=15)
    assert os.path.exists(out)
    assert abs(ffprobe_duration(out) - 2.0) < 0.5
