from __future__ import annotations

import json
import subprocess
from pathlib import Path

from .common import PipelineError
from .tts import wav_duration


def _probe(path: Path) -> dict:
    command = ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)]
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError) as exc:
        raise PipelineError(f"ffprobe failed for {path}: {exc}") from exc


def validate_output(manifest: dict, output: Path, audio_dir: Path, preview: bool = False) -> dict:
    if not output.is_file() or output.stat().st_size < 1_000:
        raise PipelineError(f"rendered MP4 is missing or suspiciously small: {output}")
    probe = _probe(output)
    streams = probe.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    if not video or not audio:
        raise PipelineError("final MP4 must contain both video and audio streams")
    expected_width, expected_height = ((720, 1280) if preview else (1080, 1920))
    if (video.get("width"), video.get("height")) != (expected_width, expected_height):
        raise PipelineError(f"final resolution is {video.get('width')}x{video.get('height')}; expected {expected_width}x{expected_height}")
    transition = float(manifest.get("video", {}).get("transition_seconds", 0.2))
    expected = sum(wav_duration(audio_dir / f"{scene['id']}.wav") for scene in manifest["scenes"]) - transition * max(0, len(manifest["scenes"]) - 1)
    actual = float(probe.get("format", {}).get("duration", 0))
    if abs(actual - expected) > max(1.0, expected * 0.02):
        raise PipelineError(f"final duration {actual:.2f}s differs from audio timeline {expected:.2f}s")
    black = subprocess.run(["ffmpeg", "-v", "info", "-i", str(output), "-vf", "blackdetect=d=0.75:pix_th=0.05", "-an", "-f", "null", "-"], capture_output=True, text=True)
    black_lines = [line.strip() for line in black.stderr.splitlines() if "black_start:" in line]
    if black_lines:
        raise PipelineError("final video contains a black segment of at least 0.75s: " + black_lines[0])
    return {"duration": actual, "width": video["width"], "height": video["height"], "video_codec": video.get("codec_name"), "audio_codec": audio.get("codec_name"), "size_bytes": output.stat().st_size}
