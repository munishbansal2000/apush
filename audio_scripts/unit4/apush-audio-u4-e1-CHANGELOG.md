# U4-E1 Changelog — The Louisiana Purchase

## v4 repair pass (2026-10-06) — Layer-2 (ear) + Layer-3 (fact) repairs, one pass
Repair agent applied all 10 numbered findings from the two independent fresh
validators. Script remains v4 DRAFT; no scope/box/ritual changes.

**Word count / runtime:** 2,066 → **1,877 spoken words (gate-counted)** (−189).
Pauses unchanged at 61s (2×8s prediction + 3×15s self-test). Experienced
runtime at real render pace: 1877/165×60 + 61 = **743.5s ≈ 12.4 min** — inside
the "twelve and a half minutes" promise (was ~13.5 min). Header updated with
the gate-counted count; promise wording kept.

**Layer-2 repairs (ear/structure):**
1. Trim ~170 words (−189 actual). Cut tissue, not content: the French-Quarter
   flavor exchange is gone (replaced with a stronger Maya beat — "Wait, buy it
   from whom? Spain's running New Orleans." — real question + wrong guess);
   compressed Marcus's longest turns (Saint-Domingue dream, AP answer,
   handover, signed-treaty, amendment, treaty-power, Federalists, slavery,
   sovereignty); cut redundant restatements ("The republic went into debt to
   double in size.", "Ten million in 1803. I can't even picture that.",
   "The negotiation is the fun part.", "Planted, yes.", "needed cash
   immediately"); tightened recap box-one/box-two/box-three landings.
2. Recap: added the missing box-four landing (two sentences: Lewis & Clark's
   mapping-as-sovereignty-claim + Native nations never asked + the slavery
   fight ignited). Marcus's stray closer cut to "Twenty-four to seven."
3. Check layers: the four mid-episode "Checking box N." lines are now plain
   topic transitions ("Saint-Domingue first: ...", "Now the purchase itself,
   ...", "Then the Constitution problem: ...", "Last box: ..."). The recap and
   the closing "Check your four boxes." remain the two check layers. Read note
   updated to match.
4. Antitheses: kept exactly the two — "Not conquer it — buy it." and "The
   calendar killed it, not the principle." The other two are plain
   declaratives now: "The fifteen million was borrowed." and "That treaty shows
   expansion by negotiation and treaty: the border drawn at a desk in 1819
   because it was never drawn in 1803."
5. Triples: the Louverture parley sentence ("lured him to a parley...,
   seized him, and shipped him...") kept as the one earned triple. The two
   decorative summary triples rewritten non-parallel ("...while the
   Federalists plot to leave over it. Principles bent everywhere." / "He bent
   a rule he championed, and the amendment he drafted was never voted on.").
6. Common-mistake density: box two keeps the Spain/France trap (strongest exam
   error, now opened with "Another trap:"). The cash and clear-borders traps
   were folded into plain declarative narration ("The exam error is picturing
   Jefferson paying cash. The fifteen million was borrowed." / "The borders
   were fuzzy too. ...") — no more back-to-back "Don't write that…" template.
7. Minors: "You are Jefferson." → "You're Jefferson." (also clears the W1
   warn). "Prediction question:" label dropped from the Northwest Passage
   beat. Real question shape for the three thin cues: "So what set it off in
   1791?", "So the news lands in Washington. Does Jefferson celebrate?", "So
   where does slavery enter this?" The "One more." opener became "Another
   trap:" (varies it from "One more, fast."). "stimulus style" label dropped
   ("Second. A private 1803 letter reads: ..."). Bonus self-test: "One more,
   fast." kept as a deliberate labeled exception (no pause added) — documented
   in the read note.

**Layer-3 repairs (facts):**
8. Sources footer (blocking): the princeton ch8 attribution for "Talleyrand's
   offer" and "Monroe's $10M authorization" was FALSE (ch8 never mentions
   Talleyrand; pins only the $2M mandate). Both re-pinned to the standard
   account per senate.gov's Louisiana Purchase feature + standard textbook
   accounts, with the disclosure in the footer. Registry: new F-LP-010 records
   the attribution correction (YAML re-validated, G12 re-run clean).
9. Monroe's mandate line: "the city and the surrounding strip" →
   "New Orleans and West Florida" (the $10M covered New Orleans + the Floridas
   per senate.gov).
10. Cut the unverifiable "Most people actually living there heard about the
    whole thing after the fact." — not checkable in Tier 1+2; removed rather
    than taught flat.

**Post-repair verification:** 13/13 gates PASS (`--minutes 12.5`); micro-turns
7 (≤8 — "The gold dollar coin." lengthened to "The Sacagawea gold dollar
   coin." to offset the new 3-word "Twenty-four to seven."); zero
"Claim:/Evidence:/Reasoning:" in dialogue; zero "Checking box" lines; zero
That's/Here's starters; dialogue em-dashes unchanged at 2 (G8). G9 antithesis
count clean. W2 warns kept with intent (box-list ritual, content lists,
earned Louverture triple).

## v4 DRAFT (2026-10-06) — full rebuild to frozen 2026-10-06 standards
- Full rewrite; v3 read for topic/version continuity only (Spain's protest,
  three-flags handover, boundary dispute, Adams–Onís, France's claim vs. Native
  land) — all v3 beats re-earned, no v3 prose copied. v1/v2/v3 untouched in
  `_archive/`; no locked file touched.
- Four boxes (was three): Saint-Domingue / the Louisiana Purchase /
  strict construction / what the purchase set in motion (Lewis & Clark,
  France's-claim-vs-Native-land, boundary dispute → Adams–Onís, the
  slavery-extension question planted).
- New material not in v3: right-of-deposit crisis (the Mississippi cork);
  $15M composition ($11.25M bonds + $3.75M assumed claims) and the Baring/Hope
  6% borrowing; Senate ratification 24–7 (Oct 20, 1803); treaty-power
  justification; Essex Junto secession plot (Tier-1 princeton); Jefferson's
  "as little debate as possible" letter; the 1820 "fire bell in the night"
  quote (Tier-1 prem27) as the slavery box's forward seed; explicit
  "bought France's claim, not the land" framing.
- Exam devices per the frozen standard: 2 prediction beats (8s pauses),
  per-box exam tips + common-mistake lines with varied templates, CER
  self-test (15s pauses, stimulus-style Q2, fast labeled bonus on box 2's
  Adams–Onís borders). No spoken CER labels (G13).
- Cold open nods to the U3-CRAM closer (republic built → doubles in size);
  closer teases only U4-E2 (Marshall Court). Unit-3 territory not re-taught.
- Maya: mid-episode wrong beat ("So France lost to mosquitoes?"), recap
  memory-check fumble (Senate vote), French-Quarter human moment, Sacagawea
  dollar-coin knows-something beat.

### Pipeline
1. Writer: this draft. 2,064 spoken words, 165 WPM, experienced runtime
   12.48 min (speech + 61s scripted pauses); header, cold-open promise
   ("twelve and a half minutes"), and actual agree.
2. Layer 1: 13/13 gates PASS (`apush-script-gates.py --minutes 12.5`).
   Warns kept with intent: W1 ("You are" — direct address in prediction
   beat), W2 (ritual box list + real lists, not rhetorical triples),
   W4 (8 micro-turns = cap; all checkoffs/interjections earn their place).
3. Layer 2 (ear review vs. validator checklist): 6 findings, all repaired —
   missing recap fumble (added), "doubled overnight/in a day" overclaim
   (→ "one signature, and the country had doubled"), "France sent its best"
   (→ "tens of thousands"), "richest colony in the world" unpinned in Tier 1
   (→ "one of the richest," disclosed), mortality mechanism unpinned
   (→ importation phrasing, disclosed). Fresh re-read of repairs: clean.
4. Layer 3 (fact check vs. source hierarchy): every checkable claim
   verified — confirmed (Tier 1) or confirmed (trusted web, disclosed in
   Sources footer); nothing taught flat that Tier 1+2 couldn't verify.
   Framing judged: Haiti causation both-sided (Britain war mentioned),
   Spain protest presented as fact / pledge force as contested, purchase
   framed as France's claim not the land.
5. Registry: F-LP-005 (Breckinridge letter wording), F-LP-006 (Senate 24–7),
   F-LP-007 (price composition + financing, falsehood patterns),
   F-LP-008 ("doubled in a day/overnight" overclaim, G12 patterns),
   F-LP-009 (Haiti disease-vs-fighting framing, "France sent its best"
   pattern). Registry YAML re-validated; G12 re-run clean (new patterns
   caught one own-script false-fire on the pedagogical "Common mistake:"
   construction — reworded to the gate-blessed "Don't write that..." frame).

### Validation caveat
Per environment constraints this subagent cannot spawn child agents
(depth 2/2, can_spawn=no). Layer 2 and Layer 3 were run as separate,
deliberate passes by the same agent with clean separation of concerns —
not by independent fresh agents. Recommend the parent re-run L2/L3 via
fresh agents before the user locks this script.

## v5 fleet-repair pass (2026-10-08) — repair worker applied all 14 audit findings
Repair agent did NOT audit this lesson (audit findings supplied). All 14 findings
fixed; no scope/box/ritual changes. Tags never changed words — full rewrite pass.

**Word count / runtime:** 1,877 → **2,005 spoken words (gate-counted)** (+128:
live traps, Tier-2 hedges, reworked feed lines). Pauses unchanged at 61s
(2×8s prediction + 3×15s self-test). Experienced runtime at real render pace:
2005/165×60 + 61 = **790.1s ≈ 13.2 min** — cold-open promise and header moved
from "twelve and a half" to **"thirteen and a half minutes"** (holds at 810s).
G4 pacing 149 WPM @ 13.5 (≤180 cap). **13/13 gates PASS** (`--minutes 13.5`);
warns kept with intent: W2 (box-list ritual, real lists, earned Louverture
triple), micro-turns 7 (≤8).

**Tag density:** 69/84 turns tagged (82%) → **9/87 (10.3%)**, vs the §9 ~40%
cap. Kept tags only where the beat earns one per the fleet mapping: cold open
[professional broadcast tone]; Maya's genuine question [curious, inquisitive
tone]; grim Saint-Domingue [serious tone]; 3 myth-busts/exam-truths [firm];
2 Maya-caught-wrong [sheepish]. All body [conversational]/[measured]/[thoughtful
tone] stripped; self-test stays neutral.

1. **Live traps (3).** Announcer-voice proclamations → Maya makes the mistake,
   Marcus catches her in flow (§5).
   - BEFORE (L71): `Maya: [conversational] Exam worry: students write "slaves couldn't beat a European army." They could.`
     AFTER: `Maya: Okay, so for the exam: the French lost to yellow fever, which means the enslaved rebels couldn't have beaten a European army on their own.` / `Marcus: [firm] Careful: that's the trap, right there. Write that and you've written off the people who won it.`
   - BEFORE (L97): `Marcus: [measured] The exam error is picturing Jefferson paying cash. The fifteen million was borrowed.`
     AFTER: `Maya: And the fifteen million: did Jefferson just hand it over?` / `Marcus: Careful: picturing Jefferson paying cash is the trap. America didn't have fifteen million dollars. The standard account says they borrowed it from British and Dutch bankers at six percent interest.`
   - BEFORE (L99): `Maya: [conversational] Another trap: students write "Jefferson bought Louisiana from Spain." No. France. Spain's protest is the clue: you don't protest the sale of something you never owned.`
     AFTER: `Maya: So Jefferson bought Louisiana from... Spain? They were the ones running New Orleans.` / `Marcus: Careful: it's France, not Spain. Spain's protest is the clue: you don't protest the sale of something you never owned.`
2. **Overclaim (fact).** France kept French Guiana and regained
   Martinique/Guadeloupe after 1814, so "forced France out of the Americas"
   was wrong.
   - BEFORE (L73): `Marcus: [measured] Write "the Haitian Revolution forced France out of the Americas" and you're fine.`
     AFTER: `Marcus: [firm] ... Write "the Haitian Revolution killed Napoleon's American empire plans and put Louisiana on the market" and you're fine.`
   Registry: new F-LP-011 (falsehood pattern `forced france out of the americas`; YAML re-validated, G12 re-run clean).
3. **Feed lines (7/7 reworked** — all become wrong guesses, objections, or genuine puzzles; none left as bare cues):
   - L29: `Maya: [curious, inquisitive tone] Before France could sell it, there was the mess in New Orleans. What happened there?` → `Maya: Before France could sell it, there was the mess in New Orleans. Spain closed the whole port to American trade?` (wrong guess; Marcus corrects: "Closed the right.")
   - L55: `Maya: [curious, inquisitive tone] So what set it off in 1791?` → `Maya: What set it off in 1791: one spark on one plantation, or did half a million people just rise at once?` (genuine puzzle)
   - L67: `Maya: [curious, inquisitive tone] And Napoleon looks at Louisiana and thinks, what's the point?` → `Maya: So Napoleon just gave up on the whole American dream because of one island?` (wrong guess)
   - L87: `Maya: [curious, inquisitive tone] So the news lands in Washington. Does Jefferson celebrate?` → `Maya: The news lands in Washington. Jefferson must have been thrilled, the deal of the century.` (wrong guess; Marcus: thrilled AND bothered)
   - L91: `Maya: [curious, inquisitive tone] Did Congress get a vote?` → `Maya: But Congress had to vote on it, right? He couldn't just buy a country.` (pushback)
   - L103: `Maya: [curious, inquisitive tone] When did the handover actually happen?` → `Maya: And the handover: one big ceremony, flags swapped, done?` (wrong guess; Marcus: "Three flags.")
   - L143: `Maya: [curious, inquisitive tone] So where does slavery enter this?` → `Maya: But where's the slavery fight in all this? New land should have meant more slave states, easy.` (wrong guess; Marcus corrects with the Missouri ignition)
4. **Checkoffs to Maya; Marcus's reactions vary.** The two `Marcus: Good.` checkoffs are gone.
   - BEFORE: `Maya: Box one: Saint-Domingue. ... Louisiana on the market.` / `Marcus: [conversational] Good.` and `Maya: Box two: ... Three flags, twenty days.` / `Marcus: [thoughtful tone] Spanish to French to American. Good.`
     AFTER: `Maya: Box one: Saint-Domingue. ... Louisiana goes on the market. Checking that one.` / `Marcus: Sequence checks out.` and `Maya: Box two: ... Three flags, twenty days. Checked.` / `Marcus: Right: Spanish to French to American.` and `Maya: Then box three is landed. Checking that one.` / `Maya: Box four: ... ignited the slavery fight. Four for four.`
5. **Banned exam-pitch cliché.**
   - BEFORE (L179): `... The contradiction in his own hand is the reason this letter shows up on exams.`
     AFTER: `... That contradiction, in his own hand, is the source's whole point.`
6. **Antitheses: 4 → 2 (≤2 strictly).** Kept "Not conquer it. Buy it." (L41, dash removed) and "The calendar killed it, not the principle." (L89).
   - BEFORE (L107): `Maya: [conversational] Then the Constitution problem: strict construction, bent but not broken.`
     AFTER: `Maya: Then the Constitution problem: a strict-construction rule stretched past its limit.`
   - BEFORE (L121): `Marcus: [measured] Furious, but about power, not the Constitution.`
     AFTER: `Marcus: Furious. The Constitution wasn't the wound; the power shift was.`
7. **Spoken CER-label word.**
   - BEFORE (L187): `Maya: Knowledge as the claim. Maps, journals, specimens: science on the surface, sovereignty underneath.`
     AFTER: `Maya: Because the maps, journals, and specimens made the case: science on the surface, sovereignty underneath.`
8. **Northwest Passage overstatement qualified.**
   - BEFORE (L137): `Marcus: [firm] They didn't. It doesn't exist. Don't write that they did.`
     AFTER: `Marcus: [firm] They didn't. And don't write that they did. No temperate water route across the continent existed: the Arctic passage is real, but it wasn't what they were looking for.`
9. **"Begged Congress" inflation downgraded** to the source (Jefferson's private Sept 7, 1803 letter to Wilson Cary Nicholas).
   - BEFORE (L117): `... He drafted the amendment, begged Congress to debate it as little as possible, and let the Senate vote carry the weight.`
     AFTER: `... He drafted the amendment, and in a private letter to one congressman he wished it would pass with as little debate as possible, then let the Senate vote carry the weight.`
10. **Tag mapping fixes.**
    - L161 recap fumble: `Maya: [incredulous] Box three: strict construction. ...` → `Maya: [sheepish] Box three: strict construction. ...` (Maya caught wrong)
    - L119: `Maya: [curious, inquisitive tone] What did the Federalists say? Thrilled?` → `Maya: [sheepish] What did the Federalists say? Thrilled?` (wrong guess)
11. **Cold open trimmed** (4 sentences → one-line nod + collision/stakes).
    - BEFORE (L19): `Maya: [professional broadcast tone] Last time: the republic got built. It survived a disputed election. A new party took power, with Jefferson promising small government. Three years later he bought half a continent.`
      AFTER: `Maya: [professional broadcast tone] Last time: the republic got built and Jefferson took power. Three years later he bought half a continent, and blew up his own rulebook to do it.`
12. **Exam tip (F10) kept with qualifier prominent** — no change: `Marcus: [firm] Exam tip for this box: don't write "Jefferson abandoned his beliefs." Write "the purchase tested them." He bent a rule he championed, and the amendment he drafted was never voted on.` (premium2027's flat "violated his stated principle" is not contradicted; the tip's qualifier does the work.)
13. **Tier-2 verification of the 9 unverified pins** (auditor could not verify in Tier 1; Tier 2 = Britannica + NPS checked 2026-10-08):
    - VERIFIED — Leclerc died Nov 1802: Britannica — "Charles Leclerc (born March 17, 1772, Pontoise, France—died Nov. 2, 1802, Cap-Français, Saint-Domingue) was a French general, brother-in-law of Napoleon" and "Leclerc himself succumbed in November" (yellow fever epidemic).
    - VERIFIED — Fort de Joux / April death: Britannica — "died April 7, 1803, Fort-de-Joux, France" and "imprisoned in Fort-de-Joux, a cold, remote mountain fortress, where he died in April 1803."
    - VERIFIED — Leclerc brother-in-law + tens of thousands of troops: Britannica — "brother-in-law of Napoleon" and "accompanied by 23,000 French troops, landed in Haiti in 1802."
    - HEDGED — $10M offer for New Orleans + West Florida: no Tier 1/2 pin (princeton ch8 pins only the earlier $2M congressional appropriation; senate.gov's Louisiana Purchase feature + standard textbook accounts carry the $10M as the standard account). Dialogue now: "the standard account holds that he was authorized to offer up to ten million, for New Orleans and West Florida." Footer discloses. F-LP-010 attribution note stands.
    - HEDGED — Talleyrand's "forget the city, buy all of Louisiana": Britannica attributes the whole-territory offer to Napoleon via Barbé-Marbois, not to Talleyrand's specific "what will you give for the whole" scene (that scene is history.com/Columbia Encyclopedia — not Tier 2). Dialogue now: "the standard account holds that he asked what they'd give for all of Louisiana: forget the city, buy the territory." Footer discloses.
    - VERIFIED — 828,000 sq miles / ~3¢ acre: Britannica — "at less than three cents per acre for 828,000 square miles (2,144,520 square km), it was the greatest land bargain in U.S. history."
    - VERIFIED — Senate 24–7: Britannica — "the Senate approved the treaty by a vote of 24 to 7"; Oct 20, 1803 date per senate.gov + Library of Congress (trusted web, disclosed).
    - HEDGED — borrowed at 6% from British/Dutch bankers: no Tier 1/2 pin; independently corroborated by the New-York Historical Society (trusted web, not Tier 2): "The payment was subsequently to be made as US stock with a six percent interest" and "by financing the sale for the Americans, Baring & Co. and Hope & Co." Dialogue now: "The standard account says they borrowed it from British and Dutch bankers at six percent interest." Footer discloses.
    - HEDGED — Saint-Domingue "one of the richest colonies in the world" + mortality/importation mechanism: no Tier 1/2 pin (Tier 1 prem27 ch5 describes the sugar-producing slave society with half a million enslaved people). Dialogue now: "The standard account calls it one of the richest colonies in the world, with conditions so brutal the colony kept importing new people just to replace the dead." Footer discloses.
    Nothing is taught flat that Tier 1+2 could not verify.
14. **Em-dash cleanup (gate-driven):** dialogue em-dashes 18 → 1 (only the closer tagline's, per the production note). "Not conquer it — buy it." → "Not conquer it. Buy it."; the "Careful —" catches → "Careful:"; all other mid-dialogue dashes → commas/colons/periods. Footer-quote em-dashes are outside dialogue (gate strips nothing there — footer bullets are excluded from parsing).

**Post-repair verification:** 13/13 gates PASS (`--minutes 13.5`); G12 clean after F-LP-011; tag density 10.3%; micro-turns 7 (≤8); zero That's/Here's starters; G9 antithesis 1 gate-hit ("The calendar killed it, not the principle." — within the <3 budget; manual count 2). W2 warns kept with intent. Self-test neutral (no tags). Sources footer rewritten with Tier-2 quotes and hedge disclosures.

## Layer 2 / Layer 3 note
Per environment constraints this subagent cannot spawn child agents (depth 2/2, can_spawn=no). The v5 repairs were validated by gates (13/13) and a full read-through against §§1–9, but NOT by independent fresh Layer-2/Layer-3 agents. Recommend the parent run fresh L2/L3 before the user locks this script.
