# U3-E2 v2 — Changelog (clean rebuild, 2026-10-06)

## What changed from v1
- v1 was a scope sprawl: it taught the Sugar Act, Currency Act, Quartering Act, Stamp Act, Townshend Acts, Boston Massacre, Tea Act, Boston Tea Party, Coercive Acts, Quebec Act, First Continental Congress, AND Lexington/Concord in one episode — roughly four lessons' worth of CED 3.3–3.5. v2 is a clean rebuild scoped to the assigned topic only: the Sugar Act → Stamp Act resistance arc, i.e. the Stamp Act (1765), colonial resistance, virtual vs actual representation, and the Declaratory Act (1766).
- No prose, sentences, or jokes carried over from v1. The one v1 line that survived in spirit — the repeal/Declaratory "win that wasn't" framing — is reworded ("A repeal with fine print." / "Fine print that swallowed the repeal.") and is now source-anchored to princeton ch. 7 ("won the battle over the stamp tax, but not the war of principles").
- Structure rebuilt to the frozen guide: cold open (continuity nod "Last time: the bill came due," three boxes, time promise) → topics in conversation → recap (Maya drives, "Three boxes, let's land them") → self-test (three CER questions, spoken Claim/Evidence/Reasoning labels per the locked U3-E8 exemplar) → closer (one shared tagline, new words, once; single "next time" tease).
- Runtime rebuilt to the pause-honest standard: 1,884 spoken words + 63s scripted pauses = ~11.5 min experienced (v1 promised "~8.2 min" with no pause accounting). Post-repair count, updated after the de-labeling and Layer-2 repair pass (was 1,867 at first gates run).

## Scope decisions
- Sugar Act = reference-only. U3-E1 introduced it as Grenville's first postwar tax + the smuggling crackdown; v2 gives it exactly one continuity sentence in the cold open ("The Sugar Act landed and the smuggling crackdown began") and reuses it once as self-test evidence (it lowered a duty and still angered colonists). Never re-taught.
- Townshend Acts, Boston Massacre, Tea Act/Tea Party, Intolerable Acts, First Continental Congress, Lexington/Concord: all OUT — they belong to U3-E3 and later. The closer's single "next time" tease points only at U3-E3's opening territory: "Boston gets punished for the Tea Party, and twelve colonies answer by sending delegates to Philadelphia." Nothing beyond is named or hinted.
- Grenville's debt math, salutary neglect, the Proclamation, Pontiac: all U3-E1 territory, not repeated. The episode opens after the bill has come due.

## Validation results
- Gates: 13/13 PASS (`python3 apush-script-gates.py apush-audio-u3-e2-script-v2-DRAFT.md --minutes 12` → 1,884 words, 157 WPM). Exit 0. Final run after all Layer-3 repairs, incl. the new G13 no-spoken-CER-labels gate.
- Warnings dispositioned:
  - W1 uncontracted phrasing: fixed ("I did not know" → "I didn't know"). Clean on final run.
  - W2 possible triples: two remain, both intentional. (1) The three-box list in the cold open ("the Stamp Act, virtual representation, and the Declaratory Act") — format-required. (2) Maya's objection triple ("people I've never met, who couldn't find my town on a map, and I can't vote them out") — the one earned chain; the triple IS her argument against virtual representation. A third W2 (cold-open continuity list) was reworded away.
- Fact pass: every checkable claim verified against Tier 1 first (5steps2024 ch. 9, premium2027 ch. 5, princeton ch. 7, Norris "02 - NO Taxation without REPRESENTATION!" transcript), Tier 2 only where Tier 1 was insufficient (Gilder Lehrman + Avalon Project for the Nov 1, 1765 effective date; 1689 Bill of Rights clause taught only as the colonists' lawyers' reading). Four items disclosed under "Hedged / unverifiable" in the Sources footer, never taught flat.
- Self-check against apush-validator-checklist.md: stimulus quotes exact (the one quoted phrase, "in all cases whatsoever," matches 5steps); Otis maxim hedged with disclosure; no time-travel (modern voices only for the D.C. plates nod); no overclaims ("almost nobody" for independence sentiment); numbers real (header/cold-open/actual agree: 1,884 + 63s = 11.5 min).

