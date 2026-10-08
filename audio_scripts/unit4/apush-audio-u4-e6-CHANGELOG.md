# U4-E6 Changelog — v1 → v2

## What changed
- **Full format rebuild**: v1 was Maya + Jay Study Buddies (warm-up + four deep dives + check). v2 is the default **Maya + Marcus interview** format, rebuilt to the frozen 2026-10-06 standards (script guide + validator checklist).
- **Structure**: cold open (continuity nod to U4-E5's closer tease, four boxes, "circle the ones you couldn't explain," ~12-min promise) → four conversation topics → Maya transition teases → Maya-driven recap with fumble → 3-question AP-shaped self-test + labeled fast bonus → one tagline → "Check your boxes." → single "next time" tease for U4-E7.
- **Boxes**: (1) the transportation revolution, (2) the factory system and the telegraph, (3) King Cotton's South, (4) the human cost. One mid-episode checkoff only ("One down" after box 1); recap is the check layer.
- **Voice work**: Maya gets the telegraph-first wrong beat (confident, corrected in flow), the Erie Canal song as her human moment, the Deere-tractors pop-culture beat, and a recap memory-check fumble (eight-hour vs ten-hour day). Two prediction beats ("Your turn." + 8–9s pauses), four exam tips on real errors, one common-mistake line per box with varied templates.
- **Timing traps taught**: telegraph-vs-canal order (water 1825, wires 1844 — never flipped), the 1808-ban trap (slavery grew after the international trade ended), Slater vs Lowell, Irish vs German immigrants, cult of domesticity as middle-class-only.
- **Panic of 1819** kept brief as the closer callback ("the crash that proved booms have teeth"). Missouri Compromise limited to the one-line continuity nod.
- **Not carried over from v1**: the Jay dialogue, the LEGO gag, unsourced dollar figures ($100→$10/ton freight), "Clinton's Ditch," "poling or hauling by rope."

## Sourcing (Tier 1 unless noted)
- **Princeton Review AP US History Premium Prep 2027, Ch. 6**: market-revolution framing; Erie Canal 1825 + ~90% freight drop; Fulton/Clermont 1807; Whitney interchangeable parts; Morse telegraph 1844 ("What hath God wrought?", DC→Baltimore, lines along railroads by 1850); Cumberland Road 1811–1853; B&O first tracks 1829; McCormick reaper 1831 (one farmer = five); Slater mill 1790s Pawtucket; Lowell mills from 1821, 6,000+ women by 1830, strikes 1834/1836, Irish replacement by 1840s, Lowell Offering; cotton gin 1793; King Cotton (58% of exports by 1860, ¾ of world supply); 1808 ban + internal slave trade expansion; Irish/German immigration; middle class; cult of domesticity/separate spheres; Panic of 1819 (Second Bank 1816, wildcat banks, land speculation).
- **Princeton Review AP US History (princeton)**: transport costs 1/20th of 1825 by 1855, 1/5 the time; first railroads in the 1830s; panics of 1819 and 1837.
- **5 Steps to a 5 (2024), Ch. 13**: "Steamboats traveled up and down America's great rivers"; National Road; Erie Canal spurring canal building.
- **Heimler Unit 4/04**: Lancaster turnpike; Erie Canal 1825 Albany–Buffalo; Slater (1789, memorized machinery); Whitney musket contract; Deere steel plow **1837**; McCormick reaper; regional specialization.
- **Heimler Unit 4/05**: "wage slaves"; Lowell Female Labor Reform Association (first women's labor union, 10-hour vs 12-hour); Irish/German immigration waves; separate spheres as middle-class-only.
- **Maximum Insight 26/27 + Adam Norris Period 4**: cross-confirmation on inventions, divergence, immigrants, wage labor, cult of domesticity.

## Hedged / disclosed (footer "Disclosed, not taught flat")
- Domestic slave trade "something like a million" + term "Second Middle Passage": standard scholarship (Ira Berlin estimate) but not in Tier-1 sources read — taught hedged/attributed per brief.
- B&O "broke ground in 1828": per brief/standard history; prem27 pins first tracks 1829 — dialogue reconciles both.
- Deere 1837: Heimler (Tier 1) + Deere company history agree; premium2027's "1847" flagged as an outlier, not taught.
- Omitted as unverifiable in Tier 1: "Clinton's Ditch," $100→$10/ton freight figures, "poling or hauling by rope."

## Registry note for the coordinator
- G12 initially tripped on a **false positive**: F-U3-055's pattern `1793.{0,40}domes` (meant for the 1790s-Capitol-dome anachronism) matched "the gin in 1793… the **domes**tic slave trade." Reworded the recap line to "internal slave trade" (prem27's own term) to clear it. The pattern likely wants a word boundary (`\bdomes\b`) — flagging for the registry owner, not editing the shared registry myself.

## Gate status
- `apush-script-gates.py --minutes 12`: **13/13 PASS**. Spoken words 2007 (floor 1440), 73s of pauses, experienced runtime 12.37 min @180 WPM — header and cold-open promise ("About twelve minutes") agree. Maya ?-ratio 0.31, 5 micro-turns, Marcus max turn 67 words, 6 em dashes, zero That's/Here's starters. W2 warnings reviewed — all benign (ritual box list, appositives).
- Not done here (by design): Layer-2 clean-context read and Layer-3 fact-check belong to other agents; the writer does not validate its own work.

## Repairs — 2026-10-07 (post Layer-2 ear + Layer-3 fact-check)
Layer 2 (FAIL, 4 blockers + 9 minors): (B1) tagline language de-duplicated from body — mid-episode "water moved the goods" line reworded, body "Water first, wires later" cut (recap keeps it), Panic paragraph "made the country richer" reworded; (B2) prediction beat 2 rebuilt as a reasoning question (who can fix a gun when parts are identical — master gunsmith or anyone?) instead of recalling Marcus's trigger example; (B3) fast bonus retargeted to box 2 (why the telegraph came last — what had to exist first); (B4) invented "1830 newspaper ad" stimulus reframed as hypothetical ("picture this"), answer's "in one ad" → "in one page". Minors: box-two label added mid-episode; decorative triple re-cadenced; two feed lines given real spines; two Maya echoes replaced with a push ("Sounds like a cage with nice curtains") and a real question; "dorm with a time clock" → "dorm run by the factory bell"; Marcus uncertainty hedge added on the slave-trade estimate; "Start with the workers" doubled-opener varied; one "trap" template reworded; runtime promise adjusted to "about twelve and a half minutes" (2,048 words + 73s pauses = 12.6 min). Repair pass added 9 em dashes — cut back to periods/commas (5 in dialogue, under the 10 cap).
Layer 3 (FAIL, 2 blockers, both background color): "hauling grain a few dozen miles could cost more than the grain was worth" softened to "hauling grain overland was ruinously expensive — freight could cost more than the grain itself" (commodity-price comparison unverifiable in Tier 1+2); "canals froze in winter" cut (winter-freezing not in Tier 1+2 — "they were slow" kept). Book error confirmed: premium2027 Ch.6's Deere steel plow "1847" is wrong — taught 1837 (Heimler Tier 1, Columbia Encyclopedia, Deere company history); entered as F-U4-007. Also entered: F-U4-008 (B&O 1828 groundbreaking vs 1829 first tracks — two events, never collapsed), F-U4-009 ("Second Middle Passage" = Ira Berlin's term, attribution-only). Fixed F-U3-055's G12 pattern (added \b word boundary — it false-fired on "domestic").
Gates after repairs: 13/13 PASS.

