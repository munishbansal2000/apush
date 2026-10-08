# U2-E2 Changelog — "From Servitude to Slavery"

## v5 repairs (2026-10-06) — Layer-2 + Layer-3 findings applied
Surgical edits to `apush-audio-u2-e2-script-v5-DRAFT.md`; no rewrite, voice/rhythm/structure preserved.

**Length:** 1,804 → **1,771 spoken words**; runtime now **~13 min experienced** (1,771 words
speech + 80s pauses: 2×[10s] prediction beats, 2×[20s] + 1×[15s] CER self-test, 1×[5s]
fast bonus). Honest trim found only ~66 words of genuine slack (see below); the 12-minute
promise could not hold with pauses counted at realistic delivery (~13.2 min), so the header
and cold-open promise were set to the honest **"Thirteen minutes"** per the repair brief.

**Layer-3 (fact) fixes:**
- **W1** Marcus's 1705 line: "Chattel is the word, property you own, so they passed to
  your heirs like land" → "Real estate is the word: land-like property, so they passed to
  your heirs like land." (The 1705 statute declares enslaved people "real estate (and NOT
  chattels)"; legal effect as before.) Dangling `CHAT-uhl (chattel)` pronunciation entry removed.
- **W2** Box-three recap landing: "Codes first, race after" → "The codes are the fact; the
  motive is the argument." (both-sides frame the episode already earns; Morgan debate stays unsettled.)
- **W3** Maya's common-mistake line: "Different system, different century" → "Different
  system — term labor vs. lifetime slavery. They overlapped for decades; don't merge them."
  (The systems overlapped in 17th-c. Virginia — the episode itself dates Black enslavement
  milestones to 1640/1662/1667 and shows a mixed rebellion in 1676.)

**Layer-2 (ear + checklist) fixes:**
- Trimmed ~66 words of genuine slack only (echoes, filler buttons, restatements): the
  "human shields" echo line, "AP Lang finally pays off.", "The word fits.", "London was
  horrified.", "and the trade kept moving", "Becoming Christian changed nothing about your
  status.", "Work a while, then own a while.", "years of work", "More freed servants every
  year,", "the line attributed to Charles the Second was that" → "Charles the Second's
  attributed line:", "raiding/getting" trims, "the Pamunkeys were allies" → appositive.
