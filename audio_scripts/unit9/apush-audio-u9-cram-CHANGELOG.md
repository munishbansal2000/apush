# U9-CRAM "The Whole Gilded Age in One Sitting" — CHANGELOG

## v2 DRAFT (2026-10-07) — writer: subagent (parent-orchestrated)

### Build decisions
- Format: Study Buddies rapid-fire cram (Maya + Jay). Jay is the learner: guesses wrong
  (Sherman broke up Standard Oil, big-tent wins strikes, Ellis 1890, Exclusion '83,
  free silver = free money, Spain sank the Maine, "splendid little war" = Philippine war),
  asks real questions (why the 1870s, did the Alliances merge, is the Oz allegory real),
  and visibly learns across the six beats (nails Dawes 1887, the Teller/Platt leash,
  the leverage logic by beat 2's end). Never a second expert.
- Six boxes, one per lesson: (1) integration machines, (2) labor's three defeats,
  (3) the Exclusion Act, (4) the Omaha Platform, (5) Turner's thesis, (6) Teller vs Platt.
  One mid-episode check-in only ("Three down"); the recap is the check layer.
- Every unit trap drilled, using each lesson's own wrong beats:
  Homestead = Pennsylvania state militia (federal troops = 1877 + Pullman) — staged as
  MAYA's mid-episode wrong beat, corrected in flow by Jay with the "Not quite" marker;
  Ellis Island Jan 1 1892 (not 1890); Exclusion Act 1882 laborers-only (Jay's '83 near-miss);
  Dawes 1887 (not 1890) — staged as Maya's recap fumble (self-caught, L5-style);
  census said the frontier LINE disappeared, never "closed" (F-U9-019 carried);
  Teller = 1898 promise, Platt = 1901 leash; Knights 1869 vs AFL 1886;
  Haymarket May 4, 1886; free silver = free coinage 16:1, not free money;
  Alliances = parallel movements that broke on race, never merged;
  "splendid little war" = Spanish-American War (F-U9-041); Maine cause never proven.
- Maya's required beats: one personal image (sticky-note war room, cat asleep on the
  Homestead box); knows-something beat (her English teacher's Wizard of Oz allegory,
  with L4's "historians argue" hedge); mid-episode wrong beat + recap fumble (both used,
  different kinds); says her own checkoffs; ≤60% of her lines end in ? (actual ~16%).
- Two reasoning-based prediction beats (8s each): the 1892 skilled-union strike call,
  the Kansas farmer's deflating debt. (A third, the McKinley treaty call, was cut in
  the length pass; the treaty content survives as straight teaching.)
- Self-test: 3 AP-shaped questions (Sherman synthesis, census-line stimulus, Teller/Platt),
  17s/17s/15s pauses, plus one fast labeled bonus on the 1896 verdict (box 4). All
  model answers neutral, no tone tags, CER logic carried by connective tissue only (G13).
- Closer hands to Unit 6 (Progressivism) in ONE line; no Progressivism taught.
- Length: first draft ran 2,296 words / 14.3 min; cut to 1,939 words / ~12.2 min
  experienced (84 s pauses). Slightly over the 12-min soft target because the cram
  covers six lessons; fleet precedent (U3 cram ran 12.8). Cold-open promise
  ("about twelve minutes"), header, and word count agree.

### Direction (Fish Audio, tags only — no word changes)
- Fleet mapping throughout: cold open + sign-off [professional broadcast tone];
  Maya's genuine questions [curious, inquisitive tone]; takeaways [confident tone];
  myth-busts [firm]; Maya caught wrong [sheepish]; grim material [serious tone];
  rapid-fire questions [energetic]; Jay [casual]/[curious]/[sheepish].
- Self-test fully neutral (no tags). One [chuckle], inline, in the Grange turn.
- Density: no tone above ~25% of directed turns (cap 40%).

### Fact pass
- Every checkable claim carried from the six lesson drafts' verified Sources sections;
  no new claims introduced. No new book errors spotted — nothing added to
  apush-fact-registry.yaml this pass.
- F-U9-019 (5steps2024 ch17 "The 1890 census had recently declared the frontier closed"
  flattening) carried as taught; F-U9-041 ("splendid little war" = Spanish-American War)
  carried as taught.
- Withdrawn retractions F-U9-034 / F-U9-038 respected: no book is blamed for the
  1882/1883 or 1887/1890 traps. Jay's "I nearly said '83" is staged as a student
  near-miss, not a book claim.
- G12 exemption paths verified: every staged falsehood (Maya's Homestead wrong beat,
  Jay's Standard Oil / AFL-inclusive / Ellis-1890 / free-money / Spain-sank-it /
  Philippine-war guesses) is immediately followed by a different speaker's turn
  carrying a strong correction marker (Not quite / Mix-up / Legend / "the classic trap"
  phrasing). The recap's Homestead line was reworded to "Pennsylvania's state militia
  broke the strike" so no falsehood pattern fires without a following correction.

