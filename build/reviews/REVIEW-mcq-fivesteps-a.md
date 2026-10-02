# Blind clean-context review — 5 Steps MCQ option explanations, chapters 6–20
**Reviewer:** blind reviewer (did not build the content) · 2026-10-01
**Scope:** `build/reclaim-merged/staged/fivesteps-2024/` — chapter MCQ files
`ch06–ch20-mcq.json` (first 15 chapter files of the 5-steps pool).
**Scope note:** the task guessed files `ch01–ch05`; those do not exist in this
pool — chapter content runs `ch06–ch31`, and `ch03-mcq.json` is the 55-item
diagnostic exam, not a chapter file. Reviewed **120 items** (15 files × 8),
not ~135. The exam files (`ch03`, `exam1`, `exam2`) were left untouched.

**Method:** every item's stem, options, key, `explanation`, and all four
`option_explanations` read and checked for historical accuracy — dates, names,
causal claims, characterizations. Stems, options, and keys were NOT changed
(explanations only, per instructions).

## Totals
- Items read: **120** (all ch06–ch20 chapter MCQs)
- Blockers: **0**
- Major: **3** (all repaired in place)
- Minor: **1** (repaired in place)
- Stem-level flag, not repaired (stems off-limits): **1**

All fixes applied to the staged JSON files, **left uncommitted** (no commits,
per instructions). Only `explanation` / `option_explanations` text changed;
stems, options, and keys are byte-identical to before. Pre-existing
uncommitted modification to `ch24-mcq.json` was observed and is not mine — out
of scope, not touched.

## Findings

| # | Item ID | Gate | Evidence (wrong text, quoted) | Sev. | Fix applied (corrected text, quoted) | Re-verification |
|---|---|---|---|---|---|---|
| 1 | `5s24-ch06-mcq-02` | 2 | EXPLANATION: "…colonists began importing enslaved Africans, **starting in the 1540s**." OPT-C: "…**beginning in the 1540s** in the Spanish colonies." Enslaved Africans were present in Spanish Hispaniola from 1501–1503; direct trade from Africa followed the 1518 asiento, and sugar mills ran on African labor by the 1520s. The 1540s date is ~40 years late. | major | EXPLANATION now: "…colonists began importing enslaved Africans, **starting in the early 1500s**." OPT-C now: "…beginning in the **early 1500s** in the Spanish colonies." | Re-read fixed item; date consistent across EXPLANATION and OPT-C; key (D) and distractor logic unchanged. |
| 2 | `5s24-ch08-mcq-05` | 2 | EXPLANATION: "…a shift made possible by the booming slave trade **after the Dutch lost their monopoly in 1682**." No such event: the monopoly broken was the **English** Royal African Company's, by Parliament's 1698 Africa Trade Act (opening the trade to all English merchants). Wrong country and wrong date. Verified against Parliamentary/WMQ sources before editing. | major | EXPLANATION now: "…a shift made possible by the booming slave trade **after Parliament broke the Royal African Company's monopoly in 1698, opening the trade to all English merchants**." | Re-read fixed item; claim now matches the documented 1698 break of the RAC monopoly; OPT-A's "monopoly had ended decades before the 1730s" remains consistent. |
| 3 | `5s24-ch11-mcq-03` | 2 | EXPLANATION: "The 1800 convention ended the Quasi-War: **France agreed to compensate the U.S. for seized ships**, cooling the naval clashes of the 1790s." OPT-A: "…**France agreed to compensate the United States for seized ships**, treating the young republic as a power worth settling with…" The Convention of 1800 (Treaty of Mortefontaine) settled no spoliation claims — the U.S. waived French payment; Congress paid the claims itself decades later. It ended the Quasi-War and terminated the 1778 alliance by negotiation. Key (A, Convention of 1800) is unaffected. | major | EXPLANATION now: "The 1800 convention ended the Quasi-War: **France settled the crisis by negotiated treaty, terminating the 1778 alliance** and cooling the naval clashes of the 1790s." OPT-A now: "The Convention of 1800 ended the Quasi-War and **terminated the 1778 alliance — a negotiated settlement between equals**, treating the young republic as a power worth dealing with rather than bullying." | Re-read fixed item; no compensation claim remains; keyed answer still the Convention of 1800, with the other options' explanations (Jay's Treaty, XYZ Affair) verified correct. |
| 4 | `5s24-ch07-mcq-03` | 2 | EXPLANATION: "**Lord Baltimore (George Calvert)** received the Maryland charter in 1632…" OPT-C: "Lord Baltimore — **George Calvert** — received the Maryland charter in 1632…" George Calvert died April 1632 before the charter was issued; it was granted (June 1632) to his son **Cecilius Calvert, the second Lord Baltimore**. Wrong person named. | minor | EXPLANATION now: "**Cecilius Calvert, the second Lord Baltimore**, received the Maryland charter in 1632…" OPT-C now: "**Cecilius Calvert — the second Lord Baltimore —** received the Maryland charter in 1632…" | Re-read fixed item; attribution now correct; substantive point (Maryland as Catholic haven, charter year) unchanged. |

