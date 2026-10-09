## 2026-10-09 — review fixes (video2/out/review/scripts-e10-cram.md)
- Alien Friends Act: "in peacetime" -> "at any time" (topic 2); self-test Q3 answer drops "peacetime" (the Act had no peacetime condition).
- Marcus stays in his Federalist role: the no-deportations line now says "Our weapon was the Sedition Act, aimed at the editors doing France's work" (was "that's the tell... the weapon they used"); his war-scare counterfactual now ends "our critics' charge, a party protecting itself, would have stuck" (was conceding "what it was").
- Repeal/lapse beat moved from Marcus (time-travel: his knowledge stops at 1800) to Maya ([catching]); "He let the Acts lapse" -> "He let the Sedition Act lapse" (the Naturalization Act was repealed in 1802; the Alien Enemies Act never lapsed). Next line: "so this part is mine" -> "so the rest is mine too."
- Maya to Haswell: "His was a jail cell" -> "Yours was a jail cell."
- "The Alien Acts were about immigrants" -> "The Naturalization and Alien Acts were about immigrants."
- Exam tip: "the Court couldn't strike down a federal law" -> "hadn't yet claimed the power to strike down a federal law."
- Cut the exam-pitch cliche "The exam rewards following the thread across the decades." (§4.3).
- Runtime: cold open "Twelve and a half minutes" -> "About twelve minutes"; header 2,047 -> 2,046 words, ~12.2 min (2,046/180 + 50s pauses).
- Already fixed before this pass: "Maya: " on the bonus "Expiration" answer (report item 8).
- Checks: parseTranscript 64 turns, pauses 10x5; gates PASS.

# U3-E10 Changelog — v1 → v2 (full rebuild, 2026-10-06)

## What changed (v1 → v2)
- **Full rewrite, not a repair.** v1 was an 8.2-minute (~1,200-word) draft written before the 2026-10-06 standards freeze. v2 is rebuilt from scratch to the frozen guide: 2,107 spoken words, ~14.5 min experienced (~155 WPM + 69s scripted pauses). Archived v1 untouched at `_archive/apush-audio-u3-e10-script-v1-DRAFT.md`.
- **Structure rebuilt to the guide:** cold open (continuity nod to U3-E9's exact closer tease + 4 boxes + circle ritual + time promise) → quote disclosure (new, required by the debate format) → 4 topic debates → formal closings → Maya's modern-voice verdict → recap (Maya drives, "Four boxes, let's land them.") → self-test (3 CER + "One more, fast." bonus) → tagline → forward tease → "Check your boxes."
- **Exam devices added (were absent in v1):** 1 prediction beat ("Your turn." + 9s pause; a second was drafted and cut for runtime — see below), 1 common-mistake line per box (4, varied templates), 1 exam tip per box (4, varied openers, all addressing real student errors), stimulus-style self-test Q1 (Kentucky Resolutions quote).
- **Voice overhaul:** Maya now gets messily wrong once mid-episode (assumed mass deportations under the Alien Friends Act; Marcus corrects in flow), fumbles differently in the recap (Jefferson/Madison × Kentucky/Virginia swap — memory-check type), one concrete personal image (yearbook vs. cafeteria, killed for a week), and asks the counterfactual Marcus can't fully answer ("Nobody's fully sure"). Marcus's turns kept under ~90 words with Maya push-breaks; reactions varied; admits uncertainty. Haswell rewritten as measured and dignified — no caricature, no Yankee-Doodle jail march (cut as unverifiable color).
- **Time-travel fix:** v1 had Marcus (1798) citing Marbury (1803) and the 1801 expiry from inside the debate. v2 enforces the rule strictly — Marcus's knowledge stops at 1800; the verdict, pardons, expiry, and judicial-review point are Maya's modern voice only. Formal closings keep both debaters in their year.
- **Mechanical compliance (self-checked):** 1 em dash in dialogue (≤10), 0 That's/Here's line starters (≤2), 0 micro-turns (≤8), 0 "Not X, just Y" antitheses, 0 twist pivots / retired phrases, 0 "Tell me" tics, 0 uncontracted stiffness, Maya ?-ratio 5/37 (≤60%), no spoken CER labels (G13), pause tags total 69s and are counted in the runtime.
- **Cut for runtime:** a second prediction beat in Box 3 ("does a single other state sign on?") was drafted and removed; the content (zero states joined) survives in Marcus's turn and Maya's continuity tip. "Every security-versus-liberty fight since reaches back to this one" trimmed from the verdict.

## Scope decisions
- **Boxes (4):** (1) XYZ Affair + Quasi-War, (2) the four Acts, (3) the Republican counter (VA/KY Resolutions + compact theory), (4) the election of 1800 as the verdict.
- **Continuity:** cold open nods to U3-E9's closer tease verbatim ("the parties we just built turn on each other, and on France"); one continuity sentence covers Hamilton's program implicitly via the party frame — no re-teaching. U3-E8's ratification referenced only ("ten years after the Bill of Rights" grounding for Haswell's case).
- **Election-of-1800 boundary:** this episode covers the election ONLY as the verdict on the Acts (thrown out, sunset expiry, pardons, ballot-box check). The tie mechanics, House vote, and "Revolution of 1800"/peaceful-transfer narrative are U3-E11's territory — teased ("the tie that threw the election into the House"), never taught. No ballot counts taught here (avoids the princeton "35 ballots" trap and U3-E11 overlap).
- **Convention of 1800:** mentioned only inside Marcus's 1798-voice closing horizon? No — cut entirely. The Quasi-War's end is out of scope (verdict box is about the Acts, not the war). Layer 3: confirm no claim in the script depends on the Convention.
- **Afterlife:** Maya's modern voice only, kept to two beats — the Alien Enemies Act still on the books, and the security-vs-liberty template. No Espionage Act deep dive (that's later units' territory).

