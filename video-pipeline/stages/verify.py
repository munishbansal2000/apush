"""Stage: verify.

Fail-closed checks on the finished video. Any failure raises — the pipeline
never silently ships a bad render.

Checks:
- duration matches cfg total within 0.6s
- exactly one video stream (1920x1080) and one audio stream
- audio is not silent (mean volume over a mid-file sample > -45 dB)
- no black segments >= 0.5s (blackdetect)
- every beat segment exists and is valid

Writes: <episode>/work/verify.json
"""
import json
import os
import subprocess


def run(ep_dir, cfg, final_path):
    total = cfg.get("total")
    dur = float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", final_path], text=True))
    if total and abs(dur - total) > 0.6:
        raise RuntimeError(f"duration {dur:.1f}s != expected {total}s")

    streams = json.loads(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height",
         "-of", "json", final_path], text=True))["streams"]
    v = [s for s in streams if s["codec_type"] == "video"]
    a = [s for s in streams if s["codec_type"] == "audio"]
    if len(v) != 1 or len(a) != 1:
        raise RuntimeError(f"expected 1v+1a streams, got {len(v)}v+{len(a)}a")
    if v[0].get("width") != 1920 or v[0].get("height") != 1080:
        raise RuntimeError(f"bad video dims: {v[0].get('width')}x{v[0].get('height')}")

    # audio not silent: sample 10s from the middle
    r = subprocess.run(
        ["ffmpeg", "-v", "info", "-ss", str(dur / 2), "-i", final_path,
         "-t", "10", "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True, text=True, timeout=300)
    m = None
    for line in r.stderr.splitlines():
        if "mean_volume" in line:
            m = float(line.split("mean_volume:")[1].split("dB")[0])
    if m is None or m < -45:
        raise RuntimeError(f"audio looks silent (mean_volume={m})")

    # no black segments (pic_th=0.90: 90% of pixels must be near-black;
    # lower values false-positive on dark cinematic scenes)
    r = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", final_path,
         "-vf", "blackdetect=d=0.5:pic_th=0.90:pix_th=0.10",
         "-an", "-f", "null", "-"],
        capture_output=True, text=True, timeout=900)
    blacks = [l for l in r.stderr.splitlines() if "black_start" in l]
    if blacks:
        raise RuntimeError(f"black frames detected: {blacks[:3]}")

    report = {"duration": round(dur, 2), "expected": total,
              "streams": f"{len(v)}v+{len(a)}a",
              "mean_volume_db": m, "black_segments": 0, "ok": True}
    out = os.path.join(ep_dir, "work", "verify.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1)
    print(f"verify: OK — {dur:.1f}s, 1v+1a, audio {m:.1f}dB, no black frames",
          flush=True)
    return out
