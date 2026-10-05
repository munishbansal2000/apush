#!/usr/bin/env python3
"""Deterministic compiler: scene plan JSON -> slideforge Movie -> mp4.

Design rule: the LLM PLANS, this module RENDERS. No network, no model
calls, no randomness here — the same plan + the same assets always produce
the same mp4. Every structural problem (unknown slide type, bad duration,
missing image, unexpected param) raises PlanError BEFORE any frame renders.

Image paths in the plan are repo-relative strings resolved against
``assets_dir``; absolute paths are rejected (plans must be portable).

Public entry point:
    compile_scene_plan(plan_path, assets_dir, out_mp4,
                       width=1280, height=720, fps=30) -> dict summary
"""
import copy
import hashlib
import inspect
import json
import os
import subprocess
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_SLIDEFORGE = os.path.normpath(os.path.join(_HERE, os.pardir, "slideforge"))
if _SLIDEFORGE not in sys.path:
    sys.path.insert(0, _SLIDEFORGE)
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from slideforge.timeline import Config, Movie  # noqa: E402
from slideforge import slides as _slides  # noqa: E402
from slideforge import overlays as _overlays  # noqa: E402
from slideforge import routes as _routes  # noqa: E402
from clipscene import ClipScene  # noqa: E402

SCHEMA_VERSION = 1
IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif")


class PlanError(Exception):
    """A structural problem in the scene plan. Raised before rendering."""


# The 18 slideforge slide types addressable from a scene plan.
SLIDE_TYPES = {
    "titleslide": _slides.TitleSlide,
    "bulletslide": _slides.BulletSlide,
    "stepsslide": _slides.StepsSlide,
    "displaypointsslide": _slides.DisplayPointsSlide,
    "displayheadline": _slides.DisplayHeadline,
    "compareslide": _slides.CompareSlide,
    "highlightslide": _slides.HighlightSlide,
    "collageslide": _slides.CollageSlide,
    "titlecardslide": _slides.TitleCardSlide,
    "duoslide": _slides.DuoSlide,
    "imageslide": _slides.ImageSlide,
    "splitslide": _slides.SplitSlide,
    "quoteslide": _slides.QuoteSlide,
    "statslide": _slides.StatSlide,
    "kenburnsslide": _slides.KenBurnsSlide,
    "calloutslide": _slides.CalloutSlide,
    "mapzoomslide": _slides.MapZoomSlide,
    "routeslide": _slides.RouteSlide,
    # Not in the original 18, but present in the library: the old pipeline's
    # word-chain beats (causalchain) and pre-rendered clip beats (vidslide,
    # pipeline-local so slideforge/ stays pristine).
    "causalchain": _slides.CausalChainSlide,
    "vidslide": ClipScene,
}

TRANSITIONS = {"crossfade", "wipe", "slide", "dip", "zoom", "cut"}

OVERLAY_TYPES = {
    "keywordpop": _overlays.KeywordPop,
    "caption": _overlays.Caption,
    "lowerthird": _overlays.LowerThird,
    "sticker": _overlays.Sticker,
    "regionglow": _overlays.RegionGlow,
}

# Param paths (dot-separated, per slide type) that hold image paths.
# "bg.path" covers bg={"type": "image", "path": ...}.
IMAGE_PARAM_PATHS = {
    "kenburnsslide": ["image"],
    "imageslide": ["image"],
    "titlecardslide": ["image"],
    "splitslide": ["image"],
    "calloutslide": ["image"],
    "mapzoomslide": ["map_image"],
    "routeslide": ["map_image"],
    "duoslide": ["left.image", "right.image"],
    "highlightslide": ["card.image"],
    "collageslide": ["cards.*.image"],
    # vidslide's clip file resolves like an image (repo-relative, no escapes).
    "vidslide": ["src"],
}
# Every slide type may also carry an image-backed bg spec.
BG_IMAGE_PATH = ["bg.path"]


def _load_plan(plan_path):
    try:
        with open(plan_path, encoding="utf-8") as f:
            plan = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        raise PlanError(f"cannot read scene plan {plan_path!r}: {e}")
    if not isinstance(plan, dict):
        raise PlanError(f"scene plan {plan_path!r} must be a JSON object")
    if plan.get("version") != SCHEMA_VERSION:
        raise PlanError(
            f"unsupported scene plan version {plan.get('version')!r} "
            f"(compiler supports v{SCHEMA_VERSION})")
    if not plan.get("episode"):
        raise PlanError("scene plan is missing 'episode'")
    scenes = plan.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        raise PlanError("scene plan must contain a non-empty 'scenes' list")
    return plan


