# From Scratch: U1E1 (no TTS, no data yet)

U1E1 has a component (`src/components/U1E1Episode.tsx`) but no script, turns, timing, or TTS.
This is the from-scratch path.

## Step 1: Director

The old manual director prompt (`director-prompt-v13-remotion.txt`) was retired with the slide-based renderer. Lessons
now go through the documentary pipeline (`PIPELINE.md`): `npx tsx tools/doc-direct.ts --episode <ep> --agent` writes
the director's prompts as files for your agents (or drop `--agent` to use Meta UI) and produces `data/<ep>/shots.json`.
The hand-built component episode `src/components/U1E1Episode.tsx` keeps its own `BEATS` array.

## Step 2: TTS

```bat
:: From video2 on Windows:
npx tsx tools/build-tts.ts --episode u1e1
```

Requires: script turns in `src/data/u1e1/turns.json` (from director output or manual).
Output: `tts/u1e1/*.mp3`

## Step 3: Timing (Vosk word alignment)

```bat
npx tsx tools/build-timing.ts --episode u1e1
```

Output: `src/data/u1e1/timing_map.json`, `word_times.json`

## Step 4: QA

```bat
npx tsx tools/contact-sheet-components.ts --episode U1E1 --every 8 --scale 0.3
```

## Step 5: Render

```bat
npx tsx tools/render-components.ts --episode U1E1
```

## Notes

- The director NEVER writes seconds — only word anchors. Timing comes from measured Vosk data.
- `src/components/U1E1Episode.tsx` already exists; wire the beats into its `BEATS` array.
- See `PIPELINE.md` for the full pipeline reference.
