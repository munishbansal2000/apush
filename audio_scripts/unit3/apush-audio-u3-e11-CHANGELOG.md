## 2026-10-09 — review fixes (video2/out/review/scripts-e10-cram.md)
- Tie mechanics: "So the losers pick the winner" -> "So the losers can block the winner"; "The Federalists who'd just lost got to choose" -> "could block the winner" (by-state voting let them stall, not choose).
- "Votes or voters" answer made consistent: "The votes. Nobody converted. Federalist holdouts stopped blocking Jefferson once Hamilton's letters helped push them, and he won on the 36th ballot." Self-test Q1 answer reworded the same way (was "Federalists decided Burr was worse... tipped the House").
- Haiti: "died of disease" -> "was destroyed by disease and Haitian resistance" (§7 name the actor).
- Webster (verify item): Americanized spellings now tied to "his later books" rather than the 1783 speller.
- Bonus question was trivia (§8): now "Webster's speller: what job did it do for national identity?" with a national-identity model answer.
- TTS: "The 73-73 tie" -> "The seventy-three to seventy-three tie."
- Closer: "Eleven episodes, ten questions" -> "eleven questions"; added "Check your boxes." (§6 check layer).
- Sources notes updated for the Haiti and Webster changes. Header: 1,565 -> 1,589 words, pauses corrected 68s -> 60s (six 10s pauses); ~9.8 min, "About ten minutes" holds.
- Checks: parseTranscript 71 turns, pauses 10x6; gates PASS.

# U3-E11 v1 → v2 Changelog (2026-10-06)

