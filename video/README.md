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

## Rendering app (for humans)

`app.py` is a tiny local web app: pick a video, hit Render, watch progress,
preview and download the MP4. Needs `pip install flask` (plus pillow and
ffmpeg above).

```
python app.py
# open http://localhost:5000
```

Rendered files go to `video/output/` (gitignored). Videos with missing
narration MP3s show an audio warning and can't render until the audio lands.

## Adding a video (no shared-file edits)

1. Write the narration as one `.txt` per stage in `scripts/videoN/`.
2. Add stage functions in a new `render_vN.py` (reuse the engine in `render_markup.py`).
3. Drop a manifest in `manifests/videoN.json`:
   `{"name":"videoN","module":"render_vN","stage_dir":"markupN","out":"slug.mp4",
     "plan":[["stage1","a.mp3"],["stage2","b.mp3"],["stage3",{"mp3":"c.mp3","share":2}]]}`
   (`share` splits one MP3's duration across stages; otherwise one MP3 per stage.)
4. Commit the narration MP3s in `audio/videoN/`.
5. `build_video.py` picks the manifest up automatically — never edit `build_video.py` for a new video.
