from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from .common import PipelineError, resolve_local

ANIMATION_TYPES = {
    "auto", "title", "ken_burns", "zoom", "camera_path", "callout",
    "timeline", "bullets", "typewriter", "map", "counter", "versus",
    "wipe", "ai_clip", "parallax", "source_analysis", "diagram",
}

ROOT_KEYS = {"schema_version", "course_id", "unit_id", "chapter_id", "lesson_id", "title", "description", "essential_question", "learning_objectives", "key_terms", "ap_alignment", "presentation", "output", "tts", "generation", "clip_generation", "still_generation", "video", "scenes", "transition_scheme"}
VIDEO_KEYS = {"width", "height", "fps", "transition_seconds"}
TTS_KEYS = {"engine", "server_url", "reference_audio", "reference_text", "timeout_seconds", "settings", "edge_voice", "edge_rate", "edge_pitch", "voices"}
GEN_KEYS = {"provider", "model", "endpoint", "api_key_env", "timeout_seconds"}
CLIP_GEN_KEYS = {"provider", "cookie", "browser", "lib_dir", "timeout_seconds", "keep_open_on_failure", "meta_refusal_retries"}
STILL_GEN_KEYS = {"provider", "fallback_provider", "search_provider", "media_bin", "image_search_bin", "command", "timeout_seconds", "orientation", "image_output_format"}
STILL_KEYS = {"prompt", "provider", "fallback_provider", "seed", "edit_of", "edit_prompt", "orientation", "license_note"}
SEARCH_KEYS = {"query", "page_title", "provider", "pick", "min_width", "license", "sha256"}
SCENE_KEYS = {"id", "purpose", "narration", "visual", "animation", "beats", "audio", "transition", "min_duration", "topics", "on_screen_text", "source", "production_notes", "device", "device_params"}
NARRATION_KEYS = {"text", "voice", "reference_audio", "reference_text", "settings"}
VISUAL_KEYS = {"base_image", "secondary_image", "clip", "layers", "still", "search"}
ALIGNMENT_KEYS = {"period", "topics", "themes", "skills"}
PRESENTATION_KEYS = {"audience", "tone", "visual_style", "captions", "music", "branding"}
SOURCE_KEYS = {"title", "creator", "date", "license", "url", "notes"}
COMMON_ANIMATION_KEYS = {"type", "prompt", "caption", "title", "subtitle"}
ANIMATION_KEYS = {
    "auto": COMMON_ANIMATION_KEYS,
    "title": COMMON_ANIMATION_KEYS,
    "ken_burns": COMMON_ANIMATION_KEYS | {"zoom", "pan_x", "pan_y"},
    "zoom": COMMON_ANIMATION_KEYS | {"cx", "cy", "end_zoom", "zoom_duration", "highlight_box"},
    "camera_path": COMMON_ANIMATION_KEYS | {"waypoints"},
    "callout": COMMON_ANIMATION_KEYS | {"points"},
    "timeline": COMMON_ANIMATION_KEYS | {"events"},
    "bullets": COMMON_ANIMATION_KEYS | {"bullets", "footer", "stagger"},
    "typewriter": COMMON_ANIMATION_KEYS | {"text"},
    "map": COMMON_ANIMATION_KEYS | {"moves"},
    "counter": COMMON_ANIMATION_KEYS | {"target", "label", "prefix", "suffix", "start", "decimals", "at"},
    "versus": COMMON_ANIMATION_KEYS | {"name_left", "name_right"},
    "wipe": COMMON_ANIMATION_KEYS | {"label_a", "label_b", "direction"},
    "ai_clip": COMMON_ANIMATION_KEYS | {"seed", "duration", "provider", "fallback_provider"},
    "parallax": COMMON_ANIMATION_KEYS | {"background_drift", "background_zoom"},
    "source_analysis": COMMON_ANIMATION_KEYS | {"highlights"},
    "diagram": COMMON_ANIMATION_KEYS | {"nodes", "edges"},
}


def _obj(value: Any, where: str) -> dict:
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


def _text(value: Any, where: str, minimum: int = 1) -> None:
    if not isinstance(value, str) or len(value.strip()) < minimum:
        raise PipelineError(f"{where} must be a string of at least {minimum} character(s)")


def _number(value: Any, where: str, low: float | None = None, high: float | None = None) -> None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise PipelineError(f"{where} must be a number")
    if low is not None and value < low or high is not None and value > high:
        raise PipelineError(f"{where} must be between {low} and {high}")


