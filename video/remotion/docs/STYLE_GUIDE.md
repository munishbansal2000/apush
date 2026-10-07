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
- No host speaks more than **4 turns in a row** **[lint S013]**. Recap and quiz are shared:
  Maya recaps, Marcus runs at least half the questions.

## 3. Episode structure (frozen)

| Beat | Owner | Rule |
|---|---|---|
| **Cold open** (≤20s) | Maya | Three concrete surprises + a turn. No "last time". Follow with `[hold 0.8s]`. |
| **Previously** | Marcus | One sentence of recap, one sentence of promise. |
| **Four boxes** | Maya | Names every box (`# @boxes:`), "Circle the ones you couldn't explain right now." |
| **Box content** | both | Each box: explanation → `{trap}` → correction. |
| **Mid-episode check** | Maya | Exactly **one** "Checking that one." (`# @midcheck: N`) **[lint S015]** |
| **Prediction beats** | Maya asks | Exactly **2**, each opens "Your turn." then `[10-second pause]` **[lint S016]** |
| **Recap** | Maya | Box N, checked — in order, every box except the mid-check one **[lint S015]** |
| **Self-test** | both | 3 AP-shaped questions (`[15-second pause]`, `[20-second pause]` for argument) + 1 fast bonus (`[5-second pause]`) **[lint S016]** |
| **Next time** | Maya | One line. |
| **Closing tagline** | split | One thought across two voices with an em dash and `[hold 1.0s]` **[lint S017]** |

Every pause follows a question or a prompt verb (Defend, Name, Explain…) **[lint S004]** and is
followed by an answer turn. Every pause gets an on-screen prompt card and an answer reveal
(see SCENE_GUIDE) **[lint P001]**.

## 4. Language

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

## 5. TTS (Fish Audio)

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

## 6. Length

Target **≤1,500 words** of speech (warn), hard cap **1,600** **[lint S011]**, plus 75s of pauses.
That is ~10–11 minutes with gaps. If you need more, split the topic.

## 7. Review checklist (human)

- [ ] Could a student explain each box from the recap alone?
- [ ] Does each `{trap}` sound like something a real student would say?
- [ ] Is any line there only to set up the next line? Rewrite it as a guess or an objection.
- [ ] Does the serious section have zero jokes and at least one human-scale detail?
- [ ] Read the cold open aloud: would you keep watching after 10 seconds?
