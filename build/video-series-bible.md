# APUSH Video Series Bible

**Series:** APUSH Explained — motion-graphic explainer videos for the Fall 2026 CED (May 2027 exam, fully digital Bluebook).
**Format law:** 6–8 minutes per episode (~900–1,200 words of narration). 9:16 vertical (1080×1920 delivery).
**Companion series:** 53 grading walkthroughs (videos 1–53) — exam technique. This series is content explainers: the "why it matters" behind the facts.

This is a bible: principles and format law. The operative documents it points at:
- `video/COURSE-PLAN.md` — the 92-video plan (units → chapters → videos, every CED topic code covered).
- `video/PLAYBOOK.md` — the full production playbook: schemas, animation vocabulary, visual-direction rules, TTS format, e2e workflow.
- `video/validate_video.py` — the 12 hard gates. Nothing ships unless ALL GATES GREEN.

## The ecosystem (every episode ships with)

Each episode is one node in a content cluster:

| Piece | Source | Where it lives |
|---|---|---|
| Video | this series | YouTube → top of funnel |
| Lesson | period review section | drill site |
| Drill set | bank MCQs tagged to the episode's topics | drill site |
| FRQ | SAQ set / DBQ / LEQ from the bank | drill site |
| Grading video | videos 1–53 (where one exists for the FRQ) | YouTube |

The video ends with the exam takeaway and points to the drill set. The drill site points back to the video for the story. Neither strands the student.

## Series format (binding on every video)

- **Skeleton:** hook → context frame → 3 beats (enumerated: first/second/third) → significance landing ("the point is…") → close (final content sentence → dual CTA: next video + drill set → signature sign-off). Never open with a question; declarations with energy.
- **Rituals:** branded cold-open (identical every video — rituals are retention devices); branded sign-off ("Drill it, own it — I'll see you in the next one."). Never improvised.
- **Callbacks:** ≥1 callback to an earlier video per episode. "Remember this" flags reserved for genuine exam-movers.
- **Primary sources:** primary-source cold opens wherever a pre-1930 public-domain quote exists (typewriter scene — the historical voice appears live).
- **Exam-aside rule:** implicit pressure only ("you need to know"); one explicit rubric mechanic per video max. Exam technique lives in the 53 grading walkthroughs, not here.
- **Differentiation:** "what historians still argue about" beats (feeds the DBQ complexity point — 0.15/1, the worst 2025 Chief Reader component); 30-second counterfactual cold opens; direct primary-source voices in their own TTS voice; present-tense immersion sequences; animated maps/timelines as the primary visual language.
- **Language:** plain teacher voice, no sales-jargon ("trap/trick/distractor" never appear). Working titles and angles are ORIGINAL — never the transcript corpus's titles or angles.

## The 92-video structure (by reference)

Authoritative plan: `video/COURSE-PLAN.md`. 9 units → 30 chapters → 92 videos, sized to exam weights:

| Period | Years | Exam weight | Videos |
|---|---|---|---|
| Unit 1 | 1491–1607 | 4–6% | 5 |
| Unit 2 | 1607–1754 | 6–8% | 7 |
| Unit 3 | 1754–1800 | 10–17% | 12 |
| Unit 4 | 1800–1848 | 10–17% | 12 |
| Unit 5 | 1844–1877 | 10–17% | 12 |
| Unit 6 | 1865–1898 | 10–17% | 12 |
| Unit 7 | 1890–1945 | 10–17% | 14 |
| Unit 8 | 1945–1980 | 10–17% | 13 |
| Unit 9 | 1980–present | 4–6% | 5 |
| **Total** | | | **92 (~10.7 hours)** |

Coverage law: every one of the 105 CED topic codes (+ RP1–RP3) appears in ≥1 video, machine-verified. The plan targets gaps the transcript corpus misses (e.g. the Valladolid debate: zero hits in 205 videos).

## Animation vocabulary (the built engine)

Built on `video/motion.py` (+ `video/anim.py` for the animated-graphics layer). Full spec in `video/PLAYBOOK.md`; the canonical set:

