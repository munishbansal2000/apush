# PassMaster APUSH Question Bank — Specification

Version 1.0 — 2026-11-26. Locked by the Step 0 coordinator. Changes require the
parent's word and a version bump here.

## 1. Target

3,000 MCQ + 500 FRQ (300 SAQ + 100 DBQ + 100 LEQ) = 3,500 questions across
all 9 APUSH units, in this format. Practice pool 2,900. Test pool 600 =
10 full-length practice exams in the May 2027 format (each 55 MCQ + 3 SAQ +
1 DBQ + 1 LEQ). No question appears in both pools. No College Board stem,
figure, or rubric text is copied anywhere; every question is original and
CB-style. Sources are references only.

## 2. Exam format (verified 2026-11-26)

Against AP Central (AP U.S. History assessment page) and the Fall 2026 CED,
corroborated by Albert and OnePrep:

- Fully digital, Bluebook. Total 3 hours 15 minutes. Exam date Friday May 7,
  2027, 8:00 AM local time.
- Section IA, Multiple Choice: 55 questions, 55 minutes, 40% of score.
  Stimulus-based, sets of usually 3-4 questions on one stimulus (primary and
  secondary texts, images, charts, maps).
- Section IB, Short Answer: 3 questions, all required, 40 minutes, 20%.
  Q1 secondary text source(s), Q2 primary text source, Q3 primary or
  secondary non-text source. Each covers 1491-2001 and a different period.
  Each SAQ has 3 parts, 1 point each.
- Section II, Document-Based Question: 60 minutes recommended, including a
  15-minute reading period, 25% of score. 7 documents, range 1754-1980,
  7-point rubric.
- Section II, Long Essay: 1 required prompt, 40 minutes, 15% of score,
  6-point rubric. No choice among prompts (choice removed for 2027).
- Rubrics are unchanged from prior years; only the choice removal and the
  SAQ source requirements are new.

## 3. Layout (modeled on ap-calculus/content/)

```
passmaster/
  SPEC.md            this file
  BLUEPRINT.md       quotas per unit, per topic, test/practice split
  LOG.md             running log: counts per topic, per step
  schemas/
    question.schema.json
    exam.schema.json
  questions/         one JSON file per question, authoring source of truth
  banks/             merged bank files, one per unit (generated, never hand-edited)
  exams/             full exam files, one per practice exam (generated from banks)
  tools/
    validate_passmaster.py   stdlib-only validator (schema + counts + pool rules)
```

Rules: never edit a bank or exam file by hand; edit the question file and
re-run the merge/validator. Only `status: "final"` questions merge. Anything
unverified stays `draft` and out of the banks.

## 4. IDs

- MCQ: `apush-mcq-NNNN` (0001-3000). Unit ranges: U1 0001-0150, U2 0151-0360,
  U3 0361-0775, U4 0776-1190, U5 1191-1605, U6 1606-2020, U7 2021-2435,
  U8 2436-2850, U9 2851-3000.
- SAQ: `apush-saq-NNNN` (0001-0300). U1 0001-0033, U2 0034-0066, U3 0067-0100,
  U4 0101-0133, U5 0134-0167, U6 0168-0200, U7 0201-0234, U8 0235-0267,
  U9 0268-0300.
- DBQ: `apush-dbq-NNNN` (0001-0100). U3 0001-0017, U4 0018-0034, U5 0035-0051,
  U6 0052-0068, U7 0069-0084, U8 0085-0100. No DBQ in Units 1, 2, 9.
- LEQ: `apush-leq-NNNN` (0001-0100). U1 0001-0011, U2 0012-0022, U3 0023-0033,
  U4 0034-0044, U5 0045-0055, U6 0056-0066, U7 0067-0077, U8 0078-0088,
  U9 0089-0100.
- Filename = id + `.json`. The id infix must match the type.

## 5. Common fields (every question)

