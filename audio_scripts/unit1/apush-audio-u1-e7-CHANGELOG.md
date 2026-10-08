# U1-E7 (The Valladolid Debate) — Changelog

## v3 → v4 — `apush-audio-u1-e7-script-v4-DRAFT.md` (2026-10-06)
Full rebuild to the frozen 2026-10-06 standards (agent-weighted pipeline: writer → Layer-2 ear + user checklist → Layer-3 fact-check → repair → fresh Layer-2 re-read → gates). Source: `_archive/apush-audio-u1-e7-script-v3-DRAFT.md`.

**Final numbers:** 1,992 spoken words, ~12.3 min experienced (664s speech at ≤180 WPM + 73s scripted pauses). Header "~12.5 min experienced (1,992 words speech + 73s pauses)", cold open "Twelve and a half minutes." 12/12 gates PASS (`--minutes 13`); only benign WARNs (W1 inside the verbatim Las Casas quote — guide-exempt; W2 functional lists).

**Substantive changes vs v3 (~8 min, no boxes, no exam devices):**
- Four boxes, Maya moderates AND tracks: (1) Sepúlveda's case, (2) Las Casas's case, (3) New Laws/no-verdict, (4) the afterlife (Black Legend + the universal-moral-law question).
- Debate format kept; voice frame fixed mid-pipeline: Marcus is now the modern advocate arguing Las Casas's side (third person throughout), Sepúlveda in-era. No future knowledge in 1550 mouths.
- Disclosure line separates Las Casas's verbatim 1550 quote (self-test Q1, Tier-1 verified) from dramatized debate dialogue.
- Exam devices: 2 prediction beats, 4 varied exam-tip templates, one common-mistake line per box (template-varied), CER self-test (3 AP-shaped, stimulus-style Q1, 20/15/15s pauses, labeled fast bonus), LEQ counterargument tie-in.
- Maya: eighth-grade mock-trial human moment, Fullmetal Alchemist pop-culture knowledge, mid-episode wrong beat + recap fumble (two different tools).

**Validation findings applied:** Layer-2 blocked on mid-episode check-in doubling (fixed: single "one down" beat, recap as sole check layer) and Marcus's first-person/future-knowledge voice frame (fixed: third-person modern advocate); de-slop cluster (mirror pairs, antithesis budget, mistake-template monoculture) fixed. Layer-3: zero wrong claims; "25 Dutch editions" hedged to "dozens"; writer's 6 registry proposals confirmed (5 full, edition count rejected as registry-grade pin).

**Registry additions:** F-U1-044 (1550 quote verbatim + form), F-U1-045 (junta Aug 1550/Apr 1551/no verdict/both claimed victory), F-U1-046 (Sepúlveda never crossed the Atlantic; Democrates Alter 1544; NOT-a-Dominican guardrail), F-U1-047 (four just causes), F-U1-048 (Dutch 1578 / English London 1583, no edition-count pin), F-U1-049 (Short Account 1542/1552; Las Casas former bishop of Chiapas 1547). (b)-tier items labeled `scholarly`, not Tier-2.

**Final re-read fix (post-repair):** L11 re-introduced Las Casas as the speaker against the new voice frame — fixed to "Marcus, arguing the case of Bartolomé de las Casas." Sources note corrected (Q1 quote verbatim, not spliced).

**Known gates-tool gap (noted, not fixed):** the gate SPEAKER regex's ASCII class misses `Sepúlveda:`, undercounting 274 words — G1/G4/G9/G12 blind to his turns. Follow-up fix recommended (Unicode-aware speaker class).

## audit fix — 2026-10-06
User-ordered word-by-word audit caught what the pipeline missed: all three
self-test model answers spoke "Claim:/Evidence:/Reasoning:" labels aloud
(the U2-E3 pipeline had caught and fixed this same issue; U1-E7's
validators missed it). De-labeled to natural connective tissue. Gates
re-run: 12/12 PASS.

