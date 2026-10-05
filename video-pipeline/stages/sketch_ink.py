"""Stage B: lively ink pass over a SketchSlide vector master (offline).

Recommended hybrid: the plan plays the vector draw-on (sync-safe, exact),
then a vidslide plays the inked hold produced here. Flow:

  1. settle frame = last frame of the sketch scene (pure slideforge).
  2. key = sha1(canonical sketch JSON + style version).
  3. cache hit -> reuse clips/<key>.mp4 (deterministic final render).
  4. else if the LTX backend is available -> animate_still img2vid with
     the ink style prompt + APUSH-honest negative prompt -> cache.
  5. else -> None: the caller falls back to the vector master, which is
     still shippable. No silent half-stylized output, ever.

Full-sequence stylization (video-to-video) is interface-ready
(stylize_sequence) for when such a backend exists; nothing in the repo
calls it yet.

APUSH-honest guardrails (baked into the prompts): the ink illustrates
what the narration already says, never adds facts; labels, arrows, and
positions are preserved exactly; no new text.
"""
import hashlib
import json
import os
import subprocess
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, os.pardir))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
_REPO_ROOT = os.path.normpath(os.path.join(_ROOT, os.pardir))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

STYLE_VERSION = "ink-v1"
STYLE_PROMPT = (
    "hand-drawn sepia ink on aged paper, subtle ink bleed and wobble, "
    "stroke draws on lively, paper grain intact, preserve all labels "
    "and arrow positions exactly, do not add text")
NEGATIVE_PROMPT = (
    "people, photoreal soldiers, modern UI, extra text, map warping, "
    "watermark, blurry, low quality")
DUR_TOLERANCE_SEC = 0.5


def sketch_key(elements, title="", style_version=STYLE_VERSION):
    """Stable cache key for a sketch (canonical JSON + style version)."""
    canonical = json.dumps({"elements": elements, "title": title,
                            "style": style_version},
                           sort_keys=True, separators=(",", ":"),
                           ensure_ascii=True)
    return hashlib.sha1(canonical.encode("utf-8")).hexdigest()[:16]


def _probe_duration(path):
    """ffprobe duration, or None when the file is missing/unreadable."""
    try:
        out = subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", path],
            text=True, stderr=subprocess.DEVNULL)
        return float(out.strip())
    except (OSError, subprocess.CalledProcessError, ValueError):
        return None


def _ltx_available():
    try:
        import diffusers  # noqa: F401
        return True
    except ImportError:
        return False


def _ltx_backend(image, seconds, out_mp4, seed=42, model=None):
    """Run the repo's LTX img2vid on one still. Raises on failure."""
    script = os.path.join(_REPO_ROOT, "video", "animate_still.py")
    cmd = [sys.executable, script, "--image", image,
           "--prompt", STYLE_PROMPT, "--out", out_mp4,
           "--duration", str(seconds), "--seed", str(seed),
           "--negative-prompt", NEGATIVE_PROMPT]
    if model:
        cmd += ["--model", model]
    subprocess.run(cmd, check=True, capture_output=True, text=True)


def stylize_sequence(frames_dir, out_mp4, backend=None):  # noqa: ARG001
    """Full-sequence video-to-video stylization (backend pending).

    The repo has no video-to-video LTX backend today (animate_still is
    first-frame img2vid, which cannot preserve a progressing draw-on),
    so this always raises until one is wired. Kept as the documented
    seam so the hybrid (draw-on + inked hold) can graduate later.
    """
    raise NotImplementedError(
        "no video-to-video backend: use the settled-frame hybrid "
        "(ensure_ink_clip) instead")


