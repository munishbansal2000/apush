# Lesson Build Pipeline (Canonical)

How we build a complete APUSH lesson video, start to finish.
Each lesson goes through these phases in order. No skipping.

**2026-10-06: Consolidated to Remotion.** slideforge archived. All episodes
render in Remotion. 70-component library at `video/remotion/src/components/`.

---

## Phase 1: Script & Audio

### 1. Read the TTS script
Read the full script. Understand the narrative arc, the beats, the jokes,
the transitions. You cannot direct what you haven't internalized.

### 2. Render TTS (fast)
```bash
python3 stage_tts.py --episode E2 --provider meta
```
Providers: `meta` (placeholder, fast), `edge` (alternative), `fish` (final, prod only).

### 2a. Audio QA (mandatory)
Listen through (or script-diff) for mispronunciations, wrong emphasis,
unnatural pauses. Fix and re-render BEFORE locking timing.
Re-rendering TTS invalidates everything downstream.

### 3. Build timing.json (measured, never estimated)
```bash
python3 stage_timing.py --episode E2 --provider meta
```
- TTS MP3s → Vosk word alignment → measured word times per turn.
- Output: `src/data/<episode>/timing_map.json` + `word_times.json`.
- Cached by MP3 hash (skips Vosk if unchanged).
- This is the law. Every visual cue anchors to a measured word time.
- No proportional estimates. No guessing.

---

## Phase 2: Direction (creative)

### 4. Director's scene plan + image collection (interleaved)
These happen together, not in sequence. As you read the script:

**a) Read and identify needs:**
For each beat, ask: "What does the viewer SEE?" If the answer needs an image,
note it. The script dictates the images, not the other way around.

**b) Collect images:**
```bash
python3 stage_images.py --episode E2 --scan    # build catalog from identified needs
# Fill in source_url/license/description in src/data/images.json
python3 stage_images.py --episode E2           # download missing
```

**c) Write scenes USING the images:**
Now that you have the images, write SUB_BEATS that use them creatively:
- What does the image SHOW? (not just "here's a picture")
- How does it MOVE? (Ken Burns, parallax, reveal)
- What TEXT goes with it? (not on top of faces)
- What's the EMOTIONAL register? (does this image feel right?)

**d) Iterate:**
If scene writing reveals you need more images (or different ones):
→ Go back to (b), collect more, continue writing.
The creative step drives image needs, not the reverse.

**Persistence rules:**
- `src/data/images.json` IS committed (catalog: paths, source URLs, licenses, descriptions, used_in)
- Image FILES are NOT committed (in `public/`, gitignored, downloaded on demand)

**Maps:** Use period-accurate maps where overlays must align perfectly.
Not modern state outlines. Source from Library of Congress. Calibrate overlay
coordinates to the specific map image.

### 5b. LTX Clips (AI video, optional per beat)
```bash
python3 stage_clips.py --episode E2                    # VM mode: placeholders
python3 stage_clips.py --episode E2 --provider ltx-desktop  # Windows: real clips
```

**How it works:**
- Creative direction marks beats with `anim_prompt` + `base_image` + `clip_duration` (max 10s)
- **VM:** exact-duration Ken Burns placeholder holds the timing slot
- **Windows:** real LTX clips render to `public/ltx/<episode>/<beat_id>.mp4`
- **Episode component** (`LtxClip`) auto-swaps: real clip if present, placeholder if not
- **Zero code changes** between VM and Windows renders

**Providers:** `none` (default, VM), `ltx` (local diffusers), `ltx-desktop` (Windows app), `meta-ui` (Meta bridge)

**Provenance:** `public/ltx/<episode>/MANIFEST.json` tracks prompt/seed/duration/still fingerprints. Incremental: unchanged beats reuse clips, changed beats regenerate.

**Rules:**
- Detailed prompts with base image, max 10 seconds per clip
- Prompt safety gate (ambient-motion-only) enforced before generation
- Clips are gitignored; MANIFEST.json is committed

### 6. Scene Build (technical implementation)
Transform SUB_BEATS into the renderable episode TSX.

**This is where creative direction becomes technical implementation:**
- SUB_BEATS define WHAT (content, timing, component kind)
- The episode TSX defines HOW (Sequences, TalkingHeads, Audio, layout)
- Each SUB_BEAT becomes a rendered element at its measured timestamp

**Rules:**
- **No inline components.** All components live in `src/components/`, episodes import them.
- Talking heads switch on speaker (Maya/Marcus) via `TalkingHead` component
- Audio: per-turn MP3s sequenced by measured timing
- Background: era-appropriate, changes only on `bg-swap` beats

