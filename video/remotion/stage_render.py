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
import os
import subprocess
from pathlib import Path


# TODO: derive from timing_map.json instead of hardcoding
ACT_BOUNDARIES = {
    'E2': [(0, 3930), (3931, 6029), (6030, 8284), (8285, 10544), (10545, 13448)],
    'E3': [(0, 4603), (4604, 9462), (9463, 13713), (13714, 18284), (18285, 22904)],
    'E4': [(0, 7344), (7345, 11050), (11051, 17498), (17499, 22907), (22908, 24013)],
    'E5': [(0, 4951), (4951, 8736), (8736, 12230), (12230, 15980), (15980, 21953)],
    'E6': [(0, 6968), (6968, 9443), (9443, 13806), (13806, 17592), (17592, 24922)],
    'E7': [(0, 8671), (8672, 12134), (12135, 15702), (15703, 17991), (17992, 25930)],
    'E8': [(0, 5483), (5483, 9080), (9080, 11801), (11801, 15186), (15186, 23076)],
    'E9': [(0, 7321), (7322, 12525), (12526, 18045), (18046, 22946), (22947, 29847)],
}

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
    
    acts = [args.act] if args.act else list(range(1, len(ACT_BOUNDARIES[episode]) + 1))
    
    for act_num in acts:
        start, end = ACT_BOUNDARIES[episode][act_num - 1]
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
