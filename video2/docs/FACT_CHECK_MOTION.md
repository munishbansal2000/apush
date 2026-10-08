# Fact check: motion data (src/data/motion/*.json)

Checked 2026-10-07. Entries marked `"verified": "2026-10-07"` in the JSON were checked against a source retrieved during this session.

**Limitation:** partway through the session, the permission system started blocking web access (curl was denied, and WebFetch is disabled because internet mode is off). So far only the sources listed below have been retrieved: Census WP27 tables, the Wikipedia admission/secession/1790/1860/Kansas–Nebraska pages, Voteview, and part of the senate.gov Kansas–Nebraska page. **Civil War figures, transportation dates, territorial dates and Road to Revolution facts are still unverified.** They are listed under "Remaining uncertainties" with the figure each source is expected to give.

## statehood.json

| Value | Old → new | Source | Note |
|---|---|---|---|
| 35 admission/ratification dates (DE 1787-12-07 … WV 1863-06-20) | all confirmed | https://en.wikipedia.org/wiki/List_of_U.S._states_by_date_of_admission_to_the_Union (cites LoC "Today in History") | none differ |
| Secession: SC 1860-12-20; MS 01-09; FL 01-10; AL 01-11; GA 01-19; LA 01-26; TX 02-01 (ref. Feb 23); VA 04-17 (ref. May 23); AR 05-06; NC 05-20; TN 06-08 (ref.) | all confirmed | https://en.wikipedia.org/wiki/Confederate_States_of_America (order of secession) | TN timeline note says legislature acted May 6; the CSA article dates the legislature's military league May 7. Both appear in sources. Date shown on the map (June 8) is fine |
| enslaved1860, 15 state values (VA 490,865 … DE 1,798) | all confirmed | https://en.wikipedia.org/wiki/1860_United_States_census (population table) | |
| enslaved1860.total 3,953,760 | confirmed | same | 15 states = 3,950,511; + NJ 18 + DC 3,185 + NE 15 + KS 2 + UT 29 = 3,953,760 |
| keyYears 1820/1821/1850 counts (12–11, 12–12, 16–15) | confirmed | derived from verified admission dates | |
| keyYears 1854 Kansas–Nebraska signed May 30, 1854 | confirmed | https://en.wikipedia.org/wiki/Kansas%E2%80%93Nebraska_Act | |
| keyYears 1861 "eleven states… DE, MD, KY, MO stay" | confirmed | CSA article | |
| line-3630 repealed 1854-05-30 | confirmed | KN Act article | drawn date (Mar 6, 1820) not re-retrieved |
| Sources fields | generic → specific URLs | | |

## votes.json

