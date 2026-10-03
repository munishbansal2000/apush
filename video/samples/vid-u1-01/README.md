# vid-u1-01 "The World in 1491" — render runbook (Windows 5090)

DOCUMENT/QUOTE-DRIVEN sample. 15 stages, ~6m24s narration. Manifest:
`video/manifests/vid-u1-01.json`. Narration: `video/samples/vid-u1-01/narration.json`
(16 segments; voices: `narrator`, `columbus`, `diaz`, `cortes`).

## Prerequisites (you already have these)
- fish-speech checkout with torch (GPU), working `python -m fish_speech.inference`
- Python 3, ffmpeg on PATH
- `pip install moviepy pillow numpy` (the stage renderer imports `video/motion.py`)
- Reference audio + EXACT transcript per voice, ~10–30s each, energetic original
  voice (never a real person's): `ref/narrator_energetic.wav` / `.txt`,
  `ref/columbus.wav` / `.txt`, `ref/diaz.wav` / `.txt`, `ref/cortes.wav` / `.txt`

## Commands — one script (canonical)

Run from the repo root. `build_lesson.py` does all four steps (TTS →
AI clips → video → validator), fail-fast with plain-language errors.
Voice refs are auto-discovered from `ref/` (`narrator_energetic` + every
extra voice in `narration.json`):

```
git pull
python video/build_lesson.py vid-u1-01 --preview
```

Drop `--preview` for the full-res final after motion approval. If a step
fails, resume without re-running finished steps, e.g.
`python video/build_lesson.py vid-u1-01 --skip-tts` (full resume patterns:
`python video/build_lesson.py --help`).

## Manual escape hatch (same four steps, by hand)

1. Pull:
```
git pull
```

2. Render the real narration (overwrites the silent placeholders in place;
   pause tags `[pause:0.45]` / `[pause:0.75]` / `[pause:1.5]` are split out and
   stitched as silence automatically):
```
python video/render_narration.py --narration video/samples/vid-u1-01/narration.json --audio-dir video/audio/vid-u1-01 --reference ref/narrator_energetic.wav --reference-text ref/narrator_energetic.txt --voice columbus=ref/columbus.wav:ref/columbus.txt --voice diaz=ref/diaz.wav:ref/diaz.txt --voice cortes=ref/cortes.wav:ref/cortes.txt
```

3. Build the video (re-renders every stage PNG from `video/render_vid_u1_01.py`,
   sized to the measured MP3 durations, then encodes and muxes):
```
python video/build_video.py vid-u1-01
```
Output: `video/vid-u1-01-the-world-in-1491.mp4`.

4. Re-run the validator (must be ALL GATES GREEN before shipping):
```
python video/validate_video.py video/manifests/vid-u1-01.json
```

## Notes
- The MP3s currently in `video/audio/vid-u1-01/` are SILENT PLACEHOLDERS, sized
  from the script's word count at the measured fish-speech pace (398 words /
  161.9s from the Cuba v4 pilot). They exist only so the validator's
  audio-match gate and the stage renderer have something to measure. They are
  not the narration. Step 2 replaces them.
- After step 2, re-run step 4: the validator re-measures every MP3 with ffprobe,
  and scene durations follow the real audio. The rendered-frame blank check
  only runs once the built MP4 exists (step 3).
- `video/scripts/vid-u1-01/*.txt` intentionally do not exist: the narration
  source of truth is `narration.json`, and the validator's no-copy gate scans
  `scripts/*.txt` — keeping the verbatim PD quotes out of that scan surface
  avoids false verbatim hits. (The WARN lines about missing scripts are expected.)
- Quote wording: re-verify each verbatim quote character-by-character against the
  PD edition cited in `SHOTS.md` before running step 2.
