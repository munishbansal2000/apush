# APUSH grading-video pipeline

Code-driven video builder: Python/PIL renders the animated red-pen markup,
ffmpeg assembles each visual stage to its narration's exact duration.

## Layout

- `build_video.py` — the whole pipeline in one command (see below)
- `render_markup.py` — video 1 stages ("We Graded This DBQ", 4/7) + shared drawing engine
- `render_v2.py` — video 2 stages ("From 4/7 to 7/7", the sequel)
- `fonts/` — bundled DejaVu fonts (no system-font dependency)
- `audio/video1/`, `audio/video2/` — committed narration MP3s (no TTS step needed to rebuild)
- `scripts/video1/`, `scripts/video2/` — the narration source texts

## Build

Needs: Python 3, Pillow (`pip install pillow`), ffmpeg on PATH.

```
python build_video.py video1
python build_video.py video2
python build_video.py video1 --out myvideo.mp4
```

Each stage lasts exactly as long as its narration MP3 (measured with ffprobe
at build time), so audio and visuals cannot drift. A contact-sheet visual
check of every rendered stage is the required QC step before shipping —
see the v1 history for why.

## Re-recording narration

Drop replacement MP3s into `audio/videoX/` with the same filenames and
re-run. Keep the plain-teacher-voice rules: no hype, no "not X but Y"
constructions, adjectives stay factual. One MP3 per visual stage — never
one long recording split across stages.

## Adding a video

1. Write the narration as one `.txt` per stage in `scripts/videoN/`.
2. Add stage functions to a new `render_vN.py` (reuse the engine in `render_markup.py`).
3. Add the `(module, stage_dir, plan)` entry to `VIDEOS` in `build_video.py`.
4. Commit the narration MP3s.
