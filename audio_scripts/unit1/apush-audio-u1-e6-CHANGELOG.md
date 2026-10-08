# U1-E6 "Labor Systems" — changelog

## v6 — full rebuild to the 2026-10-06 standards (2026-10-06)
Rebuilt from v5 (~1,000 words / ~8 min, thin) to 1,843 spoken words, ~12 min
experienced (81s scripted pauses counted in). Study Buddies format (Maya + Jay),
CED 1.5 + 1.6.
- Four boxes (was three): encomienda + New Laws; repartimiento; Middle Passage;
  casta + hacienda. Repartimiento and hacienda promoted from sub-topics.
- Full exam-device suite: 2 prediction beats (8–10s), one common-mistake line
  per box (varied templates), 3-question AP-shaped self-test (15–20s CER,
  stimulus-style ship's-log Q1), fast labeled bonus covering box 4.
- Facts corrected, all registered same day: F-U1-038 (Middle Passage ~13%
  mortality, replaces v5's unverified "one in seven"); F-U1-039 (New Laws 1542
  inheritance ban, Añaquito Jan 18, 1546, crown revoked the ban);
  F-U1-040 (Las Casas 1514/1516/retraction, did NOT start the trade);
  F-U1-041 (casta paintings sixteen scenes, ladder order, custom+law);
  F-U1-042 (hacienda debt peonage, technically free);
  F-U1-043 (repartimiento 1549/1550, wages on paper, "did not improve appreciably").
- Demographic collapse uses the 50–90% range (F-U1-015), never a pinned figure.
- Preserved v5 strengths: "Slavery with paperwork," closet human moment,
  Las Casas irony, lightning round, em-dash tagline.
- Validation: Layer-2 ear (4 blockers fixed, incl. a broken peninsulares/criollos
  fumble where Jay "corrected" a mistake Maya never made), Layer-3 fact-check
  (1 line fix: Las Casas "spent the rest of his life" → "came to believe"),
  repair pass, fresh re-read PASS, 12/12 gates green.
- Awaiting the user's lock. No render, no push.

## v7 — fleet repair pass (2026-10-07)
Repaired all 8 fleet-audit findings (1 blocker, 7 minors) from
fleet-findings/u1-e6-FINDINGS.md. Dialogue words 1,843 → 1,832; tag density
85.7% (78/91 turns) → 35.1% (33/94 turns); experienced runtime ≈ 11.5 min
(1,832 words at ≤180 WPM + 81s scripted pauses). Tags never changed words;
only retags are noted below. apush-script-gates.py 13/13 PASS (--minutes 12);
remaining warnings (W2 triples, W5 "exactly" ×2) are pre-existing lines.

- BLOCKER §5, box-1 trap (announcer voice → live trap).
  BEFORE: `Maya: [conversational] The fix failed, and the crown learned the
  lesson: it stopped trying to kill the grant and started taking the
  assigning power instead. The trap on box one: the New Laws killed the
  encomienda. They didn't — the encomenderos killed the reform, and the
  viceroy.`
  AFTER: `Maya: The fix failed, and the crown learned the lesson: it stopped
  trying to kill the grant and started taking the assigning power instead.`
  / `Jay: [casual] So the New Laws killed the encomienda. Box one, checked.`
  / `Maya: [firm] Not quite — they tried to kill it. The encomenderos killed
  the reform, and the viceroy.` (Jay voices the misconception, Maya catches
  him with the "Not quite" correction marker. G12-clean: Jay's "killed"
  dodges F-U1-039's "ended/abolished" patterns; Maya's next-turn negation
  carries the exemption marker anyway.)
- BLOCKER §5, box-4 trap (announcer voice → live trap).
  BEFORE: `Maya: [firm] Last box, last trap: don't write that peons were
  slaves. Free on paper, bound by the ledger. The debt was the chain.`
  AFTER: `Jay: [casual] So peons were basically slaves.` /
  `Maya: [firm] Not quite — free on paper, bound by the ledger. The debt was
  the chain.` (G12-clean: "peons were basically slaves" dodges F-U1-042's
  "peons were slaves" pattern; Maya's "Not quite" marker in the next turn.)
- BLOCKER §5, box-3 trap: CUT the redundant proclamation
  (`Maya: [firm] Partly convenient. But he came to believe both were wrong.
  Box three's common mistake: don't write that Las Casas invented the slave
  trade. He blessed it, then spent decades trying to un-bless it.`) →
  `Maya: [firm] Partly convenient. But he came to believe both were wrong.`
  The working live trap at Jay's "So the great defender of the Indians
  helped start the African slave trade." / Maya's "He didn't start it."
  stays untouched.
- F2 verbatim tagline repeat.
  BEFORE: `Maya: [conversational] Lightning round. Four systems, one hunger.
  I name the trigger, you answer.`
  AFTER: `Maya: Lightning round. One hunger, four systems. I name the
  trigger, you answer.` (closer "Four systems, one hunger —" kept; no longer
  verbatim.)
- F3 tag density. Stripped the [conversational]/[casual]/[measured]
  workhorse defaults from every turn where no beat earned a tag (51 tags
  removed). Kept tags follow the catalog beat→tag mapping: cold-open and
  closer [professional broadcast tone] ×3, warm-up + lightning triggers
  [energetic] ×5, Jay's genuine questions [curious, inquisitive tone] ×8,
  myth-busts and trap corrections [firm] ×6, checkoff [confident tone],
  caught-wrong [sheepish] ×2 / [playful], numbers-to-catch
  [speaking slowly] ×3, recap memory fumble [catching] (was [incredulous],
  retagged to the catalog's mid-stream self-correction tag), closer tease
  [intrigued], Jay's two live-trap misconceptions [casual] ×2. Self-test
  stays fully untagged.
- F6 unverified court reading.
  BEFORE: `...Las Casas had read his Short Account to the court, and the
  court was horrified enough to act.`
  AFTER: `...Las Casas is said to have read his Short Account to the court,
  and the court was horrified enough to act.` (Tier 1 confirms only written
  1542 / published 1552. No registry entry: a hedge, not a new verified
  fact.)
- F7 unverified tribute/office claim.
  BEFORE: `...Your label decided who paid tribute and who could hold office....`
  AFTER: `...Your label mattered for who paid tribute and who could hold
  office....` (Tier 1 covers only the casta ladder; hedged honestly. No
  registry entry.)
- F8 Historia publication overstatement.
  BEFORE: `Jay: [casual] An apology in a book nobody read for a century.
  Convenient.`
  AFTER: `Jay: An apology in a book almost nobody read for centuries.
  Convenient.` (Tier 2 Britannica: not published in his lifetime; first
  published 1875, ~300 years later — documented in the Sources footer. No
  registry entry: no Tier-1 book line for the gap; the existing F-U1-040
  already covers the retraction.)
- F4 numbers-to-catch, retagged (no word changes):
  `[conversational]` → `[speaking slowly]` on "Disease kept emptying the
  towns. Between half and nine in ten Native people died between 1500 and
  1650..." / "Between half and nine in ten Native people died between 1500
  and 1650, mostly disease..." / "About thirteen out of every hundred died
  crossing. Roughly one in eight...."
- F5 weak attribution.
  BEFORE: `...The books call it debt peonage, and it looked a lot like
  serfdom.`
  AFTER: `...The term is debt peonage — Britannica calls it a permanent
  labor supply "resembling the serfdom of medieval Europe."` (source named
  per §7; the Britannica line was already in the Sources footer.)
- No banned-list violations introduced: no new That's/Here's starters beyond
  the one pre-existing ("That's going to stick."), no new triples, no new
  antitheses, em dashes 6 → 8 (cap 10), micro-turns unchanged. Jay stays
  the learner throughout; Maya's corrections stay crisp.
