# APUSH Creative Video Playbook

This is the production contract for agents writing lesson videos. The target is
not "more animation." The target is a clear historical argument that changes
visually and emotionally at the same moments the narration changes.

Voice performance is scored under the companion
[`AUDIO_PERFORMANCE_PLAYBOOK.md`](AUDIO_PERFORMANCE_PLAYBOOK.md) — narration
must perform with eyes closed, or the lesson is unfinished.

## The non-negotiable idea

Every scene must have one job and one visual verb.

| Scene contract | Question it answers |
|---|---|
| Claim | What new idea does the learner understand? |
| Evidence | What fact, quotation, map, object, or image earns that claim? |
| Visual verb | What does the viewer do: inspect, compare, trace, reveal, count, or choose? |
| Turn | What changes during the scene? |
| Exit | What unresolved question pulls us forward? |

If the visual merely decorates the narration, redesign the scene. A moving
background is not a visual argument.

## The five-pass workflow

### 1. Find the dramatic question

Write the lesson as a question with real tension, not a topic label.

- Weak: "The Valladolid Debate"
- Strong: "Can an empire put its own conquest on trial?"
- Weak: "The Pueblo Revolt"
- Strong: "How did a scattered resistance coordinate one day of revolt?"

Then write the answer in one sentence. Every scene must advance, complicate,
or prove that answer.

### 2. Build the story spine before writing prose

Use 5-8 purposeful scenes:

1. **Cold open:** a contradiction, mystery, consequential choice, or startling
   primary source. Pay it off within six seconds.
2. **Orientation:** only the context needed to understand the conflict.
3. **Best case A:** state the first position fairly and concretely.
4. **Reversal/evidence:** introduce the image, testimony, number, or event that
   changes how the viewer interprets A.
5. **Best case B:** let the opposing actor answer in their strongest form.
6. **Student decision:** pause on a genuine choice, prediction, or source test.
7. **Meaning:** answer "so what?" without pretending later outcomes were
   inevitable.
8. **Memory close:** compress the lesson into a reusable causal pattern.

Not every lesson needs all eight, but every lesson needs a turn. A sequence of
facts with transitions is not a story.

### 3. Assign a visual grammar

Choose the primitive from the learner's mental action:

| Learner action | Preferred treatment |
|---|---|
| Inspect evidence | `source_analysis`, `zoom`, `callout`, `annotate` device |
| Compare claims | `versus`, `wipe`, matched split composition |
| Trace causation | `diagram`, `map`, `timeline` |
| Feel scale | `counter`, restrained generated clip |
| Read an argument | `typewriter`, `redact_reveal` device |
| Make a judgment | `show_ask` device, then hold two seconds |
| Remember a sequence | `date_ticker`, three-step diagram, refrain |

Use generated video only when motion itself teaches something: a ship crosses
a route, smoke reveals wind, water shows current, crowds converge, territory
changes, or an environment becomes legible. Never ask a model to animate text,
maps with exact borders, quotations, dates, or precise causal diagrams.

### 4. Write spoken narration, then screen text

Narration should sound like a smart teacher speaking, not an essay being read.

- Prefer concrete nouns and active verbs.
- Average 8-16 words per sentence.
- Introduce one unfamiliar term at a time.
- Alternate compression with breath: claim, image, pause, consequence.
- Signal interpretation: "Notice," "That matters because," "Here is the
  reversal," or "Now decide."
- Do not narrate every label visible on screen.

Screen text is a second channel, not subtitles. Use it for names, dates,
contrasts, causal links, and the exact phrase students should remember. A beat
should normally contain 2-6 words and remain visible long enough to read once.

### 5. Score the emotional arc

Audio is structural:

- **Background:** a continuous low bed creates unity across cuts.
- **Ducking:** narration automatically pushes the bed down; silence after a
  consequential line is often stronger than another effect.
- **Intro:** 1.5-3 seconds establishes energy and identity.
- **Chapter stinger:** marks a change in argument, not every new image.
- **Outro:** begins under the final synthesis and carries the last frame.
- **Foley:** connects sound to an object (paper, quill), never to empty motion.
- **Effects:** reserve impacts for real argumentative turns.

## Generated-video prompt formula

Write prompts in this order:

1. Name what must remain fixed from the source image.
2. Name one primary motion with direction and speed.
3. Add at most two environmental motions.
4. State camera behavior.
5. State historical and compositional prohibitions.

Example:

> Preserve the engraved ship, coastline, rigging, and every figure exactly.
> The ship advances slowly left to right across rolling swells. Sails billow
> gently and pennants stream with the same wind; sunlight shimmers on the
> water. Use a slow lateral tracking camera with no zoom. Do not add ships,
> people, text, modern objects, or alter the coastline.

The moving water is supporting motion. The ship's travel is the teaching
motion. If the teaching motion fails, use deterministic pan/map animation.

## Coherence rules

1. A label appears only when its narrated idea begins.
2. A visual change lands on the word that motivates it, using `cue`.
3. Every archival image is identified as evidence, illustration, or later
   interpretation. Never imply a later engraving is eyewitness evidence.
4. No scene carries two competing focal points.
5. Do not cover the evidence with large opaque cards. Text uses safe zones and
   the layout validator must report zero collisions.
6. Generated motion must preserve the base image's identities and geometry.
7. Repeated animation types need a reason; use at least three visual modes per
   lesson, but do not vary merely for novelty.
8. Music changes at argumentative chapters, not arbitrary scene boundaries.

## Market-quality rubric (100 points)

Reject any script below 85, or any script that fails historical accuracy.

| Dimension | Points | Full-credit standard |
|---|---:|---|
| Historical correctness | 20 | Claims, dates, causation, sourcing, and image use are defensible |
| Story architecture | 15 | A dramatic question, escalation, reversal, decision, and payoff |
| Teaching clarity | 15 | One scene job; concepts build without missing logic |
| Visual-narrative correlation | 15 | Every visual action is motivated by the spoken line |
| Evidence quality | 10 | Primary sources are inspected and contextualized, not wallpaper |
| Pacing and retention | 10 | Pattern interrupts and pauses occur at meaningful moments |
| Screen-text discipline | 5 | Brief, timed, readable, collision-free |
| Audio direction | 5 | Music, silence, foley, and effects support the argument |
| AP transfer | 5 | The ending gives a causal/comparison/continuity pattern students can reuse |

## Enforcement: independent blind review

The rubric is scored by an independent reviewer, never by the writing agent.
A writer grading its own lesson is not a gate; it is a wish.

- **Clean context.** The reviewer receives the manifest, narration, brief, and
  this playbook — never the writer's notes, drafts, or self-assessment. It
  scores the artifacts alone, from zero prior context.
- **Self-audit is pre-flight only.** The writer's self-score catches obvious
  failures before review. It does not count toward the 85 floor.
- **Verdicts.** PASS (ships) / FIX (targeted repairs the reviewer names
  explicitly; re-verified before shipping) / REWRITE (scores below 70, or any
  fail-closed breach: invented people, artifacts, quotations, dates, or causal
  claims; dishonest archival labeling).
- **Historical correctness is fail-closed.** One invented claim fails the
  lesson regardless of total score. No rubric points can buy back accuracy.
- **Exam alignment.** The reviewer verifies every date, name, and causal claim
  against the cited sources, and confirms the College Board key terms for the
  topic appear and are used correctly.
- **No review shopping.** A FIX verdict returns to the same reviewer. The
  writer may not re-prompt, re-frame, or seek a friendlier score. The lesson
  ships only on reviewer PASS.

## Gold-standard example: Valladolid

The production manifest is
[`manifests/u1-ch3-l8-valladolid-debate.json`](manifests/u1-ch3-l8-valladolid-debate.json).
Its spine is worth imitating:

| Movement | Device | Why it works |
|---|---|---|
| Spain puts conquest on trial | Contradiction hook | Empire becomes defendant, creating immediate stakes |
| Sepulveda builds the abstract case | Redact/reveal | Claims appear exactly as he voices them |
| Abstraction meets the mine | Split/reversal | The visual argument changes before the rebuttal begins |
| Las Casas answers as eyewitness | Telestrator | The viewer inspects what testimony points toward |
| Five days of testimony | Page sequence + foley | Duration becomes physical and memorable |
| Viewer becomes the council | Show/ask | Retrieval and judgment replace passive watching |
| The question survives | Date ticker + musical outro | The close transfers the issue without claiming a false verdict |

## Agent delivery contract

An agent must deliver these in order:

1. A one-page creative brief: question, answer, audience, misconception,
   emotional arc, evidence list, and ending memory pattern.
2. A scene table with the five scene-contract fields at the top of this file.
3. Narration with cue phrases marked.
4. A complete validated manifest with visual provenance and audio design.
5. A self-audit using the 100-point rubric, listing weaknesses honestly.
6. A dry run with zero cue, schema, file, and text-layout errors.

Agents may not compensate for a weak story by adding more transitions,
generated clips, labels, or sound effects. Fix the spine first.