| Field | Rule |
|---|---|
| `id` | Per section 4. |
| `type` | `mcq`, `saq`, `dbq`, `leq`. |
| `pool` | `practice` or `test`. Assigned at authoring, per BLUEPRINT.md. Never changed after verification without a log entry. |
| `unit` | Integer 1-9. |
| `topics` | Array of CED topic codes, e.g. `["1.4", "1.5"]`. `topics[0]` is the primary topic and must be in the question's unit. |
| `skills` | Array of skill codes from the 17 (1.A-6.D). 1-2 codes, the skills the question actually tests. |
| `themes` | Array of theme codes: NAT, WXT, GEO, MIG, PCE, WOR, ARC, SOC. 1-3. |
| `reasoning` | One of `comparison`, `causation`, `continuity-change`. |
| `difficulty` | Integer 1-5. 2 = easy, 3 = medium, 4 = hard; 1 and 5 reserved for true extremes. Target split for MCQ: easy 20% / medium 35% / hard 45%. |
| `stimulus_set` | String id shared by the 2-5 questions on one stimulus, e.g. `las-casas-1542`. MCQ sets must have 2-5 questions. SAQ stimuli are unique per question, so an SAQ carries `stimulus_set: null` and its stimulus in `stimulus`. LEQ carries `null` (stimulus-free). |
| `stimulus` | Object: `kind` (`text`, `image`, `map`, `chart`, `table`, `mixed`, `none`), plus `text` (verbatim stimulus, paraphrase labeled as such, or data table in markdown) and/or `figures` (see section 8). |
| `source` | Provenance, e.g. `original; stimulus paraphrased from Las Casas, Brevisima relacion (1542), public domain`. Never cite a source not consulted. Never reproduce a copyrighted item verbatim. |
| `status` | `draft`, `review`, `final`. `final` only after blind verification. |

## 6. MCQ

- Exactly 4 options, keys A-D. One key, in `answerKey`.
- `stem`: the question text. One task per stem. Never NOT/EXCEPT phrasing
  ("which of the following is NOT", "all of the following except").
- Every distractor carries a `misconception` (minimum 10 characters): the
  specific faulty reasoning the option catches, in the student's words.
  The correct option carries no `misconception` field.
- `rationales`: per-option explanations plus a `general` note. See section 9.
- Key position: within a topic, keys must distribute across A-D so no
  position holds more than 40% of the topic's MCQs and none holds fewer
  than 10% (topics with 10+ MCQs). A no-content pattern-guesser picking
  one position must score under 50% on the topic. Enforced by the
  validator (`check_key_distribution`); added 2026-11-26 after Topic 1.6
  shipped 26 of 28 keys in position A.

## 7. FRQ

### SAQ (`apush-saq-NNNN`)

- `parts`: exactly 3, lettered a, b, c. Each part: `prompt`, `modelAnswer`
  (minimum 30 characters, shows the reasoning), `points: 1`, and `scoring`
  with one decision-rule criterion (minimum 15 characters, states the
  observable student action that earns the point) plus an optional
  `notEarned` near-miss.
- `totalPoints: 3`.
- Stimulus shape follows the 2027 exam: Q1 secondary text, Q2 primary text,
  Q3 non-text (image, map, chart, graph). The stimulus type is recorded in
  `stimulus.kind` and the SAQ's slot (`saq_slot`: 1, 2, or 3) is recorded.
- Each part is scored independently; a part never depends on another part's
  answer.

### DBQ (`apush-dbq-NNNN`)

- `prompt`: the question. Range must fall inside 1754-1980.
- `documents`: exactly 7. Each: `n` (1-7), `kind` (`text`, `image`, `map`,
  `chart`, `table`), `date`, `title`, `source` (attribution), `text` (for
  text documents; public-domain or paraphrased, never copyrighted text
  reproduced), `sourcing` (one-line note: author, audience, purpose, or
  limitation the student can use).
- `rubric`: 7 points on the CB structure, in our own words: thesis (1),
  contextualization (1), evidence from documents (3), analysis and reasoning
  (2: sourcing + complexity). Each rubric point is a decision rule with an
  observable criterion and an optional `notEarned`.
- `modelOutline`: thesis + grouping of documents + outside evidence + a
  complexity move. Not a full essay; the outline a strong student would plan.
- `totalPoints: 7`.

### LEQ (`apush-leq-NNNN`)

- `prompt`: one broad prompt. Must name a reasoning process (causation,
  comparison, or continuity and change) and a span covering roughly half the
  course or a whole period. No choice of prompts.
- `rubric`: 6 points on the CB structure, in our own words: thesis (1),
  contextualization (1), evidence (2), analysis and reasoning (2).
  Each point is a decision rule with an observable criterion and an optional
  `notEarned`.
- `modelOutline`: thesis + evidence buckets + a complexity move.
- `totalPoints: 6`.

## 8. Visuals

- Stimuli must be real historical artifacts or charts drawn from real data.
  Generated images are banned as historical evidence.
- Reuse the shared pool at `~/workspace/apush/assets/images/` first (306
  harvested images, catalogued in its CATALOG.json). Record every visual in
  the question's `figures` array: `id` (`fig-apush-mcq-NNNN`, with an
  optional `-x` suffix when one question carries more than one figure), `file`
  (path relative to the shared pool), `source_url`, `license`, `caption`,
  `alt` (minimum 20 characters, what the student must read off the figure).
