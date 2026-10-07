#!/usr/bin/env python3
"""
stage_render.py — Stage 4: Render Remotion acts.

Usage:
  python3 stage_render.py --episode E2 --act 2 --mode test
  python3 stage_render.py --episode E2 --mode test        # all acts
  python3 stage_render.py --episode E2 --mode prod --act 1

Modes:
  test — 480x270 (scale 0.375), fast iteration
  prod — 1280x720 (scale 1.0), final quality

Output: .build_cache/<episode>/act<N>_<mode>_<hash>.mp4
Skips render if TSX unchanged (hash-based cache).
"""

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path


def get_act_boundaries(episode, num_acts=5, fps=30):
    """
    Derive act boundaries from timing_map.json.
    Splits at turn boundaries nearest to even divisions.
    Returns list of (start_frame, end_frame) tuples at the given fps.
    """
    import re
    m = re.match(r'U(\d+)E(\d+)', episode.upper())
    ep_lower = f'u{m.group(1)}e{m.group(2)}' if m else episode.lower()
    timing_path = Path(f'src/data/{ep_lower}/timing_map.json')
    
    if not timing_path.exists():
        raise FileNotFoundError(f"Timing map not found: {timing_path}")
    
    with open(timing_path) as f:
        timing = json.load(f)
    
    starts = timing.get('starts', [])
    durations = timing.get('durations', [])
    
    if not starts or not durations:
        raise ValueError(f"No timing data in {timing_path}")
    
    total_duration = starts[-1] + durations[-1]
    total_frames = int(total_duration * fps)
    
    # Find turn boundaries (start times in seconds)
    # We want splits at ~20%, 40%, 60%, 80% of total duration
    boundaries = [0]
    for i in range(1, num_acts):
        target_time = (total_duration * i) / num_acts
        # Find the turn start closest to target_time
        best_idx = 0
        best_diff = abs(starts[0] - target_time)
        for idx, s in enumerate(starts):
            diff = abs(s - target_time)
            if diff < best_diff:
                best_diff = diff
                best_idx = idx
        boundaries.append(int(starts[best_idx] * fps))
    
    boundaries.append(total_frames)
    
    # Convert to (start, end) tuples
    acts = []
    for i in range(num_acts):
        start = boundaries[i]
        end = boundaries[i + 1] - 1 if i < num_acts - 1 else boundaries[i + 1]
        acts.append((start, end))
    
    return acts

RENDER_SCALES = {
    'test': 0.375,   # 480x270 @ 30fps (fast iteration)
    'review': 0.375, # 480x270 @ 10fps (true review mode, ~9x faster)
    'prod': 1.0,     # 1280x720 @ 30fps (final quality)
}

RENDER_FPS = {
    'test': 30,
    'review': 10,
    'prod': 30,
}


def file_hash(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()[:12]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', required=True)
    parser.add_argument('--act', type=int, help='Act number, omit for all')
    parser.add_argument('--mode', choices=['test', 'review', 'prod'], default='test')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()

    episode = args.episode.upper()
    mode = args.mode
    scale = RENDER_SCALES[mode]
    fps = RENDER_FPS[mode]
    
    tsx_path = Path(f'src/components/U1{episode}Episode.tsx')
    if not tsx_path.exists():
        print(f"ERROR: {tsx_path} not found")
        return 1
    
    tsx_hash = file_hash(tsx_path)
    cache_dir = Path(f'.build_cache/{episode}')
    cache_dir.mkdir(parents=True, exist_ok=True)
    
    # Derive act boundaries from timing data (not hardcoded)
    act_boundaries = get_act_boundaries(episode, num_acts=5, fps=30)
    acts = [args.act] if args.act else list(range(1, len(act_boundaries) + 1))
    
    for act_num in acts:
        start, end = act_boundaries[act_num - 1]
        out_path = cache_dir / f'act{act_num}_{mode}_{tsx_hash}.mp4'
        
        if out_path.exists() and not args.force:
            print(f"Act {act_num}: cached ({out_path.name})")
            continue
        
        # Convert frame range for non-30fps modes
        if fps != 30:
            start = int(start * fps / 30)
            end = int(end * fps / 30)
        
        print(f"Act {act_num}: rendering frames {start}-{end} @ {fps}fps scale {scale}...")
        
        cmd = [
            'npx', 'remotion', 'render',
            f'U1{episode}Episode',
            str(out_path),
            f'--frames={start}-{end}',
            f'--scale={scale}',
            f'--fps={fps}',
        ]
        
        env = {**os.environ, 'TMPDIR': str(Path.home() / 'workspace' / 'render_tmp')}
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        
        if result.returncode != 0:
            print(f"ERROR rendering act {act_num}:")
            print(result.stderr[-2000:])
            return 1
        
        print(f"Act {act_num}: ✅ {out_path}")
    
    print(f"\n✅ Done")
    return 0


if __name__ == '__main__':
    import sys
    sys.exit(main())
