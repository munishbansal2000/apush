# Runbook: render an APUSH video end-to-end on Windows

You run this yourself. One command does everything: script → Fish Audio →
timings → beats → segments → final MP4.

## One-time setup

1. **Python 3.11+** — python.org, check "Add python.exe to PATH".
2. **ffmpeg** — `winget install Gyan.FFmpeg`, then confirm `ffmpeg -version`
   works in a NEW terminal.
3. **Python packages:** `pip install pillow numpy faster-whisper`
4. **Fish Audio key:** `$env:FISH_API_KEY="your-key"` (each new terminal,
   or set it permanently in System Environment Variables).
5. **Voices:** open `tools\render\voices.yaml` in the repo, paste the Fish
   voice model ids for Maya and Marcus (fish.audio dashboard → voice →
   model id). Once, ever.
6. **chrome-headless-shell** (for text overlays): download "chrome-headless-shell"
   for Windows from the Chrome for Testing page
   (googlechromelabs.github.io/chrome-for-testing), unzip it, and set
   `$env:CHROME_HEADLESS_SHELL="C:\path\to\chrome-headless-shell.exe"`.

## Render

```powershell
git clone https://github.com/munishbansal2000/apush.git
cd apush\video-pipeline
python pipeline.py --episode u1-e2
```

That's it. The single command runs every stage:

| Stage | What happens |
|---|---|
| `audio` | `render_episode.py` synthesizes each turn with Fish Audio (Maya/Marcus voices), turns `[N-second pause]` into real silence, writes `episodes\u1-e2\audio\e2-mixed.mp3` + per-turn `t00..tNN.mp3`. Turns are cached — re-running only re-synthesizes changed lines. |
| `timing` | Measures the real MP3 durations → `work\timings.json`. Beats resolve against these, so visuals land on the actual voice. |
| `beats` | Validates `beats.json` (fail-closed: beats must be contiguous, first starts at 0, last ends at total). |
| `wordalign` | faster-whisper word timestamps for the animated "chain" beats, so nodes reveal as the words are spoken. |
| `anim` | Writes LTX clip prompts to `anim_prompts\` — optional. Render those on the 5090 if you want; drop finished clips in `episodes\u1-e2\clips\` and the render stage picks them up. Skipped clips don't block the build. |
| `render` | One cached segment per beat (Ken Burns over stills + HTML overlays). |
| `assemble` | Concatenates segments, muxes the dialogue audio. |
| `verify` | Fail-closed checks: duration matches, 1 video + 1 audio stream, audio not silent, zero black frames. |

Output: `episodes\u1-e2\u1-e2-final.mp4`.

## Useful variants

```powershell
python pipeline.py --episode u1-e2 --only timing,beats   # validate the beat sheet without rendering
python pipeline.py --episode u1-e2 --force               # re-render every segment from scratch
```

Re-render ONE beat: delete `episodes\u1-e2\work\segs\<beat-id>.mp4` and re-run —
everything else is cached.

## If something goes wrong

- `voices.yaml: set a real Fish Audio voice model id` → step 5.
- `Fish Audio API error: HTTP 401/403` → `FISH_API_KEY` is wrong or not set in
  this terminal (step 4).
- `chrome-headless-shell not found` → step 6, check the env var path.
- `no turn MP3s found` → the audio stage didn't produce them; run the
  `audio_build` command from `beats.json` by hand and read its error.
- Beats validation fails → the error names the offending beat; fix
  `episodes\u1-e2\beats.json` and re-run (no re-render needed for this check).
- The mixed audio sounds wrong → fix the script `.md`, re-run; only changed
  turns re-synthesize, then the pipeline re-times automatically.
