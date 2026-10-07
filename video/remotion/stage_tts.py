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
import hashlib
import glob
import json
import subprocess
from pathlib import Path


PROVIDERS = {
    'meta': {
        'maya': 'avocado_v2:aria',
        'marcus': 'avocado_v2:briggs',
        'jay': 'avocado_v2:atlas',
        'sepúlveda': 'avocado_v2:atlas',
        'cmd': 'tts',  # /opt/hatch/bin/tts
    },
    'edge': {
        'maya': 'en-US-AriaNeural',
        'marcus': 'en-US-GuyNeural',
        'jay': 'en-US-DavisNeural',
        'sepúlveda': 'en-US-DavisNeural',
        'cmd': 'edge-tts',
    },
    'fish': {
        'maya': 'fish_maya_id',      # TODO: resolve from config
        'marcus': 'fish_marcus_id',
        'jay': 'fish_jay_id',
        'cmd': 'fish_tts',            # TODO: implement
    },
}


def trim_leading_silence(mp3_path, threshold_db=-30, min_duration=0.05):
    """Trim leading silence from MP3 using ffmpeg silenceremove.
    
    TTS engines (Meta, Edge) pad output with 0.2-0.4s leading silence.
    This shifts every turn-anchored visual early. Trim at the source
    so downstream timing is correct without onset compensation.
    Returns True on success.
    """
    tmp = str(mp3_path) + '.trimmed.mp3'
    result = subprocess.run([
        'ffmpeg', '-y', '-v', 'error',
        '-i', str(mp3_path),
        '-af', f'silenceremove=start_periods=1:start_duration={min_duration}:start_threshold={threshold_db}dB',
        '-c:a', 'libmp3lame', '-q:a', '2',
        tmp,
    ], capture_output=True)
    if result.returncode != 0:
        return False
    # Replace original with trimmed
    import os
    os.replace(tmp, mp3_path)
    return True


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
    if result.returncode == 0:
        trim_leading_silence(output_path)
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
    if result.returncode == 0:
        trim_leading_silence(output_path)
    return result.returncode == 0


def parse_markdown_script(md_path):
    """
    Parse audio_scripts Markdown format.
    - Lines starting with # are directives (strip)
    - Lines like "Maya: ..." are dialogue turns
    - [pause] tags become silence markers
    - Returns list of {speaker, text, pause_after}
    """
    import re
    
    with open(md_path) as f:
        lines = f.readlines()
    
    turns = []
    for line in lines:
        line = line.strip()
        # Skip comments and empty lines
        if not line or line.startswith('#'):
            continue
        
        # Standalone pause line: "[8-second pause]" → silence turn
        pause_only = re.match(r'^\[(\d+)-second pause\]$', line)
        if pause_only:
            turns.append({'speaker': 'pause', 'text': '',
                          'pause_after': int(pause_only.group(1))})
            continue

        # Match "Speaker: text" — any name incl. Unicode (e.g. Sepúlveda), not just ASCII
        m = re.match(r'^([\w]+|PAUSE):\s*(.+)$', line, re.UNICODE)
        if m:
            speaker = m.group(1).lower()
            text = m.group(2)
            
            # Extract pause markers
            pause_after = 0
            pause_m = re.search(r'\[(\d+)-second pause\]', text)
            if pause_m:
                pause_after = int(pause_m.group(1))
                text = re.sub(r'\[\d+-second pause\]', '', text).strip()
            
            # Handle PAUSE speaker (silence only)
            if speaker == 'pause':
                turns.append({'speaker': 'pause', 'text': '', 'pause_after': pause_after or 5})
            else:
                turns.append({'speaker': speaker, 'text': text, 'pause_after': pause_after})
    
    return turns


