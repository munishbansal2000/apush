#!/usr/bin/env python3
"""
build_episode.py — Single orchestrator for Remotion episode builds.

Replaces the manual loop: TTS → timing → validate → render → keyframes → QA → assemble.

Usage:
  # Test mode (incremental, low-res)
  python3 build_episode.py E2 --act 2 --mode test --tts meta
  
  # Full test render
  python3 build_episode.py E2 --mode test --tts meta
  
  # Validate only (no render)
  python3 build_episode.py E2 --validate-only
  
  # Prod (morning, with user): full-res, Fish voices
  python3 build_episode.py E2 --mode prod --tts fish

TTS providers:
  meta — Meta AI voices (placeholder, fast). Default for test.
  edge — Microsoft Edge TTS (alternative placeholder).
  fish — Fish Audio Maya/Marcus (final, prod only).

Render modes:
  test — 480x270 @ 30fps, placeholder voices, fast iteration.
  prod — 1280x720 @ 30fps, final voices, morning session with user.

Incremental:
  - Timing cached by MP3 hash (skip Vosk if unchanged)
  - Acts cached by TSX hash (skip render if unchanged)
  - Use --act N for single act, --force to override cache
"""

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path


# Act boundaries (frames) — from timing_map.json
# TODO: derive from timing instead of hardcoding
ACT_BOUNDARIES = {
    'E2': [
        (0, 3930),      # Act 1
        (3931, 6029),   # Act 2
        (6030, 8284),   # Act 3
        (8285, 10544),  # Act 4
        (10545, 13448), # Act 5
    ],
}

# TTS voice mapping
TTS_VOICES = {
    'meta': {
        'maya': 'avocado_v2:aria',
        'marcus': 'avocado_v2:briggs',
    },
    'edge': {
        'maya': 'en-US-AriaNeural',
        'marcus': 'en-US-GuyNeural',
    },
    'fish': {
        'maya': 'fish:maya',    # Resolved at render time
        'marcus': 'fish:marcus',
    },
}

# Render settings per mode
RENDER_MODES = {
    'test': {'scale': 0.375, 'desc': '480x270'},
    'prod': {'scale': 1.0, 'desc': '1280x720'},
}


def file_hash(path):
    """SHA256 hash of file."""
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()[:12]


def get_cache_dir(episode):
    d = Path(f'.build_cache/{episode}')
    d.mkdir(parents=True, exist_ok=True)
    return d


def check_timing(episode, tts_provider, force=False):
    """Ensure timing.json exists and is current. Build if needed."""
    cache_dir = get_cache_dir(episode)
    timing_path = Path(f'src/data/{episode.lower()}/timing_map.json')
    
    if timing_path.exists() and not force:
        print(f"  Timing exists: {timing_path}")
        return True
    
    print(f"  Building timing with {tts_provider} TTS...")
    # TODO: implement TTS → Vosk pipeline
    # For now, timing must exist
    print(f"  ERROR: Timing build not yet implemented. Run manually.")
    return False


