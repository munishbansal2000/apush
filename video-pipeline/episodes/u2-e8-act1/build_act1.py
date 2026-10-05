#!/usr/bin/env python3
"""Reproducible Act 1 build for u2-e8.

Usage:
  python3 build_act1.py --plan act1_scene_plan.json --tts-dir tts/per_turn --out act1_final.mp4

Pipeline:
  1. Read act1_scene_plan.json (8 scenes, measured durations, slide params).
  2. Render each scene silently at exact 30fps frame counts (cumulative rounding).
  3. Concat scenes, concat per-turn WAVs, mux once.
  4. Verify drift < 1 frame (0.033s).

Requirements: slideforge (pip install from repo), ffmpeg, ffprobe.
TTS: generate per-turn MP3s from the plan's tts.voices/speed, or supply your own.
     Filenames: t00.mp3 ... t09.mp3 in --tts-dir.
"""

import argparse, json, math, os, subprocess, sys, tempfile

FPS = 30


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd[:4])} failed: {r.stderr[:400]}")
    return r


def wav_duration(path):
    r = run(["ffprobe", "-v", "error", "-show_entries",
             "stream=sample_rate", "-of", "csv=p=0", path])
    sr = int(r.stdout.strip().split("\n")[0])
    r = run(["ffprobe", "-v", "error", "-show_entries",
             "stream=nb_samples", "-of", "csv=p=0", path])
    n = int(r.stdout.strip().split("\n")[0])
    return n / sr


def render_scene(scene, assets_dir, tmpdir):
    """Render one scene silently. Returns path to silent MP4."""
    from slideforge import Config
    from slideforge.slides import (DisplayHeadline, ImageSlide, HighlightSlide,
                                   RouteSlide, StaggerSlide, TacticalSlide)
    from slideforge.timeline import Movie

    cfg = Config(w=1280, h=720, fps=FPS)
    movie = Movie(cfg)
    dur = scene["duration_sec"]

    def A(p):
        return os.path.join(assets_dir, os.path.basename(p))

    SLIDES = {"DisplayHeadline": DisplayHeadline, "ImageSlide": ImageSlide,
              "HighlightSlide": HighlightSlide, "RouteSlide": RouteSlide,
              "StaggerSlide": StaggerSlide, "TacticalSlide": TacticalSlide}

    if "segments" in scene:
        for seg in scene["segments"]:
            cls = SLIDES[seg["slide"]]
            kw = dict(seg["params"])
            if "image" in kw:
                kw["image"] = A(kw["image"])
            if "panels" in kw:
                for p in kw["panels"]:
                    p["image"] = A(p["image"])
            if "map_image" in kw:
                kw["map_image"] = A(kw["map_image"])
            movie.add(cls(duration=seg["duration_sec"], cfg=cfg, **kw),
                      transition="cut")
    else:
        cls = SLIDES[scene["slide"]]
        kw = dict(scene["params"])
        if "image" in kw:
            kw["image"] = A(kw["image"])
        if "map_image" in kw:
            kw["map_image"] = A(kw["map_image"])
        movie.add(cls(duration=dur, cfg=cfg, **kw), transition="cut")

    # exact frame count via cumulative rounding
    frames = round(dur * FPS)
    out = os.path.join(tmpdir, f"{scene['id']}_silent.mp4")
    movie.render(out, quiet=True)
    return out, frames


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    ap.add_argument("--tts-dir", required=True,
                    help="per-turn t00.mp3..t09.mp3")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    plan = json.load(open(args.plan))
    assets = os.path.join(os.path.dirname(os.path.abspath(args.plan)),
                          "assets", "images")
    tmpdir = tempfile.mkdtemp(prefix="act1_")

    # 1. Verify TTS durations match plan (WAV sample counts = ground truth)
    print("== verifying TTS ==")
    total_audio = 0.0
    for t in plan["tts"]["turns"]:
        mp3 = os.path.join(args.tts_dir, f"{t['id']}.mp3")
        if not os.path.exists(mp3):
            sys.exit(f"missing {mp3} — generate per-turn TTS first")
        wav = os.path.join(tmpdir, f"{t['id']}.wav")
        run(["ffmpeg", "-y", "-v", "error", "-i", mp3,
             "-ar", "44100", "-ac", "2", wav])
        d = wav_duration(wav)
        drift = abs(d - t["duration_sec"])
        flag = "OK " if drift < 1/FPS else "MISMATCH"
        print(f"  {t['id']}: measured {d:.3f}s vs plan {t['duration_sec']:.3f}s [{flag}]")
        if drift >= 1/FPS:
            sys.exit(f"{t['id']} drift {drift:.3f}s >= 1 frame — re-run ingestion")
        total_audio += d

    # 2. Render scenes silently with cumulative frame boundaries
    print("== rendering scenes ==")
    scene_files, cum = [], 0.0
    expected_frames = []
    for s in plan["scenes"]:
        out, _ = render_scene(s, assets, tmpdir)
        cum += s["duration_sec"]
        boundary = round(cum * FPS)
        expected_frames.append(boundary)
        # trim/pad to exact cumulative boundary
        prev = expected_frames[-2] if len(expected_frames) > 1 else 0
        want = boundary - prev
        exact = os.path.join(tmpdir, f"{s['id']}_exact.mp4")
        run(["ffmpeg", "-y", "-v", "error", "-i", out,
             "-frames:v", str(want), "-c:v", "libx264",
             "-pix_fmt", "yuv420p", "-r", str(FPS), exact])
        scene_files.append(exact)
        print(f"  {s['id']}: {want} frames ({s['duration_sec']:.3f}s)")

    total_frames = expected_frames[-1]
    print(f"  total: {total_frames} frames = {total_frames/FPS:.3f}s")

    # 3. Concat video, concat audio, mux once
    print("== assembling ==")
    vlist = os.path.join(tmpdir, "vlist.txt")
    with open(vlist, "w") as f:
        for p in scene_files:
            f.write(f"file '{p}'\n")
    vcat = os.path.join(tmpdir, "video.mp4")
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
         "-i", vlist, "-c", "copy", vcat])

    alist = os.path.join(tmpdir, "alist.txt")
    with open(alist, "w") as f:
        for t in plan["tts"]["turns"]:
            f.write(f"file '{os.path.join(tmpdir, t['id'])}.wav'\n")
    acat = os.path.join(tmpdir, "audio.wav")
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
         "-i", alist, "-c", "copy", acat])

    run(["ffmpeg", "-y", "-v", "error", "-i", vcat, "-i", acat,
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS),
         "-c:a", "aac", "-shortest", args.out])

    # 4. Verify drift
    r = run(["ffprobe", "-v", "error", "-show_entries",
             "format=duration", "-of", "csv=p=0", args.out])
    vd = float(r.stdout.strip())
    drift = abs(vd - total_audio)
    frames_drift = drift * FPS
    print(f"== verify: video {vd:.3f}s vs audio {total_audio:.3f}s "
          f"→ drift {drift:.4f}s ({frames_drift:.2f} frames)")
    if frames_drift >= 1.0:
        sys.exit("DRIFT >= 1 frame — build rejected")
    print(f"DONE: {args.out} (drift {drift:.4f}s, under 1 frame)")


if __name__ == "__main__":
    main()
