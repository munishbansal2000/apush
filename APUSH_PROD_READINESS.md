# APUSH Prod Readiness — Guidelines

No mechanical checkmarks. Reviewers READ the content and judge it against these
bars. Definition of done: **0 failures under the current gate set**. If a gate
changes, re-run shipped content under the new gate. No shipping with known
blockers.

## The 12 gates

1. **Key correctness.** Every MCQ key re-derivable blind (stem + options only,
   key hidden). 100% of items. Any edit to a stem/options re-triggers this gate
   for that item.
2. **Explanation accuracy.** Every option explanation historically correct —
   including the wrong-option explanations. A confident wrong explanation is
   worse than none.
3. **No answer-pattern tells.** 0% strictly-longest-is-key. Key letters
   balanced across the bank (no letter >35%).
4. **Question originality.** No bank item retains a book's question design
   (same angle + distractor set, reworded). Angles, distractor selection,
   wording, explanations are ours; only unprotectable facts and public-domain
   stimuli are shared.
5. **Essay score integrity.** Every annotated exemplar earns exactly the score
   its annotations claim, re-derivable by a blind re-scorer from the rubric.
6. **Rubric fidelity.** Per-prompt maps match the official College Board
   rubrics: DBQ 7 points (thesis, contextualization, evidence ×3, analysis ×2
   incl. sourcing), LEQ 6 points, SAQ 3 points each. No invented rubric rows.
7. **Historical accuracy.** Every date, name, quote attribution, and causal
   claim verified. Zero open [VERIFY] flags. When unsure, flag — never smooth
   over.
8. **Visual integrity.** Every image retrievable (URL returns 200 or committed
   generated SVG). Public-domain rationale documented per image. No edge-case
   PD bases (PD-US-no-notice etc.) without airtight documentation — replace
   with pre-1930 or federal sources when in doubt.
9. **CED coverage.** Bank covers all 6 historical thinking skills × 9 periods ×
   8 themes with no holes. Gaps get flagged, not hidden.
10. **Format compliance.** Fall 2026 CED: 3 required SAQs with mandated source
    types (Q1 secondary text, Q2 primary text, Q3 non-text), single broad LEQ
    prompt (no 3-choice), DBQ documents within 1754–1980, 55/55-min MCQ,
    Bluebook-digital assumptions (no paper-test anachronisms).
11. **Language.** Plain teacher voice. Never "trap," "trick," "distractor,"
    "gotcha," or sales-style test-prep jargon in student-facing text.
12. **IP hygiene.** Every item carries source_type + inspired_by. Zero book
    images. Post-1929 stimuli excerpts flagged for formal legal review before
    monetization.

## Method

- Reviewers are **blind and clean-context**: they have not built the content
  they review. They read the artifact itself — prose, explanations, essays —
  not summaries.
- Blind key/explanation/score audits are **separate passes**, never folded
  into repair work.
- Findings classes: **blocker** (must fix before ship), **major** (fix before
  ship), **minor** (fix, batch ok). Ship state requires 0 blockers, 0 majors.
- Every finding gets: location, gate violated, evidence, fix applied,
  re-verification.

## Ship checklist (mechanical, after the reading gates pass)

- [ ] All review findings closed with re-verification noted
- [ ] Coverage matrix generated from the bank (skills × periods × themes)
- [ ] Length-tell scan: 0% strictly-longest-is-key (re-run on final bank)
- [ ] Key distribution re-checked on final bank
- [ ] Image URL spot-check (10%) returns 200
- [ ] Committed and pushed; repo named in the ship report
