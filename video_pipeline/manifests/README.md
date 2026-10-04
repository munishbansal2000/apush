# Render-ready lesson manifests

Complete Unit 1 lessons, exported as single runnable manifests. Each one
passed every hard gate (cue integrity, direction tags, TTS text, text quantity,
license/catalog, prompt↔image coherence, animation variety, text-layout
collision check) before export.

- `u1-ch1-l1-native-societies.json` — Native Societies (4 scenes)
- `u1-ch2-l4-500-men.json` — How 500 Men Toppled an Empire (10 scenes)
- `u1-ch3-l8-valladolid-debate.json` — Valladolid Debate, two-person cast (4 scenes)

## How these differ from the curricula

`curricula/unit1-chapter*.json` are the source of truth and keep two
fail-closed claims: `presentation.captions: true` and a music bed. Neither is
implemented yet, so the manifests here ship with those two claims removed —
that is the only difference. When captions/music are decided, the curricula
regain the claims and these files get re-exported.

Note: `--manifest` runs schema validation but not the hard gates (those run on
the `--curriculum` expand path). These files were gated at export time.

## Run on Windows (RTX 5090)

```powershell
cd C:\Users\munis\projects\apush
git pull
pip install edge-tts moviepy
# ffmpeg/ffprobe must be on PATH (already set up)
```

### 1. Generate the AI clips

```powershell
cd C:\Users\munis\projects\apush
python video/animate_still.py --image "assets/images/u1/original-u1-native-01.jpg" --prompt "A living historical engraving of an agricultural field. Thin clouds drift across the sky; leaves and grasses stir in a light breeze; fine dust drifts over the tilled rows of maize and beans; patches of sunlight shift softly across the ground. Keep the camera static." --out "video/ai_clips/u1-1491-maize-living.mp4" --duration 8 --seed 1491
python video/animate_still.py --image "assets/images/u1/anim-cahokia-mound-1907.jpg" --prompt "An archival photograph of the Cahokia mound at rest. Thin layered clouds move slowly across the sky; foreground grasses ripple in a light breeze; long sunlight and tree shadows shift gently over the mound and fields. The photographic composition stays fixed. Do not add buildings or people or text or modern objects." --out "video/ai_clips/u1-cahokia-mound-living.mp4" --duration 8 --seed 1051
python video/animate_still.py --image "assets/images/u1/original-u1-lascasas-portrait-01.jpg" --prompt "A historical engraved portrait of Bartolome de las Casas resting in a quiet chamber. A candle flame flicker softly nearby; its light shimmer shifts gently across the dark background; fine dust drifts through the air; a faint mist hangs near the frame. The portrait itself remains unchanged and the composition holds steady. Do not add people or text or modern objects." --out "video/ai_clips/u1-ch3-l8-valladolid-debate-l8-verdict-human-rights.mp4" --duration 8 --seed 1551
```

The ch2-l4 lesson's cavalry-charge clip (`video/ai_clips/cavalry-charge.mp4`, 8s, engraving style) is generated separately via Meta UI/LTX on the 5090 — see the clip prompt in the manifest's `s2a` scene — then dropped at that path. Fallbacks if generation fails: an AI still of the charge with slow push-in, then a de Bry archival cavalry plate via the stills search.

### 2. Render a lesson (preview first, then full)

```powershell
cd C:\Users\munis\projects\apush\video_pipeline
python orchestrator.py --manifest manifests/u1-ch3-l8-valladolid-debate.json --preview
python orchestrator.py --manifest manifests/u1-ch3-l8-valladolid-debate.json
```

Output: `build/lesson-videos/<lesson-id>.mp4` (repo root `build/`, gitignored).

Swap in the other two manifests for the other lessons. TTS uses Edge
(`en-US-GuyNeural` host, Davis/Tony for the debate cast) — no server needed.