## User ruling: no spoken CER labels (2026-10-06, new frozen rule)
- The open convention is resolved — REVERSED from the brief. The user ruled: "Bad tts is not allowed… fix it right way." Self-test model answers must NEVER speak "Claim:/Evidence:/Reasoning:" labels aloud. The CER shape stays (claim → evidence → reasoning logic), carried by natural connective tissue, never spoken labels.
- Applied to v2: all three model answers de-labeled in the U1-E7 approved style ("Actual representation. Taxation needs consent through a body you elected. Twenty-seven delegates from nine colonies signed that in October sixty-five, right after the Stamp Act, and the logic is that it's answering Parliament's virtual representation…"); all three question prompts had "Claim, evidence, reasoning:" stripped as well (TTS reads everything literally — the prompts spoke the labels too).
- Read note: the sentence "Maya's self-test model answers speak the Claim / Evidence / Reasoning labels aloud, per the locked U3-E8 exemplar" was DELETED and replaced with "Self-test model answers follow claim-evidence-reasoning logic in natural phrasing; no spoken labels (per the user's 2026-10-06 ruling)." The locked U3-E8 exemplar is being fixed separately (parent's note).

## Layer-2 validation + coordinator repair pass
- Fresh-agent Layer-2 verdict on the pre-repair draft: FAIL (conditional) — two required fixes. Tallies confirmed by the reviewer: 1,867 words at the time, Marcus turns ≤80, Maya 45% questions, 0 That's/Here's starters, 8 em dashes, antitheses at 2/2 cap, 6 micro-turns, zero retired phrases/twist pivots; quote integrity, exchange logic, time-travel, exam devices, voice, numbers all PASS.
- FAIL 1 (fixed): box two had no common-mistake line. Added after the second exam tip, third template: "And the trap here: don't write that the colonists told Parliament it had no power at all. In sixty-five they were denying one power, the power to tax them, while still calling themselves British subjects." (Tier-1 anchored: princeton ch. 7 — Otis did NOT advocate secession; colonists "never pushed" the delegation issue.)
- FAIL 2 (fixed): box-ownership inconsistency — the repeal was labeled box three in the body but recapped under box one. The "Box three" label now sits on the Declaratory Act passage ("Marcus: Box three. But the repeal came with company."), and the repeal closes box one, matching the recap.
- Framing softening (coordinator, fail-closed): "the very same day as the repeal, Parliament passed the Declaratory Act" outran Tier 1. princeton ch. 7 pins only "linked it to the passage of the Declaratory Act"; Gilder Lehrman dates it to the same month. Dialogue now says "Parliament linked it to the Declaratory Act," the prediction beat drops "the same day," the box-three mistake line says "Two things happened that month," the recap says "Same month as the repeal, sixty-six," and the Q3 model answer says "The Declaratory Act came linked to the repeal." Flagged for Layer-3 to confirm or tighten.
- Advisories applied: "burgess" glossed inline ("a young burgess, an elected assemblyman"); "Rewind to Virginia, May of sixty-five" frames the chronological backtrack; the trimmed-version line now explains why it worked ("kept the magic line the other colonies reprinted"). Antithesis budget stays 2/2, em dashes stay 8/10 (all edits used commas/colons — no new dashes).
- A fresh Layer-2 agent re-read the repaired draft (report pending at changelog write time).

## Layer-3 fact-check + coordinator repairs (2026-10-06)
- Fresh-agent Layer-3 verdict: 4 blocking items, 1 contested, rest confirmed. All 13 assigned watch items checked against Tier 1 (5steps ch. 9, prem27 ch. 5, princeton ch. 7, Norris/Maximum Insight/URP transcripts) and Tier 2 (Britannica Stamp Act article, fetched live).
- BLOCK 1 (fixed): "Took effect November first" — Nov 1, 1765 is historically correct but NOT pinned in Tier 1+2 (rests on Avalon/Gilder Lehrman, outside the frozen hierarchy). Dialogue now uses princeton's own phrasing: "By the time the tax was supposed to take effect, it was already dead on arrival." Same fix applied in the recap.
- BLOCK 2 (fixed): "March of seventeen sixty-six" / recap "Repealed in — March?" — the month is NOT pinned in Tier 1+2 (only "early in 1766," 5steps/Britannica). Dialogue now says "In early sixty-six"; the recap fumble became a Rockingham name-stumble ("replaced by — Rocking... / Marcus: Rockingham. / Maya: Rockingham. Right. Box one, checked.") — keeps the memory-check fumble kind without pinning an unpinnable month.
- BLOCK 3 (fixed): the 1689 Bill of Rights beat ("Parliament itself had written that levying taxes without Parliament's consent was illegal. The colonists' lawyers read it straight") — NOT pinned in Tier 1+2 as cited in the Stamp Act debate. Replaced with the Tier-1-safe version: "The old accepted precept: no Englishman could be compelled to pay taxes without his consent" (princeton), framed as the principle behind Otis's argument. Recap line updated ("Otis's pamphlet and the old no-tax-without-consent rule behind it"); the 1689 footer citation removed.
- BLOCK 4 (fixed): Q1 model answer said the Congress was "answering Parliament's virtual representation" — direction inverted. Tier 1 (prem27) sequences virtual representation as the British RESPONSE to the colonial cry, and the script's own box two agrees. Both the question ("what line did Parliament invent to answer it?") and the answer ("this is the cry Parliament's virtual representation line was invented to answer") now run the right direction.
- CONTESTED (resolved fail-closed): Virginia Resolves month — prem27 pins June 1765, standard chronology says May. Dialogue now pins NO month ("Rewind to Virginia, sixty-five"), disclosed in the footer.
- Framing softening applied: "'In all cases whatsoever' means the next tax is already legal" → "means Parliament was claiming the next tax as its right" (the Act asserted the right; future taxes still required acts of Parliament).
- Confirmed upgrades: dice and pamphlets are now Tier-2-confirmed (Britannica lists both explicitly) — removed from the hedged disclosures; the repeal↔Declaratory "linked"/"same month" phrasing confirmed at Britannica's "Simultaneously" level; "the smart colonists heard a promise and a threat in the same afternoon" confirmed in substance (parliamentary simultaneity is Tier-2-pinned; the script also preserves 5steps' sequential colonial experience in the adjacent exchange).
- Footer rewritten: Britannica Tier-2 findings recorded; Gilder Lehrman/Avalon/1689 moved to a "Disclosed (outside the frozen hierarchy — consulted, NOT used as dialogue support)" subsection.
- Final gates after all repairs: 13/13 PASS (incl. the new G13 no-spoken-CER-labels gate), 1,884 spoken words, 157 WPM, ~11.5 min experienced (1,884/180 + 63s pauses). Only the two intentional W2 warnings remain.
- Registry: added F-U3-012…F-U3-021 (10 entries; the writer's 8 staged facts adjusted to Layer-3 verdicts, plus F-U3-020 for the effective-date/repeal-month hierarchy gap and F-U3-021 for the 1689-beat gap). Two new falsehood patterns needed negation-safe lookaheads after G12 false-flagged explicitly-negated common-error lines ("the repeal wasn't won by the mobs alone," "Otis wasn't arguing for independence") — patterns refined, behavior-tested (negated = clean, true falsehood = match), G12 re-passes.

## New facts for the registry (coordinator: please add — do NOT edit the registry from this task)

- F-U3-012 — Stamp Act as the first direct/internal tax.
  correct: "The Stamp Act (1765) was the first time Parliament imposed a direct tax on the colonies rather than a customs duty on imported goods (5steps ch. 9); 'designed solely to raise revenue,' a direct tax not an indirect trade duty (prem27 ch. 5). It taxed printed matter — court documents, books, almanacs, deeds (prem27), wills, newspapers, playing cards (5steps) — and was broad-based, hitting lawyers especially (princeton ch. 7). Effective November 1, 1765 (gilder/avalon); payable in scarce hard currency (5steps). Never teach it as a customs/port duty."
  falsehoods: ["stamp act.{0,40}(was a |as a )?customs duty", "stamp act.{0,40}collected at the (docks|port)"]
  sources: [5steps, prem27, princeton, gilder]

- F-U3-013 — Virginia Resolves (May 1765): Henry's draft, trimmed before passage.
  correct: "Patrick Henry drafted the Virginia Stamp Act Resolves (May 1765) asserting only Virginia's own assembly could tax Virginians; the legislature removed his most radical propositions before passing (princeton ch. 7); not all resolves passed but all were written up and circulated through the colonies (prem27 ch. 5). Never teach the resolves as passed unanimously or unamended."
  falsehoods: ["virginia resolves.{0,40}(unanimous|unamended|in full|unchanged)"]
  sources: [princeton, prem27]

- F-U3-014 — Stamp Act Congress (Oct 1765): 27 delegates, 9 colonies, no independence talk.
  correct: "Stamp Act Congress, October 1765, New York: 27 delegates from nine colonies (Norris transcript); Declaration of Rights and Grievances asserted only representatives elected by colonists could enact taxes (prem27); 'No taxation without representation' became the rallying cry. Independence was not on anyone's mind — the goal was the fullness of rights as British subjects (Norris). Never teach the Congress as declaring/voting for independence or as thirteen colonies."
  falsehoods: ["stamp act congress.{0,60}(independence|thirteen colonies)"]
  sources: [prem27, 5steps, norris-transcript]

- F-U3-015 — Sons of Liberty crowd actions: agents forced out, Hutchinson's house, hot tar.
  correct: "Sons of Liberty (organized Boston, July 1765, Samuel Adams leading role — 5steps): stamp agents intimidated into resigning colony after colony; by the effective date 'not one of the Crown's appointed duty collectors was willing to perform his job' (princeton); Boston mob ransacked Lt. Gov. Thomas Hutchinson's home (prem27); tar-and-featherings used often-boiling-hot tar causing deep burns (Norris transcript)."
  falsehoods: []
  sources: [5steps, princeton, prem27, norris-transcript]

- F-U3-016 — Boycott won the repeal, not the mob alone.
  correct: "The nonimportation boycott (merchants' non-importation agreements; Daughters of Liberty spinning bees, homespun, household purchasing power — 5steps/prem27) was the effective weapon: British merchants, hurt by lost trade, lobbied Parliament for repeal (5steps ch. 9). Never teach the repeal as won by mob violence alone."
  falsehoods: ["repeal.{0,40}(won by|because of).{0,40}(mob|violence).{0,20}(alone|only)"]
  sources: [5steps, prem27]

- F-U3-017 — Virtual vs actual representation: whose theory, Otis's limits.
  correct: "Virtual representation was PARLIAMENT's theory: members represented the entire British Empire, colonists 'virtually represented' though they never voted (prem27). The colonial answer was actual representation: only their own elected assemblies could tax them (prem27); Otis's precept — no Englishman pays taxes without his consent — from *The Rights of the British Colonies Asserted and Proved* (princeton). Otis did NOT advocate secession/independence; he wanted seats in Parliament or colonial self-taxation, and colonists knew a delegation would be too small — they wanted the right to determine their own taxes (princeton). Never attribute virtual representation to the colonists; never teach Otis as pro-independence."
  falsehoods: ["virtual representation.{0,40}colonist.{0,40}(claim|argument|demand|position)", "otis.{0,60}(independence|secession)"]
  sources: [prem27, princeton]

- F-U3-018 — Declaratory Act (1766): repeal's companion, "in all cases whatsoever."
  correct: "Parliament repealed the Stamp Act (March 1766; Grenville already replaced by Rockingham, who had opposed the tax — princeton/5steps) and Rockingham LINKED the repeal to the passage of the Declaratory Act asserting the right to legislate for the colonies 'in all cases whatsoever' (princeton ch. 7; 5steps calls it a face-saving measure). Tier 1 pins 'linked it to the passage,' not a same-day pin — never pin 'same day' in dialogue unless Tier 1/2 pins it. 'The colonists had won the battle over the stamp tax, but not the war of principles over Parliament's powers' (princeton). Never teach the repeal as settling the constitutional argument."
  falsehoods: ["repeal.{0,40}settled.{0,40}(argument|dispute|question|issue)"]
  sources: [5steps, princeton]

- F-U3-019 — Otis maxim attribution is hedged, not verbatim history.
  correct: "'Taxation without representation is tyranny' is credited to James Otis via John Adams's recollection decades later; no contemporary record pins the exact wording — always hedge ('nobody swears to the exact words') and disclose. Never teach the maxim as a verified Otis quotation."
  falsehoods: []
  sources: [web]
