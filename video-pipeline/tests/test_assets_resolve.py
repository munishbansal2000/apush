"""Image paths resolve against the given assets dir; absolute paths die."""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from compile_scene_plan import PlanError, compile_scene_plan  # noqa: E402
from tests.conftest import ffprobe_duration, write_plan  # noqa: E402


def _bg_scene(image_value):
    return {
        "id": "scene-00", "slide": "TitleSlide",
        "params": {"title": "Background check",
                   "bg": {"type": "image", "path": image_value, "dim": 0.5}},
        "duration_sec": 2.0, "transition": "cut", "trans_dur": 0,
    }


def test_relative_resolves_against_assets_dir(tmp_path, assets_dir):
    plan = write_plan(tmp_path, [_bg_scene("taylor.jpg")])
    out = str(tmp_path / "bg.mp4")
    summary = compile_scene_plan(plan, assets_dir, out, fps=15)
    assert os.path.exists(out)
    assert abs(ffprobe_duration(out) - 2.0) < 0.5
    assert summary["scenes"] == 1


def test_subdir_relative_resolves(tmp_path, assets_dir):
    os.makedirs(os.path.join(assets_dir, "photos"))
    import shutil
    shutil.copy(os.path.join(assets_dir, "taylor.jpg"),
                os.path.join(assets_dir, "photos", "taylor.jpg"))
    plan = write_plan(tmp_path, [_bg_scene("photos/taylor.jpg")])
    out = str(tmp_path / "bg2.mp4")
    compile_scene_plan(plan, assets_dir, out, fps=15)
    assert os.path.exists(out)


def test_absolute_path_rejected(tmp_path, assets_dir):
    abs_path = os.path.abspath(os.path.join(assets_dir, "taylor.jpg"))
    assert os.path.isabs(abs_path)
    plan = write_plan(tmp_path, [_bg_scene(abs_path)])
    out = str(tmp_path / "bg3.mp4")
    with pytest.raises(PlanError, match="scene-00"):
        compile_scene_plan(plan, assets_dir, out)
    assert not os.path.exists(out)


def test_escaping_path_rejected(tmp_path, assets_dir):
    plan = write_plan(tmp_path, [_bg_scene("../taylor.jpg")])
    out = str(tmp_path / "bg4.mp4")
    with pytest.raises(PlanError, match="scene-00"):
        compile_scene_plan(plan, assets_dir, out)
    assert not os.path.exists(out)
