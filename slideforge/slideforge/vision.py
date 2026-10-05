"""Vision readers: the perception step of the LLM+scripted pipeline.

A reader takes ``(image_path, places) -> raw_text`` where ``places`` is a
list of ``{"name": ...}`` and the raw text should be JSON
``[{"name": ..., "at": [x, y]}]`` with coordinates as 0..1 fractions.

Register a new one::

    from slideforge.plugins import vision

    @vision("my-model")
    def read(image_path, places):
        ...

Use :func:`read_waypoints` for the full step (read + parse + merge labels).
"""

import base64
import json
import os
import urllib.request
from pathlib import Path

from .plugins import vision, vision_registry

VISION_PROMPT = """You are given a vintage map with a RED coordinate grid overlaid.
The grid is labeled 0.0 to 1.0 on both axes: x increases left to right,
y increases top to bottom. Grid lines are every 0.1; estimate between them.

For each place below, find it on the map and report its position as
fractions of the image width/height.

Places:
{places}

Respond with JSON ONLY, a list like:
[{{"name": "<place name as given>", "at": [x, y]}}]
No prose, no markdown fences."""


def _places_block(places):
    return "\n".join(f"- {p['name']}" for p in places)


def _b64(path):
    return base64.b64encode(Path(path).read_bytes()).decode()


@vision("ollama")
def _read_ollama(image_path, places, model="llava"):
    body = {"model": model, "stream": False, "messages": [{
        "role": "user",
        "content": VISION_PROMPT.format(places=_places_block(places)),
        "images": [_b64(image_path)]}]}
    req = urllib.request.Request(
        "http://localhost:11434/api/chat",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())["message"]["content"]


@vision("openai")
def _read_openai(image_path, places):
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY not set")
    body = {"model": "gpt-4o", "max_tokens": 500, "messages": [{
        "role": "user", "content": [
            {"type": "text",
             "text": VISION_PROMPT.format(places=_places_block(places))},
            {"type": "image_url", "image_url":
             {"url": f"data:image/png;base64,{_b64(image_path)}"}}]}]}
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())["choices"][0]["message"]["content"]


@vision("anthropic")
def _read_anthropic(image_path, places):
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY not set")
    body = {"model": "claude-sonnet-4-5-20250929", "max_tokens": 500,
            "messages": [{
                "role": "user", "content": [
                    {"type": "image", "source": {
                        "type": "base64", "media_type": "image/png",
                        "data": _b64(image_path)}},
                    {"type": "text", "text": VISION_PROMPT.format(
                        places=_places_block(places))}]}]}
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json",
                 "x-api-key": key, "anthropic-version": "2023-06-01"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())["content"][0]["text"]


@vision("agent")
def _read_agent(image_path, places):
    raise RuntimeError(
        "vision='agent' means a human or the Muse agent reads the grid by "
        f"hand: open {image_path}, locate each place, and supply --waypoints")


def _ollama_up():
    try:
        urllib.request.urlopen("http://localhost:11434/api/tags", timeout=3)
        return True
    except Exception:
        return False


def autodetect():
    """Pick the first usable reader: ollama -> openai -> anthropic -> agent."""
    if _ollama_up():
        return "ollama"
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    if os.environ.get("ANTHROPIC_API_KEY"):
        return "anthropic"
    return "agent"


def parse_waypoints(raw, places):
    """Parse reader output into waypoints, merging label/sub from places."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    items = json.loads(text)
    by_name = {p["name"]: p for p in places}
    out = []
    for it in items:
        p = by_name.get(it["name"], {})
        out.append({"name": it["name"],
                    "at": [float(it["at"][0]), float(it["at"][1])],
                    "label": p.get("label", it["name"]),
                    "sub": p.get("sub", "")})
    return out


def read_waypoints(provider, image_path, places):
    """Full vision step: read raw output with `provider`, parse to waypoints."""
    if provider == "auto":
        provider = autodetect()
    reader = vision_registry.get(provider)
    return parse_waypoints(reader(str(image_path), places), places)
