# U1-E2 Changelog — "Why Europe Sailed West" (CED 1.3)

## v10 (2026-10-06) — full rebuild to the 2026-10-06 standards
Replaces v9 (1,440 spoken words, ~8 min — thin, pre-standards).

**Length:** 1,440 → **1,835 spoken words**; runtime now **~11 min experienced** (1,835 words
speech + 55s pauses: 2×[10s] prediction beats, 2×[15s] CER self-test, 1×[5s] fast bonus).
Header, cold-open time promise ("Eleven minutes"), and actual count agree.

**Substance added (all Tier 1 / Tier 2 verified, no padding):**
- **Iberia-first made explicit** (CED 1.3 requires it): new Marcus beat — Atlantic-facing
  geography, Portugal's decades of African-coast practice, and Spain as a brand-new kingdom
  (Isabella of Castile + Ferdinand of Aragon married two crowns together, finished the
  Reconquista the same year Columbus sailed).
- **Granada timing trap made explicit:** Isabella and Ferdinand walked into Granada in
  January 1492; Columbus sailed that October. Common-mistake line: "the answer starts in
  January, not October."
- **Tordesillas deepened:** the 1493 Line of Demarcation named as such — Spanish-born
  Pope Alexander VI (Rodrigo Borgia of Valencia), ~100 leagues (~300 miles) west of Cape
  Verde, with the Christian-ruler exception (Britannica Tier 2); Portugal's leverage
  (better navy + African charts) as the reason for the 1494 redo; Cabral landing on
  Brazil's coast in 1500 (why the bulge speaks Portuguese); "no other European power
  ever accepted it" (France/England never bound).
