import json
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from stages import anim  # noqa: E402


def _write_beats(path, beats):
    os.makedirs(os.path.join(path, "work"), exist_ok=True)
    with open(os.path.join(path, "work", "beats_resolved.json"), "w",
              encoding="utf-8") as f:
        json.dump({"beats": beats, "meta": {}}, f)


def _beat(bid="b01", prompt="Smoke curls above the harbor."):
    return {"id": bid, "kind": "kb", "dur": 10.0, "image": "ship",
            "anim_prompt": prompt}


def test_accepts_ambient_prompt(tmp_path):
    _write_beats(str(tmp_path), [_beat()])
    out = anim.run(str(tmp_path), {"episode": "t"})
    body = open(os.path.join(out, "b01.txt"), encoding="utf-8").read()
    assert "locked-off" in body
    assert "subtle camera drift" not in body
    assert "camera pan" in body  # camera moves are negated, not styled
    man = json.load(open(os.path.join(out, "MANIFEST.json"), encoding="utf-8"))
    assert man[0]["beat"] == "b01" and man[0]["ready"] is False


def test_beats_without_prompt_are_skipped(tmp_path):
    b = _beat()
    del b["anim_prompt"]
    _write_beats(str(tmp_path), [b])
    out = anim.run(str(tmp_path), {"episode": "t"})
    assert json.load(open(os.path.join(out, "MANIFEST.json"),
                          encoding="utf-8")) == []


@pytest.mark.parametrize("prompt", [
    "Soldiers march across the field.",  # people
    "The camera pans over the water.",  # camera move
    "Clouds gather and transform into a storm.",  # content change
    "Waves lap the shore while the camera slowly zooms.",  # camera verb
])
def test_rejects_unsafe_prompts(tmp_path, prompt):
    _write_beats(str(tmp_path), [_beat(prompt=prompt)])
    with pytest.raises(RuntimeError, match="rejected"):
        anim.run(str(tmp_path), {"episode": "t"})
