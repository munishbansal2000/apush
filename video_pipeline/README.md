# APUSH lesson-video pipeline

This is the video counterpart to the federal-tax podcast pipeline. It reuses
that system's durable checkpoints, atomic state, content hashing, resumable
stages, provider abstraction, and fail-closed gates, while reusing
`video/motion.py` for the actual APUSH visual language.

## Start Fish once

From `federal-tax-update-2026/tools/podcast-pipeline`:

```powershell
& "C:\Users\munis\projects\fish_exmple\.venv\Scripts\python.exe" `
  tools\render_audio.py --serve
```

Use the URL printed by the server in the lesson manifest. The normal port is
`8123`.

## Build

From the APUSH repository:

```powershell
python video_pipeline\orchestrator.py `
  --manifest video_pipeline\examples\lesson.example.json

python video_pipeline\orchestrator.py `
  --manifests video_pipeline\manifests.example.json

# Expand and build every lesson in a unit/chapter curriculum
python video_pipeline\orchestrator.py `
  --curriculum video_pipeline\examples\unit1-chapter1.curriculum.json `
  --poc --preview
```

The curriculum manifest provides the complete hierarchy:

```text
course
└── units[]                    unit metadata, AP period, themes, objectives
    └── chapters[]             questions and chapter objectives
        └── lessons[]          TTS, presentation, alignment, terms, output
            └── scenes[]       narration, visuals, sources, animation, timing
```

`defaults` supplies shared video, TTS, planning, clip-generation, and
presentation settings. Each embedded lesson may override them. The orchestrator
expands the hierarchy, injects chapter and AP alignment metadata, checks lesson
IDs for global uniqueness, validates every asset and animation, and then gives
each lesson its own resumable build state.

Ready-to-run Edge + Meta video POC:

```powershell
# Inspect everything without contacting Edge or Meta
python video_pipeline\orchestrator.py `
  --manifest video_pipeline\examples\poc-meta-lesson.json `
  --poc --preview --dry-run

# Generate the 10-second Meta clip, Edge narration, and preview lesson
python video_pipeline\orchestrator.py `
  --manifest video_pipeline\examples\poc-meta-lesson.json `
  --poc --preview --video-gen meta-ui

# Use the same lesson with local LTX instead of Meta
python video_pipeline\orchestrator.py `
  --manifest video_pipeline\examples\poc-meta-lesson.json `
  --poc --preview --video-gen ltx `
  --ltx-python "C:\Users\munis\projects\fish_exmple\.venv\Scripts\python.exe"
```

Useful resumability controls:

```powershell
# Schema, assets, and AI animation planning only; no TTS/video calls
python video_pipeline\orchestrator.py --manifest lesson.json --dry-run

# Restart after TTS without repeating it
python video_pipeline\orchestrator.py --manifest lesson.json --from-stage rendered

# Regenerate one stage explicitly
python video_pipeline\orchestrator.py --manifest lesson.json --only tts --force

# Remote Fish Audio: set FISH_API_KEY, then use tts.engine=fish_cloud.
# Optional tts.reference_id and per-voice reference_id values select cloned voices.
$env:FISH_API_KEY = '<your Fish Audio API key>'
python video_pipeline\orchestrator.py --manifest lesson.json --only tts --force

# Faster 720x1280 motion-approval render
python video_pipeline\orchestrator.py --manifest lesson.json --preview

# Fast POC narration through Edge TTS; Fish may remain running but is unused
python video_pipeline\orchestrator.py --manifest lesson.json --poc --preview

# POC with explicit local or Meta image-to-video generation for ai_clip scenes
python video_pipeline\orchestrator.py --manifest lesson.json --poc --preview --video-gen ltx
python video_pipeline\orchestrator.py --manifest lesson.json --poc --preview --video-gen meta-ui

# Inspect checkpoints without doing work
python video_pipeline\orchestrator.py --manifest lesson.json --status
```

