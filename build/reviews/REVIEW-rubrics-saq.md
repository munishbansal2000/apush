# REVIEW — Rubric Maps + SAQ Bank (blind clean-context audit)

**Reviewer:** subagent (did not build the content)
**Date:** 2026-10-01
**Scope:** 20 rubric maps (`build/content/rubric-maps/`: 10 DBQ + 10 LEQ), 30 SAQ sets
(`build/tests/saq-bank/set-01.json`…`set-30.json`; 90 questions, 270 parts).
**Gates:** G6 (rubric fidelity), G5 (SAQ exemplar earns its 3 points); G7 spot duty for wrong dates/names/claims.
**Method:** read every map and every set fully; re-derived each exemplar against the official CB rubrics
(DBQ 7 = thesis, contextualization, evidence 3-docs/6-docs, beyond-docs, sourcing 2-docs, complexity;
LEQ 6 = thesis, contextualization, evidence ×2, analysis ×2; SAQ 3 = one point per part).

## Findings

| # | Location | Gate | Evidence | Sev | Fix applied | Re-verification |
|---|----------|------|----------|-----|-------------|-----------------|
| 1 | All 10 DBQ rubric maps (`dbq-*.md`), "Rubric reminders" line | G6 | Stated "evidence from at least 3 docs (argument on at least 4)" — CB requires **6** docs supporting an argument for the 2nd evidence point (verified against CB scoring guidelines). Would mistrain scoring. | Blocker | Changed to "(argument on at least 6)" in all 10 files; grep confirms zero residual "at least 4" | The reminder now matches the official rubric (3 docs to address topic = 1 pt; 6 docs to support argument = 2 pts) |
| 2 | `set-13.json` / `saq-set-13-q1` part C | G5 | Part C asks for a leader **acting on** constitutional principle; exemplar described Jefferson *setting aside* his principles for the Louisiana Purchase — the literal opposite. Would earn 0. | Blocker | Replaced exemplar with Washington's 1796 refusal of the House's Jay Treaty papers demand, defending the Constitution's treaty process | New exemplar names a specific leader, a specific in-period act, and the constitutional principle — earns the point |
| 3 | `set-30.json` / `saq-set-30-q3` part C | G5 | Phantom cross-set reference: "evaluating Rhodes's argument" — Rhodes appears only in set-22's stimulus; a set-30 student has no way to know what Rhodes's argument is. Part unanswerable as written. | Blocker | Rewrote part C self-contained: "ONE limitation of the graph for understanding the causes of the Civil War"; exemplar rewritten accordingly | Part now answerable from its own stimulus; exemplar earns the point |
| 4 | `set-08.json` / `saq-set-08-q1` part C | G5/G7 | Exemplar cited the Missouri Compromise (1820) for a question scoped to 1835–1860 (out of period; the Compromise of 1850 in the same sentence already earns the point). | Minor | Removed the 1820 clause; exemplar now Compromise of 1850 only | In-period, earns the point |
| 5 | `set-11.json` / `saq-set-11-q2` part B | G7 | Exemplar cited the Panama Canal "completed 1914" for a 1890–1913 question (Roosevelt's Corollary in the same sentence already earns the point). | Minor | Rephrased to "Panama Canal project (begun 1904)" | In-period, earns the point |
| 6 | `set-10.json` / `saq-set-10-q1` part B | G7 | Exemplar called the Stamp Act *and* Townshend duties "Parliament's first direct taxes" — the Townshend duties were indirect; only the Stamp Act was the first direct tax. | Minor | Tightened wording to make the distinction | Historically accurate now |
| 7 | `set-24.json` / `saq-set-24-q2` part C | G7 | Exemplar attributed the "clear and present danger" test to *Debs v. United States* — the test was announced in *Schenck v. United States* and applied in *Debs*. | Minor | Attribution corrected | Accurate now |
| 8 | `set-25.json` / `saq-set-25-q3` part C | G5 | Exemplar's link from the portrait's elite POV to "the Revolution's republican ideology of virtuous leadership" was hand-wavy (thin but arguably earning). | Minor | Rewrote with a concrete mechanism (gentry expectation of deference → command of Congresses/committees/armies) | Earns the point on a solid connection |

## What passed cleanly

- **DBQ maps (10/10):** beyond the finding #1 fix, every sourcing angle is a genuine POV/purpose/situation/audience read that works for its doc; beyond-docs evidence items are historically accurate (spot-checked: Civil Rights Act of 1866 first major override; JFK's Jan 1949 House speech; Sussex torpedoed Mar 24 → Wilson address Apr 19, 1916 — the map self-corrects this); complexity pathways are real, not invented.
- **LEQ maps (10/10):** all rubric reminders match the official 6-point rubric; thesis framings take defensible positions with lines of reasoning; contextualization scopes are in-period; dates spot-checked (Bank War, Seneca Falls 1848, Maine 1851, Brook Farm 1841–47, National Municipal League 1894, College of New Jersey 1746) all correct.
- **SAQ exemplars (268/270):** every other part's exemplar directly answers what was asked with specific, accurate content.

## Counts

- Rubric maps read: 20 (10 DBQ, 10 LEQ)
- SAQ sets read: 30 (90 questions / 270 parts)
- Findings: 3 blockers (all repaired + re-verified), 5 minors (all repaired)
- Files edited: 10 rubric maps + 7 SAQ files. All edits left **uncommitted** per instructions.
- Note: `build/reviews/` was already untracked in git; the pre-existing modifications to MCQ/staged files were not mine and were not touched.