## Source-reliability notes (for Layer 3 + registry)
- **princeton ch7 "5 to 15 years" — VERIFIED BOOK ERROR.** Naturalization Act 1798 extended residency 5→14 years, confirmed by HISTORY, National Geographic, and americanhistorycentral. Script teaches 14. Registry candidate: falsehood pattern for "15 years."
- **princeton ch7 "It took 35 ballots" — VERIFIED BOOK ERROR (sloppy condensation).** The House cast 35 deadlocked ballots Feb 11–17, 1801, then elected Jefferson on the 36th (Bayard abstentions). Script avoids ballot counts (U3-E11's territory). Registry candidate.
- **prem27 ch5 "$12 million loan" — SUSPECTED BOOK ERROR.** The standard American-history figure for the XYZ demand is $250,000 bribe + $10 million loan (v1's figure; matches multiple standard accounts). Script teaches $10M. Needs Layer-3 confirmation before registry entry.
- **Alien Friends vs. Alien Enemies powers:** all three books say or imply "imprison or deport" for the Alien Acts. Tier-2 check (HISTORY, NatGeo): Friends = deportation only (peacetime); imprisonment belongs to the Enemies Act's wartime powers. Script teaches the corrected split.
- **"No! No! Not a sixpence!"** — treated as the *reported* line, disclosed in dialogue ("the line history says the Americans gave"), never as transcript. Footer notes it.
- **Standard accounts beyond Tier 1–2** (disclosed in footer, hedged in dialogue where used): all Haswell case details (lottery ad, "hard-hearted savage," midnight arrest, 50-mile ride, one-day trial, Paterson's truth instruction, $200 fine, ~2 months), Lyon ($1,000 / 4 months / re-elected from jail / the "pomp" letter), Bache (arrested, died of yellow fever pre-trial), ~two dozen prosecutions, Sedition Act expired March 3, 1801, Jefferson's pardons, Adams never ordering an Alien Friends deportation, Alien Enemies Act still on the books. **None of this is in Tier 1** — the books cover the Acts at doctrine level only. Layer 3 should verify or hedge each; nothing here is taught as Tier-1-pinned.
- **Dropped as unverifiable:** v1's "two thousand neighbors marched Haswell out to Yankee Doodle" (color with no source); v1's "longest wait in American history, before or since" for the 14-year rule (5steps-flavored superlative, not re-verified — cut rather than taught).

## Open flags for the coordinator
1. **Runtime:** 2,107 words / ~14.5 min experienced lands ~1.5 min over the 11–13 min series norm. The overage comes from the mandated device load on a 4-box debate (4 mistakes + 4 tips + prediction + disclosure + 3+1 self-test + fumble recap). Header, cold-open promise ("About fourteen minutes"), and gate count all agree. Options: accept the promise, or cut one device (the Box-3 prediction beat is already cut; next candidates would be an exam tip or the formal closings).
2. **Prediction beats:** 1 (guide allows 1–2). The second was cut for runtime; if the coordinator prefers 2, restore the Box-3 "does a single other state sign on?" beat (+~25 words).
3. **Registry:** no E10-period facts exist in `apush-fact-registry.yaml` yet. The three book-error findings above are registry candidates pending Layer-3 confirmation — I did not write to the registry (writer shouldn't unilaterally add facts).
4. **Nothing in `~/workspace/apush/` was touched.** No pushes, no repo writes. v1 archive untouched.

## Validation + repair history (2026-10-06/07)
- Layer 1: first run failed G6 (button-word loops: "[18-second pause]" x3, "Checking that one." x4) and G7 (pause tags not named in read note). Repaired: self-test pauses varied to 15/18/20s, mid-episode checkoffs cut to one "Checking that one." (the other three "Box N is landed" lines kept as debate round-bells), read note names all five pause tags, header corrected to gate-counted words. Final: 13/13 PASS (2,056 words, ~12.5 min experienced).
- Layer 2 (fresh ear read): verdict NOT lock-ready — 2 lock-blockers + 8 flags. Repaired: (1) quote disclosure now lists the Kentucky Resolutions' nullification line (was 4 quotes, dialogue presents 5); (2) "every states'-rights fight" → "many" (the checklist's literal overclaim example); (3) First Amendment quote now spliced with ellipsis ("Congress shall make no law…"); (4) "in 1798" hedge removed from Haswell's mouth; (5) "that hearing Haswell" → "that trial, Haswell" (vocative comma + wrong noun); (6) Mortefontaine dropped from pronunciation (never spoken; Quasi-War's end deliberately left unnarrated — the recap's 1798–1800 dates carry it); (7) header/read note now "1798–1800 voice" (his recounted events postdate 1798); (8) Lyon quote restored to full wording ("an unbounded thirst…"). Kept with intent: four mid-episode "Box N is landed" round-bells + full recap (debate needs the beats), 41s cold open (hook lands at word ~44), W1 production-note "do not," W2 content lists.
- Layer 3 (fresh fact check): verdict LOCK NOT BLOCKED — zero wrong/unverifiable claims in dialogue. Three confirmed Tier-1 book errors + one confirmed imprecision, all independently verified per the user's rule (exact book line quoted + independent trusted source): princeton "5→15 years" Naturalization (correct: 14 — Britannica/NatGeo; book also mislabels it "The Alien Act"); princeton "It took 35 ballots" (correct: 36th ballot, Feb 17, 1801 — Monticello/American History Central; 5steps2024 ch11 corroborates); prem27 "$12 million loan" XYZ (correct: $10M + $250k bribe — Britannica); prem27 "imprison and deport" for the Alien Friends Act (conflation — Friends Act is deportation-only presidential power; imprisonment belongs to the Enemies Act's wartime powers — Britannica). None of the erroneous figures appear in the script; it teaches the correct ones throughout. Registry: F-U3-049 through F-U3-052 added same day.
- Fresh Layer-2 re-read of all repairs: PASS (pending).

## Post-re-read polish (2026-10-07)
- Fresh Layer-2 re-read: REPAIRS VERIFIED, all 9 repairs clean in context, no new slop. Two FYI notes: (1) CER model answers used "The evidence:" / "The reasoning:" as sentence connectors — label-adjacent, so rewritten to pure connective tissue ("And the giveaway is the verb 'void'"; em-dash pivots). Zero label-adjacent connectors remain. (2) "millions for defense, but not one cent for tribute" appears in quotes twice without the quote/End-quote ritual — pre-existing, framed as the country's rallying cry (not attributed to a figure), left as-is.
- Final: 2,053 words, ~12.5 min experienced, 13/13 gates PASS.

## v2 → v3 (fleet repair, 2026-10-08)

Repair worker applied the 2026-10-07 fleet audit findings (6 blockers, 4 must-fix, 15 watch items). v2 untouched. Final: **2,046 words, ~12.5 min experienced (2046/180 + 68/60 = 12.50), 13/13 gates PASS** (`--minutes 12.5`). Tone-tag density 44/54 (81.5%) → 19/58 (32.8%). Em dashes in dialogue: 2 (unchanged). No new That's/Here's/Here-is starters. Self-test stays fully neutral. Nothing in `~/workspace/apush/` touched; nothing pushed.

### B-1. Tone-tag density 81.5% → 32.8%
Stripped all 15 `[conversational]` and 9 `[measured]` tags; kept tags only where the beat genuinely changes (cold open, Maya's genuine questions, takeaways, fumble `[sheepish]`, uncertainty, Haswell's debate heat). Four new Marcus correction turns (B-2) are untagged. Before: `Maya: [conversational] Box one is landed, the XYZ Affair and the Quasi-War.` → After: `Maya: Box one is landed, the XYZ Affair and the Quasi-War.` (same treatment on all 24 default-tagged turns).

### B-2. Four announcer traps rebuilt as live traps (Maya-error → Marcus-correction, strong marker, next turn, different speaker)
1. X/Y/Z flip. Before: `Maya: [conversational] The mix-up I keep seeing: X, Y, and Z were the French agents, not the American envoys. The Americans were Pinckney, Marshall, and Gerry. Don't flip them.` → After: `Maya: So Adams codes his own men as X, Y, and Z. Pinckney, Marshall, and Gerry, the American envoys, their names scrubbed out of the dispatches.` / `Marcus: Common mix-up. Flip it. X, Y, and Z were the French agents, their names scrubbed from the published dispatches. The Americans were Pinckney, Marshall, and Gerry, named all along.`
2. Alien vs Sedition. Before: `Maya: [firm] Don't write that the Alien Acts were the speech crime. The speech crime was the Sedition Act. The Alien Acts were about immigrants. Students blur all four into one law, and the exam separates them.` → After: `Maya: So the Alien Acts were the speech crime, the laws that put the editors in jail.` / `Marcus: Not quite. The speech crime was the Sedition Act. The Alien Acts were about immigrants: longer waits for citizenship, deportation powers. Keep the four laws separate, because the exam does.`
3. Secession vs nullification. Before: `Maya: [conversational] Students lose points when they write secession but mean nullification. Nullification says a state can void a federal law. Secession says a state can leave. Different claims, different crises.` → After: `Maya: So nullification is where the states first say they can secede. Same family tree, right?` / `Marcus: Common mistake. Nullification says a state can void a federal law inside its borders. Secession says a state can leave the Union. Different claims, different crises. Don't file them together.`
4. Repeal vs lapse (moved before the verdict so the correction feeds it). Before: `Maya: [conversational] The verb trap: the exam baits you with "repeal." Jefferson didn't repeal the Acts. He let them lapse. Lapse, not repeal.` → After: `Maya: So Jefferson rides in and repeals the whole package. Day one, clean slate.` / `Marcus: Not quite. The exam baits you with that verb. Jefferson never signed a repeal. He let the Acts lapse.`

### B-3. Negation-replacement antitheses 9 → 2
Kept the 2 substantive ones, both Haswell debate heat: `Not the nation in wartime. The government, which means the Federalist Party.` and `Not no law unless frightened. No law.` Reworded the other 7 as plain positives:
- `No declaration, just warships.` → dropped (turn now ends `an undeclared naval war.`)
- `The deportation power was a threat, not a program.` → `The deportation power sat unused.`
- `The exam rewards the thread, not the single event.` → `The exam rewards following the thread across the decades.`
- Trap-1/2/4 antitheses → absorbed into the live-trap rewrites above (all positive).
- `the answer is the election of 1800, not the courts.` → `the check was the election of 1800.`
- Also fixed the gate-only hit the audit didn't list: `name the mechanism, not just the event.` → `give the mechanism: a published bribe demand turning embarrassment into national outrage.` (G9 now passes clean.)

### B-4. Triple-parallel cadences 4 → 1
Kept #1 (Haswell's `Slow citizenship for the people likely to vote against you, deport the ones you can't convince, jail the editors who complain.` — carries real logic in his voice). Broke the other three:
- `Naturalization: immigrant voters. The Alien Acts: French immigrants. The Sedition Act: Republican editors.` → `The Naturalization Act stretched the citizenship wait to fourteen years, slowing the immigrant vote that leaned Republican. The Alien Acts handed the president deportation power over foreigners he called dangerous. The Sedition Act put Republican editors in jail for what they printed.`
- `a frightened government criminalizes dissent, the dissenters go to jail, and the voters get the last word.` → `when a frightened government criminalizes dissent, the voters get the last word at the ballot box.`
- `Voters, foreigners, and the press. Three moves, one strategy.` → `Three different targets, one political strategy.`

### B-5. Haswell case details — fail-closed hedge applied
Checked the full Tier-1 hierarchy myself before cutting: grepped `books/extracted/5steps2024/`, `premium2027/`, `princeton/`, all of `public_contnent/` (incl. Unit 3 transcripts), and URP content for `haswell` — **zero hits**. (`bache` hits in the books are all "Gorbachev.") Confirmed the auditor's finding. Before: `Haswell: [intense] I felt that weapon. I printed an ad for a lottery to pay Congressman Lyon's fine, and called the marshal a hard-hearted savage. The marshal came to my house at midnight, put a sick man on a horse, and rode me fifty miles to jail. The judge told the jury the truth would save me only if I proved every word of every charge. Two hundred dollars fine. About two months in a Bennington jail. My crime was printing words, ten years after the Bill of Rights.` → After: `Haswell: [intense] I felt that weapon. I printed words, and they jailed me for them. A Vermont editor in a jail cell, for a newspaper.` (hedged to what Tier 1 verifies — princeton ch7: the acts "allowed the government to forcibly expel foreigners and to jail newspaper editors for 'scandalous and malicious writing'"). His formal closing was reworked to match: `They drew the line around their critics. I printed words and went to jail. A written-in expiration is no comfort to the man already behind bars. If the republic can't survive a newspaper, it isn't the newspapers that are the problem.` (cut "rode fifty miles" and "Tell Bache"). Layer 3 may restore specifics with Britannica/NPS pins.

### B-6. Lyon letter quote + Lyon/Bache specifics — cut
Same Tier-1 check: **zero hits** for `lyon` or Benjamin Franklin Bache in the books or transcripts. Before: `Maya: [conversational] The victims had names. Congressman Lyon: a thousand-dollar fine, four months in jail, re-elected from his cell, for a letter accusing Adams of, quote, "an unbounded thirst for ridiculous pomp, foolish adulation, and selfish avarice." End quote. And Benjamin Franklin Bache, Ben Franklin's grandson: arrested for his newspaper, dead of yellow fever before trial.` → After: `Maya: The weapon had targets. The Sedition Act's prosecutions reached Republican editors, and officeholders too. Men went to jail for words on a page.` The verbatim letter quote is gone (no source line behind it); the passage now teaches only what Tier 1 supports. The quote-disclosure turn was updated to match: before `the Sedition Act's words, the First Amendment, a congressman's letter, the Kentucky Resolutions' nullification line, and the famous reply to the French` → after `the Sedition Act's words, the First Amendment, the Kentucky Resolutions' nullification line, and the famous reply to the French`. The verdict's `Jefferson pardoned the convicted, Lyon among them.` → `Jefferson pardoned the convicted.` Layer 3 may restore with Tier-2 pins.

### M-1. Feed line
Before: `Maya: [conversational] The war fever is the kindling. The Acts are the fire. Marcus, name them.` → After: `Maya: The war fever is the kindling. The Acts are the fire. Four separate laws, Marcus. Why not one big crackdown? What did each one actually do?` (real question, not a cue).

### M-2. "ten years after the Bill of Rights"
Cut with the B-5 hedge (Dec 1791 → May 1800 is ~8.5 years, not ten). The hedged Haswell turn carries no date arithmetic.

### M-3. Fumble tag
Before: `Maya: [incredulous] Wait, Kentucky was Madison's, the interpose one. No. ...` → After: `Maya: [sheepish] Wait, Kentucky was Madison's, the interpose one. No. ...` (fleet-canonical for Maya caught wrong).

### M-4. Header word count
2,053 → **2,046** (gate-counted; header, cold-open promise "Twelve and a half minutes," and actual 2046/180 + 68/60 = 12.50 min all agree).

### Watch items
- W-1: `more than three hundred by 1797` → `more than three hundred by the time Adams sent envoys` (Tier 1 pins the quantity, not the year).
- W-2: sixpence disclosure strengthened — `with the reply history gives them` → `with the famous reported reply` (reported-not-verified wording disclosed as such).
- W-3: `The country rallies behind "millions for defense, but not one cent for tribute."` → `The country rallies behind the reported toast, "millions for defense, but not one cent for tribute."` (attributed as reported, not presented as transcript).
- W-9: cut `even writing it felt dangerous` → `Jefferson wrote Kentucky's in secret.` (unverifiable interiority removed).
- W-10: cold-open flattening softened — `Congress passes a law making it a crime to criticize the president.` → `Congress passes a law that can jail a man for printing words against the government.` (the accurate statutory text still lands in Marcus's four-laws turn).
- W-11: Sources section relabeled — the old "Tier 2" list (HISTORY, National Geographic, americanhistorycentral) is now "Verification references (the standard's Tier 2 is Britannica + NPS only — HISTORY, National Geographic, and americanhistorycentral are standard-account references, NOT Tier-2 sources)." The cut B-5/B-6 specifics are listed as CUT with the Layer-3 restoration note.
- W-12: both feed-adjacent moderator lines checked — `Marcus, set the table. How do France and America get from allies to a bribe demand?` and `The Republicans don't just take it. Haswell, your side answers with the Kentucky and Virginia Resolutions. What did they say?` both carry real content; kept.
- W-13: exam-tip templates varied — `Bank points by explaining...` (box 2), `If an SAQ asks for a cause of the Quasi-War, give the mechanism:...` (box 1), `Exam-day tip: when the question asks how the Sedition Act was checked,...` (box 4). No template monoculture.
- W-14: the two existing That's/Here's/Here-is sentence starters kept (`Here is the text that matters.` / `That's all four.`); a repair-introduced third (`That's the verb the exam baits you with.`) was caught by G1 and reworded before finalizing. No new starters added.
- W-4/W-5/W-6/W-7/W-8: left for Layer 3 (see below). W-7 partially hedged in-dialogue: `it expired March 3rd, 1801, Adams's last day` → `it expired on Adams's last day in office` (dropped the unpinned exact date; Tier 1 verifies "lapse"/"not renewed" only).

### Still needs Layer-3 Tier-2 (Britannica/NPS) pins — NOT resolved by this repair
1. **B-5/B-6 specifics** — may be restored only with Tier-2 pins (midnight arrest, 50-mile ride, $200 fine, ~2 months, truth-defense instruction, Lyon's fine/jail/re-election/letter wording, Bache's arrest/death).
2. **W-4** — `As far as the record shows, Adams never deported a single person under the Alien Friends Act.` Hedge is honest and well-placed; Layer 3 to rule whether the hedge suffices or a Tier-2 pin is needed.
3. **W-5** — `Not one other state adopted them.` Tier 1/2 silent; old NatGeo cite is not Tier 2. Pin or hedge.
4. **W-6** — truth defense as an advance on English seditious libel. Standard legal history; pin or hedge.
5. **W-7** — Jefferson's pardons of the convicted. Standard account; pin.
6. **W-8** — Madison's "interpose" (glossed inline, historically his word, but Tier-1/2-silent). Confirm.
7. **W-15** — lesson-map overlap (two consecutive episodes centered on the election of 1800): not a repair fix; flagged for the coordinator.

### Registry
No registry additions. The B-5/B-6 work was cuts/hedges, not newly taught facts; no new book-error claims were made (F-U3-049–F-U3-052 already cover this episode's book errors). No YAML edit was made, so no re-parse was needed.

## v4 → v5 (re-read residual repair, 2026-10-08)

Three residuals found by the independent re-read. No other text touched; `diff` v4 vs v5 shows only these three rewords + header bookkeeping (DRAFT v3. → v5., 2,046 → 2,047 words). v4 archived untouched.

### R-1. "Every" overclaim — Marcus's closing line (same class as the v4 fix)
Before: `Marcus: ...We drew the line where every nation draws it, and we wrote the line to expire.`
After: `Marcus: ...We drew the line where many nations draw it, and we wrote the line to expire.`
(Word-neutral; rest of the line untouched. `grep "every nation"` = 0 hits post-fix.)

### R-2. Second triple-parallel cadence — self-test Q3 model answer
Before: `Maya: Naturalization hits immigrants who'd vote Republican: fourteen years instead of five. The Alien Friends Act hits foreign residents the president calls dangerous: deportation, in peacetime. The Sedition Act hits Republican editors and critics: jail for words. Three different targets, one political strategy.`
After: `Maya: Naturalization targeted immigrants who'd vote Republican — fourteen years instead of five. The Alien Friends Act gave the president peacetime deportation power over foreign residents he called dangerous. And the Sedition Act put Republican editors and critics in jail for words. Three different targets, one political strategy.`
(All three targets, all three consequences, and the 14-vs-5 detail survive; only the "hits… hits… hits" parallel rhythm goes. Kept Haswell chain is now the sole triple-parallel cadence episode-wide.)

### R-3. Stale header metadata
Before: `# Episode 27: Adams and the Alien and Sedition Acts. DRAFT v3.` / `# Word count: 2,046 spoken words (pause tags stripped).`
After: `# Episode 27: Adams and the Alien and Sedition Acts. DRAFT v5.` / `# Word count: 2,047 spoken words (pause tags stripped).`
(Header previously read "v3 / 2,046" on a v4 file the re-reader counted at 2,042; now matches the gate-counted v5 total.)

### Mechanical verification
- Gates 13/13 PASS (`python3 apush-script-gates.py apush-audio-u3-e10-script-v5-DRAFT.md --minutes 12.5`): 2047 words, 164 WPM @ 12.5 min. W2 warnings only (L7/L13/L17/L29 false positives — identical to v4, no new hits).
- Runtime: word delta v4→v5 is +5 words (R-1 neutral, R-2 +5, header not gate-counted); 68s scripted pauses unchanged. 2047/180 + 68/60 = 12.51 ≈ 12.5 min — the cold-open's "Twelve and a half minutes" promise still holds.
- Tag density: no tags added or removed (R-1 in untagged Marcus turn; R-2 in untagged Maya turn) — 19/58 = 32.8%, unchanged from v3/v4, under the ~40% cap.
- Antitheses: exactly 2 episode-wide, both untouched budgeted ones (Haswell's "Not the nation in wartime." and "Not no law unless frightened."). No new negation-replacement forms in dialogue (only hit is the non-spoken Sources footer). The two known That's/Here's mid-turn phrases ("Here is the text that matters." / "That's all four.") are not line starters; G1 passes.
- Triple-parallel cadences: exactly 1 episode-wide (the kept Haswell chain `Slow citizenship… deport the ones you can't convince, jail the editors who complain.`).

### Registry
No registry additions. Three rewords + header bookkeeping only; no facts taught, changed, or cut.

---

## v3 → v4 (re-read residual repair, 2026-10-08)
Three residuals found by the independent re-read (all pre-existing v2-audit misses, not v3 repair damage). No other text touched; `diff` v3 vs v4 shows only these three rewords. v3 archived untouched.

### R-1. Antithesis over budget (3 vs ≤2) — Maya's verdict line
Before: `Maya: You're both stuck in 1800, so this part is mine. The verdict wasn't a resolution. It was an election.`
After: `Maya: You're both stuck in 1800, so this part is mine. The verdict was an election.`
("wasn't X. It was Y." form → plain positive. Everything before "The verdict" untouched. The two budgeted antitheses are untouched and still the only two episode-wide: Haswell's "Not the nation in wartime. The government, which means the Federalist Party." and "Not no law unless frightened. No law." Fresh manual sweep of all 51 dialogue lines post-fix confirms exactly 2 remain.)

### R-2. Triple-parallel cadence over budget — Maya's XYZ war-fever line
Before: `Maya: It helps him, enormously. A diplomatic insult becomes a national one, the Republicans who'd cheered France go quiet, and Adams gets his war fever.`
After: `Maya: It helps him, enormously. A diplomatic insult becomes a national one, which quiets the Republicans who'd cheered France and hands Adams his war fever.`
(Three parallel finite clauses subordinated to a relative clause; meaning kept: insult → national; Republicans quieted; Adams gets war fever. Post-fix manual count: exactly 1 triple-parallel cadence episode-wide — the kept Haswell chain "Slow citizenship for the people likely to vote against you, deport the ones you can't convince, jail the editors who complain.")

### R-3. "Every" overclaim (lock bar) — Marcus's wartime line
Before: `Marcus: ...Every nation in history has drawn this line in wartime.`
After: `Marcus: ...Many nations in history have drawn this line in wartime.`

### Mechanical verification
- Gates 13/13 PASS (`python3 apush-script-gates.py apush-audio-u3-e10-script-v4-DRAFT.md --minutes 12.5`): 2042 words, 163 WPM @ 12.5 min. W2 warnings only (L7/L13/L17/L29 false positives, all pre-existing).
- Runtime: word delta v3→v4 is −4 words (R-1 −4, R-2 and R-3 word-neutral); 68s scripted pauses unchanged. Runtime change −4/180 ≈ −0.02 min — stays at the 12.5-min promise (gate-counted 2042/180 + 68/60 = 12.48 ≈ 12.50).
- Tag density: no tags added or removed (all three rewords are in untagged lines) — unchanged from v3's 32.8%, within the ~40% cap.
- No new negation-replacement forms; no new That's/Here's line starters (only change to sentence inventory is R-1/R-2 rewords).

### Registry
No registry additions. Three rewords only; no facts taught, changed, or cut.
