# DUPES — cross-book duplicate analysis (2026-10-01)

Method: Jaccard similarity ≥ 0.45 on normalized stems (lowercased, stopwords
removed, tokens ≥ 3 chars), computed pairwise across all 819 staged MCQs from
the three books; SAQ (50), LEQ (23), DBQ (10), and day-items (164) swept the
same way. Corpus snapshot: `/tmp/apush_dedup_corpus.json` (ephemeral).

## Result: no true duplicates

- **MCQ:** 10 cross-book pairs scored ≥ 0.45. All 10 are generic APUSH stem
  templates ("most directly reflects which continuity…", "most likely to
  endorse the cartoon's perspective…", "the ideas expressed in the passage
  were most directly shaped by…") applied to DIFFERENT stimuli testing
  different content. Highest pair (0.62, barrons ch09-04 vs 5steps
  exam1-mcq-19) asks a similar cartoon-perspective question about two
  different cartoons with different keys. None is a true duplicate.
- **SAQ / LEQ / DBQ / day-items:** zero cross-book pairs ≥ 0.45.

## Decision

Both versions of every near-pair are KEPT staged. No keep-best call is
needed at this stage; the final keep-best decision (if any) happens at bank
merge time, after the difficulty call. This file is the record that the
cross-book dedup sweep ran and found nothing requiring action.

Near-pair inventory (Jaccard, book/id pairs) is in `/tmp/apush_dupes.json`
(ephemeral); regenerate with the dedup script if needed.