def run_validators(episode):
    """Run all validators. Returns True if all pass."""
    print("\n[1/5] Running validators...")
    
    validators = [
        (['python3', 'validate_e2.py'], 'Visual density'),
        (['python3', 'validate_scene.py'], 'Scene validation'),
    ]
    
    all_pass = True
    for cmd, name in validators:
        print(f"  {name}...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"  ❌ {name} FAILED")
            print(result.stdout[-500:])
            all_pass = False
        else:
            print(f"  ✅ {name} passed")
    
    return all_pass


def render_act(episode, act_num, mode, force=False):
    """Render a single act. Returns path to MP4."""
    print(f"\n[2/5] Rendering Act {act_num} ({mode})...")
    
    cache_dir = get_cache_dir(episode)
    tsx_path = Path(f'src/components/U1{episode}Episode.tsx')
    tsx_hash = file_hash(tsx_path)
    
    # Check cache
    cache_file = cache_dir / f'act{act_num}_{mode}_{tsx_hash}.mp4'
    if cache_file.exists() and not force:
        print(f"  Cached: {cache_file}")
        return str(cache_file)
    
    # Get frame range
    start, end = ACT_BOUNDARIES[episode][act_num - 1]
    scale = RENDER_MODES[mode]['scale']
    
    out_path = cache_dir / f'act{act_num}_{mode}_{tsx_hash}.mp4'
    
    cmd = [
        'npx', 'remotion', 'render',
        f'U1{episode}Episode',
        str(out_path),
        f'--frames={start}-{end}',
        f'--scale={scale}',
    ]
    
    print(f"  Frames {start}-{end}, scale {scale}")
    print(f"  Running: {' '.join(cmd[:5])}...")
    
    env = {'TMPDIR': str(Path.home() / 'workspace' / 'render_tmp')}
    import os
    full_env = {**os.environ, **env}
    
    result = subprocess.run(cmd, capture_output=True, text=True, env=full_env)
    if result.returncode != 0:
        print(f"  ❌ Render failed")
        print(result.stderr[-1000:])
        return None
    
    print(f"  ✅ Rendered: {out_path}")
    return str(out_path)


def extract_keyframes(episode, act_num, video_path):
    """Extract keyframes at beat timestamps."""
    print(f"\n[3/5] Extracting keyframes...")
    
    cmd = [
        'python3', 'extract_keyframes.py',
        '--episode', episode,
        '--act', str(act_num),
        '--video', video_path,
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ❌ Keyframe extraction failed")
        return False
    
    print(f"  ✅ Keyframes extracted")
    return True


def assemble(episode, mode, act_paths):
    """Concatenate acts into full episode."""
    print(f"\n[4/5] Assembling full episode...")
    
    cache_dir = get_cache_dir(episode)
    list_file = cache_dir / 'concat_list.txt'
    
    with open(list_file, 'w') as f:
        for p in act_paths:
            f.write(f"file '{p}'\n")
    
    out_path = cache_dir / f'{episode.lower()}_{mode}_full.mp4'
    
    cmd = [
        'ffmpeg', '-y', '-v', 'error',
        '-f', 'concat', '-safe', '0', '-i', str(list_file),
        '-fflags', '+genpts', '-c', 'copy', str(out_path),
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ❌ Assembly failed")
        return None
    
    # Verify duration
    result = subprocess.run([
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0', str(out_path)
    ], capture_output=True, text=True)
    duration = float(result.stdout.strip())
    
    print(f"  ✅ Assembled: {out_path} ({duration:.1f}s)")
    return str(out_path)


def main():
    parser = argparse.ArgumentParser(description='Build Remotion episode')
    parser.add_argument('episode', help='Episode ID (e.g. E2)')
    parser.add_argument('--act', type=int, help='Act number (1-5), omit for all')
    parser.add_argument('--mode', choices=['test', 'prod'], default='test',
                       help='Render mode')
    parser.add_argument('--tts', choices=['meta', 'edge', 'fish'], default='meta',
                       help='TTS provider')
    parser.add_argument('--validate-only', action='store_true',
                       help='Run validators only, no render')
    parser.add_argument('--force', action='store_true',
                       help='Ignore cache, redo everything')
    args = parser.parse_args()
    
    episode = args.episode.upper()
    mode = args.mode
    
    print("=" * 60)
    print(f"Building {episode} — mode={mode}, tts={args.tts}")
    print("=" * 60)
    
    # Step 1: Validators (always run)
    if not run_validators(episode):
        print("\n❌ Validation failed. Fix errors before rendering.")
        return 1
    
    if args.validate_only:
        print("\n✅ Validation passed (validate-only mode)")
        return 0
    
    # Step 2: Timing check
    if not check_timing(episode, args.tts, force=args.force):
        return 1
    
    # Step 3: Render acts
    acts = [args.act] if args.act else list(range(1, 6))
    act_paths = []
    
    for act_num in acts:
        path = render_act(episode, act_num, mode, force=args.force)
        if not path:
            print(f"\n❌ Act {act_num} render failed")
            return 1
        act_paths.append(path)
        
        # Step 4: Keyframes for this act
        if not extract_keyframes(episode, act_num, path):
            return 1
    
    # Step 5: Assemble (if all acts)
    if not args.act:
        full_path = assemble(episode, mode, act_paths)
        if not full_path:
            return 1
        print(f"\n[5/5] Full episode: {full_path}")
    
    print("\n" + "=" * 60)
    print("✅ Build complete")
    print("Next: Review keyframes in keyframes/<episode>/, then Layer 2 validation")
    print("=" * 60)
    return 0


if __name__ == '__main__':
    sys.exit(main())
