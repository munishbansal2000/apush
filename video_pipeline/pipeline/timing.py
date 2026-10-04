from __future__ import annotations

import copy
import re

from .common import PipelineError


def _words(value: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", value.casefold())


def _boundary_offset(cue: str, boundaries: list[dict] | None) -> float | None:
    if not boundaries:
        return None
    target = _words(cue)
    source = [_words(str(row.get("text", ""))) for row in boundaries]
    flat = [(token, row_index) for row_index, tokens in enumerate(source)
            for token in tokens]
    tokens = [token for token, _ in flat]
    for index in range(len(tokens) - len(target) + 1):
        if tokens[index:index+len(target)] == target:
            return float(boundaries[flat[index][1]].get("offset", 0))
    return None


def _resolve_item(item: dict, narration: str, duration: float,
                  where: str, boundaries: list[dict] | None = None) -> None:
    if "cue" not in item:
        return
    cue = item["cue"].strip()
    index = narration.casefold().find(cue.casefold())
    if index < 0:
        raise PipelineError(f"{where}.cue is not present in narration: {cue!r}")
    # Character position is a stable approximation for engines that do not
    # return word boundaries. Most importantly, it scales to the actual WAV.
    exact = _boundary_offset(cue, boundaries)
    position = index / max(1, len(narration))
    base = exact if exact is not None else position * duration
    item["at"] = max(0.0, min(duration, base + float(item.get("offset", 0))))
    item["timing_source"] = "word_boundary" if exact is not None else "proportional"
    if "duration" in item:
        item["duration"] = min(float(item["duration"]),
                               max(0.2, duration - item["at"]))


def resolve_scene_timing(scene: dict, duration: float,
                         word_boundaries: list[dict] | None = None) -> dict:
    resolved = copy.deepcopy(scene)
    narration = resolved["narration"]["text"]
    for index, item in enumerate(resolved.get("beats", [])):
        _resolve_item(item, narration, duration,
                      f"scene {scene['id']}.beats[{index}]", word_boundaries)
    animation = resolved["animation"]
    for field in ("events", "highlights", "nodes", "edges", "moves"):
        for index, item in enumerate(animation.get(field, [])):
            if not isinstance(item, dict):
                continue
            _resolve_item(item, narration, duration,
                          f"scene {scene['id']}.animation.{field}[{index}]",
                          word_boundaries)
    for index, item in enumerate(resolved.get("audio", {}).get("effects", [])):
        _resolve_item(item, narration, duration,
                      f"scene {scene['id']}.audio.effects[{index}]",
                      word_boundaries)
    device = resolved.get("device")
    params = resolved.get("device_params", {})
    if device == "redact_reveal":
        params["reveal_at"] = []
        for index, cue in enumerate(params.get("reveal_on_cues", [])):
            item = {"cue": cue}
            _resolve_item(item, narration, duration,
                          f"scene {scene['id']}.device_params.reveal_on_cues[{index}]",
                          word_boundaries)
            params["reveal_at"].append(item["at"])
    elif device == "annotate":
        for index, item in enumerate(params.get("annotations", [])):
            _resolve_item(item, narration, duration,
                          f"scene {scene['id']}.device_params.annotations[{index}]",
                          word_boundaries)
    return resolved
