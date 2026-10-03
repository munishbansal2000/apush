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
    "video3": ("render_v3", "markup3", [
        ("d0", "d0.mp3"), ("d1", "d1.mp3"), ("d2", "d2.mp3"),
        ("d3", "d3.mp3"), ("d4", "d4.mp3"), ("d5", "d5.mp3"),
        ("d6", "d6.mp3"), ("d7", "d7.mp3"), ("d8", "d8.mp3"),
    ]),
    "video5": ("render_v5", "markup5", [
        ("v5a", "v5a.mp3"), ("v5b", "v5b.mp3"), ("v5c", "v5c.mp3"),
        ("v5d", "v5d.mp3"), ("v5e", "v5e.mp3"), ("v5f", "v5f.mp3"),
    ]),
    "video4": ("render_v4", "markup4", [
        ("v4_00a", "v4_00a.mp3"), ("v4_00b", "v4_00b.mp3"),
        ("v4_01a", "v4_01a.mp3"), ("v4_01b", "v4_01b.mp3"),
        ("v4_02a", "v4_02a.mp3"), ("v4_02b", "v4_02b.mp3"),
        ("v4_03a", "v4_03a.mp3"), ("v4_03b", "v4_03b.mp3"),
        ("v4_03c", "v4_03c.mp3"), ("v4_03d", "v4_03d.mp3"),
        ("v4_04a", "v4_04a.mp3"), ("v4_04b", "v4_04b.mp3"),
        ("v4_04c", "v4_04c.mp3"), ("v4_04d", "v4_04d.mp3"),
        ("v4_05a", "v4_05a.mp3"), ("v4_05b", "v4_05b.mp3"),
        ("v4_05c", "v4_05c.mp3"),
    ]),
}

def _load_manifests():
    """Workers drop video/manifests/<name>.json; each is merged into VIDEOS.
    This keeps parallel builders from ever editing this file."""
    import glob as _glob
    found = {}
    for path in sorted(_glob.glob(os.path.join(HERE, "manifests", "*.json"))):
        with open(path) as f:
            m = json.load(f)
        plan = [(s, ({"mp3": p["mp3"], "share": p["share"]} if isinstance(p, dict) else p))
                for s, p in m["plan"]]
        found[m["name"]] = (m["module"], m["stage_dir"], plan)
        DEFAULT_OUT[m["name"]] = m["out"]
    return found


DEFAULT_OUT = {"video1": "dbq-graded-4of7.mp4", "video2": "dbq-7of7.mp4",
               "video3": "dbq-graded-2025.mp4",
               "video4": "leq-graded-2025.mp4",
               "video5": "saq-graded-2025.mp4"}
VIDEOS.update(_load_manifests())


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd[:3])} failed:\n{r.stderr[-1500:]}")


def mp3_duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip())


def write_clip_frames(clip, path, fps=30):
    """Render a moviepy VideoClip to MP4 by piping raw frames to ffmpeg.

    (No imageio dependency; uses the ffmpeg already required on PATH.)
    Frame size comes from the clip (motion.W/H), so --preview just works.
    """
    import numpy as np
    sys.path.insert(0, HERE)
    import motion as _motion
    w, h = clip.size if hasattr(clip, "size") else (_motion.W, _motion.H)
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
           "-pix_fmt", "yuv420p", path]
    n = max(1, int(round(clip.duration * fps)))
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    try:
        for i, frame in enumerate(clip.iter_frames(fps=fps, dtype="uint8")):
            if i >= n:
                break
            proc.stdin.write(np.ascontiguousarray(frame).tobytes())
        proc.stdin.close()
        proc.wait(timeout=180)
    except Exception:
        # never hang on a sick ffmpeg: kill it instead of waiting forever
        # (a frame-compute crash used to leave a zombie ffmpeg + hung wait)
        proc.kill()
        proc.wait()
        raise
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg segment encode failed for {path}")


def measure_plan(plan, audio_dir):
    """[(stage, seconds)] from the narration MP3s; plus ordered audio files."""
    stage_durs, audio_files, seen = [], [], []
    for stage_name, spec in plan:
        if isinstance(spec, dict):
            mp3 = os.path.join(audio_dir, spec["mp3"])
            dur = mp3_duration(mp3) / spec["share"]
        else:
            mp3 = os.path.join(audio_dir, spec)
            dur = mp3_duration(mp3)
        if mp3 not in seen:
            seen.append(mp3)
            audio_files.append(mp3)
        stage_durs.append((stage_name, dur))
    return stage_durs, audio_files