def _validate_turns(plan):
    """Every scene's turns [a, b] must partition 0..N-1 contiguously.

    The turn partition is the contract between the audio timeline (straight
    concat of turn files) and the video timeline. A gap or overlap here is
    silent A/V desync, so it fails fast.
    """
    covered = set()
    for i, spec in enumerate(plan["scenes"]):
        sid = spec.get("id") if isinstance(spec, dict) else f"scene-{i:02d}"
        turns = spec.get("turns") if isinstance(spec, dict) else None
        if (not isinstance(turns, (list, tuple)) or len(turns) != 2
                or not all(isinstance(x, int) for x in turns)):
            raise PlanError(
                f"scene '{sid}': 'turns' must be [start, end] ints, "
                f"got {turns!r}")
        a, b = turns
        if a > b or a < 0:
            raise PlanError(f"scene '{sid}': bad turns range [{a}, {b}]")
        rng = set(range(a, b + 1))
        if rng & covered:
            raise PlanError(
                f"scene '{sid}': turns [{a}, {b}] overlap another scene")
        covered |= rng
    n = max(s["turns"][1] for s in plan["scenes"]) + 1
    if covered != set(range(n)):
        missing = sorted(set(range(n)) - covered)
        raise PlanError(f"turns not covered by any scene: {missing}")


def _validate_against_timings(plan, timings_path, tol=0.02):
    """Refuse to render from estimates when measured TTS timings exist.

    Each scene's duration_sec must equal the sum of its turns' measured
    durations within `tol` seconds. A mismatch means the director's
    arithmetic drifted (or refit_durations.py was never run) — fix the
    plan, don't render the drift.
    """
    try:
        with open(timings_path, encoding="utf-8") as f:
            timings = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        raise PlanError(f"cannot read timings {timings_path!r}: {e}")
    durs = {}
    for t in timings.get("turns", []):
        m = t.get("turn", "")
        try:
            idx = int(str(m).lstrip("t"))
        except ValueError:
            continue
        durs[idx] = float(t["dur"])
    for spec in plan["scenes"]:
        sid = spec.get("id", "?")
        a, b = spec["turns"]
        try:
            want = sum(durs[i] for i in range(a, b + 1))
        except KeyError as e:
            raise PlanError(
                f"scene '{sid}': timings have no turn {e.args[0]}; "
                f"turn files and plan are out of sync")
        got = float(spec["duration_sec"])
        if abs(got - want) > tol:
            raise PlanError(
                f"scene '{sid}': duration_sec={got:.3f}s but measured turn "
                f"audio sums to {want:.3f}s (turns [{a}, {b}]). Run "
                f"refit_durations.py against the rendered turns, then "
                f"re-run the compile.")


def _compensate_transitions(plan):
    """Extend each scene's duration by the NEXT scene's transition duration.

    slideforge's Movie renders transitions as overlap: the incoming scene's
    first `trans_dur` seconds blend with the outgoing scene's tail, and the
    movie total is sum(durations) - sum(trans_dur). If plan durations are
    pure audio truth (sum of turn WAVs), every crossfade would pull the
    video timeline earlier — ~0.5s per transition, accumulating to seconds
    of A/V drift by the episode's end.

    Paying for each transition out of the outgoing scene (its tail becomes
    the blend-out window) keeps every cut landing exactly on its audio
    boundary: total == sum(plan durations) == audio length, exactly.
    Returns a deep copy; the caller's plan is untouched.
    """
    plan = copy.deepcopy(plan)
    scenes = plan["scenes"]
    for i in range(len(scenes) - 1):
        nxt_dur = float(scenes[i + 1].get("trans_dur", 0) or 0)
        if nxt_dur > 0:
            scenes[i]["duration_sec"] = float(scenes[i]["duration_sec"]) + nxt_dur
    return plan


def _resolve_image(value, assets_dir, scene_id, where, kind="image"):
    """Resolve one repo-relative image path; reject absolute/missing."""
    if not isinstance(value, str):
        raise PlanError(
            f"scene '{scene_id}': {where} must be a path string, "
            f"got {type(value).__name__}")
    if os.path.isabs(value) or (len(value) > 1 and value[1] == ":"):
        raise PlanError(
            f"scene '{scene_id}': absolute {kind} paths are not allowed "
            f"({where}={value!r}); use a path relative to the assets dir")
    # Guard against escaping the assets dir.
    norm = os.path.normpath(value)
    if norm.startswith(".."):
        raise PlanError(
            f"scene '{scene_id}': {kind} path escapes the assets dir "
            f"({where}={value!r})")
    full = os.path.join(assets_dir, norm)
    if not os.path.isfile(full):
        raise PlanError(
            f"scene '{scene_id}': {kind} not found: {value!r} "
            f"(looked in {assets_dir!r})")
    return full


