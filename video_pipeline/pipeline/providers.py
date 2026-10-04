from __future__ import annotations

import base64
import json
import mimetypes
import os
import urllib.error
import urllib.request
from typing import Any

from .common import PipelineError
from .schema import validate_animation

SYSTEM = """You are an APUSH educational video motion director. Return JSON only.
Choose one supported animation type and parameters that clarify the supplied narration using the supplied base image. Do not invent historical facts or add people, quotations, or symbols. Supported types: ken_burns, zoom, camera_path, callout, timeline, bullets, objectives, typewriter, map, counter, source_analysis, diagram. Use normalized coordinates from 0 to 1. source_analysis requires highlights containing box, label, and at. diagram requires 2-8 labeled nodes with ids/x/y/at and edges whose from/to values reference those ids. Keep on-screen copy brief, analytical, historically neutral, and readable in a vertical frame."""


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < start:
        raise PipelineError("animation provider returned no JSON object")
    try:
        value = json.loads(text[start:end + 1])
    except json.JSONDecodeError as exc:
        raise PipelineError(f"animation provider returned invalid JSON: {exc}") from exc
    if not isinstance(value, dict):
        raise PipelineError("animation provider response must be an object")
    validate_animation(value, "generated animation", generated=True)
    return value


def _post(url: str, payload: dict, headers: dict[str, str], timeout: int) -> dict:
    request = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), method="POST", headers={"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise PipelineError(f"animation provider request failed: {exc}") from exc


def _image_payload(image_path) -> tuple[str, str] | None:
    if image_path is None:
        return None
    size = image_path.stat().st_size
    if size > 15 * 1024 * 1024:
        raise PipelineError(f"base image is too large for animation planning ({size} bytes; max 15 MiB): {image_path}")
    mime = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
    if mime not in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
        raise PipelineError(f"unsupported planning image type {mime}: {image_path}")
    return mime, base64.b64encode(image_path.read_bytes()).decode("ascii")


def plan_animation(config: dict, scene: dict, image_path=None) -> dict:
    provider = config.get("provider", "none")
    if provider == "none":
        raise PipelineError(f"scene {scene['id']} uses animation.type=auto but generation.provider is none")
    prompt = json.dumps({
        "lesson_scene": scene["id"],
        "narration": scene["narration"]["text"],
        "base_image": scene["visual"].get("base_image"),
        "direction": scene["animation"].get("prompt", "Choose the clearest restrained motion."),
        "instructional_purpose": scene.get("purpose"),
        "topics": scene.get("topics", []),
        "on_screen_text": scene.get("on_screen_text", []),
        "output_example": {"type": "zoom", "cx": 0.5, "cy": 0.4, "end_zoom": 1.8, "caption": "brief evidence label"},
    }, ensure_ascii=False)
    timeout = int(config.get("timeout_seconds", 180))
    image = _image_payload(image_path)
    if provider == "ollama":
        endpoint = config.get("endpoint", "http://127.0.0.1:11434").rstrip("/") + "/api/chat"
        user_message = {"role": "user", "content": prompt}
        if image:
            user_message["images"] = [image[1]]
        value = _post(endpoint, {"model": config["model"], "stream": False, "format": "json", "messages": [{"role": "system", "content": SYSTEM}, user_message]}, {}, timeout)
        text = value.get("message", {}).get("content", "")
    elif provider == "meta-api":
        endpoint = config.get("endpoint", "https://api.meta.ai/v1/responses")
        env_name = config.get("api_key_env", "MODEL_API_KEY")
        api_key = os.environ.get(env_name)
        if not api_key:
            raise PipelineError(f"meta-api requires environment variable {env_name}")
        user_content = [{"type": "input_text", "text": prompt}]
        if image:
            user_content.append({"type": "input_image", "image_url": f"data:{image[0]};base64,{image[1]}"})
        value = _post(endpoint, {"model": config["model"], "input": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user_content}], "text": {"format": {"type": "json_object"}}}, {"Authorization": f"Bearer {api_key}"}, timeout)
        text = value.get("output_text", "")
        if not text:
            chunks = [part.get("text", "") for item in value.get("output", []) for part in item.get("content", []) if isinstance(part, dict)]
            text = "".join(chunks)
    else:
        raise PipelineError(f"unsupported animation provider: {provider}")
    return _extract_json(text)
