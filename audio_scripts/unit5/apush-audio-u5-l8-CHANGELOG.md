# U5-L8 (Emancipation Proclamation) — Version Changelog

Every version is kept as a separate file. Nothing is overwritten.
This log records what changed between versions and why.

## v1 — `_archive/apush-audio-u5-l8-script-LOCKED.md` ("Script v1 DRAFT")
Original draft from the script-expansion pipeline. Maya + Marcus interview,
~1,440-word / 8-minute target. Fact-checked against the Tier-1 transcript
(Butler/contraband, 400,000 escapes, border states, Copperheads, the two
proclamation effects). **Out-of-scope material present:** the Gettysburg
Address, the Second Inaugural, and the Homestead / Morrill / Pacific Railway
Acts — all other episodes' territory.

## v1 → v3 — `apush-audio-u5-l8-script-v3-DRAFT.md` (1,939 words, ~12 min experienced, 79s pauses)
Full rebuild to the frozen 2026-10-06 standards. Writer-only pass; Layers 2
and 3 are separate agents. (No v2 was produced — v1 went straight to the
rebuild queue.)

**Scope cuts (all from v1):**
- Gettysburg Address and Second Inaugural removed (U5-L10 / other episodes'
  territory).
- Homestead Act, Morrill Land-Grant Act, Pacific Railway Act, greenbacks —
  removed (wartime-economics material, not this episode).
- "1st South Carolina" and Susie King Taylor beats removed for runtime; the
  Black-enlistment box centers the 54th Massachusetts per the U5-L7 v6 closer
  tease ("the hundred and eighty thousand Black soldiers... including the
  54th Massachusetts") — one continuity nod, no re-teaching.
- Lincoln's tired hand at the New Year's reception — cut, unverifiable in
  Tier 1/2.
- Fort Monroe as Butler's post — cut; the Tier-1 transcript pins only "a
  Union camp in Virginia."

**Structure (frozen-standard):** cold open (continuity nod to U5-L7's closer
tease + U5-L6's "what it freed, what it didn't, and why Lincoln waited"
framing; 4 boxes; circle line; 12-minute promise) → 4 boxes, each checked
off in Maya's voice → Maya-driven recap (ritual "Four boxes, let's land
them") → self-test (3 CER questions at 17s + 1 fast bonus at 10s, one
stimulus-style) → one shared tagline → closer with the single forward tease
(U5-L9 Reconstruction Plans only).

**The four boxes:** (1) the road to the Proclamation — Union-first war aim,
Greeley letter, self-emancipation/Butler/contraband, Confiscation Acts,
Radical Republicans, border-state math, Northern opinion, Copperheads;
(2) what it freed and what it didn't — Sept 22 preliminary (the ultimatum),
Jan 1 1863 final, military-necessity framing, the exemption list, the dry
legal language; (3) why it mattered anyway — abolitionist/Democratic/Southern/
enslaved reactions, Europe (cotton + abolitionism); (4) Black enlistment and
the verdict — ~180,000 enlisted, 54th/Fort Wagner, the equal-pay fight, the
"did it free anyone" verdict, 13th Amendment as forward tease.

**Exam devices:** 2 prediction beats (9s; the desk-drawer decision, the
British prime minister's dilemma); 4 exam tips with varied templates (the
1861/1863 Lincoln split, the scope trap, multi-cause Europe, immediate vs
long-term columns); 4 common-mistake lines, one per box; self-test answers
in natural CER logic, no spoken labels.