- **Camera moves:** `punch_in` (opens — never fades), `zoom_to` (emphasis on the named figure/object), `camera_path` (waypoint tours across details the narration names), `doc_zoom` (documents, highlight box lands as the narration quotes it).
- **Text:** `typewriter_scene` (quotes appear live), `kinetic_text` (thesis slams), `overlay_text`, `title_card`, `bullet_slide`.
- **Informational:** `timeline_scene` (sequential reveals), `callout_scene` (gold rings on points of interest), `caption_scene`.
- **Annotation layer** (`annotate`, the visual heartbeat ~every 12s): `term` (key term + gloss), `label`, `point` ("so what" verdicts), `arrow`, `pop` (playful slams).
- **Animated graphics** (beyond image+text): `map_scene` (routes draw themselves), `counter_scene` (ticking numbers), `vs_scene` (face-offs), `wipe_scene` (before/after), `myth_stamp` (misconception busts), `skit_scene` (multi-voice cutaways), `chapter_bar` (progress spine).
- **AI clips** (`ai_clip_scene`): 2–3 "living engraving" moments per video max — local LTX-Video ambient motion (water, smoke, clouds only; never content changes), generated on the 5090 via `video/animate_still.py`.

## Visual-direction law (from the 2026-10-02 overhaul)

1. **No blank screen, ever.** Every scene carries a background image — including text scenes. `bg_img` is REQUIRED on all text primitives.
2. **Backgrounds stay visible.** `darken` is capped at 80; scrim bands behind text instead of full-frame crush. The validator fails rendered frames with >40% near-black pixels.
3. **Every stage moves the camera on purpose.** ≥1 intentional camera/directed-motion move per stage — drift-only stages are banned (CAMERA-DIRECTION gate).
4. **Animated graphics, not just camera moves.** 2–4 animated-graphics beats per video; never a static map with narration over it.
5. **No text collisions.** pop/point notes carry explicit `y` parking; kinetic subs offset from measured phrase height (TEXT-COLLISION gate).
6. **Direction grammar:** open with `punch_in`; tour images with `camera_path` across exactly the details being discussed; punch `zoom_to` onto the figure the sentence names; land verdicts with `kinetic_text` + `point` cards.

## Production pipeline (one script)

`python video/build_lesson.py <lesson-id> [--preview]` — TTS → AI clips → video build → validator, fail-fast. Voice refs auto-discovered (`ref/<voice>.wav` + `.txt`); missing refs fail naming the exact files to record. Resume with `--skip-tts` / `--skip-ai-clips` / `--only <step>`.

**Preview workflow:** `--preview` renders 720×1280 for motion approval (~2–3× faster). Full 1080×1920 only after the motion is approved. The validator's rendered-frame gates sample the exact MP4 just built.

**Ship law:** `video/validate_video.py` — 12 gates (MANIFEST-SCHEMA, AUDIO-MATCH, TTS-GATES, IMAGE-LOCAL, IMAGE-SUBJECT-MATCH, QUOTE-VERIFY, NO-COPY, ANIMATION-REFS, CAMERA-DIRECTION, TEXT-COLLISION, NO-BLANK-FRAMES, AI-CLIP). Exit 0 on ALL GATES GREEN or the lesson does not ship. After the real fish-speech TTS render on the 5090, re-running the validator is mandatory (scene timing follows measured audio).

## Media law

- **Local only.** Every image lives in `assets/images/`; no remote URLs in any manifest (IMAGE-LOCAL gate).
- **Public domain only, with provenance.** Pre-1930 publication, US federal work, or explicit PD/CC0. Cataloged in `assets/images/CATALOG.json` with subject/period/topic tags + provenance.
- **Subject-matched, never decorative.** The image on screen depicts what the narration is saying at that moment. Where no catalog image matches, log a sourcing BLOCKER — no near-miss substitution, ever.
- **Quotes:** verbatim only from pre-1930 PD or US federal sources (QUOTE-VERIFY gate); post-1929 gets paraphrase/original treatment.
- **Zero-copy:** no 8+ word verbatim overlap with the transcript corpus or the books (NO-COPY gate, 1.39M shingles).

## Sequencing

Pilots first: Cuba showcase v4 (done — the visual bar), then the three render-ready samples (vid-u1-01/03/04), then Periods 1–3 (foundation; students know them least), then fill by exam weight. The grading walkthroughs publish alongside as the technique companion.
