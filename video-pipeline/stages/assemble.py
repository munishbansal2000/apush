"""Stage: assemble.

Concatenates beat segments in order and muxes the mixed dialogue audio.
Video is stream-copied (all segments are already 1920x1080/30fps/H.264).

run_single() is the slideforge-renderer variant: mux the dialogue audio
over the single compiled video instead of concatenating segments.

Writes: <episode>/<episode>-final.mp4
"""
import os
import subprocess


def sh(cmd, timeout=900):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"FAILED: {r.stderr[-600:]}")


def run(ep_dir, cfg, seg_paths):
    work = os.path.join(ep_dir, "work")
    list_path = os.path.join(work, "concat_list.txt")
    with open(list_path, "w", encoding="utf-8") as f:
        for sp in seg_paths:
            f.write(f"file '{sp}'\n")

    tts_dir = os.path.normpath(os.path.join(ep_dir, cfg["tts_dir"]))
    audio = os.path.join(tts_dir, cfg["audio"])
    if not os.path.exists(audio):
        raise RuntimeError(f"mixed audio not found: {audio}")

    out = os.path.join(ep_dir, f"{cfg['episode']}-final.mp4")
    total = cfg.get("total")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0",
           "-i", list_path, "-i", audio,
           "-c:v", "copy", "-c:a", "aac", "-b:a", "128k"]
    if total:
        cmd += ["-t", str(total)]
    cmd += ["-movflags", "+faststart", out]
    sh(cmd)
    got = float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", out], text=True))
    print(f"assemble: {out} {got:.1f}s", flush=True)
    return out


def run_single(ep_dir, cfg, video_path):
    """Slideforge path: mux the mixed dialogue audio over one video."""
    tts_dir = os.path.normpath(os.path.join(ep_dir, cfg["tts_dir"]))
    audio = os.path.join(tts_dir, cfg["audio"])
    if not os.path.exists(audio):
        raise RuntimeError(f"mixed audio not found: {audio}")
    if not os.path.exists(video_path):
        raise RuntimeError(f"video not found: {video_path}")

    out = os.path.join(ep_dir, f"{cfg['episode']}-final.mp4")
    total = cfg.get("total")
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", video_path, "-i", audio,
           "-c:v", "copy", "-c:a", "aac", "-b:a", "128k"]
    if total:
        cmd += ["-t", str(total)]
    cmd += ["-movflags", "+faststart", out]
    sh(cmd)
    got = float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", out], text=True))
    print(f"assemble: {out} {got:.1f}s", flush=True)
    return out
