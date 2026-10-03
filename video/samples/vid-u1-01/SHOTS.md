# SHOTS — vid-u1-01 "The World in 1491" (DOCUMENT/QUOTE-DRIVEN sample)

Reconciled 2026-10-02 to `video/render_vid_u1_01.py` post visual-direction
overhaul (commit 824c1e6): every stage carries ≥1 intentional camera move
(drift-only stages banned); pop/point notes carry explicit `y` parking
(no text collisions); backgrounds stay visible (darken capped, scrim bands).
15 stages, ~6m24s narration. Every stage passes `bg_img`
(no-empty-screen rule); every image is PD-local from
`assets/images/CATALOG.json` with the subject matching the beat.
Durations are measured from the narration MP3s at build time
(`motion.dur`); the figures below are from the current placeholders.

| Stage | Audio | Primitive chain | Image (catalog path + subject) | Annotate notes | Timing notes |
|---|---|---|---|---|---|
| hook | 24.3s | `kinetic_text` ("TWO WORLDS. ONE OCEAN.", sub "Three worlds. One collision.") + `punch_in` | `assets/images/u1/5s24-ch06-mcq-01.jpg` — Stradanus "Discovery of America" engraving, c.1600 (the triumphal European framing the video complicates) | `pop` "what if" @1.0s, parked y=0.30 (clear of the centered phrase) | Phrase slams at t≈0.5; PNG grabbed @2.2s with the pop visible |
| contexta | 33.4s | `camera_path` tour [(0.5,0.52,1.0) → (0.62,0.52,1.8) → (0.50,0.55,1.2)] + bottom scrim-band caption | `assets/images/u1/original-ctx-u1-07.jpg` — Cahokia mounds illustration (Mississippian city while Europe built cathedrals) | `term` "Mississippian" ("mound-building farming societies") @2s; `arrow` "the mounds" → (0.62,0.45) @8s | Wide → push onto the mound → settle; 1.8x zoom cap keeps the old photo sharp |
| contextb | 21.2s | `callout_scene` — rings land on each world in turn | same Stradanus engraving (rotated hero: this beat is *about* Europe) | callout labels: "tribute + kinship" (0.24,0.20), "crusade + crown" (0.76,0.20), "gold + trade" (0.50,0.86) | Caption: "Three old worlds, each confident in its own order"; no drift — directed emphasis |
| beat1a | 26.8s | `timeline_scene` (5 events), title "Native America, 1491", darken=70 | `assets/images/u1/original-u1-native-10.jpg` — De Bry hunting scene (background wash) | `term` "maize agriculture" ("farming → denser populations") @2s | Dots pop in across 85% of duration: Southwest, Southeast, Woodlands, Mexico, Andes; PNG @75% shows all dots |
| beat1b | 20.3s | `zoom_to` (cx=0.5, cy=0.55, end_zoom=2.0, zoom_dur=2.2) | `assets/images/u1/original-u1-native-01.jpg` — De Bry/Le Moyne planting scene (Eastern Woodlands maize agriculture) | `pop` "remember this" y=0.28 @1.5s (the [TIP] sting, visual side); `point` "farming → density → complexity" y=0.78 @8s | Push into the planting work, verdict card lands low |
| beat1c | 21.2s | `camera_path` tour of the engraving's left half [(0.5,0.5,1.0) → (0.30,0.32,2.4) → (0.38,0.38,1.6)] | Stradanus engraving (Europe beat — the Reconquista/caravel world that made it) | `label` "Reconquista" (0.30,0.20) @2s; `term` "caravel" ("sails into the wind — and home again") @9s | Tour: ships → armor → cross; caravel term is the takeaway |
| beat1d | 27.3s | `camera_path` tour of the right half [(0.5,0.5,1.0) → (0.70,0.60,2.4) → (0.58,0.52,1.5)] | Stradanus engraving (third camera region — Africa's gold/trade world) | `label` "Songhai gold trade" (0.50,0.25) @2s; `point` "three old, confident worlds" y=0.78 @9s | The "America" figure and the new world's wealth; rotation rule applies across videos, not within |
| beat2a | 21.6s | `typewriter_scene` (darken=55) + `punch_in` | `assets/images/u1/5s24-ch06-mcq-04.jpg` — De Bry, Columbus landing on Hispaniola, 1594 (behind the journal entry) | none (typing IS the beat) | Voice: `columbus`. Quote: Columbus journal, 13 Oct 1492 (PD, pre-1930). PNG @55% shows mid-typing + cursor |
| beat2b | 25.2s | `zoom_to` (cx=0.45, cy=0.45, end_zoom=2.3, zoom_dur=2.0) | same De Bry landing (the unpack beat — wonder first, chains second) | `point` "curiosity and conquest, one ship" y=0.78 @2s | Punch onto the landing party's faces as the narration names them; narrator resumes in own voice |
| beat2c | 17.5s | `doc_zoom` highlight_box=(0.15,0.15,0.85,0.90) | `assets/images/u1/5s24-exam1-mcq-36.jpg` — Florentine Codex, Book 12 smallpox, c.1585 | `term` "virgin-soil epidemic" ("no immunity → catastrophic death") @2s | Caption: "Florentine Codex, c. 1585 — Nahua witnesses". The sourcing move: slow push-in, box lands AS the narration names the dead |
| beat2d | 19.5s | `kinetic_text` ("90% GONE IN A CENTURY", sub "the dying went one way") + `punch_in` | same Codex image, darken=70 (the verdict on the same evidence) | `pop` "emptied" y=0.72 @1.0s (parked clear of phrase and sub) | The exam's standard figure; narration says "up to ninety percent" — numbers match |
| beat3a | 33.8s | `typewriter_scene` (darken=55) + `punch_in` | `assets/images/u1/5s24-ch06-mcq-06.jpg` — Lienzo de Tlaxcala (the conquest of Mexico, behind Díaz's awe) | none (typing IS the beat) | Voice: `diaz`. Quote: Historia verdadera (1632), PD |
| beat3b | 34.1s | `typewriter_scene` (darken=55) | same Lienzo (both conquest voices share the conquest image — noted, not hidden) | `point` "a robbery the robbers wrote down" y=0.68 @dur−6s (parked below the typed block, above the sub line) | Voice: `cortes`. Quote: Second Letter (1522), PD |
| significance | 34.1s | `kinetic_text` ("THREE WORLDS. ONE CATASTROPHE.", sub "The exchange rewired the planet.") + `punch_in` | `assets/images/u1/original-ctx-u1-03.jpg` — Waldseemüller 1507, first map to name "America" (the world remade) | `point` "never equal" y=0.74 @2s; `point` "one world system came out" y=0.74 @10s | The landing: three worlds in, one world-system out |
| close | 23.2s | `title_card` ("Next: Three Ways to Live in America", sub "vid-u1-02 + drill set at the link") + `punch_in` (amount=0.04, dur=0.8) | `assets/images/u1/5s24-exam1-mcq-45.jpg` — Brownscombe, Thanksgiving, 1914 (the national myth of first contact, for the closing reflection) | — (ritual close, never improvised) | Names next video vid-u1-02 + drill set + sign-off |

## Voice cast
`narrator` (series voice) + `columbus` + `diaz` + `cortes`. Reference audio + exact
transcript per voice (~10–30s each); see README for the render command.
`video/build_lesson.py` auto-discovers `ref/<voice>.wav` + `.txt`.

## Quote log (all pre-1930 PD, verbatim; re-verify against the cited edition before TTS)
1. Columbus — "They are very well built, with very handsome bodies and very good faces." — journal of the first voyage, 13 Oct 1492 (Las Casas abstract).
2. Bernal Díaz — "Things never heard of, seen or dreamed of before." — Historia verdadera (Madrid, 1632).
3. Cortés — "Where there are daily assembled more than sixty thousand souls." — Second Letter to Charles V (Seville, 1522).

## Technique selection (FUN-CATALOG, abridged)
#1 point-slams (annotate track throughout: 8 terms, 6 points, 3 pops, 2 labels, 1 arrow) · #2 cold-open ritual ("You're watching APUSH Explained. Let's get into it.") · #3 multi-voice quotes · #4 exam-tip sting (beat1b `[TIP]` → `pop`; sting cue pending the audio-mix step) · #5 memory-cue card (beat1b) · #6 sign-off ritual ("Drill it, own it — I'll see you in the next one.") · #7 kinetic slams (hook, beat2d, significance) · #11 punch-in (hook, beat2a, beat2d, beat3a, significance, close) · #17 map-march (no map beat in this video — future videos) · #22 cliffhanger close (names vid-u1-02).

## Known notes (not blockers)
- beat3a/beat3b share the Lienzo bg (both beats are the conquest of Mexico; rotation rule applies across videos, and vid-u1-04 uses it as its close card).
- beat2d's "90%" is the standard textbook figure for the worst-hit regions; narration says "up to ninety percent" — numbers match.
- contexta's 1.8x zoom cap: 2.3x dissolved the old photo into blur on the frame check.
- The old static-PNG-per-stage loop is retired; stages render as real animated segments via `BUILDERS` in `build_video.py`'s animated path. The `markup/` PNGs are the frame record only.
