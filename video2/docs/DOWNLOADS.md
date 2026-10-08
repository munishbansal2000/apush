# Downloaded files (not committed)

Third-party files are **not in git** (see `.gitignore`). After cloning, run once:

```bash
npm install
npm run setup:downloads          # fonts + geography + historic images
# or the full setup (also builds narration, timing, sfx, placeholder heads):
npm run setup
```

`npx tsx tools/setup-downloads.ts --dry-run` lists every link without downloading.
Options: `--force` (re-download), `--only fonts|geo|images`.

> The project won't typecheck or render until `setup:downloads` has run, because code imports
> the geography JSON and scenes load the fonts.

## 1. Fonts → `public/fonts/` (SIL Open Font License 1.1)

| File | Link |
|---|---|
| cinzel-400/700-normal.woff2 | https://cdn.jsdelivr.net/fontsource/fonts/cinzel@latest/latin-400-normal.woff2 (and `-700-`) |
| libre-baskerville-400/700-normal, 400-italic | https://cdn.jsdelivr.net/fontsource/fonts/libre-baskerville@latest/latin-400-normal.woff2 (`-700-normal`, `-400-italic`) |
| plus-jakarta-sans-400/700-normal | https://cdn.jsdelivr.net/fontsource/fonts/plus-jakarta-sans@latest/latin-400-normal.woff2 (and `-700-`) |
| jetbrains-mono-400/700-normal | https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-400-normal.woff2 (and `-700-`) |
| OFL-*.txt licenses | https://raw.githubusercontent.com/google/fonts/main/ofl/{cinzel,librebaskerville,plusjakartasans,jetbrainsmono}/OFL.txt |

## 2. Geography → `src/data/geo/` (public domain / ISC)

| File | Source | Processing |
|---|---|---|
| us-states-10m.json | https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json | none |
| lakes-50m.json | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson | keep scalerank ≤ 3, round to 3 decimals |
| us-rivers-10m.json | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson | keep features touching lon −125.5…−66, lat 23.5…50.5; name + scalerank; 3 decimals |

World land/countries come from the `world-atlas` npm package (installed by `npm install`).

## 3. Historic images → `public/historic/…` (public domain, Wikimedia Commons)

Driven by `data/images.json`: every entry's `source_url` is the Commons page; credits,
license and description are in the same entry. `tools/fetch-images.ts --all` downloads them
incrementally (records what it fetched in `data/images.lock.json`). The full list with links:
`npx tsx tools/setup-downloads.ts --only images --dry-run`.

Main ones used by the motion work:

| File | Commons page |
|---|---|
| historic/ortelius_america_1570.jpg | https://commons.wikimedia.org/wiki/File:Ortelius_America_Sive_Novi_Orbis_1570_UTA.jpg |
| historic/debry_pomeiooc_1590.jpg | https://commons.wikimedia.org/wiki/File:Indian_Village_of_Pomeiooc_Theodor_de_Bry_1590.jpg |
| historic/taos-pueblo.jpg | https://commons.wikimedia.org/wiki/File:Ansel_Adams_-_National_Archives_79-AA-Q01_restored.jpg |
| historic/bison-herd.jpg | https://commons.wikimedia.org/wiki/File:Bison_herd,_Lamar_Valley_(22034298748).jpg |
| historic/wampum-belt.jpg | https://commons.wikimedia.org/wiki/File:Wabanaki_Wampum_Belts.png |
| historic/stradanus_wilderness_crop.jpg | https://commons.wikimedia.org/wiki/File:New_Inventions_of_Modern_Times_-Nova_Reperta-,_The_Discovery_of_America,_plate_1_MET_DP841110.jpg |
| historic/fuchs_maize_1542.jpg | https://commons.wikimedia.org/wiki/File:Türckisch_Korn_Fuchs_1543_813.jpg |
| historic/colonial-hall.jpg | https://commons.wikimedia.org/wiki/File:Assembly_Room_in_Independence_Hall_(4e4d7280-1dd8-b71b-0ba3-d7bec43b2b9c).jpg |
| historic/maps/evans_middle_colonies_1755.jpg | https://commons.wikimedia.org/wiki/File:Middle_British_Colonies_in_America_-_DPLA_-_ee891bcc4a4400c09d9e9f74b134442a.jpg |
| historic/maps/louisiana_purchase_1803.jpg | https://commons.wikimedia.org/wiki/File:Geography_028_-_Map_of_the_Louisiana_Purchase_-_1803.jpg |
| historic/maps/territorial_acquisitions.jpg | https://commons.wikimedia.org/wiki/File:Territorial_Acquisitions_of_the_United_States.jpg |
| historic/maps/oregon_trail_nps.jpg | https://commons.wikimedia.org/wiki/File:NPS_oregon-trail-map.jpg |
| historic/docs/common_sense_1776.jpg | https://commons.wikimedia.org/wiki/File:Common_sense_-_addressed_to_the_inhabitants_of_America.djvu — **page 9** (title page) |

**Manual check — Common Sense:** the source is a multi-page DjVu; the title page is page 9. If
the fetcher saves page 1, download page 9 directly:
`https://commons.wikimedia.org/w/index.php?title=Special:FilePath/Common_sense_-_addressed_to_the_inhabitants_of_America.djvu&page=9&width=1920`
and save it as `public/historic/docs/common_sense_1776.jpg` (the DocumentDemo highlight boxes
are measured on that page at 1920×2602).

## Committed on purpose (made for this project, not downloaded)

`public/bubbles/`, `public/textures/parchment.jpg`, `public/tallship-real.webp` (from a
public-domain frigate image, keyed + toned), `public/sfx/`, `public/music/`, host head
placeholders. Regenerable but kept for convenience.

## Regenerated, not committed

`public/audio/**` (placeholder narration: `npm run placeholder-audio`, `npm run build:prototype`),
`tts/`, `data/*/turns.json|timing_map.json|levels.json|word_times.json` (`npm run setup`).
