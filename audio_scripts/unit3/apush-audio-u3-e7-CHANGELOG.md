# U3-E7 Changelog

## v2-repair (2026-10-06) — Layer-2 voice + Layer-3 fact validation fixes (REPAIR agent)

Gates after repair: **13/13 PASS** (`apush-script-gates.py ... --minutes 12`; 1,967 words speech, 164 WPM @ 12 min, 73s pauses; WARNs only: W1 2x uncontracted, W2 triple-flag scan). Em dashes in dialogue: 6 (≤10; 5 from these prescribed rewrites + the pre-existing closing-tagline held beat). No new That's/Here's starters; antithesis budget unchanged; no spoken CER labels. Word count grew 1,923 → 1,967 (+44); header updated to 1,967; experienced runtime ~12 min — "Twelve minutes" cold-open promise kept.

### Fact fixes applied (old → new)
1. Cold open: "sworn to secrecy … in a heat wave" → "meeting behind closed doors … through a hot Philadelphia summer" (drops the unpinnable oath overstatement).
2. Brutus: "behind a locked door" → "behind closed doors" (x2 — his opener and his closer).
3. Brutus: "Sixty-five representatives for three million people" → "Sixty-five representatives for millions of people" (65 is pinnable to Art. I §2; "three million" is not).
4. Marcus: "the Deep South walks out … No South Carolina, no Georgia: no union, no Constitution, nothing at all" → "the southern delegates walk — the room knew it. And without the South, there is no union and no Constitution" (softens the unpinned counterfactual to the Tier-1 warrant).
5. Maya afterlife: "padded the South's Electoral College votes too, election after election, for decades" → "Do the math forward: those extra House seats meant extra electors too — the same count, carried into the Electoral College" (now explicitly the mathematical inference it is, in her modern voice).
6. Maya: "That split gets written down as the Tenth Amendment, but it was born in that hall" → "That split is federalism — born in that hall, and written down later as the Tenth Amendment" (no longer implies the Tenth itself was born in Philadelphia).
7. Marcus: "Congress was barred from touching the international slave trade" → "Congress was barred from ending the international slave trade" (the ban was on prohibition; Congress kept the tax power).
8. Header read note: checked — contained no "sworn to secrecy"/"locked door" language; no change needed.

### Voice fixes applied (old → new)
9. Brutus: "Counted as fractions of human beings, by men who owned human beings, to decide how much power the owners would hold" → "Apportionment by ownership: men who held human property counted fractions of it to enlarge their own representation" (one measured scholarly sentence; triplet aphorism removed).
10. Brutus: "A charter of liberty, operating as a catcher of the enslaved" → "A charter of liberty, conscripted into the slaveholder's errand" (period-plausible diction; modern-op-ed tagline removed).
11. Marcus: "He calls it consolidation. I call it a government that can finally act…" → "Consolidation is his word for it. What the Convention built was a government that could finally act — chained by branches that check each other, and by states that keep their own ground" (mirror pair broken).
12. Marcus: "In 1787, that was the whole ballgame" → "In 1787, that was the entire question" (baseball idiom out of a 1787 mouth).
13. Marcus: "On the hardest charge I won't pretty it up:" → "On the hardest charge, plainly said:" (concession's force kept).
14. ADDED Brutus's bill-of-rights objection — one sentence in his closer, 1787 voice: "And where, I ask, does this document secure the citizen's own rights? No bill of them is annexed to it — the government has its named powers, and the people must trust to its goodwill." Placed in the closer (not the machinery section) so the machinery attack's two-phrase shape stays intact; box structure stays at four.

### Minor flags — intent
- Marcus L27 "Nobody performs for the newspapers when the newspapers aren't there" → FIXED: "With no gallery to please, men argue honestly" (no-X-when-no-X softened to a plain statement, kept 1787 register).
- Marcus L67 "Three things. First," → KEPT with intent: the numbering genuinely continues across voices ("Second" Marcus, "third" Brutus); the list-announce is earned, not a crutch.
- Brutus recap "A president the people never directly choose" → KEPT with intent: deliberate recap color of box two's earlier point.

### Registry additions (same-day discipline)
- F-U3-022/23/24 were already taken (Revolution-era facts) — new entries took the next free IDs, F-U3-040/41/42.
- F-U3-040: May 29, 1787 secrecy rule ("nothing spoken in the House be printed, or otherwise published or communicated without leave"). Britannica's Constitutional Convention article fetched and searched 2026-10-06 — does NOT carry the rule; registered as standard account, primary-source (Convention records/Madison's notes), beyond Tier 1–2, explicit note; never teach as a sworn oath. G12 falsehoods: "sworn to secrecy", "locked.{0,10}door" (both verified to HIT the old wording).
- F-U3-041: Constitution never uses the word "slavery"; enslaved people are called "other persons" (premium2027 ch5 verbatim, Tier 1).
- F-U3-042: first House apportionment totals 65 (Art. I §2 cl. 3; verified against the text — NH 3, MA 8, RI 1, CT 5, NY 6, NJ 4, PA 8, DE 1, MD 6, VA 10, NC 5, SC 5, GA 3 — beyond Tier 1–2). Only registered because verified; never pair 65 with a pinned population figure. G12 falsehoods verified to HIT the old "three million" phrasing.
- YAML re-parsed after edit (`yaml.safe_load` OK).
- Draft Sources footer: secrecy cluster moved to F-U3-040 citation; 65-reps disclosure rewritten to the F-U3-042 safe form; afterlife note rewritten to the math-inference framing; Franklin-story disclosure unchanged (still accurate).

