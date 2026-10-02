# Accuracy Audit — Period Reviews (u1–u9) + 164 Day-Items

**Reviewer:** blind clean-context reviewer (did not build the content)
**Date:** 2026-10-01
**Scope read:** 9 period reviews (`build/content/period-reviews/u1.md` … `u9.md`),
all 9 timeline SVGs (`build/content/period-reviews/timelines/u1–u9.svg`),
all 164 day-items in `build/reclaim-merged/staged/fivesteps-2024/day-items.json`
(every `question` + `answer` read in full).
**Gate:** Gate 7 — every date, name, quote attribution, and causal claim verified;
zero open `[VERIFY]` flags.

**Result:** 15 findings — 6 blockers, 4 majors, 5 minors. **All 15 repaired in place,
zero open `[VERIFY]` flags.** No commits made (per task; changes left uncommitted).

## Findings

| # | Location | Gate | Severity | Evidence (wrong text) | Fix applied | Re-verification |
|---|----------|------|----------|------------------------|-------------|-----------------|
| 1 | day-items `5s24-day-007` (answer) | 7 | **Blocker** | "The Castillo is the oldest surviving fort in North America." — false: San Juan's El Morro (begun 1539) and others predate the Castillo de San Marcos (1672). | → "the oldest surviving masonry fort in the continental United States." | Re-read fix in file; superlative now matches NPS/standard description. |
| 2 | day-items `5s24-day-029` (answer) | 7 | **Blocker** | "The Declaration of Independence was signed on July 2, 1776, and formally announced on July 4." — wrong date; July 2 was the Lee Resolution. | → "adopted on July 4, 1776 (the engrossed copy was signed on August 2)." | Re-read fix in file. |
| 3 | day-items `5s24-day-115` (answer) | 7 | **Blocker** | "Prohibition went into effect on January 1, 1920." | → "January 17, 1920." | Verified via web search (Volstead Act / 18th Amendment sources). |
| 4 | day-items `5s24-day-147` (answer) | 7 | **Blocker** | "unemployment falling to 2 percent in 1948." | → "about 4 percent." | Verified via web search: BLS/Economic Report series gives 1948 = 3.8%. |
| 5 | day-items `5s24-day-170` (**question**) | 7 | **Blocker** | "Personal Opportunity and Work Opportunity Reconciliation Act" — wrong law name (the answer already had it right). | → "Personal Responsibility and Work Opportunity Reconciliation Act." | Re-read fix; now matches the answer's own (correct) naming. |
| 6 | day-items `5s24-day-108` (**question**) | 7 | **Blocker** | "Zimmerman Telegram" — misspelled name. | → "Zimmermann Telegram." | Matches u7 review spelling; standard spelling confirmed. |
| 7 | day-items `5s24-day-052` (answer) | 7 | **Major** | "In the 1831 Supreme Court decision Cherokee Nation v. Georgia, Chief Justice John Marshall ruled that the tribe had rights to the land that the state of Georgia was attempting to force them from." — the 1831 case dismissed for lack of jurisdiction; the land-sovereignty ruling was Worcester v. Georgia (1832). | → states Cherokee Nation v. Georgia ruled the Cherokee a "domestic dependent nation," not a foreign state (case dismissed), and that Worcester v. Georgia (1832) ruled Georgia's laws had no force on Cherokee land. | Re-read fix in file; aligns with standard case-law summary. |
| 8 | day-items `5s24-day-097` (answer) | 7 | **Major** | "In 1902, when a treaty purchasing a canal zone from Colombia fell through" — the Hay–Herrán Treaty was signed Jan 1903 and rejected by Colombia Aug 1903. | → "In 1903". | Standard chronology (Spooner Act 1902 authorized negotiation; treaty 1903). |
| 9 | day-items `5s24-day-019` (answer) | 7 | **Major** | Question asks "Who was the greatest eighteenth-century British advocate of free trade?" — the answer never names anyone. | Appended: "The greatest eighteenth-century British advocate of free trade was Adam Smith, whose The Wealth of Nations (1776) argued that free markets and the division of labor create national wealth." | Re-read fix in file. |
| 10 | timeline `u1.svg` (label) | 7 | **Major** | Label "Cahokia, the Mexica, and the Inca at their height" under c. 1491 — Cahokia's height was c. 1100, not 1491 (the u1 review itself says "around 1100"). | Gen script label → "Mexica and Inca empires at their height; Cahokia peaked c. 1100"; SVG regenerated. | Regenerated SVG greps for "Cahokia peaked c. 1100". |
| 11 | day-items `5s24-day-101` (answer) | 7 | Minor | "gave the Food and Drug Administration the power to test products" (1906) — the agency was the Bureau of Chemistry until renamed FDA in 1930. | → "gave the Bureau of Chemistry (the forerunner of the FDA) the power to test products." | Re-read fix in file. |
| 12 | day-items `5s24-day-064` (answer) | 7 | Minor | "The 1861 Crittenden Plan" — the plan was proposed Dec 18, 1860. | → "The Crittenden Plan, proposed by Senator John Crittenden of Kentucky in December 1860 and debated through early 1861". (Year pairing 1861 kept — debate ran into 1861.) | Verified via web search; re-read fix. |
| 13 | day-items `5s24-day-178` (answer) | 7 | Minor | "In May 9, 2012, President Barack Obama publically announced" — grammar + nonstandard spelling. | → "On May 9, 2012, President Barack Obama publicly announced". | Re-read fix in file. |
| 14 | timeline `u7.svg` (label) | 7 | Minor | "19th Amendment" listed at 1919 — passed Congress June 1919 but ratified Aug 1920; u7 review says 1920. | Moved label to the 1920 slot as "19th Amendment ratified;"; SVG regenerated. | Regenerated SVG greps "19th Amendment ratified;" under 1920. |
| 15 | timeline `u8.svg` (label) | 7 | Minor | "Marshall Plan" listed at 1947 — u8 review dates it (1948); program launched 1948 (proposed June 1947). | Split into 1947 "Truman Doctrine;" and a new 1948 "Marshall Plan / launched;" label; SVG regenerated. | Regenerated SVG greps both labels. |

