# Runbook: render an APUSH video end-to-end on Windows

You run this yourself. One command does everything: script → Fish Audio →
timings → LLM scene plan → slideforge animation → final MP4.

## One-time setup

1. **Python 3.11+** — python.org, check "Add python.exe to PATH".
2. **ffmpeg** — `winget install Gyan.FFmpeg`, then confirm `ffmpeg -version`
   works in a NEW terminal.
3. **Python packages:** `pip install pillow numpy faster-whisper vosk`
   (`vosk` powers the `wordtiming` stage — measured word times for exact
   within-slide cues. Also download the small English model (~40MB):
   [vosk-model-small-en-us-0.15](https://alphacephei.com/vosk/models),
   unzip to `%USERPROFILE%\vosk-model-small-en-us-0.15`, or point
   `$env:VOSK_MODEL_PATH` at it.)
4. **Fish Audio key:** `$env:FISH_API_KEY="your-key"` (each new terminal,
   or set it permanently in System Environment Variables).
   Needed for the dialogue audio.
5. **Voices:** open `tools\render\voices.yaml` in the repo, paste the Fish
   voice model ids for Maya and Marcus (fish.audio dashboard → voice →
   model id). Once, ever.
6. **OpenAI key (optional):** `$env:OPENAI_API_KEY="your-key"`.
   Only needed for `--director-provider openai` (the model writes the scene
   plan), slideforge vision waypoint reading, or slideforge image
   generation. The default `--director-provider agent` needs no key — YOU
   write the scene plan from the printed prompt.

No chrome-headless-shell, no browser: the default slideforge renderer draws
everything in pure Python. (The old chrome-based path still exists behind
`--renderer legacy`, which does need `CHROME_HEADLESS_SHELL`.)

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
| `timing` | Measures the real MP3 durations → `work\timings.json`. Scenes resolve against these, so visuals land on the actual voice. |
| `wordtiming` | Vosk word-timing per turn → `work\word_times.json`. Feeds the director prompt (`WORD TIMES:` lines) so StaggerSlide entrances and keyword pops land on exact measured word times. |
| `direct` | The LLM director step. Default (`agent`): uses the reviewed scene plan — `work\\scene_plan.json` if present, otherwise the reviewed `episodes\\<ep>\\scene_plan.json` (all U1 plans live there) — and stops only if neither exists. Never improvise your own render script: `work\\draft.mp4`-style outputs bypass timing/refit/verify and desync. `--plan-file <path>` points at an explicit plan. |
| `slideforge_render` | Deterministic compile of `work\scene_plan.json` → `work\slideforge.mp4`. No network, no model calls — same plan + same assets = same video. |
| `assemble` | Muxes the dialogue audio over the rendered video. |
| `verify` | Fail-closed checks: duration matches, 1 video + 1 audio stream, audio not silent, zero black frames. |

Output: `episodes\u1-e2\u1-e2-final.mp4`.

To re-render after editing the plan:
`python pipeline.py --episode u1-e2 --only slideforge_render,assemble,verify --force`

Legacy renderer (chrome-based beat segments, needs `CHROME_HEADLESS_SHELL`
and a `beats.json` beat sheet):
`python pipeline.py --episode u1-e2 --renderer legacy`

## Useful variants

```powershell
python pipeline.py --episode u1-e2 --only timing,direct   # timings + director prompt, no rendering
python pipeline.py --episode u1-e2 --force                # re-render everything from scratch
python director.py --turns turns.json --manifest manifest.json --episode u1-e2 --provider agent --out plan.json  # director standalone
```

Re-render after a plan edit: change `work\scene_plan.json`, then
`--only slideforge_render,assemble,verify --force` — the director and audio
stages are cached.

## If something goes wrong

- `voices.yaml: set a real Fish Audio voice model id` → step 5.
- `Fish Audio API error: HTTP 401/403` → `FISH_API_KEY` is wrong or not set in
  this terminal (step 4).
- `direct: no scene plan yet` → read `work\director_prompt.txt`, write the
  plan to `work\scene_plan.json`, re-run with
  `--only direct,slideforge_render,assemble,verify`.
- `PLAN ERROR: ...` → the scene plan failed validation; the message names the
  offending scene — fix it and re-run (no rendering happened, nothing cached).
- `no turn MP3s found` → the audio stage didn't produce them; run the
  `audio_build` command from `beats.json` by hand and read its error.
- The mixed audio sounds wrong → fix the script `.md`, re-run; only changed
  turns re-synthesize, then the pipeline re-times automatically.