## Stem-level flag (not repaired — stems are off-limits)
- `5s24-ch14-mcq-04` stem says Anglo settlers "first entered Mexican Texas **in
  the early 1830s**." Anglo settlement began in the **1820s** (Austin's Old
  Three Hundred, 1822–1825). The explanations themselves are historically
  correct; the stem's dating is ~a decade late. Flagged for a stem-editing
  pass, not changed here.

## Notes
- No explanation contradicted its item's recorded key → zero blockers, no
  key-audit escalation needed from this pass.
- Spot-checked interpretation-heavy claims and found them defensible (e.g.
  ch18-03 Coxey's Army/Hoover analogy; ch16-08 Bruce/Du Bois/Washington
  contrasts; ch19 Tarbell/Twain passage readings).
- Item counts per file verified unchanged (8 each) after edits; all four
  edited files remain valid JSON; diffs touch only explanation text.

## ch03 diagnostic (follow-up)
**Reviewer:** blind reviewer (did not build the content) · 2026-10-01
**Scope:** `build/reclaim-merged/staged/fivesteps-2024/ch03-mcq.json` — the
55-item 5 Steps diagnostic exam, missed by the earlier pass. All 55 items read:
stem, options, key, `explanation`, and all four `option_explanations`, checked
for historical accuracy (dates, names, causal claims, characterizations).
Stems, options, and keys NOT changed (explanations only).

### Totals
- Items read: **55** (all ch03 diagnostic items)
- Blockers: **0**
- Major: **0**
- Minor: **1** (repaired in place)
- Stem-level flags: **0**

The fix is applied to the staged JSON, **left uncommitted** (no commits, per
instructions). Only `explanation` / `option_explanations` text changed; stem,
options, and key are byte-identical. `git diff` confirms exactly 2 lines
changed (the two explanation strings). Item count (55) and valid JSON
re-verified after the edit.

### Findings

| # | Item ID | Gate | Evidence (wrong text, quoted) | Sev. | Fix applied (corrected text, quoted) | Re-verification |
|---|---|---|---|---|---|---|
| 1 | `5s24-ch03-mcq-27` | 2 | EXPLANATION: "The 1963 march pressured Kennedy **to send Congress** the civil rights bill that became the 1964 Act." OPT-A: "…pressured Kennedy **to send Congress** the civil rights bill…" Kennedy proposed the civil-rights bill on **June 19, 1963** — two months *before* the August 28, 1963 March on Washington. The march could not have pressured him to do something he had already done; it pressured Congress (and Kennedy) to advance it. Anachronistic causation, though the teaching point (march → 1964 Act) is true. | minor | EXPLANATION now: "The 1963 March on Washington pressured Kennedy and Congress **to advance the civil rights bill — legislation Kennedy had already proposed that June** — that became the 1964 Act." OPT-A now: "…pressured Kennedy and Congress **to advance the civil rights bill — proposed that June** — that became the Civil Rights Act of 1964." | Re-read fixed item; sequence now correct (June proposal → August march → 1964 Act); key (A) and the other options' explanations (Vietnam, taxes, Cuba as different tracks) verified correct and unchanged. |

### Notes
- No explanation contradicted its item's recorded key → zero blockers.
- Spot-verified tricky claims and found them accurate: Embargo Act dates/causes
  (Orders in Council, impressment, Chesapeake–Leopard); Salem collapse
  (spectral evidence thrown out, accusations reaching Gov. Phips's circle;
  19 hanged, not counting Giles Corey's pressing); Buchanan's 1859 veto and
  secession enabling the 1862 Morrill Act; Mexico severing relations over 1845
  annexation; Molotov invited-then-walked-out on the Marshall Plan; the 1766
  Franklin "On the Price of Corn, and Management of the Poor" quote; Carry
  Nation's 1900 raids via temperance/church networks.
- Interpretation-heavy items were defensible (e.g., ch03-04 embargo vs. 1930s
  Neutrality Acts; ch03-20 Nast as ancestor of Watergate reporters;
  ch03-43 Yippies' Pentagon 'levitation' as proto-viral spectacle).