def _validate_device(name: str, params: dict, where: str) -> None:
    """Validate the creative-device registry consumed by video/motion.py."""
    registry = {
        "hook": ({"hook_type", "payoff_by_sec"}, {"hook_type", "payoff_by_sec"}),
        "redact_reveal": ({"lines", "reveal_on_cues"}, {"lines", "reveal_on_cues"}),
        "reversal": ({"pivot", "setup_scene"}, {"pivot"}),
        "annotate": ({"mode", "annotations"}, {"annotations"}),
        "show_ask": ({"question", "hold_sec"}, {"question"}),
        "date_ticker": ({"position", "dates"}, {"dates"}),
    }
    if name not in registry:
        raise PipelineError(f"{where}.device is not a supported creative device")
    allowed, required = registry[name]
    _keys(params, allowed, f"{where}.device_params")
    _required(params, required, f"{where}.device_params")
    if name == "hook":
        if params["hook_type"] not in {"contradiction", "mystery", "stakes"}:
            raise PipelineError(f"{where}.device_params.hook_type is not supported")
        _number(params["payoff_by_sec"], f"{where}.device_params.payoff_by_sec", 0.5, 15)
    elif name == "redact_reveal":
        lines, cues = params["lines"], params["reveal_on_cues"]
        if (not isinstance(lines, list) or not lines or
                not all(isinstance(v, str) and v.strip() for v in lines)):
            raise PipelineError(f"{where}.device_params.lines must be non-empty strings")
        if (not isinstance(cues, list) or len(cues) != len(lines) or
                not all(isinstance(v, str) and v.strip() for v in cues)):
            raise PipelineError(f"{where}.device_params.reveal_on_cues must match lines")
    elif name == "reversal":
        if not isinstance(params["pivot"], bool):
            raise PipelineError(f"{where}.device_params.pivot must be true or false")
        if "setup_scene" in params:
            _text(params["setup_scene"], f"{where}.device_params.setup_scene")
    elif name == "annotate":
        if params.get("mode", "telestrator") != "telestrator":
            raise PipelineError(f"{where}.device_params.mode must be telestrator")
        notes = params["annotations"]
        if not isinstance(notes, list) or not notes:
            raise PipelineError(f"{where}.device_params.annotations must be non-empty")
        for index, note_value in enumerate(notes):
            nw = f"{where}.device_params.annotations[{index}]"
            note = _obj(note_value, nw)
            _keys(note, {"type", "label", "cue", "x", "y", "label_x", "label_y"}, nw)
            _required(note, {"type", "label", "cue"}, nw)
            if note["type"] not in {"circle", "arrow"}:
                raise PipelineError(f"{nw}.type must be circle or arrow")
            _text(note["label"], f"{nw}.label")
            _text(note["cue"], f"{nw}.cue")
            for field in ("x", "y", "label_x", "label_y"):
                if field in note:
                    _number(note[field], f"{nw}.{field}", 0, 1)
    elif name == "show_ask":
        _text(params["question"], f"{where}.device_params.question")
        if "hold_sec" in params:
            _number(params["hold_sec"], f"{where}.device_params.hold_sec", 0.5, 10)
    elif name == "date_ticker":
        if params.get("position", "top_right") not in {"top_left", "top_right"}:
            raise PipelineError(f"{where}.device_params.position must be top_left or top_right")
        dates = params["dates"]
        if (not isinstance(dates, list) or len(dates) < 2 or
                not all(isinstance(v, str) and v.strip() for v in dates)):
            raise PipelineError(f"{where}.device_params.dates must contain at least two labels")


def _text_list(value: Any, where: str, minimum: int = 1) -> None:
    if (not isinstance(value, list) or len(value) < minimum
            or not all(isinstance(item, str) and item.strip() for item in value)):
        raise PipelineError(f"{where} must contain at least {minimum} non-empty string(s)")


def _coord(value: Any, where: str, size: int) -> None:
    if not isinstance(value, list) or len(value) != size:
        raise PipelineError(f"{where} must be an array of {size} numbers")
    for index, item in enumerate(value):
        _number(item, f"{where}[{index}]", 0, 1 if size != 3 or index < 2 else 8)


def _timing(value: dict, where: str, required: bool = True) -> None:
    present = [field for field in ("at", "cue") if field in value]
    if required and len(present) != 1:
        raise PipelineError(f"{where} requires exactly one of at or cue")
    if len(present) > 1:
        raise PipelineError(f"{where} cannot contain both at and cue")
    if "at" in value:
        _number(value["at"], f"{where}.at", 0, 60)
    if "cue" in value:
        _text(value["cue"], f"{where}.cue")
    if "offset" in value:
        if "cue" not in value:
            raise PipelineError(f"{where}.offset requires cue")
        _number(value["offset"], f"{where}.offset", -10, 10)


