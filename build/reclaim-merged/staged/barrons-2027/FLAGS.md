# FLAGS — Barron's AP U.S. History Premium, 2027 reclaim

Surprises and corrections found in the source book, recorded 2026-10-01.

1. **Las Casas date impossible (Ch 3 answer key).** The book's key says Las Casas raised
   forced-labor concerns in the **1640s** — impossible (Bartolomé de las Casas died in
   1566). All rewrites use the **1540s** (the New Laws of 1542).

2. **Washington's Farewell Address misdated.** The book dates it to **1793**; it was
   delivered/published in **1796**. All rewrites use 1796.

3. **PT2 DBQ prompt period dips below the DBQ floor.** The prompt covers 1750–1800,
   which is 4 years below the 1754 DBQ floor in the Fall 2026 CED. Flagged in
   `pt2-dbq.json` as `boundary_flag:"1750<1754"`.

4. **Ch 2 teaches the OLD exam format.** The chapter's SAQ strategy prose (Q3/Q4 choice)
   and LEQ framing (choose 1 of 3) predate the Fall 2026 CED, under which all 3 SAQs are
   required with specified source types and the LEQ is a single broad prompt. Strategy
   prose was skipped as stale (quarantined, see MANIFEST.md); only the sample DBQ and
   sample LEQ were reclaimed, both rewritten to the new format.

5. **PT1 Q21 key correction.** The book's answer key marks the Articles→Constitution
   ratification-debate question as **D**, not B. Applied in `pt1-mcq.json`.

## 2026-10-01 — Franklin Observations date (fixed in pt2-dbq.json)
- Book dated "Observations Concerning the Increase of Mankind" to 1753. Bibliographic record: written 1751, published Boston 1755. Source line corrected to "(written 1751; published 1755)". Prompt's first comparison period reframed 1750–1800 → 1754–1800 to respect the CED 1754 DBQ floor. Boundary flag cleared.