## Stage contract

1. `validated`: strict schema, no unknown fields, local asset resolution,
   unique scene IDs, animation-specific validation, and voice-reference checks.
2. `planned`: `animation.type=auto` is replaced by validated JSON from local
   Ollama or Meta's `/responses` API. The base image is included for multimodal
   models. Generated prose is never executable. Dry runs use a deterministic
   `ken_burns` stand-in and make no provider call.
3. `clips`: missing `ai_clip` assets are generated through local LTX or the
   Meta UI image-upload/download bridge. LTX safely generates up to six seconds
   and extends the artifact to the requested 3-10 seconds; Meta requests the
   full duration directly and fails closed unless it downloads real media.
4. `tts`: production scenes can use the resident Fish `/synthesize` endpoint
   (`fish`) or Fish Audio's remote API (`fish_cloud`, authenticated through
   `FISH_API_KEY`). Manifests with `tts.engine=edge` and `--poc` runs use Edge
   TTS. All modes are cached by narration, voice/reference, and settings hash.
5. `rendered`: the declarative animation registry calls the existing APUSH
   motion primitives, stages and closes one scene at a time to keep memory
   bounded, then assembles the narration-aligned scene files.
6. `complete`: ffprobe checks streams, resolution, and duration; ffmpeg rejects
   black runs of 0.75 seconds or longer.

Every lesson gets `build/lesson-videos/<lesson-id>/state.json`, the immutable
input manifest, the resolved animation manifest, per-scene WAV metadata, and a
final validation report. Changing a manifest invalidates its checkpoints.

## Animation types

`title`, `ken_burns`, `zoom`, `camera_path`, `callout`, `timeline`, `bullets`,
`typewriter`, `map`, `counter`, `versus`, `wipe`, and `ai_clip` map directly to
reviewed primitives in `video/motion.py`. `auto` asks the configured model to
choose one validated non-video primitive. `ai_clip` consumes a pre-generated
local MP4; the pipeline never silently uploads an image.

## Creative direction layer

The runtime also supports the higher-production vocabulary used by the Unit 1
chapter sample:

- `parallax` composites depth-ranked PNG cutouts or archival cards over a
  moving background. Each layer has position, scale, depth, drift, and entrance.
- `source_analysis` schedules normalized evidence boxes and annotation cards
  over a primary source.
- `diagram` animates validated nodes and causal/network edges; it is useful for
  systems, comparisons, and visual metaphors.
- Scene `beats` schedule labels, questions, archival stamps, arrows, progress
  bars, a recurring historian guide, icons, and pause prompts over any visual.
- Timed elements may use `cue` text copied from the narration instead of a
  brittle absolute `at` value. Edge TTS records real word-boundary timestamps;
  cues use those exact offsets. Engines without boundaries use a proportional
  narration fallback tied to the real WAV duration.
- Scene `transition` selects hard cuts, crossfades, directional slides, or a
  dip from black.
- Scene `audio` mixes optional looping ambience plus file-based or built-in
  `impact`, `whoosh`, `tick`, `chime`, and `page_turn` cues under narration.
- Lesson-level `music` provides one continuous background score with automatic
  narration ducking, first-scene intro, last-scene outro, and chapter-change
  stingers selected by scene ID. The background resumes from the lesson's
  cumulative time instead of restarting at every scene.
- `ai_clip` can select `provider` and `fallback_provider` per scene. This lets a
  lesson use Meta for cinematic hero shots and LTX for controlled local loops,
  while maps, evidence, text, and AP reasoning remain deterministic.

Together these cover layered/cutout animation, animated atlas sequences,
primary-source investigation, diagrams, visual metaphors, richer transitions,
recurring guide moments, AP pause-and-predict interactions, sound design, and
selective generative video. The model-assisted `auto` director can choose
source annotations and diagrams as well as the original motion primitives; its
JSON is subjected to the same hard validator before rendering.

