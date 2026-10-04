"""Hard quality gates for lesson manifests.

Each gate is fail-closed: violations raise PipelineError naming the
lesson, scene, and field. The gates run at the `validated` stage
(via run_all_gates, hooked into curriculum.expand_curriculum) so bad
content can never reach planning, TTS, or rendering.

The TTS-stage cue-resolution check lives in tts.render_scene (Edge path
only); it reuses iter_cues from this module.
"""
from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterator

from .common import PipelineError, read_json, resolve_local
from .direction import parse as parse_direction
from .direction import _TAG_RE as _DIRECTION_TAG_RE


# ---------------------------------------------------------------------------
# shared helpers
# ---------------------------------------------------------------------------

_CUE_FIELDS = ("highlights", "nodes", "edges", "moves")


def iter_cues(scene: dict) -> Iterator[tuple[str, str]]:
    """Yield (where, cue) for every cue-bearing item in a scene."""
    for index, beat in enumerate(scene.get("beats", []) or []):
        if isinstance(beat, dict) and "cue" in beat:
            yield f"beats[{index}].cue", beat["cue"]
    for index, effect in enumerate(scene.get("audio", {}).get("effects", []) or []):
        if isinstance(effect, dict) and "cue" in effect:
            yield f"audio.effects[{index}].cue", effect["cue"]
    animation = scene.get("animation", {}) or {}
    for field in _CUE_FIELDS:
        for index, item in enumerate(animation.get(field, []) or []):
            if isinstance(item, dict) and "cue" in item:
                yield f"animation.{field}[{index}].cue", item["cue"]


def _scenes(manifest: dict) -> list[dict]:
    scenes = manifest.get("scenes", [])
    if not isinstance(scenes, list):
        raise PipelineError("lesson manifest scenes must be an array")
    return scenes


def _lid(manifest: dict) -> str:
    return str(manifest.get("lesson_id", "<unknown lesson>"))


def _content_tokens(text: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", text.lower())
        if token not in _STOPWORDS and len(token) >= 3
    }


_STOPWORDS = {
    "a", "an", "the", "of", "on", "in", "at", "to", "and", "or", "for",
    "with", "from", "by", "as", "is", "are", "was", "were", "be", "been",
    "this", "that", "these", "those", "it", "its",
}


@lru_cache(maxsize=8)
def _catalog_entries(repo_root: str) -> dict[str, dict]:
    """Map CATALOG.json local_path -> entry (cached per repo root)."""
    path = Path(repo_root) / "assets" / "images" / "CATALOG.json"
    data = read_json(path)
    entries = data.get("entries", [])
    if not isinstance(entries, list):
        raise PipelineError(f"CATALOG.json entries is not an array: {path}")
    return {str(entry.get("local_path")): entry for entry in entries
            if isinstance(entry, dict)}


def _repo_rel(repo_root: Path, resolved: Path) -> str:
    root = repo_root.resolve()
    try:
        return resolved.resolve().relative_to(root).as_posix()
    except ValueError:
        raise PipelineError(f"path {resolved} resolves outside the repo root {root}")


# ---------------------------------------------------------------------------
# gate 1: cue integrity
# ---------------------------------------------------------------------------

def cue_integrity(manifest: dict) -> None:
    """Every cue must be a casefold substring of its scene's narration."""
    lid = _lid(manifest)
    for scene in _scenes(manifest):
        sid = scene.get("id", "<unknown scene>")
        narration = scene.get("narration", {}).get("text", "")
        if not isinstance(narration, str) or not narration:
            continue
        folded = narration.casefold()
        for where, cue in iter_cues(scene):
            if not isinstance(cue, str) or cue.strip().casefold() not in folded:
                raise PipelineError(
                    f"{lid}/{sid}: {where} {cue!r} is not a substring of the narration text; "
                    f"cues must be copied verbatim from the narration")


# ---------------------------------------------------------------------------
# gate 2: TTS-safe text
# ---------------------------------------------------------------------------

_FORBIDDEN_TTS_CHARS = {
    "\u2014": "em dash (use a period or comma)",
    "\u2013": "en dash (use a hyphen or comma)",
    "\u201c": "left double quote (use straight quotes)",
    "\u201d": "right double quote (use straight quotes)",
    "\u2018": "left single quote (use a straight apostrophe)",
    "\u2019": "right single quote (use a straight apostrophe)",
    "\u2026": "ellipsis (write the pause out)",
}

