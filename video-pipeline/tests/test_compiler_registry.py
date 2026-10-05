"""Registry completion: territory/recall/spectrum addressable from plans,
plus movie-level overlays (persistent TimelineRibbon chrome).
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from compile_scene_plan import PlanError, compile_scene_plan  # noqa: E402
from tests.conftest import ffprobe_duration  # noqa: E402
from tests.conftest import write_plan  # noqa: E402


def _tiny(out, **kw):
    params = {"width": 320, "height": 180, "fps": 10}
    params.update(kw)
    return params


def test_new_slides_build_and_render(tmp_path, assets_dir):
    scenes = [
        {"id": "t", "slide": "territoryslide",
         "params": {"map_image": "taylor.jpg", "title": "Grows",
                    "territories": [
                        {"at": [0.4, 0.4], "rx": 0.1, "ry": 0.1,
                         "label": "A"},
                        {"at": [0.6, 0.6], "rx": 0.1, "ry": 0.1,
                         "label": "B", "label_at": [0.7, 0.7]}]},
         "duration_sec": 2.0, "transition": "cut", "trans_dur": 0},
        {"id": "r", "slide": "recallslide",
         "params": {"question": "Q?", "answers": ["a1", "a2"]},
         "duration_sec": 3.0, "transition": "cut", "trans_dur": 0},
        {"id": "s", "slide": "spectrumslide",
         "params": {"axis": ["L", "R"],
                    "markers": [{"at": 0.2, "label": "m1"},
                                {"at": 0.8, "label": "m2",
                                 "move_to": 0.7, "sub": "s"}]},
         "duration_sec": 3.0, "transition": "cut", "trans_dur": 0},
    ]
    plan = write_plan(tmp_path, scenes, episode="test-registry")
    out = str(tmp_path / "out.mp4")
    summary = compile_scene_plan(plan, assets_dir, out, **_tiny(out))
    assert summary["scenes"] == 3
    assert ffprobe_duration(out) == pytest.approx(8.0, abs=0.3)


def test_movie_overlays_render_ribbon(tmp_path, assets_dir):
    scenes = [
        {"id": "a", "slide": "titleslide",
         "params": {"title": "A"}, "duration_sec": 1.5,
         "transition": "cut", "trans_dur": 0,
         "turns": [0, 0]},
        {"id": "b", "slide": "titleslide",
         "params": {"title": "B"}, "duration_sec": 1.5,
         "transition": "crossfade", "trans_dur": 0.5,
         "turns": [1, 1]},
    ]
    import json
    base = {"version": 1, "episode": "t", "scenes": scenes}
    plain = tmp_path / "plain.json"
    plain.write_text(json.dumps(base), encoding="utf-8")
    ribbon = dict(base)
    ribbon["movie_overlays"] = [
        {"type": "timelineribbon", "era": "TEST",
         "events": [[0.5, "mid"]], "span": [0, 1]}]
    rib = tmp_path / "rib.json"
    rib.write_text(json.dumps(ribbon), encoding="utf-8")
    o1, o2 = str(tmp_path / "o1.mp4"), str(tmp_path / "o2.mp4")
    compile_scene_plan(str(plain), assets_dir, o1, **_tiny(o1))
    compile_scene_plan(str(rib), assets_dir, o2, **_tiny(o2))
    assert ffprobe_duration(o2) == pytest.approx(
        ffprobe_duration(o1), abs=0.2)
    # the ribbon must actually draw: bytes differ from the bare render
    assert (open(o1, "rb").read() != open(o2, "rb").read())


def test_movie_overlay_invalid_type_rejected(tmp_path, assets_dir):
    import json
    plan = {"version": 1, "episode": "t",
            "scenes": [{"id": "a", "slide": "titleslide",
                        "params": {"title": "A"}, "duration_sec": 1.5,
                        "transition": "cut", "trans_dur": 0,
                        "turns": [0, 0]}],
            "movie_overlays": [{"type": "nope"}]}
    p = tmp_path / "bad.json"
    p.write_text(json.dumps(plan), encoding="utf-8")
    with pytest.raises(PlanError, match="unknown type"):
        compile_scene_plan(str(p), assets_dir,
                           str(tmp_path / "o.mp4"), **_tiny(""))

def test_sketchslide_scene_renders(tmp_path, assets_dir):
    scenes = [
        {"id": "sk", "slide": "sketchslide",
         "params": {"title": "Pitt",
                    "elements": [
                        {"type": "icon", "shape": "moneybag",
                         "label": "Britain", "x": 0.2, "y": 0.5},
                        {"type": "arrow", "from": [0.3, 0.5],
                         "to": [0.55, 0.5], "label": "subsidies"},
                        {"type": "icon", "shape": "soldier",
                         "label": "Prussia", "x": 0.65, "y": 0.5}]},
         "duration_sec": 3.0, "transition": "cut", "trans_dur": 0},
    ]
    plan = write_plan(tmp_path, scenes, episode="test-sketch")
    out = str(tmp_path / "out.mp4")
    summary = compile_scene_plan(plan, assets_dir, out, **_tiny(out))
    assert summary["scenes"] == 1
    assert ffprobe_duration(out) == pytest.approx(3.0, abs=0.3)