Every rendered text element is registered with a normalized bounding box and
visible time interval. Planning writes `layout_report.json`; rendering repeats
the check against actual WAV durations and writes `layout_report.actual.json`.
Out-of-frame text, missing narration cues, and simultaneous text overlap fail
the pipeline before the final encode.

An image-to-video scene looks like this:

```json
{
  "clip_generation": {
    "provider": "meta-ui",
    "cookie": "C:/path/to/meta-cookies.json",
    "browser": "chrome"
  },
  "scenes": [{
    "id": "living-map",
    "narration": {"text": "Narration aligned to this generated clip."},
    "visual": {
      "base_image": "assets/images/u1/u1-caravel-fleet-huys.jpg",
      "clip": "video/ai_clips/caravel-crossing.mp4"
    },
    "animation": {
      "type": "ai_clip",
      "prompt": "The fleet advances steadily across rolling swells while sails billow and pennants stream in the wind.",
      "duration": 10,
      "seed": 42
    }
  }]
}
```

`--video-gen ltx` invokes the checked-in `video/animate_still.py` safety
filter and local diffusion model. `--video-gen meta-ui` uses the existing
logged-in Meta browser adapter, uploads the base image, requests a downloadable
3-10 second animation, and refuses to continue if no real video is downloaded.
Meta UI automation is inherently more sensitive to website UI changes than the
local LTX path.

Set `clip_generation.keep_open_on_failure` to `true` while calibrating Meta.
On failure, the browser and DevTools remain open until Ctrl+C, and the bridge
saves `page.png`, `page.html`, `state.json`, plus any manual downloads beside
the requested clip under `video/ai_clips/meta-video-debug-*` and
`video/ai_clips/.meta-video-*`.

Meta sometimes replies that it could not generate the exact requested
animation. The bridge detects that refusal and sends one bounded follow-up:
“Do your best,” requesting the closest safe animation with subtle environmental
motion. Configure `clip_generation.meta_refusal_retries` from `0` to `3`
(default `1`). A retry still must yield a real downloadable video; prose or an
empty response never counts as success.

The machine-readable shapes are in `schemas/lesson.schema.json` and
`schemas/curriculum.schema.json`. The detailed Unit 1 example is
`examples/unit1-chapter1.curriculum.json`. The Python validator is authoritative
because it additionally enforces inheritance, cross-field rules, unique IDs,
file existence, path resolution, and animation-specific parameter bounds.

The agent-facing creative standard is in `CREATIVE_VIDEO_PLAYBOOK.md`, with a
story-first worked brief in `examples/creative-brief.example.json` and a
production-ready example in `manifests/u1-ch3-l8-valladolid-debate.json`.

Lesson music is configured once at the manifest root:

```json
{
  "music": {
    "background": "video_pipeline/music/background.mp3",
    "background_volume": 0.1,
    "ducking": {
      "enabled": true,
      "threshold": 0.025,
      "ratio": 10,
      "attack_ms": 18,
      "release_ms": 420
    },
    "fade_in_sec": 1.2,
    "fade_out_sec": 2.0,
    "intro": "video_pipeline/music/intro.mp3",
    "intro_volume": 0.2,
    "intro_duration_sec": 2.4,
    "outro": "video_pipeline/music/outro.mp3",
    "outro_volume": 0.18,
    "outro_duration_sec": 4.0,
    "chapter_change": "video_pipeline/music/chapter-stinger.mp3",
    "chapter_change_volume": 0.16,
    "chapter_change_duration_sec": 1.1,
    "chapter_change_scene_ids": ["argument-begins", "reversal"]
  }
}
```

## Dependencies

Rendering needs Python 3.11/3.12, MoviePy 2, NumPy, Pillow, ffmpeg, and ffprobe.
The Fish environment only has to run the resident HTTP server. The orchestrator
can run in a separate Python environment with `requirements.txt` installed.
