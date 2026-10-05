"""The compiler must reject bad plans BEFORE rendering anything."""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from compile_scene_plan import PlanError, compile_scene_plan  # noqa: E402
from tests.conftest import write_plan  # noqa: E402


def _scene(**kw):
    base = {"id": "scene-00", "slide": "TitleSlide",
            "params": {"title": "Hi"}, "duration_sec": 3.0}
    base.update(kw)
    return base


def test_unknown_slide_type(tmp_path, assets_dir):
    plan = write_plan(tmp_path, [_scene(id="scene-bad-slide",
                                        slide="ExplodoSlide")])
    out = str(tmp_path / "out.mp4")
    with pytest.raises(PlanError) as ei:
        compile_scene_plan(plan, assets_dir, out)
    assert "scene-bad-slide" in str(ei.value)
    assert not os.path.exists(out)


def test_zero_duration(tmp_path, assets_dir):
    plan = write_plan(tmp_path, [_scene(id="scene-zero-dur",
                                        duration_sec=0)])
    out = str(tmp_path / "out.mp4")
    with pytest.raises(PlanError) as ei:
        compile_scene_plan(plan, assets_dir, out)
    assert "scene-zero-dur" in str(ei.value)
    assert not os.path.exists(out)


def test_missing_image_file(tmp_path, assets_dir):
    plan = write_plan(tmp_path, [_scene(
        id="scene-missing-img", slide="KenBurnsSlide",
        params={"image": "nope/not_here.jpg",
                "stops": [{"cx": 0.5, "cy": 0.5, "fw": 1.0}]})])
    out = str(tmp_path / "out.mp4")
    with pytest.raises(PlanError) as ei:
        compile_scene_plan(plan, assets_dir, out)
    assert "scene-missing-img" in str(ei.value)
    assert not os.path.exists(out)
