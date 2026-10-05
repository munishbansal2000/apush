#!/usr/bin/env python3
"""mix_music_demo.py — build two music-integration demo mixes from pack-v1.

Demo 1 (podcast): P1 intro sting + P2 chapter sting + P6 trial bed under a real
    interview-format excerpt, P5 outro to close.
Demo 2 (APUSH video): A1 cold open + A2 intro theme + A4 transition + C2 era bed
    under short narration, A3 outro to close.

Gains follow AUDIO-IDENTITY-SPEC.md: stings 0.16-0.18 (~14 dB under dialogue),
trial beds 0.08 (~-22 dB). All fades keep the music felt, not noticed.

Usage: python3 mix_music_demo.py
Outputs: video_pipeline/music/demos/podcast_music_demo.mp3
         video_pipeline/music/demos/apush_video_music_demo.mp3
"""
import json
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK = os.path.join(REPO, "music", "pack-v1")
DEMOS = os.path.join(REPO, "music", "demos")
INTERVIEW = os.path.join(REPO, "examples", "audio-formats", "interview",
                         "u3-l3-INTERVIEW-full.mp3")


def dur(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def run_ffmpeg(inputs, filt, out):
    cmd = ["ffmpeg", "-y"]
    for i in inputs:
        cmd += ["-i", i]
    cmd += ["-filter_complex", filt, "-map", "[out]", "-c:a", "libmp3lame",
            "-b:a", "192k", out]
    subprocess.run(cmd, check=True, capture_output=True)
    return out


def demo_podcast():
    """P1/P2/P6/P5 over a 68s interview excerpt."""
    p1 = os.path.join(PACK, "podcast_P1_intro_sting_v1.wav")
    p2 = os.path.join(PACK, "podcast_P2_chapter_sting_v1.wav")
    p6 = os.path.join(PACK, "podcast_P6_bed_warm_neutral_loop_v1.mp3")
    p5 = os.path.join(PACK, "podcast_P5_outro_sting_v1.wav")
    filt = (
        "[0:a]atrim=0:68,asetpts=PTS-STARTPTS[dlg];"
        "[1:a]volume=0.18,afade=t=out:st=1.8:d=0.8[p1];"
        "[2:a]adelay=30000|30000,volume=0.16[p2];"
        "[3:a]atrim=0:33,asetpts=PTS-STARTPTS,volume=0.08,"
        "afade=t=in:st=0:d=3,afade=t=out:st=30:d=3,adelay=35000|35000[bed];"
        "[4:a]adelay=68000|68000,volume=0.16[p5];"
        "[dlg][p1][p2][bed][p5]amix=inputs=5:normalize=0,"
        "alimiter=limit=0.95[out]"
    )
    out = os.path.join(DEMOS, "podcast_music_demo.mp3")
    return run_ffmpeg([INTERVIEW, p1, p2, p6, p5], filt, out)


def demo_apush_video(line1, line2):
    """A1/A2/A4/C2/A3 around two narration lines; timeline from TTS durations."""
    d1, d2 = dur(line1), dur(line2)
    a1 = os.path.join(PACK, "apush_A1_cold_open_stinger_v1.wav")
    a2 = os.path.join(PACK, "apush_A2_intro_theme_v1.wav")
    a4 = os.path.join(PACK, "apush_A4_transition_sting_v1.wav")
    c2 = os.path.join(PACK, "apush_C2_revolution_loop_v1.mp3")
    a3 = os.path.join(PACK, "apush_A3_outro_theme_v1.wav")

    l1_start = 4.0
    l1_end = l1_start + d1
    a4_start = l1_end + 1.0
    l2_start = a4_start + 3.5
    l2_end = l2_start + d2
    bed_start = l2_start - 1.0
    bed_len = (l2_end - l2_start) + 6.0
    a3_start = l2_end + 1.0

    ms = lambda s: int(round(s * 1000))
    filt = (
        f"[0:a]adelay={ms(l1_start)}|{ms(l1_start)}[l1];"
        f"[1:a]adelay={ms(l2_start)}|{ms(l2_start)}[l2];"
        "[2:a]volume=0.3[a1];"
        "[3:a]volume=0.16,afade=t=out:st=0.5:d=2.5,adelay=3500|3500[a2];"
        f"[4:a]adelay={ms(a4_start)}|{ms(a4_start)},volume=0.14[a4];"
        f"[5:a]atrim=0:{bed_len:.1f},asetpts=PTS-STARTPTS,volume=0.07,"
        f"afade=t=in:st=0:d=2,afade=t=out:st={bed_len - 3:.1f}:d=3,"
        f"adelay={ms(bed_start)}|{ms(bed_start)}[bed];"
        f"[6:a]afade=t=out:st=8:d=3,adelay={ms(a3_start)}|{ms(a3_start)},volume=0.16[a3];"
        "[l1][l2][a1][a2][a4][bed][a3]amix=inputs=7:normalize=0,"
        "alimiter=limit=0.95[out]"
    )
    out = os.path.join(DEMOS, "apush_video_music_demo.mp3")
    return run_ffmpeg([line1, line2, a1, a2, a4, c2, a3], filt, out)


def main():
    os.makedirs(DEMOS, exist_ok=True)
    need = ["podcast_P1_intro_sting_v1.wav", "podcast_P2_chapter_sting_v1.wav",
            "podcast_P6_bed_warm_neutral_loop_v1.mp3",
            "podcast_P5_outro_sting_v1.wav", "apush_A1_cold_open_stinger_v1.wav",
            "apush_A2_intro_theme_v1.wav", "apush_A4_transition_sting_v1.wav",
            "apush_C2_revolution_loop_v1.mp3", "apush_A3_outro_theme_v1.wav"]
    missing = [f for f in need if not os.path.isfile(os.path.join(PACK, f))]
    if missing:
        sys.exit("missing pack files: " + ", ".join(missing))
    line1 = sys.argv[1] if len(sys.argv) > 1 else "/tmp/apush_demo_line1.mp3"
    line2 = sys.argv[2] if len(sys.argv) > 2 else "/tmp/apush_demo_line2.mp3"

    o1 = demo_podcast()
    print("demo1:", o1, round(dur(o1), 1), "s")
    o2 = demo_apush_video(line1, line2)
    print("demo2:", o2, round(dur(o2), 1), "s")


if __name__ == "__main__":
    main()
