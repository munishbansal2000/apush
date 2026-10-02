# APUSH Topic Gap Analysis

**Date:** 2026-10-01
**Purpose:** Find topics that free prep sites cover but our question bank under-covers, so the fresh-writing wave can target the gaps with original questions.
**Rule honored:** Topics and facts only. No question stems, options, or explanations were copied from any site.

## Method

- **Varsity Tutors** AP US History practice-tests page: full taxonomy scraped (all 9 periods, ~100 topic areas with per-topic question counts, e.g. "Reagan and Conservatism — 70 questions").
- **Khan Academy** AP US History course: khanacademy.org is bot-walled (client-challenge on all fetches, including sitemap and API). Course structure recovered via OpenCourser's indexed mirrors of each Khan period course (segment lists verified for Periods 1, 6, 8, 9; the 11-course structure — Periods 1–9 plus exam-skills and standards-mapping — confirmed).
- **Our bank:** 819 MCQs. Keyword-frequency checks run against stem + stimulus + id in `build/reclaim-merged/staged/` (approximations — terminology variants may shift counts by ±2, but zeros are real).

### Bank coverage snapshot (given)

| Period | Count | Skill | Count | Theme | Count |
|---|---|---|---|---|---|
| U1 | 27 | Developments & Processes | 448 | PCE | 499 |
| U2 | 76 | Making Connections | 116 | SOC | 281 |
| U3 | 119 | Claims & Evidence | 100 | WXT | 218 |
| U4 | 114 | Sourcing & Situation | 103 | WOR | 146 |
| U5 | 83 | Contextualization | 52 | MIG | 99 |
| U6 | 87 | | | ARC | 47 |
| U7 | 143 | | | GEO | 45 |
| U8 | 114 | | | NAT | 39 |
| U9 | 56 | | | | |

Contextualization by period: U1:1, U2:3, U3:7, U4:7, U5:3, U6:4, U7:12, U8:13, U9:2.

## Ranked gaps

Ranked by: thinness of our coverage × prominence on the sites × writability as original questions.

### 1. Native American societies before contact (U1 · GEO/NAT) — ~0 items
- **Sites:** Khan Period 1 segment ("Native American societies before contact"); Varsity Tutors Period 1 topic area.
- **Why thin:** U1 is our thinnest period (27) and the bank's pre-contact coverage is effectively zero — no items on Cahokia/Mississippian culture, Ancestral Puebloans, Iroquois Confederacy, three-sisters agriculture, or environmental adaptation.
- **Angles:** regional adaptations to environment (pure GEO/NAT); social complexity without European contact; comparison across regions.

### 2. Spanish colonial labor systems — encomienda, casta (U1 · WXT/SOC) — ~0 items
- **Sites:** Khan Period 1 segment ("Labor, slavery, and caste in the Spanish colonial system"); VT Period 1 topic with 48 questions.
- **Why thin:** Same U1 hole; the bank jumps from contact to English colonization with nothing on how Spain organized colonial labor and society.
- **Angles:** encomienda vs. later hacienda; casta paintings as social-order sources (great sourcing material); Pueblo Revolt as resistance.

### 3. Transatlantic / triangular trade (U2 · WXT/GEO) — ~0 items
- **Sites:** VT Period 2 topic ("Transatlantic Trade", 50 questions).
- **Why thin:** U2 coverage (76) leans colonial-society; the trade system itself — middle passage, mercantilism in practice, port cities — is unasked.
- **Angles:** triangular trade routes as GEO; mercantilist policy vs. colonial evasion; middle passage (sourcing-rich).

### 4. Contextualization questions in U1, U2, U5, U9 (skill × period) — 1/3/3/2 items
- **Sites:** VT has a dedicated "Contextualizing Period N" topic for **every** period (35–68 questions each); Khan has "Causation"/context segments per period.
- **Why thin:** Contextualization is our thinnest skill (52) and it's thinnest exactly where the periods are thinnest. This is a systematic gap, not a topic gap — every period needs "place this development in its broader context" items.
- **Angles:** Highest-leverage single fix: a contextualization item batch for U1, U2, U5, U9 first.

