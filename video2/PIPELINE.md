# video2 Pipeline (Clean)

End-to-end episode build using **only** video2. No references to `video/remotion`.

## One-command transcript pipeline

Install the non-Node runtime once. This creates `.venv-pipeline`, installs Edge TTS
and Vosk, downloads the small English Vosk model, and verifies ffmpeg/ffprobe:

```powershell
npm run setup:pipeline
```

The staged pipeline can now start from an existing `turns.json` or a plain transcript
containing `Speaker: text` lines and `[pause 2.5]` markers. When `--transcript` is
omitted, an episode such as `u3e1` automatically resolves the newest canonical script
under `../audio_scripts/unit3/` (a `LOCKED` script wins when present). Override the
shared root with `AUDIO_SCRIPTS_DIR`.

```powershell
# Fast development build: Edge TTS, Vosk, Meta UI image research/direction,
# smart downloads, and a contact sheet. It stops before the expensive full render.
npm run pipeline:dev -- --episode u3e1 --transcript path\to\lesson.txt

# Production audio: Meta UI adds Fish performance direction without changing
# spoken wording, then the configured Fish CLI renders each turn.
$env:FISH_PYTHON = 'C:\path\to\python.exe'
$env:FISH_TTS_SCRIPT = 'C:\path\to\fish_tts.py'
npm run pipeline:prod -- --episode u3e1 --transcript path\to\lesson.txt

# Build the final MP4 after approving out/u3e1-contact.png.
npm run pipeline:prod -- --episode u3e1 --from render --full
```

Stages are `turns`, `audio`, `timing`, `words`, `images`, `direct`, `clips`, `contact`,
and `render`. Use `--only <stage>`, `--from <stage>`, `--force`, or `--dry-run`.
Each completed stage is content-hashed in `out/pipeline/<episode>/state.json`, so a
failed/throttled run resumes without repeating current work.

Incrementality also applies *inside* the expensive stages:

- TTS is cached per turn, and Vosk word timing is cached per audio file.
- Vosk reports every measured/reused turn and is a hard gate for direction:
  missing, empty, malformed, unordered, or out-of-audio word timings stop the run.
- Image downloads are reused when their lock entry and local file are current.
- LTX clips are cached per scene using the prompt, seed, duration, source image,
  and generator version.
- Contact-sheet stills are cached per scene.
- The final render is split into `out/pipeline/<episode>/segments/*.mp4` and cached
  per scene using that scene's plan, audio, imagery/clips, frame range, and renderer
  source. Only stale scenes are rendered; ffmpeg then concatenates all current
  segments into `out/<episode>.mp4` and validates the assembled duration.

Thus editing one turn normally rebuilds its audio and word timing, any affected
director output/assets, and only the scene segments whose inputs changed. The final
concat still runs because it is the inexpensive step that creates the canonical MP4.

`DirectedEpisode` uses the same browser-side runtime layout guard as the component
episodes. The contact sheet samples every narration transition plus each scene midpoint,
stores guard findings with the still cache, writes `out/<episode>-layout.json`, and fails
on overlaps, cuts, clipping, overflow, or empty panels. Full scene rendering checks every
rendered frame and writes `out/pipeline/<episode>/render-layout.json`.

Meta UI uses the existing shared adapter at
`C:\Users\munis\projects\sat_question_runner\new_eng_qs\lib\meta.js` and its
existing cookie by default. Override their locations with `APUSH_LLM_LIB_DIR` and
`META_COOKIE_FILE`; set `META_HEADLESS=1` only when the UI is known to work headlessly.
The pipeline automatically discovers `.venv-pipeline` and its checked model first.
`VOSK_PYTHON`, `FISH_PYTHON`, and `VOSK_MODEL_PATH` remain available as overrides.

The director may select `creative_clip` scenes when `--video-gen ltx` (the default).
The `clips` stage invokes the old checked-in `../video/animate_still.py` safety-filtered
LTX generator, caps native generation at six seconds, conforms/loops it to the exact
measured scene duration, probes the result, and caches it under
`public/clips/<episode>/`. Set `LTX_PYTHON` and optionally `LTX_SCRIPT`; use
`--video-gen none` to require already-generated clips without invoking LTX.

The director emits validated `data/<episode>/scene_plan.json`. Its component vocabulary
is deliberately constrained to `title`, `ken_burns`, `quote`, `compare`,
`causal_chain`, `highlight`, and `primary_source`; the model cannot emit executable
code. Scene boundaries are overwritten from measured TTS timing and must cover every
turn exactly once. Before either a contact sheet or full render, `sync_report.json`
checks the real audio files, timing map, contiguous scene boundaries, final duration,
and creative-clip lengths to a one-frame tolerance. Rendering uses
`src/directed/DirectedEpisode.tsx`.

## Setup (once)

```bash
cd video2
npm install
npx tsx tools/setup-downloads.ts   # fonts, geo data, images
```

## Full Pipeline — Component Episodes (U1E1–U2E10)

```bash
cd video2

# 1. Contact sheet — sampled stills + layout guard (QA)
npx tsx tools/contact-sheet-components.ts --episode U2E8 --every 8 --scale 0.3

# 2. Full render — with layout guard on every frame
npx tsx tools/render-components.ts --episode U2E8

# Output: out/u2e8episode.mp4 + out/logs/
```

## Full Pipeline — Kit Episodes (U1E3, U1-PRACTICE)

```bash
cd video2

# 1. Setup data
npx tsx tools/ensure-data.ts --episode u1e3
npx tsx tools/build-turns.ts --episode u1e3
npx tsx tools/build-tts.ts --episode u1e3
npx tsx tools/build-timing.ts --episode u1e3

# 2. Validate
npx tsx tools/validate-episode.ts --episode u1e3

# 3. Contact sheet
npx tsx tools/contact-sheet.ts --episode u1e3 --every 5

# 4. Full render
npx tsx tools/render.ts --id U1E3

# Output: out/u1e3.mp4 + out/logs/
```

## Stages

| Phase | Component Episodes | Kit Episodes |
|-------|-------------------|--------------|
| Data | `src/data/{ep}/` (committed) | `tools/ensure-data.ts` + `build-turns.ts` |
| TTS | (pre-existing MP3s) | `tools/build-tts.ts` |
| Timing | `src/data/{ep}/timing_map.json` | `tools/build-timing.ts` |
| Validate | (via contact-sheet guard) | `tools/validate-episode.ts` |
| QA | `tools/contact-sheet-components.ts` | `tools/contact-sheet.ts` |
| Render | `tools/render-components.ts` | `tools/render.ts` |

## Notes

- All paths resolve from video2/ via `tools/lib.ts` (`ROOT`).
- Component episodes use `src/components-index.ts` entry point.
- Kit episodes use `src/index.ts` entry point with `src/episodes/`.
- Render config: `data/render-config.json`.
- Guard runs on every rendered frame; logs to `out/logs/`.
