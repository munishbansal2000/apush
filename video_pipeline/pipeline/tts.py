from __future__ import annotations

import base64
import asyncio
import json
import urllib.error
import urllib.request
import wave
from pathlib import Path

from .common import PipelineError, atomic_json, canonical_hash, resolve_local


def health(server_url: str, timeout: int = 10) -> dict:
    try:
        with urllib.request.urlopen(server_url.rstrip("/") + "/health", timeout=timeout) as response:
            value = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise PipelineError(f"Fish TTS server unavailable at {server_url}: {exc}\nStart it with:\n  & \"C:\\Users\\munis\\projects\\fish_exmple\\.venv\\Scripts\\python.exe\" tools\\render_audio.py --serve") from exc
    if value.get("status") != "ok":
        raise PipelineError(f"Fish TTS health check failed: {value}")
    return value


def wav_duration(path: Path) -> float:
    try:
        with wave.open(str(path), "rb") as handle:
            return handle.getnframes() / handle.getframerate()
    except (wave.Error, OSError, ZeroDivisionError) as exc:
        raise PipelineError(f"invalid WAV file {path}: {exc}") from exc


def render_edge(text: str, out: Path, voice: str, rate: str,
                pitch: str) -> tuple[float, list[dict]]:
    try:
        import edge_tts
    except ImportError as exc:
        raise PipelineError("Edge POC mode requires edge-tts: pip install edge-tts") from exc
    out.parent.mkdir(parents=True, exist_ok=True)
    temp_mp3 = out.with_name(f".{out.stem}.edge.tmp.mp3")
    temp_wav = out.with_name(f".{out.stem}.edge.tmp.wav")

    async def synthesize():
        boundaries = []
        with temp_mp3.open("wb") as handle:
            async for chunk in edge_tts.Communicate(
                    text, voice, rate=rate, pitch=pitch).stream():
                if chunk["type"] == "audio":
                    handle.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    boundaries.append({
                        "text": chunk["text"],
                        "offset": chunk["offset"] / 10_000_000,
                        "duration": chunk["duration"] / 10_000_000
                    })
        return boundaries
    try:
        boundaries = asyncio.run(synthesize())
        import subprocess
        result = subprocess.run([
            "ffmpeg", "-y", "-v", "error", "-i", str(temp_mp3),
            "-ac", "1", "-ar", "24000", str(temp_wav)
        ], capture_output=True, text=True)
        if result.returncode != 0:
            raise PipelineError(f"ffmpeg could not convert Edge audio: {result.stderr.strip()[-1000:]}")
        temp_wav.replace(out)
        return wav_duration(out), boundaries
    except PipelineError:
        raise
    except Exception as exc:
        raise PipelineError(f"Edge TTS failed: {type(exc).__name__}: {exc}") from exc
    finally:
        for temporary in (temp_mp3, temp_wav):
            if temporary.exists():
                temporary.unlink()


def render_scene(manifest: dict, scene: dict, manifest_path: Path, repo_root: Path, out: Path, force: bool = False) -> dict:
    base = manifest["tts"]
    narration = scene["narration"]
    engine = base.get("engine", "fish")
    ref_audio = ref_text_path = None
    ref_text = ""
    if engine == "fish":
        ref_audio = resolve_local(narration.get("reference_audio", base["reference_audio"]), manifest_path.parent, repo_root)
        ref_text_path = resolve_local(narration.get("reference_text", base["reference_text"]), manifest_path.parent, repo_root)
        ref_text = ref_text_path.read_text(encoding="utf-8").strip()
    settings = {**base.get("settings", {}), **narration.get("settings", {})}
    fingerprint = canonical_hash({
        "engine": engine, "text": narration["text"],
        "ref_audio": str(ref_audio or ""), "ref_text": ref_text,
        "settings": settings, "edge_voice": base.get("edge_voice"),
        "edge_rate": base.get("edge_rate"), "edge_pitch": base.get("edge_pitch")
    })
    meta_path = out.with_suffix(".json")
    if not force and out.exists() and meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        if meta.get("fingerprint") == fingerprint:
            return meta
    if engine == "edge":
        duration, word_boundaries = render_edge(
            narration["text"], out,
            base.get("edge_voice", "en-US-GuyNeural"),
            base.get("edge_rate", "+0%"), base.get("edge_pitch", "+0Hz"))
        if duration < float(scene.get("min_duration", 0.5)):
            raise PipelineError(f"TTS for scene {scene['id']} is only {duration:.2f}s")
        meta = {"scene_id": scene["id"], "fingerprint": fingerprint,
                "duration": duration, "engine": "edge", "sample_rate": 24000,
                "word_boundaries": word_boundaries}
        atomic_json(meta_path, meta)
        return meta
    payload = {"text": narration["text"], "ref_wav": str(ref_audio), "ref_text": ref_text, "settings": settings}
    request = urllib.request.Request(base["server_url"].rstrip("/") + "/synthesize", data=json.dumps(payload).encode("utf-8"), method="POST", headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=int(base.get("timeout_seconds", 600))) as response:
            value = json.loads(response.read().decode("utf-8"))
        audio = base64.b64decode(value["audio_base64"], validate=True)
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError, KeyError, ValueError) as exc:
        raise PipelineError(f"TTS failed for scene {scene['id']}: {exc}") from exc
    out.parent.mkdir(parents=True, exist_ok=True)
    temp = out.with_name(f".{out.name}.tmp")
    temp.write_bytes(audio)
    temp.replace(out)
    duration = wav_duration(out)
    if duration < float(scene.get("min_duration", 0.5)):
        raise PipelineError(f"TTS for scene {scene['id']} is only {duration:.2f}s")
    meta = {"scene_id": scene["id"], "fingerprint": fingerprint,
            "duration": duration, "engine": "fish",
            "sample_rate": value.get("sample_rate")}
    atomic_json(meta_path, meta)
    return meta