## Final re-read — 2026-10-07
Fresh Layer-2 re-read of all 14 repairs: REPAIRS VERIFIED. One flagged seam smoothed: "So which region had the leverage?" / "And resented each other." → Marcus now opens "Mutual leverage — and mutual resentment." (answers the question directly, keeps his line). Final: 2,048 words + 73s pauses = 12.6 min, 13/13 gates PASS.

## Repair pass — 2026-10-08 (5 audit findings, all fixed)
Fresh Layer-2 audit found 5 items; repair worker applied all. Accuracy findings: none — Deere 1837, B&O 1828/1829 disambiguation, "Second Middle Passage" attribution all confirmed in-dialogue and intact.

- **F1 (§5 error — announcer-voice exam proclamation → live trap).** Box 2's Slater/Lowell trap was a proclamation, not a live trap. Maya now makes the real student mistake and Marcus catches her in flow. Maya's caught-wrong moment gets [sheepish], Marcus's correction keeps [firm].
  - Before: `Marcus: [firm] And by the 1840s many of those farm girls were being replaced by Irish immigrants who'd work for less. One exam trap to pocket: Slater brought the know-how in his head; Lowell built the whole system under one roof. If the prompt says "factory system," that's Lowell.`
  - After: `Marcus: And by the 1840s many of those farm girls were being replaced by Irish immigrants who'd work for less.` + `Maya: [sheepish] So when the prompt says "factory system," that's Slater. He built the whole system under one roof.` + `Marcus: [firm] Slater brought the know-how in his head; Lowell built the whole system under one roof. If the prompt says "factory system," that's Lowell.`
- **F2 (§4.4 warning — unearned stylistic chain).** The episode's one unearned chain re-cadenced into non-parallel form, facts kept.
  - Before: `Long hours, dangerous machines, low pay.`
  - After: `They worked past dark for wages that never quite covered the month, and the machines showed no mercy to a tired hand.`
