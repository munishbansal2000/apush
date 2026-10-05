#!/usr/bin/env python3
"""APUSH video pipeline — one command from beat sheet + audio to final video.

Usage:
  python3 pipeline.py --episode u1-e1 [--only timing,direct,slideforge_render,assemble,verify]
                      [--force] [--skip-audio-build]
                      [--renderer slideforge|legacy]
                      [--director-provider mock|agent|openai]

Renderers:
  slideforge (default): audio -> timing -> direct (LLM scene plan) ->
      slideforge_render (pure-Python, no browser) -> assemble -> verify.
      The scene plan is a reviewable JSON artifact (work/scene_plan.json);
      rendering is deterministic.
  legacy: the original chrome-headless-shell beat-segment pipeline
      (audio -> timing -> beats -> wordalign -> anim -> clips -> render
      -> assemble -> verify).

Everything is deterministic: same inputs -> same output. Delete a segment
file to force its re-render; --force re-renders everything.
"""
import argparse
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from stages import timing, beats, wordalign, anim, clips, render, assemble, \
    verify  # noqa: E402
from stages import direct as direct_stage, slideforge_render  # noqa: E402

STAGES = ["audio", "timing", "wordtiming", "beats", "wordalign", "anim", "clips", "render",
          "assemble", "verify"]

# Renderer backends. "slideforge" is the default: pure-Python animation
# (no chrome-headless-shell), LLM director -> deterministic compile.
# "legacy" keeps the original chrome-based beat-segment pipeline.
RENDERERS = {
    "legacy": STAGES,
    "slideforge": ["audio", "timing", "wordtiming", "direct", "clips", "slideforge_render",
                   "assemble", "verify"],
}


def run_audio(ep_dir, cfg, skip_build=False):
    tts_dir = os.path.normpath(os.path.join(ep_dir, cfg["tts_dir"]))
    audio = os.path.join(tts_dir, cfg["audio"])
    if os.path.exists(audio):
        print(f"audio: {audio} present", flush=True)
        return audio
    cmd = cfg.get("audio_build")
    if not cmd or skip_build:
        raise RuntimeError(f"mixed audio missing: {audio} (no audio_build configured)")
    print(f"audio: building via: {cmd}", flush=True)
    r = subprocess.run(cmd, shell=True, cwd=tts_dir,
                       capture_output=True, text=True, timeout=7200)
    if r.returncode != 0:
        raise RuntimeError(f"audio build failed: {r.stderr[-800:]}")
    if not os.path.exists(audio):
        raise RuntimeError(f"audio build finished but {audio} still missing")
    return audio


def main():
    ap = argparse.ArgumentParser(description="APUSH video pipeline")
    ap.add_argument("--episode", required=True, help="e.g. u1-e1")
    ap.add_argument("--only", default="",
                    help="comma-separated subset of stages to run")
    ap.add_argument("--force", action="store_true",
                    help="re-render all segments")
    ap.add_argument("--skip-audio-build", action="store_true")
    ap.add_argument("--renderer", default="slideforge",
                    choices=sorted(RENDERERS),
                    help="slideforge (default): LLM director + pure-Python "
                         "render; legacy: chrome-based beat segments")
    ap.add_argument("--width", type=int, default=None,
                    help="override cfg width (fast low-res tests)")
    ap.add_argument("--height", type=int, default=None,
                    help="override cfg height (fast low-res tests)")
    ap.add_argument("--fps", type=int, default=None,
                    help="override cfg fps")
    ap.add_argument("--assets-dir", default=None,
                    help="override assets dir (e.g. test placeholders)")
    ap.add_argument("--director-provider", default="agent",
                    choices=["mock", "agent", "openai"],
                    help="slideforge renderer only: who writes the scene plan")
    ap.add_argument("--plan-file", default=None,
                    help="explicit scene-plan JSON for the direct stage "
                         "(default: work/scene_plan.json, falling back to "
                         "the reviewed <episode>/scene_plan.json)")
    args = ap.parse_args()

    ep_dir = os.path.join(ROOT, "episodes", args.episode)
    cfg_path = os.path.join(ep_dir, "beats.json")
    if not os.path.exists(cfg_path):
        raise RuntimeError(f"no beat sheet: {cfg_path}")
    with open(cfg_path, encoding="utf-8") as f:
        cfg = json.load(f)
    cfg["episode"] = args.episode
    for key in ("width", "height", "fps", "assets_dir"):
        val = getattr(args, key)
        if val is not None:
            cfg[key] = val
    os.makedirs(os.path.join(ep_dir, "work"), exist_ok=True)

    renderer_stages = RENDERERS[args.renderer]
    want = renderer_stages
    if args.only:
        want = [s.strip() for s in args.only.split(",") if s.strip()]
        for s in want:
            if s not in renderer_stages:
                raise RuntimeError(
                    f"unknown stage for renderer {args.renderer!r}: {s}")

    seg_paths = None
    video_path = None
    final = None
    for stage in renderer_stages:
        if stage not in want:
            continue
        print(f"=== stage: {stage} ===", flush=True)
        if stage == "audio":
            run_audio(ep_dir, cfg, args.skip_audio_build)
        elif stage == "timing":
            timing.run(ep_dir, cfg)
        elif stage == "wordtiming":
            from stages import wordtiming
            wordtiming.run(ep_dir, cfg)
        elif stage == "clips":
            if args.renderer == "legacy":
                clips.run(ep_dir, cfg, force=args.force)
            else:
                from stages import clips as clips_stage
                clips_stage.run_from_scene_plan(ep_dir, cfg)
        elif stage == "beats":
            beats.run(ep_dir, cfg)
        elif stage == "wordalign":
            wordalign.run(ep_dir, cfg)
        elif stage == "anim":
            anim.run(ep_dir, cfg)
        elif stage == "render":
            seg_paths = render.run(ep_dir, cfg, force=args.force)
        elif stage == "direct":
            direct_stage.run(ep_dir, cfg, provider=args.director_provider,
                             plan_file=args.plan_file)
        elif stage == "slideforge_render":
            video_path = slideforge_render.run(ep_dir, cfg, force=args.force)
        elif stage == "assemble":
            if args.renderer == "slideforge":
                if video_path is None:
                    video_path = os.path.join(ep_dir, "work",
                                              "slideforge.mp4")
                final = assemble.run_single(ep_dir, cfg, video_path)
            else:
                if seg_paths is None:
                    # re-collect cached segments from resolved beats
                    with open(os.path.join(ep_dir, "work", "beats_resolved.json"),
                              encoding="utf-8") as f:
                        bs = json.load(f)["beats"]
                    seg_paths = [os.path.join(ep_dir, "work", "segs", b["id"] + ".mp4")
                                 for b in bs]
                final = assemble.run(ep_dir, cfg, seg_paths)
        elif stage == "verify":
            if final is None:
                final = os.path.join(ep_dir, f"{args.episode}-final.mp4")
            verify.run(ep_dir, cfg, final)

    if final:
        print(f"PIPELINE DONE: {final}", flush=True)


if __name__ == "__main__":
    main()
