#!/usr/bin/env python3
"""
stage_music.py — Generate music event timeline for APUSH episodes.

Reads timing_map.json and act boundaries, outputs music_timeline.json with:
- intro_sting at t=0 (8s, dialogue ducks under tail)
- chapter_sting at each act boundary (3s)
- outro_sting over final 8s
- Optional bed_loop under intro/transitions/outro at -20dB

Usage:
  python3 stage_music.py --episode E3
  python3 stage_music.py --episode E3 --music-dir music/podcast-pack-v1/
  python3 stage_music.py --episode E3 --no-music

Output: src/data/<ep>/music_timeline.json
        public/audio/<ep>/music/*.wav (generated or copied assets)
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

# Music event definitions (seconds)
INTRO_DURATION = 8.0
CHAPTER_STING_DURATION = 3.0
OUTRO_DURATION = 8.0
BED_DUCK_DB = -20.0

# Asset filenames expected in --music-dir
ASSET_FILES = {
    'intro_sting': ['intro_sting.wav', 'intro_sting.mp3', 'intro.wav'],
    'chapter_sting': ['chapter_sting.wav', 'chapter_sting.mp3', 'sting.wav'],
    'outro_sting': ['outro_sting.wav', 'outro_sting.mp3', 'outro.wav'],
    'bed_loop': ['bed_loop.wav', 'bed_loop.mp3', 'bed.wav'],
}


def find_asset(music_dir, asset_id):
    """Find asset file in music_dir, or None."""
    if not music_dir:
        return None
    md = Path(music_dir)
    for fname in ASSET_FILES[asset_id]:
        candidate = md / fname
        if candidate.exists():
            return candidate
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', required=True, help='E3, E4, etc.')
    parser.add_argument('--music-dir', default=None,
                        help='Directory of WAV/MP3 brand assets')
    parser.add_argument('--no-music', action='store_true',
                        help='Skip music generation')
    args = parser.parse_args()

    episode = args.episode.upper()
    ep_lower = episode.lower()

    if args.no_music:
        print("Music disabled (--no-music)")
        # Write empty timeline
        out_path = Path(f'src/data/{ep_lower}/music_timeline.json')
        out_path.write_text(json.dumps({"events": [], "disabled": True}, indent=2))
        return 0

    # Load timing
    timing_path = Path(f'src/data/{ep_lower}/timing_map.json')
    if not timing_path.exists():
        print(f"ERROR: {timing_path} not found", file=sys.stderr)
        return 1

    with open(timing_path) as f:
        timing = json.load(f)

    starts = timing['starts']
    durations = timing['durations']
    total_duration = starts[-1] + durations[-1]

    # Get act boundaries
    sys.path.insert(0, '.')
    from stage_render import get_act_boundaries
    boundaries = get_act_boundaries(episode, num_acts=5, fps=30)
    # Convert frame boundaries to seconds
    act_starts_sec = [b[0] / 30.0 for b in boundaries[1:]]  # Acts 2-5 start times

    # Build music events
    events = []

    # Intro: 0 to INTRO_DURATION
    events.append({
        "type": "intro_sting",
        "asset_id": "intro_sting",
        "start_sec": 0.0,
        "duration_sec": INTRO_DURATION,
        "duck_dialogue": True,  # Dialogue starts under the tail
        "duck_db": -8.0,  # Dialogue slightly ducked during intro tail
    })

    # Chapter stings at act boundaries (acts 2-5)
    for i, act_start in enumerate(act_starts_sec):
        events.append({
            "type": "chapter_sting",
            "asset_id": "chapter_sting",
            "start_sec": act_start,
            "duration_sec": CHAPTER_STING_DURATION,
            "act": i + 2,
        })

    # Outro: last OUTRO_DURATION seconds
    events.append({
        "type": "outro_sting",
        "asset_id": "outro_sting",
        "start_sec": total_duration - OUTRO_DURATION,
        "duration_sec": OUTRO_DURATION,
        "duck_dialogue": False,  # Outro plays over fading dialogue
    })

    # Prepare asset directory
    asset_dir = Path(f'public/audio/{ep_lower}/music')
    asset_dir.mkdir(parents=True, exist_ok=True)

    # Resolve assets: use music_dir if provided, else procedural fallback
    for event in events:
        asset_id = event['asset_id']
        asset_path = find_asset(args.music_dir, asset_id)
        
        if asset_path:
            # Copy from music_dir
            dest = asset_dir / f'{asset_id}.wav'
            if asset_path.suffix == '.mp3':
                # Convert MP3 to WAV
                import subprocess
                subprocess.run([
                    'ffmpeg', '-y', '-v', 'error',
                    '-i', str(asset_path),
                    '-ar', '44100', '-ac', '2',
                    str(dest)
                ], check=True)
            else:
                shutil.copy(asset_path, dest)
            event['src'] = f'audio/{ep_lower}/music/{asset_id}.wav'
            event['source'] = 'music_dir'
        else:
            # Procedural fallback via audio_brand.py
            from audio_brand import render_asset
            dest = asset_dir / f'{asset_id}.wav'
            duration_ms = int(event['duration_sec'] * 1000)
            render_asset(asset_id, duration_ms, out_path=str(dest))
            event['src'] = f'audio/{ep_lower}/music/{asset_id}.wav'
            event['source'] = 'procedural'

    # Write timeline
    timeline = {
        "episode": episode,
        "total_duration_sec": total_duration,
        "events": events,
        "mix_rules": {
            "intro_duck_db": -8.0,
            "bed_duck_db": BED_DUCK_DB,
            "sting_gain_db": -6.0,  # Stings sit slightly above dialogue
        }
    }

    out_path = Path(f'src/data/{ep_lower}/music_timeline.json')
    out_path.write_text(json.dumps(timeline, indent=2))
    print(f"✅ Music timeline: {out_path}")
    print(f"   {len(events)} events, assets in {asset_dir}/")
    return 0


if __name__ == '__main__':
    sys.exit(main())
