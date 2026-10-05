"""Stage: slideforge_render.

Compile work/scene_plan.json (deterministic — no model calls) into the
full silent video, work/slideforge.mp4. The assemble stage muxes the
dialogue audio over it.

Incremental: the render is skipped only when a fingerprint sidecar
(work/slideforge.mp4.fingerprint.json) matches the current plan bytes,
geometry, and referenced assets (size + mtime). An edited plan, a
replaced asset, or a geometry change triggers a rebuild.
"""
import hashlib
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, os.pardir))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from compile_scene_plan import compile_scene_plan, plan_assets  # noqa: E402
from stages.plan_path import resolve_plan  # noqa: E402

_REPO_ROOT = os.path.normpath(os.path.join(_ROOT, os.pardir))


def _default_assets(ep_dir):
    local = os.path.join(ep_dir, "assets")
    if os.path.isdir(local):
        return local
    # U1 episodes keep sourced images in <ep_dir>/images/ and reference
    # them as "images/..." — resolve against the episode dir itself.
    if os.path.isdir(os.path.join(ep_dir, "images")):
        return ep_dir
    shared = os.path.join(_REPO_ROOT, "slideforge", "assets")
    if os.path.isdir(shared):
        return shared
    raise RuntimeError("no assets dir: set cfg 'assets_dir' or create "
                       f"{local}")


def _plan_sha1(plan_path):
    digest = hashlib.sha1()
    with open(plan_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _timings_stamp(plan_path):
    """[size, mtime_ns] of work/timings.json, or None when absent.

    A newly measured (or re-measured) timings file must invalidate the
    cache: the compile either re-renders from the same durations or
    refuses estimates that drifted -- both require running, not a
    cached return.
    """
    tp = os.path.join(os.path.dirname(plan_path), "timings.json")
    if not os.path.exists(tp):
        return None
    st = os.stat(tp)
    return [st.st_size, st.st_mtime_ns]


def _fingerprint(plan_path, assets_dir, width, height, fps):
    return {"plan_sha1": _plan_sha1(plan_path),
            "geometry": [width, height, fps],
            "timings": _timings_stamp(plan_path),
            "assets": plan_assets(plan_path, assets_dir)}


def _fingerprint_current(out, fingerprint):
    """True when the output exists and its sidecar matches."""
    if not os.path.exists(out):
        return False
    try:
        with open(out + ".fingerprint.json", encoding="utf-8") as f:
            return json.load(f) == fingerprint
    except (OSError, ValueError):
        return False


def run(ep_dir, cfg, force=False):
    work = os.path.join(ep_dir, "work")
    plan_path, source = resolve_plan(ep_dir)
    if source == "missing":
        raise RuntimeError(
            f"scene plan missing: {plan_path} — put the reviewed plan at "
            f"{os.path.join(ep_dir, 'scene_plan.json')} or run the direct "
            "stage first")
    print(f"slideforge_render: using {source} plan: {plan_path}", flush=True)
    assets_dir = cfg.get("assets_dir") or _default_assets(ep_dir)
    width, height, fps = int(cfg.get("width", 1920)), \
        int(cfg.get("height", 1080)), int(cfg.get("fps", 30))
    out = os.path.join(work, "slideforge.mp4")
    fingerprint = _fingerprint(plan_path, assets_dir, width, height, fps)
    if not force and _fingerprint_current(out, fingerprint):
        print(f"slideforge_render: cached {out}", flush=True)
        return out
    timings = os.path.join(work, "timings.json")
    summary = compile_scene_plan(
        plan_path, assets_dir, out,
        width=width, height=height, fps=fps,
        timings=timings if os.path.exists(timings) else None)
    with open(out + ".fingerprint.json", "w", encoding="utf-8") as f:
        json.dump(fingerprint, f, indent=1, sort_keys=True)
    print(f"slideforge_render: {summary['scenes']} scenes, "
          f"{summary['duration_sec']:.1f}s -> {out}", flush=True)
    return out