- **F3 (§9 error — tag density 83.6%).** Stripped body-default tags ([measured] ×22, [conversational] ×18) to beat-level tagging. Kept: cold-open [professional broadcast tone]; sign-off tagline [professional broadcast tone] (both lines); [firm] on the live-trap correction; [curious, inquisitive tone] on all 10 of Maya's genuine questions; [incredulous] on the Deere-tractors beat; [thoughtful tone] on 5 nuance/verdict beats; takeaway [confident tone]; [sheepish] per F1/F4; self-test fully neutral; one tag per turn max (0 turns exceed it). Live counts: 61/73 = 83.6% → 23/75 = 30.7%. Note: this lands below the audit's ~35–38% fleet target because the keep list was applied exactly — no body-default tags survived. The re-read should confirm 30.7% reads as under-tagged vs fleet-consistency concerns.
- **F4 (§9 warning — caught-wrong re-tag).** Telegraph-first wrong beat: Maya's "I'm going to flip them" line re-tagged to the catalog's caught-wrong tag.
  - Before: `Maya: [conversational] Noted. And I'm absolutely going to flip them on the test, I can feel it.`
  - After: `Maya: [sheepish] Noted. And I'm absolutely going to flip them on the test, I can feel it.`
- **F5 (§7 minor warning — attribution strength).** "Historians estimate" → named source per registry F-U4-009 (scale is NPS-confirmed; term is Ira Berlin's). No new registry entry needed.
  - Before: `Marcus: [measured] Historians estimate something like a million over the decades.`
  - After: `Marcus: The National Park Service's estimate runs something like a million over the decades.`
- **No-action (per audit):** antitheses exactly 2 in banned form, at budget (L41 "Not an improvement — a different universe."; L91 "that's an estimate, not a census.") — left untouched, no new ones introduced. Canal song, Deere-tractors beat, both wrong-beat tools kept. Accuracy-sensitive lines untouched.

**Runtime (honest math, no padding):** the audit-mandated fixes added words, so the v2 promise no longer holds: 2,079 spoken words + 73s pauses = 12.8 min at 180 WPM → cold-open promise and header both updated to "About thirteen minutes."

**Gates (live run, v3 file, --minutes 13):** 13/13 PASS. Warnings reviewed, all benign: W1 "This is" (pre-existing); W2 possible triples — all pre-existing lines (box list L7, appositives L17/L59, L29, L35), none from the new lines. G12 PASS — no F-U3-037-type false positive on this lesson.

**v2-entry drift corrected (auditor-flagged, live counts confirmed):** Maya ?-ratio was listed 0.31 → actual 0.40; Marcus max turn 67 → 70; em dashes 5 → 6. Reported v3 numbers are all live-run.

**Not re-read yet:** this repair pass had no Layer-2 re-read — the blind re-read still pending before lock. One item flagged for the re-reader: tag density 30.7% vs the ~35–38% fleet target (see F3 note above).

## Surgical repair — 2026-10-08 (2 antithesis forms reworked, v4)

**Record correction:** the v3 entry's no-action line claimed "antitheses exactly 2 in banned form, at budget." That was false — 4 existed in v3. The audit had counted only 2 (L41, L95); L17 and L83 were pre-existing v2 lines the audit never counted. This v4 repair reworks exactly those 2 into asymmetric phrasing; L41 and L95 are untouched, at the §4.14 ≤2 budget.

- **R1 (L17, ", not" punchline tail → asymmetric).** Facts kept: steamboats ran up and down the Mississippi, freight moved against the current.
  - Before: `Marcus: ...within a generation steamboats were running up and down the Mississippi, goods moving against the current, not just with it.`
  - After: `Marcus: ...within a generation steamboats were running up and down the Mississippi, freight moving against the current.`
- **R2 (L83, "didn't X. Y" denial + affirmative restatement → asymmetric).** Facts kept: the telegraph didn't start the revolution; it arrived late and sped things up.
  - Before: `Marcus: ...the telegraph didn't start this revolution. It showed up late and made it faster.`
  - After: `Marcus: ...the telegraph showed up late to this revolution, and then it made everything faster.`
- **Manual antithesis count (all sentence-forms, §4.14 "Not X, just Y" budget 2):** v3 = 4 (L17, L41, L83, L95) → v4 = 2 (L41 `One-twentieth? Not an improvement — a different universe.`; L95 `that's an estimate, not a census.`). Note for the re-reader: L91 carries denial-style lines (`It should have. It didn't, and that gap is the exam's favorite trap.`; `It didn't touch the demand.`) — reviewed and left; they are expectation-denial beats, not "Not X, just Y" antithesis forms, and were never in the counted 4.
- **Nothing else touched.** L41, L95, and every other line are byte-identical to v3.

**Gates (live run, v4 file, --minutes 13):** 13/13 PASS. W1 uncontracted phrasing 1x ('This is', L65 — pre-existing); W2 possible triples — all pre-existing appositive/list lines (L7 box list, L17/L29/L35/L59 appositives), none from the reworked lines. G9 antithesis budget PASS.

**Runtime (live run, honest math):** 2,075 spoken words (−4 vs v3) + 73s pauses = 12.7 min @180 WPM. Cold-open promise and header both say "About thirteen minutes" — still holds; header word-count line updated to the live 2,075.

**Not re-read yet:** this surgical pass had no Layer-2 re-read — the blind re-read still pending before lock. The re-reader should spot-check the two reworked lines in flow and the tag-density note carried from v3.
