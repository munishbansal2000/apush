# U3-E11 v1 → v2 Changelog (2026-10-06)

## What v2 is
Full rebuild from scratch to the frozen 2026-10-06 standards. v1 was an
~8.2-minute draft in the old format (2-second pauses, chain recap, no
prediction beats, no box ritual, no CER self-test, tagline "The transfer
held. The promises waited."). No v1 prose was carried over; v1 was used
for topic and version continuity only. New tagline, new tissue throughout;
only the fixed ritual lines are shared ("Circle the ones you couldn't
explain right now", "Four boxes, let's land them.", "Three questions,
AP-shaped. Say your answer before I give it.", "One more, fast.").

## Scope decisions
- 4 boxes (content needed it): 1) the tie, 2) the pragmatist, 3) Marbury's
  judo, 4) the culture. The honest asterisk (slavery expanded, most
  couldn't vote) is the closing interpretive thread, not a box.
- 12th Amendment (1804) folded under box 1 as the bug-fix kicker.
- U3-E10 (Alien/Sedition): exactly one continuity sentence in the cold
  open. U3-E9 (Hamilton's program) and U3-E8 (ratification): referenced
  only, never re-taught.
- Cut as out of scope: Lewis & Clark expedition, Charles Brockden Brown's
  Wieland, the Virginia-dynasty list (kept only the "changing of the guard"
  counterargument line).
- Forward tease points only to the Unit 3 cram (next lesson; E11 is the
  last numbered episode). Cold open nods to E10's closer (the 1800 election
  as verdict → now the transfer itself).

## Structural/content choices
- Box 1 teaches 36 ballots and flags the Princeton "35" error in-dialogue
  as a misprint warning (exam tip template), with the 1801-02-17 date.
- Hamilton's Burr line taught as his actual phrasing per 5steps:
  "the most unfit man in the United States for the office of president."
- Jefferson's inaugural line taught as his actual words with the 5steps
  punctuation: "We are all Republicans; we are all Federalists." Promise
  direction checked: winners' promise TO the losers.
- Webster's "a national language is a band of national union" attributed
  to the 1789 Dissertations, not the 1783 speller — corrected twice
  (box 4 content + common-mistake line + self-test bonus).
- "Midnight judges" name grounded via 5steps ("erroneously believed to be
  signing these many commissions on his last night in office") — the
  "dramatic name" beat.
- Maya's mid-episode wrong beat: Haiti/cash (Marcus corrects in flow —
  disease killed the army, the lost colony was the cause). Recap fumble:
  memory-check on 10-4-2 (different tool, per guide). Maya's
  knows-something beat: Trumbull's Declaration on the $2 bill (pop-culture
  source; Marcus admits he's never looked). Human moment: prom-theme
  assemblies. Marcus admits uncertainty: Adams's exact pre-dawn hour.
- One mid-episode checkoff only ("One down. Checking the tie off my
  sheet."); everything else lands in the recap.
- Exam devices: 2 prediction beats ("Your turn." + 8s/10s real silence),
  4 exam tips with varied openers (Fair warning / SAQ bait / "what the exam
  tests" / "wants the job"), 4 common-mistake lines (varied templates),
  self-test 3 CER questions (15s each, Hamilton-letter stimulus first) +
  labeled bonus ("One more, fast.", 5s). CER shape carried by connective
  tissue; zero spoken labels (G13).
- Closer: single shared tagline once ("Power changed hands. The hands
  stayed few."), one "next time" (cram), no aphoristic summary.

## Source-reliability notes
- Princeton error RE-VERIFIED this pass: `books/extracted/princeton/OEBPS/
  xhtml/041_c008_sup.xhtml` — "It took 35 ballots, but Jefferson finally
  won." Wrong. 5steps2024 ch12 is internally consistent ("the voting going
  through 35 ballots without a victor... victory on the thirty-sixth
  ballot") and Monticello/LOC confirm the 36th ballot, Feb 17, 1801
  (per the 2026-10-06 verification record). No new book errors found.
- Bayard-of-Delaware abstentions + 10–4–2 count: carried from the
  2026-10-06 verification record (v1 web-verified); NOT re-checked against
  Tier 1 in this pass — disclosed in the Sources footer.
- Adams's pre-dawn departure: standard account; exact hour hedged
  in-dialogue ("the exact hour gets argued about, but the snub is solid").
- $2 bill reverse = Trumbull's Declaration: general currency knowledge,
  disclosed as Maya's pop-culture beat, not a taught historical claim.
- Webster spellings (theater/color): premium2027 ch5 (Tier 1). All other
  election/presidency/Louisiana/Marbury claims: 5steps2024 ch12 (Tier 1).
  Cultural items (Peale, Trumbull, Crèvecoeur 1782, Capitol 1793): per the
  2026-10-06 verification record.

## Validation log (writer pass)
- `apush-script-gates.py --minutes 12.5`: 13/13 PASS.
- WARN dispositions: W1 ('We are' ×5) — all inside the verbatim inaugural
  quote; guide exempts quotes, keep. W2 triples — false positives (box
  lists, natural series), keep. W5 ('exactly' ×2) — natural, keep.
- Word-count methodology: gates counts speaker-turn words only (excludes
  "Maya:"/"Marcus:" labels) = 1733; my independent count agreed at 1733
  after the same exclusion. Header carries 1733.
- Mechanical self-checks: em dashes 5 (≤10); That's/Here's sentence
  starters 0; "Not X, just Y" 0; twist pivots 0; spoken CER labels 0;
  Maya ?-enders 5/37 (14%, ≤60%); Marcus max turn 73 words (≤100);
  micro-turns 3 (≤8); no verbatim repeats; no button loops.

## Runtime math (experienced runtime = speech + pause silence)
- Spoken words: 1733. Pauses: 8+10+15+15+15+5 = 68s (1.13 min).
- 1733 ÷ 160 WPM = 10.83 min speech + 1.13 min pauses = **≈12.0 min**.
- Header ("≈ 12.0 min at ~160 WPM"), title ("~12 min experienced"), and
  cold-open promise ("About twelve minutes") all agree. Floor 1440 met
  (1733). Episode earns the 11–12.5 min band: 4 boxes, CED 3.10 + 3.11.

## Open items / handoff
- Ready for Layer 2 (clean-context read + validator checklist) and Layer 3
  (dedicated fact-check). Writer's known disclosures are all in the
  Sources footer; nothing was taught flat that Tier 1/2 couldn't verify
  except the two disclosed items above (Bayard/10-4-2 provenance, $2 bill).
- Pronunciation header covers Crèvecoeur, Bayard, Gallatin.

## coordinator correction — 2026-10-06
Writer computed runtime at ~160 WPM ("≈12.0 min at ~160 WPM"). Frozen standard is ≤180 WPM: 1,733 words = 9.63 min speech + 68s pauses = ≈10.8 min experienced. Header and cold-open promise corrected to ~11 min / "About eleven minutes." Gates re-run at --minutes 11: 13/13 PASS.

## Layer-2 repairs — 2026-10-06
- B1 (blocker): broke the parallel mirror pair "The handoff was real, and precious. / The exclusions were real, and damning." → "The handoff was real, and precious. The exclusions were damning in their own way."
- B2 (blocker): softened the "every" overclaim "Every democracy since stands on that precedent." → "It's the precedent later democracies inherited."

## Layer-3 repairs — 2026-10-06
- BLOCKER: "Kept the navy" removed from body (L46) and recap (L108) — Jefferson actively reduced the navy; implying continuity was misleading framing per the framing rule.
- BLOCKER: Sources footer miscitation fixed — "(1819 per 5steps ch12)" was wrong; 5steps ch12 does not credit Jefferson. Now cites premium2027 ch6 (16_Chapter06.xhtml:514) for Jefferson's authorship; 1819-letter detail tagged as carried from the 2026-10-06 verification record.
- "Easier to manage" Federalist motive → "wanted to embarrass Jefferson" (Tier-1 phrasing: 5steps "detested Jefferson" / prem27 "wished to embarrass Jefferson").
- "Columns and domes" → "columns and pediments" (cast-iron dome is 1850s–60s).
- Footer: "loose construction" gloss disclosed as the script's interpretive commentary on the 5steps scruples passage.
- Registry: +4 (F-U3-053 navy framing, F-U3-054 Burr motive, F-U3-055 1793 dome anachronism, F-U3-056 Revolution-of-1800 citation). Now 236 facts.

## Layer-2 re-read — 2026-10-06
REPAIRS PASS: all 7 repairs verified natural in context, substance intact, no new violations. Body/recap agree on navy fix; footer honest and complete. One fix from the re-read: stale header figure "≈12.0 min at ~160 WPM" corrected to "≈10.8 min at ≤180 WPM" (header, cold-open promise, and actual now agree at the standard rate).
