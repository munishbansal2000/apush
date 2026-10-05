"""Stage: slideforge_render.

Compile work/scene_plan.json (deterministic — no model calls) into the
full silent video, work/slideforge.mp4. The assemble stage muxes the
dialogue audio over it.
"""
import hashlib
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, os.pardir))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from compile_scene_plan import compile_scene_plan  # noqa: E402

_REPO_ROOT = os.path.normpath(os.path.join(_ROOT, os.pardir))


def _default_assets(ep_dir):
    local = os.path.join(ep_dir, "assets")
    if os.path.isdir(local):
        return local
    shared = os.path.join(_REPO_ROOT, "slideforge", "assets")
    if os.path.isdir(shared):
        return shared
    raise RuntimeError("no assets dir: set cfg 'assets_dir' or create "
                       f"{local}")


def _plan_hash(plan_path):
    h = hashlib.sha1()
    with open(plan_path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()[:12]


def run(ep_dir, cfg, force=False):
    work = os.path.join(ep_dir, "work")
    plan_path = os.path.join(work, "scene_plan.json")
    if not os.path.exists(plan_path):
        raise RuntimeError(
            f"scene plan missing: {plan_path} — run the direct stage first")
    assets_dir = cfg.get("assets_dir") or _default_assets(ep_dir)
    out = os.path.join(work, "slideforge.mp4")
    # Cache is keyed on the plan content: a stale mp4 from an older plan
    # must never be silently returned (that was a real bug — edits to the
    # plan were ignored on re-runs).
    stamp = out + ".plan-sha"
    cur = _plan_hash(plan_path)
    if os.path.exists(out) and not force:
        if os.path.exists(stamp) and open(stamp).read().strip() == cur:
            print(f"slideforge_render: cached {out}", flush=True)
            return out
        print("slideforge_render: plan changed since last render; "
              "re-rendering", flush=True)
    timings = os.path.join(work, "timings.json")
    summary = compile_scene_plan(
        plan_path, assets_dir, out,
        width=int(cfg.get("width", 1920)),
        height=int(cfg.get("height", 1080)),
        fps=int(cfg.get("fps", 30)),
        timings=timings if os.path.exists(timings) else None)
    with open(stamp, "w") as f:
        f.write(cur)
    print(f"slideforge_render: {summary['scenes']} scenes, "
          f"{summary['duration_sec']:.1f}s -> {out}", flush=True)
    return out