def _walk_paths(obj):
    """Yield (dot_path, value) for every leaf of a nested params structure."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            for sub, leaf in _walk_paths(v):
                yield (f"{k}.{sub}" if sub else k, leaf)
    elif isinstance(obj, (list, tuple)):
        for i, v in enumerate(obj):
            for sub, leaf in _walk_paths(v):
                yield (f"{i}.{sub}" if sub else str(i), leaf)
    else:
        yield ("", obj)


def _match_image_paths(params, slide_key):
    """Return dot-paths in params that should hold image paths."""
    wanted = set(IMAGE_PARAM_PATHS.get(slide_key, [])) | set(BG_IMAGE_PATH)
    hits = []
    for dot, leaf in _walk_paths(params):
        for w in wanted:
            if "*" in w:
                pre, post = w.split("*", 1)
                if dot.startswith(pre) and dot.endswith(post):
                    hits.append(dot)
                    break
            elif dot == w or dot.endswith("." + w):
                hits.append(dot)
                break
    return sorted(set(hits))


def _set_dot(params, dot, value):
    parts = dot.split(".")
    cur = params
    for p in parts[:-1]:
        cur = cur[int(p)] if p.isdigit() else cur[p]
    last = parts[-1]
    if last.isdigit():
        cur[int(last)] = value
    else:
        cur[last] = value


def _get_dot(params, dot):
    cur = params
    for p in dot.split("."):
        cur = cur[int(p)] if p.isdigit() else cur[p]
    return cur


def _check_signature(cls, params, scene_id, slide_name, extra_ok=()):
    """Reject constructor kwargs the slide does not accept."""
    try:
        sig = inspect.signature(cls.__init__)
    except (TypeError, ValueError):
        return
    names = set(sig.parameters)
    accepts_kwargs = any(
        p.kind == inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values())
    if accepts_kwargs:
        return
    for k in params:
        if k not in names and k not in extra_ok and k != "duration":
            raise PlanError(
                f"scene '{scene_id}': {slide_name} does not accept "
                f"param {k!r}")


def _build_overlay(spec, assets_dir, scene_id, idx):
    if not isinstance(spec, dict):
        raise PlanError(
            f"scene '{scene_id}': overlay #{idx} must be an object")
    otype = str(spec.get("type", "")).lower()
    cls = OVERLAY_TYPES.get(otype)
    if cls is None:
        raise PlanError(
            f"scene '{scene_id}': overlay #{idx} has unknown type "
            f"{spec.get('type')!r}")
    kwargs = {k: v for k, v in spec.items() if k != "type"}
    if "image" in kwargs and isinstance(kwargs["image"], str):
        kwargs["image"] = _resolve_image(
            kwargs["image"], assets_dir, scene_id, f"overlays[{idx}].image")
    _check_signature(cls, kwargs, scene_id, otype, extra_ok=("image",))
    try:
        return cls(**kwargs)
    except TypeError as e:
        raise PlanError(
            f"scene '{scene_id}': overlay #{idx} ({otype}) bad params: {e}")


def _build_scene(spec, assets_dir, scene_id):
    if not isinstance(spec, dict):
        raise PlanError(f"scene entry {spec!r} must be an object")
    sid = spec.get("id") or scene_id
    slide_name = spec.get("slide")
    slide_key = str(slide_name or "").lower()
    cls = SLIDE_TYPES.get(slide_key)
    if cls is None:
        raise PlanError(
            f"scene '{sid}': unknown slide type {slide_name!r} "
            f"(expected one of: {', '.join(sorted(SLIDE_TYPES))})")

    duration = spec.get("duration_sec")
    if not isinstance(duration, (int, float)) or isinstance(duration, bool) \
            or duration <= 0:
        raise PlanError(
            f"scene '{sid}': duration_sec must be a number > 0, "
            f"got {duration!r}")

    transition = spec.get("transition", "cut")
    if transition not in TRANSITIONS:
        raise PlanError(
            f"scene '{sid}': unknown transition {transition!r} "
            f"(expected one of: {', '.join(sorted(TRANSITIONS))})")
    trans_dur = spec.get("trans_dur", 0)
    if not isinstance(trans_dur, (int, float)) or trans_dur < 0:
        raise PlanError(
            f"scene '{sid}': trans_dur must be >= 0, got {trans_dur!r}")

    params = dict(spec.get("params") or {})

    # Normalize bg specs: {"path": ...} without an explicit "type" means an
    # image background. Without this, slideforge's spec.get("type",
    # "gradient") default routes the spec to _gradient, which KeyErrors on
    # the missing "top" at render time (seen live on the u1-e2 plan).
    bg = params.get("bg")
    if isinstance(bg, dict) and "path" in bg and "type" not in bg:
        bg = dict(bg)
        bg["type"] = "image"
        params["bg"] = bg

    # Resolve image paths before constructing the slide.
    for dot in _match_image_paths(params, slide_key):
        try:
            val = _get_dot(params, dot)
        except (KeyError, IndexError, TypeError):
            continue
        if isinstance(val, str):
            kind = "clip" if slide_key == "vidslide" else "image"
            _set_dot(params, dot, _resolve_image(
                val, assets_dir, sid, f"params.{dot}", kind=kind))

    # RouteSlide may be built from a bundled route name instead of
    # map_image + waypoints.
    route_name = params.pop("route", None)
    if route_name is not None and slide_key != "routeslide":
        raise PlanError(
            f"scene '{sid}': 'route' is only valid for RouteSlide")
    if route_name is not None:
        known = _routes.list_routes()
        if route_name not in known:
            raise PlanError(
                f"scene '{sid}': unknown route {route_name!r} "
                f"(available: {', '.join(known)})")

    _check_signature(cls, params, sid, slide_name)
    kwargs = dict(params)
    kwargs["duration"] = float(duration)
    try:
        if route_name is not None:
            scene = cls.from_route(route_name, **kwargs)
        else:
            scene = cls(**kwargs)
    except (TypeError, ValueError) as e:
        raise PlanError(f"scene '{sid}': cannot build {slide_name}: {e}")

    overlay_specs = spec.get("overlays") or []
    if not isinstance(overlay_specs, list):
        raise PlanError(f"scene '{sid}': overlays must be a list")
    overlays = [_build_overlay(o, assets_dir, sid, i)
                for i, o in enumerate(overlay_specs)]
    if overlays:
        scene = _overlays.with_overlays(scene, overlays)
    return scene, transition, float(trans_dur)


def _build_movie(plan, assets_dir, width, height, fps):
    """Validate, compensate transitions, and build the slideforge Movie.

    Returns (movie, compensated_plan, orig_durations, scenes).
    compensated_plan drives scene construction (each scene pays for the
    outgoing transition out of its own tail); orig_durations is the
    audio-truth the plan author wrote, used for frame boundaries so cuts
    land exactly on audio boundaries.
    """
    _validate_turns(plan)
    orig_durations = [float(s["duration_sec"]) for s in plan["scenes"]]
    orig_total = sum(orig_durations)
    plan = _compensate_transitions(plan)
    scenes = []
    seen = set()
    for i, spec in enumerate(plan["scenes"]):
        sid = spec.get("id") if isinstance(spec, dict) else None
        sid = sid or f"scene-{i:02d}"
        if sid in seen:
            raise PlanError(f"duplicate scene id: {sid!r}")
        seen.add(sid)
        scenes.append(_build_scene(spec, assets_dir, sid))

    cfg = Config(w=int(width), h=int(height), fps=int(fps))
    movie = Movie(cfg)
    for scene, transition, trans_dur in scenes:
        movie.add(scene, transition=transition, trans_dur=trans_dur)

    # The compensation invariant: each transition's overlap is paid out of
    # the outgoing scene, so the overlap model must yield exactly the
    # original plan sum — every cut lands on its audio boundary.
    got = movie.total_duration()
    if abs(got - orig_total) > 1e-6:
        raise PlanError(
            f"transition compensation broken: movie total {got:.6f}s != "
            f"plan sum {orig_total:.6f}s")
    return movie, plan, orig_durations, scenes


def _frame_boundaries(durations, fps):
    """Cumulative frame boundaries from durations (no error buildup).

    F[i] = round(cumulative_seconds[i] * fps). Scene i owns frames
    [F[i-1], F[i]). Per-scene round() would accumulate up to half a frame
    of error per scene; cumulative rounding keeps the total exact.
    Pass the ORIGINAL (audio-truth) durations: cuts land on audio
    boundaries, not on transition-compensated ones.
    """
    bounds, acc = [0], 0.0
    for d in durations:
        acc += float(d)
        bounds.append(int(round(acc * fps)))
    return bounds


def render_scenes_chunked(plan_path, assets_dir, out_dir, width=1280,
                          height=720, fps=30, timings=None, quiet=False):
    """Render each scene to its own mp4 with frame-exact boundaries.

    Every scene gets exactly the frames its audio owns; transitions blend
    across the chunk boundary (the blend frames live at the head of the
    incoming chunk, exactly as Movie.frame_at renders them). A failed
    scene can be re-rendered alone; concat is a stream copy.

    Writes out_dir/scene-XX-<id>.mp4 plus manifest.json:
    {fps, total_frames, scenes: [{id, file, start_frame, frames}]}.

    Returns the manifest path.
    """
    assets_dir = os.path.abspath(assets_dir)
    if not os.path.isdir(assets_dir):
        raise PlanError(f"assets dir not found: {assets_dir!r}")
    plan = _load_plan(plan_path)
    _run_lint(plan)
    if timings:
        _validate_against_timings(plan, timings)
    elif not quiet:
        print("warning: no --timings given; rendering from plan durations "
              "(estimates leak sync — pass work/timings.json)",
              file=sys.stderr)
    movie, plan, orig_durations, _ = _build_movie(
        plan, assets_dir, width, height, fps)

    bounds = _frame_boundaries(orig_durations, fps)
    total_frames = bounds[-1]
    os.makedirs(out_dir, exist_ok=True)
    manifest = {"fps": int(fps), "total_frames": total_frames,
                "episode": plan["episode"], "scenes": []}
    w, h = int(width), int(height)
    for i, spec in enumerate(plan["scenes"]):
        sid = spec.get("id") or f"scene-{i:02d}"
        f0, f1 = bounds[i], bounds[i + 1]
        n = f1 - f0
        if n <= 0:
            raise PlanError(
                f"scene '{sid}': frame-exact boundary collapse "
                f"({f0}..{f1}); duration too short for {fps}fps")
        fname = f"scene-{i:02d}-{_slug(sid)}.mp4"
        out = os.path.join(out_dir, fname)
        _render_frame_range(movie, f0, n, out, w, h, int(fps), quiet=quiet)
        manifest["scenes"].append(
            {"id": sid, "file": fname, "start_frame": f0, "frames": n})
        if not quiet:
            print(f"  chunk {i + 1}/{len(plan['scenes'])} {sid}: "
                  f"{n} frames -> {fname}", flush=True)
    man_path = os.path.join(out_dir, "manifest.json")
    with open(man_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
    return man_path


def _slug(sid):
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in str(sid))[:40]


def _render_frame_range(movie, start_frame, n_frames, out_path, w, h, fps,
                        quiet=False):
    """Render movie frames [start_frame, start_frame+n_frames) to mp4."""
    import numpy as np  # noqa: E402  (deferred: only needed at render time)
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    cmd = ["ffmpeg", "-y",
           "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
           "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p",
           "-crf", "18", "-preset", "medium",
           "-movflags", "+faststart", out_path]
    proc = None
    try:
        try:
            proc = subprocess.Popen(cmd, stdin=subprocess.PIPE,
                                    stdout=subprocess.DEVNULL,
                                    stderr=subprocess.DEVNULL)
        except OSError as e:
            raise RuntimeError(
                f"could not start ffmpeg ({e}); is it installed and on PATH?"
            ) from e
        for k in range(n_frames):
            frame = movie.frame_at((start_frame + k) / fps)
            if frame.shape != (h, w, 3) or frame.dtype != np.uint8:
                raise ValueError(
                    f"frame {start_frame + k} has shape {frame.shape} "
                    f"dtype {frame.dtype}; expected ({h}, {w}, 3) uint8")
            proc.stdin.write(frame.tobytes())
    finally:
        if proc is not None:
            proc.stdin.close()
            proc.wait()
    if proc is None:  # pragma: no cover - defensive; Popen failure raises
        raise RuntimeError("ffmpeg process was never started")
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed with code {proc.returncode} "
                           f"rendering {out_path}")
    # render_exact contract (item 6): the encoder must have produced
    # exactly the frames we asked for. A silent shortfall here is A/V
    # drift that nothing downstream can detect except this check.
    got_frames = _probe_frame_count(out_path)
    if got_frames != n_frames:
        raise RuntimeError(
            f"render_exact violated: {out_path} has {got_frames} frames, "
            f"expected {n_frames}")


def _probe_frame_count(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=nb_frames", "-of", "csv=p=0", path],
        text=True).strip()
    if out and out != "N/A":
        return int(out)
    # nb_frames missing (some containers): count packets instead.
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "packet=pts", "-of", "csv=p=0", path],
        text=True).strip()
    return len([l for l in out.splitlines() if l.strip()])


def _run_lint(plan):
    """Visual-quality lint: fail-fast on broken rendering before any frame."""
    from lint_plan import lint_plan
    lint_errors, lint_warns = lint_plan(plan)
    for w in lint_warns:
        print(f"lint warn: {w}", file=sys.stderr)
    if lint_errors:
        raise PlanError("visual lint failed:\n  " + "\n  ".join(lint_errors))


def compile_scene_plan(plan_path, assets_dir, out_mp4,
                       width=1280, height=720, fps=30, quiet=False,
                       timings=None):
    """Compile a scene plan JSON into an mp4. Returns a summary dict.

    Raises PlanError on any structural problem, before rendering.
    When `timings` (path to work/timings.json) is given, every scene's
    duration_sec must match its measured turn audio within 0.02s —
    estimates are refused.
    """
    assets_dir = os.path.abspath(assets_dir)
    if not os.path.isdir(assets_dir):
        raise PlanError(f"assets dir not found: {assets_dir!r}")

    plan = _load_plan(plan_path)
    _run_lint(plan)
    if timings:
        _validate_against_timings(plan, timings)
    elif not quiet:
        print("warning: no timings given; rendering from plan durations "
              "(estimates leak sync — pass work/timings.json)",
              file=sys.stderr)
    movie, plan, _orig_durations, scenes = _build_movie(
        plan, assets_dir, width, height, fps)

    out_dir = os.path.dirname(os.path.abspath(out_mp4))
    os.makedirs(out_dir, exist_ok=True)
    try:
        movie.render(out_mp4, quiet=quiet)
    finally:
        for scene, _, _ in scenes:
            _cleanup_scene(scene)

    # Frame-exactness of the single-file render: the encoder must have
    # produced exactly round(total * fps) frames.
    n_frames = int(round(movie.total_duration() * int(fps)))
    return {
        "episode": plan["episode"],
        "scenes": len(scenes),
        "duration_sec": round(movie.total_duration(), 3),
        "frames": n_frames,
        "fps": int(fps),
        "output": os.path.abspath(out_mp4),
    }


def _cleanup_scene(scene):
    """Release per-scene temp resources (clip decodes), unwrapping overlays."""
    seen = set()
    cur = scene
    while cur is not None and id(cur) not in seen:
        seen.add(id(cur))
        cleanup = getattr(cur, "cleanup", None)
        if callable(cleanup):
            cleanup()
        cur = getattr(cur, "_scene", None)


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="Compile a scene plan to mp4")
    ap.add_argument("plan", help="scene plan JSON path")
    ap.add_argument("assets", help="assets dir (image paths resolve here)")
    ap.add_argument("out", help="output mp4 path (or scenes dir with --chunked)")
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--height", type=int, default=720)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--quiet", action="store_true",
                    help="suppress per-frame render progress")
    ap.add_argument("--timings", default=None,
                    help="path to work/timings.json: when given, every "
                         "scene's duration_sec must match its measured turn "
                         "audio within 0.02s (estimates are refused)")
    ap.add_argument("--chunked", action="store_true",
                    help="render per-scene mp4s + manifest.json into OUT "
                         "(frame-exact; a failed scene re-renders alone) "
                         "instead of one mp4")
    args = ap.parse_args(argv)
    try:
        if args.chunked:
            man = render_scenes_chunked(
                args.plan, args.assets, args.out,
                width=args.width, height=args.height, fps=args.fps,
                timings=args.timings, quiet=args.quiet)
            print(f"chunked render -> {man}")
        else:
            summary = compile_scene_plan(
                args.plan, args.assets, args.out,
                width=args.width, height=args.height, fps=args.fps,
                quiet=args.quiet, timings=args.timings)
            print(f"compiled {summary['scenes']} scenes -> {summary['output']} "
                  f"({summary['duration_sec']:.1f}s, {summary['frames']}f)")
    except PlanError as e:
        print(f"PLAN ERROR: {e}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