## What v2 is
Full rebuild from scratch to the frozen 2026-10-06 standards. v1 was an
~8.2-minute draft in the old format (2-second pauses, chain recap, no
prediction beats, no box ritual, no CER self-test, tagline "The transfer
held. The promises waited."). No v1 prose was carried over; v1 was used
for topic and version continuity only. New tagline, new tissue throughout;
only the fixed ritual lines are shared ("Circle the ones you couldn't
explain right now", "Four boxes, let's land them.", "Three questions,
AP-shaped. Say your answer before I give it.", "One more, fast.").

## Scope decisions
- 4 boxes (content needed it): 1) the tie, 2) the pragmatist, 3) Marbury's
  judo, 4) the culture. The honest asterisk (slavery expanded, most
  couldn't vote) is the closing interpretive thread, not a box.
- 12th Amendment (1804) folded under box 1 as the bug-fix kicker.
- U3-E10 (Alien/Sedition): exactly one continuity sentence in the cold
  open. U3-E9 (Hamilton's program) and U3-E8 (ratification): referenced
  only, never re-taught.
- Cut as out of scope: Lewis & Clark expedition, Charles Brockden Brown's
  Wieland, the Virginia-dynasty list (kept only the "changing of the guard"
  counterargument line).
- Forward tease points only to the Unit 3 cram (next lesson; E11 is the
  last numbered episode). Cold open nods to E10's closer (the 1800 election
  as verdict → now the transfer itself).

## Structural/content choices
- Box 1 teaches 36 ballots and flags the Princeton "35" error in-dialogue
  as a misprint warning (exam tip template), with the 1801-02-17 date.
- Hamilton's Burr line taught as his actual phrasing per 5steps:
  "the most unfit man in the United States for the office of president."
- Jefferson's inaugural line taught as his actual words with the 5steps
  punctuation: "We are all Republicans; we are all Federalists." Promise
  direction checked: winners' promise TO the losers.
- Webster's "a national language is a band of national union" attributed
  to the 1789 Dissertations, not the 1783 speller — corrected twice
  (box 4 content + common-mistake line + self-test bonus).
- "Midnight judges" name grounded via 5steps ("erroneously believed to be
  signing these many commissions on his last night in office") — the
  "dramatic name" beat.
- Maya's mid-episode wrong beat: Haiti/cash (Marcus corrects in flow —
  disease killed the army, the lost colony was the cause). Recap fumble:
  memory-check on 10-4-2 (different tool, per guide). Maya's
  knows-something beat: Trumbull's Declaration on the $2 bill (pop-culture
  source; Marcus admits he's never looked). Human moment: prom-theme
  assemblies. Marcus admits uncertainty: Adams's exact pre-dawn hour.
- One mid-episode checkoff only ("One down. Checking the tie off my
  sheet."); everything else lands in the recap.
- Exam devices: 2 prediction beats ("Your turn." + 8s/10s real silence),
  4 exam tips with varied openers (Fair warning / SAQ bait / "what the exam
  tests" / "wants the job"), 4 common-mistake lines (varied templates),
  self-test 3 CER questions (15s each, Hamilton-letter stimulus first) +
  labeled bonus ("One more, fast.", 5s). CER shape carried by connective
  tissue; zero spoken labels (G13).
- Closer: single shared tagline once ("Power changed hands. The hands
  stayed few."), one "next time" (cram), no aphoristic summary.

## Source-reliability notes
- Princeton error RE-VERIFIED this pass: `books/extracted/princeton/OEBPS/
  xhtml/041_c008_sup.xhtml` — "It took 35 ballots, but Jefferson finally
  won." Wrong. 5steps2024 ch12 is internally consistent ("the voting going
  through 35 ballots without a victor... victory on the thirty-sixth
  ballot") and Monticello/LOC confirm the 36th ballot, Feb 17, 1801
  (per the 2026-10-06 verification record). No new book errors found.
- Bayard-of-Delaware abstentions + 10–4–2 count: carried from the
  2026-10-06 verification record (v1 web-verified); NOT re-checked against
  Tier 1 in this pass — disclosed in the Sources footer.
- Adams's pre-dawn departure: standard account; exact hour hedged
  in-dialogue ("the exact hour gets argued about, but the snub is solid").
- $2 bill reverse = Trumbull's Declaration: general currency knowledge,
  disclosed as Maya's pop-culture beat, not a taught historical claim.
- Webster spellings (theater/color): premium2027 ch5 (Tier 1). All other
  election/presidency/Louisiana/Marbury claims: 5steps2024 ch12 (Tier 1).
  Cultural items (Peale, Trumbull, Crèvecoeur 1782, Capitol 1793): per the
  2026-10-06 verification record.

## Validation log (writer pass)
- `apush-script-gates.py --minutes 12.5`: 13/13 PASS.
- WARN dispositions: W1 ('We are' ×5) — all inside the verbatim inaugural
  quote; guide exempts quotes, keep. W2 triples — false positives (box
  lists, natural series), keep. W5 ('exactly' ×2) — natural, keep.
- Word-count methodology: gates counts speaker-turn words only (excludes
  "Maya:"/"Marcus:" labels) = 1733; my independent count agreed at 1733
  after the same exclusion. Header carries 1733.
- Mechanical self-checks: em dashes 5 (≤10); That's/Here's sentence
  starters 0; "Not X, just Y" 0; twist pivots 0; spoken CER labels 0;
  Maya ?-enders 5/37 (14%, ≤60%); Marcus max turn 73 words (≤100);
  micro-turns 3 (≤8); no verbatim repeats; no button loops.

## Runtime math (experienced runtime = speech + pause silence)
- Spoken words: 1733. Pauses: 8+10+15+15+15+5 = 68s (1.13 min).
- 1733 ÷ 160 WPM = 10.83 min speech + 1.13 min pauses = **≈12.0 min**.
- Header ("≈ 12.0 min at ~160 WPM"), title ("~12 min experienced"), and
  cold-open promise ("About twelve minutes") all agree. Floor 1440 met
  (1733). Episode earns the 11–12.5 min band: 4 boxes, CED 3.10 + 3.11.

## Open items / handoff
- Ready for Layer 2 (clean-context read + validator checklist) and Layer 3
  (dedicated fact-check). Writer's known disclosures are all in the
  Sources footer; nothing was taught flat that Tier 1/2 couldn't verify
  except the two disclosed items above (Bayard/10-4-2 provenance, $2 bill).
- Pronunciation header covers Crèvecoeur, Bayard, Gallatin.

## coordinator correction — 2026-10-06
Writer computed runtime at ~160 WPM ("≈12.0 min at ~160 WPM"). Frozen standard is ≤180 WPM: 1,733 words = 9.63 min speech + 68s pauses = ≈10.8 min experienced. Header and cold-open promise corrected to ~11 min / "About eleven minutes." Gates re-run at --minutes 11: 13/13 PASS.

## Layer-2 repairs — 2026-10-06
- B1 (blocker): broke the parallel mirror pair "The handoff was real, and precious. / The exclusions were real, and damning." → "The handoff was real, and precious. The exclusions were damning in their own way."
- B2 (blocker): softened the "every" overclaim "Every democracy since stands on that precedent." → "It's the precedent later democracies inherited."

## Layer-3 repairs — 2026-10-06
- BLOCKER: "Kept the navy" removed from body (L46) and recap (L108) — Jefferson actively reduced the navy; implying continuity was misleading framing per the framing rule.
- BLOCKER: Sources footer miscitation fixed — "(1819 per 5steps ch12)" was wrong; 5steps ch12 does not credit Jefferson. Now cites premium2027 ch6 (16_Chapter06.xhtml:514) for Jefferson's authorship; 1819-letter detail tagged as carried from the 2026-10-06 verification record.
- "Easier to manage" Federalist motive → "wanted to embarrass Jefferson" (Tier-1 phrasing: 5steps "detested Jefferson" / prem27 "wished to embarrass Jefferson").
- "Columns and domes" → "columns and pediments" (cast-iron dome is 1850s–60s).
- Footer: "loose construction" gloss disclosed as the script's interpretive commentary on the 5steps scruples passage.
- Registry: +4 (F-U3-053 navy framing, F-U3-054 Burr motive, F-U3-055 1793 dome anachronism, F-U3-056 Revolution-of-1800 citation). Now 236 facts.

## Layer-2 re-read — 2026-10-06
REPAIRS PASS: all 7 repairs verified natural in context, substance intact, no new violations. Body/recap agree on navy fix; footer honest and complete. One fix from the re-read: stale header figure "≈12.0 min at ~160 WPM" corrected to "≈10.8 min at ≤180 WPM" (header, cold-open promise, and actual now agree at the standard rate).

---

# U3-E11 v2 → v3 Changelog (2026-10-08 — fleet repair program)

Audit verdict on v2: NOT CLEAN — 5 blockers, 6 majors (gates 13/13 at --minutes 11 did not cover them). v3 applies every finding. No push; repair worker only.

## B-01 — tone-tag density 81% → 32%
- Before: 51/63 turns tagged (81%), incl. four body misuses of `[professional broadcast tone]`:
  `Maya: [professional broadcast tone] Because he needed the cash for the war —`,
  `Maya: [professional broadcast tone] Nobody has, which makes it the perfect hiding place. Writers were in on it too —`,
  `Maya: [professional broadcast tone] So was it a revolution? Jefferson's own phrase for it —`,
  `Maya: [professional broadcast tone] Four: the culture. Webster's speller and the 1789 line, Peale, Trumbull, Crèvecoeur, the Capitol in stone. ...`
- After: 21/65 turns tagged (32%). `[professional broadcast tone]` on cold open + tagline closer only. Kept tags: cold open, `[speaking slowly]` (36-ballot numbers), `[firm]` (four live-trap corrections + recap misprint warning), `[catching]` (Haiti/cash fumble), `[curious, inquisitive tone]` (Maya's genuine questions), `[confident tone]` (takeaways/checkoffs/recap), `[thoughtful tone]` (closing verdict), `[intrigued]` (Marcus closer). Self-test fully neutral.

## B-02 — negation-replacement antithesis 10 → 2
- Kept (the 2 most substantive): `The tie isn't Jefferson versus Adams. It's Jefferson versus his own ticket.` and `most of those commissions were signed in his final weeks, not literally at midnight.`
- Reworded to plain positive statements, e.g.:
  - Before: `Some Federalists preferred Burr: not from trust, they just wanted to embarrass Jefferson.` → After: `Some Federalists preferred Burr out of spite, embarrassing Jefferson mattered more than trusting Burr.`
  - Before: `...Slavery didn't just survive Jefferson's revolution; it grew, fed by the Louisiana land he'd bought.` → CUT (unverifiable, B-05).
  - Before: `Seventy-three to seventy-three, the House voting by state, thirty-six ballots, not thirty-five, ...` → After: recap fumble `thirty-five ballots — no, thirty-six.` (+ Marcus misprint correction).
  - Before: `A republic needs its own culture, not just its government.` → After: `A republic needs its own culture as much as its government.`
  - Before: `Theater, not theatre. Color, not colour.` → After: `Theater for theatre, color for colour.` (G9 counted the spelling pairs mechanically; content kept, construction gone.)
  - The four "Don't write" proclamations → live traps (B-03).

## B-03 — four announcer-voice "Don't write" proclamations → four live traps (one per box)
Each rebuilt as Maya-error → Marcus-correction in the immediately following turn with a strong marker:
- Box 1 — Before: `Maya: [firm] Don't write that the voters picked Jefferson. The House did, and in 1800 most Americans couldn't vote for president at all.` → After: `Maya: So the voters picked Jefferson. The people had spoken.` / `Marcus: [firm] Not quite. The House did. The 73-73 tie went to the House, voting by state, and the Federalists who'd just lost got to choose.` (suffrage clause cut — unverifiable, B-05.)
- Box 2 — Before: `Marcus: [firm] ... And don't write that Louisiana shrank Jefferson's government: buying half a continent on loose construction is the opposite of small government.` → After: `Maya: So buying Louisiana shrank his government. Small-government president, smaller footprint.` / `Marcus: [firm] Common mix-up. Buying half a continent on loose construction is the opposite of small government.` ("The Senate ratified and the House paid" cut — unverifiable, B-05.)
- Box 3 — Before: `Marcus: [firm] ... don't write that Marbury won. He lost, the Court won, and that's the whole trick.` → After: `Maya: So Marbury won his case. Commission delivered, everybody goes home.` / `Marcus: [firm] Common mistake. Marbury lost. The Court won judicial review.`
- Box 4 — Before: `Maya: [conversational] ... And don't date the union line to the speller. Speller's 1783; the line is 1789. Six years apart.` → After: `Maya: And the union line came from the speller: 1783, the blue book.` / `Marcus: [firm] Not quite. The speller's 1783; the union line is credited to his 1789 Dissertations. Different book.`

## B-04 — Webster "actual words" → hedged per F-U3-057
- Before: `Marcus: [measured] ... His actual words: "a national language is a band of national union."` and self-test `Maya: "A national language is a band of national union." Speller's 1783; the line is 1789. Don't mix them.`
- After: `... "a national language is a band of national union," is credited to his 1789 Dissertations.` and bonus `Maya: The 1789 Dissertations get the credit. The line: "A national language is a band of national union."` Never presented as verified verbatim; matches the U3-CRAM v3 hedge registered in F-U3-057.

## B-05 — 12 unverifiable details, fail-closed
1. Bayard + 10-4-2 count — CUT. Before: `James Bayard of Delaware led Federalists into abstaining... ten states for Jefferson, four for Burr, two blank.` (also recap + self-test). After: `Hamilton's letters did the work, and on the 36th ballot Jefferson won it.` Tier-1 supports only "Jefferson owed his victory on the thirty-sixth ballot to Alexander Hamilton" (5steps ch12). Registry F-U3-069.
2. Feb 17, 1801 — KEPT: registered correct in F-U3-050 (Monticello/LOC-confirmed).
3. Gallatin "paying down the debt" — CUT. Before: `...who cut taxes, including the whiskey excise Washington once marched an army to collect, and started paying down the debt.` → After: ends at `...to collect.` (also cut from recap). Registry F-U3-070.
4. Amendment draft / agonized in letters — CUT. Before: `He drafted an amendment, agonized in letters, and did it anyway, using Hamilton's loose reading of the Constitution he'd campaigned against.` → After: `He had real legal scruples about it, and bought it anyway, on the loose construction he'd campaigned against.` ("loose construction" gloss stays as disclosed interpretive commentary.) Registry F-U3-071.
5. "The Senate ratified and the House paid" — CUT (folded into the box-2 live trap rebuild). Registry F-U3-072.
6. Peale's museum — CUT entirely (no Tier-1 line). Registry F-U3-073.
7. Trumbull rotunda / "never in the room together" — CUT. Before: `Trumbull's giant Declaration canvas hangs in the Capitol rotunda, except it's romanticized: half the men in it were never in the room together.` → After: `And John Trumbull's Declaration canvas, 1818. The founders were already painting their own story.` (Tier-1: princeton practice test "Declaration of Independence, John Trumbull, 1818"). The $2-bill beat kept as Maya's pop-culture knowledge. Registry F-U3-073.
8. Capitol begun 1793 — CUT (no Tier-1 line). Registry F-U3-073.
9. Slavery-growth causal claim — CUT. Before: `Slavery didn't just survive Jefferson's revolution; it grew, fed by the Louisiana land he'd bought.` No Tier-1 line in full-chapter scans. Registry F-U3-074.
10. Suffrage generalization + "Jefferson the liberator enslaved people himself" — CUT. Before: `Most Americans still couldn't vote, and Jefferson the liberator enslaved people himself.` (also the box-1 trap's `most Americans couldn't vote for president at all`). No Tier-1 lines found. Registry F-U3-075.
11. "Modern world" superlative — CUT. Before: `The first time in the modern world a ruling party handed power to the opposition and walked away.` → After: `The first time control of the presidency passed from one party to another.` (5steps ch12 verbatim scope). Registry F-U3-076.
12. "Years later, in a letter" (revolution-of-1800 phrase) — CUT. Before: `He used the phrase years later, in a letter, and the honest answer cuts both ways.` → After: `His phrase, yes: "the revolution of 1800." And the honest answer cuts both ways.` (premium2027 ch6 credits Jefferson; the 1819-letter refinement is not in Tier-1.)

## M-01 — three triple-parallel cadences → zero
- Before: `The sitting president loses, skips the inauguration, and leaves town before dawn.` → After: `The sitting president loses and skips the inauguration, leaving town before dawn.`
- Before: `A tie goes to the House, voting by state, and the House is still Federalist, the party that just lost.` → After: `A tie goes to the House, voting by state. And the House is still Federalist, the party that just lost.`
- Third (`He drafted an amendment, agonized in letters, and did it anyway`) died with the B-05 amendment cut.

## M-02 — "Some historians say" → Maya's earned pushback
- Before: `Marcus: [measured] Some historians say 1800 wasn't a revolution at all, just a changing of the guard.` → After: `Maya: [curious, inquisitive tone] I'll push back. Same system, new letterhead. Isn't that just a changing of the guard?` / `Marcus: [thoughtful tone] The counterargument is real. But the precedent was new and it held: a ruling party handing power to the opposition and walking away. The republic survived its first stress test and deferred its hardest questions.`

## M-03 — 12th Amendment framing
- Before: `...so it could never happen again.` → After: `...so that tie could never happen again.`

## M-04 — header word count
- Before: 1,733 (header) vs 1,725 true. After: header/read note carry the true tag-stripped figure 1,567; experienced runtime 1,567/180 + 68/60 ≈ 9.8 min. Cold-open promise changed `About eleven minutes.` → `About ten minutes.` (fail-closed cuts shortened the episode; floor 1,440 still met). Header, promise, and actual agree.

## M-05 — aphoristic button lines → plain
- Before: `Maya: [conversational] He gave up the battle to win the war.` → After: `Maya: [confident tone] He traded one man's commission for the Court's whole future.`
- Before: `Marcus: [firm] And almost nobody noticed at the time. Quiet revolutions work like that.` → After: `Marcus: And almost nobody noticed at the time.` (the `that's the whole trick` kicker died with the box-3 trap rebuild.)

## M-06 — "before dawn" hedge kept
- `Adams left the capital before dawn rather than attend; the exact hour gets argued about, but the snub is solid.` unchanged — the hedge shape the audit accepted.

## Watch items
- W-01: W1's 4 uncontracted hits are all `We are` inside the verbatim inaugural quote — exempt per §4.11, keep.
- W-02: "Exactly." once; fine.
- W-03: `the promises stopped at the color line and the property line` — CUT with the asterisk specifics (post-1900 phrasing + unverifiable).
- W-04: mid-episode wrong beats kept (Haiti/cash fumble, "Open and shut for Marbury"); recap fumble rebuilt as the 35/36 memory-check (`thirty-five ballots — no, thirty-six.` + Marcus misprint correction). Both tools still in play.
- W-05: the Princeton "35" misprint warning moved from body announcer-voice into the recap fumble's Marcus correction — still the only book-error correction in that voice.

## Validation (repair pass)
- `apush-script-gates.py --minutes 11`: 13/13 PASS (G9 needed the spelling-pair reword; fixed in-pass, re-run green).
- Tone density 21/65 = 32% (≤~40%). Em dashes in dialogue: 4/10. That's/Here's starters: 0. Antithesis: 2 (tie, midnight). Self-test neutral/untagged. No spoken CER labels. Pause tags unchanged (68s). Pronunciation header: Bayard dropped (no longer in dialogue).
- Tier-1 confirmations done this pass (read-only): 5steps2024 ch12 carries no suffrage generalization and no Jefferson-era slavery-growth claim (its slavery lines are Missouri 1819–20 + Haiti); premium2027 ch06's "peale" hit is a false positive ("repealed"); no Trumbull/Crèvecoeur lines in ch06. Cuts confirmed against the books, not just the audit.
- Registry: +8 (F-U3-069 … F-U3-076), YAML re-parsed after edit.

---

# U3-E11 v3 → v4 Changelog (2026-10-08 — fleet repair program, re-read fix)

Independent re-read of v3 found ONE residual issue. v4 fixes it. No push;
repair worker only.

## R-01 — Maya's "people not voting" joke cut of the Bayard/abstention echo
- Finding: the re-read flagged Maya's joke line immediately after Marcus's
  36th-ballot beat. Before:
  `Maya: The republic was saved by people not voting. The most passive-aggressive rescue in history.`
  The "people not voting" half echoes the CUT Bayard/abstention mechanism
  (B-05 v3, registered in F-U3-069 as not found in Tier-1) with no
  correction — Marcus moves straight on. Under §7 fail-closed, a line
  gesturing at the cut mechanism can't stand uncorrected. The Tier-1-taught
  cause is Hamilton's letters ("Nobody converted. Hamilton's letters did
  the work, and on the 36th ballot Jefferson won it.").
- After:
  `Maya: The republic was saved by stationery. The most passive-aggressive rescue in history.`
  Riffs on "nobody converted" / letters-doing-the-work without implying
  abstention or non-voting did the work. Joke shape kept (Maya's voice,
  "The most passive-aggressive rescue in history." still lands against
  letters doing the persuading).
- Word-choice note: the brief's e.g. "saved by letters, not votes" was NOT
  used verbatim — the ", not Y." shape is itself a negation-replacement
  punchline and the antithesis budget sits at exactly 2 ("The tie isn't
  Jefferson versus Adams. It's Jefferson versus his own ticket." /
  "most of those commissions were signed in his final weeks, not literally
  at midnight."). G9's regex family also flags it mechanically. "Stationery"
  keeps the humor with zero negation.

## Runtime math (verified independently for v4)
- Spoken words: 1,565 (was 1,567; −2: "people not voting" → "stationery").
  Pauses unchanged: 68s.
- 1,565 ÷ 180 WPM = 521.7s speech + 68s pauses = 589.7s ≈ 9.8 min
  experienced — agrees with the cold-open promise ("About ten minutes").
- Header read note updated: "Spoken words: 1565. Pauses: 68s. Experienced
  runtime ≈ 9.8 min at ≤180 WPM."

## Validation (repair pass)
- `apush-script-gates.py apush-audio-u3-e11-script-v4-DRAFT.md --minutes 11`:
  13/13 PASS (warnings only: W1 'We are' ×4 — all inside the verbatim
  inaugural quote, exempt per §4.11; W2 triples — false positives, box
  lists). G9 stays at its single mechanical hit ("final weeks, not
  literally at midnight").
- Diff vs v3: exactly one dialogue line changed + the read-note word-count
  bookkeeping. The abstention implication is gone; "stationery" = Hamilton's
  letters, the Tier-1 cause.

## v4 post-repair header correction (coordinator, 2026-10-08)
- The re-read caught a stale header: title line read "1,567 spoken words"
  while the read note and gates count 1,565. Corrected the title header to
  1,565. Gates re-run: 13/13 PASS (--minutes 11). No dialogue touched.
