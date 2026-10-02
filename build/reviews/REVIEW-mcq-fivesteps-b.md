# Blind clean-context review — 5 Steps pool, MCQ option explanations (ch16–31 + exam files)

**Reviewer:** blind reviewer (did not build this content)
**Gate:** GATE 2 — "Every option explanation historically correct — including the wrong-option explanations. A confident wrong explanation is worse than none."
**Method:** read-everything audit. All 238 items read in full (stem, options, key, `explanation`, `option_explanations` A–D). Every historical claim checked: dates, names, causal claims, characterizations. Two web verifications run (Parker/McPherson review; Bataan Death March disclosure date).
**Scope:** `build/reclaim-merged/staged/fivesteps-2024/ch16-mcq.json` … `ch31-mcq.json` (8 items each), `exam1-mcq.json`, `exam2-mcq.json` (55 items each). `_raw/` skipped per instructions. No files committed; the one repair below was applied to the staged file (uncommitted).

## Totals

| Metric | Count |
|---|---|
| Items read | **238** |
| Items with no finding | 237 |
| Blockers | 0 |
| Majors | 0 |
| Minors | 1 (repaired) |

## Findings

### MINOR-1 — 5s24-ch24-mcq-02 (ch24-mcq.json) — "Which was NOT a reason for wartime hatred of the Japanese?" (key C, unchanged)

- **Gate:** GATE 2
- **Severity:** minor — wrong date stated as fact in two explanation fields; key and the item's core logic unaffected (the March still could not cause hatred "from the start," since disclosure came in 1944, well after Pearl Harbor)
- **Evidence (wrong text):**
  - `explanation`: "…the Bataan Death March came in 1942 and most Americans learned of it only in **1945** — it could not have caused wartime hatred from the start."
  - `option_explanations.C`: "…most Americans learned of it only in **1945** — it could not have caused wartime hatred 'from the start.'"
  - The U.S. government released the details on **January 27, 1944** (escaped-officers' sworn statements; followed by the LIFE magazine article), not 1945. Verified against web sources (Wikipedia: Bataan Death March; Asia-Pacific Journal on the 1943/1944 disclosure timeline).
- **Fix applied (corrected text), re-read and verified in the staged file:**
  - `explanation`: "…the Bataan Death March came in 1942 and **the U.S. government revealed the details only in January 1944** — it could not have caused wartime hatred from the start."
  - `option_explanations.C`: "…**the U.S. government revealed the details only in January 1944** — it could not have caused wartime hatred 'from the start.'"
- **Re-verification note:** both strings now read "January 1944"; JSON re-parsed (all 18 files valid, 238 items); key field untouched (still C); no explanation now contradicts the recorded key.

### Explicitly checked and CLEARED (web-verified or close-scrutiny items)

- **5s24-ch22-mcq-06/07** (Parker/McPherson): the review title "Our Lady of the Loudspeaker" (The New Yorker, Feb. 25, 1928) and the quoted deadpan line ("…the Statue of Liberty is situated in Lake Ontario") are genuine — verified via search. Explanations accurate. No finding.
- **5s24-ch24-mcq-08** (Truman announcement): "issued hours after Hiroshima" accurate (released from the USS Augusta ~16h after the bombing); the announcement does mention Pearl Harbor ("The Japanese began the war from the air at Pearl Harbor. They have been repaid many fold.") and the bomb's power — OPT-A/B/C correctly reject absence claims. No finding.
- **5s24-ch27-mcq-03** (SDS peak): "peaked during the 1965–67 escalation" is approximate (peak membership ~1968), but defensible and the key is unaffected; left as written.
- **5s24-ch20-mcq-02** (TR 1912): U.S. Steel suit filed 1911 — correctly attributed as the trigger. No finding.
- **5s24-ch30-mcq-01** (Iraq War rationales): the alleged plot against the elder Bush (real 1993 Kuwait plot, retaliated with cruise missiles) is correctly described as "never an official war rationale" for the 2003 invasion. No finding.
- **5s24-exam2-mcq-10**: Riis's "slavery" metaphor correctly traced to antebellum labor activists' "wage slavery" rhetoric (Lowell mill women); the distractor explanation correctly rejects "Abolitionists defending the Fugitive Slave Act." No finding.

## Open questions / caveats

- Passage-based items (Addams, Tarbell, Townsend, Giuliani, Trump Riyadh, Coolidge, McGovern, de Bry, Nast, Parkman, Henry Adams, ER Roosevelt, Logan, Patrick Henry, Beveridge, Lincoln, Wheatley) were judged against the claims the explanations quote or attribute to the passage, plus general historical fact; the source passages themselves were not independently re-fetched.
- No blocker found: no explanation contradicted its recorded key. No key changes were made (none were needed).

## Staged file modified (uncommitted)

- `build/reclaim-merged/staged/fivesteps-2024/ch24-mcq.json` — MINOR-1 repair only. No stems, options, or keys touched.
