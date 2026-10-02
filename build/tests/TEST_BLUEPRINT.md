# APUSH Practice Tests — Build Blueprint

Fall 2026 CED format. 10 full exams. All MCQ keys FINAL (blind key-audit complete 2026-10-01: 801 verified, 17 repaired stem/options/stimuli with keys kept, 1 re-keyed pr25e-test3-q12 B->A, 0 quarantined; report at build/reclaim-merged/KEY_AUDIT_REPORT.md).

## Test structure (each test)

| Section | Part | Content | Time | Weight |
|---|---|---|---|---|
| I | A | 55 MCQ | 55 min | 40% |
| I | B | 3 SAQs (Q1 secondary-text, Q2 primary-text, Q3 non-text) | 40 min | 20% |
| II | A | DBQ, 7 documents (incl. 15-min reading period) | 60 min | 25% |
| II | B | LEQ, single broad prompt | 40 min | 15% |
| | | **Total** | **3h15m** | |

Bluebook-digital. Directions text in each test file mirrors CED timing.

## Per-test MCQ period quotas (55)

CED weights → quotas: U1 4–6% → **3**, U2 6–8% → **4**, U3 10–17% → **8**, U4 10–17% → **7**,
U5 10–17% → **8**, U6 10–17% → **7**, U7 10–17% → **8**, U8 10–17% → **7**, U9 4–6% → **3**.
Sum: 3+4+8+7+8+7+8+7+3 = 55. ✓

Pool check (need × 10 tests): U1 27 < 30 — SHORT 3 → write 3 new original U1 visual MCQs.
U2 76≥40 ✓, U3 119≥80 ✓, U4 114≥70 ✓, U5 83≥80 ✓ (tight), U6 87≥70 ✓, U7 143≥80 ✓,
U8 114≥70 ✓, U9 56≥30 ✓.

## Visual density target

~22 visual-stimulus MCQs per test (~40%): cartoon, map, chart/graph/table, painting, photograph.
Per-period visual targets (×10 tests): U1:10, U2:20, U3:30, U4:30, U5:30, U6:30, U7:30, U8:30, U9:10 = 220.
Every visual stimulus: `image_url` (direct file, HTTP-200-verified), `source_page`, `pd_rationale`
(pre-1930 publication, or US federal work, or LOC/Wikimedia PD tag). No book images, no placeholders.
Charts/maps that can't be sourced → generated-original SVG via committed fixed-seed script.
Adapted items tagged `visual_adapted: true` (stem/stimulus changed; visually-adapted items re-verified that the added image does not change the keyed answer).

## Skill coverage (per test, normalized tags)

6 historical thinking skills — Developments & Processes, Sourcing & Situation,
Claims & Evidence in Sources, Contextualization, Making Connections, Argumentation —
+ 3 reasoning processes (Comparison, Causation, Continuity & Change).
Target per test: each reasoning process ≥ 8 items; Sourcing & Situation ≥ 6
(visual items skew sourcing); no skill at zero. Normalize staged tag variants
('&' vs 'and', '?' → infer from stem, 'None' → assign).

## SAQ bank (30 sets)

Each set = Q1 (secondary-text stimulus) + Q2 (primary-text stimulus, pre-1930 PD, cited)
+ Q3 (non-text stimulus, real image URL). 3 different periods per set, all within 1491–2001.
Each question: parts A/B/C, exemplar response, skill/reasoning tags.
Sources: 7 ready new-format sets + remap of 37 chapter SAQs by stimulus type + NEW original sets to 30.
Q3 stimuli need verified image URLs (sourced like MCQ visuals).

## DBQ / LEQ assignment

10 staged DBQs → one per test. DBQ topic within 1754–1980 (verified).
10 of 23 staged LEQs → one per test, topic-spread across periods; avoid LEQ period overlapping
the test's DBQ period where possible. Single broad prompt style (intro + suggested areas).

## Assembly rules

1. No item reused across tests (MCQ, SAQ, DBQ, LEQ) — dedup by item id.
2. Within a test: SAQ Q1/Q2/Q3 in three different periods; DBQ and LEQ in different periods if possible.
3. MCQ exam order: roughly chronological by period (U1→U9), visual items spread (no 3-in-a-row run).
4. Every test MCQ tagged `key_status: "final"`.
5. Answer keys in build/tests/ANSWER_KEYS.md, separate from test content.
6. Validation per test: counts 55/3/1/1, quotas in band, no dup ids, DBQ bounds, SAQ source types,
   visual count ≈ 22, image URLs all HTTP 200.
7. No commits until parent review. books/ zips read-only. Do not touch ~/workspace/ap_stats.
