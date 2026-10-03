# APUSH Video Series — PLAYBOOK

**Version:** 1.0 (2026-10-02, Workstream A)
**Status:** Canonical where grounded in shipped code; fields not backed by a renderer are marked **PROPOSED**.
**Grounding:** `video/render_narration_fish.py`, `video/pilot_cuba.py`, `video/build_video.py`, `video/motion.py`, `video/cuba_narration.json`, `video/manifests/*.json` (48 manifests), `build/engagement-playbook.md`, `tools/podcast-pipeline/tools/render_audio.py` (pause convention).

**Format:** 1080×1920 vertical. Every video is built in four stages:
1. Author narration JSON → 2. Render TTS to `video/audio/<video>/` MP3s → 3. Render visual scenes sized to measured MP3 durations → 4. Assemble with `build_video.py`.

---

## 1. TTS / Narration Script Format

The narration script is a JSON array of segment objects. This format is **canonical** — it is exactly what `render_narration_fish.py` consumes.

### Fields (canonical)

| Field | Type | Required | Consumed by |
|---|---|---|---|
| `key` | string | yes | Groups segments into one MP3 (`video/audio/<video>/<key>.mp3`). Segments sharing a `key` are synthesized separately, then stitched with ffmpeg concat into one MP3. Keys must be unique per video and must match the scene key in the content JSON. |
| `voice` | string | yes | Selects the reference voice pair. Only two behaviors exist: `"kennedy"` routes to `--quote-reference` / `--quote-reference-text`; **anything else** routes to `--reference` / `--reference-text` (the narrator). Name quote voices after the historical figure (e.g. `"kennedy"`), not generic labels — the name is the casting record. |
| `text` | string | yes | Plain text, passed verbatim as `--text` to `python -m fish_speech.inference`. Output WAV is converted to 128k MP3 (`libmp3lame`) and the WAV deleted. |

### What is NOT consumed

- There is **no emphasis markup** — `render_narration_fish.py` sends `text` raw to the fish CLI. No bold/italics/`<emph>` convention exists. **PROPOSED:** an emphasis convention would need a converter; until one ships, none exists.
- There is **no music/SFX field** — not consumed by anything.

### Pause markup (canonical convention)

Pause tags from the podcast pipeline apply here, since both use the same fish-speech TTS and the same stitching mechanic:

| Markup | Duration | Meaning |
|---|---|---|
| `[short pause]` | 450 ms | Beat between clauses, comic timing |
| `[pause]` | 750 ms | Beat between sentences, pivot between beats |
| `[long pause]` | 1500 ms | Beat before the significance landing, after the hook |

Grounded in `tools/podcast-pipeline/tools/render_audio.py` `_PAUSE_MS = {"short pause": 450, "pause": 750, "long pause": 1500}`. Compatibility note: `render_narration_fish.py` passes `text` straight to fish, which does not interpret pause tags — so tags must be **split out before TTS**: render each text chunk separately, then assemble silence of the tagged length between chunks, exactly like the existing multi-part key stitching (`beat1b`: narrator → kennedy → narrator). This is a PROPOSED extension to `render_narration_fish.py` until someone implements the split-and-stitch step; the tag names and ms values are canonical.

### Word budgets (measured from Cuba v4, 398 words total)

| Segment | Words (Cuba v4) | Budget for 6–8 min videos |
|---|---|---|
| hook | 24 | 25–50 |
| context | 46 | 80–120 |
| beat (1a, 1b, 2, 3a, 3b…) | 25–65 each | 100–160 each, ≤3 beats |
| significance | 57 | 100–140 |
| close | 27 | 50–75 |
| **Total** | **398** | **900–1,200 (≈150 wpm)** |

- A segment longer than ~180 words should be split into `key+a/key+b` sub-segments — scenes stay in the audio-duration window below and viewers get a visual beat per sub-segment.
- Quote segments (`voice` ≠ narrator) get their own key segment; the surrounding narration resumes under the same key grouping (Cuba pattern: `beat1b` = narrator line → kennedy quote → narrator significance line, three TTS parts, one MP3).
- Transition glue ("now," "okay, so," "and so") is structural, not filler — 6–12 per video, written deliberately.
- Second-person address at ~15/1k words; never 200+ words without a "you."
- "Remember this" importance flags: ~1 per video, reserved for genuine exam-movers.

---

## 2. Content JSON Schema

