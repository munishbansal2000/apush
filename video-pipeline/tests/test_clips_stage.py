"""Scene-plan clips stage: master render + exact-frame conform (no GPU)."""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from stages import clips as clips_stage


def _mk_src(path):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
                    "-i", "testsrc=size=320x180:rate=24:duration=1",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", path],
                   check=True)


def _ep(tmp_path):
    ep = tmp_path / "ep"
    (ep / "images").mkdir(parents=True)
    (ep / "images" / "base.jpg").write_bytes(b"base-bytes")
    plan = {"version": 1, "episode": "ep", "scenes": [
        {"id": "sea", "slide": "vidslide",
         "params": {"src": "clips/sea.mp4"},
         "duration_sec": 2.0, "turns": [0, 0],
         "anim_prompt": "open ocean at dawn, mist",
         "base_image": "images/base.jpg"},
        {"id": "title", "slide": "titlecard",
         "params": {"title": "Hi"}, "duration_sec": 3.0,
         "turns": [1, 1]},
    ]}
    (ep / "scene_plan.json").write_text(json.dumps(plan), encoding="utf-8")
    return str(ep)


def _frames(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "packet=pts", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True).stdout
    return len([l for l in out.splitlines() if l.strip()])


def test_conforms_to_exact_scene_frames(tmp_path):
    ep = _ep(tmp_path)
    src = os.path.join(ep, "fake_src.mp4")
    _mk_src(src)
    calls = []

    def fake_post(req, token, timeout=1800):
        calls.append(req)
        assert req["imagePath"].endswith("base.jpg")
        return {"video_path": src}

    import ltx_clips
    real_token = ltx_clips.auth_token
    ltx_clips.auth_token = lambda: "x"
    try:
        clips_stage.run_from_scene_plan(
            ep, {"clip_generation": {"provider": "ltx-desktop"}},
            _post=fake_post)
    finally:
        ltx_clips.auth_token = real_token
    out = os.path.join(ep, "clips", "sea.mp4")
    assert _frames(out) == 60  # 2.0s @ 30fps, looped from 1s master
    assert len(calls) == 1
    # second run: everything fresh, backend untouched
    ltx_clips.auth_token = lambda: "x"
    try:
        clips_stage.run_from_scene_plan(
            ep, {"clip_generation": {"provider": "ltx-desktop"}},
            _post=fake_post)
    finally:
        ltx_clips.auth_token = real_token
    assert len(calls) == 1


def _run(ep, fake_post):
    import ltx_clips
    real_token = ltx_clips.auth_token
    ltx_clips.auth_token = lambda: "x"
    try:
        clips_stage.run_from_scene_plan(
            ep, {"clip_generation": {"provider": "ltx-desktop"}},
            _post=fake_post)
    finally:
        ltx_clips.auth_token = real_token


def _sha(path):
    import hashlib
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def test_prompt_change_reconforms_from_new_master(tmp_path):
    ep = _ep(tmp_path)
    src = os.path.join(ep, "fake_src.mp4")
    calls = []

    def fake_post(req, token, timeout=1800):
        calls.append(req)
        # distinct pixels per generation, like a new LTX master
        color = ["red", "blue"][min(len(calls) - 1, 1)]
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
                        "-i", f"color=c={color}:size=320x180:rate=24"
                              ":duration=1",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", src],
                       check=True)
        return {"video_path": src}

    _run(ep, fake_post)
    out = os.path.join(ep, "clips", "sea.mp4")
    first = _sha(out)
    assert _frames(out) == 60
    # unchanged re-run: byte-identical output, backend untouched
    _run(ep, fake_post)
    assert _sha(out) == first
    assert len(calls) == 1
    # prompt change: new master AND rebuilt conformed clip
    plan_p = os.path.join(ep, "scene_plan.json")
    plan = json.load(open(plan_p, encoding="utf-8"))
    plan["scenes"][0]["anim_prompt"] = "open ocean at dusk, fog"
    json.dump(plan, open(plan_p, "w"))
    _run(ep, fake_post)
    assert len(calls) == 2
    assert _frames(out) == 60
    assert _sha(out) != first


def test_none_provider_skips(tmp_path, capsys):
    ep = _ep(tmp_path)
    clips_stage.run_from_scene_plan(ep, {})
    assert "provider=none" in capsys.readouterr().out
    assert not os.path.exists(os.path.join(ep, "clips", "sea.mp4"))


def test_unknown_provider_raises(tmp_path):
    ep = _ep(tmp_path)
    try:
        clips_stage.run_from_scene_plan(
            ep, {"clip_generation": {"provider": "meta-ui"}})
    except RuntimeError as e:
        assert "ltx-desktop" in str(e)
    else:
        raise AssertionError("expected RuntimeError")
