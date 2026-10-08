#!/usr/bin/env python3
"""
extract_keyframes.py — Extract keyframes at every beat timestamp.

Usage:
  python3 extract_keyframes.py --episode E2 --act 2
  python3 extract_keyframes.py --episode E2 --full

Outputs:
  keyframes/<episode>/act<N>/beat_XXX.png — one per SUB_BEAT (+0.7s for entrance)
  keyframes/<episode>/act<N>/manifest.json — beat metadata with timestamps
"""

import argparse
import json
import re
import subprocess
from pathlib import Path

# Base directory: this script's location. All paths anchor here, not cwd.
_BASE = Path(__file__).parent



def parse_beats(tsx_path):
    """Extract SUB_BEATS from TSX."""
    with open(tsx_path) as f:
        content = f.read()

    beats = []
    # Match SUB_BEATS entries
    pattern = r"\{\s*turnId:\s*'(\w+)'\s*,\s*offset:\s*([\d.]+),\s*kind:\s*'(\w+)'"
    
    for m in re.finditer(pattern, content):
        turn_id, offset, kind = m.groups()
        # Try to get text for context
        text_m = re.search(r"text:\s*'([^']*)'", m.group(0))
        text = text_m.group(1) if text_m else ""
        beats.append({
            'turnId': turn_id,
            'offset': float(offset),
            'kind': kind,
            'text': text[:60],
        })
    
    return beats


def get_timing(episode):
    """Load timing map."""
    # Try multiple locations
    for rel in [
        f'out/data/{episode.lower()}/timing_map.json',
        f'src/data/{episode.lower()}/timing_map.json',
    ]:
        p = _BASE / rel
        if p.exists():
            with open(p) as f:
                return json.load(f)
    raise FileNotFoundError(f"No timing_map.json for {episode}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', default='E2')
    parser.add_argument('--act', type=int, help='Act number (1-5)')
    parser.add_argument('--full', action='store_true', help='Full episode')
    parser.add_argument('--video', help='Path to rendered MP4')
    args = parser.parse_args()

    episode = args.episode
    tsx_path = f'src/components/U1{episode}Episode.tsx'
    
    beats = parse_beats(tsx_path)
    timing = get_timing(episode)
    
    # Resolve beat timestamps
    for b in beats:
        turn_idx = int(b['turnId'][1:])
        b['abs_time'] = timing['starts'][turn_idx] + b['offset']
    
    beats.sort(key=lambda x: x['abs_time'])
    
    # Output dir
    out_dir = _BASE / f'keyframes/{episode}' / (f'act{args.act}' if args.act else 'full')
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Save manifest
    with open(out_dir / 'manifest.json', 'w') as f:
        json.dump(beats, f, indent=1)
    
    print(f"{len(beats)} beats in manifest")
    
    # Extract frames
    video = args.video or f'/tmp/{episode.lower()}_full.mp4'
    for i, b in enumerate(beats):
        # Filter by act if specified
        # (act boundaries would come from config)
        
        t = b['abs_time'] + 0.7  # +0.7s for entrance animation
        out = out_dir / f'beat_{i:03d}.png'
        subprocess.run([
            'ffmpeg', '-y', '-v', 'error',
            '-ss', str(t), '-i', video,
            '-frames:v', '1', str(out)
        ], check=True)
        
        if i % 20 == 0:
            print(f"  {i}/{len(beats)}")
    
    print(f"Done: {out_dir}/")


if __name__ == '__main__':
    main()
