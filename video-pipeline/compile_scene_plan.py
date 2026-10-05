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
import inspect
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_SLIDEFORGE = os.path.normpath(os.path.join(_HERE, os.pardir, "slideforge"))
if _SLIDEFORGE not in sys.path:
    sys.path.insert(0, _SLIDEFORGE)

from slideforge.timeline import Config, Movie  # noqa: E402
from slideforge import slides as _slides  # noqa: E402
from slideforge import overlays as _overlays  # noqa: E402
from slideforge import routes as _routes  # noqa: E402

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


def _resolve_image(value, assets_dir, scene_id, where):
    """Resolve one repo-relative image path; reject absolute/missing."""
    if not isinstance(value, str):
        raise PlanError(
            f"scene '{scene_id}': {where} must be a path string, "
            f"got {type(value).__name__}")
    if os.path.isabs(value) or (len(value) > 1 and value[1] == ":"):
        raise PlanError(
            f"scene '{scene_id}': absolute image paths are not allowed "
            f"({where}={value!r}); use a path relative to the assets dir")
    # Guard against escaping the assets dir.
    norm = os.path.normpath(value)
    if norm.startswith(".."):
        raise PlanError(
            f"scene '{scene_id}': image path escapes the assets dir "
            f"({where}={value!r})")
    full = os.path.join(assets_dir, norm)
    if not os.path.isfile(full):
        raise PlanError(
            f"scene '{scene_id}': image not found: {value!r} "
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
            _set_dot(params, dot, _resolve_image(
                val, assets_dir, sid, f"params.{dot}"))

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


def compile_scene_plan(plan_path, assets_dir, out_mp4,
                       width=1280, height=720, fps=30):
    """Compile a scene plan JSON into an mp4. Returns a summary dict.

    Raises PlanError on any structural problem, before rendering.
    """
    assets_dir = os.path.abspath(assets_dir)
    if not os.path.isdir(assets_dir):
        raise PlanError(f"assets dir not found: {assets_dir!r}")

    plan = _load_plan(plan_path)
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

    out_dir = os.path.dirname(os.path.abspath(out_mp4))
    os.makedirs(out_dir, exist_ok=True)
    movie.render(out_mp4, quiet=True)
    return {
        "episode": plan["episode"],
        "scenes": len(scenes),
        "duration_sec": round(movie.total_duration(), 3),
        "output": os.path.abspath(out_mp4),
    }


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="Compile a scene plan to mp4")
    ap.add_argument("plan", help="scene plan JSON path")
    ap.add_argument("assets", help="assets dir (image paths resolve here)")
    ap.add_argument("out", help="output mp4 path")
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--height", type=int, default=720)
    ap.add_argument("--fps", type=int, default=30)
    args = ap.parse_args(argv)
    try:
        summary = compile_scene_plan(
            args.plan, args.assets, args.out,
            width=args.width, height=args.height, fps=args.fps)
    except PlanError as e:
        print(f"PLAN ERROR: {e}", file=sys.stderr)
        return 2
    print(f"compiled {summary['scenes']} scenes -> {summary['output']} "
          f"({summary['duration_sec']:.1f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
