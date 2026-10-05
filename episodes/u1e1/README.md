# U1-E1 — Native Societies

APUSH Unit 1, Episode 1. Fully pipeline-buildable: clone, install, run.

## Rebuild

```bash
# From repo root
pip install -e slideforge/   # or: pip install ./slideforge
# ffmpeg + ffprobe required

cd episodes/u1e1
python3 build.py --plan plans/act1_scene_plan.json --tts-dir tts/per_turn --out u1e1_act1.mp4
python3 build.py --plan plans/act2_scene_plan_v9.json --tts-dir tts/per_turn --out u1e1_act2.mp4
python3 build.py --plan plans/act3_scene_plan_v9.json --tts-dir tts/per_turn --out u1e1_act3.mp4
```

The build script renders each scene silently at exact 30fps frame counts
(cumulative rounding), concatenates scenes, concatenates per-turn audio,
muxes once, and verifies audio/video drift is under 1 frame (0.033s).

## Layout

- `build.py` — the scene renderer (plan → silent scenes → mux with TTS)
- `script/` — `turns.json` (58 dialogue turns), `timing_map.json` (measured durations)
- `plans/` — per-act scene plans (v9 = current)
- `assets/images/` — all sourced images (see manifests for provenance/licenses)
- `assets/*_asset_manifest.md` — per-act image provenance, URLs, licenses
- `tts/per_turn/` — per-turn MP3s (`t00.mp3` … `t57.mp3`)

## Voices (placeholder)

The TTS in `tts/per_turn/` uses **placeholder voices** (Fish `aria`/`briggs`
standing in for Maya/Marcus). They establish timing only. Replace with final
Fish Maya/Marcus voices before shipping; file names and turn boundaries are
the contract, not the voice identity.

## Word timing

Scene plans align headlines and reveals to spoken phrases using **proportional
word-count estimates**, not forced alignment. Audio/video duration sync is
exact (WAV/MP3-measured), but semantic word-level alignment is estimated.
Run real forced alignment against the final TTS before calling the episode
final.

## Act boundaries

- Act 1: t00–t11 (`plans/act1_scene_plan.json`)
- Act 2: t12–t22 (`plans/act2_scene_plan_v9.json`)
- Act 3: t23–t32 (`plans/act3_scene_plan_v9.json`)
- Act 4: t33–t40 (not yet built)
- Act 5: t41–t57 (not yet built)

## Director prompt

Scene plans are produced by the director prompt at
`docs/director-prompt-v9.txt` (current). The prompt is the reusable contract;
these plans are its output for this episode.
