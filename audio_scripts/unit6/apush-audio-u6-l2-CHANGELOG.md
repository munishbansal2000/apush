# U6-L2 "WWI — Neutrality to War" — Changelog

## v1 → v2 (2026-10-07, writer: rebuild to frozen 2026-10-06 standards)

v1 was an 8-minute / 1,440-word draft written to the old standard. v2 is a full
rebuild: new cold open, new structure, three earned boxes, prediction beats,
stimulus-style self-test with Maya's model answers, pause-honest runtime.

### Standards compliance (frozen 2026-10-06)
- Runtime is EXPERIENCED: 1,636 spoken words at ~152 WPM + 61 s scripted pauses
  (2 × [8-second pause] prediction beats, 3 × [15-second pause] self-test) =
  ~11.8 min. Header, cold-open promise ("Twelve minutes"), and word count agree.
- All 13 gates pass (`apush-script-gates.py`, --minutes 12). W2 warns are false
  positives on short content lists (e.g. "tradition, division, distance").
- G13: no spoken Claim/Evidence/Reasoning labels anywhere; self-test answers are
  claim–evidence–reasoning in natural connective tissue only.
- Boxes (3): (1) Neutrality 1914–16, (2) the slide (Lusitania → Arabic/Sussex
  pledges → 1916 election), (3) the break (unrestricted submarine warfare →
  Zimmermann telegram → Wilson's case for war). Maya checks each off in her voice;
  recap is the only check layer (no mid-episode box inventory).
- Maya: mid-episode wrong beat ("Hundreds of them, right?" — legend frame,
  corrected with "Not quite") + recap content fumble (flipped Arabic/Sussex
  order) + knows-something beats (German embassy newspaper ad, telegram from
  her teacher) + one human moment (deep-water fear from a dock incident).
  Marcus turns all ≤100 words.
- Continuity: cold open nods to U6-L1 v2's closer tease
  ("Europe explodes, America tries to sit it out, and it doesn't work"). One
  Progressivism sentence (Wilson the Progressive turning government from fixing
  the country to fixing the world). One "next time" only, teasing U6-L3.

### Scope decisions
- Fourteen Points NOT taught in full — belongs to U6-L4 (Versailles/League
  fight). Planted only as war-aims framing: Wilson's case was democracy itself,
  and "his vision of that peace gets the full treatment two lessons from now."
- Wartime mobilization (draft, agencies, propaganda, repression) NOT taught —
  belongs to U6-L3. Planted as consequence only (closer tease).
- No re-teaching Unit 5 or earlier.

### Factual corrections (all verified against the frozen hierarchy)
1. **"Hundreds of American ships sunk" (Feb–Mar 1917) — book error, corrected.**
   premium2027 ch9 says "In February and March of 1917, hundreds of American
   ships were sunk." Wrong: hundreds of ships TOTAL fell to U-boats in those
   months; American-flagged losses were a handful. Taught as "a handful" per
   5steps2024 ch21 ("several American ships were sunk"), delivered as the
   mid-episode legend wrong beat. Registry: F-U6-007.
2. **Zimmermann spelling (double n).** premium2027 and 5steps2024 both print
   "Zimmerman." The foreign secretary was Arthur Zimmermann. Script, header
   pronunciation line, and TTS note all use Zimmermann. Registry: F-U6-008.
3. **Lusitania numbers kept Tier-1-grounded:** single torpedo, sank in 18 min,
   ~1,198 dead incl. 128 Americans (princeton ch11; CFR). "Nearly twelve
   hundred" + "128 Americans" spoken; no false precision.
4. **Sussex kept vague on casualties:** premium2027 ch9 pins "eighty deaths and
   hundreds of injuries" — v2 teaches only "torpedoed with Americans hurt"
   (Mar 1916) to avoid a contestable pin.
5. **1916 election:** "He kept us out of war"; Wilson went to bed election night
   believing he'd lost; California decided by fewer than four thousand votes
   (~3,773, hedged); Hughes snubbed Governor Hiram Johnson, whose people never
   forgave him (Miller Center, UVA Crystal Ball).
6. **Wilson quote sourcing:** "impartial in thought as well as in action" and
   "the one great nation at peace" from the Aug 19, 1914 message to the Senate
   (wording transcript-verified via Digital History / Teaching American History;
   v1's "August 1914 proclamation" framing was loose — the Aug 4 proclamation
   was formal, the Aug 19 message carried the famous line; v2 attributes
   correctly). "Such a thing as a man being too proud to fight" — May 10, 1915
   Philadelphia speech. "The world must be made safe for democracy" — Apr 2,
   1917 war message; declaration Apr 6.
7. **Telegram sequence:** sent Jan 1917, cracked by British codebreakers,
   published in US papers Mar 1, Zimmermann admitted genuine two days later
   (Mar 3). Taught as "last straw, not the cause."
8. **German gamble:** admirals' bet per 5steps2024 ch21 — starve Britain/France
   before America could intervene; announced Jan 31, effective Feb 1, 1917;
   Wilson broke relations Feb 3.
9. **Trade tilt:** US trade with Britain/France up ~300% 1914–17, German trade
   to almost nothing (prem27); bankers loaned Allies billions, ~100× Germany's
   share (Heimler transcript). Spoken as "roughly quadrupled" / "billions" /
   "a hundred times" — ranges, not pins.

### Deliberately hedged or cut
- Arabic pledge details (Aug 1915, 2 Americans dead) kept minimal — casualty
  figures are stable in Tier 1, but density was cut for audio.
- Room 40 not named in dialogue ("British codebreakers") — absent from Tier 1;
  detail lives in the Sources footer.

### Files
- `apush-audio-u6-l2-script-v2-DRAFT.md` — the draft
- `apush-audio-u6-l2-CHANGELOG.md` — this file
- Registry additions: F-U6-007, F-U6-008 in `apush-fact-registry.yaml`
  (YAML re-validated after edit)

### Handoff notes for Layer 1/2/3
- Gates: 13/13 PASS at --minutes 12. W2 warns are content-list false positives.
- Fact-check layer: the "hundreds of American ships" legend beat and the
  Zimmermann spelling are the two items most likely to look wrong to a checker
  — both are documented corrections with registry entries.

## Repair pass — 2026-10-07 (coordinator; L2 + L3 findings)
- **L3 BLOCKER (wrong claim):** "ten days later, in Philadelphia" → "three days later" (Lusitania May 7, 1915 → Wilson's "too proud to fight" speech May 10, 1915). Quote and placement were already correct.
- **L2 BLOCKER (forward tease):** deleted Marcus's transition turn pointing "two lessons from now" at U6-L4's peace-vision content and duplicating the closer's draft/agencies/crackdown list. Maya's "that's its own story" already closes box 3; her closer's "Next time: the home front" is now the single tease.
- **L2 BLOCKERS (telegram stretch):** rewrote Marcus's two turns — eliminated both parallel mirror pairs, cut punchlines to one ("last straw, not the cause"), removed the second triple cadence. Maya's self-test Q3 answer rephrased in her own words (was a 5-word verbatim echo of Marcus's punchline).
- **L2 soft note:** varied the second "Think it through." → "Talk it out."
- **L3 terminology:** footer "Independent (Tier-2-style) confirmations" → "(web-tier)" per the frozen hierarchy's naming convention.
- **Registry repairs:** F-U6-007 `sources: [5steps24]` → `[prem27, 5steps]` (invalid key fixed); F-U6-008 `correct:` corrected — 5steps2024 uses "Zimmermann" (correct) except once ("the Zimmerman Note"); only premium2027 misspells it throughout. Sources `[hierarchy_check]` → `[prem27, 5steps, britannica]`.
- Header count updated 1636 → 1626 spoken words (net −10 from the deleted turn + rewrites). Gates re-run 13/13 PASS. YAML re-validated.