The content JSON is the per-video authoring file: one entry per scene, mapping a narration key to a visual scene. **This schema is PROPOSED except where noted** — the Cuba v4 pilot builds scenes in Python (`pilot_cuba.py`), not from JSON. The renderer that would consume it is a `pilot_*.py`-style builder that instantiates `motion.py` primitives.

### Top-level (PROPOSED)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Video name; must match the manifest `name` and `video/audio/<name>/` |
| `audio_dir` | string | yes | e.g. `video/audio/<name>/` — where the MP3s live |
| `scenes` | array of scene objects | yes | One per narration key, in play order |

### Scene object

| Field | Type | Required | Consumed by | Notes |
|---|---|---|---|---|
| `key` | string | yes | Builder matches to `<key>.mp3` | Must exactly match a narration segment `key` and a manifest `plan` stage name |
| `type` | string | yes | Builder dispatches to `motion.py` | Canonical values only (see §4); no invented types |
| `duration_pad` | number | no | `motion.dur(path, pad)` | Seconds added over measured MP3 duration. Default `1.2` (pilot convention). `0` for grading-video tight timing |
| `annotations` | array of `(at, dur, kind, kwargs)` | no | `motion.annotate` | The 12-second rule: at least one annotation per 12s of scene. Canonical kinds only: `term`, `label`, `point`, `arrow`, `pop` |
| `params` | object | yes | Varies by `type` | Type-specific params (see table below). Images in `params` must be local repo paths (`video/assets/...`) — local-only rule |

### Type → canonical params

| `type` | `motion.py` function | Canonical params |
|---|---|---|
| `kinetic_text` | `kinetic_text(phrase, dur, sub, color, bg_img, darken)` | `phrase`, `sub`, `bg_img` |
| `timeline` | `timeline_scene(events, dur, title, bg_img, darken)` | `events` = list of `[label, caption]`, `title`, `bg_img` |
| `doc_zoom` | `doc_zoom(img_path, dur, highlight_box, caption, zoom)` | `img_path`, `highlight_box` `[x0,y0,x1,y1]` 0..1, `caption` |
| `bullet_slide` | `bullet_slide(title, bullets, dur, footer, bg_img, darken, stagger)` | `title`, `bullets` list, `footer` |
| `title_card` | `title_card(text, dur, sub, bg_img, darken)` | `text`, `sub` |
| `typewriter` | `typewriter_scene(text, dur, bg_img, darken, sub)` | `text` (the quote), `sub` (attribution) |
| `zoom_to` | `zoom_to(img_path, dur, cx, cy, end_zoom, zoom_dur, caption, highlight_box)` | `img_path`, `cx`, `cy` (0..1 focus point), `end_zoom`, `caption` |
| `callout` | `callout_scene(img_path, dur, points, caption)` | `points` = list of `[cx, cy, label]` 0..1 |
| `camera_path` | `camera_path(img_path, dur, waypoints, caption)` | `waypoints` = list of `[cx, cy, zoom]` 0..1 |
| `caption` | `caption_scene(img_path, caption, dur, zoom, pan_x, pan_y)` | `img_path`, `caption`, `zoom`, `pan_x`, `pan_y` |
| `kb` | `kb_scene(img_path, dur, zoom, pan_x, pan_y)` | `img_path`, `zoom`, `pan_x`, `pan_y` |
| `title` | `title_scene(img_path, title, sub, dur)` | `img_path`, `title`, `sub` |
| `slide` | `slide_scene(pil_img, dur)` | `image` (pre-rendered markup PNG, 1080×1920) |

### Annotation kinds (canonical — `motion.annotate`)

Each annotation is `(at, dur, kind, kwargs)`; `at` and `dur` in seconds.

| Kind | kwargs | Visual |
|---|---|---|
| `term` | `term`, `gloss` | Lower-third key-term card with gloss |
| `label` | `text`, `x`, `y` (0..1) | Floating label at a position |
| `point` | `text` | Big centered "so what" statement |
| `arrow` | `text`, `x`, `y`, `lx`, `ly` | Gold label with leader line to a point of interest |
| `pop` | `text` | Playful tilted word slam for fun beats |

### Non-canonical fields

The following are NOT in `motion.py` or any builder and are **PROPOSED only**: `duration_pad` (builder parameter, not in motion), `footer` on bullet slides is in motion (canonical), any `music`/`sfx` field, any per-scene `emphasis` styling, and any `callback_ref` field (callbacks are written into narration text, not metadata).

