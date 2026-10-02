# APUSH Video Series Bible

**Series:** APUSH Explained — motion-graphic explainer videos for the Fall 2026 CED (May 2027 exam).
**Format:** ~5 minutes per episode. Hook → story → exam takeaway. 9:16 vertical.
**Companion series (done):** 53 grading walkthroughs (videos 1–53) — exam technique.
**This series:** content explainers — the "why it matters" behind the facts.

## The ecosystem (every episode ships with)

Each episode is one node in a content cluster:

| Piece | Source | Where it lives |
|---|---|---|
| Video | this series | YouTube → top of funnel |
| Lesson | period review section | drill site |
| Drill set | bank MCQs tagged to the episode's topics | drill site |
| FRQ | SAQ set / DBQ / LEQ from the bank | drill site |
| Grading video | videos 1–53 (where one exists for the FRQ) | YouTube |

The video ends with the exam takeaway and points to the drill set. The drill site points back to the video for the story. Neither strands the student.

## Animation vocabulary (expanded engine)

Built on `video/motion.py`. Existing: Ken Burns scenes, sliding captions, animated titles, presentation slides.

New primitives to build:

1. **timeline_scene** — horizontal timeline; events pop in left-to-right in sync with narration. (Period overviews, "road to the Civil War", Cold War.)
2. **map_scene** — PD map image with an animated route drawing itself (Lewis & Clark, transcontinental railroad, Trail of Tears) or territory shading spreading (Louisiana Purchase, Mexican Cession).
3. **kinetic_text** — single big phrases slamming in with scale + fade for emphasis beats ("NO TAXATION WITHOUT REPRESENTATION").
4. **split_scene** — before/after wipe (1860 vs 1869 travel times; North vs South economies).
5. **chart_scene** — animated bars growing from our own data (immigration waves, industrial output, election maps).
6. **doc_zoom** — slow zoom into a PD primary source with a moving highlight box landing on the key phrase as the narration quotes it.
7. **counter_scene** — animated number ticking up (20,000 workers; 4 million freedpeople; 12,000 miles of track).

Rule: every episode uses at least 3 motion primitives. No episode is slides-only.

## Episode plan — 36 episodes, 4 per period

Each episode lists: title, CED key concepts, linked lesson, drill tags, linked FRQ.

### Period 1 (1491–1607) — lesson: u1.md
1. **Three Worlds Collide** — Native societies, European contact, Columbian Exchange. Drill: U1/MIG/GEO. FRQ: SAQ set (new, fresh wave).
2. **The Spanish Machine** — encomienda, casta, silver. Drill: U1/WXT. FRQ: —.
3. **Why Europe Came** — motives: God, gold, glory; joint-stock companies. Drill: U1/WOR.
4. **The Exchange That Changed Everything** — Columbian Exchange deep dive. Drill: U1/GEO. FRQ: LEQ (new).

### Period 2 (1607–1754) — lesson: u2.md
5. **Jamestown vs. Plymouth** — two colonization models. Drill: U2/MIG. FRQ: SAQ set.
6. **The Triangle** — transatlantic trade, Middle Passage, mercantilism. Drill: U2/WXT/GEO.
7. **Awakenings** — First Great Awakening, Enlightenment ideas. Drill: U2/ARC/SOC.
8. **Thirteen Different Colonies** — regional differences (New England/Middle/Southern). Drill: U2.

### Period 3 (1754–1800) — lesson: u3.md
9. **The Road to Revolution** — Seven Years' War → Stamp Act → Independence. Drill: U3/PCE. FRQ: DBQ (2023 DBQ1).
10. **An Experiment Called America** — Articles → Constitution → Bill of Rights. Drill: U3/PCE/NAT.
11. **The First Party Fight** — Federalists vs. Democratic-Republicans. Drill: U3/PCE.
12. **1798: The Republic Tested** — Alien & Sedition, Virginia/Kentucky Resolutions. Drill: U3.

### Period 4 (1800–1848) — lesson: u4.md
13. **The Market Revolution** — transportation, communication, who won/lost. Drill: U4/WXT. FRQ: SAQ set.
14. **Jackson's America** — democracy expanded, and for whom it wasn't. Drill: U4/PCE/SOC.
15. **Reformers and Utopians** — Second Great Awakening → abolition, women's rights, Seneca Falls. Drill: U4/ARC.
16. **The Culture of the Early Republic** — American art, literature, nationalism (War of 1812 legacy). Drill: U4/ARC.

