# U3-CRAM Changelog — v1 → v2 (2026-10-06)

## Scope decisions (frozen before writing)

1. **Shape follows the U2-E9 cram, not v1.** One rapid-fire question per lesson mapping
   1:1 onto the eleven Unit 3 episodes (E1–E11 v2/LOCKED), Jay holding the question list,
   Maya answering and correcting crisply. The unit through-line lands in the recap; two
   DBQ predictions with model theses replace the standard self-test (U2-E9 precedent);
   one tagline, once, in the closer; one-line forward tease (Unit 4 opens with the
   Louisiana Purchase) in the closer only. No mid-episode box check-ins — the eleven
   questions ARE the check layer.
2. **Boxes verified against the scripts, not the brief.** Every box name, figure, and
   continuity line was re-extracted from the current drafts (E1–E7, E9–E11 v2; E8 LOCKED):
   E1's "enormous" unpinned debt, E2's "early sixty-six" repeal (registry F-U3-020 bans
   pinning March), E3's Quebec Act as the odd one out, E4's deleted slavery passage +
   Dunmore's offer + Abigail Adams's letter, E5's "almost everything east of the
   Mississippi except Florida," E6's "why eight years" framing, E7's "behind closed
   doors" (never "sworn to secrecy," F-U3-040), E8's 19/10/3 squeakers + Hancock's
   litter-and-promise, E9's excise-not-tariff + "He didn't veto it," E10's four Acts
   taught by target, E11's 10-4-2 + the asterisk.
3. **No new book-error claims.** The three known book errors (5steps "all 13 states"
   at Philadelphia; premium2027 "Mississippi" 1787; premium2027 "Fifty men") are taught
   against with their corrections, but no NEW "the book is wrong" case was found in
   this pass — per the 2026-10-06 rule, none is reported without an independent
   trusted-source confirmation.
4. **Maya's human beats:** one irrelevant human moment (bounced a $12 check → "my bank
   treated it like a constitutional crisis," Q9 Bank) and one knows-something beat
   (the Hamilton musical ends at the duel and skips the 36 ballots, Q11). Jay guesses
   messily wrong on eight of the eleven questions (debt pin, hanged soldiers, Saratoga
   year, the hat, Anti-Federalists, tariff-vs-excise, "one law," 35 ballots) and fires
   straight on three — he's a student, never a second expert.
5. **Quote disclosure is explicit.** Five verbatim quotes, all real, all previously
   Tier-1/Layer-3 verified in the episode scripts: Declaratory Act "in all cases
   whatsoever," Sedition Act "any false, scandalous, and malicious writing," Jefferson's
   first-inaugural "We are all Republicans; we are all Federalists," Webster's 1789
   "A national language is a band of national union," Lee's resolution "free and
   independent States." No dramatized dialogue in this episode.
6. **Orphans from v1 dropped** (not in the rebuilt episodes): the "ten questions"
   count (now eleven, 1:1 per lesson) and "Washington marched into western
   Pennsylvania" (corrected: rode to Bedford only, Henry Lee took command).

## v1 → v2 corrections (all eight mandated figures applied)

| # | Figure | v1 / wrong form | v2 (this draft) |
|---|--------|-----------------|-----------------|
| 1 | 1800 House ballots | (v1 said "thirty-six ballots" — correct, kept) | 36 ballots, "not thirty-five"; 10-4-2 |
| 2 | Naturalization Act | — | 5 → 14 years, "not fifteen" |
| 3 | XYZ loan demand | — | $250k bribe + $10M loan (not $12M) |
| 4 | Whiskey Rebellion crowd | — | ~500 at the tax collector's home (not 50) |
| 5 | Treaty of Paris 1783 | — | "almost everything east of the Mississippi, except Florida, which went back to Spain" (never "everything east") |
| 6 | Philadelphia delegates | — | 12 states — Rhode Island sent none |
| 7 | Alien Acts | — | Friends = peacetime deportation only ("Deport, not imprison"); Enemies = wartime arrest/deport |
| 8 | Washington, 1794 | (v1 had no Whiskey beat) | Rode west to Bedford only; Henry Lee took command; "never marched into western Pennsylvania" |

(v1's "thirty-six ballots" was already correct; the verified G12-falsehood forms — 35,
15 years, $12M, "Fifty men," unqualified "everything east of the Mississippi" — are
taught against inline as correction beats, never stated flat.)

## Mechanical passes

