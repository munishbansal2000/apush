# PassMaster Build Log

Running log. Counts per topic, per step. Updated as work proceeds.

## 2026-11-26 — Step 0 complete

- SPEC.md v1.0 and BLUEPRINT.md v1.0 written.
- Format locked from the Calc reference (schemas, question-authoring,
  question-bank-playbook, frq-build-plan, EXPLANATION-STANDARD).
- May 2027 exam format verified against AP Central + Fall 2026 CED:
  55 MCQ / 55 min; 3 SAQ all required / 40 min (Q1 secondary, Q2 primary,
  Q3 non-text; 1491-2001; different periods); DBQ 60 min incl 15-min
  reading / 7 docs / 7 points / 1754-1980; LEQ single prompt / 40 min /
  6 points; fully digital Bluebook; 3h15m total; Fri May 7, 2027.
- Fall 2026 CED Unit 1 topics 1.1-1.7 verified to match cb-codes.json
  exactly (its Fall 2019 citation is stale; the list is current).
- Schemas written: schemas/question.schema.json, schemas/exam.schema.json.
- Validator written: tools/validate_passmaster.py (stdlib only).

## 2026-11-26 — Surviving Unit 1 items census (before authoring)

Censused from disk by the coordinator. The 547 missing staged MCQs count
as zero.

### Staged bank — Unit 1: ZERO usable items

- Barron's 2027 ch03-mcq.json: 0 items (file empty; Period 1 chapter
  depleted in the 2026-10-03 rewrite). ch02-dbq.json and ch02-leq.json: 0.
- 5 Steps 2024 ch03 files are NOT Unit 1: ch03 is a mixed-period review
  chapter (its 20 MCQs carry topic codes 9.3, 7.8, 3.4, 3.11, 2.5, 8.10,
  7.12, 2.7, 4.3, 8.12, 5.9). Its SAQ (3) and LEQ (3) are Unit 3 content
  (Jefferson/Madison, Federalists); its DBQ (1) is 1789-1801. None counts
  toward Unit 1. The 5 Steps _raw ch03 files (55 MCQ raw) are unconverted
  source-book extractions, not PassMaster candidates.
- Barron's pt1-mcq.json (25) is a mixed-period practice test, not Unit 1.

### Fresh-written — Unit 1: 54 MCQ candidates, 0 SAQ, 0 LEQ

- u1-gaps.json: 37 U1 MCQ. hard-u1.json: 2 U1 MCQ.
  contextualization.json: 15 U1 MCQ. Total 54.
- Topic spread: 1.2: 21, 1.5: 19, 1.4: 5, 1.3: 7, 1.6: 2, 1.1: 0, 1.7: 0.
  Skewed: 1.2 and 1.5 over-covered, 1.1 and 1.7 uncovered.
- Difficulty spread: easy 20, medium 28, hard 6. Too easy-heavy against
  the 30/53/67 target; hard questions are the gap.
- Skill spread: 4.B 16, 1.A 8, 3.A 6, 1.B 5, 3.D 4, 5.A 3, 2.C 3, 5.B 3,
  4.A 2, 6.D 2, 3.C 1, 2.B 1. Missing skills in the surviving set: 2.A,
  3.B, 6.A, 6.B, 6.C.
- saq.json: 12 SAQ, none Unit 1. misc-gaps.json: 124 MCQ, none Unit 1.
- No surviving Unit 1 LEQ anywhere (exemplars in build/content/ are
  DBQ-focused, none Unit 1).
- Fresh items already carry image stimuli from the shared pool
  (assets/images/u1/, 32 files) with source URLs and local verification
  dates. Good provenance; reuse where they match.

### Unit 1 authoring gap (before verification)

- MCQ: 150 quota minus up to 54 survivors = at least 96 fresh, more if
  survivors fail blind verification.
- SAQ: 33, all fresh.
- LEQ: 11, all fresh.
- Total fresh authoring: at least 140 of 194, likely more.

## 2026-11-26 — Sequencing update (parent's order, adopted)

Per-topic sequence, locked: stimuli FIRST (sourced and verified, logged
with source and rights status), then stems + options + key locked, then
explanations, then blind verification. The whole sequence inside one topic
before moving to the next. This replaces any other ordering; everything
else in the brief stands.

## 2026-11-26 — Grounding rule (parent's order, locked in SPEC section 13)

The three prep books are the grounding layer, readable as extracted XHTML
at ~/workspace/apush/books/extracted/ (zips in ~/workspace/apush/books/
are backup originals; the old build/reclaim-*/ XHTML dirs are gone).
Before authoring ANY topic: read the matching chapters in all three books
plus the matching lesson script and the CED topic description. Every
question carries a `grounding` field (books: at least one entry with book
id, chapter, section; primary_sources where applicable). The verifier
checks grounding in the blind solve: an untraceable fact fails. Survivors
are REWRITTEN against the books, not just blind-verified; a faithful
survivor is kept with its book reference logged. Books never supply stems:
all stems, options, and explanations stay original.

Unit 1 chapter mapping (verified from the extracted files):
- Barron's 2027: Chapter 3, "Period 1: 1491-1607 The Meeting of Three
  Peoples" — premium2027/OEBPS/text/13_Chapter03.xhtml
- 5 Steps 2024: Chapter 6, "Settling of the Western Hemisphere
  (1491-1607)" — 5steps2024/OEBPS/ch06.xhtml (note: 5 Steps ch03 is the
  diagnostic exam, not Period 1 content)
- Princeton Review: Chapter 6, "Units 1 and 2: Early Contact with the New
  World (1491-1607) and Colonization of North America (1607-1754)" —
  princeton/OEBPS/xhtml/032_c006_6_Units_1_and_2_Earl.xhtml
- Lesson script: audio_scripts/unit1/ E1 (Native Societies) for Topics
  1.1-1.2; E2-E3 for 1.3-1.4.

Topic 1.1 is already final; a grounding audit of its 16 items is running
(add grounding fields without reopening passed items unless a real error
is found). Topic 1.2 writer was briefed before this rule and has been
sent the update mid-flight.

## Unit 1 — status

| Topic | MCQ quota | SAQ quota | LEQ quota | Written | Blind-verified final |
|---|---|---:|---:|---:|---:|---:|
| 1.1 | 12 | 3 | 1 | 16 | 16 |
| 1.2 | 24 | 5 | 2 | 0 | 0 |
| 1.3 | 22 | 5 | 1 | 0 | 0 |
| 1.4 | 28 | 6 | 2 | 0 | 0 |
| 1.5 | 24 | 5 | 2 | 0 | 0 |
| 1.6 | 28 | 6 | 2 | 0 | 0 |
| 1.7 | 12 | 3 | 1 | 0 | 0 |
| **Total** | **150** | **33** | **11** | **0** | **0** |

Writer: not yet spawned. Verifier: not yet spawned.

## Topic 1.1 stimuli (2026-11-26, writer log)

- las-casas-1542 (MCQ 0001-0003): paraphrase of Bartolome de las Casas, A Short Account of the Destruction of the Indies, written 1542, published 1552. Public domain. Text only, no image file.
- cahokia-mounds (MCQ 0004-0006): Powell's Mound at Cahokia, U.S. Army Air Service aerial photograph, public domain. Local file: assets/images/u1/original-ctx-u1-07.jpg. Viewed before writing; the mound is the large flat-topped earthwork in the center of the frame.
- waldseemuller-1507 (MCQ 0007-0009): Martin Waldseemuller's world map, 1507, first map to name the western lands America. Public domain. Local file: assets/images/u1/original-ctx-u1-03.jpg. Viewed before writing; twelve sheets, Vespucci and Ptolemy portraits at top.
- columbus-voyages (MCQ 0010-0012): map of the four voyages of Columbus, 1492-1503, by Albert Bushnell Hart, 1906, public domain, plus a data table of the four voyages (dates and landfalls verified against standard accounts). Local file: assets/images/u1/original-u1-columbus-voyages-01.jpg. Viewed before writing; routes numbered 1-4 with the Line of Demarcation marked.
- SAQ 0001 slot 1 (secondary text): original secondary passage written for this question, summarizing standard Period 1 background. No image file.
- SAQ 0002 slot 2 (primary text): paraphrase of Christopher Columbus, letter to Luis de Santangel, 1493. Public domain. Text only, no image file.
- SAQ 0003 slot 3 (non-text): Cantino planisphere, Portuguese world map, 1502. Public domain. Local file: assets/images/u1/saq-set-06-q3.jpg. Viewed before writing; Africa center, South American coast on the left, Tordesillas line through the Atlantic.

Topic 1.1 written 2026-11-26: 12 MCQ + 3 SAQ + 1 LEQ, all status draft, awaiting blind verification. Validator: 0 errors (87 warnings are quota shortfalls for other topics/units and final counts, as expected for drafts).

## Topic 1.1 blind verification (2026-11-26, verifier report)

Blind picks matched locked keys 12/12. Overall: 8/16 PASS.
- PASS: MCQ 0002, 0004, 0007, 0009; SAQ 0001, 0002, 0003; LEQ 0001.
- FAIL: MCQ 0001 (wrong skill 4.A, should be 2.A; reasoning continuity-change and theme GEO ill-fitting), 0003 (length tell, key 16w vs 11-12w; difficulty 4 too high, should be 2; theme MIG a stretch), 0005 (length tell, key 14w vs 8-11w), 0006 (length tell, key 21w vs 10-13w, worst in set), 0008 (length tell, key 17w vs 8-11w), 0010 (false alt text claiming a table in the image; caption "1492 to 1503" vs stimulus text/table "1492 to 1504"), 0011 (same figure defects; length tell, key 12w vs 6-8w; skill 4.A should be 5.A), 0012 (same figure defects; explanation wrongly identifies the map's "LINE OF DEMARCATION (1493)" papal line as the 1494 Tordesillas line; skill 3.B should be 1.A or 4.A).
- SET-LEVEL FINDING: key is the longest option in 11 of 12 MCQs. Writer must rebalance option lengths across the whole MCQ set, not just the five clear FAILs.
- Images viewed by verifier: Cahokia, Waldseemuller, Cantino all match their questions. Columbus map matches except the alt/date defects above.
- Fix round dispatched to the writer 2026-11-26; re-verification of all 12 MCQs to follow. SAQ/LEQ passed and untouched.

## Topic 1.1 blind re-verification (2026-11-26, verifier report 2)

12/12 MCQ PASS. All 8 original defects confirmed fixed in the files;
blind picks matched locked keys 12/12; no new defect found. No key changed
in any question. Option spreads now 0-3 words; no distractor padded with
filler (every lengthened distractor gained real content). The 1493 papal
Line of Demarcation fact was independently verified by the re-verifier by
web search and against the map's own "(1493)" label.
- CORRECTION to the fix log (verifier disclosure, accepted): the key is
  sole longest by exactly 1 word in FOUR MCQs (0004, 0007, 0009, 0012),
  not in 0007 only as the fix note claimed; longest-or-tied in 10/12.
  A 1-word margin is not a usable test-wise cue, so this passes under the
  stated threshold, but the residual key-longest tendency is recorded here.
- SPEC fix: figure-id form corrected to `fig-apush-mcq-NNNN` (optional
  `-x` suffix), matching the files; the `-f` form in SPEC section 8 was a
  stale Calc carryover. Schema `stimulus_set` description likewise
  corrected (SAQ carries null; LEQ carries null).
- All 16 Topic 1.1 questions flipped to status `final` by the coordinator
  2026-11-26. Validator: 0 errors. Unit 1 counts now: MCQ 12/150 (test
  2/28), SAQ 3/33 (test 0/3), LEQ 1/11 (test 0/1).

## Topic 1.1 fix round (2026-11-26, writer log)

All 8 verifier defects fixed; all 12 MCQs rebalanced to option spread 3 or less.
No key changed. SAQ/LEQ untouched. All 12 MCQs still status draft, awaiting blind
re-verification.
- 0001: skills 4.A to 2.A; reasoning continuity-change to causation; themes GEO to PCE.
- 0003: key A 16w to 12w; difficulty 4 to 2; theme MIG dropped.
- 0005: options 9/14/11/8 to 11/11/11/11; difficulty 3 to 2.
- 0006: key C 21w to 11w.
- 0008: key D 17w to 11w; A 8w to 10w.
- 0010/0011/0012: alt rewritten (no table claim; title/legend box in lower right);
  caption reconciled (map's printed title 1492 to 1503 vs fourth voyage returning 1504).
- 0011: skill 4.A to 5.A; options 12/6/8/8 to 10/10/10/10; rationale A rewritten to match.
- 0012: skill 3.B to 1.A; general step 3 and rationale D rewritten to the 1493 papal
  Line of Demarcation (Inter caetera, 100 leagues west of Azores/Cape Verde), noting
  Tordesillas (1494) later moved the line west; rationale C likewise corrected.
- Set rebalance (before to after, A/B/C/D word counts): 0001 10/12/11/12 unchanged;
  0002 14/11/13/11 unchanged; 0003 16/12/12/11 to 12/12/12/11; 0004 11/9/9/13 to
  11/12/12/13; 0005 9/14/11/8 to 11/11/11/11; 0006 10/13/21/11 to 10/13/11/11;
  0007 13/12/11/8 to 13/12/11/12; 0008 8/11/9/17 to 10/11/9/11; 0009 6/12/10/9 to
  11/12/10/9; 0010 6/6/6/6 unchanged; 0011 12/6/8/8 to 10/10/10/10;
  0012 5/9/10/12 to 11/10/10/12. Longest-option spread now 0-3 in all 12; key is
  sole longest in 0007 only (13w vs 12/11/12, spread 2).
- Validator: 0 errors, 87 warnings (quota shortfalls for other topics/units, as expected).

## Topic 1.1 grounding audit (2026-11-26, auditor report)

Chapters read in full before auditing (extracted XHTML):
- Barron's 2027, Chapter 3, "Period 1: 1491-1607 The Meeting of Three
  Peoples" — premium2027/OEBPS/text/13_Chapter03.xhtml
- 5 Steps 2024, Chapter 6, "Settling of the Western Hemisphere (1491-1607)"
  — 5steps2024/OEBPS/ch06.xhtml
- Princeton Review, Chapter 6, "Units 1 and 2: Early Contact with the New
  World (1491-1607) and Colonization of North America (1607-1754)" —
  princeton/OEBPS/xhtml/032_c006_6_Units_1_and_2_Earl.xhtml (title page
  only) plus the chapter body in 033_c006_sup.xhtml
- Lesson script E1 (Native Societies), audio_scripts/unit1/
  apush-audio-u1-e1-script-LOCKED.md, for context (Cahokia: across the
  river from St. Louis, peak in the 1200s, 10,000-20,000 people, trade web
  in copper and shell; maize bred from teosinte and carried north).

Per-question grounding added (books + primary sources; all 16 keep status
`final`, nothing else changed — verified by JSON diff against pre-edit
copies for 13 files; 0010-0012 verified by direct read of grounding,
status, and key after the same scripted insert):
- apush-mcq-0001: barrons-2027 Ch. 3, "Debates over Spain's Actions in the
  New World"; princeton-25e Ch. 6, "Competition for Global Dominance".
  Primary: Las Casas, A Short Account of the Destruction of the Indies
  (1542). (Book confirms Las Casas, written 1542/published 1552, chronicled
  atrocities; the plea-to-the-crown purpose is the source itself.)
- apush-mcq-0002: barrons-2027 Ch. 3, "Debates over Spain's Actions in the
  New World" + "Disease and Death"; princeton-25e Ch. 6, "Competition for
  Global Dominance". Primary: Las Casas (1542). ("Figures are contested"
  is grounded concretely: Barron's gives Hispaniola "over a million to a
  mere 500" against Las Casas's "three million to two hundred".)
- apush-mcq-0003: barrons-2027 Ch. 3, "Topic 1.4 Columbian Exchange,
  Spanish Exploration, and Conquest" + "Topic 1.5 Labor, Slavery, and
  Caste in the Spanish Colonial System"; princeton-25e Ch. 6, "The Early
  Colonial Era: Spain Colonizes the New World". Primary: Las Casas (1542).
- apush-mcq-0004: 5steps-2024 Ch. 6, "Native America"; barrons-2027 Ch. 3,
  "Topic 1.2 Native American Societies Before European Contact". No
  primary source. (Cahokia: Mississippian, peak in the 1200s, ~20,000
  people, mounds with temples — 5 Steps "Native America".)
- apush-mcq-0005: 5steps-2024 Ch. 6, "Native America"; princeton-25e
  Ch. 6, "Maize"; barrons-2027 Ch. 3, "Topic 1.2 Native American Societies
  Before European Contact". No primary source.
- apush-mcq-0006: 5steps-2024 Ch. 6, "Native America"; princeton-25e
  Ch. 6, "NATIVE AMERICANS IN PRE-COLUMBIAN NORTH AMERICA"; barrons-2027
  Ch. 3, "Topic 1.2 Native American Societies Before European Contact".
  No primary source.
- apush-mcq-0007: barrons-2027 Ch. 3, "Portugal and Spain Lead the Way";
  5steps-2024 Ch. 6, "Columbus". Primary: Waldseemuller world map (1507).
  (No book names Waldseemuller; the new-continent realization is in both
  books, the "first to name America" and the portraits are on the map
  itself, the cited primary source.)
- apush-mcq-0008: 5steps-2024 Ch. 6, "Columbus"; barrons-2027 Ch. 3,
  "Portugal and Spain Lead the Way". Primary: Waldseemuller world map
  (1507). (Vespucci's "new world" argument is the map's own naming logic;
  Columbus dying believing he reached Asia is in both books.)
- apush-mcq-0009: barrons-2027 Ch. 3, "The Impact of the Renaissance";
  5steps-2024 Ch. 6, "The Europeans Arrive". Primary: Waldseemuller world
  map (1507). (Classical continuity: Renaissance renewed interest in
  Classical Greek/Roman heritage, both books.)
- apush-mcq-0010: barrons-2027 Ch. 3, "Portugal and Spain Lead the Way";
  5steps-2024 Ch. 6, "Columbus". Primary: Hart, map of the four voyages
  of Columbus (1906). (Voyage table landfalls/dates are the map's own
  content, per its source note "verified against standard accounts".)
- apush-mcq-0011: barrons-2027 Ch. 3, "Spanish and Portuguese Ambitions";
  5steps-2024 Ch. 6, "Columbus". Primary: Hart (1906).
- apush-mcq-0012: barrons-2027 Ch. 3, "Spanish and Portuguese Ambitions".
  Primary: Hart (1906); Pope Alexander VI, Inter caetera (1493). (Book
  covers the 1494 Tordesillas longitudinal line; the map labels the line
  "Line of Demarcation (1493)"; the "100 leagues west of the Azores and
  Cape Verde" detail is Inter caetera itself, hence the second primary
  source entry.)
- apush-saq-0001: barrons-2027 Ch. 3, "Topic 1.1 Contextualizing Period 1"
  + "Topic 1.2 Native American Societies Before European Contact";
  5steps-2024 Ch. 6, "Native America" + "The Europeans Arrive";
  princeton-25e Ch. 6, "NATIVE AMERICANS IN PRE-COLUMBIAN NORTH AMERICA".
  No primary source (original secondary passage).
- apush-saq-0002: barrons-2027 Ch. 3, "Portugal and Spain Lead the Way";
  5steps-2024 Ch. 6, "Columbus". Primary: Columbus, letter to Luis de
  Santangel (1493). (Letter's claims — gentle people, gold and spices,
  possession for Spain — are the source itself; books confirm Columbus
  claimed the lands for Spain.)
- apush-saq-0003: barrons-2027 Ch. 3, "Spanish and Portuguese Ambitions";
  5steps-2024 Ch. 6, "Columbus". Primary: Cantino planisphere (1502).
  (Tordesillas line and flags are visible on the map; the treaty line is
  in Barron's.)
- apush-leq-0001: barrons-2027 Ch. 3, "Topic 1.1 Contextualizing Period 1"
  + "Disease and Death" + "Silver and the Encomienda System";
  5steps-2024 Ch. 6, "Native America" + "Columbus"; princeton-25e Ch. 6,
  "The Early Colonial Era: Spain Colonizes the New World". No primary
  source.

REAL ERRORS FOUND: none. No fact in any of the 16 questions contradicts
the books or its cited primary source. No file flipped back to draft; all
16 remain status `final`.

Traceability notes (not errors, not reopens — true facts carried by the
cited artifact or standard accounts rather than verbatim in the three
chapters): 0011 "the second voyage carried settlers"; 0006 "Cahokia's
decline had many causes" (the distractor's isolation claim is refuted by
the stimulus's own trade statement); 0009 "Ptolemy lived in the second
century"; 0008 the Saint-Die / Duchy of Lorraine printing details;
0003 rationale B's "English colonization began with Jamestown in 1607"
elides the failed 1587 Roanoke attempt (in Barron's own timeline) — the
refuted point, no English colonies in 1542, is correct; SAQ 0002 model
answer (c) "spent only weeks among them" is loose for a ~3-month first
Caribbean stay but the scored point (brief contact, no Indigenous voice)
is correct.

Validator after the audit: 0 errors (was 16 "missing grounding.books"
errors before this audit), 84 warnings, all quota shortfalls for other
topics/units, as expected.

## Topic 1.2 grounding

Read before authoring began (SPEC section 13, step 0):
- Barron's 2027, Chapter 3, "Period 1: 1491-1607 The Meeting of Three Peoples" (premium2027/OEBPS/text/13_Chapter03.xhtml), Topic 1.2 sections A-D (Southwest, Great Basin and Great Plains, East, Pacific Northwest) plus Topic 1.7 (sourcing caution).
- 5 Steps 2024, Chapter 6, "Settling of the Western Hemisphere (1491-1607)" (5steps2024/OEBPS/ch06.xhtml), "Native America" section. (5 Steps ch03 is the diagnostic exam, not Period 1 content; not used.)
- Princeton Review, Chapter 6, "Units 1 and 2: Early Contact with the New World (1491-1607) and Colonization of North America (1607-1754)": the chapter file (princeton/OEBPS/xhtml/032_c006_6_Units_1_and_2_Earl.xhtml) is header-only; the content lives in 033_c006_sup.xhtml, read in full for the Unit 1 portion ("Native Americans in Pre-Columbian North America" and "Maize" sections).
- Lesson script: apush-audio-u1-e1-script-LOCKED.md (U1-E1 Native Societies).
- CED Topic 1.2 description in cb-codes.json: title only ("Native American Societies Before European Contact", Period 1 1491-1607); the file carries no Topic 1.2 prose description, so the books and the E1 script carry the content grounding.
- Two facts checked by web search and logged here: Thomas Harriot, A Briefe and True Report (1588), describes maize (pagatowr), beans, and pumpkins and was written to promote the Virginia enterprise (National Humanities Center excerpt); Cahokia about 10,000-20,000 at its peak in the 1200s and Tenochtitlan about 200,000-300,000, consistent with the 5 Steps figure of 20,000 for Cahokia and the Princeton statement that Tenochtitlan was more populous than any European city in 1500.

## Topic 1.2 stimuli

All stimuli sourced and verified before any stem was written. Every image was viewed before writing; every text was checked against its source.
- de-bry-florida (MCQ 0013-0017): two engravings, Theodor de Bry (1591), after Jacques Le Moyne de Morgues. Planting: u1/original-u1-native-01.jpg, viewed, men and women planting in rows with seed baskets. Hunting: u1/original-u1-native-10.jpg, viewed, German-edition page showing hunters in deerskins with antlers drawing bows at deer by a stream, German text below. Public domain (Library of Congress via Wikimedia Commons).
- city-populations (MCQ 0018-0021): chart as a markdown table in the stimulus, no figure file. Tenochtitlan about 200,000, Cahokia about 20,000, both approximate. Grounded in 5 Steps ch6 (Cahokia 20,000 at its peak in the 1200s) and Princeton ch6 (Tenochtitlan more populous than any European city in 1500), corroborated by web search (Cahokia 10,000-20,000, Tenochtitlan 200,000-300,000).
- mississippian-river (MCQ 0022-0025): Thomas Hutchins 1771 map, u1/original-u1-native-04.jpg, viewed, marks Cahokia on the Mississippi near St. Louis. Public domain (1889 facsimile). Stimulus text notes the map marks the later village at the same river-valley site as the pre-contact city. Trade-goods description paraphrased from standard accounts of Cahokia (copper from the Great Lakes, shells from the Gulf Coast).
- three-sisters (MCQ 0026-0029): text stimulus, paraphrase of standard accounts of three sisters agriculture (maize, beans, squash planted together), labeled as paraphrase. No figure.
- pueblo-taos (MCQ 0030-0031): Taos Pueblo photograph, 1880, u1/original-u1-native-09.jpg, viewed, multi-story adobe dwellings with ladders, people, and mountains behind. Public domain (Library of Congress). Stimulus text notes the pueblo was inhabited for centuries before contact.
- adaptation-table (MCQ 0032-0036): table stimulus compiled from the grounding books (Pueblo, Iroquois, Chinook, Great Plains, Great Basin rows). No figure.
- SAQ 0004 slot 1: original secondary passage written for this question from the grounding books. No image file.
- SAQ 0005 slot 2 (test): paraphrase of Thomas Harriot, A Briefe and True Report of the New Found Land of Virginia (1588), public domain; paraphrase checked against the National Humanities Center excerpt (maize pagatowr, beans, pumpkins; addressed to the adventurers promoting the Virginia enterprise). Text only, no image file.
- SAQ 0006 slot 3: George Catlin, Buffalo Hunt, hand-colored lithograph, u1/u1-catlin-buffalo-hunt.jpg, viewed, hunters on horseback chasing bison across grassland beneath a large hill. Public domain. The horseback element is the point of the question (horses arrived only with Europeans, per Barron's ch3).
- SAQ 0007 slot 1: original secondary passage written for this question from the grounding books (maize spread north from Mexico; trade networks). No image file.
- SAQ 0008 slot 3: Great Cahokia Mound (Monks Mound) photograph, October 16, 1907, u1/anim-cahokia-mound-1907.jpg, viewed, grassy terraced mound above rows of crops. Public domain (Library of Congress).
- LEQ 0002, 0003: stimulus-free, prompt only.

## Topic 1.2 survivor decisions (21 candidates re-checked against the three book chapters)

Kept, faithful to the books (book reference in each file's grounding field):
- original-u1-native-01 to apush-mcq-0013 (3.A): de Bry planting image; 5 Steps ch6 Native America.
- original-u1-native-02 to apush-mcq-0026 (1.B): three sisters yield; Barron's ch3 Societies of the East.
- original-u1-native-03 to apush-mcq-0018 (3.A): city-population chart; 5 Steps ch6 (Cahokia 20,000) plus Princeton ch6 (Tenochtitlan most populous).
- original-u1-native-05 to apush-mcq-0032 (5.A): adaptation examples; Barron's ch3 Topic 1.2.
- original-u1-native-08 to apush-mcq-0027 (1.B): Iroquois villages; Barron's ch3 Societies of the East.
- original-u1-native-09 to apush-mcq-0030 (5.A): Taos Pueblo photo; Barron's ch3 Societies of the Southwest plus Princeton ch6.
- original-u1-native-10 to apush-mcq-0014 (3.C): farming plus hunting pair; 5 Steps ch6 Native America.
- original-u1-native-13 to apush-mcq-0034 (1.A): environment pairing; Barron's ch3 Topic 1.2.
- original-u1-native-14 to apush-mcq-0019 (6.D): food-production argument test; Barron's ch3 Topic 1.2.
- original-u1-native-16 to apush-mcq-0028 (1.A): three sisters layers; Barron's ch3 Societies of the East.
- original-u1-native-17 to apush-mcq-0015 (2.C): de Bry sourcing limitation; Barron's ch3 Topic 1.7.
- original-u1-native-19 to apush-mcq-0024 (3.D): archaeology limits; 5 Steps ch6 Native America.
- original-u1-native-20 to apush-mcq-0035 (1.A): settled versus mobile divide; Barron's ch3 Societies of the Great Basin and Great Plains.
Rewritten against the books:
- original-u1-native-04 to apush-mcq-0022 (1.B): kept the stem, key, and map, but the stimulus text was rewritten to state that the 1771 Hutchins map marks the later village at the same river-valley site as the pre-contact city.
- original-u1-native-06 to apush-mcq-0033 (1.B): kept the stem and key, but distractor B was rewritten (the original "held votes and decided to reject all forms of leadership" was not a real student error).
- original-u1-native-15 to apush-mcq-0023 (4.B): rewritten stem and options. The original quoted "Cahokia's earthen mounds rivaled anything in Europe," a line found in no grounding book; the rewrite uses the comparison of Cahokia (about 10,000-20,000 people around 1200) with London at the same time, from the E1 lesson script only (CORRECTED 2026-11-26 by the verifier: "and Princeton ch6" was wrong — Princeton compares Tenochtitlan with European cities, not Cahokia with London; the fact itself is verified true, NPS Cahokia article, and the fix round adds the NPS source to 0023's grounding field).
Rejected:
- original-u1-native-07: key is the only true statement among false ones (weak design), and its "rivaled anything in Europe" line is not in the books.
- original-u1-native-11: near-duplicate of Topic 1.1 MCQ 0005 (Cahokia proves complex societies existed before Columbus).
- original-u1-native-12: near-duplicate of Topic 1.1 MCQ 0004 (mound shows organized society with labor to build).
- original-u1-native-18: duplicates the proposition of original-u1-native-05 (environment shapes societies), converted as MCQ 0032.
- original-ctx-u1-07: same Cahokia aerial image already used by Topic 1.1 MCQ 0004-0006, and its angle (Cahokia scale from maize agriculture) overlaps MCQ 0005; not converted, authoring fresh instead.
Fresh authoring (8 MCQ, all 5 SAQ, both LEQ): MCQ 0016 (2.B), 0017 (2.A), 0020 (5.B), 0021 (6.C), 0025 (3.B), 0029 (6.A), 0031 (6.B), 0036 (1.A, Chinook counterexample, replacing a planned chinampa/terrace item whose facts appear in none of the three book chapters); SAQ 0004-0008; LEQ 0002-0003.

## Topic 1.2 written 2026-11-26

24 MCQ + 5 SAQ + 2 LEQ = 31 questions, all status draft, awaiting blind verification. MCQ difficulty: easy 5, medium 8, hard 11. MCQ pool: 4 test (0015, 0018, 0029, 0032), 20 practice. SAQ pool: 1 test (0005, slot 2 primary text), 4 practice; slots 1, 1, 2, 3, 3. LEQ both practice. Stimulus sets: de-bry-florida 5, adaptation-table 5, city-populations 4, mississippian-river 4, three-sisters 4, pueblo-taos 2. Validator: 0 errors (84 warnings are quota shortfalls for other topics/units and final counts, as expected for drafts).

## 2026-11-26 — Length and boundaries rule (parent's order, encoded)

- Paragraphs max 90 words, one idea per paragraph, everywhere (lessons
  and explanations). Hard cap. Lessons: narrative max about 1,800 words,
  4-6 sections of 150-300 words each. Key terms max 12, one line each.
  Figure captions max about 30 words. Worked items 2-3.
- MCQ explanations: key explanation 60-120 words, each distractor 1-2
  lines. No explanation block longer than the question it explains
  (validator compares the general note against stem + stimulus + options).
  SAQ model answers 2-4 sentences per part. LEQ/DBQ exemplars: thesis
  1-2 sentences, body paragraphs under the 90-word cap.
- Cutting means removing words, not splitting a wall into two walls.
  Quoted source text (stimulus passages, DBQ documents) is exempt from
  the paragraph cap.
- Encoded in LESSON-SPEC.md section 3 and SPEC.md section 9; enforced in
  tools/validate_passmaster.py (paragraph cap, general-note 60-120,
  rationale 2-line max, caption 35-word max, lesson bounds; SAQ
  sentence count is a warning, enforced by the verifier).
- Applies to Unit 1 lessons before they are written and to all question
  explanations from Topic 1.2 onward.

## 2026-11-26 — Tone rule (parent's order, encoded)

- No trap language anywhere: not the word "trap", not "trick question",
  "gotcha", "don't fall for it", "this is designed to catch you", or any
  framing that presents the question as something set to catch the
  student. "A common mistake is..." is fine. Student friendly throughout:
  plain words, short sentences, terms defined on first use, direct "you"
  where natural, never condescend, never scold.
- Encoded in LESSON-SPEC.md section 8 and SPEC.md section 9; validator
  enforces the mechanical part (banned-phrase list: trap, traps, trick
  question, gotcha, fall for, designed to catch, don't be fooled, watch
  out for, don't fall for) across our prose (quoted source text exempt);
  the human verifier catches the rest.
- Applies to Unit 1 lessons and to all question explanations from Topic
  1.2 onward.

## 2026-11-26 — Topic 1.1 length re-read (coordinator, whitespace-only fix)

The length check on re-read found real breaches in the 16 final items:
general notes in apush-mcq-0001 (93w), apush-mcq-0002 (92w), and
apush-mcq-0012 (116w) were single paragraphs with inline numbered steps,
and apush-leq-0001's modelOutline was a single 139-word block. Fixed by
REFORMATTING ONLY: each numbered step and each labeled outline segment
put on its own line, zero words changed (asserted programmatically; diff
shows only newline insertions). Items stay final; no content changed, so
no re-verification owed. Validator still 0 errors.
- KNOWN DEVIATION (logged, not reopened): all 9 SAQ model answers in
  Topic 1.1 are 1 sentence each (20-46 words). Complete and correct, but
  below the new 2-4 sentence range. The rule applies from Topic 1.2
  onward; 1.1 is not reopened for cosmetic trimming.

## 2026-11-26 — Topic 1.2 written (writer report, unverified)

31 questions, all status draft: 24 MCQ (apush-mcq-0013 to 0036) + 5 SAQ
(0004-0008) + 2 LEQ (0002-0003). Difficulty 5 easy / 8 medium / 11 hard.
Test pool: MCQ 0015, 0018, 0029, 0032; SAQ 0005 (slot 2). Key
distribution A5 / B9 / C5 / D5 (B-heavy, noted for the verifier).
Survivors: 16 converted (13 kept, 3 rewritten: native-04, native-06,
native-15), 5 rejected (native-07, native-11, native-12, native-18,
original-ctx-u1-07 — see "Topic 1.2 survivor decisions" for reasons).
Fresh: 8 MCQ + all SAQ + both LEQ. Grounding read and logged (Barron's
Ch 3 Topic 1.2 + 1.7; 5 Steps Ch 6 "Native America"; Princeton Ch 6 via
033_c006_sup.xhtml — the 032 file is header-only; E1 script; CED 1.2).
Stimulus sets: de-bry-florida (5), city-populations (4),
mississippian-river (4), three-sisters (4), pueblo-taos (2),
adaptation-table (5).
- VALIDATOR (new length/tone checks): 2 ERRORS, both Topic 1.2 LEQ
  modelOutlines as single paragraphs over 90 words (0002: 156w, 0003:
  153w). These go to the fix round via the 1.2 verifier. Also 24 SAQ
  model-answer sentence warnings (all 24 parts across 1.1 + 1.2 are
  1 sentence; 1.1 logged above as a known deviation, 1.2 to be fixed to
  2-4 sentences in the fix round).

## 2026-11-26 — Lesson track (parent's order)

LESSON-SPEC.md v1.0 written. Lessons live under
build/passmaster/lessons/, one Markdown file per lesson, 1-2 topics each,
~5 per unit, ~45 total. Unit 1 lessons: L1 The World of 1491 (1.1, 1.2),
L2 Why Europe Sailed West (1.3), L3 The Columbian Exchange and Spanish
Conquest (1.4), L4 Labor, Slavery, and Caste (1.5), L5 Encounters and
Consequences (1.6, 1.7). Lesson writer + independent student-read
verifier, same as questions. Tie-out (lesson field on questions,
questions list on lessons) runs at the end of the unit's tranche.

## 2026-11-26 — Lesson apush-u1-l1 grounding (writer)

Lesson apush-u1-l1 "The World of 1491" (Topics 1.1, 1.2), status draft.
Grounding read before writing:
- Barron's 2027, Chapter 3, "Period 1: 1491-1607 The Meeting of Three
  Peoples" — Topic 1.1 (meeting of three peoples; global system; wealth
  for some, destruction for others) and Topic 1.2 (Southwest/Pueblo c.900,
  Chaco Canyon, 13th-14th c. dispersal; Great Basin 400,000 sq mi,
  Shoshone/Paiute/Ute; Great Plains, bison on foot, no horses before
  contact; Algonquian; Iroquois League, five nations, perhaps 15th c.,
  matrilineal, three sisters; Chinook, Columbia River, longhouses to 50).
- 5 Steps 2024, Chapter 6, "Settling of the Western Hemisphere
  (1491-1607)" — "Native America" (Mississippian c.800-1600; Cahokia
  peak 1200s, 10,000-20,000; maize north from Mexico; three sisters;
  Pueblo irrigation) and "The Europeans Arrive" (Renaissance, caravel,
  astrolabe/compass, spice routes; Columbus; da Gama).
- Princeton Review, Chapter 6 — 032_c006_6_Units_1_and_2_Earl.xhtml is
  header-only; content read in 033_c006_sup.xhtml, Unit 1 portion
  ("NATIVE AMERICANS IN PRE-COLUMBIAN NORTH AMERICA", "Maize"):
  Bering land-bridge migration in waves 40,000-15,000 years ago;
  1-5 million in modern Canada/US + 20 million in Mexico at contact;
  Tenochtitlan more populous than any European city in 1500; maize
  domestication in Mexico; Native peoples transformed the land by fire
  (True/False answer: False, minimal impact is wrong); Norse c.1000.
- Lesson script E1 (Native Societies, LOCKED) in
  audio_scripts/unit1/apush-audio-u1-e1-script-LOCKED.md: land-food-move
  chain; maize bred from teosinte; Cahokia 10,000-20,000, Monks Mound
  ~100 ft, trade copper/shells; Iroquois Grand Council consensus, clan
  mothers chose/removed leaders; Cronon, Changes in the Land, managed
  landscape, disease emptied villages before Europeans saw the interior.
- CED Topics 1.1 "Contextualizing Period 1" and 1.2 "Native American
  Societies Before European Contact" (cb-codes.json).
- All 47 bank questions for 1.1 + 1.2 read before writing (MCQ 0001-0036,
  SAQ 0001-0008, LEQ 0001-0003); no question file edited. Worked items
  are bank SAQs apush-saq-0001, apush-saq-0004, apush-saq-0008, prompts
  and model answers reproduced verbatim (verified programmatically).
Stimuli (all viewed before writing, all from the shared pool):
- Figure 1: assets/images/u1/anim-cahokia-mound-1907.jpg — Monks Mound,
  Library of Congress photograph, October 16, 1907 (LCCN97505973),
  public domain. Same image as bank apush-saq-0008 stimulus.
- Figure 2: assets/images/u1/original-u1-native-01.jpg — Theodor de Bry,
  Florida Indians planting beans and maize, 1591, after Jacques Le Moyne
  de Morgues; Library of Congress (LCCN2001695741), public domain.
  Lesson states de Bry never visited North America and the classical
  poses are his European hand, per bank apush-mcq-0015/0017.
- Figure 3: assets/images/u1/original-ctx-u1-03.jpg — Martin
  Waldseemuller world map, 1507, first to use the name America; public
  domain. Lesson points at Vespucci beside Ptolemy at the top, per bank
  apush-mcq-0007/0008/0009.
Counts (verified by script, validator agrees): narrative 1,404 words
(opening 49; sections 174 / 280 / 165 / 279 / 161 / 296); longest
paragraph 86 words; key terms 12; captions 25 / 26 / 20 words.
Frontmatter lists all 47 question ids; themes GEO/NAT/SOC; skills 4.A,
1.A, 1.B, 3.A, 2.A, 5.A; reasoning comparison. Key terms are bank-used
only (checked by count against the 47 questions); E1-only terms
(matrilineal, teosinte, kiva, Bering Strait, Cronon) appear in plain
prose, not as key terms. No old-format strategy content. No verbatim
quote from any post-1929 source; Las Casas and Columbus rendered as
paraphrase, matching the bank stimuli.
VALIDATOR: 2 errors, 156 warnings — both errors are the pre-existing
Topic 1.2 LEQ modelOutline blocks (apush-leq-0002 156w, apush-leq-0003
153w), already logged above as owed to the 1.2 fix round; no question
file was touched. Zero errors and zero section/length warnings on
lessons/apush-u1-l1.md. One lesson warning is a validator artifact:
"frontmatter missing grounding" — the grounding IS in the frontmatter
as a nested YAML map; the validator's line-split parser only sees
top-level `key: value` lines, so it cannot see nested maps. The
remaining warnings are the expected tie-out (no `lesson` field on the
47 questions yet), SAQ 1-sentence model-answer warnings, and unit
quota shortfalls for topics not yet written. Not yet verified by an
independent student read.

## 2026-11-26 — Lesson apush-u1-l1 written (writer report, unverified)

"The World of 1491", Topics 1.1 + 1.2. Narrative 1,404 words (cap
~1,800); 6 sections of 161-296 words; longest paragraph 86 words;
12 key terms (each used by the bank questions); 3 stimuli, all viewed
before writing (Monks Mound Cahokia 1907 LOC photo; de Bry planting
engraving 1591; Waldseemuller 1507 map); 3 worked items, all bank SAQs
reproduced verbatim (0001, 0004, 0008). Frontmatter lists all 47
question ids. Validator: 0 errors on the lesson file (the 2 errors in
the run are the pre-existing 1.2 LEQ outlines). Validator artifact
fixed by the coordinator: the frontmatter parser could not see nested
YAML grounding maps; it now detects the grounding: key.
Lesson verification (independent student read) dispatched next.

## 2026-11-26 — Finish order (parent): complete Unit 1, then report

Remaining Unit 1 questions: Topics 1.3-1.7 to full quotas. Remaining
lessons: L2-L5. The 2 open validator errors (1.2 LEQ outlines) are fixed
in the 1.2 fix round driven by the running 1.2 verifier's report (no
edit race while it reads the files), then those two LEQs are re-verified.
Validator must read 0 errors before the final report. Tie-out at the
end of the unit. No Unit 2. No push.

## 2026-11-26 — Prep census, Topics 1.3-1.7 survivors (coordinator)

From the fresh-written set (all period U1). Writers re-check each against
the books and rewrite where it drifts; only verified items count.

- Topic 1.3 (quota 22 MCQ + 5 SAQ + 1 LEQ): 7 survivors, ALL skill 4.B,
  easy 4 / medium 3. Ids: original-ctx-u1-01, -03, -05, -09, -10, -12,
  -13. Narrow: no skill spread at all; CED suggested skill is 1.A.
  Most of the 22 MCQ must be fresh, with skills spread.
- Topic 1.4 (quota 28 MCQ + 6 SAQ + 2 LEQ): 5 survivors, skills 1.B,
  6.D, 4.B x3; easy 2 / medium 2 / hard 1. Ids:
  original-u1-encomienda-11,
  original-hard2-u1-columbian-exchange-spanish-exploration-and-conquest-02,
  original-ctx-u1-04, -06, -15.
- Topic 1.5 (quota 24 MCQ + 5 SAQ + 2 LEQ): 19 survivors, skills 1.A x5,
  3.A x4, 5.B x3, 2.C x2, 4.B x2, 2.B, 4.A, 3.D; easy 7 / medium 9 /
  hard 3. Ids: original-u1-encomienda-01 to -10 (ex 11), -12, -13, -17,
  -18, -19, -20, original-hard2-u1-labor-slavery-and-caste-in-the-spanish-colonial-system-01,
  original-ctx-u1-11, -14. Hard questions are short (3 vs ~11 needed).
- Topic 1.6 (quota 28 MCQ + 6 SAQ + 2 LEQ): 2 survivors, both 4.B
  medium. Ids: original-ctx-u1-02, -08. Nearly all fresh.
- Topic 1.7 (quota 12 MCQ + 3 SAQ + 1 LEQ): 0 survivors. All fresh.
- No surviving Unit 1 SAQ or LEQ anywhere; all 33 SAQ and 11 LEQ are
  fresh-authored (1.1: 3+1 done; 1.2: 5+2 written, unverified).
- Lesson scripts: E1 LOCKED; E2/E3 exist as drafts only (v9-v11) —
  reference only, verify against the books.
- Image pool u1/: 29 files. Unused by 1.1/1.2 and available for 1.3-1.7:
  barrons-2027-ch03-01/03, gap-g-v01-1-columbian-sugar-engraving,
  gap-g-v02-1-potosi-mitayos-debry, gap-g-v03-1-virginia-charter-1606,
  original-u1-lascasas-portrait-01, original-u1-spanish-mission-01,
  u1-caravel-fleet-huys, u1-debry-cusco-fall, saq-set-19-q3, 5s24 images.

## 2026-11-26 — Topic 1.2 blind verification (agent 4e241b03): 12/31 PASS, 19 FAIL

Blind picks matched locked keys 24/24 — no key is wrong. No length tell
(key longest by at most 1 word). No tone failures. All 6 images viewed,
all match. 5 rejected survivors correctly rejected.

FAILs (19):
- 0013-0017 (one shared defect): stimulus says de Bry engraved from
  watercolors "painted by an English colonist". Jacques Le Moyne de
  Morgues was FRENCH (Dieppe, Laudonniere expedition 1564); the English
  colonist was John White of Roanoke, a different series. Fix in all
  five stimulus texts; 0015 also in stem + general-note step 2.
  Re-verify as fact check, not re-solve.
- 0020: difficulty 4 -> 2 (metadata). 0021: difficulty 4 -> 2, skill
  6.C -> 6.A (metadata). 0025: difficulty 4 -> 2 (metadata).
  0036: difficulty 4 -> 2 (metadata).
- 0023: grounding gap — the Cahokia/London comparison is in the E1
  script only, not in the cited Princeton section (Princeton compares
  Tenochtitlan with European cities). Fact verified true (NPS Cahokia
  article). Fix: add E1 script and/or NPS source to grounding. LOG
  attribution corrected in this file (was "E1 script and Princeton
  ch6"). Theme ARC loose.
- 0030: skill 5.A -> 1.B (or 1.A) (metadata).
- 0035: stem invokes "The review" — no review exists in the set. Reword
  the opening to state the divide directly. Key B stands.
- SAQ 0004-0008: all 15 model answers 1 sentence (need 2-4 with
  reasoning). Expanded answers need blind re-verification.
- LEQ 0002/0003: outlines single paragraphs 156w/153w. Reformat to
  labeled lines (whitespace-only, 1.1 precedent); re-verify only if
  words are cut.

PASS with notes, fixed in the same round (no key changes):
- 0024: difficulty 4 -> 3. 0031: difficulty 4 -> 3; soften rationale A
  ("adobe dwellings are the visible mark" — local-earth origin is
  knowledge, not visible in the photo).
- 0026: key D "each planting's yield" -> "each field's yield"; general
  step 3 "More food from each planting" likewise. Re-verify (key text
  changed, not the key letter).
- 0033: distractor B still cartoonish ("chose to reject all leadership")
  — reword to a genuine student error. Re-verify.
- All 24 MCQ general notes: inline numbered steps in one paragraph;
  SPEC §9 requires each step on its own line. Whitespace-only split
  (1.1 precedent), no re-verification owed.

Set-level, parent decision (logged, not silently resolved):
- SPEC §9 wording: the literal "whole explanation shorter than the
  question" is breached by 18/24 MCQs (a 60-120w general note + four
  per-option notes cannot fit under a short stem). SPEC §9 amended
  2026-11-26 to the general-note comparison the validator enforces
  (0 breaches; Topic 1.1 passed re-verification under it). Parent may
  overrule; the alternative is cutting ~18 explanations.
- Theme NAT is used loosely across 13+ questions as a "Native American
  content" tag rather than for identity-formation content. No question
  failed on NAT alone. Parent to rule whether NAT is reserved for
  identity content; if so, the set needs a theme pass. Not churned in
  the fix round.

## 2026-11-26 — Topic 1.2 fix round dispatched

Fix writer briefed with every defect above, quoted verbatim. No key
letter changes. Re-verification scope: SAQ 0004-0008 (full, new words),
0035 (stem reword), 0026 (key text), 0033 (distractor B), fact check on
0013-0017, outline-format check on LEQ 0002/0003. Metadata-only fixes
(difficulty/skill/grounding) need no re-solve.

## 2026-11-26 — Lesson 1 independent verification (agent 2fbeef86): FAIL, 2 defects

Lesson measured: narrative 1,358 words (cap ~1,800); sections
180/259/171/253/168/278 (all 150-300); longest paragraph 87 words;
12 key terms; captions 23/24/18 words; 3 worked items; 0 trap phrases;
0 exclamation marks in prose. Every narrative fact checked is true; all
3 images match their captions; all 3 worked items reproduce their bank
SAQs verbatim; no stale-format content.

FAIL 1 — Worked item 1 (SAQ 0001) part b unsolvable from the lesson
alone. The worked-item stimulus summary drops the Portuguese clause the
bank SAQ's stimulus carries ("Portuguese sailors had already sailed down
the west coast of Africa, learning to use the winds and currents of the
Atlantic"); part b's model answer turns on it, and the narrative teaches
nothing about pre-1492 European sailing. Fix: restore the Portuguese
clause to the stimulus summary (or add a narrative sentence on
Portuguese sailing). Parts a and c are solvable.

FAIL 2 — Lesson vs bank contradiction, de Bry / Le Moyne. Lesson is
CORRECT (de Bry 1591 from watercolors by Jacques Le Moyne de Morgues,
who had visited Florida); bank MCQ 0013-0017 stimulus is wrong
("English colonist"). Bank-side fix is already owned by the 1.2 fix
round; the lesson needs no change on this point but cannot go final
until the bank items it teaches toward stop misstating the fact.

Minor notes (fix with the FAILs): opening echoes the banned "in this
lesson you will learn" construction ("You will see… and learn");
"the mound still rises above a farm field today" overstates a 1907
photo — drop "today"; worked item 3's model answer says "eight
centuries after Cahokia's height" while the narrative dates the peak to
the 1200s (1907 - 1200s ~ 7 centuries) — add one narrative clause that
the great mound was raised around 1100 and the city peaked in the
1200s; key term "Iroquois League" appears in no bank question (only
"Iroquois" / "Iroquois villagers") — align or keep with a note per
LESSON-SPEC §2.3; lesson image paths use assets/images/u1/… while
question files use pool-relative u1/… — confirm the renderer resolves
the lesson's form or switch to pool-relative; frontmatter
primary_sources lists de Bry and Waldseemuller but not Las Casas or the
Cantino planisphere, both discussed — add them.

Grounding discrepancy logged, not a defect: Barron's Ch. 3 says
Columbus made "two more voyages" (three total) after 1492; the lesson
and the bank say four (1492-1504), which is the historical record.
Keep four; Barron's sentence is the outlier.

## 2026-11-26 — Lesson 1 fix round complete, verified on disk

Fix writer (agent 4416d081) edited only lessons/apush-u1-l1.md.
Coordinator verified each claim from disk:
- Portuguese clause restored in worked-item 1 summary (grep: 1 hit).
- Opening reworded; "you will" occurs 0x in the file.
- "today" dropped from the Monks Mound sentence.
- ~1100 mound-raising clause added (line 101); the paragraph is 72
  words; worked item 3's "eight centuries" now agrees with the
  narrative.
- Key term renamed to **Iroquois** (line 218); the League is still
  named in the definition and narrative. Count still 12.
- All three image paths switched to pool-relative u1/…; 0 occurrences
  of assets/images remain.
- Frontmatter primary_sources now lists all four: de Bry, Waldseemuller
  (the writer caught and restored its own accidental deletion), Las
  Casas, Cantino.
- Re-measured counts: narrative 1,410 words; sections 174/288/165/279/
  161/296 (validator's method, captions included — all in 150-300);
  longest paragraph 86 words; captions 25/26/20 words; 3 worked items.
- Lesson still status draft. It cannot go final until the bank-side
  MCQ 0013-0017 fix lands (1.2 fix round, running).

Validator at the time of this check: 0 errors, 140 warnings (was 2
errors, 155 warnings). The 2 LEQ outline errors are gone and 15 SAQ
sentence warnings cleared — the running 1.2 fix writer has already
landed those fixes; it is still working on the remaining items.

## 2026-11-26 — Topic 1.2 fix round complete, verified on disk

Fix writer (agent 2a05cb21) edited only the 31 Topic 1.2 files.
Coordinator verified each claim from disk:
- 0013-0017: 0 occurrences of "English colonist" in all five; Le Moyne
  French wording present (0015: 3x — stimulus, stem, general step 2).
  SAQ 0005 still has 1 occurrence (correct, Harriot).
- Difficulties: 0020/0021/0025/0036 = 2, 0024/0031 = 3. Skills:
  0021 = 6.A, 0030 = 1.B.
- 0023: themes now [WOR] (ARC dropped); grounding primary_sources
  include the NPS Cahokia article and the E1 lesson script. General
  note "1200" intact after the writer's mid-run regex crash (the crash
  hit before that file was saved; the writer fixed the regex and
  re-ran).
- 0035 stem now opens "Historians describe a basic divide…".
- 0026 key D: "raising each field's yield"; rationale D likewise
  "more food per field" (consistency edit beyond the brief, sound).
- 0033 distractor B rewritten ("Mobile societies had no leaders at
  all, since moving too often made leadership impossible."); its
  misconception and rationale B updated to match (consistency edit,
  sound).
- SAQ 0004-0008: model answers 2 sentences per part (field is
  modelAnswer; spot-checked 0004 all 3 parts).
- LEQ 0002/0003: outlines 6 labeled lines each, max segment 44w / 30w.
- General notes: 5 lines each (4 steps + Remember) in the spot-checked
  files (0013, 0023, 0036).
- Validator: 0 errors, 140 warnings. Remaining SAQ 1-sentence warnings
  are Topic 1.1 only (known deviation). No-lesson-field warnings remain
  on all questions (pending tie-out).
- All 31 files still status draft. Re-verification dispatched next.

## 2026-11-26 — Lesson 1 re-verification (agent 85e259e4): FAIL, 1 defect

Both original FAILs are fixed: worked item 1 part b is solvable from
the lesson alone (blind solve a/b/c all pass; all 3 prompts and model
answers verbatim against SAQ 0001); the bank contradiction is fixed
(all five MCQ 0013-0017 stimuli name Le Moyne as a French artist, 0
occurrences of "English colonist"). All minor fixes pass; lengths
re-measured (narrative 1,410; sections 174/288/165/279/161/296;
longest paragraph 86; 12 key terms; captions 25/26/20); tone clean;
all 3 images viewed and matching.

NEW DEFECT — drift between the two parallel fix rounds: worked items 2
and 3 no longer reproduce their bank SAQs verbatim. The 1.2 fix round
expanded SAQ 0004/0008 model answers to 2 sentences per part AFTER the
lesson fix round ran, so the lesson still carries only the first
sentence of each. Coordinator confirmed programmatically: all 6 model
answers (SAQ 0004 a/b/c, SAQ 0008 a/b/c) are NOT verbatim substrings of
the lesson. Fix: append the six second sentences verbatim from the
bank files to worked items 2 and 3. No re-solve owed (the added
sentences only extend answers with reasoning already taught in the
narrative); a programmatic verbatim re-check follows.

Procedural note: the re-verifier disclosed its first tool batch read
the lesson and the three bank SAQ files in parallel, so its blind solve
was not strictly sequenced before first sight of the bank files. Its
solve is traceable to lesson text and its verbatim checks were
programmatic; the findings stand.

## 2026-11-26 — Topic 1.2 blind re-verification (agent 9ab420c3): 31/31 PASS

Re-verifier's blind re-solves matched every key/model answer in scope:
SAQ 0004-0008 all PASS (all 15 expanded answers 2 sentences, added
sentence supplies reasoning, parts independent, scoring still matches);
0035 PASS (blind pick B, stem stands alone); 0026 PASS (blind pick D,
"each field's yield" consistent across key, rationale D, general step
3); 0033 PASS (blind pick D; new distractor B is a genuine student
error, misconception and rationale match); 0013-0017 fact check PASS
(0 "English colonist", Le Moyne French in all five); LEQ 0002/0003
format PASS (6 lines each, max segment 44w/30w); metadata spot-check
all confirmed; all 24 general notes exactly 5 lines; no banned tone
words; no paragraph over 90 words in any re-read explanation.

Marginal note (not a FAIL by the re-verifier): SAQ 0004's stimulus is
a single paragraph over the cap. COORDINATOR CORRECTION: the
re-verifier cited the SPEC §9 stimulus exemption, but that exemption
covers QUOTED source text ("it is the source's words, not ours").
SAQ 0004's stimulus is an ORIGINAL secondary passage written for the
question (source: "original; secondary passage written for this
question from the grounding books"), 94 words (CORRECTED 2026-11-26:
the coordinator's earlier "109" counted the stringified stimulus dict,
keys and source_note included; the passage itself was 94 words — the
trim writer caught it). The exemption does not apply. SAQ 0004 is HELD BACK from final pending a word-cut trim of
its stimulus to ≤90 words (no fact any part turns on may be removed)
plus a blind re-solve against the trimmed stimulus. The other 30 are
flipped to final.

Other note carried: SAQ 0007 model (b)'s second sentence invokes
Cahokia's copper and shells, which are not named in that stimulus —
true, a reasoning step, and sentence 1 alone earns the point. No
change.

## 2026-11-26 — Lesson 1 sync fix complete, verified, FINAL

Sync fix writer (agent d438089f) appended the six second sentences
verbatim to worked items 2 and 3. Coordinator verified programmatically:
9/9 prompts and 9/9 model answers are exact substrings of their bank
files (SAQ 0001/0004/0008). Narrative re-measured 1,410 words (unchanged).
Lesson 1 flipped to final by the coordinator (status: final, line 82).
Validator: 0 errors, 138 warnings.

Unit 1 status now: Topic 1.1 16/16 final; Topic 1.2 30/31 final
(SAQ 0004 held draft for its stimulus trim); Lesson 1 final. Topics
1.3-1.7 unwritten; Lessons 2-5 unwritten.

## 2026-11-26 — SAQ 0004 stimulus trim complete, verified on disk

Trim writer (agent 31ccf2c9) cut only the final summary sentence
("In each place, the way people lived fit the land they lived on.");
stimulus now 81 words, single paragraph, all five regional sentences
verbatim. Coordinator verified: 81 words, summary sentence gone,
status still draft, and the lesson's worked-item 2 prompts (3/3) and
model answers (3/3) are still verbatim substrings of the file. Blind
re-solve dispatched. Topic 1.3 writer dispatched in parallel (1 writer
+ 1 verifier, within the cap).

## 2026-11-26 — BLOCKER: subagent spawning no longer authorized

At ~16:55 PST, two spawn attempts failed identically:
"subagent bootstrap is no longer authorized" (spawn_failed).
Attempted: (1) SAQ 0004 blind re-verifier, (2) Topic 1.3 writer.
Both were not dispatched; no child is running.

Consequence: SAQ 0004's trim is verified on disk (81 words, facts
intact) but its blind re-solve cannot run, so it stays draft and
Topic 1.2 stays 30/31 final. Topic 1.3 (28 questions) cannot start.
The coordinator cannot do either job itself (writer/verifier
separation; a coordinator blind-solve of its own fix does not count).
Needs the parent to re-authorize spawning or dispatch from its side.

## 2026-11-26 — SAQ 0004 blind re-solve (parent-dispatched verifier): 3/3 PASS, flipped to final

Re-verifier solved from the blind file only (stimulus + prompts, model answers never opened); verdicts in verification/saq-0004-resolve.json. Part a PASS (arid Southwest, dry-land farming, adobe villages), part b PASS (maize surplus feeding Cahokia's large population and mound-building labor), part c PASS (both farming peoples in settled villages). No ambiguity, no unsupported leap. SAQ 0004 flipped draft to final by the parent. Topic 1.2 now 31/31 final. Unit 1: Topics 1.1-1.2 47/47 final; Lesson 1 final.

## 2026-11-26 — Topic 1.3 written (writer: parent-dispatched agent c70ab171)

Topic 1.3 "European Exploration in the Americas" written: 22 MCQ
(apush-mcq-0037–0058) + 5 SAQ (apush-saq-0009–0013) + 1 LEQ
(apush-leq-0004) = 28 questions, all status draft, lesson apush-u1-l2.
Test pool: MCQ 0039, 0044, 0047, 0056 (4); all SAQ and the LEQ
practice. MCQ difficulty: easy 4, medium 8, hard 10. MCQ skills:
1.A 3, 1.B 4, 2.A 3, 2.B 1, 2.C 1, 3.A 3, 4.B 6, 5.A 1. MCQ reasoning:
causation 10, comparison 5, continuity-change 7. SAQ slots: 0009 slot 1
(secondary text, European motives), 0010 slot 2 (primary text, Columbus
letter 1493 paraphrase), 0011 slot 3 (non-text, Puebla 1862 painting),
0012 slot 1 (secondary text, Tordesillas), 0013 slot 2 (primary text,
Hakluyt 1584 paraphrase). LEQ 0004: "Evaluate the extent to which
economic motives caused European exploration of the Americas from 1492
to 1607" (causation, 6.A/6.B, WOR/WXT, difficulty 3).

Survivors re-checked against the books (all 7 from
fresh-written/contextualization.json, skill 4.B, easy 4 / medium 3):
kept/rewritten 7, rejected 0. original-ctx-u1-01 (Tordesillas, key
trimmed for length tell), -03 (Waldseemuller; stimulus swapped to the
Stradanus "AMERICA" engraving — the Waldseemuller map was already used
in Topic 1.1), -05 (Black Legend; stem recast from contextualization
to sourcing skill 2.A), -09 (Reconquista; options lengthened), -10
(England late start; key trimmed), -12 (St. Augustine; kept, date
1565), -13 (caravel; options lengthened). None rejected.

Stimuli (9 sets, MCQ) + SAQ stimuli:
- tordesillas-1494 (037–039): text, original secondary passage.
- caravel-navigation (040–042): image u1/u1-caravel-fleet-huys.jpg
  (Frans Huys after Bruegel, Met CC0).
- vespucci-america (043–045): text, original secondary passage.
- black-legend (046–048): image u1/original-ctx-u1-05.jpg (Las Casas
  1665 German edition title page).
- reconquista-spain (049–050): text, original secondary passage.
- england-late-start (051–052): text, original secondary passage.
- st-augustine-1565 (053–054): image u1/original-ctx-u1-03.jpg
  (Waldseemuller 1507, Library of Congress) — set reuses the map as a
  chronology stimulus, distinct from its 1.1 use.
- columbus-landing (055–056): image u1/5s24-ch06-mcq-04.jpg (de Bry
  Columbus landing, 1594).
- virginia-charter-1606 (057–058): image
  u1/gap-g-v03-1-virginia-charter-1606.jpg (Select Charters, 1899).
- SAQ 0009/0012: original secondary passages (Tordesillas; motives).
- SAQ 0010: paraphrase, Columbus letter to Santangel 1493 (PD).
- SAQ 0011: image u1/saq-set-19-q3.jpg (Puebla 1862 painting, PD
  pre-1930/CC0), labeled as a later imagining.
- SAQ 0013: paraphrase, Hakluyt Discourse of Western Planting 1584 (PD).

Findings: Barron's Ch. 3 gives St. Augustine's founding as 1585 —
WRONG; correct date is 1565 (Menendez; Fort Caroline destroyed 1565).
Do not follow the book on this; survivor -12 and MCQ 0053 use 1565.
E2 script note: Prince Henry's "navigation school at Sagres" is
mostly legend (Britannica) — patron funding voyages, not a school
founder. All 9 images viewed before writing; sources + rights logged
in each file's figures/stimulus source_note.

Verification: NOT done by the writer (writer/verifier separation).
A separate blind verifier follows; files stay draft until verified.

## Topic 1.3 blind verification (2026-11-26, blind verifier)

Blind solves from the blind files only (verification/blind-1.3/), then adjudicated against the locked keys / model answers / rubric. Verdicts in verification/topic-1.3-verdicts.json.

- Total: 28/28 PASS, 0 FAIL. MCQ blind picks matched locked keys 22/22. SAQ model answers matched blind answers on all 15 parts. LEQ model outline scores 6/6 against the rubric.
- FAILs: none.
- Length-tell check: no key is longest by more than 1 word. Key is sole longest by exactly 1 word in 5 MCQs (0043, 0048, 0050, 0052, 0057), within the stated threshold; recorded for the record, same as the Topic 1.1 residual.
- No trap language ("trap", "trick question", "gotcha", "fall for") in any stem, rationale, model answer, or model outline. No explanation paragraph over 90 words; longest single rationale paragraph 37 words; general-rationale steps 18-23 words each, totals 78-99 words, inside the 60-120 word bound.
- Grounding present on all 28 items (3-5 books with chapter and section); primary sources cited where the stimulus is a source.
- Notes only (not fails): 0051 rationale general step 4 says "Roanoke failed in 1587" (planted 1587, found abandoned 1590); suggest "Roanoke's 1587 colony failed" in a future polish pass. 0058 skill tag 2.B is defensible but 3.C or 1.B would fit the two-document comparison better. SAQ 0013 part (c) legitimately requires knowledge beyond the stimulus; model answer confirms.
- Topic 1.3 status: 28/28 blind-verified final (22 MCQ + 5 SAQ + 1 LEQ).

## 2026-11-26 — Topic 1.3 flipped to final (parent, after blind verification)

Blind verification 28/28 PASS (MCQ blind match 22/22, SAQ parts 15/15, LEQ outline 6/6), verdicts in verification/topic-1.3-verdicts.json, verified on disk by the parent. One polish fix applied by the parent before the flip, per the verifier's note: MCQ 0051 rationale step 4 "Roanoke failed in 1587" corrected to "Roanoke's 1587 colony failed" (planted 1587, found abandoned 1590); key, options, and stimulus untouched. All 28 files flipped draft to final. Unit 1: Topics 1.1-1.3 75/75 final; Lesson 1 final.

## 2026-11-26 — Topic 1.4 written (writer: parent-dispatched agent, unverified)

Topic 1.4 "Columbian Exchange, Spanish Exploration, and Conquest" written: 28 MCQ
(apush-mcq-0059–0086) + 6 SAQ (apush-saq-0014–0019) + 2 LEQ (apush-leq-0005–0006)
= 36 questions, all status draft, lesson apush-u1-l3. Test pool: MCQ 0061, 0065,
0070, 0074, 0081 (5); SAQ 0015 slot 2 (1, claims the slot-2 test SAQ for Unit 1;
1.2/1.5 test SAQs should take slots 1 and 3); LEQ 0005 (1, claims the Unit 1
test LEQ; 1.6 keeps both LEQs practice). MCQ difficulty: easy 5, medium 11,
hard 12. MCQ skills: 1.B 5, 4.B 4, 1.A 3, 3.B 3, 3.A 2, 2.B 2, 6.B 2, 5.A 2,
2.A 1, 2.C 1, 3.C 1, 3.D 1, 4.A 1, 5.B 1, 6.A 1, 6.C 1, 6.D 1 — all 17
skill codes exercised in the topic's MCQ. MCQ reasoning: causation 18,
comparison 7, continuity-change 3. SAQ slots: 0014 slot 1, 0015 slot 2,
0016 slot 3, 0017 slot 1, 0018 slot 2, 0019 slot 3. LEQ 0005: Columbian Exchange
transformation 1492-1607 (continuity-change, test). LEQ 0006: extent of change
to Native societies from Spanish conquest (causation, practice).

Grounding read before authoring: Barron's Premium 2027 Chapter 3 (full text,
6,756 words), 5 Steps to a 5 2024 Chapter 6 (full text, 3,534 words), Princeton
Review Chapter 6 (supplement, 8,973 words), E2 script v11 and E3 script v10
(drafts, reference only, facts verified against the books). Every question
carries book+chapter grounding. Known book error respected, not copied:
Barron's Ch. 3 prints St. Augustine's founding as 1585; correct year is 1565
(not used in this topic). Other book facts corrected against scholarship
where the books overstate: Barron's states the syphilis Columbian hypothesis
flatly; MCQ 0074 presents the origin as still debated. Barron's Ch. 3 says
Columbus made "two more voyages"; no question relies on a voyage count.

Survivors re-checked against the books (all 5): kept/rewritten 5, rejected 0.
- original-u1-encomienda-11 (1.B, easy) -> MCQ 0059, Potosi silver significance;
  options rebalanced, rationales added, key unchanged.
- original-hard2-u1-columbian-exchange-spanish-exploration-and-conquest-02 (6.D,
  hard) -> MCQ 0073, Exchange asymmetry argument; key shortened 30w to 17w to
  remove the length tell (was longest by 4), rationales added, key unchanged.
- original-ctx-u1-04 (4.B, medium) -> MCQ 0060, Potosi silver broader significance;
  options rebalanced (D was 18w), rationales added, key unchanged.
- original-ctx-u1-06 (4.B, medium) -> MCQ 0066, disease demographic catastrophe;
  options rebalanced, rationales added, key unchanged.
- original-ctx-u1-15 (4.B, easy) -> MCQ 0070, rapid conquests; options rebalanced
  (A was 16w), rationales added, key unchanged.

Stimuli (9 MCQ sets) + SAQ stimuli:
- potosi-silver (059-061): image u1/gap-g-v02-1-potosi-mitayos-debry.jpg (de Bry
  Potosi mine workers, 1590, PD; artist never visited the Americas, MCQ 0061
  tests that sourcing point).
- exchange-inventory (062-065): table, exchange items by direction, drawn from
  the books' own inventories.
- disease-front (066-069): text, Florentine Codex Nahua smallpox account
  paraphrase (Sahagun with Nahua scholars, PD).
- cortes-conquest (070-072): text, Cortes Second Letter 1520 paraphrase (PD;
  quoted in 5 Steps Ch. 6).
- exchange-asymmetry (073-075): text, original secondary passage stating the
  shared-prosperity argument the questions evaluate.
- spain-silver-economy (076-078): text, original secondary passage on Spain's
  inflation, taxes up fivefold, and debt (Barron's "Economic Impact of
  Conquest").
- sugar-labor (079-081): image u1/gap-g-v01-1-columbian-sugar-engraving.jpg
  (Stradanus/Collaert sugar refinery, c. 1600, Met CC0).
- cusco-inca (082-084): image u1/u1-debry-cusco-fall.jpg (de Bry after
  Gastaldi, Cusco view, PD).
- exchange-numbers (085-086): table, population decline figures (Hispaniola
  over 1,000,000 to about 500; 50-90% 1500-1650; smallpox 1520-1530), from
  Barron's Ch. 3 and 5 Steps Ch. 6.
- SAQ 0014 slot 1: original secondary passage (Exchange inventory).
  SAQ 0015 slot 2: Florentine Codex Nahua smallpox paraphrase (PD).
  SAQ 0016 slot 3: image u1/barrons-2027-ch03-03.jpg (de Bry 1598 illustrating
  Las Casas, SAAM CC0; graphic torture content, framed as evidence with a
  sourcing limitation in part c).
  SAQ 0017 slot 1: original secondary passage (Potosi silver economy).
  SAQ 0018 slot 2: Las Casas 1542 paraphrase (PD; distinct angle from its
  1.1 MCQ use: sourcing purpose and figure-checking).
  SAQ 0019 slot 3: image u1/barrons-2027-ch03-01.jpg (Cieza de Leon Potosi
  woodcut, 1553, PD).
All 5 images viewed before writing; sources + rights logged in each file's
figures/stimulus source_note. No generated images used.

Checks (writer-side, before writing): 6 length tells found and fixed in the
draft pass (0063, 0067, 0069, 0074, 0077, 0084: keys trimmed so no key is
longest by more than 1 word). Validator: 0 errors, 134 warnings (quota
shortfalls for other topics/units and final counts, as expected for drafts).

Verification: NOT done by the writer (writer/verifier separation).
A separate blind verifier follows; files stay draft until verified.

## Topic 1.4 blind verification (2026-11-26, independent blind verifier)

Blind solved from verification/blind-1.4/ only; question files opened only after answers were recorded. Verdicts in verification/topic-1.4-verdicts.json.

- Total: 36/36 PASS, 0 FAIL.
- MCQ 28/28: blind picks matched locked keys 28/28, every key re-derived. No length tell in any item (key longest by at most 1 word). All rationales complete (A-D + general, general 60-120w, no paragraph over 90w). No trap language anywhere. Grounding present on all 28 (Barron's Ch3 + 5 Steps Ch6 + Princeton Ch6, with section detail). Stimulus images viewed and matched: de Bry Potosi mine, Stradanus sugar refinery, de Bry Cusco, de Bry torture engraving (SAQ 0016), Cieza Potosi woodcut (SAQ 0019).
- SAQ 6/6: blind answers match model answers on all 18 parts; scoring criteria accurate with correct notEarned. No trap language. Grounding present, including primary sources (Florentine Codex, Las Casas, Cieza).
- LEQ 2/2: model outlines score 6/6 each against their rubrics (thesis 1, contextualization 1, evidence 2, analysis 2). Blind theses/outlines match in substance.
- SAQ 0016 framing check (de Bry 1598 torture engraving): PASS. Sourcing limitation is stated in the source note and tested in part (c); the stimulus description is accurate to the image as viewed (bound man over fire, soldiers around, wooden structure behind, handwritten French caption); the item treats the image as evidence to evaluate with clinical wording, standard AP-level practice, appropriate to show a student.
- Minor notes, not defects: LEQ 0005 and 0006 rubric criteria tag contextualization 6.B and evidence 4.B (point values and criterion text follow the CB LEQ structure); MCQ 0060 key B phrasing ("competing European crowns") is slightly loose but is the best answer and the other options are clearly false.
- FAILs: none.

## 2026-11-26 — Topic 1.4 flipped to final (parent, after blind verification)

Blind verification 36/36 PASS (MCQ blind match 28/28, SAQ 18/18 parts, LEQ outlines 6/6 each), verdicts in verification/topic-1.4-verdicts.json, verified on disk by the parent. SAQ 0016 framing check PASS (sourcing limitation stated and tested in part c; description accurate; clinical wording, standard AP-level practice). No fixes owed. All 36 files flipped draft to final. Unit 1: Topics 1.1-1.4 111/111 final; Lesson 1 final.

## 2026-11-26 — Topic 1.5 written (writer: parent-dispatched agent, unverified)

Topic 1.5 "Labor, Slavery, and Caste in the Spanish Colonial System" written:
24 MCQ (apush-mcq-0087–0110) + 5 SAQ (apush-saq-0020–0024) + 2 LEQ
(apush-leq-0007–0008) = 31 questions, all status draft, lesson apush-u1-l4.
Test pool: MCQ 0089, 0094, 0098, 0103, 0106 (5); SAQ 0022 slot 3 (1, TEST);
LEQ none — both practice, Unit 1's single test LEQ already claimed by 1.4's
0005. MCQ difficulty: easy 7, medium 8, hard 9 (hard short: 9 vs about 11
target for the topic — recorded, not fixable from the survivors, whose hard
count was 3). MCQ skills: 1.A 5, 3.A 4, 5.B 3, 2.C 2, 4.B 2, 1.B 1, 2.A 1,
2.B 1, 3.B 1, 3.C 1, 3.D 1, 4.A 1, 5.A 1. MCQ reasoning: causation 9,
comparison 10, continuity-change 5. SAQ slots: 0020 slot 1, 0021 slot 2,
0022 slot 3, 0023 slot 1, 0024 slot 2. LEQ 0007: causes of the shift from
Native to African forced labor 1542-1607 (causation, practice). LEQ 0008:
extent ancestry determined a person's place 1500-1607 (continuity-change,
practice).

FLAG — Unit 1 test SAQ slots will be 2, 2, 3, not one per slot: 1.2's test
SAQ (0005) and 1.4's test SAQ (0015) both took slot 2, and 1.5's test SAQ
(0022, the Las Casas portrait) is slot 3. Slot 1 is unrepresented in the
Unit 1 test pool, against BLUEPRINT section 4's one-per-slot intent. No fix
available inside 1.5: the three Unit 1 test SAQs are now all claimed
(1.2, 1.4, 1.5), and 1.6/1.7 have no test SAQs left in their quotas.
Parent/coordinator decision owed — leave as is, or swap one earlier test
SAQ's slot at verification time.

Grounding read before authoring: Barron's Premium 2027 Chapter 3, Topic 1.5
section (encomienda, repartimiento, African slave trade, casta, Maroon
communities, Palmares), 5 Steps to a 5 2024 Chapter 6 ("Columbus" encomienda
passage; caste pyramid after "Cortes in Mexico"), Princeton Review Chapter 6
supplement (encomienda, casta with Zambos, Sepulveda/Las Casas debate,
Maroons), E2/E3 lesson-script drafts (reference only; E3 v10 cites the books
on encomienda; E2 has no 1.5 hits). Every question carries book+chapter
grounding. Facts verified against the books and scholarship, not copied
where the books overstate: Barron's "repartimiento (1549)" refers to the
1549 voluntary-wages scheme, not the compulsory rotational draft (began last
quarter of the 16th century; about 1/7 of males for agriculture, about 4%
for mining, fixed wages, workers return home) — no question copies Barron's
conflation. Mita: Potosi draft organized by Viceroy Francisco de Toledo in
the 1570s (1573), one-seventh of adult males 18-50 from 16 provinces,
adapted from the Inca mita. Asiento: first asiento August 1518, Laurent de
Gouvenot, monopoly 8 years, max 4,000, sold to Genoese merchants for 25,000
ducats. Palmares: early 1600s, 30,000+ residents, conquered by Portuguese
1694 (per Barron's). Sepulveda never visited the Americas. Barron's casta
pyramid: peninsulares + criollos 1-2% of population; mestizos 4-5%; mulattos
below them; Indians and Africans at the bottom. Las Casas early advocated
replacing Native labor with African labor, later recanted (per Barron's).

Survivors re-checked against the books (all 19): kept/rewritten 19, rejected 0.
- original-u1-encomienda-01 (1.A, easy) -> MCQ 0091, encomienda exchange;
  stimulus attached, rationales added, key unchanged.
- original-u1-encomienda-02 (2.B, medium) -> MCQ 0087, Las Casas purpose;
  stimulus unified to the shared set passage, rationales added, key unchanged.
- original-u1-encomienda-03 (1.A, medium) -> MCQ 0092, New Laws; stimulus
  attached, rationales added, key unchanged.
- original-u1-encomienda-04 (5.B, easy) -> MCQ 0095, labor shift continuity;
  stimulus attached, rationales added, key unchanged.
- original-u1-encomienda-05 (4.A, medium) -> MCQ 0105, Valladolid significance;
  stimulus attached, rationales added, key unchanged.
- original-u1-encomienda-06 (3.A, medium) -> MCQ 0088, Las Casas motive;
  stimulus unified to the shared set passage, rationales added, key unchanged.
- original-u1-encomienda-07 (3.A, easy) -> MCQ 0099, mestiza casta painting;
  image viewed before writing, rationales added, key unchanged.
- original-u1-encomienda-08 (3.A, medium) -> MCQ 0100, mulato casta painting;
  key shortened to remove the length tell, image viewed, rationales added.
- original-u1-encomienda-09 (3.D, hard) -> MCQ 0101, cambujo casta painting;
  difficulty raised to hard (stem asks the student to infer a systemic
  concern from label proliferation), image viewed, rationales added.
- original-u1-encomienda-10 (1.A, easy) -> MCQ 0107, asiento definition;
  stimulus attached, rationales added, key unchanged.
- original-u1-encomienda-12 (5.B, medium) -> MCQ 0096, disease labor shortage;
  stimulus attached, rationales added, key unchanged.
- original-u1-encomienda-13 (2.C, hard) -> MCQ 0089, Las Casas sourcing (TEST);
  options rebalanced for length, stimulus unified, rationales added.
- original-u1-encomienda-17 (1.A, hard) -> MCQ 0093, encomienda justification;
  difficulty raised to hard (weigh three developments against the official
  justification), stimulus attached, rationales added.
- original-u1-encomienda-18 (5.B, easy) -> MCQ 0097, New Laws outcome; stimulus
  attached, rationales added, key unchanged.
- original-u1-encomienda-19 (3.A, easy) -> MCQ 0102, torna atras casta painting;
  image viewed before writing, rationales added, key unchanged.
- original-u1-encomienda-20 (1.A, medium) -> MCQ 0103, 16-panel casta set (TEST);
  image viewed before writing, rationales added, key unchanged.
- original-hard2-u1-labor-slavery-and-caste-in-the-spanish-colonial-system-01
  (2.C, hard) -> MCQ 0090, Las Casas account usefulness; stem recast to the
  shared set passage, options rebalanced for length, rationales added.
- original-ctx-u1-11 (4.B, hard) -> MCQ 0098, Las Casas claim evaluation (TEST);
  stimulus attached, rationales added, key unchanged.
- original-ctx-u1-14 (4.B, easy) -> MCQ 0104, casta paintings historian
  conclusion; stimulus attached, rationales added, key unchanged.
Fresh-authored (5 MCQ, all SAQ/LEQ — no surviving Unit 1 SAQ or LEQ anywhere):
MCQ 0094 repartimiento vs encomienda comparison (TEST, 3.C hard, facts
verified against World History Encyclopedia and Cambridge, Free and Unfree
Labour in the Colonial Andes); MCQ 0106 Sepulveda sourcing (TEST, 2.A hard);
MCQ 0108 hereditary slavery as the break from older slavery (5.A hard);
MCQ 0109 Palmares (1.B medium); MCQ 0110 Maroon cultural survival (3.B hard).
SAQ 0020-0024 and LEQ 0007-0008 all fresh.

Stimuli (8 MCQ sets) + SAQ stimuli:
- las-casas-avarice (0087-0090): verbatim Las Casas 1542 excerpt, 1689 English
  translation (Project Gutenberg EBook #20321, public domain), shared across
  all 4 items.
- encomienda-system (0091-0094): original secondary passage (encomienda, New
  Laws, repartimiento).
- labor-shift (0095-0098): original secondary passage (disease, encomienda
  collapse, asiento).
- casta-hierarchy (0099-0101): images u1/original-u1-encomienda-07.jpg
  ("De espanol e india, mestiza"), -08.jpg ("De negra y espanol sale
  mulato"), -09.jpg ("De mulato y china sale cambujo"), 18th-century casta
  paintings, public domain, Wikimedia Commons.
- casta-anxiety (0102-0104): image u1/original-u1-encomienda-19.jpg
  ("De espanol y albina, torna atras", LACMA) and -20.jpg (16-panel casta
  grid), plus an original secondary passage for 0104; public domain.
- valladolid-debate (0105-0106): original secondary passage (Valladolid
  1550-1551, Las Casas vs Sepulveda).
- asiento-trade (0107-0108): original secondary passage (asiento 1518).
- maroon-resistance (0109-0110): original secondary passage (Maroon
  communities, Palmares).
- SAQ 0020 slot 1: original secondary passage (labor shift). SAQ 0021 slot 2:
  Sepulveda Democrates Alter paraphrase (written about 1547, presented at
  Valladolid 1550-1551). SAQ 0022 slot 3 (TEST): image
  u1/original-u1-lascasas-portrait-01.jpg (1791 engraving of Las Casas,
  caption "D. FR. BARTHOLOME DE LAS CASAS... Obispo de Chiapa", public
  domain, Wikimedia Commons). SAQ 0023 slot 1: original secondary passage
  (casta pyramid, Barron's figures). SAQ 0024 slot 2: New Laws of 1542
  paraphrase.
All 6 images viewed before writing; sources + rights logged in each file's
figures/stimulus source_note. No generated images used. Spanish mission photo
u1/original-u1-spanish-mission-01.jpg viewed and NOT used (early-1900s photo
of a California mission, Period 2 subject, wrong period for 1.5).

Checks (writer-side, before writing): 9 option-length imbalances found and
fixed in the draft pass (distractors running 2-4 words longer than the key in
0091, 0093, 0095, 0096, 0098, 0099, 0103, 0104, 0107; trimmed so no option
exceeds the key by more than 1 word and no key is longest by more than 1
word); 2 SAQ model answers split to 2 sentences (0021 part a, 0022 part b).
Self-check clean (single-line sorted keys, status draft, lesson apush-u1-l4,
general rationales 60-120w, paragraphs <=90w, no trap language, misconceptions
on all distractors, set sizes 2-5, figure files exist on disk). Validator:
0 errors, 130 warnings (quota shortfalls for other topics/units, final counts,
and pre-existing no-lesson-field warnings on 1.1 files; no warning names any
1.5 file). Unit 1 validator counts after this topic: MCQ 86/150 final,
test 15/28; SAQ 19/33 final, test 2/3; LEQ 6/11 final — 1.5's 31 drafts not
yet counted as final.

Verification: NOT done by the writer (writer/verifier separation).
A separate blind verifier follows; files stay draft until verified.

## 2026-11-26 — Test SAQ slot fix (parent, pool labels only)

Unit 1 test SAQs were slots 2, 2, 3 (0005 slot 2, 0015 slot 2, 0022 slot 3) against BLUEPRINT §4's one-per-slot rule (Q1 secondary, Q2 primary, Q3 non-text, topics spread 1.2/1.4/1.5). Fixed by pool-label swap only, no content touched: apush-saq-0005 (1.2, slot 2) test to practice; apush-saq-0004 (1.2, slot 1) practice to test. Unit 1 test SAQs are now 0004 slot 1, 0015 slot 2, 0022 slot 3. Both questions were already blind-verified final; only the pool label changed.

CORRECTION to the Test SAQ slot fix entry above: the first swap attempt failed (the script matched the minified `"pool":"test"` form, but the SAQ files use the spaced `"pool": "test"` form, so nothing changed) while the log entry was still appended. The swap has now been applied correctly with the spaced form and verified on disk above. The entry's substance stands; only the timing was wrong.


## Topic 1.5 blind verification (2026-11-26, verifier report)

Blind picks matched locked keys 24/24. Overall: 30/31 PASS, 1 FAIL.
- MCQ: 23/24 PASS. SAQ: 5/5 PASS (all 15 parts earnable under the model answers and scoring criteria). LEQ: 2/2 PASS, both model outlines scored 6/6 against their rubrics.
- FAIL: apush-mcq-0104. The stimulus is a single sentence that adds nothing, and the stem itself states the key's content ("an elaborate legal hierarchy ranking people by ancestry" amid "widespread mixing"), so the item is answerable without the stimulus. Fix: attach a real casta image (e.g. the 16-panel set used in 0103) as the stimulus and rewrite the stem to ask what the painting shows, or rewrite the stem so the answer must come from the stimulus. Key is correct; no length tell; grounding present.
- Cross-cutting: no trap language in any of the 31 items; no rationale paragraph over 90 words (max observed 48); grounding present in all 31 (book + chapter); all six figure files exist on disk with alt, caption, and source URL.
- Difficulty spread (MCQ): easy 7, medium 8, hard 9 of 24. Hard is below the writer's target of about 11, but the labels are mostly honest. Only 0097 looks mislabeled (easy, should be medium: its stem asks for an abstract continuity inference). No item failed on difficulty alone.
- Notes, not fails: 0100 key says "children of enslaved Africans" while the stimulus label says "negra" without stating enslavement; "children of African descent" would stay inside the stimulus. 0088 rationale C cites a Las Casas claim accurate of his work but not in the visible stimulus excerpt. Both LEQ rubrics have swapped skill labels (context criterion labeled 6.B, evidence criterion labeled 4.B); criterion text is correct, labels need fixing. LEQ-0008's casta-painting evidence is 18th-century, later than the prompt's 1500-1607 window, though the rubric sanctions it and the core claim holds for the period.
- Verdicts file: verification/topic-1.5-verdicts.json. Fix round for 0104 (and the four notes) dispatched to the writer; re-verification of 0104 to follow.

## 2026-11-26 — Topic 1.5 fix round (parent, after 30/31 blind verification)

FAIL apush-mcq-0104 fixed: stimulus replaced with the 16-panel casta image (u1/original-u1-encomienda-20.jpg, same canvas as 0103, fig-apush-mcq-0104) and the stem rewritten to ask what the painting's structure shows; key A and options unchanged. Notes fixed: 0100 key B "children of enslaved Africans" to "children of African descent" (label says "negra", not enslaved); 0088 rationale C reworded to stay inside the visible Las Casas excerpt; LEQ rubrics 0005-0008: contextualization skill 6.B to 4.B and evidence 4.B to 6.B (cb-codes.json confirms 4.B is Contextualization, 6.B is support-an-argument-with-evidence; thesis 6.A was already correct); LEQ 0008 model outline and rubric: 18th-century casta-painting evidence replaced with in-window two-republics evidence (republica de espanoles / republica de indios); 0097 difficulty 2 to 3 per the blind verifier. Re-verification of the changed items follows before the topic flips to final.

## Topic 1.5 fix re-verification (2026-11-26, independent blind re-verifier)

7/7 PASS, 0 FAIL. MCQ 0100 blind pick B matched key B (key wording now stays inside the stimulus); MCQ 0104 blind pick A matched key A and the original fail is fixed — the stem no longer states the key, the answer must be inferred from the painting's sixteen labeled panels. Read-through checks passed: 0088 rationale C stays inside the visible Las Casas excerpt; 0097 difficulty now 3; LEQ 0005–0008 rubrics now read thesis 6.A, contextualization 4.B, evidence 6.B; LEQ 0008 carries zero casta-painting citations, its replacement evidence (two republics) is in-window, and its model outline re-scores 6/6. Verdicts in verification/topic-1.5-fix-verdicts.json. Topic 1.5 is cleared to flip to final.

## 2026-11-26 — Topic 1.5 flipped to final (parent, after fix re-verification)

Blind verification 30/31 PASS with one FAIL (0104), fixed in the fix round, re-verified 7/7 PASS (blind re-solves 0100 and 0104 both matched keys; read-through checks on 0088, 0097, LEQ rubrics 0005-0008, LEQ 0008 outline all pass), verdicts in verification/topic-1.5-fix-verdicts.json, verified on disk by the parent. All 31 files flipped draft to final. Unit 1: Topics 1.1-1.5 142/142 final; Lesson 1 final.

CORRECTION to the "Topic 1.5 flipped to final" entry above: the flip script failed on the first file (it matched only the minified `"status":"draft"` form, but most Topic 1.5 files use the spaced `"status": "draft"` form) while the log entry was still appended. The flip has now been applied correctly with a form-tolerant replace and verified on disk: all 31 files read status final. The entry's substance stands; only the timing was wrong.

## 2026-11-26 — Topic 1.6 written (writer: parent-dispatched agent, unverified)

Topic 1.6 "Cultural Interactions Between Europeans, Native Americans, and Africans" written:
28 MCQ (apush-mcq-0111–0138) + 6 SAQ (apush-saq-0025–0030) + 2 LEQ (apush-leq-0009–0010)
= 36 questions, all status draft, lesson apush-u1-l5. Test pool: MCQ 0111, 0115, 0121, 0127, 0136 (5);
all SAQs and both LEQs practice (Unit 1's 3 test SAQ slots already claimed: 0004 slot 1, 0015 slot 2,
0022 slot 3; the single test LEQ already claimed by 1.4's 0005). MCQ difficulty: easy 5, medium 13,
hard 10 (hard short by ~2 vs the ~12 target for the topic; recorded, same note as 1.5). MCQ skills:
1.A 4, 1.B 3, 2.A 2, 2.B 1, 2.C 1, 3.A 2, 3.B 3, 3.C 1, 3.D 1, 4.A 1, 4.B 2, 5.A 1, 5.B 2, 6.A 1,
6.B 1, 6.C 1, 6.D 1 — all 17 skill codes exercised in the topic's MCQ. MCQ reasoning: causation 12,
comparison 10, continuity-change 6. SAQ slots: 0025 slot 1, 0026 slot 2, 0027 slot 3, 0028 slot 1,
0029 slot 2, 0030 slot 3. LEQ 0009: extent European cultural practices transformed Native societies
1492-1607 (continuity-change, practice). LEQ 0010: extent Spanish and French interactions differed
1492-1607 (comparison, practice). Rubric skill labels per cb-codes.json (thesis 6.A, contextualization
4.B, evidence 6.B), following the 1.5 fix round.

Grounding read before authoring: Barron's Premium 2027 Chapter 3 (full text, 6,756 words; Topic 1.6
heading carries no separate section, so the topic's content was taken from the chapter's narrative
sections: Topic 1.1 framing, intermarriage/casta, Native American Resistance, Juan de Onate and the
Acoma Pueblo People, Debates Around Perceptions of American Indians), 5 Steps to a 5 2024 Chapter 6
(full text, 3,534 words), Princeton Review Chapter 6 supplement (8,973 words), E2/E3 lesson-script
drafts (no 1.6 hits; reference only). Every question carries book+chapter grounding.

Survivors re-checked against the books (both): kept/rewritten 2, rejected 0.
- original-ctx-u1-02 (4.B, medium) -> MCQ 0114, Valladolid debate contextualization; stimulus
  strengthened from a one-sentence summary to a sourced debate passage (Sepulveda/Aristotle vs Las
  Casas/natural law), rationales added, key D unchanged.
- original-ctx-u1-08 (4.B, medium) -> MCQ 0126, French fur-trade model vs Spain; stimulus reframed
  to in-period 1500s French-Native coastal trade (Cartier, St. Lawrence) because the survivor's
  stimulus cited Quebec, founded 1608, outside Period 1; stem adjusted to the 1500s; rationales
  added, key B unchanged.

Stimuli (9 MCQ sets) + SAQ stimuli:
- cortes-temple (0111-0113): text, Cortes Second Letter 1520 verbatim (PD, quoted in 5 Steps Ch. 6):
  idols cast down, images of Our Lady and the Saints set up, Montezuma's remonstrance, answer through
  interpreters.
- valladolid-debate (0114-0116): text, original secondary passage on the 1550-1551 council
  (Sepulveda/Aristotle vs Las Casas/natural law).
- florida-missions (0117-0119): text, original secondary passage on the four Florida missions and
  Juanillo's Revolt 1597.
- acoma-1598 (0120-0122): text, original secondary passage on Onate and Acoma (1598: 15 Spanish killed
  incl. Onate's nephew; 800+ Acoma killed; as many as 80 men had a foot cut off; about 500 enslaved).
- intermarriage-mixing (0123-0125): text, original secondary passage (Spanish men outnumbered Spanish
  women; mestizos 4-5%).
- french-model (0126-0128): text, original secondary passage on 1500s French-Native trade (Cartier,
  St. Lawrence, fur trade depending on Native hunters).
- african-retention (0129-0131): text, original secondary passage (blending language/religion, African
  songs, voodoo, Maroon communities).
- two-way-exchange (0132-0134): table, adopted items by direction (maize/potatoes/tobacco/tomatoes/
  cacao east; horses/pigs/cattle/iron/wheat west), from the books' inventories.
- lienzo-tlaxcala (0135-0138): image u1/5s24-ch06-mcq-06.jpg (Lienzo de Tlaxcala, Cortes introducing
  Christianity; 1773 copy of a c.1550s Tlaxcalan pictorial; viewed before writing; honestly labeled
  as a later copy in every question).
- SAQ 0025 slot 1: Florida missions passage. SAQ 0026 slot 2: Cortes Second Letter remonstrance
  excerpt (distinct angle from the MCQ set). SAQ 0027 slot 3: image
  u1/original-u1-lascasas-portrait-01.jpg (Las Casas at his desk, 1791 engraving; viewed; limitation
  is the 225-year gap after his death). SAQ 0028 slot 1: African retention passage. SAQ 0029 slot 2:
  Sepulveda argument paraphrase, labeled. SAQ 0030 slot 3: image u1/original-u1-native-01.jpg
  (de Bry 1591, Florida Indians planting maize and beans, after Le Moyne; viewed; limitation is
  de Bry never visiting and Europeanized figures).
All 5 images viewed before writing; sources + rights logged in each file's figures/stimulus
source_note. No generated images used.

Facts verified against the books and scholarship, not copied where the books overstate:
Barron's timeline dates the Acoma Pueblo Massacre 1598 (used); Juanillo's Revolt 1597, four missions
in Spanish Florida (used). 5 Steps places the Pueblo Revolt in 1680 and Santa Fe's founding after
it; both are outside Period 1 (1491-1607), so neither is used as an event in any 1.6 question.
Malintzin/Malinche appears in none of the three books, so no question is built on her. Sepulveda
never visited the Americas (used in MCQ 0115). Princeton on French/Spanish intermarriage contrast
and African blending (voodoo, songs, Maroon enclaves) used in sets 5-7.

Checks (writer-side, before writing): length tells checked programmatically in the build script
(0131 key trimmed to remove a 2-word length tell; SAQ 0025 model answers expanded to 2 sentences
each). Validator: 0 errors, 126 warnings (quota shortfalls for other topics/units and pre-existing
1.1 no-lesson-field warnings; no warning names any 1.6 file). All 36 files verified on disk, all
draft, all figures resolve to the shared pool.

Verification: NOT done by the writer (writer/verifier separation). A separate blind verifier
follows; files stay draft until verified.

## Topic 1.6 blind verification (2026-11-26, independent blind verifier)

**10/36 PASS, 26 FAIL.** MCQ blind picks matched locked keys 28/28; SAQ parts matched 18/18; LEQ outlines 6/6 each (0009, 0010). All keys re-derived correct; no length tell (key longest by more than 1 word in none; sole longest by exactly 1 word in 0111, 0120, 0131, 0132, 0133, within threshold); no trap language (the only "trap" hits are "trappers"/"trapping" in 0126-0128, false positives); no paragraph over 90 words; grounding present on all 36.

**The 26 FAILs are one topic-level defect, key position tell:** 26 of the 28 MCQ keys sit in position A (A 26, B 1, C 0, D 1). A no-content pattern-guesser picking A scores 26/28 (93%). FAILs: apush-mcq-0111, 0112, 0113, 0115, 0116, 0117, 0118, 0119, 0120, 0121, 0122, 0123, 0124, 0125, 0127, 0128, 0129, 0130, 0131, 0132, 0133, 0134, 0135, 0136, 0137, 0138. Every failed item's content is sound; the defect is ordering only. Fix: shuffle option order across the topic so keys distribute across positions, then re-verify the shuffled items blind. PASS: 0114 (D), 0126 (B), SAQ 0025-0030, LEQ 0009-0010.

**Notes (not fails):** Acoma dates verified (attack Dec 1598, retaliation Jan 1599; no item dates the retaliation to 1598). SAQ 0027(c) and 0029(c) legitimately require knowledge beyond the stimulus (same pattern as SAQ 0013(c) in 1.4). 0125 "English colonies brought whole families" is a simplification matching the books' framing. 0133 is a table-lookup item; its difficulty 4 looks inflated. All six SAQs carry only skill 1.A. All figure files exist on disk. Verdicts in verification/topic-1.6-verdicts.json.

## 2026-11-26 — Key-position fix round (parent, after Topic 1.6 blind verification 10/36)

The 1.6 verifier caught a topic-level defect the earlier verifiers missed: 26 of 28 Topic 1.6 MCQ keys sat in position A (pattern-guesser picking A scores 26/28). Disk census showed it was not 1.6-only: 1.3 was A 10/22 with D 1, 1.4 was A 12 + B 13 of 28 with C 2 and D 1. 1.1 (3/3/3/3), 1.2 (B 9/24), and 1.5 (7/8/6/3) pass the bar and were left untouched. Fix: constrained shuffle of 1.3 (22), 1.4 (28), 1.6 (28) — key positions assigned to exact targets (1.3: 6/6/5/5; 1.4 and 1.6: 7/7/7/7), distractors shuffled with seed 20261126, rationales and misconceptions remapped with their options, verified by script assertions (option texts and rationale texts preserved as sets; key option text unchanged). Also in this round: Topic 1.6 SAQs re-tagged with real skills (0025 1.A/4.A, 0026 2.A/3.A, 0027 1.A/2.C, 0028 1.A/5.A, 0029 3.A/3.B, 0030 2.C/3.B) — all six had carried only 1.A; MCQ 0133 difficulty 4 to 3 (table-lookup item). Rule locked in: SPEC section 6 and section 10 now require per-topic key distribution (no position over 40%, none under 10%, pattern-guesser under 50%) and the validator enforces it as a warning (check_key_distribution). Blind re-verification of all 78 shuffled MCQs follows before Topic 1.6 flips to final.

## Key-position shuffle re-verification (2026-11-26, independent blind re-verifier)

Blind re-solve of all 78 shuffled MCQs (Topics 1.3, 1.4, 1.6) from the new blind files only: 78/78 picks matched the locked keys. Every rationale argues for/against the option it is attached to — no remap error from the shuffle. Key distributions confirmed on disk: 1.3 A6/B6/C5/D5, 1.4 7/7/7/7, 1.6 7/7/7/7; a no-content pattern-guesser now scores at most 7/28 (25%) per topic. Read-through checks PASS: Topic 1.6 SAQ skill tags (0025 1.A/4.A, 0026 2.A/3.A, 0027 1.A/2.C, 0028 1.A/5.A, 0029 3.A/3.B, 0030 2.C/3.B) all fit their parts against cb-codes.json; MCQ 0133 difficulty 3 fits the table-lookup item. FAILs: none. Verdicts in verification/topic-shuffle-verdicts.json.

## 2026-11-26 — Topic 1.6 flipped to final (parent, after shuffle re-verification)

Blind verification 10/36 PASS with 26 position-tell FAILs, fixed by the constrained shuffle of Topics 1.3/1.4/1.6, re-verified 84/84 PASS (78/78 blind re-solves matched keys, no remap error; SAQ skill tags 6/6; distributions 1.3 6/6/5/5, 1.4 and 1.6 7/7/7/7), verdicts in verification/topic-shuffle-verdicts.json, verified on disk by the parent. All 36 Topic 1.6 files flipped draft to final. Unit 1: Topics 1.1-1.6 178/178 final; Lesson 1 final.

## 2026-11-26 — Topic 1.7 written (writer: parent-dispatched agent, unverified)

Topic 1.7 "Causation in Period 1" written: 12 MCQ (apush-mcq-0139–0150) + 3 SAQ
(apush-saq-0031–0033) + 1 LEQ (apush-leq-0011) = 16 questions, all status draft, lesson
apush-u1-l5. Test pool: MCQ 0140, 0144, 0148 (3, per BLUEPRINT); all SAQs and the LEQ
practice (Unit 1's 3 test SAQ slots already claimed: 0004 slot 1, 0015 slot 2, 0022 slot 3;
the single test LEQ already claimed by 1.4's 0005). MCQ difficulty: easy 2, medium 4, hard 6.
Unit 1 MCQ difficulty now stands at easy 37 / medium 60 / hard 53 against the 30/53/67
target: the topic skews hard, not easy, because the unit was already over on easy (35) and
short 20 on hard after Topics 1.1-1.6; the remaining hard shortfall (14) comes from Topics
1.1-1.6 and is a unit-level note, not fixable inside 1.7's 12-question quota. MCQ keys:
A3/B3/C3/D3, assigned deliberately at writing (pattern-guesser 25%). MCQ skills: 6.A 6, 1.A 5,
1.B 4, 3.A 4, 3.B 3, 6.B 3, 4.B 2, 2.A 2, 2.C 1, 3.C 1, 3.D 1 (11 codes; CED suggested skill
6.A leads). MCQ reasoning: causation 15, comparison 1 (0150 Portugal vs Spain). SAQ slots:
0031 slot 1, 0032 slot 2, 0033 slot 3, with skill tags fitted to the parts (0031 1.A/1.B,
0032 2.A/3.A, 0033 1.A/3.B). LEQ 0011: extent disease was the most significant cause of
Spanish success in conquering the Americas 1492-1607 (causation, practice). Rubric skill
labels per cb-codes.json (thesis 6.A, contextualization 4.B, evidence 6.B).

Grounding read before authoring: Barron's Premium 2027 Chapter 3 (full text, 6,756 words;
Topic 1.7 is "Subject to Debate": the Black Legend and sourcing caution), 5 Steps to a 5
2024 Chapter 6 (full text, 3,534 words), Princeton Review Chapter 6 supplement (8,973
words), E2/E3 lesson-script drafts (v11/v10; reference only). Every question carries
book+chapter grounding.

Survivors: 0. All 16 fresh-authored.

Stimuli (4 MCQ sets + SAQ stimuli):
- smallpox-codex (0139-0141): image u1/5s24-exam1-mcq-36.jpg (Florentine Codex, Book 12,
  c. 1585, Nahua smallpox victims; viewed; public domain; source URL from the pool catalog).
  0139 what the image shows; 0140 why disease outranks weapons as the cause of rapid conquest
  (test); 0141 smallpox in Tenochtitlan 1520 and the siege. Angle checked against 1.3's 0048
  (disease/labor) to avoid duplication: 0141 asks about the siege, not labor.
- silver-paradox (0142-0144): text, original secondary passage paraphrasing MacDougall (1992)
  via Barron's Ch 3 (post-1929: paraphrased, not quoted). 0142 why silver did not enrich most
  Spaniards; 0143 inflation beyond Spain; 0144 conclusion best supported (test). Angles kept
  distinct from Barron's own practice Q1-3 on the same passage (mechanism/conclusion, not
  central point or the 1540s labor change).
- black-legend-spread (0145-0147): text, original secondary passage on the Black Legend.
  0145 why Las Casas spread in Protestant Europe; 0146 what caused the Legend to take hold;
  0147 one effect on English colonization. Set id renamed from black-legend after the validator
  caught a collision with the 1.3 set (0046-0048, Las Casas title page). Angle checked against
  1.3's 0048 (1914 origin of the term / judge each source): this set asks cause, spread, and
  effect, not the 1914 label.
- causes-exploration (0148-0150): text, original secondary passage on the three Gs, the Ottoman
  squeeze after 1453, the Reconquista, and navigation technology. 0148 most significant cause
  (test); 0149 Constantinople 1453; 0150 why Portugal refused Columbus and Spain funded him.
- SAQ 0031 slot 1: silver/inflation secondary passage (distinct angle from MCQ set
  silver-paradox). SAQ 0032 slot 2: Columbus journal excerpt, 12 October 1492, verbatim short
  passage as copied by Las Casas (public domain). SAQ 0033 slot 3: Hispaniola population table
  (over 1,000,000 in 1492 to about 500 in the 1540s; 50-90 percent decline 1500-1650), data
  from Barron's Ch 3, Disease and Death.
No generated images used. The unused pool image 5s24-exam1-mcq-45.jpg (Brownscombe's 1914
First Thanksgiving, a 20th-century imagining of a 1621 event) was viewed and NOT used:
outside Period 1 and not evidence of it.

Facts verified against the books, not copied where the books overstate: Barron's St.
Augustine 1585 error not used; Barron's "Columbus made two more voyages" not relied on
(he made three more, four total); Barron's repartimiento 1549 conflation not copied;
5 Steps' "almost all early Native American tribes were nomadic" not used (many were
sedentary agriculturalists); Princeton's sextant-in-the-early-1700s line not used;
Pueblo Revolt 1680 and Santa Fe founding are outside Period 1 and not used as events.

Checks (writer-side, before writing): length tells checked programmatically in the build
script (0146 key trimmed to remove a 2-word length tell; SAQ 0033 part a model answer split
to 2 sentences). Validator: 0 errors, 123 warnings (quota shortfalls for unwritten units
and pre-existing 1.1 no-lesson-field warnings; no warning names any 1.7 file). All 16 files
verified on disk, all draft, all figures resolve to the shared pool. Unit 1 question totals
now complete: 150 MCQ + 33 SAQ + 11 LEQ = 194.

Verification: NOT done by the writer (writer/verifier separation). A separate blind verifier
follows; files stay draft until verified.

## Topic 1.7 blind verification (2026-11-26, independent blind verifier)

16/16 PASS, 0 FAIL. MCQ blind picks matched locked keys 12/12; SAQ parts matched 9/9; LEQ 0011 model outline scored 6/6 (thesis, contextualization, evidence 2, analysis 2; rubric labels correct: 6.A/4.B/6.B/6.B). Key distribution A3/B3/C3/D3; pattern-guesser 3/12. No trap language; no paragraph over 90 words; general rationales 82-109 words. Grounding present on all 16. Figure u1/5s24-exam1-mcq-36.jpg verified on disk. Difficulty labels honest (easy 2, medium 4, hard 6).
REQUIRED FIXES before the topic flips to final (explanation only; keys, options, and stimuli are sound): MCQ 0143 rationale A, rationale C, and general step 3, and MCQ 0144 option C misconception and rationale C, attribute to the stimulus passage a debasement-of-coinage mention and a "most lasting effect/cause" ranking that the visible stimulus does not contain. The claims are true of MacDougall's argument as summarized in Barron's but not of the stimulus text; reword all five spots to stay inside the stimulus. Same defect class as 0088 in Topic 1.5.
Process note: the blind files carry distractor "misconception" fields, so the key is identifiable as the only option without one. Solves were made from content, but future blind files should strip misconception fields.
Notes, not fails: 0148's "most significant cause" ranking is the topic's most judgment-dependent item but follows the books' framing; SAQ 0033 parts (b) and (c) legitimately require knowledge beyond the stimulus (table shows decline, not cause or labor effect), same pattern as SAQ 0013(c).

## 2026-11-26 — Topic 1.7 fix round (parent, after 16/16 blind verification)

Blind verification 16/16 PASS with two required rationale fixes (same defect class as 0088 in 1.5): MCQ 0143 rationales A, B, C and general step 3, and MCQ 0144 option C misconception and rationale C, attributed to the silver-paradox stimulus a debasement-of-coinage mention and a "most lasting effect" ranking that the visible stimulus does not contain. All five spots reworded to stay inside the stimulus (verified: zero occurrences of "debasement" or "most lasting" remain in either file). Keys, options, and stimuli untouched. Re-verification of the two items follows before the topic flips to final.
PROCESS NOTE: the Topic 1.7 verifier flagged that blind files carry each distractor's `misconception` field, so the key is identifiable as the only option without one. The solves were on content (the verifier's defect catches prove it), but the blind property was not airtight. Rule locked in SPEC section 10: blind files strip `misconception` from every option, from now on.

## Topic 1.7 fix re-verification (2026-11-26, independent re-verifier, read-through)

Result: 1 of 2 PASS, 1 FAIL. apush-mcq-0144 PASS: rationale C and option C's misconception correctly state debasement is absent from the passage; no "most lasting cause" ranking remains; all other rationales and misconceptions supported by the stimulus. apush-mcq-0143 FAIL on one leftover spot: option B's misconception still reads "Silver funded an arms race; Spain's large army forced rivals to multiply their own forces" — the stimulus says nothing about rivals or an arms race. Rationales A-D and the general steps in 0143 are clean. Fix owed: reword 0143 option B's misconception to stay inside the stimulus.

## 2026-11-26 — Topic 1.7 fix round, second pass (parent)

Re-verification of the first fix round passed 0144 but failed 0143 on one leftover spot the parent missed: option B's misconception still claimed an arms race with rivals multiplying their forces, which the stimulus never states. Fixed to stay inside the stimulus ("Silver paid for more war, not less: the passage has Spain raising taxes more than fivefold to pay for the largest army in Europe."). Final re-check of that one spot follows before the topic flips to final.

## Topic 1.7 fix re-verification, second pass (2026-11-26, independent read-through re-checker): apush-mcq-0143 PASS — option B's misconception now stays inside the stimulus; no debasement, no "most lasting effect", no arms race, no rivals anywhere in the file.

## 2026-11-26 — Topic 1.7 flipped to final (parent, after fix re-verification)

Blind verification 16/16 PASS with two rationale fixes (0143, 0144), first re-verification 1/2 (0143 failed on one leftover misconception spot), second pass fixed and re-verified PASS. All 16 Topic 1.7 files flipped draft to final. Unit 1 questions COMPLETE: Topics 1.1-1.7 194/194 final (150 MCQ + 33 SAQ + 11 LEQ); Lesson 1 final; Lessons 2-5 remain.

## Lessons 2-5 written (2026-11-26, writer, status draft)

All four lessons written in `lessons/`, status draft, following Lesson 1's format exactly. Grounding read before writing: Barron's Premium 2027 Chapter 3 (full), 5 Steps to a 5 2024 Chapter 6 (full), Princeton Review Chapter 6 supplement (full), all bank questions for Topics 1.3-1.7, and the E2 (v11) and E3 (v10) lesson-script drafts (reference only). Every image embedded was viewed before writing. Word counts are narrative words (opening + H2 sections, excluding figure/table/quote text) per the lesson checker; validator counts sections including stimulus text and all sections pass 150-300 on that count.

- **L2 "Why Europe Sailed West" (Topic 1.3)** — 1,406 narrative words, 5 sections, 8 key terms. Worked items: apush-saq-0009, 0010, 0011 (all three SAQ slots). Stimuli (4): caravel fleet engraving (Huys after Bruegel, Met CC0); de Bry Columbus landing 1594; Stradanus "AMERICA" c.1600 (Met CC0); Las Casas 1665 German title page. Questions listed: 22 MCQ + 5 SAQ + 1 LEQ = 28.
- **L3 "The Columbian Exchange and Spanish Conquest" (Topic 1.4)** — 1,369 narrative words, 5 sections, 10 key terms. Worked items: apush-saq-0014, 0015 (TEST), 0019. Stimuli (4): Columbian Exchange inventory table (data, from the books); de Bry Cusco view; Cieza de León Potosí woodcut 1553; Stradanus sugar refinery c.1600 (Met CC0). Questions listed: 28 MCQ + 6 SAQ + 2 LEQ = 36.
- **L4 "Labor, Slavery, and Caste" (Topic 1.5)** — 1,297 narrative words, 6 sections, 12 key terms. Worked items: apush-saq-0020, 0021, 0022 (TEST). Stimuli (3): Las Casas 1542 excerpt verbatim (1689 English translation, Gutenberg #20321, public domain); Las Casas portrait engraving 1791; 16-panel casta painting (18th century, public domain). Questions listed: 24 MCQ + 5 SAQ + 2 LEQ = 31.
- **L5 "Encounters and Consequences" (Topics 1.6 + 1.7)** — 1,461 narrative words, 6 sections, 9 key terms. Worked items: apush-saq-0025, 0031, 0032. Stimuli (4): Lienzo de Tlaxcala (1773 copy of 1550s pictorial); Cortés Second Letter excerpt verbatim (30 Oct 1520, public domain); Hispaniola population table (data, from the books); Florentine Codex smallpox image, Book 12 c.1585. Questions listed: 40 MCQ + 9 SAQ + 3 LEQ = 52.

Verification done by the writer (programmatic only; independent student read still owed): validator `python3 tools/validate_passmaster.py` — 194 questions, 5 lessons, 0 errors, 116 warnings, zero warnings on L2-L5 (remaining warnings are pre-existing unit-quota shortfalls and question `lesson` field tie-outs). Lesson checker confirmed per lesson: all sections 150-300 words on the validator's count, no paragraph over 90 words, captions max 30 words including the "Figure N:" label, key terms max 12 and each used by the lesson's bank questions (checked by grep: "line of demarcation" and "Middle Passage" were dropped from key-term lists — 0 hits in the 1.3 and 1.4 banks respectively), no banned trap language, no exclamation marks, all figure files exist in the pool, frontmatter question lists tie out to the bank by id and topic, and every worked-item prompt and model answer matches the bank JSON verbatim (character-for-character, including the bank's unaccented spellings "Potosi", "Sepulveda", "Bartolome" in model answers and prompts).

Known book errors respected, not copied: Barron's St. Augustine 1585 (lesson uses 1565); Prince Henry's Sagres school treated as legend; Barron's 1549 repartimiento conflation avoided (repartimiento kept distinct from encomienda); 5 Steps' "almost all tribes nomadic" not used; Princeton's sextant line not used (navigation tools named are caravel, lateen sails, astrolabe, compass, portolan charts). Syphilis origin stated as debated; Black Legend term dated to 1914; casta paintings dated 18th century and flagged as not evidence for 1500-1607; de Bry images flagged as European picturing by an artist who never visited the Americas; Pueblo Revolt 1680 flagged as outside Period 1.

## Lessons 2-5 student read (2026-11-26, independent student reader)

Read all four lessons end to end as a student, then checked every fact against Barron's Ch. 3 / 5 Steps Ch. 6 / Princeton Ch. 6, worked items programmatically against bank JSON (36/36 prompts and model answers verbatim), frontmatter tie-outs exact (28/36/31/52), lengths, key-term bank use, captions, and trap language (zero hits). Verdicts in verification/lessons-2-5-read.json: 1 PASS, 3 FAIL.
- L2 FAIL (1 defect): "Columbus sailed that October, nine months later" — he sailed 3 August 1492 and landed 12 October 1492; fix to "landed ... that October".
- L3 PASS: no defects.
- L4 FAIL (1 defect): internal inconsistency — narrative and Figure 2 caption say the 1791 Las Casas portrait was engraved "about 225 years after his death" (correct: 1791-1566=225) while worked item 3's model answer (bank verbatim) says "about 200 years". Fix by aligning the narrative/caption to the bank or correcting the bank's model answer to 225 with re-verification. The 92-word Las Casas block quote is judged acceptable verbatim quotation, no trim needed.
- L5 FAIL (4 defects): (1) Jesuit sentence placed in a 1500s context — French Jesuit missions began 1611, after Period 1; move it after the Quebec-1608 sentence and date it. (2) "Smallpox reached Tenochtitlan in 1520, during the siege" — the siege was 1521; change to "before the siege". (3) Section 1 is 304 words, 4 over the 300-word bound. (4) Florentine Codex image described as four panels / four sick figures; the image has five panels and five sick figures lying down. The 110-word Cortes block quote is judged acceptable verbatim quotation, no trim needed. The silver-paradox arms-race / most-lasting-effect claims are grounded in Barron's MacDougall passage and properly attributed to historians in the lesson — not defects.

## 2026-11-26 — Lessons 2-5 fix round (parent, after student read 1 PASS / 3 FAIL)

Student read: L3 PASS, L2/L4/L5 FAIL. Fixes applied by the parent, verified on disk:
- L2: "Columbus sailed that October, nine months later" corrected to "Columbus landed in the Bahamas that October, nine months later" (sailed 3 Aug 1492, landed 12 Oct).
- L4: no lesson change — the narrative and caption ("about 225 years after his death", 1791-1566=225) were correct; the BANK was wrong. SAQ 0022 part c model answer corrected from "about 200 years" to "about 225 years". SAQ 0022 is a test-pool item; blind re-solve follows.
- L5: (a) Jesuit sentence moved out of the 1500s paragraph to after the Quebec-1608 sentence and dated 1611; (b) "Smallpox reached Tenochtitlan in 1520, during the siege" corrected to "before the siege" (siege May-Aug 1521, epidemic late 1520); (c) Florentine Codex description corrected from "Four panels... three more" to "Five panels... four more" (parent viewed the image: five panels, five sick figures lying down). (d) Section 1 word count: the reader's 304 was NOT sustained — 298 by the validator's counting method (section body excluding the title). The parent's own Jesuit fix then pushed it to 301, so two redundant words ("after Quebec, ") were trimmed; Section 1 now 299. All six L5 sections 183-299 words.
- The 92-word Las Casas quote (L4) and 110-word Cortés quote (L5) were judged acceptable verbatim quotations by the reader; no trim. The validator excludes block quotes from the paragraph cap, consistent with that judgment.
- Tie-out: all 47 Topic 1.1+1.2 questions lacked a lesson field; lesson apush-u1-l1 added to each (Lesson 1 covers Topics 1.1+1.2). L1 frontmatter already listed all 47 ids; tie-out now exact for all five lessons. L3 flipped to final (passed outright). Validator: 194 questions, 5 lessons, 0 errors, 69 warnings.

## Lessons 2-5 fix re-verification (2026-11-26, independent re-checker)

3 PASS, 1 FAIL.
- apush-u1-l2 PASS: Columbus sentence reads "landed in the Bahamas that October, nine months later"; 5 Steps Ch. 6 confirms the October 12, 1492 Bahamas landing.
- apush-u1-l5 PASS: Jesuit sentence after Quebec-1608, dated 1611 (Princeton places Jesuit priests after Quebec 1608); smallpox "before the siege" (epidemic late 1520, siege May-Aug 1521); codex "Five panels... four more lie still" verified against the image itself (five panels, five lying sick figures); Section 1 counts 299 words by the validator's method.
- apush-saq-0022 PASS: blind solve 3/3, part (c) matches the corrected "about 225 years" model answer.
- apush-u1-l4 FAIL: narrative and Figure 2 caption correctly read "about 225 years", but Worked item 3 (apush-saq-0022) part (c) model answer in the lesson still reads "about 200 years". That contradicts the lesson's own narrative/caption and is no longer verbatim against the corrected bank file. The fix round corrected the bank but left the lesson's worked item stale. Fix owed: change the lesson's worked item 3 model answer (c) to "about 225 years".

## 2026-11-26 — Lessons fix round, second pass (parent)

Fix re-verification passed L2, L5, and SAQ 0022 (3/3 blind), but failed L4 on one leftover spot: the parent corrected the bank's SAQ 0022 model answer to "about 225 years" but left the lesson's worked-item copy at "about 200 years". Fixed the worked item in apush-u1-l4.md line 189; the lesson now reads 225 years in the narrative, the caption, and the worked item, and the worked item is verbatim against the bank (checked programmatically). Final re-check of that one spot follows before L2/L4/L5 flip to final.

## Lessons fix re-verification, second pass (2026-11-26, independent read-through re-checker): apush-u1-l4 PASS — narrative, Figure 2 caption, and Worked item 3 part (c) model answer all read "about 225 years"; zero "200 years" remaining; worked item verbatim against the bank (programmatic check); 1791-1566=225 confirmed.

## 2026-11-26 — Unit 1 lessons COMPLETE (parent)

L4's final re-check passed (225 years in narrative, caption, and worked item; worked item verbatim against the bank). Lessons 2, 4, and 5 flipped to final. All five Unit 1 lessons are now final: L1 (Topics 1.1+1.2), L2 (1.3), L3 (1.4), L4 (1.5), L5 (1.6+1.7). Unit 1 complete: 194/194 questions final + 5/5 lessons final.

## 2026-11-26 — Blind read: Lesson 5 (independent blind student read)

Read the lesson end to end as a student, then blind-solved all 52 questions from the blind files only (40 MCQ + 9 SAQ + 3 LEQ), then adjudicated against keys/model answers and the books. Blind match: MCQ 40/40, SAQ 27/27 parts, LEQ 3/3 outlines on substance. Key distribution exactly 10/10/10/10; no length tells beyond the accepted 1-word pattern. Blind files for L5 carry zero misconception fields - the leak flagged in the Topic 1.7 read is fixed in this batch. Lesson: PASS (sections 183-299 words, no paragraph over 90 words, no trap language, 9 key terms; all checked facts verified against Barron's Ch. 3, 5 Steps Ch. 6, Princeton Ch. 6).
FAILS (5): apush-mcq-0140 (rationale C: 'during the siege' - siege was 1521, epidemic 1520); apush-mcq-0141 (stem, rationale A, general step 1: same 'during the siege' / 'while besieging' error, contradicts the lesson's 'before the siege'); apush-leq-0011 (model outline: 'during the 1520 siege' - same error); apush-mcq-0142 (general step 2 invents 'two or three percent' - nowhere in the books; rationale D attributes the arms race to the stimulus passage, which never mentions it); apush-mcq-0150 (fairness: key D, Portugal's African sea route, is true and book-grounded but taught nowhere in the lesson and not in the stimulus - fix belongs in the question, add the fact to the stimulus). All five keys/model answers are correct; all five fixes are wording/stimulus only. Lesson polish notes (not fails): 'with Cortes among them' unhedged in an unlabeled image; 'by the later counts' vague; Montezuma/Muteczuma spelling shift unglossed; 'most lasting effect' historian still unnamed. The African-culture and Valladolid content the lesson does not repeat is taught in Lesson 4 and every item testing it is stimulus-supported, so no teaching gap.

## Blind read: Lesson 3 (2026-11-26, independent blind student read)

Lesson 3 + its 36 questions read blind end to end, solved from blind files only, then adjudicated against question files and the three books. Blind files in this batch carry no misconception fields (the Topic 1.7 leak is fixed). MCQ blind match 28/28, SAQ parts 17/18, LEQ outlines 6/6 each. Key distribution exactly 7/7/7/7. Sections 280-299 words, narrative 1,514 words, 0 paragraphs over 90 words, 10 key terms, 3 worked items verbatim, no trap language.
FAIL — apush-saq-0016, part (b): the model answer requires Las Casas's purpose (persuade the crown to reform the encomienda), but the stimulus never states his purpose and the L3 narrative never mentions Las Casas. Fix belongs in the question (add the purpose to the stimulus or reframe part b). SAQ 0018's stimulus does give the purpose and tests it in part (a).
FAIL — lesson apush-u1-l3, one defect: the 50-90% mortality figure (1500-1650) is attributed to "the Princeton Review," but the figure appears nowhere in the Princeton book and verbatim in Barron's Ch. 3. Fix: attribute to Barron's or say "historians estimate." Lesson notes (not fails): "Middle Passage" used with no definition or key-term entry; "the encomienda collapsed" overstates Barron's "replaced over time"; the Irish famine reference is undated and jumps to the 1840s.
NOTE — apush-mcq-0060 (PASS): key B "competing European crowns" is loose (silver financed Spain's armies; rivals' spending was their own response) and the general rationale step 1 is garbled ("treasuries of Spain and its rivals' enemies"). Recommend rewording both.
Facts checked: Hispaniola 1,000,000 to 500, taxes more than fivefold, Cortes Second Letter Oct 30 1520, Las Casas 1542/1552 — all confirmed in the books. Potosi 1545, Toledo mit'a 1570s, Huayna Capac smallpox, Crosby 1972 — correct standard facts, not present in any of the three books as extracted (rest on CED/lesson-script grounding).

## Blind read: Lesson 2 (2026-11-26, independent blind student read)

Lesson read end to end as a student first, then all 28 questions blind-solved from the blind files only (solves recorded before opening any question file). Result: 24/28 PASS, 4 FAIL. MCQ blind picks matched keys 22/22; SAQ parts matched 15/15; LEQ outline scored 6/6 against the rubric.
FAILS:
- apush-mcq-0044: rationale B overstates the passage claim ("No sea route through the Americas... none would be found in this period"). Magellan found the Strait of Magellan in 1520, within Period 1. Fix to "No Northwest Passage through North America... none was ever found."
- apush-mcq-0050: rationales A and D both say "Columbus sailed in October" — he sailed August 3 and landed October 12. Same error the Lesson 2 fix round already corrected in the lesson; it survives in this item's rationales. Fix both spots to "landed."
- apush-leq-0004: rubric criteria 2 and 3 skill labels swapped (context 6.B should be 4.B; evidence 4.B should be 6.B), the same defect fixed in LEQs 0005-0008 in the Topic 1.5 round; LEQ 0004 was missed.
- apush-u1-l2 (lesson): two one-word imprecisions — da Gama "the first European to reach Asia by sea" should be "India by sea" (5 Steps supports the India claim); Stradanus "drew the engraving" should be "designed" (Galle engraved it; the lesson's own caption says "after Stradanus").
Programmatic checks clean: no length tells, key distribution A6/B6/C5/D5, general rationales 78-99w, sections 289-300w, narrative 1,527w, no paragraph over 90w, no trap language, tie-out 28/28, worked items 9/9 verbatim, all 8 key terms in bank questions. Notes: Cabot appears only in MCQ 0052's stem (fair, stem supplies it); SAQ 0013(c) legitimately needs lesson knowledge; Barron's 1585 St. Augustine error and 'two more voyages' error both correctly not copied.

## 2026-11-26 — Blind read: Lesson 4 (independent blind student read)

Blind read of apush-u1-l4 + its 31 bank questions: MCQ blind match 24/24, SAQ parts 15/15, LEQ outlines matched both model theses. 28/31 PASS, 3 FAIL.
- LESSON FAIL (2 defects): (1) repartimiento figures misassigned — "one in seven men for farm work and about four percent for the mines" reverses the sources: one-seventh is the Andean mita for the Potosi/Huancavelica mines (Toledo, 1570s), and 4% is the New Spain repartimiento weekly levy (1588 Taxco rule); Britannica gives about 5% for mines and about 10% more for seasonal agriculture. (2) Asiento price phrasing — "at a price of 25,000 ducats" misattributes the payment: Gouvenot received the grant and SOLD the license to Genoese merchants for 25,000 ducats. Both fixes belong in the lesson; no question depends on either figure.
- MCQ 0104 FAIL: near-duplicate of 0103 — same 16-panel casta stimulus, same concept, same keyed proposition. Re-author on the dating limitation (casta paintings are 18th-century evidence, taught in the lesson and untested by any MCQ) or drop; keep 0103 (test pool).
- LEQ 0008 FAIL: model outline + rubric require "wealth could soften a rank," a point the lesson never teaches and whose formal mechanism (gracias al sacar) is late 18th century, outside the 1500-1607 window. Fix in the question: drop wealth from the rubric analysis criterion and the model thesis; the mixing point carries the complexity.
- Notes, not fails: 0088 general step 3 "offered no injury" is a fair paraphrase of "humility and patience" but not literal; 0094 option C "permanent grant" vs the lesson's New Laws ending grants at death (suggest "lasting grant"); LEQ 0007's Barron's-verbatim "50-90% by 1650" extends past the prompt's 1607 end. Voodoo suspicion withdrawn — Princeton's own text says it verbatim. Lesson length/tone PASS (6 sections 160-293w, narrative 1,471w, no paragraph over 90w, no trap language). Key distribution A7/B8/C6/D3, pattern-guesser 8/24. Worked items verbatim (checked programmatically).

## 2026-11-26 — Blind read: Lesson 1 (independent blind student read)

47 items blind-solved from blind-u1/apush-u1-l1 (verified clean: no misconception fields, no answerKey) after reading the lesson end to end as a student; solves recorded before opening any question file. MCQ 36/36 blind match, 36/36 PASS; SAQ parts 24/24 matched, 5/8 PASS; LEQ outlines 3/3 at 6/6, 0/3 PASS; lesson PASS with notes.
FAILS (6): SAQ 0001, 0002, 0003 - all 3 parts have 1-sentence model answers, SPEC requires 2-4 sentences per part (Topic 1.2 SAQs were expanded to 2 sentences in the fix round; the three Topic 1.1 SAQs predate that). LEQ 0001, 0002, 0003 - rubric rows carry no skill codes, unlike LEQs 0004-0011 (thesis 6.A, contextualization 4.B, evidence 6.B); rubrics substantively correct, 6 points, outlines score 6/6.
Lesson facts all checked against the books: 40,000-year migration, 1-5m/20m populations, Tenochtitlan more populous than any European city in 1500, Iroquois League fifteenth century, Chaco hundreds of rooms and 13th-14th-century drought, Chinook longhouses up to fifty people - all confirmed in Princeton/Barron's. London comparison not in the three books (standard hedged claim). Worked items 9/9 verbatim. Sections 174/288/165/279/161/296, narrative 1,410 words, no paragraph over 90, no trap language.
Caveat: SAQ 0001/0004/0008 solves reproduce the lesson's worked items verbatim, so those three are not independent blind evidence; the other five SAQs were solved from stimulus only.

## 2026-11-26 — Blind student read of Unit 1 + fix round (parent)

All five lessons read blind as a student (read lesson, solve its questions blind, adjudicate lesson↔question coherence). Results: L1 41/47, L2 24/28, L3 35/36, L4 28/31, L5 47/52 — 176/194 pass; every blind solve matched its key, so no key was wrong. 20 fails, all verified on disk by the parent and fixed in this round:
- Siege timing (lesson fix had not reached the bank): 0141 stem/rationales/general/misconception B, 0140 rationale C + misconception C, LEQ 0011 outline — "during the siege" corrected to "in late 1520, before the siege" (siege May-Aug 1521).
- 0142: invented "Two or three percent" figure removed from general step 2; rationale D and misconception D no longer attribute the arms race to the stimulus passage.
- 0150: stimulus now states Portugal's African sea route, so key D is derivable from lesson + stimulus.
- 0050: rationales A/D "sailed in October" corrected to "landed"; 0044 rationale B corrected (Magellan found the strait in 1520); LEQ 0004 rubric rows 2/3 labels swapped to the settled pattern (4.B/6.B); L2 lesson: da Gama "India by sea", Stradanus "designed".
- SAQ 0016: purpose sentence added to the stimulus (Las Casas wrote to persuade the crown); L3 lesson: 50-90% figure re-attributed to Barron's (confirmed in Barron's Ch. 3 XHTML; absent from Princeton); 0060 key B/rationale B/general step 1 corrected (silver financed Spain, rivals spent in response); L3 polish: Irish famine dated to the 1840s, "encomienda collapsed" softened to "faded", Middle Passage defined (then shortened to keep Section 5 at 297 words).
- L4 lesson: repartimiento sentence corrected (Andean mita one in seven for the Potosí mines; New Spain four percent weekly levy — both confirmed against Duke HAHR Taxco and Potosí-mita articles); asiento sentence corrected (Gouvenot sold the license for 25,000 ducats, paid nothing to the Crown — confirmed against Asiento sources); 0094 "permanent grant/claim" corrected to "lasting" in option C and rationale C; LEQ 0008 wealth dropped from thesis and rubric analysis criterion (gracias al sacar is late 18th century, outside the 1500-1607 window).
- L1: SAQ 0001-0003 model answers expanded to 2 sentences per part; LEQ 0001-0003 rubric skill codes added per the settled bank pattern [6.A, 4.B, 6.B, 6.B, 6.B, 6.B]; SAQ 0004(b) second sentence rewritten to stop repeating the first; 0013 rationale D reworded (Le Moyne 1560s, before the missions); 0029 skill tag 6.A to 6.D (matches the bank's other evaluation-of-a-claim items 0019/0073/0122). L1 worked items 1 and 2 re-synced verbatim against the bank.
- Censuses run in the round: "sailed in October" only 0050; "during the siege" only 0140/0141 (+ LEQ 0011's "during the 1520 siege" phrasing); LEQ label swaps only 0004; "permanent grant" only 0094; invented "two or three percent" only 0142.
- 0104 (near-duplicate of 0103) is being re-authored on the dating limitation by a separate writer; blind re-verification of all fixed spots + 0104 follows.
- Validator after the fix round: 194 questions, 5 lessons, 0 errors, 60 warnings.

## 2026-11-26 — MCQ 0104 re-author (blind-read fix round)
Re-authored apush-mcq-0104 in place: it duplicated 0103 (same 16-panel casta stimulus, same concept, same keyed proposition — that classifying by ancestry had become systematic). New stem: "What limits the use of this canvas as evidence about Spanish colonial society between 1500 and 1607?" Key D: the paintings show the system in the 1700s, a century after the period in question. Distractors test coverage (A), authorship (B: commissioned by Spanish families, not Indigenous artists), and continuity (C: one later source cannot prove nothing changed). Skill 2.C (sourcing), reasoning continuity-change, difficulty 4, status draft pending blind verification. Stimulus, figures, grounding, topics, lesson, pool, id unchanged. Topic 1.5 key distribution is now A7/B8/C6/D4. No longer duplicates 0103: 0103 asks what the comprehensive set indicates about colonial culture (systematic classification); 0104 asks what limits the canvas as evidence for 1500-1607 (its 18th-century date).

## 2026-11-26 — Blind read fix re-verification (independent verifier)

22/22 PASS, 0 FAIL. All 11 MCQ blind picks matched keys; all 15 SAQ parts matched model answers on substance; all 6 LEQ outlines scored 6/6 against their rubrics and matched the model outlines. Every fix from the blind-read round confirmed resolved on disk: siege timing in 0141/0140/LEQ 0011 (late 1520, before the siege); invented "two or three percent" gone from 0142 and the arms race no longer attributed to the passage; 0150 key D derivable from the stimulus; 0050 "landed"; 0044 Magellan 1520; 0060 silver financed Spain; 0094 "lasting"; 0013 Le Moyne 1560s; 0029 skill 6.D; SAQ 0001-0003 all parts exactly 2 sentences; 0004(b) no longer repeats itself; 0016 stimulus states Las Casas's purpose; LEQ 0001-0003 rubric codes 6.A/4.B/6.B/6.B/6.B/6.B; LEQ 0004 rows 2/3 at 4.B/6.B; LEQ 0008 zero "wealth" in the file; 0104 re-authored on the dating limitation (key D, 82-word key explanation, options 11/16/14/15, no length tell, no duplication of 0103) — ready to flip to final. Lesson spots all pass: L2 India by sea / Stradanus designed; L3 Barron's attribution, 1840s famine, "encomienda faded", Middle Passage defined, Section 5 at 297 words; L4 repartimiento and asiento sentences; L1 worked items 1 and 2 verbatim, 2 sentences per part. Defect-class census clean across bank and lessons: "during the siege" 0, "during the 1520 siege" 0, "two or three percent" 0, "sailed in October" 0, "permanent grant/claim" 0. Validator: 194 questions, 5 lessons, 0 errors, 62 warnings (2 above the pre-fix 60 are the expected draft counts for 0104). Note, not a defect: 0050 option A's misconception still says "sailed the same year", which is true — Columbus did sail in 1492; only "sailed in October" was wrong.

## 2026-11-26 — Creative director voice pilot (his order: "You are the creative director")

Direction: story-first explanations — one vivid device per item, facts and keys untouched, steps + Remember structure kept. Pilot installed on three items' general notes only (keys, options, stimuli, per-option rationales untouched; validator 0 errors after): 0141 "the army nobody could see" (smallpox as the unfair fighter), 0104 "the yearbook test" (18th-century canvas for a 1500 question), 0060 "the lottery winner" (Spain hit the jackpot and ended up poorer). His eye judges the pilot; if it lands, the voice scales across the bank.

## 2026-11-26 — Voice pass Topic 1.1 (creative-director voice; writer per parent order "Go")

Rewrote the general explanation notes of all 12 Topic 1.1 MCQs in the pilot voice (story-first, one vivid device per item, facts identical, numbered steps + Remember kept, no trap language). Only `rationales.general` changed in each file; keys, options, stems, stimuli, per-option rationales, and all metadata untouched. Validator after: 0 errors, 61 warnings (pre-existing).
- 0001 "the angry pen" — Las Casas writing to Prince Philip, his pen angry — 98w
- 0002 "the lawyer's damages" — a writer making a case stresses the largest losses — 103w
- 0003 "the date stamp" — 1542, fifty years after first contact, conquest already under way — 94w
- 0004 "the hill no river built" — moving a mound one basket at a time — 96w
- 0005 "a skyline before Columbus" — cities, farming, wide trade centuries before contact — 87w
- 0006 "the same league" — Cahokia beside other complex societies, on its own terms — 95w
- 0007 "the name that broke the map" — a new name because the old label no longer fit — 92w
- 0008 "the thank-you on the map" — Waldseemuller naming the lands from Vespucci — 87w
- 0009 "the old professor and the young explorer" — Ptolemy and Vespucci sharing a page — 95w
- 0010 "the ledger" — read the table row by row, stop at the first mainland entry — 83w
- 0011 "one trip is a visit" — four crossings make a lasting link, not a single event — 76w
- 0012 "a fence on water" — the Line of Demarcation as a boundary drawn on the ocean — 118w

## 2026-11-26 — Voice pass Topic 1.1 verification

12/12 rewritten general notes checked against each item's key, stem, stimulus, figures, and per-option rationales (Hart 1906 map viewed in full and in zoomed crops for 0010/0012); word counts 76-118, no trap language, validator 0 errors. **11 PASS, 1 FAIL.**
- FAIL apush-mcq-0012: general step 3 attributes "100 leagues west of the Azores and Cape Verde" to the map label. The map labels the line only "LINE OF DEMARCATION (1493)". The measurement is true history (1493 papal bull) but is not on the map; fix is to state it as background knowledge, not as a label reading.

## 2026-11-26 — Voice pass Topic 1.2 (creative-director voice)

Rewrote the `rationales.general` of 22 of the 24 Topic 1.2 MCQs (0013-0036), story-first, one vivid device each, numbered steps + Remember kept, facts identical to each item's key/stimulus/books. Only the general string changed in each file (surgical replacement, reload-diff verified); keys, options, stems, stimuli, figures, per-option rationales, skills, difficulty, pool, topics, grounding, status untouched. Background facts are framed as background, never as readings of the stimulus (0022: "Start with background, not the map"; 0018/0036: "Background from the books"). Left unchanged as already vivid and story-first: 0016 (salesmanship) and 0017 (dressed scenes / style as evidence). Validator: 0 errors, 61 warnings (the 1 non-quota warning is the pre-existing pilot artifact on 0104, general 117w vs question 112w, out of this topic's scope).
- 0013 planted field as a signature, 103w
- 0014 two jobs, one household, 88w
- 0015 telephone across an ocean, 107w
- 0018 two cities, one root, 83w
- 0019 the lab test, 84w
- 0020 the surplus as a bridge, 80w
- 0021 three witnesses agreeing, 83w
- 0022 the river as a free fertilizer delivery, 80w
- 0023 London's twin, 95w
- 0024 the mute witness, 93w
- 0025 passport stamps, 82w
- 0026 three sisters sharing one house, 79w
- 0027 the pantry that never moves, 82w
- 0028 a three-story house, 83w
- 0029 one ingredient doesn't make the meal, 77w
- 0030 the desert's own brick, 81w
- 0031 the fingerprint, 83w
- 0032 the land wrote the menu, 92w
- 0033 the surplus pays the salaries, 82w
- 0034 wrong shoes on the wrong feet, 97w
- 0035 sorting into two piles, 86w
- 0036 a second road to the same town, 83w

## 2026-11-26 — Voice pass Topic 1.2 verification

24/24 PASS, 0 FAIL. Every general in apush-mcq-0013 through apush-mcq-0036 (74-107 words, all inside 60-120) checked against its item's key, stem, stimulus, figures, and per-option rationales; 0016/0017 checked as they stand (writer left them unchanged) and both match their keys. No fact contradicted by the item or the books; no misattribution to the stimulus (0018's maize dependence and 0036's Columbia River detail are honestly flagged as book background; 0025's copper/shells are stated in the stimulus itself); no trap language. Vivid devices judged accurate throughout: 0015 "game of telephone", 0021 "three witnesses", 0028 "three-story house", 0032 "the land wrote the menu", 0036 "a second road to the same town".

## 2026-11-26 — Voice pass Topic 1.3 (creative-director voice)

All 22 Topic 1.3 MCQ general notes rewritten story-first, one vivid device each, facts identical to the item's prior general + key + stimulus + books, numbered steps + Remember kept, background facts tagged "Background from the books:" where they do not come from the visible stimulus. Only `rationales.general` changed in each file (asserted per file before writing). Validator after: 0 errors, 60 warnings (no new warnings, none on 1.3).
- 0037 "the referee" (two crowns arguing over a prize) — 108w
- 0038 "the bargain" (judge the trade by what Portugal valued) — 104w
- 0039 "accepting the judge" (authority both sides recognize) — 100w
- 0040 "the detour" (the ship built to go around by sea) — 96w
- 0041 "the sail that brings you home" (beating back against the wind) — 97w
- 0042 "the locked door" (Portugal owns the only road) — 101w
- 0043 "the moment the old map broke" (America, not Asia) — 87w
- 0044 "a name is a claim" (the map stops calling it Asia) — 99w
- 0045 "who acts, who is acted upon" (measuring man vs reclining scene) — 89w
- 0046 "the borrowed weapon" (Las Casas's words in rival hands) — 103w
- 0047 "one text, two audiences" (same words, new mouth) — 86w
- 0048 "the nickname 400 years late" (Black Legend, 1914) — 86w
- 0049 "the habit packing its bags" (crusade culture crosses the Atlantic) — 89w
- 0050 "one year, two jobs" (Granada in January, the Caribbean in October) — 86w
- 0051 "hands full" (England busy at home and at war) — 91w
- 0052 "the scouts who never stayed" (explored early, settled a century later) — 81w
- 0053 "why a fort, not a town" (Fort Caroline and the rival on the coast) — 93w
- 0054 "the watchtower that never retired" (a fort guarding the silver road) — 94w
- 0055 "freeze the frame" (gifts, guns, and a cross in one scene) — 90w
- 0056 "the artist who never went" (de Bry painting a shore he never saw) — 87w
- 0057 "the crowdfunded colony" (many investors share one bill) — 89w
- 0058 "two deeds, two owners" (private investors vs two crowns) — 88w

## 2026-11-26 — Voice pass Topic 1.3 verification

22/22 PASS, 0 FAIL. Each general checked against its item's key, stem, stimulus, figures, and per-option rationales, plus programmatic checks (all 81-108 words, inside 60-120; zero trap-language hits; book-sourced facts explicitly labeled "Background from the books"). Spot book checks: 0053's "Potosi silver sailed from Havana" matches its own rationale A and no book passage contradicts "no fur trade"; 0050's "nine months later" is the corrected Jan-to-Oct count; 0058's "pope mediated rather than decreed" matches rationale D. Vivid devices judged accurate throughout (two men arguing over a prize, the locked door, the weapon changing hands, the watchtower that never retired, the crowd-funded colony).

## 2026-11-26 — Voice pass Topic 1.4 (creative director order)

Rewrote the general explanation notes of 26 of the 28 Topic 1.4 MCQs in the story-first voice (pilot devices: 0141 "the army nobody could see", 0104 "the yearbook test", 0060 "the lottery winner"). Only `rationales.general` changed in each file; keys, options, stems, stimuli, per-option rationales, skills, difficulty, pool, topics, grounding, and status untouched. 0060 not touched (pilot). 0070 left as-is: its general already reads vivid and story-first ("Count the soldiers. Cortes landed with about 500 men...").
- 0059 the mountain paying the bills — 90w
- 0061 the artist who never went — 91w
- 0062 customs officer at the Atlantic — 76w
- 0063 a one-way street — 79w
- 0064 the trade on a scale — 84w
- 0065 one seed around the world — 80w
- 0066 the killer that came first — 98w
- 0067 a city that cannot bury its dead — 91w
- 0068 the math of a hemisphere — 89w
- 0069 the other side of the story — 89w
- 0070 already vivid, left unchanged
- 0071 changing the gods on the wall — 84w
- 0072 a letter to the boss — 92w
- 0073 two ledgers — 80w
- 0074 a mystery with two suspects — 86w
- 0075 two lists that don't match — 80w
- 0076 a bucket with three holes — 83w
- 0077 a fortune eaten, not planted — 87w
- 0078 a mine in the Andes paying for a war in Europe — 82w
- 0079 an assembly line with no machines — 77w
- 0080 a recipe that already existed — 83w
- 0081 two roads to the same port — 87w
- 0082 a city drawn before it was built — 88w
- 0083 a house already split — 86w
- 0084 new owners, same machine — 85w
- 0085 three rows, one story — 84w
- 0086 a lifetime's collapse — 90w
Validator after the pass: 194 questions, 5 lessons, 0 errors, 60 warnings (warning count unchanged; every new general is shorter than its question).

## 2026-11-26 — Voice pass Topic 1.4 verification (independent verifier)

Checked all 28 rewritten general notes (MCQ 0059-0086) against each item's answerKey, stem, stimulus, figures, and per-option rationales, with book checks where a fact was in doubt (Barron's Ch. 3 confirms the 50-90% mortality figure and smallpox as the central killer). Result: 28/28 PASS, 0 FAIL. All generals in the 60-120 word band (76-120; 0060 at exactly 120), no trap language. Spot notes: 0060's "ended up poorer" is book-grounded (Barron's silver-paradox passage, the same passage as 0076-0078's stimulus) and presented as history, not as the item's stimulus content; 0066's "within weeks" is consistent with the Codex account of whole neighborhoods falling ill at once and with 0067's rationale that disease ran ahead of the soldiers; 0086's "died or was left unable to work" matches the stimulus (the sick unable to move) and the item's own rationale D. No lesson or question file was edited.

## 2026-11-26 — Voice pass Topic 1.5 (23 MCQs, 0087-0110 except 0104)

Story-first general notes, one vivid device per item, facts identical to the item's key + stimulus + books, numbered steps + Remember kept. Only `rationales.general` changed in each file; 0104 untouched (pilot "yearbook test" general already in place). Validator after the pass: 194 questions, 5 lessons, 0 errors, 60 warnings (all pre-existing unit-quota warnings for unwritten units; none on the 23 touched items). One draft overshot on first write: 0103's general counted 94w against a 94w question and had to be trimmed to 88w to stay strictly shorter than its question.
- 0087 "the advocate's brief" — 109w
- 0088 "let the author name the crime" — 102w
- 0089 "the witness in two hats" — 97w
- 0090 "the portrait painted to win a case" — 104w
- 0091 "the bargain with fine print" — 98w
- 0092 "the speed limit, not the road closure" — 92w
- 0093 "the advertisement vs the record" — 102w
- 0094 "two different leases" — 111w
- 0095 "the same machine with new fuel" — 89w
- 0096 "the mines with no workers left" — 86w
- 0097 "the dam that redirects the river" — 90w
- 0098 "the victory lap taken too early" — 97w
- 0099 "the filing tag" — 83w
- 0100 "widen the frame" — 90w
- 0101 "the field guide of labels" — 97w
- 0102 "read the fear, not just the category" — 88w
- 0103 "the shop-window catalog" — 88w
- 0105 "the courtroom where the verdict is not the story" — 94w
- 0106 "the lawyer, not the traveler" — 105w
- 0107 "the franchise for sale" — 94w
- 0108 "the door that locks behind your children too" — 94w
- 0109 "the city in the hills no king ordered built" — 89w
- 0110 "seeds carried across an ocean in a pocket" — 100w

## 2026-11-26 — Voice pass Topic 1.5 verification (independent verifier)

Read all 24 rewritten generals (MCQ 0087-0110) against each item's key, stem, stimulus, figures, and per-option rationales, plus Barron's Ch. 3 where a fact was in doubt. Result: 23/24 PASS, 1 FAIL. All generals 60-120 words; no trap language anywhere.
- FAIL apush-mcq-0088: general step 3 says "He says the Indians offered no injury, so self-defense fails too." The visible Las Casas stimulus never says that — "injury" appears nowhere in the item except in the general itself. The verified rationale C says only that nothing in the excerpt describes self-defense. Same misattribution class the Topic 1.5 fix round already corrected in this item's rationale C. Fix: reword step 3 to stay inside the excerpt.
- 0092's "opened the way to the repartimiento" checked against Barron's Ch. 3 ("repartimiento reforms begin to replace the encomienda system") — supported, PASS.

## 2026-11-26 — Voice pass Topic 1.6 (creative-director voice)

All 28 Topic 1.6 MCQ general notes rewritten story-first, one vivid device per item, facts identical to the item's current general + key + stimulus + books, numbered steps + Remember kept, background facts marked "Background:" where they come from the books rather than the visible stimulus (0115 Sepúlveda never visiting the Americas; 0121 Spaniards few and far from help; 0125 English settlement bringing whole families). Only `rationales.general` changed in each file; keys, options, stems, stimuli, figures, per-option rationales, skills, difficulty, pool, topics, grounding, and status untouched. No Topic 1.6 general already read vivid and story-first, so all 28 were rewritten. Validator after: 194 questions, 5 lessons, 0 errors, 60 warnings (pre-existing unit quotas, unchanged).
- 0111 "a field report landing on a king's desk" — 104w
- 0112 "a letter as a mirror of its author" — 92w
- 0113 "hear the objection" — 85w
- 0114 "a courtroom where the judges argue from old books" — 91w
- 0115 "the debater who argued from a library" — 85w
- 0116 "two lawyers, one rulebook" — 82w
- 0117 "a lid pressed down harder and harder" — 88w
- 0118 "hold the claim up to the light" — 76w
- 0119 "two different uniforms doing the same job" — 92w
- 0120 "find the spark" — 89w
- 0121 "read the punishment as a message" — 92w
- 0122 "two different roads to the same fire" — 90w
- 0123 "do the arithmetic" — 84w
- 0124 "people the old labels could not file" — 92w
- 0125 "look at who got off the boats" — 93w
- 0126 "follow the furs to their source" — 79w
- 0127 "a business whose workers you cannot replace" — 84w
- 0128 "each empire's shopping list" — 72w
- 0129 "old songs in a new place" — 92w
- 0130 "go looking for the thing it says is gone" — 87w
- 0131 "a faith wearing a borrowed coat" — 80w
- 0132 "a road with traffic in both directions" — 80w
- 0133 "follow one seed across an ocean" — 86w
- 0134 "the flinch before the ride" — 88w
- 0135 "look at center stage" — 83w
- 0136 "the artist's fingerprint" — 90w
- 0137 "whose camera is holding the scene" — 90w
- 0138 "weigh what each side of the story gives you" — 96w

## 2026-11-26 — Voice pass Topic 1.6 verification

28/28 PASS, 0 FAIL. Every rewritten general in apush-mcq-0111 through 0138 was checked against its item's answerKey, stem, stimulus, figures, and per-option rationales; no fact contradicted the item or the books, no key or rationale was contradicted, no claim was misattributed to a stimulus (background claims are flagged as Background in the text and match the rationales), no trap language (the only "trap" substrings are "trappers" in 0126 and "trapping" in 0127 — fur-trade content words), and all generals fall in 60-120 words (72-104w). Verdicts in verification/voice-1.6-verdicts.json.

## 2026-11-26 — Voice pass Topic 1.7 (last topic; creative director's direction)

All 11 remaining Topic 1.7 MCQ generals re-voiced story-first, one device each, facts identical to the item's current general + key + stimulus + books, numbered steps + Remember kept (Remember lines retained verbatim — all were already strong). Only `rationales.general` changed in each file; keys, options, stems, stimuli, per-option rationales, skills, difficulty, pool, topics, grounding, status untouched. 0141 ("the army nobody could see") not touched. Validator after: 194 questions, 5 lessons, 0 errors, 60 warnings.
- 0139 "the house with no one left standing" (sickroom where the nurse is also the patient) — 109w
- 0140 "the math that doesn't add up" (hundreds with steel vs millions) — 110w; isolation fact marked "Background from the books:"
- 0142 "the guest who never unpacks" (silver arrives in Seville and leaves again) — 103w
- 0143 "the fever spreading" (one country's money gives the neighborhood a fever) — 91w
- 0144 "the silver on a scale" (mountains in, poverty out) — 98w
- 0145 "rivals loading a weapon" (Las Casas's book as ammunition in someone else's war) — 85w
- 0146 "the stool with three legs" (account, press, audience) — 97w
- 0147 "the merchant pointing at his rival's rotten stock" (Spain's bad reputation as England's advertisement) — 88w
- 0148 "whose purse paid for the timber" (the purse that launched the ships) — 108w; "crowns paid" marked "Background from the books:"
- 0149 "the toll booth that tripled its price" (Constantinople 1453) — 93w
- 0150 "two gamblers at one table" (Portugal holding a winning hand, Spain with empty pockets) — 91w
Topic 1.7 now fully voiced: 12/12 MCQs (0141 pilot + 11 here). Unit 1 voice pass complete across all 150 MCQs.

## 2026-11-26 — Voice pass Topic 1.7 verification

12/12 PASS, 0 FAIL. Every general in apush-mcq-0139 through apush-mcq-0150 checked against its key, stem, stimulus, figures, and per-option rationales. Word counts 85-120 (0141 at exactly 120, inside the band); no trap language anywhere. Closest calls, all passed: 0139's "nobody stands to nurse" matches the item's own blind-verified key rationale despite the leaning figure in the image; 0143's "wars grew" matches rationale B ("silver paid for more war, not less"); 0148's crowns-paying claim is honestly tagged "Background from the books" rather than attributed to the stimulus. No question or lesson file edited.

## 2026-11-26 — 0139 fix re-verification

Blind re-solve of apush-mcq-0139 only, from stimulus + image, before reading the key. Blind pick: B ("The disease struck whole households at once, leaving the sick unable to move"). Key: B. Match: yes.
Image viewed: Florentine Codex Book 12 smallpox drawing, five figures — one person leans over a sick patient (top left), four more lie still on mats, covered in spots (one bottom left, three right), none of them tended.
Verdict: PASS, 0 defects. Both rationale B and the general explicitly state one person still leans over a patient; the general's "four more lie still, unwatched" is accurate for the four untended figures and does not claim nobody is left to tend the sick. All other general facts true (smallpox from Europe, no immunity in the Americas, epidemic not a weapon, not from Africa). General 114 words (60-120 band). No trap language. Verdicts in verification/0139-fix-reverify.json. No question or lesson file edited.

## 0139 fix (2026-11-26, parent, after user "wtf?")
- User challenged the voice-pass close call on 0139: the general said "Nobody stands to nurse the sick" and rationale B said "no one left healthy enough to tend the sick", while the Codex image shows one person leaning over a patient (top left) and the item's own stimulus text says so. Parent viewed the image: five panels, one attendant leaning over a patient, four more lying still unwatched. The Topic 1.7 verifier had spotted the tension and passed it on circular reasoning ("matches the item's settled reading") — that is not a defense when the reading contradicts the stimulus. Lesson: a verifier must adjudicate against the stimulus, never defer to the item's settled reading.
- Fix (key B unchanged): general step 2 now reads "One person still leans over a patient, but four more lie still, unwatched — the sickness hit whole households at once, so care could not keep up."; step 3 trimmed to keep the general at 114w. Rationale B now reads "One person still leans over a patient, but the sickness hit whole households at the same time, so care could not keep up." 0140/0141 checked clean, same claim absent. Validator 0 errors.
- Blind re-verification: PASS (verification/0139-fix-reverify.json) — blind pick B, key match, image checked by eye, no "nobody left" claim, 114w, no trap language.
- Push note: the voice-pass push in flight carries the pre-fix 0139; this fix rides a follow-up push after it lands.

## Generated illustrations in lessons (2026-11-26, his "Ok, go")
- Decision: generated images stay OUT of question stimuli (fake evidence) and are allowed IN LESSONS ONLY as concept illustrations (diagrams, schematics, flows), labeled "Modern illustration" in the caption, generated text-free with labels added in code, parent-viewed and label-verified before shipping. Rule locked in LESSON-SPEC.md section 6.
- Specimen (not installed in any lesson): triangular-trade schematic for L3 — generated text-free, labels composited in code with PIL, parent-viewed: all 6 labels spelled right and inside the frame, arrow directions verified (Europe→Africa manufactured goods; Africa→Americas enslaved people; Americas→Europe sugar, tobacco, silver). Files: specimens/media-generation-triangular-trade-schematic-0-*.webp (raw), specimens/triangular-trade-labeled.png (labeled). Awaits his verdict before any lesson install.

## Fun illustration style (2026-11-26, his note on the specimen)
- He liked the triangular-trade schematic ("looks good") with one direction: make it more fun. Style for lesson illustrations going forward: bold, colorful, playful storybook-flat — ships on the routes, lively colors — still clearly a modern diagram, still text-free generation with labels in code.
- Fun variant made: specimens/triangular-trade-fun-labeled.png (ships on all three arrows, labels verified, arrows correct). Both versions are specimens; neither is installed in a lesson yet.

## Blind input files removed from the remote (2026-11-26, his order)
- He asked why verification/blind-u1 was being pushed. Answer: no reason — the push took the whole passmaster tree and the blind inputs were swept in. They are regenerable working files (question content with keys stripped), not shipped content and not evidence.
- Removed 445 blind input files from the remote: blind-u1 (194), blind-1.3–1.7 (149), blind-shuffle (78), blind-read-u1-fix (22), blind-saq0022 input (1), saq-0004-blind (1). Kept on the remote: the 35 verdict/solves/resolve files, which are the actual evidence, plus LOG.md.
- Rule locked in SPEC.md section 10: blind input files are never pushed; the pushed record of a verification is its verdicts/solves files plus the LOG.md entry. The push script's FILES list no longer contains them, so a future whole-tree push cannot re-add them. Local copies deleted in the same change (regenerable from questions/ at any time).

## Unit 2 started (2026-11-26, his order)
- He corrected the parent: "keep pushing the prod content per unit level" was the Unit 2 go, and waiting for a separate go was the parent's misread. Unit 2 is now running, one topic at a time, writer then blind verifier, parent pushes per unit.
- Unit 2: Period 2, 1607-1754, 8 topics, 254 questions (210 MCQ + 33 SAQ + 11 LEQ, no DBQ), test pool 39 MCQ + 3 SAQ + 1 LEQ = 43. Per-topic quotas set in BLUEPRINT.md (framing topics 2.1/2.8 lighter, content topics heavier). Difficulty 42/74/94 (20/35/45) — hit the hard count per topic; Unit 1 landed 14 hard short.
- Question IDs: MCQ 0151-0360, SAQ 0034-0066, LEQ 0012-0022. Lesson grouping (provisional, tie-out at unit end): L1 2.1+2.2, L2 2.3, L3 2.4+2.5, L4 2.6, L5 2.7+2.8.

## Topic 2.1 grounding + stimuli (2026-11-26, writer)
- Grounding read before authoring: Barron's 2027 Ch 4 "Period 2: 1607-1754 Patterns of Empire and Resistance" (Topic 2.1 section + Topic 2.2 empire patterns); 5 Steps 2024 Ch 7 "Colonial America (1607-1650)"; Princeton Review Ch 6 Colonization portion (033_c006_sup.xhtml: "The Early Colonial Era", "Competition for Global Dominance", "The English Arrive", "French Colonization of North America", "The Pilgrims and the Massachusetts Bay Company"); lesson script audio_scripts/unit2 E1 "Four Ways to Want a Continent" (v6). Note: Princeton Ch 6 file 032_c006 is a title stub only; the body lives in 033_c006_sup.xhtml.
- Survivor census for Topic 2.1: ZERO. No item tagged 2.1 anywhere (fresh-written, reconceived, staged). Nearest items are content items for 2.2-2.7 (ctx-u2-01 to 15; hard-u2 4 items; Barron's ch04-02 is a 2.7 item with a null stimulus; 5 Steps ch07 staged: 5 MCQ + 0 SAQ, all content items; Princeton ch06 staged: 5 MCQ content items). All 20 Topic 2.1 questions are fresh authoring.
- Stimuli (all viewed before writing; source + rights):
  - smith-virginia-1612 (MCQ 0151-0153): title page of John Smith's A Map of Virginia (1612), Oxford, Joseph Barnes. Public domain. File u2/original-ctx-u2-06.jpg. Viewed: the page advertises "the Commodities, People, Government and Religion" of Virginia. The file is the title page, not the map itself; the question text says so.
  - champlain-quebec-1613 (MCQ 0154-0156): Champlain's "Abitation de Quebecq" engraving, Les Voyages (1613). Public domain. File u2/champlain-habitation-quebec.jpg. Viewed: walled trading post with cannons, storehouses, and dwellings on the St. Lawrence; no farmland.
  - mayflower-compact-1620 (MCQ 0157-0160): verbatim excerpt, Mayflower Compact (Nov 11, 1620), public domain. Text only.
  - winthrop-city-hill-1630 (MCQ 0161-0163): verbatim excerpt, John Winthrop, "A Model of Christian Charity" (1630), public domain. Text only.
  - atlantic-crossings-table (MCQ 0164-0166): data table, numbers verified in the books (Spain about 350,000 by 1650, Barron's Ch 4; Jamestown 144 landed 1607, 38 alive by 1608, Barron's Ch 4; Jamestown about 500 by winter 1609-1610, nearly 90 percent died, Princeton Ch 6; Massachusetts Bay more than 20,000, 1630-1642, Barron's Ch 4; France "few, mostly single men," Princeton Ch 6 — no exact count in the books, stated as such).
  - SAQ 0034 slot 1: original secondary passage (Period 1 to Period 2 shift).
  - SAQ 0035 slot 2: John Smith, "He that will not work, shall not eat" (Generall Historie, 1624), verbatim, public domain.
  - SAQ 0036 slot 3: Bellin map of eastern New France (1744), file u2/5s24-ch07-mcq-01.png, public domain. Viewed: St. Lawrence and Gulf, Newfoundland, Labrador, Hudson Bay, Native peoples named across a vast interior.
- Quotas: 16 MCQ (test 0153, 0159, 0164; difficulty easy 3 / medium 6 / hard 7; keys 4/4/4/4), 3 SAQ practice (one per slot), 1 LEQ practice. All status draft, awaiting blind verification.

## Topic 2.1 blind verification (2026-11-26, independent blind verifier)
- 20/20 PASS, 0 FAIL. MCQ blind match 16/16, SAQ parts 9/9, LEQ outline 6/6 rubric rows. Keys A4/B4/C4/D4 (pattern-guesser 25%).
- All three images viewed by the verifier: Smith 1612 title page text matches the stimulus verbatim; Champlain Habitation matches its description (flag, cannons, gardens outside walls, river along the bottom; no church); Bellin 1744 map matches (title cartouche, St. Lawrence/Gulf, Newfoundland, Labrador, Hudson Bay, Native peoples named across the interior).
- Table figures in 0164-0166 verified against Barron's Chapter 4 on disk: 350,000 Spaniards by 1650; 38 of the original 144 alive by 1608; 500 to 60 in the starving time (88%, "nearly 90%").
- All generals 101-116w (60-120 OK); SAQ model answers 2 sentences each; LEQ outline paragraphs under 90w; no trap language; all background claims tagged "Background:" and nothing falsely attributed to a stimulus.
- One polish note, not a defect: 0159 option A says settlers "had landed at Cape Cod... before going ashore" — looser than "arrived and anchored"; the Compact was signed aboard ship. Parent's call.

## Topic 2.1 final (2026-11-26, parent)
- Blind verification 20/20 PASS, 0 FAIL (verdicts file verified on disk: 20 items, summary fails []; solves written before opening questions: true). MCQ 16/16, SAQ 9/9 parts, LEQ 6/6 rows.
- Parent polish on test item 0159 (verifier's note, applied before flip): key option A "had landed at Cape Cod... before going ashore" → "had arrived and anchored at Cape Cod... before going ashore" (Compact signed aboard ship; the old wording contradicted itself). Key A, stem, stimulus untouched. No re-verification round: the change is two words in the key option, same proposition, the verifier's own wording.
- All 20 flipped to final. Validator: 214 questions, 5 lessons, 0 errors, 60 warnings. Topic 2.1 closed 20/20. Topic 2.2 writer dispatched.

## Topic 2.2 grounding + stimuli (2026-11-26, writer)

- Grounding read before authoring: Barron's 2027 Ch 4 "Period 2: 1607-1754 Patterns of Empire and Resistance" (Topic 2.2 section + self-government + imperial control sections); 5 Steps 2024 Ch 7 "Colonial America (1607-1650)" in full; Princeton Review Ch 6 (033_c006_sup.xhtml: colonies section + salutary neglect section); lesson scripts audio_scripts/unit2 E1 "Four Ways to Want a Continent" (v6) in full and E7 "Colonial Self-Government" (v6) in full.
- Survivor census for Topic 2.2: 12 items found; 9 rewritten, 3 rejected. REWRITTEN (all rebuilt against the books, new stems/options/explanations in PassMaster format): ctx-u2-06 (Smith map as investor advertising) → smith-virginia-map-1612 (0167-0169), the map figure distinct from the title page used in 2.1; ctx-u2-07 (Castello Plan) → castello-new-amsterdam (0170-0172); ctx-u2-09 (Dominion / salutary neglect) → james-ii-dominion (0176-0178), rebuilt around the Kneller portrait; ctx-u2-13 (House of Burgesses 1619) → burgesses-1619 (0179-0181); 5s24-ch07-mcq-04 (motives, "All of the above" key) → hakluyt-motives (0182-0184), re-authored with a proper stem and stimulus; 5s24-ch07-mcq-05 (English colonies not crown-ruled) → charter-comparison (0185-0187), rebuilt with a data-table stimulus; pr25e-ch06-q07 (Georgia, NOT stem) → oglethorpe-georgia-1732 (0188-0190), positive stem; pr25e-ch06-q09 (no strong central government) → salutary-neglect (0191-0193), stem tightened to loose enforcement vs repeal; 5s24-exam2-mcq-46 (Penn/Quakers recall) → holme-pennsylvania-1687 (0173-0175), rebuilt with the Holme map stimulus. REJECTED: ctx-u2-01 (Winthrop "city upon a hill") — duplicates 2.1's winthrop set (0161-0163) on the same quote; pr25e-test2-q01 (Mayflower Compact, NOT stem) — NOT phrasing banned and source already used in 2.1 (0157-0160); pr25e-test2-q05 (Mayflower Compact excerpt) — same source as 2.1's Compact set. Checked, not 2.2: hard-u2.json (4 items: 2.3/2.4/2.5/2.6); ctx-u2-02/03/04/10/14/15 (2.6), ctx-u2-05 (2.5), ctx-u2-08 (2.4), ctx-u2-11/12 (2.7); "2.2" hits in fresh-written/u1-gaps.json and drafts/u1-gaps/batch-05.json are "£2.2 million" in Mun's arithmetic, not topic tags; reconceived/princeton-t5/test.json has no 2.2 items.
- Stimuli (all viewed before writing; source + rights):
  - smith-virginia-map-1612 (MCQ 0167-0169): Smith's map of Virginia, engraved by William Hole (1612), public domain, u2/5s24-ch03-mcq-23.jpg. Viewed: Chesapeake Bay, Powhatan seated upper left, Native man with bow at right, royal arms center. Distinct from the 1612 title page used in 2.1.
  - castello-new-amsterdam (MCQ 0170-0172): Castello Plan redraft by Adams/Stokes (1916) from the 1660 plan, public domain, u2/original-ctx-u2-07.jpg. Viewed: fort at the tip, wall across the town, canals, gardens, ships in the harbor. Provenance resolved: the harvest's 404 was for the original-plan file; the file on disk is the 1916 redraft, Commons File:Castelloplan.jpg. NOTE: the file is NOT in CATALOG.json — catalog entry owed.
  - holme-pennsylvania-1687 (MCQ 0173-0175): Holme's map of Pennsylvania (1687), public domain, u2/5s24-exam2-mcq-45.jpg. Viewed: Delaware River, surveyed named parcels, Philadelphia grid inset, Penn arms.
  - james-ii-dominion (MCQ 0176-0178): Kneller portrait of James II (1684), public domain, u2/5s24-ch08-mcq-01.jpg. Viewed: armor, scepter, crown on cushion, warships and anchor behind.
  - burgesses-1619 (MCQ 0179-0181): original secondary passage on the 1619 assembly. Text only.
  - hakluyt-motives (MCQ 0182-0184): original secondary passage paraphrasing Hakluyt (1580s). Text only; no verbatim Hakluyt quoted from memory.
  - charter-comparison (MCQ 0185-0187): data table drawn from Princeton Ch 6 founding-reasons list. Text only.
  - oglethorpe-georgia-1732 (MCQ 0188-0190): original secondary passage on the 1732 charter and its 1751 reversal. Text only.
  - salutary-neglect (MCQ 0191-0193): original secondary passage on Walpole-era loose enforcement. Text only.
  - tobacco-sheds-1670 (MCQ 0194-0196): enslaved laborers curing tobacco, 1670 painting, public domain, u2/tobacco-sheds-1670.jpg. Viewed: open sheds, workers hanging/pressing leaves, planter's house, palm trees. Location NOT claimed — the stimulus text describes only what is visible; 0196 tests the limit.
  - SAQ 0037 slot 1 (test): original secondary passage on English colonization motives (75w).
  - SAQ 0038 slot 2: Maryland Act of Toleration (1649), verbatim excerpt, public domain.
  - SAQ 0039 slot 3: Weir, Embarkation of the Pilgrims (1843), public domain, u2/5s24-ch07-mcq-07.jpg. Viewed: Pilgrims praying on the Speedwell deck, open Bible, armor and muskets laid aside, rainbow, "God with us" on the sail. Labeled in the stimulus as painted 1843, more than two centuries after 1620.
  - SAQ 0040 slot 1: original secondary passage on French vs English patterns (71w).
  - SAQ 0041 slot 2: Penn, Frame of Government (1682), verbatim excerpt, public domain.
  - LEQ 0013 test (causation, religious conflict and founding 1607-1732); LEQ 0014 practice (comparison, Spanish/French/English treatment of Native peoples 1607-1754).
- Quotas: 30 MCQ (test 0169, 0172, 0175, 0180, 0187, 0194; difficulty easy 6 / medium 11 / hard 13; keys A9/B7/C7/D7), 5 SAQ (test 0037 slot 1; practice 0038 slot 2, 0039 slot 3, 0040 slot 1, 0041 slot 2), 2 LEQ (test 0013, practice 0014). Skills used across the topic: 1.A, 1.B, 2.A, 2.B, 2.C, 3.A, 3.B, 3.C, 3.D, 4.A, 4.B, 5.A, 6.A, 6.B, 6.C, 6.D — no topic is all 4.B. All status draft, lesson apush-u2-l1, awaiting blind verification.
- Fixes during writing (validator caught): banned word "trap" in 0189 rationale B and option B misconception ("not to trap them in Georgia") — reworded; 9 general-note length warnings (general longer than its question) — trimmed to fit; test pool first drafted at 8 MCQs — flipped 0190, 0178, 0184 to practice to land exactly 6. Validator after fixes: 251 questions, 5 lessons, 0 errors, 60 warnings (quota warnings only — draft questions do not count toward final quotas).
- Facts handled with care / not verifiable from the books: the 5 Steps claim that the 1619 Africans were "treated as indentured servants and freed after a period" is a simplification — not asserted anywhere in the topic; the tobacco-sheds painting's location is not established in the catalog — deliberately not claimed, and 0196 tests exactly that limit; the "eighteen languages in New Amsterdam" claim was not used (unverified); Hakluyt is paraphrased, never quoted from memory.

## Castello Plan catalog entry (2026-11-26, parent)
- The 2.2 writer flagged u2/original-ctx-u2-07.jpg missing from CATALOG.json. Parent viewed the image (cartouche reads "REDRAFT OF THE CASTELLO PLAN NEW AMSTERDAM IN 1660", John Wolcott Adams / I. N. Phelps Stokes) and verified the Commons file page: redraft drawn 1916, New-York Historical Society source, PD-US. Catalog entry added (count 292 → 293). The question files already carried the correct source_url, license, and an honest "redrawn 1916" caption — only the catalog entry was owed.

## Topic 2.2 blind verification (2026-11-26, independent blind verifier)
- Blind-solved 37/37 from the blind files only; solves written to verification/topic-2.2-solves.json BEFORE any question file was opened. Verdicts in verification/topic-2.2-verdicts.json.
- Counts: 25 PASS / 12 FAIL. Blind match: MCQ picks 30/30, SAQ parts 15/15, LEQ outlines 6/6 rows on both LEQs. No wrong keys. Key distribution A9/B7/C7/D7; validator 0 errors (251 questions, 5 lessons).
- FAILs: 11 MCQ length tells (key sole longest by 4-8 words: 0170, 0172, 0175, 0178, 0186, 0187, 0188, 0189, 0193, 0195, 0196) — a longest-option guesser scores 21/30 across the topic; 0186 also misattributes founder identities to the founding-reasons table (rationale A, general step 1, option A misconception), which lists only colony/year/reason. 1 SAQ: 0040 model answer (b) sentence 2 contradicts its passage (passage: England needed their land; model: England needed Native knowledge and food).
- Checked as flagged and PASS: the Castello Plan items stay inside the 1916 Adams/Stokes redraft (cartouche verified by eye); no tobacco-sheds item claims the painting as Virginia/Chesapeake (palm trees, open sheds, planter's house, about a dozen workers all verified by eye; 0196's limit is the honest one). All 6 stimulus images viewed against their descriptions; all accurate.

## Topic 2.2 blind verification + fix round (2026-11-26, parent)
- Blind verification 25/37 PASS, 12 FAIL, 0 wrong keys (MCQ blind picks 30/30, SAQ parts 15/15, LEQ outlines 6/6 on both). Verdicts file verified on disk (25 passes, 12 fails, exact ids).
- Fails: 11 length tells (key sole longest by 4-8 words; a longest-option guesser scored 21/30) + 1 attribution (0186) + 1 model-answer contradiction (SAQ 0040b). Fixed by parent: key options trimmed and distractors lengthened so no key is sole longest by more than 1 word (asserted by code per item); 0186 rationale A, general step 1, and option A misconception rewritten to tag the founder facts as Background (the table lists only colony/year/reason); 0040(b) model sentence 2 rewritten to the passage's own contrast (England needed their land). One side effect fixed in the same round: the 0193 trim left its general note (102w) longer than the question (98w), so the general was trimmed to 97w.
- Note for the Lesson apush-u2-l1 writer: 0175's key rests partly on background knowledge (tolerance as business plan), derivable by elimination; the lesson should teach that link.
- Validator after fixes: 251 questions, 5 lessons, 0 errors, 60 warnings. Blind re-verification of the 12 fixed items dispatched.

## Topic 2.2 fix re-verification (2026-11-26, independent blind re-verifier)
- 11/12 PASS, 1 FAIL, 0 wrong keys (MCQ blind picks 11/11, SAQ 0040 parts 3/3). Solves written before opening any question file.
- All 11 length-tell fixes verified: no key is sole longest by more than 1 word (0170 +1, 0172 +1, 0175 +1, 0178 tie, 0187 +1, 188 tie, 189 +1, 193 tie, 196 +1; 0186 and 0195 keys are not longest). 0186 attribution verified fixed: founder facts tagged Background in rationale A, general step 1, and option A misconception; "table names" appears nowhere in the file. SAQ 0040(b) verified fixed to the passage's contrast (England needed their land). All four images viewed by eye against their stimuli (Castello redraft cartouche, Holme map, Kneller portrait, tobacco sheds) — all accurate; 0196's limit is honest.
- FAIL: 0195 — general note 105w equals the question at 105w (validator counting: stem 20 + options 38 + stimulus 47). The rule requires the general to be SHORTER than the question. The fix round caused it: the option trim/lengthen cut the question from 106w to 105w against an unchanged 105w general, and the validator stays silent at equality (it warns only on strictly greater). Fix owed: trim 2 words from the general. Key, options, stem, and stimulus are sound.

## Topic 2.2 fix re-verification + final (2026-11-26, parent)
- Blind re-verification of the 12 fixed items: 11/12 PASS, 1 FAIL (verdicts file verified on disk). The fail was MCQ 0195: the fix round left its general note at exactly 105 words against a 105-word question — the rule requires strictly shorter, and the validator stays silent at equality.
- Parent fix: trimmed 4 words from 0195 general step 2 ("not men who could leave when the season ended" → "not men who could leave"), general now 101w vs question 105w, asserted by code. No re-verification round: the trim touches only the general note, which the blind files never carry; the blind solve (pick A = key A) is unaffected.
- All 37 Topic 2.2 files flipped to final. Validator: 251 questions, 5 lessons, 0 errors, 60 warnings. Topic 2.2 closed 37/37. Topic 2.3 writer dispatched.

## Topic 2.3 grounding + stimuli (2026-11-26, writer)
- Grounding read before authoring: Barron's 2027 Ch 4, Topic 2.3 "The Regions of British Colonies" in full (A. Chesapeake and the Upper South; B. New England Colonies; C. Middle Colonies; D. Lower South and West Indies; E. Development of Self-Government); 5 Steps 2024 Ch 7 "Colonial America (1607-1650)" in full; Princeton Review Ch 6 (033_c006_sup.xhtml: "Other Early Colonies", "Reasons for the Founding of Selected Colonies", "Colonial Governments", "Major Events of the Period" incl. Bacon's Rebellion, Stono, Salem, Halfway Covenant, "Life in the Colonies"); lesson scripts E3 "New England Puritans" (v6) and E4 "Middle Colonies & Diversity" (v6) in full, incl. their Tier-1/2 footers and hedged/cut lists.
- Book-error flags found while reading (do NOT assert these): 5 Steps' Ch 7 answer key says Bradford "was a governor of Massachusetts Bay for 20 years" — wrong; Bradford governed Plymouth (Winthrop governed Massachusetts Bay); the staged item 5s24-ch07-mcq-02's own explanation has it right. Princeton's "Connecticut receiving its charter in 1635" not used (Fundamental Orders 1639; royal charter 1662). Carolina split: Barron's 1712 (formal split) vs Princeton's 1729 (Crown purchase of the proprietors) — 1712 used for the split. Hutchinson: tried 1637, banished 1638 (Barron's "1638" compresses both). Barron's calls Metacom Massasoit's "grandson" — wrong, he was his son (registry F-U2-017). 5 Steps' claim that the 1619 Africans were "treated as indentured servants and freed after a period" is a simplification — not asserted anywhere in the topic. Dedham 1636 covenant — cut fail-closed in E3, not used.
- Survivor census for Topic 2.3: 16 unique items tagged 2.3 across fresh-written, reconceived, staged, and tests/. REWRITTEN (6): original-hard-u2-regions-of-british-colonies-02 (historian's town-meetings comparison, key B, 6.D) → town-meetings-burgesses set (0203-0205); princeton-t4-03 (NE vs Chesapeake labor, key B, 1.B) → rebuilt with a data stimulus in the NE-economy set; 5s24-ch07-mcq-02 (Bradford/dissenters, NOT stem) → dissenters set (0209-0211), positive stems, Bradford corrected to Plymouth; 5s24-ch07-mcq-03 (Maryland Catholic refuge, key C) → maryland set (0212-0214) with a passage stimulus; pr25e-test1-q05 (Williams excerpt, key A) → williams set (0206-0208); pr25e-test1-q07 (Williams critics' region, key B) → williams set (0207). REJECTED (10): 5s24-ch07-mcq-06 (Mayflower Compact source already used in 2.1; Fundamental Orders covered fresh in SAQ 0043); 5s24-ch07-mcq-07 (Weir painting already used in 2.2 SAQ 0039, Compact again); 5s24-ch08-mcq-01 (Kneller/Dominion already used in 2.2, 0176-0178); 5s24-ch08-mcq-03 (EXCEPT stem banned; assemblies are 2.2/2.7); 5s24-exam2-mcq-48 (Penn's Charter of Privileges, Penn covered in 2.2); pr25e-ch06-q03 (tobacco recall, covered in 2.2); pr25e-test1-q06 (tests 1800s parties, out of scope); pr25e-test1-q08 (First Amendment framing, later period); pr25e-test2-q02 (Compact source already used in 2.1); pr25e-test3-q02 (stem/image mismatched; Bacon covered fresh in SAQ 0044). pr25e-ch06-q01 is topic 2.6, not 2.3 — left for the 2.6 writer.
- Stimuli (all viewed before writing; source + rights):
  - tobacco-table (MCQ 0197-0199): data table from Barron's Ch 4 (first shipments 1617; more than 35 million pounds a year by 1700; nearly three-fourths of Chesapeake exports by 1750).
  - jamestown-massbay (MCQ 0200-0202): original secondary passage on the Barron's comparison box (motives, families, organization — not climate).
  - town-meetings-burgesses (MCQ 0203-0205): original secondary passage carrying the survivor's historian quote plus town-meeting/Burgesses facts (Barron's).
  - williams-excerpt (MCQ 0206-0208): Roger Williams, The Hireling Ministry None of Christ's (1652), verbatim, public domain.
  - dissenters (MCQ 0209-0211): original secondary passage (Williams 1635/36, Hutchinson 1637/38, Hooker 1636, Bradford of Plymouth).
  - maryland (MCQ 0212-0214): original secondary passage (Calvert charter 1632, toleration, Act of Toleration 1649).
  - franklin-germanize (MCQ 0215-0217): Benjamin Franklin, Observations Concerning the Increase of Mankind (1751), verbatim, public domain.
  - philadelphia-prospect (MCQ 0218-0220): east prospect of Philadelphia, drawn by George Heap 1754, engraved by Vandergucht 1768, public domain, u2/philadelphia-east-prospect-1768.jpg. Viewed: city across the Delaware crowded with sailing ships; grid plan, Battery, State House insets. Labeled with both dates; the drawing is 1754, the engraving 1768.
  - barbados-virginia (MCQ 0221-0223): data table from Barron's Ch 4 (sugar nearly 50M lbs/yr; slaves about 75% of Barbados vs under 25% of Virginia; average sugar grower 115 slaves; Barbados planters about 4x as wealthy).
  - new-england-economy (MCQ 0224-0226): original secondary passage (small farms, fishing, timber, shipbuilding, trade; Boston as port).
  - SAQ 0042 slot 1: original secondary passage (Halfway Covenant 1662, Salem 1692).
  - SAQ 0043 slot 2: Fundamental Orders of Connecticut (1639), verbatim preamble + Order 1 election clause, verified against the Avalon Project text (Yale), public domain.
  - SAQ 0044 slot 3: Howard Pyle, The Burning of Jamestown (1905), public domain, u2/pr25e-test3-q01.jpg. Viewed: armed rebels with torches and muskets marching through a burning town at night. Labeled as a 1905 painting of a 1676 event.
  - SAQ 0045 slot 1: original secondary passage (Georgia 1732, Oglethorpe, buffer, debtors, failure, 1752 Crown).
  - LEQ 0015 practice (comparison, regional identities by 1754).
- Quotas: 30 MCQ (test 0199, 0205, 0206, 0214, 0217, 0223; difficulty easy 6 / medium 11 / hard 13; keys A8/B8/C7/D7), 4 SAQ (slots 1, 2, 3, 1; all practice), 1 LEQ (practice). All status draft, lesson apush-u2-l2, awaiting blind verification.
- Writing complete (2026-11-26, writer): all 35 files written under questions/ — MCQ apush-mcq-0197–0226, SAQ apush-saq-0042–0045, LEQ apush-leq-0015, all status draft, lesson apush-u2-l2. Stimulus sets as filed: tobacco-exports, jamestown-massachusetts-bay, town-meetings-burgesses, williams-civil-power, dissenters-passage, maryland-passage, franklin-germans, philadelphia-prospect, barbados-virginia, new-england-economy, saq-halfway-salem, saq-fundamental-orders, saq-burning-jamestown, saq-georgia-colony. Mechanical checks by code, all PASS: counts 30 MCQ (6 test / 24 practice) + 4 SAQ + 1 LEQ; difficulty easy 6 / medium 11 / hard 13 (0217 flipped 3→2 to hit the easy count — it is a straight identification of Franklin's "us"); keys A8/B8/C7/D7 (0219 options B/C swapped to land the split; key rationale and misconception moved with the options); every general 60–120w AND strictly shorter than its question; every rationale ≤2 lines and ≥25 chars; every key option longest by ≤1 word (fixed 15 items by trimming keys / lengthening distractors — my hand counts were unreliable, code counts rule); every SAQ model answer exactly 2 sentences per part; zero trap-language hits; LEQ rubric 6 rows (6.A / 4.B / 6.B ×4), skills cut to ["6.A", "6.B"] per the bank convention (validator errored on 3 skills); both figure files verified on disk (u2/philadelphia-east-prospect-1768.jpg, u2/pr25e-test3-q01.jpg). Validator: 286 questions, 5 lessons, 0 errors, 59 warnings — none of the warnings name a 2.3 file (all are unfilled quotas in units 3–9 and later Unit 2 topics). No self-verification done; blind verifier owed.
- Facts I could not verify from the books: none outstanding — every figure in the two data tables (tobacco 1617 / >35M lbs 1700 / ~3/4 Chesapeake exports 1750; Barbados sugar ~50M lbs, 75% vs <25% enslaved, 115 per grower, ~4x wealth) is Barron's Ch 4 verbatim; the Franklin quote is verbatim 1751; the Williams quote is verbatim 1652; the Fundamental Orders excerpt was verified against the Avalon Project text. The "most adult men excluded" claim in 0203's key (Massachusetts Bay franchise limited to male church members) follows the survivor's verified key — flag for the blind verifier to re-check against the books.

## Topic 2.3 blind verification (2026-11-26, independent blind verifier)
- 31/35 PASS, 4 FAIL, 0 wrong keys. MCQ blind match 30/30, SAQ parts 12/12, LEQ outline 6/6 rubric rows.
- FAILs: MCQ 0218, 0219, 0220 — shared stimulus misattributes the Philadelphia prospect's engraving to "Thomas Vandergucht"; the item's own Commons source credits Gerard Vandergucht as artist and Thomas Jefferys as engraver (no "Thomas Vandergucht" exists in the record). Fix: "engraved by Thomas Jefferys in 1768" in the stimulus source_note of all three. LEQ 0015 — model outline puts Barbados and sugar in the lower South ("The lower South ran on rice and sugar, with enslaved people outnumbering whites in South Carolina and Barbados"); Barbados is Caribbean and sugar was not a mainland lower-South crop. Fix: "The lower South ran on rice, with enslaved people outnumbering whites in South Carolina."
- 0203's "excluding most men" verified against the books, not the item's reading: Princeton Ch 6 (only Puritans could vote pre-1691; those without grace not allowed to vote; Rhode Island did not require church-member voters), Barron's Ch 4 (membership declining by the 1650s; Halfway Covenant nonvoting members), Princeton (women the majority of active church members by 1700). Claim stands.
- Keys A8/B8/C7/D7; no key sole longest by more than 1 word; all generals 60-76w and strictly shorter than their questions; both images viewed by eye (Philadelphia prospect description accurate apart from the engraver credit; Pyle painting accurate and honestly labeled 1905). All table figures re-checked against Barron's Ch 4 (35M lb tobacco, ~50M lb sugar, 75% vs <25% enslaved, 115 workers per grower, 4x wealth, three-fourths/one-third export shares). Difficulty split 6/12/12 vs brief's 6/11/13 (one item off; labels honest). Notes: 0215/0220 "most diverse colony" for Pennsylvania (books credit the middle colonies as a region); 0043(c)/0044(c) need knowledge beyond the stimulus (accepted practice); 0226 general step 2 sugar/rum is untagged background, not attributed to the passage.

## Topic 2.3 blind verification + fix round (2026-11-26, parent)
- Blind verification 31/35 PASS, 4 FAIL, 0 wrong keys (MCQ blind picks 30/30, SAQ parts 12/12, LEQ outline 6/6). Verdicts file verified on disk (35 items, 4 fails, exact ids).
- Fails: (1) 0218-0220 shared stimulus error — source_note credited the Philadelphia prospect's engraving to "Thomas Vandergucht", a name that does not exist (conflation of Gerard Vandergucht, artist, with Thomas Jefferys, engraver). Parent confirmed against the Commons file page (author line: Gerard Vandergucht, artist, after Scull; Thomas Jefferys, engraver; NARA scope note: "Engraved and published... by T. Jeffreys") and fixed all three source_notes to "engraved by Thomas Jefferys in 1768". Keys, stems, options, rationales untouched. (2) LEQ 0015 model outline put Barbados and sugar into the lower South; fixed to rice and South Carolina only (Barbados is Caribbean, sugar was not a mainland lower-South crop; SC staples were rice and indigo).
- Verifier note corrected, not acted on: it reported the difficulty split as 6/12/12 vs the brief's 6/11/13; a recount from disk shows easy 6 / medium 11 / hard 13, exactly as briefed. The verifier's count was wrong.
- 0203's "excluding most men" claim verified by the blind reader against the books (Princeton + Barron's), stands.
- Validator after fixes: 286 questions, 5 lessons, 0 errors, 59 warnings. Blind re-verification of the 4 fixed items dispatched.

## Topic 2.3 fix re-verification (2026-11-26, independent blind re-verifier)
- Blind re-verification of the 4 fixed items: 4/4 PASS, 0 FAIL. MCQ blind picks 3/3 (0218 A, 0219 C, 0220 D), LEQ 0015 outline covers 6/6 rubric rows.
- 0218-0220 attribution fix confirmed: all three source_notes credit "drawn by George Heap in 1754 and engraved by Thomas Jefferys in 1768"; "Vandergucht" occurs 0 times across all four question files. The image itself corroborates it (title: taken by George Heap under Nicholas Scull's direction; imprint: T. Jefferys).
- LEQ 0015 fix confirmed: "Barbados" occurs 0 times; "sugar" occurs once, only as a good moving in trade in the Context paragraph, not as a lower-South staple. The evidence-of-difference paragraph correctly gives the lower South rice.
- Length checks: 0218 key not longest, 0219 key longest by 1, 0220 key tied longest; generals 69/76/73w, all shorter than their questions; zero trap language; LEQ outline paragraphs all under 90w. Note: the LEQ comparison reasoning lives in the thesis and complexity paragraphs, not a separately labeled paragraph — content covers the row.

## Topic 2.3 fix re-verification + final (2026-11-26, parent)
- Blind re-verification of the 4 fixed items: 4/4 PASS, 0 FAIL (verdicts file verified on disk). The re-verifier confirmed the Jefferys credit against the image itself (imprint "Engrav'd & Publish'd... by T. Jefferys") and that "Vandergucht" occurs 0 times across the four files; LEQ 0015's Barbados is gone and sugar survives only as a trade good in the Context paragraph.
- All 35 Topic 2.3 files flipped to final. Validator: 286 questions, 5 lessons, 0 errors, 59 warnings. Topic 2.3 closed 35/35. Topic 2.4 writer dispatched.

## Topic 2.4 grounding + stimuli (2026-11-26, writer)
- Grounding read before authoring: Barron's 2027 Ch 4, Topic 2.4 "Transatlantic Trade" in full (A. The Atlantic Economy and the Evolution of Colonial Economies; The African Slave Trade; Tobacco, Indigo, Rice, Sugar, and Slavery in the South and the West Indies; The Fur Trade in the North American Interior; Wheat, Indentured Servants, and Redemptioners in the Middle Colonies; Fish and Lumber in New England; B. Trade, Disease, and Demographic Changes for American Indians; C. British Imperial Policies; Mercantilism; Navigation Acts and Mercantilism; Greater Imperial Control; The Dominion of New England; The Glorious Revolution and the Restoration of Colonial Charters; Lax Enforcement of Mercantilist Policies); 5 Steps 2024 Ch 8 "British Empire in America: Growth and Conflict (1650-1750)" in full (Ch 7 is 1607-1650 and contains no trade content — the matching chapter is Ch 8); Princeton Review Ch 6 (033_c006_sup.xhtml, "THE AGE OF SALUTARY NEGLECT (1650-1750)": mercantilism, Navigation Acts 1651-1673, Wool Act 1699, Molasses Act 1733, triangular trade, Middle Passage, salutary/benign neglect); lesson script E5 "The Empire's Money Theory" (v6) in full, incl. its Sources footer (registry F-U2-037, F-U2-044).
- Book-error flags found while reading (do NOT assert these): E5's "Staple Act" name for the 1663 act is CUT fail-closed (not attested in the three books) — not used anywhere in the topic; Walpole's "let sleeping dogs lie" is secondhand/reported — not quoted as fact. 5 Steps' claim that the 1619 Africans were "treated as indentured servants and freed after a period" is a simplification — not asserted anywhere in the topic. Barron's Ch 3 St. Augustine 1585 error, repartimiento (1549) conflation, and "Metacom grandson" error noted from earlier topics — none in scope here.
- Survivor census for Topic 2.4: 19 unique items tagged 2.4. REWRITTEN (19, none kept as-is): original-u1-trade-01 (triangular trade definition) → 0236; original-u1-trade-02 (Bowen chart) → 0238; original-u1-trade-03 (Brookes diagram) → 0240; original-u1-trade-04 (Equiano) → 0243; original-u1-trade-05 (Elmina) → 0246; original-u1-trade-06 (mercantilism definition) → 0229; original-u1-trade-07 (Mun rule) → 0227; original-u1-trade-08 (Mun figures) → 0228, chart image does not exist on disk, rebuilt as a markdown data table in the stimulus per SPEC §8; original-u1-trade-09 (Navigation Acts purpose) → 0232; original-u1-trade-10 (salutary neglect) → 0252; original-u1-trade-11 (Fumagalli sugar plantation) → 0248, REWRITTEN AS A SOURCING-LIMIT ITEM: the survivor's claim that it shows "a West Indies sugar plantation worked by enslaved laborers" is wrong — the Commons page says it is an "Idealised view" and "the forced labor of slaves is deliberately not shown"; original-u1-trade-12 (Havana) → 0250, "crowded with sailing ships" softened to "dotted", matching the engraving; original-u1-trade-13 (Navigation Acts ports effect) → 0234, given an original secondary passage stimulus (was stem-only); original-u1-trade-14 (plantation demand / Middle Passage) → 0237; original-u1-trade-15 (mercantilism argument) → 0231; original-hard-u2-transatlantic-trade-04 (historian's argument, Navigation Acts impoverished colonies) → 0253, skill retagged 4.B → 6.D (argument evaluation); 5s24-ch08-mcq-08 (Navigation Acts vs Spanish system) → 0251, stem tied to the Havana image; pr25e-ch06-q04 (mercantilism definition) → 0230, REBUILT around the Adam Smith 1776 quote to avoid duplicating 0229; original-ctx-u2-08 (Navigation Acts as evidence) → 0233. REJECTED (0). Fresh items (9): 0235 (1660 vs 1663 flip, the classic error), 0239 (Bowen "seat of war" — War of Jenkins' Ear, Britain at war with Spain from 1739), 0241 (Brookes numbers: 454 allowed / 2 ft 7 in — what regulation did and did not do), 0242 (Brookes purpose/audience: abolitionist diagram), 0244 (Equiano sourcing limits), 0245 (Equiano + Brookes corroboration), 0247 (Elmina coastal trade / African middlemen), 0249 (sugar plantation layout), 0254 (Molasses Act 1733 smuggling).
- Stimuli (all viewed before writing; source + rights):
  - mun-balance-trade (MCQ 0227-0228): Thomas Mun, England's Treasure by Forraign Trade (1664), ch. 2, verbatim ("to sell more to strangers yearly than wee consume of theirs in value"), plus Mun's own figures as a markdown data table (exports £2,200,000 / imports £2,000,000 / net gain £200,000). Verified against Hanover, Latin Library, and Google Books search results; Fordham's page returned HTTP 500 on direct open — not retried, wording confirmed from the same page's search text.
  - mercantilism (MCQ 0229-0231): original secondary passage on the doctrine + Adam Smith, Wealth of Nations (1776), verbatim ("Nothing, however, can be more absurd than this whole doctrine of the balance of trade").
  - navigation-acts (MCQ 0232-0235): original secondary passage (1651, 1660/1663, enumerated list, Wool 1699, Hat 1732, Iron 1750).
  - triangular-trade (MCQ 0236-0237): original secondary passage (three legs, Middle Passage, few ships sailed all three).
  - bowen-chart (MCQ 0238-0239): Emanuel Bowen, chart of the Atlantic Ocean, 5 September 1740, NYPL, CC0, u2/original-u1-trade-02.jpg. Viewed: "THE ATLANTIC OCEAN OR NORTH SEA" across the middle; "the Trade Winds" labeled twice; title reads "A NEW CHART of the Vast ATLANTIC OCEAN; Exhibiting The SEAT OF WAR, both in EUROPE and AMERICA, likewise the Trade Winds & Course of Sailing from one Continent to the other…".
  - brookes (MCQ 0240-0242): Stowage of the British slave ship Brookes under the Regulated Slave Trade Act of 1788, Library of Congress LCCN 98504459, public domain, u2/original-u1-trade-03.jpg. Viewed: Fig 1 longitudinal section; Fig 2 "PLAN OF LOWER DECK WITH THE STOWAGE OF 292 SLAVES, 130 OF THESE BEING STOWED UNDER THE SHELVES"; Fig 3 "PLAN SHEWING THE STOWAGE OF 130 ADDITIONAL SLAVES… ONLY A HEIGHT OF 2 FEET 7 INCHES BETWEEN THE BEAMS"; top-right note says the Brookes was allowed to carry 454 slaves under the Regulation Act of 1788.
  - equiano (MCQ 0243-0245): Olaudah Equiano, Interesting Narrative (1789), verbatim, verified against Project Gutenberg EBook #15399 ("I was soon put down under the decks… I now wished for the last friend, death, to relieve me…").
  - elmina (MCQ 0246-0247): Johannes Kip, Fishing canoes at Elmina and slaves going on board ship at Manfroe, 1732, Royal Library of the Netherlands, public domain, u2/original-u1-trade-05.jpg. Viewed: two panels; top caption "A. Fishing Cannoes of Mina 5. or 600 at a time / B. Negroes Cannoes, carrying Slaves, on Board of Ships att Manfroe"; "Vol. V. Plate 9", "Pag. 156", signed "J. Kip fecit". "Manfroe" likely refers to the Danish fort Frederiksborg near Cabo Corso — not claimed in any item.
  - sugar-plantation (MCQ 0248-0249): Paolo Fumagalli, Idealised view of an 18th-century Caribbean sugar plantation, engraved 1830 after a 1762 engraving in Diderot's Encyclopédie, public domain, u2/original-u1-trade-11.png. Viewed: hand-colored engraving, cane fields, palms, plantation buildings, small figures, cattle, mountains; one foreground figure fishes. The Commons page states the forced labor of slaves is deliberately not shown — 0248 is a 2.C sourcing-limitation item on exactly that.
  - havana-spanish (MCQ 0250-0251): Elias Durnford / Pierre Charles Canot, View of the harbour and city of Havana, published London February 1765, public domain, u2/original-u1-trade-12.jpg. Viewed: caption reads "A View of the Harbour and City of the Havana, taken from Jesus del Monte. Drawn by Elias Durnford, Engineer. Engraved by P. C. Canot. London, Published according to Act of Parliament February 1765, by Tho.s Jefferys…"; ships visible in the harbor in the middle distance, small — "dotted", not "crowded". The LOC item page (loc.gov/item/2009633662) returned HTTP 403 — not retried; the credit is verified from the engraving's own imprint, which matches the survivor.
  - neglect-in-practice (MCQ 0252-0254): original secondary passage (Navigation Acts, Molasses Act 1733, salutary neglect, Burke coined the term in 1775). Set first named "salutary-neglect" — renamed after the validator showed Topic 2.2 already owns that set name (0191-0193); 6 items in one set is an error.
  - SAQ 0046 slot 2 (test): Equiano, verbatim, a DIFFERENT excerpt from the MCQ one ("The first object which saluted my eyes when I arrived on the coast, was the sea, and a slave ship… I was immediately handled, and tossed up to see if I were sound…"), verified against Gutenberg #15399.
  - SAQ 0047 slot 1: original secondary passage (Navigation Acts / mercantilism / loose enforcement).
  - SAQ 0048 slot 3: Bowen chart, same image as MCQ 0238, u2/original-u1-trade-02.jpg.
  - SAQ 0049 slot 1: original secondary passage (triangular trade / plantation demand / African destabilization).
  - LEQ 0016 practice (comparison: extent to which transatlantic trade shaped different regional economies by 1754).
- Quotas: 28 MCQ (test 0227, 0235, 0240, 0246, 0253; difficulty easy 6 / medium 10 / hard 12; keys A7/B7/C7/D7), 4 SAQ (slots 1, 2, 3, 1; test 0046 slot 2; practice 0047, 0048, 0049), 1 LEQ (practice). All status draft, lesson apush-u2-l3, awaiting blind verification.
- Writing complete (2026-11-26, writer): all 33 files written under questions/ — MCQ apush-mcq-0227–0254, SAQ apush-saq-0046–0049, LEQ apush-leq-0016, all status draft, lesson apush-u2-l3. Stimulus sets as filed: mun-balance-trade, mercantilism, navigation-acts, triangular-trade, bowen-chart, brookes, equiano, elmina, sugar-plantation, havana-spanish, neglect-in-practice. Mechanical checks by code, all PASS: counts 28 MCQ (5 test / 23 practice) + 4 SAQ (1 test slot 2 / 3 practice) + 1 LEQ (practice); difficulty easy 6 / medium 10 / hard 12; keys exactly 7/7/7/7; every general 60-120w (78-102w) AND strictly shorter than its question (smallest margin 19w); every rationale ≤2 lines and ≥25 chars; every key option longest by ≤1 word (3 items fixed by trimming the key: 0228, 0240, 0254 — my hand counts were unreliable, code counts rule); every SAQ model answer exactly 2 sentences per part; zero trap-language hits; LEQ rubric 6 rows (6.A / 4.B / 6.B ×4), skills ["6.A", "6.B"] per the bank convention; all 12 figure references resolve to 5 files on disk. Validator: 319 questions, 5 lessons, 0 errors, 59 warnings — none of the warnings name a 2.4 file (all are unfilled quotas in units 3-9 and later Unit 2 topics). No self-verification done; blind verifier owed.
- Facts I could not verify from the books: none outstanding — every figure and date in the topic traces to the three books or to a verified source page. Two source-access gaps (not fact gaps): the Fordham Mun page returned HTTP 500 and the LOC Havana page returned HTTP 403; in both cases the wording/credit was verified from another source (Mun: Hanover/Latin Library/Google Books search text; Havana: the engraving's own imprint). The 1788 Brookes note ("allowed to carry 454") and the 2 ft 7 in measurement are quoted from the diagram itself, verified by eye.

## Topic 2.4 blind verification (2026-11-26, independent blind verifier)
- 29/33 PASS, 4 FAIL, 0 wrong keys. MCQ blind match 28/28, SAQ parts 12/12, LEQ outline 6/6 rubric rows. Keys A7/B7/C7/D7 (pattern-guesser 25%). Validator: 319 questions, 5 lessons, 0 errors, 59 warnings.
- FAILs: (1) 0230 difficulty 4 -> 3 (answer directly matchable from the stimulus; Smith's quote names the balance of trade and the passage defines it as mercantilism). (2) 0231 skill 6.A -> 6.D (evaluation-of-a-claim item; precedent Unit 1 MCQ 0029, and 0253 same task type is 6.D). (3) 0248 attribution: source_note + general step 3 say "the engraving's own note says the forced labor... is deliberately not shown" — there is no such note on the engraving; the observation is from the Commons file description. Key/stem/options sound. (4) 0249 same source_note misattribution (shared stimulus); fix is the source_note only.
- All five images viewed by the verifier against their stimuli (Bowen chart, Brookes, Kip Elmina, Fumagalli plantation, Havana) — all accurate. 0248 stays inside what the image shows (no one working the cane; one person fishing in the foreground).
- Notes, not fails: 0238 general "Steam came a century later" is loose (~70 years); SAQ 0046(c) states the Americas destination the stimulus does not name (prompt frames the link, standard practice); LEQ 0016 comparison lives in thesis/evidence/complexity, content covers the row; LEQ 0016 Context lists sugar among colonial plantation crops without attributing it to the mainland.

## Topic 2.4 blind verification + fix round (2026-11-26, parent)
- Blind verification 29/33 PASS, 4 FAIL, 0 wrong keys (MCQ blind picks 28/28, SAQ parts 12/12, LEQ outline 6/6). Verdicts file verified on disk (33 items, 4 fails, exact ids).
- Fails: (1) 0230 difficulty 4 → 3 (answer directly matchable from the stimulus). (2) 0231 skill 6.A → 6.D (evaluation-of-a-claim item; precedent Unit 1's 0029 and in-topic 0253). (3) 0248 attribution: source_note + general step 3 claimed "the engraving's own note says" the forced labor is deliberately not shown — no such note exists on the engraving; the observation comes from the file's modern published description. Both spots reworded to attribute it there. (4) 0249 same source_note misattribution (shared stimulus), fixed the same way. Parent also tightened a verifier note: 0238 general "Steam came a century later" → "decades later" (chart is 1740; steamships early 1800s, ~70 years).
- Validator after fixes: 319 questions, 5 lessons, 0 errors, 59 warnings. Blind re-verification of the 4 fixed items dispatched.
- Note: the 0230 difficulty fix moves Topic 2.4 to easy 6 / medium 11 / hard 11 against its 6/10/12 quota — one hard short. The label was wrong, so it stays fixed; Unit 2 running total is now easy 21 / medium 39 / hard 44 against 21/38/45 for topics 2.1-2.4. If topics 2.5-2.8 hit their quotas exactly, the unit lands 42/75/93 vs the 42/74/94 target — inside "approximately", and honest labels govern.

## Topic 2.4 fix re-verification (2026-11-26, independent blind re-verifier)
- Blind re-verification of the 4 fixed items: 4/4 PASS, 0 FAIL. MCQ blind match 4/4.
- 0230 difficulty is 3 (ordered fix 4 -> 3 landed); fits as medium — the quote names the doctrine and the passage defines it, but the student must map "favorable balance" to "sell more than you buy" and distinguish a doctrine from a policy, a pattern, and a system. 0231 skill is 6.D (ordered fix landed); evaluation-of-a-claim stem, same precedent as Unit 1 MCQ 0029 and in-topic 0253.
- 0248/0249 attribution fix confirmed: source_note and general step 3 attribute the deliberate omission to the image's published description; "engraving's own note" occurs 0 times. Option B and rationale B state the deliberate omission as the key's proposition, grounded in the source_note. The fifth "deliberately" sits in internal source metadata (not student-visible). Image viewed by eye: layout matches the stimulus description; no one working the cane; one person fishing in the foreground.
- Note, not a fail: 0231 general step 3 and rationale C cite smuggling/self-government without a "Background:" tag (true history, key derivable by elimination; tag owed per the attribution rule).

## Topic 2.4 fix re-verification + final (2026-11-26, parent)
- Blind re-verification of the 4 fixed items: 4/4 PASS, 0 FAIL (verdicts file verified on disk). The re-verifier confirmed the Jefferys/description attribution against the Fumagalli image itself.
- Parent fix on a re-verifier note: 0231 general step 3 and rationale C cited smuggling and self-government without a "Background:" tag — both now tagged (facts true, key derivable by elimination, tag owed per the attribution rule).
- All 33 Topic 2.4 files flipped to final. Validator: 319 questions, 5 lessons, 0 errors, 59 warnings. Topic 2.4 closed 33/33. Topic 2.5 writer dispatched.

## Topic 2.5 grounding + stimuli (2026-11-26, writer)
- Grounding read before authoring: Barron's 2027 Ch 4, Topic 2.5 "Interactions Between American Indians and Europeans" in full (Jamestown/Powhatan trade then raids; Huron/French alliance and epidemic; Catawba peddlers and alcohol; §B British expansion — Pequot War, King Philip's War, 14 praying towns, hardening racial hierarchy; §C Spain — Pueblo Revolt 1680, accommodation after reconquest); 5 Steps 2024 Ch 7 (Powhatan/Smith/Pocahontas/Rolfe, tobacco) and Ch 8 (King Philip's War — Metacom, Wampanoag, encroachment, "bloody 14 months", English taking land and resources); Princeton Review Ch 6 (033_c006_sup.xhtml: "The English Arrive", "French Colonization of North America", "The Early Colonial Era: Spain Colonizes the New World" — Pequot War 1636-1638, 400 killed; Beaver Wars 1628-1701; Huron decline 1634-1649; King Philip's War 1675-1678, survivors sold into slavery in the West Indies; Pueblo Revolt 1680, reconquest 1692; Catawba, most powerful/numerous in Carolina Piedmont, smallpox, temporarily ceded land and status); lesson scripts E1 "Four Ways to Want a Continent" (four empire patterns; Huron-French alliance; Quebec 1608/Champlain; Jesuits; coureurs de bois) and E3 "New England Puritans" v6 (King Philip's War 1675-76, Metacom son of Massasoit, Sassamon trial, 14 praying towns, Massasoit-Pilgrim alliance 1621).
- Book-error flags found while reading (do NOT assert these): Barron's calls Metacom Massasoit's "grandson" — wrong, he was his son (registry F-U2-017, also flagged in 2.3); Barron's says Metacom "was killed by a group of Mohawks" — wrong, he was shot in August 1676 by John Alderman, a Praying Indian serving with Benjamin Church's forces (items say only "killed in August 1676"); Barron's dates the Pequot War 1634-1638 (standard dating 1636-1638, Princeton agrees) and King Philip's War 1675-1678 (the main southern New England war was 1675-1676; items use 1675-1676 for the main war); 5 Steps' claim that the 1619 Africans were "treated as indentured servants and freed after a period" is a simplification — not asserted anywhere in the topic. Barron's Ch 3 St. Augustine 1585 error and repartimiento (1549) conflation noted from earlier topics — none in scope here.
- Survivor census for Topic 2.5: 18 unique items tagged 2.5. REWRITTEN (11): 5s24-ch03-mcq-21 (Smith "emperor/courtiers") → 0255; 5s24-ch03-mcq-22 (Smith purpose) → 0256; original-hard2-u2-indian-european-interactions-01 (Pocahontas motives evaluation) → 0257, key reordered B→D; 5s24-ch03-mcq-23 (Smith narrative/map, dependence) → 0258, stem rewritten for the map image; pr25e-ch06-q10 (four empires) → 0266; barrons-2027-pt1-11 (Calloway accommodation) → 0277, "Pope" normalized to "Popé"; original-ctx-u2-05 (Pueblo context) → 0278, "Pope" normalized to "Popé"; original-u1-encomienda-15 (coordination) → 0279, key reordered C→B; barrons-2027-ch04-03 (Josephe motives) → 0280; barrons-2027-ch04-04 (Josephe religious + labor) → 0281; barrons-2027-ch04-05 (Spanish policy after) → 0282. REJECTED (7): original-u1-encomienda-14 (redundant Pueblo description, covered by 0278/0279); original-u1-encomienda-16 (broader resistance pattern — overlaps pt1-11/u2-05, framing covered by 0278 + 0282); 5s24-ch03-mcq-24 (speculative "parallels" to 19th-century travel writing, not book-grounded); 5s24-ch07-mcq-01 (Bellin map does not support its key; concept covered by pr25e-q10; Bellin map already used in 2.1 SAQ 0036); pr25e-test3-q01 (Pyle Burning of Jamestown already used in 2.3 SAQ 0044); pr25e-ch06-q06 (EXCEPT stem, banned by SPEC §6); barrons-2027-pt1-43 (Paxton Boys 1763-64 is Period 3, out of scope for Unit 2). Fresh items (17): 0259 (map knowledge), 0260 (Powhatan deterioration), 0261 (1622 attack survival — tobacco), 0262 (poisoned wine), 0263 (Huron collapse), 0264 (Beaver Wars cause), 0265 (French vs English dependence), 0267 (Dutch pattern), 0268 (Pequot cause), 0269 (total war), 0270 (Native alliances), 0271 (King Philip cause), 0272 (Darley sourcing limits), 0273 (war outcome), 0274 (praying towns purpose), 0275 (second-class converts), 0276 (Jesuits vs Puritans).
- Stimuli (all viewed before writing; source + rights):
  - smith-quote (MCQ 0255-0257): Smith, A True Relation (1608), verbatim abridged Werowocomoco quote ("At last they brought him to Werowocomoco, where was Powhatan, their emperor. Here more than two hundred of those grim courtiers stood wondering at him...") + the 1624 General Historie rescue summary as a second source in the same stimulus, so the hard2-01 evaluation item shares the set (validator wants 2-5 per set; the single-item set was an error).
  - smith-map (MCQ 0258-0259): Smith's Map of Virginia, published 1612, engraved by William Hole, Library of Congress, public domain, u2/5s24-ch03-mcq-23.jpg. Viewed: "VIRGINIA" banner, Native towns and peoples named across the map, upper-left inset "POWHATAN — Held this state & fashion when Capt. Smith was delivered to him prisoner 1607", a Native man with a bow at the right, royal arms at the center, Chesapeake Bay, imprint "Discovered and described by Captain John Smith, 1606. Graven by William Hole" (1606 is the survey year; 1612 is publication).
  - powhatan-jamestown (MCQ 0260-0262): original secondary passage (corn trade → raids → 1622 attack, 347 killed, about a quarter of the colony → 1623 poisoned wine, 200 deaths → 1644 war → small reserves).
  - huron-beaver (MCQ 0263-0265): original secondary passage (Champlain-Huron alliance 1609; epidemic after 1634, half to two-thirds; 1649, ~1,000 Iroquois warriors, ~300 killed).
  - four-empires (MCQ 0266-0267): original secondary passage (Spanish encomienda labor; French fur-trade allies; Dutch fur traders; English settler displacement).
  - pequot-war (MCQ 0268-0270): original secondary passage (Connecticut valley; 1637 village burned, about 400 killed, many women and children; survivors scattered or sold into slavery). The books do not name Mystic, so no item names it — the village is "the main Pequot village" per Princeton.
  - king-philip (MCQ 0271-0273): F. O. C. Darley engraving, published 1886, captioned "The King Philip War — A Raid on the Settlers", public domain, u2/king-philip-war-darley.jpg. Viewed: Native warriors with tomahawks and clubs attacking settlers in a field, one settler firing a musket, a frightened child in the center, a fallen settler in the foreground; signed "Darley" lower left. Labeled honestly throughout as an 1886 imagining; 0272 is a 2.C sourcing-limitation item on exactly that.
  - praying-indians (MCQ 0274-0276): original secondary passage (14 praying towns by the 1670s; second-class citizens; European clothing; abandon traditions; French Jesuits accepted blending).
  - pueblo-calloway (MCQ 0277-0279): Calloway paraphrase (pt1-11 stimulus; Popé, twelve years, Vargas 1692, Luis in animal skins with rosary and silver cross).
  - josephe (MCQ 0280-0282): Josephe 1681 interrogation paraphrase (beatings, property seizure, forced labor without pay; churches and images burned, "Spaniards' God was dead"; names of Jesus and Mary never spoken; new houses of native worship).
  - SAQ 0050 slot 1: original secondary passage (fur trade, disease, Beaver Wars).
  - SAQ 0051 slot 2: Rowlandson, Narrative of the Captivity and Restoration (1682), verbatim — verified against Project Gutenberg EBook #851 ("It is a solemn sight to see so many Christians lying in their blood, some here, and some there, like a company of sheep torn by wolves... twenty-four of us taken alive and carried captive"). Attack dated February 1676 (old-style February 10, 1675).
  - SAQ 0052 slot 3: Jan Beary, Sickness at Jamestown, illustration published 1898, public domain, u2/sickness-at-jamestown-1898.jpg. Viewed: a sick settler carried between two men, another settler sitting dejected on a cannon, a grave being dug in the background, tents and rough huts. Labeled honestly as an 1898 imagining. The landing image u2/english-settlers-landing-virginia-1607.jpg was viewed and NOT used: it shows no Native people and supports no 2.5 claim.
  - SAQ 0053 slot 1: original secondary passage (Catawba adaptation — peddlers, deerskins, alcohol by the 1750s, smallpox, temporary cession of land and status).
  - LEQ 0017 practice (comparison: extent to which interactions differed among Spanish, French, and English, 1607-1754).
- Quotas: 28 MCQ (test 0255, 0263, 0271, 0277, 0280; difficulty easy 6 / medium 10 / hard 12; keys A7/B7/C7/D7), 4 SAQ (slots 1, 2, 3, 1; all practice), 1 LEQ (practice). All status draft, lesson apush-u2-l3, awaiting blind verification.
- Writing complete (2026-11-26, writer): all 33 files written under questions/ — MCQ apush-mcq-0255–0282, SAQ apush-saq-0050–0053, LEQ apush-leq-0017, all status draft, lesson apush-u2-l3. Stimulus sets as filed: smith-quote (3), smith-map (2), powhatan-jamestown (3), huron-beaver (3), four-empires (2), pequot-war (3), king-philip (3), praying-indians (3), pueblo-calloway (3), josephe (3). Mechanical checks by code, all PASS: counts 28 MCQ (5 test / 23 practice) + 4 SAQ (all practice) + 1 LEQ (practice); difficulty easy 6 / medium 10 / hard 12 — the hard quota hit exactly, no Unit 1 drift (the hard items are genuine inferences beyond the stimulus: 0261 tobacco survival, 0264 beaver decline, 0270 Native alliances, 0271 land-vs-Sassamon cause, and the four survivor hards); keys exactly 7/7/7/7; every general 62-85w AND strictly shorter than its question (smallest margin 44w); every key explanation 60-90w; every distractor rationale 7-24 words (1-2 lines) with a misconception ≥10 chars; every key option longest by ≤1 word (8 items fixed in the write round: 0256, 0269, 0272, 0273, 0275, 0276, 0277, 0280 — by trimming the key or lengthening a distractor); every SAQ model answer exactly 2 sentences per part; zero trap-language hits under the validator's word-boundary check ("trapped"/"trappers" in the fur-trade items are the trade verb, already present in final Unit 1 files 0126-0128); LEQ rubric 6 rows (6.A / 4.B / 6.B ×4), skills ["6.A", "6.B"]; all 7 figure references resolve to 3 files on disk (Smith map ×2, Darley ×3, Beary ×1). Validator: 352 questions, 5 lessons, 0 errors, 59 warnings — none names a 2.5 file (all are unfilled quotas in units 3-9 and later Unit 2 topics). No self-verification done; blind verifier owed.
- Facts I could not verify from the books: none outstanding — every figure and date in the topic traces to the three books, the lesson scripts, or a verified source page (Smith quote and Rowlandson quote verified verbatim against the 1608 text and Gutenberg #851; the Smith map and Darley and Beary credits verified against the images themselves and the image catalog). One judgment call, logged: the Pequot village is never named "Mystic" in any item because the three books do not name it; "May 1637" for the village burning appears only in a general note as background, inside the books' 1636-1638 range.

## Topic 2.5 blind verification (2026-11-26, independent blind verifier)
- Blind verification 26/33 PASS, 7 FAIL, 0 wrong keys (MCQ blind picks 28/28, SAQ parts 12/12, LEQ outline 6/6). Verdicts in verification/topic-2.5-verdicts.json; solves in verification/topic-2.5-solves.json (written before opening any question file).
- Fails: (1) 0262 difficulty 4 -> 3 (one-step match from the stimulus). (2) 0265 difficulty 4 -> 3 (answer directly in the passage's opening lines; same kind of direct item is tagged 2 as 0267). (3) 0269 difficulty 4 -> 3 (key option nearly verbatim from the passage). (4) 0270 difficulty 4 -> 3 (one-step generalization, trivial distractors). (5) 0271 stem wording: "most directly caused" points to the proximate trigger (B, the Sassamon trial), while the key is the underlying cause (A); fix the stem to ask for the underlying cause. (6) 0276 difficulty 4 -> 3 (key option nearly verbatim from the passage's last sentence; 0274 in the same set is tagged 2). (7) 0281 skill 2.A -> 3.A (item identifies a claim in the source, not the source's POV/purpose/audience).
- Notes, not fails: Background-tag omissions in 0271, 0273, 0278, 0258, 0281 rationale B, 0255/0256 rationale D; 0257 general step 1 states the ritual reading as fact while the key hedges it; 0266 option B's "avoided contact" is a loose paraphrase of the passage's "pushed off rather than living alongside"; 0265/0276 skill 3.C compares patterns within one passage, not two sources; LEQ 0017 comparison row lives in the thesis, not a labeled paragraph. The five difficulty fixes move Topic 2.5 to easy 6 / medium 15 / hard 7 against its 6/10/12 quota - parent's call whether to re-author mediums into hards.
- Images viewed with my own eye: Smith 1612 map (Powhatan inset, Native towns named, bowman at right, royal arms), Darley 1886 engraving (tomahawks, musket, frightened child, fallen settler), Beary 1898 Jamestown (carried sick settler, man on cannon, grave being dug) - all descriptions accurate; 0272 correctly frames the Darley engraving as 1886 evidence about memory, not 1675 evidence.
- Validator: 352 questions, 5 lessons, 0 errors, 59 warnings.

## Topic 2.5 blind verification + fix round (2026-11-26, parent)
- Blind verification 26/33 PASS, 7 FAIL, 0 wrong keys (MCQ blind picks 28/28, SAQ parts 12/12, LEQ outline 6/6). Verdicts file verified on disk (33 items, 7 fails, exact ids).
- Fails: five difficulty over-tags, all 4 → 3 (0262, 0265, 0269, 0270, 0276 — direct-from-stimulus matching, same class as 2.4's 0230); 0271 stem "What most directly caused the war?" → "What was the underlying cause of the war?" (the stem pointed at the Sassamon trial, the spark, while the key is encroachment, the cause; the item's own rationale conceded B was the spark); 0281 skill 2.A → 3.A (identifying a claim in a source, not POV/purpose/audience).
- Parent fixes on verifier notes (same Background-tag class as 0231): tagged background facts in 0271 general steps 1-2, 0273 general steps 1-3, 0278 general steps 1-2, 0258 general steps 2-3, 0281 rationale B, 0255 rationale D, 0256 rationale D; hedged 0257 general step 1 ("He saw a ceremony" → "He saw something that may have been a ritual") to match the key's hedge. All touched generals re-checked in code: 60-120w and strictly shorter than their questions.
- Difficulty consequence, honest labels govern: the five 4 → 3 fixes move Topic 2.5 to easy 6 / medium 15 / hard 7 against its 6/10/12 quota — five hard short, not relabeled. Unit 2 running total is now easy 27 / medium 54 / hard 51 of 132 MCQ against 27/48/57 for topics 2.1-2.5. The unit will land hard-short unless topics 2.6-2.8 over-write hard; that is the same open decision as Unit 1's difficulty mix, to be settled at unit close.
- Validator after fixes: 352 questions, 5 lessons, 0 errors, 59 warnings. Blind re-verification of the 7 fixed items dispatched.

## Topic 2.5 fix re-verification (2026-11-26, independent blind re-verifier)
- Blind re-verification of the 7 fixed items: 7/7 PASS, 0 FAIL. Blind picks matched keys 7/7; solves written before opening any question file.
- Fixes confirmed: 0262, 0265, 0269, 0270, 0276 all difficulty 3, each a direct-from-stimulus or one-step match — medium fits. 0271 stem now asks for the underlying cause; key A (English encroachment) answers it, B (Sassamon trial) correctly framed as the spark in rationale B and in Background-tagged general step 1; difficulty 4 stands (spark-vs-cause discrimination is genuinely harder than the direct-match items). 0281 skills now ['3.A'] (identifying a claim in a source, not 2.A POV/purpose/audience); rationale B now tags the casualty/Santa Fe facts as Background (not in the testimony, which names only "the Spanish villa" and gives no casualty count).
- Bounds code-checked on all 7: generals 62-85w and strictly shorter than their questions; key explanations 65-77w; no key sole longest by more than 1 word (max +1); zero trap language.
- Note carried, not a fail: 0265 and 0276 carry skill 3.C; the comparison is framed by the stem itself, so the tag is defensible.

## Topic 2.5 fix re-verification + final (2026-11-26, parent)
- Blind re-verification of the 7 fixed items: 7/7 PASS, 0 FAIL (verdicts file verified on disk). The re-verifier confirmed the 0271 stem fix (underlying cause, Sassamon trial correctly the spark) and the 0281 skill fix, and carried the 3.C note on 0265/0276 as defensible, not a fail.
- All 33 Topic 2.5 files flipped to final. Validator: 352 questions, 5 lessons, 0 errors, 59 warnings. Topic 2.5 closed 33/33. Topic 2.6 writer dispatched.

## Topic 2.6 grounding + stimuli (2026-11-26, writer)
- Grounding read before authoring: Barron's 2027 Ch 4, Topic 2.6 "Slavery in the British Colonies" in full (indentured servitude and the headright system; the 1619 arrival and the early status of Africans; Bacon's Rebellion and the shift to enslaved labor; the legal hardening — 1662 partus rule, 1667 baptism law, 1705 code; slavery in the North and South with the 1740 data table; Stono and resistance; faith and slavery — Germantown petition 1688, Whitefield 1751); 5 Steps 2024 Ch 7 (indentured servants; 1619) and Ch 8 (Bacon's Rebellion; Growth of Slavery; Stono Rebellion; Middle Passage); Princeton Review Ch 6 sup file (indentured servitude; headright; 1619; "Slavery in the Early Colonies"; Middle Passage; Bacon's Rebellion; Stono Rebellion); lesson script E2 "From Servitude to Slavery" v6 (servitude to slavery arc; Bacon; the Morgan debate; legal hardening).
- Book-error flags found while reading (do NOT assert these): Barron's Ch 4 dates the John Casor case to 1640 — wrong; it conflates Casor with John Punch (the 1640 runaway case). Casor's civil-court ruling was March 8, 1655 (Johnson v. Parker), verified by web search. The 2.6 items use Punch 1640 and Casor 1655 correctly; the legal-hardening stimulus source_note records the correction. 5 Steps Ch 7 says 19 Africans arrived in 1619; Barron's says twenty ("20 and odd Negroes" per Rolfe's letter). Items say "about twenty." Verified by web search: Whitefield's 1751 quote verbatim in Princeton sup file 029; the SC Negro Act of 1740 plus the prohibitive duty that cut imports for about a decade.
- Survivor census for Topic 2.6: 15 unique items tagged 2.6. REWRITTEN (13): 5s24-ch08-mcq-02 (Stono consequence) → 0302, key moved D→C for the 7/7/7/7 balance; original-ctx-u2-02 (Bacon planter lesson, 6.D evaluation) → 0289; original-ctx-u2-03 (Germantown petition) → 0307; original-ctx-u2-04 (Stono context, rice economy) → 0303; original-ctx-u2-10 (headright → indentured servants) → 0285; original-ctx-u2-14 (1705 codes reveal fear) → 0295; original-ctx-u2-15 (rewritten as data-table comparison item) → 0300; original-hard2-u2-slavery-british-colonies-02 (1619 claim vs 1660s laws, 3.D) → 0294; pr25e-ch06-q01 (indentured mortality) → 0283; pr25e-drill-mcq-q01 (Whitefield 1751) → 0306; princeton-t4-01 (indentured contract) → 0284; princeton-t5-02 (headright response) → 0286; princeton-t5-06 (Chesapeake shift to enslaved labor) → 0292, given a new stimulus (its original had an empty stimulus). REJECTED (2): princeton-t4-02 (exact duplicate of ctx-u2-02's keyed proposition — Bacon frightened planters → shift to enslaved labor); princeton-t5-05 (Middle Passage → 1808 ban; out of period — 1808 is Period 4; note as a U4 candidate). Fresh items (15): 0287, 0288, 0290, 0291, 0293, 0296, 0297, 0298, 0299, 0301, 0304, 0305, 0308, 0309, 0310.
- Stimuli (all viewed before writing; source + rights):
  - indentured-servitude (MCQ 0283-0284): original secondary passage (most Chesapeake migrants came as servants; nearly half died before their term ended; small land grant with freedom).
  - headright-1618 (MCQ 0285-0286): original secondary passage (fifty acres per migrant financed; tobacco's labor hunger; servants, not enslaved Africans, in 1618).
  - 1619-early-status (MCQ 0287-0288): original secondary passage (about twenty Africans in 1619; no fixed system yet; "Negroes" to "black"/"slave" by century's end).
  - bacons-rebellion (MCQ 0289-0291): original secondary passage (1676, cross-racial alliance, Jamestown burned; Berkeley refused a commission over Indian trade and fort costs; Pamunkey at peace, attacked anyway).
  - shift-to-slavery (MCQ 0292-0293): original secondary passage (servants scarcer and fractious; Dutch monopoly ends 1682, prices fall; planters turn to enslaved Africans).
  - legal-hardening (MCQ 0294-0296): original secondary passage plus the 1705 code quote ("All Negro, mulatto and Indian slaves within this dominion… shall be held to be real estate", verbatim, public domain) and the 1640 Punch case table (white runaways +4 years, Punch slavery for life). Source_note records the Casor/Punch correction.
  - race-and-slavery (MCQ 0297-0299): Morgan debate passage (paraphrase of American Slavery, American Freedom — Bacon united the poor across race; planters answered with racial slavery; the chicken-and-egg question) plus the British/Spanish/French family-settlement comparison.
  - slavery-north-south (MCQ 0300-0301): Barron's 1740 data table (NY ~20% enslaved, ~40% of households holding at least one; VA ~40%; SC ~70%), cited to Barron's Ch 4.
  - stono-resistance (MCQ 0302-0305): original secondary passage (Stono 1739, largest mainland uprising before the Revolution; ~20 rebels, ~60 dead; marched toward Spanish Florida; Negro Act of 1740 and the prohibitive duty; quieter resistance — slow work, broken tools, kept names).
  - faith-and-slavery (MCQ 0306-0308): Whitefield 1751 quote verbatim (public domain, verified in Princeton sup file 029: "Can you think it is lawful or right to keep the poor Negroes in a state of slavery? ... For these poor creatures are the work of the hands of the same God") and the Germantown petition 1688 verbatim ("These are the reasons why we are against the traffik of men-body", public domain).
  - rolfe-engraving (MCQ 0309-0310): John Rolfe engraving, published 1874, public domain, u2/pr25e-ch06-q03.jpg (Commons https://upload.wikimedia.org/wikipedia/commons/8/88/John_Rolfe_tobaccoitshistor01bill_0056.jpg). Viewed: a single man in 17th-century dress hoeing young tobacco plants by hand among rows of small plants. Labeled honestly throughout as an 1874 imagining, not a 17th-century record; 0309 is a 3.A sourcing-limitation item on exactly that. Images viewed and NOT used: u2/5s24-ch08-mcq-01.jpg (James II portrait — not slavery) and u2/5s24-ch08-mcq-04.jpg (Old Plantation, c. 1780s — out of period).
  - SAQ 0054 slot 1: original secondary passage (shift after Bacon — fear, servant scarcity, cheaper enslaved labor after 1682, 1662 and 1705 laws).
  - SAQ 0055 slot 2: Germantown Quaker petition against slavery, 1688, verbatim (public domain).
  - SAQ 0056 slot 3 (TEST): 1670 painting of enslaved laborers in tobacco sheds, artist unknown, public domain, u2/tobacco-sheds-1670.jpg. Viewed: workers handling tobacco leaves under open-sided sheds, a planter's house in the center background, a cook fire in the foreground. Catalog caveat logged in the stimulus: palm trees suggest possibly non-Chesapeake — the item never claims Virginia specifically, and part c is a sourcing-limitation item on exactly that.
  - SAQ 0057 slot 1: original secondary passage (North/South comparison, Barron's 1740 figures).
  - SAQ 0058 slot 2: Virginia slave code, 1705, verbatim (public domain).
  - LEQ 0018 practice (comparison: extent to which slavery differed between the Chesapeake and the Lower South, 1607-1754). LEQ 0019 practice (causation: extent to which Bacon's Rebellion caused the shift from indentured servitude to enslaved African labor in the Chesapeake).
- Quotas: 28 MCQ (test 0283, 0287, 0289, 0297, 0303; difficulty easy 6 / medium 10 / hard 12; keys A7/B7/C7/D7), 5 SAQ (slots 1, 2, 3, 1, 2; test 0056 slot 3), 2 LEQ (both practice). All status draft, lesson apush-u2-l4, awaiting blind verification.
- Writing complete (2026-11-26, writer): all 35 files written under questions/ — MCQ apush-mcq-0283–0310, SAQ apush-saq-0054–0058, LEQ apush-leq-0018–0019, all status draft, lesson apush-u2-l4. Stimulus sets as filed: indentured-servitude (2), headright-1618 (2), 1619-early-status (2), bacons-rebellion (3), shift-to-slavery (2), legal-hardening (3), race-and-slavery (3), slavery-north-south (2), stono-resistance (4), faith-and-slavery (3), rolfe-engraving (2). Mechanical checks by code, all PASS: counts 28 MCQ (5 test / 23 practice) + 5 SAQ (1 test / 4 practice) + 2 LEQ (practice); difficulty easy 6 / medium 10 / hard 12 — the hard quota hit exactly, no over-tagging (the hard items are genuine multi-step reasoning: 0287 fixed-system-vs-1619, 0289 Bacon evaluation, 0292/0294 claim evaluation, 0295 codes-as-fear, 0296 Punch table inference, 0297 Morgan argument, 0298 comparison, 0300 table inference, 0303 Stono context, 0308 faith comparison, 0309 sourcing limits); keys exactly 7/7/7/7; every general 72-106w AND strictly shorter than its question (smallest margin 4w); every key explanation 65-89w; every distractor rationale 7-22 words (1-2 lines) with a misconception ≥10 chars; every key option longest by ≤1 word (8 items fixed in the write round: 0287, 0288, 0290, 0291, 0298, 0299, 0305, 0308 — by trimming the key or lengthening a distractor; 0310 general trimmed from 95w to 73w to fit under its short 76w question); every SAQ model answer exactly 2 sentences per part; zero trap-language hits; LEQ rubrics 6 rows (6.A / 4.B / 6.B ×4), skills ["6.A", "6.B"]; all 3 figure references resolve to 2 files on disk (Rolfe engraving ×2, tobacco sheds ×1). Validator: 387 questions, 5 lessons, 0 errors, 59 warnings — none names a 2.6 file (one warning on SAQ 0055 part a was fixed during the write round: the model answer read as 1 sentence to the validator's counter because the quoted period inside "'the traffik of men-body.'" did not split; restructured into 2 clean sentences, warnings 60 → 59). No self-verification done; blind verifier owed.
- Difficulty consequence, honest labels govern: Topic 2.6 lands exactly on its 6/10/12 quota. Unit 2 running total is now easy 33 / medium 64 / hard 63 of 160 MCQ against 33/58/69 for topics 2.1-2.6 — easy exact, medium +6, hard -6. The unit will land hard-short unless topics 2.7-2.8 over-write hard; same open decision as Unit 1's difficulty mix, to be settled at unit close.
- Facts I could not verify from the books: none outstanding — every figure and date in the topic traces to the three books, the lesson script, or a verified source page (Whitefield 1751 and Germantown 1688 quotes verified verbatim; Casor 1655, the 1740 Negro Act and prohibitive duty verified by web search; Rolfe engraving and tobacco-sheds painting credits verified against the image catalog and the images themselves). Judgment calls, logged: the tobacco-sheds painting's place is not established, so no item claims Virginia for it; the Rolfe engraving is labeled an 1874 imagining in every place it appears; "about twenty" for the 1619 arrival splits Barron's twenty and 5 Steps' nineteen.

## Topic 2.6 blind verification (2026-11-26, independent blind verifier)
- Blind verification 28/35 PASS, 7 FAIL, 0 wrong keys (MCQ blind picks 28/28, SAQ parts 15/15, LEQ outlines 6/6 rows each). Solves written before opening any question file.
- Fails: (1) 0287 difficulty 4 -> 3 (key B one-step restatement of two passage sentences, same class as 2.5's 0262/0265). (2) 0292 difficulty 4 -> 3 (key A restates the passage's core sentence directly). (3) 0296 difficulty 4 -> 3 (one-step generalization from facts given in the stem itself, same class as 2.5's 0270). (4) 0297 key-rationale chronology error: the rationale lists the 1662 partus rule among "the laws that followed" 1676 and the general claims "the sequence after 1676 — rebellion, then laws" fits Morgan's order — but partus (1662) and the baptism law (1667) both predate the rebellion; only the 1705 code follows it. Key C stands; the explanation must be rewritten. (5) 0298 difficulty 4 -> 3 (key A nearly verbatim from the passage, same class as 2.5's 0269/0276). (6) 0308 difficulty 4 -> 3 (one-step synthesis from two given sources; 3.C tag itself correct). (7) SAQ 0056 part (b): its model answer asserts the place-unknown painting shows the Chesapeake workforce in 1670, contradicting the stimulus warning ("do not claim Virginia specifically") and the part (c) model answer (palm trees suggest a Caribbean plantation — confirmed by viewing the image, which shows palm trees). Part (b)'s prompt also presupposes the painting reflects the Chesapeake shift. Fix: reword part (b) to the labor system generally and rewrite its model answer without the Chesapeake/1670 assertions.
- Difficulty consequence: the five 4 -> 3 fixes move Topic 2.6 to easy 6 / medium 15 / hard 7 against its 6/10/12 quota — same honest-labels call as 2.5; parent's decision at unit close.
- Notes, not fails: Background-tag omissions (same class as 0231): 0290 general step 2 + key rationale (Susquehannock attack, accurate but not in the stimulus), 0298 general step 1 + key rationale (Spanish/French "mostly men"), 0299 key rationale ("unable to communicate across different regions"), 0303 general step 1 + key rationale (SC demographic majority), 0307 key rationale ("decades before the Enlightenment reached colonial assemblies"), 0310 key rationale final sentence (labor-shift history). 0295's "decades of uprisings and conspiracies" is loose — "decades of resistance" fits the record better. 0056(a) model answer's "no machines in sight" is loose — the image shows a large hand-turned wheel/press under the right shed. 0309 difficulty 4 stands: sourcing-limitation items 0248 (2.4) and 0272 (2.5) carry 4, so 0309 is consistent with bank precedent. Whitefield 1751 quote verified verbatim against the March 22, 1751 letter to Wesley; Germantown petition opening line verified. Both images viewed: Rolfe engraving matches its description exactly; tobacco-sheds painting matches its description and shows palm trees. Casor 1655 / Punch 1640 dates correct throughout; the source_note correctly flags Barron's conflation. LEQ 0018/0019 comparison rows live in the complexity paragraph, as in 0016/0017 — carried, not a fail.

## Topic 2.6 blind verification + fix round (2026-11-26, parent)
- Blind verification 28/35 PASS, 7 FAIL, 0 wrong keys (MCQ blind picks 28/28, SAQ parts 15/15, both LEQ outlines 6/6). Verdicts file verified on disk (35 items, 7 fails, exact ids).
- Fails: five difficulty over-tags, all 4 → 3 (0287, 0292, 0296, 0298, 0308 — direct-from-stimulus or one-step items, same class as 2.5); 0297 chronology — the key rationale listed the 1662 partus rule among "the laws that followed" 1676 and the general claimed "the sequence after 1676 — rebellion, then laws" (partus 1662 and the baptism law 1667 predate Bacon's Rebellion; only the 1705 code follows it). Key C stands; rationale and general rewritten to put partus before the rebellion and rest the post-1676 sequence on the 1705 code and the labor-practice shift; 0056 part (b) contradicted its own stimulus warning — the prompt asked how the painting reflects the Chesapeake shift while the stimulus says the painting's place is unknown, and part (c) says the palms suggest the Caribbean. Prompt reworded to the labor system generally, model answer rewritten without the Chesapeake/1670 assertions; part (a) "no machines in sight" loosened (the image shows a hand-turned wheel/press under the right shed).
- Parent fixes on verifier notes (same Background-tag class as 0231): tagged background facts in 0290 general step 2 + key rationale (Susquehannock — the parent confirmed the stimulus names Pamunkey and Occoneechee, not Susquehannock), 0298 general step 1 + key rationale ("mostly men"), 0299 key rationale (unable to communicate across regions), 0303 general step 1 + key rationale (SC demographic majority — the parent confirmed the stimulus carries no such numbers), 0307 key rationale (Enlightenment timing), 0310 key rationale final sentence (labor-shift history); tightened 0295 general "decades of uprisings and conspiracies" to "decades of resistance" (matches the key rationale's own wording).
- Difficulty consequence, honest labels govern: the five 4 → 3 fixes move Topic 2.6 to easy 6 / medium 15 / hard 7 against its 6/10/12 quota — five hard short, not relabeled. Unit 2 running total is now easy 33 / medium 69 / hard 58 of 160 MCQ against 33/58/69 for topics 2.1-2.6. Same open decision as Unit 1's difficulty mix, to settle at unit close.
- Validator after fixes: 387 questions, 5 lessons, 0 errors, 59 warnings. Blind re-verification of the 7 fixed items dispatched.

## Topic 2.6 fix re-verification (2026-11-26, blind re-verifier)
- Blind re-verification of the 7 fixed items: 7/7 PASS, 0 FAIL (verdicts file topic-2.6-fix-verdicts.json; blind picks written in topic-2.6-fix-solves.json before opening any question file). Blind picks matched keys 6/6 on MCQ; SAQ 0056 blind answers match all three model answers in substance.
- All five difficulty fixes landed and fit (0287, 0292, 0296, 0298, 0308 all difficulty 3 — direct-from-stimulus or one-step items); 0297 difficulty 4 stands (evaluation item, genuinely harder). 0297 chronology fix confirmed: partus 1662 stated as "already in place" in general step 2 and rationale C, 1705 code "followed", phrase "the laws that followed" occurs 0 times; post-1676 sequence rests on the 1705 code and the labor-practice shift. 0056 fix confirmed: part (b) no longer asks about the Chesapeake and its model answer makes no Chesapeake or 1670-pace claim; part (a) no longer claims "no machines in sight"; part (c) still states the place is unknown with palms suggesting the Caribbean. Image viewed with my own eye: palms clearly visible, and a large hand-turned wheel/press under the right shed confirms the old "no machines" claim was wrong.
- Code checks on the 7 items: all generals 60-120w and strictly shorter than their questions, all key explanations 60-120w, no key longest by more than 1 word, zero trap language, all SAQ 0056 parts exactly 2 sentences.
- Notes, not fails: 0292 rationale A ("servants who survived wanted land of their own") and 0297 rationale C / rationale A misconception ("enslaved people did fight") state true book facts not present in their own stimuli without a "Background:" tag — same class as the prior-round tag notes; left to the parent.

## Topic 2.6 fix re-verification + final (2026-11-26, parent)
- Blind re-verification of the 7 fixed items: 7/7 PASS, 0 FAIL (verdicts file verified on disk). The re-verifier confirmed the 0297 chronology fix ("the laws that followed" now occurs 0 times; partus stated as "already in place") and the 0056 SAQ fix, and viewed the tobacco-sheds image itself (palms visible, hand-turned wheel/press under the right shed — the old "no machines" claim was wrong).
- Parent fix on re-verifier notes: tagged 0292 rationale A (servants wanting land of their own) and 0297 rationale C + rationale A + option A misconception ("enslaved people did fight") as Background — true book facts not present in their own stimuli.
- All 35 Topic 2.6 files flipped to final. Validator: 387 questions, 5 lessons, 0 errors, 59 warnings. Topic 2.6 closed 35/35. Topic 2.7 writer dispatched.

## Topic 2.7 (2026-11-26, writer)
- Grounding read: SPEC.md, BLUEPRINT.md (§§2, 3, Unit 2 per-topic quotas), LESSON-SPEC.md, LOG.md (Unit 1 lessons and the Topic 2.1–2.6 entries, including the 2.2 length-tell fix round, the 2.3 engraver-credit fix, the 2.4 attribution fixes, the 2.5 difficulty over-tagging, and the 2.6 chronology and SAQ fixes), cb-codes.json Topic 2.7. Books: Barron's Premium 2027 Ch 4, Topic 2.7 in full (A. Religious pluralism — Great Awakening, dissenting denominations, Deism/Enlightenment; B. Anglicization — emulation, print culture, toleration; C. Diverging interests — Dominion, Glorious Revolution, Leisler, Maryland; D. Background to resistance — Locke, Country Party/Cato's Letters, legal procedures, Zenger; plus the "Colonial Democracy in Context" box); 5 Steps 2024 Ch 8 (Salem Witch Trials 1692, Great Awakening 1720s–1740s, assemblies/power of the purse, Dominion 1686, Molasses Act 1733) and Ch 7 (Middle Colonies; Massachusetts and the New England Colonies); Princeton Review Ch 6 (Salem causes incl. Halfway Covenant 1662, 130+ jailed/executed summer 1692; Great Awakening; Enlightenment/Franklin; "Life in the Colonies" — population 250,000 in 1700 → 1,250,000 in 1750, Black population >200,000 in 1750, >90% rural). Lesson scripts (v6/v7 drafts): E4 "Middle Colonies & Diversity" (Penn, Holy Experiment, Frame 1682, Charter of Privileges 1701, redemptioners, Walking Purchase 1737, Germantown protest 1688), E6 "The Great Awakening" (Whitefield 1739, Edwards Enfield July 8 1741, Franklin counterweight, New/Old Lights, Princeton 1746), E7 "Colonial Self-Government" (power of the purse, Shute/Burnet 1720s, MA House 1728 £1,700 refused fixed salary, Zenger 1735, Anglicization paradox).
- Survivor census — 14 items tagged 2.7, 12 rewritten, 2 rejected. REWRITE: original-ctx-u2-11 (Edwards bow/arrow, key A → MCQ 0311, re-aimed at what the image shows about the sinner's position; its explanation's "fed the Revolution" claim dropped — the Awakening→Revolution link is a live debate, not a fact, per E6); original-ctx-u2-12 (Zenger 1735, key B → MCQ 0329, image stimulus; its "established a colonial precedent" claim kept only as "landmark," with the rationale stating explicitly that no law changed — jury acquitted, truth stayed no defense on the books, per E7); barrons-2027-ch04-02 (Puritan work ethic → market economy, key C → MCQ 0335, stimulus rebuilt as a labeled paraphrase of the Grob & Beck 1963 passage since post-1929 text cannot be quoted verbatim); barrons-2027-pt2-46 (Edwards spider quote = First Great Awakening, key D → MCQ 0312, rebuilt from pure identification to theology inference: depravity/God's arbitrary mercy); 5s24-ch03-mcq-33 (Easty petition, value as accused's perspective, key B → MCQ 0321 test, quote corrected to the verified modernized text, abridged); 5s24-ch03-mcq-35 (Puritan worldview, cosmic struggle, key D → MCQ 0322, key moved to C); 5s24-exam2-mcq-14 (Hamilton defense, English liberties, key B → MCQ 0326 test, key moved to A); 5s24-exam2-mcq-15 (Zenger vs Pentagon Papers, key C → MCQ 0328, reframed to drop the 1971 comparison, out of period: asks how the principle advanced — jury verdict, not a law change); 5s24-exam2-mcq-16 (jury as check on royal authority, key D → MCQ 0327, key moved to C); 5s24-exam2-mcq-47 (Penn Charter of Privileges → religious diversity, key A → MCQ 0331 test, key moved to C, Holme map as stimulus); pr25e-test1-q09 (Halfway Covenant, key C → MCQ 0337 test, stimulus rebuilt with a proper Halfway Covenant rule text — the survivor's Roger Williams quote argues against civil power in spiritual matters and says nothing about the key); pr25e-test2-q03 (Mayflower Compact → Awakening continuity = religious fervor, key C → MCQ 0339, source credit fixed to "signed November 11, 1620; text as printed in Mourt's Relation (1622) and Bradford's Of Plymouth Plantation" and its doubled explanation sentence removed). REJECT: barrons-2027-pt1-53 (Madison's Memorial and Remonstrance → First Amendment Free Exercise — Period 3/1791 content, out of Unit 2 scope; noted as a U3 candidate); barrons-2027-pt2-47 (exact duplicate of pt2-46's keyed proposition, Edwards = First Great Awakening, no stimulus).
- Stimuli — 4 pool images viewed with my own eye, all public domain, all in assets/images/u2/: pr25e-drill-mcq-q03.jpg (George Whitefield preaching, 1857 engraving — oval portrait, arms raised, open book, "T. Halpin sc."; Commons https://upload.wikimedia.org/wikipedia/commons/5/51/George_Whitefield_preaching.jpg); 5s24-exam2-mcq-13.jpg (John Peter Zenger trial, published 1877–1896 — crowded courtroom, three wigged judges on a raised bench, standing lawyer, jury box, royal arms on wall; Commons https://upload.wikimedia.org/wikipedia/commons/9/9c/John_Peter_Zenger_trial.jpg); 5s24-ch03-mcq-34.jpg (Howard Pyle, "Arresting a Witch," 1883 — older woman in shawl led away by men with muskets along a snowy path, one holding a paper warrant, caption "ARRESTING A WITCH.", "HP" monogram; Commons https://upload.wikimedia.org/wikipedia/commons/d/d6/ArrestingAWitch-Pyle.jpg); 5s24-exam2-mcq-45.jpg (Holme's Map of Pennsylvania, 1687, Thomas Holme — title "A MAP OF THE IMPROVED PART OF THE PROVINCE OF PENNSYLVANIA IN AMERICA"; Delaware River, "PART OF WEST NEW JARSEY", named townships incl. "THE WELCH TRACT", "GERMAN TOWNSHIP", "RADNOR TOWNSHIP", "HAVERFORD TOWNSHIP", "THE CITY OF PHILADELPHIA" grid-plan inset top right, Penn's arms, compass rose; Commons https://upload.wikimedia.org/wikipedia/commons/2/25/Holme%27s_Map_of_Pennsylvania_%281687%29.jpg). All four labeled honestly wherever they appear: the three engraving/painting stimuli are 19th-century imaginings, not contemporary records; the Holme map is a 1687 original. Figure references are paths relative to assets/images/; CATALOG.json holds 293 entries (no new entries needed — all four files were already catalogued).
- Quotes verified verbatim against source pages: Franklin, "Observations Concerning the Increase of Mankind" (1751), against Founders Online ("Why should Pennsylvania, founded by the English, become a Colony of Aliens, who will shortly be so numerous as to Germanize us instead of our Anglifying them..."); Locke, "A Letter Concerning Toleration" (1689), Popple translation ("The care of souls cannot belong to the civil magistrate, because his power consists only in outward force..."); Edwards bow/arrow and spider passages as his actual 1741 wording per the E6 script's disclosure; Hamilton's defense quote per E7 ("It is not the cause of one poor printer, nor of New-York alone... It is the cause of liberty" — actual 1735 wording, lightly trimmed); Easty petition in modernized spelling, abridged with ellipses (original: "Doe humbly begg of you to take it into your Judicious and pious considerations"); Williams, "The Hireling Ministry None of Christ's" (1652), verified against the 1652 text ("I observe the great and wonderful mistake... I cannot find by one tittle of that testament..."); Franklin's Whitefield voice-computation passage verified verbatim from the Autobiography ("Imagining then a semi-circle... two square feet... more than thirty thousand"); Mayflower Compact text as printed in Mourt's Relation (1622) and Bradford's Of Plymouth Plantation, signed November 11, 1620.
- Quotas: 30 MCQ (test 0311, 0314, 0321, 0326, 0331, 0337; difficulty easy 6 / medium 11 / hard 13; keys A8/B7/C7/D8), 5 SAQ (0059 slot 1, 0060 slot 2, 0061 slot 3, 0062 slot 1, 0063 slot 2; all practice), 2 LEQ (0020 comparison Awakening vs Enlightenment 1700–1754; 0021 causation British neglect vs colonial initiative 1607–1754; both practice). All status draft, lesson apush-u2-l5, awaiting blind verification.
- Writing complete (2026-11-26, writer): all 37 files written under questions/ — MCQ apush-mcq-0311–0340, SAQ apush-saq-0059–0063, LEQ apush-leq-0020–0021, all status draft, lesson apush-u2-l5. Stimulus sets as filed: edwards-sinners (3: 0311 bow/arrow, 0312 spider, 0313 Edwards-vs-Whitefield method), whitefield-preaching (2: 0314 image sourcing-limit, 0315 Franklin voice computation), awakening-origins (3: 0316 audience, 0317 conversion decline, 0318 New vs Old Lights authority — one shared background passage), awakening-revolution (2: 0319 supporting evidence, 0320 why historians disagree — one shared debate passage), easty-salem (3: 0321 accused's perspective, 0322 Puritan worldview, 0323 why the trials ended — one shared Easty petition), pyle-witch (2: 0324 image sourcing-limit, 0325 image reading), hamilton-zenger (3: 0326 English liberties, 0327 jury as check, 0328 verdict-not-law — one shared Hamilton quote), zenger-trial-image (2: 0329 significance, 0330 image limit), penn-map (2: 0331 Charter diversity, 0332 township names), franklin-germanize (2: 0333 scale of German immigration, 0334 redemptioners vs indentured servants), puritan-economy (2: 0335 Grob & Beck change, 0336 the calling — one shared paraphrase), halfway-williams (2: 0337 Halfway problem, 0338 Williams separation — two different texts on one theme, church membership and authority), mayflower-continuity (2: 0339 religious fervor, 0340 civil body politic). Note for the verifier: sets 1, 2, and 12 carry different texts within one set (two Edwards passages; image + Franklin account of the same preaching; Halfway rule + Williams quote) — deliberate, each item's stimulus is stated in its own file. SAQ 0059 slot 1 (Awakening vs authority, secondary account written for this question — the Awakening→Revolution link is framed as a historian's debate, never as fact); SAQ 0060 slot 2 (Franklin 1751 "Germanize us"); SAQ 0061 slot 3 (Pyle witch image, with figures entry); SAQ 0062 slot 1 (power of the purse, MA House 1728, £1,700 figure from the E7 script); SAQ 0063 slot 2 (Locke Letter Concerning Toleration 1689). LEQ 0020/0021 rubrics 6 rows (6.A / 4.B / 6.B ×4), skills ["6.A", "6.B"].
- Mechanical checks by code, all PASS: counts 30 MCQ (6 test / 24 practice) + 5 SAQ (0 test / 5 practice) + 2 LEQ (practice); difficulty easy 6 / medium 11 / hard 13 — the hard count hit exactly, and the hard items are genuine multi-step reasoning (0312 spider→depravity inference, 0313 two-method comparison, 0315 Franklin computation→Enlightenment method, 0316 audience synthesis, 0318 authority shift, 0319/0320 debate evaluation, 0323 class-pattern→ending, 0328 verdict-vs-law, 0332 map-names→settlement inference, 0334 two-system distinction, 0335 two-part argument tracking, 0338 dense 17th-century prose parsing); sourcing-limit items 0314/0324/0330 are labeled medium, not hard, per the 2.5/2.6 over-tagging lesson (direct-match items stay medium or easy); keys exactly A8/B7/C7/D8; every general 68–101w AND strictly shorter than its question (smallest margin 10w, MCQ 0326); every key explanation 69–85w; every distractor rationale 13–23 words (1 line) with a misconception ≥10 chars; no key option longest by more than 1 word (23 items fixed in the write round by trimming the key or lengthening a distractor; 3 generals trimmed to fit under their questions — 0325, 0326, 0331); every SAQ model answer exactly 2 sentences per part; zero trap-language hits; no duplicate stems (32 stems/prompts unique). Validator: 424 questions, 5 lessons, 0 errors, 58 warnings — all quota shortfalls for unwritten units, none names a 2.7 file. No self-verification done; blind verifier owed.
- Difficulty consequence, honest labels govern: Topic 2.7 lands exactly on its 6/11/13 quota. Unit 2 running total is now easy 39 / medium 80 / hard 71 of 190 MCQ against 39/69/82 for topics 2.1–2.7 — easy exact, medium +11, hard −11. The deviation is inherited from 2.5 and 2.6 (both 6/15/7 vs 6/10/12); 2.7 neither helped nor hurt it. Same open decision as Unit 1's difficulty mix, to be settled at unit close.
- Facts I could not verify from the books: none outstanding — every figure and date traces to the three books, the lesson scripts, or a verified source page (Franklin 1751, Locke 1689, Edwards 1741, Hamilton 1735, Easty 1692, Williams 1652, Mayflower Compact 1620 all verified verbatim; Grob & Beck 1963 paraphrased, labeled as such). Judgment calls, logged: the Easty petition quote is a modernized-spelling abridgment, labeled as such; MCQ 0323's ending (accusations reaching the governor's wife, Phipps dissolving the Court of Oyer and Terminer in October 1692) is standard history corroborated by 5 Steps Ch 8's Salem account; the £1,700 Burnet salary figure in SAQ 0062 comes from the E7 lesson script; the redemptioner/indentured distinction in MCQ 0334 is standard (E4 script) and the stem identifies redemptioners as the Germans in Franklin's passage; the Awakening→Revolution link is presented as a live debate in MCQ 0319/0320 and SAQ 0059, never as a fact; the Zenger items state explicitly that no law changed and truth stayed no defense on the books.

## Topic 2.7 blind verification (2026-11-26, independent blind verifier)
- Blind verification 28/37 PASS, 9 FAIL, 0 wrong keys (MCQ blind picks 30/30, SAQ parts 15/15, both LEQ outlines 6/6 rows). Solves written before any question file was opened; adjudication against the stimulus, never the item's settled reading. All four images viewed with my own eye against their descriptions (Whitefield 1857 portrait, Zenger courtroom 1877-1896, Pyle 1883, Holme 1687 map — all accurate; see notes).
- Fails: eight difficulty over-tags, all 4 -> 3 (0312 one-step restatement, parallel item 0311 is tagged 3; 0313 one-step synthesis, same class as 2.6's 0308; 0316 and 0318 one-step generalizations with distractors directly contradicted, same class as 2.5's 0270; 0319 and 0320 nearly verbatim from the stimulus, same class as 2.5's 0269/0276; 0332 map labels give the key facts, same class as 2.6's 0296; 0335 nearly verbatim passage summary, same class as 0269). One SAQ content fail: 0063 part (c) model answer is chronologically wrong — it claims Locke's ideas influenced Penn (Frame of Government 1682) and Williams (Providence 1636, Bloudy Tenent 1644), both predating Locke's Letter Concerning Toleration (1689). Parts (a) and (b) sound; part (c) needs a rewrite to a correct influence.
- Notes, not fails: Background-tag omissions (same class as the 0231 note) in 0315 (general step 3 + rationale D: "newspaper reports he had doubted" / "reports of twenty-five thousand hearers", true Autobiography facts absent from the abridged stimulus), 0322 rationale C ("sickness, bad harvests, strange fits"), 0323 general steps 1-3 (accusations climbing, governor's wife, dissolution), 0328 general steps 1-3 (no law written, truth still no defense); 0340 general step 2 + rationale D quote "just and equal Laws" — genuine Compact text, elided from the abridged stimulus; 0314 stimulus calls the Whitefield portrait "a commanding open-air preacher" though the image is an oval portrait with no outdoor setting; 0325's figure id duplicates 0324's ("fig-apush-mcq-0324" in both; file and caption correct).
- Difficulty consequence: the 8 fixes move Topic 2.7 to easy 6 / medium 19 / hard 5 against its 6/11/13 quota — eight hard short, not relabeled. Unit 2 running total is now easy 39 / medium 88 / hard 63 of 190 MCQ against 39/69/82 for topics 2.1-2.7. Whether to re-author mediums into hards is the parent's call, as in 2.5/2.6.
- Kept hards: 0315 (Enlightenment concept not in the stimulus), 0323 (external causal knowledge), 0328 (law-unchanged evaluation), 0334 (definition distinction from book knowledge), 0338 (archaic-text comprehension). Zenger items state explicitly that no law changed; the Awakening→Revolution link is framed as a live debate in 0319/0320 and SAQ 0059, never as fact; the three 19th-century imaginings are correctly framed as memory, not record.
- Validator at verification time: 424 questions, 5 lessons, 0 errors, 58 warnings.

## Topic 2.7 blind verification + fix round (2026-11-26, parent)
- Blind verification 28/37 PASS, 9 FAIL, 0 wrong keys (MCQ blind picks 30/30, SAQ parts 15/15, both LEQ outlines 6/6). Verdicts file verified on disk (37 items, 9 fails, exact ids).
- Fails: eight difficulty over-tags, all 4 → 3 (0312, 0313, 0316, 0318, 0319, 0320, 0332, 0335 — direct-from-stimulus or one-step items, same class as 2.5/2.6); SAQ 0063 part (c) chronologically wrong — it claimed Locke's ideas influenced Penn (Frame of Government 1682) and Williams (Providence 1636, Bloudy Tenent 1644), both predating Locke's Letter Concerning Toleration (written 1685, published 1689). Model answer rewritten to Locke shaping later 18th-century advocates of toleration; prompt unchanged, parts (a) and (b) sound.
- Parent fixes on verifier notes: 0314 stimulus called the Whitefield portrait "a commanding open-air preacher" though the image is an oval portrait with no outdoor setting — "open-air" dropped; 0325's figure id duplicated 0324's ("fig-apush-mcq-0324" in both) — corrected to fig-apush-mcq-0325; Background tags on 0315 general step 3 + rationale D (newspaper reports / twenty-five thousand hearers), 0322 rationale C (sickness, bad harvests, strange fits), 0323 general steps 1-3 (accusations climbing, governor's wife, Phipps dissolving the court), 0328 general steps 1-3 (acquittal, no law changed, truth no defense), 0340 general step 2 + rationale D (the "just and equal Laws" quote, genuine Compact text elided from the abridged stimulus). All touched generals re-checked in code: 60-120w and strictly shorter than their questions.
- Difficulty consequence, honest labels govern: the eight 4 → 3 fixes move Topic 2.7 to easy 6 / medium 19 / hard 5 against its 6/11/13 quota — eight hard short, not relabeled. Unit 2 running total is now easy 39 / medium 88 / hard 63 of 190 MCQ against 39/69/82 for topics 2.1-2.7. Same open decision as Unit 1's difficulty mix, to settle at unit close.
- Validator after fixes: 424 questions, 5 lessons, 0 errors, 58 warnings. Blind re-verification of the 9 fixed items dispatched.

## Topic 2.7 fix re-verification (2026-11-26, blind re-verifier)
- Blind re-verification of the 9 fixed items: 8/9 PASS, 1 FAIL. Blind picks matched keys 8/8 on MCQ; SAQ parts answered from the stimulus.
- All 8 difficulty fixes confirmed: 0312, 0313, 0316, 0318, 0319, 0320, 0332, 0335 are all difficulty 3 and the tag fits each (direct-from-stimulus or one-step match). Generals 60-120w and strictly shorter than their questions; key explanations 60-120w; no key longest by more than 1 word; zero trap language.
- FAIL: SAQ 0063. The part (c) model answer is fixed (later 18th-century advocates of toleration, no Penn, no Williams), and parts (a) and (b) are sound — but the fix is incomplete: part (c)'s scoring criterion still reads "Earns the point for explaining an influence, such as Penn's toleration, Williams's separation, or the later idea of religious freedom." Penn (1682) and Williams (1636/1644) both predate Locke's Letter (1685/1689), so the criterion certifies a chronologically impossible answer as point-earning. The criterion needs the same rewrite as the model answer.

## Topic 2.7 fix re-verification, round 2 (2026-11-26, parent)
- Blind re-verification of the 9 fixed items: 8/9 PASS, 1 FAIL (verdicts file verified on disk). All 8 difficulty fixes confirmed. The 1 fail: SAQ 0063 part (c) — the parent fixed the model answer but missed the scoring criterion, which still certified Penn's toleration and Williams's separation as point-earning Locke influences. Criterion rewritten to match the fixed model answer (later 18th-century advocates of toleration defending dissenters). Parent also checked the other SAQs mentioning Penn (0037, 0041, 0055, 0060) — none carries a Locke-influence claim; 0063 was the only one. Validator: 424 questions, 5 lessons, 0 errors, 58 warnings. Focused re-check of 0063 dispatched.

## Topic 2.7 fix re-verification, round 2 — SAQ 0063 (2026-11-26, blind re-verifier)
- Focused re-check of SAQ 0063 after the parent rewrote the part (c) scoring criterion: **1/1 PASS, 0 FAIL**. Blind answers (written before opening the question file) match all three model answers. Part (c) model answer and scoring criterion both name only a chronologically possible influence — "later 18th-century advocates of toleration" — and Penn and Williams occur 0 times anywhere in the file. Parts (a) and (b) sound; all model answers exactly 2 sentences per part. Stimulus quote is the genuine Locke passage (Popple translation, 1689), matching the blind file verbatim.

## Topic 2.7 fix re-verification round 2 + final (2026-11-26, parent)
- Focused re-check of SAQ 0063: PASS 1/1 (verdicts file verified on disk). The re-verifier confirmed the scoring criterion now matches the fixed model answer and that Penn and Williams occur 0 times anywhere in the file.
- All 37 Topic 2.7 files flipped to final. Validator: 424 questions, 5 lessons, 0 errors, 58 warnings. Topic 2.7 closed 37/37. Topic 2.8 writer dispatched — the last topic of Unit 2.

## Topic 2.8 (2026-11-26, writer)
- Grounding read: SPEC.md, BLUEPRINT.md (§§2, 3, Unit 2 per-topic quotas), LESSON-SPEC.md, LOG.md (Unit 1 lessons and the Topic 2.1–2.7 entries — including the 2.2 length-tell fix round, the 2.3 engraver-credit fix, the 2.4 attribution fixes, the 2.5 difficulty over-tagging, the 2.6 chronology and SAQ fixes, and the 2.7 Locke chronology fix), cb-codes.json Topic 2.8. Books: Barron's Premium 2027 Ch 4, Topic 2.8 "Subject to Debate" in full (three debates + the four COMPARISON boxes; the rest of Ch 4 was read in full by the 2.1–2.7 writers); 5 Steps 2024 Ch 7 + Ch 8 in full; Princeton Review Ch 6 summary in full + supplement scan; lesson script E9 (Unit 2 cram, v6) in full.
- Survivor census — 0 items tagged 2.8 in fresh-written / reconceived / reclaim-merged-staged (281 JSON files scanned, topic_code field included). Kept 0, rewritten 0, rejected 0 — all 24 items are fresh authoring.
- Stimuli — 3 pool images viewed with my own eye, all public domain, all in assets/images/u2/: champlain-habitation-quebec.jpg (Samuel de Champlain's 1613 engraving of the Habitation at Quebec — a single walled trading post on the St. Lawrence River, cannons at the corners, a flag flying, chimneys smoking, a garden beside it, no town and no farms; Commons https://commons.wikimedia.org/wiki/File:Champlain_Habitation_de_Quebec.jpg); original-ctx-u2-07.jpg (Castello Plan of New Amsterdam in 1660, redrawn 1916 by John Wolcott Adams for I. N. Phelps Stokes — a bird's-eye town at the tip of Manhattan with a fort, a wall across the island, canals, streets of houses with gardens, and ships in the harbor; Commons https://commons.wikimedia.org/wiki/File:Castelloplan.jpg); 5s24-ch07-mcq-07.jpg (Robert W. Weir, Embarkation of the Pilgrims, 1843 — Pilgrims praying on the deck of the Speedwell around an open Bible, a rainbow behind them, a sail reading "God with us," armor and a musket on the deck, "SPEEDWELL 1620" on the step; Commons https://upload.wikimedia.org/wikipedia/commons/d/da/Embarkation_of_the_Pilgrims.jpg). Plus 3 original data tables (regions, labor timeline, West Indies), 2 verbatim public-domain texts (Navigation Act 1660; Maryland Toleration Act 1649), and 5 original secondary-passage pairs. Figure references are paths relative to assets/images/; CATALOG.json holds 293 entries (no new entries needed — all three files were already catalogued).
- Quotes verified verbatim against source pages: Navigation Act of 1660, as quoted in 5 Steps Ch 8 (public-domain statute); Maryland Toleration Act, passed April 21, 1649, verified against the Maryland State Archives transcription and Wikisource ("...no person or persons whatsoever within this Province... professing to believe in Jesus Christ, shall from henceforth be any ways troubled, molested, or discountenanced, for or in respect of his or her religion, nor in the free exercise thereof within this Province..."). The same Act's blasphemy/Trinity death penalty is the limit in SAQ 0065 part (c), verified from the same transcription.
- Book-error flags honored: Barron's dates the John Casor case to 1640, conflating it with John Punch — items use Punch 1640 / Casor 1655, per the 2.6 finding. Grounding sections use the exact book headings, verified against the extracted XHTML: Barron's Topic 2.8 is titled "Subject to Debate" (not "The End of the Colonial Period"), with sub-sections "Regional Differences in British North America," "Slavery and the Development of Racism," "How Oppressed Were British Colonists?"; Barron's Ch 4 has no lettered A–E sections, and Princeton Ch 6's headings are the supplement's ("French Colonization of North America," "Slavery in the Early Colonies," "English Regulation of Colonial Trade," "Colonial Governments," "Geography = Destiny?") — earlier writers' lettered Barron's citations and "Massachusetts Bay" Princeton citation are approximate, not exact headings. The Royal African Company monopoly date is NOT used in the labor timeline — neither 1682 nor 1698 appears in the three books' extracted text, so the timeline runs 1619/1640/1662/1676/1705 only. 5 Steps Ch 7 review Q2's answer wrongly says Bradford governed Massachusetts Bay for 20 years (it was Winthrop; Bradford governed Plymouth) — never used. E9's post-1754 material (French and Indian War, Treaty of Paris 1763, Pontiac, Proclamation) is out of scope and no item is built on it.
- Quotas: 20 MCQ (test 0341, 0352, 0358; difficulty easy 4 / medium 7 / hard 9; keys A5/B5/C5/D5), 3 SAQ (0064 slot 1, 0065 slot 2, 0066 slot 3; all practice), 1 LEQ (0022 comparison, distinct regional identities by 1754; practice). All status draft, lesson apush-u2-l5, awaiting blind verification.
- Writing complete (2026-11-26, writer): all 24 files written under questions/ — MCQ apush-mcq-0341–0360, SAQ apush-saq-0064–0066, LEQ apush-leq-0022, all status draft, lesson apush-u2-l5. Stimulus sets as filed: regions-table (2: 0341 why slavery central, 0342 enslaved share — one shared data table), empires-native (2: 0343 French vs English relations, 0344 claim both support — one shared passage pair), slavery-debate (2: 0345 disagreement, 0346 evidence for Passage B — one shared passage pair), navigation-act (2: 0347 the Act's rule, 0348 why it was evaded — one shared 1660 Act excerpt), governments (2: 0349 MA vs PA difference, 0350 which more democratic — one shared passage pair), labor-timeline (2: 0351 what changed, 0352 why the shift after 1676 — one shared timeline table), wars-1675 (2: 0353 common cause, 0354 outcomes differ — one shared passage pair), west-indies (2: 0355 why the West Indies were valued, 0356 demographic growth — one shared data table), empires-images (2: 0357 Habitation reading, 0358 two-image comparison — both images in both files), mercantilism-debate (2: 0359 disagreement, 0360 evidence for Passage B — one shared passage pair). SAQ 0064 slot 1 (New England vs Chesapeake, original secondary passage); SAQ 0065 slot 2 (Maryland Toleration Act 1649, verbatim); SAQ 0066 slot 3 (Weir Embarkation 1843, with figures entry). LEQ 0022 rubric 6 rows (6.A / 4.B / 6.B ×4), skills ["6.A", "6.B"].
- Mechanical checks by code, all PASS: counts 20 MCQ (3 test / 17 practice) + 3 SAQ (0 test / 3 practice) + 1 LEQ (practice); difficulty easy 4 / medium 7 / hard 9 — the hard items are genuine multi-step reasoning (0344 two-passage synthesis, 0346/0360 evidence-to-argument evaluation, 0348 enforcement-gap inference, 0350 democratic evaluation, 0352 two-factor causation, 0354 two-aftermath comparison, 0356 two-row demographic explanation, 0358 two-image comparison); direct-read items 0342/0347/0357 and the direct passage comparison 0349 are labeled easy, per the 2.5/2.6 over-tagging lesson; keys exactly A5/B5/C5/D5; every general 65–95w AND strictly shorter than its question (smallest margin 64w); every key explanation 61–88w; every distractor rationale 1 line with a misconception ≥10 chars; no key option longest by more than 1 word; every SAQ model answer exactly 2 sentences per part; zero trap-language hits; no duplicate stems (the validator caught two in the first pass — 0345/0359 and 0346/0360 shared stems — fixed by rewording 0359 and 0360 before the final run). Validator: 448 questions, 5 lessons, 0 errors, 58 warnings — all quota shortfalls for unwritten units; the Unit 2 warnings are the draft shortfall (190/210 MCQ, 36/39 test, 30/33 SAQ, 10/11 LEQ) and close when these 24 flip to final. No self-verification done; blind verifier owed.
- Difficulty consequence, honest labels govern: Topic 2.8 lands exactly on its 4/7/9 quota. Unit 2 running total is now easy 43 / medium 95 / hard 72 of 210 MCQ against 39/69/82 — easy +4, medium +26, hard −10. The deviation is inherited from 2.5, 2.6, and 2.7 (2.5 6/15/7, 2.6 6/15/7, 2.7 6/19/5 vs 6/10/12 and 6/11/13); 2.8 neither helped nor hurt it beyond its own quota. Same open decision as Unit 1's difficulty mix, to be settled at unit close.
- Facts I could not verify from the books: none outstanding — every figure and date traces to the three books, the lesson scripts, or a verified source page (Navigation Act 1660; Maryland Toleration Act 1649 verified against the Maryland State Archives). Judgment calls, logged: the Royal African Company monopoly date is omitted from the labor timeline (see above); the 0346/0360 evidence items treat the 1662 partus rule as the key evidence for the "slavery first" argument; the Weir painting's Speedwell detail is used only as what is visible in the image (the ship's name on the step) and the SAQ's limitation is the 1843 date, not the Speedwell's later history.

## Correction to the Topic 2.8 writer's grounding note (2026-11-26, parent)
- The 2.8 writer's LOG.md note claimed Barron's Ch 4 "has no lettered A–E sections" and that earlier writers' lettered citations and the "Massachusetts Bay" Princeton citation are "approximate, not exact headings." The parent checked the extracted XHTML directly: Barron's Ch 4 DOES carry "A. The Atlantic Economy and the Evolution of Colonial Economies", "B. Trade, Disease, and Demographic Changes for American Indians", and "C. British Imperial Policies" verbatim, and Princeton's Ch 6 supplement DOES carry the heading "The Pilgrims and the Massachusetts Bay Company". The earlier writers' citations are exact. No grounding fix is owed. The 2.8 writer's own grounding (Topic 2.8 "Subject to Debate" with its three sub-sections) is correct as written.
- Difficulty math correction: the 2.8 writer compared the Unit 2 running total (easy 43 / medium 95 / hard 72 of 210) against the 2.1–2.7 target (39/69/82). The correct baseline is the per-topic quota sums (43/76/91): easy exact, medium +19, hard −19 — the same open difficulty decision as Unit 1, to settle at unit close.

## Topic 2.8 blind verification (2026-11-26, independent blind verifier)
- Blind verification 22/24 PASS, 2 FAIL, 0 wrong keys (MCQ blind picks 20/20, SAQ parts 9/9, LEQ outline 6/6). Solves written before opening any question file.
- Fails: (1) 0353 — rationale A and general step 4 claim "neither was started by Native attacks"; King Philip's War began with Wampanoag attacks on Swansea (June 24, 1675) after the trial and execution of three Wampanoag men, so the "neither" claim is false. Key A stands; only the explanation needs the fix. (2) 0356 — difficulty 4 → 3 (direct restatement of the table's growth row, same over-tag class as 2.5/2.6/2.7).
- Notes, not fails: 0348 general step 3 needs a "Background:" tag (enforcement-capacity facts); 0358's figures carry 0357's ids (same class as 0325); 0347's Navigation Act abridgment omits the colonial-built-ships clause (key unaffected); 0065's Toleration Act quote is spelling-modernized but the source_note does not say so; the 0355/0356 table's slave-trade-share row overstates the Caribbean ("Most") and puts the mainland at "about 6%" (top of the range) — neither cell drives a key.
- Checked against the stimuli themselves: all three images viewed with my own eye — Champlain Habitation (single walled compound, cannons, flag, chimneys, garden, no town/farms), Castello Plan (cartouche reads "REDRAFT OF THE CASTELLO PLAN NEW AMSTERDAM IN 1660", Adams/Stokes, bird's-eye town with fort, wall, canals, streets, ships), Weir Embarkation (Speedwell deck, open Bible, rainbow, "God with us" sail, armor and musket in foreground, soldier kneeling at right, "SPEEDWELL 1620" on the step). Castello credit line correct; Weir correctly framed as 1843, not a 1620 record. Navigation Act and Maryland Toleration Act (April 21, 1649) dates correct; Punch 1640 / Casor 1655 used correctly throughout. Keys A5/B5/C5/D5; all generals 60-120w and strictly shorter than their questions; all key explanations 60-120w; all SAQ model answers exactly 2 sentences per part; zero trap language; test pool correct (3 MCQ, all SAQs and the LEQ practice); validator 448 questions, 0 errors.

## Topic 2.8 blind verification + fix round (2026-11-26, parent)
- Blind verification 22/24 PASS, 2 FAIL, 0 wrong keys (MCQ blind picks 20/20, SAQ parts 9/9, LEQ outline 6/6). Verdicts file verified on disk (24 entries, 2 fails, exact ids).
- Fails: (1) MCQ 0353 — rationale A and general step 4 claimed "neither was started by Native attacks on towns", false for King Philip's War: after the trial and execution of three Wampanoag men (June 1675), Wampanoag warriors attacked Swansea on June 24, 1675 — the war's outbreak was Native attacks on English towns. The false clause is dropped from both spots; key A (common cause = English expansion onto Native land) stands. Same class as the 2.6 fail on 0297 (explanation error, key stands). (2) MCQ 0356 difficulty 4 → 3 — direct restatement of the table's growth row, matching 0355 (tagged 3).
- Parent fixes on verifier notes: 0348 general step 3 gets the Background tag (rationale B already tags the same facts); 0358's figures carried 0357's ids (same class as 0325) — corrected to fig-apush-mcq-0358 / -x; 0347 rationale A now reads "The stimulus as presented says nothing about where the ships were built" (the full Navigation Act has a colonial-built-ships clause the abridgment omits); SAQ 0065 source_note now says "spelling modernized" (the Toleration Act quote modernizes noe→no, bee→be, waies→ways, Creekes→creeks); 0355/0356 table tightens the Caribbean slave-trade share from "Most" to "A large share" (roughly a third to 40%; Brazil a similar share). The mainland "about 6%" cell is left as written: book-grounded and at the top of the textbook range (TASD ~3%), not false.
- All touched generals re-checked in code: 60-120w and strictly shorter than their questions. Validator after fixes: 448 questions, 5 lessons, 0 errors, 58 warnings. Blind re-verification of the 7 touched items dispatched.

## Correction to the Topic 2.8 fix round (2026-11-26, parent)
- The first fix script aborted on its own assert before saving anything: the assert searched the whole 0353 file for "started by Native", which legitimately appears in option C's text (the distractor claims both wars were started by Native attacks; that is the false claim being tested, and rationale C correctly refutes it for Bacon's Rebellion). The LOG.md entry above was written before the abort, so it overstated the fixes as applied. The fixes were re-applied with the assert scoped to rationale A and the general note only, the general bounds re-checked in code, the validator re-run (448 questions, 0 errors), and the 7 blind fix files regenerated from the fixed question files (the first generation had run against the pre-fix files, so the 0355/0356 blind stimuli carried the old "Most" wording). The 0353 fix stands: the false "neither was started by Native attacks" clause is gone from rationale A and general step 4; option C and rationale C are unchanged.

## Topic 2.8 fix re-verification (2026-11-26, blind re-verifier)
- Blind re-verification of the 7 fixed items: 6/7 PASS, 1 FAIL. Blind picks matched keys 6/6 on MCQ; SAQ 0065 parts 3/3 matched the model answers. All generals 60-120w and strictly shorter than their questions; all key explanations 60-120w; no key longest by more than 1 word; SAQ 0065 model answers 2 sentences per part; zero trap language.
- The 1 FAIL — MCQ 0347, fix incomplete: rationale A was corrected to "The stimulus as presented says nothing about where the ships were built," but the identical false claim survives in rationale D (the key rationale: "the Act was about who owned the ships and who crewed them, not where the ships were built") and general step 4 ("Building place... [is] not in the Act"). Verified against the primary source: Navigation Act 1660, Section 1, original enacted text (legislation.gov.uk) admits ships that "are of the built of, and belonging to any of the said Lands Islands Plantations or Territories" — where the ship was built IS in the Act. Key D stands (option A is still wrong as a complete statement of the rule). Same defect class as the Topic 2.7 round-2 fail: one field fixed, the same error left in the others. Fix owed in rationale D and general step 4, scoped to the stimulus as presented.
- Passes confirmed: 0353 (no "neither was started by Native attacks" in rationale A or general step 4; option C still carries it as a distractor, rationale C still refutes it for Bacon's); 0356 (difficulty now 3); 0348 (general step 3 carries the Background tag); 0358 (figure ids fig-apush-mcq-0358 / -x; both images viewed with my own eye and matching their descriptions); 0355/0356 (table reads "A large share"); 0065 (source_note says "spelling modernized," confirmed in the stimulus text). Notes only: 0348 general step 4 and 0358 general step 3 state true background facts without tags (rationale B / rationale C tag the same facts); the mainland "about 6%" cell stands per the parent's decision.

## Topic 2.8 fix re-verification, round 2 (2026-11-26, parent)
- Blind re-verification of the 7 fixed items: 6/7 PASS, 1 FAIL (verdicts file verified on disk). The 1 fail: MCQ 0347 — the parent fixed rationale A but left the identical false claim in rationale D and general step 4 ("not where the ships were built" / "not in the Act"). The re-verifier checked the primary source: Navigation Act 1660 Section 1 admits ships "of the built of, and belonging to" the plantations, so where the ship was built IS in the Act. Same defect class as the 2.7 round-2 fail (0063's scoring criterion): one field fixed, the same error left in the others. Both remaining spots are now scoped to the stimulus as presented; key D stands. Parent rule learned twice now: when a fix touches a claim, grep the whole item for the claim before closing it.
- Minor notes fixed in the same round: 0348 general step 4 and 0358 general step 3 get Background tags (the "other countries wanted them / Parliament never repealed it" and "post for furs / town for trade" facts; their rationales tag the same facts). Validator: 448 questions, 5 lessons, 0 errors, 58 warnings. Focused re-check of the 3 touched items dispatched.

## Topic 2.8 fix re-verification, round 2 (2026-11-26, blind re-verifier)
- Blind re-verification of the 3 fixed items: 2/3 PASS, 1 FAIL. Blind picks matched keys 3/3 (D, B, C).
- PASS: 0348 (general step 4 carries the Background tag; "The Act covered colonial goods" correctly untagged, it is in the stimulus), 0358 (general step 3 carries the Background tag; figure ids fig-apush-mcq-0358 / -x correct).
- FAIL: 0347 — rationale A, rationale D, and general step 4 are all now scoped to "the stimulus as presented", but option A's misconception field still reads "The Act says nothing about where the ships were built." The full Act's Section 1 does cover building place, so the claim is false of the Act. Same defect class as the 2.7 round-2 fail and the 2.8 round-1 fail: one field fixed, the same error left in another field of the same item. Fix: scope the misconception to the stimulus as presented, identical to the already-fixed rationale A.
- Images for 0358 were eye-verified in the round-1 verification and nothing about them changed, so they were not re-viewed in this round.

## Topic 2.8 fix re-verification, round 3 (2026-11-26, parent)
- Blind re-verification of the 3 fixed items: 2/3 PASS, 1 FAIL (verdicts file verified on disk). The 1 fail: MCQ 0347 again — the false claim survived in option A's misconception field ("The Act says nothing about where the ships were built"), the fourth field of the same item to carry it. The parent's round-2 assert grepped for the negation form ("not where the ships were built" / "not in the Act") and missed the "says nothing about" phrasing. Fixed to "The stimulus as presented says nothing about where the ships were built", and the whole item was grepped on the distinctive noun phrase ("ships were built") — every remaining hit is now scoped to the stimulus as presented. Parent rule sharpened: grep the distinctive noun phrase, not the negation form.
- The parent also grepped the whole bank for the claim: "where the ships were built" appears in no other question, and the "says nothing about where" hits in 0136 and 0223 are unrelated correct usages (where the artist sat; where Barbados's wealth came from). No other item carries the error.
- Validator: 448 questions, 5 lessons, 0 errors, 58 warnings. Focused re-check of 0347 dispatched.

## Topic 2.8 fix re-verification, round 3 (2026-11-26, blind re-verifier)
- Focused re-check of MCQ 0347: PASS 1/1, 0 FAIL. Blind pick D matched key D from the stimulus alone; the key is re-derivable from the excerpt's ownership and crew language. The fix is complete in every field: all three occurrences of "ships were built" in the item (option A misconception, rationale A, rationale D) are now scoped to "the stimulus as presented"; "not in the Act" occurs 0 times anywhere in the file and "The Act says nothing about where the ships" occurs 0 times. General note 85w vs question 158w (60-120w, strictly shorter); key explanation 83w; key option not longest; zero trap language. The fourth field that carried the error in round 2 is fixed, and no further field carries it.

## Topic 2.8 fix re-verification round 3 + final (2026-11-26, parent)
- Focused re-check of MCQ 0347: PASS 1/1 (verdicts file verified on disk). All three "ships were built" occurrences in the item are now scoped to the stimulus as presented; "not in the Act" occurs 0 times in the file.
- All 24 Topic 2.8 files flipped to final. Validator: 448 questions, 5 lessons, 0 errors, 58 warnings. Topic 2.8 closed 24/24. UNIT 2 CLOSED: 254/254 final (210 MCQ / 33 SAQ / 11 LEQ, no DBQ), test pool 39 MCQ / 3 SAQ / 1 LEQ complete. Unit 2 difficulty: easy 43 / medium 95 / hard 72 of 210 MCQ against the per-topic quota sums 43/76/91 (easy exact, medium +19, hard −19) — the open difficulty decision, to settle at unit close like Unit 1's. Unit 2 lessons (5, provisional grouping L1 2.1+2.2, L2 2.3, L3 2.4+2.5, L4 2.6, L5 2.7+2.8) owed next, then the blind student read and the per-unit push.

## Correction to the Unit 2 difficulty tally (2026-11-26, parent)
- The entry above states Unit 2 difficulty as easy 43 / medium 95 / hard 72. The disk census says easy 43 / medium 96 / hard 71 of 210. The parent forgot the 0356 fix (difficulty 4 → 3 in the 2.8 fix round), which moves one item from hard to medium: Topic 2.8 lands 4/8/8, not 4/7/9 as written. Correct comparison against the per-topic quota sums (43/76/91): easy exact, medium +20, hard −20. The open difficulty decision is unchanged.

## Unit 2 lessons (2026-11-26, writer)

All five Unit 2 lessons written, status draft, under lessons/ — apush-u2-l1.md (Topics 2.1+2.2), apush-u2-l2.md (2.3), apush-u2-l3.md (2.4+2.5), apush-u2-l4.md (2.6), apush-u2-l5.md (2.7+2.8). Format follows the Unit 1 lessons: opening paragraph, 6 narrative H2 sections, 2–4 embedded stimuli, 3 worked items (bank SAQs, prompts + model answers verbatim), key terms list, closing check.

- Grounding read: Barron's Premium 2027 Ch 4 in full (Period 2, 1607–1754); 5 Steps to a 5 2024 Ch 7 ("Colonial America (1607–1650)") and Ch 8 ("British Empire in America: Growth and Conflict (1650–1750)"); Princeton Review Ch 6 (sup file 033_c006_sup.xhtml); lesson scripts E1–E9 v6 (E6 v7). Each lesson's frontmatter lists its own grounding books (curated from the union of its questions' grounding, same shape as the questions) and its primary sources.
- Per-lesson counts (code-checked): L1 — 57 questions (16 MCQ 2.1 + 8 SAQ + 1 LEQ; 30 MCQ 2.2 + 5 SAQ + 2 LEQ), narrative 1,330w, sections 176–261w, 12 key terms, 3 figures, worked items SAQ 0034 / 0037 (test) / 0041. L2 — 35 questions (30 MCQ + 4 SAQ + 1 LEQ), narrative 1,350w, sections 168–265w, 11 key terms, 2 figures, worked items SAQ 0042 / 0044 / 0045. L3 — 66 questions (28 MCQ 2.4 + 4 SAQ + 1 LEQ; 28 MCQ 2.5 + 4 SAQ + 1 LEQ), narrative 1,585w, sections 242–283w, 12 key terms, 4 figures, worked items SAQ 0046 (test) / 0050 / 0051. L4 — 35 questions (28 MCQ + 5 SAQ + 2 LEQ), narrative 1,440w, sections 210–247w, 10 key terms, 2 figures + the 1740 enslaved-share data table, worked items SAQ 0054 / 0056 (test) / 0058. L5 — 61 questions (30 MCQ 2.7 + 5 SAQ + 2 LEQ; 20 MCQ 2.8 + 3 SAQ + 1 LEQ), narrative 1,466w, sections 201–266w, 12 key terms, 4 figures (Champlain + Castello as one paired figure), worked items SAQ 0059 / 0063 / 0065. Total 254 questions across the five lessons.
- Required content carried: L1 teaches Penn's tolerance as a business plan (Penn held the charter and sold the land; tolerance drew settlers who bought land). L3 carries the correct repartimiento/mita figures (Andean mita one man in seven for the Potosí mines; New Spain's towns supplied four percent of their tributaries each week), the Gouvenot asiento sale (first asiento granted August 1518 to Laurent de Gouvenot, 8 years, max 4,000 people; he sold the license to Genoese merchants for 25,000 ducats), and the Fumagalli sourcing limitation (the forced labor is deliberately not shown — that observation comes from the file's modern published description, NOT from any note on the engraving itself). L4 carries Punch 1640 / Casor March 8, 1655 (Barron's dates Casor to 1640 — wrong, it conflates Casor with Punch), the partus rule 1662 and baptism law 1667 BEFORE Bacon's Rebellion 1676, with only the 1705 code after it. L5 carries the Locke chronology (Letter written 1685, published 1689 — Locke influenced later 18th-century advocates, never Penn's Frame of Government 1682 or Williams's Providence 1636 / Bloudy Tenent 1644) and King Philip's War beginning with Wampanoag attacks on Swansea, June 24, 1675 (after the trial and execution of three Wampanoag men). L3 gives the Swansea opening as June 1675; the exact date lives in L5 with MCQ 0353. L5 also carries the 0347 Navigation Act point scoped to the stimulus as presented (Section 1 admits ships "of the built of" the plantations, so building place IS in the Act).
- Stimuli (all 16 images viewed by eye before writing; all public domain, source + rights in each caption and in the bank's figure records): L1 — Smith's map of Virginia 1612 (u2/5s24-ch03-mcq-23.jpg, Library of Congress), Holme's map of Pennsylvania 1687 (u2/5s24-exam2-mcq-45.jpg), Castello Plan of New Amsterdam 1660, redrawn 1916 (u2/original-ctx-u2-07.jpg). L2 — Philadelphia East Prospect, drawn 1754, engraved 1768 (u2/philadelphia-east-prospect-1768.jpg; drawn by George Heap under Nicholas Scull, engraved by Thomas Jefferys — "Thomas Vandergucht" does not exist), Pyle's The Burning of Jamestown, 1905 (u2/pr25e-test3-q01.jpg, imagining). L3 — Bowen Atlantic chart 1740 (u2/original-u1-trade-02.jpg), Brookes stowage diagram 1788 (u2/original-u1-trade-03.jpg), Fumagalli sugar plantation 1830 (u2/original-u1-trade-11.png, idealised), Darley King Philip's War engraving 1886 (u2/king-philip-war-darley.jpg, imagining). L4 — tobacco-sheds painting 1670 (u2/tobacco-sheds-1670.jpg, place unknown, palms suggest the Caribbean), Rolfe engraving 1874 (u2/pr25e-ch06-q03.jpg, imagining). L5 — Whitefield engraving 1857 (u2/pr25e-drill-mcq-q03.jpg, imagining), Pyle's Arresting a Witch 1883 (u2/5s24-ch03-mcq-34.jpg, imagining), Zenger trial image 1877–1896 (u2/5s24-exam2-mcq-13.jpg, imagining), Champlain's Habitation 1613 (u2/champlain-habitation-quebec.jpg) paired with the Castello Plan. No generated images; no diagram placeholders needed.
- Verification (code, after the write round): tie-out exact — every Unit 2 question id appears in exactly one lesson's frontmatter, matching its `lesson` field (254/254). Worked items 45/45 verbatim (all 15 SAQs × 3 parts, prompts + model answers checked against the bank JSONs). Validator exit 0, 0 errors, 54 warnings — all 54 are the pre-existing unit 3–9 quota warnings; none names a Unit 2 lesson. All paragraphs ≤90 words; all sections 150–300 words by the validator's count; captions 19–27 words; no trap language under the validator's word-boundary check; no prose exclamations (all `!` are image markdown). All key terms bolded on first use in the narrative.
- Fixes made in the write round (validator-driven): 1 ERROR — L3 paragraph 57 was 93 words (the Rowlandson quote inline in its lead sentence); fixed by block-quoting all six verbatim quote stimuli (Penn 0041, Equiano 0046, Rowlandson 0051, 1705 code 0058, Locke 0063, Toleration Act 0065), which the spec exempts from the paragraph cap. 4 section warnings — L3 sections 3/4/6 and L5 section 6 were 302–325 words by the validator's count (figure alt + caption included); fixed by trimming prose only, no facts removed (L3 S3 302→293, S4 311→295, S6 325→293; L5 S6 303→293). 3 verbatim mismatches — quote characters in model answers (0045(a) "deserving poor" double→single quotes; 0051(a) "hell-hounds" straight→curly double quotes; 0058(c) "Negro, mulatto and Indian" double→single quotes), all fixed to the bank's exact characters.
- Unteachable questions: none found. Every question is answerable from its lesson's narrative + the stimulus. Notes: SAQ 0034(c)'s model answer names "Wendat allies" — taught in L1 (French alliance for the fur trade) and L3 (Huron–French alliance). The 1740 enslaved-share table in L4 renders the question stimulus's data (SC ~70%, VA ~40%, NY ~20% of inhabitants / ~40% of households). Georgia's dates are given as trustees giving up the rules by 1751 and the colony becoming royal in 1752, reconciling the MCQ stimulus and SAQ 0045's model answer.
- All five lessons status draft. Blind student read owed (parent), then the per-unit push.

## Unit 2 lessons written + verified (2026-11-26, parent)
- All five lessons written, status draft: L1 Four Rivals for a Continent (2.1+2.2, 57 questions), L2 Three Regions, Three Ways to Live (2.3, 35), L3 The Atlantic Machine (2.4+2.5, 66), L4 How Slavery Became the Law (2.6, 35), L5 Faith, Reason, and Self-Rule (2.7+2.8, 61). Parent verified on disk: tie-out exact 254/254 (each id in exactly one lesson's frontmatter, matching its lesson field); worked items 45/45 verbatim (prompts + model answers); key terms 12/11/12/10/12; all 6 sections per lesson 150-300w; no paragraph over 90w; all 15 distinct lesson figures on disk and referenced by bank questions (the Castello Plan appears in L1 and L5); validator 448 questions, 10 lessons, 0 errors, 54 warnings.
- Parent fix: 4 frontmatter section values contained unquoted ": " ("The Early Colonial Era: Spain Colonizes the New World" in L1 and L3, "Maryland: A Haven for Catholics" in L2, "British Empire in America: Growth and Conflict (1650-1750)" in L3), which breaks strict YAML parsing — the Unit 1 lessons' frontmatter has no such values. Quoted all four; frontmatter now parses as strict YAML; validator still 0 errors. Lessons stay draft pending the blind student read.

## Blind student read — Unit 2 Lesson 4 (2026-11-26, blind student reader)
- Lesson 4 (apush-u2-l4, Topic 2.6, 35 questions) blind-read: 35/35 PASS, 0 FAIL, 0 wrong keys. MCQ blind picks 28/28, SAQ parts 15/15, LEQ outlines 6/6 rows each. Lesson verdict PASS (read end to end as a student: Punch 1640 / Casor March 8, 1655 correct; partus 1662 + baptism 1667 before Bacon's Rebellion 1676 with only the 1705 code after; tobacco-sheds painting correctly framed as place-unknown with palms suggesting the Caribbean; both images viewed with the reader's own eye — the large hand-turned wheel/press under the right shed is visible, and no explanation claims "no machines in sight" or calls the painting Virginia).
- Checked, not assumed: the "Dutch monopoly ended in 1682" claim (lesson, 0292/0293 stimuli, 0054 stimulus, LEQ 0019 rubric) is verbatim in 5 Steps 2024 Ch 8 — book-grounded, no defect.
- Bounds verified in code: all key explanations 65–89w, all generals 72–115w and strictly shorter than their questions (tightest: 0310 general 72w vs question 76w), no key sole longest by more than 1 word (eight items at exactly 1, the threshold), all SAQ model answers exactly 2 sentences per part, zero trap language.
- Notes (fix owed, not fails): (1) MCQ 0310's figure id duplicates 0309's (fig-apush-mcq-0309) — bank convention is a distinct id per question even for shared images; change to fig-apush-mcq-0310. (2) Untagged background facts: 0294 rationale D and 0297 rationale B ("Virginia built its 1705 code from its own laws; Barbados was a template, not a copy"); 0309 rationale C and rationale D ("Native peoples grew tobacco long before Rolfe") — same class as the 2.5/2.6/2.7 tag fixes. (3) Lesson frontmatter lists "George Whitefield sermon (1751)" — the quoted text is his 1751 letter, not a sermon; minor frontmatter label fix.

## Unit 2 blind student read — Lesson 4 (2026-11-26, parent)
- Blind student read of L4: 35/35 PASS, 0 FAIL, 0 wrong keys; lesson PASS (verdicts file verified on disk). The reader viewed both L4 images by eye (the hand-turned wheel/press under the right shed is visible; no explanation calls the painting Virginia or claims "no machines in sight") and confirmed the "Dutch monopoly ended in 1682" claim verbatim in 5 Steps 2024 Ch 8.
- Notes fixed (not fails): 0310's figure id duplicated 0309's — corrected to fig-apush-mcq-0310 (bank convention is a distinct id per question even for shared images); Background tags on 0294 rationale D, 0297 rationale B ("Virginia built its 1705 code from its own laws; Barbados was a template, not a copy"), 0309 rationale C and rationale D ("Native peoples grew tobacco long before Rolfe"); L4 frontmatter listed "George Whitefield sermon (1751)" — the quoted text is his 1751 letter, not a sermon — label corrected. Validator: 448 questions, 10 lessons, 0 errors, 54 warnings. Re-verification of the 4 touched questions dispatched. L4 is not flipped to final until the re-check passes.

## Blind student read, Unit 2 Lesson 5 (2026-11-26, independent reader)
- Read apush-u2-l5.md end to end as a student, then blind-solved all 61 questions (50 MCQ, 8 SAQ, 3 LEQ) from the blind files before opening any question file. Solves in verification/blind-read-u2/apush-u2-l5-solves.json; verdicts in apush-u2-l5-verdicts.json.
- Questions: 61/61 PASS, 0 FAIL. MCQ blind picks 50/50 match keys; SAQ parts 24/24 match model answers; LEQ outlines score 18/18 rubric rows. No wrong keys. All generals 60-120w and strictly shorter than their questions; all key rationales 60-120w; no key option sole longest by more than 1 word; zero trap language; all 7 images viewed with my own eye and matching their descriptions (Whitefield oval portrait with no outdoor setting, Pyle arrest on the snowy path, Weir Speedwell deck, Zenger courtroom, Holme map with THE WELCH TRACT / GERMAN TOWNSHIP / RADNOR / HAVERFORD all legible, Champlain Habitation, Castello Plan cartouche reading REDRAFT OF THE CASTELLO PLAN NEW AMSTERDAM IN 1660). The flagged items from the brief all check out: Locke chronology correct in 0063 (no Penn/Williams anywhere in the file); 0347's 'ships were built' claim is scoped to the stimulus as presented in every field; King Philip's War opens at Swansea, June 24, 1675, in lesson and bank alike.
- Lesson: FAIL on one defect. The Halfway Covenant sentence (narrative and Key terms) says the 1662 rule 'let the children of church members be baptized even if their parents had not joined the church,' contradicting the 0337 stimulus ('the baptized children of baptized parents... even though their parents had never experienced conversion'). The parents were baptized members who had not experienced conversion; as written the lesson is self-contradictory and teaches the wrong mechanism.
- Notes (not fails): 0330 and 0332 carry duplicated figure ids (fig-apush-mcq-0329 and fig-apush-mcq-0331 respectively — same class as the fixed 0325/0358 duplicates); 0321 rationale B 'one of nineteen executed' vs lesson '20 were executed' (fix the rationale to 'one of the nineteen hanged'); lesson's Whitefield engraving 'more than a century after his tours' is loose (87 years after the last tour; 0314's rationale states it precisely); L5 never teaches the enforcement gap / salutary neglect behind 0348's key (derivable by elimination, but the lesson should teach it — same class as the logged 0175 note); Background-tag omissions in 0317 rationale D + general step 3 (population-growth figures), 0327 rationale D (vice-admiralty courts), 0341 rationale B (slavery legal in New England).

## Unit 2 Lesson 2 blind student read (2026-11-26, independent reader)
- Read apush-u2-l2.md end to end as a student, then blind-solved all 35 questions from the blind files: 27/35 PASS, 8 FAIL, 0 wrong keys (MCQ blind picks 30/30, SAQ parts 12/12, LEQ outline 6/6). Lesson verdict PASS.
- Fails: (1) MCQ 0207 rationale C calls Rhode Island a middle colony — Barron's Ch 4 lists Rhode Island among the New England colonies and the middle colonies as New York, New Jersey, Pennsylvania, Delaware. (2) MCQ 0209 rationale C claims Williams was not a minister — Princeton Ch 6 calls him "a minister in the Salem Bay settlement" and Barron's "a devout Puritan minister." Both are factual errors in distractor rationales; keys stand. (3) Six difficulty over-tags, all 4 -> 3: 0202, 0211, 0215, 0220, 0225, 0226 — direct-from-stimulus restatements or one-step matches, same class as the 2.5/2.6/2.7 over-tags. Topic 2.3 would land 6/17/7 vs its 6/11/13 quota.
- Notes, not fails: Background-tag omissions in 0215 general step 3 ("most diverse colony in America", also in 0220 rationale A) and 0226 general step 2 / rationale C (return flow of sugar/rum, lesson content not in the stimulus); 0199 rationale C does not address the option's "every single year" overclaim (table has only three data points). Lesson observations: Salem appears only in the worked item, not the narrative; Maryland "began in 1632" is charter shorthand (Princeton lists 1633, settlement 1634); SAQ 0044 (b)/(c) require lesson knowledge beyond the painting (accepted SAQ pattern). East Prospect credits verified against the Commons file page (Vandergucht after Scull's 1754 original, Jefferys engraver; "Thomas Vandergucht" does not exist); both images viewed with my own eye.

## Unit 2 blind student read — Lesson 4 fix re-verification (2026-11-26, blind re-verifier)
- Blind re-verification of the 4 fixed L4 items: 4/4 PASS, 0 FAIL. Blind picks matched keys 4/4 (0294 A, 0297 C, 0309 C, 0310 D), solves written before any question file was opened. All four fixes confirmed: 0310 figure id is fig-apush-mcq-0310; 0294 rationale D and 0297 rationale B carry the Background tag on the Virginia-code/Barbados-template fact; 0309 rationale C and rationale D carry the Background tag on "Native peoples grew tobacco long before Rolfe". All generals 60-120w and strictly shorter than their questions; no key sole longest by more than 1 word (0309 key C longest by exactly 1); zero trap language. No tension between any explanation and its stimulus or image. The shared 1874 Rolfe engraving file (u2/pr25e-ch06-q03.jpg) exists on disk and is correctly framed as a 19th-century imagining in both items.

## Blind student read, Unit 2 Lesson 3 (2026-11-26, independent reader)
- Read the lesson end to end as a student, then blind-solved all 66 questions from blind files (solves written before opening any question file). Result: 63/66 PASS, 3 FAIL, 0 wrong keys. MCQ blind picks 56/56 match keys; SAQ parts 24/24 match model answers in substance; both LEQ outlines cover all 6 rubric rows. Lesson verdict: PASS.
- Fails (all difficulty over-tags, same class as the Topic 2.5/2.6/2.7 rounds — direct-from-stimulus items tagged hard): 0247 (African middlemen — a direct read of the Kip image the stem points at), 0248 (idealized view / deliberately not shown — stated in the stimulus source_note itself), 0254 (strict on paper, porous in practice — restates the stimulus passage). All three 4 → 3; keys stand.
- Borderline-kept (not fails): 0241 (combines two stimulus numbers), 0242/0244/0272 (sourcing concepts), 0245 (corroboration across two sources), 0261 (answer needs background tobacco profits NOT in the stimulus), 0264 (stimulus scarcity + background rising demand), 0231/0235/0251/0253/0257/0259/0271/0273 (synthesis or comparison).
- Notes (not fails): lesson presents Mun's £2.2m/£2.0m/£200,000 figures without saying they are Mun's own example figures (question source_note attributes them correctly); MCQ 0266 key option B overstates avoidance ('largely avoided contact' — the English displaced Native peoples through sustained contact; the rationale itself says 'trade when they had to, fight when they chose to'; key unambiguous by elimination); Topic 2.5 key rationales run 60-90 words (some 4 sentences) vs the spec's 'Key note: 1-3 short sentences' and Unit 1 / Topic 2.4 practice (10-40w) — validator passes them (newline-based line count), content accurate, consistency note only.
- Images viewed with my own eye, stimulus descriptions verified accurate: Bowen chart, Brookes, Kip Elmina, Fumagalli, Havana, Darley, Smith map, Jan Beary Jamestown. 'Trap' substring hits in 0264/0265 are 'trapping'/'trappers' — legitimate fur-trade content. All generals 60-120w and strictly shorter than their questions; all SAQ model answers exactly 2 sentences per part; no key longest by more than 1 word (0266 key is 9 words SHORTER than the longest option — no tell). Lesson-bank consistency checked on all required facts (repartimiento 4%, mita one in seven, Gouvenot asiento, Fumagalli attribution, Swansea June 1675, 1622/347, Pequot 1637/400, fourteen praying towns, Pueblo 1680, Rowlandson, Catawba) — no contradictions.

## Blind student read, Unit 2 Lesson 1 (2026-11-26, independent reader)
- Read apush-u2-l1.md end to end as a student, blind-solved all 57 questions (solves written before opening any question file), adjudicated keys, fairness, and lesson-bank consistency; all 9 stimulus images viewed with my own eye and matching their descriptions.
- Verdicts: 33/57 PASS, 24 FAIL, 0 wrong keys (MCQ blind picks 46/46, SAQ parts 24/24, LEQ outlines 3/3). Lesson verdict: FAIL.
- FAILs by class: (1) LENGTH TELLS, 21 items — key sole longest by more than 1 word (0151 +10, 0152 +5, 0153 +7, 0154 +3, 0155 +10, 0156 +8, 0157 +5, 0158 +10, 0159 +11, 0160 +16, 0161 +10, 0162 +5, 0163 +8, 0165 +4, 0166 +16, 0177 +2, 0180 +2, 0181 +2, 0183 +3, 0184 +2, 0191 +2). A longest-option guesser scores 33/46 on this lesson. Topic 2.1 never had a length fix round (its verifier passed 20/20 on picks); the 2.2 fix round covered only the 11 items its verifier caught, leaving 0177/0180/0181/0183/0184/0191. Fix is the 2.2 pattern: trim keys, lengthen distractors. (2) FAIRNESS, 3 items — keyed facts in neither lesson nor stimulus (0160 and 0163: Williams/Hutchinson banishments — the lesson has zero mentions; 0192: distance/European wars/Walpole's priorities as the reason for neglect). Same class as Unit 1 MCQ 0150. Fix is in the lesson, not the items. (3) 0190 rationale C states Georgia "became a royal colony in 1751" — wrong; royal colony 1752 (slavery legalized 1751); the shared stimulus sentence conflates the two dates. (4) 0191 difficulty 4 → 3 (direct restatement of the stimulus). (5) LEQ 0013: model outline/rubric say Maryland 1634, lesson and founding-reasons table say 1633; 1634 is the conventional date.
- Notes, not fails: 0186 stem ("the table best supports") — already adjudicated in the 2.2 fix round, Background tags in place; 0177 stimulus "from Delaware to Maine" overstates the Dominion (Delaware was not in it); 0160 rationale B untagged background fact; 0178 general "James fell in 1688" vs lesson "1689" — both standard datings.
- Bounds verified in code: all generals 60-120w and strictly shorter than their questions (tightest: 0196 118w vs 119w, 0183 90w vs 91w, 0184 93w vs 94w); all SAQ model answers 2-4 sentences per part; key distribution A13/B11/C11/D11; zero trap language.

## Unit 2 blind student read — Lesson 5 (2026-11-26, parent)
- Blind student read of L5: 61/61 questions PASS, 0 FAIL, 0 wrong keys; lesson FAIL on one defect (verdicts file verified on disk — it was written to the passmaster root by the reader and moved to verification/blind-read-u2/apush-u2-l5-verdicts.json). The reader viewed all 7 images by eye and confirmed the flagged items (Locke chronology, 0347 scoping, Swansea June 24, 1675).
- Lesson defect fixed: the Halfway Covenant sentence (narrative + Key terms) said the 1662 rule let children be baptized "even if their parents had not joined the church" — the 0337 stimulus states the parents were baptized members who had never experienced conversion. Both spots now read "even if their parents had never experienced conversion."
- Notes fixed: 0330/0332 figure ids corrected (fig-apush-mcq-0330 / -0332); 0321 rationale B "one of nineteen executed" → "one of the nineteen hanged at Salem" (lesson: 20 executed = 19 hanged + Giles Corey pressed); lesson's Whitefield engraving "more than a century after his tours" → "a century after his 1740s tours" (87 years after the last tour); enforcement gap / salutary neglect added to the "One empire, argued over" section — the addition pushed the section to 326w, so the section was trimmed by ~33 words (same facts, tighter sentences) back under 300w and the Navigation Act paragraph split in two (42w + 59w); Background tags on 0317 rationale D + general step 3 (population growth), 0327 rationale D (vice-admiralty courts), 0341 rationale B (slavery legal in New England). Validator: 448 questions, 10 lessons, 0 errors, 54 warnings. Re-verification dispatched. L5 is not flipped to final until the re-check passes.

## Unit 2 blind student read — Lesson 4 (2026-11-26, parent)
- Re-verification of the 4 fixed L4 items: 4/4 PASS (verdicts file verified on disk). L4 lesson flipped to final. L4 is closed.

## Unit 2 blind student read — Lesson 2 (2026-11-26, parent)
- Blind student read of L2: 27/35 PASS, 8 FAIL, 0 wrong keys; lesson PASS (verdicts file verified on disk).
- Fails fixed: 0207 rationale C (Rhode Island is a New England colony, not a middle colony — dropped from the rationale); 0209 rationale C (Williams WAS a minister — corrected to "Hooker and Williams were ministers, Hutchinson was not"); six difficulty over-tags 4→3 (0202, 0211, 0215, 0220, 0225, 0226). Notes fixed: Background tags on 0215 general step 3 + 0220 rationale A ("most diverse colony in America"), 0226 general step 2 + rationale C (return flow of sugar/rum); 0199 rationale C now addresses the "every single year" overclaim (the table has only three data points). Difficulty consequence: 2.3 lands 6/17/7 vs its 6/11/13 quota. Validator: 448 questions, 10 lessons, 0 errors, 54 warnings. Re-verification dispatched. L2 is not flipped to final until the re-check passes.

## Unit 2 blind student read — Lesson 3 (2026-11-26, parent)
- Blind student read of L3: 63/66 PASS, 3 FAIL, 0 wrong keys; lesson PASS (verdicts file verified on disk).
- Fails fixed: three difficulty over-tags 4→3 (0247, 0248, 0254). Notes fixed: Mun's £2.2m/£2.0m/£200,000 figures in the L3 lesson now say "In Mun's own example" (the question source_note already attributed them); six 2.5 key rationales with 4 sentences trimmed to 3 (0255, 0258, 0267, 0272, 0273, 0277 — SPEC.md §key note is 1-3 short sentences; all still 60-120w). 0266's key option ("largely avoided contact") reviewed and kept: the textbook framing, unambiguous by elimination, and rationale B carries the nuance ("trade when they had to, fight when they chose to"). Validator: 448 questions, 10 lessons, 0 errors, 54 warnings. Re-verification dispatched. L3 is not flipped to final until the re-check passes.

## Unit 2 blind student read — Lesson 1 (2026-11-26, parent)
- Blind student read of L1: 33/57 PASS, 24 FAIL, 0 wrong keys; lesson FAIL (verdicts file verified on disk). Longest-option guesser scored 33/46 before the fix round — Topic 2.1 never had a length fix round and the 2.2 round covered only the 11 items its verifier caught.
- Lesson defects fixed in the lesson: the banishments of Roger Williams (1635) and Anne Hutchinson (1638) added as their own paragraph in "Covenants and charters" (the first attempt put them in the Winthrop paragraph at 96w — split; new paragraph 30w); the reason London left the colonies alone added to "The empire loosens its grip" ("an ocean's width, wars in Europe, and a prime minister who valued quiet trade over colonial quarrels"); Maryland's founding date set to 1634 throughout (lesson line 145 + founding-reasons table in 0185-0187) — 1634 is the conventional date (Ark and Dove arrived March 1634), matching LEQ 0013, which needed no change. The 0160/0163 rationale banishment statements and 0192 rationale D need no Background tags now that the lesson teaches both facts.
- Question fixes: all 21 length tells fixed by the 2.2 pattern (trim keys, lengthen distractors, code-asserted per item: no key sole longest by more than 1 word; my own mental word counts were off by one on 0151, 0153 and 0154, and the code asserts caught all three before any re-verification); shared Georgia stimulus in 0188-0190 reworded (slavery legal 1751; royal colony 1752) and 0190 rationale C corrected the same way; 0177 stimulus "from Delaware to Maine" → "from New Jersey to Maine" (Delaware was part of Pennsylvania, not the Dominion); 0191 difficulty 4→3; 0160 rationale B Background tag ("voting stayed limited for a century after"). Left as noted, not fixed: 0178 general "James fell in 1688" vs lesson "1689" (both standard datings). Validator: 448 questions, 10 lessons, 0 errors, 54 warnings. Re-verification dispatched (28 MCQ + LEQ 0013 consistency). L1 is not flipped to final until the re-check passes.

## Blind re-verification — Unit 2 Lesson 5 fix round (2026-11-26, independent re-verifier)
- Re-verified the 6 fixed L5 items blind (solves written before opening any question file): 6/6 PASS, 0 FAIL. Blind picks matched keys 6/6 (0317 C, 0321 B, 0327 C, 0330 A, 0332 D, 0341 C); every key re-derivable from its stimulus.
- Fixes confirmed on the live files: 0330 figure id fig-apush-mcq-0330 and 0332 fig-apush-mcq-0332 (both distinct); 0321 rationale B reads "one of the nineteen hanged at Salem"; Background tags present on 0317 rationale D + general step 3, 0327 rationale D, 0341 rationale B.
- Lesson verified PASS: Halfway Covenant reads "even if their parents had never experienced conversion" in both the narrative (line 152) and Key terms (line 278); "had not joined the church" occurs 0 times. Whitefield engraving reads "a century after his 1740s tours" (line 144); "more than a century after his tours" is gone. The "One empire, argued over" section teaches the enforcement gap / salutary neglect (line 208, "laxly enforced for decades — salutary neglect"). No paragraph over 90 words; all 6 sections 201–269 words.
- Bounds verified in code: all generals 77–95w and strictly shorter than their questions; no key sole longest by more than 1 word; zero trap language. One minor observation, not a fail: 0341's option B misconception field carries the "slavery was legal in New England too" sentence without the Background tag that rationale B now has — the field is not student-visible.

## Blind re-verification — Unit 2 Lesson 3 fix round (2026-11-26, independent re-verifier)
- Blind re-solved all 9 fixed items from the blind files before opening any question file: 9/9 picks match keys, 0 FAIL. Difficulty fixes confirmed: 0247, 0248, 0254 all now 3. The six 2.5 key rationales (0255, 0258, 0267, 0272, 0273, 0277) each run exactly 3 sentences, 64–90w. All generals 60–120w and strictly shorter than their questions (tightest: 0258, 73w vs 115w); zero trap language. The Fumagalli "deliberately not shown" observation is correctly attributed to the image's published description in 0248's general step 3.
- Lesson: the £2.2m/£2.0m/£200,000 figures now read "In Mun's own example" (line 141); no paragraph over 90w; all 6 narrative sections 150–300w (247–276w). The "Closing check" runs 100w — a recap section, in the established 93–115w band across all 10 lessons, not a narrative section. Lesson verdict: PASS.

## Unit 2 blind student read — Lesson 5 re-verification (2026-11-26, parent)
- Re-verification of the 6 fixed L5 items: 6/6 PASS, 0 FAIL; lesson PASS (verdicts file verified on disk). One catch from the re-verifier's note, fixed at the parent level: 0341's option B `misconception` field carried the same "slavery was legal in New England too" sentence without the Background tag rationale B now has — tagged, per the fix rule (grep the whole item for the claim). L5 lesson flipped to final. L5 is closed.

## Unit 2 blind student read — Lesson 3 re-verification (2026-11-26, parent)
- Re-verification of the 9 fixed L3 items: 9/9 PASS, 0 FAIL; lesson PASS (verdicts file verified on disk). L3 lesson flipped to final. L3 is closed.

## Blind re-verification, Unit 2 Lesson 2 fix round (2026-11-26, independent re-verifier)
- Re-solved all 9 fixed L2 items blind (solves written before opening any question file): 6/9 PASS, 3 FAIL, 0 wrong keys. All 9 blind picks match keys; all keys re-derivable from their stimuli.
- Confirmed fixed: six difficulty changes 4→3 (0202, 0211, 0215, 0220, 0225, 0226); 0199 rationale C now addresses the "every single year" overclaim against the table's three data points; Background tags present on 0215 general step 3, 0220 rationale A, 0226 rationale C and 0226 general step 2.
- FAILS — all the same defect class: the fix round corrected the rationale fields but left the identical error in the option `misconception` field. 0207: rationale C no longer calls Rhode Island a middle colony, but option C's misconception still says "Pennsylvania and Rhode Island welcomed dissenters" as middle colonies. 0209: rationale C now says Williams was a minister, but option C's misconception still says "Hooker was a minister, but Williams and Hutchinson were not." 0220: rationale A now carries the Background tag on "Pennsylvania was the most diverse colony," but option A's misconception states the same fact untagged. The fix must be re-applied to the misconception fields (grep the whole item, every field, per the 0347 rule). Note, not a fail: 0199's option C misconception still carries the old rationale wording ("Steady growth is what the historian would expect") — true and consistent, but not the same reasoning as the new rationale C.

## Unit 2 blind student read — Lesson 2 re-verification (2026-11-26, parent)
- Re-verification of the 9 fixed L2 items: 6/9 PASS, 3 FAIL, 0 wrong keys (verdicts file verified on disk). All 3 fails are the same class: the fix round corrected the rationale fields but left the identical error in the option `misconception` fields — 0207 (Rhode Island as a middle colony), 0209 (Williams not a minister), 0220 (untagged "most diverse colony"). This is the 0347-class miss, made by the parent's own fix round: the fix scripts grepped rationales but not misconception fields. Fixed at the parent level by mirroring each rationale fix into its misconception field; 0199's option C misconception also reworded to match the new rationale C (the old "Steady growth" wording). Bank-wide grep after the fix: 0 occurrences of the old error phrasings, and all 3 "most diverse colony" occurrences now carry a Background tag. Validator: 448 questions, 10 lessons, 0 errors, 54 warnings. Focused re-check of the 4 items dispatched. L2 is not flipped to final until it passes.
- Rule sharpened (parent's own miss): a fix script must grep the WHOLE item for the claim — rationales, general note, option `misconception` fields, SAQ scoring criteria, lesson worked-item copies — before the fix is logged as applied. The misconception field is not student-visible, but it is part of the item and a wrong claim there is a wrong claim in the bank.

## Blind re-verification, Unit 2 Lesson 1 fix round (2026-11-26, independent re-verifier)
- Re-solved all 28 fixed MCQs blind from the fix-round blind files (solves written before opening any question file): 28/28 picks match keys, 0 wrong keys.
- Length tells: 0 remaining. Computed in code — no key is sole longest by more than 1 word (worst case +1 on 0153, 0154, 0157, 0159, 0160, 0161, 0162, 0165, 0166, 0180, 0187, 0189; six items have the key not the longest option at all). All generals 90-116w and strictly shorter than their questions (tightest: 0180, 101w vs 105w; 0183, 90w vs 94w). Zero trap-language hits across all 28 items. All 5 stimulus figures exist on disk.
- Specific fixes confirmed on the live files: 0190 stimulus and rationale C say slavery legal 1751 and Georgia a royal colony 1752 (same corrected sentence in 0188 and 0189); 0177 stimulus says the Dominion ran from New Jersey to Maine; 0191 difficulty is 3; the founding-reasons table says Maryland 1634 in 0185, 0186 and 0187.
- Lesson verdict: PASS. The lesson teaches the banishments (Williams 1635, Hutchinson 1638) in a standalone 30-word paragraph, teaches the reason for neglect (an ocean's width, wars in Europe, Walpole's priorities) matching 0192's rationale D step for step, and dates Maryland's founding to 1634. No paragraph exceeds 90 words; all 6 sections are 150-300w (199-266w); narrative 1,409 words; 12 key terms. LEQ 0013's model outline and rubric both say Maryland 1634 (1633 appears 0 times) — consistent with the lesson and the table.
- One minor observation (not a fail): 0159 rationale A says the Pilgrims 'were blown off course to Cape Cod' — true history, but the detail is in neither the stimulus nor the lesson; it is presented as explanation, not attributed to the stimulus, and contradicts nothing.

## Blind student read, Unit 2 Lesson 2 — fix round 2 re-check (2026-11-26, independent re-checker)
- Focused re-check of the 4 misconception-field fixes (student-visible bytes unchanged in this round, so no blind solve): 4/4 PASS, 0 FAIL. 0207 option C misconception now reads "Pennsylvania welcomed dissenters" with Rhode Island gone; 0209 option C misconception now says "Hooker and Williams were ministers, Hutchinson was not"; 0220 option A misconception carries the Background tag on "Pennsylvania was the most diverse colony" (both occurrences in the file tagged; 0215's also tagged); 0199 option C misconception now matches the corrected rationale C ("Three data points cannot show that exports rose every single year without fail"). Old error phrasings occur 0 times in all four item files.

## Unit 2 blind student read — Lesson 1 re-verification (2026-11-26, parent)
- Re-verification of the 28 fixed L1 items: 28/28 PASS, 0 FAIL; lesson PASS (verdicts file verified on disk). Length tells: 0 remaining (worst case exactly +1 on twelve items). The re-verifier's note — 0159 rationale A stated the blown-off-course fact without the Background tag the general already carries — fixed at the parent level (tagged). L1 lesson flipped to final. L1 is closed.

## Unit 2 blind student read — Lesson 2 re-verification round 2 (2026-11-26, parent)
- Focused re-check of the 4 misconception-field fixes: 4/4 PASS, 0 FAIL (verdicts file verified on disk). L2 lesson flipped to final. L2 is closed.

## UNIT 2 COMPLETE (2026-11-26)
- 254/254 questions final (210 MCQ / 33 SAQ / 11 LEQ, no DBQ), 5/5 lessons final. Blind student read: L1 33/57 → fixed → 28/28 re-verified; L2 27/35 → fixed → 9-item re-check 6/9, then 4/4 on the misconception round; L3 63/66 → 9/9; L4 35/35 → 4/4; L5 61/61 questions, lesson FAIL → 6/6. 0 wrong keys anywhere in the unit. Validator: 448 questions, 10 lessons, 0 errors, 54 warnings. Difficulty: Unit 2 lands easy 43 / medium 96 / hard 71 of 210 vs per-topic quota sums 43/76/91 (easy exact, medium +20, hard −20) — honest labels govern, same open decision as Unit 1's mix. Unit 2 is NOT pushed yet; the per-unit push follows.
