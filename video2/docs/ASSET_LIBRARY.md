# Historical Asset Library

The visual raw material for every lesson (docs/LOOK.md): real paintings, portraits, maps, documents, objects,
photographs, film, and vector geography, collected once and reused across the course. Research agents **produce**
it; the director and renderer **consume** it. This document is the brief for both.

Types: `src/library/types.ts` · Rules: `src/library/validate.ts` + `data/library/taxonomy.json` · CLI: `tools/library.ts`

## 1. What to collect

Every lesson needs roughly one strong visual per 5 seconds of narration (~150 for a 13-minute lesson), with variety:
no image should carry more than ~3 shots in a lesson. Collect across all of these layers.

| Layer | Kind | What good looks like | Why the video needs it |
|---|---|---|---|
| People | `portrait` | Contemporary oil portraits, engravings, later photographs; 2+ per major figure (different ages/roles) | Name reveals, push-ins on faces |
| Events | `scene` | Paintings, engravings, prints of battles, meetings, protests, daily life | Most of the runtime |
| Argument | `cartoon` | Political cartoons and satirical prints (Join or Die, Boston Massacre print, Gilded Age Puck) | "Point" moments, APUSH stimulus practice |
| Places | `map` | Period maps with **English labels**, 3000px+ | Establishing context, the Proclamation boundary, territorial change |
| Places | `view` | City views, harbors, landscapes, fort plans, buildings | Locating the story |
| Sources | `document` | Full-page scans of laws, letters, treaties, newspapers, broadsides, **with transcription and phrase boxes** | Document shots that zoom to the exact words spoken |
| Things | `object` | Museum artifacts: weapons, coins, tools, clothing, ledgers, tea chests, cotton gins | Texture, close-up cutaways |
| Record | `photo` | Photographs (c. 1840s+), Brady/Gardner, Riis, FSA, NARA | Units 5–9 |
| Record | `footage` | Public-domain archival film (c. 1890s+): LoC, NARA, Prelinger | Units 7–9 |
| Sound | `audio` | Public-domain period music, ambiences | Music bed variety by era |
| Geography | `geo/*.geojson` | Period borders by date, lines (Proclamation, Mason-Dixon, 36°30′), routes (trails, campaigns, trade), points (forts, battles, towns), Native nations' homelands (marked approximate/contested) | Our own animated maps: accurate, consistent, reusable |
| People & events | `entities/*.json` | One entry per person, event, place: dates, aliases, location | Connects assets to lessons and to each other |

### Where to look (in order of reliability)

Library of Congress (Prints & Photographs, Geography & Map Division), National Archives (NARA catalog), Smithsonian Open
Access, the Met Open Access, National Portrait Gallery (UK) and NPG Smithsonian, Yale Center for British Art, National
Gallery of Art (Open Access), New York Public Library Digital Collections, David Rumsey Map Collection (check license
per item), Wikimedia Commons (always link the **original file**, never `/thumb/`), Internet Archive (film, books),
Avalon Project / Founders Online (transcriptions).

### Coverage map by unit (high level; agents expand into briefs)