---

## 3. Manifest Schema (canonical)

Every file in `video/manifests/*.json` — all 48 reconciled into this one schema. Drift analysis: **zero structural drift** — all 48 manifests share the exact same key set and the same plan-pair shape. What differs is only per-video data.

```json
{
  "name": "video10",
  "module": "render_v10",
  "stage_dir": "markup10",
  "out": "2023-leq3-6of6-graded.mp4",
  "plan": [["s1", "a.mp3"], ["s2", "b.mp3"]]
}
```

| Field | Type | Required | Canonical convention |
|---|---|---|---|
| `name` | string | yes | Equals the filename stem (`video10.json` → `"video10"`). Also selects `video/audio/<name>/` as the audio dir. |
| `module` | string | yes | The Python renderer module with a `STAGES` dict (`render_v10`). Convention: `render_v<N>` for manifest `video<N>`. |
| `stage_dir` | string | yes | Where stage PNGs render, relative to `video/` (`markup10`). Convention: `markup<N>` for `video<N>`. |
| `out` | string | yes | Final MP4 filename, written to `video/`. Convention: descriptive slug, e.g. `2023-leq3-6of6-graded.mp4`, `2024-dbq-7of7-graded.mp4`. |
| `plan` | array of `[stage, audio]` pairs | yes | Ordered. `stage` must exist in the module's `STAGES`. `audio` is either a plain MP3 filename string (stage owns that MP3's full duration) or a dict `{"mp3": x, "share": n}` meaning n stages split that MP3's duration equally. |

**Drift notes found:**
1. `build_video.py` supports the `{"mp3", "share"}` dict plan pair, and its hard-coded `VIDEOS` entries (video1–video5) use it heavily — but **no manifest uses the dict form**; all 326 plan pairs across 48 manifests are plain `[stage, mp3]` strings. The two formats coexist but manifest builders only ever use strings.
2. `DEFAULT_OUT` in `build_video.py` has entries for video1–video5, and `_load_manifests()` sets `DEFAULT_OUT[m["name"]] = m["out"]` for every manifest — manifests cleanly override/add. No collision (no manifest is named video1–video5).
3. Audio filenames in manifests are opaque (`a.mp3`…`h.mp3`) while the Cuba pilot uses descriptive names (`hook.mp3`, `beat1b.mp3`). Convention for new videos: **descriptive, key-matched names** (`hook.mp3`, `context.mp3`, `beat1a.mp3`) — matches the narration `key` and the content-scene `key`, making the whole chain greppable. The `a.mp3` style is legacy.
4. Plan lengths vary 5–10 stages per manifest (grading videos), which is why there is no fixed stage count in the schema.

---

## 4. Rendering Spec

### Canvas
1080×1920 vertical. 30 fps. x264 (`libx264`, crf 22, preset veryfast in `build_video.py`; medium in `motion.assemble`). Text in bundled DejaVu Sans / Bold (`video/fonts/`). House palette: gold `(233, 196, 106)`, white `(240, 242, 246)`, dim gray `(160, 166, 180)` on near-black `(10–20)`.

### Scene primitives (canonical — all in `motion.py`)

**Base layers:**
- `kb_scene(img_path, dur, zoom=0.14, pan_x=0.5, pan_y=0.5)` — Ken Burns full-bleed pan/zoom. `pan_x/pan_y` in [0,1] = drift target. Default zoom 0.14.
- `slide_scene(pil_img, dur)` — static presentation slide (pre-rendered markup PNGs from `render_v*.py`). Resized to 1080×1920 if needed.
- `overlay_text(base, text, fnt_path, size, dur, y_pos=None, slide=140, fill=...)` — slide-up + fade text over any base clip. Default slides up 140px over 0.6s.

**Text-forward scenes:**
- `kinetic_text(phrase, dur, sub=None, color=gold, bg_img=None, darken=110)` — big phrase slamming in with spring pop (`ease_out_back`), over image or dark. Use for hooks and thesis statements.
- `title_card(text, dur, sub=None, bg_img=None, darken=120)` — static centered card.
- `typewriter_scene(text, dur, bg_img=None, darken=120, sub=None)` — text types itself live; **the quote scene**. Use for every historical-voice quote segment.
- `bullet_slide(title, bullets, dur, footer="", bg_img=None, darken=130, stagger=0.45)` — bullets slam in staggered with spring overshoot. `stagger` = seconds between bullets.
- `caption_scene(img_path, caption, dur, **kb_kw)` — Ken Burns + gradient scrim + caption bar sliding up from bottom.
- `title_scene(img_path, title, sub, dur)` — title card over a darkened image, title in gold fade-in.