### 5. Deindustrialization & the service economy (U9 · WXT) — ~0 items
- **Sites:** VT Period 9 ("A Changing Economy"); Khan Period 9 ("A changing economy").
- **Why thin:** U9 (56) skews politics (Reagan, Cold War end); the economic transformation — Rust Belt, offshoring, service-sector shift — is absent.
- **Angles:** Sun Belt vs. Rust Belt (GEO crossover); deindustrialization and union decline; globalization's domestic face.

### 6. Immigration in the 1990s–2000s (U9 · MIG) — ~0 items
- **Sites:** Khan Period 9 segment ("Migration and immigration in the 1990s and 2000s"); VT Period 9 topic set.
- **Why thin:** Our MIG coverage (99) is heavily 19th-century; post-1965 immigration law and its 1990s–2000s effects are unasked.
- **Angles:** Hart-Celler Act's long tail; demographic change and nativist backlash; continuity with earlier immigration debates (comparison items).

### 7. End of the Cold War (U9 · WOR) — ~0 items
- **Sites:** Khan Period 9 ("The end of the Cold War"); VT Period 9 (51 questions, 76 flashcards — one of their heaviest P9 topics).
- **Why thin:** U9's WOR items stop at Reagan's buildup; Gorbachev, détente's collapse and revival, the Berlin Wall, and the Soviet collapse are missing.
- **Angles:** Reagan's rhetoric vs. diplomacy with Gorbachev; causes of Soviet collapse (internal vs. US pressure); the "new world order" moment.

### 8. Challenges of the 21st century — terrorism, Iraq/Afghanistan, civil liberties (U9 · WOR/PCE) — ~7 items
- **Sites:** Khan Period 9 ("Challenges of the 21st century"); VT Period 9 (50 questions).
- **Why thin:** Only a handful of items; 9/11 → Patriot Act → Iraq/Afghanistan → civil-liberties debates is one of the most-tested P9 arcs on the free sites.
- **Angles:** security-vs-liberty (PCE); preemption doctrine (WOR); economic crisis of 2008 as companion topic.

### 9. Reagan and conservatism (U9 · PCE) — ~10 items
- **Sites:** Khan Period 9 ("Reagan and conservatism"); VT Period 9 (70 questions — their single heaviest P9 topic).
- **Why thin:** 10 items vs. the topic's weight on every free site; missing Moral Majority/religious right, Reaganomics mechanics, deregulation, the conservative coalition's composition.
- **Angles:** why the 1970s produced the backlash (malaise, stagflation, Watergate); Reaganomics: theory vs. deficit reality; social vs. economic conservatives.

### 10. Technological innovation in the Gilded Age (U6 · WXT/ARC) — ~0 items
- **Sites:** VT Period 6 topic ("Technological Innovation", 50 questions).
- **Why thin:** U6 (87) covers industrial capitalism and labor but not the inventions themselves — Bessemer steel, telephone, telegraph, electrification, typewriter.
- **Angles:** technology → business organization (vertical integration needs); communication tech and national markets; who the inventors were vs. who profited.

### 11. Development of the middle class, Gilded Age (U6 · SOC) — ~0 items
- **Sites:** Khan Period 6 segment; VT Period 6 (63 questions).
- **Why thin:** U6's SOC items focus on workers and immigrants; the emerging white-collar middle class — clerks, managers, department stores, suburbs — is unasked.
- **Angles:** new occupations from industrialization; consumer culture's beginnings; middle-class reform energy (links to Progressivism).

### 12. The "New South" (U6 · PCE/SOC) — ~0 items
- **Sites:** VT Period 6 topic ("The 'New South'", 60 questions).
- **Why thin:** Henry Grady's New South creed, sharecropping vs. the industrialization promise, and the continuity-with-slavery critique are all absent.
- **Angles:** "how new was the New South" (continuity/change — exam favorite); sharecropping economics; disenfranchisement constitutions.

