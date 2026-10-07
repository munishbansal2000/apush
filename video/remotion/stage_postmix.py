#!/usr/bin/env python3
"""
stage_postmix.py — Post-production music mixing for APUSH episodes.

Takes a rendered video (dialogue + visuals, NO music) and mixes in
branded music events from music_timeline.json:
- intro_sting at t=0 (dialogue ducks under tail)
- chapter_sting at each act boundary
- outro_sting over final seconds

Changing music = re-run this script only. NO video re-render needed.

Usage:
  python3 stage_postmix.py --video .build_cache/E3/act1_review_xxx.mp4 --episode E3
  python3 stage_postmix.py --video episode.mp4 --episode E3 --out episode_final.mp4

Output: <video>_final.mp4 (or --out path)
"""

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--video', required=True, help='Rendered video (no music)')
    parser.add_argument('--episode', required=True, help='E3, E4, etc.')
    parser.add_argument('--out', default=None, help='Output path (default: <video>_final.mp4)')
    args = parser.parse_args()

    video_path = Path(args.video)
    if not video_path.exists():
        print(f"ERROR: {video_path} not found", file=sys.stderr)
        return 1

    episode = args.episode.upper()
    ep_lower = episode.lower()

    # Load music timeline
    timeline_path = Path(f'src/data/{ep_lower}/music_timeline.json')
    if not timeline_path.exists():
        print(f"ERROR: {timeline_path} not found. Run stage_music.py first.", file=sys.stderr)
        return 1

    with open(timeline_path) as f:
        timeline = json.load(f)

    if timeline.get('disabled'):
        print("Music disabled — copying video as-is")
        out_path = Path(args.out) if args.out else video_path.with_stem(video_path.stem + '_final')
        import shutil
        shutil.copy(video_path, out_path)
        print(f"✅ {out_path}")
        return 0

    events = timeline['events']
    if not events:
        print("No music events — copying video as-is")
        out_path = Path(args.out) if args.out else video_path.with_stem(video_path.stem + '_final')
        import shutil
        shutil.copy(video_path, out_path)
        return 0

    # Get video duration to filter events (for act segments)
    probe = subprocess.run([
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        str(video_path)
    ], capture_output=True, text=True, check=True)
    video_duration = float(probe.stdout.strip())
    print(f"Video duration: {video_duration:.1f}s")

    # Filter events to those within video duration
    # (for act segments, only mix events that fall in this act)
    events = [e for e in events 
              if e['start_sec'] < video_duration]
    
    if not events:
        print("No music events in this segment — copying video as-is")
        out_path = Path(args.out) if args.out else video_path.with_stem(video_path.stem + '_final')
        import shutil
        shutil.copy(video_path, out_path)
        return 0

    # Get video duration and check if this is a full episode or act segment
    # For act segments, we need to offset music events by the act start time
    # For now, assume full episode. Act-level postmix needs --act-start-sec.
    print(f"Mixing {len(events)} music events into {video_path.name}...")

    # Build ffmpeg filter_complex for music mixing
    # Each music event: adelay to position, volume envelope, then amix with dialogue
    
    # Use workspace temp dir (not /tmp — it's only 512MB tmpfs)
    tmp_base = Path('.build_cache/tmp')
    tmp_base.mkdir(parents=True, exist_ok=True)
    
    with tempfile.TemporaryDirectory(dir=str(tmp_base)) as tmpdir:
        tmpdir = Path(tmpdir)
        
        # Extract dialogue audio from video
        dialogue_wav = tmpdir / "dialogue.wav"
        subprocess.run([
            'ffmpeg', '-y', '-v', 'error',
            '-i', str(video_path),
            '-vn', '-ar', '44100', '-ac', '2',
            str(dialogue_wav)
        ], check=True)

        # Build the music mix
        # For each event: load asset, trim/pad to duration, apply volume, delay to start time
        filter_parts = []
        inputs = ['-i', str(dialogue_wav)]
        input_idx = 1  # 0 is dialogue
        
        mix_inputs = ['[0:a]']
        
        for i, event in enumerate(events):
            asset_path = Path(f"public/{event['src']}")
            if not asset_path.exists():
                print(f"  WARNING: {asset_path} not found, skipping {event['type']}")
                continue
            
            inputs.extend(['-i', str(asset_path)])
            
            start_ms = int(event['start_sec'] * 1000)
            duration_ms = int(event['duration_sec'] * 1000)
            
            # Volume by event type:
            # - stings (intro/chapter/outro): -6dB (0.5 linear), prominent
            # - bed_loop: -20dB (0.1 linear), very low under dialogue
            is_bed = event['type'] == 'bed_loop'
            volume = 0.1 if is_bed else 0.5
            
            # Fade in/out at edges
            fade_ms = min(500, duration_ms // 4)
            
            # Trim to duration, apply volume envelope, delay to start time
            # Note: no apad — we use -shortest to limit to dialogue duration
            filter_parts.append(
                f"[{input_idx}:a]"
                f"atrim=0:{duration_ms/1000:.3f},"
                f"asetpts=PTS-STARTPTS,"
                f"volume={volume}:eval=frame,"
                f"afade=t=in:st=0:d={fade_ms/1000:.3f},"
                f"afade=t=out:st={(duration_ms-fade_ms)/1000:.3f}:d={fade_ms/1000:.3f},"
                f"adelay={start_ms}|{start_ms}"
                f"[m{i}]"
            )
            mix_inputs.append(f"[m{i}]")
            input_idx += 1
            print(f"  {event['type']}: {event['start_sec']:.1f}s ({event['source']})")
        
        if len(mix_inputs) == 1:
            print("  No valid music assets — copying video as-is")
            out_path = Path(args.out) if args.out else video_path.with_stem(video_path.stem + '_final')
            import shutil
            shutil.copy(video_path, out_path)
            return 0
        
        # Mix all inputs
        filter_parts.append(
            f"{''.join(mix_inputs)}"
            f"amix=inputs={len(mix_inputs)}:normalize=0[aout]"
        )
        
        filter_complex = ";".join(filter_parts)
        
        # Mix audio (limit to dialogue duration with -shortest)
        mixed_wav = tmpdir / "mixed.wav"
        cmd = [
            'ffmpeg', '-y', '-v', 'error',
            *inputs,
            '-filter_complex', filter_complex,
            '-map', '[aout]',
            '-ar', '44100', '-ac', '2',
            '-shortest',
            str(mixed_wav)
        ]
        subprocess.run(cmd, check=True)
        
        # Mux mixed audio back with video (copy video stream, no re-encode)
        out_path = Path(args.out) if args.out else video_path.with_stem(video_path.stem + '_final')
        # Ensure .mp4 extension
        if out_path.suffix != '.mp4':
            out_path = out_path.with_suffix('.mp4')
        
        subprocess.run([
            'ffmpeg', '-y', '-v', 'error',
            '-i', str(video_path),
            '-i', str(mixed_wav),
            '-c:v', 'copy',
            '-c:a', 'aac', '-b:a', '192k',
            '-map', '0:v:0', '-map', '1:a:0',
            '-shortest',
            str(out_path)
        ], check=True)
        
        print(f"\n✅ Post-mix complete: {out_path}")
        print(f"   Video: copied (no re-render)")
        print(f"   Audio: dialogue + {len(mix_inputs)-1} music events")
        return 0


if __name__ == '__main__':
    sys.exit(main())
