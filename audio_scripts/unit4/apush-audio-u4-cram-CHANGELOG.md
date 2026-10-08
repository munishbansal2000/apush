# U4-CRAM Changelog — v1 → v2 (2026-10-07)

## What changed
Full rebuild from the archived v1 draft to the frozen 2026-10-06 standards, in the U3-CRAM v2 house shape:
Study Buddies rapid-fire (Maya drills, Jay answers/stumbles/gets corrected), then a unit-thesis beat, then two
predict-the-DBQ bets with thesis sketches, then a unit sign-off. ~15 min experienced (2,519 words speech + 46s pauses).

## Structure
- 15 rapid-fire beats, one per lesson (E1–E15 v2), replacing v1's 10 cumulative questions. Every lesson gets exactly
  one beat: nothing re-taught, nothing dropped, no references to dropped content.
- Unit-thesis beat rewritten fresh from v1's line: democracy for white men + the tightening slavery knot.
- Two DBQ predictions with thesis sketches: Jacksonian democracy (highest-probability prompt) and the Market Revolution
  (backup). Model answers carried as plain analytical beats — no spoken Claim/Evidence/Reasoning labels (G13).
- Closer is unit sign-off only. v1's "Bring bandages" Unit 5 tease cut by standing order.

## Rebuild-era corrections applied (from the fifteen rebuilt episodes + registry)
- Deere's steel plow: 1837, not 1847 (premium2027's 1847 is a book error, independently confirmed — F-U4-007).
- Horace Mann: MA education secretary 1837–48, not the 1850s (F-U4-063); Dix = asylums, Mann = schools.
- Treaty of New Echota: signed by ~20 men, ratified by a single Senate vote (F-U4-031).
- Cherokee removal carried out under Van Buren, not Jackson (F-U4-029).
- "54-40 or Fight": shouted AT Polk, not his slogan (F-U4-076); Oregon settled at the 49th parallel.
- Annexation: up to four new states from Texas (with Texas's consent), not a fixed five.
- Sequoyah: 86 symbols, not 85 (F-U4-034).
- Seneca Falls: ELEVEN resolutions, not twelve (F-U4-074); the 9th (vote) was the contested one; the NY Married Women's
  Property Act was already law when the convention met (timing trap).
- Jackson's "enforce it" line: possibly apocryphal, flagged as legend (F-U4-028).
- Treaty of Paris 1763 ≠ 1783: "everything east of the Mississippi" is the 1763 line; 1783 = almost everything east of
  the Mississippi except Florida back to Spain.
- Specie Circular 1836: federal land only — never "Jackson banned paper money" (F-U4-026).
- Panic of 1837: verdict genuinely split, no single hand (F-U4-027).
- Force Bill: never used; nullification ≠ secession (F-U4-020, F-U4-022).
- New Orleans: battle fought two weeks AFTER Ghent was signed; Ghent settled nothing.
- Sutter's Mill gold: Jan 24, 1848 — nine days BEFORE the Guadalupe Hidalgo signing (F-U4-083).
- Wilmot Proviso: never became law; the fight was over the next settlers (F-U4-082).
- Gag rule: House 1836–44, not Senate (F-U4-066); Nat Turner: 55 killed (F-U4-065).
- Corrupt bargain: taught as Jackson's charge (unproven, historians argue), not a proven backroom deal.

## Verification
- Cross-checked against all fifteen rebuilt Unit 4 episodes (E1 v4, E2–E15 v2) — zero contradictions, zero references
  to dropped content. Episode-level verification log is in the draft's ## Sources footer.
- `apush-script-gates.py`: 13/13 PASS (see self-check in parent report). Pause tags named in the read note (G7);
  cold-open promise, header, and gate-counted word count agree on ~14 min experienced (speech at ≤180 WPM + pauses).
- Not validated beyond the gates — L2 (clean-context read) and L3 (fact-check) are for other agents.

## Validation + repair history (2026-10-07)
- Layer 1 (gates): 13/13 PASS (writer self-check + coordinator re-run).
- Layer 2 (fresh ear): LOCK-READY, no blockers; 8 minors repaired —
  "That is"→"That's"; "Halfway: six"→"Nearly halfway: six"; "in one breath" de-duplicated (kept at Marshall beat, compressed at Trail beat); "pipeline"→"chain"; thesis beat folded to one sentence; Jay's Q9 Panic answer de-experted (partial stumble + Maya completion); triple cadence noted-but-kept (factual list); cold-open scaffolding judged series grammar (kept).
- Layer 3 (fresh fact-check): BLOCKED → 3 blockers, all repaired —
  (1) "three extra words" → "two extra words" (the Sentiments inserts "and women" into "all men are created equal"; Tier 1 verified; error inherited from U4-E13 v2 — flagged to parent); (2) "voted in the millions" → "voted by the million" (1828 electorate ~1.1M; compression distortion fixed); (3) Trist-after-recall taught flat → hedged "the story goes" per F-U4-086.
- Registry: +1 (F-U4-089, two-extra-words correction).
- Fresh Layer-2 re-read of repairs: [pending at this writing]

## Repair re-read (fresh agent, 2026-10-07)
- Verdict: all 9 repairs clean in context, no seams, no new violations. One fix applied: header word count synced 2,519 → 2,565 (repair pass added ~46 words, mostly R8's Maya completion turn). Cold-open promise ("about fifteen minutes") still holds at 15.02 min experienced. Gates re-run: 13/13 PASS.
- Note: R4's repair-log beat label was misfiled ("Texas beat") — the line is in the War of 1812 beat (Q3); text itself correct.

## v3 fleet-repair (2026-10-08, repair worker — full audit findings applied)

Direction-tag density 94%→~20% (17 tone tags / 86 dialogue turns). Workhorse `[energetic]`/`[conversational]`/`[casual]`
stripped from every turn no beat genuinely earned; kept per the §9 fleet mapping: cold open `[professional broadcast tone]`,
Jay caught-wrong `[sheepish]` (10x), Jay's genuine Panic-essay question `[curious, inquisitive tone]`, the both-sides
myth-bust `[firm]`, the removal death toll `[serious tone]`, thesis takeaways `[confident tone]` (2x), the earned chain
`[building]`. Self-test carries zero tags. Rapid-fire question turns are neutral. Retag: Jay's closer thesis line was
`[confident tone]` (off his speaker tendencies) → now untagged.

Fixes, each with before → after:

- **F16 (MAJOR, tag density):** `Maya: [energetic] Next. Four Marshall cases, one breath each.` → `Maya: Question two:
  four Marshall cases, one breath each.` (all 14 standalone number-labels folded the same way; `Nearly halfway: six.`
  and `Last one: fifteen.` kept as the two standalone fragments).
- **F13 (MAJOR, fact/framing):** `"Scott landing at Veracruz and taking Mexico City in twenty-one months."` →
  `"The war itself: twenty-one months. Taylor's army in the north; Scott landing at Veracruz in March of forty-seven
  and taking Mexico City that September, about six months from beach to capital."` — the twenty-one months now
  attaches to the war (1846–48, premium2027), Scott's campaign gets its own ~6-month frame. Registry F-U4-090.
- **F6 (antitheses 4→1):** `"But New Orleans didn't end the war. The treaty was signed two weeks before the battle."`
  KEPT (the one). Cut/reworded: `"nullification is not secession. Nullification keeps the state in while voiding
  the law."` → live trap (`Jay: So nullification is basically secession with a nicer name?` / `Maya: The exam's
  favorite blur. And no: nullification keeps the state in the Union while voiding the law inside its borders.
  Secession leaves the Union entirely.`); `"The House. Not the Senate."` → `"The House gag rule, eighteen thirty-six
  to forty-four. The Senate never passed one.`; `"Because it wasn't about the people already there. It was about the
  settlers coming next"` → `"Because it was never really about the people already there. The fight was over the
  settlers coming next: free-labor North against a South that heard the territories closing for good."` Borderline
  `Not by itself.` / `The convention didn't cause it.` left as found.
- **F7 (triples 5→1):** kept only the earned chain (`Test it. Louisiana: more land, more slavery fights…`).
  `"Fifteen lessons, fifteen questions, eighteen hundred to eighteen forty-eight"` → `"Fifteen lessons in one cram —
  eighteen hundred to eighteen forty-eight, in about seventeen minutes."`; `"white and Black, enslaved and free,
  women on the stage"` → `"white and Black worshippers together, enslaved people standing beside free ones, with
  women speaking on the stage."`; `"wider votes, bigger maps, louder markets"` → `"The vote spread, the map stretched
  to the Pacific, and the markets roared — and every mile of it made the slavery question harder to dodge."`;
  `"Sleep. Water. Go get the five."` → `"Get some sleep and drink some water — then go get the five."`
- **F8 (fragments):** 14 standalone number-labels folded into their question turns; kept exactly 2 standalone
  fragments (`Nearly halfway: six.`, `Last one: fifteen.`). Integrated: `"Sixty-three, everything. Eighty-three,
  everything except Florida."` → Jay's new BEFORE/AFTER-map thought; `"Thirty-seven."` → `"Thirty-seven, and the
  book is wrong, and I'm the one paying for it."`; `"At him."` → `"The slogan was aimed at Polk. It was never his
  own."`; `"Both."` → `"British credit tightened and cotton prices fell — four causes…"`; `"Never voted on."` →
  `"The spot resolutions were never voted on."`
- **F9 (tagline):** Jay's near-repeat `"Democracy for white men. And a knot that tightens."` replaced with a new
  thought: `"And every one of those fifteen questions fed the same knot."` — the tagline now lands exactly once
  (`Jay: Democracy for white men. The knot tightens.` in the closer).
- **F19 (8 live traps):** Parises (`Jay: So the Treaty of Paris handed America the whole east bank of the
  Mississippi?` / Maya catches with the 1763/1783 split); Marbury-vs-McCulloch (`Jay: So Marbury's the one where
  federal law outranks state law?`); Erie Canal federal (`Jay: And the Erie Canal, the big federal project of the
  era?`); nullification/secession (above); paper money (`Jay: And the Specie Circular, that's Jackson banning paper
  money?` / `Maya: Never write that. The Circular covered federal land only…`); Sequoyah 85 (`Jay: Sequoyah's
  syllabary: eighty-five symbols, going in my notes.` / `Maya: Eighty-six. Eighty-five is the trap number.`);
  Mann/Dix cross (`Jay: So Mann is the asylums one?` / `Maya: You just crossed them. Mann is schools…`); Seneca Falls
  timing (`Jay: So Seneca Falls got New York to pass the Married Women's Property Act?` / `Maya: Timing trap. The
  Act was already law when they met.`).
- **F10/F11 (self-test ritual):** added `"Three questions, AP-shaped."` framing before the predictions; first is a
  stimulus-style source question (1848 newspaper cartoon: Uncle Sam slicing Mexico, enslaved man chained beside the
  table → "What's the cartoonist arguing?") with a model read in natural CER tissue; the two DBQ bets follow as
  questions two and three. `[15-second pause]` named in the read note; self-test untagged.
- **F12:** all 13 rapid-fire `[energetic]` tags stripped (folds into the F16 density fix).
- **F4 (Jay's genuine question):** added at the Panic beat — `Jay: [curious, inquisitive tone] So if the verdict is
  genuinely split, what does the grader actually want? I can't just list four causes and shrug.` (Maya's weighing
  answer follows).
- **F1 (boxes):** cold open names all fifteen boxes one per lesson (`Louisiana, the Marshall Court, … the war with
  Mexico`); the closer's "Check your boxes." now resolves.
- **F2 (forward tease):** closer ends `"Next time: eighteen forty-eight to eighteen seventy-seven — the knot snaps."`
- **F3 (cold open):** `"Last time: the republic bought half a continent…"` reframed without the confusing nod:
  `"Fifteen lessons in one cram — eighteen hundred to eighteen forty-eight, in about seventeen minutes."`
- **F5 (Jay echoes):** `L30` Parises echo → new BEFORE/AFTER-map thought; `L48` Hartford echo → `"So New Orleans
  is the most famous battle that changed nothing."`; shared tagline → new thought (F9).
- **F14 (weak attribution):** `"Historians still argue about it."` → `"The charge was never proven, and historians
  are still split on whether the two of them had any real understanding."` (debate's sides named).
- **F17:** Jay's `[confident tone]` closer line → untagged (casual delivery).
- **F15/F18:** not touched per instructions (watchlist left; F18 resolved by the density mapping).

Gate-driven extras (mechanical, beyond the audit): em-dashes 28→5 (kept the 4 earned beats + 1 new); `"That's"`
starters 4→2; `"shouted at Polk, not by him"` / `"weigh them, not pick one"` / `"Gradual, not abolition"` reworded
under the updated G9; the 1763 Paris teaching line rephrased around the overbroad F-U3-037 G12 pattern (content
unchanged: 1763 handed Britain the lands east of the Mississippi minus New Orleans).

## Verification (v3)
- `apush-script-gates.py apush-audio-u4-cram-script-v3-DRAFT.md --minutes 17`: 13/13 PASS (168 WPM; warns only on
  mechanical two-comma coordinations, e.g. "three parts, and the Monroe Doctrine's open secret" — normal lists,
  not rhetorical triples).
- 2,852 spoken words + 61s pauses = 16.9 min experienced; cold-open promise ("about seventeen minutes") and header
  agree. Tone-tag density 19.8% (17/86), under the §9 ~40% cap.
- Registry: +1 (F-U4-090, Scott-duration framing pattern `Scott.*twenty-one months`); `yaml.safe_load` parses;
  pattern trips the v2 line, not the v3 line.
- Layer 2 (fresh ear) and Layer 3 (fact-check) are for other agents. Nothing in ~/workspace/apush/ touched; no push.

## 2026-10-08 — §4.4 parallel-triple surgery (three lines reworded, nothing else touched)
- Reworded the three remaining parallel triples so the "Test it" chain (L207) stands alone as the episode's one earned chain: (1) `"The real shift underneath: property lines fell state by state, white men voted by the million, and Jackson turned the veto into a policy weapon: twelve vetoes."` → `"The real shift underneath: state by state, the property lines fell. White men were voting by the million. And Jackson turned the veto into a policy weapon — twelve vetoes."` (three distinct grammatical shapes); (2) `"When a woman married, her legal identity folded into her husband's: no property, no contracts, none of her own wages."` → `"When a woman married, her legal identity folded into her husband's: she held no property of her own, couldn't bind herself to a contract, and couldn't keep the wages she earned."` (no/no/none anaphora broken, all three coverture facts kept); (3) `"America spent this half-century building a democracy for white men. The vote spread, the map stretched to the Pacific, and the markets roared — and every mile of it made the slavery question harder to dodge."` → `"America spent this half-century building a democracy for white men. The vote spread. The map stretched all the way to the Pacific, and the markets roared louder with every mile — which is exactly what made the slavery question harder to dodge."` (declarative fragment + clause chain + relative-clause closer). No direction tags on any of the three lines; all facts unchanged in meaning. Gates: 13/13 PASS at --minutes 17 (2872 words, 169 WPM; only W2 heuristic warns, unchanged). Sentence-form antitheses: still 2 ("Not federal." L73, "isn't the land — it's the fight" L213). No other lines modified; nothing in ~/workspace/apush/ touched; no push.

## 2026-10-08 — §4.4 parallel-triple surgery, part 2 (five lines reworded, nothing else touched)
- Broke the five remaining STYLISTIC parallel triples per the §4.4 ruling (inherent threeness — Missouri provisions, Maine/36-30, the bare reform list, the coverture line, the earned "Test it" chain — left alone): (1) `"Adams wrote it, Monroe announced it, British ships backed it."` → `"Adams drafted the message, but Monroe's name went on it. The British navy backed the warning."` (matched SVO clauses + "it" anaphora → two sentences, distinct shapes); (2) `"The chain: veto in thirty-two, deposits pulled in thirty-three, Biddle's credit squeeze through thirty-four, which was self-defense and leverage both."` → `"The chain: Jackson's veto in thirty-two. The next year, the federal deposits got yanked. And Biddle's credit squeeze through thirty-four, which was self-defense and leverage both."` (matched temporal PPs → three sentences, "the next year" replaces the 33 date-beat; all four facts kept); (3) `"Then the chain: the Temperance Society in eighteen twenty-six, Mann running Massachusetts schools from eighteen thirty-seven to forty-eight, Dix campaigning for asylums through the thirties and forties."` → `"Then the movement built institutions: the Temperance Society in eighteen twenty-six. Mann took charge of Massachusetts schools from eighteen thirty-seven to forty-eight. And Dix spent the thirties and forties campaigning for asylums."` (elaborated matched structure → three sentences, distinct subjects/verbs; all facts kept); (4) `"One: the expansion. Property lines fell, conventions replaced the caucus, the veto became the people's weapon."` → `"One: the expansion. Property lines fell, so nominating conventions replaced the caucus. Jackson turned the veto into the people's weapon."` (three parallel clauses → subordinate-cause clause + short active clause); (5) `"Two: the limits. The Cherokee driven west, slavery defended, women shut out."` → `"Two: the limits. The Cherokee were forced west. Defenders dug in around slavery. And women stayed shut out of the vote."` (three parallel passives → three sentences, distinct subjects/verbs). The `[firm]` tag on (2) kept in place; no other tags moved; facts unchanged in meaning. Gates: 13/13 PASS at --minutes 17 (2902 words, 171 WPM; only pre-existing W2 heuristic warns on untouched lines). Mid-repair G8 FAIL caught (my drafts had introduced 3 em-dashes, 12 > 10) and fixed back to 9 before finalizing. Sentence-form antitheses: still 2 ("Not federal." L73, "isn't the land — it's the fight" L213). Nothing in ~/workspace/apush/ touched; no push.
