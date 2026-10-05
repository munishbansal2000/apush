# Music Pack v1 — Handoff Note (2026-10-04)

For the agent picking up music work in this repo. Munish's direction is quoted;
everything else is verified state.

## What Munish decided

- The **2-person interview format is the winner** ("The 2 person one was the best").
  The flagship template stays Maya (host) + Marcus (expert).
- The single-narrator APUSH video demo was rejected twice: "full of music and loud"
  then "too much music." Do not rebuild in that direction without new direction.
- Podcast-side stings/beds (P1–P8) go in the **sample podcasts** (interview et al.),
  not just the video demos. The pack-v1 interview rebuild below is the reference.

## Artifacts (repo-relative paths)

| Artifact | Path | Notes |
|---|---|---|
| Source zip (72 MB) | `apush-podcast-music-v1.zip` (repo root) | 32 audio + README, integrity-verified |
| Extracted pack | `video_pipeline/music/pack-v1/` | 10 WAV stings + 22 MP3 beds + README.txt |
| Integration plan | `video_pipeline/MUSIC-INTEGRATION.md` | Track→beat mapping, gains, era-bed unit table |
| Demo mixer | `video_pipeline/tools/mix_music_demo.py` | Builds both demos; rerun after any gain change |
| Podcast demo (70 s, APPROVED) | `video_pipeline/music/demos/podcast_music_demo.mp3` | P1/P2/P6/P5 over interview excerpt — Munish liked this |
| Video demo (39 s, REJECTED) | `video_pipeline/music/demos/apush_video_music_demo.mp3` | Too much music; do not use as reference |
| Format builder (pack-native) | `video_pipeline/examples/audio-formats/build_format.py` | Now defaults to pack-v1 (P1/P2/P5/P6); placeholders unreferenced |
| Flagship rebuild (283 s) | `video_pipeline/examples/audio-formats/interview/u3-l3-INTERVIEW-pack1.mp3` | Same Maya/Marcus dialogue, P1@open, P2@1:44 (representation beat) and 2:36 (Stamp Act beat), P6 bed ducked @0.10 throughout, P5 outro. Peak −4.1 dB, no clipping |
| Remix script | `video_pipeline/examples/audio-formats/remix_interview_pack1.py` | Rebuilds the flagship from cached Fish turns (no re-render) |

## Gain policy (locked by Munish's ear)

- Dialogue −16 LUFS. Stings 0.16–0.18 (~14 dB under dialogue), fade out as speech enters.
- Beds 0.06–0.10 (~−22 dB). Voice ducking 4 dB where beds run continuous.
- A1 cold-open hit: 0.3 max (0.5 was rejected as loud).
- Assessments stay dry: no music, ever.

## Pack contents (32)

- **WAV one-shots (10):** A1 cold open, A2 intro theme, A3 outro, A4 transition,
  D3 triumph, P1 intro, P2 chapter, P3 reflective, P4 momentum, P5 outro.
- **MP3 seamless loops (22):** B1 focus, B2 cinematic, B3 drone, B4 tension;
  C1–C11 era beds (colonial → modern); D1 explainer, D2 conflict (60 s),
  D4 tragedy, D5 quiz (60 s); P6 warm neutral, P7 soft pulse, P8 airy minimal.
- All −14 LUFS source masters, instrumental, no vocals. D2/D5 are 60 s loops by
  design (not 120 s) — do not "fix."

## Open items

1. **P6–P8 ear test unresolved.** P6 is in the flagship rebuild as trial material;
   P7/P8 not yet evaluated. Keep at most one bed, or none — Munish's call.
2. **Video-side music direction open.** The rejected demo tried A1/A2/A4/C2/A3 in
   39 s. If video needs music at all, propose minimal (stings-only or one low bed)
   and demo before building.
3. **Legacy placeholders** (`video_pipeline/music/`: absounds, alex_kizenkov,
   papulina MP3s) are superseded — deletion needs Munish's explicit OK.
4. **Nothing here is pushed.** The pack, plan, demos, and script edits are
   local-only; apush push is blocked on token scope (see `~/workspace/AGENTS.md`).

## Don't regress

- `make-music-zip.ps1` (Munish's Windows script): the "Files packed: N" line must
  count real zip entries — a hardcoded count lied to him once already.
- Interview template = Maya hosts, Marcus experts. Persona character comes from
  Fish direction tags, never from different music.
