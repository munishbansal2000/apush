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