_CAPS_RE = re.compile(r"\b[A-Z]{2,}s?\b")
_CAPS_ALLOWLIST = {"AP", "US"}


def tts_text(manifest: dict) -> None:
    """Narration must be TTS-safe: ASCII punctuation only, and ALL-CAPS
    tokens must be hyphen-spaced (A-P-U-S-H) or explicitly allowlisted."""
    lid = _lid(manifest)
    for scene in _scenes(manifest):
        sid = scene.get("id", "<unknown scene>")
        text = scene.get("narration", {}).get("text", "")
        if not isinstance(text, str):
            continue
        # Check the spoken text: strip direction tags ([VOICE:], [pause:N],
        # [emphasis], ...) first, since they never reach the TTS engine.
        text = _DIRECTION_TAG_RE.sub("", text)
        for char, hint in _FORBIDDEN_TTS_CHARS.items():
            if char in text:
                raise PipelineError(
                    f"{lid}/{sid}: narration contains {hint}; "
                    f"TTS engines render it unpredictably")
        for match in _CAPS_RE.finditer(text):
            token = match.group(0)
            if token not in _CAPS_ALLOWLIST and "-" not in token:
                raise PipelineError(
                    f"{lid}/{sid}: ALL-CAPS token {token!r} will be misread by TTS "
                    f"(e.g. 'SAQs' reads as 'sacks'); hyphen-space it "
                    f"(e.g. 'S-A-Qs') or add it to the allowlist")


# ---------------------------------------------------------------------------
# gate 3: on-screen text quantity
# ---------------------------------------------------------------------------

def _word_count(text: Any) -> int:
    return len(str(text).split())


def text_quantity(manifest: dict) -> None:
    """On-screen text stays glanceable: beat text <= 8 words, bullets
    <= 12 words each and <= 4 bullets per scene."""
    lid = _lid(manifest)
    for scene in _scenes(manifest):
        sid = scene.get("id", "<unknown scene>")
        for index, beat in enumerate(scene.get("beats", []) or []):
            text = beat.get("text", "") if isinstance(beat, dict) else ""
            if _word_count(text) > 8:
                raise PipelineError(
                    f"{lid}/{sid}: beats[{index}] text has {_word_count(text)} words "
                    f"(>{8}); keep overlay text glanceable: {text!r}")
        bullets = (scene.get("animation", {}) or {}).get("bullets", []) or []
        if len(bullets) > 4:
            raise PipelineError(
                f"{lid}/{sid}: {len(bullets)} bullets (>4); split the scene or cut")
        for index, bullet in enumerate(bullets):
            if _word_count(bullet) > 12:
                raise PipelineError(
                    f"{lid}/{sid}: bullet[{index}] has {_word_count(bullet)} words "
                    f"(>12); shorten it: {str(bullet)[:80]!r}")
        objectives_los = (scene.get("animation", {}) or {}).get("los", []) or []
        for index, lo in enumerate(objectives_los):
            if _word_count(lo) > 12:
                raise PipelineError(
                    f"{lid}/{sid}: objectives los[{index}] has {_word_count(lo)} words "
                    f"(>12); shorten it: {str(lo)[:80]!r}")


# ---------------------------------------------------------------------------
# gate 4: image license
# ---------------------------------------------------------------------------

# Matches the catalog's own PD conventions: the builder's default note is
# "PD: pre-1930 / CC0 (verified at download)", and sourced notes use
# "pre-1930 publication" for pre-1930 works.
_LICENSE_RE = re.compile(r"public domain|CC0|pre-1930|AI-generated", re.IGNORECASE)


def license_gate(manifest: dict, manifest_path: Path, repo_root: Path) -> None:
    """Every base_image must resolve to a CATALOG.json entry that is on disk
    and licensed public domain / CC0, or be an AI-generated original.

    Scenes carrying a still/search spec are skipped: their images are produced
    by the stills stage (which catalogs them), so the gate verifies them on
    the next run instead of failing before they exist."""
    lid = _lid(manifest)
    entries = _catalog_entries(str(repo_root))
    for scene in _scenes(manifest):
        sid = scene.get("id", "<unknown scene>")
        visual = scene.get("visual", {}) or {}
        if visual.get("still") or visual.get("search"):
            continue
        base = visual.get("base_image")
        if not base:
            continue
        resolved = resolve_local(base, manifest_path.parent, repo_root)
        key = _repo_rel(repo_root, resolved)
        entry = entries.get(key)
        if entry is None:
            raise PipelineError(
                f"{lid}/{sid}: base_image {base!r} (resolves to {key}) has no "
                f"CATALOG.json entry; catalog every image before use")
        if not entry.get("on_disk"):
            raise PipelineError(
                f"{lid}/{sid}: base_image {base!r} is flagged not-on-disk in CATALOG.json")
        note = (entry.get("provenance") or {}).get("license_note", "")
        if not _LICENSE_RE.search(str(note)):
            raise PipelineError(
                f"{lid}/{sid}: base_image {base!r} license {note!r} is not "
                f"public domain / CC0")


