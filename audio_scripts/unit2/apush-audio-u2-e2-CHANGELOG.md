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