### 13. Environment & natural resources, 1968–1980 (U8 · NAT) — ~20 items, still thin
- **Sites:** Khan Period 8 segment; VT Period 8 (65 questions on this one topic).
- **Why thin:** NAT is our thinnest theme (39). We have some coverage (Silent Spring, EPA) but nowhere near the topic's weight: Earth Day, Clean Air/Water Acts, Endangered Species Act, Three Mile Island, the energy crisis, Sagebrush Rebellion.
- **Angles:** environmentalism as a bipartisan-then-partisan story; energy crisis → economic malaise (WXT crossover); Western land-use conflicts (GEO).

### 14. Youth culture / counterculture of the 1960s (U8 · ARC/SOC) — ~1 item
- **Sites:** Khan Period 8 ("Youth culture of the 1960s"); VT Period 8 (44 questions).
- **Why thin:** ARC is 47 total; the counterculture — music, campuses, the generation gap — gets one item.
- **Angles:** counterculture vs. the "silent majority" backlash (links to conservatism's rise); youth culture as ARC primary-source material (posters, lyrics).

### 15. Interwar foreign policy (U7 · WOR) — ~1 item
- **Sites:** VT Period 7 ("Interwar Foreign Policy", 61 questions).
- **Why thin:** U7 (143) is our strongest period but its WOR items cluster on the world wars; Washington Naval Conference, Kellogg-Briand, Good Neighbor Policy, and 1930s neutrality/isolationism are nearly unasked.
- **Angles:** isolationism vs. internationalism as a recurring American debate (comparison with post-1945); Good Neighbor Policy and Latin America.

### 16. Development of an American culture (U4 · ARC) — ~0 items
- **Sites:** VT Period 4 ("The Development of an American Culture", 67 questions).
- **Why thin:** U4 (114) covers politics and reform deeply but not the culture beat — Hudson River School, transcendentalism, American literature finding its voice.
- **Angles:** culture as nation-building after 1815 (PCE crossover); transcendentalism and reform (links to Age of Reform items).

### 17. Ghost Dance / Wounded Knee; Dawes Act / allotment (U6 · MIG/NAT) — 3–4 items
- **Sites:** Covered inside VT Period 6 "Westward Expansion: Social and Cultural Development" (53 questions) and Khan equivalents.
- **Why thin:** The Native American side of westward expansion is the thinnest part of U6's westward-expansion coverage.
- **Angles:** Dawes Act's intent vs. outcome (assimilation policy); Ghost Dance as spiritual resistance; Wounded Knee as endpoint narrative.

## Blind spots (site topics with no clean home in our structure)

- **"Thinking like a historian" (Khan, Period 1):** a skills unit, not content — maps to our Sourcing & Situation skill rather than any period. Suggests we could use a small set of period-agnostic sourcing-method items.
- **"America on the World Stage" (VT, Period 4):** early-republic foreign policy (XYZ Affair, Louisiana Purchase diplomacy, Monroe Doctrine origins) — maps to U4/WOR, a thin intersection worth a few items.
- **"Society in Transition" (VT, Period 8):** catch-all 1970s social change — mappable to U8/SOC but vague; deprioritize.
- **Khan's "AP US History exam skills and strategies" course:** test-taking skills, not content — no question-writing implication.

## Notes & caveats

- Keyword counts are approximations; a "0" means no stem/stimulus/id match, which for distinctive terms (encomienda, Bessemer, Hart-Celler) is reliable.
- Both sites organize by the standard 9-period CED structure, which maps 1:1 onto our U1–U9. No structural mismatch found.
- Varsity Tutors' per-topic question counts are self-reported and include flashcards; treat as relative emphasis, not absolute quality.
- Khan Academy's Periods 2, 3, 4, 5, 7 segment lists were not directly recovered (bot-walled); their topic emphasis is inferred from the Varsity Tutors taxonomy, which mirrors the same CED key concepts.