# ---------------------------------------------------------------------------
# gate 5: AI-prompt / base-image coherence
# ---------------------------------------------------------------------------

def prompt_subject_coherence(manifest: dict, manifest_path: Path,
                             repo_root: Path) -> None:
    """An ai_clip prompt must describe its actual base image: it must share
    >= 2 content tokens with the image's catalog subject. Catches prompts
    written for a different image (e.g. 'archival document' over a painting)."""
    lid = _lid(manifest)
    entries = _catalog_entries(str(repo_root))
    for scene in _scenes(manifest):
        sid = scene.get("id", "<unknown scene>")
        animation = scene.get("animation", {}) or {}
        if animation.get("type") != "ai_clip":
            continue
        prompt = animation.get("prompt", "")
        base = (scene.get("visual", {}) or {}).get("base_image")
        if not base:
            raise PipelineError(f"{lid}/{sid}: ai_clip scene has no base_image")
        resolved = resolve_local(base, manifest_path.parent, repo_root)
        key = _repo_rel(repo_root, resolved)
        entry = entries.get(key)
        if entry is None:
            raise PipelineError(
                f"{lid}/{sid}: base_image {base!r} has no CATALOG.json entry; "
                f"cannot check prompt/subject coherence")
        subject = str(entry.get("subject", ""))
        shared = _content_tokens(prompt) & _content_tokens(subject)
        if len(shared) < 2:
            raise PipelineError(
                f"{lid}/{sid}: ai_clip prompt shares only {len(shared)} content "
                f"token(s) {sorted(shared)} with the base image subject "
                f"{subject!r}; rewrite the prompt to describe the actual image")


# ---------------------------------------------------------------------------
# gate 6: spec parity
# ---------------------------------------------------------------------------

def spec_parity(manifest: dict) -> None:
    """Curriculum-level presentation claims must be wired in the manifests.
    captions:true fails because no caption renderer exists; a music claim
    requires either the lesson-level music mixer or per-scene ambience."""
    lid = _lid(manifest)
    presentation = manifest.get("presentation", {}) or {}
    if presentation.get("captions"):
        raise PipelineError(
            f"{lid}: defaults.presentation.captions is set but no caption "
            f"renderer exists in the pipeline; remove the claim or implement "
            f"caption support")
    if presentation.get("music"):
        has_lesson_bed = bool((manifest.get("music", {}) or {}).get("background"))
        missing = ([] if has_lesson_bed else
                   [str(scene.get("id", "<unknown scene>"))
                    for scene in _scenes(manifest)
                    if not ((scene.get("audio", {}) or {}).get("ambience"))])
        if missing:
            raise PipelineError(
                f"{lid}: defaults.presentation.music is set but these scenes "
                f"define no audio.ambience: {', '.join(missing)}; configure "
                f"manifest.music.background or remove the claim")


# ---------------------------------------------------------------------------
# gate 7: variety
# ---------------------------------------------------------------------------

def variety(manifest: dict) -> None:
    """A lesson must use >= 3 distinct animation types, and no 3 consecutive
    scenes may share a transition type (avoids monotonous dip-to-black runs)."""
    lid = _lid(manifest)
    scenes = _scenes(manifest)
    types = {str((scene.get("animation", {}) or {}).get("type"))
             for scene in scenes}
    types.discard("None")
    if len(types) < 3:
        raise PipelineError(
            f"{lid}: only {len(types)} distinct animation type(s) {sorted(types)}; "
            f"a lesson needs at least 3 for visual variety")
    declared = manifest.get("transition_scheme")
    if declared is not None:
        # A lesson may declare a uniform transition scheme (e.g. "hard_cut")
        # as a deliberate directorial choice; the declaration must be true.
        bad = [str(s.get("id")) for s in scenes
               if str((s.get("transition", {}) or {}).get("type", "none")) != declared]
        if bad:
            raise PipelineError(
                f"{lid}: transition_scheme={declared!r} declared but scenes "
                f"{bad} use a different transition")
        return
    run_type: str | None = None
    run_length = 0
    for scene in scenes:
        current = str((scene.get("transition", {}) or {}).get("type", "none"))
        if current == run_type:
            run_length += 1
        else:
            run_type, run_length = current, 1
        if run_length >= 3:
            raise PipelineError(
                f"{lid}: {run_length} consecutive scenes use transition "
                f"{current!r}; vary transitions")


