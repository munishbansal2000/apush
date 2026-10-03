# vid-u1-03 "Why Europe Sailed West" — render runbook (Windows 5090)

SEQUENCE-DRIVEN sample. 11 stages, ~5m30s narration. Manifest:
`video/manifests/vid-u1-03.json`. Narration: `video/samples/vid-u1-03/narration.json`
(14 segments; voices: `narrator`, `columbus`, `hakluyt`).

## Prerequisites (you already have these)
- fish-speech checkout with torch (GPU), working `python -m fish_speech.inference`
- Python 3, ffmpeg on PATH
- `pip install moviepy pillow numpy` (the stage renderer imports `video/motion.py`)
- Reference audio + EXACT transcript per voice, ~10–30s each, energetic original
  voice (never a real person's): `ref/narrator_energetic.wav` / `.txt`,
  `ref/columbus.wav` / `.txt`, `ref/hakluyt.wav` / `.txt`

## Commands, in order (run from the repo root)

1. Pull:
```
git pull
```

2. Render the real narration (overwrites the silent placeholders in place;
   pause tags are split out and stitched as silence automatically):
```
python video/render_narration.py --narration video/samples/vid-u1-03/narration.json --audio-dir video/audio/vid-u1-03 --reference ref/narrator_energetic.wav --reference-text ref/narrator_energetic.txt --voice columbus=ref/columbus.wav:ref/columbus.txt --voice hakluyt=ref/hakluyt.wav:ref/hakluyt.txt
```

3. Build the video (re-renders every stage PNG from `video/render_vid_u1_03.py`,
   sized to the measured MP3 durations, then encodes and muxes):
```
python video/build_video.py vid-u1-03
```
Output: `video/vid-u1-03-why-europe-sailed-west.mp4`.

4. Re-run the validator (must be ALL GATES GREEN before shipping):
```
python video/validate_video.py video/manifests/vid-u1-03.json
```

## Notes
- The MP3s currently in `video/audio/vid-u1-03/` are SILENT PLACEHOLDERS, sized
  from the script's word count at the measured fish-speech pace (398 words /
  161.9s from the Cuba v4 pilot). Step 2 replaces them; step 4 must be re-run
  after, because scene durations follow the real measured audio.
- `video/scripts/vid-u1-03/*.txt` intentionally do not exist (narration source
  of truth is `narration.json`; keeps verbatim PD quotes out of the validator's
  no-copy scan surface — the WARN lines are expected).
- The joint-stock charter image gap (PRODUCTION-GUIDE G-V03-1) is still open:
  beat3a covers joint-stock as a term card, not a document zoom. If you source
  the Virginia Company 1606 charter (Wikimedia Commons / LoC, verify pre-1930),
  drop it in `assets/images/u1/`, extend the catalog, and re-point beat3a.
- Quote wording: re-verify each verbatim quote character-by-character against the
  PD edition cited in `SHOTS.md` before running step 2.
