# vid-u1-04 "The Spanish Machine" — render runbook (Windows 5090)

ARGUMENT-DRIVEN sample. 12 stages, ~5m19s narration. Manifest:
`video/manifests/vid-u1-04.json`. Narration: `video/samples/vid-u1-04/narration.json`
(14 segments; voices: `narrator`, `crown`, `lascasas`).

## Prerequisites (you already have these)
- fish-speech checkout with torch (GPU), working `python -m fish_speech.inference`
- Python 3, ffmpeg on PATH
- `pip install moviepy pillow numpy` (the stage renderer imports `video/motion.py`)
- Reference audio + EXACT transcript per voice, ~10–30s each, energetic original
  voice (never a real person's): `ref/narrator_energetic.wav` / `.txt`,
  `ref/crown.wav` / `.txt`, `ref/lascasas.wav` / `.txt`

## Commands — one script (canonical)

Run from the repo root. `build_lesson.py` does all four steps (TTS →
AI clips → video → validator), fail-fast with plain-language errors.
Voice refs are auto-discovered from `ref/` (`narrator_energetic` + every
extra voice in `narration.json`):

```
git pull
python video/build_lesson.py vid-u1-04 --preview
```

Drop `--preview` for the full-res final after motion approval. If a step
fails, resume without re-running finished steps, e.g.
`python video/build_lesson.py vid-u1-04 --skip-tts` (full resume patterns:
`python video/build_lesson.py --help`).

## Manual escape hatch (same four steps, by hand)

1. Pull:
```
git pull
```

2. Render the real narration (overwrites the silent placeholders in place;
   pause tags are split out and stitched as silence automatically):
```
python video/render_narration.py --narration video/samples/vid-u1-04/narration.json --audio-dir video/audio/vid-u1-04 --reference ref/narrator_energetic.wav --reference-text ref/narrator_energetic.txt --voice crown=ref/crown.wav:ref/crown.txt --voice lascasas=ref/lascasas.wav:ref/lascasas.txt
```

3. Build the video (re-renders every stage PNG from `video/render_vid_u1_04.py`,
   sized to the measured MP3 durations, then encodes and muxes):
```
python video/build_video.py vid-u1-04
```
Output: `video/vid-u1-04-the-spanish-machine.mp4`.

4. Re-run the validator (must be ALL GATES GREEN before shipping):
```
python video/validate_video.py video/manifests/vid-u1-04.json
```

## Notes
- The MP3s currently in `video/audio/vid-u1-04/` are SILENT PLACEHOLDERS, sized
  from the script's word count at the measured fish-speech pace (398 words /
  161.9s from the Cuba v4 pilot). Step 2 replaces them; step 4 must be re-run
  after, because scene durations follow the real measured audio.
- `video/scripts/vid-u1-04/*.txt` intentionally do not exist (narration source
  of truth is `narration.json`; keeps verbatim PD quotes out of the validator's
  no-copy scan surface — the WARN lines are expected).
- The Las Casas quote ships in Spanish (verified wording, 1552). An
  English-cloned TTS voice will read it with an English accent — fine for a
  sample; at production, either cast a Spanish-capable quote voice or substitute
  the verified 1656 Phillips English translation (re-verify wording first).
- Quote wording: re-verify each verbatim quote character-by-character against the
  PD edition cited in `SHOTS.md` before running step 2.
