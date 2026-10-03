# APUSH Video Series — PLAYBOOK

**Version:** 1.2 (2026-10-02, FUN-CATALOG integration: engagement layer §6, specified-but-unbuilt primitive inventory, TTS direction tags)
**Status:** Canonical where grounded in shipped code; fields not backed by a renderer are marked **PROPOSED**; FUN-CATALOG-specified primitives are marked **SPECIFIED-BUT-UNBUILT** (never presented as existing).
**Grounding:** `video/render_narration_fish.py`, `video/pilot_cuba.py`, `video/build_video.py`, `video/motion.py`, `video/cuba_narration.json`, `video/manifests/*.json` (48 manifests), `build/engagement-playbook.md`, `tools/podcast-pipeline/tools/render_audio.py` (pause convention), `video/FUN-CATALOG.md` (26 ranked engagement techniques).

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

### TTS direction tags (PROPOSED — FUN-CATALOG #20)

Script-level performance direction, parsed *before* TTS (pending a parser + segment-handling step in `render_narration_fish.py`; the fish rendering itself is unchanged). Strategic silence is the most underused tool in TTS video — a 0.8s pause before the answer lands harder than any graphic.

| Tag | Effect |
|---|---|
| `[pause:N]` | Silence of N seconds (e.g. `[pause:0.8]`; `[pause:3]` for the viewer-question card, FUN-CATALOG #8) |
| `[beat]` | 0.4s micro-pause (comic timing, pre-quote beats) |
| `[slow]` / `[fast]` | Rate shift for a clause (`[fast]` + `atempo=1.25` renders rapid-fire lists, FUN-CATALOG #24) |
| `[emphasis]` | Render the clause as its own segment so it can be slightly louder/slower in the mix |
| `[TIP]...[/TIP]` | Exam-tip aside (FUN-CATALOG #4) → gold `pop` slam + `tip_sting` SFX cue |
| `[MEMORIZE]` | "Remember this" memory-cue card cue (FUN-CATALOG #5) |

**Reconciliation:** the `[short pause]`/`[pause]`/`[long pause]` names above stay valid — the parser treats them as `[pause:0.45]`/`[pause:0.75]`/`[pause:1.5]` aliases. The `[pause:N]` form is the forward convention for new scripts. Until the parser ships, write pauses as sentence breaks (PRODUCTION-GUIDE Part 3).

**Voice-field generalization (FUN-CATALOG #3/#25):** the `voice` field may hold any registered voice — `narrator`, figure-named quote voices (`"kennedy"`, `"columbus"` — the name is the casting record), or roles like `"skeptic"` for debate segments. Each voice gets its own reference audio + exact transcript. The two-behavior routing in `render_narration_fish.py` today is the mechanism; the generalization is the voice-registry convention on top of it. New voices register with the renderer (cf. `validate_video.py` `ALLOWED_VOICES`).

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
| `kinetic_text` | `kinetic_text(phrase, dur, sub, color, bg_img, darken)` | `phrase`, `sub`, `bg_img` **(REQUIRED)** |
| `timeline` | `timeline_scene(events, dur, title, bg_img, darken)` | `events` = list of `[label, caption]`, `title`, `bg_img` **(REQUIRED)** |
| `doc_zoom` | `doc_zoom(img_path, dur, highlight_box, caption, zoom)` | `img_path`, `highlight_box` `[x0,y0,x1,y1]` 0..1, `caption` |
| `bullet_slide` | `bullet_slide(title, bullets, dur, footer, bg_img, darken, stagger)` | `title`, `bullets` list, `footer`, `bg_img` **(REQUIRED)** |
| `title_card` | `title_card(text, dur, sub, bg_img, darken)` | `text`, `sub`, `bg_img` **(REQUIRED)** |
| `typewriter` | `typewriter_scene(text, dur, bg_img, darken, sub)` | `text` (the quote), `sub` (attribution), `bg_img` **(REQUIRED)** |
| `zoom_to` | `zoom_to(img_path, dur, cx, cy, end_zoom, zoom_dur, caption, highlight_box)` | `img_path`, `cx`, `cy` (0..1 focus point), `end_zoom`, `caption` |
| `callout` | `callout_scene(img_path, dur, points, caption)` | `points` = list of `[cx, cy, label]` 0..1 |
| `camera_path` | `camera_path(img_path, dur, waypoints, caption)` | `waypoints` = list of `[cx, cy, zoom]` 0..1 |
| `caption` | `caption_scene(img_path, caption, dur, zoom, pan_x, pan_y)` | `img_path`, `caption`, `zoom`, `pan_x`, `pan_y` |
| `kb` | `kb_scene(img_path, dur, zoom, pan_x, pan_y)` | `img_path`, `zoom`, `pan_x`, `pan_y` |
| `title` | `title_scene(img_path, title, sub, dur)` | `img_path`, `title`, `sub` |
| `slide` | `slide_scene(pil_img, dur)` | `image` (pre-rendered markup PNG, 1080×1920) |

**Background rule (standing):** `bg_img` is REQUIRED (never optional) on every scene type that takes it. `motion.py` renders a flat near-black frame when `bg_img` is omitted (`kinetic_text`, `timeline`, `bullet_slide`, `title_card`, `typewriter_scene` — verified in source) — that fallback is banned by the no-empty-screen series constant (§5). Every content-JSON scene must name a local `video/assets/...` image as its background source. Scene types that take `img_path` already require it positionally.

### Annotation kinds (canonical — `motion.annotate`)

Each annotation is `(at, dur, kind, kwargs)`; `at` and `dur` in seconds.

| Kind | kwargs | Visual |
|---|---|---|
| `term` | `term`, `gloss` | Lower-third key-term card with gloss, gold side bar |
| `label` | `text`, `x`, `y` (0..1) | Floating label at a position |
| `point` | `text` | Big centered "so what" statement, gold-bordered card |
| `arrow` | `text`, `x`, `y`, `lx`, `ly` | Gold label with leader line to a point of interest |
| `pop` | `text` | Playful tilted word slam for fun beats |

### Non-canonical fields

The following are NOT in `motion.py` or any builder and are **PROPOSED only**: `duration_pad` (builder parameter, not in motion), `footer` on bullet slides is in motion (canonical), any `music`/`sfx` field, any per-scene `emphasis` styling, and any `callback_ref` field (callbacks are written into narration text, not metadata). Engagement-layer pipeline cues (FUN-CATALOG §6) are also PROPOSED until their pipeline steps ship: manifest `sfx` timestamp cues (#18/#19), `gag: <gag_id>` asset cues (#9), `callbacks: [{to_video, beat_ref, line}]` (#26). Do not author them into manifests until the consuming step exists.

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

**Background-source rule (standing, new videos):** every scene in a content-JSON-driven video must specify its background image source — the `motion.py` near-black flat fallbacks are banned (see the no-empty-screen series constant, §5). Manifest authors: `bg_img` is required, never optional.

---

## 4. Rendering Spec

### Canvas
1080×1920 vertical. 30 fps. x264 (`libx264`, crf 22, preset veryfast in `build_video.py`; medium in `motion.assemble`). Text in bundled DejaVu Sans / Bold (`video/fonts/`). House palette: gold `(233, 196, 106)`, white `(240, 242, 246)`, dim gray `(160, 166, 180)` on near-black `(10–20)`.

### Canonical animation vocabulary (all in `motion.py` — verified against the source)

**CAMERA:**
- `kb_scene(img_path, dur, zoom=0.14, pan_x=0.5, pan_y=0.5)` — slow Ken Burns drift, default full-bleed. `pan_x/pan_y` in [0,1] = drift target.
- `zoom_to(img_path, dur, cx=0.5, cy=0.5, end_zoom=2.2, zoom_dur=1.4, caption="", highlight_box=None)` — fast directed punch-zoom with ease-out then hold; optional gold highlight box; **the emphasis move**. Use for "look here" beats (U-2 photo).
- `camera_path(img_path, dur, waypoints, caption="")` — waypoint camera, eased in-out; `waypoints` = `[(cx, cy, zoom)]`; zoom<1 zooms OUT. Time split evenly across segments. Use for "pull back to reveal" moves.
- `doc_zoom(img_path, dur, highlight_box=None, caption="", zoom=0.35)` — slow push-in on documents/photos; highlight box (0..1 coords) fades in on the key passage at 35% of duration; **the sourcing move**. Use for document teardowns.
- `punch_in(clip, amount=0.07, dur=0.5)` — quick 1.07→1.0 zoom punch at scene start with ease-out; replaces soft fade-ins. The modern punch-cut feel.

**TEXT:**
- `typewriter_scene(text, dur, bg_img, darken=120, sub=None)` — char-by-char typing + blinking cursor; **the primary-source quote scene**. Use for every historical-voice quote segment. Text completes at 85% of `dur` — size generously; the historical voice MP3 sets the floor.
- `kinetic_text(phrase, dur, sub=None, color=gold, bg_img, darken=110)` — spring-overshoot slam (`ease_out_back`); for hooks, thesis statements, verdicts, key terms.
- `overlay_text(base, text, fnt_path, size, dur, y_pos=None, slide=140, fill=...)` — slide-up + fade caption over any base clip (slides up 140px over 0.6s).
- `title_card(text, dur, sub=None, bg_img, darken=120)` — static centered card.
- `title_scene(img_path, title, sub, dur)` — title card over a darkened image, title in gold fade-in.
- `bullet_slide(title, bullets, dur, footer="", bg_img, darken=130, stagger=0.45)` — staggered bullets slamming in with spring overshoot; `stagger` = seconds between bullets.

**INFORMATIONAL:**
- `timeline_scene(events, dur, title="", bg_img, darken=150)` — dots + labels pop in sequence along a rail, alternating above/below; `events` = list of `(label, caption)`; dots appear evenly across 85% of `dur`. For sequences and causation.
- `callout_scene(img_path, dur, points, caption="")` — gold rings ripple onto points in sequence with labels; `points` = `(cx, cy, label)` in 0..1. For image analysis.
- `caption_scene(img_path, caption, dur, **kb_kw)` — Ken Burns + gradient scrim + caption bar sliding up from bottom.

**ANNOTATION LAYER (the 12-second rule lives here):**
- `annotate(base_clip, notes)` — notes = `[(at, dur, kind, kwargs)]`; kinds `term`/`label`/`point`/`arrow`/`pop` (see §2). Each note springs in via `ease_out_back` over 0.35s, holds, fades out over the last 0.25s. Stack multiple per scene for pace.
- `slide_scene(pil_img, dur)` — static presentation slide (pre-rendered markup PNGs from `render_v*.py`); the grading-video path primitive. Resized to 1080×1920 if needed.

**EASINGS:** `ease_out_back` (signature — the slam/overshoot), `ease_out_cubic` (zoom settle), `ease_in_out_cubic` (camera moves).

**ASSEMBLY:**
- `assemble(scenes, audios, out, fps=30)` — concatenates with 0.35s crossfades (`padding=-0.2`); per-scene narration auto-placed at overlap-adjusted scene starts (audio never bleeds into the wrong visual); MP4 with AAC. `assert len(scenes) == len(audios)`. Visual timing ALWAYS follows measured audio.
- `build_video.py` (grading-video path): renders each stage's PNG from `STAGES`, measures each MP3 with ffprobe, sizes each stage to the measured duration (or duration/share), encodes per-stage segments, concats, muxes the full narration track. `--out` overrides the manifest `out`.

**SPECIFIED-BUT-UNBUILT primitives (FUN-CATALOG specs — not in `motion.py` yet):**
Do NOT reference these in build scripts, content JSON, or manifests until implemented. `validate_video.py`'s `CANONICAL_PRIMS` deliberately excludes them — that exclusion is intentional, not an oversight.

- `map_scene(map_img, dur, moves)` — MODERATE (~100 lines). **Canonical spec is FUN-CATALOG #17's — it wins over the playbook v1.1 sketch** (`map_scene(map_img, dur, points=None, routes=None, caption="")` from 5978e39, now retired). `map_img`: local repo path (required), the base map image; `moves`: list of `(path_points, at, color, kind)` — `path_points`: polyline in 0..1 coords; `at`: seconds when the move starts; `color`: gold `(233,196,106)` default; `kind` ∈ {`arrow`, `dots`, `fill`}: `arrow` = progressive path draw (troop movements, voyages, migration routes), `dots` = marching-dot markers with pulse, `fill` = territory shading animating in (Louisiana Purchase, Mexican Cession). New frame function drawing progressive paths + pulsing markers; composes the `cuba_map_scene` technique. Why the catalog won: per-move start timing (`at`), per-move color, and the `fill` kind (territory shading — also required by PRODUCTION-GUIDE's engine backlog) were missing from the v1.1 sketch; the `caption` param moves to the annotate layer (`label`) instead of living on the primitive. `cuba_map_scene(dur, caption="")` stays Cuba-specific and **not canonical** — reimplement the Cuba beat on `map_scene` once built. Required before any map-driven video beyond the Cuba pilot.
- `myth_stamp(base_clip, at, dur, myth_text, correction)` — TRIVIAL (~40 lines). Composes `annotate` kind `'pop'` (rotated red tile) + `overlay_text` for the correction + manifest `sfx: "stamp_thud"` cue. FUN-CATALOG #10. Max 2 per video — scarcity preserves punch.
- `chapter_bar(base_clip, segments)` — TRIVIAL (~45 lines). `segments` = list of `(label, start, end)`; persistent thin gold progress bar with the current chapter highlighted; composes per-chapter `overlay_text`-style baked frames. Chapter cards themselves are the existing `title_card`. FUN-CATALOG #12.
- `counter_scene(target, dur, label, bg_img, prefix="", suffix="")` — TRIVIAL (~40 lines). New frame function: interpolated number with easing, big tabular numerals in gold, centered; composes `_bg_base` + `text_rgba`. `bg_img` REQUIRED (no-empty-screen). **Replaces the bible's unbuilt `counter_scene` placeholder with a real spec.** FUN-CATALOG #13.
- `vs_scene(img_left, img_right, dur, name_left, name_right)` — TRIVIAL (~45 lines). Frame splits; two portraits slide in from opposite sides; names slam under each; `annotate` kind `'pop'` for the center "VS" badge. Composes `kb_scene` halves. FUN-CATALOG #15.
- `wipe_scene(img_a, img_b, dur, label_a, label_b)` — MODERATE (~70 lines). New frame function: two `kb_scene`-style bases composited with a moving vertical mask + gold edge line + labels. The clearest visual form of causation and change-over-time. FUN-CATALOG #14.
- `skit_scene(script_beats, dur)` — MODERATE (~90 lines + one-time original character art). Flat-color background; speech-bubble tiles drawn per beat with `text_rgba`; simple original PIL character shapes (circles/rects — original, never clip art); multi-voice TTS segments timed to beats. Visuals deliberately simple — the *voices* carry it. FUN-CATALOG #16.

**SPECIFIED-BUT-UNBUILT pipeline steps (outside `motion.py`):**
- TTS direction-tag parser (FUN-CATALOG #20) — parse `[pause:N]`, `[beat]`, `[slow]`/`[fast]`, `[emphasis]`, `[TIP]`, `[MEMORIZE]`; split text into segments; render silence MP3s (`anullsrc`); `atempo` for rate tags; concatenate per the existing stitch logic in `render_narration_fish.py`. MODERATE. Unlocks #24.
- Audio mix step (FUN-CATALOG #18/#19) — new `mix_audio.py` or `build_video.py` extension: ffmpeg `sidechaincompress` on a PD music bed ducked -14dB under narration + volume automation at chapter marks from the manifest; SFX stinger library (~15 original/PD/CC0 or numpy-synthesized effects) cued from manifest `sfx` timestamps, mixed low under narration. Music source: PD recordings (Musopen) or original loops — never commercial. MODERATE (cue plumbing trivial-moderate + one-time library curation).
- Multi-voice narration generalization (FUN-CATALOG #3) — mechanism EXISTS in `render_narration_fish.py` (`voice` field per segment, reference audio per voice, stitching); the build item is the voice-registry convention + additional reference audios. TRIVIAL.
- Gag-asset plumbing (FUN-CATALOG #9) — `video/assets/gags/<gag_id>.png` shared asset dir; manifest `gag: <gag_id>` cue; validator warns if a referenced gag asset is missing (validator change ships WITH the mechanism, not before). TRIVIAL.
- Series-arc callbacks (FUN-CATALOG #26) — manifest metadata `callbacks: [{to_video, beat_ref, line}]`; validator checks `to_video` ids exist in COURSE-PLAN.md. No rendering code. TRIVIAL.
- `GAGS.md` registry (FUN-CATALOG #21) — gag id, line template, asset, videos-used-in; script convention only, no code beyond #9's asset mechanism. TRIVIAL.

### Timing rules

1. **Audio-duration matching (law):** scenes are sized to *measured* MP3 length via ffprobe — never assumed, never estimated from word count. Use `motion.dur(path, pad=1.2)` (pilot path, 1.2s breathing room) or `build_video.py`'s exact measurement (grading path, 0 pad).
2. **The 12-second visual-point rule:** at least one annotation overlay or visual beat every 12 seconds of scene time. In the Cuba pilot this means 1–4 `annotate` notes per scene. A scene longer than ~35s must be split into sub-scenes.
3. **Scene duration bounds:** minimum ~4s (shorter breaks the punch-in/annotation motion), maximum ~35s before a split. Typical narration segments run 10–25s.
4. **Quote scenes:** `typewriter_scene` duration must let the quote type at a readable rate — the text completes at 85% of `dur`, so size generously; the historical voice MP3 sets the floor.
5. **Crossfades:** 0.35s between scenes (`assemble`); audio is placed per-scene-start so narration never bleeds into the wrong visual.
6. **Breathing room:** the 1.2s `dur()` pad is for motion to settle (pop, ring ripple) after narration ends. Don't pad tighter than 0.8s.

### Visual direction (learned 2026-10-02 — frame review of vid-u1-01)

Three defect classes found in the first proof render; the rules below are now
law, enforced in code (`motion.py`), in the build (`build_video.py`), and by
validator gates.

1. **No text collisions.** At t=8s the hook rendered "what if" on top of
   "TWO WORLDS. ONE OCEAN." — a `pop` note centered on a centered kinetic
   phrase. Rules:
   - Every text element's settled bounding box is recorded at build time
     (`motion.PlanRecorder`); the **TEXT-COLLISION** validator gate fails any
     pair of boxes that co-occur (>0.25s, ignoring transient entrances) and
     overlap (>4% of the smaller box).
   - `annotate` `pop` and `point` notes accept a `y` kwarg (0..1 of frame) for
     explicit vertical parking. Centered cards are never stacked on centered
     text — park verdict cards low (`y: 0.68`–`0.78`), clear of both the text
     block and the sub line.
   - `kinetic_text` places its sub from the *measured phrase height*
     (`y_pos=(H+th)//2+20`), never a fixed offset — fixed offsets collide with
     multi-line phrases.
2. **Backgrounds stay visible (no fake black screens).** `typewriter_scene`
   and `timeline_scene` were crushing bg images with `darken=120–150` until
   frames read as black screens with text — a no-blank-screen violation in
   spirit. Rules:
   - `motion._bg_base` clamps `darken` to **80** (`DARKEN_MAX`). Never rely on
     heavier full-frame darkening for legibility.
   - Prefer a **scrim band** behind text (`motion.scrim_band`, multiplicative,
     keeps texture) over full-frame darkening: bottom band for captions
     (`caption_scene`, `doc_zoom`, `callout_scene` captions), region bands
     behind `typewriter_scene` quote blocks and `timeline_scene` rails.
   - The **BG-VISIBILITY** check (inside NO-BLANK-FRAMES) fails any sampled
     rendered frame with >40% near-black pixels (luminance <28; calibrated:
     healthy frames 2–4%, crushed frames 44–69%).
3. **Every stage moves the camera on purpose.** The first cut leaned on
   `kb_scene` slow drift + annotate cards — a slideshow. Rules:
   - **≥1 intentional camera/directed-motion move per stage. Drift-only stages
     are banned.** Intentional = `punch_in` (opens, never fades),
     `zoom_to` (emphasis on the named figure/object), `camera_path`
     (waypoint tours across details the narration names),
     `doc_zoom` (documents), `callout_scene` (ring sequence on points of
     interest), `timeline_scene` (sequential reveals), `typewriter_scene`
     (live-typing quotes), `kinetic_text` (slams), `bullet_slide`
     (staggered entrances). Enforced by the **CAMERA-DIRECTION** gate.
   - Direction grammar: open with `punch_in`; tour engravings/photos with
     `camera_path` across exactly the details being discussed; punch
     `zoom_to` onto the figure or object the sentence names; land verdicts
     with `kinetic_text` + `point` cards.
   - Stages render as **real animated segments** (`BUILDERS[name](dur)` →
     `moviepy` clip → MP4 via `build_video.py`'s animated path), sized to the
     measured narration duration. The old static-PNG-per-stage loop is retired
     for sample lessons (legacy path kept for older units without BUILDERS).

### Preview workflow (motion approval before full-res)

- **Preview first:** `python3 video/build_video.py <name> --preview --out <file>` renders at **720x1280** (`motion.set_scale(2/3)`). ~2.25x fewer pixels → ~2x faster. Use previews for all motion/direction approval.
- **Full-res only after approval:** default (no flag) renders 1080x1920. Never spend a full-res render on unapproved motion.
- **How it stays faithful:** `motion.py` parameterizes resolution — `set_scale()` sets `W`/`H`, `font()` scales type sizes, `text_rgba()`/`wrap_px()` scale wrap widths internally, and every absolute-pixel layout constant goes through `px()` (design pixels × SCALE). Preview composition is proportionally identical to final: same wraps, same relative positions, same collision behavior.
- **Rule:** `set_scale()` must be called before any builder runs (build_video.py does this right after arg parsing); stage modules must read `motion.W`/`H`/`px()` live, never cache them at import.
- Validator plan-time gates (TEXT-COLLISION, CAMERA-DIRECTION) run at full-res layout by default; the rendered-frame gates (NO-BLANK-FRAMES, BG-VISIBILITY) run against whichever MP4 exists.

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
- **NO BLACK/WHITE EMPTY SCREEN EVER** — every scene must specify its background image source. `bg_img` is REQUIRED (never optional) in the content JSON; the `motion.py` near-black flat fallbacks (`kinetic_text`, `title_card`, `typewriter_scene`, `timeline_scene`, `bullet_slide` without `bg_img`) are banned in production. All background images are local repo paths (`video/assets/...`) per the asset rules.

### Anti-patterns
- Don't open with a question.
- Don't exceed 5 beats (3 enumerated chunks in our format).
- Don't explain the test.
- Don't stack humor in dense factual passages — jokes are transition sugar.
- Don't improvise the close — the ritual close formula is fixed.
- Don't be neutral to a fault — take clear stances; hedged history is forgettable.
- Don't copy the competitor's lines, jokes, or catchphrases — mechanics only, always.

---

## 6. Engagement Layer (FUN-CATALOG integration)

**Source:** `video/FUN-CATALOG.md` (2026-10-02) — 26 ranked, fully scriptable engagement techniques, the playbook team's build feed. Goal: beat Heimler's History on engagement. **Ranking basis:** expected engagement payoff per implementation cost. Entries #1–13 are the "do these first" tier. **Scriptability rule:** every ranked entry names its exact scripting mechanism — an existing `motion.py` primitive (name + params), a concrete new primitive (signature + composition + effort, in the SPECIFIED-BUT-UNBUILT inventory in §4), or a pipeline step. Zero copying: techniques and mechanics only, never anyone's lines/jokes/content.

### Corpus measurements (205 APUSH Review transcripts, `~/workspace/apush-qc/fun-research/`)

- **Pace: median 222 wpm** (short videos 197, long videos 230). Fast is the baseline. Implication for us: our TTS reference voice must be *energetic, not lecture-paced*, and direction should push perceived pace up via `[fast]` tags and punch-heavy delivery. The §1 word budget (900–1,200 words ≈ 150 wpm for 6–8 min) stays as written — it buys denser visual pacing per word — but the *delivery energy* must match a 222-wpm feel, not a lecture hall. This is a calibration item for the narrator reference-audio choice, not a script-length change.
- **Point density: 1.31 explicit point-markers/min** ("first/second", "the key idea", "most important", "bottom line") — roughly one signposted point every 45 seconds. This is the "point-driven" cadence that is the user's stated bar. Technique #1 visualizes it: **≥1 point-slam annotate per 45 seconds of runtime**. (The 12s rule keeps motion alive; #1 makes every 45s window *land a point* — both rules run at once.)
- **Catchphrase rituals:** 84 videos in one series open with the identical cold-open line; "get them brain cows milked" appears in ~80 videos; "catch you on the flip flop" as sign-off. Ritual > novelty for series identity → techniques #2 and #6. Our equivalents must be original wording, same mechanics.
- **Memory cues:** "remember" = 249 hits, the corpus's #1 rhetorical device → technique #5 (memory-cue cards, 1–2 per video, never more — scarcity = weight).
- **Questions: only 0.08/min** — a genuine gap in the niche → technique #8 (on-screen viewer questions, 1–2 per video).
- **Exam-tip asides: 0.22/min** ("if you're writing…", "on the test…") — present but sparse, room to make them a branded signature → technique #4.
- **Humor style:** vivid, slightly absurd similes, one image per punchline. Humor lives in the *writing*, not in gags with setups — fully scriptable, lexical, never cruel, never at historical suffering → techniques #9/#21 (gag registry + running jokes).
- **Second-person: 1.21% of all words** — direct address is constant. Matches our ~15/1k-words rule.

### The 26 ranked techniques (scripting mechanisms)

"EXISTS" = a `motion.py` primitive verified in source (§4). "NEW" = SPECIFIED-BUT-UNBUILT (§4 inventory — exact signature there; do not reference until built). "PIPELINE" = a step in `render_narration_fish.py` / audio assembly. "SCRIPT" = a writing/template convention, no code.

| # | Technique | Mechanism | Effort |
|---|---|---|---|
| 1 | Point-slam annotate layer (every 40–50s) | EXISTS: `annotate` kinds `term`/`label`/`point` — manifest notes `(at_seconds, dur, kind, kwargs)` per scene; ≥1 per 45s, ≤8-word slams | trivial |
| 2 | Branded cold-open ritual (identical open, every video) | EXISTS: `title_scene` with fixed series title card + fixed opening line in script template; manifest scene 0 = series-open template | trivial |
| 3 | Historical figures speak in their own voice | PIPELINE: narration JSON `voice` field per segment — mechanism EXISTS in `render_narration_fish.py`; build item = voice-registry convention + reference audios | trivial |
| 4 | Exam-tip aside sting (2–3/video) | EXISTS: `annotate` kind `pop` + pipeline SFX cue `sfx: "tip_sting"`; script convention `[TIP]...[/TIP]` — tag parsing PROPOSED until #20 ships (interim: author as `pop` notes) | trivial (visual); tag parsing pending |
| 5 | "Remember this" memory-cue cards (1–2/video) | EXISTS: `kinetic_text(phrase, dur, sub=..., bg_img=<topic image>)` — bg_img mandatory; script tag `[MEMORIZE]` | trivial |
| 6 | Sign-off catchphrase ritual | EXISTS: script template (fixed closing line) + `overlay_text`/`kinetic_text` slam over end card; manifest final-scene template | trivial |
| 7 | Kinetic word slams for key terms | EXISTS: `kinetic_text(phrase, dur, bg_img=<topic image>, color=gold)` | trivial |
| 8 | On-screen viewer questions (1–2/video) | EXISTS: `title_card(text, dur, sub="pause and think", bg_img=...)` + silence segment (`[pause:3]` — parsing PROPOSED) + answer via `annotate` `point` or `bullet_slide` | trivial (visual); pause parsing pending |
| 9 | Callback gag registry (cross-video running jokes) | EXISTS: `annotate` kind `pop` + shared asset dir `video/assets/gags/<gag_id>.png` + manifest `gag: <gag_id>`; validator warn ships WITH the mechanism | trivial |
| 10 | "Common mistake" MYTH stamp (≤2/video) | NEW: `myth_stamp(base_clip, at, dur, myth_text, correction)` | trivial — SPECIFIED-BUT-UNBUILT |
| 11 | Punch-in on every scene start | EXISTS: `punch_in(clip, amount=0.07, dur=0.5)` — apply in manifest assembler to every scene by default (opt-out flag, not opt-in) | trivial (one-line assembly default) |
| 12 | Progress bar + chapter cards | NEW: `chapter_bar(base_clip, segments)` — `segments` = `(label, start, end)` list; chapter cards = existing `title_card` | trivial — SPECIFIED-BUT-UNBUILT |
| 13 | Animated counters / tickers | NEW: `counter_scene(target, dur, label, bg_img, prefix="", suffix="")` | trivial — SPECIFIED-BUT-UNBUILT |
| 14 | Before/after wipe reveal | NEW: `wipe_scene(img_a, img_b, dur, label_a, label_b)` — moving vertical mask + gold edge line | moderate — SPECIFIED-BUT-UNBUILT |
| 15 | Versus face-off cards | NEW: `vs_scene(img_left, img_right, dur, name_left, name_right)` — composes `kb_scene` halves + `annotate` `pop` VS badge | trivial — SPECIFIED-BUT-UNBUILT |
| 16 | Thought-bubble cutaway skit (1/video max) | NEW: `skit_scene(script_beats, dur)` — flat bg + speech-bubble tiles + original PIL character shapes + multi-voice TTS beats (mechanism #3) | moderate — SPECIFIED-BUT-UNBUILT |
| 17 | Map-march animation | NEW: `map_scene(map_img, dur, moves)` — canonical spec in §4; generalizes `cuba_map_scene` | moderate — SPECIFIED-BUT-UNBUILT |
| 18 | Music bed with ducking | PIPELINE: new audio mix step — `sidechaincompress` duck -14dB under narration, volume automation at chapter marks from manifest; PD music only (Musopen / original loops) | moderate — SPECIFIED-BUT-UNBUILT |
| 19 | SFX stinger library (~15 effects) | PIPELINE: manifest `sfx` timestamp cues mixed in the same audio step as #18; PD/CC0 or numpy-synthesized | trivial-moderate — SPECIFIED-BUT-UNBUILT |
| 20 | TTS direction tags | PIPELINE: parser in narration renderer — `[pause:N]`, `[beat]`, `[slow]`/`[fast]`, `[emphasis]`; silence via `anullsrc`, rate via `atempo`; **unlocks #24** | moderate — SPECIFIED-BUT-UNBUILT |
| 21 | Running jokes seeded in narration | SCRIPT: `GAGS.md` registry (gag id, line template, asset, videos used in); rides on #9's asset mechanism | trivial |
| 22 | Cliffhanger endings | SCRIPT: fixed closer block teasing next video's question + `title_scene(next_title, ...)` or `camera_path` teaser; course-plan order must be fixed so "next video" is deterministic | trivial |
| 23 | Honest "one weird trick" framing | SCRIPT: one rubric-grounded move per technique video, honestly packaged; visual = `kinetic_text` slam + #4 exam-tip sting | trivial |
| 24 | Speed-ramped rapid-fire lists | PIPELINE + visual: `[fast]` tag (#20) renders clause at `atempo=1.25`; `bullet_slide` small `stagger` (0.25) or sequential `annotate` `pop` timed to faster audio | moderate (rides on #20) |
| 25 | Two-voice debate segments (1/video max) | PIPELINE + visual: `voice` field (#3) with two non-narrator references; visual = `vs_scene` (#15) + alternating `annotate` `label` bubbles | trivial once #3 + #15 exist |
| 26 | Series-arc callbacks in the manifest | MANIFEST metadata: `callbacks: [{to_video, beat_ref, line}]`; validator checks `to_video` ids in COURSE-PLAN.md; no rendering code | trivial |

### Build order (from the catalog)

1. **Week 1 — all trivial, existing primitives (9 items):** #1 annotate density rule, #2 cold-open template, #5 memorize cards, #6 sign-off ritual, #7 word slams, #8 pause-questions, #11 punch-in default, #4 exam-tip stings, #21 gag registry. **Caveat (integration note):** #4 and #8's *visual* sides exist; their `[TIP]` / `[pause:N]` tag parsing is PROPOSED until the #20 direction-tag parser ships — author them as `pop` annotations + sentence-break pauses in the interim, and the cues will light up when the parser lands.
2. **Next — trivial new primitives:** #10 myth stamp, #12 progress bar, #13 counters, #15 versus cards, #9 gag-asset plumbing.
3. **Then — moderate:** #20 TTS direction tags (**unlocks #24**), #18 music ducking + #19 SFX library (one audio pipeline step), #14 wipe reveals, #17 map-march.
4. **Last — moderate, highest craft cost:** #16 thought-bubble skits (one-time character art), #25 two-voice debates (needs extra reference audios).
5. **Anytime — script/template only:** #22 cliffhanger endings, #23 honest-trick framing, #26 manifest callbacks (metadata only until validator support ships).

### Integration notes (catalog-vs-playbook conflicts resolved)

- **Word pace vs. word budget (open calibration, not a conflict to force):** corpus median 222 wpm vs. our 900–1,200-word / ~150 wpm budget. The catalog's own recommendation targets the *reference voice energy*, not the script length — so the budget stands, and the narrator casting (§1d in PRODUCTION-GUIDE) must pick an energetic reference. Revisit only if watch-time data says otherwise.
- **12s rule vs. 45s point-slam rule:** both run. The 12s rule (≥1 annotation/beat per 12s) keeps motion alive; #1 (≥1 *point* slam per 45s) guarantees every window lands a signposted takeaway. A scene can satisfy the 12s rule with labels/pops while its one point-slam carries the beat's so-what.
- **`counter_scene` naming collision:** the series bible proposed a `counter_scene` that was never built (PRODUCTION-GUIDE flagged it as nonexistent). The catalog now ships a real spec with the same name (`counter_scene(target, dur, label, bg_img, prefix="", suffix="")`) — this spec is canonical; the bible's placeholder is retired.
- **Pause-tag naming:** catalog `#20` uses `[pause:N]`; the playbook's canonical podcast-derived names `[short pause]`/`[pause]`/`[long pause]` stay valid as `[pause:0.45]`/`[pause:0.75]`/`[pause:1.5]` aliases (§1). `[pause:N]` is the forward convention.
- **What the validator deliberately excludes:** all NEW primitives and PROPOSED pipeline cues stay out of `validate_video.py`'s `CANONICAL_PRIMS` until implemented — flagging them as unknown would be correct behavior for unbuilt work.

---

## 7. Build Checklist (per video)

1. Author narration JSON (`video/<name>_narration.json`): `key`/`voice`/`text` segments, ≤3 beats, word budgets above, ≥1 callback, significance hammer on every beat.
2. Render TTS with `render_narration_fish.py` (5090, fish-speech + torch) → `video/audio/<name>/<key>.mp3` (128k). Multi-voice keys stitched via ffmpeg concat. Pause tags split out, silence stitched in (PROPOSED — until implemented, write pauses as sentence breaks).
3. Measure durations (`ffprobe`) — scene sizing comes from this, never from word estimates.
4. Author content JSON (§2 schema) → build scenes with `motion.py` primitives + `annotate` (12s rule).
5. Write manifest `video/manifests/<name>.json` (§3 schema, canonical).
6. `python build_video.py <name>` → verify MP4.
7. Commit everything on `main`. Audio MP3s are committed (rebuilds need no TTS step).
