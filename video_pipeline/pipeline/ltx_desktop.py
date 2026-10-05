from __future__ import annotations

import atexit
import json
import os
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

from .common import PipelineError


_SERVER_PROCESS: subprocess.Popen | None = None
_SERVER_URL: str | None = None


def _default_app_data() -> Path:
    local_app_data = os.environ.get("LOCALAPPDATA")
    if not local_app_data:
        raise PipelineError("LOCALAPPDATA is unavailable; cannot locate LTX Desktop")
    return Path(local_app_data) / "LTXDesktop"


def _default_resources() -> Path:
    local_app_data = os.environ.get("LOCALAPPDATA")
    if not local_app_data:
        raise PipelineError("LOCALAPPDATA is unavailable; cannot locate LTX Desktop")
    return Path(local_app_data) / "Programs" / "LTX Desktop" / "resources"


def is_available(config: dict) -> bool:
    app_data = Path(config.get("ltx_desktop_app_data") or _default_app_data())
    resources = Path(config.get("ltx_desktop_resources") or _default_resources())
    return (
        (app_data / "python" / "python.exe").is_file()
        and (app_data / "models" / "ltx-2.5").is_dir()
        and (resources / "backend" / "ltx2_server.py").is_file()
    )


def _request(url: str, *, payload: dict | None = None,
             timeout: float = 10) -> dict:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {} if data is None else {"Content-Type": "application/json"}
    request = urllib.request.Request(url, data=data, headers=headers,
                                     method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise PipelineError(f"LTX Desktop returned HTTP {exc.code}: {detail}") from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise PipelineError(f"LTX Desktop request failed: {exc}") from exc


def _healthy(url: str) -> bool:
    try:
        return _request(f"{url}/health", timeout=2).get("status") == "ok"
    except PipelineError:
        return False


def _stop_server() -> None:
    global _SERVER_PROCESS, _SERVER_URL
    process = _SERVER_PROCESS
    _SERVER_PROCESS = None
    _SERVER_URL = None
    if process is None or process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


atexit.register(_stop_server)


def _start_server(config: dict) -> str:
    global _SERVER_PROCESS, _SERVER_URL
    if _SERVER_URL and _healthy(_SERVER_URL):
        return _SERVER_URL
    if not is_available(config):
        raise PipelineError(
            "LTX Desktop was not found with its LTX-2.5 model; configure "
            "clip_generation.ltx_desktop_app_data and ltx_desktop_resources")

    app_data = Path(config.get("ltx_desktop_app_data") or _default_app_data())
    resources = Path(config.get("ltx_desktop_resources") or _default_resources())
    python = app_data / "python" / "python.exe"
    backend = resources / "backend"
    script = backend / "ltx2_server.py"
    first_port = int(config.get("ltx_desktop_port", 41955))

    # The Desktop UI owns 41954 and protects it with a private session token.
    # Use a pipeline-owned localhost endpoint and probe a few adjacent ports.
    port = first_port
    for candidate in range(first_port, first_port + 10):
        candidate_url = f"http://127.0.0.1:{candidate}"
        if _healthy(candidate_url):
            _SERVER_URL = candidate_url
            return candidate_url
        try:
            with urllib.request.urlopen(f"{candidate_url}/health", timeout=0.25):
                pass
        except urllib.error.HTTPError:
            continue  # Occupied by an authenticated service, including the UI.
        except (urllib.error.URLError, TimeoutError):
            port = candidate
            break
    else:
        raise PipelineError("no free localhost port found for LTX Desktop")

    env = os.environ.copy()
    env.update({
        "LTX_PORT": str(port),
        "LTX_APP_DATA_DIR": str(app_data),
        "LTX_AUTH_TOKEN": "",
        "PYTHONUNBUFFERED": "1",
        "PYTHONNOUSERSITE": "1",
    })
    bootstrap = (
        "import ctypes,runpy,sys; "
        "ctypes.WinDLL('kernel32',use_last_error=True).SetDllDirectoryW(''); "
        f"sys.path.insert(0, {str(backend)!r}); "
        f"runpy.run_path({str(script)!r}, run_name='__main__')"
    )
    creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    _SERVER_PROCESS = subprocess.Popen(
        [str(python), "-u", "-c", bootstrap], cwd=str(backend), env=env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        creationflags=creationflags,
    )
    _SERVER_URL = f"http://127.0.0.1:{port}"
    deadline = time.monotonic() + float(config.get("ltx_startup_timeout_seconds", 120))
    while time.monotonic() < deadline:
        if _SERVER_PROCESS.poll() is not None:
            raise PipelineError(
                f"LTX Desktop backend exited with code {_SERVER_PROCESS.returncode}")
        if _healthy(_SERVER_URL):
            return _SERVER_URL
        time.sleep(0.5)
    _stop_server()
    raise PipelineError("LTX Desktop backend did not become healthy in time")


def _local_duration(seconds: float) -> int:
    for supported in (5, 6, 8, 10):
        if seconds <= supported:
            return supported
    return 10


def generate(image: Path, prompt: str, output: Path, seconds: float,
             seed: int, config: dict) -> None:
    url = _start_server(config)
    payload = {
        "prompt": prompt,
        "resolution": config.get("ltx_resolution", "540p"),
        "model": config.get("ltx_model", "fast"),
        "cameraMotion": config.get("ltx_camera_motion", "static"),
        "negativePrompt": config.get(
            "ltx_negative_prompt",
            "text, captions, logos, modern objects, morphing, added people"),
        "duration": _local_duration(seconds),
        "fps": int(config.get("ltx_fps", 24)),
        "audio": False,
        "imagePath": str(image.resolve()),
        "lastImagePath": None,
        "keyframes": [],
        "audioPath": None,
        "aspectRatio": "9:16",
        "seed": seed,
        "loras": [],
    }
    timeout = float(config.get("ltx_generation_timeout_seconds", 3600))
    print(
        f"[ltx-desktop] LTX 2.5 {payload['model']} {payload['resolution']} "
        f"{payload['duration']}s seed={seed}", flush=True)
    result = _request(f"{url}/api/generate", payload=payload, timeout=timeout)
    if result.get("status") != "complete" or not result.get("video_path"):
        raise PipelineError(f"LTX Desktop generation did not complete: {result}")
    generated = Path(result["video_path"])
    if not generated.is_file():
        raise PipelineError(f"LTX Desktop output is missing: {generated}")
    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(generated, output)