**Voice:** Maya drives (wrong beat: the border-states-as-sympathizers guess;
recap fumble: the June '64 pay-fix memory check — different tools); the
shoebox-deed human moment; the Glory pop-culture beat (a thing she knows
that Marcus doesn't); Marcus admits uncertainty on the cotton-vs-slavery
weighting. Shared tagline duet: "Freedom followed the armies."

**Real quotes used (all public-domain, disclosed in dialogue):** the Greeley
letter ("My paramount object..."); "shall be then, thenceforward, and forever
free"; "a fit and necessary war measure"; the "act of justice" closing;
Lincoln to Conkling ("the heaviest blow yet dealt to the rebellion"); the
Douglass stimulus quote (trimmed with ellipsis).

**Source notes:**
- Greeley letter wording verified verbatim via LOC (Abraham Lincoln Papers);
  princeton carries the same wording as paraphrase.
- The ~180,000 Black-enlistment figure is NOT in any Tier-1 book or
  transcript; verified in Tier 2 (Britannica "nearly 180,000"; NPS "over
  180,000"; LOC "approximately 180,000", ~10% of the Union Army).
- 54th Massachusetts / Fort Wagner verified via NPS (first Black regiment
  raised in the North after the Proclamation; July 18, 1863 assault; Shaw
  killed; "half of their troops" lost — Congressional Record reproducing NPS).
- Equal pay ($10 minus $3 clothing vs $13; June 1864 retroactive fix)
  verified via LOC + Congressional Record.
- Exemption list verified against the proclamation text itself (Britannica
  transcription, public domain): border states + Union-held areas, TN not
  named, LA parishes and VA counties exempted down to county level.
- Cotton framing follows registry F-CIV-002 (1861 surplus, Northern grain,
  Egypt/India — NOT "Britain took India in 1858").
- 10 new registry entries F-U5-055 through F-U5-064.

**Runtime math:** 1,939 spoken words (pause tags stripped) at ≤180 WPM =
10.8 min speech + 79s scripted pauses = 12.1 min experienced. Header,
cold-open promise, and actual agree.

**Layer 1 (writer-run):** `apush-script-gates.py --minutes 12` → all 13 gates
PASS (162 WPM). Two initial FAILs fixed: G4 needed the `--minutes 12` flag
(default is 8); G12 tripped on the box-4 common-mistake line because it said
"classic mistake" — the gate's negation frame only recognizes "common
mistake," so the line was reworded (the registry pattern itself is kept for
future drafts). Remaining WARNs reviewed and benign (W1: 5 natural
uncontracted forms; W2: false-positive "triples" incl. the proclamation's
real quote; W5: "exactly" 2x, one intentional in the shoebox beat).

## Validation + repair history — 2026-10-07
- **Layer 1:** 13/13 PASS (writer's run; independently re-verified by coordinator).
- **Layer 2 (fresh ear):** NOT LOCK-READY → 3 blockers + 5 minors, all repaired —
  1. First Inaugural presented as verbatim but reworded ("his words") → now quoted verbatim.
  2. Greeley letter ended mid-sentence with no ellipsis → full three-clause text restored.
  3. Exam-tip template monoculture (three "don't/never write that" openers) → two reworded ("Keep this straight:", "The trap answer:").
  Minors: collapsed double recap opener; removed mid-episode 13th Amendment tease (closer owns it); dropped orphaned "First,"; reworded Q1 model answer (was recycling prediction-beat phrasing); reworded recap line that pre-echoed the tagline.
- **Layer 3 (fact-check, different fresh agent):** BLOCKED → 3 blockers, all repaired —
  1. Greeley truncation (same as L2 #2; script contradicted its own registry F-U5-055).
  2. "That August" misdated the Conkling letter to 1864 (letter is Aug 26, 1863, Britannica) → "In August 1863."
  3. Antietam called a flat "win" — violated the registry's own F-CIV-028 rule (tactically a draw, strategically a Union victory) → "the opening Lincoln could claim," with the tactical-draw qualifier in dialogue.
  Precision repairs: 54th softened to "one of the first Black regiments raised in the North" (Tier-2 wording); Douglass cited to the Frederick Douglass Papers reading with speech attribution (was LOC + "wrote"); "decades ago" (British/French abolition) softened to "a generation earlier."
  Accepted with disclosure: equal-pay figures (LOC), June 1864 retroactive fix (Congressional Record), ~180,000 / ~1-in-10 (LOC via registry), 54th "about half" losses (hedged), Juneteenth "last place" (registry-backed).
- **Fresh Layer-2 re-read (third agent):** 16/17 repairs verified clean; caught one repair-introduced seam (L106 "A year earlier, in August 1863" pointed backward from a January 1863 anchor) → fixed to "In August 1863." Gates re-run 13/13 PASS.
- **Final numbers:** 1,984 spoken words + 79s scripted pauses = ~12.3 min experienced; header, cold-open promise ("Twelve minutes"), and gate count all agree. **Gates: 13/13 PASS** (incl. G13).
