# video2 Pipeline (Clean)

End-to-end episode build using **only** video2. No references to `video/remotion`.

## One-command documentary pipeline

Lesson script → narration → word timing → documentary director → LTX hero clips → contact sheet → video, in the
visuals-first look of `docs/LOOK.md`. Install the non-Node runtime once (Edge TTS, Vosk + model, ffmpeg check):

```bash
npm run setup:pipeline          # Windows (PowerShell)
npm run setup:pipeline:unix     # macOS / Linux
```

```bash
# Narration, timing, words, director, clips, contact sheet (stops before the full render).
npm run pipeline:dev -- --episode u3e1

# Same, but answer the director's prompts with your own agents instead of Meta UI:
# writes out/pipeline/u3e1/agent/*.prompt.md; answer each in the matching .answer.json; re-run.
npm run pipeline:dev -- --episode u3e1 --agent

# Final video after approving out/u3e1-contact.png.
npm run pipeline:dev -- --episode u3e1 --from render
```

Production audio: `npm run pipeline:prod` (Meta UI adds Fish performance direction without changing wording; the
Fish CLI renders each turn; set `FISH_TTS_SCRIPT`, optionally `FISH_PYTHON`).

Stages: `turns`, `pronounce`, `audio`, `timing`, `words`, `images`, `direct`, `clips`, `contact`, `render`.
Use `--only <stage>`, `--from <stage>`, `--force`, `--dry-run`, `--draft` (allow unapproved library geography),
`--agent` (director prompts as files), `--video-gen none` (never run LTX; clip shots show their still).

What each back-half stage does:

- **direct**: the documentary director (`tools/pipeline/doc-director.ts`): an outline (thesis, acts, Episode Sheet
  boxes with spoken cues), then one prompt per act, merged and checked against every LOOK rule; only failing acts are
  re-asked. Writes `data/<episode>/shots.json`. Requires Vosk words. Each act's prompt holds only that act's turns, so
  a one-line edit re-directs one act (Meta prompt cache / agent answer files keep the rest).
- **clips**: LTX hero clips for `clip` shots via LTX Desktop (default) or `LTX_BACKEND=diffusers`; 16:9 crop around
  the focus (never stretched), forward/reverse boomerang, keyed by content under `public/clips/<episode>/`. Desktop
  defaults to 720p and retries only a failed missing clip at 540p if the higher tier exhausts VRAM. Set
  `LTX_DESKTOP_RESOLUTION=1080p` to generate final 1080p clips later; each resolution has its own cache fingerprint.
- **contact**: stills at every shot start and end with the runtime layout guard; fails on layout problems or any
  unmeasured frame. Writes `out/<episode>-contact.png` and `out/<episode>-layout.json`.
- **render**: ~20s segments at shot boundaries, each cached by content (shots, next shot, assets, sheet, years,
  renderer source), every frame guard-checked; one audio pass mixes narration, music and sound cues for the whole
  episode; ffmpeg assembles and verifies one video + one audio stream of the right length. `out/<episode>.mp4`.

Incrementality: TTS is content-addressed (inserting a line synthesizes only that line), Vosk is cached per audio
file, director prompts are cached per act, clips per content key, and render segments per content key.

Standalone tools run the same stage code: `tools/doc-direct.ts` (director, `--agent`), `tools/doc-clips.ts`,
`tools/doc-render.ts` (`--plan` for hand-made plans such as `data/u3e1/shots.sample.json`, `--seconds N` previews,
`--check` to validate only). Depth maps for 2.5D parallax: `tools/depth-maps.py` (see `docs/LOOK.md`).

Meta UI uses the shared adapter and cookie configured in `data/pipeline.json` (`meta.libDir`, `meta.cookieFile`);
`APUSH_LLM_LIB_DIR` / `META_COOKIE_FILE` override them. External tools are found by `tools/pipeline/tools.ts`
(env override, project venv, Miniconda/Homebrew, PATH).

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
