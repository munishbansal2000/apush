# RECLAIM REPORT — APUSH book pipeline (2026-10-01)

Three books extracted → rewritten (rewrite-never-copy) → staged under
`build/reclaim-merged/staged/<book>/`. Items are STAGED, not merged into the
bank — merge happens after the blind key-audit and clean-context reviews per
`APUSH_CONTENT_PLAN.md` §C.

## Honest reclaim rates

Rate = (items rewritten and staged) / (items extracted from the book).

| Book | Extracted | Rewritten + staged | Skipped (reason) | Quarantined | Rate |
|---|---|---|---|---|---|
| Barron's APUSH Premium 2027 | 193 (185 MCQ, 2 SAQ sets, 3 DBQ, 3 LEQ) | 193 | 0 | 0 | 100% |
| 5 Steps to a 5 APUSH 2024 | 594 (373 MCQ, 26 ch. SAQ, 3 exam SAQ sets, 3 DBQ, 9 LEQ, 180 day-items) | 587 | 16 (website-only activities, no question value) | 0 | 98.8% |
| Princeton Review 25th ed. | 283 (261 MCQ, 5 SAQ sets, 4 DBQ, 13 LEQ prompts) | 281 | 2 (duplicative of staged items) | 0 | 99.3% |
| **Total** | **1070** | **1068** | **18** | **0** | **99.8%** |

Staged totals by type: **819 MCQ · 50 SAQ questions (+2 full sets) · 10 DBQ
(70 documents, each with a sourcing note) · 23 LEQ · 164 day-items.**

"Verified" caveat: these items are rewritten and staged. The blind
key-re-derivation audit and clean-context reviews have NOT run yet — they are
the next gate before any merge.

## Inventory correction

`build/reclaim-legacy-5steps-2024/INVENTORY.md` claimed 468 end-of-chapter
MCQs. That figure double-counted: the 18 `class="que"` stems per chapter are
9 review questions + 9 answer-key repetitions. True count: 208 chapter MCQs
(8/chapter × 26). The staged numbers above use the true count.

## source_type breakdown (IP taxonomy)

| Type | fact | pd-quote | paraphrase | original |
|---|---|---|---|---|
| MCQ (819) | 1 | 139 | 101 | 578 |
| SAQ (50 + 2 sets) | 0 | 13 | 24 | 15 |
| DBQ prompts (10) | 0 | 6 | 1 | 3 |
| DBQ documents (70) | 1 | 50 | 7 | 12 |
| LEQ (23) | 0 | 0 | 0 | 23 |
| day-items (164) | 164 | 0 | 0 | 0 |

Convention: item takes the type of its most IP-sensitive content; DBQ documents
carry individual tags. `pd-quote` = verbatim pre-1930 primary source citing the
ORIGINAL source (never the book). `paraphrase` = brief post-1929 excerpts only.
Zero book images extracted anywhere (see `IMAGES.md`).

## Quarantine list

The `expression-copy` quarantine bin is EMPTY for all three books — repair-first
succeeded everywhere (7 mixed post-1929 stimuli rewritten as pure paraphrase,
4 cartoon descriptions rewritten in original words, 3 answer-key-dump
explanations rewritten, 1 copyrighted memoir excerpt paraphrased, 1 lost-image
placeholder replaced with a generated-original graph description).

Stale-format PROSE quarantined (not items — never extracted as content):
- Barron's: Ch 2 SAQ strategy prose (teaches Q3/Q4 choice).
- 5 Steps: ch01 exam overview, ch04 sample SAQ, ch05 strategies (incl. the
  stale 1607–1980 DBQ/LEQ bound — correct bound is 1754–1980), exam scoring
  rubrics (old phrasing).
- Princeton: 013/014 "About the AP Exam", Ch 2/3/4/5 strategy + pacing,
  scoring worksheets.

## Corpus sources (reference-only, NOT adapted)

- **OpenStax U.S. History** (openstax.org/books/us-history) — CC BY-NC-SA 4.0
  (verified live 2026-10-01). Fact-verification and structural reference only;
  NC clause forbids adapting its prose into our commercial bank. 11 items
  carry `fact-verified:openstax` tags (5 Steps exam1-mcq 29–32, 41–44, 53–55).
  No OpenStax prose copied or adapted anywhere.
- **Albert.io APUSH blog** — copyrighted marketing content. Structural
  reference only (CED topic-numbering cross-check). No text, examples, or
  questions copied.

## Surprises (FLAGS.md highlights)

1. Princeton's book calls the 1987 crash "Black Friday" — it was **Black
   Monday** (Oct 19, 1987). Fixed in our version.
2. Princeton attributes an Aristotle *Politics* passage to "Juan de Sepulveda,
   *Politics*, 1522" — Sepúlveda wrote no such work; re-attributed to
   Aristotle (Jowett translation, public domain).
3. Barron's: Las Casas 1640s impossibility; Farewell Address misdated 1793
   (correct: 1796); Practice Test 2's DBQ spans 1750–1800 — 4 years outside
   the 1754 DBQ floor (`boundary_flag` set, needs a human call).
4. A runtime restart mid-pipeline wiped `/tmp` and killed the 5 Steps worker;
   all staged work survived. Pipeline rule going forward: raw extraction lives
   in durable `build/` space, never `/tmp`.

## Schema normalization applied

- Princeton's `ip_source_type` → `source_type` (IP taxonomy, unified).
- CB format slot unified as `source_kind` (`secondary_text` / `primary_text` /
  `non_text`); Barron's already used it, 5 Steps' `stimulus_type` renamed.
- Every staged item now carries `source_type`, `inspired_by`, period, themes,
  skill, reasoning process, and difficulty tags.

## What's next (not done here)

Blind key re-derivation on all 819 MCQs (separate pass), length-tell
verification sweep, clean-context reviews, then the difficulty call and merge.
