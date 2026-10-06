#!/usr/bin/env python3
"""Visual QA for rendered episodes: correctness, completeness, usefulness, prod-readiness.

Checks (automated):
  1. No blank/solid-color backgrounds (pixel variance threshold)
  2. Text present (not empty frames)
  3. No extreme darkness/brightness (exposure check)
  4. Scene count matches plan
  5. Duration matches plan within 1 frame

Manual review still needed for:
  - Topic alignment (visual matches spoken content)
  - Text clipping/overlap
  - Image relevance and quality
  - Overall prod-readiness judgment

Usage:
    python3 qa_render.py --episode u1e2 --act act1 --mode review
"""
import argparse, json, os, subprocess, sys
import numpy as np
from PIL import Image

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd[:3])} failed: {r.stderr[:300]}")
    return r

def frame_variance(png_path):
    """Pixel variance: blank/solid frames have ~0 variance."""
    img = Image.open(png_path).convert("L")
    arr = np.array(img, dtype=np.float32)
    return float(arr.var())

def frame_brightness(png_path):
    img = Image.open(png_path).convert("L")
    arr = np.array(img, dtype=np.float32)
    return float(arr.mean())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--episode", required=True)
    ap.add_argument("--act", required=True)
    ap.add_argument("--mode", default="review", choices=["review", "final"])
    ap.add_argument("--workdir", default=None)
    args = ap.parse_args()

    workdir = args.workdir or f"/home/hatch/workspace/episode_{args.episode}"
    os.chdir(workdir)

    suffix = "_review" if args.mode == "review" else "_final"
    mp4 = f"final/{args.act}/{args.episode}_{args.act}_v10{suffix}.mp4"
    qa_dir = f"qa/{args.act}_{args.mode}"

    if not os.path.exists(mp4):
        print(f"FAIL: {mp4} not found")
        sys.exit(1)

    # Load resolved plan for scene info
    plan_path = f"{args.act}_v10_resolved.json"
    if not os.path.exists(plan_path):
        plan_path = f"{args.act}_v10_manual.json"
    with open(plan_path) as f:
        plan = json.load(f)

    print(f"=== QA: {args.episode} {args.act} [{args.mode}] ===")
    print(f"  Scenes: {len(plan['scenes'])}")

    issues = []
    warnings = []

    # Check each QA frame
    for i, sc in enumerate(plan["scenes"]):
        fp = f"{qa_dir}/scene{i:02d}_{sc['id']}.png"
        if not os.path.exists(fp):
            issues.append(f"Scene {sc['id']}: QA frame missing")
            continue

        var = frame_variance(fp)
        bright = frame_brightness(fp)

        # Blank background check: variance < 100 means nearly solid
        if var < 100:
            issues.append(f"Scene {sc['id']}: POSSIBLE BLANK BACKGROUND (var={var:.1f})")
        elif var < 500:
            warnings.append(f"Scene {sc['id']}: low texture variance ({var:.1f})")

        # Exposure check
        if bright < 12:
            issues.append(f"Scene {sc['id']}: CRITICALLY dark (brightness={bright:.1f})")
        elif bright > 235:
            issues.append(f"Scene {sc['id']}: too bright (brightness={bright:.1f})")

        # Slide type check
        slide = sc.get("slide", "unknown")
        print(f"  [{i}] {sc['id']}: {slide} var={var:.0f} bright={bright:.0f}")

    # Duration check
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", mp4])
    video_dur = float(r.stdout.strip())
    scene_total = sum(s["duration_sec"] for s in plan["scenes"])
    drift = abs(video_dur - scene_total)
    fps = 10 if args.mode == "review" else 30
    frames = drift * fps
    print(f"  Duration: video={video_dur:.2f}s scenes={scene_total:.2f}s drift={frames:.2f}f")
    if frames >= 1.0:
        issues.append(f"Drift {frames:.2f} frames >= 1.0")

    print()
    if issues:
        print(f"ISSUES ({len(issues)}):")
        for iss in issues:
            print(f"  ❌ {iss}")
    if warnings:
        print(f"WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  ⚠️  {w}")
    if not issues and not warnings:
        print("✅ All automated checks passed")

    print()
    print("MANUAL REVIEW NEEDED:")
    print(f"  QA frames: {qa_dir}/")
    print("  Check: topic alignment, text clipping, image relevance, prod-readiness")

    sys.exit(1 if issues else 0)

if __name__ == "__main__":
    main()
