# FUN-CATALOG: Techniques That Make Educational Video Fun to Watch

**Purpose:** ranked, implementable catalog of engagement techniques for the APUSH
video factory. Feeds the playbook team. Goal: beat Heimler's History on engagement.

**Hard constraints this catalog obeys:**
- Narration is fish-speech s2-pro TTS (multi-voice proven in `render_narration_fish.py`).
  No human host on camera.
- Renderer is Python/MoviePy (`video/motion.py`, all scenes 1080x1920 vertical).
- Media is public-domain (Wikimedia Commons / Library of Congress) or original graphics.
- Format: 6-8 minute APUSH videos.
- Zero copying: techniques and mechanics only, never anyone's lines/jokes/content.
- **Scriptability rule:** every ranked entry names its exact scripting mechanism —
  an existing `motion.py` primitive (name + params), a concrete new primitive
  (signature + composition + effort), or a pipeline step outside `motion.py`.
  Anything not reliably scriptable is in "Rejected: not scriptable" at the end.

**Effort scale:** `trivial` = <50 lines composing existing pieces;
`moderate` = new frame function; `big` = new subsystem.

**Ranking basis:** expected engagement payoff per implementation cost.
Entries #1-13 are the "do these first" tier.

---

## Evidence base

### A. Local corpus: 205 APUSH Review transcripts (`public_contnent/`, analyzed 2026-10-02)

Quantified findings (all 205 videos parsed, auto-caption overlap deduped):

- Median video length 6.7 min; median pace **222 wpm** (short <4min videos: 197 wpm;
  long >10min: 230 wpm). Fast is the baseline — our TTS reference voice must be
  energetic, not lecture-paced.
