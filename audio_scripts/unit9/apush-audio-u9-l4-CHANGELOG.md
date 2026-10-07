# U9-L4 "Populism" — CHANGELOG

## Build decisions (writer, 2026-10-07)
- Format: Interview per the curriculum layout ("Who were the Populists and what did they want").
- 4 boxes (content needs it): (1) farmers' crisis, (2) Grange + Alliances, (3) Omaha Platform, (4) election of 1896. The "failed as a party, won as a platform" verdict lives in the takeaway + self-test, not as a fifth box.
- Cold open bridges L3 in one line (Populists' enemies list vs membership rolls re: immigrants — grounded in princeton's Omaha "opposition to immigration"). Closer teases ONLY L5 (the West; census frontier-LINE language; no Turner, no "thesis," no "closed").
- Mid-episode wrong beat (house device): Maya misreads "free silver" as government handouts; Marcus corrects with [firm]. Distinct from the recap fumble (16th/17th Amendment flip — a real student error).
- Maya-knows-something beat: the Wizard of Oz allegory (princeton teaches it as "reportedly"; the hedge is voiced in dialogue — "still argued").
- Maya's human moment: the fire-escape tomato crop (one concrete image, tied to the topic; no second anecdote).
- Prediction beat: "You're a New York banker in 1892..." at the natural decision point (platform published → whose nightmare is it?).
- Self-test model answers carry CER logic via varied connective tissue ("Start with the mechanism...", "Because the Democrats swallowed the issue whole...", "It tells you...") — no spoken labels (G13).
- 1892 results taught as "more than a million popular votes and 22 electoral votes" (all three Tier-1 books agree; no state count pinned).
- Cross of Gold day hedged to "July 1896" — see book-error note below.

## Fact pass notes (writer, 2026-10-07)
- Tier 1 backbone: 5steps2024 ch17 (deflation mechanics, Grange, Alliance memberships, Ocala, Omaha demands, Weaver, 1892/1896 results, McKinley platform, "most planks eventually enacted"); premium2027 ch8 (crime of '73, Omaha Platform, Granger Laws, Munn/Wabash, ICC) + ch13/ch9 (16th/17th Amendments, both 1913); princeton ch10 (crop-lien mechanics, Omaha demands incl. immigration opposition, Colored Alliance 1886, McKinley corporate money + employer intimidation, Oz allegory).
- Tier 2 (Britannica only): 16:1 silver-to-gold ratio; Bryan age 36 (two articles); 1896 result 271–176; Populist VP Tom Watson alongside Bryan endorsement; Bryan 18,000+ campaign miles (not taught — density).
- Crop-lien taught from princeton verbatim mechanics; the exam line ("debt peonage, not slavery") is a writer-drawn distinction flagged for L3 framing review.
- The Alliance-fracture explanation (racial appeals outbidding shared economics) is standard scholarly framing beyond direct Tier-1 quotes — dialogue hedges it; footer discloses it.
- Hanna taught only at princeton's level (industrialist/political manager, millions from corporations/banks, employer intimidation). Front-porch detail withheld (broad web only).
- Mary Lease quote ("raise less corn and more hell") cut for density — available for L3 re-verification if wanted.
- 1894 Populist midterm gains (6 senators, 7 representatives — premium2027) cut for density.

## Book errors found this pass
- None contradicted. One day-level discrepancy, NOT registered as a book error: the brief gives the Cross of Gold as July 9, 1896 (Chicago Democratic convention); Britannica's Bryan article dates the speech July 8. Dialogue teaches "July 1896" only. Coordinator/L3 may rule.

## Registry additions
- F-U9-020 through F-U9-027 appended to apush-fact-registry.yaml 2026-10-07 (writer). YAML parse verified: `python3 -c "import yaml; yaml.safe_load(open('apush-fact-registry.yaml'))"` — clean.

## Validation history (open for coordinator)
- [x] Writer self-run: `python3 apush-script-gates.py apush-audio-u9-l4-script-v2-DRAFT.md --minutes 12` — 13/13 PASS (2026-10-07). 2,013 words, 168 WPM. WARNs only: W2 possible-triples (5x, all functional lists/box glosses — kept with intent).
- [x] Writer checks: Maya lines ending in "?" 33% (≤60%); no tone >40% (conversational 31%); self-test Q&A fully neutral (takeaway [confident tone] + closer [professional broadcast tone] per fleet mapping); 1 micro-turn; 1 mid-episode check-in; em-dashes 9 in dialogue (≤10); read-aloud pass done.
- [x] Registry: F-U9-020–F-U9-027 appended manually; `yaml.safe_load` parses clean (655 facts total).
- [x] Layer 1 (coordinator re-run): 13/13 PASS post-repair (2026-10-07).
- [x] Layer 2 (fresh agent, clean-context ear read vs apush-validator-checklist.md): NOT LOCK-READY — 1 blocker + 4 minors (2026-10-07).
  - BLOCKER: self-test Q1 stimulus misquoted Omaha Platform ("unrestricted" for "unlimited") — fixed.
  - Minors: recap-fumble correction tag [conversational]→[firm]; doubled "One more trap, box two/four" opener varied ("Another trap, box four"); triple-parallel budget exceeded (3 triples) — Maya's "Squeezed by the money, squeezed by the railroad, sharecropping on credit in the South" reworked to two-beat; prediction-beat answer stripped to neutral.
  - PASS items: Cross of Gold quote verbatim vs 1896 public-domain text; "July 1896" date hedge; zero spoken CER labels; hook <25 words; one check-in; closer teases only L5 (no Turner/thesis/"closed"); direction fleet-consistent; Maya reads as a person.
- [x] Layer 3 (different fresh agent, Tier-1/2 fact-check): BLOCKED — 1 blocker (same Omaha "unlimited" fix) + 8 softens (2026-10-07).
  - S1: cold-open "immigrants on the rolls" unverifiable — cut.
  - S2: "most expensive campaign America had ever seen" → "an enormously well-financed Republican machine."
  - S3: "raised millions" → "pulled in enormous campaign contributions" (Britannica/princeton phrasing).
  - S4: "inventor of the modern war chest" cut (unverifiable epithet).
  - S5: "Tom Watson of Georgia" → "Tom Watson" ("Georgia" unverifiable in Tier 1/2).
  - S6: Colored Farmers' Alliance "a million Black members by 1890" → "by 1889" (5steps2024 anchors the figure in 1889).
  - S7: Panic of 1893 specifics → "tipped the country into a four-year financial crisis — hardship everywhere" (princeton).
  - S8: Alliance-fracture mechanism now explicitly hedged "most historians read it that way."
  - Coordinator also reworded recap "Hanna's millions" → "Hanna's money machine" for S3 consistency.
  - CLEAN: all four Omaha demands + 16:1; Weaver figures; Munn/Wabash/ICC; Bryan 36 / fifth ballot / 271–176 / fusion / Watson VP; 16th+17th both 1913; Grange 1867; Alliance memberships; Ocala 1890; crop-lien; Oz allegory hedged as princeton teaches it; frontier-LINE language, no Turner. Book-error protocol: no book errors found — all three Tier-1 books agreed on every taught claim.
- [x] Repair verification re-read (third fresh agent): REPAIRS CLEAN — all 14 repairs present and correctly integrated, no new violations, no seams, neighbor logic intact; tone distribution sane; no spoken CER labels; no "That's"/"Here's" openers. One stale Sources-footnote parenthetical ("and membership rolls") cleaned by coordinator; gates re-run 13/13 PASS after.
- [ ] User approval of script (required before any render)
