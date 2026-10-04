from __future__ import annotations

import base64
import json
import os
import time
import urllib.error
import urllib.request
import re
from pathlib import Path
from typing import Any

from video_pipeline.pipeline.common import PipelineError, atomic_json, canonical_hash

from .models import ContentRecord, Finding

SYSTEM = """You are a meticulous independent AP United States History assessment editor.
Return JSON only. Do not trust the supplied answer key. Prefer a finding over a rewrite when
uncertain. A valid MCQ must have one uniquely best historically defensible answer and three
plausible, unambiguously wrong distractors. Check dates, causation, period/topic alignment,
stimulus dependence, explanations, grammar, answer-length/style tells, and image relevance.
For writing prompts, check historical defensibility, task completeness, and rubric alignment.
Never invent citations or facts."""

PASS_INSTRUCTIONS = {
    "blind_key": "Derive the answer without seeing the stored key. For MCQ return derived_key and confidence.",
    "distractors": "Evaluate every distractor for plausibility, uniqueness, why it is wrong, and unintended clues.",
    "accuracy_alignment": "Audit factual accuracy, chronology, topical alignment, completeness, and explanations.",
    "image_relevance": "Determine whether the image/caption is legible, historically relevant, and actually used by the question.",
    "writing_rubric": "Audit the prompt, evidence expectations, exemplars, and rubric for fair AP-style scoring.",
}

WORD = re.compile(r"[A-Za-z][A-Za-z0-9'-]+")


def _grounding_context(record: ContentRecord, config: dict[str, Any], repo_root: Path) -> str:
    paths: set[Path] = set()
    for pattern in config.get("grounding_globs", []):
        paths.update(path for path in repo_root.glob(pattern) if path.is_file())
    if not paths:
        return ""
    period_match = re.search(r"([1-9])", str(record.data.get("period") or record.data.get("topic_code") or ""))
    if period_match:
        matching = [x for x in paths if x.stem.lower() == f"u{period_match.group(1)}"]
        if matching:
            paths = set(matching)
    query_value = " ".join(str(record.data.get(x) or "") for x in ("stem", "prompt", "question", "options", "topic_code"))
    query = {x.lower() for x in WORD.findall(query_value) if len(x) > 3}
    candidates: list[tuple[int, str, str]] = []
    for path in paths:
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        chunks = re.split(r"\n(?=#{1,4}\s)|\n\s*\n", text)
        for chunk in chunks:
            if len(chunk.strip()) < 60:
                continue
            tokens = {x.lower() for x in WORD.findall(chunk)}
            score = len(query & tokens)
            candidates.append((score, path.name, chunk.strip()))
    maximum = int(config.get("grounding_max_chars", 8000))
    selected: list[str] = []
    used = 0
    for score, name, chunk in sorted(candidates, key=lambda x: (x[0], len(x[2])), reverse=True):
        if score <= 0 or used >= maximum or len(selected) >= 6:
            break
        value = f"[{name}]\n{chunk}"
        selected.append(value[: maximum - used])
        used += len(selected[-1])
    return "\n\n".join(selected)


def _request(url: str, headers: dict[str, str], payload: dict[str, Any], timeout: float) -> dict[str, Any]:
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json", **headers}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, json.JSONDecodeError) as exc:
        raise PipelineError(f"LLM review request failed: {exc}") from exc


def _extract_json(text: str) -> dict[str, Any]:
    value = text.strip()
    if value.startswith("```"):
        value = value.split("\n", 1)[1].rsplit("```", 1)[0]
    try:
        result = json.loads(value)
    except json.JSONDecodeError as exc:
        raise PipelineError(f"reviewer returned invalid JSON: {exc}") from exc
    if not isinstance(result, dict) or not isinstance(result.get("findings", []), list):
        raise PipelineError("reviewer response must be an object with a findings array")
    if result.get("derived_key") is not None and result["derived_key"] not in list("ABCD"):
        raise PipelineError("reviewer derived_key must be A-D or null")
    return result


def _record_payload(record: ContentRecord, review_pass: str) -> dict[str, Any]:
    data = json.loads(json.dumps(record.data))
    if review_pass == "blind_key":
        data.pop("key", None)
        data.pop("explanation", None)
        data.pop("option_explanations", None)
    return {"id": record.uid, "kind": record.kind, "content": data}


def _image_b64(record: ContentRecord, repo_root: Path) -> str | None:
    stimulus = record.data.get("stimulus")
    if not isinstance(stimulus, dict):
        return None
    raw = stimulus.get("image_url") or stimulus.get("image")
    if not isinstance(raw, str) or raw.startswith(("http://", "https://")):
        return None
    path = (repo_root / raw).resolve()
    try:
        path.relative_to(repo_root.resolve())
    except ValueError:
        return None
    if not path.exists() or path.stat().st_size > 12 * 1024 * 1024:
        return None
    return base64.b64encode(path.read_bytes()).decode("ascii")