### Period 5 (1844–1877) — lesson: u5.md
17. **Manifest Destiny** — ideology, Texas, Mexican-American War, the Wilmot Proviso fuse. Drill: U5/MIG/GEO.
18. **The House Divides** — Compromise of 1850 → Kansas-Nebraska → Dred Scott → election of 1860. Drill: U5/PCE. FRQ: DBQ (new).
19. **The Civil War in 5 Minutes** — why the North won (the exam version). Drill: U5/WOR.
20. **Reconstruction: Promise and Betrayal** — 13/14/15, Freedmen's Bureau, Compromise of 1877. Drill: U5/SOC. FRQ: LEQ.

### Period 6 (1865–1898) — lesson: u6.md
21. **The Railroad That Built America** — PILOT DONE. Drill: U6/WXT. FRQ: SAQ set.
22. **The Gilded Age Machine** — industrial capitalism, Carnegie/Rockefeller, Bessemer steel. Drill: U6/WXT/ARC.
23. **Workers Fight Back** — unions, strikes (Homestead, Pullman), Knights vs. AFL. Drill: U6/SOC.
24. **The New South (That Wasn't)** — sharecropping, Jim Crow, disenfranchisement. Drill: U6/SOC/PCE.

### Period 7 (1890–1945) — lesson: u7.md
25. **Becoming a World Power** — imperialism debate, Spanish-American War, Panama Canal. Drill: U7/WOR.
26. **The Progressive Fix** — muckrakers, trust-busting, the amendments (16–19). Drill: U7/PCE/SOC.
27. **Boom, Bust, New Deal** — 1920s → Great Depression → First/Second New Deal. Drill: U7/WXT. FRQ: DBQ (2024 DBQ).
28. **The Good War** — WWII home front, mobilization, atomic bomb debate. Drill: U7/WOR.

### Period 8 (1945–1980) — lesson: u8.md
29. **The Cold War Playbook** — containment, Truman Doctrine → Vietnam. Drill: U8/WOR. FRQ: LEQ.
30. **The Affluent Society** — suburbs, consumerism, the other America. Drill: U8/SOC/WXT.
31. **The Sixties** — Civil Rights movement, Great Society, youth culture, 1968. Drill: U8/SOC/PCE. FRQ: SAQ set.
32. **The Seventies Unravel** — Nixon shock, Watergate, energy crisis, malaise. Drill: U8/PCE/WXT.

### Period 9 (1980–Present) — lesson: u9.md
33. **The Reagan Revolution** — conservatism, Reaganomics, Moral Majority. Drill: U9/PCE.
34. **The Wall Comes Down** — end of Cold War, 1989–1991. Drill: U9/WOR.
35. **The Globalized 90s** — deindustrialization, NAFTA, immigration, culture wars. Drill: U9/WXT/MIG/SOC.
36. **The 21st Century** — 9/11, Iraq/Afghanistan, Patriot Act, 2008 crash. Drill: U9/PCE/WOR. FRQ: SAQ set.

## Production pipeline (per episode)

1. **Script** — narration (~650 words for 5 min), written to the engagement spec: cold-open hook, 3–4 story beats, exam takeaway closer. Plain teacher voice.
2. **Asset hunt** — 4–6 PD images per episode (Wikimedia/LOC, license verified, PROVENANCE.md per episode).
3. **Scene plan** — which animation primitive per beat (≥3 motion primitives, no slides-only episodes).
4. **TTS** — per-scene narration MP3s (existing pipeline).
5. **Render** — motion.py assembly on the 5090.
6. **QC** — contact-sheet frame check + watch-through for drift.

## Sequencing

Pilots first: episode 21 (done), then one U9 episode (33 or 34 — biggest content gap, most CED leverage). Then Periods 1–3 (foundation, exam weight 4–8% each but students know them least). Then fill by period.

The grading walkthroughs (53 done) publish alongside as the technique companion — "we graded this DBQ" videos link to the explainer for the underlying content.
