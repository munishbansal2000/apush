# video2 Pipeline (Clean)

End-to-end episode build using **only** video2. No references to `video/remotion`.

## Setup (once)

```bash
cd video2
npm install
npm run setup
```

`setup` runs: downloads → `ensure-data.ts` → `build-turns.ts` → `build-tts.ts` →
`placeholder-audio` → `build-timing.ts` → `make:sfx` → `placeholder-heads` →
`sync:manifest` → `validate`.

## Per-episode E2E

```bash
cd video2

# 1. Validate (blocks on errors)
npm run validate

# 2. Contact sheet — sampled stills + layout guard
npm run contact-sheet -- --episode u1e3 --every 5

# 3. Full render (validates first, guard on every frame)
npm run render -- --id U1E3
```

## Stages

| Phase | Script | Output |
|-------|--------|--------|
| Data | `tools/ensure-data.ts` | `data/{ep}/turns.json`, `timing_map.json` |
| TTS | `tools/build-tts.ts` | `tts/{ep}/*.mp3` |
| Timing | `tools/build-timing.ts` | `data/{ep}/word_times.json` |
| Validate | `tools/validate-episode.ts` | console report, exit 1 on error |
| QA | `tools/contact-sheet.ts` | `out/{ep}-contact.png` |
| Render | `tools/render.ts` | `out/u1e3.mp4` + guard logs |

## Notes

- All paths resolve from video2/ via `tools/lib.ts` (`ROOT`).
- Render config: `data/render-config.json` (1920×1080).
- Compositions: `U1E3`, `U1-PRACTICE` (see `src/episodes/KitCompositions.tsx`).
- Guard runs on every rendered frame; logs to `out/logs/`.
