import json
import os
import sys
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from stages import sketch_ink as ink  # noqa: E402

ELEMENTS = [
    {"type": "icon", "shape": "moneybag", "label": "Britain",
     "x": 0.2, "y": 0.5},
    {"type": "arrow", "from": [0.3, 0.5], "to": [0.55, 0.5],
     "label": "subsidies"},
    {"type": "icon", "shape": "soldier", "label": "Prussia",
     "x": 0.65, "y": 0.5},
]


def test_key_stable_and_sensitive():
    a = ink.sketch_key(ELEMENTS, title="Pitt")
    b = ink.sketch_key(json.loads(json.dumps(ELEMENTS)), title="Pitt")
    assert a == b
    assert ink.sketch_key(ELEMENTS[:-1], title="Pitt") != a
    assert ink.sketch_key(ELEMENTS, title="Other") != a
    assert ink.sketch_key(ELEMENTS, title="Pitt",
                          style_version="ink-vX") != a


def test_prompts_carry_guardrails():
    assert "do not add text" in ink.STYLE_PROMPT
    assert "preserve all labels" in ink.STYLE_PROMPT
    assert "arrow positions exactly" in ink.STYLE_PROMPT
    for banned in ("photoreal", "extra text", "map warping"):
        assert banned in ink.NEGATIVE_PROMPT


def test_cache_hit_reuses_clip_without_backend(tmp_path):
    cached = tmp_path / "abc123.mp4"
    cached.write_bytes(b"fake")
    with mock.patch.object(ink, "_probe_duration", return_value=5.0):
        out = ink.ensure_ink_clip("settle.png", 5.0, "abc123",
                                  str(tmp_path), backend="none")
    assert out == str(cached)


def test_cache_miss_no_backend_returns_none(tmp_path):
    assert ink.ensure_ink_clip("settle.png", 5.0, "nokey",
                               str(tmp_path), backend="none") is None


def test_ltx_backend_requested_but_missing_raises(tmp_path):
    with mock.patch.object(ink, "_ltx_available", return_value=False):
        try:
            ink.ensure_ink_clip("settle.png", 5.0, "k",
                                str(tmp_path), backend="ltx")
        except RuntimeError as e:
            assert "diffusers" in str(e)
        else:
            raise AssertionError("expected RuntimeError")


def test_corrupt_cache_falls_back(tmp_path):
    (tmp_path / "bad.mp4").write_bytes(b"junk")
    with mock.patch.object(ink, "_probe_duration", return_value=None):
        assert ink.ensure_ink_clip("settle.png", 5.0, "bad",
                                   str(tmp_path), backend="none") is None


def test_backend_run_writes_sidecar(tmp_path):
    def fake_backend(image, seconds, out, seed=42, model=None):
        with open(out, "wb") as f:
            f.write(b"clip-bytes")

    with mock.patch.object(ink, "_ltx_available", return_value=True), \
            mock.patch.object(ink, "_ltx_backend",
                              side_effect=fake_backend):
        out = ink.ensure_ink_clip("settle.png", 5.0, "made",
                                  str(tmp_path), backend="auto")
    assert out.endswith("made.mp4")
    sidecar = json.load(open(os.path.join(str(tmp_path), "made.json")))
    assert sidecar["key"] == "made"
    assert sidecar["style"] == ink.STYLE_VERSION
    assert "do not add text" in sidecar["prompt"]


def test_export_settle_frame(tmp_path):
    plan = {"version": 1, "episode": "t",
            "scenes": [{"id": "sk", "slide": "sketchslide",
                        "params": {"title": "Pitt", "elements": ELEMENTS},
                        "duration_sec": 6.0, "transition": "cut",
                        "trans_dur": 0}]}
    plan_path = tmp_path / "plan.json"
    plan_path.write_text(json.dumps(plan), encoding="utf-8")
    out = str(tmp_path / "settle.png")
    ink.export_settle_frame(str(plan_path), "sk", str(tmp_path), out)
    from PIL import Image
    with Image.open(out) as im:
        assert im.size[0] > 300 and im.size[1] > 100


def test_export_rejects_non_sketch(tmp_path):
    plan = {"version": 1, "episode": "t",
            "scenes": [{"id": "sk", "slide": "titleslide",
                        "params": {"title": "T"}, "duration_sec": 2.0,
                        "transition": "cut", "trans_dur": 0}]}
    plan_path = tmp_path / "plan.json"
    plan_path.write_text(json.dumps(plan), encoding="utf-8")
    try:
        ink.export_settle_frame(str(plan_path), "sk", str(tmp_path),
                                str(tmp_path / "s.png"))
    except ValueError as e:
        assert "not a sketchslide" in str(e)
    else:
        raise AssertionError("expected ValueError")


def test_stylize_sequence_pending(tmp_path):
    try:
        ink.stylize_sequence(str(tmp_path), str(tmp_path / "o.mp4"))
    except NotImplementedError as e:
        assert "no video-to-video backend" in str(e)
    else:
        raise AssertionError("expected NotImplementedError")