- `apush-script-gates.py --minutes 13.5`: **13/13 PASS** (final: 2,315 words, 171 WPM).
  Repairs: 3 That's-starters → 0; 51 em-dashes → 9 (beat-critical keeps only);
  3 comma-not antitheses → 2 kept in rephrased correction form ("It was the reach,
  not the rate"); 16 micro-turns → 0; G12 Pontiac/Neolin phrasing adjusted to the
  registry's negative-lookahead-safe form.
- WARNs reviewed with intent, all kept: W1 "We are" ×2 lives inside Jefferson's
  verbatim inaugural quote (guide exempts quotes); W2's five "triple" flags are all
  box-content enumerations (Grenville's actions, Pontiac's causes, Q6's four boxes,
  the Articles' structure list, Federalist theory's two points), not decorative chains.
- Runtime: 2,315 words at ≤180 WPM (772s) + 38s of scripted pauses (11×2s rapid-fire
  beats, 2×8s prediction beats) = 810s ≈ **13.5 min experienced**. Header, cold-open
  promise ("about thirteen and a half minutes"), and gate-counted words agree.

## Voice checklist (against apush-validator-checklist.md)

- Quote/disclosure integrity: five real quotes disclosed in the header; no dramatized
  dialogue; no figure speaks out of year (all voices are modern).
- No time-travel: Maya/Jay frame everything from the present.
- No spoken CER labels (G13); model theses carry the logic in natural phrasing.
- No overclaims: "almost everything east of the Mississippi" (never "everything");
  Proclamation taught as treasury motive (never punishment); Anti-Federalists "not
  against government — against this government"; Jefferson's pragmatism hedged
  ("The land mattered more than the theory").
- Slavery a live factor where it was one: E4's deleted passage + Dunmore's offer,
  E7's three protections, E9's "the independence Jefferson praised was built on
  labor that wasn't free" echo, E11's asterisk.
- De-slop: 9 em-dashes, 0 That's/Here's starters, 2 punchline antitheses, 0
  micro-turns, 0 modern analogies, 0 retired phrases; Maya 0/51 lines end in ?
  (format-appropriate: Jay fires, Maya answers); Jay's nowhere beats (the Pontiac
  car question, the hat) are human, not textbook.
- Structure/fun: cold-open hook lands inside the first ~45 words (E11's tagline
  continuity + the dare); Hancock's gout and the bounced-check beats sit at natural
  energy points, never inside a theory exchange; one-line Hamilton-musical nod nods,
  doesn't accuse.
- Numbers: real gate-counted word run (2,315, pause tags stripped); number density
  kept to box essentials (dates, votes, ballots, dollar figures that are the point).

## Status

Draft v2 written 2026-10-06 to the frozen standards. **Not pushed, not rendered.**
Awaits Layer 2 (clean-context read + validator checklist) and Layer 3 (dedicated
fact-check, Tier 1 + Tier 2) before any user review or render.

## Validation 2026-10-06 (all three layers)

