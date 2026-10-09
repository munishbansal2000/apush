# U3-E1 v2 Changelog — "The Bill Comes Due" (Episode 18)

## 2026-10-09 — review fixes (video2/out/review/scripts-e1-e3.md)
- Debt trap: Marcus now opens "Close, but don't pin a number..." (Maya's figure wasn't wrong, just unsourced).
- Geography correction: "The land between the mountains and the Mississippi was the prize; the Appalachians were the fence."
- Troop prediction beat now answers the question ("The minister sleeps best"); Boston colonist folded into the settler's answer.
- Paxton line: cut "London got the message ... The Proclamation was the first pour" (timeline error, contradicted "bandage") -> "every policy after that landed on it."
- "Gage broke the rebellion" -> "Gage's forces wore the rebellion down."
- Self-test Q2 answer: dropped "debt ... managed" and "territory stayed British"; now "The debt and the territory mattered, but mostly for what they did to trust."
- Runtime: 1,887 spoken words + 50s pauses = 11.3 min; header and cold-open promise ("Just over eleven minutes") updated.

## What changed vs v1 (full rebuild, fresh prose — nothing copied)
- **Debt discipline (F-U2-064):** v1 taught "roughly one hundred forty million pounds, about double the debt" with interest "more than half the government's budget." Both are registry-forbidden (no pinned figure, no "doubled" in Tier 1+2). v2 uses only the books' language — "enormous" — and Maya says so in the recap ("No number; the books won't give me one").
- **Fort-count discipline:** v1's "eight of the twelve British frontier forts fell" was not in Tier 1. v2 uses premium2027's own account: Detroit first, then six other forts, several forts captured west of Detroit.
- **Proclamation quote:** v1 quoted "should not be molested or disturbed" as the Proclamation's words. That phrasing is not verifiable in Tier 1+2; v2 paraphrases the promise throughout (and says so in the read note). Stimulus self-test question describes the promise instead of printing it.
- **Smallpox blankets:** now rides on Princeton (Tier 1: "germ warfare... smallpox-infected blankets... to help defeat the Ottawa"). The Fort Pitt site-name is standard-accounts-only — disclosed in the footer, named once.
- **Troop figure:** "roughly ten thousand soldiers" — hedged, footer-disclosed as commonly taught but not Tier 1–2 pinned.
- **Washington's Ohio claims:** now sourced (Library of Congress, "Washington as Land Speculator") instead of v1's "assumed, not independently verified."
- **Structure rebuilt to the frozen 2026-10-06 standards:** cold open ≤30s with continuity nod ("Last time: ..." → U2-E10's cram) + circle ritual + experienced-time promise; 2 prediction beats (9s); per-box exam tip + common-mistake line with varied templates; one mid-episode checkoff + full recap as the check layer; "Three questions, AP-shaped" self-test with 15s CER pauses; one "next time" in the closer (Sugar Act → Stamp Act → Declaratory Act territory named, not taught); tagline in new words, once.
- **Maya rebuilt as a person:** Blue Ridge Parkway human moment; Pontiac-car pop-culture beat (hedged in-dialogue: "The car company always said it was"); messily wrong mid-episode (punishment-of-the-colonies read — "that was my whole read") plus two distinct recap fumbles (Mississippi/Appalachians memory-check; Delaware-prophet content-fumble). 9 of 35 lines end in ? (≤60%).
- **Sub-topics folded under boxes:** debt + Grenville under Box 1; 10,000 troops + Washington's speculation under Box 2; Neolin, Fort Pitt blankets, Paxton Boys under Box 3.

## CER-label convention (frozen choice)
Following the LOCKED U3-E8 exemplar and U2-E10 v2: self-test model answers speak "Claim: / Evidence: / Reasoning:" labels aloud. Applied to all three self-test answers.

## Validation status (all three layers complete, 2026-10-06)
- **Layer 1 (apush-script-gates.py, --minutes 12): 12/12 PASS** — final: 1,887 spoken words (pause tags stripped), 63s scripted pauses (2×9s prediction + 3×15s CER) → 11.5 min experienced at 180 WPM; header, cold-open promise ("eleven and a half minutes"), and actual all agree. Initial run found 3 fails (G1 starter density, G7 pause tags named in read note, G9 antithesis budget) + G4 at the default 8-min arg; coordinator repaired all (read note now names [9-second pause]/[15-second pause]; antithesis budget enforced at 2; em-dash trim 38→10→9). W2/W5 warns are false positives / warn-only.
- **Layer 2 (clean-context ear read + validator checklist): two passes.** First pass: 8 findings repaired — numbers agreement (header now 1,887/11.5), antithesis budget to ≤2, That's-tic (strict starters + "And that's…" → 2 remaining), 2 parallel mirror pairs broken ("London counted the money. The colonies counted what the war had cost them."), duplicate "next time" removed ("A story for next time" → "The taxes get their own episode."), transition tease reassigned to Maya ("But the frontier's already on fire."), mid-episode check-ins folded to one ("Box one, done") + recap, exam-tip/common-mistake openers all varied. Fresh re-read of the repaired draft: 4 more findings repaired — third antithesis form caught ("police the colonists, not protect them"), "That's the box." cut (checkoffs now Maya's), "Won X, lost Y" cadence ×4 reduced to 1 ("So the win was the bill." / "Taking the forts cost them the room." / "Won the world — and emptied the treasury."), Maya echo-paraphrases reduced; word count confirmed ~1,887 (re-read agent's 1,890 within tokenization noise; gates' count is canonical).
- **Layer 3 (dedicated fact-check): 6 findings, none factually wrong — all "unverifiable in Tier 1+2."** Repaired: Washington line re-sourced to Britannica (speculation + resentment of crown limits; LOC citation retired); troop purpose reworded to "enforce the line and keep a burning frontier quiet" (no "French rematch"); frontier-war cost claim softened to "more than an empty treasury could bear"; colonist counter trimmed to Princeton's sourced form (soldiers, not assembly war taxes); Paxton Boys month dropped (Tier 1 pins only 1763); Pontiac's "council" → "organized the resistance." Non-blocking softeners applied: Fort Pitt now hedged in-dialogue ("by the usual account"); SAQ-2 evidence reworded ("the debt was a policy problem that later governments managed"). Framing confirmed: triage-not-revenge is book-backed (F-U3-004); debt held to "enormous" (F-U2-064); Burke 1775 coinage confirmed (F-U2-043). 67 registry falsehood patterns: 0 hits in dialogue.
- **Final state:** 1,890 spoken words + 63s pauses = 11.5 min experienced; 12/12 gates; two clean-context Layer-2 reads (last one on the final draft); one Layer-3 fact pass with all findings repaired; registry updated same day.
- **Final repair round (from the fresh Layer-2 re-read):** "Won X, lost Y" cadence ×4 reduced ("So the win was the bill." / "Won the world — and emptied the treasury." / "Taking the forts cost them the room." — tagline keeps the cadence as the land-line); third antithesis form cut ("police the colonists, not protect them" → "police the colonists."); "That's the box." cut (Marcus no longer does checkoffs — Maya's line recast as "The Proclamation Line of 1763, in one line: ..."); cold open trimmed ~4 words. Recap fumble restructured into one sentence ("Pontiac, the Delaware prophet — no, wait: Pontiac the Ottawa chief, 1763") after G12's sentence-splitting flagged the two-sentence form; F-U3-003's falsehood patterns refined with negative lookaheads so they don't fire on the script's own correction dialogue (discipline: patterns must not block explicitly corrected common-error pedagogy). A fresh-agent spot-check of the repair lines confirmed them clean (report below).

## Registry facts verified this session (coordinator: please add — full text in the script's Sources footer)

## Registry facts verified this session (coordinator: please add — full text in the script's Sources footer)
- F-U3-002: Grenville's case vs colonist counter (princeton ch. 7).
- F-U3-003: Neolin's 1760–61 vision (prem27 ch. 5).
- F-U3-004: Proclamation motives — response to Pontiac's outbreak; avoid warfare costs + fur-trade profits; never "punishment of the colonies" (prem27 ch. 5).
- F-U3-005: French gift-diplomacy vs Amherst "demeaning"; Native reading of gifts as "dominance and protection" (prem27 ch. 5).
- F-U3-006: British "germ warfare" smallpox blankets vs the Ottawa (princeton); Fort Pitt site-name beyond Tier 1–2 — hedged in-dialogue ("by the usual account") + disclosed.
- F-U3-007: Paxton Boys — 1763 Conestoga attack (20 dead, many Christians; no month taught); ~250 marched on Philadelphia; "Apology" (prem27 ch. 5).
- F-U3-008: Proclamation "established a pattern of demarcating 'Indian Territory'" later adopted by the US (princeton).
- F-U3-009: ~10,000 postwar troops — commonly taught, NOT Tier 1–2 pinned (hedge + disclose).
- F-U3-010: Washington's western land speculation and resentment of crown limits on westward movement (Britannica).
- F-U3-011: Rebellion toll 400+ soldiers / ~2,000 colonists; Amherst→Gage Aug 1763; "finally broken by Gage"; bloodshed into 1764 (prem27 ch. 5).
- Framing facts: troop purpose taught as "enforce the line and keep a burning frontier quiet" (no "French rematch" — unverifiable in Tier 1–2); colonist counter kept to Princeton's sourced form (soldiers, not assembly war taxes); Pontiac "organized the resistance" (council detail not in Tier 1–2).

## Open questions / notes for the coordinator
- The "roughly ten thousand soldiers" figure rides on footer disclosure (hedged in-dialogue, F-U3-009). If the user's bar hardens on it, the line to change is Maya's prediction-beat-2 setup ("roughly ten thousand soldiers").
- Sugar Act appears only as a desk-tease ("The taxes get their own episode.") — U3-E2's territory untouched. No U3-E6/U3-E8 content referenced.
- No audio rendered; nothing pushed; ~/workspace/apush/ untouched (read-only for this rebuild).

## CER-label production fix — 2026-10-06
User order ("Bad tts is not allowed"): removed spoken "Claim:/Evidence:/Reasoning:"
labels from all 3 self-test model answers — TTS reads everything literally.
CER logic (claim -> evidence -> reasoning) preserved, carried by natural
connective tissue (em-dash pivots, "which means," "so," "the giveaway is").
Substance identical; header word count updated to 1,879; gates 12/12 PASS.

### prompt-label follow-up — 2026-10-06
Independent re-read caught two self-test question PROMPTS still speaking the
banned labels ("Claim, evidence, reasoning: go."). Stripped to "Make your case."
Gates 12/12 PASS.

## v3 repair — fleet audit findings (2026-10-07)

Auditor: 4 blockers, 4 minors on v2. All repaired below. Words changed only
where the findings required it; the B1 retag changed no words. Gates re-run
on the final draft with the working copy (`your_files/apush-script-gates.py`,
carries the G12 wrong-beat exemption), `--minutes 11.5`.

### B1 — direction-tag density 83.9% → 38.1% (§9)
Stripped every workhorse/neutral-default tag: `[conversational]` ×20,
`[measured]` ×16, `[thoughtful tone]` ×4 — all gone. Tags kept only on
§9-canonical beats: cold open `[professional broadcast tone]`; takeaways
`[confident tone]` ×5; myth-busts/exam truths `[firm]` ×4; Maya's genuine
questions `[curious, inquisitive tone]` ×2; Maya caught-wrong `[sheepish]`
×1; grim passages (smallpox, Paxton Boys) `[serious tone]` ×3; recap
self-corrections `[catching]` ×2; the troop-figure prediction beat
`[speaking slowly]` ×1; closer `[intrigued]` ×1; sign-off tagline
`[professional broadcast tone]` ×2. 24 of 63 turns tagged = 38.1%.
Self-test stays fully neutral (no tone tags on questions or answers).
No paralanguage, no `[emphasis]`.

### B2 — box-1 announcer trap → live trap (§5)
Before:
`Marcus: [firm] And the mistake to avoid for this box: pinning a number on that debt. The books say "enormous." Use their word, not a figure you can't source.`
After — Maya commits the genuine classic error, Marcus catches her:
`Maya: The debt was a hundred and forty million pounds? Putting that on the sheet.`
`Marcus: [firm] Not quite. Don't pin a number on that debt. The books say "enormous." Use their word, not a figure you can't source.`
`Maya: [sheepish] Box one, done. But the frontier's already on fire.`
Marcus's correction teaches verbatim what v2 taught (F-U2-064: no pinned
figure; the books' word is "enormous"). G12: no registry falsehood pattern
matches Maya's line ("130 million pounds" is a literal pattern; she claims
no "doubled"), so the gate is clean without needing the exemption — the
"Not quite" strong marker from a different speaker is belt-and-braces.

### B3 — box-2 announcer trap → live trap (§5)
Before:
`Marcus: [firm] Common slip: the Mississippi was the prize, the Appalachians were the fence. Don't swap them.`
After:
`Maya: So the Mississippi was the fence, and the Appalachians were the prize.`
`Marcus: [firm] Not quite. The Mississippi was the prize, the Appalachians were the fence. Don't swap them.`
Correction verbatim to v2's taught content. De-dup vs the recap: v2's recap
re-taught the swap as a fumble —
`Maya: [professional broadcast tone] Two: the Proclamation Line of 1763. No settlement past the — the Mississippi? No —` /
`Marcus: [conversational] The Appalachians.` /
`Maya: [thoughtful tone] The Appalachians. The Mississippi was the prize, the mountains were the fence. London was dodging a war. Pure triage. And it failed as a fence anyway.` /
`Marcus: [thoughtful tone] On the sheet.`
— four turns now replaced by two, with the recap fumbling on a different
beat (whether the fence held) instead of repeating the swap:
`Maya: [catching] Two: the Proclamation Line of 1763. A line along the Appalachians, no settlement past it. London was dodging a war, pure triage. And the fence held. No, wait: it failed as a fence.`
`Marcus: Came too late. On the sheet.`
The swap is now taught exactly once, mid-episode, as the live trap. (This
also resolves M1 — see below.)

### B4 — box-3 announcer trap → live trap (§5)
Before:
`Marcus: [firm] And watch for this mistake: Neolin was the prophet, Pontiac was the war chief. Swap the jobs and the paragraph falls apart.`
After:
`Maya: [confident tone] Sorting rule, test-ready: the rebels in 1763 were Ottawa-led Native nations. If your draft says the colonists rebelled, you've written the wrong war.`
`Maya: So Pontiac was the prophet.`
`Marcus: [firm] Common mix-up. Neolin was the prophet, Pontiac was the war chief. Swap the jobs and the paragraph falls apart.`
Correction verbatim to v2's taught content. G12 verification: Maya's line
matches F-U3-003's `pontiac…prophet` falsehood pattern, but Marcus's
immediately following turn is a different speaker carrying the strong
correction marker ("Common mix-up") → the wrong-beat exemption applies and
the gate stays clean (confirmed in the 13/13 run). "Common mix-up" was
chosen over a third "Not quite" to vary Marcus's corrections.

### M1 — `[professional broadcast tone]` in the recap body (§9)
Gone with the B3 recap rewrite: the box-2 recap turn is now `[catching]`
(Maya's mid-stream self-correction — the catalog fit). Broadcast tone now
appears only on the cold open and the two closing-tagline turns (sign-off),
per §9.

### M2 — "Cheap beats fair" verbatim ×2 (§4.6)
Before (Maya's self-test model answer):
`Maya: ...With the treasury empty, freezing settlement west cost less than fighting another frontier war. Cheap beats fair.`
After:
`Maya: ...With the treasury empty, freezing settlement west cost less than fighting another frontier war. Triage won because the treasury was empty.`
Marcus's mid-episode "Cheap beats fair when the treasury's empty." is the
surviving instance; G5 confirms no verbatim repeat remains.

### M3 — "by the usual account" for the Fort Pitt site (§7)
Before:
`Marcus: [measured] ...The books count more than four hundred British soldiers and around two thousand colonists killed or captured. At Fort Pitt, by the usual account, the British handed out blankets deliberately infected with smallpox.`
After:
`Marcus: [serious tone] ...The books count more than four hundred British soldiers and around two thousand colonists killed or captured. The British handed out blankets deliberately infected with smallpox.`
Fail-closed: Princeton (Tier 1) pins the tactic
("germ warfare... smallpox-infected blankets... to help defeat the Ottawa")
but names no fort, and the Fort Pitt site-name could not be pinned in
Tier 1–2 — so the site pin is cut from dialogue; the line now teaches only
what Princeton pins. The footer discloses the site-name's
standard-accounts-only, beyond-Tier-1–2 status. Registry F-U3-006 updated
same day (correct-field now records the removal, not a hedge).

### M4 — F-U3-009 troop figure (registry discipline)
Dialogue keeps the correct handling — "roughly ten thousand soldiers"
(hedged) + footer disclosure — unchanged. The figure is NOT registered as a
verified fact: F-U3-009's topic/correct now flag it explicitly as a
"FAIL-CLOSED handling note, NOT a verified fact" (hedge-and-disclose rule
for the fleet). Registry re-parsed after the edit (693 facts, valid YAML).

### Incidental trims (runtime agreement, §8)
The three live-trap conversions add a Maya error turn each. To keep the
experienced runtime at the promised 11.5 min, four small cuts: "after the
French are gone" (prediction-beat setup), the double "already" (Washington
line), "itself" (Paxton march), "Anyway —" (car-lore pivot). Net word
delta vs v2: 1,879 → 1,882 (+3).

### Validation (v3, final draft)
- Gates (working copy, `--minutes 11.5`): **13/13 PASS** —
  1,882 words, 164 WPM. WARNs only: W2 triples (4 hits, all pre-existing
  v2 lines) and W5 "exactly" (2x, the v2 baseline — the B4 "Common mix-up"
  choice kept it there).
- Runtime math: 1,882 ÷ 180 × 60 + 63s pauses = 690.3s = 11.51 min →
  header "11.5 min" and cold-open "Eleven and a half minutes" agree.
- Tag density: 24/63 turns = 38.1% (measured, §9 ~40% cap).
- G12 wrong-beat exemptions verified live: B4's Maya error trips F-U3-003's
  pattern and is exempted via Marcus's "Common mix-up"; B2's error matches
  no pattern. Gate output shows zero G12 hits.
- Self-test: 3 questions + 3 model answers, zero tone tags (neutral),
  no spoken CER labels (G13 pass), 15s pauses on all three.
- `~/workspace/apush/` untouched; nothing pushed (parent's job).