| Unit | People | Events and scenes | Maps and geography | Documents | Objects and other |
|---|---|---|---|---|---|
| 1 · 1491–1607 | Columbus, Las Casas, Sepúlveda, Cortés, Moctezuma, Isabella & Ferdinand | Cahokia, Tenochtitlan, contact, encomienda, Valladolid debate, Columbian Exchange | Pre-contact cultures (approx.), voyages, Tordesillas line, Spanish empire | Columbus journal, Las Casas, Requerimiento | Caravel, astrolabe, crops/animals of the Exchange |
| 2 · 1607–1754 | John Smith, Pocahontas, Winthrop, Penn, Bacon, Metacom | Jamestown, Plymouth, Puritan towns, Bacon's Rebellion, King Philip's War, Middle Passage, Great Awakening | Colonial regions by date, Atlantic trade routes, French/Spanish claims | Mayflower Compact, Navigation Acts, slave codes | Tobacco, ship plans, meetinghouses |
| 3 · 1754–1800 | Washington, Grenville, Pontiac, Franklin, Adams(es), Jefferson, Paine, Hamilton, Madison | Seven Years' War, Proclamation, Stamp Act protests, Boston Massacre, Tea Party, Lexington, Valley Forge, Yorktown, Constitutional Convention, Whiskey Rebellion | 1763 borders, Proclamation line, forts, Revolutionary campaigns, 1783 treaty borders, Northwest Ordinance grid | Proclamation, Stamp Act, Declaration, Articles, Constitution, Federalist, Washington's Farewell | Tea chests, muskets, broadsides, Join or Die |
| 4 · 1800–1848 | Jefferson, Marshall, Jackson, Clay, Calhoun, Webster, Tecumseh, Douglass, Garrison, Stanton | Louisiana Purchase, War of 1812, Erie Canal, Market Revolution, Trail of Tears, revivals, Seneca Falls | Louisiana Purchase, Missouri Compromise line, canals/roads/rail, removal routes, Texas | Marbury, Monroe Doctrine, Indian Removal Act, Declaration of Sentiments | Cotton gin, textile mills, steamboats |
| 5 · 1844–1877 | Polk, Lincoln, Douglas, Davis, Lee, Grant, Tubman, Stowe, Andrew Johnson | Mexican-American War, Gold Rush, Bleeding Kansas, Harpers Ferry, Civil War battles, emancipation, Reconstruction | Mexican Cession, 1850/1854 compromises, secession, battle maps, military districts | Wilmot Proviso, Dred Scott, Emancipation Proclamation, 13th–15th Amendments | Brady photographs, uniforms, Freedmen's Bureau records |
| 6 · 1865–1898 | Carnegie, Rockefeller, Gompers, Sitting Bull, Chief Joseph, Bryan, Riis, Addams | Transcontinental railroad, Plains wars, immigration, strikes (Homestead, Pullman), urban tenements, Populists | Railroads, reservations, immigration flows, 1896 election | Dawes Act, Sherman Antitrust, Omaha Platform, Plessy | Puck cartoons, Riis photographs, factory interiors |
| 7 · 1890–1945 | T. Roosevelt, Wilson, Debs, Du Bois, FDR, Eleanor Roosevelt, MacArthur, Truman | Spanish-American War, Progressive reform, WWI, Harlem Renaissance, Dust Bowl, New Deal, WWII homefront and battles | Empire 1898, WWI fronts, Great Migration, Dust Bowl, WWII theaters | Open Door notes, 19th Amendment, Fourteen Points, New Deal acts | FSA photographs, newsreels, posters |
| 8 · 1945–1980 | Truman, Eisenhower, MLK, Malcolm X, JFK, LBJ, Nixon, Friedan | Cold War, Korea, civil rights campaigns, Vietnam, Great Society, Watergate | Containment, Korea/Vietnam, interstate highways, suburbanization | Truman Doctrine, Brown v. Board, Civil Rights Act, Gulf of Tonkin | Civil rights photographs, TV-era footage |
| 9 · 1980–present | Reagan, Bush, Clinton, Obama | End of the Cold War, globalization, 9/11, digital revolution | Post-Cold War world, migration, trade | Key speeches and acts | Mostly government-produced public-domain media |

## 2. Acceptance rules (enforced by `tools/library.ts validate`)

- **License:** `Public domain`, `CC0`, `CC BY 2.0/3.0/4.0`, or `No known restrictions` only. Never CC BY-SA, NC, ND, or "fair use".
- **Original file:** `provenance.originalUrl` is the full-resolution original. Thumbnail and resized URLs are rejected.
- **Resolution:** images ≥ 2000px on the long edge (3000px+ preferred); portraits ≥ 1200px on the short edge.
- **No duplicates:** the same file (sha256) can't be two records.
- **Made vs depicted:** if it was made 25+ years after what it shows, set `depicts.retrospective: true`. The director must
  not present it as an eyewitness record (Pontiac has no authenticated life portrait).
