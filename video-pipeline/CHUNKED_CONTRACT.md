# Chunked-render contract (for assemble/verify integration)

`compile_scene_plan.render_scenes_chunked(plan_path, assets_dir, out_dir,
width, height, fps, timings, quiet)` renders each scene to its own
silent H.264 mp4 and returns the manifest path. This is the producer
side of merged-list items 7 (concat assemble) and 8 (verify gates).

## What the producer guarantees

- `out_dir/` contains `manifest.json` + one mp4 per scene:
  `00-scene-01.mp4`, `01-scene-02.mp4`, ... (index prefix = scene order).
- `manifest.json`:
  ```json
  {
    "fps": 30,
    "width": 1280, "height": 720,
    "total_frames": 14580,
    "episode": "u1-e2",
    "scenes": [
      {"id": "scene-01", "file": "00-scene-01.mp4",
       "start_frame": 0, "frames": 900},
      ...
    ]
  }
  ```
- Scene `i` owns frames `[start_frame, start_frame + frames)`.
  `start_frame` values are **cumulative** boundaries
  `F[i] = round(cumulative_audio_seconds[i] * fps)` — exact by
  construction, no per-scene rounding drift.
- `total_frames == sum(frames) == round(total_audio_seconds * fps)`.
- Every chunk passed the **render_exact** check: ffprobe frame count ==
  manifest `frames`. A short encode raises instead of drifting.
- All chunks are same codec/resolution/fps/pix_fmt
  (libx264, yuv420p, CFR) so the concat demuxer can `-c:v copy`.
- Transition blend frames live at the **head** of the incoming scene's
  chunk (scene i's chunk is pure scene-i content over its audio span).
  Concatenating chunks in order reproduces the single-mp4 timeline
  exactly.

## What the consumer (assemble) must do

1. Build the concat list from `manifest.json` (in scene order).
2. `ffmpeg -f concat -safe 0 -i list.txt -c:v copy video.mp4`.
3. Mux the master dialogue audio in the same pass
   (`-i episode.mp3 -c:a aac -shortest` is FORBIDDEN as a silent trim —
   see verify).
4. Never stretch or re-time the audio.

## What the consumer (verify) must check

- `|video_duration - audio_duration| < 1 frame` (1/30 s). Anything at
  or beyond one frame FAILS — `-shortest` trimming is a failure signal,
  not a fix.
- Video frame count == `manifest.json` `total_frames`.
- Scene boundary `i` (seconds) == `start_frame[i] / fps` within one
  frame of cumulative measured audio time.
- Keep the existing checks: streams present, audio codec, no long
  black runs.

## Idempotency

Re-running `render_scenes_chunked` skips scenes whose mp4 exists with
the right frame count and rewrites the manifest. A failed scene
re-renders alone (its chunk is the unit of retry, not the episode).
Stale plan content is NOT detected here — `stages/slideforge_render.py`
keys its cache on the plan SHA; if you replace that stage, keep the
SHA-keyed cache or accept re-renders.
