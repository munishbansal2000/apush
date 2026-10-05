import json
import os
import sys
from unittest import mock

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from stages import clips  # noqa: E402

PROMPT = "Smoke curls above the harbor."


def _beat(bid="b01", kind="kb", dur=10.0, image="ship", prompt=PROMPT, **kw):
    b = {"id": bid, "kind": kind, "dur": dur, "image": image,
         "anim_prompt": prompt}
    b.update(kw)
    return b


def _ep(tmp_path, beats, stills=("ship",), cfg_extra=None):
    ep = str(tmp_path)
    os.makedirs(os.path.join(ep, "work"), exist_ok=True)
    with open(os.path.join(ep, "work", "beats_resolved.json"), "w",
              encoding="utf-8") as f:
        json.dump({"beats": beats, "meta": {}}, f)
    imgs = {}
    for key in stills:
        still = os.path.join(ep, f"{key}.jpg")
        with open(still, "wb") as f:
            f.write(b"fake-jpeg")
        imgs[key] = {"file": f"{key}.jpg"}
    with open(os.path.join(ep, "images.json"), "w", encoding="utf-8") as f:
        json.dump({"images": imgs}, f)
    cfg = {"episode": "t"}
    if cfg_extra:
        cfg.update(cfg_extra)
    return ep, cfg


def _fake_run(cmds):
    """Pretend every subprocess succeeds, materializing .mp4 outputs."""

    def fake(cmd, label):
        cmds.append((label, [str(c) for c in cmd]))
        for arg in cmd:
            arg = str(arg)
            if arg.endswith(".mp4"):
                parent = os.path.dirname(arg)
                if parent:
                    os.makedirs(parent, exist_ok=True)
                with open(arg, "wb") as f:
                    f.write(b"fake-mp4")

    return fake


def _resolved(ep):
    with open(os.path.join(ep, "work", "beats_resolved.json"),
              encoding="utf-8") as f:
        return json.load(f)["beats"]


def _images(ep):
    with open(os.path.join(ep, "images.json"), encoding="utf-8") as f:
        return json.load(f)["images"]


def test_none_provider_missing_clip_skips_for_kb_fallback(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat()])
    with mock.patch.object(clips, "_run") as run_mock:
        records = clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)
    run_mock.assert_not_called()
    assert records[0]["ready"] is False
    assert "no provider" in records[0]["skipped"]


def test_existing_clip_is_reused(tmp_path):
    # valid clip + (no provenance yet): kept, fingerprint adopted.
    ep, cfg = _ep(tmp_path, [_beat()],
                  cfg_extra={"clip_generation": {"provider": "ltx"}})
    os.makedirs(os.path.join(ep, "clips"), exist_ok=True)
    open(os.path.join(ep, "clips", "b01.mp4"), "wb").write(b"manual")
    with mock.patch.object(clips, "_run") as run_mock, \
            mock.patch.object(clips, "_ffprobe_duration",
                              return_value=10.0):
        records = clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)
    run_mock.assert_not_called()
    assert records[0]["provider"] == "existing"
    assert records[0]["ready"] is True


def test_force_regenerates_existing_clip(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat()],
                  cfg_extra={"clip_generation": {"provider": "ltx"}})
    os.makedirs(os.path.join(ep, "clips"), exist_ok=True)
    open(os.path.join(ep, "clips", "b01.mp4"), "wb").write(b"manual")
    cmds = []
    with mock.patch.object(clips, "_run", side_effect=_fake_run(cmds)), \
            mock.patch.object(clips, "_ffprobe_duration", return_value=10.0):
        clips.generate_clips(_resolved(ep), _images(ep), ep, cfg, force=True)
    assert any("animate_still.py" in " ".join(c) for _, c in cmds)


def test_ltx_routing_extend_and_manifest(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat()],
                  cfg_extra={"clip_generation": {"provider": "ltx"}})
    cmds = []
    with mock.patch.object(clips, "_run", side_effect=_fake_run(cmds)), \
            mock.patch.object(clips, "_ffprobe_duration", return_value=10.0):
        records = clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)
    joined = [" ".join(c) for _, c in cmds]
    gen = next(c for c in joined if "animate_still.py" in c)
    assert "--duration 6.0" in gen and "--seed 42" in gen
    assert PROMPT in gen
    assert any("-stream_loop" in c for c in joined)  # 10s beat: extend
    assert os.path.exists(os.path.join(ep, "clips", "b01.mp4"))
    rec = records[0]
    assert (rec["provider"], rec["actual_seconds"], rec["ready"]) == \
        ("ltx", 10.0, True)
    assert rec["image"] == "ship.jpg" and rec["prompt"] == PROMPT


