from __future__ import annotations

import copy
import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from video_pipeline.pipeline.common import PipelineError, atomic_json, canonical_hash

from .models import ContentRecord, Finding

ALLOWED_FIELDS = {"stem", "prompt", "options", "key", "explanation", "option_explanations", "topic_code", "skill_code", "period", "themes", "reasoning", "difficulty", "stimulus", "rubric", "scoring_notes", "exemplar_points", "exemplar_thesis"}


def make_fix_manifest(records: list[ContentRecord], findings: list[Finding]) -> dict[str, Any]:
    lookup = {(x.uid, str(x.source_path), x.pointer): x for x in records}
    patches: list[dict[str, Any]] = []
    source_cache: dict[Path, Any] = {}
    for finding in findings:
        change = finding.proposed_change
        record = lookup.get((finding.record_id, finding.source_file, finding.pointer))
        if not change or not record:
            continue
        field = change.get("field")
        if field not in ALLOWED_FIELDS or "new_value" not in change:
            continue
        if field == "key" and "key" not in record.data:
            continue
        if record.source_path not in source_cache:
            source_cache[record.source_path] = json.loads(record.source_path.read_text(encoding="utf-8"))
        source_document = source_cache[record.source_path]
        source_item = _target(source_document, record.pointer)
        patches.append({
            "id": f"fix-{len(patches)+1:05d}", "approved": False,
            "record_id": record.uid, "source_file": str(record.source_path), "pointer": record.pointer,
            "source_hash": canonical_hash(source_document),
            "field": field, "expected_old": source_item.get(field), "new_value": change["new_value"],
            "reason": change.get("reason") or finding.message, "finding_gate": finding.gate,
        })
    return {"schema_version": "1.0", "instructions": "Review every patch; set approved to true only after human verification.", "patches": patches}


def _tokens(pointer: str) -> list[str]:
    if not pointer:
        return []
    return [x.replace("~1", "/").replace("~0", "~") for x in pointer.lstrip("/").split("/")]


def _target(document: Any, pointer: str) -> dict[str, Any]:
    value = document
    for token in _tokens(pointer):
        value = value[int(token)] if isinstance(value, list) else value[token]
    if not isinstance(value, dict):
        raise PipelineError(f"fix pointer does not address an object: {pointer}")
    return value


def apply_approved(path: Path, repo_root: Path) -> list[str]:
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PipelineError(f"cannot read fixes manifest: {exc}") from exc
    patches = manifest.get("patches") if isinstance(manifest, dict) else None
    if not isinstance(patches, list):
        raise PipelineError("fixes manifest must contain a patches array")
    grouped: dict[Path, list[dict[str, Any]]] = defaultdict(list)
    for patch in patches:
        if not isinstance(patch, dict) or patch.get("approved") is not True:
            continue
        source = Path(str(patch.get("source_file", ""))).resolve()
        try:
            source.relative_to(repo_root.resolve())
        except ValueError as exc:
            raise PipelineError(f"refusing fix outside repository: {source}") from exc
        grouped[source].append(patch)
    staged: dict[Path, Any] = {}
    for source, changes in grouped.items():
        document = json.loads(source.read_text(encoding="utf-8"))
        source_hash = canonical_hash(document)
        for patch in changes:
            if patch.get("source_hash") != source_hash:
                raise PipelineError(f"source changed since review; refusing {patch.get('id')} for {source}")
            field = patch.get("field")
            if field not in ALLOWED_FIELDS:
                raise PipelineError(f"field is not allowlisted: {field}")
            target = _target(document, str(patch.get("pointer", "")))
            if target.get(field) != patch.get("expected_old"):
                raise PipelineError(f"old value precondition failed for {patch.get('id')}")
            target[field] = copy.deepcopy(patch.get("new_value"))
        staged[source] = document
    for source, document in staged.items():
        atomic_json(source, document)
    return [str(x) for x in staged]
