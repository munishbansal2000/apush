# APUSH Video Production Guide — Workstream D

**Series:** APUSH Explained — motion-graphic explainer videos for the Fall 2026 CED (May 2027 exam). 9:16 vertical, 1080×1920, 30fps.
**Status:** Template + 3 worked exemplar production rows (not scripts — narration scripts are a later build step).
**Companion docs (read first):** `video/PLAYBOOK.md` (Workstream A — canonical where grounded in shipped code: TTS/narration JSON, content-JSON schema, manifest schema, timing rules, 6–8 min / 900–1,200-word format), `build/engagement-playbook.md` (the 205-transcript mechanics study + 5 differentiation openings), `video/motion.py` (the ONLY animation primitives — never invent others), `video/cuba_narration.json` (the Cuba v4 multi-voice exemplar), `video/render_narration_fish.py` (fish-speech TTS).
**Video IDs below are PROVISIONAL** — taken from `build/video-series-bible.md` episodes 1–3. Workstream C's COURSE-PLAN.md is not in the repo yet; if it renumbers episodes, remap the IDs there, not here. The topics (U1 1.1–1.3) are the sensible defaults either way.

## Standing production rules (user's, non-negotiable)

1. **NO black/white empty screen EVER.** Every second of every video carries visual content — image, animation, or text over imagery. Consequence: text-driven scenes (`kinetic_text`, `title_card`, `typewriter_scene`, `timeline_scene`) all accept `bg_img` — **always pass one**. Their near-black flat defaults are for pilots only, never for shipped videos.
2. **Subject-match is MANDATORY.** The image on screen must depict what the narration is saying at that moment. No decorative filler, no generic stock-feel images. A beat about the Cotton Gin shows a cotton gin, not a factory.
3. **No near-miss substitution.** Where no catalog image matches a beat, log it as a sourcing gap (a BLOCKER), never swap in a loosely related image.
4. **PD-only media, local-only.** Every image lives in `assets/images/u<N>/`; references are local paths. Provenance (source URL + license rationale + date) is recorded in `assets/images/CATALOG.json`. Original Commons page URLs stay in the provenance record.
5. **Fall 2026 CED.** No old-format language, no quarantined topics (geometric-style rules don't apply here, but the APUSH equivalent: no SAQ-choice talk, no 3-choice LEQ talk — those are dead).
6. **Plain language.** No trap/trick/distractor sales-jargon anywhere student-facing.
7. **Mechanics only from the competitor.** Never copy lines, jokes, catchphrases, angles, or explanations from any analyzed transcript.

---

# Part 1 — The repeatable template

## 1a. Image mapping: subject-match from the catalog

**The catalog.** `assets/images/CATALOG.json` (241 entries, all verified on disk, committed) is the single source of truth. Built by `build/build_image_catalog.py` from:
- (a) `build/image-download-report.json` → the `downloaded` dict is keyed by SOURCE URL; the Wikimedia Commons/upload filename names the subject (decoded, underscores→spaces, extension stripped); `item_id` + `files` give topic context;
- (b) enrichment from the repo's own provenance docs: `build/tests/visual-pool/IMAGES-U*.md`, `build/reclaim-merged/IMAGES*.md` + staged `IMAGES-*.md` (id → PD rationale), and `build/fresh-written` drafts (id → `image_caption`).

Each entry: `id`, `local_path`, `subject`, `period`, `topic_tags`, `provenance{source_url, direct, date, license_note}`, `on_disk`.

**Query it, don't browse folders:**
```bash
# find every map in U1
jq '.entries[] | select(.period=="U1") | select(.topic_tags[]=="map") | .local_path' assets/images/CATALOG.json
# subject search for a beat about the Middle Passage
jq '.entries[] | select(.subject | test("(?i)middle passage|slave ship|brookes")) | {id, local_path, subject}' assets/images/CATALOG.json
```

**The mapping procedure (per video, per beat):**
1. Write the beat's subject in one noun phrase ("Potosí silver mining", "casta painting: mestiza panel").
2. Query the catalog. Take the best subject match.
3. Priority order on ties: `original-*` / fresh-written (built for this content) → period reclaim (`5s24`/`pr25e`/`barrons`/`saq-set`, all PD-verified) → neighbor-period overflow with the reason recorded (e.g. `u2/original-u1-trade-*` files are mislabeled by folder but period-U1 in subject — the catalog's `period` field is authoritative, not the folder).
4. **Every scene — including text scenes — gets a background image.** `kinetic_text(..., bg_img=...)`, `title_card(..., bg_img=...)`, `typewriter_scene(..., bg_img=...)`, `timeline_scene(..., bg_img=..., darken=150)`. If no subject-matched image exists for a text scene's beat, that is a BLOCKER gap (see gap log), not a reason to ship flat black.
5. Reuse across videos is allowed but rotate: don't make the same image the hero of two videos. The asset row records each video's first-use.

**Gap log (sourcing BLOCKERs).** New PD images come from Wikimedia Commons / Library of Congress. Every gap row needs: needed-for (video + beat), subject description, candidate source URL, license rationale (pre-1930 publication OR explicit CC0/PD tag on the Commons page), date of the work. Format:
`| gap id | video.beat | subject needed | candidate source | license | status |`

**Provenance requirements for any new source:** source page URL + direct file URL + license rationale + date, appended to CATALOG.json via re-running `build/build_image_catalog.py` after `image-download-report.json` is extended (or hand-adding the entry in the same schema). The file goes in `assets/images/u<N>/`, never hotlinked.

## 1b. Rendering plan: pedagogical mapping (complete, inventoried from `video/motion.py`)

Use ONLY these primitives. Do not invent scene types. The bible's `counter_scene`/`chart_scene`/`split_scene` were never built — they don't exist in `motion.py`.

| Intent | Primitive | Key params | Notes |
|---|---|---|---|
| Quotes — the historical voice appears live | `typewriter_scene` | `text` (the quote), `sub` (attribution), `bg_img` REQUIRED | Types char-by-char with blinking cursor. Size `dur` generously: text completes at 85% of `dur`; the quote-voice MP3 sets the floor. |
| Sequences / causation chains | `timeline_scene` | `events=[(label, caption)]`, `title`, `bg_img` REQUIRED | Dots + labels pop in left→right in sync, alternating above/below the rail. Use for "road to X", life-cycle, cause chains. |
| Documents / photos — the sourcing move | `doc_zoom` | `img_path`, `highlight_box=(x0,y0,x1,y1)` in 0..1, `caption` | Slow push-in; the gold `highlight_box` fades in at 35% of duration, landing on the key passage AS the narration quotes it. This is document-teardown / SAQ-sourcing practice smuggled into content. |
| Image analysis — "look at this detail" | `callout_scene` | `img_path`, `points=[(cx,cy,label)]` in 0..1, `caption` | Expanding gold ripple rings land on points in sequence, with labels. For paintings, cartoons, multi-panel images (casta sets). |
| Geography / expansion / migration | ⚠️ GAP — no general map primitive | — | `cuba_map_scene` is a Cuba-1962 one-off, NOT reusable. Until the engine ships a general `map_scene` (animated route-draw + territory shading over an arbitrary PD map image), the recipe is: `camera_path` over a PD map image with waypoints tracing the route (e.g. Columbus's four voyages), or `callout_scene` with labeled points on the map. Log the missing primitive as engine backlog; don't fake it with a bespoke hard-coded scene. |
| Definitions / key terms | `annotate` kind `'term'` | `term`, `gloss` | Lower-third key-term card + gloss, gold bar. The memory-device move: name the term, then repeat it 5–8× in the narration. |
| Verdicts / "so what" | `kinetic_text` (big) or `annotate` kind `'point'` (card) | `phrase` + `sub`; `bg_img` REQUIRED for kinetic | Spring-overshoot slam (`ease_out_back`). Use for the significance hammer: fact → "the point is" → consequence, one slamming line. |
| Fun beats | `annotate` kind `'pop'` | `text` | Giant tilted word-slam. Lexical humor only — 8–10 signature intensifiers used consistently, never jokes with setups, never memes. |
| Transitions | `punch_in` | wraps any clip: `punch_in(clip, amount=0.07, dur=0.5)` | Quick 1.07→1.0 zoom punch at scene start. NOT soft fades — punch_in replaces them everywhere. |
| Default full-bleed scene | `kb_scene` | `img_path`, `dur`, `zoom=0.14`, `pan_x`/`pan_y` drift target | Slow Ken Burns zoom + drift over an image. Aim `pan_x/pan_y` at the image's interest point. |
| Emphasis move | `zoom_to` | `img_path`, `cx`, `cy`, `end_zoom=2.2`, optional `highlight_box` | Fast directed punch-zoom onto a point, ease-out, then hold. The "look HERE" beat (verified on the Cuba pilot's U-2 photo pattern). |
| Waypoint camera | `camera_path` | `img_path`, `waypoints=[(cx,cy,zoom)]`, `caption` | Zoom in/out + pan between points, eased in-out. `zoom < current` zooms OUT — use for pull-back reveals. The route-tracing substitute for maps (see gap above). |
| Captions / titles | `overlay_text` (over any clip), `caption_scene` (KB + scrim + caption bar), `title_card` / `title_scene` (title over image — `bg_img` REQUIRED), `bullet_slide` (staggered bullets, `stagger=0.45`) | — | `bullet_slide` is the enumeration move: "first / second / third" slamming in staggered. 3 enumerated chunks max per video. |

**The 12s visual-point rule** rides on the `annotate` layer: every scene gets ≥1 annotation per 12 seconds — kinds `'term'` | `'label'` (floating label at `x,y`) | `'point'` | `'arrow'` (label + leader line to `x,y`) | `'pop'`. Each springs in (`ease_out_back`), holds, fades. Stack multiple per scene for pace. A scene longer than ~35s must be split into sub-scenes (shorter keys, e.g. `beat1a`/`beat1b`).

**Timing laws (from PLAYBOOK §4, canonical):**
- Visual timing ALWAYS follows measured audio, never the reverse. `motion.dur(mp3_path, pad=1.2)` (ffprobe + 1.2s breathing room for motion to settle). Never size from word estimates.
- Scene bounds: min ~4s (shorter breaks punch-in/annotation motion), max ~35s before a split.
- Assembly: `assemble(scenes, audios, out, fps=30)` — 0.35s crossfades, per-scene narration auto-placed, `len(scenes) == len(audios)`.
- ≥3 motion primitives per episode. No episode is slides-only.
- Easings: `ease_out_back` (signature spring feel), `ease_out_cubic`, `ease_in_out_cubic`.

**Canvas:** 1080×1920, 30fps. House palette: gold `(233,196,106)`, white `(240,242,246)`, dim gray `(160,166,180)` on near-black. Fonts: bundled DejaVu Sans/Bold in `video/fonts/`.

**Worked 12s-rule example (a ~60s beat):** base scene `kb_scene` (60s would violate the 35s max → split into `beat2a`/`beat2b`, ~30s each) + annotations at t≈2 (`term`: key term + gloss), t≈12 (`label` on the image's key detail), t≈22 (`point`: the so-what). Two scenes × three annotations = a visual beat every ~10s.

## 1c. Quotes: PD-verified verbatim or paraphrase

**Verbatim rule:** pre-1930 works ONLY. Citation format on screen and in the production row:
`Speaker — "quote" — *Work* (year), PD rationale (e.g. "published 1632; pre-1930")`.

**Verification gate (no-hallucination):** before any quote reaches TTS, its exact wording must be checked against the PD edition named in the citation (Project Gutenberg / Library of Congress / the Commons source scan). Quotes in this guide's exemplar rows are famous, stable, and unambiguous in PD status — but the script build step still re-verifies character-by-character against the cited edition. Never retype a quote from memory into the narration JSON.

**Post-1929:** paraphrase only, original wording, never verbatim. (Kennedy's 1962 "any nuclear missile launched from Cuba" line in the Cuba v4 pilot is the established pattern — wait, that IS verbatim and post-1929. Correction: it ships in the pilot as a short famous-speech excerpt, which the project treats as fair-use-teachable. Standing repo rule says post-1929 = paraphrase/original treatment. For THIS series: keep quotes pre-1930 wherever possible — U1–U9 have centuries of PD material. If a post-1929 quote is truly load-bearing, it goes through the project's IP review before production, not around it.)

**Presentation patterns:**
- `typewriter_scene` + quote voice = the differentiation opening #3 (primary-source voices). The historical actor speaks, then the narrator unpacks. 1–2 sentences, never a paragraph.
- `doc_zoom` + `highlight_box` = the sourcing move. Use when the source is itself visual (a broadside, a codex page, a title page): zoom into the document, the gold box lands on the quoted lines.
- Casta-painting inscriptions, epitaphs, and text baked into PD artworks are quotable verbatim (the artifact is the source; cite it).

**Density:** 2–4 quotes per video. Each quote gets its own TTS voice (see 1d) and its own scene.

## 1d. TTS direction: casting, energy, and what makes it fun

**Casting model (from `cuba_narration.json` + `render_narration_fish.py`):**
- **Narrator:** one energetic original voice for the whole series (voice consistency = channel identity). Fish-speech clones speaking STYLE from the reference audio — pick a reference with the fire of a top explainer channel, never a real person's voice. Reference: ~10–30s WAV + its EXACT transcript (`--reference` / `--reference-text`).
- **Quote voices:** one per historical figure, named after the figure (`"voice": "columbus"`, not `"quote_voice_1"` — the name is the casting record). Reference audio + exact transcript per figure (`--quote-reference` / `--quote-reference-text`). In `render_narration_fish.py`, `"voice": "narrator"` (or anything ≠ the quote name) routes to the narrator reference; the named voice routes to the quote reference.
- **Narration JSON** (`video/<name>_narration.json`): array of `{key, voice, text}`. `key` groups segments into one MP3 (`video/audio/<name>/<key>.mp3`); multi-part keys (narrator → quote → narrator, the Cuba `beat1b` pattern) are synthesized separately and stitched with ffmpeg concat. Keys must match the content-JSON scene keys 1:1.
- **Pause tags:** `[short pause]` 450ms / `[pause]` 750ms / `[long pause]` 1500ms — split out before TTS and stitched as silence (PROPOSED extension until `render_narration_fish.py` implements it; until then, write pauses as sentence breaks).
- **Word budgets (PLAYBOOK §1, canonical):** hook 25–50, context 80–120, beats 100–160 each (≤3 beats), significance 100–140, close 50–75. Total 900–1,200 (~150 wpm) for 6–8 min.

**Energy notes (from the engagement playbook — the mechanics, not anyone's lines):**
- Open with a DECLARATION, never a question (190/205). Energy in the first 25%, then let enumeration carry the middle and the significance landing carry the end.
- Pace variation: long explanatory sentence (25–35 words) → short puncher (5–10 words). ~12% of sentences ≤8 words. The short ones land the point.
- Rhetorical questions ~1 per 1k words — as pivots between beats ("so why did this fail?"), never decoration.
- Second-person ~15/1k words (a "you" every ~65 words); never 200+ words without one. Present-tense immersion bursts for pivotal moments ("It's 1492. You're on the deck…") — the most engaging narrative mode in the niche and essentially unused.
- Humor is LEXICAL, not jokes: 8–10 signature intensifiers used consistently across the series. Heaviest in hooks/transitions, lightest inside dense factual passages. Never cruel, never at historical suffering.
- Enumerate: "first / second / third" is THE chunking device AND the memory scaffold (3 buckets beat a flowing narrative).
- Significance hammer: every beat ends with its "so what" in one sentence. Fact → "the point is" → consequence. `annotate 'point'` or `kinetic_text` carries it visually.
- ≥1 callback per episode ("this connects to what we saw in…") — the retention engine. Continuity-bridge hooks for in-series episodes.
- "Remember this" flags: ~1 per video, reserved for genuine exam-movers. Overuse kills the signal.
- Exam pressure is IMPLICIT (one "you need to know" per beat max); technique lives in the grading-walkthrough series. Never explain the test, never apologize for it.
- Close is RITUAL: final content sentence → dual CTA (next video + drill set) → signature sign-off. Never improvise it. Start-ritual after the hook works the same way.
- Differentiation openings to rotate in: counterfactual cold-open ("What if…? It wouldn't have mattered — here's why"), uncertainty beat ("what historians still argue about" — feeds the DBQ complexity point), primary-source cold-open (quote first, unpack after).

**Do / don't (original examples, plain language):**
- DO: "The Spanish didn't come to trade. They came to take. And they built an entire machine to do it." (short punchers, clear stance)
- DON'T: "One might argue that various historiographical perspectives exist regarding Spanish motivations, which were arguably multifaceted." (hedged, jargon, forgettable)
- DO: "First: God. Second: gold. Third: glory. Three words that explain an empire." (enumeration as memory scaffold)
- DON'T: "So like, the Spanish were basically the villains of history, right? Crazy stuff!" (opens with a question; vague; no facts)
- DO (quote handoff): beat1b narrator line → `"voice": "columbus"` types out the journal entry → narrator resumes: "The point is…"

**What makes it fun to listen to:** the voice CHANGE when a historical figure speaks (the ear perks up); enumeration momentum ("first… second…" pulls you forward); contrast bursts (past-tense story, then a 20-second present-tense immersion, then back); the significance slam landing like a verdict; callbacks that reward watching in order. It should feel like one continuous story across 36 episodes, not 36 lectures.

# Part 2 — Exemplar production rows (NOT scripts)

Each row is the complete production recipe for one video: assets, gaps, scene-by-scene rendering plan, quotes, TTS casting, energy direction. The narration script is written FROM the row in a later build step.

---

## V01 — "Three Worlds Collide" (PROVISIONAL id)

**Topics:** U1 1.1 Native societies, 1.2 European contact, 1.3 Columbian Exchange. **CED key concepts:** KC-1.1, KC-1.2, KC-1.3 (Period 1). **Drill tags:** U1/MIG/GEO.
**Target:** 6–8 min / 900–1,200 words. **Hero images:** Stradanus engraving (hook), Four Voyages map (contact beat), Florentine Codex smallpox (exchange beat).

### Asset row (all verified on disk; every scene background-covered)

| Beat | Image (local path) | Subject-match rationale |
|---|---|---|
| hook | `u1/5s24-ch06-mcq-01.jpg` | Stradanus "Discovery of America" engraving, c.1600 (CC0) — the triumphal European framing the video complicates |
| context | `u1/original-ctx-u1-07.jpg` | Cahokia mounds illustration — a Mississippian city while Europe built cathedrals |
| beat1 (Native diversity) | `u1/original-u1-native-10.jpg` (timeline bg, darkened) + `u1/original-u1-native-09.jpg` + `u1/original-u1-native-01.jpg` | De Bry hunting scene (bg); Taos Pueblo 1880 photo (Southwest); De Bry/Le Moyne planting scene (Eastern Woodlands maize agriculture) — one image per society named |
| beat2 (Contact) | `u1/original-u1-columbus-voyages-01.jpg` | Hart 1906 map of the Four Voyages — camera_path traces the 1492 route |
| beat2 quote | `u1/5s24-ch06-mcq-04.jpg` (typewriter bg) | De Bry, Columbus landing on Hispaniola, 1594 — behind the journal entry |
| beat3 (Exchange) | `u1/5s24-exam1-mcq-36.jpg` | Florentine Codex smallpox, c.1585 — the disease half of the exchange |
| beat3 verdict | `u1/original-u1-native-01.jpg` (kinetic bg) | Planting scene — the crops half of the exchange |
| significance | `u1/original-ctx-u1-03.jpg` | Waldseemüller 1507 map, first to name "America" — the world remade |
| close | `u1/5s24-exam1-mcq-45.jpg` | Brownscombe, Thanksgiving, 1914 — the national myth of first contact, for the closing reflection |

### Scene-by-scene rendering plan

| Key | Time | Primitive | Annotations (12s rule) |
|---|---|---|---|
| hook | 0:00–0:20 | `kinetic_text("TWO WORLDS. ONE OCEAN.", bg_img=Stradanus)` + `punch_in` | `pop`: "what if" (counterfactual cold-open) |
| context | 0:20–1:00 | `caption_scene(Cahokia, caption)` | `term`: "Mississippian"; `arrow`: label + leader line to the mounds |
| beat1a | 1:00–2:00 | `timeline_scene(events=[(Southwest / Taos Pueblo…), (Mississippians / Cahokia…), (Eastern Woodlands / maize…)], bg_img=de Bry hunting)` | `term` ×2 (maize agriculture, complex societies); `label` on the active dot |
| beat2a | 2:00–3:00 | `camera_path(Four Voyages map, waypoints=[(Spain,1.0) → (Atlantic,1.6) → (Caribbean,2.2) → (full map,1.0)])` | `label`: "1492"; `arrow`: to Hispaniola |
| beat2b | 3:00–3:40 | `typewriter_scene(Columbus journal quote, sub="Columbus, journal, 13 Oct 1492", bg_img=de Bry landing)` — voice: `columbus` | none needed (typing IS the visual beat); `point` on the unpack line |
| beat3a | 3:40–4:40 | `doc_zoom(Florentine Codex smallpox, highlight_box` on the afflicted figures`)` | `term`: "virgin-soil epidemic"; `point`: the so-what |
| beat3b | 4:40–5:20 | `kinetic_text("90% GONE IN A CENTURY", bg_img=planting scene)` + `punch_in` | `pop`: "the exchange" |
| significance | 5:20–6:20 | `kinetic_text("THE EXCHANGE REWIRED THE PLANET", sub=…, bg_img=Waldseemüller)` | `point` ×2 (crops both ways; the world-system) |
| close | 6:20–end | `title_card("Next: The Spanish Machine", sub=drill CTA, bg_img=Thanksgiving)` | — (ritual close, never improvised) |

### Quotes (PD-verified; re-verify wording against the cited edition at script step)

1. Christopher Columbus — "They are very well built, with very handsome bodies and very good faces." — journal of the first voyage, entry of 13 October 1492 (Las Casas abstract; PD, pre-1930 editions). Voice: `columbus`.
2. Bernal Díaz del Castillo — "things never heard of, seen or dreamed of before" (Sp. "cosas nunca oídas, ni vistas, ni soñadas") — *Historia verdadera de la conquista de la Nueva España* (Madrid, 1632); PD. Voice: `diaz`.
3. Hernán Cortés — "where there are daily assembled more than sixty thousand souls" — Second Letter to Charles V (Seville, 1522); PD. Voice: `cortes`.

### TTS casting + energy direction

**Voices:** `narrator` (series voice) + `columbus` + `diaz` + `cortes`. Reference audio + exact transcript per voice (~10–30s each).
**Hook:** counterfactual cold-open (differentiation #2): "What if Columbus's ships had turned back? Two continents keep developing in total isolation — and Europe stays small, poor, and hungry." Then the start-ritual.
**Beats:** present-tense immersion burst for the 1492 landing ("It's October 12th. You're on the deck…"); uncertainty beat on 1491 population estimates ("historians still argue about the numbers — and the argument matters"); the significance hammer on every beat; key-term repetition ("Columbian Exchange" 5–8×).
**Callbacks:** none available (episode 1) — hook uses topic-announcement + intensifier. V02 will bridge back here.
**Close:** ritual — final sentence → dual CTA (V02 + drill set) → sign-off.

### Gaps (BLOCKERs)

| Gap | Beat | Subject needed | Candidate source | License | Status |
|---|---|---|---|---|---|
| G-V01-1 | beat3 | European livestock/crops arriving in the Americas (period engraving: horses, wheat, sugar) | Wikimedia Commons (search: 16th-c. engraving livestock New World) | pre-1930 publication | OPEN — BLOCKER for the goods-arrival half |
| G-V01-2 | context | Beringia / peopling-of-the-Americas migration map | Wikimedia Commons (PD migration map) | pre-1930 or CC0 | OPEN — BLOCKER for the origins line |

## V02 — "The Spanish Machine" (PROVISIONAL id)

**Topics:** U1 — encomienda system, casta system, silver economy. **CED key concepts:** KC-1.2 (Spanish colonial labor systems, racial hierarchy, extraction). **Drill tags:** U1/WXT/SOC.
**Target:** 6–8 min / 900–1,200 words. **Hero images:** Las Casas 1665 title page (system's indictment), Potosí woodcut (silver engine), 16-panel casta set (hierarchy made visible).

### Asset row (all verified on disk; every scene background-covered)

| Beat | Image (local path) | Subject-match rationale |
|---|---|---|
| hook | `u1/barrons-2027-ch03-01.jpg` | Woodcut of Potosí, from Cieza de León, *Crónica del Perú*, 1553 — the silver mountain that powered the machine |
| context | `u1/barrons-2027-ch03-03.jpg` | De Bry, 1598, illustrating Las Casas — the cruelty record, behind the context frame |
| beat1 (encomienda — the legal fiction) | `u1/original-ctx-u1-05.jpg` | 1665 German edition title page of Las Casas — doc_zoom into the document while the beat explains the legal system |
| beat1 quote | `u1/barrons-2027-ch03-03.jpg` (typewriter bg, reuse) | De Bry/Las Casas cruelty illustration — behind the Requerimiento's threat |
| beat2 (silver — the engine) | `u1/barrons-2027-ch03-01.jpg` (kb + zoom_to, reuse) | Potosí woodcut: `zoom_to` punches onto the mine workings |
| beat3 (casta — the hierarchy) | `u1/original-u1-encomienda-20.jpg` | 18th-c. casta set, 16 panels — `callout_scene` rings land on 3 panels in sequence |
| beat3 quote | `u1/original-u1-encomienda-07.jpg` (typewriter bg) | The "De español e india, mestiza" panel itself — inscription types out over its own painting |
| significance | `u1/original-u1-spanish-mission-01.jpg` | 1914 mission photo (LoC) — the "God" arm of the machine, darkened behind the verdict |
| close | `u1/5s24-ch06-mcq-06.jpg` | Lienzo de Tlaxcala (1773 copy of c.1550s original) — the collision's human face, for the close |

### Scene-by-scene rendering plan

| Key | Time | Primitive | Annotations (12s rule) |
|---|---|---|---|
| hook | 0:00–0:20 | `kinetic_text("THE SPANISH MACHINE", bg_img=Potosí)` + `punch_in` | `pop`: "paperwork and whips" (bold framing claim) |
| context | 0:20–1:00 | `caption_scene(de Bry/Las Casas 1598, caption)` + callback to V01 ("last video: contact — this video: what Spain built on it") | `label`: "1542 — New Laws" tease |
| beat1a | 1:00–2:00 | `doc_zoom(Las Casas 1665 title page, highlight_box` on the title block`)` | `term`: "encomienda" + gloss; `point`: labor, not land |
| beat1b | 2:00–2:40 | `typewriter_scene(Requerimiento quote, sub="El Requerimiento, 1513", bg_img=de Bry/Las Casas)` — voice: `crown` | `arrow`: to the threat line as it types |
| beat2a | 2:40–3:40 | `kb_scene(Potosí woodcut)` → `zoom_to(Potosí, cx/cy on the mine, end_zoom=2.2)` | `term`: "Potosí"; `label`: "silver mountain"; `point`: the so-what (silver → global economy) |
| beat3a | 3:40–4:40 | `callout_scene(casta 16-panel set, points=[3 panel centers + labels])` | `term`: "casta"; `label` per panel as rings land |
| beat3b | 4:40–5:10 | `typewriter_scene("De español e india, mestiza.", sub="Casta painting inscription, 18th c.", bg_img=encomienda-07)` — voice: narrator in quoted tone | — (typing is the beat) |
| significance | 5:10–6:10 | `kinetic_text("A SYSTEM BUILT TO EXTRACT", bg_img=mission photo, darken=150)` | `point` ×2 (extract labor; rank people) |
| close | 6:10–end | `title_card("Next: Why Europe Came", sub=drill CTA, bg_img=Lienzo de Tlaxcala)` | — (ritual close) |

### Quotes (PD-verified; re-verify wording against the cited edition at script step)

1. El Requerimiento — "I certify to you that, with the help of God, we shall powerfully enter into your country, and shall make war against you in all ways and manners that we can." — written by Juan López de Palacios Rubios (1513); PD. Voice: `crown` (the voice of the Spanish crown).
2. Bartolomé de las Casas — "La causa porque han muerto y destruído tantas y tales e tan infinito número de ánimas los cristianos ha sido solamente por tener por su fin último el oro y henchirse de riquezas en muy breves días." — *Brevísima relación de la destrucción de las Indias* (Seville, 1552); PD. English rendering finalized from a PD translation (J. Phillips, *The Tears of the Indians*, London, 1656) at script step. Voice: `lascasas`.
3. Casta inscription — "De español e india, mestiza." — 18th-century casta painting (the artifact is the source); PD. Voice: narrator, quoted tone.

### TTS casting + energy direction

**Voices:** `narrator` + `crown` + `lascasas`.
**Hook:** bold framing claim (differentiation via #3 primary-source voice): open on the Requerimiento's threat? No — hook is the narrator's declaration: "The Spanish didn't come to trade. They came to take — and they built an entire machine to do it." Then start-ritual.
**Beats:** uncertainty beat on the death-toll debate ("historians still argue about the numbers — here's what the argument is really about", feeds DBQ complexity); the `crown` voice reading the Requerimiento is the chill moment — let it land, then the narrator's significance hammer; key-term repetition ("encomienda", "casta" 5–8× each).
**Callbacks:** V01 (Columbian Exchange → the labor demand that built the encomienda).
**Close:** ritual — final sentence → dual CTA (V03 + drill set) → sign-off.

### Gaps

| Gap | Beat | Subject needed | Candidate source | License | Status |
|---|---|---|---|---|---|
| G-V02-1 | beat1 | Encomienda/mita labor scene (draft laborers at Potosí or a hacienda) | Wikimedia Commons (search: mita labor / Potosí miners engraving) | pre-1930 publication | OPEN — enhancement, not a runtime blocker (beat1's document zoom is subject-matched as built: the beat is about the legal fiction) |

## V03 — "Why Europe Came" (PROVISIONAL id)

**Topics:** U1 — motives for colonization (God, gold, glory); joint-stock companies. **CED key concepts:** KC-1.2 (European motives), KC-1.3. **Drill tags:** U1/WOR.
**Target:** 6–8 min / 900–1,200 words. **Hero images:** Cantino planisphere 1502 (hook), mission photo (God beat), Columbus's Jamaica letter (gold beat quote).

### Asset row (all verified on disk; every scene background-covered)

| Beat | Image (local path) | Subject-match rationale |
|---|---|---|
| hook | `u1/saq-set-06-q3.jpg` | Cantino planisphere, 1502 — a map drawn when the New World was ten years old; the knowledge that made the gamble thinkable |
| context | `u1/saq-set-19-q3.jpg` | "Landing of Columbus" (US Capitol) — the voyage itself, behind the context frame |
| beat1 (gold) | `u1/barrons-2027-ch03-01.jpg` (supporting reuse — first-used V02) | Potosí woodcut 1553 — the wealth motive's engine, subject-matched |
| beat1 quote | `u1/barrons-2027-ch03-01.jpg` (typewriter bg, reuse) | Behind Columbus's Jamaica letter on gold |
| beat2 (God) | `u1/original-u1-spanish-mission-01.jpg` (supporting reuse — first-used V02) | Mission photo — the evangelization arm, subject-matched |
| beat2 quote | `u1/5s24-ch06-mcq-06.jpg` (typewriter bg; supporting reuse — first-used V02) | Lienzo de Tlaxcala — Christianity's introduction, behind Hakluyt's "glory of the Gospell" |
| beat3a (glory) | `u1/5s24-ch06-mcq-01.jpg` (supporting reuse — first-used V01) | Stradanus engraving — the triumphal framing = glory, subject-matched |
| beat3b (joint-stock) | ⚠️ PENDING — see G-V03-1 | Cannot be built until sourced. No near-miss substitution. |
| significance | `u1/original-ctx-u1-03.jpg` (supporting reuse — first-used V01) | Waldseemüller 1507 — first "America"; three motives, one remade world |
| close | `u1/saq-set-19-q3.jpg` (title_card bg, reuse) | Landing of Columbus — the gamble, for the close |

### Scene-by-scene rendering plan

| Key | Time | Primitive | Annotations (12s rule) |
|---|---|---|---|
| hook | 0:00–0:20 | `kinetic_text("WHY SAIL INTO THE BLANK?", bg_img=Cantino planisphere)` + `punch_in` | `pop`: "three words" (topic-announcement + intensifier) |
| context | 0:20–1:00 | `caption_scene(Landing of Columbus, caption)` + continuity bridge to V02 ("last video: the machine — this video: why anyone built it") | `term`: "joint-stock company" (tease) |
| beat1a | 1:00–2:00 | `zoom_to(Potosí woodcut, cx/cy on the mines)` | `term`: "bullion"; `label`: "Potosí"; `point`: the so-what |
| beat1b | 2:00–2:40 | `typewriter_scene(Columbus Jamaica-letter quote, sub="Columbus to Ferdinand and Isabella, 1503", bg_img=Potosí)` — voice: `columbus` | `arrow`: to "gold is treasure" as it types |
| beat2a | 2:40–3:40 | `kb_scene(mission photo, pan toward the church)` | `term`: "evangelization"; `label`: the mission |
| beat2b | 3:40–4:10 | `typewriter_scene(Hakluyt "glory of the Gospell", sub="Hakluyt, Discourse of Western Planting, 1584", bg_img=Lienzo de Tlaxcala)` — voice: `hakluyt` | — (typing is the beat) |
| beat3a | 4:10–4:50 | `kinetic_text("GLORY", sub="…", bg_img=Stradanus)` | `pop`: "glory"; `point`: rivalry with Spain/Portugal |
| beat3b | 4:50–5:30 | PENDING G-V03-1 | — |
| significance | 5:30–6:30 | `kinetic_text("GOD. GOLD. GLORY. ONE OCEAN.", bg_img=Waldseemüller, darken=150)` | `point` ×2 (motives → colonization models; sets up V04's Jamestown vs. Plymouth) |
| close | 6:30–end | `title_card("Next: The Exchange That Changed Everything", sub=drill CTA, bg_img=Landing of Columbus)` | — (ritual close) |

### Quotes (PD-verified; re-verify wording against the cited edition at script step)

1. Christopher Columbus — "Gold is most excellent; gold is treasure, and he who possesses it does all he wishes to in this world, and succeeds in helping souls into paradise." — letter from Jamaica to Ferdinand and Isabella, 7 July 1503; PD. Voice: `columbus`.
2. Richard Hakluyt — "wee shall by plantinge there inlarge the glory of the Gospell" (original spelling) — *Discourse of Western Planting* (1584); PD. Voice: `hakluyt`.
3. Richard Hakluyt — "this westerne voyadge will yelde unto us all the commodities of Europe, Affricke and Asia" (original spelling) — *Discourse of Western Planting* (1584); PD. Voice: `hakluyt`.

### TTS casting + energy direction

**Voices:** `narrator` + `columbus` + `hakluyt`.
**Hook:** topic-announcement + intensifier: "Three words explain why Europe crossed an ocean: God, gold, and glory." Then start-ritual.
**Beats:** rhetorical pivot "so why risk the ocean?" between context and beat1; present-tense immersion burst for an Atlantic crossing ("It's 1492. You're sixty days out of port…"); uncertainty beat on God-vs-gold ("historians still argue how much was faith and how much was greed — the answer is both, and the tension is the point"); key-term repetition ("joint-stock" 5–8× in beat3b once sourced).
**Callbacks:** V02 (the machine → its motives); V01 (the exchange → what the motives produced).
**Close:** ritual — final sentence → dual CTA (V04 + drill set) → sign-off.

### Gaps (BLOCKERs)

| Gap | Beat | Subject needed | Candidate source | License | Status |
|---|---|---|---|---|---|
| G-V03-1 | beat3b | Joint-stock company charter document (Virginia Company charter of 1606 — the legal instrument) | Wikimedia Commons: File:Virginia Company charter (1606) or LoC scan | pre-1930 document | OPEN — BLOCKER. beat3b has no scene until this is sourced and localized. Interim: do NOT ship beat3b on a mismatched image. |

---

# Part 3 — Consolidated gaps + engine backlog

## Image gaps across V01–V03

| Gap | Video.beat | Subject needed | Severity | Status |
|---|---|---|---|---|
| G-V01-1 | V01.beat3 | European livestock/crops arriving in the Americas (period engraving) | BLOCKER | OPEN |
| G-V01-2 | V01.context | Beringia / peopling-of-the-Americas migration map (PD) | BLOCKER | OPEN |
| G-V02-1 | V02.beat1 | Encomienda/mita labor scene (draft laborers) | Enhancement (beat1's document zoom is subject-matched as built) | OPEN |
| G-V03-1 | V03.beat3b | Joint-stock charter document (Virginia Company 1606) | BLOCKER — beat3b unbuildable until sourced | OPEN |

**Total: 4 gaps (3 BLOCKERs, 1 enhancement).** Sourcing lane: Wikimedia Commons / Library of Congress → verify PD (pre-1930 publication or explicit CC0/PD tag) → download to `assets/images/u1/` → extend `build/image-download-report.json` → re-run `build/build_image_catalog.py` → update the gap row. Never substitute a near-miss.

## Engine backlog (for whoever owns `video/motion.py` next)

1. **General `map_scene` primitive** — the pedagogical mapping has a real hole: `cuba_map_scene` is a Cuba-1962 one-off. Needed: a primitive that takes an arbitrary PD map image + route waypoints and draws the route animated (expansion, migration, marches, voyages), plus territory-shading for acquisitions (Louisiana Purchase, Mexican Cession). Until it ships, the recipe is `camera_path` over the map image (waypoints trace the route) or `callout_scene` points on the map.
2. **Bible-proposed but unbuilt:** `counter_scene`, `chart_scene`, `split_scene` do not exist in `motion.py`. Don't reference them in production rows.
3. **Pause-tag stitching** in `render_narration_fish.py` is PROPOSED (PLAYBOOK §1) — until implemented, write pauses as sentence breaks.
4. **Emphasis markup** for TTS does not exist — no bold/italics convention; don't invent one in narration JSON.

## Per-video build checklist (the template, compressed)

1. Confirm video id/title against workstream C's COURSE-PLAN.md (remap the PROVISIONAL ids here if renumbered).
2. Map every beat to a catalog image by SUBJECT (jq, §1a). Log gaps; blockers must clear before render.
3. Assign one `motion.py` primitive per beat from the pedagogical table (§1b); `bg_img` on EVERY text scene (no-empty-screen rule).
4. Plan `annotate` notes for the 12s rule; split any scene >35s.
5. Select 2–4 PD-verified quotes with citations; verify wording against the PD edition.
6. Author `video/<name>_narration.json` (`key`/`voice`/`text`); cast quote voices named after the figure.
7. Render TTS on the 5090 (`render_narration_fish.py`) → `video/audio/<name>/<key>.mp3`.
8. Size scenes from measured MP3 durations (`motion.dur`, ffprobe + 1.2s pad).
9. Write content JSON (PLAYBOOK §2 schema) → build scenes → manifest (`video/manifests/<name>.json`) → `build_video.py` → verify MP4.
10. Commit on main. Audio MP3s are committed (rebuilds need no TTS step).

---
*Workstream D — 2026-10-02. Template + V01/V02/V03 exemplar production rows. Narration scripts are a later build step.*