- **Columbus corrected:** "four voyages after that" (v9 error — would total five) →
  "three more voyages after that" (four total). San Salvador per premium2027 (replaces
  v9's Bahamas/Guanahani framing). Journal quote disclosure strengthened: "We don't even
  have his original log. This comes through Las Casas's copy."
- **Motives ranked with attributed debate:** "Most historians would back you. Some say
  the whole thing was economics wearing a religious costume. Others say the state rivalry
  mattered more… Nobody's fully sure which one turned the ship."

**Standards mechanics (new in v10):**
- Two prediction beats ("Your turn." + [10-second pause]): Castile's 1492 choice; why
  Portugal accepted a Spanish pope's line.
- Exam devices: exam trap (don't rank the Gs equal), common-mistake lines for all three
  boxes (1492≠Columbus-only; Henry never sailed; Tordesillas bound two crowns only),
  varied tip templates.
- Self-test: 3 AP-shaped questions (2 CER with [15-second pause], 1 fast bonus [5-second
  pause]); Q1 stimulus-style (1480s captain's log), Q2 source + classmate counterargument.
- Maya: mid-episode wrong beat (Sagres school myth, via video essay — stings), recap
  memory-check fumble ("the school was the legend, right?"), pop-culture knowledge
  (second-grade Niña/Pinta/Santa María song), human moment (cited the myth in a
  discussion post). Says her own checkoffs.
- Mechanical: 0 That's/Here's starters (budget 2), 2 em-dashes (G8 ≤10), 0 antitheses
  beyond budget (2: "a road, not a wall"; "in January, not October"), 2 micro-turns
  (≤8), longest Marcus turn 77 words (≤100), Maya ~28% of lines end in "?", no retired
  phrases, no shared full sentences with E1/E8 outside ritual lines.

**Kept from v9 (verified, not rewritten):** three-box structure (three Gs / toolkit /
Tordesillas), "No metal, no armies. No armies, no crowns." (the one earned chain),
"Conversion was the mission statement. Conquest was the habit underneath it.",
tease into the Exchange ("what crossed the Atlantic in both directions, and the cargo
nobody chose").

**Validation status:** writer's mechanical self-check done (word count, gates-shaped
constraints above). Still needed per process: apush-script-gates.py run, Layer 2
(clean-context read + validator checklist), Layer 3 (fact-check vs Tier 1/Tier 2),
user lock. NOT rendered; NOT pushed.

## CER-label production fix — 2026-10-06
User order ("Bad tts is not allowed"): removed spoken "Claim:/Evidence:/Reasoning:"
labels from all 2 self-test model answers — TTS reads everything literally.
CER logic (claim -> evidence -> reasoning) preserved, carried by natural
connective tissue (em-dash pivots, "which means," "so," "the giveaway is").
Substance identical; header word count updated to 1,834; gates 12/12 PASS.

## v11 (2026-10-07) — fleet-repair pass (audit: fleet-findings/u1-e2-FINDINGS.md)
1,834 → **1,879 spoken words**; runtime **~11.4 min experienced** (1,879 words at ≤180 WPM
+ 55s pauses) — header, cold-open promise ("Eleven minutes"), and count agree.
Gates **13/13 PASS**; tag density 84% → **39.4%** (28/71 turns).

**F1 (BLOCKER) — announcer-voice "Common mistake" proclamations → live traps, all three boxes:**
- BEFORE: `Maya: [firm] Common mistake, same box: writing that 1492 only means Columbus. Granada fell that January. If a question asks what made Spain ready to sail, the answer starts in January, not October.`
- AFTER (live trap, box 1 — Maya states the wrong version, Marcus catches her):
  `Maya: [confident tone] Box one's done: 1492, the year Columbus sailed west. October.`
  `Marcus: [measured] Not quite. Same year, two stories: Granada fell that January, before Columbus ever left port. If a question asks what made Spain ready to sail, the answer starts in January, not October.`
  `Maya: [sheepish] January first, October second.`
- BEFORE: `Maya: [firm] Common mistake for box two: saying Henry sailed those voyages. He never sailed on the discovery voyages himself. He paid for them.`
- AFTER: deleted — redundant. Its content ("a prince who never sailed") is already taught in
  Marcus's Sagres-beat lead-in, and the Sagres school myth is already box 2's genuine live
  trap (Maya caught believing the video-essay myth, Marcus corrects). One trap per box.
- Box 3 had no trap — ADDED (live trap; the old exam-warning line folded in):
  `Maya: [confident tone] So box three's the treaty that split the world between Spain and Portugal. My notes say so, anyway.`
  `Marcus: [measured] Not quite. The line bound the two signers only. France and England ignored it completely. "Split the world" is the answer the exam punishes.`
  `Maya: [sheepish] Two crowns bound, everybody else out. Checking it off.`
- G12: Maya's falsehood phrasings dodge all registry falsehood patterns (no "tordesillas
  divided the world", no "henry the navigator…school", no voyage-count/Bahamas phrasing);
  every Marcus correction lands in the immediately following turn with a "Not quite"
  correction marker.

**F2 — tag density:** stripped `[measured]` from all routine Marcus exposition turns and
`[conversational]` from routine Maya body turns; kept beat-earned catalog-consistent tags
(cold open + sign-off `[professional broadcast tone]`, questions `[curious, inquisitive
tone]`, takeaways `[confident tone]`, myth-bust `[firm]`, caught-wrong `[sheepish]`,
nuance `[thoughtful tone]`, grim `[serious tone]`, correction beats `[measured]`). Words
untouched by tag changes. Self-test stays neutral.

**F3 — "Historians say" attribution:**
- BEFORE: `Marcus: [measured] Mostly legend. Historians say the academy with classrooms never existed. What existed was a wealthy patron paying for ships and hiring cartographers. The money was real. The school is the story.`
- AFTER: `Marcus: [measured] Mostly legend. Britannica calls his reputation as a champion of science unsupported by the evidence: no formal academy, just a patron paying for ships and hiring cartographers. The money was real. The school is the story.`

**F4 — bullion shortage (UNVERIFIED, cut):** no Tier 1/2 line found — premium2027 ch. 3's
only "bullion" line is the post-contact Americas bonanza; 5steps2024 ch. 6 has no shortage
line. Cut to the Tier-1-supported wealth motive. Three lines changed:
- BEFORE: `Marcus: [measured] It's about all of it. Historians point to a bullion shortage — not enough gold and silver coin for a growing economy. And the part the slogans skip: a pile of metal was power you could spend. No metal, no armies. No armies, no crowns.`
- AFTER: `Marcus: It's about all of it. The spice hunger was real, and so was the hunger for gold and silver. The part the slogans skip: a pile of metal was power you could spend. No metal, no armies. No armies, no crowns.`
- BEFORE (recap): `Gold: the spice hunger plus the bullion shortage, and after 1453 the Ottoman squeeze on the old routes.`
- AFTER (recap): `Gold: the spice hunger and the hunger for gold and silver, with the Ottoman squeeze on the old routes after 1453.`
- BEFORE (self-test): `Both, but ranked — the crown spent money for metal: the spice trade, the bullion shortage, the Ottoman squeeze.`
- AFTER (self-test): `Both, but ranked — the crown spent money for metal: the spice trade, the hunger for gold and silver, the Ottoman squeeze.`
- Sources section: bullion bullet replaced with a v11 cut note quoting the premium2027 line.

**F5 — modern analogy:**
- BEFORE: `Renaissance crowns competed for prestige the way schools compete for rankings.`
- AFTER: `Renaissance crowns competed for prestige, and a richer rival was a more dangerous one.`

**F6 — feed lines → earned questions (wrong guesses / objections):**
- BEFORE: `Maya: [curious, inquisitive tone] So where did the money get them?`
- AFTER: `Maya: [curious, inquisitive tone] So Henry's money went straight west? He funded the shortcut?`
  (wrong guess: Henry died 1460; his patronage pointed down the African coast — Marcus corrects
  with "Down the coast, year by year.")
- BEFORE: `Maya: [curious, inquisitive tone] So why was it Iberia first, and not France or England?`
- AFTER: `Maya: [incredulous] So France and England just sat this out? The French kings weren't exactly shy about spending money.`
  (objection instead of the exact planned question; Marcus's Iberia-first paragraph kept.)

**F7 — "Portugal owned the sea road to Asia" overclaim:**
- BEFORE: `Portugal owned the sea road to Asia, and Spain was locked out of it completely.`
- AFTER: `Portugal was first around Africa and first to India by sea, and Spain had no route of its own.`
  (Tier 1 premium2027 ch. 3 supports only: "Bartolomeu Dias sailed around the Cape of Good Hope
  in 1488 and Vasco da Gama reached India by 1498." Reaching ≠ owning.)

**F8 — "the line mostly held" (contradicted by Tier 2):**
- BEFORE: `About that. And between the two of them, the line mostly held, which is why Brazil speaks Portuguese today.`
- AFTER: `About that. The line decided who got Brazil: when Cabral landed on Brazil's coast in 1500, the bulge of it sat east of the line, on Portugal's side. Settlers pushed far west of that line, but the line stayed the legal claim, which is why Brazil speaks Portuguese today.`
  (Tier 2 Britannica: "Brazilian exploration and settlement far to the west of the line of
  demarcation in subsequent centuries"; Tier 1 premium2027: "Portugal was granted lands to the
  east of the line, including Brazil in the Western Hemisphere".)

**F9 — "brand-new kingdom" misleading:**
- BEFORE: `And Spain was a brand-new kingdom: Isabella of Castile and Ferdinand of Aragon had married two crowns together, then finished the Reconquista that same year.`
- AFTER: `And Spain was a new dynastic partnership proving itself: Isabella of Castile and Ferdinand of Aragon had married two crowns together, then finished the Reconquista that same year.`
  (1469 was a dynastic union; Castile and Aragon stayed legally separate crowns.)

**F10 — unanchored "five hundred years":**
- BEFORE: `Now the how, because for five hundred years nobody followed it up, and then one generation did.`
- AFTER: `Now the how, because for centuries nobody followed it up, and then one generation did.`

**F11 — rule-breaker taught explicitly:**
- ADDED after "Spain's court said yes anyway: flush from Granada, and desperate to catch Portugal.":
  `The exception to keep: the experts were right about the math, and Spain funded the wrong map anyway.`
  `Maya: So being right didn't win.`
  (The exception to "expertise wins": Portugal's experts had the correct numbers and passed;
  Spain's gamble won the ships.)

**F12 — header terminology:** `common-mistake lines` → `common-mistake live traps` in the
v10 header note, matching the 2026-10-07 consolidated standard.

**Mechanical notes:** two new-turn drafts tripped gates on first run (G1: a third "That's"
starter; G6: "Checking it off." ×3) — both fixed before final. No registry entries: no new
factual claims were introduced (F4 was a cut; F3/F7/F8/F9 rest on already-registered or
Tier-quoted lines). Registry untouched. NOT pushed.
