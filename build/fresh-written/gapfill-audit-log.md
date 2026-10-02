# Gap-fill build log — U3 + U5 — 2026-10-02

## Target math (after Part A relabels; bank n=701, U9=176, U8=93)

Constraints with 1pp tolerance: U3 ≥ 9%, U5 ≥ 9%, U1 ≤ 7%, U2 ≤ 9%,
U4/U6/U7/U8 ≥ 9% (floors), U9 ≤ 7%.
Minimal integer solution: x3=30, x5=56 → n=787.
- U3: 71/787 = 9.0% ✓ | U5: 71/787 = 9.0% ✓
- U1: 52/787 = 6.6% ✓ | U2: 69/787 = 8.8% ✓
- U4: 9.4% ✓ | U6: 11.6% ✓ | U7: 11.4% ✓ | U8: 93/787 = 11.8% ✓
- U9: 176/787 = 22.4% — residual, see below.

## Files written

- build/fresh-written/u3-gaps.json — 30 items, {"items": [...]} structure
- build/fresh-written/u5-gaps.json — 56 items, {"items": [...]} structure

Schema: 18 fields (id, type, format, source_type, inspired_by, period, skill,
reasoning, themes, difficulty, stem, stimulus, options, key, explanation,
option_explanations, skill_code, topic_code) + fact_source, stream, reconceived.
All skill_code values from build/cb-codes.json with parent skill matching;
all topic_code values from build/cb-codes.json with unit prefix matching period.
Ids original-u3-<slug>-<nn> / original-u5-<slug>-<nn>, unique repo-wide
(verified against all bank + test ids).

Key balance: U3 file A8/B7/C8/D7 (each ≤40%); U5 file A14/B15/C13/D14.
Bank-wide after merge: A 25.5% / B 25.3% / C 25.3% / D 23.9% (gate: 22–28%).
Difficulty: U3 20 medium / 10 hard; U5 42 medium / 14 hard (no trivially-easy;
neither period 0% nor 100% hard).
Skills: all 6 CB skills used in each file; reasoning Causation/Comparison/
Continuity & Change; themes from the 8-code controlled vocabulary.

## Blind audit — 86/86 PASS (100%)

Method: for each item, re-derived the key from stem+options alone, then compared
with the recorded key; checked exactly one defensible answer; checked each
distractor is plausible and rooted in a real misconception or common confusion;
checked explanation + option_explanations support the key in plain language
(no trap/trick/distractor jargon).
Result: 86/86 keys re-derived correctly, 0 failures, 0 fixes needed.
One item caught and repaired BEFORE the audit: original-u5-manifest-02 shipped
with two near-identical correct options (A and B both stated manifest destiny's
meaning); option A rewritten to an anti-expansion distractor.

## Length-tell repair (Munish's standing law)

First draft: 85/86 items had the key as the strictly longest option.
Repair: lengthened the most plausible distractor(s) with historically accurate
detail and/or trimmed the key option; re-verified programmatically.
Final: 0/86 strictly-longest-is-key (0%).

## Validator

- build/validate.py: COVERAGE green for U1–U8; only U9 still flagged.
- ORPHAN-JSON: added u3-gaps.json + u5-gaps.json to the fw_mcq classification
  set in build/validate.py (same class as u9-gaps.json).
- No new failures in MCQ-SCHEMA / MCQ-VOCAB / MCQ-KEYS / MCQ-DIFFICULTY /
  CB-SKILL-CODE / CB-TOPIC-CODE / TEST-BANK-SEPARATION.

## U9 residual math (reported, not faked)

U9 holds 176 items of genuine Period 9 content (audited — only 3 were
misplaced, relabeled to U8). Band with tolerance: ≤7%.
176 ≤ 0.07n → n ≥ 2515. Closing by addition alone would require ~1,728 more
non-U9 items, which would break every other period's band. The glut is structural:
build/fresh-written/u9-gaps.json alone contributes 137 genuine U9 drill items
against a 4–6% exam-weight band. Options for the coordinator: move a U9 slice
out of the drill bank, or accept the overweight. NOT done here: no items
deleted, no fake relabels.
