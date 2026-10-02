# Blind Key Audit — Consolidated Report (2026-10-01)

Scope: all 819 staged reclaimed MCQs under `build/reclaim-merged/staged/` —
barrons-2027 (185), princeton-25e (261), fivesteps-2024 chapters (263),
fivesteps-2024 practice exams (110). `_raw/` provenance folders excluded.

Method: four independent auditors, each blind — stem + stimulus + options read
first, answer derived from historical knowledge, then compared against the
recorded key. Per-book trails: AUDIT-barrons-2027.md, AUDIT-princeton-25e.md,
AUDIT-fivesteps-2024-ch.md, AUDIT-fivesteps-2024-exam.md.

## Totals

| Verdict | Count |
|---|---|
| VERIFIED (blind derivation matched recorded key) | 801 |
| REPAIRED (rewrite damage fixed; recorded key preserved) | 17 |
| RE-KEYED (book's key wrong; key changed with justification) | 1 |
| QUARANTINED | 0 |
| NEEDS-REVIEW | 0 |
| **Total** | **819** |

Per book: barrons-2027 185/0/0/0 · fivesteps-2024-exam 110/0/0/0 ·
princeton-25e 247/13/1/0 · fivesteps-2024-ch 259/4/0/0.

All 819 items now have finalized keys. The test-build team's provisional keys
are confirmed: 801 stand as written, 17 repaired items keep their recorded
keys, 1 item re-keyed (below).

## Re-keyed (1)

- **princeton-25e / test3-mcq-a #12** (`pr25e-test3-q12`): recorded key B claimed
  Washington "reluctantly accepted the endorsement of the Federalist Party."
  Historically inaccurate — Washington stayed officially nonpartisan and no
  such party endorsement occurred. Re-keyed B → **A** (post-Constitution
  states'-rights and economic debates produced Federalists vs.
  Democratic-Republicans). Explanation rewritten; `key_audit_note` added.

## Repaired (17) — all rewrite/extraction damage, recorded keys preserved

Princeton-25e (13):
- ch09 #5: option B was the fragment "Hayes" → restored book-original
  ("special bipartisan commission… end of military reconstruction").
- ch10 #4: options A ("Garfield") and C ("assassination of James") were two
  halves of one answer → restored book-originals (Lincoln / Garfield
  assassinations); exactly one correct option now.
- test1-a #15, #17, #23, #24, #25: re-attached stimuli dropped in extraction —
  Paine *Common Sense* "necessary evil" (public domain); O'Sullivan "Great
  Nation of Futurity" (public domain); Douglass Dred Scott speech (public
  domain).
- test1-b #5 (q33): re-attached Harpweek "1864: Lincoln v. McClellan" excerpt
  paraphrased (facts only — source copyrighted, not quoted).
- test1-b #8 (q36), #10 (q38): re-attached Progressive Party Platform (1912)
  passage verbatim (public domain).
- test1-b #12 (q40), #15 (q43): attached original from-scratch description of
  the 1933 "Strike-Breaking" cartoon (image viewed; no reproduction).
- test3-a #18: fragment stem completed ("…did which of the following?").
- test3-b #9 (q37): option B fragment "Franklin" → completed as clearly-false
  distractor.

fivesteps-2024 chapters (4):
- ch18 #3 (Coxey's Army): rewrite replaced keyed option C with a second
  defensible option → restored book's C and rationale; key C kept.
- ch22 #1 (rural 1920s): rewrite flipped distractor A into a second correct
  answer ("curb immigration") → restored book's "Increase immigration from
  Eastern Europe"; key B kept.
- ch23 #6 (Townsend Plan): option A was factually true of the plan, creating
  two defensible options → changed A to the false "Require workers over 60 to
  remain employed"; key D kept.
- ch28 #2 (supply-side): rewrite dropped "all but which"/EXCEPT from the stem
  while keeping key D, inverting the question → restored EXCEPT stem; key D
  kept.

## Quarantined

None. The quarantine directory was not needed.

## Notes

- Auditor self-checks: the Barron's auditor initially flagged 75 mismatches —
  all traced to its own transcription errors, re-verified to 185/185. One
  genuine disagreement (pt2-20, Carnegie cartoon) resolved in favor of the
  recorded key (Gospel of Wealth over "survival of the fittest") — auditor
  error, documented in AUDIT-barrons-2027.md.
- 18 blind derivations initially disagreed with recorded keys across Princeton
  and 5 Steps chapters; each was adjudicated against the full item text and
  the recorded key held in all 18 cases. Details in the per-book audit files.
- A systematic antonym-flip scan over all 263 5-Steps chapter items found no
  other two-correct-option issues; a full book diff confirmed every staged
  keyed-option matches the book's keyed content (no silent re-keys).
- Constraints honored: nothing under `books/` or `~/workspace/ap_stats`
  touched; nothing committed (left for review).
