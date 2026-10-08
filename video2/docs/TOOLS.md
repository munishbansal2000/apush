# Tools reference

Every tool is a CLI under `tools/`, run through an npm script. All of them:

- take `--episode <id>` (default `u1e3`; ids come from `src/episodes/registry.ts`),
- resolve paths from the project root,
- honour these environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `PUBLIC_DIR` | `public/` | Where images, audio, heads, sfx live (Remotion's `staticFile` root) |
| `IMAGES_MANIFEST` | `data/images.json` | Image manifest to read/write |
| `REMOTION_BROWSER` | (Remotion's headless shell) | Path to a Chrome binary when the shell download is unavailable |

Scripts marked **logged** run through `tools/log.sh`: full output, timestamped, goes to
`out/logs/<name>-<YYYYmmdd-HHMMSS>.log` and `out/logs/<name>-latest.log`; the exit code is
preserved.

---

## Setup & packaging

### `npm run setup`
Rebuilds everything that is downloaded or generated (fresh checkout → renderable episode):
`ensure-data` (empty `word_times.json`, `levels.json`, `images.lock.json` if missing) →
`build:turns` → `build:tts` → `placeholder-audio` → `build:timing` → `make:sfx` →
`placeholder-heads` → `fetch:images` → `sync:manifest` → `validate`. Safe to re-run: placeholders
never overwrite real files, and `fetch:images` is incremental.

### `npm run setup:practice`
Builds the unit practice video from `data/practice/u1.json`: generates `script/u1-practice.md`
(`build-practice-script`), then runs the normal pipeline for episode `u1-practice` and validates.
Part of `npm run setup`.

### `npm run export:quiz`
`data/practice/<unit>.json` → `out/<unit>-quiz.csv` (Number, Question, Source excerpt, Type, CED
topic, Model answer; import into Google Forms or an LMS) and `out/<unit>-answer-key.md`.

### `npm run render:practice`
Full practice video (`U1-PRACTICE`) with the per-frame guard. Its Shorts are compositions
`U1-PRACTICE-Q1…`, one per question.

### `npm run placeholder-heads`
Dev head art for each speaker in `render-config.json` (skips files that exist).

### `npm run package`
Source-only zip at `dist/apush-episode-kit.zip`: excludes `node_modules/`, `out/`, `public/`,
`tts/`, and generated data (turns, timing, levels, word times, image lock).

## Pipeline order

```
script/<ep>.vN.md
   │ build:turns ──────────────► data/<ep>/turns.json
   │ build:tts   ──────────────► tts/<ep>/tNN.txt + index.json   → send to Fish Audio
   │ (Fish renders)            ► public/audio/<ep>/tNN.mp3
   │ build:timing ─────────────► data/<ep>/timing_map.json + levels.json
   │ import:vosk ──────────────► data/<ep>/word_times.json
   │ fetch:images ─────────────► public/historic/**  + data/images.lock.json
   │ sync:manifest ────────────► data/images.json (used_in)
   │ validate / validate:prod ─► pass/fail gate
   │ contact-sheet / preview ──► stills / motion reel + runtime layout reports
   └ render / render:shorts ───► out/<id>.mp4 + per-frame layout report

data/practice/<unit>.json
   │ build-practice-script ────► script/<unit>-practice.md   (then the same pipeline, --episode <unit>-practice)
   │ export:quiz ──────────────► out/<unit>-quiz.csv + out/<unit>-answer-key.md
   └ render:practice ──────────► out/u1-practice.mp4 (+ Shorts U1-PRACTICE-Qn)
```

---

## Authoring & data

### `npm run build:turns`
Parse the script into turns. **The script is the only place turns are authored.**

| | |
|---|---|
| Reads | `spec.script` (e.g. `script/u1e3.v10.md`), `data/style-rules.json` (speakers) |
| Writes | `data/<ep>/turns.json` (`meta` + `turns[]`, pause and speech turns, holds, tags) |
| Exit 1 | parse errors (S001 unparseable line, S002 unknown speaker); printed with line numbers |
| Run when | the script changes (the validator fails with T001 until you do) |

### `npm run build:tts [-- --emotion]`
Write the exact text to send to the TTS voice.

| | |
|---|---|
| Reads | `turns.json`, `data/pronunciations.json` |
| Writes | `tts/<ep>/tNN.txt` (one per speech turn), `tts/<ep>/index.json` (speaker, text, hash) |
| `--emotion` | emit `{soft tone}` tags as Fish `(soft tone)` markers (off by default) |
| Applies | pronunciation respellings (longest term first), number rules (`1500s` → `fifteen hundreds`), em dash → comma |

### `npm run build:timing`
Lay out the episode timeline from the real audio. **Timing is derived, never typed.**

| | |
|---|---|
| Reads | `public/audio/<ep>/tNN.mp3` (ffprobe), `turns.json`, `tts/<ep>/index.json`, `render-config.json timing` |
| Writes | `data/<ep>/timing_map.json` (starts, durations, totalSec, per-turn TTS hash), `data/<ep>/levels.json` (per-frame loudness 0..1 per clip, drives the head bounce) |
| Gaps | `gapSec` between turns, `shortReplyGapSec` before ≤5-word replies, `[hold Ns]` overrides |
| Exit 1 | any speech turn's mp3 is missing (lists them) |
| Run when | any audio file changes |

### `npm run import:vosk [-- --dir vosk/u1e3]`
Convert Vosk word alignments into word timings that anchors use.

| | |
|---|---|
| Reads | `<dir>/tNN.json` (Vosk `SetWords(True)` output: `{ result: [{word,start,end}] }`) |
| Writes | `data/<ep>/word_times.json` |
| Effect | anchors switch from *estimated* to *measured* (A003 clears; required by `validate:prod`) |

### `npm run fetch:images [-- --force | --only <path> | --all | --search "<query>"]` — logged
Download the real images from their `source_url`, replacing placeholders. **Incremental.**

| | |
|---|---|
| Reads | `images.json` entries used by the episode (or all with `--all`) |
| Writes | `public/<path>` (normalized JPEG), `data/images.lock.json` (source_url, sha256, width, height, Commons license, fetchedAt) |
| Skips | files whose hash matches the lock and whose `source_url` is unchanged |
| Fetches | missing files, placeholders (not in lock), changed sources, hand-edited files |
| `--force` | refetch everything selected |
| `--only <path>` | one image |
| `--search "<q>"` | list Commons candidates (license, size, date, URL) and exit |
| Checks | Commons API license vs manifest license; decodes as an image; warns under 1280 px wide |
| Retries | 429/5xx with backoff (Commons rate-limits bursts) |
| Exit 1 | any image not fetched (reasons listed); "soft" size warnings don't fail |

### `npm run sync:manifest`
Regenerate this episode's `used_in` entries in `images.json` from the beats. Other episodes'
entries are untouched. Images referenced by beats but missing from the manifest are listed (add
them by hand with license, source_url, credit).

### `npm run make:sfx` · `npm run placeholder-audio`
**Dev placeholders only.** `make:sfx` synthesizes `public/sfx/{hit,check,whoosh,tick}.wav` and
`public/music/bed.mp3` with ffmpeg. `placeholder-audio` speaks each `tts/<ep>/tNN.txt` with macOS
`say` (or writes silence) into `public/audio/<ep>/`. Replace both before production.

---

## Validation

### `npm run validate [-- --json | --no-audio]` — logged
### `npm run validate:prod` (`--strict`) — logged
The pre-render gate. Pure checks over the script, data, compiled episode, images and audio.

| | |
|---|---|
| Reads | everything in `data/`, the script, `public/` (existence, hashes), audio durations (ffprobe) |
| Output | issues sorted error → warn → info, then a stats line (turns, beats, duration, coverage, anchors, auto-fixes, variety/min, traps, terms, years) |
| `--json` | `{ stats, issues }` for tools/CI |
| `--no-audio` | skip ffprobe (fast script-only pass before TTS exists) |
| `--strict` | escalates: estimated anchors (A003), unapproved pronunciations (S021), missing credits (I005), unfetched images (I009), unverified regions/marks (I008/I011) |
| Exit 1 | any error |

Codes: see the table in `README.md`. Info-level `L0xx` lines are automatic layout fixes.

### `npm run check`
Typecheck + ESLint (episode-file rules) + unit tests + validate. Use in CI.

---

## Review

### `npm run contact-sheet [-- --every N]` — logged
Render stills at every turn start, every beat (+0.5 s), the middle of every pause and the final
second; tile them into one image.

| | |
|---|---|
| Writes | `out/<ep>-contact.png`, `out/<ep>-contact.txt` (tile → frame → label), `out/<ep>-stills/*.png`, `out/<ep>-layout.json` (runtime guard reports) |
| Guard | collects `[kit-layout]` reports from the browser for every still |
| Exit 1 | blank frames, or any guard issue other than `unsafe` |

### `npm run preview -- --all-new | --beat <id> | --at <sec> [--len N]` — logged
Render motion: short clips joined into one reel.

| | |
|---|---|
| `--all-new` | one clip per showcase element (routes, ranges, tours, documents, figures, boards, questions, ledgers, pictograms, list cards, focus push-ins, traps), a chapter banner, the episode-sheet finale |
| `--beat <id>` | one beat, 1 s before to 0.5 s after |
| `--at <sec> --len N` | any window |
| `--keep-clips` | keep the individual clips |
| Writes | `out/preview/<ep>-reel.mp4`, `out/preview/<ep>-reel.txt` (reel time → clip → episode time), `out/logs/preview-layout-latest.jsonl` |
| Ends with | a runtime guard summary (issue, frame count, first frame) |

### `npm run studio`
Remotion Studio. The debug overlay (turn, speaker, tone, time) and red guard outlines appear only here.

---

## Render & export

### `npm run render [-- --frames A-B | --id <composition>]` — logged
Validate, then render with the runtime layout guard on **every** frame.

| | |
|---|---|
| Writes | `out/<id>.mp4`, `out/logs/render-layout-latest.jsonl` (one line per guard report), `out/logs/render-browser-latest.log` (other browser messages) |
| Prints | progress every 5 %; guard summary (distinct issues, frames, first frame) |
| Note | the composition refuses to render if compile errors exist (`assertRenderable`) |

### `npm run render:shorts` — logged
Renders `U1E3-BOX1…4` (9:16) to `out/u1e3-boxN.mp4`, guard included.

### `npm run captions` · `npm run chapters`
`captions` → `out/<ep>.srt` (same chunks the shell burns in). `chapters` → `out/<ep>.chapters.txt`
(YouTube format; fails unless the first chapter is at 0:00).

---

## Logs

| File | Contents |
|---|---|
| `out/logs/<name>-<stamp>.log` / `-latest.log` | full console output of a logged script, timestamped, with command and exit code |
| `out/logs/render-layout-latest.jsonl` | `{"frame":N,"issues":[{kind,id,other?,detail,rect}]}` per frame with issues |
| `out/logs/preview-layout-latest.jsonl` | same, for preview clips |
| `out/<ep>-layout.json` | guard issues for contact-sheet stills |
| `out/logs/render-browser-latest.log` | non-guard browser console output |

Guard kinds: `cut` (past the frame edge), `unsafe` (outside the safe area), `overlap` (two
elements, or two parts inside one component), `clipped` (text cut off by its container).

---

## Motion tools

For motion scenes built from `src/motion` (see docs/MOTION.md). Prototype: `ExchangeCrossing`.

### `npm run build:prototype` · `npm run build:prototype:words`
`tools/build-prototype.ts`: narration clips (macOS `say`) → `public/audio/prototype/sN.mp3` and
`src/data/prototype/exchange.json` (sentence `start`/`dur`). `--no-say` re-measures existing
clips. `--word-times` adds `words: [{w, s, e}]` per sentence (seconds from the clip start).
No ASR is installed (no Vosk / whisper), so word times come from the TTS itself: every
boundary is estimated twice — the duration of the spoken prefix (words before it) and the
speech end minus the duration of the spoken suffix (words after it) — averaged, then snapped
to real pauses that `silencedetect` finds in the clip. It prints its own error stats (≈50 ms
at pauses; ±~0.1 s inside phrases). Only valid while the clips are `say` output; for real
voices use Vosk (`import:vosk`). Without `--word-times`, word times are kept for unchanged
sentences. The scene's `wordAt()` uses them when present, else an evenly-spaced estimate.

### `npm run make:motion-sfx`
`tools/make-motion-sfx.ts`: synthesizes placeholder cue sounds with ffmpeg into `public/sfx/`:
`creak` (wood creak), `thud` (low boom), `pen` (paper scratch), `drum` (snare), `bell`, `crowd`
(murmur), `quill`, `whoosh-soft` (camera moves). Skips existing files unless `--force`.
Names/lengths/default levels live in `SFX` in `src/motion/sound.tsx`.

### Sound cues (`src/motion/sound.tsx`)
`<Sfx at name volume?>` = frame-accurate `<Sequence>` + `<Audio>`. Derive cues from the
values the visuals use: `cues.ship({start,end})` (creak; `dock` adds a bell), `cues.flow({start})`
(whoosh), `cues.spread({start,towns,perTown})` (thud per struck town), `cues.list(items)` (tick
per item), `cues.camera(CAMERA)` (soft whoosh per move, louder for bigger moves),
`cues.slide({at,out})` (quiet whoosh). Merge with `useCues(...)` (sorts, thins same-name cues
< 80 ms apart) and render once with `<SoundTrack cues>`. `<MusicBed src duck={sentences}>`
loops a bed and ducks it under every narration span with smooth ramps (`musicLevel()`).

### `npm run check:storyboard`
`tools/check-storyboard.ts` (logic in `src/motion/storyboard.ts`): checks
`src/data/storyboards/<id>.json` (one shot per sentence: `camera`, `action`, `shows`,
`elements`; elements have narration-anchored windows `{s, word?, dt?}`). `--id`, `--json`,
`--timeline`. Errors: `SB001` shot without action · `SB002` nothing moves in the first 5 s ·
`SB003` > 4 s with nothing entering/moving · `SB004` same camera 3× in a row · `SB005` unknown
element · `SB006` sentence without a shot (or duplicate) · `SB007` unresolvable/inverted window ·
`SB008` unknown camera. Warnings: `SB009` no `shows` · `SB010` a shot's elements are idle during
its sentence · `SB011` unused element. Exit 1 on errors. **Logged.**

### `npm run motion-check`
`tools/motion-check.ts`: on a rendered `out/<id>.mp4` (`--id`, default `exchangecrossing`; or
`--file`), runs ffmpeg `freezedetect` (`--noise -50dB`, `--max 4` s) and per-frame scene-change
scores. Prints frozen stretches > `--max`, the longest static span, scene-change mean / hard
cuts, and (info only) low-change spans (`--still-score`). Writes
`out/logs/motion-check-<id>.json`. Exit 1 if any frozen stretch exceeds `--max`. **Logged.**

### Render guard summary (`tools/render.ts`)
After a render, one line per distinct guard issue: kind, the guard item names involved
(`town:Havana × flow:DISEASE`), its track, frame count and the time spans in seconds; full
summary in `out/logs/render-issues-latest.json`.