def export_settle_frame(plan_path, scene_id, assets_dir, out_png,
                        width=1280, height=720):
    """Render the settled (final) frame of a sketchslide scene to PNG."""
    import compile_scene_plan as compiler
    plan = compiler._load_plan(plan_path)
    spec = next((s for s in plan["scenes"] if s.get("id") == scene_id), None)
    if spec is None:
        raise KeyError(f"scene {scene_id!r} not in {plan_path}")
    if str(spec.get("slide", "")).lower() != "sketchslide":
        raise ValueError(f"scene {scene_id!r} is not a sketchslide")
    scene, _, _ = compiler._build_scene(spec, assets_dir, scene_id)
    from slideforge.timeline import Config
    scene.cfg = Config(w=int(width), h=int(height), fps=30)
    frame = scene.frame(max(0.0, scene.duration - 0.05))
    from PIL import Image
    Image.fromarray(frame).save(out_png)
    return out_png


def ensure_ink_clip(settle_png, seconds, key, clips_dir, backend="auto",
                    force=False, seed=42, model=None):
    """Return the cached inked hold clip, generating it if needed.

    backend: "auto" (LTX iff importable, else None-path), "ltx" (raise
    when unavailable or when generation fails), "none" (always None).
    Returns the clip path, or None when there is no backend (caller
    falls back to the vector master).
    """
    os.makedirs(clips_dir, exist_ok=True)
    out = os.path.join(clips_dir, key + ".mp4")
    if os.path.exists(out) and not force:
        actual = _probe_duration(out)
        if actual is not None and abs(actual - seconds) <= DUR_TOLERANCE_SEC:
            print(f"[sketch_ink] cache hit {out}", flush=True)
            return out
        print(f"[sketch_ink] cached clip unusable, rebuilding {out}",
              flush=True)
    use_ltx = (backend == "ltx") or (backend == "auto" and _ltx_available())
    if backend == "ltx" and not _ltx_available():
        raise RuntimeError("[sketch_ink] backend 'ltx' requested but "
                           "diffusers is not installed")
    if not use_ltx:
        print("[sketch_ink] no LTX backend; keep the vector master "
              "(still shippable). Install the GPU stack to ink this sketch.",
              flush=True)
        return None
    _ltx_backend(settle_png, seconds, out, seed=seed, model=model)
    sidecar = os.path.join(clips_dir, key + ".json")
    with open(sidecar, "w", encoding="utf-8") as f:
        json.dump({"key": key, "style": STYLE_VERSION, "seconds": seconds,
                   "seed": seed, "prompt": STYLE_PROMPT,
                   "negative_prompt": NEGATIVE_PROMPT,
                   "settle_frame": os.path.basename(settle_png)}, f, indent=1)
    print(f"[sketch_ink] cached {out}", flush=True)
    return out


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(
        description="Stage B: ink a sketchslide's settled frame (offline).")
    ap.add_argument("--plan", required=True, help="scene_plan.json path")
    ap.add_argument("--scene", required=True, help="sketchslide scene id")
    ap.add_argument("--episode-dir", required=True,
                    help="episode dir (clips/ cache lives here)")
    ap.add_argument("--assets-dir", required=True)
    ap.add_argument("--seconds", type=float, default=5.0,
                    help="hold clip length (3..6 for LTX)")
    ap.add_argument("--backend", default="auto",
                    choices=["auto", "ltx", "none"])
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--height", type=int, default=720)
    args = ap.parse_args(argv)

    import compile_scene_plan as compiler
    plan = compiler._load_plan(args.plan)
    spec = next(s for s in plan["scenes"] if s.get("id") == args.scene)
    key = sketch_key(spec["params"].get("elements", []),
                     spec["params"].get("title", ""))
    clips_dir = os.path.join(args.episode_dir, "clips")
    settle = os.path.join(clips_dir, key + ".settle.png")
    os.makedirs(clips_dir, exist_ok=True)
    export_settle_frame(args.plan, args.scene, args.assets_dir, settle,
                        width=args.width, height=args.height)
    clip = ensure_ink_clip(settle, args.seconds, key, clips_dir,
                           backend=args.backend, force=args.force)
    if clip is None:
        print("no clip produced (no backend); the vector master stands.")
        return 0
    rel = os.path.relpath(clip, args.episode_dir).replace(os.sep, "/")
    print("paste this hold scene after the sketch draw-on scene:")
    print(json.dumps({"slide": "vidslide", "src": rel,
                      "note": "inked hold for " + args.scene}, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