def test_ltx_short_beat_skips_extension(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat(dur=5.0)],
                  cfg_extra={"clip_generation": {"provider": "ltx"}})
    cmds = []
    with mock.patch.object(clips, "_run", side_effect=_fake_run(cmds)), \
            mock.patch.object(clips, "_ffprobe_duration", return_value=5.0):
        clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)
    assert not any("-stream_loop" in " ".join(c) for _, c in cmds)
    assert os.path.exists(os.path.join(ep, "clips", "b01.mp4"))


def test_per_beat_provider_and_seed_override(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat(provider="ltx", seed=7)])
    cmds = []
    with mock.patch.object(clips, "_run", side_effect=_fake_run(cmds)), \
            mock.patch.object(clips, "_ffprobe_duration", return_value=10.0):
        records = clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)
    assert any("--seed 7" in " ".join(c) for _, c in cmds)
    assert records[0]["seed"] == 7


def test_fallback_provider_after_ltx_failure(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat(fallback_provider="meta-ui")],
                  cfg_extra={"clip_generation": {"provider": "ltx"}})

    def fake_meta(image, prompt, output, seconds, config):
        with open(output, "wb") as f:
            f.write(b"fake-meta")

    with mock.patch.object(clips, "_generate_ltx",
                           side_effect=RuntimeError("boom")), \
            mock.patch.object(clips, "_generate_meta",
                              side_effect=fake_meta) as meta_mock, \
            mock.patch.object(clips, "_ffprobe_duration", return_value=10.0):
        records = clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)
    meta_mock.assert_called_once()
    assert records[0]["provider"] == "meta-ui"
    assert records[0]["fallback_from"] == "ltx"


def test_safety_rejection_blocks_generation(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat(prompt="Soldiers march.")],
                  cfg_extra={"clip_generation": {"provider": "ltx"}})
    with mock.patch.object(clips, "_run") as run_mock:
        with pytest.raises(RuntimeError, match="rejected"):
            clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)
    run_mock.assert_not_called()


def test_short_output_is_an_error(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat()],
                  cfg_extra={"clip_generation": {"provider": "ltx"}})
    cmds = []
    with mock.patch.object(clips, "_run", side_effect=_fake_run(cmds)), \
            mock.patch.object(clips, "_ffprobe_duration", return_value=2.0):
        with pytest.raises(RuntimeError, match="only 2.00s"):
            clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)


def test_missing_kb_still_is_an_error(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat(image="ghost")],
                  cfg_extra={"clip_generation": {"provider": "ltx"}})
    with pytest.raises(RuntimeError, match="still"):
        clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)


def test_non_kb_without_still_skips(tmp_path):
    beat = _beat(kind="vid")
    del beat["image"]
    ep, cfg = _ep(tmp_path, [beat],
                  cfg_extra={"clip_generation": {"provider": "ltx"}})
    with mock.patch.object(clips, "_run") as run_mock:
        records = clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)
    run_mock.assert_not_called()
    assert "no still" in records[0]["skipped"]


def test_anim_image_override_is_used(tmp_path):
    still = os.path.join(str(tmp_path), "custom.png")
    open(still, "wb").write(b"fake-png")
    beat = _beat(kind="vid", anim_image="custom.png")
    del beat["image"]
    ep, cfg = _ep(tmp_path, [beat],
                  cfg_extra={"clip_generation": {"provider": "ltx"}})
    cmds = []
    with mock.patch.object(clips, "_run", side_effect=_fake_run(cmds)), \
            mock.patch.object(clips, "_ffprobe_duration", return_value=10.0):
        records = clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)
    assert any("custom.png" in " ".join(c) for _, c in cmds)
    assert records[0]["image"] == "custom.png"


def test_unknown_provider_is_an_error(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat()],
                  cfg_extra={"clip_generation": {"provider": "sora"}})
    with pytest.raises(RuntimeError, match="unsupported"):
        clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)