**Validation:** The built TSX must pass `validate_scene.py` before rendering.

---

## Phase 3: Verification (before rendering)

### 6. Validator gate (automated)
```bash
python3 build_episode.py E2 --validate-only
```
Runs:
- `validate_e2.py`: visual density, empty screens, stagnation
- `validate_scene.py`: text collisions (bounding box, not center distance),
  duplicate components, orphan leaders, map regions

Blocks on errors. Fix all before rendering.

### 7. Layer 2 validation (checklist, every keyframe)
After rendering, extract keyframes and check EVERY one:
```bash
python3 extract_keyframes.py --episode E2 --act 2 --video <path>
```
See `LAYER2_CHECKLIST.md` for the 6 checks:
1. Text readable (not too small, contrast OK, not clipped)
2. No overlap (text-text, text-face, text-visual)
3. Frame not empty (beyond bg + head)
4. Caption matches manifest
5. Map correct (right geography, directions not inverted)
6. Leader correct (no duplicates, has name + role)

Binary pass/fail. Do NOT proceed to creative QA with failures.

---

## Phase 4: Render & QA (per act)

### 8. Render act
```bash
python3 stage_render.py --episode E2 --act 2 --mode review  # 480x270 @ 10fps
python3 stage_render.py --episode E2 --act 2 --mode test    # 480x270 @ 30fps
python3 stage_render.py --episode E2 --mode prod            # 1280x720 @ 30fps
```
- **review:** 480×270 @ 10fps, ~9x faster. Use for iteration and keyframe QA.
- **test:** 480×270 @ 30fps, fast iteration with full motion.
- **prod:** 1280×720 @ 30fps, final quality.
- Cached by TSX hash (skips unchanged acts)
- Use `--act N` for single act, omit for all

### 8a. Verify render (gate)
```bash
python3 verify.py --video .build_cache/E3/act1_review_<hash>.mp4 --episode E3 --act 1
```
Checks: duration ±0.6s, 1 video + 1 audio stream, audio not silent, no black ≥0.5s.
**Any failure blocks keyframe extraction.** Fix before proceeding.

### 9. Inspect keyframes
- Keyframes auto-extracted at every beat (+0.7s for entrance)
- Audio-visual sync: does the visual land WHEN the word is spoken?
- Text: no clipping, no overlap, no out-of-bounds
- Transitions: scrub in motion, not just stills
- Pacing: does it feel fast and alive, or slide-deck?

### 10. Layer 3: Creative QA (manual)
After Layer 2 passes. Subjective, cannot automate:
- Does it feel alive or slide-deck?
- Does the visual match the emotional register?
- Is it interesting with audio muted?
- Would Heimler be jealous?

### 11. Iterate or advance
If the act fails QA: fix TSX, re-render (cache handles it), re-inspect.
If it passes: move to the next act. Don't revisit passed acts
unless a later change breaks them.

---

## Phase 5: Assembly & Delivery

### 12. Final assembly
```bash
# Concatenate acts (after all pass QA)
ffmpeg -f concat -safe 0 -i concat_list.txt -c copy full.mp4
```
- Verify: total duration matches measured timeline
- QA the act boundaries (transitions between acts)
- Full-timeline skim at low res for final coherence check

### 13. Push rules
- Commit code after each act passes QA
- Push: reusable source only (components, validators, stages, docs)
- NEVER push: MP3/MP4, timing artifacts, generated images, `fish.api.key`
- Only push on explicit user approval
- Final 1280×720 @ 30fps render happens with the user present (morning session)

---

## Stage scripts (in `video/remotion/`)

| Stage | Script | Purpose |
|-------|--------|---------|
| TTS | `stage_tts.py` | Render turns with meta/edge/fish (from audio_scripts/) |
| Timing | `stage_timing.py` | Vosk alignment → timing_map.json |
| Images | `stage_images.py` | Scan TSX → catalog → download missing |
| Clips | `stage_clips.py` | LTX AI video clips (VM: placeholder, Windows: real) |
| Validate | `build_episode.py --validate-only` | All validators |
| Render | `stage_render.py` | Remotion render per act |
| Keyframes | `extract_keyframes.py` | Frames at every beat |
| Full | `build_episode.py` | Orchestrator (validates → renders → keyframes) |

---

## What "done" means

A lesson is done when:
1. Every act passed QA (validator + Layer 2 + Layer 3)
2. Full timeline assembles without gaps or overlaps
3. Audio sync verified at every word-anchored cue
4. No validator warnings unreviewed
5. Code pushed (on approval)
6. Morning session renders the final with real voices
