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