### Validation history
- 2026-10-07: writer self-ran `apush-script-gates.py --minutes 12` → 13/13 PASS
  (G1–G13, incl. G12 and G13). First run caught 3 FAILs (G5 verbatim repeats ×2,
  G9 antithesis budget 5 hits, G12 recap-line pattern fire); all repaired, re-run green.
  W2 triple warnings (4) reviewed with intent: all are factual lists or the single
  earned verdict chain, not decorative cadence.
- Layer 2 (clean-context ear read + validator checklist): PENDING — coordinator to run.
- Layer 3 (dedicated fact-check, Tier 1 books/transcripts → Tier 2 Britannica/NPS):
  PENDING — coordinator to run.

## Repairs (Layer-2 fixes) (2026-10-07) — REPAIR agent

All edits applied as surgical substring edits to
`apush-audio-u9-cram-script-v2-DRAFT.md`; nothing pushed. Baseline before repairs:
13/13 gates PASS at 1,939 words. Final: 13/13 PASS at 1,960 words (header updated;
~12.3 min experienced, within the ±40-word budget). W2 triple warnings unchanged
(4, same lines, reviewer-directed to leave as-is). One mid-repair G8 FAIL caught
(11 em-dashes after three of my edits introduced new ones); fixed by de-em-dashing
all three of my own new em-dashes.

### Blockers
1. Oz-allegory dangle (~L106–110): inserted one Jay reaction line between Maya's
   allegory turn and his 1896 pivot:
   - Before: Maya's Wizard-of-Oz turn → Jay: [curious, inquisitive tone] "So 1896:
     Bryan, thirty-six…"
   - After: Maya's turn → **Jay: [casual] "The Scarecrow's the farmer? That's going
     straight into my notes."** → Jay's 1896 pivot follows.
   Jay stays in learner voice (a reaction, not an expert take); [casual] per the
   fleet Jay mapping; beat is L4's taught allegory + hedge, unchanged.
2. Checklist mirror pair (~L180): "The census reported. Turner interpreted." →
   "The census reported the line gone. Turner supplied the word." Mnemonic function
   kept (census = reported the line's disappearance; Turner = supplied "closed"),
   mirror shape broken; self-test model answer stays tag-free/neutral (G13).
3. Unit-6 tease (~L190): "Next: Unit 6, the Progressives — they looked at
   everything we just covered and decided to fix it." → "Next: Unit 6, the
   Progressives — they read the whole story and got to work." Still one line, still
   hands off to Unit 6 with no Progressivism taught; no longer L6's closer wording.

### Minors
4. Twin "Not quite, and the classic trap" (~L64 vs ~L104): varied L64 →
   "Not quite. And here's the one that catches everybody." Correction marker
   "Not quite" intact on both (G12-exempt); L104 untouched.
5. Beat echo (~L34 vs ~L54): L54 "Leverage beats numbers." → "Scarcity beats
   headcount." Meaning kept, crisp; [confident tone] takeaway mapping unchanged.
   L34 "Numbers lose. Leverage wins." untouched.
6. Announced lists: L96 "Omaha, 1892. Four demands, rapid fire." → "Omaha, 1892.
   Run me through the platform."; L112 "Five. Three kinds of westerners, go." →
   "Five. Who was actually out West?" Both stay [energetic] rapid-fire questions
   with their [2-second pause]; no numbering; no announcing.
7. Overclaim (~L190): "Six lessons, one sitting, every trap defused." → "Six
   lessons, one sitting, most of the traps defused." (Folded into the blocker-3
   edit on the same line.)
8. Recap Rockefeller (~L156): "Rockefeller bought every rival." → "Rockefeller
   bought, squeezed, or starved his rivals." Matches L1's actual teaching
   ("Buy it, squeeze it, or starve it." — cutthroat price wars, pooling; L1 recap:
   "Horizontal: Rockefeller buying every rival."), verified in
   `apush-audio-u9-l1-script-v2-DRAFT.md` (lines 53–59, 85).
9. Jay's "28 million" stat: left AS-IS per reviewer (quiz-format-licensed).
10. Reviewer-flagged triple-parallel cadence: left AS-IS per reviewer
    ("at budget with real logic").

### Constraints checked
- Direction tags: one per turn; same beat→tag mapping; no tone above 40%.
- Self-test block fully neutral (all tags absent).
- No spoken CER labels (G13 PASS).
- Maya's two wrong beats remain different kinds (mid-episode Homestead trap +
  recap Dawes fumble).
- Runtime ~12 min experienced: 1,960 words @ 163 WPM, +84 s scripted pauses.
