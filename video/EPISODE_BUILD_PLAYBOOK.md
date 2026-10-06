# Episode Build Playbook (canonical)

**One workflow. One plan. Right tool per scene.**

This is the single source of truth for building APUSH lesson videos.
It replaces all earlier playbooks, director-prompt versions below v12,
and ad-hoc build notes. If another doc contradicts this one, this one wins.

---

## The tools (not competing pipelines)

slideforge, Remotion, and LTX are **tools in one pipeline**, not rival
workflows. The director picks the right tool per scene:

| Tool | Use for |
|------|---------|
| **slideforge** | Deterministic graphics: maps, routes, stats, chains, text slides, Ken Burns. Pixel-exact, reproducible. |
| **Remotion** | Talking heads, complex compositing, layered scenes with hosts on screen. |
| **LTX / vidslide** | Atmosphere-only AI video clips. Never evidence, never maps, never text. |

A scene plan may mix all three. The assembly stage concatenates them
into one timeline.

---

## The workflow

### 1. Script → turns
Parse the locked dialogue script into `turns.json`:
`[{"id": "t00", "speaker": "maya"|"marcus", "text": "..."}]`.
Skip production notes (`[3-second pause]` etc.) — they're silence, not speech.

### 2. TTS per turn (placeholder voices)
```
/opt/hatch/bin/tts speak --voice avocado_v2:aria --output tts/per_turn/t00.mp3 --text-stdin
```
- Maya → `avocado_v2:aria`, Marcus → `avocado_v2:briggs`
- Zero-padded: `t00.mp3` … `tNN.mp3`
- **Placeholder voices.** Final Fish Audio voices (Maya/Marcus) are a
  separate gate, done in the morning session with the user present.

### 3. Measured timing (THE LAW)
**Timing comes only from measured data. Never estimate, never hardcode.**

- `timing_map.json`: ffprobe each MP3 → cumulative turn start/duration.
- `work/word_times.json`: Vosk aligns every word in every turn.
- All visual cues resolve from these files. A plan with hand-written
  seconds is rejected.

### 4. Direct the scene plan (v12)
Follow `~/workspace/director-prompt-v12.txt` exactly. Summary of the law:

- **THINK-FIRST**: for each beat, write "The viewer sees…" before
  choosing any slide. Tool choice follows the idea, never the reverse.
- **Word anchors, never seconds**: every scene boundary and overlay cue
  is `{"turn": N, "word": "..."}`. `resolve_cues.py` converts to seconds
  from measured word times. A plan mixing anchors + seconds is rejected.
- **VIDEO-FIRST**: if muted, the frame must still be interesting.
  Narration carries information; visuals carry feeling, place, thing.
- **Topic alignment**: a visual appears WHEN its topic is spoken, not before.
- **27-slide chooser**: pick by idea. RevealSlide is RARE (text-as-artifact
  only). DisplayHeadline max 3 per act, substantive topics only.
- **Anti-hallucination**: only script terms. Every headline traceable to
  script words.
- **Visual density**: never a bare headline on texture. Can't meet it
  honestly → flag `"variance"`, never invent.
- **Image-topic discipline**: an image appears only while its OWN topic
  is spoken. No near-misses, no previews.
- **Map pacing**: routes show ALL waypoints + persistent labels, ≥6s per route.

### 5. Tool assignment per scene
After directing, assign each scene its renderer:

- **slideforge** (default): maps, routes, stats, chains, text-driven scenes.
  Compile via `compile_scene_plan.py` → deterministic, fail-fast on drift.
- **Remotion**: any scene where hosts appear on screen, or complex
  layered compositing (talking head + map + callouts).
  Text is declarative: author text + hierarchy level
  (`hero`/`title`/`subtitle`/`body`) + timing. The tool sizes and places.
  Never hand-tune fontSize.
- **LTX/vidslide**: atmosphere clips only. Pre-rendered MP4 enters the
  plan as a `vid` beat with frame-exact conforming.

### 6. Render modes

| Mode | Spec | When |
|------|------|------|
| **review** | 480×270 @ 10fps | QA passes, iterate until finalized |
| **final** | 1280×720 @ 30fps | Morning session, with user present |

**On this VM: full lesson at reduced FPS for review. NEVER render full 30fps here.**
Render the complete timeline at 480×270 @ 10fps (or ≤90s segments at higher
quality for detail checks). Full 1280×720 @ 30fps happens on real hardware
or in the morning session with the user present.

### 7. QA gates (all mandatory)

1. **Pre-render gate**: run the validator before every render.
   Blocks on: unintentional empty screens, long static stretches.
   Warns on: **low visual density** (turn > 8s with < 2 visual beats),
   **visual stagnation** (same component 3+ turns unchanged).
2. **Drift gate**: video duration vs. audio timeline must be < 1 frame.
   Fail-fast, fix, re-render.
3. **Cue-sync spot check**: extract frames at each word-anchored cue ±1s.
   Visuals must land WHEN spoken.
4. **Visual QA**: no blank screens, no clipping, no overlap, no out-of-bounds.
   Scrub transitions in motion — stills miss motion-only bugs.
5. **Blank-background check**: every frame has texture, image, or era bg.
6. **The user is never the tester.** Verify everything before reporting done.

### 8. Assemble & verify
- Concatenate scene/act chunks in order (same codec/res/fps/pix_fmt).
- Mux per-turn TTS audio on the measured timeline.
- Verify: duration, 1v+1a streams, audio not silent, zero black frames.

### 9. Report (DO NOT PUSH)
Report: render paths, drift measurements, QA results, issues found/fixed,
sourced-image credits, suggested commit message. **Never push without
explicit approval.**

---

## Standing rules

- **Measured timing or refuse.** No estimates at any stage.
- **Nothing hand-made.** Every asset reproducible through library code.
- **Push only**: director prompt, pipeline scripts, library fixes.
  **Never push**: MP3, MP4, timing files, generated images.
- **Never delete** any file without asking first.
- **Hosts on screen.** Talking heads expected; graphics-only stretches
  need a reason.
- **Kids-friendly, fast-paced.** No long single slides. Compete with
  the best YouTubers.
- **Eyes-closed-safe**: audio stands alone; visuals add, never carry
  meaning the narration doesn't state.

---

## File map

| What | Where |
|------|-------|
| This playbook | `~/workspace/EPISODE_BUILD_PLAYBOOK.md` |
| Director prompt (v12) | `~/workspace/director-prompt-v12.txt` |
| Pipeline | `~/workspace/video-pipeline/` (`pipeline.py`, `compile_scene_plan.py`, `resolve_cues.py`, `render_episode.py`, `qa_render.py`) |
| slideforge library | `~/workspace/slideforge/` |
| Remotion project | `~/workspace/remotion-apush/` (`COMPONENTS.md` = component catalog) |
| Episode workdirs | `~/workspace/episode_u1eN/` (`turns.json`, `timing_map.json`, `tts/`, `work/word_times.json`, scene plans, `final/`, `qa/`) |
| Stale docs | `~/workspace/docs_archive/` (v9/v10 prompts, old playbooks) |

---

## Version history

- **2026-10-06**: Unified playbook. Merges v12 director prompt, video-pipeline
  stages, Remotion declarative-text + talking-head lessons, measured-timing
  law, render modes, and push rules into one doc. Supersedes the v9 playbook
  and all earlier scattered instructions.
