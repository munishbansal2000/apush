"""Full chain with the mock director: turns -> plan -> schema -> mp4."""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

import director  # noqa: E402
from compile_scene_plan import compile_scene_plan  # noqa: E402
from tests.conftest import ffprobe_duration  # noqa: E402

TURNS = [
    {"speaker": "Maya",
     "text": "Four empires, four business models. Spain wanted souls and silver.",
     "duration_sec": 3.0},
    {"speaker": "Marcus",
     "text": "France built a fur trade empire with far fewer settlers than England.",
     "duration_sec": 4.0},
    {"speaker": "Maya",
     "text": "And the Dutch ran New Netherland like a company town.",
     "duration_sec": 3.5},
    {"speaker": "Marcus",
     "text": "England sent families and farms, and displaced Native peoples.",
     "duration_sec": 4.5},
]
MANIFEST = [
    {"path": "taylor.jpg", "kind": "portrait",
     "description": "test portrait"},
]

SCHEMA_SLIDES = {
    "TitleSlide", "BulletSlide", "StepsSlide", "DisplayPointsSlide",
    "DisplayHeadline", "CompareSlide", "HighlightSlide", "CollageSlide",
    "TitleCardSlide", "DuoSlide", "ImageSlide", "SplitSlide", "QuoteSlide",
    "StatSlide", "KenBurnsSlide", "CalloutSlide", "MapZoomSlide",
    "RouteSlide", "CausalChainSlide", "VidSlide",
    "TerritorySlide", "RecallSlide", "SpectrumSlide",
    "SketchSlide",
}
SCHEMA_OVERLAYS = {"keywordpop", "caption", "lowerthird", "sticker",
                   "regionglow", "timelineribbon"}


def _validate_against_schema(plan):
    """Structural check mirroring scene_plan_schema.json v1."""
    with open(os.path.join(os.path.dirname(__file__), os.pardir,
                           "scene_plan_schema.json"), encoding="utf-8") as f:
        schema = json.load(f)
    assert plan["version"] == schema["properties"]["version"]["const"] == 1
    assert plan["episode"]
    slide_enum = set(schema["properties"]["scenes"]["items"]
                     ["properties"]["slide"]["enum"])
    assert slide_enum == SCHEMA_SLIDES
    overlay_enum = set(schema["properties"]["scenes"]["items"]
                       ["properties"]["overlays"]["items"]
                       ["properties"]["type"]["enum"])
    assert overlay_enum == SCHEMA_OVERLAYS
    assert len(plan["scenes"]) == len(TURNS)
    for scene in plan["scenes"]:
        assert scene["id"] and scene["slide"] in slide_enum
        assert scene["duration_sec"] > 0
        for ov in scene.get("overlays", []):
            assert ov["type"] in overlay_enum


def test_director_mock_e2e(tmp_path, assets_dir):
    plan = director.direct("u9-e9", TURNS, MANIFEST, provider="mock")
    _validate_against_schema(plan)

    plan_path = tmp_path / "plan.json"
    plan_path.write_text(json.dumps(plan), encoding="utf-8")
    out = str(tmp_path / "mock.mp4")
    compile_scene_plan(str(plan_path), assets_dir, out, fps=15)

    assert os.path.exists(out)
    total = sum(t["duration_sec"] for t in TURNS)  # 15.0
    assert abs(ffprobe_duration(out) - total) < 0.5
