# APUSH Audio/Video Style Guide

The one reference for how an episode **sounds** and **reads**. Rules marked **[lint]** are
enforced by `npm run validate` (codes in brackets); the rest are judgment calls reviewers check
against this page. When a rule here and a lint rule disagree, fix whichever is wrong in the same
change — they must not drift.

---

## 1. The show in one paragraph

Two hosts help an AP student understand one CED topic well enough to **write about it under
time pressure**. Every episode leaves the learner able to (1) explain each box on the episode
sheet in their own words, (2) dodge the trap the exam sets for that box, and (3) answer one
stimulus question, one argument question, and one causation question out loud. Entertainment
serves retention; it never costs accuracy.

## 2. Characters

### Maya — the student in the room
- **Role:** asks what the learner is thinking, *including the wrong thing*. She owns the episode
  sheet and the box check-offs.
- **Voice:** quick, curious, a little irreverent; reacts with her body ("My whole childhood was a
  lie"). Short turns, but not *only* short turns.
- **She gets things wrong on purpose.** Each box has one `{trap}` line where Maya states the
  mistake the exam rewards you for avoiding **[lint S022]**. She must not be a set-up machine who
  asks the exact right question at the exact right moment — give her guesses, hunches,
  objections ("Was it just that the Spanish brought more people?").
- **Running bits** (reuse across episodes, sparingly): her family's Sunday dinner; the episode
  sheet; mild outrage at movies.
- **Never:** lectures for more than ~40 words; delivers an "exam tip" in announcer voice.

### Marcus — the historian who likes her
- **Role:** explains, corrects, and complicates. Owns causation, evidence, and historiography
  ("Some historians push back on it").
- **Voice:** warm, precise, dry humor ("You're welcome."). Concrete nouns over abstractions.
  Says "estimates run roughly" not "one textbook says."
- **He catches the traps.** His correction turn opens with a marker: *Careful / Not so fast /
  Almost / That's the box-N trap / Half an answer* **[lint S022]**.
- **Never:** dumps a list longer than five items; uses a number without its scope.

### Balance
- Each host has **35–65% of words** **[lint S012]**. Marcus explains more; Maya speaks more often.
- No host speaks more than **4 turns in a row** **[lint S013]**. Maya recaps; in practice videos
  Marcus asks and answers, Maya explains why the answer scores.

## 3. Video types

| Type | Purpose | Length | Written in | Script kind |
|---|---|---|---|---|
| **Episode** (one per CED topic) | Explain the topic, set the traps, build the boxes | 8–9 min | `script/<ep>.vN.md` (by hand) | `# @kind: episode` |
| **Unit practice** (one per unit) | Spaced, mixed, exam-style retrieval after the unit's episodes | 8–10 min when complete | `data/practice/<unit>.json` (script generated) | `# @kind: practice` |
| **Shorts** | One per box chapter, one per practice question | 45–90 s | derived from chapters | — |
| **Unit cram** | Last-minute review | — | planned (E9) | — |

Where questions go: **in episodes**, only the two prediction beats, the traps, and one fast
quick check. **All AP-style questions** (stimulus, defend/refute, causation, comparison) go in the
unit practice file, which also produces the quiz CSV and answer key.

## 4. Episode structure (frozen)

| Beat | Owner | Rule |
|---|---|---|
| **Cold open** (≤20s) | Maya | Three concrete surprises + a turn. No "last time". Follow with `[hold 0.8s]`. |
| **Previously** | Marcus | One sentence of recap, one sentence of promise. |
| **Four boxes** | Maya | Names every box (`# @boxes:`), "Circle the ones you couldn't explain right now." |
| **Box content** | both | Each box: explanation → `{trap}` → correction. |
| **Mid-episode check** | Maya | Exactly **one** "Checking that one." (`# @midcheck: N`) **[lint S015]** |
| **Prediction beats** | Maya asks | Exactly **2**, each opens "Your turn." then `[10-second pause]` **[lint S016]** |
| **Recap** | Maya | Box N, checked — in order, every box except the mid-check one **[lint S015]** |
| **Quick check** | Maya | 1 fast question with a `[5-second pause]` **[lint S016]**. The AP-style questions live in the **unit practice video** (§8) |
| **Practice pointer** | Marcus | One line pointing to the unit practice video |
| **Next time** | Maya | One line. |
| **Closing tagline** | split | One thought across two voices with an em dash and `[hold 1.0s]` **[lint S017]** |

Every pause follows a question or a prompt verb (Defend, Name, Explain…) **[lint S004]** and is
followed by an answer turn. Every pause gets an on-screen prompt card and an answer reveal
(see SCENE_GUIDE) **[lint P001]**.

## 5. Language

### Sentences
- Mix. **≤32% of sentences may be four words or fewer** **[lint S014]**. Staccato is a spice; in
  the serious section, use full sentences and let them breathe.
- **≤80 words per turn** **[lint S010]** — TTS prosody degrades beyond that.
- Repetition is a tool, not a habit: no 5-word phrase more than 3 times outside the recap
  **[lint S018]**.

### Banned phrases **[lint S005]** (data/style-rules.json)
"Fun fact", "Think about that for a second", "Let's dive in", "Buckle up", "Without further ado",
"It's important to note", "In today's video", and the retired devices "Exam tip" / "Common
mistake" (use a `{trap}` instead). Add to the list whenever a reviewer flags a crutch.

### Terminology **[lint S020]**
| Avoid | Use |
|---|---|
| slaves | enslaved people, enslaved Africans, captives |
| New World | the Americas (quote "New World" only inside a labeled primary source) |
| discovered | reached, arrived, encountered |
| Indians | Native peoples, or the specific nation (Comanche, Nahua, Tlaxcalans) |
| tribe | nation, people, confederacy (warn) |
| savage | never, outside a labeled primary-source quote |

Name specific peoples whenever you can. "Native peoples" is the fallback, not the default.

### Numbers
- Every big number carries its **scope and certainty**: "eight or nine out of ten **in the
  hardest-hit towns**", "estimates run **roughly** fifty to ninety percent" **[lint S007]**.
- Write years as digits in the script; decades and centuries (1500s) need a TTS rule in
  `data/pronunciations.json` **[lint S009]**.

### Sensitivity
- Disease, conquest, and slavery sections drop jokes entirely. Humor returns at the recap.
- Africans, Native peoples, and Europeans are all **actors** with choices, not scenery
  **[lint S023 / F-U1-018]**.
- No gore. Specific, human detail (the Codex account) beats statistics for weight.

## 6. TTS (Fish Audio)

- The script is **never** sent to TTS directly. `npm run build:tts` writes `tts/<ep>/tNN.txt`,
  the exact text to send. Generate audio from those files.
- **Pronunciation lives only in `data/pronunciations.json`**. Never respell in the script.
  Every non-ASCII or Nahuatl-pattern word needs an entry **[lint S008]**; flip `approved: true`
  only after listening **[strict S021]**.
- Em dashes become commas for TTS; a trailing em dash becomes a comma and the silence comes
  from `[hold Ns]` in timing, not from the voice.
- Emotion markers: `{soft tone}` at the start of a line, from the allowed list **[lint S019]**.
  Emitted only with `build:tts --emotion`; confirm the marker set against your Fish model first.
- Generate very short lines ("Right.", "Box four, checked.") with the previous line as context,
  then trim — alone they come out flat.
- After regenerating any clip: `npm run build:timing`. The validator compares each clip's TTS
  hash to the current script and fails if they diverge **[T006]**.

## 7. Length

Episodes: target **≤1,450 words** of speech (warn), hard cap **1,600** **[lint S011]**, plus ~25 s of
pauses (two prediction beats and one quick check). That is ~8.5–9 minutes. If you need more,
split the topic. Practice videos grow with the unit: about 45–60 s per question.

## 8. Unit practice videos

AP-style questions are written **once per unit** in `data/practice/<unit>.json`. That one file
becomes:

- the practice video: Maya's intro → for each question, Marcus asks → countdown card →
  Marcus's model answer with a reveal card → Maya on why it scores → Maya's outro;
- one vertical Short per question;
- `out/<unit>-quiz.csv` (Google Forms / LMS import) and `out/<unit>-answer-key.md`.

Each question:

| Field | Rule |
|---|---|
| `ask` | Spoken. Starts with "Question one." (two, three…). Ends with a question or a prompt verb |
| `card.stem`, `card.source` | On-screen exam card; sources labeled PARAPHRASED when they are |
| `prompt` / `reveal` | Short on-screen countdown prompt and answer chip |
| `pauseSec` | 15 for short answers, 20 for arguments (5/10 allowed) |
| `answer` | Spoken model answer: the claim plus the evidence |
| `why` | Spoken by Maya: what earns the point (one or two sentences) |
| `topic`, `episode`, `facts` | CED topic, source episode, fact-registry ids (required) |

Mix topics across the unit (not episode order); cover the exam formats (stimulus short answer,
defend/refute, causation, comparison, continuity/change). The spoken text is linted like any
script: `@kind: practice` skips episode-structure rules (boxes, traps, prediction beats, required
mentions) but keeps every language, terminology, hedge, and forbidden-claim rule.

## 9. Review checklist (human)

- [ ] Could a student explain each box from the recap alone?
- [ ] Does each `{trap}` sound like something a real student would say?
- [ ] Is any line there only to set up the next line? Rewrite it as a guess or an objection.
- [ ] Does the serious section have zero jokes and at least one human-scale detail?
- [ ] Read the cold open aloud: would you keep watching after 10 seconds?
- [ ] Practice: could a student who watched the unit answer each question, and does each model answer show *why* it scores?

## 10. Visual system

One theme, one source: **`src/theme/tokens.ts`**. Components, motion blocks and scenes take every
font, color, type size, radius, stroke, shadow, safe margin and motion timing from it.

**Rule [test]: no literal fonts or colors outside `src/theme`.** `tests/theme.test.ts` (run by
`npm test`) scans `src/components` (the kept visual components and `geo/`), `src/motion` and
`src/scenes` and fails on any literal `fontFamily` string / font stack, any hex color
(`#rgb`, `#rrggbb`) and any `rgb()/rgba()/hsl()` literal, reporting each as `file:line`. The only
exception is the costume palette in `src/motion/characters.tsx` (hex allowed inside a
`const COSTUME*` block). Data JSON is not scanned. Need a new color? Add a named role to
`COLOR` — never inline it.

### Tokens

| Token | What it holds |
|---|---|
| `FONT` | `display` (Cinzel — titles, headings, date chips, shouted labels at weight 700/900), `text` (Libre Baskerville — body, labels, captions), `ui` (Plus Jakarta Sans — counters, tags, numbers), `mono` (JetBrains Mono — coordinates, data readouts), `hand` (system script for margin notes) |
| `COLOR` | surface colors (see below) + roles shared by both surfaces: `gold`, `amber`, `red`, `redDeep`, `blue`, `green`, `brown`, `grey`; historical sides (`union`, `confederate`, `patriot`, `british`, `free`, `slave`); speakers (`maya`, `marcus`); face tones (`skin`, `skinShade`, `blush`) |
| `alpha(hex, a)` | translucent variant of a token — `alpha(COLOR.night, 0.6)`. The only way to write a translucent color. |
| `TYPE` | px at 1280×720: `display 72 · h1 56 · h2 40 · h3 30 · term 30 · caption 25 · place 24 · body 22 · chip 22 · flow 17 · label 17 · town 16 · small 15`, plus HUD chrome `tag 13 · micro 11 · nano 9` |
| `RADIUS` | `sm 6 · md 10 · lg 16 · pill 999` (circles stay `'50%'`) |
| `STROKE` | `hair 1 · thin 1.6 · base 2.5 · bold 4` |
| `SHADOW` | `card`, `lift`, `text` |
| `SAFE` | safe-area margins (64 × 36 at 1280×720; matches render-config `safe`) |
| `MOTION` | `enter`, `fade`, `stagger` (s), `spring` (the default Remotion spring config), `camera` (bezier) |
| `SURFACE` | panel presets `parchment` / `night`: `{ bg, fg, muted, border }` |

Sizes are screen px at 1280×720. Components scale them with their existing factor
(`sx = width / 1280`, `px()`, `u()`, `k`): write `TYPE.h2 * sx`, never a bare `40`. Use
`MOTION.spring` unless a motion is intentionally different (critically damped `{ damping: 200 }`,
a deliberately bouncy landing) — then keep it and say so in a comment.

### Two surfaces, same roles

- **Parchment** (light) — maps, documents, explainers: `paper` / `paperDeep` backgrounds, `ink`
  / `inkSoft` / `inkMuted` text, `ocean` / `oceanDeep` / `coast` for cartography, `halo` behind
  map labels.
- **Night** (dark) — cinematic titles, dramatic beats, HUD panels: `night` / `nightPanel`
  backgrounds, `onNight` / `onNightMuted` text, `gold` / `amber` highlights.

Role colors (`gold`, `red`, `blue`, `green`, sides, speakers) mean the same thing on both. On night,
small text stays `onNight`/`gold`; use `blue`/`green`/`red` for strokes, fills and bars, not for
tiny text (contrast).

### Fonts

Self-hosted from `public/fonts` (woff2 from fontsource) and loaded by `src/theme/fonts.ts`
(`delayRender` until every face is ready, so text never renders or measures in a fallback font).
All four families are SIL Open Font License 1.1 — credits in `docs/COMPONENT_ASSETS.md`. Weights
shipped: Cinzel 400/700, Libre Baskerville 400/700/400-italic, Plus Jakarta Sans 400/700,
JetBrains Mono 400/700 — heavier requested weights (800/900) render as 700.