- **Branded cold-open ritual:** 84 videos in the "under 3 minutes" series open with
  the identical line ("Welcome back to APUSH in under 3 minutes. No time for intros,
  let's get into it."). Ritual > novelty for series identity.
- **Catchphrase sign-off:** "get them brain cows milked" appears in ~80 videos;
  "catch you on the flip flop" as sign-off. A dumb, repeatable phrase is a
  retention device, not a joke.
- **Point density:** explicit point markers ("first/second", "the key idea",
  "most important", "bottom line") at **1.31/min** — roughly one signposted point
  every 45 seconds. This is the "point-driven" cadence the user demands.
- **Dominant rhetorical device:** "remember" (249 hits) — memory cues beat
  rhetorical questions. Actual questions are rare: **0.08/min median** (gap we can exploit).
- **Exam-tip asides:** 0.22/min ("if you're writing...", "on the test...").
  Present but sparse — room to make them a signature.
- **Humor style:** vivid, slightly absurd similes ("as effective as a jellyfish
  trying to blow...", "a stanky colonial stew"). Humor lives in the *writing*,
  one image per punchline — fully scriptable.
- **Second-person address:** "you/your" = 1.21% of all words. Direct address is constant.

### B. Edu-YouTube landscape (signature devices, abstracted)

- **Kurzgesagt:** existential/contrarian cold opens; one visual metaphor per concept
  (a single object stands in for an abstraction, reused consistently); mascot
  callbacks; dynamic orchestral music that swells on reveals; hard chapter structure.
  Transfers: metaphor-consistency, mascot callback, music dynamics.
- **OverSimplified:** joke every ~20-30s; anachronistic modern analogies for old
  events; running gags across a series; cliffhanger part-breaks; animated troop/map
  movement; deadpan understatement. Transfers: gag cadence, modern-analogy writing,
  map animation, running gags.
- **CrashCourse:** "Thought Bubble" cutaway skits (a recurring segment with its own
  visual language and a second voice); direct address; 200+ wpm delivery.
  Transfers: the cutaway-skit *structure* (not the content).
- **Heimler's History:** ritual open ("let's get to it"); cause-effect chains as the
  unit of explanation; exam-tip asides mid-flow; rhetorical direct address
  ("here's the thing you need to remember"). Transfers: ritual open, exam-tip
  asides, cause-effect chaining.

---

## Ranked catalog (scriptable only)

### #1. Point-slam annotate layer (every 40-50 seconds)
- **What:** a lower-third key-term card, floating label, or centered "so what"
  statement springs in on top of whatever scene is playing, holds ~4s, fades.
  At least one per 45 seconds of runtime — the visual heartbeat of the video.
- **Why:** the corpus shows 1.31 explicit point-markers/min in a successful APUSH
  channel; "point-driven" is the user's stated bar for beating Heimler. Visual
  reinforcement of the spoken point doubles encoding (dual-coding).
- **How:** existing `annotate(base_clip, notes)` — kinds `'term'` (term + gloss),
  `'label'` (floating label at x, y), `'point'` (centered statement). Manifest:
  notes list of `(at_seconds, dur, kind, kwargs)` per scene.
- **Effort:** trivial (exists). Cost is in scriptwriting: every beat's takeaway
  must be pre-written as a ≤8-word slam.
- **Suits:** explanations (the bulk of every video).

### #2. Branded cold-open ritual (identical open, every video)
- **What:** every video opens with the same 3-second ritual: series title slam +
  the same spoken line, then straight into content. No per-video clever intros.
- **Why:** 84 corpus videos use an identical cold open; ritual builds series
  identity and sets pace expectations in the first seconds (the retention cliff).
- **How:** `title_scene(img_path, title, sub, dur)` with a fixed series title card
  asset + fixed opening narration line in the script template. Manifest: scene 0 is
  always `{"primitive": "title_scene", "template": "series_open"}`.
- **Effort:** trivial (exists + script template convention).
- **Suits:** hooks (every video start).

### #3. Historical figures speak in their own voice (multi-voice quotes)
- **What:** primary-source quotes are spoken by a distinct "quote voice," not the
  narrator — the narrator sets up the quote, the voice changes, the quote lands.
- **Why:** voice contrast is the cheapest attention reset available; it marks
  "this is evidence, not narration" without any on-screen label. Proven in our
  pipeline (Cuba v4 narrator/Kennedy split).
- **How:** pipeline step in `render_narration_fish.py` — narration JSON already
  carries a `voice` field per segment; parts are rendered with different
  reference audios and stitched. Generalize: `voice` ∈ {narrator, quote,
  skeptic...} per segment, reference audio per voice.
- **Effort:** trivial (mechanism exists; add reference audios + voice field convention).
- **Suits:** quotes, document teardowns, DBQ-style evidence beats.

### #4. Exam-tip aside sting
- **What:** 2-3 times per video the narrator drops a 1-sentence exam tip
  ("if this shows up on the LEQ, the thesis writes itself"). On screen: a gold
  "pop" slam + a short SFX sting; the tip is visually distinct from content.
- **Why:** corpus has them at only 0.22/min — sparse enough that making them a
  *branded signature* differentiates us. Exam payoff is the viewer's core motivation.
- **How:** `annotate` kind `'pop'` (tilted word slam, exists) + pipeline SFX cue:
  manifest `sfx: "tip_sting"` at the aside timestamp, mixed in the audio step.
  Script convention: asides wrapped in `[TIP]...[/TIP]` tags parsed by the
  narration renderer.
- **Effort:** trivial (annotate exists; SFX mix = small ffmpeg addition).
- **Suits:** explanations, transitions (place right after the point the tip exploits).

### #5. "Remember this" memory-cue cards
- **What:** the single most testable fact per chapter gets a dedicated 3-second
  card: darkened image + big text, narrator says "remember this:" then the fact.
- **Why:** "remember" is the corpus's #1 rhetorical device (249 hits). Explicit
  memory cues match how APUSH students actually use videos (cramming).
- **How:** `kinetic_text(phrase, dur, sub=..., bg_img=<topic image>)` — bg_img is
  mandatory (no-empty-screen rule). Script convention: `[MEMORIZE]` tag.
- **Effort:** trivial (exists).
- **Suits:** explanations (1-2 per video, never more — scarcity = weight).

### #6. Sign-off catchphrase ritual
- **What:** every video ends with the same spoken sign-off line + matching
  on-screen slam. Our invented equivalent of "catch you on the flip flop" —
  original wording, same mechanics.
- **Why:** corpus catchphrase appears in ~80 videos; rituals create in-group
  identity and comment-section repetition (free marketing).
- **How:** script template (fixed closing line) + `overlay_text`/`kinetic_text`
  slam of the phrase over the end card. Manifest: final scene template.
- **Effort:** trivial.
- **Suits:** endings.

### #7. Kinetic word slams for key terms
- **What:** when a key term is introduced, the term itself slams onto screen with
  spring overshoot over the topic image — not a bullet list, a single moment.
- **Why:** term introduction is the highest-value 2 seconds for an APUSH viewer;
  motion + scale change captures the attention the term needs.
- **How:** `kinetic_text(phrase, dur, bg_img=<topic image>, color=gold)`.
- **Effort:** trivial (exists).
- **Suits:** explanations (term introductions), hooks.

### #8. On-screen viewer questions ("pause: which caused which?")
- **What:** 1-2 times per video: narration stops, a full-screen question card
  appears ("PAUSE: which came first — the act or the protest?"), 3 seconds of
  silence, then the answer. Corpus asks only 0.08 questions/min — this is open water.
- **Why:** active recall beats passive watching; the pause creates a micro-cliffhanger
  inside the video. Directly serves the exam goal.
- **How:** `title_card(text, dur, sub="pause and think", bg_img=<topic image>)` +
  narration segment of silence (render 3s silent mp3 or `[pause:3]` TTS tag) +
  answer revealed via `annotate` `'point'` or `bullet_slide`.
- **Effort:** trivial (exists; add `[pause:N]` tag parsing to narration renderer).
- **Suits:** explanations, transitions.

### #9. Callback gag registry (cross-video running jokes)
- **What:** a shared registry of gag assets reused across videos. Example: every
  time Parliament overreaches, the same "taxation without representation" pop-slam
  graphic slams in with the same 2-note sting. 3+ videos before it pays off.
- **Why:** OverSimplified-style running gags reward subscribers and create
  comment-section in-jokes. The *reuse* is the joke — cheap after the first build.
- **How:** `annotate` kind `'pop'` with a shared asset dir
  (`video/assets/gags/<gag_id>.png`) + manifest `gag: <gag_id>`; validator warns
  if a gag asset is referenced but missing. Script convention: gag cues in brackets.
- **Effort:** trivial (exists + asset convention + validator check).
- **Suits:** explanations, transitions, endings (escalating reuse).

### #10. "Common mistake" MYTH stamp
- **What:** when narration names a classic student misconception, a red "MYTH"
  stamp slams diagonally across the screen with a thud SFX, then the correction
  appears. Never more than 2 per video.
- **Why:** misconception confrontation is the highest-retention teaching move in
  the MCQ bank's own design (misconception distractors); stamping it makes the
  correction memorable. Scarcity preserves punch.
- **How:** NEW primitive (trivial): `myth_stamp(base_clip, at, dur, myth_text,
  correction)` — composes `annotate` `'pop'` (rotated red tile) + `overlay_text`
  for the correction + manifest SFX cue `sfx: "stamp_thud"`. ~40 lines.
- **Effort:** trivial.
- **Suits:** explanations (misconception beats).

### #11. Punch-in on every scene start
- **What:** every scene opens with a 0.5s zoom punch (1.07x -> 1.0, eased) instead
  of a soft fade. The "modern cut" feel.
- **Why:** eliminates dead-feeling transitions; constant micro-motion holds
  attention across 6-8 minutes. Already the house style per motion.py docs.
- **How:** existing `punch_in(clip, amount=0.07, dur=0.5)` — apply in the manifest
  assembler to every scene by default (opt-out flag, not opt-in).
- **Effort:** trivial (exists; one-line change in assembly default).
- **Suits:** transitions (all of them).

### #12. Progress bar + chapter cards
- **What:** a thin gold progress bar under the video's chapter segments
  ("2 of 5: Causes"), plus a 2-second chapter card between major sections.
- **Why:** Kurzgesagt-style chaptering; progress indicators reduce abandonment by
  making the remaining cost visible. Viewers tolerate 8 minutes when they can see
  the map.
- **How:** NEW primitive (trivial): `chapter_bar(base_clip, segments)` —
  `segments` = list of (label, start, end); draws a persistent bottom bar with
  the current chapter highlighted, composited via a per-frame overlay (~45 lines,
  composes `overlay_text` primitives baked per chapter). Chapter cards:
  `title_card(text, dur, bg_img=...)` (exists).
- **Effort:** trivial.
- **Suits:** transitions, structural (whole-video spine).

### #13. Animated counters / tickers
- **What:** numbers that count up on screen in sync with narration: war casualties,
  votes in Congress, dollars of debt, years passing. Big tabular numerals,
  gold, centered.
- **Why:** quantification makes abstract scale visceral (a number *moving* is
  10x more arresting than a number stated). OverSimplified uses this constantly.
- **How:** NEW primitive (trivial): `counter_scene(target, dur, label,
  bg_img, prefix="", suffix="")` — new frame function drawing the interpolated
  number with easing (~40 lines, composes `_bg_base` + `text_rgba`).
- **Effort:** trivial.
- **Suits:** explanations (any statistic), hooks ("by 1860, the number was...").

### #14. Before/after wipe reveal
- **What:** a vertical wipe sweeps across the frame transforming image A into
  image B: colony map -> US map, 1790 street -> 1890 street, "before the act /
  after the act." The wipe edge carries a gold line + label.
- **Why:** the single clearest visual form of causation and change-over-time —
  the two reasoning processes the exam grades. A reveal is a micro-payoff.
- **How:** NEW primitive (moderate): `wipe_scene(img_a, img_b, dur, label_a,
  label_b)` — new frame function: two `kb_scene`-style bases composited with a
  moving vertical mask + edge line (~70 lines).
- **Effort:** moderate.
- **Suits:** explanations (change/continuity), transitions.

### #15. Versus face-off cards
- **What:** "Hamilton vs. Jefferson" — the frame splits, two portraits slide in
  from opposite sides, names slam under each, a "VS" badge pops center. Then
  narration argues both sides.
- **Why:** personifies abstract debates; the format primes the viewer for
  comparison (a graded reasoning skill). Reusable template across dozens of videos.
- **How:** NEW primitive (trivial): `vs_scene(img_left, img_right, dur,
  name_left, name_right)` — composes `kb_scene` halves + `annotate` `'pop'`
  for the VS badge (~45 lines).
- **Effort:** trivial.
- **Suits:** explanations (debates, elections, court cases), hooks.

### #16. Thought-bubble cutaway skit (CrashCourse transfer)
- **What:** a recurring 15-20s segment with its own visual language (flat-color
  background, simple original cartoon figures) and a *second TTS voice* acting
  out a micro-scene: e.g., a colonist and a tax collector arguing. Then snap back
  to the main narration.
- **Why:** CrashCourse's signature device; a voice + style change is a hard
  attention reset, and dialogue dramatizes causation better than narration.
- **How:** NEW primitive (moderate): `skit_scene(script_beats, dur)` — flat
  background + speech-bubble tiles drawn per beat with `text_rgba`, simple
  original character shapes via PIL (circles/rects — original, not clip art);
  audio: multi-voice TTS segments (`voice` field, mechanism #3) timed to beats.
  Visuals stay deliberately simple — the *voices* carry it. ~90 lines + original
  character art (one-time).
- **Effort:** moderate (biggest cost is the one-time character art, not code).
- **Suits:** explanations (1 per video max; the "human moment").

### #17. Map-march animation (OverSimplified transfer)
- **What:** troop movements, territorial expansion, and trade flows animated as
  arrows/marching dots over public-domain maps: Lewis & Clark's route drawing
  itself, the cotton gin's... no — armies advancing, borders shifting, the
  Louisiana Purchase lighting up.
- **Why:** movement on maps is the most engaging way to show the #1 APUSH
  content type (expansion, war, migration). Static maps are wallpaper; animated
  ones are story.
- **How:** NEW primitive (moderate): `map_scene(map_img, dur, moves)` —
  generalizes `cuba_map_scene`: `moves` = list of (path_points, at, color,
  kind ∈ {arrow, dots, fill}); new frame function drawing progressive paths +
  pulsing markers (~100 lines, composes the cuba_map_scene technique).
  Requires PD map per video (Wikimedia Commons / LOC have them for every period).
- **Effort:** moderate.
- **Suits:** explanations (wars, expansion, migration, elections).

### #18. Music bed with ducking (pipeline audio step)
- **What:** a continuous PD/classical or original-loops music bed under the whole
  video, ducked -14dB under narration, swelling slightly on chapter cards and
  reveals. Not wall-to-wall energy — dynamics, Kurzgesagt-style.
- **Why:** music is the cheapest emotional continuity device; silence between
  narration segments feels like dead air in TTS videos. Ducking keeps
  intelligibility.
- **How:** pipeline step in audio assembly (new `mix_audio.py` or build_video.py
  extension): ffmpeg `sidechaincompress` on the music track keyed by narration +
  volume automation at chapter marks from the manifest. Music source: PD
  recordings (Musopen) or original loops — never commercial.
- **Effort:** moderate (new audio pipeline step; the mixing math is standard).
- **Suits:** whole-video (structural).

### #19. SFX stinger library (pipeline audio step)
- **What:** a library of ~15 original/PD sound effects cued from the manifest:
  whoosh (scene change), pop (word slam), thud (myth stamp), record-scratch
  ("wait — that's wrong"), chime (exam tip), drum hit (reveal). Mixed at low
  volume under narration.
- **Why:** SFX punctuate visual events the way a laugh track punctuates jokes —
  they tell the viewer's brain "that mattered." The annotate pops already exist
  visually; sound completes them.
- **How:** pipeline step: manifest `sfx` cues with timestamps (emitted by the
  manifest builder alongside annotate notes); mixed in the same new audio step
  as #18. SFX sourced PD (Freesound CC0) or synthesized (numpy beeps/sweeps —
  fully scriptable, zero licensing risk).
- **Effort:** trivial-moderate (cue plumbing + one-time library curation).
- **Suits:** transitions, hooks, myth stamps, exam tips, reveals.

### #20. TTS direction tags (pipeline narration step)
- **What:** script-level tags parsed before TTS: `[pause:0.8]`, `[beat]`
  (0.4s), `[slow]`/`[fast]` (rate shift for a clause), `[emphasis]` (render the
  clause as its own segment so it can be slightly louder/slower in the mix).
  The writer directs performance in the script; no human in the loop.
- **Why:** strategic silence is the most underused tool in TTS video — a 0.8s
  pause before the answer lands harder than any graphic. Pacing variation is what
  separates "robot reading" from "performance."
- **How:** pipeline step in the narration renderer: parse tags, split text into
  segments, render silence MP3s for pauses (ffmpeg `anullsrc`), apply
  `atempo` for rate tags, concatenate per the existing stitch logic in
  `render_narration_fish.py`.
- **Effort:** moderate (parser + segment handling; fish rendering unchanged).
- **Suits:** hooks (pause before the payoff), quotes (beat before the quote),
  endings.

### #21. Running jokes seeded in narration (script-level + registry)
- **What:** 2-3 series-long running jokes maintained in a `GAGS.md` registry with
  usage counts: e.g., every mention of British taxation gets the same weary
  aside; every treaty gets "signed, sealed, eventually broken." Writers pull from
  the registry; the manifest builder inserts the matching gag asset (#9).
- **Why:** running jokes are the cheapest subscriber-retention device in
  explanatory YouTube (OverSimplified's whole model). Cost is writing discipline,
  not code.
- **How:** script convention + `GAGS.md` registry (gag id, line template, asset,
  videos used in). No new code beyond #9's asset mechanism.
- **Effort:** trivial.
- **Suits:** explanations, endings (callbacks as closers).

### #22. Cliffhanger endings (script-level)
- **What:** the final 15 seconds tease the next video's central question without
  answering it ("...and that's why the compromise failed. Next time: the one
  election that broke the system — and the backroom deal that decided it."),
  over a zooming image with the next title card.
- **Why:** the standard serial-retention device; costs nothing and compounds
  across the 68-topic course plan.
- **How:** script template (fixed closer block referencing next video's hook) +
  `title_scene(next_title, ...)` or `camera_path` over a teaser image. Course
  plan order must be fixed so "next video" is deterministic.
- **Effort:** trivial.
- **Suits:** endings.

### #23. Honest "one weird trick" framing (script-level)
- **What:** exam-technique beats framed as a single high-leverage move, stated
  honestly: "the one sentence that earns the complexity point," "the two words
  that fix every SAQ." No clickbait — the trick must be real and rubric-grounded.
- **Why:** "one weird trick" framing is irresistible packaging; done honestly
  (the trick genuinely works) it builds trust instead of burning it. Our rubric
  research gives us real tricks to package.
- **How:** script convention only — the writer identifies one rubric-grounded
  move per technique video; visual: `kinetic_text` slam of the move + #4's
  exam-tip sting.
- **Effort:** trivial.
- **Suits:** hooks and endings of technique videos.

### #24. Speed-ramped rapid-fire lists (pipeline audio + visual)
- **What:** cause lists ("taxation, representation, smuggling, boycotts...") are
  delivered rapid-fire: TTS rendered at 1.25x via `atempo`, each item slamming
  on screen as it's spoken. Then narration drops back to normal speed for the
  explanation. The gear-shift itself is the fun.
- **Why:** pace contrast is an attention reset; rapid lists feel like a
  performance and compress low-value enumeration into high-energy seconds.
- **How:** pipeline: `[fast]` tag (#20) renders that clause with
  `atempo=1.25`; visual: `bullet_slide` with small `stagger` (0.25) or
  sequential `annotate` `'pop'` notes timed to the faster audio.
- **Effort:** moderate (rides on #20's tag parser + stagger tuning).
- **Suits:** explanations (enumerations), hooks.

### #25. Two-voice debate segments (multi-voice dialogue)
- **What:** for genuinely two-sided questions (Federalists vs.
  Anti-Federalists), two distinct TTS voices alternate short lines — a scripted
  30-second debate — instead of the narrator summarizing both sides.
- **Why:** dialogue is inherently more engaging than summary; voice contrast
  (#3's mechanism) extended to its logical end. The viewer "watches" an argument.
- **How:** pipeline: `voice` field per segment (mechanism #3, exists) with two
  non-narrator references; visual: `vs_scene` (#15) as the base with
  `annotate` `'label'` bubbles alternating sides.
- **Effort:** trivial (composes #3 + #15; needs 2 extra reference audios, one-time).
- **Suits:** explanations (debates, elections, court cases) — 1 per video max.

### #26. Series-arc callbacks in the manifest (structural)
- **What:** the manifest carries `callbacks: [{to_video, beat_ref, line}]` —
  explicit pointers to earlier videos ("remember the MYTH stamp from the
  Stamp Act video? It's back."). The narrator references it; the gag asset
  replays (#9).
- **Why:** callbacks turn 68 standalone videos into one course-shaped story;
  returning viewers get rewarded, new viewers get a watch-next pointer.
- **How:** manifest metadata + script convention; validator checks that
  `to_video` ids exist in COURSE-PLAN.md. No new rendering code.
- **Effort:** trivial.
- **Suits:** explanations, endings.

---

## Rejected: not scriptable (one line each)

- **Copyrighted meme images/macros:** licensing risk violates the PD-only constraint; original meme-adjacent cartoons (#16's art) are the substitute.
- **Trending TikTok/YouTube audio:** commercial music licensing; PD beds (#18) are the substitute.
- **Host charisma / improvisational banter:** requires a human on camera; TTS direction tags (#20) are the scriptable substitute.
- **Audience-driven content** (comment callouts, Q&A videos): requires a live audience loop outside the factory.
- **Whisper/ASMR emphasis:** fish-speech cannot reliably produce whisper from a normal reference voice — unscriptable until proven otherwise; `[slow]`+pause (#20) is the substitute.
- **Hand-keyframed character animation:** per-video manual labor; simple PIL cartoon shapes (#16) are the scriptable substitute.
- **Real-person voice impressions of modern figures:** the pipeline supports reference voices, but impersonating real living people is a policy and trust risk; distinct original "quote voices" (#3) are the substitute.
- **Manually timed comedic pauses:** any gag requiring a human to feel the timing; `[pause:N]` tags (#20) with writer-specified durations are the substitute.
- **Reaction-style content** (watching/grading real student work on camera): needs real artifacts and a host; scripted exemplar teardowns with the quote-voice mechanism are the substitute.

---

## Build order recommendation (for the playbook team)

1. **This week (all trivial, existing primitives):** #1 annotate density rule,
   #2 cold-open template, #5 memorize cards, #6 sign-off, #7 word slams,
   #8 pause-questions, #11 punch-in default, #4 exam-tip stings, #21 gag registry.
2. **Next (trivial new primitives):** #10 myth stamp, #12 progress bar,
   #13 counters, #15 versus cards, #9 gag asset plumbing.
3. **Then (moderate):** #20 TTS direction tags (unlocks #24), #18 music ducking +
   #19 SFX library (one audio pipeline step), #14 wipe reveals, #17 map-march.
4. **Last (moderate, highest craft cost):** #16 thought-bubble skits (one-time
   character art), #25 two-voice debates (needs extra reference audios).

*Catalog written 2026-10-02. Corpus analysis scripts kept at
`~/workspace/apush-qc/fun-research/` (analyze_srts.py, mechanics.py,
catchphrase.py, final_stats.py, srt_corpus.json).*