def validate_animation(animation: Any, where: str, generated: bool = False) -> None:
    spec = _obj(animation, where)
    _required(spec, {"type"}, where)
    kind = spec["type"]
    if kind not in ANIMATION_TYPES or generated and kind == "auto":
        raise PipelineError(f"{where}.type must be one of: {', '.join(sorted(ANIMATION_TYPES - ({'auto'} if generated else set())))}")
    _keys(spec, ANIMATION_KEYS[kind], where)
    for field in ("prompt", "caption", "title", "subtitle"):
        if field in spec:
            _text(spec[field], f"{where}.{field}")
    if kind == "camera_path":
        points = spec.get("waypoints")
        if not isinstance(points, list) or len(points) < 2:
            raise PipelineError(f"{where}.waypoints must contain at least two [x,y,zoom] points")
        for index, point in enumerate(points):
            _coord(point, f"{where}.waypoints[{index}]", 3)
    for field in ("cx", "cy", "pan_x", "pan_y"):
        if field in spec:
            _number(spec[field], f"{where}.{field}", 0, 1)
    if "zoom" in spec:
        _number(spec["zoom"], f"{where}.zoom", 0, 1)
    if "end_zoom" in spec:
        _number(spec["end_zoom"], f"{where}.end_zoom", 1, 8)
    if "zoom_duration" in spec:
        _number(spec["zoom_duration"], f"{where}.zoom_duration", 0.1, 30)
    if "highlight_box" in spec:
        box = spec["highlight_box"]
        if not isinstance(box, list) or len(box) != 4 or not all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in box):
            raise PipelineError(f"{where}.highlight_box must be [x0,y0,x1,y1]")
    if kind == "callout":
        points = spec.get("points")
        if not isinstance(points, list) or not points:
            raise PipelineError(f"{where}.points must contain [x,y,label] entries")
        for index, point in enumerate(points):
            if not isinstance(point, list) or len(point) != 3:
                raise PipelineError(f"{where}.points[{index}] must be [x,y,label]")
            _number(point[0], f"{where}.points[{index}][0]", 0, 1)
            _number(point[1], f"{where}.points[{index}][1]", 0, 1)
            _text(point[2], f"{where}.points[{index}][2]")
    if kind == "timeline":
        events = spec.get("events")
        if not isinstance(events, list) or not 2 <= len(events) <= 6:
            raise PipelineError(f"{where}.events must contain 2-6 [label,caption] entries")
        for index, event in enumerate(events):
            if not isinstance(event, list) or len(event) != 2:
                raise PipelineError(f"{where}.events[{index}] must be [label,caption]")
            _text(event[0], f"{where}.events[{index}][0]")
            _text(event[1], f"{where}.events[{index}][1]")
    if kind == "bullets":
        bullets = spec.get("bullets")
        if not isinstance(bullets, list) or not 1 <= len(bullets) <= 6 or not all(isinstance(x, str) and x.strip() for x in bullets):
            raise PipelineError(f"{where}.bullets must contain 1-6 non-empty strings")
    if kind == "counter":
        _required(spec, {"target", "label"}, where)
        _number(spec["target"], f"{where}.target")
        _text(spec["label"], f"{where}.label")
        if "decimals" in spec and (isinstance(spec["decimals"], bool) or not isinstance(spec["decimals"], int) or not 0 <= spec["decimals"] <= 3):
            raise PipelineError(f"{where}.decimals must be an integer from 0 to 3")
    if kind == "versus":
        _required(spec, {"name_left", "name_right"}, where)
    if kind == "wipe" and spec.get("direction", "left") not in {"left", "right"}:
        raise PipelineError(f"{where}.direction must be left or right")
    if kind == "map":
        moves = spec.get("moves")
        if not isinstance(moves, list) or not moves:
            raise PipelineError(f"{where}.moves must contain at least one map move")
        allowed_move = {"path", "at", "cue", "offset", "color", "kind", "label", "label_pos"}
        for index, move in enumerate(moves):
            move_where = f"{where}.moves[{index}]"
            move = _obj(move, move_where)
            _keys(move, allowed_move, move_where)
            _required(move, {"path"}, move_where)
            _timing(move, move_where, required=False)
            if not isinstance(move["path"], list) or len(move["path"]) < 2:
                raise PipelineError(f"{move_where}.path must contain at least two [x,y] points")
            for point_index, point in enumerate(move["path"]):
                _coord(point, f"{move_where}.path[{point_index}]", 2)
            if move.get("kind", "arrow") not in {"arrow", "dots", "fill"}:
                raise PipelineError(f"{move_where}.kind must be arrow, dots, or fill")
            if "label_pos" in move:
                _coord(move["label_pos"], f"{move_where}.label_pos", 2)
            if "color" in move:
                color = move["color"]
                if not isinstance(color, list) or len(color) != 3 or not all(isinstance(x, int) and not isinstance(x, bool) and 0 <= x <= 255 for x in color):
                    raise PipelineError(f"{move_where}.color must be [r,g,b] integers")
    if kind == "ai_clip" and "seed" in spec and (isinstance(spec["seed"], bool) or not isinstance(spec["seed"], int)):
        raise PipelineError(f"{where}.seed must be an integer")
    if kind == "ai_clip":
        _required(spec, {"prompt"}, where)
        _number(spec.get("duration", 10), f"{where}.duration", 3, 10)
        for field in ("provider", "fallback_provider"):
            if field in spec and spec[field] not in {"ltx", "meta-ui"}:
                raise PipelineError(f"{where}.{field} must be ltx or meta-ui")
    if kind == "parallax":
        for field, default, high in (("background_drift", 0.03, 0.25),
                                     ("background_zoom", 0.05, 0.4)):
            _number(spec.get(field, default), f"{where}.{field}", 0, high)
    if kind == "source_analysis":
        highlights = spec.get("highlights")
        if not isinstance(highlights, list) or not highlights:
            raise PipelineError(f"{where}.highlights must contain at least one annotation")
        for index, value in enumerate(highlights):
            item_where = f"{where}.highlights[{index}]"
            item = _obj(value, item_where)
            _keys(item, {"box", "label", "at", "cue", "offset", "duration", "color"}, item_where)
            _required(item, {"box", "label"}, item_where)
            _timing(item, item_where)
            _coord(item["box"], f"{item_where}.box", 4)
            if item["box"][2] <= item["box"][0] or item["box"][3] <= item["box"][1]:
                raise PipelineError(f"{item_where}.box must be [x0,y0,x1,y1] with positive area")
            _text(item["label"], f"{item_where}.label")
            if "duration" in item:
                _number(item["duration"], f"{item_where}.duration", 0.5, 60)
            if "color" in item:
                color = item["color"]
                if not isinstance(color, list) or len(color) != 3 or not all(isinstance(x, int) and not isinstance(x, bool) and 0 <= x <= 255 for x in color):
                    raise PipelineError(f"{item_where}.color must be [r,g,b] integers")
    if kind == "diagram":
        nodes = spec.get("nodes")
        edges = spec.get("edges")
        if not isinstance(nodes, list) or not 2 <= len(nodes) <= 8:
            raise PipelineError(f"{where}.nodes must contain 2-8 nodes")
        ids = set()
        for index, value in enumerate(nodes):
            node_where = f"{where}.nodes[{index}]"
            node = _obj(value, node_where)
            _keys(node, {"id", "label", "x", "y", "at", "cue", "offset", "color"}, node_where)
            _required(node, {"id", "label", "x", "y"}, node_where)
            _text(node["id"], f"{node_where}.id")
            _text(node["label"], f"{node_where}.label")
            if node["id"] in ids:
                raise PipelineError(f"{where} has duplicate diagram node id {node['id']}")
            ids.add(node["id"])
            _number(node["x"], f"{node_where}.x", 0, 1)
            _number(node["y"], f"{node_where}.y", 0, 1)
            _timing(node, node_where)
        if not isinstance(edges, list) or not edges:
            raise PipelineError(f"{where}.edges must contain at least one edge")
        for index, value in enumerate(edges):
            edge_where = f"{where}.edges[{index}]"
            edge = _obj(value, edge_where)
            _keys(edge, {"from", "to", "label", "at", "cue", "offset", "color"}, edge_where)
            _required(edge, {"from", "to"}, edge_where)
            if edge["from"] not in ids or edge["to"] not in ids:
                raise PipelineError(f"{edge_where} references an unknown node")
            if "label" in edge:
                _text(edge["label"], f"{edge_where}.label")
            _timing(edge, edge_where)