def test_desktop_provider_is_routed(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat()],
                  cfg_extra={"clip_generation": {"provider": "ltx-desktop"}})

    def fake_desktop(image, prompt, output, seconds, seed, config):
        with open(output, "wb") as f:
            f.write(b"fake-desktop")

    with mock.patch.object(clips, "_generate_desktop",
                           side_effect=fake_desktop) as mock_desktop, \
            mock.patch.object(clips, "_ffprobe_duration", return_value=10.0):
        records = clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)
    mock_desktop.assert_called_once()
    assert records[0]["provider"] == "ltx-desktop"


def test_desktop_backend_imports():
    from stages import clips as clips_mod

    if clips_mod._REPO_ROOT not in sys.path:
        sys.path.insert(0, clips_mod._REPO_ROOT)
    from video_pipeline.pipeline import ltx_desktop  # noqa: F401
    assert callable(ltx_desktop.generate)


def test_run_writes_manifest(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat(), _beat(bid="b02")])
    out = clips.run(ep, cfg)
    man = json.load(open(os.path.join(out, "MANIFEST.json"), encoding="utf-8"))
    assert [r["beat"] for r in man] == ["b01", "b02"]
    assert all("provider" in r and "ready" in r for r in man)


def test_pipeline_wires_clips_stage():
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))
    import pipeline

    assert pipeline.STAGES.index("clips") == \
        pipeline.STAGES.index("anim") + 1
    assert "clips" in pipeline.RENDERERS["legacy"]
    # slideforge path generates anim_prompt clips after the plan exists
    # (direct) and before the render consumes them (slideforge_render)
    sf = pipeline.RENDERERS["slideforge"]
    assert sf.index("direct") < sf.index("clips") < sf.index(
        "slideforge_render")

def test_changed_prompt_regenerates_clip(tmp_path):
    # stale fingerprint: the clip file exists, but the MANIFEST records an
    # older prompt -> the provider must run again instead of reusing it.
    ep, cfg = _ep(tmp_path, [_beat()],
                  cfg_extra={"clip_generation": {"provider": "ltx"}})
    os.makedirs(os.path.join(ep, "clips"), exist_ok=True)
    open(os.path.join(ep, "clips", "b01.mp4"), "wb").write(b"stale")
    with open(os.path.join(ep, "clips", "MANIFEST.json"), "w",
              encoding="utf-8") as f:
        json.dump([{"beat": "b01", "prompt": "Old prompt.", "seed": 42,
                    "seconds": 10.0, "image": "ship.jpg", "ready": True,
                    "provider": "ltx"}], f)
    cmds = []
    with mock.patch.object(clips, "_run", side_effect=_fake_run(cmds)), \
            mock.patch.object(clips, "_ffprobe_duration", return_value=10.0):
        clips.run(ep, cfg)
    assert any("animate_still.py" in " ".join(c) for _, c in cmds)


def test_unprobeable_clip_is_rebuilt(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat()],
                  cfg_extra={"clip_generation": {"provider": "ltx"}})
    os.makedirs(os.path.join(ep, "clips"), exist_ok=True)
    open(os.path.join(ep, "clips", "b01.mp4"), "wb").write(b"corrupt")
    cmds = []
    with mock.patch.object(clips, "_run", side_effect=_fake_run(cmds)), \
            mock.patch.object(clips, "_ffprobe_duration",
                              side_effect=[OSError("nope"), 10.0]):
        records = clips.generate_clips(_resolved(ep), _images(ep), ep, cfg)
    assert any("animate_still.py" in " ".join(c) for _, c in cmds)
    assert records[0]["provider"] == "ltx"


def test_matching_manifest_skips_generation(tmp_path):
    ep, cfg = _ep(tmp_path, [_beat()],
                  cfg_extra={"clip_generation": {"provider": "ltx"}})
    os.makedirs(os.path.join(ep, "clips"), exist_ok=True)
    open(os.path.join(ep, "clips", "b01.mp4"), "wb").write(b"fresh")
    with open(os.path.join(ep, "clips", "MANIFEST.json"), "w",
              encoding="utf-8") as f:
        json.dump([{"beat": "b01", "prompt": PROMPT, "seed": 42,
                    "seconds": 10.0, "image": "ship.jpg", "ready": True,
                    "provider": "ltx"}], f)
    with mock.patch.object(clips, "_run") as run_mock, \
            mock.patch.object(clips, "_ffprobe_duration", return_value=10.0):
        out = clips.run(ep, cfg)
    run_mock.assert_not_called()
    man = json.load(open(os.path.join(out, "MANIFEST.json"),
                         encoding="utf-8"))
    assert man[0]["provider"] == "existing"
    assert man[0]["ready"] is True
