"""Proof stills for CalloutSlide map zooms (step-4 review artifact).

A callout's (x, y) + zoom numbers are unverifiable on paper: the only way
to know a zoom lands on Zacatecas instead of the Gulf of Mexico is to look
at the frame. This renders two stills per CalloutSlide scene — the wide
frame and the settled-zoom frame — using the same _build_scene path the
compiler uses, so the proof shows exactly what the render will show.

Usage:
    python proof_callouts.py <plan.json> <assets_dir> <out_dir>
        [--width 640] [--height 360]

Output lands in <out_dir> (a work/ dir; gitignored like other proofs):
    <scene-id>_wide.png   t=0.05 (before the move starts)
    <scene-id>_zoom.png   t=intro_hold+move_dur+0.5 clamped into the scene
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                os.pardir, "slideforge"))

from compile_scene_plan import PlanError, _build_scene  # noqa: E402
from slideforge.timeline import Config  # noqa: E402


def proof_times(spec):
    """(wide_t, zoom_t) for a CalloutSlide scene spec."""
    params = spec.get("params") or {}
    dur = float(spec.get("duration_sec", 0))
    wide_t = min(0.05, max(dur - 0.01, 0.0))
    zoom_t = float(params.get("intro_hold", 0)) + \
        float(params.get("move_dur", 0)) + 0.5
    zoom_t = min(max(zoom_t, 0.0), max(dur - 0.01, 0.0))
    return wide_t, zoom_t


def proof_callouts(plan_path, assets_dir, out_dir, width=640, height=360):
    """Render wide+zoom stills for every CalloutSlide. Returns paths."""
    with open(plan_path, encoding="utf-8") as f:
        plan = json.load(f)
    from PIL import Image  # lazy: only needed when actually rendering

    os.makedirs(out_dir, exist_ok=True)
    cfg = Config(w=int(width), h=int(height), fps=30)
    paths = []
    for i, spec in enumerate(plan.get("scenes", [])):
        if not isinstance(spec, dict):
            continue
        if str(spec.get("slide", "")).lower() != "calloutslide":
            continue
        sid = spec.get("id") or "scene-%02d" % i
        scene, _, _ = _build_scene(spec, assets_dir, sid)
        scene.cfg = cfg
        wide_t, zoom_t = proof_times(spec)
        for tag, t in (("wide", wide_t), ("zoom", zoom_t)):
            frame = scene.frame(t)
            path = os.path.join(out_dir, "%s_%s.png" % (sid, tag))
            Image.fromarray(frame).save(path)
            paths.append(path)
    return paths


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("plan")
    ap.add_argument("assets_dir")
    ap.add_argument("out_dir")
    ap.add_argument("--width", type=int, default=640)
    ap.add_argument("--height", type=int, default=360)
    args = ap.parse_args(argv)
    try:
        paths = proof_callouts(args.plan, args.assets_dir, args.out_dir,
                               args.width, args.height)
    except (PlanError, FileNotFoundError, json.JSONDecodeError) as e:
        print(f"proof_callouts: {e}", file=sys.stderr)
        return 2
    for p in paths:
        print(p)
    if not paths:
        print("proof_callouts: no CalloutSlide scenes in plan")
    return 0


if __name__ == "__main__":
    sys.exit(main())
