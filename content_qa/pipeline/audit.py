from __future__ import annotations

import math
import re
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from PIL import Image, UnidentifiedImageError

from .models import ContentRecord, Finding

LABEL = re.compile(r"^\s*(?:\(([A-D])\)|([A-D])[.)])\s*")
TOKEN = re.compile(r"[A-Za-z0-9']+")
ABSOLUTES = {"always", "never", "only", "entirely", "completely", "all", "none"}


def clean_option(value: Any) -> str:
    return LABEL.sub("", str(value)).strip()


def words(value: Any) -> list[str]:
    return [x.lower() for x in TOKEN.findall(str(value))]


def _finding(record: ContentRecord, gate: str, severity: str, message: str, **evidence: Any) -> Finding:
    return Finding(record.uid, str(record.source_path), record.pointer, gate, severity, message, evidence)


def _period_number(period: Any) -> int | None:
    match = re.search(r"([1-9])", str(period or ""))
    return int(match.group(1)) if match else None


def _audit_alignment(record: ContentRecord, standards: dict[str, Any]) -> list[Finding]:
    found: list[Finding] = []
    item = record.data
    topic = str(item.get("topic_code") or "")
    valid_topics = {str(x.get("code")) for x in standards.get("topics", []) if isinstance(x, dict)}
    valid_skills = {str(x.get("code")) for x in standards.get("skills", []) if isinstance(x, dict)}
    if record.kind == "mcq" and not topic:
        found.append(_finding(record, "completeness", "major", "MCQ has no topic_code"))
    elif topic and topic not in valid_topics:
        found.append(_finding(record, "topical_alignment", "major", f"unknown APUSH topic_code {topic!r}"))
    period = _period_number(item.get("period"))
    if topic and period and topic.split(".", 1)[0].isdigit() and int(topic.split(".", 1)[0]) != period:
        found.append(_finding(record, "topical_alignment", "major", "period and topic_code disagree", period=item.get("period"), topic_code=topic))
    skill = str(item.get("skill_code") or "")
    if record.kind == "mcq" and not skill:
        found.append(_finding(record, "completeness", "minor", "MCQ has no skill_code"))
    elif skill and skill not in valid_skills:
        found.append(_finding(record, "topical_alignment", "major", f"unknown AP skill_code {skill!r}"))
    return found


def _audit_image(record: ContentRecord, repo_root: Path, policy: dict[str, Any]) -> list[Finding]:
    stimulus = record.data.get("stimulus")
    if not isinstance(stimulus, dict) or not (stimulus.get("image_url") or stimulus.get("image")):
        return []
    found: list[Finding] = []
    raw = str(stimulus.get("image_url") or stimulus.get("image"))
    if raw.startswith(("http://", "https://")):
        if policy.get("require_local_images", True):
            found.append(_finding(record, "image_integrity", "major", "image is remote-only; rendering is not reproducible", image_url=raw))
        return found
    image_path = (repo_root / raw).resolve()
    try:
        image_path.relative_to(repo_root.resolve())
    except ValueError:
        return [_finding(record, "image_integrity", "blocker", "image path escapes repository", image_url=raw)]
    if not image_path.exists():
        return [_finding(record, "image_integrity", "blocker", "local image does not exist", image_url=raw)]
    if image_path.suffix.lower() in {".tif", ".tiff"}:
        found.append(_finding(record, "image_rendering", "blocker", "TIFF images are not reliably renderable in browsers; convert to PNG/JPEG/WebP", image_url=raw))
    try:
        if image_path.suffix.lower() == ".svg":
            root = ET.parse(image_path).getroot()
            view_box = root.attrib.get("viewBox", "").replace(",", " ").split()
            if len(view_box) == 4:
                width, height = float(view_box[2]), float(view_box[3])
            else:
                number = re.compile(r"[-+]?\d*\.?\d+")
                width_match = number.search(root.attrib.get("width", ""))
                height_match = number.search(root.attrib.get("height", ""))
                if not width_match or not height_match:
                    raise ValueError("SVG has neither a valid viewBox nor width/height")
                width, height = float(width_match.group()), float(height_match.group())
        else:
            with Image.open(image_path) as image:
                image.verify()
            with Image.open(image_path) as image:
                width, height = image.size
        min_w = int(policy.get("image_min_width", 500))
        min_h = int(policy.get("image_min_height", 300))
        if width < min_w or height < min_h:
            found.append(_finding(record, "image_rendering", "minor", "image resolution is below policy", width=width, height=height, minimum=[min_w, min_h]))
    except (OSError, ValueError, ET.ParseError, UnidentifiedImageError) as exc:
        found.append(_finding(record, "image_rendering", "blocker", f"image cannot be decoded: {exc}", image_url=raw))
    for field in ("image_caption", "source_page", "pd_rationale"):
        if not str(stimulus.get(field) or "").strip():
            found.append(_finding(record, "image_integrity", "major", f"image stimulus lacks {field}"))
    return found


