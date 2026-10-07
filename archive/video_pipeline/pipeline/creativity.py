from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .common import PipelineError


LIBRARY_PATH = Path(__file__).resolve().parents[1] / "animation_creativity_library.json"


@lru_cache(maxsize=1)
def library() -> dict:
    try:
        value = json.loads(LIBRARY_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PipelineError(f"cannot read animation creativity library: {exc}") from exc
    patterns = value.get("patterns")
    if value.get("schema_version") != 1 or not isinstance(patterns, dict):
        raise PipelineError("animation creativity library has an invalid schema")
    return value


def pattern_names() -> set[str]:
    return set(library()["patterns"])


def validate_creativity(value: object, where: str) -> None:
    if not isinstance(value, dict):
        raise PipelineError(f"{where} must be an object")
    allowed = {"pattern", "source_description", "focuses", "treatment",
               "ambient_motion"}
    extra = sorted(set(value) - allowed)
    if extra:
        raise PipelineError(f"{where} has unknown field(s): {', '.join(extra)}")
    pattern_name = value.get("pattern")
    patterns = library()["patterns"]
    if pattern_name not in patterns:
        raise PipelineError(
            f"{where}.pattern must be one of: {', '.join(sorted(patterns))}")
    source = value.get("source_description")
    if not isinstance(source, str) or not source.strip():
        raise PipelineError(f"{where}.source_description must be non-empty")
    focuses = value.get("focuses", [])
    pattern = patterns[pattern_name]
    if not isinstance(focuses, list):
        raise PipelineError(f"{where}.focuses must be an array")
    minimum = int(pattern["minimum_focuses"])
    maximum = int(pattern["maximum_focuses"])
    if not minimum <= len(focuses) <= maximum:
        raise PipelineError(
            f"{where}.focuses must contain {minimum}-{maximum} subjects")
    for index, focus in enumerate(focuses):
        fw = f"{where}.focuses[{index}]"
        if not isinstance(focus, dict) or set(focus) != {"subject", "location"}:
            raise PipelineError(f"{fw} must contain exactly subject and location")
        for field in ("subject", "location"):
            if not isinstance(focus[field], str) or not focus[field].strip():
                raise PipelineError(f"{fw}.{field} must be non-empty")
    for field in ("treatment", "ambient_motion"):
        if field in value and (not isinstance(value[field], str)
                               or not value[field].strip()):
            raise PipelineError(f"{where}.{field} must be non-empty")


def build_ai_prompt(animation: dict) -> str:
    creativity = animation.get("creativity")
    if not creativity:
        prompt = animation.get("prompt")
        if not isinstance(prompt, str) or not prompt.strip():
            raise PipelineError("ai_clip requires prompt or creativity pattern")
        return prompt
    validate_creativity(creativity, "animation.creativity")
    pattern = library()["patterns"][creativity["pattern"]]
    focuses = creativity.get("focuses", [])
    if focuses:
        phrases = [f"the {item['subject']} at {item['location']}" for item in focuses]
        focus_sequence = ", then ".join(phrases)
    else:
        focus_sequence = "the existing historical subjects"
    return pattern["prompt_template"].format(
        source_description=creativity["source_description"].strip(),
        focus_sequence=focus_sequence,
        treatment=creativity.get(
            "treatment", "A restrained warm golden light moves in sequence across"),
        ambient_motion=creativity.get(
            "ambient_motion",
            "Fine dust motes drift through the light and the paper texture shimmers faintly"),
    )


def provider_defaults(animation: dict) -> tuple[str | None, str | None]:
    creativity = animation.get("creativity")
    if not creativity:
        return None, None
    pattern = library()["patterns"][creativity["pattern"]]
    return pattern.get("provider"), pattern.get("fallback_provider")
