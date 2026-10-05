"""Pre-rendered video-clip scene for the slideforge pipeline.

Restores the old beats.json pipeline's ``vid`` beats (LTX clips rendered on
the 5090 and dropped into ``clips/``) inside deterministic scene plans: the
plan names a finished clip, the compiler fail-fasts on a missing file or a
duration mismatch, and frames are served from a disk-backed decode so even a
40-second clip never holds gigabytes of RGB in RAM.

Lives in video-pipeline (not slideforge/) so Munish's animation library stays
pristine -- this is pipeline glue, same as compile_scene_plan.py.
"""

import os
import subprocess
import sys
import tempfile

_HERE = os.path.dirname(os.path.abspath(__file__))
_SLIDEFORGE = os.path.normpath(os.path.join(_HERE, os.pardir, "slideforge"))
if _SLIDEFORGE not in sys.path:
    sys.path.insert(0, _SLIDEFORGE)

import numpy as np  # noqa: E402

from slideforge.timeline import Scene  # noqa: E402


# The old pipeline's rule, kept: a clip whose duration doesn't match the
# scene's is a plan bug, never something to time-stretch silently.
DURATION_TOLERANCE_SEC = 1.0


def _ffprobe_duration(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path], text=True)
    return float(out.strip())


class ClipScene(Scene):
    """A scene whose frames come from a pre-rendered video file.

    ``src`` is an absolute path (compile_scene_plan resolves the plan's
    repo-relative ``src`` against the assets dir, like images). ``duration``
    is the scene length in seconds and must match the clip's own duration
    within DURATION_TOLERANCE_SEC -- mismatch raises ValueError, which the
    compiler turns into a PlanError before any frame renders.
    """

    def __init__(self, src, duration, cfg=None):
        super().__init__(duration, cfg)
        if not isinstance(src, str) or not os.path.isfile(src):
            raise ValueError(f"clip not found: {src!r}")
        self.src = src
        try:
            clip_dur = _ffprobe_duration(src)
        except (subprocess.CalledProcessError, ValueError) as e:
            raise ValueError(f"cannot probe clip {src!r}: {e}")
        if abs(clip_dur - float(duration)) > DURATION_TOLERANCE_SEC:
            raise ValueError(
                f"clip {src!r} is {clip_dur:.2f}s but the scene wants "
                f"{float(duration):.2f}s "
                f"(tolerance {DURATION_TOLERANCE_SEC}s); "
                f"conform the clip first: "
                f"python conform_clip.py {src!r} <frames> <out.mp4>")
        self._mm = None
        self._n_frames = 0
        self._tmp = None

    def _ensure_decoded(self):
        if self._mm is not None:
            return
        cfg = self.cfg
        if cfg is None:
            raise RuntimeError("ClipScene.frame() called before cfg was set")
        w, h, fps = int(cfg.w), int(cfg.h), int(cfg.fps)
        fd, tmp = tempfile.mkstemp(prefix="clipscene-", suffix=".raw")
        os.close(fd)
        self._tmp = tmp
        # Cover-fit, like the old pipeline's Ken Burns treatment of stills:
        # scale up to fill the frame, then center-crop.
        vf = (f"scale={w}:{h}:force_original_aspect_ratio=increase,"
              f"crop={w}:{h},fps={fps}")
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", self.src,
             "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", tmp],
            check=True)
        frame_bytes = w * h * 3
        n_actual = os.path.getsize(tmp) // frame_bytes
        if n_actual == 0:
            raise RuntimeError(
                f"clip decode produced no frames: {self.src!r}")
        self._n_frames = n_actual
        self._mm = np.memmap(tmp, dtype=np.uint8, mode="r",
                             shape=(n_actual, h, w, 3))

    def frame(self, t):
        self._ensure_decoded()
        fps = int(self.cfg.fps)
        idx = max(0, min(int(t * fps), self._n_frames - 1))
        # Copy: callers (overlays, transitions) may draw on the array, and
        # the memmap view is read-only.
        return np.array(self._mm[idx], copy=True)

    def cleanup(self):
        """Release the decode temp file. Called after render."""
        try:
            if self._mm is not None:
                del self._mm
                self._mm = None
        finally:
            if self._tmp and os.path.exists(self._tmp):
                os.unlink(self._tmp)
                self._tmp = None
