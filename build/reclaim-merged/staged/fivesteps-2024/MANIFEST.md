# MANIFEST — 5 Steps to a 5: AP U.S. History 2024 (reclaim)

Book: 5 Steps to a 5: AP U.S. History 2024 Elite Student Edition (Daniel P. Murphy,
McGraw Hill ©2023). Source: `build/reclaim-legacy-5steps-2024/OEBPS/` (read-only,
235 XHTML). Status: ALL reclaim stages complete and staged (2026-10-01).

## Counts

| Stage | MCQ | SAQ | DBQ | LEQ | day-items |
|---|---|---|---|---|---|
| Extracted (raw, `_raw/`) | 373 (208 chapter + 55 ch03 + 55 exam1 + 55 exam2) | 34 (26 chapter + 8 exam, old-format) | 21 docs (3 prompts) | 9 prompts (3 choose-1-of-3 sets) | 180 (16 website-only) |
| Rewritten + staged | 373 | 35 (26 chapter + 9 exam, new format) | 3 (7 docs each) | 9 (single broad prompts) | 164 |
| Skipped (duplicative/no-value) | 0 MCQ | 0 | 0 | 0 | 16 website-only activities |

- Chapter MCQ: 26 files × 8 items (ch06–ch31) = 208, `format:"new"`.
- Exam MCQ: ch03-mcq.json (55), exam1-mcq.json (55), exam2-mcq.json (55), all
  `format:"new"`.
- Chapter SAQ: 26 files × 1 item, `format:"remapped"`, each with stimulus +
  stimulus_type.
- Exam SAQ sets: ch03/exam1/exam2-saq.json, 3 items each, new format
  (Q1 secondary-text / Q2 primary-text / Q3 non-text), `format:"remapped"`.
- DBQs: ch03/exam1/exam2-dbq.json, prompt + 7 documents each (`n, kind, date,
  text, sourcing_note` per doc), `format:"remapped"`.
- LEQs: ch03/exam1/exam2-leq.json, 3 single broad prompts each (role:
  main/spare), `format:"remapped"`.
- day-items.json: 164 brief question+answer items, `format:"rewritten"`,
  `source_type:"fact"`. 16 website-only activities skipped (no standalone
  question).

## INVENTORY discrepancy

INVENTORY.md claims 468 end-of-chapter MCQs (18/chapter × 26). Actual extraction:
208 (8 MCQ + 1 SAQ per chapter, ch06–ch31). The 468 figure is wrong; 208 staged.

## source_type breakdown (IP taxonomy, applied 2026-10-01)

| item type | original | paraphrase | pd-quote | fact | mixed |
|---|---|---|---|---|---|
| MCQ (373) | 183 | 84 | 106 | 0 | 0 |
| SAQ (35) | 8 | 18 | 9 | 0 | 0 |
| DBQ (3 items / 21 docs) | 1 doc | 0 docs | 20 docs | 0 | 3 items |
| LEQ (9) | 9 | 0 | 0 | 0 | 0 |
| day-items (164) | 0 | 0 | 0 | 164 | 0 |

New this pass (2026-10-01): exam2-mcq 55 (original 12 / paraphrase 15 /
pd-quote 28); exam SAQ sets 9 (original 3 / paraphrase 1 / pd-quote 5);
DBQs 21 docs (pd-quote 20 / original 1 — exam1 Doc D is a generated-original
cartoon description); LEQs 9 (original 9); day-items 164 (fact 164).

- `original`: our own stems, distractors, explanations, and generated-original
  descriptions of non-text stimuli (zero book images extracted).
- `paraphrase`: brief paraphrases of post-1929 text (e.g., JFK/Carter/Bush speeches,
  historian secondary-source excerpts, Friedan/Schlafly) — never full passages.
- `pd-quote`: abridged verbatim quotes from pre-1930 primary sources, each citing
  the ORIGINAL source (not the book); ellipses used throughout.
- `fact`: reserved for day-items (brief factual Q&A rewrites).
- `mixed`: DBQ items whose documents carry mixed source_types (recorded per doc).

SAQ `stimulus_type` (new-format slot info, preserved alongside source_type):
chapter SAQs — secondary 15, primary 6, non-text 5; exam SAQ sets — secondary 3,
primary 3, non-text 3.

`fact-verified:openstax`: 11 items (exam1-mcq 29–32 Patrick Henry, 41–44 Huey Long,
53–55 G.H.W. Bush) — facts verified against OpenStax U.S. History text
(CC BY-NC-SA 4.0, reference-only; no prose adapted). OpenStax prose was NOT copied
or adapted anywhere, per the NC clause. No new fact-verified items this pass.

Albert.io APUSH blog used as structural reference only (CED topic numbering
cross-check, e.g., Bush/Gulf War → Unit 9 topics); no text, examples, or
questions copied. No Albert.io use this pass.

## Quarantine list

EMPTY. Post-pass scan (2026-10-01): all stimuli are either original prose,
brief paraphrases, or abridged pre-1930 quotes with original-source citations;
no book expression reproduced beyond brief excerpts; no book charts/images used.
Nothing quarantined with reason "expression-copy".

## Hygiene checks (exam MCQ)

- exam1-mcq.json: key balance A14 / B14 / C14 / D13; 0 length-tells
  (43 options rewritten 2026-10-01 to fix a systematic longest-is-key tell).
- exam2-mcq.json: key balance A14 / B14 / C14 / D13; 0 items with key strictly
  longest by >10 chars (8 options rewritten during authoring).
- All staged JSON files validate; `muse.write` truncation guard checked
  (no `[truncated` markers; brace counts balance).