def _call(record: ContentRecord, review_pass: str, config: dict[str, Any], repo_root: Path) -> dict[str, Any]:
    instruction = PASS_INSTRUCTIONS[review_pass]
    response_shape = {
        "verdict": "pass|needs_review|fail",
        "confidence": 0.0,
        "derived_key": "A-D or null",
        "summary": "short assessment",
        "findings": [{"severity": "blocker|major|minor|info", "gate": "short_name", "message": "specific issue", "evidence": {}, "proposed_change": {"field": "top-level field", "new_value": "replacement", "reason": "why"}}],
    }
    grounding = _grounding_context(record, config, repo_root)
    reference = f"\nLOCAL REFERENCE EXCERPTS (supporting evidence, not an answer key):\n{grounding}" if grounding else ""
    prompt = f"PASS: {review_pass}\n{instruction}\nExpected response shape:\n{json.dumps(response_shape)}\nCONTENT:\n{json.dumps(_record_payload(record, review_pass), ensure_ascii=False)}{reference}"
    provider = config.get("provider", "ollama")
    default_model = config.get("vision_model") if review_pass == "image_relevance" else config.get("model")
    model = str(default_model or ("qwen2.5:14b" if provider == "ollama" else ""))
    timeout = float(config.get("timeout_seconds", 180))
    image = _image_b64(record, repo_root) if review_pass == "image_relevance" else None
    if provider == "ollama":
        endpoint = str(config.get("endpoint", "http://127.0.0.1:11434")).rstrip("/") + "/api/chat"
        message: dict[str, Any] = {"role": "user", "content": prompt}
        if image:
            message["images"] = [image]
        raw = _request(endpoint, {}, {"model": model, "stream": False, "format": "json", "messages": [{"role": "system", "content": SYSTEM}, message]}, timeout)
        text = str(raw.get("message", {}).get("content", ""))
    else:
        endpoint = str(config.get("endpoint") or "").rstrip("/")
        if not endpoint:
            raise PipelineError("openai-compatible reviewer requires an endpoint")
        api_key = os.environ.get(str(config.get("api_key_env", "OPENAI_API_KEY")), "")
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        raw = _request(endpoint, headers, {"model": model, "response_format": {"type": "json_object"}, "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}]}, timeout)
        text = str(raw.get("choices", [{}])[0].get("message", {}).get("content", ""))
    return _extract_json(text)


def review_records(records: list[ContentRecord], config: dict[str, Any], repo_root: Path, output_dir: Path, limit: int | None = None) -> tuple[list[Finding], list[dict[str, Any]]]:
    findings: list[Finding] = []
    reviews: list[dict[str, Any]] = []
    passes = config.get("passes", ["blind_key", "distractors", "accuracy_alignment"])
    selected = records[:limit] if limit else records
    cache_dir = output_dir / "reviews"
    for record in selected:
        applicable = [p for p in passes if not (p == "writing_rubric" and record.kind == "mcq")]
        if record.kind != "mcq":
            applicable = [p for p in applicable if p not in {"blind_key", "distractors"}]
        has_image = isinstance(record.data.get("stimulus"), dict) and bool(record.data["stimulus"].get("image_url") or record.data["stimulus"].get("image"))
        if not has_image:
            applicable = [p for p in applicable if p != "image_relevance"]
        for review_pass in applicable:
            model_name = config.get("vision_model") if review_pass == "image_relevance" else config.get("model")
            grounding = _grounding_context(record, config, repo_root)
            cache_key = canonical_hash({"v": 2, "pass": review_pass, "record": _record_payload(record, review_pass), "provider": config.get("provider"), "model": model_name, "grounding": grounding})
            cache_path = cache_dir / f"{record.uid.replace('/', '_')}--{review_pass}--{cache_key[:12]}.json"
            if cache_path.exists():
                result = json.loads(cache_path.read_text(encoding="utf-8"))
            else:
                result = _call(record, review_pass, config, repo_root)
                atomic_json(cache_path, result)
                time.sleep(0.05)
            review = {"record_id": record.uid, "source_file": str(record.source_path), "pointer": record.pointer, "pass": review_pass, "result": result}
            reviews.append(review)
            if review_pass == "blind_key" and result.get("derived_key") and record.answer_key and result["derived_key"] != record.answer_key:
                findings.append(Finding(record.uid, str(record.source_path), record.pointer, "blind_key_disagreement", "blocker", "independent answer derivation disagrees with stored key", {"stored_key": record.answer_key, "derived_key": result["derived_key"], "confidence": result.get("confidence")}))
            for value in result.get("findings", []):
                if not isinstance(value, dict):
                    continue
                severity = value.get("severity", "major")
                if severity not in {"blocker", "major", "minor", "info"}:
                    severity = "major"
                findings.append(Finding(record.uid, str(record.source_path), record.pointer, f"llm:{review_pass}:{value.get('gate', 'review')}", severity, str(value.get("message", "LLM review finding")), value.get("evidence") if isinstance(value.get("evidence"), dict) else {}, value.get("proposed_change") if isinstance(value.get("proposed_change"), dict) else None))
    return findings, reviews
