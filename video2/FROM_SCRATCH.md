# From Scratch: U1E1 (no TTS, no data yet)

U1E1 has a component (`src/components/U1E1Episode.tsx`) but no script, turns, timing, or TTS.
This is the from-scratch path.

## Step 1: Director (meta.ai)

1. Open https://www.meta.ai/ (meta_ui)
2. Paste the contents of `director-prompt-v13-remotion.txt` as the system prompt
3. Provide your locked two-host script (Maya + Marcus dialogue)
4. The director outputs a JSON scene plan with beats (word-anchored, not seconds)

Save the output as `src/data/u1e1/beats.json` (or feed it to the episode component).

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
