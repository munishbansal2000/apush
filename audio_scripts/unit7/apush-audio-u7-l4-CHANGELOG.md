# APUSH U7-L4 "McCarthyism" — CHANGELOG (script v2 DRAFT)

## v2 — 2026-10-07 (writer: rebuild)

**What changed vs v1:** Full rebuild from the debate format to the default
Maya + Marcus interview (Maya hosts and questions, Marcus explains), per the
lesson map and the rebuild brief. No prose carried over from v1 — new draft
written from the fact pass. Structure per the script guide:

- Cold open: "Last time:" nod honoring U7-L3's closer tease ("a senator from
  Wisconsin starts naming names") + stakes + 4 boxes + circle ritual + time
  promise (~12 min).
- Four boxes on Maya's sheet: **the fear had facts** / **the machinery of the
  scare** / **McCarthy himself** / **the fall and the verdict**. The Lavender
  Scare beat is folded under box 2 (one honest beat, Eisenhower's 1953 order).
- One mid-episode check-in ("Two boxes down, two to go"). One prediction beat
  ("Your turn." + 9-second pause) at the Wheeling numbers.
- Mid-episode wrong beat (Maya confidently claims some of McCarthy's 205 names
  must have checked out; Marcus corrects: zero spies caught, none of his
  victims in the Venona cables) — different tool from the recap fumble
  (memory-check: "the vote was... sixty-seven to twenty-two?").
- Maya's knows-something beat: her sophomore English teacher taught The
  Crucible as a McCarthyism documentary (student-world knowledge; Miller's own
  HUAC investigation confirmed by Britannica). Irrelevant human moment: the
  half-asleep homeroom academic-honesty pledge, coloring her reaction to
  loyalty oaths.
- Recap ("Four boxes, let's land them," Maya drives) → self-test (three
  AP-shaped: one stimulus-style on the loyalty program, one on the shifting
  numbers, one on the Venona verdict; CER pauses 18/16/15s; model answers in
  natural CER prose, no spoken labels; fast bonus on the Lavender Scare) →
  shared tagline once, split as a duet ("Real threat — / — wrong weapons.")
  with the held-dash production note.
- Forward tease points ONLY to U7-L5 (Suburbia). No drift into Cold War
  culture or civil rights. No modern analogies.
- Fish direction: cold open + sign-off/tagline in [professional broadcast
  tone]; Maya's questions [curious, inquisitive tone]; takeaways [confident
  tone]; myth-busts [firm]; Maya caught wrong [sheepish]; grim material
  [serious tone]; body default [conversational]; one [beat] before the Welch
  quote; one [emphasis] ("zero spies"). Self-test questions AND model answers
  strictly neutral (no tags).

**Fact pass (done before writing, Tier 1 first):**
- 5steps2024 ch. 25: Soviet bomb 1949; Mao's China 1949; HUAC 1947 Hollywood
  hearings; Hollywood Ten = one-year sentences for contempt of Congress;
  blacklist to 1960; McCarran Internal Security Act 1950 (registration +
  defense-work ban; Truman vetoed, Congress overrode); Hiss convicted of
  perjury; Rosenbergs indicted 1950 / convicted 1952 / executed; post–Cold
  War declassified US+Soviet documents confirmed Hiss and the Rosenbergs were
  Soviet agents; Federal Employee Loyalty Program 1947 + "nearly 4 million"
  screened; Wheeling Feb 9, 1950, 205 claimed, list "would expand and contract
  over time, and it was never fully revealed"; Army–McCarthy hearings live on
  two TV networks; McCarthy sought favorable treatment for a drafted aide;
  Murrow's hostile See It Now profile; Eisenhower worked behind the scenes;
  censure December 1954; McCarthy died three years later; glossary:
  "McCarthy's charges were largely unsubstantiated."
- premium2027 ch. 10/11: EO 9835 (1947) loyalty program + oaths; McCarran Act
  (registration, emergency-arrest provision, veto override); 205 → 57
  ("mostly baseless"); "Second Red Scare" label; China 1949 → "soft on
  Communism" attacks; censure 1954 after baseless Army accusations.
- Princeton Review: checked for McCarthyism content; no Venona/Lavender hits
  (not used for those beats).
- Tier 2 (Britannica, three articles): Welch quote full wording — "Have you
  no sense of decency, sir, at long last? Have you left no sense of decency?";
  hearings began April 1954, 36 days, ~80M viewers; censure 67–22; Hollywood
  Ten imprisoned for contempt + blacklisted; Hiss convicted January 1950.