**Image-forward scenes:**
- `doc_zoom(img_path, dur, highlight_box=None, caption="", zoom=0.35)` — slow push-in on a document/photo; `highlight_box` (0..1 coords) draws a gold box fading in at 35% of duration. Use for document teardowns.
- `zoom_to(img_path, dur, cx=0.5, cy=0.5, end_zoom=2.2, zoom_dur=1.4, caption="", highlight_box=None)` — fast directed zoom onto a point of interest with ease-out, then hold. Use for "look here" beats (U-2 photo).
- `callout_scene(img_path, dur, points, caption="")` — expanding gold ripple rings landing on `points` (`(cx, cy, label)` 0..1), in sequence. Use for maps with multiple points.
- `camera_path(img_path, dur, waypoints, caption="")` — waypoint camera: `waypoints` = `[(cx, cy, zoom)]`; zoom < current zooms out; time split evenly across segments, eased in-out. Use for "pull back to reveal" moves.
- `cuba_map_scene(dur, caption="")` — **one-off, not canonical**: hard-coded Cuba 1962 map. The pattern to replicate is a purpose-built animated map scene per topic, not reuse of this function.

**Overlay layer (the 12-second rule lives here):**
- `annotate(base_clip, notes)` — notes = `[(at, dur, kind, kwargs)]`; kinds `term`/`label`/`point`/`arrow`/`pop` (see §2). Each note springs in over 0.35s, holds, fades out over the last 0.25s. Stack multiple per scene for pace.
- `punch_in(clip, amount=0.07, dur=0.5)` — quick zoom punch at scene start (1+amount → 1.0, ease-out). The modern punch-cut feel; replaces soft fade-ins.

**Easing functions:** `ease_out_back` (overshoot/slam), `ease_out_cubic` (zoom settle), `ease_in_out_cubic` (camera moves).

**Assembly:**
- `assemble(scenes, audios, out, fps=30)` — concatenates with 0.35s crossfades (`padding=-0.2`), places each scene's narration audio at its (overlap-adjusted) start time, writes MP4 with AAC. `assert len(scenes) == len(audios)`.
- `build_video.py` (grading-video path): renders each stage's PNG from `STAGES`, measures each MP3 with ffprobe, sizes each stage to the measured duration (or duration/share), encodes per-stage segments, concats, muxes the full narration track. `--out` overrides the manifest `out`.

### Timing rules

1. **Audio-duration matching (law):** scenes are sized to *measured* MP3 length via ffprobe — never assumed, never estimated from word count. Use `motion.dur(path, pad=1.2)` (pilot path, 1.2s breathing room) or `build_video.py`'s exact measurement (grading path, 0 pad).
2. **The 12-second visual-point rule:** at least one annotation overlay or visual beat every 12 seconds of scene time. In the Cuba pilot this means 1–4 `annotate` notes per scene. A scene longer than ~35s must be split into sub-scenes.
3. **Scene duration bounds:** minimum ~4s (shorter breaks the punch-in/annotation motion), maximum ~35s before a split. Typical narration segments run 10–25s.
4. **Quote scenes:** `typewriter_scene` duration must let the quote type at a readable rate — the text completes at 85% of `dur`, so size generously; the historical voice MP3 sets the floor.
5. **Crossfades:** 0.35s between scenes (`assemble`); audio is placed per-scene-start so narration never bleeds into the wrong visual.
6. **Breathing room:** the 1.2s `dur()` pad is for motion to settle (pop, ring ripple) after narration ends. Don't pad tighter than 0.8s.

### Asset rules
- All images local in the repo (`video/assets/<topic>/`) — **local-only rule**: every image downloaded into the repo, references rewritten to local paths, original URLs kept as provenance. No hotlinked URLs anywhere in content JSON or builders.
- Pre-1930 primary sources are public domain — quotable verbatim; ideal for quote scenes. Post-1929 sources get paraphrase/original treatment.

---

## 5. Series Format Spec

### Length
**6–8 minutes per video** (~900–1,200 words at ~150 wpm). This extends the engagement-playbook's 5-min/750-word scale: same skeleton, one beat of extra room.