def mux_segments(segs, audio_files, out):
    """Concat MP4 segments, mux the concatenated narration, write out."""
    tmp = os.path.dirname(segs[0])
    with open(os.path.join(tmp, "segs.txt"), "w") as f:
        for s in segs:
            f.write(f"file '{s}'\n")
    silent = os.path.join(tmp, "silent.mp4")
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
         "-i", os.path.join(tmp, "segs.txt"), "-c", "copy", silent])
    n = len(audio_files)
    fc = "".join(f"[{i}:a]" for i in range(n)) + f"concat=n={n}:v=0:a=1[out]"
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for a in audio_files:
        cmd += ["-i", a]
    narration = os.path.join(tmp, "narration.m4a")
    run(cmd + ["-filter_complex", fc, "-map", "[out]", "-c:a", "aac",
               "-b:a", "160k", narration])
    run(["ffmpeg", "-y", "-v", "error", "-i", silent, "-i", narration,
         "-c", "copy", "-shortest", out])


def build_animated(mod, stage_durs, audio_files, out, fps=30):
    """Render each stage's BUILDERS[name](dur) clip to an MP4 segment."""
    tmp = tempfile.mkdtemp(prefix="apushvid_")
    segs = []
    for stage_name, dur in stage_durs:
        builder = mod.BUILDERS[stage_name]
        clip = builder(dur)
        seg = os.path.join(tmp, f"{stage_name}.mp4")
        write_clip_frames(clip, seg, fps=fps)
        segs.append(seg)
        print(f"      segment {stage_name}: {dur:.1f}s")
    mux_segments(segs, audio_files, out)
    shutil.rmtree(tmp, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video", choices=VIDEOS)
    ap.add_argument("--out", default=None)
    ap.add_argument("--preview", action="store_true",
                    help="preview render at 720x1280 (fast motion-approval "
                         "pass); default is full-res 1080x1920")
    args = ap.parse_args()
    if args.preview:
        sys.path.insert(0, HERE)
        import motion
        motion.set_scale(2 / 3)  # 720x1280; layout math scales proportionally
        print("preview mode: rendering at 720x1280")

    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            sys.exit(f"error: {tool} not found on PATH")

    mod_name, stage_dir, plan = VIDEOS[args.video]
    out = args.out or os.path.join(HERE, DEFAULT_OUT[args.video])
    audio_dir = os.path.join(HERE, "audio", args.video)

    sys.path.insert(0, HERE)
    mod = importlib.import_module(mod_name)
    # Modules exposing BUILDERS take the animated path: real motion segments
    # rendered from BUILDERS[name](dur). Others keep the legacy PNG loop.
    animated = hasattr(mod, "BUILDERS")

    # 1. markup PNGs (the static record; cheap, always generated)
    print(f"[1/4] rendering {len(mod.STAGES)} markup stages...")
    os.makedirs(os.path.join(HERE, stage_dir), exist_ok=True)
    for name in sorted(mod.STAGES):
        mod.STAGES[name]().save(os.path.join(HERE, stage_dir, f"{name}.png"))

    # 2. measure narration -> per-stage durations
    print("[2/4] measuring narration...")
    stage_durs, audio_files = measure_plan(plan, audio_dir)
    total = sum(d for _, d in stage_durs)
    print(f"      total {total:.1f}s across {len(stage_durs)} stages")

    if animated:
        # 3+4. animated segments, then concat + mux inside build_animated
        print("[3/4] rendering animated segments...")
        build_animated(mod, stage_durs, audio_files, out)
        print("[4/4] mixing narration and muxing... done inside build_animated")
    else:
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
        mux_segments(segs, audio_files, out)
        shutil.rmtree(tmp, ignore_errors=True)

    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size",
                        "-of", "json", out], capture_output=True, text=True)
    info = json.loads(r.stdout)["format"]
    print(f"done: {out}  ({float(info['duration']):.1f}s, {int(info['size'])/1e6:.1f} MB)")

if __name__ == "__main__":
    main()
