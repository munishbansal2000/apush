#!/usr/bin/env python3
"""End-to-end APUSH grading-video builder.

Renders the animated markup stages, times each stage to its narration MP3,
and assembles the final MP4. The narration MP3s are committed in audio/,
so rebuilding needs no TTS step.

Needs: Python 3, Pillow (pip install pillow), ffmpeg on PATH.

Usage:
    python build_video.py video1          # "We Graded This DBQ" (4/7)
    python build_video.py video2          # "From 4/7 to 7/7" (sequel)
    python build_video.py video1 --out myvideo.mp4
"""
import argparse, importlib, json, os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))

# video -> (renderer module, output dir, list of (stage, audio_file or {audio: share}))
# A plain string means the stage owns that MP3. A dict {"mp3": x, "share": n}
# means n stages split that MP3's duration equally.
VIDEOS = {
    "video1": ("render_markup", "markup", [
        ("s0a", "s0a.mp3"), ("s0b", "s0b.mp3"), ("s0c", "s0c.mp3"), ("s0d", "s0d.mp3"),
        ("s1a", "s1.mp3"),
        ("s2a", {"mp3": "s2.mp3", "share": 3}), ("s2b", {"mp3": "s2.mp3", "share": 3}),
        ("s2c", {"mp3": "s2.mp3", "share": 3}),
        ("s3a", {"mp3": "s3.mp3", "share": 3}), ("s3b", {"mp3": "s3.mp3", "share": 3}),
        ("s3c", {"mp3": "s3.mp3", "share": 3}),
        ("s4a", {"mp3": "s4.mp3", "share": 3}), ("s4b", {"mp3": "s4.mp3", "share": 3}),
        ("s4c", {"mp3": "s4.mp3", "share": 3}),
        ("s5a", {"mp3": "s5.mp3", "share": 4}), ("s5b", {"mp3": "s5.mp3", "share": 4}),
        ("s5c", {"mp3": "s5.mp3", "share": 4}), ("s5d", {"mp3": "s5.mp3", "share": 4}),
        ("s6a", {"mp3": "s6.mp3", "share": 4}), ("s6b", {"mp3": "s6.mp3", "share": 4}),
        ("s6c", {"mp3": "s6.mp3", "share": 4}), ("s6d", {"mp3": "s6.mp3", "share": 4}),
        ("s7a", {"mp3": "s7.mp3", "share": 3}), ("s7b", {"mp3": "s7.mp3", "share": 3}),
        ("s7c", {"mp3": "s7.mp3", "share": 3}),
    ]),
    "video2": ("render_v2", "markup2", [
        ("w0", "v2_w0.mp3"), ("w1", "v2_w1.mp3"),
        ("w2a", "v2_w2a.mp3"), ("w2b", "v2_w2b.mp3"),
        ("w3", "v2_w3.mp3"), ("w4", "v2_w4.mp3"),
        ("w5", "v2_w5.mp3"), ("w6", "v2_w6.mp3"),
        ("w7a", "v2_w7a.mp3"), ("w7b", "v2_w7b.mp3"),
    ]),
}

DEFAULT_OUT = {"video1": "dbq-graded-4of7.mp4", "video2": "dbq-7of7.mp4"}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd[:3])} failed:\n{r.stderr[-1500:]}")


def mp3_duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video", choices=VIDEOS)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            sys.exit(f"error: {tool} not found on PATH")

    mod_name, stage_dir, plan = VIDEOS[args.video]
    out = args.out or os.path.join(HERE, DEFAULT_OUT[args.video])
    audio_dir = os.path.join(HERE, "audio", args.video)

    sys.path.insert(0, HERE)
    mod = importlib.import_module(mod_name)

    # 1. render stages
    print(f"[1/4] rendering {len(mod.STAGES)} stages...")
    os.makedirs(os.path.join(HERE, stage_dir), exist_ok=True)
    for name in sorted(mod.STAGES):
        mod.STAGES[name]().save(os.path.join(HERE, stage_dir, f"{name}.png"))

    # 2. measure narration -> per-stage durations
    print("[2/4] measuring narration...")
    stage_durs, audio_files = [], []
    seen_audio = []
    for stage_name, spec in plan:
        if isinstance(spec, dict):
            mp3 = os.path.join(audio_dir, spec["mp3"])
            dur = mp3_duration(mp3) / spec["share"]
        else:
            mp3 = os.path.join(audio_dir, spec)
            dur = mp3_duration(mp3)
        if mp3 not in seen_audio:
            seen_audio.append(mp3)
            audio_files.append(mp3)
        stage_durs.append((stage_name, dur))
    total = sum(d for _, d in stage_durs)
    print(f"      total {total:.1f}s across {len(stage_durs)} stages")

    # 3. per-stage segments (exact durations) -> concat
    print("[3/4] encoding segments...")
    tmp = tempfile.mkdtemp(prefix="apushvid_")
    segs = []
    for stage_name, dur in stage_durs:
        seg = os.path.join(tmp, f"{stage_name}.mp4")
        run(["ffmpeg", "-y", "-v", "error", "-loop", "1",
             "-i", os.path.join(HERE, stage_dir, f"{stage_name}.png"),
             "-vf", "fps=30,format=yuv420p", "-t", f"{dur:.3f}",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", seg])
        segs.append(seg)
    with open(os.path.join(tmp, "segs.txt"), "w") as f:
        for s in segs:
            f.write(f"file '{s}'\n")
    silent = os.path.join(tmp, "silent.mp4")
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
         "-i", os.path.join(tmp, "segs.txt"), "-c", "copy", silent])

    # 4. join narration, mux
    print("[4/4] mixing narration and muxing...")
    n = len(audio_files)
    fc = "".join(f"[{i}:a]" for i in range(n)) + f"concat=n={n}:v=0:a=1[out]"
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for a in audio_files:
        cmd += ["-i", a]
    narration = os.path.join(tmp, "narration.m4a")
    run(cmd + ["-filter_complex", fc, "-map", "[out]", "-c:a", "aac", "-b:a", "160k", narration])
    run(["ffmpeg", "-y", "-v", "error", "-i", silent, "-i", narration,
         "-c", "copy", "-shortest", out])

    shutil.rmtree(tmp, ignore_errors=True)
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size",
                        "-of", "json", out], capture_output=True, text=True)
    info = json.loads(r.stdout)["format"]
    print(f"done: {out}  ({float(info['duration']):.1f}s, {int(info['size'])/1e6:.1f} MB)")


if __name__ == "__main__":
    main()
