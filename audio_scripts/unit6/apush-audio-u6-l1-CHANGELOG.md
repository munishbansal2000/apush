# APUSH U6-L1 Changelog — v1 (LOCKED) → v2 DRAFT (2026-10-07)

## Structural decisions
- Full rebuild to the frozen 2026-10-06 standards. v1's prose, jokes, and structure were NOT reused (per brief); v1 served as topic inventory only.
- Four boxes per the series plan: (1) the muckrakers / the progressive impulse (Sinclair, Tarbell, Riis, Steffens; Social Gospel; Hull House), (2) the states lead (initiative, referendum, recall, direct primary, secret ballot, Wisconsin Idea, 17th Amendment), (3) the Square Deal (three C's, 1902 coal strike, trust-busting legend vs fact, conservation; 1912 election; New Freedom: Clayton, FTC, Federal Reserve), (4) verdict: who progressivism served, controlled, and left out (race/Wilson, women's suffrage, the four amendments, Prohibition as control).
- Cold open: one continuity sentence situating the era after Unit 5 (Reconstruction's death, Jim Crow). No previous-episode callback — this is Unit 6's first lesson.
- Closer teases ONLY U6-L2 (WWI neutrality to war). No forward-teaching of L3+ territory.
- Runtime: 1962 spoken words (pause tags stripped) + 66s scripted pauses = 12.00 min experienced. Header, cold-open promise ("Twelve minutes"), and actual agree.
- Cut for length/scope: the Triangle Shirtwaist fire (recommend the U6 cram carry it); Sinclair's "aimed for the heart, hit the stomach" line (wording unverified — was paraphrased in an earlier draft, then cut entirely).

## Factual corrections (v1 → v2), with sources
1. **Hull House founding date.** premium2027 ch9 dates it to 1897 — wrong. Independently confirmed via Britannica: founded 1889 by Jane Addams and Ellen Gates Starr. Script uses 1889. → Registry F-U6-001.
2. **Roosevelt "nauseated" letter to Sinclair.** v1 stated as fact that Roosevelt wrote Sinclair the book left him "nauseated." Unverifiable in Tier 1/2 — dropped entirely. → Registry F-U6-002.
3. **Wilson's 1912 popular vote.** v1 said "about forty-two [percent]"; premium2027 ch9 gives 41% (Roosevelt 27, Taft 23, Debs 6). Script uses 41%. → Registry F-U6-003.
4. **Conservation acreage.** premium2027: "over 200 million acres under public protection." LOC (Headlines & Heroes): 172 million acres. Script uses premium's figure; variance disclosed for validators. → Registry F-U6-004.
5. **Sausage-throwing anecdote.** v1 hedged it as legend; v2 keeps the explicit legend frame ("The sausages are legend") and never teaches it flat. Guard added so future drafts can't flatten it. → Registry F-U6-005.
6. **"Roosevelt broke up Standard Oil."** v1's Maya asked it and Marcus corrected her (Taft, 1911) — v2 keeps this as the deliberate mid-episode wrong beat AND the trust-busting legend-vs-fact beat: Taft filed ninety antitrust suits (premium2027), Roosevelt's headline case was Northern Securities (1904). → Registry F-U6-006.

## Deliberate hedges / disclosures in the script
- Tarbell's McClure's series is described without pinning the installment count (Tier 1 gives no count; "nineteen" is consistent across outside accounts but unverified in-tier).
- "Bully pulpit": TR's well-attested phrase, textbook-standard, but not in the Tier-1 excerpts — used briefly, flagged for Layer 3.
- Muckraker name origin (Pilgrim's Progress, "Roosevelt meant it as an insult"): textbook-standard; Princeton confirms TR dubbed the term. The Pilgrim's Progress detail is beyond Tier-1 excerpts — flagged.
- "A president had never intervened in a strike on labor's side before" (1902): standard reading (Pullman 1894 was on management's side) but not explicit in Tier-1 excerpts — flagged.
- Birth of a Nation: no year pinned (premium2027 says 1916 in one passage; the film premiered in 1915) — deliberate omission, flagged.
- premium2027 calls Steffens's book "The Shame of the Cities" in one passage and "The Shame of Our Cities" in another; the script uses the correct real title, "The Shame of the Cities."
- "The states were the laboratory" phrasing is the writer's gloss on the Wisconsin Idea, not a period quote (Brandeis's "laboratories" line is 1932) — no attribution implied in dialogue.

## Open questions for the validators
- Conservation acreage: teach premium2027's "over 200 million" or LOC's 172 million, or hedge to "about two hundred million"?
- Is the "bully pulpit" line acceptable without a Tier-1 citation, or cut it?
- Initiative-vs-referendum definitions follow premium2027 + the Unit 7 transcript; confirm the one-line glosses don't oversimplify (transcript: initiative = require legislators to vote on a bill; premium: introduce a bill by petition).
- The verdict box teaches Prohibition as the "control" face of progressivism and notes wartime anti-German feeling (premium2027) — confirm the framing isn't overstated.
- Box 4 covers Du Bois / Washington / Garvey in ~50 words — confirm this isn't flattening their differences.

## Voice and structure notes (for Layer 2)
- Maya: mid-episode wrong beat ("So Roosevelt broke up Standard Oil, the big one"), recap fumble (memory-check on "the Wisconsin Idea"), two knows-something beats (grandpa's "bully for you"; the Lorax), one personal moment (ingredient labels, eighth grade), all four checkoffs in her voice, drives the recap.
- Marcus: all turns ≤100 words; no announced lists; reactions varied ("Pointing pens, mostly.", "Close.", "Smash it.", "Bonus banked.").
- Exam devices: 2 prediction beats (8s pauses, "Your turn" framing, reasoning not recall), exam tips with varied templates (Box 1 mechanism tip, Box 3 compare tip), one common-mistake line per box.
- Self-test: "Three questions, AP-shaped" ritual; Q1 stimulus-style (Tarbell source vs efficiency claim); Q2 fame-vs-volume (TR vs Taft); Q3 agree-and-disagree (Wilson); fast labeled bonus ("One more, fast") on initiative vs referendum. CER logic carried by connective tissue — no spoken labels.
- Tagline: shared, once, new words (Marcus opens, Maya lands). Single "next time" tease, Maya's, U6-L2 only.
- Mechanical self-check (not a gates run): 2 That's/Here's starters, 1 em dash in dialogue, 0 antithesis-pattern hits, 0 verbatim repeats, 0 consecutive same-speaker turns, Maya ?-ratio 0.32, no spoken CER labels, all pause tags named in the read note.

## Layer 1 repairs (coordinator, 2026-10-07)
- G6 button-word loop: the three CER self-test pauses were all [15-second pause]. Varied to 15/18/20 seconds (house pattern); pause total 66s → 74s; header and read note updated. Runtime 1962 words + 74s = 12.13 min — "Twelve minutes" promise holds.
- G12 falsehood regression: the writer's own new F-U6-006 pattern ("roosevelt broke up standard oil") fired on Maya's mid-episode wrong beat ("So Roosevelt broke up Standard Oil, the big one."), which Marcus immediately corrects ("Common mix-up..."). This is the house wrong-beat device, not a regression. Fixed the RULE, not the line: added a two-turn wrong-beat exemption to `registry_hits` in apush-script-gates.py — when a falsehood matches and the next turn is a different speaker containing a strong correction marker (mix-up, legend, myth, not quite, not exactly, that's not, common mistake), the hit is skipped. Documented in the gate comments. "Actually" alone deliberately excluded (too common).
- G7: read note now names each pause tag literally.

## Validation repairs (coordinator, 2026-10-07)
Layer 2 (fresh ear): NOT LOCK-READY → 2 blockers + 5 minors.
- B1 (mirror pair): Marcus's "The trusts got handcuffs, the unions got let out of theirs" restated Maya's fresher line verbatim-adjacent — cut; his turn now opens at the FTC.
- B2 (self-test voice): all three model answers sat with Marcus, breaking Maya's "before I give it" framing and the U1-E1 exemplar convention — moved to Maya.
- M1: doubled "Don't write that…" exam-tip opener — L118 reworded to "The trap answer is…".
- M2: doubled "Close." reaction — L50 now "Almost."
- M3 (acreage): Layer 3 ruled the 200M figure defensible (Tier 1 outranks Tier 2; variance disclosed) — kept flat, no repair.
- M4: added Hetch Hetchy to the pronunciation header.
- M5 (Sources typo "public_contnent"): NOT a typo — that is the actual directory name (canon notes the misspelling). L2's flag declined, no change.
Layer 3 (fact-check): CLEAR, no blockers. Hull House 1889 book error independently re-verified by the checker in both directions; "bully pulpit" confirmed via Britannica; all numbers/dates/names confirmed.

## Fresh re-read (third agent, 2026-10-07): REPAIRS VERIFIED
All 7 repairs clean in context, no new violations, no seams. One minor: header claimed 1962 words, house counter says 1955 (delta from the mirror-pair cut) — header corrected. Runtime promise unaffected (12.09 min). G4 note: the gates default to --minutes 8; this episode must be invoked with --minutes 12.
