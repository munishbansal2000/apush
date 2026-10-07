#!/usr/bin/env python3
"""
stage_tts.py — Stage 1: Render TTS for episode turns.

Supports three providers:
  meta — Meta AI voices (fast placeholder). Default.
  edge — Microsoft Edge TTS (alternative placeholder).
  fish — Fish Audio (final Maya/Marcus voices, prod only).

Usage:
  python3 stage_tts.py --episode E2 --provider meta
  python3 stage_tts.py --episode E2 --provider fish --prod

Input:  episodes/<id>/script.json (turns with speaker + text)
Output: episodes/<id>/tts/<provider>/turn_*.mp3
"""

import argparse
import json
import subprocess
from pathlib import Path


PROVIDERS = {
    'meta': {
        'maya': 'avocado_v2:aria',
        'marcus': 'avocado_v2:briggs',
        'cmd': 'tts',  # /opt/hatch/bin/tts
    },
    'edge': {
        'maya': 'en-US-AriaNeural',
        'marcus': 'en-US-GuyNeural',
        'cmd': 'edge-tts',
    },
    'fish': {
        'maya': 'fish_maya_id',      # TODO: resolve from config
        'marcus': 'fish_marcus_id',
        'cmd': 'fish_tts',            # TODO: implement
    },
}


def render_turn_meta(text, voice, output_path):
    """Render single turn with Meta TTS."""
    cmd = [
        '/opt/hatch/bin/tts', 'speak',
        '--voice', voice,
        '--output', str(output_path),
        '--text-stdin',
    ]
    result = subprocess.run(
        cmd, input=text.encode(),
        capture_output=True
    )
    return result.returncode == 0


def render_turn_edge(text, voice, output_path):
    """Render single turn with Edge TTS."""
    cmd = [
        'edge-tts',
        '--voice', voice,
        '--text', text,
        '--write-media', str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True)
    return result.returncode == 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', required=True, help='Episode ID (e.g. E2)')
    parser.add_argument('--provider', choices=['meta', 'edge', 'fish'],
                       default='meta')
    parser.add_argument('--prod', action='store_true',
                       help='Prod mode (validates fish provider)')
    parser.add_argument('--force', action='store_true',
                       help='Re-render even if MP3 exists')
    args = parser.parse_args()

    episode = args.episode.upper()
    provider = args.provider

    if provider == 'fish' and not args.prod:
        print("WARNING: Fish is for prod. Use --prod flag.")
        return 1

    # Load script
    script_path = Path(f'episodes/{episode.lower()}/script.json')
    # Try alternative locations
    for alt in [
        f'../episode_{episode.lower()}/script.json',
        f'src/data/{episode.lower()}/script.json',
    ]:
        if Path(alt).exists():
            script_path = Path(alt)
            break

    if not script_path.exists():
        print(f"ERROR: No script.json at {script_path}")
        return 1

    with open(script_path) as f:
        script = json.load(f)

    turns = script.get('turns', script) if isinstance(script, dict) else script

    # Output dir
    out_dir = Path(f'episodes/{episode.lower()}/tts/{provider}')
    out_dir.mkdir(parents=True, exist_ok=True)

    voices = PROVIDERS[provider]
    render_fn = {
        'meta': render_turn_meta,
        'edge': render_turn_edge,
    }.get(provider)

    if not render_fn:
        print(f"ERROR: Provider {provider} not yet implemented")
        return 1

    print(f"Rendering {len(turns)} turns with {provider}...")
    
    for i, turn in enumerate(turns):
        speaker = turn.get('speaker', 'maya').lower()
        text = turn.get('text', '')
        voice = voices.get(speaker, voices['maya'])
        
        out_path = out_dir / f'turn_{i:03d}.mp3'
        
        if out_path.exists() and not args.force:
            print(f"  [{i}] Cached: {out_path.name}")
            continue
        
        print(f"  [{i}] {speaker}: {text[:40]}...")
        if not render_fn(text, voice, out_path):
            print(f"  ERROR rendering turn {i}")
            return 1

    print(f"\n✅ Done: {out_dir}/")
    return 0


if __name__ == '__main__':
    import sys
    sys.exit(main())