**Layer 1:** 13/13 PASS at --minutes 13.5 (final: 2,339 words, 173 WPM, 38s pauses = 13.6 min experienced). G13 (no spoken CER labels) clean. Two WARNs kept with intent (W1 "We are" ×2 inside Jefferson's verbatim inaugural quote — guide exempts quotes; W2 triple flags are box-content enumerations, not decorative chains).

**Layer 2 (fresh ear read):** PASS, no blockers. 9 soft findings; 7 repaired:
1. "Two hinges" cashed out — Q5 answer now ends "Saratoga and Yorktown: those are the two hinges."
2. "Salutary neglect" now named once in spoken dialogue (Q1).
3. Connecticut/Great Compromise now named (Q7).
4. E8 verdict line restored to the locked episode's hedge ("or so their heirs claim").
5. Marbury mirror pair recadenced ("Marshall denied Marbury his commission and walked away with judicial review").
6. Saratoga-year inference softened ("so Saratoga was seventy-seven, the year before").
7. Northwest Ordinance "schools funded" → "schools encouraged" (the Ordinance encouraged schools; land-grant funding was the 1785 Land Ordinance).
Signed off as cram-format exceptions (no draft change): rapid-fire fragment rhythm (~10–15 fragments — intentional cram cadence, must not leak into standard episodes); Maya carries no wrong-beat/recap-fumble (Jay holds the student seat; pace argues against adding one); recap ritual adapted ("Eleven episodes, eleven questions, one through-line." — no "N boxes, let's land them" / no closing "Check your boxes"; the cold-open box circle carries the check layer). Number density inherent to an eleven-episode cram; all dates spoken in words, TTS-safe.

**Layer 3 (dedicated fact-check, ~90 claims):** zero WRONG claims. All 9 priority corrected figures taught in corrected form (36 ballots, 14-year naturalization, $10M XYZ loan, ~500 men at Neville's, Paris-except-Florida, 12 states at Philadelphia, no 1787 Mississippi, Alien Friends vs Enemies kept distinct, Washington-to-Bedford-only). All quotes verbatim and correctly placed (Declaratory Act, Sedition Act, Jefferson inaugural, Lee's resolution). No new "book is wrong" cases. 8 hierarchy-verification gaps reported — ALL inherited verbatim from the locked/validated episodes (E8 LOCKED: Webster 1789 quote, Hancock litter anecdote; E11 v2: Bayard 10-4-2 tally, "Adams left before dawn," Brutus named) or outside strict Tier 2 (Little Turtle via Congress.gov, Gallatin debt paydown, Sedition Act March 3 1801 sunset date). None are factual errors; the cram is consistent with what the episodes teach. They ride on the episodes' prior validation — the user's lock is the authority here, not a re-verification of settled material. Minor framing compressions inherent to cram pace (Dunmore's offer omits indentured servants; "women voteless" omits the NJ exception) — noted, not blocking.
Word-count note from Layer 3 (2,410 vs gate-counted 2,339): Layer 3's count included header/read-note text; the gates strip those, and Layer 2's independent count matched the gates exactly at 2,315 (pre-repair) / 2,339 (post-repair). Gates are the source of truth.

**Repair pass:** 7 line-level repairs above; the repairs briefly pushed G8 to 14 em-dashes — 4 cut (commas/parens), final 9/10, 13/13 PASS re-verified. Fresh Layer-2 re-read of all repairs: VERIFIED, no new violations.

## Registry
No new facts added — Layer 3 surfaced zero wrong claims and zero new book errors; all corrections in the cram were already registry-anchored from the eleven episode builds. Registry verified parsing, 236 entries, unchanged.

## Status
Draft v2 validated 2026-10-06: Layer 1 13/13, Layer 2 PASS, Layer 3 zero-wrong (8 inherited hierarchy gaps documented above). **Not pushed, not rendered.** Ready for the parent's push and the user's lock.

## v2 → v3 fleet repair (2026-10-07) — audit u3-cram-FINDINGS.md: 2 blockers, 4 minors

**B1 — direction-tag density 96% → 35.4% (§9).** Stripped the workhorse/neutral-default tags
([conversational] ×36, [casual] ×30, [thoughtful tone] where unearned) from every turn whose
beat didn't genuinely earn one. Kept catalog beats only: cold-open `[professional broadcast tone]`;
correction myth-busts `[firm]` ×5; grim `[serious tone]` ×4 (Massacre, slavery bargain, Sedition
sunset, culture asterisk); genuine questions `[curious, inquisitive tone]` ×10; caught-wrong
`[sheepish]` ×3; takeaway `[confident tone]`; closer `[intrigued]` ×2; verdict exposition
`[thoughtful tone]` ×7 and `[measured]` ×1. 34 of 96 turns tagged. Words unchanged by this fix.
Before: `Maya: [conversational] The war left an enormous debt, and the books won't pin the number, so neither will I.`
After: `Maya: The war left an enormous debt, and the books won't pin the number, so neither will I.`
(Kept-tag example) Before: `Maya: [conversational] March fifth, seventeen seventy. Five dead, including Crispus Attucks.`
After: `Maya: [serious tone] March fifth, seventeen seventy. Five dead, including Crispus Attucks.`

**B2 — antitheses 7 → 2 (§4.14, G9).** Kept the two strongest: "Branded, not hanged." (the
hanged-soldiers live-trap correction) and "Deport, not imprison." (registry F-U3-052 anchor).
Reworded five, corrections intact:
1. Before: `Jay: [casual] It was the reach, not the rate. The tax touched everyone.`
   After: `Jay: It was the reach that mattered. The tax touched everyone.`
2. Before: `...fought on Breed's Hill, not Bunker Hill.`
   After: `...fought on Breed's Hill, despite the name.`
3. Before: `...hands the army to Washington. A Virginian, not the best general.`
   After: `...hands the army to Washington, more unifier than tactician.`
4. Before: `The speculators who'd bought the certificates cheap got the windfall, not the original soldiers.`
   After: `The speculators who'd bought the certificates cheap got the windfall; the original soldiers got nothing.`
5. Before: `Then the whiskey tax: an excise, not a tariff. A tariff taxes imports at the docks; an excise taxes what you make at home.`
   After: `Then the whiskey tax: an excise. A tariff taxes imports at the docks; an excise taxes what you make at home.`
   (excise-vs-tariff correction survives via the definitions; 14-not-15 survives untouched as an em-dash clause.)

**M1 — mid-turn fragments 6 → 2 (§4.10).** Folded four into full sentences; the two survivors are
the kept B2 antitheses (within the 2–3 budget):
- Before: `...Parliament claiming power over the colonies "in all cases whatsoever." Same month as the repeal. The win that wasn't.`
  After: `...Parliament claiming power over the colonies "in all cases whatsoever." Same month as the repeal, so the win wasn't much of one.`
- Before: `...fifty-six delegates, everybody but Georgia. Unity, but not independence. Not yet.`
  After: `...fifty-six delegates, everybody but Georgia. Unity, but not independence. That would come later.`
- Before: `Not written in Philadelphia. Added in seventeen ninety-one as the price of ratification.`
  After: `It wasn't written in Philadelphia. It was added in seventeen ninety-one as the price of ratification.`

**M2 — Trenton dropped thread restored (§8 completeness).** Jay asked "Then Trenton saves the army,
and Saratoga, seventy-eight?" and v2 answered only Saratoga. The Q5 answer now gives Trenton its beat.
Before: `Maya: [conversational] Seventy-seven. The French alliance is seventy-eight, so Saratoga was seventy-seven, the year before. Burgoyne surrenders a whole army, and France believes Franklin. ...`
After: `Maya: [measured] Seventy-seven. But Trenton came first: Christmas, seventy-six, when Washington crosses the Delaware and captures the Hessian garrison, the counterstroke that saves a melting army. Then Saratoga, seventy-seven: Burgoyne surrenders a whole army, and France believes Franklin. The alliance of seventy-eight: money, guns, the fleet. Valley Forge in between, where von Steuben drills the army into shape. Saratoga and Yorktown: those are the two hinges.`
Tier-1 grounding — 5steps2024 ch10: "Washington retrieved the situation with a brilliant counterstroke. On the evening of December 25, he led his men across the Delaware River, surprising and capturing the Hessian garrison of Trenton, New Jersey." (preceding context: "desertions and expiring enlistments").

**M3 — Hamilton-musical claim cut per fail-closed (§7).** "The musical ends with the duel" is not
verifiable in Tier 1–2. Before: `Jay: [casual] The musical skips this part, huh.` /
`Maya: [thoughtful tone] The musical ends with the duel. It skips the part where Jefferson needed thirty-six ballots to land the job.`
After: `Jay: Bet the musical skips this part.` /
`Maya: Thirty-six rounds of voting doesn't exactly sing. His actual words at the inauguration: "We are all Republicans; we are all Federalists."`
(Jay's pop-culture knows-something beat survives as a hedged aside; Maya makes no claim about the musical.)

**M4 — Webster quote attribution hedged (§7).** Tier 1 (premium2027 ch05) carries the speller facts
but not the quote or the 1789 *Dissertations* attribution; the only provenance trail is web
verification (E11 v1 sources note), which Tier 1–2 does not accept. Fail-closed registry note added
as F-U3-057. Before: `Maya: [thoughtful tone] A republic needs its own culture: Webster's speller — and his seventeen eighty-nine line, "A national language is a band of national union," Peale, Trumbull, Crèvecoeur, the Capitol in stone.`
After: `Maya: [serious tone] A republic needs its own culture: Webster's speller — and the line credited to his seventeen eighty-nine Dissertations, "A national language is a band of national union" — Peale, Trumbull, Crèvecoeur, the Capitol in stone.`
Header Quotes line updated to match ("the line credited to his 1789 Dissertations — Tier-1 books confirm the speller facts, not the quote").

**Runtime:** 2,351 gate-counted words (was 2,339; +12 net from the Trenton beat and rewords), 38s pauses
unchanged → 13.7 min experienced. Cold-open promise kept at "about thirteen and a half minutes";
header figure updated to `~13.7 min experienced (2,351 words speech + 38s pauses)`.
**Gate:** working copy `apush-script-gates.py --minutes 13.5` → **13/13 PASS** (174 WPM; G8 9/10 em-dashes;
G9 exactly 2 antitheses). WARNs unchanged from v2 and intentional (W1 "We are" ×2 inside Jefferson's
verbatim inaugural quote — guide exempts quotes; W2 box-content enumerations, not decorative chains).
**Status:** Draft v3 repaired 2026-10-07, not pushed, not rendered. Awaits fresh Layer-2 re-read of the
repairs per the program (writer never validates their own work).