# ---------------------------------------------------------------------------
# gate 8: learning-objective traceability
# ---------------------------------------------------------------------------

def lo_traceability(manifest: dict) -> None:
    """Learning objectives must be traceable through the lesson: the manifest
    declares learning_objectives, every scene that teaches one declares
    covers_los (1-based LO indices), and every LO is covered by at least one
    scene. An objective nobody teaches is a broken promise."""
    lid = _lid(manifest)
    los = manifest.get("learning_objectives", []) or []
    if not isinstance(los, list) or not los:
        raise PipelineError(
            f"{lid}: manifest.learning_objectives is missing or empty; every "
            f"lesson must declare 2-4 learning objectives")
    n = len(los)
    covered: set[int] = set()
    for scene in _scenes(manifest):
        sid = scene.get("id", "<unknown scene>")
        for lo in scene.get("covers_los", []) or []:
            if not isinstance(lo, int) or isinstance(lo, bool) or not 1 <= lo <= n:
                raise PipelineError(
                    f"{lid}/{sid}: covers_los entry {lo!r} is not a valid "
                    f"1-based LO index (lesson has {n} objectives)")
            covered.add(lo)
    missing = [i for i in range(1, n + 1) if i not in covered]
    if missing:
        raise PipelineError(
            f"{lid}: learning objectives {missing} are covered by no scene; "
            f"add covers_los to the scenes that teach them")


# ---------------------------------------------------------------------------
# gate 9: lesson shape (Hook -> Thread -> Landing)
# ---------------------------------------------------------------------------

def lesson_shape(manifest: dict) -> None:
    """The lesson's dramatic shape is fail-closed: the first scene must be a
    hook (purpose 'hook' or the hook device), exactly one objectives slide
    must follow the hook, and the last scene must land the lesson (purpose
    'close' or 'recap'). The lo_traceability gate covers the thread; this
    gate covers the shape around it."""
    lid = _lid(manifest)
    scenes = _scenes(manifest)
    if not scenes:
        raise PipelineError(f"{lid}: lesson has no scenes")
    first = scenes[0]
    if first.get("purpose") != "hook" and first.get("device") != "hook":
        raise PipelineError(
            f"{lid}/{first.get('id', '?')}: first scene must be the hook "
            f"(purpose 'hook' or device 'hook')")
    objectives = [s for s in scenes
                  if (s.get("animation", {}) or {}).get("type") == "objectives"]
    if not objectives:
        raise PipelineError(
            f"{lid}: no objectives slide (animation type 'objectives'); every "
            f"lesson promises its learning objectives up front")
    if len(objectives) > 1:
        raise PipelineError(
            f"{lid}: {len(objectives)} objectives slides; exactly one, right "
            f"after the hook")
    hook_idx = 0
    obj_idx = scenes.index(objectives[0])
    if obj_idx != hook_idx + 1:
        raise PipelineError(
            f"{lid}/{objectives[0].get('id', '?')}: objectives slide must come "
            f"immediately after the hook (position {hook_idx + 2})")
    last = scenes[-1]
    if last.get("purpose") not in {"close", "recap"}:
        raise PipelineError(
            f"{lid}/{last.get('id', '?')}: last scene must land the lesson "
            f"(purpose 'close' or 'recap')")


# ---------------------------------------------------------------------------
# gate 10: beat timing fits the scene
# ---------------------------------------------------------------------------

def _estimated_duration(scene: dict) -> float:
    words = len(str(scene.get("narration", {}).get("text", "")).split())
    return max(float(scene.get("min_duration", 0)), words / 2.35 + 1.0, 3.0)


