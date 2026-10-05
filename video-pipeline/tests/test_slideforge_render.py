import json
import os
import sys
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from stages import slideforge_render as sr  # noqa: E402


def _assets(tmp_path, payload=b"fake-jpeg-v1"):
    d = tmp_path / "assets"
    d.mkdir(exist_ok=True)
    (d / "pic.jpg").write_bytes(payload)
    return str(d)


def _scene(**kw):
    s = {"id": "s1", "slide": "titleslide", "duration_sec": 1.0,
         "params": {"title": "Hi"},
         "overlays": [{"type": "sticker", "image": "pic.jpg"}]}
    s.update(kw)
    return s


def _ep(tmp_path, scenes):
    ep = tmp_path / "ep"
    (ep / "work").mkdir(parents=True, exist_ok=True)
    plan = {"version": 1, "episode": "t", "scenes": scenes}
    (ep / "work" / "scene_plan.json").write_text(json.dumps(plan),
                                                 encoding="utf-8")
    return str(ep)


def _fake_compile(plan_path, assets_dir, out_mp4, **kw):
    with open(out_mp4, "wb") as f:
        f.write(b"fake-mp4")
    return {"scenes": 1, "duration_sec": 1.0}


def test_second_run_with_same_inputs_skips_compile(tmp_path):
    assets = _assets(tmp_path)
    ep = _ep(tmp_path, [_scene()])
    with mock.patch.object(sr, "compile_scene_plan",
                           side_effect=_fake_compile) as m:
        sr.run(ep, {"assets_dir": assets})
        sr.run(ep, {"assets_dir": assets})
    assert m.call_count == 1


def test_edited_plan_recompiles(tmp_path):
    assets = _assets(tmp_path)
    ep = _ep(tmp_path, [_scene()])
    cfg = {"assets_dir": assets}
    with mock.patch.object(sr, "compile_scene_plan",
                           side_effect=_fake_compile) as m:
        sr.run(ep, cfg)
        assert m.call_count == 1
        _ep(tmp_path, [_scene(params={"title": "Changed"})])
        sr.run(ep, cfg)
        assert m.call_count == 2


def test_replaced_asset_recompiles(tmp_path):
    assets = _assets(tmp_path)
    ep = _ep(tmp_path, [_scene()])
    cfg = {"assets_dir": assets}
    with mock.patch.object(sr, "compile_scene_plan",
                           side_effect=_fake_compile) as m:
        sr.run(ep, cfg)
        assert m.call_count == 1
        _assets(tmp_path, payload=b"fake-jpeg-v2-with-different-size")
        sr.run(ep, cfg)
        assert m.call_count == 2


def test_force_recompiles(tmp_path):
    assets = _assets(tmp_path)
    ep = _ep(tmp_path, [_scene()])
    cfg = {"assets_dir": assets}
    with mock.patch.object(sr, "compile_scene_plan",
                           side_effect=_fake_compile) as m:
        sr.run(ep, cfg)
        sr.run(ep, cfg, force=True)
    assert m.call_count == 2
