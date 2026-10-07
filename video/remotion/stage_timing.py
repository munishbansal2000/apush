#!/usr/bin/env python3
"""
stage_timing.py — Stage 2: Build timing.json from TTS MP3s via Vosk.

Usage:
  python3 stage_timing.py --episode E2 --provider meta

Input:  episodes/<id>/tts/<provider>/turn_*.mp3
Output: src/data/<id>/timing_map.json
        src/data/<id>/word_times.json

Skips Vosk if MP3s haven't changed (hash-based cache).
"""

import argparse
import hashlib
import json
import subprocess
from pathlib import Path


def file_hash(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()[:12]


def get_cache():
    d = Path('.timing_cache')
    d.mkdir(exist_ok=True)
    return d


def run_vosk(mp3_path, model_path='/opt/vosk-model'):
    """Run Vosk on MP3, return word timings."""
    # Convert MP3 to WAV 16kHz mono (Vosk requirement)
    wav_path = mp3_path.with_suffix('.wav')
    subprocess.run([
        'ffmpeg', '-y', '-v', 'error',
        '-i', str(mp3_path),
        '-ar', '16000', '-ac', '1',
        str(wav_path)
    ], check=True)
    
    # Run Vosk
    cmd = [
        'python3', '-m', 'vosk',
        '--model', model_path,
        str(wav_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Parse output (JSON lines)
    words = []
    for line in result.stdout.strip().split('\n'):
        try:
            data = json.loads(line)
            if 'result' in data:
                words.extend(data['result'])
        except:
            pass
    
    wav_path.unlink()  # cleanup
    return words


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', required=True)
    parser.add_argument('--provider', default='meta')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()

    episode = args.episode.upper()
    provider = args.provider
    
    tts_dir = Path(f'episodes/{episode.lower()}/tts/{provider}')
    if not tts_dir.exists():
        print(f"ERROR: No TTS output at {tts_dir}")
        print(f"Run: python3 stage_tts.py --episode {episode} --provider {provider}")
        return 1

    mp3s = sorted(tts_dir.glob('turn_*.mp3'))
    print(f"Found {len(mp3s)} turns")

    # Check cache
    cache = get_cache()
    combined_hash = ''.join(file_hash(p) for p in mp3s)
    cache_key = cache / f'{episode}_{provider}_{combined_hash}.json'
    
    out_dir = Path(f'src/data/{episode.lower()}')
    out_dir.mkdir(parents=True, exist_ok=True)
    
    timing_path = out_dir / 'timing_map.json'
    words_path = out_dir / 'word_times.json'
    
    if cache_key.exists() and not args.force:
        print(f"Using cached timing (MP3s unchanged)")
        cached = json.loads(cache_key.read_text())
        timing_path.write_text(json.dumps(cached['timing'], indent=1))
        words_path.write_text(json.dumps(cached['words'], indent=1))
        print(f"✅ Timing: {timing_path}")
        return 0

    # Build timing
    print("Running Vosk alignment...")
    timing = {'starts': [], 'ends': [], 'durations': []}
    all_words = []
    
    current_time = 0.0
    for i, mp3 in enumerate(mp3s):
        print(f"  [{i}] {mp3.name}...")
        words = run_vosk(mp3)
        
        # Get duration
        result = subprocess.run([
            'ffprobe', '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'csv=p=0', str(mp3)
        ], capture_output=True, text=True)
        duration = float(result.stdout.strip())
        
        timing['starts'].append(current_time)
        timing['durations'].append(duration)
        timing['ends'].append(current_time + duration)
        
        # Offset word times
        for w in words:
            w['start'] += current_time
            w['end'] += current_time
            w['turn'] = i
        all_words.extend(words)
        
        current_time += duration
    
    # Save
    timing_path.write_text(json.dumps(timing, indent=1))
    words_path.write_text(json.dumps(all_words, indent=1))
    cache_key.write_text(json.dumps({'timing': timing, 'words': all_words}))
    
    total = timing['ends'][-1] if timing['ends'] else 0
    print(f"\n✅ Timing: {total:.1f}s across {len(mp3s)} turns")
    print(f"   {timing_path}")
    print(f"   {words_path}")
    return 0


if __name__ == '__main__':
    import sys
    sys.exit(main())
