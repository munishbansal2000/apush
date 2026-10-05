"""Superset coverage: the two old-pipeline features missing from scene plans.

- vidslide: pre-rendered clip beats (LTX clips from the 5090) embedded in a
  plan, with fail-fast duration matching.
- causalchain: the CausalChainSlide already in the library, now addressable
  from a plan.
"""
import glob
import os
import subprocess
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from compile_scene_plan import PlanError, compile_scene_plan  # noqa: E402
from tests.conftest import (ffprobe_duration, ffprobe_streams,  # noqa: E402
                            write_plan)


def _make_clip(path, seconds=2.0):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error",
         "-f", "lavfi", "-i",
         f"testsrc=duration={seconds}:size=320x180:rate=10",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", path],
        check=True)
    return path


def _clip_plan(clip_rel, clip_dur, tmp_path):
    scenes = [
        {"id": "scene-00", "slide": "vidslide",
         "params": {"src": clip_rel},
         "duration_sec": clip_dur, "transition": "cut", "trans_dur": 0},
        {"id": "scene-01", "slide": "causalchain",
         "params": {"title": "THE EXAM MOVE",
                    "nodes": [["Environment", "writes the rules"],
                              ["Food", "maize feeds cities"],
                              ["Government", "confederacy"]]},
         "duration_sec": 4.0, "transition": "cut", "trans_dur": 0,
         "overlays": [{"type": "caption", "text": "walk the chain",
                       "start": 0.5, "duration": 2.0}]},
    ]
    return write_plan(tmp_path, scenes, episode="test-superset")


def test_vidslide_and_causalchain_render(tmp_path, assets_dir):
    clip = _make_clip(os.path.join(assets_dir, "clips", "test.mp4"))
    assert os.path.exists(clip)
    plan = _clip_plan("clips/test.mp4", 2.0, tmp_path)
    out = str(tmp_path / "superset.mp4")

    before = set(glob.glob(os.path.join(tempfile.gettempdir(),
                                        "clipscene-*.raw")))
    summary = compile_scene_plan(plan, assets_dir, out,
                                 width=320, height=180, fps=10, quiet=True)

    assert os.path.exists(out)
    assert os.path.getsize(out) > 5_000
    assert [s["codec_type"] for s in ffprobe_streams(out)] == ["video"]
    assert abs(ffprobe_duration(out) - 6.0) < 0.6
    assert summary["scenes"] == 2
    # decode temp files are cleaned up after render
    after = set(glob.glob(os.path.join(tempfile.gettempdir(),
                                       "clipscene-*.raw")))
    assert after - before == set()


def test_vidslide_missing_clip_is_plan_error(tmp_path, assets_dir):
    plan = _clip_plan("clips/nope.mp4", 2.0, tmp_path)
    with pytest.raises(PlanError):
        compile_scene_plan(plan, assets_dir, str(tmp_path / "x.mp4"),
                           width=320, height=180, fps=10, quiet=True)


def test_vidslide_duration_mismatch_is_plan_error(tmp_path, assets_dir):
    _make_clip(os.path.join(assets_dir, "clips", "test.mp4"), seconds=2.0)
    plan = _clip_plan("clips/test.mp4", 5.0, tmp_path)  # clip is 2s
    with pytest.raises(PlanError, match="tolerance"):
        compile_scene_plan(plan, assets_dir, str(tmp_path / "x.mp4"),
                           width=320, height=180, fps=10, quiet=True)


def test_vidslide_rejects_bad_params(tmp_path, assets_dir):
    _make_clip(os.path.join(assets_dir, "clips", "test.mp4"), seconds=2.0)
    scenes = [{"id": "s", "slide": "vidslide",
               "params": {"src": "clips/test.mp4", "bogus": 1},
               "duration_sec": 2.0}]
    plan = write_plan(tmp_path, scenes)
    with pytest.raises(PlanError, match="bogus"):
        compile_scene_plan(plan, assets_dir, str(tmp_path / "x.mp4"),
                           width=320, height=180, fps=10, quiet=True)
