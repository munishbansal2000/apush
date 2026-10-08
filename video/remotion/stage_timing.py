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
import re
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


_VOSK_MODEL_CACHE = {}

def _resolve_vosk_model(model_path):
    """Return a loaded vosk Model, with fallback to workspace model dirs."""
    import os
    if model_path in _VOSK_MODEL_CACHE:
        return _VOSK_MODEL_CACHE[model_path]
    from vosk import Model
    candidates = [model_path,
                  os.path.expanduser('~/workspace/vosk-model-small-en-us-0.15'),
                  os.path.expanduser('~/workspace/video-pipeline/models/vosk-model-small-en-us-0.15')]
    chosen = next((c for c in candidates if os.path.isdir(c)), None)
    if not chosen:
        raise RuntimeError(f"No Vosk model found (tried {candidates})")
    print(f"  Using Vosk model: {chosen}", flush=True)
    model = Model(chosen)
    _VOSK_MODEL_CACHE[model_path] = model
    return model


def run_vosk(mp3_path, model_path='/opt/vosk-model'):
    """Run Vosk on MP3, return word timings (via the vosk Python API)."""
    # Convert MP3 to WAV 16kHz mono (Vosk requirement)
    wav_path = mp3_path.with_suffix('.wav')
    subprocess.run([
        'ffmpeg', '-y', '-v', 'error',
        '-i', str(mp3_path),
        '-ar', '16000', '-ac', '1',
        str(wav_path)
    ], check=True)

    import json as _json
    import wave
    from vosk import KaldiRecognizer

    model = _resolve_vosk_model(model_path)
    rec = KaldiRecognizer(model, 16000)
    rec.SetWords(True)

    words = []
    try:
        wf = wave.open(str(wav_path), 'rb')
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if rec.AcceptWaveform(data):
                res = _json.loads(rec.Result())
                words.extend(res.get('result', []))
        res = _json.loads(rec.FinalResult())
        words.extend(res.get('result', []))
        wf.close()
    finally:
        wav_path.unlink(missing_ok=True)  # cleanup
    return words


def get_speech_onset(mp3_path):
    """Measure first non-silent instant via ffmpeg silencedetect.
    
    Returns seconds of leading silence. Visuals should key off
    voice-start (onset), not file-start, or they appear early.
    (Ports legacy video-pipeline/stages/timing.py onset detection.)
    """
    result = subprocess.run([
        'ffmpeg', '-i', str(mp3_path),
        '-af', 'silencedetect=noise=-30dB:d=0.1',
        '-f', 'null', '-'
    ], capture_output=True, text=True)
    for line in result.stderr.split('\n'):
        if 'silence_end:' in line:
            # First silence_end is the onset (end of leading silence)
            m = re.search(r'silence_end:\s*([\d.]+)', line)
            if m:
                return float(m.group(1))
    return 0.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', required=True, help='Episode ID (e.g. E2 or U2E3)')
    parser.add_argument('--provider', default='meta')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()

    episode = args.episode.upper()
    provider = args.provider
    
    # Parse U2E3 format -> data_id u2e3 (Unit 2), E3 -> e3 (Unit 1)
    import re
    m = re.match(r'U(\d+)E(\d+)', episode)
    if m:
        data_id = f'u{m.group(1)}e{m.group(2)}'
    else:
        data_id = episode.lower()
    
    base = Path(__file__).parent
    tts_dir = base / f'episodes/{data_id}/tts/{provider}'
    if not tts_dir.exists():
        print(f"ERROR: No TTS output at {tts_dir}")
        print(f"Run: python3 stage_tts.py --episode {episode} --provider {provider}")
        return 1

    mp3s = sorted(tts_dir.glob('turn_*.mp3'))
    print(f"Found {len(mp3s)} turns")

    # Check cache (use short hash of combined hashes)
    cache = get_cache()
    combined = ''.join(file_hash(p) for p in mp3s)
    short_hash = hashlib.sha256(combined.encode()).hexdigest()[:12]
    cache_key = cache / f'{data_id}_{provider}_{short_hash}.json'
    
    out_dir = base / f'src/data/{data_id}'
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
    timing = {'starts': [], 'ends': [], 'durations': [], 'onsets': []}
    all_words = []
    
    current_time = 0.0
    for i, mp3 in enumerate(mp3s):
        print(f"  [{i}] {mp3.name}...")
        words = run_vosk(mp3)
        
        # Measure speech onset (leading silence)
        onset = get_speech_onset(mp3)
        if onset > 0.05:
            print(f"      onset: {onset:.2f}s leading silence")
        
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
        timing['onsets'].append(onset)
        
        # Offset word times (Vosk times are relative to file start;
        # onset is stored separately for visual anchoring)
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
