
## v6 final (2026-10-06) — post-repair, ready for lock
- Layer-2 found 3 major + 7 minor; repair applied all; fresh Layer-2 re-read
  passed 9/10, flagged one unlanded repair (mirror pair) + two pre-existing
  slop items.
- Coordinator fixed directly: mirror pair broken ("Nobody's money but theirs
  was on the line — which is exactly why the payoff could be enormous");
  "The pamphlet lost. The profits won." → "James's pamphlet never stood a
  chance against the money."; That's/Here's brought back to 2 ("That's when
  the first Africans arrive" → "The first Africans arrive that year").
- Layer-3: zero WRONG claims, nothing blocking; registry corrected
  (F-U1-018 sickness-exception note, F-U1-020 dropped Caracas/unverifiable
  figures + nps, F-U1-022 +nps, F-U1-026 re-sourced britannica).
- Final: 1,943 spoken words, 75s pauses → 12.04 min experienced;
  header, cold-open promise ("Twelve minutes"), and actual agree.
  Gates 12/12 green at 162 WPM @ 12 min.

## CER-label production fix — 2026-10-06
User order ("Bad tts is not allowed"): removed spoken "Claim:/Evidence:/Reasoning:"
labels from all 3 self-test model answers — TTS reads everything literally.
CER logic (claim -> evidence -> reasoning) preserved, carried by natural
connective tissue (em-dash pivots, "which means," "so," "the giveaway is").
Substance identical; header word count updated to 1,941; gates 12/12 PASS.

## v7 repair (2026-10-07) — fleet audit findings, all applied
- Audit found 2 blockers + 5 minors (fleet-findings/u1-e4-FINDINGS.md). Repair
  applied every one; fresh gates 13/13 PASS at 164 WPM @ 12 min.
- BLOCKER F1 (§5): all four common-mistake traps were announcer-voice
  proclamations; converted to live traps (Maya makes the mistake, Marcus
  catches her with a strong correction marker).
  - Box 1 before: `Maya: [firm] And the common mistake for box one: don't write that the king funded Jamestown. London merchants did, on a royal charter.`
  - Box 1 after: `Maya: Okay, box one's trap: the mistake I made five minutes ago. On the test I'd write "the king funded Jamestown" without thinking.` / `Marcus: [firm] Not quite. The king signed the charter; London merchants put up the money. Royal permission, private cash.` (Maya owns her earlier wrong beat instead of repeating it.)
  - Box 2 before: `Maya: [firm] And the common mistake: the headright gave land to the planter who paid, not the servant who sailed. Two boxes down.` (also a duplicate: same error already taught LIVE at the L59-60 beat)
  - Box 2 after: proclamation cut; the live trap taught at L59-60 stands unchanged (`Maya: So the workers each got fifty acres for coming over?` / `Marcus: [firm] The person who paid got the acres. The boss, not the boat ride. ...`), and the line now reads only the allowed mid-episode check-in: `Maya: Two boxes down.`
  - Box 3 before: `Maya: [firm] Common mistake for box three, then: don't write that everyone voted. Free men voted, and even that narrowed.`
  - Box 3 after: `Maya: So 1619, everyone votes. Democracy's here.` / `Marcus: [firm] That's not it. Remember the exclusions: free men at first, and the door narrowed from there.`
  - Box 4 before: `Maya: [firm] And the common mistake: 1619 didn't make Virginia a slave colony overnight. Servants still worked most of the fields for decades.`
  - Box 4 after: `Maya: So 1619 is when Virginia becomes a slave colony, right?` / `Marcus: [firm] Common mix-up, and exactly the one the question is fishing for. Africans arrive in 1619, but servants still worked most of the fields for decades. The full system comes later.`
- BLOCKER F6 (§7/§10): self-test stimulus quote had no Tier-1/2 source line
  (zero hits for "dig gold, refine gold, load gold" across books/, public_content/,
  and the registry). Resolved by citing the source: the line is Captain John
  Smith's own description of the Jamestown gold fever, verified on two Tier-2
  NPS pages — nps.gov/jame/all-that-glitters.htm ("all the men did was
  'dig gold, wash gold, refine gold, load gold,' wrote the exasperated
  Captain John Smith") and nps.gov/jame/learn/historyculture/life-of-john-smith.htm
  ("There was no talk, no hope, no work but dig gold, wash gold, refine gold,
  load gold"). The garbled paraphrase (missing "wash gold", attributed to an
  unnamed "one of them") is dropped; Smith is named as the writer.
  - Dialogue before: `... most were gentlemen. Sons of gentry, jewelers, men who'd never held a plow. They came hunting gold, not planting wheat. One of them wrote that in camp there was nothing but …dig gold, refine gold, load gold.`
  - Dialogue after: `... most were gentlemen, men who'd never held a plow. They came hunting gold; planting wheat could wait. John Smith wrote that the colonists did nothing but "dig gold, wash gold, refine gold, load gold."`
  - Self-test stimulus before: `Maya: One. A colonist wrote that in the Jamestown camp there was nothing but …dig gold, refine gold, load gold. What's the point of this source: why did Jamestown nearly starve?`
  - Self-test stimulus after: `Maya: One. John Smith wrote that the colonists did nothing but "dig gold, wash gold, refine gold, load gold." What's the point of this source: why did Jamestown nearly starve?`
  - Registry: added F-U1-065 (exact NPS-quoted line + falsehood pattern for the garbled version).
- MINOR F2 (§9): tag density 82.9% (63/76) → 27.8% (22/79). Stripped
  workhorse-default tags ([measured] on routine Marcus exposition,
  [conversational] body defaults, redundant [curious, inquisitive tone] on
  routine questions); kept catalog-consistent beats (cold open + sign-offs
  [professional broadcast tone], takeaways [confident tone], trap corrections
  [firm], grim [serious tone] ×2, genuine pushback questions
  [curious, inquisitive tone] ×6, Maya caught [incredulous], closer
  [intrigued]). Words unchanged.
- MINOR F3 (§8/§3): Maya feigned rediscovery of the 1619 box she named in the
  cold open, purely to feed Marcus's White Lion paragraph.
  - Before: `Maya: [curious, inquisitive tone] Same year, though — 1619. Wait, wasn't something else arriving that year too?`
  - After: `Maya: Now the other half of 1619 — the arrival I named at the top. Same year the assembly voted, a ship pulled into Point Comfort.`
- MINOR F4 (§5): exam-tip template repeated ("One exam warning for box two" /
  "One more exam warning, box four").
  - Before: `Maya: [firm] One more exam warning, box four: the 1619 double event is built for a compare question.`
  - After: `Maya: [firm] One to watch, box four: the 1619 double event is built for a compare question.`
- MINOR F5 (§8): Rolfe's "20 and odd" rendered as modernized paraphrase inside
  quote marks.
  - Before: `... Rolfe wrote it down himself: "20 and odd" Africans, traded for food.`
  - After: `... Rolfe wrote it down himself: "20 and odd Negroes ... bought for victuals."` (exact wording per the script's own Sources section and registry F-U1-022; splice marked with ellipsis)
- MINOR F7 (§7): "jewelers" / "sons of gentry" had no Tier-1/2 line (only
  princeton ch6's "many of them English gentlemen" supports it).
  - Before: `... most were gentlemen. Sons of gentry, jewelers, men who'd never held a plow.`
  - After: `... most were gentlemen, men who'd never held a plow.`
- Incidental (required for 13/13): G9 antithesis budget was already failing on
  v6 (7 antitheses, max 2). Reworded five: cold open ("starts planting, not
  just raiding" → "stops raiding and starts planting"), gold line ("hunting
  gold, not planting wheat" → "hunting gold; planting wheat could wait"),
  rescue line ("an adoption, not an execution" → "an adoption ceremony he'd
  mistaken for an execution"), servant/slave line (→ "enslaved Africans
  remained a minority"), self-test answer ("years of labor, not land" →
  "years of labor, never land"). Kept: "The boss, not the boat ride."
  (1/2 budget).
- Final: 1,963 spoken words, 75s pauses → 12:09 experienced; header, cold-open
  promise ("Twelve minutes"), and actual agree. Gates 13/13 green at
  164 WPM @ 12 min.
