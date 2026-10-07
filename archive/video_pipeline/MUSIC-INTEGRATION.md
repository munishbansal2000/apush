# Music Integration Plan — pack v1

Pack: `video_pipeline/music/pack-v1/` (32 tracks + README.txt), extracted from
`apush-podcast-music-v1.zip` at the repo root (2026-10-04).
All tracks: −14 LUFS source masters, instrumental, no vocals.
Stings = WAV (10) — MP3 encoders add ~46 ms head silence, which would shift a hit off its cut.
Beds = MP3 192 kbps (22) — inaudible artifacts when ducked under voice; keeps the pack at ~72 MB.

Demos: `video_pipeline/music/demos/podcast_music_demo.mp3` (70 s),
`video_pipeline/music/demos/apush_video_music_demo.mp3` (39 s).
Build them with `python3 video_pipeline/tools/mix_music_demo.py`.

## Gain policy (from AUDIO-IDENTITY-SPEC.md — don't regress)

- Dialogue: −16 LUFS.
- Stings: gain 0.16–0.18 (~14 dB under dialogue), fade out as narration enters.
- Beds: gain 0.08 (~−22 dB under dialogue) — felt, not noticed.
- Voice ducking: 4 dB under voice where beds run continuous.
- Assembly gain sets the final level; never master quiet *and* attenuate.
- Assessments (review Q&A, exam) stay dry: no music, ever.

## APUSH video lessons (A–D tracks)

Scene structure gives us the beats for free: the `hook` scene, `topics` tags
("1.2" = Unit 1), and scene boundaries.

| Beat | Track | Gain | Notes |
|------|-------|------|-------|
| Cold open (hook scene) | `apush_A1_cold_open_stinger_v1.wav` | 0.3 hit, duck under narration | 5 s one-shot under the hook question |
| Lesson open / channel signature | `apush_A2_intro_theme_v1.wav` | 0.18, fade out by ~4 s | 15 s, every video |
| Scene boundary | `apush_A4_transition_sting_v1.wav` | 0.16 | 3 s, neutral clean break |
| Explainer scenes (default bed) | `apush_B1_focus_bed_loop_v1.mp3` | 0.08 | 180 s loop |
| Storytelling scenes | `apush_B2_cinematic_underscore_loop_v1.mp3` | 0.08 | 180 s loop |
| Primary-source reads | `apush_B3_ambient_drone_loop_v1.mp3` | 0.08 | 180 s loop |
| Crisis / tension scenes | `apush_B4_tension_bed_loop_v1.mp3` | 0.08 | 120 s loop |
| Era bed by unit | `apush_C1..C11_*_loop_v1.mp3` | 0.08 | Unit → track: 1→C1 colonial, 2→C2 revolution, 3→C3 expansion, 4→C4 civil war, 5→C5 gilded age, 6→C6 progressive/WWI, 7→C7 depression, 8→C8 WWII, 9→C9 cold war / C10 civil rights / C11 modern (pick by scene topic) |
| Debate: concept breakdown | `apush_D1_explainer_loop_v1.mp3` | 0.08 | 120 s |
| Debate: tension buildup | `apush_D2_conflict_loop_v1.mp3` | 0.08 | 60 s loop |
| Debate: resolution / victory | `apush_D3_triumph_sting_v1.wav` | 0.16 | 30 s one-shot |
| Debate: loss / memorial | `apush_D4_tragedy_loop_v1.mp3` | 0.08 | 120 s |
| Debate: review questions | `apush_D5_quiz_loop_v1.mp3` | 0.08 | 60 s loop |
| End card / outro | `apush_A3_outro_theme_v1.wav` | 0.18 | 15 s, after final narration |

Era-bed selection rule: read the scene's `topics` ("3.4" → Unit 3 → C3).
When a scene has no unit tag, fall back to B1.

## Podcast lessons (P tracks)

| Beat | Track | Gain | Notes |
|------|-------|------|-------|
| Lesson open | `podcast_P1_intro_sting_v1.wav` | 0.18, fade out by 1.8 s | Under first host line |
| Chapter boundary | `podcast_P2_chapter_sting_v1.wav` | 0.16 | The workhorse |
| Reflective beats (ethics dilemmas, lived experience) | `podcast_P3_reflective_sting_v1.wav` | 0.14, 0.8 s fade | Script-marked |
| Momentum beats (debates, energetic opens) | `podcast_P4_momentum_sting_v1.wav` | 0.16 | Script-marked |
| Lesson close | `podcast_P5_outro_sting_v1.wav` | 0.16, 1.0 s fade | After wrap-up |
| Trial beds (keep ≤1 or kill all) | `podcast_P6/P7/P8_bed_*_loop_v1.mp3` | 0.06 / **0.08** / 0.10 | Ear-test pending; see spec |

Render scripts read track/gain/fade from a single contract (`audio_identity.json`
pattern) — lesson files never reference music directly.

## APUSH audio formats (interview flagship)

`video_pipeline/examples/audio-formats/build_format.py` is now pack-v1 native
(2026-10-04): P1 intro / P2 chapter stings / P5 outro / P6 trial bed @ 0.10
ducked under dialogue. The old placeholder MP3s are no longer referenced.

Flagship rebuild: `examples/audio-formats/interview/u3-l3-INTERVIEW-pack1.mp3`
(283 s) — same Maya/Marcus dialogue, P1 @ open, P2 @ the representation beat
(1:44) and the Stamp Act beat (2:36), P6 bed ducked throughout, P5 outro.
Built with `examples/audio-formats/remix_interview_pack1.py` (no Fish re-render;
mixes from the cached turn files). This doubles as P6 ear-test material.

## Notes

- D2 and D5 rendered as 60 s loops (not 120 s) — fine for looping, recorded here
  so nobody "fixes" it later.
- `video_pipeline/music/` still holds 3 legacy placeholder MP3s
  (absounds, alex_kizenkov, papulina). They are superseded by pack-v1 —
  recommend deleting from the repo (owner's call; not deleted here).
- If any MP3 bed ticks at the loop point in a real render, re-render that one
  bed as WAV.
