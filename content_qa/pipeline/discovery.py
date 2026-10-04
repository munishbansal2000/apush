from __future__ import annotations

import fnmatch
import json
import re
from pathlib import Path
from typing import Any

from video_pipeline.pipeline.common import PipelineError

from .models import ContentRecord

KEY_LINE = re.compile(r"^\s*(\d+)\.\s*([A-D])\b", re.MULTILINE)
HEADING = re.compile(r"^##\s+(test-[\w-]+)\s*$", re.MULTILINE | re.IGNORECASE)


def _pointer_token(value: str) -> str:
    return value.replace("~", "~0").replace("/", "~1")


def load_answer_keys(paths: list[Path]) -> dict[tuple[str, int], str]:
    result: dict[tuple[str, int], str] = {}
    for path in paths:
        if not path.exists():
            raise PipelineError(f"answer-key file not found: {path}")
        text = path.read_text(encoding="utf-8")
        headings = list(HEADING.finditer(text))
        for index, match in enumerate(headings):
            end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
            name = match.group(1).lower()
            for key_match in KEY_LINE.finditer(text[match.end():end]):
                result[(name, int(key_match.group(1)))] = key_match.group(2)
    return result


def _kind(item: dict[str, Any], fallback: str = "unknown") -> str:
    value = str(item.get("type") or item.get("format") or fallback).lower()
    if value in {"mcq", "multiple_choice"} or "options" in item:
        return "mcq"
    if value.startswith("saq") or "parts" in item:
        return "saq"
    if value.startswith("dbq") or "documents" in item:
        return "dbq"
    if value.startswith("leq"):
        return "leq"
    return value


def _record(path: Path, pointer: str, item: dict[str, Any], fallback: str, key: str | None, container: str | None) -> ContentRecord:
    uid = str(item.get("id") or f"{path.stem}:{pointer}")
    embedded = item.get("key")
    answer = str(embedded).upper() if isinstance(embedded, str) else key
    return ContentRecord(uid, _kind(item, fallback), path, pointer, item, answer, container)


def extract_records(path: Path, data: Any, external_keys: dict[tuple[str, int], str]) -> list[ContentRecord]:
    if not isinstance(data, dict):
        return []
    records: list[ContentRecord] = []
    container = str(data.get("id") or path.stem)
    if isinstance(data.get("section_1a"), dict) and isinstance(data["section_1a"].get("items"), list):
        for i, item in enumerate(data["section_1a"]["items"]):
            if isinstance(item, dict):
                key = external_keys.get((path.stem.lower(), int(item.get("n", i + 1))))
                records.append(_record(path, f"/section_1a/items/{i}", item, "mcq", key, container))
    elif isinstance(data.get("items"), list):
        for i, item in enumerate(data["items"]):
            if isinstance(item, dict):
                records.append(_record(path, f"/items/{i}", item, "mcq", None, container))
    if isinstance(data.get("questions"), list):
        fallback = str(data.get("type") or data.get("format") or "saq")
        for i, item in enumerate(data["questions"]):
            if isinstance(item, dict):
                merged = dict(item)
                for field in ("period", "themes", "skill", "reasoning", "difficulty", "source_type"):
                    if field not in merged and field in data:
                        merged[field] = data[field]
                merged.setdefault("id", f"{container}-q{i + 1}")
                records.append(_record(path, f"/questions/{i}", merged, fallback, None, container))
    if not records and _kind(data) in {"dbq", "leq"}:
        records.append(_record(path, "", data, _kind(data), None, container))
    return records


def discover(repo_root: Path, config: dict[str, Any]) -> tuple[list[ContentRecord], list[str]]:
    library = config["library"]
    excludes = library.get("exclude", [])
    key_paths = [(repo_root / p).resolve() for p in library.get("answer_keys", [])]
    keys = load_answer_keys(key_paths)
    paths: set[Path] = set()
    for pattern in library["include"]:
        paths.update(p.resolve() for p in repo_root.glob(pattern) if p.is_file() and p.suffix.lower() == ".json")
    chosen = [p for p in sorted(paths) if not any(fnmatch.fnmatch(p.relative_to(repo_root).as_posix(), x) for x in excludes)]
    records: list[ContentRecord] = []
    errors: list[str] = []
    for path in chosen:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            found = extract_records(path, data, keys)
            if not found:
                errors.append(f"no supported content records found in {path.relative_to(repo_root)}")
            records.extend(found)
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"cannot parse {path.relative_to(repo_root)}: {exc}")
    return records, errors