- Explanation visuals only where a visual teaches better than prose
  (annotated map, timeline, chart). A figure is earned, never decorative.
- The same asset serves lessons too: one shared pool, nothing made twice.
  Never copy an image into this tree; reference the pool path.
- Data tables go in the stimulus as markdown, not as figures. Numbers in
  tables and charts must be real and checkable; cite the data source in
  `source`.

## 9. Explanation standard (adapted from the approved Calc standard)

Applies to every MCQ. The Calc standard is the bar; the history adaptation
is: steps are reasoning steps about evidence, not computation steps.

- `rationales.general`: numbered reasoning steps, in the order a student
  would think them. One move per step, no step longer than two lines.
  60-120 words. Ends with a `Remember:` line, one sentence, the
  transferable move stated as a rule, not as the answer to this question.
  Names the concept once, in plain English. Never a verdict: the answer
  falls out of the last step. Each step is its own line, one idea per
  step; no step and no paragraph in the explanation exceeds 90 words.
- Key note: leads with the reasoning that produces the key, 1-3 short
  sentences. Banned openers: `Correct.`, `This is the correct answer
  (because...)`, restating the stem, `By definition...`. Any template
  opener is a defect.
- Wrong-option notes: error plus fix, one line each, 1-2 lines maximum.
  What the student did, why it is wrong, the one correction. Every wrong option carries a
  `misconception` tag (section 6).
- No explanation block longer than the question it explains: the general
  note (the main explanation block) must stay shorter than the stem +
  stimulus + options it explains. The per-option notes are separate
  blocks, judged by their own 1-2 line bound. (Amended 2026-11-26: the
  earlier wording said "the whole explanation", which no 60-120 word
  general note plus four per-option notes could ever satisfy; the
  verifier's round-1 report showed 18/24 MCQs breaching it literally
  while passing every substantive check. The enforced rule, here and in
  the validator, is the general-note comparison.)
- Voice (whole explanation): student voice, plainspoken, short sentences,
  simple words. No AI-filler language (delve, tapestry, game-changer,
  "in conclusion", "it is important to note", "let's dive in"). No trap
  language anywhere: not the word "trap", not "trick question", "gotcha",
  "don't fall for it", "this is designed to catch you", or any framing
  that presents the question as something set to catch the student.
  Explanations describe the error and the fix, never the student's
  failure. "A common mistake is..." is fine; "students fall for this
  trap" is not. Student friendly throughout: plain words, short sentences,
  terms defined on first use, speak to the student directly where natural
  ("you"), never condescend, never scold. No shorthands. No exclamation marks. No walls of text. No labelled
  Right/Wrong verdict rows; the explanation teaches, it does not grade.
- Length (hard numbers, locked 2026-11-26): paragraphs max 90 words, one
  idea per paragraph, everywhere (lessons and explanations) — a hard cap,
  not a target. MCQ explanations: key explanation 60-120 words, each
  distractor 1-2 lines. SAQ model answers: 2-4 sentences per part. LEQ /
  DBQ exemplars: thesis 1-2 sentences, body paragraphs under the same
  90-word cap. Cutting means removing words, not splitting a wall into
  two walls. Quoted source text (stimulus passages, DBQ documents) is
  exempt from the paragraph cap: it is the source's words, not ours, and
  cutting it would falsify the source.
- SAQ/DBQ/LEQ model answers and rubrics meet the same bar: model answers
  show the reasoning between steps; rubric criteria are decision rules a
  second reader could apply the same way.

## 10. Verification (non-negotiable)

- Writer and verifier are never the same agent. A writer's self-grading
  does not count.
- Every question is blind-solved by the verifier from the student-visible
  bytes only: stem + stimulus + options, with the key hidden. The verifier
  re-derives the key, checks the stimulus supports it, checks for
  length/position tells, checks every explanation step for correctness, and
  checks the metadata (topic, skill, theme, difficulty) is honest. The
  position-tell check includes the key distribution across the whole
  topic (pattern-guesser test): no position over 40%, none under 10%.
- Blind files must strip the `misconception` field from every option: it
  marks the distractors, so the key is identifiable as the only option
  without one. Added 2026-11-26 after the Topic 1.7 verifier flagged
  the leak (its solves were on content, but the blind property was not
  airtight).
- Any failure goes back to the writer with the exact defect. A fixed
  question is re-verified blind.
- The verifier checks length and tone as part of the blind solve: any
  paragraph over 90 words, any explanation over its bound, any trap
  language, any scolding or condescending line fails and goes back to the
  writer — to cut (removing words, not splitting a wall into two walls)
  or to rewrite. Length and tone apply to all question explanations from
  Topic 1.2 onward and to all lessons. Topic 1.1's 16 final items stay as
  they are unless a re-read finds a real breach; they are not reopened
  for cosmetic trimming.