def validate_manifest(data: Any, path: Path, repo_root: Path,
                      require_files: bool = True,
                      allow_missing_clips: bool = False) -> dict:
    root = _obj(data, "manifest")
    _keys(root, ROOT_KEYS, "manifest")
    _required(root, {"schema_version", "lesson_id", "title", "output", "tts", "scenes"}, "manifest")
    if root["schema_version"] != 1:
        raise PipelineError("manifest.schema_version must be 1")
    _text(root["lesson_id"], "manifest.lesson_id")
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{1,63}", root["lesson_id"]):
        raise PipelineError("manifest.lesson_id must be a lowercase filesystem-safe id")
    _text(root["title"], "manifest.title")
    if "description" in root:
        _text(root["description"], "manifest.description")
    for field in ("course_id", "unit_id", "chapter_id"):
        if field in root:
            _text(root[field], f"manifest.{field}")
    if "essential_question" in root:
        _text(root["essential_question"], "manifest.essential_question")
    if "learning_objectives" in root:
        _text_list(root["learning_objectives"], "manifest.learning_objectives")
    if "key_terms" in root:
        terms = root["key_terms"]
        if not isinstance(terms, list) or not terms:
            raise PipelineError("manifest.key_terms must be a non-empty array")
        for index, term in enumerate(terms):
            term = _obj(term, f"manifest.key_terms[{index}]")
            _keys(term, {"term", "definition"}, f"manifest.key_terms[{index}]")
            _required(term, {"term", "definition"}, f"manifest.key_terms[{index}]")
            _text(term["term"], f"manifest.key_terms[{index}].term")
            _text(term["definition"], f"manifest.key_terms[{index}].definition")
    if "ap_alignment" in root:
        alignment = _obj(root["ap_alignment"], "manifest.ap_alignment")
        _keys(alignment, ALIGNMENT_KEYS, "manifest.ap_alignment")
        if "period" in alignment:
            _text(alignment["period"], "manifest.ap_alignment.period")
        for field in ("topics", "themes", "skills"):
            if field in alignment:
                _text_list(alignment[field], f"manifest.ap_alignment.{field}")
    if "presentation" in root:
        presentation = _obj(root["presentation"], "manifest.presentation")
        _keys(presentation, PRESENTATION_KEYS, "manifest.presentation")
        for field in ("audience", "tone", "visual_style", "music", "branding"):
            if field in presentation:
                _text(presentation[field], f"manifest.presentation.{field}")
        if "captions" in presentation and not isinstance(presentation["captions"], bool):
            raise PipelineError("manifest.presentation.captions must be true or false")
    _text(root["output"], "manifest.output")
    if not root["output"].lower().endswith(".mp4"):
        raise PipelineError("manifest.output must end in .mp4")

    video = _obj(root.get("video", {}), "manifest.video")
    _keys(video, VIDEO_KEYS, "manifest.video")
    if video.get("width", 1080) != 1080 or video.get("height", 1920) != 1920:
        raise PipelineError("the reusable APUSH motion library currently requires 1080x1920 vertical video")
    _number(video.get("fps", 30), "manifest.video.fps", 24, 60)
    _number(video.get("transition_seconds", 0.2), "manifest.video.transition_seconds", 0, 0.5)
    if video.get("transition_seconds", 0.2) != 0.2:
        raise PipelineError("manifest.video.transition_seconds must be 0.2 for the shared motion renderer")

    tts = _obj(root["tts"], "manifest.tts")
    _keys(tts, TTS_KEYS, "manifest.tts")
    engine = tts.get("engine", "fish")
    if engine not in {"fish", "edge", "fish_cloud"}:
        raise PipelineError("manifest.tts.engine must be fish, edge, or fish_cloud")
    if engine == "fish":
        _required(tts, {"server_url", "reference_audio", "reference_text"}, "manifest.tts")
        _text(tts["server_url"], "manifest.tts.server_url")
        _text(tts["reference_audio"], "manifest.tts.reference_audio")
        _text(tts["reference_text"], "manifest.tts.reference_text")
        if not re.fullmatch(r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?", tts["server_url"].rstrip("/")):
            raise PipelineError("manifest.tts.server_url must be a loopback HTTP URL")
    else:
        _text(tts.get("edge_voice", "en-US-GuyNeural"), "manifest.tts.edge_voice")
        for field, default in (("edge_rate", "+0%"), ("edge_pitch", "+0Hz")):
            _text(tts.get(field, default), f"manifest.tts.{field}")
    if "timeout_seconds" in tts:
        _number(tts["timeout_seconds"], "manifest.tts.timeout_seconds", 1, 3600)
    if "settings" in tts and not isinstance(tts["settings"], dict):
        raise PipelineError("manifest.tts.settings must be an object")
    if "voices" in tts:
        voices = tts["voices"]
        if not isinstance(voices, dict) or not voices:
            raise PipelineError("manifest.tts.voices must be a non-empty object")
        allowed = {"edge_voice", "edge_rate", "edge_pitch", "reference_audio", "reference_text", "settings"}
        for name, cfg in voices.items():
            where = f"manifest.tts.voices.{name}"
            if not isinstance(cfg, dict):
                raise PipelineError(f"{where} must be an object")
            for key in cfg:
                if key not in allowed:
                    raise PipelineError(f"{where}.{key} is not a valid voice field")
            if "settings" in cfg and not isinstance(cfg["settings"], dict):
                raise PipelineError(f"{where}.settings must be an object")

    generation = _obj(root.get("generation", {"provider": "none"}), "manifest.generation")
    _keys(generation, GEN_KEYS, "manifest.generation")
    if generation.get("provider", "none") not in {"none", "ollama", "meta-api"}:
        raise PipelineError("manifest.generation.provider must be none, ollama, or meta-api")
    if generation.get("provider", "none") != "none":
        _text(generation.get("model"), "manifest.generation.model")
    for field in ("endpoint", "api_key_env"):
        if field in generation:
            _text(generation[field], f"manifest.generation.{field}")
    if "timeout_seconds" in generation:
        _number(generation["timeout_seconds"], "manifest.generation.timeout_seconds", 1, 3600)

    clip_generation = _obj(root.get("clip_generation", {"provider": "none"}), "manifest.clip_generation")
    _keys(clip_generation, CLIP_GEN_KEYS, "manifest.clip_generation")
    if clip_generation.get("provider", "none") not in {"none", "ltx", "meta-ui"}:
        raise PipelineError("manifest.clip_generation.provider must be none, ltx, or meta-ui")
    if clip_generation.get("browser", "chrome") not in {"chrome", "edge"}:
        raise PipelineError("manifest.clip_generation.browser must be chrome or edge")
    for field in ("cookie", "lib_dir"):
        if field in clip_generation:
            _text(clip_generation[field], f"manifest.clip_generation.{field}")
    if "timeout_seconds" in clip_generation:
        _number(clip_generation["timeout_seconds"], "manifest.clip_generation.timeout_seconds", 30, 3600)
    if "keep_open_on_failure" in clip_generation and not isinstance(clip_generation["keep_open_on_failure"], bool):
        raise PipelineError("manifest.clip_generation.keep_open_on_failure must be true or false")
    if "meta_refusal_retries" in clip_generation:
        retries = clip_generation["meta_refusal_retries"]
        if isinstance(retries, bool) or not isinstance(retries, int) or not 0 <= retries <= 3:
            raise PipelineError("manifest.clip_generation.meta_refusal_retries must be an integer from 0 to 3")

    still_generation = _obj(root.get("still_generation", {"provider": "none"}), "manifest.still_generation")
    _keys(still_generation, STILL_GEN_KEYS, "manifest.still_generation")
    if still_generation.get("provider", "none") not in {"none", "hatch-media", "command"}:
        raise PipelineError("manifest.still_generation.provider must be none, hatch-media, or command")
    if still_generation.get("search_provider", "wikimedia") not in {"wikimedia", "image-search"}:
        raise PipelineError("manifest.still_generation.search_provider must be wikimedia or image-search")
    if still_generation.get("fallback_provider", "none") not in {"none", "hatch-media", "command"}:
        raise PipelineError("manifest.still_generation.fallback_provider must be none, hatch-media, or command")
    for field in ("media_bin", "image_search_bin"):
        if field in still_generation:
            _text(still_generation[field], f"manifest.still_generation.{field}")
    if "command" in still_generation:
        command = still_generation["command"]
        if isinstance(command, str):
            _text(command, "manifest.still_generation.command")
        elif (not isinstance(command, list) or not command or
              not all(isinstance(item, str) and item for item in command)):
            raise PipelineError("manifest.still_generation.command must be a string or argv array")
    if "timeout_seconds" in still_generation:
        _number(still_generation["timeout_seconds"], "manifest.still_generation.timeout_seconds", 30, 3600)
    if still_generation.get("orientation", "landscape") not in {"landscape", "square", "vertical"}:
        raise PipelineError("manifest.still_generation.orientation must be landscape, square, or vertical")
    if still_generation.get("image_output_format", "webp") not in {"webp", "png", "jpg", "jpeg"}:
        raise PipelineError("manifest.still_generation.image_output_format must be webp, png, jpg, or jpeg")

    scenes = root["scenes"]
    if not isinstance(scenes, list) or not scenes:
        raise PipelineError("manifest.scenes must be a non-empty array")
    ids: set[str] = set()
    for index, scene_value in enumerate(scenes):
        where = f"manifest.scenes[{index}]"
        scene = _obj(scene_value, where)
        _keys(scene, SCENE_KEYS, where)
        _required(scene, {"id", "narration", "visual", "animation"}, where)
        _text(scene["id"], f"{where}.id")
        if "purpose" in scene and scene["purpose"] not in {"hook", "context", "concept", "evidence", "comparison", "application", "recap", "close"}:
            raise PipelineError(f"{where}.purpose is not a supported instructional purpose")
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,47}", scene["id"]):
            raise PipelineError(f"{where}.id must be lowercase and filesystem-safe")
        if scene["id"] in ids:
            raise PipelineError(f"duplicate scene id: {scene['id']}")
        ids.add(scene["id"])
        # device: optional creative-device declaration (metadata-first; the
        # renderer and device gates read it once the device registry lands).
        # Format-checked here; registry membership is validated later.
        if "device" in scene:
            _text(scene["device"], f"{where}.device")
            if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,47}", scene["device"]):
                raise PipelineError(f"{where}.device must be a lowercase registry id")
        if "device_params" in scene:
            _obj(scene["device_params"], f"{where}.device_params")
            if "device" not in scene:
                raise PipelineError(f"{where}.device_params requires device")
        if "device" in scene:
            _validate_device(scene["device"], scene.get("device_params", {}), where)
        narration = _obj(scene["narration"], f"{where}.narration")
        _keys(narration, NARRATION_KEYS, f"{where}.narration")
        _required(narration, {"text"}, f"{where}.narration")
        _text(narration["text"], f"{where}.narration.text", 8)
        for field in ("voice", "reference_audio", "reference_text"):
            if field in narration:
                _text(narration[field], f"{where}.narration.{field}")
        if "settings" in narration and not isinstance(narration["settings"], dict):
            raise PipelineError(f"{where}.narration.settings must be an object")
        visual = _obj(scene["visual"], f"{where}.visual")
        _keys(visual, VISUAL_KEYS, f"{where}.visual")
        for field in ("base_image", "secondary_image", "clip"):
            if field in visual:
                _text(visual[field], f"{where}.visual.{field}")
        if "still" in visual and "search" in visual:
            raise PipelineError(f"{where}.visual: still and search are mutually exclusive")
        if "still" in visual:
            still = _obj(visual["still"], f"{where}.visual.still")
            _keys(still, STILL_KEYS, f"{where}.visual.still")
            edit_of, edit_prompt = still.get("edit_of"), still.get("edit_prompt")
            if bool(edit_of) != bool(edit_prompt):
                raise PipelineError(
                    f"{where}.visual.still: edit_of and edit_prompt must be used together (edit variant)")
            if not still.get("prompt") and not edit_of:
                raise PipelineError(f"{where}.visual.still: prompt is required (or edit_of + edit_prompt)")
            for field in ("prompt", "edit_of", "edit_prompt"):
                if field in still:
                    _text(still[field], f"{where}.visual.still.{field}")
            if still.get("provider", "hatch-media") not in {"hatch-media", "command"}:
                raise PipelineError(f"{where}.visual.still.provider must be hatch-media or command")
            if still.get("fallback_provider", "none") not in {"none", "hatch-media", "command"}:
                raise PipelineError(f"{where}.visual.still.fallback_provider must be none, hatch-media, or command")
            if "seed" in still:
                seed = still["seed"]
                if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0:
                    raise PipelineError(f"{where}.visual.still.seed must be a non-negative integer")
            if still.get("orientation", "landscape") not in {"landscape", "square", "vertical"}:
                raise PipelineError(f"{where}.visual.still.orientation must be landscape, square, or vertical")
        if "search" in visual:
            search = _obj(visual["search"], f"{where}.visual.search")
            _keys(search, SEARCH_KEYS, f"{where}.visual.search")
            if "query" not in search and "page_title" not in search:
                raise PipelineError(f"{where}.visual.search requires query or page_title")
            if "query" in search:
                _text(search["query"], f"{where}.visual.search.query", 3)
            if "page_title" in search:
                _text(search["page_title"], f"{where}.visual.search.page_title", 6)
                if not search["page_title"].startswith("File:"):
                    raise PipelineError(f"{where}.visual.search.page_title must start with File:")
            if "sha256" in search and not re.fullmatch(r"[0-9a-fA-F]{64}", search["sha256"]):
                raise PipelineError(f"{where}.visual.search.sha256 must be 64 hexadecimal characters")
            if search.get("provider", "wikimedia") not in {"wikimedia", "image-search"}:
                raise PipelineError(f"{where}.visual.search.provider must be wikimedia or image-search")
            if search.get("provider", "wikimedia") == "image-search" and "query" not in search:
                raise PipelineError(f"{where}.visual.search.query is required for image-search")
            if "pick" in search:
                pick = search["pick"]
                if isinstance(pick, bool) or not isinstance(pick, int) or pick < 0:
                    raise PipelineError(f"{where}.visual.search.pick must be a non-negative integer")
            if "min_width" in search:
                _number(search["min_width"], f"{where}.visual.search.min_width", 100, 8000)
            if search.get("license", "public-domain") != "public-domain":
                raise PipelineError(f"{where}.visual.search.license must be public-domain")
        layers = visual.get("layers", [])
        if not isinstance(layers, list):
            raise PipelineError(f"{where}.visual.layers must be an array")
        for layer_index, value in enumerate(layers):
            layer_where = f"{where}.visual.layers[{layer_index}]"
            layer = _obj(value, layer_where)
            _keys(layer, {"image", "x", "y", "scale", "depth", "drift_x", "drift_y", "entrance"}, layer_where)
            _required(layer, {"image"}, layer_where)
            _text(layer["image"], f"{layer_where}.image")
            for field, default, low, high in (("x", 0.5, 0, 1), ("y", 0.5, 0, 1),
                                               ("scale", 0.35, 0.05, 2), ("depth", 1, 0, 4),
                                               ("drift_x", 0, -0.5, 0.5), ("drift_y", 0, -0.5, 0.5)):
                _number(layer.get(field, default), f"{layer_where}.{field}", low, high)
            if layer.get("entrance", "pop") not in {"none", "pop", "slide_left", "slide_right", "rise"}:
                raise PipelineError(f"{layer_where}.entrance is not supported")
        validate_animation(scene["animation"], f"{where}.animation")
        kind = scene["animation"]["type"]
        if kind not in {"title", "bullets", "typewriter"} and "base_image" not in visual:
            raise PipelineError(f"{where}.visual.base_image is required for {kind}")
        if kind in {"versus", "wipe"} and "secondary_image" not in visual:
            raise PipelineError(f"{where}.visual.secondary_image is required for {kind}")
        if kind == "ai_clip" and "clip" not in visual:
            raise PipelineError(f"{where}.visual.clip is required for ai_clip")
        if kind == "parallax" and not layers:
            raise PipelineError(f"{where}.visual.layers is required for parallax")
        if "beats" in scene:
            beats = scene["beats"]
            if not isinstance(beats, list) or not beats:
                raise PipelineError(f"{where}.beats must contain at least one timed beat")
            allowed_beat = {"type", "at", "cue", "offset", "duration", "text", "x", "y", "x2", "y2", "color", "style"}
            for beat_index, value in enumerate(beats):
                beat_where = f"{where}.beats[{beat_index}]"
                beat = _obj(value, beat_where)
                _keys(beat, allowed_beat, beat_where)
                _required(beat, {"type"}, beat_where)
                _timing(beat, beat_where)
                if beat["type"] not in {"label", "question", "stamp", "arrow", "progress", "host", "icon", "pause"}:
                    raise PipelineError(f"{beat_where}.type is not supported")
                if "duration" in beat:
                    _number(beat["duration"], f"{beat_where}.duration", 0.2, 60)
                if beat["type"] != "progress":
                    _text(beat.get("text"), f"{beat_where}.text")
                for field in ("x", "y", "x2", "y2"):
                    if field in beat:
                        _number(beat[field], f"{beat_where}.{field}", 0, 1)
                if "color" in beat:
                    color = beat["color"]
                    if not isinstance(color, list) or len(color) != 3 or not all(isinstance(x, int) and not isinstance(x, bool) and 0 <= x <= 255 for x in color):
                        raise PipelineError(f"{beat_where}.color must be [r,g,b] integers")
                if "style" in beat:
                    _text(beat["style"], f"{beat_where}.style")
        if "audio" in scene:
            audio = _obj(scene["audio"], f"{where}.audio")
            _keys(audio, {"ambience", "ambience_volume", "effects", "foley", "foley_gain", "foley_fade_sec"}, f"{where}.audio")
            if "ambience" in audio:
                _text(audio["ambience"], f"{where}.audio.ambience")
            if "ambience_volume" in audio:
                _number(audio["ambience_volume"], f"{where}.audio.ambience_volume", 0, 1)
            if "foley" in audio:
                if audio["foley"] not in {"paper_rustle", "quill_scratch"}:
                    raise PipelineError(f"{where}.audio.foley is not supported")
            if "foley_gain" in audio:
                _number(audio["foley_gain"], f"{where}.audio.foley_gain", 0, 1)
                if "foley" not in audio:
                    raise PipelineError(f"{where}.audio.foley_gain requires foley")
            if "foley_fade_sec" in audio:
                _number(audio["foley_fade_sec"], f"{where}.audio.foley_fade_sec", 0, 10)
                if "foley" not in audio:
                    raise PipelineError(f"{where}.audio.foley_fade_sec requires foley")
            effects = audio.get("effects", [])
            if not isinstance(effects, list):
                raise PipelineError(f"{where}.audio.effects must be an array")
            for effect_index, value in enumerate(effects):
                effect_where = f"{where}.audio.effects[{effect_index}]"
                effect = _obj(value, effect_where)
                _keys(effect, {"at", "cue", "offset", "kind", "file", "volume"}, effect_where)
                _timing(effect, effect_where)
                if not effect.get("kind") and not effect.get("file"):
                    raise PipelineError(f"{effect_where} requires kind or file")
                if effect.get("kind") not in {None, "impact", "whoosh", "tick", "chime", "page_turn"}:
                    raise PipelineError(f"{effect_where}.kind is not supported")
                if "file" in effect:
                    _text(effect["file"], f"{effect_where}.file")
                if "volume" in effect:
                    _number(effect["volume"], f"{effect_where}.volume", 0, 2)
        if "transition" in scene:
            transition = _obj(scene["transition"], f"{where}.transition")
            _keys(transition, {"type", "duration", "direction"}, f"{where}.transition")
            _required(transition, {"type"}, f"{where}.transition")
            if transition["type"] not in {"hard_cut", "crossfade", "slide", "dip_to_black"}:
                raise PipelineError(f"{where}.transition.type is not supported")
            if "duration" in transition:
                _number(transition["duration"], f"{where}.transition.duration", 0.05, 1.5)
            if transition.get("direction", "left") not in {"left", "right", "top", "bottom"}:
                raise PipelineError(f"{where}.transition.direction is not supported")
        if require_files:
            refs = ([tts["reference_audio"], tts["reference_text"]]
                    if engine == "fish" else [])
            # A base_image declared with a still/search spec is produced by the
            # stills stage, which runs right after validation -- exempt it here.
            visual_keys = ["secondary_image"]
            if "base_image" in visual and not (visual.get("still") or visual.get("search")):
                visual_keys.insert(0, "base_image")
            refs += [visual[key] for key in visual_keys if key in visual]
            if "clip" in visual and not (kind == "ai_clip" and allow_missing_clips):
                refs.append(visual["clip"])
            refs += [layer["image"] for layer in layers]
            if scene.get("audio", {}).get("ambience"):
                refs.append(scene["audio"]["ambience"])
            refs += [effect["file"] for effect in scene.get("audio", {}).get("effects", []) if effect.get("file")]
            refs += [narration[key] for key in ("reference_audio", "reference_text") if key in narration]
            for ref in refs:
                _text(ref, f"{where}.path")
                resolved = resolve_local(ref, path.parent, repo_root)
                if not resolved.is_file():
                    raise PipelineError(f"{where}: referenced file does not exist: {ref} (resolved {resolved})")
        if "min_duration" in scene:
            _number(scene["min_duration"], f"{where}.min_duration", 0.5, 60)
        if "topics" in scene and (not isinstance(scene["topics"], list) or not all(isinstance(topic, str) and topic.strip() for topic in scene["topics"])):
            raise PipelineError(f"{where}.topics must be an array of non-empty strings")
        if "on_screen_text" in scene:
            _text_list(scene["on_screen_text"], f"{where}.on_screen_text")
        if "production_notes" in scene:
            _text(scene["production_notes"], f"{where}.production_notes")
        if "source" in scene:
            source = _obj(scene["source"], f"{where}.source")
            _keys(source, SOURCE_KEYS, f"{where}.source")
            _required(source, {"title", "license"}, f"{where}.source")
            for field, value in source.items():
                _text(value, f"{where}.source.{field}")
    return root
