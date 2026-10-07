"""proof_callouts renders wide+zoom stills via the compiler's builder."""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from proof_callouts import proof_callouts, proof_times  # noqa: E402


def test_proof_times_settle_inside_scene():
    spec = {"duration_sec": 4.29,
            "params": {"intro_hold": 0.6, "move_dur": 0.7}}
    wide, zoom = proof_times(spec)
    assert wide == 0.05
    assert abs(zoom - 1.8) < 1e-9


def test_proof_times_clamp_to_short_scene():
    spec = {"duration_sec": 1.0,
            "params": {"intro_hold": 1.0, "move_dur": 1.0}}
    wide, zoom = proof_times(spec)
    assert 0.0 <= wide < 1.0
    assert 0.0 <= zoom < 1.0


def test_proof_renders_two_stills(tmp_path):
    from PIL import Image
    Image.new("RGB", (80, 60), (120, 110, 90)).save(tmp_path / "map.png")
    plan = {"version": 2, "episode": "t", "scenes": [
        {"id": "c1", "slide": "CalloutSlide", "duration_sec": 4.0,
         "params": {"image": "map.png",
                    "callouts": [{"at": [0.3, 0.7], "zoom": 3.0,
                                  "label": "Z"}],
                    "intro_hold": 0.5, "move_dur": 0.5,
                    "zoom_hold": 1.0}},
        {"id": "h1", "slide": "DisplayHeadline", "duration_sec": 4.0,
         "params": {"headline": "H"}}]}
    plan_p = tmp_path / "plan.json"
    plan_p.write_text(json.dumps(plan), encoding="utf-8")
    out = tmp_path / "proofs"
    paths = proof_callouts(str(plan_p), str(tmp_path), str(out), 160, 90)
    assert len(paths) == 2  # headline scene skipped, callout doubled
    for p in paths:
        with Image.open(p) as im:
            assert im.size == (160, 90)
