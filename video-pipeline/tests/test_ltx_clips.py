"""LTX clips: fingerprinting + skip-if-fresh (backend stubbed)."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ltx_clips as lc


def _ep(tmp_path, scenes):
    ep = tmp_path / "episodes" / "ep"
    (ep / "images").mkdir(parents=True)
    (ep / "images" / "base.jpg").write_bytes(b"base-bytes")
    plan = {"version": 1, "episode": "ep", "scenes": scenes}
    (ep / "scene_plan.json").write_text(json.dumps(plan), encoding="utf-8")
    return str(ep)


def _vid(sid="sea", **kw):
    s = {"id": sid, "slide": "vidslide",
         "params": {"src": f"clips/{sid}.mp4"},
         "duration_sec": 10.0, "turns": [0, 0],
         "anim_prompt": "open ocean at dawn, mist",
         "base_image": "images/base.jpg"}
    s.update(kw)
    return s


def test_fingerprint_stable_and_sensitive(tmp_path, monkeypatch):
    monkeypatch.setattr(lc, "ROOT", str(tmp_path))
    ep = _ep(tmp_path, [_vid()])
    plan = os.path.join(ep, "scene_plan.json")
    jobs1 = lc.clip_jobs(plan, ep)
    jobs2 = lc.clip_jobs(plan, ep)
    assert jobs1[0][2] == jobs2[0][2]
    assert jobs1[0][0] == "sea" and len(jobs1[0][2]) == 12
    ep2 = _ep(tmp_path / "x", [_vid(anim_prompt="desert at noon")])
    assert lc.clip_jobs(os.path.join(ep2, "scene_plan.json"), ep2)[0][2] != jobs1[0][2]


def test_skip_if_fresh_never_calls_backend(tmp_path, monkeypatch):
    monkeypatch.setattr(lc, "ROOT", str(tmp_path))
    monkeypatch.setattr(lc, "auth_token", lambda: "x")
    ep = _ep(tmp_path, [_vid()])
    calls = []

    def fake_post(req, token, timeout=1800):
        calls.append(req)
        src = os.path.join(ep, "fake_src.mp4")
        open(src, "wb").write(b"0" * 2048)
        return {"video_path": src}

    lc.render("ep", _post=fake_post)
    assert len(calls) == 1
    man = json.load(open(os.path.join(ep, "clips", "ltx_manifest.json")))
    assert man["clips"]["sea"]["fingerprint"]
    lc.render("ep", _post=fake_post)  # unchanged -> reuse
    assert len(calls) == 1


def test_prompt_change_rerenders(tmp_path, monkeypatch):
    monkeypatch.setattr(lc, "ROOT", str(tmp_path))
    monkeypatch.setattr(lc, "auth_token", lambda: "x")
    ep = _ep(tmp_path, [_vid()])
    calls = []

    def fake_post(req, token, timeout=1800):
        calls.append(req)
        src = os.path.join(ep, "fake_src.mp4")
        open(src, "wb").write(b"0" * 2048)
        return {"video_path": src}

    lc.render("ep", _post=fake_post)
    plan_p = os.path.join(ep, "scene_plan.json")
    plan = json.load(open(plan_p))
    plan["scenes"][0]["anim_prompt"] = "open ocean at dusk, fog"
    json.dump(plan, open(plan_p, "w"))
    lc.render("ep", _post=fake_post)
    assert len(calls) == 2


def test_missing_anim_prompt_skipped(tmp_path, monkeypatch):
    monkeypatch.setattr(lc, "ROOT", str(tmp_path))
    s = _vid()
    del s["anim_prompt"]
    ep = _ep(tmp_path, [s])
    assert lc.clip_jobs(os.path.join(ep, "scene_plan.json"), ep) == []