### Episode skeleton (canonical)

| Beat | Time | Words | Function |
|---|---|---|---|
| Hook | 0:00–0:20 | ~25–50 | One of the hook types below. End with the start-ritual catchphrase. |
| Context frame | 0:20–1:00 | ~80–120 | "Here's where we are." Situate the topic; ≥1 callback to an earlier video. |
| Beat 1 | 1:00–2:30 | ~150 | First enumerated chunk. "First" (or equivalent) — enumeration is THE chunking device. |
| Beat 2 | 2:30–4:00 | ~150 | "Second…" — the complication or the other side. |
| Beat 3 | 4:00–5:15 | ~130 | "Third…" — consequences, or the twist. 3 enumerated beats max. |
| Significance landing | 5:15–6:15 | ~100–140 | "The point is…" — why this matters, what it caused, what it explains. The most important beat. |
| Ritual close | 6:15–end | ~50–75 | Final sentence → dual call-to-action (next video + study resource) → signature sign-off. Never improvise. |

### Hook taxonomy (measured across 205 transcripts)

| Type | Share | When to use |
|---|---|---|
| Continuity bridge | ~40% | Series episodes following another — names last video, pivots to today's consequence. Default for in-series episodes. |
| Topic announcement + intensifier | ~30% | Standalone episodes — states the topic directly, energy carries it. |
| Second-person empathy | ~15% | Anxiety-prone topics — addresses the viewer's state first. |
| Bold framing claim | ~10% | Counterintuitive topics — a claim the video then earns. |
| Rally | ~5% | Cram/review episodes only. |

**Hooks are never questions** (190/205 don't open with one). Declarations with energy win.

### The 5 differentiation openings (verified absences in the competitor's 205 videos — format we own)

1. **Uncertainty beat** — open with "what historians still argue about." Teaches historiography and serves the DBQ complexity point (the worst 2025 student score: 0.15/1).
2. **Counterfactual cold-open** — 30-second "what if" ("What if the South had won at Gettysburg? It wouldn't have mattered — here's why."). Irresistible hook, forces causal reasoning.
3. **Primary-source voices** — open beats with a 1–2 sentence direct quote from a letter, speech, or diary (pre-1930 = public domain), then unpack it. SAQ/DBQ sourcing practice smuggled into content.
4. **Visual-first** — every beat *shows* something: animated maps, timelines, documents. We're motion-graphics; the competitor is talking-head. The format gap is bigger than any content gap.
5. **Present-tense immersion** — present-tense sequences for pivotal moments ("It's 1773. You're a Boston merchant…"). Use sparingly.

### Series constants (non-negotiable)
- **≥1 callback per episode** — explicit reference to an earlier video. Retention engine disguised as pedagogy.
- **Every fact gets its "so what"** — fact → "the point is" → consequence. Never leave a fact without its consequence attached.
- **Deliberate key-term repetition** — the central concept's name 5–8× per video, varied sentence positions.
- **Implicit exam pressure, not explicit** — one "need to know" per beat; technique lives in the grading-walkthrough series. Never explain the test.

### Anti-patterns
- Don't open with a question.
- Don't exceed 5 beats (3 enumerated chunks in our format).
- Don't explain the test.
- Don't stack humor in dense factual passages — jokes are transition sugar.
- Don't improvise the close — the ritual close formula is fixed.
- Don't be neutral to a fault — take clear stances; hedged history is forgettable.
- Don't copy the competitor's lines, jokes, or catchphrases — mechanics only, always.

---

## 6. Build Checklist (per video)

1. Author narration JSON (`video/<name>_narration.json`): `key`/`voice`/`text` segments, ≤3 beats, word budgets above, ≥1 callback, significance hammer on every beat.
2. Render TTS with `render_narration_fish.py` (5090, fish-speech + torch) → `video/audio/<name>/<key>.mp3` (128k). Multi-voice keys stitched via ffmpeg concat. Pause tags split out, silence stitched in (PROPOSED — until implemented, write pauses as sentence breaks).
3. Measure durations (`ffprobe`) — scene sizing comes from this, never from word estimates.
4. Author content JSON (§2 schema) → build scenes with `motion.py` primitives + `annotate` (12s rule).
5. Write manifest `video/manifests/<name>.json` (§3 schema, canonical).
6. `python build_video.py <name>` → verify MP4.
7. Commit everything on `main`. Audio MP3s are committed (rebuilds need no TTS step).