## v2 (2026-10-06) — full rewrite to the frozen 2026-10-06 standards
Replaces v1 (retired to `_archive/`; none of its prose, jokes, or structure reused).

- Format: debate. Maya moderates. Marcus defends the Convention's work as a **1787 voice** — his knowledge stops at the signing (no modern narration from him, a first for the series). Brutus argues the Anti-Federalist skeptic's case in his own 1787 voice — measured, scholarly, never a caricature. Maya is the only modern voice; the afterlife of the compromises (three-fifths padding Southern Electoral College votes for decades, the Tenth Amendment promise) is hers, clearly framed. Spoken disclosure up front: their lines are dramatized renderings of real arguments, not verbatim quotes.
- Scope discipline: ends at the signing (Sept 17, 1787). One continuity sentence for the Articles' failure (U3-E6's closer); no ratification content — no Federalist Papers authorship, no ratification votes, no Bill of Rights promise (U3-E8's locked territory; its "winners' promise to the losers" framing untouched).
- Four boxes, all exam-stem terms: the representation compromise (VA Plan / NJ Plan / Great–Connecticut Compromise), the presidency bargain (Electoral College), slavery's protections (three-fifths, 20-year slave-trade protection to 1808, fugitive slave clause, "other persons" euphemism), the machinery that held (checks and balances, federalism, separation of powers).
- Brutus carries his real strongest arguments: the "one complete national government" consolidation thesis via Necessary and Proper + Supremacy (F-RAT-011), the large-republic thesis (F-RAT-016), and the 65-representatives-for-3-million arithmetic. Closers rebut: Brutus answers Marcus's union charge; Marcus answers the consolidation charge and doesn't pretty up the slavery bargains.
- Exam devices: 2 prediction beats ("Your turn." + 8s/10s pauses, reasoning not trivia); 3 exam tips with varied openers (Scoring move / Watch the trap / Read it like this); one common-mistake line per box; self-test (stimulus-style Q1 on the prem27 "other persons" quote, 20s/15s/15s pauses) with model answers in natural claim–evidence–reasoning shape — no spoken CER labels; fast labeled bonus ("One more, fast.") for box four.
- Voice: Maya messily wrong mid-episode (Electoral College = "Congress picking the president, with extra steps?" — corrected in flow by Marcus); recap fumble as memory-check (1800 vs 1808, different tool); one concrete human moment (school AC dying during finals week); Hamilton-musical nod as her knows-something beat; one mid-episode "one down" check-in only; recap "Four boxes, let's land them."
- Franklin's "a republic, if you can keep it" used as a *reported* story with in-dialogue disclosure ("nobody swears to the exact words") — paraphrased, never presented as a verbatim quote (not Tier 1-verifiable).
- Mechanical: 1,923 spoken words (floor 1,440); 73s scripted pauses; experienced runtime 11.9 min — header, cold-open promise ("Twelve minutes"), and actual count agree. 1 em dash in dialogue (tagline held beat, production-noted); 1 That's-starter; 0 antitheses; 4 micro-turns; no retired transitions, no twist pivots, no modern analogies; contractions throughout except inside the verbatim textbook quote.
- Sources footer: every spine point tiered. New items flagged honestly: Brutus's 65/3-million arithmetic (task-sanctioned standard account, beyond Tier 1–2), secrecy rule (standard account, taught lightly), Franklin story (reported), afterlife Electoral-College note (standard account, hedged).

## v1 → v2 deltas (what was dropped/changed from the retired draft)
- v1's Marcus spoke with modern knowledge (Civil War, "the framers bet the union would eventually destroy slavery"); v2 locks Marcus in 1787 — the afterlife arguments move to Maya.
- v1's "world's oldest working constitution" claim and its uncited 74-appointed figure cut.
- v1 sourced "persons held to service" euphemism to 5steps ch11; verified false — ch11 contains neither "fugitive" nor "persons held." v2 teaches the prem27-verified "other persons" phrasing and cites F-RAT-009 for the fugitive clause.
- v1's tagline and Maya's "verdict" structure retired; v2 ends with tagline + one forward tease to U3-E8 only.
