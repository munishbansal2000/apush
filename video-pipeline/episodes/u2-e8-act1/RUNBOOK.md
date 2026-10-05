# U2-E8 Act 1 — e2e runbook (resilient pipeline + LTX)

Act 1: turns 0–9, 8 scenes, 4 LTX vidslide scenes. The plan in
`work/scene_plan.json` is the locked director's cut, adapted:
mapzoomslide → **vidslide** on scenes 02/03/06/08 (the doc's "never
vidslide" note predates `conform_clip.py`, which conforms any clip to
exactly the scene's frame count).

## Timing truth (read this — it bit us)

The mix recipe is **offset 1.8s + 0.6s gap after every turn + 4.5s
tail** (`build_format.py`). The video model follows it exactly:

- `D[0] = 1.8 + Σ(dur + 0.6)` over scene-0 turns (title holds the sting)
- `D[i] = Σ(dur + 0.6)` over the scene's turns (cuts land on turn starts)
- `D[last] += 4.5` (last scene holds the outro)
- refit + the compiler's `--timings` check both enforce this. A
  straight-concat plan is ~7s adrift by scene 8 and is refused.

## e2e sequence (Windows / 5090)

```bat
cd video-pipeline

:: 1. TTS: per-turn MP3s -> tts/t00.mp3 ...
python ..\tools\render\render_episode.py --script episodes\u2-e8-act1\act1-script.md --turns-dir episodes\u2-e8-act1\tts

:: 2. Mix with the house recipe -> tts/act1-mix.mp3
python ..\video_pipeline\examples\audio-formats\build_format.py <turns> tts\act1-mix.mp3 0.6 "Jumonville" "Monongahela"

:: 3. Timings from the real turn files
python pipeline.py --episode u2-e8-act1 --only timing

:: 4. Refit the locked plan to measured audio (gap-aware; rewrites durations,
::    shifts scene-01 overlays by +1.8). Idempotent.
python refit_durations.py episodes\u2-e8-act1\work\scene_plan.json episodes\u2-e8-act1\tts --timings episodes\u2-e8-act1\work\timings.json

:: 5. Generate the 4 LTX clips on the 5090 (prompts in ltx/prompts/).
::    1920x1080, 30fps if available.

:: 6. Conform each clip to EXACTLY its scene's refit frame count:
python conform_clip.py episodes\u2-e8-act1\ltx\raw\ohio_zoom.mp4        <frames> episodes\u2-e8-act1\assets\ltx\act1_ohio_zoom.mp4
python conform_clip.py episodes\u2-e8-act1\ltx\raw\jumonville_rain.mp4  <frames> episodes\u2-e8-act1\assets\ltx\act1_jumonville_rain.mp4
python conform_clip.py episodes\u2-e8-act1\ltx\raw\braddock_route.mp4  <frames> episodes\u2-e8-act1\assets\ltx\act1_braddock_route.mp4
python conform_clip.py episodes\u2-e8-act1\ltx\raw\monongahela_pulse.mp4 <frames> episodes\u2-e8-act1\assets\ltx\act1_monongahela_pulse.mp4
:: frames = scene duration_sec * 30 from the refit plan.
:: (ltx/manifest.json has the estimate-based commands; recompute after step 4.)

:: 7. Full e2e: direct (uses the locked plan) -> render -> assemble -> verify.
::    The compile REFUSES estimates when work/timings.json exists, so step 4
::    cannot be skipped.
python pipeline.py --episode u2-e8-act1
```

## Gates that run inside the e2e

- `lint_plan`: overlay collisions/overruns, sub-1s scenes, transitions.
- compiler `_validate_turns`: scenes partition turns 0–9 contiguously.
- compiler `--timings`: every scene matches the gap-aware mix model ±0.02s.
- `render_exact`: every encode verified at exactly its frame count.
- verify: video/audio within 1 frame, frame count == manifest total.

## Edge test path (runs on Windows today; Fish is final-only)

```bat
cd video-pipeline

:: 1. Edge test voices -> tts/t00.mp3 ... (Aria/Guy neural)
python edge_tts_turns.py episodes\u2-e8-act1\script_turns.json episodes\u2-e8-act1\tts

:: 2. Portable mix (offset/gap/tail recipe; build_format.py needs Linux+Fish)
python mix_turns.py episodes\u2-e8-act1\tts episodes\u2-e8-act1\tts\act1-mix.mp3

:: 3-4. Timing + gap-aware refit (same as Fish path)
python pipeline.py --episode u2-e8-act1 --only timing
python refit_durations.py episodes\u2-e8-act1\work\scene_plan.json episodes\u2-e8-act1\tts --timings episodes\u2-e8-act1\work\timings.json

:: 5. Test placeholder clips (self-labeled; delete when LTX lands), then conform
::    to the REFIT frame counts (duration_sec * 30 from the refit plan):
::    see test_assets/raw/*.mp4 -> conform_clip.py -> test_assets/ltx/*.mp4

:: 6. Fast low-res loop with audio (640x360, placeholders, Edge mix):
python pipeline.py --episode u2-e8-act1 --only direct,slideforge_render,assemble,verify --assets-dir episodes\u2-e8-act1\test_assets --width 640 --height 360
::    direct uses the locked plan; timings are enforced; verify checks
::    cfg dims + 1v+1a + non-silent audio + no black frames.
```

Gaps this path found and fixed:

- `timing.py` dropped `tail` from timings.json (4.5s outro lost downstream).
- `mix_turns.py` is new: the concat demuxer mis-decodes mixed mp3/wav
  segments with rc 0, so turns are normalized to wav first and the mix
  is refused when it drifts from the model.
- `verify` hardcoded 1920x1080; now cfg-driven (default 1920x1080).
- `pipeline.py` takes --width/--height/--fps/--assets-dir overrides so
  fast tests never touch committed config.
- `HighlightSlide` takes `ink` (light ink for dark acts; was unreadable).

## What's validated here (no TTS/render on the VM)

- [x] plan lints: 1 warning (scene-06 "Fort Duquesne" pop is 1.0s, under the
      1.2s don't-flash floor; the locked cut keeps it to fit the scene end —
      refit grows the scene by the 0.6s gap, then it fits at 1.2s)
- [x] structural build of all 8 scenes (4 vidslide vs conformed placeholder
      clips at /tmp/act1assets — placeholders only, not the real LTX)
- [x] turn partition valid (0–9 contiguous), schema required keys present
- [x] frame boundaries: 3696f total, movie total == plan sum (123.2s)
- [x] all 9 keywordpop phrases found in their scenes' turns (`word_timing`)
- [x] LTX prompts packaged with conform targets (`ltx/manifest.json`)
- [x] `gen` provenance param accepted by the compiler (matches existing
      u2-e8 plan); `highlights` list converted to `==markers==`
- [x] scene-01 uses the uploaded title-card art as a static imageslide
      (drift off, overlays dropped — the card is a finished composition;
      pops covered the title, the caption covered the boxes)
- [ ] TTS + timings + refit (needs Fish + the go)
- [ ] LTX generation (5090) + conform (needs the clips)
- [ ] render + assemble + verify (needs everything above)
