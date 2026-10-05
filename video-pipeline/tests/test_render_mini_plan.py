"""End-to-end: hand-written 4-scene plan -> real mp4."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from compile_scene_plan import compile_scene_plan  # noqa: E402
from tests.conftest import (ffprobe_duration, ffprobe_streams,  # noqa: E402
                      write_plan)


def test_render_mini_plan(tmp_path, assets_dir):
    scenes = [
        {"id": "scene-00", "slide": "TitleSlide",
         "params": {"title": "The Collision", "subtitle": "Europe sails west"},
         "duration_sec": 3.0, "transition": "cut", "trans_dur": 0},
        {"id": "scene-01", "slide": "DuoSlide",
         "params": {
             "left": {"image": "taylor.jpg", "label": "Frederick Taylor"},
             "right": {"image": "taylor.jpg", "label": "Henry Ford"}},
         "duration_sec": 4.0, "transition": "cut", "trans_dur": 0},
        {"id": "scene-02", "slide": "QuoteSlide",
         "params": {"quote": "He that will not work, shall not eat.",
                    "byline": "John Smith, 1608"},
         "duration_sec": 3.0, "transition": "cut", "trans_dur": 0,
         "overlays": [{"type": "keywordpop", "word": "JAMESTOWN",
                       "start": 0.6, "duration": 2.0}]},
        {"id": "scene-03", "slide": "BulletSlide",
         "params": {"title": "Three reasons",
                    "bullets": ["Gold", "God", "Glory"]},
         "duration_sec": 4.0, "transition": "cut", "trans_dur": 0},
    ]
    plan = write_plan(tmp_path, scenes)
    out = str(tmp_path / "mini.mp4")
    summary = compile_scene_plan(plan, assets_dir, out, fps=15)

    assert os.path.exists(out)
    assert os.path.getsize(out) > 10_000
    # ffprobe-clean: probes without error, exactly one video stream
    streams = ffprobe_streams(out)
    assert [s["codec_type"] for s in streams] == ["video"]
    # duration within 0.5s of the summed scene durations (14s)
    assert abs(ffprobe_duration(out) - 14.0) < 0.5
    assert abs(summary["duration_sec"] - 14.0) < 0.5
    assert summary["scenes"] == 4