- **Labels:** maps and scenes with non-English text need an accuracy note; normally reject them (we draw our own maps).
- **No watermarks.** Every `depicts` reference must exist in `entities/`.
- **Approval** needs a named reviewer, at least one named focus region (`face`, `crowd`, `ship`, `paper`…), and a
  transcription for documents.
- **Sensitivity:** depictions of Native nations, enslaved people, and violence carry `sensitivity` with a note. Many
  were made by outsiders; say so in `accuracy`.

## 3. Workflow and roles

```
planner agent ──► wishlist/<unit>.json (briefs)
                         │
collector agents ──► records/<kind>/<id>.json  (status: candidate)  +  file in LIBRARY_DIR
                         │   tools/library.ts validate (machine rules)
                         ▼
                    status: verified
                         │   reviewer (human or reviewer agent): accuracy, sensitivity, focus boxes
                         ▼
                    status: approved ──► tools derive depth maps / masks / LTX clips (records.derived)
                         │
                         ▼
             tools/library.ts index ──► src/data/library-index.json ──► director + shot resolver
```

- **Planner agent:** reads a lesson script, writes briefs (`brief.u3.<slug>`) with the exact lines that need each visual
  (`usedIn: ["u3e1:t05"]`), priority, how many variants, and search hints. One brief per need, not per image.
- **Collector agents:** fulfil briefs. For each find: download the original into `LIBRARY_DIR/<kind>/<id>/original.<ext>`,
  compute sha256 and pixel size, write the record (`status: candidate`), and run `validate`. Fix or drop what fails.
  Prefer 3 excellent candidates over 10 weak ones.
- **Reviewer:** checks what machines can't: is it really what it claims, is the date right, is it respectful, are the
  focus boxes on the right things. Sets `approved` or `rejected` with notes.
- **Geography agent:** digitizes period features into `geo/` from cited sources (period maps, atlases, NPS/USGS data).
  Every feature has `validFrom/validTo`, `precision`, and `sources`. Never stand in modern borders for historical ones.

Commands:

```bash
npx tsx tools/library.ts validate      # every rule above; exit 1 on problems
npx tsx tools/library.ts status 3      # Unit 3 brief coverage by priority
npx tsx tools/library.ts index         # approved assets -> src/data/library-index.json
```

## 4. Layout

```
data/library/
  taxonomy.json                     units, kinds, licenses, quality minimums, tag vocabulary
  wishlist/u1.json … u9.json        briefs
  entities/people.json events.json places.json
  records/<kind>/<id>.json          one record per asset (metadata, no binaries)
  geo/<id>.geojson                  one feature (or FeatureCollection) per file
LIBRARY_DIR (default public/library, gitignored; point it at a shared drive to share across machines)
  <kind>/<id>/original.<ext>        the original file
  <kind>/<id>/display.jpg           optional ≤ 4096px copy for rendering
  <kind>/<id>/depth.png, mask-*.png, clip-*.mp4   derived by tools
src/data/library-index.json         built index (approved only)
```

IDs are permanent: `<kind>.<slug>` for records (e.g. `portrait.george-grenville-hoare-1764`), `person.|event.|place.<slug>`
for entities, `geo.<type>.<slug>[@year]` for geography (e.g. `geo.region.province-of-quebec@1763`).

## 5. How the pipeline consumes it

- The director receives the index slice for a lesson (matching units, topics, people, events, places): id, title, one-line
  description, date, `retrospective`, focus names. It never sees URLs or guesses coordinates.
- Shot plans reference assets and focus regions by name: `{"asset": "portrait.george-grenville-hoare-1764", "from": "face",
  "to": "paper"}`, and map features by id: `{"geo": "geo.line.proclamation@1763"}`. The shot resolver turns names into
  framings and geometry, and rejects unknown ids, unapproved assets, and over-upscaled framings.
- Derived layers (depth maps for 2.5D parallax, LTX clips for hero moments) attach to the record, so every lesson that
  uses an asset gets them for free.

## 6. Migration

The 21 u3e1 images in `data/u3e1/images.json` are the first migration target: one seed record exists
(`portrait.george-grenville-hoare-1764`). Most of the rest fail the resolution rule; their briefs ask collectors to find
originals.
