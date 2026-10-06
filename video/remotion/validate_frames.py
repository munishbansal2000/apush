#!/usr/bin/env python3
"""
U1E1 visual density validator — analyzes RENDERED FRAMES, not code.

Checks:
1. EMPTY SCREEN: Frame has no significant visual elements beyond background + talking head.
   Measured by edge density and text presence in the frame.
2. STATIC SCREEN: Frame hasn't changed significantly in >7 seconds.
   Measured by frame-to-frame difference.

Usage:
    python3 validate_frames.py [--frames 0,300,600,...] [--threshold 7]

Requires: frames rendered via `remotion still` or extracted from video.
"""
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("Need: pip install Pillow numpy")
    sys.exit(1)


def render_frame(frame_num, out_path):
    """Render a single frame via Remotion."""
    r = subprocess.run(
        ["npx", "remotion", "still", "U1E1Episode", str(out_path), f"--frame={frame_num}"],
        cwd="/home/hatch/workspace/remotion-apush",
        capture_output=True, text=True, timeout=60
    )
    return os.path.exists(out_path)


def frame_visual_density(img_path):
    """
    Measure visual density: how much is on screen beyond a plain background.
    Returns 0.0 (empty) to 1.0 (dense).
    
    Uses edge detection: text, boxes, pins, and graphics all create edges.
    A plain background with just a talking head has low edge density.
    """
    img = Image.open(img_path).convert('L')
    arr = np.array(img, dtype=np.float32)
    
    # Sobel edge detection (simplified)
    gx = np.abs(arr[1:, :] - arr[:-1, :])
    gy = np.abs(arr[:, 1:] - arr[:, :-1])
    
    # Edge density: fraction of pixels with significant edges
    edge_thresh = 30
    edges = (gx > edge_thresh).sum() + (gy > edge_thresh).sum()
    total = arr.size * 2
    density = edges / total
    
    return min(1.0, density * 10)  # normalize


def frame_difference(img1_path, img2_path):
    """Measure how different two frames are (0.0 = identical, 1.0 = completely different)."""
    a = np.array(Image.open(img1_path).convert('L'), dtype=np.float32)
    b = np.array(Image.open(img2_path).convert('L'), dtype=np.float32)
    diff = np.abs(a - b).mean() / 255.0
    return diff


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sample-every', type=int, default=90,
                    help='Sample a frame every N frames (default: 90 = 3s)')
    ap.add_argument('--static-thresh', type=float, default=7.0,
                    help='Flag static if no significant change for N seconds')
    ap.add_argument('--empty-thresh', type=float, default=0.15,
                    help='Flag empty if visual density below this')
    args = ap.parse_args()

    # Load timing to map frames to turns
    with open('/home/hatch/workspace/episode_u1e1/timing_map.json') as f:
        tm = json.load(f)
    with open('/home/hatch/workspace/episode_u1e1/turns.json') as f:
        turns = json.load(f)
    
    FPS = 30
    total_frames = int(sum(tm['durations']) * FPS)
    
    # Build frame -> turn mapping
    frame_to_turn = {}
    cum = 0
    for i, t in enumerate(turns):
        start_f = int(cum * FPS)
        end_f = int((cum + tm['durations'][i]) * FPS)
        for fr in range(start_f, end_f):
            frame_to_turn[fr] = t['id']
        cum += tm['durations'][i]
    
    tmpdir = Path('/tmp/validate_frames')
    tmpdir.mkdir(exist_ok=True)
    
    print("Rendering sample frames...")
    frames = list(range(0, total_frames, args.sample_every))
    densities = {}
    prev_frame_path = None
    
    empty_reports = []
    static_reports = []
    last_change_frame = 0
    last_change_turn = None
    
    for i, fr in enumerate(frames):
        out = tmpdir / f"f{fr:05d}.png"
        if not render_frame(fr, out):
            print(f"  Frame {fr}: render failed, skipping")
            continue
        
        density = frame_visual_density(out)
        densities[fr] = density
        turn = frame_to_turn.get(fr, '?')
        
        # Check empty
        if density < args.empty_thresh:
            # Talking head alone gives ~0.08-0.12, background alone ~0.03
            empty_reports.append((fr, turn, density))
        
        # Check static (compare to frame 7s ago)
        if prev_frame_path and i > 0:
            diff = frame_difference(prev_frame_path, out)
            if diff < 0.02:  # essentially unchanged
                # Check how long it's been static
                static_duration = (fr - last_change_frame) / FPS
                if static_duration >= args.static_thresh:
                    # Only report once per static stretch
                    if not static_reports or static_reports[-1][0] != last_change_turn:
                        static_reports.append((last_change_turn, turn, static_duration, fr))
            else:
                last_change_frame = fr
                last_change_turn = turn
        
        prev_frame_path = out
        if i % 10 == 0:
            print(f"  {i+1}/{len(frames)} frames...")
    
    print("\n" + "="*70)
    print("FRAME ANALYSIS RESULTS")
    print("="*70)
    
    print(f"\n❌ EMPTY SCREENS ({len(empty_reports)} frames below density {args.empty_thresh}):")
    # Group by turn
    by_turn = {}
    for fr, turn, d in empty_reports:
        by_turn.setdefault(turn, []).append((fr, d))
    for turn in sorted(by_turn.keys()):
        frames_list = by_turn[turn]
        avg_d = sum(d for _, d in frames_list) / len(frames_list)
        t_sec = frames_list[0][0] / FPS
        print(f"   {turn} @ {t_sec:.0f}s: {len(frames_list)} frames, avg density {avg_d:.3f}")
    
    print(f"\n⚠️  STATIC SCREENS ({len(static_reports)} stretches over {args.static_thresh}s):")
    for turn_start, turn_end, dur, fr in static_reports:
        t_sec = fr / FPS
        print(f"   {turn_start}→{turn_end} @ {t_sec:.0f}s: static for {dur:.1f}s")
    
    print(f"\n{'='*70}")
    print(f"Sampled {len(densities)} frames across {total_frames} total")
    print(f"Avg density: {sum(densities.values())/len(densities):.3f}")
    print(f"{'='*70}")


if __name__ == '__main__':
    main()
