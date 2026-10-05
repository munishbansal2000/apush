"""End-to-end: RouteSlide.from_route('columbus_1492') inside a plan."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from compile_scene_plan import compile_scene_plan  # noqa: E402
from tests.conftest import (ffprobe_duration, ffprobe_streams,  # noqa: E402
                      write_plan)


def test_route_slide_e2e(tmp_path, assets_dir):
    scenes = [
        {"id": "scene-00", "slide": "TitleSlide",
         "params": {"title": "1492", "subtitle": "Columbus sails west"},
         "duration_sec": 2.0, "transition": "cut", "trans_dur": 0},
        {"id": "scene-01", "slide": "RouteSlide",
         "params": {"route": "columbus_1492"},
         "duration_sec": 6.0, "transition": "cut", "trans_dur": 0},
    ]
    plan = write_plan(tmp_path, scenes)
    out = str(tmp_path / "route.mp4")
    summary = compile_scene_plan(plan, assets_dir, out, fps=15)

    assert os.path.exists(out)
    assert os.path.getsize(out) > 10_000
    streams = ffprobe_streams(out)
    assert [s["codec_type"] for s in streams] == ["video"]
    assert abs(ffprobe_duration(out) - 8.0) < 0.5
    assert abs(summary["duration_sec"] - 8.0) < 0.5