## Checked and cleared (no change needed)

- `5s24-day-124` — "By 1940, 3.5 million people moved away from the affected area": the 3.5M figure (Plains states, 1930–1940) is a documented estimate (Wikipedia/Dust Bowl human-displacement section); left as-is.
- `5s24-day-149` — "seven 'Levittowns'": confirmed — the Levittown disambiguation lists "the seven Levitt developments known as (or formerly known as) 'Levittown'."
- `5s24-day-005` — term order Crusades → astrolabe → encomienda: defensible in the exploration-narrative reading (the mariner's astrolabe entered European use in the late 1400s, after the Crusades and before the encomienda); not flagged.
- u9 review "Trump's return in 2024" (2024 election) and "COVID-19 ... killed over a million Americans" (~1.2M recorded deaths): both accurate.
- Timelines u2–u6, u9 labels spot-checked against review text dates — all match (e.g., Tordesillas 1494, Waldseemüller 1507, Pueblo Revolt 1680, Zenger 1735, Yorktown 1781, Erie Canal 1825, Gettysburg July 1863, Wounded Knee Dec 29 1890, SDI 1983, INF 1987, NAFTA effective 1994).

## Files changed (uncommitted, by this reviewer)

- `build/reclaim-merged/staged/fivesteps-2024/day-items.json` — 12 in-place fixes (findings 1–9, 11–13).
- `build/content/period-reviews/timelines/gen_timelines_u123.py`, `gen_timelines_u789.py` — label corrections (findings 10, 14, 15).
- Regenerated `timelines/u1.svg`, `u7.svg`, `u8.svg` from the corrected scripts (u2/u3 rewrote byte-identical; no other SVGs touched).

JSON re-validated after edits (164 items intact). All fixes re-read in the files themselves.
