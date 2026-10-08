# video2 Pipeline (Clean)

End-to-end episode build using **only** video2. No references to `video/remotion`.

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
