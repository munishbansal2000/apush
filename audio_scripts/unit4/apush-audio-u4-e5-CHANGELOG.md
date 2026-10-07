# U4-E5 "The Missouri Compromise" — v1 → v2 changelog

## Scope
Full rebuild to the frozen 2026-10-06 standards. v1 (~1,150 words, ~8 min, three boxes) was a pre-freeze draft; v2 is written fresh from the script guide, not edited from v1. No v1 prose was carried over — only the factual bones the parent brief confirmed as good material (Tallmadge's two conditions, the second Missouri crisis, Clay's 1821 return, Jefferson's wolf-by-the-ear line, the 1850 contrast).

## What changed
- **Length/structure:** 1,880 spoken words + 76s scripted pauses ≈ 11.7 min experienced at the 180-WPM cap ("About twelve minutes" header and cold-open promise). Four boxes per brief: (1) the eleven-eleven deadlock, (2) Tallmadge's amendment, (3) the Compromise mechanics + the second Missouri crisis, (4) the fire bell and what it postponed.
- **Cold open:** nods to U4-E4's closer ("Last time: the good feelings — and the cracks underneath. Now: the crack that nearly split the floor."), hook inside the first ~45 words, boxes + circle ritual + time promise.
- **New content vs v1:** cotton-gin timing beat (why 1819, not earlier — Northwest Ordinance + 1808 import ban vs. cotton boom); one-sentence Panic of 1819 backdrop (U4-E4 continuity, not re-taught); the three-fifths clause as the reason a new slave state mattered beyond the Senate; the second Missouri crisis expanded (free-Black exclusion clause → "who counted as a citizen"); the 1850 contrast (gold, Oregon, Mexican Cession land the line never covered).
- **Exam devices (new standard):** 2 prediction beats ("Now your turn." / "Your turn." + 8s/9s pauses, both reasoning-based with model answers); 4 exam tips in varied templates; 1 common-mistake line per box in varied templates (1818-vs-1819 dates; Tallmadge ≠ abolition; the line freed nobody; Jefferson ≠ abolitionist).
- **Self-test:** 3 CER questions with 18s pauses (Q3 is stimulus-style: a described 36°30′ map), model answers carry CER logic in natural connective tissue — no spoken labels; plus "One more, fast." bonus (5s pause) covering box 4.
- **Voice:** Maya gets a mid-episode wrong beat (confidently concludes Tallmadge "would've ended slavery in Missouri" right after stating the conditions correctly — Marcus corrects the leap), a content-fumble in the recap (Clay's 1821 condition — different tool from the mid-episode beat), a concrete human moment (got lost under the St. Louis Arch), and student-world knowledge Marcus lacks (her English teacher pairing the fire-bell line with Poe's "The Bells"). Marcus breaks every ~100 words, reactions vary, admits nothing he can't — no lecture runs.
- **Closer:** recap (Maya drives) → self-test → "Check your boxes." → forward tease (closer only: U4-E6 Market Revolution — canals, mills, telegraph, cotton) → one shared tagline in new words ("Missouri got in, Maine got out, the line got drawn — / and the clock started ticking.").
- **Cobb quote:** v1 quoted it; v2 paraphrases ("open threats of disunion, on the floor of Congress") because the exact wording isn't Tier-1 verified. Disclosed in the sources footer.

## Scope decisions
- Jefferson's age at the Holmes letter omitted from dialogue: brief says 76, birth-date arithmetic (b. April 13, 1743; letter April 1820) suggests 77; neither Tier-1 verified. Footer discloses.
- Second Missouri crisis, 36°30′ = Missouri's southern border, and Maine-as-District-of-Massachusetts taught per parent brief but flagged in the footer as not found in the Tier-1 books/transcripts read — Layer 3 should confirm via Tier 2.
- "He's the warning, not the hero" framing of Jefferson kept from v1's bones (reframed, not copied): enslaver terrified of slavery who acted on nothing.
- W2 triple warnings (5) kept with intent: all are content lists (the four boxes, the three chambers, House/Senate event parallelism), not decorative triples.

## Validation history
- Author self-check: `apush-script-gates.py --minutes 12` → **13/13 PASS** (1,830 words, 152 WPM; G7 pause tags all named in read note; G8 6 em dashes; G13 clean). Fixed during drafting: G1 starter density (5× "That's" → 0), G5 verbatim repeat ("One state, three chambers of power" appeared in both the prediction model answer and self-test Q1 — reworded the latter), G8 em-dash density (37 → 6).
- Layer 1 (scripted validators): gate run on the repaired file = 13/13 PASS (see repair log).
- Layer 2 (clean-context read + validator checklist): **FAILED** — G9 antithesis budget (5 antitheses vs 2 max) + 2 substantive fixes, 4 minor flags. All repaired by the repair agent; see repair log below.
- Layer 3 (dedicated fact-check, Tier 1 → Tier 2): **FAILED with 5 blocking items** (Cobb quote wording; Maine/Massachusetts motive; House-majority gloss; gold pin; Oregon settlers grounding). All repaired by the repair agent; see repair log below.
- Human read-aloud / TTS skim: **pending**.
- User lock: **pending**.

## Repair log (2026-10-06, repair agent)
Validators' findings applied as given, not re-litigated.
1. Cobb/disunion (Layer 3 #1): paraphrase replaced with the verbatim quote, attributed in-dialogue as Cobb's actual words from the congressional record — "You have kindled a fire which all the waters of the ocean cannot put out, which seas of blood can only extinguish." (Annals of Congress, 15th Cong., 2nd Sess., quoted in Tallmadge's own Feb 16, 1819 House speech, footnoted in the Annals record.) "Forty years before it happened" modern-voice framing kept.
2. Maine/Massachusetts motive (Layer 3 #2): cut "Maine had wanted out for years, so Massachusetts was glad to trade it for a Senate tie." Now only what sources confirm: the District of Maine, governed from Boston; Congress separated it from Massachusetts and admitted it as a free state.
3. House-majority gloss (Layer 3 #3): "since its population was growing faster" → "since it was the more-populous region" (Britannica static phrasing; no growth-rate claim).
4. Gold (Layer 3 #4): kept, Tier-2 verified (Britannica: Sutter's Mill, early 1848); lightly pinned in dialogue as "Gold had been found at Sutter's Mill back in forty-eight."
5. Oregon settlers (Layer 3 #5): confirmed via web search — first wagon train 1841 (Bartleson–Bidwell), Great Migration of 1843 (~1,000 settlers), growing traffic through the 1840s (HISTORY, Wikipedia, NCPA corroborate; the legacy nps.gov/oreg/oreg.htm page now 404s). Kept as the sourced "Wagon trains were rolling toward Oregon by the eighteen forties."
6. G9 antithesis budget (Layer 2): L51 "It made slavery a national question, not a local one." → "It dragged slavery onto the national stage."; L115 "The letter's a warning, not a conversion." → "The letter warns. It doesn't convert."; L15's "not a textbook shape" dropped in the rewrite. Exactly 2 antitheses remain: L103 "He's the warning, not the hero." and L25 "start with the Senate math, not the map."
7. Maya's human moment (Layer 2): L15's verbatim guide example ("Got lost for an hour under the Arch") replaced with a fresh image — her aunt outside Kansas City, driving across Missouri in August with the windows down.
8. Prediction beat 2 (Layer 2): rewritten as an 1848 inference scenario — new territory the line never covered; "Can the Compromise settle slavery there?" The model answer must be reasoned out (the bargain covered only the Louisiana Territory; a latitude can't settle the moral question), not recalled from the preceding turn. Model answer now voiced by MAYA — also covers soft fix 12 (she delivers one of the two prediction-beat answers).
9. Box ownership (Layer 2 minor): "Box three: the Compromise itself." moved from Marcus to Maya — she owns all box announcements/checkoffs.
10. Cold-open time promise (Layer 2 minor): "Twelve minutes" → "About twelve minutes" (matches the header; actual ≈ 11.7 min at the 180-WPM cap).
11. L111 fragment staccato (Layer 2 minor): rewritten as flowing sentences (gold at Sutter's Mill, Oregon wagon trains, Mexican-Cession land the line never covered).
- Gate re-run post-repair: `apush-script-gates.py --minutes 12` → **13/13 PASS** (1,880 words, 157 WPM; G9 clean at exactly 2 antitheses; G12 clean, including the new F-U4-006 guard against Cobb misquotation). Only WARNS: W2 possible triples ×5 (content lists, kept with intent).
- Word count: 1,830 → 1,880 spoken words; the header's "About twelve minutes experienced" is unchanged and still accurate.
- Registry: new fact **F-U4-006** (Cobb fire-quote exact wording + falsehood pattern `cobb.{0,150}kindled(?!.{0,150}which all the waters)` guarding against misquotation and paraphrase drift; pattern tested against the repaired script and variants before adding). YAML re-parsed: 248 facts, F-U4-006 last.
- Human read-aloud / TTS skim: **pending**.

## Final re-read round — 2026-10-07
Fresh Layer-2 re-read of the repair pass returned FAIL on two items; both fixed:
- Mirror-pair antithesis ("The letter warns. It doesn't convert." echoing "He's the warning, not the hero.") → reworded to "He never freed anyone himself — the letter is a warning, nothing more." Antithesis budget now at 1 punchline shape.
- Prediction beat 2 still tested recall (question embedded the premise; answer restated Marcus verbatim) → rewritten: question withholds the premise ("The country's a lot bigger than it was in eighteen twenty. Can the Compromise settle slavery there?"), answer applies the logic ("No — the line stopped at the old Louisiana border. New land, new fight.").
- Softening per re-read observation: "land taken from Mexico" → "land ceded by Mexico."
Gates re-run: 13/13 PASS (1,858 words, 76s pauses ≈ 11.6 min experienced).