| Value | Old → new | Source | Note |
|---|---|---|---|
| KN House 113–100, May 22, 1854 (H.R. 236) | confirmed | Voteview H033 roll 309 (https://voteview.com/static/data/out/rollcalls/H033_rollcalls.csv) | |
| totals free 44–91, slave 69–9 | confirmed exactly | Voteview votes + members files | computed from member state codes |
| Cohorts ND 44–42, NW 0–45, FS 0–4, SD 57–2, SW 12–7 | confirmed (Nevins) | Wikipedia KN Act citing Nevins, *Ordeal of the Union* pp. 156–57; Voteview | Voteview's party coding gives SD 56–2 and SW 13–7 (it codes Alexander Stephens as a Whig), and NW 0–44 plus Caleb Lyon (Ind., N.Y.) 0–1. Free Soil nays: De Witt, Giddings, G. Smith, Wade. Kept Nevins because it is the standard citation. The old source said Potter; changed to Nevins |
| Senate S. 22 37–14, Mar 4, 1854 | confirmed | Voteview S033 roll 52; senate.gov KN page ("early morning hours of March 4") | Voteview gives the legislative day, Mar 3 |
| Senate 35–13 May 25; signed May 30 | confirmed | Voteview S033 roll 143; KN Act article | |
| threeFifths.enslaved 697,681 | confirmed | https://en.wikipedia.org/wiki/1790_United_States_census (Heads of Families table) | table sums to 697,697 including 16 Vermont "slaves" later found to be free; 697,697 − 16 = 697,681 |
| threeFifths note "1791 printed return gave 694,280" | removed | n/a | could not confirm (the OCR of the census.gov 1791 return PDF was unreadable) |
| counted 418,609 | confirmed (arithmetic) | | |

## growth-1800s.json

| Value | Old → new | Source | Note |
|---|---|---|---|
| St. Louis 1830 | **5,852 → 4,977** | WP27 Table 6, https://www2.census.gov/library/working-papers/1998/demographics/pop-twps0027/tab06.txt | 5,852 appears in some other compilations |
| All other city census values 1820–1880 (NY, Philadelphia, Baltimore, Boston, Cincinnati, St. Louis 1840–80, Chicago 1840–80, New Orleans), 52 values | confirmed | WP27 Tables 5–11 (tab05.txt–tab11.txt, same directory) | |
| Chicago 1833 ≈350 | unresolved | | not a census figure |
| Transportation opening/progress dates (Erie Oct 26, 1825; National Road 1811/1818/1833/c.1839; B&O 1828/1830/1834/1842/1853; PRR 1849–1854; Michigan Southern Feb 1852; Rock Island Feb 22, 1854; IC Sept 1856; C&NW 1855/1859/1867; UP/CP dates; Promontory May 10, 1869) | unresolved | | not retrieved. These match standard accounts as far as I know, but none were checked this session |

## civil-war.json

| Value | Old → new | Source | Note |
|---|---|---|---|
| Lee retreat strength 52,000 | unchanged; strengthNote extended | n/a | added range: ≈47,000 if Confederate losses ≈28,000 (≈43,000–48,000 if start ≈71,000) |
| All other values (campaign dates, waypoints, strengths 75,000/62,000/60,000, Antietam 23,000, Gettysburg 51,000, Savannah dates, front lines) | unresolved | | not retrieved (see below) |

## causes-revolution.json

| Value | Old → new | Source | Note |
|---|---|---|---|
| Proclamation of 1763 "because" | "After Pontiac's Rebellion, Britain avoids costly frontier wars" → "After Pontiac's Rebellion, Britain bars settlement west of the Appalachians" | APUSH CED KC-3.1 (from knowledge; not retrieved) | the old text left out what the Proclamation actually did |
| Other 11 "because" texts | wording reviewed, no change | | Townshend "taxes imports" is accurate (glass, lead, paint, paper, tea in source field); card title "Coercive (Intolerable) Acts" is correct; Sugar Act "cuts the molasses duty but strictly enforces it" is correct |
| Years/dates and figures in source fields (e.g. debt £75M→£133M, 342 chests) | unresolved | | not retrieved |

## Remaining uncertainties (to verify when web access is restored)

1. **Antietam casualties:** American Battlefield Trust is expected to give 22,717 (Union 12,401; Confederate 10,316), and NPS gives "≈23,000". The JSON keeps 23,000. Suggest a note with this range.
2. **Gettysburg:** ABT ≈51,000 (Union 23,049; Confederate 28,063 per older counts; Busey & Martin ≈23,231). Lee's start strength is about 71,000–75,000. The retreat figure 52,000 depends on which count is used.
3. **Sherman:** about 62,000 left Atlanta. The "≈2,100 losses" figure is doubtful: some references give much lower March to the Sea casualties (on the order of 1,000–2,000). Check the NPS/ABT March to the Sea pages and OR ser. I vol. 44.
4. All transportation dates in growth-1800s.json, and Chicago 1833 ≈350 (Encyclopedia of Chicago).
5. Territorial dates in statehood.json: Michigan Territory 1805-06-30, Wisconsin/Minnesota "1818-10-01" (this date looks doubtful, but it falls before the 1820 start of the animation), Missouri Territory 1812-06-04, Arkansas Territory 1819-07-04, Florida transfer 1821-07-17, Oregon Treaty 1846-06-15, Oregon Territory 1848-08-14, Guadalupe Hidalgo ratification 1848-05-30, Gadsden 1854-06-30, Indian Intercourse Act 1834-06-30, Missouri Compromise 1820-03-06.
6. Tennessee legislature date: May 6 vs May 7, 1861.
7. Road to Revolution dates and source details (Oct 7, 1763; Mar 22, 1765; Mar 18, 1766; Mar 5, 1770; May 10 and Dec 16, 1773; Oct 14/20, 1774; Apr 19, 1775; Jan 10, 1776; July 2/4, 1776). All are standard, but none were re-retrieved.

## Scene files (read-only review)

- **VotesDemo.tsx caption:** "it passed 113–100 (Senate: 37–14)". The 37–14 was the Senate vote on its own bill S. 22 (Mar 4). The Senate vote on the bill that became law (H.R. 236) was 35–13 on May 25. Suggest "(Senate: 37–14 in March)" or use 35–13.
- **VotesDemo.tsx caption:** "Three-Fifths Compromise: 3 of every 5 were counted." This could be read as some enslaved people being counted and others not. APUSH wording is "each enslaved person counted as three-fifths of a person" for apportionment and direct taxes.
- **VotesDemo.tsx chip:** "THREE-FIFTHS COMPROMISE · 1787" shown with 1790 census data. This is fine but worth a label such as "applied to the 1790 census".
- **CivilWarDemo.tsx:** "Antietam… the bloodiest single day in American history" is the standard claim; the usual phrasing is "in American military history". "Sherman's ≈62,000 men" and the legend rows 75,000/52,000/62,000 are hard-coded and depend on the unresolved figures above.
- **ExchangeCrossing / exchange.json:** 17 ships, autumn 1493, the second voyage, and the livestock/sugarcane cargo are standard. "The ships didn't sail home empty. Maize, potatoes, tomatoes, cacao…" is fine as a summary, but potatoes and tomatoes reached Europe decades later (mid-1500s), not on the 1490s return voyages. "The dying went almost entirely one way" is hedged and acceptable.
- **DocumentDemo.tsx:** Paine arrived in 1774 (correct, Nov. 30, 1774). Common Sense was published Jan. 10, 1776. The "6th ed., Providence" claim depends on the image asset and was not checked.
- **SectionalismDemo, MarketRevolutionDemo, RoadToRevolutionDemo, CharactersDemo captions:** no errors found ("Stamp Act taxed the colonies directly"; "repealed 1766"; "Dec 1860 – June 1861: eleven slave states secede"; "Missouri… 12 free, 12 slave").