def _audit_mcq(record: ContentRecord, policy: dict[str, Any]) -> list[Finding]:
    item = record.data
    found: list[Finding] = []
    for field in ("id", "stem", "explanation", "period"):
        if not str(item.get(field) or "").strip():
            found.append(_finding(record, "completeness", "major", f"MCQ lacks {field}"))
    options = item.get("options")
    if not isinstance(options, list) or len(options) != 4:
        return found + [_finding(record, "answer_structure", "blocker", "MCQ must have exactly four options", count=len(options) if isinstance(options, list) else None)]
    cleaned = [clean_option(x) for x in options]
    if any(not x for x in cleaned):
        found.append(_finding(record, "answer_structure", "blocker", "MCQ has an empty option"))
    key = record.answer_key
    if key is None or key not in "ABCD":
        found.append(_finding(record, "answer_structure", "blocker", "MCQ has no resolvable A-D answer key"))
        key_index = None
    else:
        key_index = ord(key) - 65
    normalized = [" ".join(words(x)) for x in cleaned]
    if len(set(normalized)) != 4:
        found.append(_finding(record, "distractor_quality", "blocker", "duplicate answer options"))
    for i in range(4):
        for j in range(i + 1, 4):
            ratio = SequenceMatcher(None, normalized[i], normalized[j]).ratio()
            if ratio >= .88:
                found.append(_finding(record, "distractor_quality", "major", "answer options are near-duplicates", options=[chr(65 + i), chr(65 + j)], similarity=round(ratio, 3)))
    lengths = [len(words(x)) for x in cleaned]
    if key_index is not None and lengths[key_index] == max(lengths) and lengths.count(max(lengths)) == 1:
        other_mean = sum(v for i, v in enumerate(lengths) if i != key_index) / 3
        ratio = lengths[key_index] / max(other_mean, 1)
        if ratio >= float(policy.get("longest_answer_ratio", 1.55)):
            found.append(_finding(record, "answer_tell", "major", "keyed answer is uniquely and substantially longest", word_counts=lengths, ratio=round(ratio, 2)))
    minimum = int(policy.get("minimum_distractor_words", 3))
    for i, length in enumerate(lengths):
        if i != key_index and length < minimum:
            found.append(_finding(record, "distractor_quality", "major", "distractor is too short to be plausible", option=chr(65 + i), words=length))
    absolute_sets = [set(words(x)) & ABSOLUTES for x in cleaned]
    for i, values in enumerate(absolute_sets):
        if values and i != key_index and sum(bool(v) for v in absolute_sets) == 1:
            found.append(_finding(record, "answer_tell", "minor", "only one distractor uses absolute wording", option=chr(65 + i), words=sorted(values)))
    lowered = [x.lower() for x in cleaned]
    for i, value in enumerate(lowered):
        if "all of the above" in value or "none of the above" in value:
            found.append(_finding(record, "answer_tell", "major", "all/none-of-the-above option is disallowed", option=chr(65 + i)))
    explanations = item.get("option_explanations")
    if not isinstance(explanations, dict) or set(explanations) != set("ABCD"):
        found.append(_finding(record, "explanation_completeness", "major", "option_explanations must contain exactly A-D"))
    else:
        for label, text in explanations.items():
            if len(words(text)) < 5:
                found.append(_finding(record, "explanation_completeness", "minor", "option explanation is too thin", option=label))
        if key and re.search(r"\b(wrong|incorrect)\b", str(explanations.get(key, "")), re.I):
            found.append(_finding(record, "explanation_consistency", "blocker", "keyed option explanation labels itself wrong", key=key))
        for label in "ABCD":
            if label != key and re.search(r"\b(right|correct)\b", str(explanations.get(label, "")), re.I):
                found.append(_finding(record, "explanation_consistency", "major", "distractor explanation appears to label itself correct", option=label))
    return found


