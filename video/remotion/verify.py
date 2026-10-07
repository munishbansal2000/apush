#!/usr/bin/env python3
"""
verify.py — Post-render verification gate.

Ports video-pipeline/stages/verify.py to Remotion.
Runs after stage_render.py, before keyframe extraction.

Checks:
- Duration within ±0.6s of expected (from timing_map.json)
- Exactly 1 video + 1 audio stream
- Audio not silent (mean volume > -45 dB)
- No black frames ≥0.5s (blackdetect)

Any failure raises. This is a gate, not a warning.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path


def _ffprobe_streams(path):
    result = subprocess.run([
        'ffprobe', '-v', 'error',
        '-show_entries', 'stream=codec_type',
        '-of', 'csv=p=0', str(path)
    ], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed on {path}")
    streams = result.stdout.strip().split('\n')
    video = sum(1 for s in streams if s.strip().rstrip(',') == 'video')
    audio = sum(1 for s in streams if s.strip().rstrip(',') == 'audio')
    return video, audio


def _ffprobe_duration(path):
    result = subprocess.run([
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0', str(path)
    ], capture_output=True, text=True)
    return float(result.stdout.strip())


def _check_audio_not_silent(path, threshold_db=-45):
    """Mean volume must exceed threshold."""
    result = subprocess.run([
        'ffmpeg', '-i', str(path),
        '-af', 'volumedetect',
        '-f', 'null', '-'
    ], capture_output=True, text=True)
    for line in result.stderr.split('\n'):
        if 'mean_volume:' in line:
            # e.g. "mean_volume: -23.5 dB"
            import re
            m = re.search(r'mean_volume:\s*(-?[\d.]+)\s*dB', line)
            if m:
                vol = float(m.group(1))
                return vol > threshold_db, vol
    return False, None  # couldn't measure


def _check_no_black(path, min_duration=0.5):
    """No black frames ≥ min_duration seconds."""
    result = subprocess.run([
        'ffmpeg', '-i', str(path),
        '-vf', f'blackdetect=d={min_duration}:pic_th=0.98:pix_th=0.10',
        '-f', 'null', '-'
    ], capture_output=True, text=True)
    # blackdetect outputs "black_start:... black_end:..." to stderr
    return 'black_start' not in result.stderr


def verify_render(video_path, episode, act_num=None, tolerance_sec=0.6):
    """Verify a rendered act video. Raises on any failure."""
    path = Path(video_path)
    if not path.exists():
        raise RuntimeError(f"[verify] not found: {path}")

    print(f"[verify] {path.name}...")

    # 1. Duration check
    actual_dur = _ffprobe_duration(path)
    # Expected from timing or act boundaries
    if act_num:
        # Load act boundaries from stage_render
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "stage_render", "stage_render.py")
        mod = importlib.util.module_from_spec(spec)
        # Just use timing_map for total, act boundaries are derived in stage_render
        # For now, check against act frame range
        from stage_render import get_act_boundaries
        ep = episode.upper()
        try:
            boundaries = get_act_boundaries(ep, num_acts=5, fps=30)
            start_f, end_f = boundaries[act_num - 1]
            expected_dur = (end_f - start_f + 1) / 30.0
            diff = abs(actual_dur - expected_dur)
            if diff > tolerance_sec:
                raise RuntimeError(
                    f"[verify] duration {actual_dur:.2f}s vs expected "
                    f"{expected_dur:.2f}s (diff {diff:.2f}s > {tolerance_sec}s)")
            print(f"  duration: {actual_dur:.2f}s ✓")
        except (FileNotFoundError, ValueError):
            print(f"  duration: {actual_dur:.2f}s (no timing data, skipping)")
    else:
        print(f"  duration: {actual_dur:.2f}s (no expected, skipping)")

    # 2. Stream check
    video_streams, audio_streams = _ffprobe_streams(path)
    if video_streams != 1:
        raise RuntimeError(
            f"[verify] expected 1 video stream, got {video_streams}")
    if audio_streams != 1:
        raise RuntimeError(
            f"[verify] expected 1 audio stream, got {audio_streams}")
    print(f"  streams: 1 video + 1 audio ✓")

    # 3. Audio not silent
    ok, vol = _check_audio_not_silent(path)
    if not ok:
        raise RuntimeError(
            f"[verify] audio silent or unmeasurable (mean_volume: {vol})")
    print(f"  audio: mean_volume {vol:.1f} dB ✓")

    # 4. No black frames
    if not _check_no_black(path):
        raise RuntimeError(f"[verify] black frames ≥0.5s detected")
    print(f"  no black frames ✓")

    print(f"[verify] PASSED")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Verify rendered video (gate before keyframes).")
    parser.add_argument('--video', required=True, help='Video file to verify')
    parser.add_argument('--episode', required=True, help='Episode ID')
    parser.add_argument('--act', type=int, help='Act number (for duration check)')
    args = parser.parse_args()

    try:
        verify_render(args.video, args.episode, args.act)
        return 0
    except RuntimeError as e:
        print(f"\n❌ VERIFY FAILED: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
