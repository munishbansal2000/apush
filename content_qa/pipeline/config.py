from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from video_pipeline.pipeline.common import PipelineError

ROOT_FIELDS = {"schema_version", "library", "output", "standards", "review", "render", "policies"}
LIBRARY_FIELDS = {"include", "exclude", "answer_keys"}
REVIEW_FIELDS = {"enabled", "provider", "model", "vision_model", "endpoint", "api_key_env", "timeout_seconds", "passes", "grounding_globs", "grounding_max_chars"}
RENDER_FIELDS = {"enabled", "max_items_per_page"}
POLICY_FIELDS = {"fail_on", "require_local_images", "image_min_width", "image_min_height", "longest_answer_ratio", "minimum_distractor_words"}


def _object(value: Any, where: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise PipelineError(f"{where} must be an object")
    return value


def _known(value: dict[str, Any], allowed: set[str], where: str) -> None:
    extra = sorted(set(value) - allowed)
    if extra:
        raise PipelineError(f"{where} has unknown field(s): {', '.join(extra)}")


def load_config(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PipelineError(f"cannot read QA manifest {path}: {exc}") from exc
    root = _object(data, "manifest")
    _known(root, ROOT_FIELDS, "manifest")
    if root.get("schema_version") != "1.0":
        raise PipelineError("manifest.schema_version must be '1.0'")
    library = _object(root.get("library"), "manifest.library")
    _known(library, LIBRARY_FIELDS, "manifest.library")
    includes = library.get("include")
    if not isinstance(includes, list) or not includes or not all(isinstance(x, str) and x.strip() for x in includes):
        raise PipelineError("manifest.library.include must contain non-empty glob strings")
    for name in ("exclude", "answer_keys"):
        values = library.get(name, [])
        if not isinstance(values, list) or not all(isinstance(x, str) and x.strip() for x in values):
            raise PipelineError(f"manifest.library.{name} must be an array of strings")
    output = root.get("output")
    if not isinstance(output, str) or not output.strip():
        raise PipelineError("manifest.output must be a non-empty path")
    standards = root.get("standards")
    if not isinstance(standards, str) or not standards.strip():
        raise PipelineError("manifest.standards must be a non-empty path")
    review = _object(root.get("review", {}), "manifest.review")
    _known(review, REVIEW_FIELDS, "manifest.review")
    if review.get("provider", "ollama") not in {"ollama", "openai-compatible"}:
        raise PipelineError("manifest.review.provider must be ollama or openai-compatible")
    passes = review.get("passes", ["blind_key", "distractors", "accuracy_alignment"])
    allowed_passes = {"blind_key", "distractors", "accuracy_alignment", "image_relevance", "writing_rubric"}
    if not isinstance(passes, list) or not set(passes) <= allowed_passes:
        raise PipelineError(f"manifest.review.passes must use: {', '.join(sorted(allowed_passes))}")
    globs = review.get("grounding_globs", [])
    if not isinstance(globs, list) or not all(isinstance(x, str) and x.strip() for x in globs):
        raise PipelineError("manifest.review.grounding_globs must be an array of non-empty strings")
    render = _object(root.get("render", {}), "manifest.render")
    _known(render, RENDER_FIELDS, "manifest.render")
    policies = _object(root.get("policies", {}), "manifest.policies")
    _known(policies, POLICY_FIELDS, "manifest.policies")
    fail_on = policies.get("fail_on", ["blocker"])
    if not isinstance(fail_on, list) or not set(fail_on) <= {"blocker", "major", "minor", "info"}:
        raise PipelineError("manifest.policies.fail_on contains an invalid severity")
    return root
