#!/usr/bin/env python3
"""Two-mode render: review (fast QA) and final (production).

Usage:
    python3 render_episode.py --episode u1e2 --act act1 --mode review
    python3 render_episode.py --episode u1e2 --act act1 --mode final

Review: 480x270 @ 10fps, ~9x faster. For QA passes until finalized.
Final:  1280x720 @ 30fps. Run in morning with user for review/finalize.

Pipeline:
    1. v10 plan (word anchors) exists at <act>_v10_manual.json
    2. resolve_cues.py -> resolved plan with measured seconds
    3. compile_scene_plan.py -> mp4
    4. Validation: drift check, QA frames, visual inspection
"""
import argparse, json, os, subprocess, sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_PIPELINE = "/home/hatch/workspace/video-pipeline"

MODES = {
    "review": {"width": 480, "height": 270, "fps": 10, "suffix": "_review"},
    "final": {"width": 1280, "height": 720, "fps": 30, "suffix": "_final"},
}

def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd[:3])} failed: {r.stderr[:500]}")
    return r

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--episode", required=True, help="e.g. u1e2")
    ap.add_argument("--act", required=True, help="e.g. act1")
    ap.add_argument("--mode", choices=["review", "final"], default="review")
    ap.add_argument("--workdir", default=None)
    args = ap.parse_args()

    mode = MODES[args.mode]
    ep_num = args.episode.replace("u1", "u1")  # u1e2 -> u1e2
    workdir = args.workdir or f"/home/hatch/workspace/episode_{args.episode}"
    os.chdir(workdir)

    import os as _os
    plan_in = f"{args.act}_v10_manual.json"
    if not _os.path.exists(plan_in):
        plan_in = f"{args.act}_v10_auto.json"
    resolved = f"{args.act}_v10_resolved.json"
    out = f"final/{args.act}/{args.episode}_{args.act}_v10{mode['suffix']}.mp4"

    print(f"=== {args.episode} {args.act} [{args.mode}] ===", flush=True)
    print(f"  {mode['width']}x{mode['height']} @ {mode['fps']}fps", flush=True)

    # 1. Resolve anchors -> measured seconds
    print("  Resolving cues...", flush=True)
    run([sys.executable, f"{_PIPELINE}/resolve_cues.py",
         plan_in, "timings_wrapped.json", "work/word_times.json",
         "--aliases", "aliases.json", "-o", resolved])

    # 2. Render
    print("  Rendering...", flush=True)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    run([sys.executable, f"{_PIPELINE}/compile_scene_plan.py",
         resolved, "assets/images/", out,
         "--width", str(mode["width"]),
         "--height", str(mode["height"]),
         "--fps", str(mode["fps"])])

    # 3. Validate: drift check
    print("  Validating...", flush=True)
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", out])
    video_dur = float(r.stdout.strip())

    # Audio duration from timings
    with open("timings_wrapped.json") as f:
        tm = json.load(f)
    # Find act turn range from plan
    with open(resolved) as f:
        rp = json.load(f)
    # Use video duration vs sum of scene durations
    scene_total = sum(s["duration_sec"] for s in rp["scenes"])
    drift = abs(video_dur - scene_total)
    frames = drift * mode["fps"]
    status = "OK" if frames < 1.0 else "FAIL"
    print(f"  Drift: {drift:.4f}s ({frames:.2f} frames) [{status}]", flush=True)

    if frames >= 1.0:
        print("  VALIDATION FAILED: drift >= 1 frame", flush=True)
        sys.exit(1)

    # 4. QA frames
    qa_dir = f"qa/{args.act}_{args.mode}"
    os.makedirs(qa_dir, exist_ok=True)
    n_scenes = len(rp["scenes"])
    for i, sc in enumerate(rp["scenes"]):
        t = sc["start_sec"] + 1.0  # 1s into scene
        qp = f"{qa_dir}/scene{i:02d}_{sc['id']}.png"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(t),
                        "-i", out, "-frames:v", "1", qp], check=True)
    print(f"  QA frames: {qa_dir}/ ({n_scenes} scenes)", flush=True)
    print(f"DONE: {out}", flush=True)

if __name__ == "__main__":
    main()