- Exam-tip monoculture broken: "One exam warning for box one:" → "Exam warning for box one:"
  (box two keeps "One exam warning for box two:"); common-mistake openers now differ
  (W3's rewrite opens "Don't write that…", the 1705 line keeps "And the common mistake:").
- Transition tease: "Three boxes in the book. Time to land them." → "Three boxes in the
  book. Let's see if they hold." (no longer echoes the ritual "let's land them").
- Berkeley quote unified: Marcus's version now matches Maya's self-test rendering —
  "a people where six parts of seven at least are poor, indebted, discontented and armed."
- New mid-episode wrong beat (distinct from the recap fumble): Maya overreaches with
  "So by 1705 there's not much left to invent — they just copied Barbados?"; Marcus corrects
  in flow: "Not copied — consolidated. Virginia wrote its own code out of decades of its own law."

**Soft flags applied:** "would ever mistake" → "would mistake"; fall-line gloss added ("where
ships stop" — 3 words, matching the piedmont gloss in the same turn); "In pieces." smoothed
to "The code arrived in pieces." (W2's rewrite handled the fourth fragment); "And Bacon just
goes anyway." → "Bacon just goes anyway."; "And other colonies copied it?" → "Did other
colonies copy it?" Em-dash in W1's line swapped to a colon to keep G8 at 10.

**Gates:** `apush-script-gates.py --minutes 13` — all 12 PASS (G4 136 WPM; only WARNs are the
pre-existing W1 uncontracted "That IS" and W2 triple flags, both unchanged).

**Registry:** same-day additions per the fact-registry discipline —
- F-U2-012: falsehoods `"chattel is the word"`, `"the word was chattel"`; correct-statement
  parenthetical fixed to "(the statute's word is real estate, NOT chattels — …)".
- F-U2-013: falsehood `"codes first.{0,15}race after"` (regression net for the settled-landing).
- F-U1-028: falsehood `"different system.{0,20}different century"`; correct statement extended
  with the overlap note. All three patterns verified to fire on the old phrasing and stay
  silent on the repaired lines.

## CER-label production fix — 2026-10-06
User order ("Bad tts is not allowed"): removed spoken "Claim:/Evidence:/Reasoning:"
labels from all 3 self-test model answers — TTS reads everything literally.
CER logic (claim -> evidence -> reasoning) preserved, carried by natural
connective tissue (em-dash pivots, "which means," "so," "the giveaway is").
Substance identical; header word count updated to 1,764; gates 12/12 PASS.

## v6 fleet-repair pass — 2026-10-07 (audit: fleet-findings/u2-e2-FINDINGS.md)
Surgical edits to `apush-audio-u2-e2-script-v6-DRAFT.md`; voice/rhythm/structure preserved.
Direction tags stripped, never reworded by the tag pass itself (tag-only removals change no words).

**Length:** 1,764 → **1,831 spoken words**; promise corrected to **~11 min experienced**
(1,831 words ÷ 180 = 10.2 min speech + 80 s pauses = **11.5 min**). Per audit B1's own
recommended fix ("lengthen the promise to ~11 min"), header and cold-open promise now read
"~11 min" / "Eleven minutes" — no earned-substance expansion was available without padding.

**Blockers:**
- **B1 (false runtime promise):** header `"~13 min experienced (1,764 words speech + 80s pauses)"` →
  `"~11 min experienced (1,831 words speech + 80s pauses)"`; cold open `"Thirteen minutes."` →
  `"Eleven minutes."` Math: 1,831/180 = 10.17 min + 80 s = 11.5 min experienced.
- **B2 (tag density 80.3% → 36.2%):** 53/66 → 25/69 turns tagged. Stripped workhorse/neutral-default
  tags (`[measured]` ×17, `[conversational]` ×9, plus the three `[firm]` announcer lines reworked as
  traps). Kept catalog beats only: cold open + 2 sign-offs `[professional broadcast tone]`; 9 genuine
  questions `[curious, inquisitive tone]`; 3 takeaways `[confident tone]` (box-one checkoff, real-estate
  exam tip, box-three landing); 3 trap corrections `[firm]`; 4 Maya-caught-wrong `[sheepish]`
  (3 live traps + M10); grim `[serious tone]` (Jamestown burning); human moment `[warm tone]`
  (detasseling); closer `[intrigued]`. Self-test stays untagged.
- **B3 (announcer-voice mistake devices → live traps):** Maya now commits each classic error in flow;
  Marcus catches her next turn with a strong correction marker (all three G12-verified: different
  speaker, immediate next turn, strong marker):
  1. `"Maya: [firm] Don't write that servants and enslaved Africans were the same system. Different
     system — term labor vs. lifetime slavery. They overlapped for decades; don't merge them."` →
     `"Maya: [sheepish] So servants and enslaved Africans were the same system, just different
     names? Both unfree labor."` + `"Marcus: [firm] Not exactly. Different systems: term labor
     versus lifetime slavery. They overlapped for decades, but don't merge them."`
  2. `"Maya: [firm] One exam warning for box two: don't call this a slave revolt. Enslaved Black
     people fought in it, side by side with poor whites — against Berkeley. The sides were class,
     not color. That IS the point."` → `"Maya: [sheepish] So this was basically a slave revolt?
     Enslaved people rising up for freedom?"` + `"Marcus: [firm] Not quite. Enslaved Black people
     fought in it, side by side with poor whites, against Berkeley. Class drew the battle lines
     here. That's the point, and it's the exam trap: don't call this a slave revolt."`
  3. `"Maya: [firm] And the common mistake: don't write that 1705 started slavery. 1640, 1662,
     1667. The code gathered decades of law into one book."` → `"Maya: [sheepish] So 1705 started
     slavery in Virginia?"` + `"Marcus: [firm] Common mix-up: 1705 didn't start slavery. 1640,
     1662, 1667 came first. The code gathered decades of law into one book."` (F-U2-012's
     `1705.*(invented|started|began) slavery` pattern fires on Maya's line and is skipped via the
     next-turn "Common mix-up" marker — exemption path verified mechanically.)
- **B4 (bonus contradicted the lesson):** `"Maya: One more, fast. The slave code Virginia copied:
  which island, which year?"` / `"Maya: Barbados, 1661."` → `"Maya: One more, fast. A student
  writes that Virginia copied its slave code from Barbados, 1661. Which word in that sentence is
  the problem?"` / `"Maya: "Copied." Virginia built its 1705 code by consolidating decades of its
  own laws: 1640, 1662, 1667. Planters knew the 1661 Barbados template, but the code they passed
  was Virginia's own."` AP-shaped (fix-the-error reasoning, not trivia) and consistent with
  Marcus's "Not copied — consolidated."

**Minors:**
- **M1:** `"Berkeley, the governor, wrote home in 1676 of "a people where six parts of seven at
  least are poor, indebted, discontented and armed.""` → `"The governor, William Berkeley, wrote
  home in 1676, and his reported line was that roughly six of seven Virginians were "poor,
  indebted, discontented and armed.""` (reported + hedged; writer's footer already flagged it
  beyond Tier 1/2). Self-test Q1 likewise: `"Berkeley's own report to London, 1676: he governed
  "a people where six parts of seven at least...""` → `"Berkeley's reported 1676 line: roughly
  six of seven Virginians were "poor, indebted, discontented and armed.""` Registry F-U2-072.
- **M2:** `"finish the contract and collect a little corn, some clothes, maybe some land. ...
  That was Virginia's promise."` → `"finish the contract, and the promise was a little corn, some
  clothes, maybe some land. ... That was Virginia's promise, at least on paper."` Registry F-U2-073.
- **M3:** `"the court tacked years onto your term"` → `"the court could tack years onto your term"`;
  `"a woman servant got extra time tacked on"` → `"a woman servant could get extra time tacked on."`
  ("bought and sold" kept — Tier-1 verified.) Registry F-U2-074.
- **M4:** `"In 1667: baptism didn't free anybody."` → `"And the loopholes kept closing: by the late
  1660s, baptism didn't free anybody either."` (year unpinned; 1662 mother-rule untouched.)
  Registry F-U2-075.
- **M5:** `"The seasoning fevers eased, and more servants survived their terms."` → `"More servants
  survived their terms, and most of them wanted land."` (unverified decline mechanism cut; effect
  kept, hedged per M8.) Registry F-U2-076.
- **M6:** `"Then Nathaniel Bacon steps in. Twenty-nine, a planter, a recent arrival from England."` →
  `"Then Nathaniel Bacon steps in. A planter, a recent arrival from England."` Registry F-U2-077.
- **M7:** the two "exam warning for box one/two" openers are gone with the B3 trap rewrites; Marcus's
  surviving setup line ("Exam warning for box one: the exam tests the headright as a trap.") is now
  the only opener of its kind.
- **M8:** `"Every one of them wanted land."` → `"most of them wanted land."` (folded into the M5 rewrite).
- **M9:** `"the hilly land west of the rivers"` → `"the hilly land west of the fall line"` (Piedmont is
  west of the fall line, crossed by the same rivers).
- **M10:** `"Maya: [confident tone] ...So race caused the codes —"` → `"Maya: [sheepish] ...So race
  caused the codes —"` (fleet tag map: Maya caught wrong = `[sheepish]`).

**Incidental (required for 13/13):** the gate's G9 antithesis detector was broadened after v5
(U6-L6 fix), so v5's 7 `", not X."` punchlines now fail the <3 budget. Cut to the 2 the audit
blessed ("Follow the money, not the muscle." / "Treat it as the story, not the transcript.");
reworded the other 5 with meaning preserved: `"The boss, not the boat ride."` → `"The acres
followed the money: whoever paid got the land."`; `"...the prejudice made the enslavement possible,
not the other way around."` → `"Other historians flip it: the prejudice came first, and it made
the enslavement possible."`; `"the headright paying the planter who paid, not the servant who
sailed"` → `"with the headright money going to whoever paid the passage"`; `"The giveaway: the fear
was class unity, not race."` → `"The giveaway: Berkeley feared a united poor, and the rebellion
showed him exactly that."` (trap-2's `"The sides were class, not color"` went with the B3 rewrite).
Em dashes: 10 → 8 (both trap-rewrite dashes removed; no new dashes added).

**Gates:** `apush-script-gates.py --minutes 11` — **13/13 PASS**. WARNs only: W2 triples
(pre-existing shapes; one new on the hedged Berkeley line) and W5 "'exactly' repeats" 2x
("Not exactly" is the required G12 correction marker; "exactly that" in the self-test landing).
W1 uncontracted "That IS" is gone with the trap-2 rewrite.

**Registry:** same-day additions F-U2-072 (Berkeley reported line), F-U2-073 (freedom dues),
F-U2-074 (servitude penalties), F-U2-075 (1667 baptism), F-U2-076 (seasoning mechanism cut),
F-U2-077 (Bacon age). Each carries the falsehood pattern for its old flat phrasing, verified not
to fire on the v6 lines. `yaml.safe_load` parses clean.

**Watch items:** em dashes at 8/10 (headroom: 2); antitheses at 2/2 (no headroom — do not add);
Maya's question rate and micro-turns unchanged-or-better (the 2-word "Barbados, 1661." micro-turn
is gone with the bonus rewrite).