def _audit_writing(record: ContentRecord) -> list[Finding]:
    item = record.data
    found: list[Finding] = []
    prompt = item.get("prompt") or item.get("stem")
    parts = item.get("parts")
    part_prompts = []
    if isinstance(parts, list):
        part_prompts = [x.get("prompt") if isinstance(x, dict) else x for x in parts]
    elif isinstance(parts, dict):
        part_prompts = list(parts.values())
    elif isinstance(parts, str):
        part_prompts = [parts]
    if not str(prompt or "").strip() and not any(str(x or "").strip() for x in part_prompts):
        found.append(_finding(record, "completeness", "blocker", f"{record.kind.upper()} lacks a prompt"))
    if record.kind == "saq":
        if isinstance(parts, dict):
            labels = {str(x).lower() for x in parts}
        elif isinstance(parts, list):
            labels = set()
            for value in parts:
                if isinstance(value, dict):
                    labels.add(str(value.get("part", "")).lower())
                elif isinstance(value, str):
                    match = re.match(r"\s*([ABCabc])[.)]", value)
                    if match:
                        labels.add(match.group(1).lower())
        elif isinstance(parts, str):
            labels = {label.lower() for label in re.findall(r"(?:^|\s)([ABCabc])[.)]", parts)}
        else:
            labels = set()
        if not {"a", "b", "c"} <= labels:
            found.append(_finding(record, "writing_structure", "major", "SAQ must contain parts a, b, and c"))
        if not item.get("scoring_notes") and not item.get("exemplar_points") and not item.get("exemplar"):
            found.append(_finding(record, "writing_rubric", "major", "SAQ lacks scoring notes or exemplar points"))
    if record.kind == "dbq":
        docs = item.get("documents")
        if not isinstance(docs, list) or len(docs) < 7:
            found.append(_finding(record, "writing_structure", "major", "DBQ should include at least seven documents", count=len(docs) if isinstance(docs, list) else None))
        elif len({str(x.get("n")) for x in docs if isinstance(x, dict)}) != len(docs):
            found.append(_finding(record, "writing_structure", "blocker", "DBQ document numbers are duplicated"))
    if record.kind in {"dbq", "leq"}:
        if not item.get("rubric"):
            found.append(_finding(record, "writing_rubric", "blocker", f"{record.kind.upper()} lacks a rubric"))
        if not item.get("exemplar_thesis"):
            found.append(_finding(record, "writing_rubric", "major", f"{record.kind.upper()} lacks an exemplar thesis"))
    return found


def _audit_day_item(record: ContentRecord) -> list[Finding]:
    found: list[Finding] = []
    for field in ("id", "question", "answer", "period"):
        if not str(record.data.get(field) or "").strip():
            found.append(_finding(record, "completeness", "major", f"day item lacks {field}"))
    if len(words(record.data.get("answer"))) < 12:
        found.append(_finding(record, "answer_completeness", "major", "day-item answer is too thin for meaningful verification"))
    return found


