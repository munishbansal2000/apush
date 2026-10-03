# vid-u1-01 — "The World in 1491" — AI Animation Build File

*Unit 1, Chapter 1.1 — Three Worlds on the Eve of Contact. First lesson of the APUSH Explained series.*
*Narrative question: What did the Americas, Europe, and Africa each look like right before contact — and why did the encounter happen when it did?*

This file is the complete, self-contained build spec for this video's AI ambient-motion clips.
An LLM can execute it end-to-end with nothing else.

## How the clips work

- Tool: `video/animate_still.py` — LTX-Video 13B distilled, local diffusion model. No API keys.
- Each clip: a public-domain still + an ambient-motion-only text prompt → silent 5s MP4 (24fps).
- Clips are SILENT by design. Narration comes from the stage MP3; there is no sound to design here.
- Prompts MUST describe ambient motion only: clouds, water, smoke, fire, flags, fabric, foliage, dust, shimmer, heat haze.
  Never: people moving, content added/removed/changed, camera moves (no zoom/pan/dolly/orbit).
- Every prompt below was verified with `animate_still.check_prompt_safety` — all accepted.
- Always `--dry-run` first (validates prompt safety without the GPU), then render for real.

## Shot 1 — hook (manifest stage: `hook`)

- **Beat:** Cold open — Stradanus engraving, *Discovery of America* (Nova Reperta plate 1, c.1600): caravels arriving, banner planted. The first image the viewer ever sees of the series.
- **Base image (local):** `assets/images/u1/5s24-ch06-mcq-01.jpg` (1600×1141, RGB)
- **What it depicts:** Engraving c.1600 after Johannes Stradanus — European caravels anchored off a New World shore, a tall cross-topped banner being planted, dense shoreline foliage, a distant campfire with a thin smoke column.
- **Source page:** https://upload.wikimedia.org/wikipedia/commons/f/ff/New_Inventions_of_Modern_Times_-Nova_Reperta-%2C_The_Discovery_of_America%2C_plate_1_MET_DP841124.jpg
- **Direct download:** https://upload.wikimedia.org/wikipedia/commons/f/ff/New_Inventions_of_Modern_Times_-Nova_Reperta-%2C_The_Discovery_of_America%2C_plate_1_MET_DP841124.jpg
- **License:** Metropolitan Museum of Art, CC0 (public domain). Engraving c.1600.
- **Prompt (51 words):** "Thin clouds drift across the pale sky above the anchored caravels; ocean waves ripple and shimmer around the ships' hulls; the tall cross-topped banner flutters gently in the breeze; dense tree foliage stirs in the wind; a thin column of smoke rises and drifts from the distant campfire on the shore."
- **Layering:** sky (clouds drift) → water (waves ripple/shimmer at hulls) → midground (banner flutters) → shore (foliage stirs, campfire smoke rises and drifts).
- **Duration:** 5s · **Seed:** 40 · **Output:** `video/ai_clips/vid-u1-01-hook-discovery-america.mp4`

## Shot 2 — beat2a (manifest stage: `beat2a`)

- **Beat:** First primary-source voice — Columbus's journal, 13 Oct 1492. The video's signature document/voice technique: the historical voice appears while the landing scene lives behind it.
- **Base image (local):** `assets/images/u1/5s24-ch06-mcq-04.jpg` (1216×1015, RGB)
- **What it depicts:** Theodor de Bry engraving, 1594 — Columbus landing on Hispaniola: caravels with full square sails at anchor, small pennants on the masts, shoreline trees, engraved sky.
- **Source page:** https://upload.wikimedia.org/wikipedia/commons/f/f8/Columbus_landing_on_Hispaniola.JPG
- **Direct download:** https://upload.wikimedia.org/wikipedia/commons/f/f8/Columbus_landing_on_Hispaniola.JPG
- **License:** Theodor de Bry, 1594; pre-1930 publication (public domain).
- **Prompt (38 words):** "Light clouds drift slowly across the engraved sky; ocean waves ripple and shimmer around the anchored caravels; the full square sails billow gently; small pennants flutter on the masts; the distant shoreline trees stir in a faint breeze."
- **Layering:** sky (clouds drift) → water (waves ripple/shimmer) → ships (sails billow, pennants flutter) → shore (trees stir).
- **Duration:** 5s · **Seed:** 41 · **Output:** `video/ai_clips/vid-u1-01-beat2a-columbus-landing.mp4`

## Shot 3 — beat1d (manifest stage: `beat1d`)

- **Beat:** Africa's gold/trade world — Songhai, Timbuktu. A dedicated image for the Africa third of the "three worlds" structure (replaces reusing the Stradanus right-half).
- **Base image (local):** `assets/images/u1/anim-timbuktu-caillie-1830.jpg` (974×771, RGB)
- **What it depicts:** René Caillié lithograph, 1830 (drawn after his 1828 visit): flat-roofed mud-brick houses and round thatched huts of Timbuktu, mosque minarets, hills beyond, sparse trees at the city's edge. The Songhai-era trans-Saharan gold-trade city.
- **Source page:** https://commons.wikimedia.org/wiki/File:Caillie_1830_Timbuktu_view.jpg
- **Direct download:** https://upload.wikimedia.org/wikipedia/commons/1/18/Caillie_1830_Timbuktu_view.jpg
- **License:** Public domain — verified via Commons API (artist René Caillié 1799–1838, published 1830, pre-1930).
- **Caveat:** 974×771 is the maximum available resolution — workable but softer than the other two; flagged, not hidden.
- **Prompt (45 words):** "A pale heat haze shimmers over the flat-roofed mud city; thin dust drifts through the empty sky above the hills; the sparse trees at the city's edge stir faintly in a dry breeze; soft shadows move across the rooftops as the haze thickens and thins."
- **Layering:** atmosphere (heat haze shimmers over rooftops) → sky (dust drifts above hills) → edge (trees stir) → rooftops (shadows move as haze thickens/thins).
- **Duration:** 5s · **Seed:** 42 · **Output:** `video/ai_clips/vid-u1-01-beat1d-timbuktu.mp4`

## After rendering

1. Commit the three MP4s under `video/ai_clips/`.
2. Record in `video/manifests/vid-u1-01.json` under `ai_clips`:
   `{"hook": {"image": "assets/images/u1/5s24-ch06-mcq-01.jpg", "prompt": "<shot 1 prompt>", "seed": 40, "clip": "video/ai_clips/vid-u1-01-hook-discovery-america.mp4"}, "beat2a": {...}, "beat1d": {...}}`
3. In the stage builder, play each clip with `motion.ai_clip_scene("video/ai_clips/<file>.mp4", dur)` — it cover-crops to the 1080×1920 canvas, loops if short, trims if long, and counts as intentional motion for the camera-direction gate.
