#!/usr/bin/env python3
"""Conform a video clip to an exact frame count at 30fps.

Item 4 of the resilience plan. LTX (and similar) generators hand you
5s/6s/8s clips; scenes are 22.8s. This tool makes the clip fit exactly:

- fewer frames than target: seamless loop. Each loop joint gets a 6-frame
  (0.2s) crossfade so the cut doesn't pop.
- more frames than target: trim from the middle (keeps the stable start
  and the settled end).
- equal: straight CFR conversion.

Everything is forced to constant frame rate 30fps, yuv420p, 1920x1080
(center-crop fill). The output is verified to contain exactly `frames`
frames; any mismatch raises.

Usage:
    python conform_clip.py <src> <frames> <out> [--fps 30]

Then point the scene plan's vidslide `src` at the conformed file and set
the scene's duration_sec from the conformed length (frames / fps).
"""
import json
import subprocess
import sys


def sh(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"FAILED {' '.join(cmd[:4])}: {r.stderr[-600:]}")
    return r


def probe_frames(path):
    j = json.loads(sh(["ffprobe", "-v", "error", "-select_streams", "v:0",
                       "-show_entries",
                       "stream=nb_frames,avg_frame_rate,r_frame_rate",
                       "-of", "json", path]).stdout)["streams"][0]
    nb = j.get("nb_frames")
    if nb and nb != "N/A":
        n = int(nb)
    else:
        out = sh(["ffprobe", "-v", "error", "-select_streams", "v:0",
                  "-show_entries", "packet=pts", "-of", "csv=p=0",
                  path]).stdout.strip()
        n = len([l for l in out.splitlines() if l.strip()])
    fps_txt = j.get("avg_frame_rate") or j.get("r_frame_rate") or "30/1"
    num, den = fps_txt.split("/")
    return n, float(num) / float(den)


CFR = ("fps=30,scale=1920:1080:force_original_aspect_ratio=increase,"
       "crop=1920:1080,format=yuv420p")


def conform(src, frames, out, fps=30):
    if fps != 30:
        raise ValueError("only 30fps is supported (pipeline frame lock)")
    n, _ = probe_frames(src)
    print(f"conform: {src} has {n} frames, target {frames}", flush=True)

    if n == frames:
        vf = CFR
        extra = []
    elif n > frames:
        # Trim from the middle: keep the stable start and the settled end.
        # Seek to the middle offset, then take exactly `frames`.
        start = (n - frames) / 2.0 / 30.0
        vf = CFR
        extra = ["-ss", f"{start:.3f}"]
        print(f"conform: trimming {n - frames} frames from the middle",
              flush=True)
    else:
        # Seamless loop: chain xfades, 6 frames (0.2s) each, then trim.
        # Each xfade of two L-frame copies yields 2L-6 frames; chaining k
        # xfades yields (k+1)*L - 6k frames.
        per = n - 6
        copies = (frames + per - 1) // per + 1  # +1 safety margin
        splits = "".join(f"[s{i}]" for i in range(copies))
        filt = f"[0:v]split={copies}{splits};"
        prev = "[s0]"
        for k in range(1, copies):
            # k-th fade starts 6 frames before the chain's current end:
            # chain so far is k*L - 6*(k-1) frames; fade covers its tail.
            off = k * per / 30.0
            filt += (f"{prev}[s{k}]xfade=transition=fade:duration=0.2:"
                     f"offset={off:.4f}[x{k}];")
            prev = f"[x{k}]"
        filt += (f"{prev}trim=end_frame={copies * n - 6 * (copies - 1)},"
                 f"setpts=PTS-STARTPTS,{CFR}[v]")
        vf = None  # filter_complex path below
        extra = ["-filter_complex", filt, "-map", "[v]"]
        print(f"conform: looping {copies}x with 6f crossfades", flush=True)

    cmd = ["ffmpeg", "-y", "-v", "error", "-i", src]
    if vf is not None:
        cmd += ["-vf", vf]
    cmd += extra + ["-an", "-r", "30", "-c:v", "libx264", "-preset", "medium",
                    "-crf", "18", "-pix_fmt", "yuv420p",
                    "-frames:v", str(frames), out]
    sh(cmd)

    got, _ = probe_frames(out)
    if got != frames:
        raise RuntimeError(
            f"conform failed: {out} has {got} frames, expected {frames}")
    print(f"conform: wrote {out} ({frames} frames @30fps)", flush=True)
    return out


def main(argv):
    if len(argv) != 3:
        sys.exit("usage: conform_clip.py <src> <frames> <out>")
    src, frames, out = argv[0], int(argv[1]), argv[2]
    conform(src, frames, out)


if __name__ == "__main__":
    main(sys.argv[1:])
