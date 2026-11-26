# PassMaster APUSH Lesson Specification

Version 1.0 — 2026-11-26. Follows `~/workspace/apush/APUSH_CONTENT_PLAN.md`
(architecture and pipeline rules) with PassMaster targets (3,000 MCQ +
500 FRQ) superseding the plan's old bank counts. The book is lessons +
questions + explanations, stimulus-heavy throughout, placed logically.

## 1. What a lesson is

A lesson is narrative teaching content for 1-2 CED topics, grounded in the
three books + CED, with embedded real stimuli and worked items that teach
toward the bank questions for its topics. Lessons live under
`build/passmaster/lessons/`, one Markdown file per lesson.

- File: `apush-u<N>-l<M>.md` (e.g. `apush-u1-l3.md`).
- Frontmatter (YAML): `id`, `unit`, `topics` (1-2 CED codes), `title`,
  `themes`, `skills`, `reasoning`, `grounding` (same shape as questions:
  books with book id + chapter + section), `questions` (the bank question
  ids this lesson teaches toward), `status` (`draft`, `review`, `final`).
- Body: narrative sections (H2 headings), key terms, embedded stimuli,
  worked items, and a closing check.

## 2. Structure

1. **Opening (1 short paragraph).** The question the lesson answers, in
   plain language. No throat-clearing, no "in this lesson you will learn".
2. **Narrative sections (H2).** The teaching, in the order a student
   should meet it. Short paragraphs (90-word cap, same as the Calc voice
   rule). Every date, name, and statistic verified against the grounding
   (see section 5). No AI-filler language, no trap language, no
   exclamation marks.
3. **Key terms (max 12 per lesson).** Defined where they first appear in the
   narrative (bold on first use, one-sentence definition in flow) and
   collected in a "Key terms" list at the end of the lesson with the same
   definitions, one line each. A term is earned only if the lesson's questions use it.
4. **Embedded stimuli (2-4 per lesson).** Real artifacts or real-data
   visuals placed where the teaching needs a picture: a map when the
   lesson is about movement or place, a document excerpt when it is about
   a voice, a chart when it is about a quantity changing. Each stimulus
   carries a caption (max about 30 words), a source, and rights status, and the narrative
   refers to it by name ("Look at the map..."). A stimulus replaces prose:
   if a section has a map or document, the surrounding text stays short
   and points at what to see in it. Never decoration.
5. **Worked items (2-3 per lesson).** SAQ-style items that teach toward
   the lesson's bank questions, each as an H3 subsection titled "Worked
   item 1", "Worked item 2", etc., under an H2 "Worked items" heading.
   Where a bank SAQ exists for the lesson's topics, the worked item IS that SAQ (named by id, with its model
   answer). Otherwise a lesson-only worked item, marked `lesson-only`
   (it is teaching, not bank stock, and never counts toward the 3,500).
   Each worked item shows the reasoning, not just the answer.
6. **Closing check (3-5 lines).** What the student should now be able to
   do, stated as abilities ("Explain why..."), not as a summary paragraph.

## 3. Length guidance (hard numbers — locked 2026-11-26)

- Narrative: max about 1,800 words per lesson.
- Sections: 4-6 short sections per lesson (H2), each 150-300 words. A
  lesson is 4-6 short sections, not one long essay.
- Paragraphs: max 90 words, one idea per paragraph, everywhere. This is a
  hard cap, not a target. Cutting means removing words, not splitting a
  wall into two walls.
- Key terms: max 12, one line each.
- Worked items: 2-3.
- Figure captions: max about 30 words.
- Stimuli replace prose: a section with a map or document keeps its
  surrounding text short and points at what to see in it.
- The verifier checks length as part of the student read: any paragraph
  over 90 words, any lesson over about 1,800 words of narrative, fails and
  goes back to the writer to cut.

## 4. Mapping rule

- Each lesson covers 1-2 topics. A topic belongs to exactly one lesson.
- Each question names its lesson in the `lesson` field
  (`apush-u<N>-l<M>`). Each lesson names the question ids it teaches
  toward in frontmatter `questions`.
- Tie-out runs at the end of each unit's tranche, after that unit's
  questions are final: the lesson writer adds the `lesson` field to the
  unit's question files and the `questions` list to the lesson files, and
  the validator confirms every question in the unit names a lesson in the
  unit and every lesson's questions exist. Until tie-out, a missing
  `lesson` field is a validator warning, not an error.

## 5. Grounding (same rule as questions, SPEC section 13)

- Before writing a lesson, read the matching chapters in all three books
  plus the matching lesson script (where one exists) and the CED topic
  description. Log the chapters read in LOG.md.