- Congress.gov (Moynihan's Congressional Record tribute to Meredith Gardner):
  Venona decrypts "finally revealed publicly in 1995" — taught as "the
  nineteen nineties."
- Lavender Scare (one beat, brief-authorized): Eisenhower's EO 10450 (1953)
  added "sexual perversion" to federal-employment security criteria; thousands
  fired/resigned on the blackmail-vulnerability theory; order extended
  Truman's loyalty program. Confirmed via Facing History / OutHistory
  summaries; taught hedged ("thousands"). Disclosed in the script's Sources
  footer.
- "205 → 81 → 57": 205 and 57 pinned by Tier 1; 81 from the standard sequence
  (his February Senate telling); taught as "in different tellings" with the
  explicit point being the shifting, never a pin.
- **No suspected book errors this round** — the Tier-1 books agreed with each
  other and with Tier 2 on every checkable claim used.

**Mechanics (self-checked, writer pass):** 1,869 spoken words (floor 1,440);
68s of scripted pauses; experienced runtime ~11.5 min (header + cold-open
promise both say ~12 min). Em dashes: 4 (G8 ≤ 10). That's/Here's starters: 2.
"Not X, just Y" antitheses: 0. Balanced triples: 0. Retired phrases: 0. Max
single-tone share: 19.1% ([conversational], 9/47 directed turns). Micro-turns:
2 (the duet tagline only). Paralanguage: 1 ([beat]). [emphasis]: 1. Marcus:
no turn over 100 words. Maya: 38% of turns end in "?" (cap ~60%). Self-test
Q&A: zero direction tags.

**Open for the coordinator (not done by the writer):** Layer 1 gates
(apush-script-gates.py), Layer 2 clean-context read + validator checklist,
Layer 3 dedicated fact-check, user lock, push. Registry NOT touched — entries
below are ready to add.

## Registry additions (coordinator: add as F-U7-012 through F-U7-017)

- id: F-U7-012
  topic: 'Hollywood Ten — prison for contempt of Congress, not espionage'
  correct: 'The Hollywood Ten (writers/directors who refused to answer HUAC in 1947) received one-year jail sentences for contempt of Congress. They were never charged with espionage. Teach "contempt, not spying" — no spies were caught in Hollywood.'
  falsehoods:
  - hollywood ten.{0,30}(espionage|spy|spying).{0,25}(convict|prison|jail|sentenc)
  - hollywood ten.{0,20}were spies
  sources:
  - 5steps
  - britannica
  tier_note: 'Added U7-L4 v2 2026-10-07 — writer fact pass.'

- id: F-U7-013
  topic: 'McCarthy's list never existed — numbers shifted 205/81/57, no names ever produced'
  correct: 'At Wheeling (Feb 9, 1950) McCarthy claimed 205 communists in the State Department; the number shifted across tellings (205/81/57) and the Senate found no list, no names, no evidence. Teach the shifting, never a pin — and never that he produced a list.'
  falsehoods:
  - mccarthy.{0,30}(produced|revealed|published|had).{0,20}list
  - 205.{0,20}names.{0,20}(produced|revealed|published)
  sources:
  - 5steps
  - premium2027
  tier_note: 'Added U7-L4 v2 2026-10-07 — writer fact pass.'

- id: F-U7-014
  topic: 'Venona did NOT vindicate McCarthy'
  correct: 'The Venona decrypts (released mid-1990s; NSA releases began July 1995) confirmed Soviet espionage was real and wider than admitted — Hiss, the Rosenbergs — but the real spies were caught by the FBI/courts years before McCarthy's crusade, and none of McCarthy's victims appear in the cables. Confirming the threat is not justifying the hunt.'
  falsehoods:
  - venona.{0,30}vindicat.{0,15}mccarthy
  - venona.{0,20}proved.{0,20}mccarthy.{0,10}right
  sources:
  - 5steps
  - congress.gov
  tier_note: 'Added U7-L4 v2 2026-10-07 — writer fact pass.'

- id: F-U7-015
  topic: 'The scare's machinery predated McCarthy — he did not invent the Second Red Scare'
  correct: 'The Federal Employee Loyalty Program (EO 9835, 1947, Truman), HUAC's 1947 Hollywood hearings, and the McCarran Internal Security Act (1950) were all running before the Wheeling speech (Feb 1950). McCarthy harvested a scare he did not invent.'
  falsehoods:
  - mccarthy.{0,25}(invented|created|started|began).{0,20}(red scare|mccarthyism)
  sources:
  - 5steps
  - premium2027
  tier_note: 'Added U7-L4 v2 2026-10-07 — writer fact pass.'

- id: F-U7-016
  topic: 'Welch quote exact wording'
  correct: '"Have you no sense of decency, sir, at long last? Have you left no sense of decency?" — Joseph Welch to McCarthy, Army–McCarthy hearings, June 1954. The transposed variant ("At long last, have you no sense of decency?") is wrong.'
  falsehoods:
  - at long last, have you no sense of decency
  sources:
  - britannica
  tier_note: 'Added U7-L4 v2 2026-10-07 — writer fact pass; confirmed across three Britannica articles.'

- id: F-U7-017
  topic: 'Lavender Scare = Eisenhower's EO 10450 (1953), not McCarthy's program'
  correct: 'The Lavender Scare purge of gay and lesbian federal workers came via Eisenhower's Executive Order 10450 (1953), which added "sexual perversion" to federal-employment security criteria; thousands were fired or resigned on the blackmail-vulnerability theory. It extended Truman's loyalty program — it was not McCarthy's operation.'
  falsehoods:
  - mccarthy.{0,30}lavender scare
  - lavender scare.{0,30}mccarthy's (order|program)
  sources:
  - web
  tier_note: 'Added U7-L4 v2 2026-10-07 — writer fact pass. Brief-authorized one-beat; confirmed via Facing History/OutHistory summaries.'

## Validation history (coordinator, 2026-10-07)

- **Layer 1:** initial 3 FAILs — G1 (4 That's-starters), G7 (5 pause tags unnamed in read note), G9 (4 antitheses). Repaired: reworded 2 That's-starters, named all 5 pause tags in the read note, cut 2 recap antitheses. Final: 13/13 PASS.
- **Layer 2 (fresh ear):** NOT LOCK-READY → 5 blockers, all repaired: (1) third That's/Here's tic ("And here's the part people skip" → "The part people skip"); (2) tagline duet repeated Maya's takeaway → rewritten "Honest fear — / — dishonest hunt."; (3) "Check your boxes." twice + hollow test-talk → first cut to the substantive both-sides line; (4) three mid-episode check-ins → kept only "Two boxes down, two to go"; (5) second triple-parallel cadence → double. Soft: Marcus's `[dramatic]` → `[serious tone]` for fleet consistency.
- **Layer 3 (different fresh fact-checker):** BLOCKED → 3 blockers, all repaired: (B1/B2) "before McCarthy's crusade"/"years before" timing false for the Rosenbergs (arrested Jul/Aug 1950, convicted Mar 1951 — after Wheeling) → "handled by the FBI and the courts — not by McCarthy" in all 3 places (box 3, Venona beat, self-test Q3; coordinator caught a 4th instance the fact-checker missed); (B3) footer repeated 5steps' "convicted 1952" → corrected to March 1951 with book-error disclosure. Minors F1–F3 repaired: Wheeling "protected by" → "made known to the Secretary of State"; "no connection to anything" → "no connection to any wrongdoing"; recap "already in the courts" → "Hiss case decided, atomic-spy hunt underway". F4 (Wheeling audience detail) cut as unverifiable in-tier; F5 (Crucible anecdote) kept as disclosed Maya classroom knowledge.
- **Book error confirmed (coordinator, independent):** 5steps2024 ch25 prints "convicted of espionage in 1952" — Britannica, Columbia Encyclopedia, and HISTORY all confirm conviction March 29, 1951, execution June 19, 1953. Registered as F-U7-018. (Also noted: premium2027 ch10's timeline mislabels the 1953 execution as 1952 — same class, not used by the script.)
- **Gates change (coordinator):** the 7 new registry entries tripped G12 on the script's own pedagogical debunking lines; extended NEG_FRAME with "trap answer" and "real error" frames + a per-fact "if you write that" guard on F-U7-013. Gates re-run 13/13.
- **Registry:** 509 → 516 (F-U7-012…F-U7-018 added same day, native style, parses clean). F-U7-014's "years before" wording corrected by Layer 3; F-U7-017's sources corrected to NPS (Tier 2).
- **Fresh Layer-2 re-read (third agent):** REPAIRS VERIFIED — all 9 repairs clean in context, full mechanical sweep green (That's/Here's 2/2, em dashes 9/10, antitheses ≤2, micro-turns 1, no CER labels, direction density max 16%, self-test untagged). No new blockers.