- Mechanical checks (schema validation, counts, duplicate scan, pool
  disjointness) are gates, never a review. If only mechanical checks were
  done, say so explicitly; never present them as a review.
- `status: "final"` only after the verifier's blind solve is logged in
  LOG.md with the question id.
- Blind input files (`*-blind.json` under `verification/`) are working
  files, never pushed to the remote: they are regenerable from the
  question files by stripping keys and rationales. The pushed record of
  a verification is its verdicts/solves files plus the LOG.md entry.
  Locked 2026-11-26 after 445 blind inputs were removed from the remote.

## 11. Bank and exam files

- `banks/unit-NN.json`: `{"unit": N, "count": C, "questions": [...]}` sorted
  by question id. Generated from `questions/` by the merge step; never
  hand-edited. Only `final` questions merge.
- `exams/apush-exam-NN.json`: `{"id": "apush-exam-NN", "title": ...,
  "formatVersion": "2027", "sections": [...]}`. Sections mirror the May
  2027 exam: IA MCQ 55 questions / 55 min; IB SAQ 3 questions / 40 min;
  II DBQ 1 question / 60 min (incl. 15-min reading); II LEQ 1 question /
  40 min. Each section lists `questionIds` referencing `questions/*.json`
  and a `timeMinutes`. Exam files are assembled only when their units'
  test pools are complete.
- The validator (`tools/validate_passmaster.py`) checks: schema conformance,
  id ranges, per-unit and per-topic quotas, pool disjointness (no id in
  both pools), exam section counts and timing, duplicate stems, and
  figure references resolving to the shared pool.

## 13. Grounding (locked 2026-11-26)

The three prep books are the grounding layer. Use them and rewrite against
them. The books are readable as extracted XHTML at
`~/workspace/apush/books/extracted/`: `premium2027/OEBPS/text/` (Barron's
2027), `5steps2024/OEBPS/` (5 Steps 2024), `princeton/OEBPS/xhtml/`
(Princeton Review). The zips in `~/workspace/apush/books/` are the backup
originals. The old `build/reclaim-*/` XHTML dirs are gone; the extracted
copies are the books now.

- Before authoring any topic, read the matching chapters in all three
  books plus the matching lesson script and the CED topic description.
- Every question must trace its facts to a grounding passage. Record it in
  the `grounding` field: `books` (at least one entry: book id, chapter,
  section) and `primary_sources` (cited primary sources the question draws
  on, if any). The verifier checks grounding as part of the blind solve:
  a fact that cannot be traced to a book passage or a cited primary source
  fails.
- REWRITE, do not just verify, the survivors: every surviving candidate
  gets re-checked against the books and rewritten wherever its facts,
  framing, or emphasis drift from the books. A blind pass alone is not
  enough. If a survivor is already faithful, keep it and log its book
  reference; if not, rewrite it and send it through blind verification
  again as a fresh item.
- The books ground facts, coverage, and emphasis. They are never copy
  sources: stems, options, and explanations stay original; never lift a
  book's question stem, and never copy a College Board stem.

## 14. Working rules

- Work one unit at a time, topic by topic, in depth, sequentially. Never
  parallel units.
- **Per-topic sequence (locked 2026-11-26, replaces any other ordering):**
  inside one topic, in this order, before moving to the next topic:
  0. **Grounding first.** Before authoring ANY topic, read the matching
     chapters in all three books plus the matching lesson script and the
     CED topic description. No topic is written from free recall alone.
     Log which book chapters were read in LOG.md before authoring begins.
  1. **Stimuli first.** Source and verify every stimulus for the topic
     before any stem is written (MCQ stimulus sets, SAQ non-text sources,
     DBQ document sets, data charts from real data). Stimuli are the
     scarcest resource and they constrain what can be asked, so they gate
     the rest. Log each stimulus with its source and rights status in
     LOG.md.
  2. **Stems and options.** Write the full stem, all 4 options, and the
     key, with the stimulus in view. Lock the key before explanations
     begin.
  3. **Explanations.** Per-option explanations only after the key is
     locked, so a key change does not leave stale explanations behind.
  4. **Blind verification.** Last: the verifier solves from
     student-visible bytes only and re-derives the key; any failure goes
     back to the writer and its explanation gets rewritten, not patched
     over.
- Subagents never push. Pushing is the parent's job, after gates, with
  remote-SHA comparison and byte-verification.
- If a step hits a blocker (missing source, ambiguous blueprint point,
  verification failure that cannot be resolved), stop that step, log it in
  LOG.md, and report it to the parent. Do not improvise past it.