- Every date, name, event, and statistic in a lesson is verified against
  the grounding before it ships. Historical facts are this subject's
  numbers. A stale-fact sweep runs after any date change.
- Stale-format quarantine: the books predate the Fall 2026 CED. Any
  old-format strategy content (SAQ choice, LEQ choice of 3) gets remapped
  to the new format or quarantined. No old-format strategy ships.
- Primary-source IP rule: pre-1930 sources may be quoted verbatim;
  post-1929 sources are paraphrased or written original.

## 6. Stimulus method (locked)

- LLM drafts prose only: lesson narrative, stems, explanations,
  paraphrases.
- Code renders data stimuli only: charts and tables drawn programmatically
  from verified numbers. Neither LLM nor code invents a historical
  artifact.
- Maps, photos, documents, and cartoons are real public-domain items
  harvested from the Library of Congress, the National Archives, and
  similar archives, or reused from the shared image pool
  (`~/workspace/apush/assets/images/`). The writer views each image before
  writing. Source + rights status logged per stimulus in LOG.md.
- Text stimuli are short verbatim quotes only from pre-1930 public-domain
  sources; anything post-1929 is paraphrased or written original.
- Data stimuli (charts, tables) cite their numbers' source in the caption
  or the question's `source` field. Numbers must be real and checkable.

## 7. Explanations are stimulus-heavy where logical

- Each MCQ explanation reuses and annotates its question's stimulus: the
  general note refers to the stimulus by name and points at the feature
  that decides the key ("The map's title box...", "The second paragraph
  says..."). An explanation that could have been written without the
  stimulus is a defect.
- A supporting visual (map, timeline, chart) is added only where the
  visual makes the reasoning visible — e.g. a timeline when the question
  turns on sequence, a map when it turns on place. Logically placed, never
  decoration. Record supporting visuals in the question's
  `explanation_figures` array (same shape as `figures`, same shared pool).
- Most questions need no supporting visual beyond their stimulus. Do not
  add one to fill a quota.

## 8. Tone: no trap language, student friendly (locked 2026-11-26)

- Never use trap language anywhere: not the word "trap", not "trick
  question", "gotcha", "don't fall for it", "this is designed to catch
  you", or any framing that presents the question as something set to
  catch the student.
- Explanations describe the error and the fix, never the student's
  failure. "A common mistake is..." is fine; "students fall for this
  trap" is not.
- Student friendly throughout: plain words, short sentences, terms defined
  on first use, speak to the student directly where natural ("you"), never
  condescend, never scold. A distractor explanation says what the error is
  and how to fix it, in one or two lines. A lesson teaches like a good
  teacher, not like a textbook warning label.
- The verifier checks tone as part of the student read: any trap language,
  any scolding or condescending line, fails and goes back to the writer to
  rewrite. The validator enforces the mechanical part (banned-phrase
  list); the human verifier catches the rest.

## 9. Verification (same treatment as questions)

- Writer drafts; an independent verifier reads the lesson as a student
  and checks every fact against the grounding, checks every stimulus
  matches what the narrative claims about it, and solves every worked item
  from the lesson alone.
- Any failure goes back to the writer with the exact defect. A fixed
  lesson is re-verified.
- A lesson is `final` only after the verifier's read is logged in LOG.md.
- Mechanical checks (validator, length counts) are gates, never a review.

## 10. Unit 1 lessons (this tranche)

About 5 lessons covering Topics 1.1-1.7:

| Lesson | Title | Topics | Questions it teaches toward |
|---|---|---|---|
| apush-u1-l1 | The World of 1491 | 1.1, 1.2 | 1.1 + 1.2 bank items |
| apush-u1-l2 | Why Europe Sailed West | 1.3 | 1.3 bank items |
| apush-u1-l3 | The Columbian Exchange and Spanish Conquest | 1.4 | 1.4 bank items |
| apush-u1-l4 | Labor, Slavery, and Caste | 1.5 | 1.5 bank items |
| apush-u1-l5 | Encounters and Consequences | 1.6, 1.7 | 1.6 + 1.7 bank items |

Grouping rule for later units: roughly one lesson per 1-2 topics, about
5 lessons per unit, ~45 lessons total across the 9 units. A unit's lesson
count follows its topic count and weight, not a fixed 5.

## 11. Lesson file layout

```
lessons/
  apush-u1-l1.md
  apush-u1-l2.md
  ...
```

One file per lesson. No lesson content lives anywhere else in this tree.
Images are referenced from the shared pool, never copied into `lessons/`.