def beat_timing(manifest: dict) -> None:
    """No beat may outlive its scene: beat duration must fit within the
    scene's estimated spoken duration. A label timed longer than its scene
    is cut off mid-read."""
    lid = _lid(manifest)
    for scene in _scenes(manifest):
        sid = scene.get("id", "<unknown scene>")
        duration = _estimated_duration(scene)
        for index, beat in enumerate(scene.get("beats", []) or []):
            if not isinstance(beat, dict):
                continue
            beat_dur = float(beat.get("duration", 0) or 0)
            if beat_dur > duration:
                raise PipelineError(
                    f"{lid}/{sid}: beats[{index}] duration {beat_dur}s exceeds "
                    f"scene duration ~{duration:.1f}s; shorten the beat or the "
                    f"scene will cut it off")


# ---------------------------------------------------------------------------
# gate 11: narration length (series runtime standard)
# ---------------------------------------------------------------------------

def narration_length(manifest: dict) -> None:
    """Spoken narration must be 400-600 words (series bible: ~3:00-3:35 at
    ~450-500 words). Too short starves the objectives; too long breaks the
    runtime contract."""
    lid = _lid(manifest)
    words = sum(len(str(s.get("narration", {}).get("text", "")).split())
                for s in _scenes(manifest))
    if words < 400:
        raise PipelineError(
            f"{lid}: narration is {words} words (<400); the lesson cannot "
            f"cover its objectives in this space — expand the scenes")
    if words > 600:
        raise PipelineError(
            f"{lid}: narration is {words} words (>600); cut to hold the "
            f"~3:30 runtime")


# ---------------------------------------------------------------------------
# gate 12: supplements shipped with the lesson
# ---------------------------------------------------------------------------

def supplements_present(manifest: dict, manifest_path: Path,
                        repo_root: Path) -> None:
    """Every lesson ships its study supplements: speaker-labeled transcript
    (txt + srt), retrieval check, and exam card. They live in
    manifests/supplements/<lesson-id>-*."""
    lid = _lid(manifest)
    supp_dir = manifest_path.parent / "supplements"
    required = [f"{lid}-transcript.txt", f"{lid}-transcript.srt",
                f"{lid}-retrieval-check.md", f"{lid}-exam-card.md"]
    missing = [name for name in required if not (supp_dir / name).is_file()]
    if missing:
        raise PipelineError(
            f"{lid}: missing shipped supplements in {supp_dir}: "
            f"{', '.join(missing)}; generate transcripts via "
            f"tools/make_transcript.py and author the retrieval check + "
            f"exam card")


# ---------------------------------------------------------------------------
# direction tags
# ---------------------------------------------------------------------------

def direction_gate(manifest: dict) -> None:
    """Every narration must carry performance direction, and every tag must be valid.

    Fails on: unknown tags, unclosed/mis-nested pairs, bad [pause:N] values,
    [VOICE:name] names missing from tts.voices, and narrations with zero
    direction tags (a flat read is a defect, not a default).
    """
    lid = manifest.get("lesson_id", "?")
    voices = (manifest.get("tts") or {}).get("voices") or {}
    for scene in manifest.get("scenes", []):
        where = f"{lid}/{scene.get('id', '?')} narration"
        text = scene.get("narration", {}).get("text", "")
        try:
            items = parse_direction(text, where)
        except PipelineError:
            raise
        tags = {item[1] for item in items if item[0] == "tag"}
        if not tags:
            raise PipelineError(
                f"{where}: narration has no direction tags; add at least one "
                f"([beat], [emphasis], [pause:N], [slow]/[fast], an emotion tag)")
        for item in items:
            if item[0] == "tag" and item[1] == "VOICE" and item[3] is False:
                if item[2] not in voices:
                    raise PipelineError(
                        f"{where}: [VOICE:{item[2]}] not in tts.voices "
                        f"(available: {sorted(voices)})")


# ---------------------------------------------------------------------------
# runner
# ---------------------------------------------------------------------------

def run_all_gates(manifest: dict, manifest_path: Path, repo_root: Path) -> None:
    """Run every hard gate against one expanded lesson manifest."""
    cue_integrity(manifest)
    direction_gate(manifest)
    tts_text(manifest)
    text_quantity(manifest)
    license_gate(manifest, manifest_path, repo_root)
    prompt_subject_coherence(manifest, manifest_path, repo_root)
    spec_parity(manifest)
    variety(manifest)
    lo_traceability(manifest)
    lesson_shape(manifest)
    beat_timing(manifest)
    narration_length(manifest)
    supplements_present(manifest, manifest_path, repo_root)
