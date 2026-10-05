from __future__ import annotations

import copy
from pathlib import Path
from typing import Any

from .common import PipelineError
from .gates import run_all_gates
from .schema import validate_manifest

ROOT_KEYS = {"schema_version", "course", "defaults", "units"}
COURSE_KEYS = {"id", "title", "description", "academic_year", "audience"}
DEFAULT_KEYS = {"video", "tts", "generation", "clip_generation", "presentation"}
UNIT_KEYS = {"unit_id", "title", "period", "date_range", "description", "learning_objectives", "themes", "chapters"}
CHAPTER_KEYS = {"chapter_id", "title", "description", "essential_questions", "learning_objectives", "lessons"}


def _object(value: Any, where: str) -> dict:
    if not isinstance(value, dict):
        raise PipelineError(f"{where} must be an object")
    return value


def _keys(value: dict, allowed: set[str], where: str) -> None:
    extra = sorted(set(value) - allowed)
    if extra:
        raise PipelineError(f"{where} has unknown field(s): {', '.join(extra)}")


def _required(value: dict, fields: set[str], where: str) -> None:
    missing = sorted(field for field in fields if field not in value)
    if missing:
        raise PipelineError(f"{where} missing required field(s): {', '.join(missing)}")


def _text(value: Any, where: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise PipelineError(f"{where} must be a non-empty string")


def _text_list(value: Any, where: str) -> None:
    if not isinstance(value, list) or not value or not all(
            isinstance(item, str) and item.strip() for item in value):
        raise PipelineError(f"{where} must be a non-empty array of strings")


def expand_curriculum(data: Any, path: Path, repo_root: Path,
                      allow_missing_clips: bool = False) -> list[dict]:
    root = _object(data, "curriculum")
    _keys(root, ROOT_KEYS, "curriculum")
    _required(root, {"schema_version", "course", "defaults", "units"}, "curriculum")
    if root["schema_version"] != 1:
        raise PipelineError("curriculum.schema_version must be 1")

    course = _object(root["course"], "curriculum.course")
    _keys(course, COURSE_KEYS, "curriculum.course")
    _required(course, {"id", "title"}, "curriculum.course")
    _text(course["id"], "curriculum.course.id")
    _text(course["title"], "curriculum.course.title")
    for field in ("description", "academic_year", "audience"):
        if field in course:
            _text(course[field], f"curriculum.course.{field}")

    defaults = _object(root["defaults"], "curriculum.defaults")
    _keys(defaults, DEFAULT_KEYS, "curriculum.defaults")
    if "tts" not in defaults:
        raise PipelineError("curriculum.defaults.tts is required")

    units = root["units"]
    if not isinstance(units, list) or not units:
        raise PipelineError("curriculum.units must be a non-empty array")
    lesson_ids: set[str] = set()
    expanded: list[dict] = []
    for unit_index, unit_value in enumerate(units):
        unit_where = f"curriculum.units[{unit_index}]"
        unit = _object(unit_value, unit_where)
        _keys(unit, UNIT_KEYS, unit_where)
        _required(unit, {"unit_id", "title", "period", "chapters"}, unit_where)
        for field in ("unit_id", "title", "period"):
            _text(unit[field], f"{unit_where}.{field}")
        for field in ("date_range", "description"):
            if field in unit:
                _text(unit[field], f"{unit_where}.{field}")
        for field in ("learning_objectives", "themes"):
            if field in unit:
                _text_list(unit[field], f"{unit_where}.{field}")
        chapters = unit["chapters"]
        if not isinstance(chapters, list) or not chapters:
            raise PipelineError(f"{unit_where}.chapters must be a non-empty array")
        for chapter_index, chapter_value in enumerate(chapters):
            chapter_where = f"{unit_where}.chapters[{chapter_index}]"
            chapter = _object(chapter_value, chapter_where)
            _keys(chapter, CHAPTER_KEYS, chapter_where)
            _required(chapter, {"chapter_id", "title", "lessons"}, chapter_where)
            _text(chapter["chapter_id"], f"{chapter_where}.chapter_id")
            _text(chapter["title"], f"{chapter_where}.title")
            for field in ("description",):
                if field in chapter:
                    _text(chapter[field], f"{chapter_where}.{field}")
            for field in ("essential_questions", "learning_objectives"):
                if field in chapter:
                    _text_list(chapter[field], f"{chapter_where}.{field}")
            lessons = chapter["lessons"]
            if not isinstance(lessons, list) or not lessons:
                raise PipelineError(f"{chapter_where}.lessons must be a non-empty array")
            for lesson_index, lesson_value in enumerate(lessons):
                lesson_where = f"{chapter_where}.lessons[{lesson_index}]"
                lesson = _object(lesson_value, lesson_where)
                merged = copy.deepcopy(defaults)
                merged.update(copy.deepcopy(lesson))
                merged["schema_version"] = 1
                merged["course_id"] = course["id"]
                merged["unit_id"] = unit["unit_id"]
                merged["chapter_id"] = chapter["chapter_id"]
                if "essential_question" not in merged and chapter.get("essential_questions"):
                    merged["essential_question"] = chapter["essential_questions"][0]
                alignment = dict(merged.get("ap_alignment", {}))
                alignment.setdefault("period", unit["period"])
                if unit.get("themes"):
                    alignment.setdefault("themes", unit["themes"])
                merged["ap_alignment"] = alignment
                lesson_id = merged.get("lesson_id")
                _text(lesson_id, f"{lesson_where}.lesson_id")
                if lesson_id in lesson_ids:
                    raise PipelineError(f"duplicate curriculum lesson_id: {lesson_id}")
                lesson_ids.add(lesson_id)
                validate_manifest(
                    merged, path, repo_root, require_files=True,
                    allow_missing_clips=allow_missing_clips)
                run_all_gates(merged, path, repo_root)
                expanded.append(merged)
    return expanded