def parse_json_script(json_path):
    """Parse legacy JSON script format."""
    with open(json_path) as f:
        script = json.load(f)
    turns = script.get('turns', script) if isinstance(script, dict) else script
    # Normalize to {speaker, text, pause_after}
    normalized = []
    for t in turns:
        normalized.append({
            'speaker': t.get('speaker', 'maya').lower(),
            'text': t.get('text', ''),
            'pause_after': t.get('pause_after', 0),
        })
    return normalized


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', required=True, help='Episode ID (e.g. E2 or U2E3)')
    parser.add_argument('--unit', type=int, default=None,
                       help='Unit number (1-9). Auto-detected from episode ID if not given.')
    parser.add_argument('--provider', choices=['meta', 'edge', 'fish'],
                       default='meta')
    parser.add_argument('--prod', action='store_true',
                       help='Prod mode (validates fish provider)')
    parser.add_argument('--force', action='store_true',
                       help='Re-render even if MP3 exists')
    args = parser.parse_args()

    episode = args.episode.upper()
    provider = args.provider

    # Parse unit from episode ID (U2E3 -> unit 2, episode E3)
    # or use --unit flag, default to 1
    import re
    m = re.match(r'U(\d+)E(\d+)', episode)
    if m:
        unit_num = int(m.group(1))
        ep_num = m.group(2)
        episode = f'E{ep_num}'  # Normalize to E3 for internal use
    elif args.unit:
        unit_num = args.unit
        ep_num = episode[1:] if episode.startswith('E') else episode
    else:
        unit_num = 1
        ep_num = episode[1:] if episode.startswith('E') else episode
    
    unit = f'unit{unit_num}'
    # Data directory: u2e3 for Unit 2 (avoid collision with Unit 1's e3)
    data_id = f'u{unit_num}e{ep_num}' if unit_num > 1 else f'e{ep_num}'

    if provider == 'fish' and not args.prod:
        print("WARNING: Fish is for prod. Use --prod flag.")
        return 1

    # Load script — canonical source is audio_scripts/ Markdown
    # Format: audio_scripts/unit<N>/apush-audio-u<N>-e<M>-script-v*-DRAFT.md
    turns = None
    
    # Try audio_scripts first (canonical)
    md_pattern = f'../audio_scripts/{unit}/apush-audio-u{unit_num}-e{ep_num}-script-v*-DRAFT.md'
    # Also try repo path via API (for now, use local if exists)
    md_files = sorted(glob.glob(md_pattern))
    # Try absolute repo sync path
    if not md_files:
        md_files = sorted(glob.glob(f'/home/hatch/workspace/audio_scripts/{unit}/apush-audio-*-e{ep_num}-script-v*-DRAFT.md'))
    
    if md_files:
        # Use latest version (highest v number)
        script_path = md_files[-1]
        print(f"Using canonical script: {script_path}")
        turns = parse_markdown_script(script_path)
    else:
        # Fall back to JSON
        script_path = Path(f'episodes/{episode.lower()}/script.json')
        for alt in [f'../episode_{episode.lower()}/script.json',
                    f'src/data/{episode.lower()}/script.json']:
            if Path(alt).exists():
                script_path = Path(alt)
                break
        
        if not Path(script_path).exists():
            print(f"ERROR: No script found. Tried:")
            print(f"  - {md_pattern}")
            print(f"  - {script_path}")
            return 1
        
        print(f"Using JSON script: {script_path} (consider migrating to audio_scripts/)")
        turns = parse_json_script(script_path)

    # Output dir
    out_dir = Path(f'episodes/{data_id}/tts/{provider}')
    out_dir.mkdir(parents=True, exist_ok=True)

    # Write turns.json to src/data for Remotion components
    data_dir = Path(f'src/data/{data_id}')
    data_dir.mkdir(parents=True, exist_ok=True)
    turns_json_path = data_dir / 'turns.json'
    # Add turn IDs if not present (t00, t01, ...)
    turns_with_ids = []
    for i, turn in enumerate(turns):
        t = dict(turn)
        if 'id' not in t:
            t['id'] = f't{i:02d}'
        turns_with_ids.append(t)
    import json as json_mod
    turns_json_path.write_text(json_mod.dumps(turns_with_ids, indent=2))
    print(f"Turns: {turns_json_path} ({len(turns_with_ids)} turns)")

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
        pause_after = turn.get('pause_after', 0)
        
        out_path = out_dir / f'turn_{i:03d}.mp3'
        hash_path = out_dir / f'turn_{i:03d}.hash'
        
        # Content-hash based cache: hash of (text + speaker + voice + provider)
        # Regenerates if text, voice, or provider changed — no --force needed
        voice = voices.get(speaker, voices['maya'])
        content_key = f"{provider}:{voice}:{speaker}:{text}:{pause_after}"
        content_hash = hashlib.sha256(content_key.encode()).hexdigest()[:16]
        
        cached_hash = None
        if hash_path.exists():
            cached_hash = hash_path.read_text().strip()
        
        if out_path.exists() and cached_hash == content_hash and not args.force:
            print(f"  [{i}] Cached: {out_path.name}")
            continue
        
        if out_path.exists() and cached_hash != content_hash:
            print(f"  [{i}] Content changed, regenerating...")
        
        # Handle pause/silence turns (no TTS, just silence)
        if speaker == 'pause' or not text.strip():
            silence_secs = pause_after or 5
            print(f"  [{i}] pause: {silence_secs}s silence...")
            # Generate silence with ffmpeg
            result = subprocess.run([
                'ffmpeg', '-y', '-v', 'error',
                '-f', 'lavfi', '-i', f'anullsrc=r=44100:cl=stereo:d={silence_secs}',
                str(out_path)
            ], capture_output=True)
            if result.returncode != 0:
                print(f"  ERROR generating silence for turn {i}")
                return 1
            # Write hash for silence turns too
            hash_path.write_text(content_hash)
            continue
        
        print(f"  [{i}] {speaker}: {text[:40]}...")
        if not render_fn(text, voice, out_path):
            print(f"  ERROR rendering turn {i}")
            return 1
        # Write hash after successful render
        hash_path.write_text(content_hash)

    print(f"\n✅ Done: {out_dir}/")
    
    # Copy to public/audio/{data_id}/ as tXX.mp3 for Remotion staticFile()
    import shutil
    public_dir = Path(f'public/audio/{data_id}')
    public_dir.mkdir(parents=True, exist_ok=True)
    for i in range(len(turns)):
        src = out_dir / f'turn_{i:03d}.mp3'
        dst = public_dir / f't{i:02d}.mp3'
        if src.exists():
            shutil.copy2(src, dst)
    print(f"Audio: {public_dir}/ ({len(turns)} files)")
    return 0


if __name__ == '__main__':
    import sys
    sys.exit(main())
