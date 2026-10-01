# IMAGES — Princeton Review APUSH Premium Prep 25th ed. reclaim
Date: 2026-10-01 (IP post-pass). Staging: `build/reclaim-merged/staged/princeton-25e/`.

## Verification
- Scanned all 30 staged JSON files for image payloads (data URIs, base64 blobs,
  .png/.jpg/.jpeg/.gif/.svg/.tiff references): **ZERO book images were extracted.**
  The pipeline extracted text only. All non-text stimuli below are either
  textual descriptions (generated-original) or public-domain artworks cited by URL.
- The literal `[IMAGE: ]` placeholder carried over from the book's text flow was
  removed wherever it occurred (replaced with a description or a real citation).

## Decisions

### Used public domain (with LoC / Wikimedia Commons citation)
| Item(s) | Artwork | Citation |
|---|---|---|
| test2-mcq q10–q13 | "Join, or Die" — Benjamin Franklin / Pennsylvania Gazette, 1754 | https://commons.wikimedia.org/wiki/File:Benjamin_Franklin_-_Join_or_Die.jpg (public domain) |
| test2-mcq q14–q16 | "Declaration of Independence" — John Trumbull, 1818–19 | https://commons.wikimedia.org/wiki/File:Declaration_of_Independence_(1819),_by_John_Trumbull.jpg (public domain; rotunda version) |
| test2-mcq q27–q30 | "King Andrew the First" — unknown artist, c. 1833 | https://www.loc.gov/item/2008661753/ (Library of Congress; "no known restrictions on publication") |
| saq-ch2-q3 | "Join, or Die" — described, factual; same PD artwork as above | https://commons.wikimedia.org/wiki/File:Benjamin_Franklin_-_Join_or_Die.jpg |

`image_url` fields with the above URLs were added to the staged MCQ items.

### Generated-original (our own descriptions / transcriptions; no image copied)
| Item(s) | Non-text stimulus | Basis |
|---|---|---|
| saq-test1-q3 | Engraving, 1634, European ships arriving on a North American shore | described from caption |
| saq-test2-q3 | "Map of the United States in 1803" (U.S. National Archives) | described from caption |
| saq-test3-q3 | Family portrait, 1776 | described from caption |
| saq-drill-q3 | Political cartoon "XVth Amendment — 'Shoo, fly, don't bother me!'" (c. 1870) | described from caption |
| test2-mcq q35–q37 | "Density of Distribution of the Natives of Ireland: 1890" (U.S. Census Office, Statistical Atlas of the Eleventh Census, 1898 — U.S. federal publication, public domain) | generated-original description of the two-map pair written into the stimulus; no LoC/Wikimedia URL located (only commercial dealers found) |
| test3-mcq q04–q06 | Illustration by British publisher William Humphrey, 1783 | generated-original description written from the item's own explanation (cartoon about post-Revolutionary American hostility to Loyalists); specific artwork not identified online |
| test3-mcq q37–q41 | U.S. unemployment-rate graph, 1929–1941 | generated-original description written from the items' explanations (peak ~1933, decline with 1937–38 uptick, full recovery with WWII) |
| dbq-test2 doc 4 | Political cartoon by John T. McCutcheon, Chicago Tribune, 1914, "What the United States Has Fought For" | generated-original description (pre-1930, public domain; no LoC/Wikimedia URL captured) |
| dbq-test2 doc 6 | Table 1, "Population of the United States and Its Territories and Possessions: 1940, 1930, and 1920," U.S. Census Bureau (1940) | generated-original transcription of key figures; raw census figures are facts, not copyrightable |
| dbq-test2 doc 7 | Political cartoon by Victor Gilliam, Judge magazine, 1899, "A Thing Well Begun Is Half Done" | generated-original description (pre-1930, public domain; LoC record exists, URL not captured) |
| dbq-test3 doc 4 | Map of the Kansas-Nebraska Act, 1854 | generated-original description |
| dbq-test3 doc 6 | Paired maps of U.S. railroad routes, 1850 and 1860 | generated-original description |
| dbq-test3 doc 7 | "Progressive Democracy — Prospect of a Smash Up" (Currier & Ives / Louis Maurer), 1860 | generated-original description (pre-1930, public domain) |
| dbq-drill doc 5 | Cartoon in the Literary Digest, 1919 (immigrant anarchist behind the Statue of Liberty) | generated-original description (pre-1930, public domain) |

### Caption-only (no image data; kept as text reference, nothing claimed)
| Item(s) | Stimulus | Note |
|---|---|---|
| test3-mcq q01–q03 | "The Burning of Jamestown, 1676" | No verifiable artwork identified; caption kept, questions answerable from caption + text. `[IMAGE: ]` placeholder removed. |
| test3-mcq q18–q21 | "Map From 1830" | No verifiable artwork identified; caption kept, questions answerable from knowledge (Cherokee cases). `[IMAGE: ]` placeholder removed. |

### Notes
- dbq-drill doc 4 (1955 Civil Defense magazine advertisement) is a **brief paraphrase**
  of a post-1929 ad, not a reproduction — tagged `paraphrase`, kept staged.
- The 1940 Census table (dbq-test2 doc 6) is tagged `fact` at document level.
- No item attributes a public-domain quote to the book; all PD quotes cite their
  original sources.
