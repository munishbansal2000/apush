# MANIFEST — Princeton Review APUSH Premium Prep 25th ed. reclaim
Date: 2026-10-01. Staging: `build/reclaim-merged/staged/princeton-25e/`.

## Extracted and rewritten (new Fall-2026 CED format)

| Type | Count | Files |
|---|---|---|
| MCQ (chapter review) | 88 | ch06–ch13-mcq.json (11 each) |
| MCQ (practice tests 1–3) | 165 | test1/2/3-mcq-a/b.json (28+27 each) |
| MCQ (Ch-5 drill) | 8 | drill-mcq.json |
| **MCQ subtotal** | **261** | carried from prior pass; length-tell rewrites applied |
| SAQ (remapped sets) | 15 (5 sets × 3) | saq-test1/2/3.json, saq-drill.json, saq-ch2.json |
| DBQ (remapped) | 4 (28 documents) | dbq-test1/2/3.json, dbq-drill.json |
| LEQ (remapped) | 11 (5 main + 6 spare) | leq-test1/2/3.json, leq-drill.json, leq-ch3.json |

## Remap decisions
- **SAQ**: each source rebuilt as a new-format set — Q1 secondary-text, Q2 primary-text, Q3 non-text.
  New stems and exemplars throughout; facts kept exact.
  - test1: Wiener 1973 (paraphrased) / Adams 1814 letter (verbatim, pre-1930) / 1634 engraving (described).
  - test2: Kurtz 1957 (paraphrased) / Castle 1932 (paraphrased) / 1803 Louisiana Purchase map (described).
  - test3: Norton 2007 (paraphrased) / Washington Farewell Address 1796 (verbatim, borrowed from the test's own MCQ stimuli — the SAQ section had no primary text) / 1776 family portrait (described).
  - drill: Foner 1988 argument (paraphrased, secondary) / Rowlandson 1675 + Knox 1790s (verbatim, pre-1930) / 15th Amendment cartoon (described).
  - ch2: Black 2008 (paraphrased) / Paine, *Common Sense* 1776 (verbatim, pre-1930) / Franklin "Join, or Die" 1754 (described, factual).
- **DBQ**: 7 documents each with per-doc sourcing notes (POV/purpose/audience + argument relevance).
  Pre-1930 texts quoted verbatim; post-1929 texts paraphrased; images and the 1940 Census table described/transcribed as data.
  - test1: US foreign policy 1914–1917 (all docs 1914–1916, verbatim).
  - test2: American imperialism 1890–1945 (docs 1848–1917 verbatim; cartoons described; 1940 Census table transcribed as figures).
  - test3: slavery and national unity 1844–1861 (texts verbatim; 3 maps/cartoons described).
  - drill: fears of communism 1940–1959 (all 7 docs paraphrased — post-1929; condensed but faithful).
- **LEQ**: each test's choose-1-of-3 trio → 3 single prompts (strongest = main, other 2 = spares).
  All prompts reworded ("Evaluate the extent" → "Assess how far"); dates and facts unchanged.
  Plus drill abolitionism (single) and the Ch-3 worked example (federal government 1830–1910).
  Each item carries a sample thesis + 3 evidence bullets.

## Skipped (with reasons)
- Ch-3 strategy illustration "Evaluate the extent to which the United States government sought to challenge communist subversion within and outside the United States from 1945 to 1960": overlaps the drill DBQ topic; illustration-only.
- Ch-3 strategy illustration "Evaluate the extent to which religious revivals differed in their effects on American society between the First Great Awakening (1700–1760) and the Second Great Awakening (1800–1860)": overlaps the test-3 Great Awakening spare; illustration-only.
- Old-format strategy prose (SAQ Q3/Q4 choice, LEQ choose-1-of-3 instructions, "Freedom of Choice" guidance): superseded by the Fall 2026 CED; not carried as content.

## Quarantined
None. IP post-pass (2026-10-01, repair-first) found 7 repairable defects — all were
rewritten in original words and kept staged; 0 items were quarantined as unsalvageable.
Repairs applied (details in the IP post-pass section below): misattributed Sepulveda/Aristotle
stimulus + Glendon excerpt (test1 q01–q04), three answer-key-dump contaminations
(test1/test2/test3 q01 explanations), over-long Reagan 1975 excerpt (test1 q49–q50),
verbatim Lansing 1935 excerpt (dbq-test1 doc 3), lost Great Depression graph
(test3 q37–q41 stimulus rebuilt as a generated-original description).

## IP handling
- Pre-1930 primary sources: quoted verbatim (public domain), attributed to the original source — never to the book.
- Post-1929 sources (Wiener 1973, Kurtz 1957, Castle 1932, Norton 2007, Black 2008, Foner 1988, drill DBQ docs): paraphrased with attribution.
- Images/maps/cartoons: described in words; no image files copied. Every non-text
  stimulus has a written decision in `IMAGES-princeton-25e.md`.
- All SAQ/DBQ/LEQ items carry `format: "remapped"` and `inspired_by` provenance.

### IP post-pass (2026-10-01, tagging + quarantine review)
- New field `ip_source_type` on every item (and on each DBQ document): `fact` / `pd-quote` /
  `paraphrase` / `original`. The existing SAQ `source_type` field is the College Board
  format type (secondary-text / primary-text / non-text), so the IP taxonomy uses the
  separate `ip_source_type` name to avoid clobbering it. Item-level tag = dominant
  source type; for DBQ items the document-level tags are also recorded.
- **Source-type counts by item type:**
  - MCQ (261 items): original 261.
  - SAQ (15 items): paraphrase 6, pd-quote 4, original 5.
  - DBQ (4 items): pd-quote 3, paraphrase 1. DBQ documents (28): pd-quote 14,
    paraphrase 7, original 6, fact 1 (1940 Census table figures).
  - LEQ (11 items): original 11.
- Quarantined: **0 items**. Seven defects were found and repaired (see list above);
  none met the bar for "expression beyond a brief excerpt" removal (`expression-copy`
  reason code unused in this book).
- Content-defect flags (not IP, left for the fact-gate; not fixed here):
  1. ch13-mcq.json Q4 explanation calls the 1987 crash "Black Friday" (should be "Black Monday").
  2. test3-mcq-b q37 option B is the truncated literal `"Franklin"` (extraction defect).
  3. test2 q10–13: Patrick Henry quote embedded under the "Join, or Die" caption (ordering oddity, usable as-is).
- Full regex scan for image payloads (data URIs, base64, image file extensions)
  across all 30 staged JSON files: **zero book images present** — text-only pipeline confirmed.
- Grep sweep for OpenStax U.S. History and Albert.io APUSH markers (chapter-title
  phrases, "Learning Objectives", domain names, "openstax"): **zero hits** — no
  evidence of either source in these staged files. (Policy kept regardless: OpenStax
  is CC BY-NC-SA 4.0 — fact-verification only, never `pd-quote` from it; Albert.io
  is copyrighted marketing — structural reference only.)
