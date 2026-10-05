"""Timeline: scenes, transitions, and the ffmpeg renderer."""

import os
import subprocess
from dataclasses import dataclass

import numpy as np

from . import easing
from .plugins import transition_registry


@dataclass
class Config:
    w: int = 1280
    h: int = 720
    fps: int = 30


class Scene:
    """Anything with a duration that can render frame t (seconds) -> RGB array."""

    def __init__(self, duration, cfg=None):
        self.duration = float(duration)
        self.cfg = cfg

    def frame(self, t):
        raise NotImplementedError


class Movie:
    """A sequence of scenes joined by transitions, rendered to mp4."""

    def __init__(self, cfg=None, progress_bar=False, bar_color=(255, 176, 66)):
        self.cfg = cfg or Config()
        self.scenes = []
        self.transitions = []  # one (fn, dur) per boundary; first scene has none
        self.progress_bar = progress_bar
        self.bar_color = bar_color

    def add(self, scene, transition="crossfade", trans_dur=0.6):
        if scene.cfg is None:
            scene.cfg = self.cfg
        self.scenes.append(scene)
        if len(self.scenes) == 1:
            self.transitions.append((None, 0.0))
        else:
            if transition in (None, "cut"):
                fn = None
            else:
                try:
                    fn = transition_registry.get(transition)
                except KeyError:
                    raise ValueError(f"unknown transition: {transition!r}")
            self.transitions.append((fn, float(trans_dur)))
        return self

    # -- timeline math ----------------------------------------------------

    def _starts(self):
        starts, t = [], 0.0
        for i, scene in enumerate(self.scenes):
            starts.append(t)
            t += scene.duration
            if i < len(self.scenes) - 1:
                t -= self.transitions[i + 1][1]
        return starts

    def total_duration(self):
        starts = self._starts()
        return starts[-1] + self.scenes[-1].duration if self.scenes else 0.0

    def frame_at(self, t):
        total = self.total_duration()
        t = min(max(t, 0.0), total - 1e-6)
        starts = self._starts()
        i = 0
        for j, s in enumerate(starts):
            if t >= s:
                i = j
        scene = self.scenes[i]
        local = t - starts[i]

        # inside a transition into the next scene?
        if i < len(self.scenes) - 1:
            fn, dur = self.transitions[i + 1]
            t_next = starts[i + 1]
            if t >= t_next and fn is not None and dur > 0:
                k = easing.smooth((t - t_next) / dur)
                a = scene.frame(local)
                b = self.scenes[i + 1].frame(t - t_next)
                frame = fn(a, b, k)
                return self._decorate(frame, t, total)
        frame = scene.frame(local)
        return self._decorate(frame, t, total)

    def _decorate(self, frame, t, total):
        if self.progress_bar and total > 0:
            h, w = frame.shape[:2]
            bh = max(3, h // 180)
            bw = int(w * (t / total))
            frame = frame.copy()
            frame[h - bh:, :bw] = self.bar_color
        return frame

    # -- rendering --------------------------------------------------------

    def render(self, path, audio=None, crf=18, preset="medium", quiet=False):
        w, h, fps = self.cfg.w, self.cfg.h, self.cfg.fps
        total = self.total_duration()
        n_frames = int(round(total * fps))
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)

        cmd = ["ffmpeg", "-y",
               "-f", "rawvideo", "-pix_fmt", "rgb24",
               "-s", f"{w}x{h}", "-r", str(fps), "-i", "-"]
        if audio:
            cmd += ["-i", audio, "-shortest"]
        else:
            cmd += ["-an"]
        cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p",
                "-crf", str(crf), "-preset", preset,
                "-movflags", "+faststart"]
        if audio:
            cmd += ["-c:a", "aac", "-b:a", "160k"]
        cmd.append(path)

        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE,
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            for n in range(n_frames):
                frame = self.frame_at(n / fps)
                proc.stdin.write(frame.tobytes())
                if not quiet and n % 60 == 0:
                    print(f"  frame {n}/{n_frames} ({n / n_frames:.0%})", flush=True)
        finally:
            proc.stdin.close()
            proc.wait()
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg failed with code {proc.returncode}")
        size_mb = os.path.getsize(path) / 1e6
        if not quiet:
            print(f"wrote {path} — {total:.1f}s, {n_frames} frames, {size_mb:.1f} MB")
        return path
