# U1-E1 LTX PLATE PACK — 2 plates, all ≤15s
# Palette lock: warm earth tones (terracotta #C67B5C, sage #8A9A7B, river blue #4A6B8A, dawn amber #E8A84C)
# Global negatives (all plates): no faces, no modern objects, no text, no watermark, no people

---

## PLATE 1 — desert_dawn.mp4
**Scene:** scene-03 (Southwest/Pueblo beat) | **Duration:** 6s | **Narration:** "Start with the Southwest. Hot, dry, unforgiving. The Pueblo peoples built adobe villages and farmed the desert."

**Prompt:**
Slow aerial drift over Sonoran desert at dawn. Saguaro cacti and red rock formations, long shadows. Dry riverbed winding through. No people, no structures, no roads — pristine desert. Warm terracotta and amber palette, soft dawn light. Camera drifts laterally, smooth and weightless. The desert dwarfs everything. Ancient, patient.

**Speed:** Slow lateral drift, ~10% frame width over 6s.
**Integration:** Slideforge `vidslide` src. Crossfade in from previous, out to bison plate. No overlays — pure atmosphere.

---

## PLATE 2 — river_mist.mp4
**Scene:** scene-06 (Cahokia intro) | **Duration:** 8s | **Narration:** "Around 1100, Cahokia held maybe 10,000 to 20,000 people, right across the river from what is now St. Louis."

**Prompt:**
Slow aerial over the Mississippi River at dawn, mist rising off the water. Bottomland forest on both banks, the river wide and brown-green. No boats, no bridges, no modern structures — the river as Cahokia knew it. Cool blue-green palette with warm dawn light breaking through mist. Camera drifts forward slowly, following the river's curve. Vast, ancient, alive.

**Speed:** Slow forward push, ~8% over 8s. Mist drifts.
**Integration:** Slideforge `vidslide` src. Overlay: timestamp "c. 1100 · THE MISSISSIPPI" upper-left, fades in at 0:01, out at 0:07. Crossfade in/out.

---

## INTEGRATION SUMMARY

| Plate | File | Scene | Slideforge composite |
|-------|------|-------|---------------------|
| 1 | desert_dawn.mp4 | scene-03 | vidslide, no overlays |
| 2 | river_mist.mp4 | scene-06 | vidslide + timestamp |

**Render specs:** 1280x720, 24fps (pipeline upsamples to 30), H.264 MP4.
**Place in:** `video-pipeline/episodes/u1-e1/ltx/` — the scene plan references `ltx/<file>.mp4`.
**Fallback:** If LTX files are absent, build_act1.py falls back to ImageSlide with Ken Burns on the corresponding still photo.
**My job after you render:** composite the Slideforge overlays, time them to the narration, and assemble. I do NOT re-render your plates — they go in as-is.
