# MANIFEST — Barron's AP U.S. History Premium, 2027 (Resnick, ©2025) reclaim

Source: `~/workspace/apush/build/reclaim-2027-ced/` (read-only, 28 XHTML files).
Staged output: `~/workspace/apush/build/reclaim-merged/staged/barrons-2027/`.

## Counts: extracted / rewritten / skipped

| Type | Extracted | Rewritten & staged | Skipped |
|------|-----------|--------------------|---------|
| MCQ (end-of-chapter, Ch 3–11) | 75 | 75 | 0 |
| MCQ (Practice Test 1, Ch 12) | 55 | 55 | 0 |
| MCQ (Practice Test 2, Ch 13) | 55 | 55 | 0 |
| SAQ sets | 2 (PT1, PT2) | 2 | 0 |
| DBQ | 3 (PT1, PT2, Ch 2 sample) | 3 | 0 |
| LEQ | 3 (PT1, PT2, Ch 2 sample) | 3 | 0 |
| **Total items** | **215** | **215** | **0** |

Staged files (19): ch03–ch11 MCQ (9), pt1-mcq/saq/dbq/leq (4), pt2-mcq/saq/dbq/leq (4),
ch02-dbq, ch02-leq, IMAGES-barrons-2027.md, MANIFEST.md (this file), FLAGS.md.

Skipped (not staged): Ch 2 SAQ strategy prose — teaches the OLD exam format
(SAQ Q3/Q4 choice, LEQ 3-choice framing); predates the Fall 2026 CED. Quarantined, see below.

## source_type breakdown (counts per source_type per item type)

Convention: an item's `source_type` is the type of its most IP-sensitive content —
for items with a stimulus, the stimulus's type; otherwise `original`.
DBQ items are counted per document (each document carries its own `source_type`);
file-level framing (prompt/background/rubric/thesis) is `original` on all DBQ, SAQ,
and LEQ files.

| Item type | Items | fact | pd-quote | paraphrase | original |
|-----------|-------|------|----------|------------|----------|
| MCQ | 185 | 1 | 33 | 17 | 134 |
| SAQ questions | 6 | 0 | 2 | 2 | 2 |
| DBQ documents | 21 | 0 | 16 | 0 | 5 |
| LEQ | 3 | 0 | 0 | 0 | 3 |
| **Total** | **215** | **1** | **51** | **19** | **144** |

- `fact` (1): pt2-53/54/55 stimulus — Wholesale Price Index of Farm Products table
  (historical data values; not copyrightable).
- `pd-quote` (51): verbatim excerpts from PRE-1930 primary sources only, each citing
  the ORIGINAL source (never the book): Franklin 1753 & 1766, Hakluyt 1582, Cuffe
  petition 1780, Crèvecoeur 1782, Sedgwick 1794, Alien Act 1798, Ames 1803,
  Pennsylvania personal-liberty law 1826, Calhoun 1828, Johnson veto 1867, Jackson
  1829, First Reconstruction Act context, Washington 1786 & Farewell 1796,
  Hamilton Federalist 15 (1787), Lincoln 1858 & 2nd Inaugural 1865, Black Codes
  1865, Louisiana labor regs 1865, SC Colored People's Convention petition 1865,
  Stevens 1867, Tilden 1868, Thoreau 1846, Edwards 1741, Lowell Offering 1842,
  Finney 1835, Crockett 1837, Fillmore 1853, Dawes Act 1887, George Rice 1898,
  Sumner 1883, "Hayseed" 1890, McDonnell 1878, Grant 1916, Espionage Act 1917,
  Ashland Daily Press 1918, War Industries Board 1918, Wilson 1918, Harding 1920,
  Anthony 1873, Thomas 1865, NYT 1905, Penn 1681, Garrison 1831, Pope/Josephe 1680–81,
  Paxton context 1763–64, Proclamation 1763, Dix 1843.
- `paraphrase` (19): brief paraphrases of post-1929 sources, citing the original:
  MLK 1963 & 1967, Foner 2010, Reagan 1981, Carter 1977, Hacker 1940, Bailyn 1967,
  Branch 2006, Carson 1986, Cohen 1990, Savio 1964, Contract with America 1994,
  Global Exchange 1999, Korematsu majority 1944, Truman address 1947, Garvey c. 1924,
  Gilmore (Black women's progressivism), Port Huron Statement 1962, MacDougall
  (16th-c. Spain), Grob & Beck 1963, Josephe interrogation 1681.
- `original` (144): all stems, distractors, explanations, SAQ/DBQ/LEQ prompts,
  rubrics, theses, scoring notes, and all 10 non-text stimulus image descriptions
  (see IMAGES-barrons-2027.md — generated-original, zero book images extracted).

SAQ schema note: the question-level field formerly named `source_type`
(secondary_text/primary_text/non_text) is now `source_kind` — the mandated
Fall-2026-CED source-type info is preserved; `source_type` now carries the
IP classification per the pipeline spec.

## Quarantine list

| Item | Reason | Disposition |
|------|--------|-------------|
| Ch 2 SAQ strategy prose (`11_Chapter02.xhtml`) | stale-format (teaches old SAQ Q3/Q4 choice; predates Fall 2026 CED) | not staged; documented in FLAGS.md |
| expression-copy quarantine | — | EMPTY: the IP post-pass (2026-10-01) repaired rather than quarantined — 7 mixed/verbatim post-1929 stimuli converted to pure paraphrase (ch10-04 Savio, ch10-07 MLK 1967, ch11-01 Contract with America, ch11-03 Global Exchange, ch09-09 Korematsu, pt1-15 Truman, pt1-36 Garvey); 4 cartoon descriptions rewritten in original words (Keppler, Beard, Graetz, "Party of Patches"); DBQ/LEQ prompts rephrased off the book's wording; one MLK verbatim span removed from an explanation (ch10-07) |

## Reference sources used

- OpenStax U.S. History (CC BY-NC-SA 4.0): NOT used — all facts were verified
  against the book's own source text during extraction; no `fact-verified:openstax`
  tags applied. Reference-only license boundary respected.
- Albert.io APUSH blog: NOT used — no CED topic remapping was needed in this pass.
  Reference-only license boundary respected.
