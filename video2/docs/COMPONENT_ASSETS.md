# Component assets (added to make every component render)

All from Wikimedia Commons unless noted; public domain or CC0 unless noted.

| File (public/) | Source | License |
|---|---|---|
| historic/ortelius_america_1570.jpg | Abraham Ortelius, *Americae sive Novi Orbis* (1570), UTA copy | Public domain |
| historic/debry_pomeiooc_1590.jpg | Theodor de Bry, *Indian Village of Pomeiooc* (1590) | Public domain |
| historic/taos-pueblo.jpg | Ansel Adams, Church, Taos Pueblo (National Archives 79-AA-Q01) | Public domain (US gov) |
| historic/bison-herd.jpg | Bison herd, Lamar Valley, Yellowstone (NPS) | Public domain |
| historic/wampum-belt.jpg | Wabanaki wampum belts (1915) | Public domain |
| historic/stradanus_wilderness_crop.jpg | Galle after Stradanus, *Nova Reperta: The Discovery of America* (c. 1600), Met DP841110 | CC0 |
| historic/fuchs_maize_1542.jpg | Leonhart Fuchs, *Türckisch Korn* (1543) | Public domain |
| historic/colonial-hall.jpg | Assembly Room, Independence Hall (NPS) | Public domain |
| historic/maps/evans_middle_colonies_1755.jpg | Lewis Evans, *Middle British Colonies in America* (1755), DPLA | Public domain |
| historic/maps/louisiana_purchase_1803.jpg | *Map of the Louisiana Purchase, 1803* (Geography 028) | Public domain |
| historic/maps/territorial_acquisitions.jpg | *Territorial Acquisitions of the United States* (1925) | Public domain |
| historic/maps/oregon_trail_nps.jpg | NPS Oregon National Historic Trail map | Public domain |
| historic/docs/common_sense_1776.jpg | Thomas Paine, *Common Sense: Addressed to the Inhabitants of America*, 6th ed. (Providence: John Carter, 1776), title page; John Carter Brown Library copy via Internet Archive `commonsenseaddre00pain_0`; [Commons file](https://commons.wikimedia.org/wiki/File:Common_sense_-_addressed_to_the_inhabitants_of_America.djvu) (DjVu p. 9, rendered 1920×2602 JPEG). Author: Thomas Paine | Public domain |
| tallship-real.webp | *Frigate* (Pearson Scott Foresman line art), background keyed to transparent, sepia-toned | Public domain |
| bubbles/*.webp (10) | Drawn for this repo (tools: Pillow), transparent PNG data | — (original) |
| textures/parchment.jpg | Procedurally generated (seeded) | — (original) |

Notes
- The `.webp` files contain PNG data (this machine's ffmpeg has no WebP encoder); browsers sniff the format, so they render fine. Re-encode to real WebP later if you want smaller files.
- Map overlays in JumonvilleGlen / Louisiana / TerritorialExpansion / Oregon components were drawn without a base map; check alignment against these maps in the gallery and adjust either the overlay coordinates or the map choice.

## Vector geography (src/data/geo, node_modules)

| Data | Source | License |
|---|---|---|
| src/data/geo/us-states-10m.json | us-atlas v3 (US Census Bureau cartographic boundaries) | Public domain (US gov); us-atlas ISC |
| src/data/geo/us-rivers-10m.json | Natural Earth 10m rivers & lake centerlines, cut to the contiguous US | Public domain |
| world-atlas countries-50m (npm) | Natural Earth 50m admin-0 | Public domain; world-atlas ISC |

Historical boundaries in `src/components/geo/usGeo.tsx` (acquisitions) are drawn from standard
descriptions (Treaty of Paris 1783 line, Adams–Onís 1819 line, 49th parallel, Rio Grande, Gila,
Gadsden line) as approximate lon/lat rings sharing exact edges, clipped to the Census outline.
They are teaching-scale approximations, not survey-grade boundaries.

## Fonts (public/fonts)

Self-hosted woff2 files fetched from [fontsource](https://fontsource.org) (Latin subset), loaded by
`src/theme/fonts.ts` and referenced only through `FONT` in `src/theme/tokens.ts`.

| Family | Files | Designer / source | License |
|---|---|---|---|
| Cinzel | cinzel-400-normal, cinzel-700-normal | Natanael Gama (Google Fonts) | SIL Open Font License 1.1 |
| Libre Baskerville | libre-baskerville-400-normal, -700-normal, -400-italic | Impallari Type (Google Fonts) | SIL Open Font License 1.1 |
| Plus Jakarta Sans | plus-jakarta-sans-400-normal, -700-normal | Tokotype (Google Fonts) | SIL Open Font License 1.1 |
| JetBrains Mono | jetbrains-mono-400-normal, -700-normal | JetBrains (Google Fonts) | SIL Open Font License 1.1 |

OFL 1.1 permits embedding and redistribution with the fonts (not selling the fonts alone); keep
the license text beside the files (`public/fonts/OFL-cinzel.txt` is present; add the other three
OFL texts when the fonts are next refreshed).
