# Lesson Build Pipeline (Canonical)

How we build a complete APUSH lesson video, start to finish.
Each lesson goes through these phases in order. No skipping.

---

## Phase 1: Script & Audio

### 1. Read the TTS script
Read the full script. Understand the narrative arc, the beats, the jokes,
the transitions. You cannot direct what you haven't internalized.

### 2. Render TTS (fast)
Render all turns with placeholder voices. Speed over quality — this is
for timing, not for the final mix.

### 2a. Audio QA (mandatory)
Listen through (or script-diff) for mispronunciations, wrong emphasis,
unnatural pauses. Fix and re-render BEFORE locking timing.
Re-rendering TTS invalidates everything downstream.

### 3. Build timing.json (measured, never estimated)
- TTS MP3s → Vosk word alignment → measured word times per turn.
- `timing.json`: turn start/duration + word-level timestamps.
- This is the law. Every visual cue anchors to a measured word time.
- No proportional estimates. No guessing.

---

## Phase 2: Direction

### 4. Director's scene plan (in writing, per act)
Write the full scene plan BEFORE touching any tool. For each beat:
- What the viewer sees (one idea per shot)
- What the viewer hears (the exact words)
- The measured timestamp
- The emotional register (serious / fun / dramatic)

**Hard rules:**
- No blank screens. Every frame has texture, image, or era background.
- No static visual > 8s without a new beat.
- No repeated screens across turns — each turn gets its own visual moment.
- Hosts appear on screen. Talking heads are not optional.
- Serious scenes: realistic visuals. Fun beats: semi-cartoon OK.
- Static images get procedural motion (sway, breathe, Ken Burns).

### 5. Tool selection (per beat)
Choose the right tool for each beat — remotion, slideforge, LTX.
Not one tool for everything. The beat dictates the tool.

### 5a. LTX clips
- Detailed prompts with a base image. Max 10 seconds per clip.
- Rendered ONLY on the Windows machine.
- On the agent VM: use placeholder animation (Ken Burns on the base image)
  at the EXACT planned duration, so the real clip drops in cleanly later.

### 6. Image selection (driven by the scene plan)
Pick images AFTER the plan, not before. For each beat, the plan dictates
what's needed. Then: download → convert to low-res → update images.json.
Sources: public domain historic, user-supplied packs, AI-generated where
nothing else fits.

---

## Phase 3: Verification (before rendering)

### 7. Independent verification
A separate pass (different agent or checklist) confirms:
- Every visual matches what the narration says at that timestamp
- Scene transitions are logical (no jarring jumps)
- The emotional register matches the content
- Text is declarative (content + hierarchy + cue — system handles layout)

### 8. Validator gate (automated)
Run before every render. Blocks on:
- Empty screens (no visual beyond head + background)
- Long static stretches

Warns on:
- **Low visual density**: turn > 8s with < 2 visual beats
- **Visual stagnation**: same component 3+ turns unchanged

Fix all blocks. Review all warnings. Then render.

---

## Phase 4: Render & QA (per act)

### 9. Render low-res act
480×270 @ 10fps. Full act timeline, not excerpts.
Timing preserved from measured data.

### 10. Inspect
- Key-frames at every word-anchored cue (±1s)
- Audio-visual sync: does the visual land WHEN the word is spoken?
- Text: no clipping, no overlap, no out-of-bounds
- Transitions: scrub in motion, not just stills
- Pacing: does it feel fast and alive, or slide-deck?

### 11. Iterate or advance
If the act fails QA: fix, re-render, re-inspect.
If it passes: move to the next act. Don't revisit passed acts
unless a later change breaks them.

---

## Phase 5: Assembly & Delivery

### 12. Final assembly
- Concatenate acts in order (same codec/res/fps)
- Verify: total duration matches measured timeline
- QA the act boundaries (transitions between acts)
- Full-timeline skim at low res for a final coherence check

### 13. Push rules
- Commit code after each act passes QA
- Push: reusable source only (components, validators, guides, docs)
- NEVER push: MP3/MP4, timing artifacts, generated images
- Only push on explicit user approval
- Final 1280×720 @ 30fps render happens with the user present

---

## What "done" means

A lesson is done when:
1. Every act passed QA (validator + human inspection)
2. Full timeline assembles without gaps or overlaps
3. Audio sync verified at every word-anchored cue
4. No validator warnings unreviewed
5. Code pushed (on approval)
6. Morning session renders the final with real voices
