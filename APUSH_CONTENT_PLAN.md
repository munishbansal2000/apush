# APUSH Content Plan (May 2027 exam)

Authority: AP® U.S. History Course and Exam Description, Effective Fall 2026 (© 2026 College Board) — read live 2026-10-01. Exam: Friday, May 7, 2027, Session 1, fully digital in Bluebook.

## A. Exam map

| Section | Content | Time | Weight |
|---|---|---|---|
| I-A | 55 MCQ (stimulus sets of 3–4: texts, images, charts, maps) | 55 min | 40% |
| I-B | 3 SAQs — ALL required (no choice) | 40 min | 20% |
| II-Q1 | DBQ — 7 documents, topic 1754–1980 | 60 min (incl. 15-min reading) | 25% |
| II-Q2 | LEQ — single broad prompt (no choice of 3) | 40 min | 15% |

**SAQ source types (new, Fall 2026 CED):** Q1 = secondary text source(s); Q2 = primary text source; Q3 = primary or secondary NON-TEXT source (chart/map/image). The three SAQs cover 1491–2001, each in a different period.

**Periods & weights:** U1 1491–1607: 4–6%; U2 1607–1754: 6–8%; U3 1754–1800, U4 1800–1848, U5 1844–1877, U6 1865–1898, U7 1890–1945, U8 1945–1980: 10–17% each; U9 1980–Present: 4–6%.

**8 themes:** NAT (American & National Identity), WXT (Work, Exchange, Technology), GEO (Geography & Environment), MIG (Migration & Settlement), PCE (Politics & Power), WOR (America in the World), ARC (American & Regional Culture), SOC (Social Structures).

**6 historical thinking skills:** Developments & Processes; Sourcing & Situation; Claims & Evidence in Sources; Contextualization; Making Connections; Argumentation. **3 reasoning processes:** Comparison, Causation, Continuity & Change.

**Rubrics (unchanged):** DBQ 7 pts (thesis 1, contextualization 1, docs evidence 2, beyond-docs evidence 1, analysis 2); LEQ 6 pts (thesis 1, contextualization 1, evidence 2, analysis 2); SAQ 3 pts each (A/B/C independent).

**Where students bleed points (2025 Chief Reader Report, 518,247 students, mean 3.30):** sourcing 0.39/1 (identify POV but don't explain relevance), complex understanding 0.15/1, evidence-beyond-docs 0.47/1, contextualization via passing phrases, evidence described but not tied to argument, SAQ describe-vs-explain confusion.

## B. Content architecture & targets

- **Lessons:** ~45, grouped by the 9 periods, each tagged to themes + skills. Lesson = narrative content + key terms + worked SAQ-style items.
- **MCQ bank:** ~900 items, quotas per period from the weight table above, each tagged period/theme/skill/reasoning-process/difficulty.
- **SAQ bank:** ~60 sets of 3 (Q1 secondary-text / Q2 primary-text / Q3 non-text), each set spanning 3 different periods within 1491–2001.
- **DBQ bank:** 8–10 full DBQs — 7 documents each, topic within 1754–1980, analytic rubric per the 7-point scale, exemplar thesis + sourcing notes per document.
- **LEQ bank:** 20 prompts — single broad prompt style (intro statement + suggested areas), ~half-course chronological scope, 6-point rubric each.
- **Practice tests:** 10 full exams — 55 MCQ + 3 SAQs (with the mandated source types) + DBQ + LEQ.

## C. Build pipeline (playbook adaptations for history)

1. **Fact verification replaces code-computed numbers.** Every date, name, event, statistic in every item is verified against sources before it ships — historical facts are this subject's numbers. Stale-fact sweep after any date change.
2. **Primary-source IP rule.** Pre-1930 primary sources are public domain and may be quoted verbatim (ideal for DBQ documents and SAQ stimuli). Post-1929 sources: paraphrase or write originals; every item carries verified `inspired_by`.
3. **Stale-format quarantine.** No content was removed from the framework, but the *format* changed: books predating the Fall 2026 CED teach the old SAQ choice and LEQ 3-choice strategy. Any book-derived strategy content gets remapped to the new format or quarantined.
4. **Difficulty rubric grounded in Chief Reader data.** Hard MCQ = sourcing judgments, contextualization evaluation, second-order causation/comparison, evidence-tied-to-argument; medium = single-step recall/application. (Mirrors the stats recalibration: target where CB students actually lose points.)
5. **Essay wave protocol (DBQ/LEQ/SAQ).** Essays can't be blind-keyed like MCQ — instead: analytic rubric per prompt + exemplar responses at multiple score bands. Blind audit = independent agent scores the exemplars against the rubric from the prompt alone; disagreements trigger rubric repair.
6. **Length-tell rewrite on all MCQ** (0% strictly-longest-is-key), blind key re-derivation on rewrites — same as stats.
7. **Validator** (`tools/validate_items.py` adapted): schema (period/theme/skill/reasoning-process enums), per-period quotas, stimulus-set sizes, SAQ source-type conformance, DBQ doc counts + date-range check, dedup (Jaccard ≥ 0.55 on stems), manifest 1:1, digital-format hygiene.
8. **Clean-context reviewers + fix wave + full verification battery** per the playbook; `draft` → `gated` only when everything passes.

## When the books arrive

`books/` → extract → remap to the 9-period framework → rewrite-never-copy → verify facts → merge. Report reclaim rate honestly (stats: 65% → 77%); duplicative items stay staged, never merged until the difficulty call.
