"""Shared fixtures for the slideforge render-stage tests."""
import json
import os
import shutil

import pytest

REPO = os.path.normpath(os.path.join(os.path.dirname(__file__),
                                     os.pardir, os.pardir))
SLIDEFORGE_ASSETS = os.path.join(REPO, "slideforge", "assets")
PIPELINE_ROOT = os.path.join(REPO, "video-pipeline")


@pytest.fixture()
def assets_dir(tmp_path):
    """A tiny hermetic assets dir: one small portrait copied in."""
    d = tmp_path / "assets"
    d.mkdir()
    shutil.copy(
        os.path.join(SLIDEFORGE_ASSETS, "portraits", "frederick_taylor.jpg"),
        d / "taylor.jpg",
    )
    return str(d)


def write_plan(tmp_path, scenes, episode="test-ep"):
    plan = {"version": 1, "episode": episode, "scenes": scenes}
    p = tmp_path / "plan.json"
    p.write_text(json.dumps(plan), encoding="utf-8")
    return str(p)


def ffprobe_duration(path):
    import subprocess
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path], text=True))


def ffprobe_streams(path):
    import json
    import subprocess
    return json.loads(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type",
         "-of", "json", path], text=True))["streams"]
