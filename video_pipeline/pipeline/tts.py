from __future__ import annotations

import base64
import asyncio
import json
import sys
import urllib.error
import urllib.request
import wave
from pathlib import Path

from .common import PipelineError, atomic_json, canonical_hash, resolve_local
from .direction import to_ssml, voice_segments
from .gates import iter_cues
from .timing import _boundary_offset


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


def render_fish_cloud(text: str, model: str, reference_id: str | None,
                      latency: str, timeout: int) -> bytes:
    """Synthesize one segment with the Fish Audio cloud API.

    Auth comes from the user-connected custom.fish-audio credential via the
    surrogate helper; the raw key is never read here. Returns MP3 bytes.
    """
    sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
    from dynamic_credentials import add_surrogate_to_request, read_response_body
    payload: dict = {"text": text, "format": "mp3", "latency": latency}
    if reference_id:
        payload["reference_id"] = reference_id
    request = urllib.request.Request(
        "https://api.fish.audio/v1/tts",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "model": model},
        method="POST")
    add_surrogate_to_request(request, "custom.fish-audio",
                             allowed_hosts=("api.fish.audio",))
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return read_response_body(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read()[:500]
        raise PipelineError(
            f"Fish cloud TTS failed: HTTP {exc.code}: {detail!r}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise PipelineError(f"Fish cloud TTS failed: {exc}") from exc


def _render_fish_cloud(manifest: dict, scene: dict, manifest_path: Path,
                       repo_root: Path, out: Path, force: bool, base: dict,
                       narration: dict, voice_name: str | None, voices: dict,
                       settings: dict, fingerprint: str, meta_path: Path) -> dict:
    """TTS via the Fish Audio cloud API (engine: "fish_cloud").

    Mirrors the resident-server flow: [VOICE:] splits into per-voice
    segments (each using that voice's reference_id when configured),
    rendered separately and stitched with ffmpeg. The cloud API returns no
    word boundaries, so cue timing falls back to proportional positioning.
    """
    import subprocess
    where = f"scene {scene['id']} narration"
    model = settings.get("fish_cloud_model", "s2.1-pro-free")
    latency = settings.get("fish_cloud_latency", "normal")
    timeout = int(base.get("timeout_seconds", 600))
    markers = bool(settings.get("fish_emotion_markers", False))
    segments = [(v or voice_name, t)
                for v, t in voice_segments(narration["text"], where, markers)
                if t.strip()]
    if not segments:
        raise PipelineError(f"{where}: narration is empty")

    def _seg_reference_id(seg_voice):
        scfg = voices.get(seg_voice, {}) if seg_voice else {}
        return (narration.get("reference_id")
                or scfg.get("reference_id")
                or base.get("reference_id"))

    out.parent.mkdir(parents=True, exist_ok=True)
    temp = out.with_name(f".{out.stem}.tmp.wav")
    if len(segments) == 1:
        mp3 = render_fish_cloud(segments[0][1], model,
                                _seg_reference_id(segments[0][0]),
                                latency, timeout)
        part = out.with_name(f".{out.stem}.seg0.tmp.mp3")
        part.write_bytes(mp3)
        parts = [part]
    else:
        parts = []
        for index, (seg_voice, seg_text) in enumerate(segments):
            mp3 = render_fish_cloud(seg_text, model,
                                    _seg_reference_id(seg_voice),
                                    latency, timeout)
            part = out.with_name(f".{out.stem}.seg{index}.tmp.mp3")
            part.write_bytes(mp3)
            parts.append(part)
            print(f"[tts] {scene['id']}: segment {index + 1}/{len(segments)} "
                  f"({seg_voice or 'default voice'})")
    inputs = []
    for part in parts:
        inputs += ["-i", str(part)]
    filt = "".join(f"[{i}:a]" for i in range(len(parts)))
    filt += f"concat=n={len(parts)}:v=0:a=1"
    result = subprocess.run(
        ["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", filt,
         "-ar", "24000", "-ac", "1", str(temp)],
        capture_output=True, text=True)
    for part in parts:
        part.unlink(missing_ok=True)
    if result.returncode != 0:
        raise PipelineError(
            f"ffmpeg could not stitch fish-cloud segments: {result.stderr.strip()[-500:]}")
    temp.replace(out)
    duration = wav_duration(out)
    if duration < float(scene.get("min_duration", 0.5)):
        raise PipelineError(f"TTS for scene {scene['id']} is only {duration:.2f}s")
    meta = {"scene_id": scene["id"], "fingerprint": fingerprint,
            "duration": duration, "engine": "fish_cloud",
            "model": model, "sample_rate": 24000, "word_boundaries": []}
    atomic_json(meta_path, meta)
    return meta


def render_scene(manifest: dict, scene: dict, manifest_path: Path, repo_root: Path, out: Path, force: bool = False) -> dict:
    base = manifest["tts"]
    narration = scene["narration"]
    engine = base.get("engine", "fish")
    voice_name = narration.get("voice")
    voices = base.get("voices") or {}
    if voice_name and voice_name not in voices:
        raise PipelineError(
            f"scene {scene['id']}: narration.voice {voice_name!r} not in tts.voices "
            f"(available: {sorted(voices)})")
    vcfg = voices.get(voice_name, {}) if voice_name else {}
    ref_audio = ref_text_path = None
    ref_text = ""
    if engine == "fish":
        ref_audio = resolve_local(narration.get("reference_audio", vcfg.get("reference_audio", base["reference_audio"])), manifest_path.parent, repo_root)
        ref_text_path = resolve_local(narration.get("reference_text", vcfg.get("reference_text", base["reference_text"])), manifest_path.parent, repo_root)
        ref_text = ref_text_path.read_text(encoding="utf-8").strip()
    settings = {**base.get("settings", {}), **vcfg.get("settings", {}), **narration.get("settings", {})}
    edge_voice = vcfg.get("edge_voice", base.get("edge_voice", "en-US-GuyNeural"))
    edge_rate = vcfg.get("edge_rate", base.get("edge_rate", "+0%"))
    edge_pitch = vcfg.get("edge_pitch", base.get("edge_pitch", "+0Hz"))
    fingerprint = canonical_hash({
        "engine": engine, "text": narration["text"], "voice": voice_name,
        "ref_audio": str(ref_audio or ""), "ref_text": ref_text,
        "settings": settings, "edge_voice": edge_voice,
        "edge_rate": edge_rate, "edge_pitch": edge_pitch,
        "voices": base.get("voices") or {}
    })
    meta_path = out.with_suffix(".json")
    if not force and out.exists() and meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        if meta.get("fingerprint") == fingerprint:
            return meta
    if engine == "edge":
        ssml = to_ssml(narration["text"], f"scene {scene['id']} narration",
                       edge_voice, voices)
        duration, word_boundaries = render_edge(
            ssml, out, edge_voice, edge_rate, edge_pitch)
        if duration < float(scene.get("min_duration", 0.5)):
            raise PipelineError(f"TTS for scene {scene['id']} is only {duration:.2f}s")
        if word_boundaries:
            for where, cue in iter_cues(scene):
                if _boundary_offset(cue, word_boundaries) is None:
                    raise PipelineError(
                        f"TTS cue did not resolve to a word boundary for scene "
                        f"{scene['id']}: {where} {cue!r}; cues must match the "
                        f"spoken words exactly")
        meta = {"scene_id": scene["id"], "fingerprint": fingerprint,
                "duration": duration, "engine": "edge", "sample_rate": 24000,
                "word_boundaries": word_boundaries}
        atomic_json(meta_path, meta)
        return meta
    if engine == "fish_cloud":
        return _render_fish_cloud(manifest, scene, manifest_path, repo_root,
                                  out, force, base, narration, voice_name,
                                  voices, settings, fingerprint, meta_path)
    where = f"scene {scene['id']} narration"
    fish_emotion_markers = bool(settings.get("fish_emotion_markers", False))
    segments = [(v or voice_name, t)
                for v, t in voice_segments(narration["text"], where,
                                           fish_emotion_markers)
                if t.strip()]

    def _seg_refs(seg_voice):
        scfg = voices.get(seg_voice, {}) if seg_voice else vcfg
        ra = resolve_local(
            narration.get("reference_audio", scfg.get("reference_audio", base["reference_audio"])),
            manifest_path.parent, repo_root)
        rtp = resolve_local(
            narration.get("reference_text", scfg.get("reference_text", base["reference_text"])),
            manifest_path.parent, repo_root)
        st = {**base.get("settings", {}), **scfg.get("settings", {}),
              **narration.get("settings", {})}
        return ra, rtp.read_text(encoding="utf-8").strip(), st

    def _fish_wav(text, seg_voice):
        ra, rt, st = _seg_refs(seg_voice)
        payload = {"text": text, "ref_wav": str(ra), "ref_text": rt, "settings": st}
        request = urllib.request.Request(
            base["server_url"].rstrip("/") + "/synthesize",
            data=json.dumps(payload).encode("utf-8"), method="POST",
            headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=int(base.get("timeout_seconds", 600))) as response:
                value = json.loads(response.read().decode("utf-8"))
            return base64.b64decode(value["audio_base64"], validate=True)
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError, KeyError, ValueError) as exc:
            raise PipelineError(f"TTS failed for scene {scene['id']}: {exc}") from exc

    out.parent.mkdir(parents=True, exist_ok=True)
    temp = out.with_name(f".{out.stem}.tmp.wav")
    if len(segments) == 1:
        temp.write_bytes(_fish_wav(segments[0][1], segments[0][0]))
    else:
        import subprocess
        parts = []
        for index, (seg_voice, seg_text) in enumerate(segments):
            part = out.with_name(f".{out.stem}.seg{index}.tmp.wav")
            part.write_bytes(_fish_wav(seg_text, seg_voice))
            parts.append(part)
        inputs = []
        for part in parts:
            inputs += ["-i", str(part)]
        filt = "".join(f"[{i}:a]" for i in range(len(parts)))
        filt += f"concat=n={len(parts)}:v=0:a=1"
        result = subprocess.run(
            ["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", filt, str(temp)],
            capture_output=True, text=True)
        for part in parts:
            part.unlink(missing_ok=True)
        if result.returncode != 0:
            raise PipelineError(f"ffmpeg could not stitch voice segments: {result.stderr.strip()[-500:]}")
    temp.replace(out)
    duration = wav_duration(out)
    if duration < float(scene.get("min_duration", 0.5)):
        raise PipelineError(f"TTS for scene {scene['id']} is only {duration:.2f}s")
    meta = {"scene_id": scene["id"], "fingerprint": fingerprint,
            "duration": duration, "engine": "fish",
            "sample_rate": value.get("sample_rate")}
    atomic_json(meta_path, meta)
    return meta
