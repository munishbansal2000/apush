"""Verify stage: cfg-driven dims, stream/audio/black gates."""
import json
import os
import subprocess
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from stages import verify  # noqa: E402


def _av(path, width=320, height=180, seconds=5, silent=False):
    a_src = ("anullsrc=r=44100:cl=stereo" if silent
             else "sine=frequency=440")
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error",
         "-f", "lavfi", "-i",
         f"testsrc=size={width}x{height}:rate=30:duration={seconds}",
         "-f", "lavfi", "-i", f"{a_src}:duration={seconds}",
         "-c:v", "libx264", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-shortest", path],
        check=True)


def test_verify_passes_matching_cfg(tmp_path):
    ep = tmp_path / "ep"
    (ep / "work").mkdir(parents=True)
    final = str(ep / "final.mp4")
    _av(final)
    cfg = {"width": 320, "height": 180, "total": 5.0}
    out = verify.run(str(ep), cfg, final)
    assert json.load(open(out))["ok"] is True


def test_verify_rejects_wrong_dims(tmp_path):
    ep = tmp_path / "ep"
    (ep / "work").mkdir(parents=True)
    final = str(ep / "final.mp4")
    _av(final)
    with pytest.raises(RuntimeError, match="bad video dims"):
        verify.run(str(ep), {"width": 1920, "height": 1080}, final)


def test_verify_rejects_silent_audio(tmp_path):
    ep = tmp_path / "ep"
    (ep / "work").mkdir(parents=True)
    final = str(ep / "final.mp4")
    _av(final, silent=True)
    with pytest.raises(RuntimeError, match="silent"):
        verify.run(str(ep), {"width": 320, "height": 180}, final)