## v4 → v5 — fleet-audit repair pass (2026-10-07)
Repair worker pass on `fleet-findings/u1-e7-FINDINGS.md` (1 blocker, 6 minor).
No new facts taught; every edit is voice/direction/exam-device repair.
Final: 1,949 spoken words, ~12.0 min experienced (649s speech at ≤180 WPM +
73s scripted pauses); header "~12 min experienced (1,949 words speech + 73s
pauses)", cold open "Twelve minutes." Gates 13/13 PASS (`--minutes 12`);
only benign WARNs (W1 Sepúlveda's uncontracted court-scholar voice —
guide-exempt; W2 pre-existing list shapes incl. the verbatim Las Casas
quote; W5 'exactly' ×2). Registry: no changes — 0 accuracy errors found;
the Hanke attribution below is an attribution-strength fix, not a factual
correction (claim + source already in the draft's Sources section).

**BLOCKER — §5 live traps (all six announcer proclamations converted):**
- Box 1: BEFORE `Maya: [firm] The common mistake for box one: don't write that Sepúlveda argued from what he saw. Books, not voyages. Aristotle and Oviedo's chronicles.` → AFTER: proclamation cut; the trap is now lived in the existing wrong beat — Maya's `So you sailed over, saw it for yourself, and came back convinced?` stands, and Sepúlveda catches her: `Sepúlveda: [measured] Not quite. I never crossed the Atlantic, and I won't hide it. I relied on the chronicles, above all Oviedo's. ...` ("Not quite" = strong correction marker; G12-clean.)
- Box 2a: BEFORE `Maya: [firm] Watch the trap: if a question quotes Las Casas describing a massacre, the follow-up isn't asking whether he's lying. It's asking what the exaggeration was for. He was writing to move a king, not to file a census.` → AFTER `Maya: So if the millions were made up, the whole massacre story is a lie.` + `Marcus: [measured] Not exactly. The question isn't whether he's lying. It's what the exaggeration was for. He was writing to move a king, not to file a census.` (Marcus owns Las Casas material; "Not exactly" marker.)
- Box 2b: BEFORE `Maya: [conversational] Trap for box two: his Hispaniola numbers look quotable, and they're wrong. The cruelty holds; the arithmetic doesn't.` → AFTER `Maya: Three million down to two hundred. I'm quoting that in my essay.` + `Marcus: Mix-up. The cruelty holds; the arithmetic doesn't. Don't quote the three million.` (distinct real error from 2a: quoting the exaggerated figure.)
- Box 3a: BEFORE `Maya: [conversational] Timing trap: the New Laws came in 1542, the debate in 1550. A question that puts the debate first is testing whether you know the failure came first. The debate was the crown's second try.` → AFTER `Maya: So the debate settled it, and the New Laws came after. The crown acted on what the junta decided.` + `Marcus: [measured] Mix-up. The New Laws came in 1542, eight years before the debate. The laws failed first. The debate was the crown's second try.`
- Box 3b: BEFORE `Maya: [firm] That covers the New Laws, the revolt, and the debate with no verdict. The common mistake, two for one: don't write that the New Laws ended the encomienda. They didn't. And don't write that either side won. The judges scattered.` → AFTER `Maya: So the New Laws ended the encomienda, and Las Casas won the debate. Clean ending.` + `Marcus: [measured] Not quite on either. The New Laws never ended the encomienda, and nobody won the debate. The junta heard both cases and never ruled.` (Maya's "Las Casas won the debate" trips F-U1-045's falsehood pattern only without "Valladolid" — no match; "Not quite" marker present regardless.)
- Box 4: BEFORE `Maya: [firm] The common mistake for box four: students always credit Las Casas with inventing the Black Legend. English and Dutch printers built it from his pages: his reform book, turned into their propaganda.` → AFTER `Maya: So Las Casas invented the Black Legend.` + `Marcus: [measured] Not quite. He didn't invent it. English and Dutch printers built it from his pages. His reform book, turned into their propaganda.` (this pair also resolves the Maya-echo finding below.)

**Minor — Sepúlveda directed (was 0/6 tagged):** BEFORE `Sepúlveda: I argue from Aristotle, ...` → AFTER `Sepúlveda: [measured] I argue from Aristotle, ...`; BEFORE `Sepúlveda: Four just causes for war against them. ...` → AFTER `Sepúlveda: [measured] Four just causes for war against them. ...`; BEFORE `Sepúlveda: I never crossed the Atlantic, and I won't hide it. ...` → AFTER `Sepúlveda: [measured] Not quite. I never crossed the Atlantic, and I won't hide it. ...`; BEFORE `Sepúlveda: And the men holding the grants revolted. ...` → AFTER `Sepúlveda: [passionate] And the men holding the grants revolted. ...`. The two micro-asides (`I do not know your alchemists...`, `One case, four causes: conquest as mercy.`) left untagged — no beat earns one, and the density ruling requires the strip.

**Minor — Maya echo fixed:** BEFORE `Maya: [conversational] So he wrote it to save the Indians, and it became Protestant propaganda.` + `Marcus: [measured] He wanted reform. He got a weapon, aimed at his own country.` → AFTER: both cut; replaced by the box-4 live-trap pair above (Maya voices a new wrong thought instead of restating Marcus; the single shared duet `Lost the policy —` / `won the afterlife.` is untouched).

**Minor — tag density 70.3% → 43.9%:** all 13 `[conversational]` defaults stripped (L9 disclosure, L11 scene-set, L21 cue, L57/L61/L67/L77/L89 transitions, L103 recap opener, L117 duet landing); `[measured]` stripped where no beat earns it (L19 reaction, L47 book intro, L51 numbers setup, L65 hedge answer, L105 tagline, L109/L113 recap adds). Remaining 29/66 turns all beat-earned: cold open `[professional broadcast tone]`, Maya's genuine questions `[curious, inquisitive tone]`, takeaways/checkoffs `[confident tone]`, numbers-to-catch `[speaking slowly]`, scholarly `[measured]`, corrections `[measured]`/`[firm]`-family, `[serious tone]` for the attack + the grim blind-spot beat, `[passionate]` for Sepúlveda's revolt attack, `[energetic]` round transitions, `[intrigued]` closer.

**Minor — [speaking slowly] retags:** BEFORE `Maya: [curious, inquisitive tone] And the numbers in it? Three million on Hispaniola, down to a couple hundred?` → AFTER `Maya: [speaking slowly] And the numbers in it? ...`; BEFORE `Marcus: [serious tone] 1542. The crown tried to wind the encomienda down: ...` → AFTER `Marcus: [speaking slowly] 1542. The crown tried to wind the encomienda down: ...`; BEFORE `Marcus: [measured] Charles the Fifth blinked. In 1545 he revoked the inheritance ban, ...` → AFTER `Marcus: [speaking slowly] Charles the Fifth blinked. In 1545 he revoked the inheritance ban, ...`; L79 `Marcus: [measured] August 1550. The junta meets at Valladolid: ...` → `Marcus: [speaking slowly] August 1550. ...` (consistency: dates students must catch). No word changes.

**Minor — weak attribution:** BEFORE `Marcus: [measured] One historian called it the only time a mighty emperor ever halted his conquests to ask whether they were just. The junta never ruled. But the question survived: can a universal moral law judge a conqueror? Historians see that question as one seed of the natural-rights language that would outlive every empire here.` → AFTER `Marcus: [measured] Lewis Hanke called it the only time a mighty emperor ever halted his conquests to ask whether they were just. The junta never ruled. But the question survived: can a universal moral law judge a conqueror? Some historians see that question as one seed of the natural-rights language that would outlive every empire here.` (Hanke named per the draft's own Sources; second claim hedged to "some historians".)

**Minor — closer tease:** BEFORE `Maya: [intrigued] Carry this one out the door: the empire put its own conquests on trial — and the trial outlived the empire. Check your four boxes. Next time: 1680, New Mexico. The Pueblos rise up and drive the Spanish out, and hold them out for over a decade.` → AFTER `Maya: [intrigued] Carry this one out the door: the empire put its own conquests on trial — and the trial outlived the empire. Check your four boxes. Next time: 1680, New Mexico. The Pueblos rise up.` (topic only; no outcome arc taught.)

**Mechanical — G9 antithesis (2026-10-07 pattern update):** the widened `, not <words>.` pattern newly flags three v4-carried sentences; budget is 2. BEFORE `He argues from your own doctors: Aquinas taught that dominion comes from natural law, not from grace.` → AFTER `He argues from your own doctors: Aquinas taught that dominion comes from natural law rather than from grace.` (meaning identical; the other two — `the court scholar, not a conquistador` and `to move a king, not to file a census` — stay as the two budgeted antitheses.)

**Exchange-logic check on reworked beats:** every attack lands on script content (Sepúlveda's "Not quite" answers Maya's voyage assumption; Marcus's corrections answer Maya's wrong versions); no character quotes a cut line (all corrected facts — Atlantic crossing, exaggerated numbers, 1542/1550 order, encomienda survival, no verdict, printers' Black Legend — remain present in the script); Sepúlveda stays in 1550; Maya's wrong beat + recap fumble remain two different tools.