def _bad_text_paths(value: Any, pointer: str = "") -> list[str]:
    found: list[str] = []
    if isinstance(value, str) and ("\ufffd" in value or "â€" in value or "Â" in value):
        found.append(pointer or "/")
    elif isinstance(value, dict):
        for key, child in value.items():
            found.extend(_bad_text_paths(child, f"{pointer}/{key}"))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(_bad_text_paths(child, f"{pointer}/{index}"))
    return found


def _audit_library(records: list[ContentRecord], standards: dict[str, Any]) -> list[Finding]:
    found: list[Finding] = []
    bank = [x for x in records if x.kind == "mcq" and "/section_1a/" not in x.pointer and "reconceived" not in x.source_path.parts]
    placeholder = ContentRecord("__library__", "library", Path("."), "", {})
    valid_topics = {str(x.get("code")) for x in standards.get("topics", []) if isinstance(x, dict)}
    topic_counts = Counter(str(x.data.get("topic_code")) for x in bank if x.data.get("topic_code"))
    missing = sorted(valid_topics - set(topic_counts))
    if missing:
        found.append(_finding(placeholder, "coverage", "major", "official APUSH topics have no canonical MCQs", missing_topics=missing))
    sparse = sorted(code for code in valid_topics if 0 < topic_counts[code] < 3)
    if sparse:
        found.append(_finding(placeholder, "coverage", "minor", "official APUSH topics have fewer than three canonical MCQs", sparse_topics={x: topic_counts[x] for x in sparse}))
    stems: dict[str, list[str]] = defaultdict(list)
    for record in bank:
        stem = " ".join(words(record.data.get("stem")))
        if stem:
            stems[stem].append(record.uid)
    duplicates = [ids for ids in stems.values() if len(ids) > 1]
    if duplicates:
        found.append(_finding(placeholder, "originality", "major", "canonical bank contains exact duplicate stems", duplicate_groups=duplicates[:50], group_count=len(duplicates)))
    by_file: dict[Path, list[ContentRecord]] = defaultdict(list)
    for record in records:
        if record.kind == "mcq" and record.answer_key:
            by_file[record.source_path].append(record)
    for path, items in by_file.items():
        if len(items) < 20:
            continue
        counts = Counter(x.answer_key for x in items)
        shares = {label: counts[label] / len(items) for label in "ABCD"}
        if any(value < .10 or value > .40 for value in shares.values()):
            source = ContentRecord(f"__key_balance__:{path.name}", "library", path, "", {})
            found.append(_finding(source, "answer_key_balance", "major", "answer-key distribution may reveal a pattern", items=len(items), counts=dict(counts), shares={k: round(v, 3) for k, v in shares.items()}))
    return found


def audit_records(records: list[ContentRecord], repo_root: Path, standards: dict[str, Any], policy: dict[str, Any]) -> list[Finding]:
    found: list[Finding] = []
    canonical = [x for x in records if "/section_1a/" not in x.pointer and "reconceived" not in x.source_path.parts]
    ids = Counter(x.uid for x in canonical)
    per_file_ids = Counter((x.source_path, x.uid) for x in records)
    for record in records:
        if ids[record.uid] > 1 or per_file_ids[(record.source_path, record.uid)] > 1:
            found.append(_finding(record, "identity", "blocker", "duplicate content id", occurrences=ids[record.uid]))
        found.extend(_audit_alignment(record, standards))
        found.extend(_audit_image(record, repo_root, policy))
        bad_text = _bad_text_paths(record.data)
        if bad_text:
            found.append(_finding(record, "text_encoding", "major", "content contains replacement or mojibake characters", fields=bad_text[:20], count=len(bad_text)))
        if record.kind == "mcq":
            found.extend(_audit_mcq(record, policy))
        elif record.kind in {"saq", "dbq", "leq"}:
            found.extend(_audit_writing(record))
        elif record.kind == "day-item":
            found.extend(_audit_day_item(record))
        else:
            found.append(_finding(record, "content_type", "minor", f"unsupported content type {record.kind!r}"))
    found.extend(_audit_library(records, standards))
    return found
