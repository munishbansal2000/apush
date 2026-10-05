from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from .common import PipelineError, resolve_local


def _run(command: list[str], label: str) -> None:
    print("$ " + " ".join(command), flush=True)
    try:
        subprocess.run(command, check=True)
    except (OSError, subprocess.CalledProcessError) as exc:
        raise PipelineError(f"{label} failed: {exc}") from exc


def _duration(path: Path) -> float:
    result = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path)
    ], capture_output=True, text=True)
    try:
        return float(result.stdout.strip())
    except ValueError as exc:
        raise PipelineError(f"generated clip is not probeable: {path}") from exc


def _extend_clip(source: Path, output: Path, seconds: float) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    _run([
        "ffmpeg", "-y", "-v", "error", "-stream_loop", "-1",
        "-i", str(source), "-t", str(seconds), "-an", "-c:v", "libx264",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output)
    ], "LTX clip extension")


def _generate_ltx(image: Path, prompt: str, output: Path, seconds: float,
                  seed: int, repo_root: Path, python: str) -> None:
    # The checked-in LTX safety contract allows 3-6 generated seconds. For a
    # 10-second POC asset we generate six seconds, then extend deterministically;
    # the video renderer can also trim it to the narration length.
    generated_seconds = min(6.0, seconds)
    temp = output.with_name(f".{output.stem}.ltx-source.mp4")
    try:
        _run([
            python, str(repo_root / "video" / "animate_still.py"),
            "--image", str(image), "--prompt", prompt, "--out", str(temp),
            "--duration", str(generated_seconds), "--seed", str(seed)
        ], "local LTX image-to-video generation")
        if seconds > generated_seconds + 0.05:
            _extend_clip(temp, output, seconds)
        else:
            output.parent.mkdir(parents=True, exist_ok=True)
            os.replace(temp, output)
    finally:
        if temp.exists():
            temp.unlink()


def _generate_meta(image: Path, prompt: str, output: Path, seconds: float,
                   config: dict, repo_root: Path) -> None:
    bridge = repo_root / "video_pipeline" / "tools" / "meta_video_bridge.js"
    cookie = config.get("cookie") or os.environ.get("LLM_UI_COOKIE")
    if not cookie:
        raise PipelineError("Meta UI video generation requires clip_generation.cookie or LLM_UI_COOKIE")
    lib_dir = config.get(
        "lib_dir",
        r"C:\Users\munis\projects\sat_question_runner\new_eng_qs\lib")
    command = [
        "node", str(bridge), "--image", str(image), "--prompt", prompt,
        "--out", str(output), "--duration", str(seconds),
        "--cookie", str(cookie), "--lib-dir", str(lib_dir),
        "--browser", config.get("browser", "chrome"),
        "--timeout-ms", str(int(config.get("timeout_seconds", 1200)) * 1000),
        "--refusal-retries", str(int(config.get("meta_refusal_retries", 1)))
    ]
    if config.get("keep_open_on_failure", False):
        command.append("--keep-open-on-failure")
    _run(command, "Meta UI image-to-video generation")


def _check_prompt_safety(prompt: str, scene_id: str, repo_root: Path) -> None:
    """Enforce the ambient-motion-only contract before any provider call."""
    sys.path.insert(0, str(repo_root / "video"))
    try:
        from animate_still import check_prompt_safety
    except ImportError as exc:
        raise PipelineError(f"cannot load prompt safety filter: {exc}") from exc
    ok, detail = check_prompt_safety(prompt)
    if not ok:
        raise PipelineError(f"ai_clip prompt rejected for scene {scene_id}: {detail}")


def generate_clips(manifest: dict, manifest_path: Path, repo_root: Path,
                   provider_override: str, ltx_python: str,
                   force: bool = False, dry_run: bool = False) -> list[Path]:
    config = dict(manifest.get("clip_generation", {}))
    provider = provider_override if provider_override != "manifest" else config.get("provider", "none")
    outputs: list[Path] = []
    jobs = [scene for scene in manifest["scenes"]
            if scene["animation"]["type"] == "ai_clip"]
    if not jobs:
        print("[clips] no ai_clip scenes -- skipped")
        return outputs
    if provider == "none" and provider_override != "manifest":
        missing = [scene["id"] for scene in jobs if not resolve_local(
            scene["visual"]["clip"], manifest_path.parent, repo_root).is_file()]
        if missing:
            raise PipelineError("ai_clip files are missing and no video generator is configured: " + ", ".join(missing))
        print("[clips] using existing clip files")
        return [resolve_local(scene["visual"]["clip"], manifest_path.parent,
                              repo_root) for scene in jobs]
    for scene in jobs:
        animation = scene["animation"]
        scene_provider = (provider if provider_override != "manifest"
                          else animation.get("provider", provider))
        fallback = animation.get("fallback_provider")
        image = resolve_local(scene["visual"]["base_image"],
                              manifest_path.parent, repo_root)
        output = resolve_local(scene["visual"]["clip"],
                               manifest_path.parent, repo_root)
        seconds = float(animation.get("duration", 10))
        seed = int(animation.get("seed", 42))
        if output.is_file() and not force:
            print(f"[clips] {scene['id']}: exists -- skipped")
            outputs.append(output)
            continue
        if scene_provider == "none":
            raise PipelineError(
                f"ai_clip {scene['id']} is missing and neither the scene nor "
                "clip_generation config selects a provider")
        _check_prompt_safety(animation["prompt"], scene["id"], repo_root)
        print(f"[clips] {scene['id']}: {scene_provider}, {seconds:g}s")
        if dry_run:
            continue
        output.parent.mkdir(parents=True, exist_ok=True)
        def generate(selected: str) -> None:
            if selected == "ltx":
                _generate_ltx(image, animation["prompt"], output, seconds,
                              seed, repo_root, ltx_python)
            elif selected == "meta-ui":
                _generate_meta(image, animation["prompt"], output, seconds,
                               config, repo_root)
            else:
                raise PipelineError(f"unsupported video generator: {selected}")
        try:
            generate(scene_provider)
        except PipelineError:
            if not fallback or fallback == scene_provider:
                raise
            print(f"[clips] {scene['id']}: {scene_provider} failed; trying {fallback}", flush=True)
            generate(fallback)
        actual = _duration(output)
        if actual < seconds - 0.75:
            raise PipelineError(
                f"video generator returned only {actual:.2f}s for {scene['id']}; "
                f"requested {seconds:.2f}s")
        outputs.append(output)
    return outputs
